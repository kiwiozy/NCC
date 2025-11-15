"""
Smart FileMaker Images to S3 - Python handles everything
Uses waterfall logic to find best available image per record.

Usage: python manage.py smart_export_filemaker_images
"""
import os
import sys
import time
import requests
import urllib3
from io import BytesIO
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from documents.services import S3Service

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class Command(BaseCommand):
    help = 'Smart export: Find best image per record and upload to S3 (via OData)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of images to process (for testing)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='Number of records to fetch per API request'
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=0.3,
            help='Delay between downloads in seconds'
        )

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write("SMART FILEMAKER IMAGE EXPORT TO S3")
        self.stdout.write("Python finds best image, downloads, uploads to S3")
        self.stdout.write("="*80 + "\n")
        
        limit = options['limit']
        batch_size = options['batch_size']
        delay = options['delay']
        
        self.stdout.write(f"Limit: {limit or 'None (all images)'}")
        self.stdout.write(f"Batch Size: {batch_size} records per API request")
        self.stdout.write(f"Delay: {delay}s between downloads\n")
        
        # Load FileMaker config
        env_path = os.path.join(settings.BASE_DIR.parent, 'scripts/filemaker/.env')
        fm_config = self.load_fm_config(env_path)
        
        if not fm_config:
            self.stdout.write(self.style.ERROR("❌ Could not load FileMaker config"))
            return
        
        # Authenticate
        token = self.authenticate(fm_config)
        if not token:
            return
        
        # Fetch image records
        self.stdout.write("\n" + "="*80)
        self.stdout.write("PHASE 1: Fetching image metadata from FileMaker")
        self.stdout.write("="*80 + "\n")
        
        image_records = self.fetch_image_records(fm_config, token, batch_size, limit)
        
        if not image_records:
            self.stdout.write(self.style.WARNING("⚠️  No images found"))
            return
        
        self.stdout.write(f"\n✅ Found {len(image_records)} images to process\n")
        
        # Process images
        self.stdout.write("\n" + "="*80)
        self.stdout.write("PHASE 2: Smart download & upload to S3")
        self.stdout.write("="*80 + "\n")
        
        success_count = 0
        failed_count = 0
        skipped_count = 0
        
        s3_service = S3Service()
        container_fields = ['image_Full', 'image_Ex_large', 'image_large', 'image_medium', 'image_small']
        
        for idx, record in enumerate(image_records, 1):
            try:
                image_id = record['fieldData'].get('id')
                record_id = record['recordId']
                
                self.stdout.write(f"\n[{idx}/{len(image_records)}] Processing: {image_id}")
                
                # Check if already exported
                export_date = record['fieldData'].get('NexusExportDate')
                if export_date:
                    self.stdout.write(f"   ⏭️  Already exported on {export_date}")
                    skipped_count += 1
                    continue
                
                # Check S3 (in case export date wasn't set)
                s3_key_base = f"filemaker-import/images-bulk-dump/{image_id}"
                
                # Try common extensions
                found_in_s3 = False
                for ext in ['.jpg', '.png', '.jpeg', '.gif']:
                    if s3_service.check_file_exists(f"{s3_key_base}{ext}"):
                        self.stdout.write(f"   ⏭️  Already in S3 as {s3_key_base}{ext}")
                        skipped_count += 1
                        found_in_s3 = True
                        break
                
                if found_in_s3:
                    continue
                
                # Waterfall: Find best available container
                best_image = None
                best_field = None
                
                for field_name in container_fields:
                    container_url = record['fieldData'].get(field_name)
                    
                    if not container_url or container_url == '?':
                        continue
                    
                    self.stdout.write(f"   🔍 Checking {field_name}...")
                    
                    # Download this container
                    image_data = self.download_container(fm_config, token, container_url)
                    
                    if image_data:
                        best_image = image_data
                        best_field = field_name
                        self.stdout.write(f"   ✅ Found image in {field_name} ({len(image_data)} bytes)")
                        break  # Stop at first successful download
                
                if not best_image:
                    self.stdout.write(f"   ❌ No images found in any container field")
                    failed_count += 1
                    continue
                
                # Determine file extension from data
                extension = self.detect_extension(best_image)
                
                # Upload to S3
                file_obj = BytesIO(best_image)
                file_obj.size = len(best_image)
                file_obj.name = f"{image_id}{extension}"
                
                s3_service.upload_file(
                    file_obj=file_obj,
                    filename=f"{image_id}{extension}",
                    folder="filemaker-import/images-bulk-dump"
                )
                
                self.stdout.write(f"   ✅ Uploaded to S3: {s3_key_base}{extension}")
                
                # Update NexusExportDate in FileMaker
                self.update_export_date(fm_config, token, record_id)
                
                success_count += 1
                
                # Delay
                time.sleep(delay)
                
            except Exception as e:
                self.stdout.write(f"   ❌ Error: {str(e)}")
                failed_count += 1
        
        # Summary
        self.stdout.write("\n" + "="*80)
        self.stdout.write("SUMMARY")
        self.stdout.write("="*80)
        self.stdout.write(f"✅ Successfully uploaded: {success_count}")
        self.stdout.write(f"⏭️  Skipped (already done): {skipped_count}")
        self.stdout.write(f"❌ Failed: {failed_count}")
        self.stdout.write(f"📊 Total processed: {len(image_records)}")
        self.stdout.write("="*80 + "\n")
        
        self.stdout.write(self.style.SUCCESS('✅ Smart export complete!'))

    def load_fm_config(self, env_path):
        """Load FileMaker configuration"""
        if not os.path.exists(env_path):
            self.stdout.write(self.style.ERROR(f"❌ .env file not found at: {env_path}"))
            return None
        
        config = {}
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
        
        required = ['FM_BASE_URL', 'FM_DATABASE', 'FM_USERNAME', 'FM_PASSWORD']
        if not all(k in config for k in required):
            self.stdout.write(self.style.ERROR("❌ Missing required config"))
            return None
        
        return config

    def authenticate(self, fm_config):
        """Authenticate with FileMaker Data API"""
        self.stdout.write("🔐 Authenticating with FileMaker...")
        
        url = f"{fm_config['FM_BASE_URL']}/fmi/data/v1/databases/{fm_config['FM_DATABASE']}/sessions"
        
        try:
            response = requests.post(
                url,
                headers={'Content-Type': 'application/json'},
                auth=(fm_config['FM_USERNAME'], fm_config['FM_PASSWORD']),
                verify=False,
                timeout=30
            )
            
            if response.status_code == 200:
                token = response.json()['response']['token']
                self.stdout.write(self.style.SUCCESS("✅ Authenticated successfully"))
                return token
            else:
                self.stdout.write(self.style.ERROR(f"❌ Authentication failed: {response.status_code}"))
                return None
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Authentication error: {str(e)}"))
            return None

    def fetch_image_records(self, fm_config, token, batch_size, limit):
        """Fetch image records from FileMaker using Data API"""
        records = []
        offset = 1
        
        while True:
            try:
                url = f"{fm_config['FM_BASE_URL']}/fmi/data/v1/databases/{fm_config['FM_DATABASE']}/layouts/API_Images/records"
                
                params = {
                    '_offset': offset,
                    '_limit': batch_size
                }
                
                response = requests.get(
                    url,
                    params=params,
                    headers={
                        'Authorization': f'Bearer {token}',
                        'Content-Type': 'application/json'
                    },
                    verify=False,
                    timeout=30
                )
                
                if response.status_code != 200:
                    self.stdout.write(self.style.WARNING(f"⚠️  API request failed: {response.status_code}"))
                    break
                
                data = response.json()
                batch = data.get('response', {}).get('data', [])
                
                if not batch:
                    break
                
                records.extend(batch)
                
                self.stdout.write(f"   Fetched {len(records)} records...")
                
                # Check limit
                if limit and len(records) >= limit:
                    records = records[:limit]
                    break
                
                offset += batch_size
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Error fetching records: {str(e)}"))
                break
        
        return records

    def download_container(self, fm_config, token, container_url):
        """Download container field content"""
        try:
            # Fix malformed URL
            if container_url.startswith('/'):
                full_url = f"{fm_config['FM_BASE_URL']}{container_url}"
            else:
                full_url = container_url
            
            full_url = full_url.replace('fmcloud.fmhttps', 'fmcloud.fm')
            full_url = full_url.replace('http://', 'https://')
            
            response = requests.get(
                full_url,
                headers={'Authorization': f'Bearer {token}'},
                verify=False,
                timeout=30
            )
            
            if response.status_code == 200 and response.content:
                return response.content
            
            return None
            
        except Exception as e:
            return None

    def detect_extension(self, image_data):
        """Detect file extension from image data"""
        # Check magic bytes
        if image_data.startswith(b'\xFF\xD8\xFF'):
            return '.jpg'
        elif image_data.startswith(b'\x89PNG'):
            return '.png'
        elif image_data.startswith(b'GIF'):
            return '.gif'
        elif image_data.startswith(b'%PDF'):
            return '.pdf'
        else:
            return '.jpg'  # Default

    def update_export_date(self, fm_config, token, record_id):
        """Update NexusExportDate in FileMaker"""
        try:
            url = f"{fm_config['FM_BASE_URL']}/fmi/data/v1/databases/{fm_config['FM_DATABASE']}/layouts/API_Images/records/{record_id}"
            
            payload = {
                "fieldData": {
                    "NexusExportDate": datetime.now().isoformat()
                }
            }
            
            response = requests.patch(
                url,
                json=payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                verify=False,
                timeout=30
            )
            
            return response.status_code == 200
            
        except Exception as e:
            return False

