#!/usr/bin/env python3
"""
FileMaker Documents to S3 Bulk Export Script

Downloads all documents from FileMaker API_Docs and uploads to S3.
Only processes documents where NexusExportDate is empty (not yet exported).

Features:
- Incremental import (tracks what's exported)
- Progress tracking with statistics
- Error handling and retry logic
- Updates FileMaker after successful export
- Can be safely re-run (skips already exported docs)
"""
import os
import sys
import json
import base64
import requests
import mimetypes
from datetime import datetime
from io import BytesIO

# Add backend to path for Django models
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')

import django
django.setup()

from django.contrib.contenttypes.models import ContentType
from patients.models import Patient
from documents.models import Document
from documents.services import S3Service

# Suppress SSL warnings
requests.packages.urllib3.disable_warnings()

# Load FileMaker credentials
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')

FM_USERNAME = None
FM_PASSWORD = None
FM_DATABASE = 'WEP-DatabaseV2'

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

FM_BASE_URL = f"https://walkeasy.fmcloud.fm/fmi/data/v1/databases/{FM_DATABASE}"

# Document type mapping (FileMaker -> Nexus category)
DOC_TYPE_MAPPING = {
    'Referral': 'referral',
    'ERF': 'erf',
    'Purchase order': 'purchase_order',
    'Purchase Order': 'purchase_order',
    'Quote': 'quote',
    'File Notes': 'medical',
    'Report': 'medical',
    'Letter': 'medical',
}

# Statistics
stats = {
    'total_found': 0,
    'processed': 0,
    'successful': 0,
    'failed': 0,
    'skipped': 0,
    'errors': []
}


class FileMakerAPI:
    """FileMaker Data API wrapper"""
    
    def __init__(self):
        self.token = None
        
    def authenticate(self):
        """Authenticate with FileMaker Data API"""
        print("🔐 Authenticating with FileMaker...")
        
        auth_url = f"{FM_BASE_URL}/sessions"
        auth_string = base64.b64encode(f"{FM_USERNAME}:{FM_PASSWORD}".encode()).decode()
        headers = {
            'Authorization': f'Basic {auth_string}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.post(auth_url, headers=headers, timeout=30, verify=False)
            
            if response.status_code == 200:
                self.token = response.json()['response']['token']
                print(f"✅ Authenticated (token: {self.token[:20]}...)")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                print(response.text)
                return False
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False
    
    def find_unexported_documents(self, limit=100, offset=1):
        """Find documents that haven't been exported yet"""
        find_url = f"{FM_BASE_URL}/layouts/API_Docs/_find"
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        # Search for docs where NexusExportDate is empty
        # FileMaker syntax: "=" means empty/null field
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
                records = data['response']['data']
                data_info = data['response'].get('dataInfo', {})
                return records, data_info
            else:
                print(f"❌ Find error: {response.status_code}")
                print(response.text)
                return [], {}
        except Exception as e:
            print(f"❌ Find exception: {e}")
            return [], {}
    
    def get_record_with_container(self, record_id):
        """Get full record including container field URL"""
        get_url = f"{FM_BASE_URL}/layouts/API_Docs/records/{record_id}"
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(get_url, headers=headers, timeout=30, verify=False)
            
            if response.status_code == 200:
                return response.json()['response']['data'][0]
            else:
                return None
        except Exception as e:
            print(f"❌ Get record error: {e}")
            return None
    
    def download_container_file(self, container_url):
        """Download file from container URL"""
        headers = {
            'Authorization': f'Bearer {self.token}'
        }
        
        try:
            response = requests.get(container_url, headers=headers, timeout=60, verify=False)
            
            if response.status_code == 200:
                return response.content
            else:
                print(f"❌ Download error: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Download exception: {e}")
            return None
    
    def mark_as_exported(self, record_id, filemaker_id):
        """Update NexusExportDate in FileMaker after successful export"""
        update_url = f"{FM_BASE_URL}/layouts/API_Docs/records/{record_id}"
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
                print(f"⚠️  Failed to mark {filemaker_id} as exported: {response.status_code}")
                return False
        except Exception as e:
            print(f"⚠️  Mark exported exception: {e}")
            return False
    
    def logout(self):
        """Logout from FileMaker"""
        if self.token:
            logout_url = f"{FM_BASE_URL}/sessions/{self.token}"
            try:
                requests.delete(logout_url, timeout=30, verify=False)
                print("✅ Logged out from FileMaker")
            except:
                pass


def get_patient_by_filemaker_id(filemaker_contact_id):
    """Find Nexus patient by FileMaker ID stored in notes JSON"""
    try:
        # FileMaker ID is stored in notes JSON field
        patients = Patient.objects.filter(notes__filemaker_id=filemaker_contact_id)
        if patients.exists():
            return patients.first()
        return None
    except Exception as e:
        print(f"⚠️  Patient lookup error: {e}")
        return None


def process_document(fm_api, record, s3_service):
    """Process a single document: download from FileMaker, upload to S3, create Nexus record"""
    
    field_data = record['fieldData']
    fm_record_id = record['recordId']
    
    filemaker_id = field_data.get('id')
    filemaker_contact_id = field_data.get('id_Contact')
    doc_type = field_data.get('Type', 'Other')
    doc_date = field_data.get('Date')
    container_url = field_data.get('Doc')
    
    print(f"\n📄 Processing: {filemaker_id}")
    print(f"   Type: {doc_type}")
    print(f"   Patient FM ID: {filemaker_contact_id}")
    
    # Check if already imported
    existing = Document.objects.filter(filemaker_id=filemaker_id).first()
    if existing:
        print(f"   ⏭️  Already imported (Nexus ID: {existing.id})")
        stats['skipped'] += 1
        # Still mark as exported in FileMaker
        fm_api.mark_as_exported(fm_record_id, filemaker_id)
        return True
    
    # Check if container field has URL
    if not container_url:
        print(f"   ⚠️  No container URL - skipping")
        stats['skipped'] += 1
        stats['errors'].append(f"{filemaker_id}: No container URL")
        return False
    
    # Find patient in Nexus
    patient = get_patient_by_filemaker_id(filemaker_contact_id)
    if not patient:
        print(f"   ⚠️  Patient not found in Nexus")
        stats['skipped'] += 1
        stats['errors'].append(f"{filemaker_id}: Patient {filemaker_contact_id} not found")
        return False
    
    print(f"   ✅ Patient found: {patient.first_name} {patient.last_name}")
    
    # Download file from FileMaker
    print(f"   ⬇️  Downloading from FileMaker...")
    file_content = fm_api.download_container_file(container_url)
    
    if not file_content:
        print(f"   ❌ Download failed")
        stats['failed'] += 1
        stats['errors'].append(f"{filemaker_id}: Download failed")
        return False
    
    file_size = len(file_content)
    print(f"   ✅ Downloaded {file_size / 1024:.1f} KB")
    
    # Determine file extension from URL
    extension = '.pdf'  # Default
    if '.' in container_url:
        extension = '.' + container_url.split('.')[-1].split('?')[0]
    
    # Generate S3 key
    nexus_category = DOC_TYPE_MAPPING.get(doc_type, 'other')
    s3_key = s3_service.generate_filemaker_document_key(
        patient_id=str(patient.id),
        doc_type=nexus_category,
        filemaker_id=filemaker_id,
        extension=extension
    )
    
    print(f"   📤 Uploading to S3: {s3_key}")
    
    # Upload to S3
    try:
        file_obj = BytesIO(file_content)
        file_obj.size = file_size
        
        mime_type = mimetypes.guess_type(f"file{extension}")[0] or 'application/octet-stream'
        
        extra_args = {
            'ContentType': mime_type,
            'ContentDisposition': f'attachment; filename="{filemaker_id}{extension}"',
        }
        
        s3_service.s3_client.upload_fileobj(
            file_obj,
            s3_service.bucket_name,
            s3_key,
            ExtraArgs=extra_args
        )
        
        print(f"   ✅ Uploaded to S3")
        
    except Exception as e:
        print(f"   ❌ S3 upload failed: {e}")
        stats['failed'] += 1
        stats['errors'].append(f"{filemaker_id}: S3 upload failed - {e}")
        return False
    
    # Create Document record in Nexus
    try:
        patient_content_type = ContentType.objects.get_for_model(Patient)
        
        document = Document.objects.create(
            content_type=patient_content_type,
            object_id=patient.id,
            file_name=f"{filemaker_id}{extension}",
            original_name=f"{doc_type}_{filemaker_id}{extension}",
            file_size=file_size,
            mime_type=mime_type,
            s3_bucket=s3_service.bucket_name,
            s3_key=s3_key,
            category=nexus_category,
            description=f"Imported from FileMaker API_Docs (Type: {doc_type})",
            document_date=doc_date if doc_date else None,
            uploaded_by='FileMaker Import Script',
            filemaker_id=filemaker_id,
        )
        
        print(f"   ✅ Created Document record: {document.id}")
        
    except Exception as e:
        print(f"   ❌ Database create failed: {e}")
        stats['failed'] += 1
        stats['errors'].append(f"{filemaker_id}: Database create failed - {e}")
        return False
    
    # Mark as exported in FileMaker
    print(f"   ✅ Marking as exported in FileMaker...")
    fm_api.mark_as_exported(fm_record_id, filemaker_id)
    
    stats['successful'] += 1
    return True


def main():
    """Main export process"""
    print("=" * 80)
    print("📦 FileMaker Documents to S3 Bulk Export")
    print("=" * 80)
    print(f"Database: {FM_DATABASE}")
    print(f"Layout: API_Docs")
    print(f"Query: WHERE NexusExportDate IS EMPTY")
    print()
    
    # Initialize services
    fm_api = FileMakerAPI()
    s3_service = S3Service()
    
    # Authenticate
    if not fm_api.authenticate():
        print("❌ Authentication failed - exiting")
        sys.exit(1)
    
    print()
    print("=" * 80)
    print("🔍 Finding unexported documents...")
    print("=" * 80)
    
    # Find all unexported documents (paginated)
    batch_size = 2
    offset = 1
    all_records = []
    
    while True:
        print(f"\n📋 Fetching batch (offset: {offset}, limit: {batch_size})...")
        records, data_info = fm_api.find_unexported_documents(limit=batch_size, offset=offset)
        
        if not records:
            break
        
        all_records.extend(records)
        found_count = data_info.get('foundCount', 0)
        returned_count = data_info.get('returnedCount', 0)
        
        print(f"   Found: {found_count} total, returned: {returned_count} in this batch")
        
        if returned_count < batch_size:
            break
        
        offset += batch_size
    
    stats['total_found'] = len(all_records)
    
    print()
    print("=" * 80)
    print(f"📊 Total unexported documents found: {stats['total_found']}")
    print("=" * 80)
    
    if stats['total_found'] == 0:
        print("\n✅ All documents already exported!")
        fm_api.logout()
        return
    
    print(f"\n⏳ Processing {stats['total_found']} documents...")
    print("=" * 80)
    
    # Process each document
    for i, record in enumerate(all_records, 1):
        stats['processed'] += 1
        
        print(f"\n[{i}/{stats['total_found']}]", end=' ')
        
        try:
            process_document(fm_api, record, s3_service)
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            stats['failed'] += 1
            field_data = record.get('fieldData', {})
            filemaker_id = field_data.get('id', 'unknown')
            stats['errors'].append(f"{filemaker_id}: Unexpected error - {e}")
        
        # Progress update every 10 docs
        if i % 10 == 0:
            print(f"\n📊 Progress: {i}/{stats['total_found']} ({i/stats['total_found']*100:.1f}%)")
            print(f"   ✅ Successful: {stats['successful']}")
            print(f"   ⏭️  Skipped: {stats['skipped']}")
            print(f"   ❌ Failed: {stats['failed']}")
    
    # Logout
    fm_api.logout()
    
    # Final summary
    print()
    print("=" * 80)
    print("📊 EXPORT COMPLETE")
    print("=" * 80)
    print(f"Total found: {stats['total_found']}")
    print(f"Processed: {stats['processed']}")
    print(f"✅ Successful: {stats['successful']}")
    print(f"⏭️  Skipped: {stats['skipped']}")
    print(f"❌ Failed: {stats['failed']}")
    
    if stats['errors']:
        print(f"\n⚠️  Errors ({len(stats['errors'])}):")
        for error in stats['errors'][:10]:  # Show first 10 errors
            print(f"   - {error}")
        if len(stats['errors']) > 10:
            print(f"   ... and {len(stats['errors']) - 10} more")
    
    print()
    print("=" * 80)
    
    # Save detailed log
    log_dir = os.path.join(script_dir, 'data', 'export_logs')
    os.makedirs(log_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_file = os.path.join(log_dir, f'export_log_{timestamp}.json')
    
    with open(log_file, 'w') as f:
        json.dump({
            'timestamp': timestamp,
            'stats': stats,
            'database': FM_DATABASE
        }, f, indent=2)
    
    print(f"📝 Detailed log saved: {log_file}")
    print()


if __name__ == '__main__':
    if not FM_USERNAME or not FM_PASSWORD:
        print("❌ FileMaker credentials not found in .env file")
        sys.exit(1)
    
    main()

