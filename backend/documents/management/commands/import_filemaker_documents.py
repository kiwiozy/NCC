#!/usr/bin/env python3
"""
Django management command to import FileMaker documents to S3 and Nexus.
Bulk export of all documents from API_Docs container fields.
"""
import os
import sys
import json
import requests
import base64
from datetime import datetime
import mimetypes
import uuid
from io import BytesIO
from django.core.management.base import BaseCommand
from django.contrib.contenttypes.models import ContentType

from documents.models import Document
from documents.services import S3Service
from patients.models import Patient

# Suppress SSL warnings
requests.packages.urllib3.disable_warnings()

# Load environment variables from scripts/filemaker/.env file
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '..', '..', '..', '..', 'scripts', 'filemaker', '.env')

FM_USERNAME = None
FM_PASSWORD = None
FM_DATABASE = 'WEP-DatabaseV2'
FM_BASE_URL_DATA_API = None

if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('FM_USERNAME='):
                FM_USERNAME = line.split('=', 1)[1].strip().strip('"').strip("'")
            elif line.startswith('FM_PASSWORD='):
                FM_PASSWORD = line.split('=', 1)[1].strip().strip('"').strip("'")
            elif line.startswith('FM_DATABASE='):
                FM_DATABASE = line.split('=', 1)[1].strip().strip('"').strip("'")

FM_BASE_URL_DATA_API = f"https://walkeasy.fmcloud.fm/fmi/data/v1/databases/{FM_DATABASE}"

# Global stats for logging
stats = {
    'total_found': 0,
    'processed': 0,
    'successful': 0,
    'skipped': 0,
    'failed': 0,
    'errors': []
}


class FileMakerAPI:
    def __init__(self):
        self.token = None
        self.layout = "API_Docs"
        self.container_field = "Doc"

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
        except Exception:
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

    def find_unexported_documents(self, limit=100, offset=1):
        """Find documents in FileMaker that have not been exported yet"""
        find_url = f"{FM_BASE_URL_DATA_API}/layouts/{self.layout}/_find"
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        # Search for docs where NexusExportDate is empty
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
            if response.status_code == 200:
                return True
            else:
                return False
        except Exception:
            return False


def get_patient_nexus_id(filemaker_contact_id):
    """Find the Nexus patient UUID given the FileMaker contact ID"""
    try:
        patient = Patient.objects.filter(notes__filemaker_id=filemaker_contact_id).first()
        if patient:
            return str(patient.id)
        return None
    except Exception:
        return None


def process_document(fm_api, record, s3_service, command):
    """Process a single FileMaker document record"""
    field_data = record.get('fieldData', {})
    fm_doc_id = field_data.get('id')
    fm_record_id = record.get('recordId')
    
    command.stdout.write(f"Processing FM Doc ID: {fm_doc_id} (FM Record ID: {fm_record_id})")

    if not fm_doc_id:
        stats['skipped'] += 1
        stats['errors'].append(f"FM Record ID {fm_record_id}: Missing FileMaker document ID")
        return False

    # Check if already imported into Nexus
    if Document.objects.filter(filemaker_id=fm_doc_id).exists():
        command.stdout.write("   ⏭️  Skipping: Already imported to Nexus")
        stats['skipped'] += 1
        fm_api.update_export_date(fm_record_id)
        return True

    # Get patient Nexus ID
    fm_contact_id = field_data.get('id_Contact')
    nexus_patient_id = None
    if fm_contact_id:
        nexus_patient_id = get_patient_nexus_id(fm_contact_id)
        if not nexus_patient_id:
            command.stdout.write(f"   ⚠️  Warning: No matching Nexus patient found for FileMaker Contact ID: {fm_contact_id}")
    else:
        command.stdout.write("   ⚠️  Warning: Document has no associated FileMaker Contact ID")

    # Download container file
    container_url = field_data.get(fm_api.container_field)
    if not container_url:
        stats['skipped'] += 1
        stats['errors'].append(f"{fm_doc_id}: Container field 'Doc' is empty")
        return False

    command.stdout.write("   ⬇️  Downloading file from FileMaker...")
    file_content, mime_type = fm_api.download_container_file(container_url)
    if not file_content:
        stats['failed'] += 1
        stats['errors'].append(f"{fm_doc_id}: Failed to download file content")
        return False

    # Determine filename and extension
    original_filename = os.path.basename(container_url.split('?')[0])
    if not original_filename or original_filename == fm_doc_id:
        original_filename = f"{fm_doc_id}.pdf"
    
    ext = os.path.splitext(original_filename)[1]
    if not ext and mime_type:
        ext = mimetypes.guess_extension(mime_type) or '.bin'
        original_filename = f"{os.path.splitext(original_filename)[0]}{ext}"

    # Upload to S3
    doc_type_raw = field_data.get('Type', 'other')
    doc_type_folder = doc_type_raw.lower().replace(' ', '-')
    
    command.stdout.write("   ⬆️  Uploading to S3...")
    try:
        file_obj = BytesIO(file_content)
        file_obj.name = original_filename
        file_obj.size = len(file_content)

        s3_key = s3_service.generate_filemaker_document_key(
            patient_id=nexus_patient_id or 'unlinked',
            doc_type=doc_type_folder,
            filemaker_id=fm_doc_id,
            extension=ext
        )
        
        s3_upload_info = s3_service.upload_file(
            file_obj=file_obj,
            filename=original_filename,
            folder=s3_key
        )
        s3_key = s3_upload_info['s3_key']
        command.stdout.write(f"   ✅ Uploaded to S3: {s3_key}")
    except Exception as e:
        stats['failed'] += 1
        stats['errors'].append(f"{fm_doc_id}: Failed to upload to S3 - {e}")
        return False

    # Create Nexus Document record
    command.stdout.write("   📝 Creating Nexus Document record...")
    try:
        document_date_str = field_data.get('Date')
        document_date = None
        if document_date_str:
            try:
                document_date = datetime.strptime(document_date_str, '%Y-%m-%d').date()
            except ValueError:
                try:
                    document_date = datetime.strptime(document_date_str, '%m/%d/%Y').date()
                except ValueError:
                    pass

        Document.objects.create(
            filemaker_id=fm_doc_id,
            content_type=ContentType.objects.get_for_model(Patient) if nexus_patient_id else None,
            object_id=uuid.UUID(nexus_patient_id) if nexus_patient_id else None,
            file_name=original_filename,
            original_name=original_filename,
            file_size=len(file_content),
            mime_type=mime_type,
            s3_bucket=s3_service.bucket_name,
            s3_key=s3_key,
            category=doc_type_folder,
            document_date=document_date,
            uploaded_by=field_data.get('creationAccountName', 'FileMaker Import'),
        )
        command.stdout.write("   ✅ Nexus Document record created")
    except Exception as e:
        stats['failed'] += 1
        stats['errors'].append(f"{fm_doc_id}: Failed to create Nexus Document record - {e}")
        return False

    # Update FileMaker NexusExportDate
    command.stdout.write("   ✍️  Updating FileMaker NexusExportDate...")
    if fm_api.update_export_date(fm_record_id):
        command.stdout.write("   ✅ FileMaker NexusExportDate updated")
    else:
        stats['errors'].append(f"{fm_doc_id}: Failed to update FileMaker NexusExportDate")
        return False

    stats['successful'] += 1
    return True


class Command(BaseCommand):
    help = 'Import FileMaker documents to S3 and Nexus database'

    def handle(self, *args, **options):
        if not FM_USERNAME or not FM_PASSWORD:
            self.stdout.write(self.style.ERROR("❌ FileMaker credentials not found in .env file"))
            return

        self.stdout.write("=" * 80)
        self.stdout.write("📦 FileMaker Documents to S3 Bulk Export")
        self.stdout.write("=" * 80)
        self.stdout.write(f"Database: {FM_DATABASE}")
        self.stdout.write(f"Layout: API_Docs")
        self.stdout.write(f"Query: WHERE NexusExportDate IS EMPTY")
        self.stdout.write("")
        
        # Initialize services
        fm_api = FileMakerAPI()
        s3_service = S3Service()
        
        # Authenticate
        if not fm_api.authenticate():
            self.stdout.write(self.style.ERROR("❌ Authentication failed - exiting"))
            return
        
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write("🔍 Finding and processing unexported documents...")
        self.stdout.write("=" * 80)
        
        # Process in batches
        batch_size = 50
        offset = 1
        total_processed = 0
        
        while True:
            self.stdout.write(f"\n📋 Fetching batch (offset: {offset}, limit: {batch_size})...")
            records, data_info = fm_api.find_unexported_documents(limit=batch_size, offset=offset)
            
            if not records:
                self.stdout.write("   ✅ No more records to process")
                break
            
            found_count = data_info.get('foundCount', 0)
            returned_count = len(records)
            
            if offset == 1:
                stats['total_found'] = found_count
                self.stdout.write(f"   📊 Total unexported documents: {found_count}")
            
            self.stdout.write(f"   📄 Processing {returned_count} documents in this batch...")
            
            # Process each document in this batch
            for i, record in enumerate(records, 1):
                total_processed += 1
                stats['processed'] += 1
                
                self.stdout.write(f"\n[{total_processed}/{stats['total_found']}] ", ending='')
                
                try:
                    process_document(fm_api, record, s3_service, self)
                except Exception as e:
                    self.stdout.write(f"❌ Unexpected error: {e}")
                    stats['failed'] += 1
                    field_data = record.get('fieldData', {})
                    filemaker_id = field_data.get('id', 'unknown')
                    stats['errors'].append(f"{filemaker_id}: Unexpected error - {e}")
            
            # Progress summary after each batch
            self.stdout.write(f"\n📊 Batch {offset}-{offset+returned_count-1} complete:")
            self.stdout.write(f"   Total processed so far: {total_processed}/{stats['total_found']}")
            self.stdout.write(f"   ✅ Successful: {stats['successful']}")
            self.stdout.write(f"   ⏭️  Skipped: {stats['skipped']}")
            self.stdout.write(f"   ❌ Failed: {stats['failed']}")
            
            # Check if we've processed all
            # FIX: Only exit when we've truly processed all found records
            # Don't exit early just because batch size is smaller than expected
            if total_processed >= stats['total_found']:
                self.stdout.write("\n   ✅ All documents processed!")
                break
            
            # Also check if FileMaker returned 0 records (no more data)
            if returned_count == 0:
                self.stdout.write("\n   ✅ No more documents available from FileMaker")
                break
            
            offset += batch_size
        
        # Logout
        fm_api.logout()
        
        # Final summary
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write("📊 EXPORT COMPLETE")
        self.stdout.write("=" * 80)
        self.stdout.write(f"Total found: {stats['total_found']}")
        self.stdout.write(f"Processed: {stats['processed']}")
        self.stdout.write(self.style.SUCCESS(f"✅ Successful: {stats['successful']}"))
        self.stdout.write(f"⏭️  Skipped: {stats['skipped']}")
        self.stdout.write(self.style.ERROR(f"❌ Failed: {stats['failed']}"))
        
        if stats['errors']:
            self.stdout.write(f"\n⚠️  Errors ({len(stats['errors'])}):")
            for error in stats['errors'][:10]:
                self.stdout.write(f"   - {error}")
            if len(stats['errors']) > 10:
                self.stdout.write(f"   ... and {len(stats['errors']) - 10} more")
        
        self.stdout.write("")
        self.stdout.write("=" * 80)

