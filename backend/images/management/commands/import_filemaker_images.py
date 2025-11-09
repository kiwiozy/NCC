"""
Django management command to import images from FileMaker to S3 and Nexus.

This command:
1. Authenticates with FileMaker Data API
2. Finds images where NexusExportDate is empty (not yet exported)
3. Downloads images using WATERFALL strategy (tries largest size first)
4. Uploads to S3 with organized folder structure
5. Creates ImageBatch and Image records in Nexus
6. Updates NexusExportDate in FileMaker to prevent re-import

Waterfall Strategy:
- Try image_Full first (best quality)
- If empty, try image_Ex_large
- If empty, try image_large
- If empty, try image_medium
- If empty, try image_small
- If all empty, skip image

Run: python manage.py import_filemaker_images
"""

import os
import sys
import json
import requests
import base64
from datetime import datetime, date
from io import BytesIO
from collections import defaultdict
from django.core.management.base import BaseCommand
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from patients.models import Patient
from images.models import ImageBatch, Image
from documents.services import S3Service
from PIL import Image as PILImage
from django.core.files.uploadedfile import InMemoryUploadedFile

# Suppress SSL warnings
requests.packages.urllib3.disable_warnings()

# Load FileMaker credentials from scripts/filemaker/.env
SCRIPT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'scripts', 'filemaker')
ENV_PATH = os.path.join(SCRIPT_DIR, '.env')

FM_USERNAME = None
FM_PASSWORD = None
FM_DATABASE = 'WEP-DatabaseV2'
FM_BASE_URL_DATA_API = None

if os.path.exists(ENV_PATH):
    with open(ENV_PATH, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('FM_USERNAME='):
                FM_USERNAME = line.split('=', 1)[1].strip().strip('"').strip("'")
            elif line.startswith('FM_PASSWORD='):
                FM_PASSWORD = line.split('=', 1)[1].strip().strip('"').strip("'")
            elif line.startswith('FM_DATABASE='):
                FM_DATABASE = line.split('=', 1)[1].strip().strip('"').strip("'")
            elif line.startswith('FM_BASE_URL_DATA_API='):
                FM_BASE_URL_DATA_API = line.split('=', 1)[1].strip().strip('"').strip("'")

if not FM_BASE_URL_DATA_API:
    FM_BASE_URL_DATA_API = f"https://walkeasy.fmcloud.fm/fmi/data/v1/databases/{FM_DATABASE}"

# Global stats for logging
stats = {
    'total_found': 0,
    'processed': 0,
    'batches_created': 0,
    'images_imported': 0,
    'skipped': 0,
    'failed': 0,
    'errors': [],
    'container_field_usage': defaultdict(int)  # Track which container fields were used
}


class FileMakerAPI:
    def __init__(self):
        self.token = None
        self.layout = "API_Images"
        
        # Container fields in priority order (waterfall)
        self.container_fields = [
            'image_Full',      # Best quality
            'image_Ex_large',  # Fallback 1
            'image_large',     # Fallback 2
            'image_medium',    # Fallback 3
            'image_small'      # Last resort
        ]

    def authenticate(self):
        """Authenticate with FileMaker Data API"""
        auth_url = f"{FM_BASE_URL_DATA_API}/sessions"
        auth_string = base64.b64encode(f"{FM_USERNAME}:{FM_PASSWORD}".encode()).decode()
        headers = {
            'Authorization': f'Basic {auth_string}',
            'Content-Type': 'application/json'
        }
        try:
            response = requests.post(auth_url, headers=headers, timeout=30, verify=False)
            if response.status_code == 200:
                self.token = response.json()["response"]["token"]
                return True
            else:
                return False
        except Exception as e:
            return False

    def logout(self):
        """Logout from FileMaker Data API"""
        if self.token:
            logout_url = f"{FM_BASE_URL_DATA_API}/sessions/{self.token}"
            headers = {'Authorization': f'Bearer {self.token}'}
            try:
                requests.delete(logout_url, headers=headers, timeout=10, verify=False)
            except Exception:
                pass

    def find_unexported_images(self, limit=100, offset=1):
        """Find images in FileMaker that have not been exported yet"""
        find_url = f"{FM_BASE_URL_DATA_API}/layouts/{self.layout}/_find"
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        # Search for images where NexusExportDate is empty
        search_data = {
            "query": [
                {"NexusExportDate": "="}  # "=" finds empty fields in FileMaker
            ],
            "offset": str(offset),
            "limit": str(limit)
        }
        
        try:
            response = requests.post(find_url, headers=headers, json=search_data, timeout=30, verify=False)
            
            if response.status_code == 200:
                data = response.json()
                records = data.get('response', {}).get('data', [])
                data_info = data.get('response', {}).get('dataInfo', {})
                return records, data_info
            else:
                return [], {}
        except Exception:
            return [], {}

    def get_best_image_container(self, field_data):
        """
        Waterfall strategy: Try each container field in order until we find one with data.
        
        Returns: (field_name, container_url) or (None, None) if all empty
        """
        for field_name in self.container_fields:
            container_url = field_data.get(field_name)
            if container_url and isinstance(container_url, str) and container_url.startswith('http'):
                # Found a container field with data!
                stats['container_field_usage'][field_name] += 1
                return field_name, container_url
        
        # All container fields are empty
        return None, None

    def download_container_file(self, url):
        """Download file from container URL using the current token"""
        headers = {'Authorization': f'Bearer {self.token}'}
        try:
            response = requests.get(url, headers=headers, stream=True, timeout=60, verify=False)
            response.raise_for_status()
            return response.content, response.headers.get('Content-Type')
        except requests.exceptions.RequestException:
            return None, None

    def update_export_date(self, fm_record_id):
        """Update NexusExportDate in FileMaker for a given record"""
        update_url = f"{FM_BASE_URL_DATA_API}/layouts/{self.layout}/records/{fm_record_id}"
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        update_data = {
            "fieldData": {
                "NexusExportDate": datetime.now().isoformat()
            }
        }
        try:
            response = requests.patch(update_url, headers=headers, json=update_data, timeout=30, verify=False)
            return response.status_code == 200
        except Exception:
            return False


def get_patient_nexus_id(filemaker_contact_id):
    """
    Find the Nexus patient UUID given the FileMaker contact ID.
    
    The FileMaker ID is stored in the patient.notes field as a JSON string:
    notes = '{"filemaker_id": "UUID-HERE", ...}'
    
    Since notes is a TextField (not JSONField), we use string contains.
    """
    if not filemaker_contact_id:
        return None
    
    try:
        # Use __contains for string search within the JSON text
        patient = Patient.objects.filter(
            notes__contains=f'"filemaker_id": "{filemaker_contact_id}"'
        ).first()
        if patient:
            return str(patient.id)
        return None
    except Exception:
        return None


def process_images_for_patient(fm_api, patient_images, nexus_patient_id, s3_service, command):
    """
    Process all images for a single patient, grouped by date into batches.
    
    Args:
        fm_api: FileMaker API instance
        patient_images: List of image records for this patient
        nexus_patient_id: Nexus patient UUID (or None for unlinked)
        s3_service: S3Service instance
        command: Django management command instance for stdout
    
    Returns:
        Number of images successfully imported
    """
    # Group images by date
    images_by_date = defaultdict(list)
    
    for img_record in patient_images:
        field_data = img_record.get('fieldData', {})
        image_date_str = field_data.get('date')
        
        if image_date_str:
            images_by_date[image_date_str].append(img_record)
        else:
            # No date - group as "Unknown Date"
            images_by_date['unknown'].append(img_record)
    
    total_imported = 0
    
    # Create a batch for each date
    for image_date_str, images_list in images_by_date.items():
        # Parse date
        if image_date_str == 'unknown':
            captured_date = None
            batch_name = "Unknown Date (FileMaker Import)"
        else:
            try:
                captured_date = datetime.strptime(image_date_str, '%Y-%m-%d').date()
                batch_name = f"{captured_date.strftime('%d %b %Y')} (FileMaker Import)"
            except ValueError:
                captured_date = None
                batch_name = f"{image_date_str} (FileMaker Import)"
        
        command.stdout.write(f"\n   📁 Creating batch: {batch_name} ({len(images_list)} images)")
        
        # Create ImageBatch
        try:
            with transaction.atomic():
                if nexus_patient_id:
                    patient = Patient.objects.get(id=nexus_patient_id)
                    batch = ImageBatch.objects.create(
                        patient=patient,
                        name=batch_name,
                        captured_date=captured_date,
                        notes=f"Imported from FileMaker on {datetime.now().strftime('%Y-%m-%d')}"
                    )
                else:
                    # Unlinked batch - we'll handle this differently
                    # For now, skip unlinked images (can revisit later)
                    command.stdout.write(f"      ⏭️  Skipping batch (no patient link)")
                    stats['skipped'] += len(images_list)
                    continue
                
                stats['batches_created'] += 1
                
                # Process each image in this batch
                for img_record in images_list:
                    field_data = img_record.get('fieldData', {})
                    fm_image_id = field_data.get('id')
                    fm_record_id = img_record.get('recordId')
                    
                    # Get best available container field (waterfall)
                    container_field, container_url = fm_api.get_best_image_container(field_data)
                    
                    if not container_url:
                        command.stdout.write(f"      ⏭️  Skipping image {fm_image_id}: All container fields empty")
                        stats['skipped'] += 1
                        continue
                    
                    command.stdout.write(f"      📥 Downloading: {fm_image_id} (from {container_field})")
                    
                    # Download image
                    file_content, mime_type = fm_api.download_container_file(container_url)
                    if not file_content:
                        command.stdout.write(f"      ❌ Download failed: {fm_image_id}")
                        stats['failed'] += 1
                        stats['errors'].append(f"{fm_image_id}: Download failed from {container_field}")
                        continue
                    
                    # Get metadata
                    image_type = field_data.get('Type', 'Unknown')
                    original_filename = field_data.get('Name of file', f'{fm_image_id}.jpg')
                    
                    # Determine file extension
                    import mimetypes
                    ext = mimetypes.guess_extension(mime_type) if mime_type else '.jpg'
                    if not original_filename.endswith(ext):
                        original_filename = f"{os.path.splitext(original_filename)[0]}{ext}"
                    
                    # Upload to S3 (using same structure as documents import)
                    # S3 path: patients/filemaker-import/images/{patient_id}/{date}/{filemaker_id}.jpg
                    try:
                        # Open image with Pillow to get dimensions and generate thumbnail
                        file_obj = BytesIO(file_content)
                        img = PILImage.open(file_obj)
                        width, height = img.size
                        
                        # Generate thumbnail (300x300 max, same as user uploads)
                        thumb_img = img.copy()
                        thumb_img.thumbnail((300, 300), PILImage.Resampling.LANCZOS)
                        
                        # Save thumbnail to BytesIO
                        thumb_buffer = BytesIO()
                        thumb_img.save(thumb_buffer, format=img.format or 'JPEG', quality=85)
                        thumb_buffer.seek(0)
                        thumbnail_size = thumb_buffer.getbuffer().nbytes
                        
                        # Wrap thumbnail in InMemoryUploadedFile for S3 upload
                        thumb_file = InMemoryUploadedFile(
                            thumb_buffer,
                            None,
                            f"{original_filename}_thumb",
                            mime_type or 'image/jpeg',
                            thumbnail_size,
                            None
                        )
                        
                        # Generate S3 keys (matching documents structure + thumbnail)
                        date_folder = image_date_str if image_date_str != 'unknown' else 'unknown-date'
                        base_key = f"patients/filemaker-import/images/{nexus_patient_id}/{date_folder}/{fm_image_id}"
                        s3_key = f"{base_key}{ext}"
                        s3_thumbnail_key = f"{base_key}_thumb{ext}"
                        
                        # Reset file pointer for full image upload
                        file_obj.seek(0)
                        file_obj.name = original_filename
                        file_obj.size = len(file_content)
                        
                        # Upload full image to S3
                        s3_upload_info = s3_service.upload_file(
                            file_obj=file_obj,
                            filename=original_filename,
                            folder=s3_key
                        )
                        
                        # Upload thumbnail to S3
                        s3_thumb_info = s3_service.upload_file(
                            file_obj=thumb_file,
                            filename=f"{original_filename}_thumb",
                            folder=s3_thumbnail_key
                        )
                        
                        # Create Image record with thumbnail data
                        Image.objects.create(
                            batch=batch,
                            s3_key=s3_upload_info['s3_key'],
                            s3_thumbnail_key=s3_thumb_info['s3_key'],
                            s3_bucket=s3_service.bucket_name,
                            original_filename=original_filename,
                            file_size=len(file_content),
                            thumbnail_size=thumbnail_size,
                            mime_type=mime_type or 'image/jpeg',
                            width=width,
                            height=height,
                            category=image_type,  # Preserve exact FileMaker category
                            filemaker_id=fm_image_id,
                            uploaded_by='FileMaker Import'
                        )
                        
                        # Update FileMaker
                        fm_api.update_export_date(fm_record_id)
                        
                        stats['images_imported'] += 1
                        total_imported += 1
                        
                        command.stdout.write(f"      ✅ Imported: {original_filename} ({width}x{height}, thumb: {thumb_img.size[0]}x{thumb_img.size[1]}) from {container_field}")
                        
                    except Exception as e:
                        command.stdout.write(f"      ❌ Failed to save: {fm_image_id} - {e}")
                        stats['failed'] += 1
                        stats['errors'].append(f"{fm_image_id}: Save failed - {e}")
                        continue
        
        except Exception as e:
            command.stdout.write(f"   ❌ Batch creation failed: {e}")
            stats['failed'] += len(images_list)
            continue
    
    return total_imported


class Command(BaseCommand):
    help = 'Imports FileMaker images to S3 and Nexus using waterfall container field strategy'

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("📷 FileMaker Images to S3 Bulk Import")
        self.stdout.write("=" * 80)
        self.stdout.write(f"Database: {FM_DATABASE}")
        self.stdout.write(f"Layout: API_Images")
        self.stdout.write(f"Query: WHERE NexusExportDate IS EMPTY")
        self.stdout.write("")
        self.stdout.write("Waterfall Strategy:")
        self.stdout.write("  1. Try image_Full (best quality)")
        self.stdout.write("  2. If empty → try image_Ex_large")
        self.stdout.write("  3. If empty → try image_large")
        self.stdout.write("  4. If empty → try image_medium")
        self.stdout.write("  5. If empty → try image_small")
        self.stdout.write("")
        
        # Initialize services
        fm_api = FileMakerAPI()
        s3_service = S3Service()
        
        # Authenticate
        if not fm_api.authenticate():
            self.stdout.write("❌ Authentication failed - exiting")
            sys.exit(1)
        
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write("🔍 Finding and processing unexported images...")
        self.stdout.write("=" * 80)
        
        # Process in batches
        batch_size = 50
        offset = 1
        total_processed = 0
        
        # Group images by patient as we fetch them
        patient_images_map = defaultdict(list)
        
        while True:
            self.stdout.write(f"\n📋 Fetching batch (offset: {offset}, limit: {batch_size})...")
            records, data_info = fm_api.find_unexported_images(limit=batch_size, offset=offset)
            
            if not records:
                self.stdout.write("   ✅ No more records to process")
                break
            
            found_count = data_info.get('foundCount', 0)
            returned_count = len(records)
            
            if offset == 1:
                stats['total_found'] = found_count
                self.stdout.write(f"   📊 Total unexported images: {found_count}")
            
            self.stdout.write(f"   📄 Grouping {returned_count} images by patient...")
            
            # Group records by patient
            for record in records:
                field_data = record.get('fieldData', {})
                fm_contact_id = field_data.get('id_Contact')
                
                if fm_contact_id:
                    patient_images_map[fm_contact_id].append(record)
                else:
                    patient_images_map['unlinked'].append(record)
            
            total_processed += returned_count
            stats['processed'] += returned_count
            
            # Check if we've processed all
            if returned_count == 0:
                self.stdout.write("\n   ✅ No more images available from FileMaker")
                break
            
            if total_processed >= stats['total_found']:
                self.stdout.write("\n   ✅ All images processed!")
                break
            
            offset += batch_size
        
        # Now process each patient's images
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write(f"📁 Processing {len(patient_images_map)} patients' images...")
        self.stdout.write("=" * 80)
        
        for i, (fm_contact_id, images) in enumerate(patient_images_map.items(), 1):
            self.stdout.write(f"\n[{i}/{len(patient_images_map)}] Patient: {fm_contact_id}")
            self.stdout.write(f"   Images: {len(images)}")
            
            # Get Nexus patient ID
            nexus_patient_id = None if fm_contact_id == 'unlinked' else get_patient_nexus_id(fm_contact_id)
            
            if not nexus_patient_id and fm_contact_id != 'unlinked':
                self.stdout.write(f"   ⚠️  No matching Nexus patient found for {fm_contact_id}")
                self.stdout.write(f"   ⏭️  Skipping {len(images)} images")
                stats['skipped'] += len(images)
                continue
            
            # Process images for this patient
            imported = process_images_for_patient(fm_api, images, nexus_patient_id, s3_service, self)
            self.stdout.write(f"   ✅ Imported {imported} images")
        
        # Logout
        fm_api.logout()
        
        # Final summary
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write("📊 IMPORT COMPLETE")
        self.stdout.write("=" * 80)
        self.stdout.write(f"Total found: {stats['total_found']}")
        self.stdout.write(f"Processed: {stats['processed']}")
        self.stdout.write(self.style.SUCCESS(f"✅ Batches created: {stats['batches_created']}"))
        self.stdout.write(self.style.SUCCESS(f"✅ Images imported: {stats['images_imported']}"))
        self.stdout.write(f"⏭️  Skipped: {stats['skipped']}")
        self.stdout.write(self.style.ERROR(f"❌ Failed: {stats['failed']}"))
        
        # Container field usage stats
        self.stdout.write("")
        self.stdout.write("📊 Container Field Usage (Waterfall Stats):")
        for field_name in ['image_Full', 'image_Ex_large', 'image_large', 'image_medium', 'image_small']:
            count = stats['container_field_usage'].get(field_name, 0)
            if count > 0:
                percentage = (count / stats['images_imported'] * 100) if stats['images_imported'] > 0 else 0
                self.stdout.write(f"   {field_name:20} - {count:4} images ({percentage:.1f}%)")
        
        if stats['errors']:
            self.stdout.write(f"\n⚠️  Errors ({len(stats['errors'])}):")
            for error in stats['errors'][:10]:
                self.stdout.write(f"   - {error}")
            if len(stats['errors']) > 10:
                self.stdout.write(f"   ... and {len(stats['errors']) - 10} more")
        
        self.stdout.write("")
        self.stdout.write("=" * 80)

