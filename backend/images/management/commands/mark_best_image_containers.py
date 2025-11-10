"""
Mark Best Image Container in FileMaker
Finds best available container and stores field name in best_image_container field.

Usage: python manage.py mark_best_image_containers
"""
import os
import requests
import urllib3
from django.core.management.base import BaseCommand
from django.conf import settings

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class Command(BaseCommand):
    help = 'Mark which container field has the best image (stores field name in best_image_container)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of records to process'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='Number of records per API request'
        )

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write("MARK BEST IMAGE CONTAINERS")
        self.stdout.write("Finds best available image and stores container field name")
        self.stdout.write("="*80 + "\n")
        
        limit = options['limit']
        batch_size = options['batch_size']
        
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
        
        # Fetch records
        self.stdout.write("\nFetching image records...")
        records = self.fetch_records(fm_config, token, batch_size, limit)
        
        if not records:
            self.stdout.write(self.style.WARNING("⚠️  No records found"))
            return
        
        self.stdout.write(f"✅ Found {len(records)} records to process\n")
        
        # Process records
        self.stdout.write("="*80)
        self.stdout.write("PROCESSING RECORDS")
        self.stdout.write("="*80 + "\n")
        
        marked_count = 0
        skipped_count = 0
        no_image_count = 0
        
        container_fields = ['image_Full', 'image_Ex_large', 'image_large', 'image_medium', 'image_small']
        
        for idx, record in enumerate(records, 1):
            try:
                image_id = record['fieldData'].get('id')
                record_id = record['recordId']
                current_best = record['fieldData'].get('best_image_container')
                
                self.stdout.write(f"\n[{idx}/{len(records)}] {image_id}")
                
                # Skip if already marked
                if current_best:
                    self.stdout.write(f"   ⏭️  Already marked: {current_best}")
                    skipped_count += 1
                    continue
                
                # Find best available container (waterfall)
                best_container = None
                
                for field_name in container_fields:
                    container_url = record['fieldData'].get(field_name)
                    
                    # Check if container has data (not empty and not just "?")
                    if container_url and container_url != '?':
                        best_container = field_name
                        self.stdout.write(f"   ✅ Best: {field_name}")
                        break
                
                if not best_container:
                    self.stdout.write(f"   ❌ No images found")
                    no_image_count += 1
                    continue
                
                # Update FileMaker record
                success = self.update_best_container(fm_config, token, record_id, best_container)
                
                if success:
                    self.stdout.write(f"   📝 Updated: best_image_container = {best_container}")
                    marked_count += 1
                else:
                    self.stdout.write(f"   ❌ Failed to update")
                
            except Exception as e:
                self.stdout.write(f"   ❌ Error: {str(e)}")
        
        # Summary
        self.stdout.write("\n" + "="*80)
        self.stdout.write("SUMMARY")
        self.stdout.write("="*80)
        self.stdout.write(f"✅ Marked: {marked_count}")
        self.stdout.write(f"⏭️  Skipped (already marked): {skipped_count}")
        self.stdout.write(f"❌ No images: {no_image_count}")
        self.stdout.write(f"📊 Total: {len(records)}")
        self.stdout.write("="*80 + "\n")
        
        self.stdout.write(self.style.SUCCESS('✅ Complete!'))
        self.stdout.write("\nNext: Run export script to upload marked images to S3")

    def load_fm_config(self, env_path):
        """Load FileMaker configuration"""
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
        if not all(k in config for k in required):
            return None
        
        return config

    def authenticate(self, fm_config):
        """Authenticate with FileMaker"""
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
                self.stdout.write(self.style.ERROR(f"❌ Auth failed: {response.status_code}"))
                return None
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))
            return None

    def fetch_records(self, fm_config, token, batch_size, limit):
        """Fetch records from FileMaker"""
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
                
                records.extend(batch)
                
                if limit and len(records) >= limit:
                    records = records[:limit]
                    break
                
                offset += batch_size
                
            except Exception as e:
                self.stdout.write(f"Error fetching: {str(e)}")
                break
        
        return records

    def update_best_container(self, fm_config, token, record_id, container_name):
        """Update best_image_container field in FileMaker"""
        try:
            url = f"{fm_config['FM_BASE_URL']}/fmi/data/v1/databases/{fm_config['FM_DATABASE']}/layouts/API_Images/records/{record_id}"
            
            payload = {
                "fieldData": {
                    "best_image_container": container_name
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

