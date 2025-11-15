"""
Bulk dump FileMaker images to S3 - Simple & Fast
Just download and save with FileMaker ID, link to patients later.

Usage: python manage.py bulk_dump_filemaker_images
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

# Disable SSL warnings for local FileMaker Server
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class Command(BaseCommand):
    help = 'Bulk dump all FileMaker images to S3 (no patient linking, just raw dump)'

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
            default=0.2,
            help='Delay between downloads in seconds (avoid overwhelming FileMaker)'
        )

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write("FILEMAKER IMAGES - BULK DUMP TO S3")
        self.stdout.write("="*80 + "\n")
        
        limit = options['limit']
        batch_size = options['batch_size']
        delay = options['delay']
        
        self.stdout.write(f"Limit: {limit or 'None (all images)'}")
        self.stdout.write(f"Batch Size: {batch_size} records per API request")
        self.stdout.write(f"Delay: {delay}s between downloads")
        self.stdout.write("")
        
        # Load FileMaker credentials
        env_path = os.path.join(settings.BASE_DIR.parent, 'scripts/filemaker/.env')
        fm_config = self.load_fm_config(env_path)
        
        if not fm_config:
            self.stdout.write(self.style.ERROR("❌ Could not load FileMaker config"))
            return
        
        # Authenticate
        token = self.authenticate(fm_config)
        if not token:
            return
        
        # Phase 1: Get list of all image IDs
        self.stdout.write("\n" + "="*80)
        self.stdout.write("PHASE 1: Fetching image metadata")
        self.stdout.write("="*80 + "\n")
        
        image_ids = self.fetch_all_image_ids(fm_config, token, batch_size, limit)
        
        if not image_ids:
            self.stdout.write(self.style.WARNING("⚠️  No images found"))
            return
        
        self.stdout.write(f"\n✅ Found {len(image_ids)} images to download\n")
        
        # Phase 2: Download and dump to S3
        self.stdout.write("\n" + "="*80)
        self.stdout.write("PHASE 2: Downloading images to S3")
        self.stdout.write("="*80 + "\n")
        
        success_count = 0
        failed_count = 0
        skipped_count = 0
        
        s3_service = S3Service()
        
        for idx, image_id in enumerate(image_ids, 1):
            try:
                self.stdout.write(f"\n[{idx}/{len(image_ids)}] Processing: {image_id}")
                
                # Check if already exists in S3
                s3_key = f"filemaker-import/images-bulk-dump/{image_id}.jpg"
                
                if s3_service.check_file_exists(s3_key):
                    self.stdout.write(f"   ⏭️  Already exists in S3")
                    skipped_count += 1
                    continue
                
                # Download from FileMaker
                image_data = self.download_image(fm_config, token, image_id)
                
                if not image_data:
                    self.stdout.write(f"   ❌ Failed to download")
                    failed_count += 1
                    continue
                
                # Wrap bytes in BytesIO for S3 upload
                file_obj = BytesIO(image_data)
                file_obj.size = len(image_data)
                file_obj.name = f"{image_id}.jpg"
                
                # Upload to S3 (simple dump, no processing)
                s3_service.upload_file(
                    file_obj=file_obj,
                    filename=f"{image_id}.jpg",
                    folder="filemaker-import/images-bulk-dump"
                )
                
                self.stdout.write(f"   ✅ Uploaded to S3: {s3_key}")
                success_count += 1
                
                # Delay to avoid overwhelming FileMaker
                time.sleep(delay)
                
            except Exception as e:
                self.stdout.write(f"   ❌ Error: {str(e)}")
                failed_count += 1
        
        # Summary
        self.stdout.write("\n" + "="*80)
        self.stdout.write("SUMMARY")
        self.stdout.write("="*80)
        self.stdout.write(f"✅ Successfully dumped: {success_count}")
        self.stdout.write(f"⏭️  Skipped (already in S3): {skipped_count}")
        self.stdout.write(f"❌ Failed: {failed_count}")
        self.stdout.write(f"📊 Total processed: {len(image_ids)}")
        self.stdout.write("="*80 + "\n")
        
        self.stdout.write(self.style.SUCCESS('✅ Bulk dump complete!'))
        self.stdout.write("")
        self.stdout.write("Next step: Run link_filemaker_images_to_patients.py to connect images to patients")

    def load_fm_config(self, env_path):
        """Load FileMaker configuration from .env file"""
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
                self.stdout.write(self.style.ERROR(f"❌ Authentication failed: {response.status_code} - {response.text}"))
                return None
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Authentication error: {str(e)}"))
            return None

    def fetch_all_image_ids(self, fm_config, token, batch_size, limit):
        """Fetch all image IDs from FileMaker"""
        image_ids = []
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
                records = data.get('response', {}).get('data', [])
                
                if not records:
                    break
                
                for record in records:
                    image_id = record.get('fieldData', {}).get('id')
                    if image_id:
                        image_ids.append(image_id)
                
                self.stdout.write(f"   Fetched {len(image_ids)} image IDs...")
                
                # Check limit
                if limit and len(image_ids) >= limit:
                    image_ids = image_ids[:limit]
                    break
                
                offset += batch_size
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Error fetching IDs: {str(e)}"))
                break
        
        return image_ids

    def download_image(self, fm_config, token, image_id):
        """Download a single image from FileMaker"""
        try:
            # Find the record
            url = f"{fm_config['FM_BASE_URL']}/fmi/data/v1/databases/{fm_config['FM_DATABASE']}/layouts/API_Images/_find"
            
            find_payload = {
                "query": [{"id": image_id}],
                "limit": "1"
            }
            
            response = requests.post(
                url,
                json=find_payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                verify=False,
                timeout=30
            )
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            records = data.get('response', {}).get('data', [])
            
            if not records:
                return None
            
            record = records[0]
            record_id = record['recordId']
            
            # Try container fields in order
            container_fields = ['image_Full', 'image_Ex_large', 'image_large', 'image_medium', 'image_small']
            
            for field_name in container_fields:
                container_url = record.get('fieldData', {}).get(field_name)
                
                if not container_url or container_url == '?':
                    continue
                
                # Download container
                # Fix malformed URL if needed (FileMaker sometimes returns invalid URLs)
                if container_url.startswith('/'):
                    full_url = f"{fm_config['FM_BASE_URL']}{container_url}"
                else:
                    full_url = container_url
                
                # Additional fix for malformed hostnames
                full_url = full_url.replace('fmcloud.fmhttps', 'fmcloud.fm')
                full_url = full_url.replace('http://', 'https://')
                
                img_response = requests.get(
                    full_url,
                    headers={'Authorization': f'Bearer {token}'},
                    verify=False,
                    timeout=30
                )
                
                if img_response.status_code == 200 and img_response.content:
                    return img_response.content
            
            return None
            
        except Exception as e:
            self.stdout.write(f"   ❌ Download error: {str(e)}")
            return None

