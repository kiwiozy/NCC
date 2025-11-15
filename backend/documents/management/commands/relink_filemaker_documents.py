"""
Re-link FileMaker documents to patients.

This script queries FileMaker API_Docs to get the id_Contact for each document,
then matches it to the corresponding Nexus patient using notes__contains.
"""
import os
import sys
import requests
import base64
from django.core.management.base import BaseCommand
from django.contrib.contenttypes.models import ContentType
from documents.models import Document
from patients.models import Patient

# Suppress SSL warnings
requests.packages.urllib3.disable_warnings()

# Load FileMaker credentials
FM_USERNAME = os.getenv('FM_USERNAME')
FM_PASSWORD = os.getenv('FM_PASSWORD')
FM_DATABASE = os.getenv('FM_DATABASE', 'WEP-DatabaseV2')
FM_BASE_URL = f"https://walkeasy.fmcloud.fm/fmi/data/v1/databases/{FM_DATABASE}"

# Load from .env file if not in environment
if not FM_USERNAME or not FM_PASSWORD:
    env_path = '/Users/craig/Documents/nexus-core-clinic/scripts/filemaker/.env'
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('FM_USERNAME='):
                    FM_USERNAME = line.split('=', 1)[1].strip().strip('"').strip("'")
                elif line.startswith('FM_PASSWORD='):
                    FM_PASSWORD = line.split('=', 1)[1].strip().strip('"').strip("'")


class FileMakerAPI:
    def __init__(self):
        self.token = None
        self.layout = "API_Docs"

    def authenticate(self):
        """Authenticate with FileMaker Data API"""
        auth_url = f"{FM_BASE_URL}/sessions"
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
            logout_url = f"{FM_BASE_URL}/sessions/{self.token}"
            headers = {'Authorization': f'Bearer {self.token}'}
            try:
                requests.delete(logout_url, headers=headers, timeout=10, verify=False)
            except Exception:
                pass

    def get_document_contact_id(self, filemaker_doc_id):
        """Get the id_Contact for a specific document by its FileMaker UUID"""
        find_url = f"{FM_BASE_URL}/layouts/{self.layout}/_find"
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        search_data = {
            "query": [{"id": filemaker_doc_id}],
            "limit": "1"
        }
        
        try:
            response = requests.post(find_url, headers=headers, json=search_data, timeout=30, verify=False)
            if response.status_code == 200:
                data = response.json()
                records = data.get('response', {}).get('data', [])
                if records:
                    field_data = records[0].get('fieldData', {})
                    return field_data.get('id_Contact')
            return None
        except Exception:
            return None


class Command(BaseCommand):
    help = 'Re-link existing FileMaker documents to their correct patients by querying FileMaker API'

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("🔗 Re-linking FileMaker Documents to Patients")
        self.stdout.write("=" * 80)
        self.stdout.write("")
        
        # Get all unlinked FileMaker documents
        unlinked_docs = Document.objects.filter(
            filemaker_id__isnull=False,
            object_id__isnull=True
        ).order_by('uploaded_at')
        
        total_unlinked = unlinked_docs.count()
        self.stdout.write(f"Found {total_unlinked:,} unlinked FileMaker documents")
        self.stdout.write("")
        
        if total_unlinked == 0:
            self.stdout.write("✅ No unlinked documents found. Nothing to do.")
            return
        
        # Authenticate with FileMaker
        self.stdout.write("🔐 Authenticating with FileMaker...")
        fm_api = FileMakerAPI()
        if not fm_api.authenticate():
            self.stdout.write(self.style.ERROR("❌ Failed to authenticate with FileMaker"))
            return
        
        self.stdout.write("✅ Authenticated")
        self.stdout.write("")
        
        # Get the Patient content type (for GenericForeignKey)
        patient_content_type = ContentType.objects.get_for_model(Patient)
        
        # Statistics
        stats = {
            'processed': 0,
            'linked': 0,
            'no_contact_id': 0,
            'patient_not_found': 0,
            'filemaker_not_found': 0,
            'errors': 0
        }
        
        self.stdout.write("Starting re-linking process...")
        self.stdout.write("(This will query FileMaker for each document - may take some time)")
        self.stdout.write("")
        
        # Process each document
        for i, doc in enumerate(unlinked_docs, 1):
            stats['processed'] += 1
            
            try:
                # Query FileMaker to get the contact ID for this document
                fm_contact_id = fm_api.get_document_contact_id(str(doc.filemaker_id))
                
                if not fm_contact_id:
                    # Document has no contact ID in FileMaker, or not found
                    if fm_contact_id is None and i <= 10:  # Only for first 10
                        self.stdout.write(f"  ⚠️  Doc {doc.filemaker_id}: Not found in FileMaker or no contact")
                    stats['no_contact_id'] += 1
                    continue
                
                # Find the Nexus patient with this FileMaker contact ID
                # Note: notes is a TextField containing JSON string, not a JSONField
                patient = Patient.objects.filter(
                    notes__contains=f'"filemaker_id": "{fm_contact_id}"'
                ).first()
                
                if patient:
                    # Update the document
                    doc.content_type = patient_content_type
                    doc.object_id = patient.id
                    doc.save(update_fields=['content_type', 'object_id'])
                    
                    stats['linked'] += 1
                    
                    if stats['linked'] % 100 == 0:
                        self.stdout.write(f"  ✅ Linked {stats['linked']:,} documents...")
                else:
                    stats['patient_not_found'] += 1
                    
            except Exception as e:
                self.stdout.write(f"  ❌ Error processing document {doc.filemaker_id}: {e}")
                stats['errors'] += 1
            
            # Progress update every 500 documents
            if i % 500 == 0:
                self.stdout.write(f"📊 Progress: {i:,}/{total_unlinked:,} processed ({(i/total_unlinked*100):.1f}%)")
                self.stdout.write(f"   Linked so far: {stats['linked']:,}")
        
        # Logout from FileMaker
        fm_api.logout()
        
        # Final summary
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write("📊 RE-LINKING COMPLETE")
        self.stdout.write("=" * 80)
        self.stdout.write(f"Total processed:      {stats['processed']:,}")
        self.stdout.write(self.style.SUCCESS(f"✅ Successfully linked:  {stats['linked']:,}"))
        self.stdout.write(f"⚠️  No contact ID:      {stats['no_contact_id']:,}")
        self.stdout.write(f"⚠️  Patient not found:  {stats['patient_not_found']:,}")
        self.stdout.write(f"❌ Errors:             {stats['errors']:,}")
        self.stdout.write("")
        
        if stats['patient_not_found'] > 0:
            self.stdout.write(f"⚠️  {stats['patient_not_found']:,} documents belong to patients not in Nexus")
            self.stdout.write("   These patients may not have been imported yet.")
        
        if stats['no_contact_id'] > 0:
            self.stdout.write(f"⚠️  {stats['no_contact_id']:,} documents have no contact ID in FileMaker")
            self.stdout.write("   These are likely system/admin documents not linked to patients.")
        
        self.stdout.write("")
        self.stdout.write("=" * 80)
