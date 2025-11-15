"""
Export Marked Images to S3
Reads best_image_container field and exports only that container to S3.

Usage: python manage.py export_marked_images
"""
import os
import time
import requests
import urllib3
from io import BytesIO
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from documents.services import S3Service

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class Command(BaseCommand):
    help = 'Export images to S3 using best_image_container field'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of images'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='Records per API request'
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=0.3,
            help='Delay between downloads'
        )

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write("EXPORT MARKED IMAGES TO S3")
        self.stdout.write("Uses best_image_container field to know which container to export")
        self.stdout.write("="*80 + "\n")
        
        limit = options['limit']
        batch_size = options['batch_size']
        delay = options['delay']
        
        # Load config
        env_path = os.path.join(settings.BASE_DIR.parent, 'scripts/filemaker/.env')
        fm_config = self.load_fm_config(env_path)
        
        if not fm_config:
            self.stdout.write(self.style.ERROR("❌ Config failed"))
            return
        
        # Auth
        token = self.authenticate(fm_config)
        if not token:
            return
        
        # Fetch records WITH best_image_container marked
        self.stdout.write("\nFetching marked records...")
        records = self.fetch_marked_records(fm_config, token, batch_size, limit)
        
        if not records:
            self.stdout.write(self.style.WARNING("⚠️  No marked records found"))
            self.stdout.write("\nRun: python manage.py mark_best_image_containers first")
            return
        
        self.stdout.write(f"✅ Found {len(records)} marked records\n")
        
        # Export
        self.stdout.write("="*80)
        self.stdout.write("EXPORTING TO S3")
        self.stdout.write("="*80 + "\n")
        
        success_count = 0
        failed_count = 0
        skipped_count = 0
        
        s3_service = S3Service()
        
        for idx, record in enumerate(records, 1):
            try:
                image_id = record['fieldData'].get('id')
                record_id = record['recordId']
                best_container = record['fieldData'].get('best_image_container')
                export_date = record['fieldData'].get('NexusExportDate')
                
                self.stdout.write(f"\n[{idx}/{len(records)}] {image_id}")
                self.stdout.write(f"   Container: {best_container}")
                
                # Skip if already exported
                if export_date:
                    self.stdout.write(f"   ⏭️  Already exported")
                    skipped_count += 1
                    continue
                
                if not best_container:
                    self.stdout.write(f"   ❌ No container marked")
                    failed_count += 1
                    continue
                
                # Check S3
                s3_key_base = f"filemaker-import/images-bulk-dump/{image_id}"
                found_in_s3 = False
                for ext in ['.jpg', '.png', '.jpeg', '.gif', '.pdf']:
                    if s3_service.check_file_exists(f"{s3_key_base}{ext}"):
                        self.stdout.write(f"   ⏭️  Already in S3")
                        skipped_count += 1
                        found_in_s3 = True
                        break
                
                if found_in_s3:
                    continue
                
                # Get container URL for the marked field
                container_url = record['fieldData'].get(best_container)
                
                if not container_url or container_url == '?':
                    self.stdout.write(f"   ❌ Container {best_container} is empty")
                    failed_count += 1
                    continue
                
                # Download
                image_data = self.download_container(fm_config, token, container_url)
                
                if not image_data:
                    self.stdout.write(f"   ❌ Download failed")
                    failed_count += 1
                    continue
                
                # Detect extension
                extension = self.detect_extension(image_data)
                
                # Upload
                file_obj = BytesIO(image_data)
                file_obj.size = len(image_data)
                file_obj.name = f"{image_id}{extension}"
                
                s3_service.upload_file(
                    file_obj=file_obj,
                    filename=f"{image_id}{extension}",
                    folder="filemaker-import/images-bulk-dump"
                )
                
                self.stdout.write(f"   ✅ Uploaded ({len(image_data)} bytes) as {s3_key_base}{extension}")
                
                # Update export date
                self.update_export_date(fm_config, token, record_id)
                
                success_count += 1
                time.sleep(delay)
                
            except Exception as e:
                self.stdout.write(f"   ❌ Error: {str(e)}")
                failed_count += 1
        
        # Summary
        self.stdout.write("\n" + "="*80)
        self.stdout.write("SUMMARY")
        self.stdout.write("="*80)
        self.stdout.write(f"✅ Uploaded: {success_count}")
        self.stdout.write(f"⏭️  Skipped: {skipped_count}")
        self.stdout.write(f"❌ Failed: {failed_count}")
        self.stdout.write(f"📊 Total: {len(records)}")
        self.stdout.write("="*80 + "\n")
        
        self.stdout.write(self.style.SUCCESS('✅ Export complete!'))

    def load_fm_config(self, env_path):
        if not os.path.exists(env_path):
            return None
        config = {}
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
        required = ['FM_BASE_URL', 'FM_DATABASE', 'FM_USERNAME', 'FM_PASSWORD']
        return config if all(k in config for k in required) else None

    def authenticate(self, fm_config):
        self.stdout.write("🔐 Authenticating...")
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
                self.stdout.write(self.style.SUCCESS("✅ Authenticated\n"))
                return token
            else:
                self.stdout.write(self.style.ERROR(f"❌ Failed: {response.status_code}"))
                return None
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))
            return None

    def fetch_marked_records(self, fm_config, token, batch_size, limit):
        """Fetch only records that have best_image_container marked"""
        records = []
        offset = 1
        
        while True:
            try:
                url = f"{fm_config['FM_BASE_URL']}/fmi/data/v1/databases/{fm_config['FM_DATABASE']}/layouts/API_Images/records"
                
                response = requests.get(
                    url,
                    params={'_offset': offset, '_limit': batch_size},
                    headers={
                        'Authorization': f'Bearer {token}',
                        'Content-Type': 'application/json'
                    },
                    verify=False,
                    timeout=30
                )
                
                if response.status_code != 200:
                    break
                
                data = response.json()
                batch = data.get('response', {}).get('data', [])
                
                if not batch:
                    break
                
                # Filter: only records with best_image_container set
                for record in batch:
                    if record['fieldData'].get('best_image_container'):
                        records.append(record)
                
                if limit and len(records) >= limit:
                    records = records[:limit]
                    break
                
                offset += batch_size
                
            except Exception as e:
                break
        
        return records

    def download_container(self, fm_config, token, container_url):
        try:
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
        except:
            return None

    def detect_extension(self, data):
        if data.startswith(b'\xFF\xD8\xFF'):
            return '.jpg'
        elif data.startswith(b'\x89PNG'):
            return '.png'
        elif data.startswith(b'GIF'):
            return '.gif'
        elif data.startswith(b'%PDF'):
            return '.pdf'
        return '.jpg'

    def update_export_date(self, fm_config, token, record_id):
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
        except:
            return False

