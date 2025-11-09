#!/usr/bin/env python3
"""
Export Sample Patients with Contact Details

This script exports 10-20 sample patients from FileMaker along with
their contact details (phone, email, address) from the Contact Details table.

Usage:
    cd scripts/filemaker
    python3 02_export_sample_patients_with_contacts.py

Output:
    data/export/sample_patients_with_contacts.json

Requirements:
    pip install requests python-dotenv
"""

import os
import json
import base64
import requests
from datetime import datetime
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
FM_BASE_URL = os.getenv('FM_BASE_URL')
FM_DATABASE = os.getenv('FM_DATABASE')
FM_USERNAME = os.getenv('FM_USERNAME')
FM_PASSWORD = os.getenv('FM_PASSWORD')

# Output directory
OUTPUT_DIR = 'data/export'
os.makedirs(OUTPUT_DIR, exist_ok=True)

class FileMakerClient:
    """FileMaker Data API Client"""
    
    def __init__(self, base_url: str, database: str, username: str, password: str):
        self.base_url = base_url.rstrip('/')
        self.database = database
        self.username = username
        self.password = password
        self.token: Optional[str] = None
        self.session = requests.Session()
        self.session.verify = False
        
    def authenticate(self) -> bool:
        """Get API token from FileMaker Server"""
        print(f"🔑 Authenticating with FileMaker Server...")
        
        auth_url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/sessions"
        auth_string = f"{self.username}:{self.password}"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Basic {auth_b64}'
        }
        
        try:
            response = self.session.post(auth_url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            self.token = data['response']['token']
            
            print(f"✅ Authentication successful!")
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Authentication failed: {e}")
            return False
    
    def get_records(self, layout_name: str, limit: int = 100, offset: int = 1) -> List[Dict[str, Any]]:
        """Get records from a layout"""
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/layouts/{layout_name}/records"
        headers = {'Authorization': f'Bearer {self.token}'}
        params = {'_limit': limit, '_offset': offset}
        
        try:
            response = self.session.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            return data['response']['data']
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to get records: {e}")
            return []
    
    def find_records(self, layout_name: str, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find records using a query"""
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/layouts/{layout_name}/_find"
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'query': [query]
        }
        
        try:
            response = self.session.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            data = response.json()
            return data['response']['data']
            
        except requests.exceptions.RequestException as e:
            print(f"⚠️  Find failed: {e}")
            return []
    
    def logout(self):
        """Close the FileMaker session"""
        if not self.token:
            return
        
        print(f"\n🚪 Logging out...")
        
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/sessions/{self.token}"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            self.session.delete(url, headers=headers)
            print(f"✅ Logged out successfully")
        except:
            pass

def export_sample_patients():
    """Export sample patients with their contact details"""
    
    print("=" * 70)
    print("📤 EXPORT SAMPLE PATIENTS WITH CONTACT DETAILS")
    print("=" * 70)
    
    # Validate configuration
    if not all([FM_BASE_URL, FM_DATABASE, FM_USERNAME, FM_PASSWORD]):
        print("\n❌ ERROR: Missing configuration!")
        print("\nPlease ensure .env file has:")
        print("  FM_BASE_URL, FM_DATABASE, FM_USERNAME, FM_PASSWORD")
        return
    
    print(f"\n📡 Server: {FM_BASE_URL}")
    print(f"📊 Database: {FM_DATABASE}")
    
    # Create client and authenticate
    client = FileMakerClient(FM_BASE_URL, FM_DATABASE, FM_USERNAME, FM_PASSWORD)
    
    if not client.authenticate():
        print("\n❌ Cannot proceed without authentication")
        return
    
    # Step 1: Get 20 sample patients
    print(f"\n" + "=" * 70)
    print(f"📋 STEP 1: Export Sample Patients")
    print("=" * 70)
    
    print(f"\n🔍 Fetching 20 patients from 'API_Contacts' layout...")
    patients = client.get_records('API_Contacts', limit=20)
    
    print(f"✅ Retrieved {len(patients)} patients")
    
    # Step 2: Get ALL contact details (we'll filter in Python)
    print(f"\n" + "=" * 70)
    print(f"📞 STEP 2: Get All Contact Details")
    print("=" * 70)
    
    print(f"\n🔍 Fetching ALL contact details from 'API_Contact_Details' layout...")
    print(f"   (Getting first 500 to cover our 20 patients)")
    print(f"   Note: We'll filter by patient ID in Python")
    
    # Get first 500 contact details (should cover our 20 patients with avg ~3.8 contacts each)
    all_contact_details = client.get_records('API_Contact_Details', limit=500)
    
    print(f"✅ Retrieved {len(all_contact_details)} contact detail records")
    
    # Index contact details by patient ID for fast lookup
    contacts_by_patient = {}
    for cd_record in all_contact_details:
        cd_data = cd_record.get('fieldData', {})
        patient_id = cd_data.get('id.key')
        
        if patient_id:
            if patient_id not in contacts_by_patient:
                contacts_by_patient[patient_id] = []
            contacts_by_patient[patient_id].append(cd_data)
    
    print(f"📊 Indexed contacts for {len(contacts_by_patient)} unique patients")
    
    # Step 3: Match contact details to patients
    print(f"\n" + "=" * 70)
    print(f"🔗 STEP 3: Match Contact Details to Patients")
    print("=" * 70)
    
    export_data = {
        'export_date': datetime.now().isoformat(),
        'total_patients': len(patients),
        'patients': []
    }
    
    for i, patient_record in enumerate(patients, 1):
        patient_data = patient_record.get('fieldData', {})
        patient_id = patient_data.get('id')
        patient_name = f"{patient_data.get('nameFirst', '')} {patient_data.get('nameLast', '')}".strip()
        
        print(f"\n[{i}/{len(patients)}] 👤 {patient_name} ({patient_id})")
        
        # Get contact details for this patient from our index
        contact_details = contacts_by_patient.get(patient_id, [])
        
        print(f"   ✅ Found {len(contact_details)} contact detail records")
        
        # Extract contact details
        extracted_contacts = []
        for cd_data in contact_details:
            # cd_data is already fieldData (indexed on line 193)
            extracted_contacts.append({
                'id': cd_data.get('id'),
                'type': cd_data.get('type'),
                'name': cd_data.get('Name'),
                'phone': cd_data.get('ph'),
                'sms_phone': cd_data.get('SMS Phone'),
                'email': cd_data.get('Email default'),
                'address_1': cd_data.get('address 1'),
                'address_2': cd_data.get('address 2'),
                'suburb': cd_data.get('suburb'),
                'state': cd_data.get('state'),
                'postcode': cd_data.get('post code'),
                'location': cd_data.get('location'),
            })
        
        # Show breakdown
        types_count = {}
        for cd in extracted_contacts:
            cd_type = cd.get('type', 'Unknown')
            types_count[cd_type] = types_count.get(cd_type, 0) + 1
        
        print(f"   📊 Breakdown: {', '.join([f'{k}={v}' for k, v in types_count.items()])}")
        
        # Build patient export record
        patient_export = {
            'patient': {
                'id': patient_id,
                'title': patient_data.get('title'),
                'first_name': patient_data.get('nameFirst'),
                'middle_name': patient_data.get('nameMiddle'),
                'last_name': patient_data.get('nameLast'),
                'dob': patient_data.get('DOB'),
                'gender': patient_data.get('gender'),
                'health_number': patient_data.get('Health Number'),
                'ndis_plan_start': patient_data.get('NDIS Plan Start Date'),
                'ndis_plan_end': patient_data.get('NDIS Plan End Date'),
                'ndis_coordinator_name': patient_data.get('NDIS Coordinator Name'),
                'ndis_coordinator_phone': patient_data.get('NDIS Coordinator Phone'),
                'ndis_coordinator_email': patient_data.get('NDIS Coordinator Email'),
                'clinic_id': patient_data.get('id_Clinic'),
                'clinic_name': patient_data.get('Clinic_Name'),
                'xero_contact_id': patient_data.get('_kf_XeroContactID'),
                'created': patient_data.get('creationTimestamp'),
                'modified': patient_data.get('modificationTimestamp'),
            },
            'contact_details': extracted_contacts
        }
        
        export_data['patients'].append(patient_export)
    
    # Save to JSON
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = os.path.join(OUTPUT_DIR, f'sample_patients_with_contacts_{timestamp}.json')
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n" + "=" * 70)
    print(f"✅ EXPORT COMPLETE")
    print("=" * 70)
    print(f"\n📄 Exported to: {output_file}")
    print(f"   File size: {os.path.getsize(output_file):,} bytes")
    
    # Print summary
    print(f"\n📊 SUMMARY:")
    print(f"   Patients: {len(patients)}")
    
    total_contacts = sum(len(p['contact_details']) for p in export_data['patients'])
    print(f"   Total Contact Records: {total_contacts}")
    print(f"   Avg Contacts per Patient: {total_contacts / len(patients):.1f}")
    
    # Count by type
    all_types = {}
    for p in export_data['patients']:
        for cd in p['contact_details']:
            cd_type = cd.get('type', 'Unknown')
            all_types[cd_type] = all_types.get(cd_type, 0) + 1
    
    print(f"\n📋 Contact Types:")
    for cd_type, count in sorted(all_types.items()):
        print(f"   {cd_type:15s}: {count:3d} records")
    
    # Sample analysis
    print(f"\n🔍 SAMPLE ANALYSIS:")
    for i, patient in enumerate(export_data['patients'][:3], 1):
        print(f"\n   Patient {i}: {patient['patient']['first_name']} {patient['patient']['last_name']}")
        for cd in patient['contact_details']:
            if cd['type'] == 'Phone' and cd['phone']:
                print(f"     📞 Phone ({cd['name']}): {cd['phone']}")
            elif cd['type'] == 'Mobile' and cd['sms_phone']:
                print(f"     📱 Mobile ({cd['name']}): {cd['sms_phone']}")
            elif cd['type'] == 'Email' and cd['email']:
                print(f"     📧 Email ({cd['name']}): {cd['email']}")
            elif cd['type'] == 'Address' and cd['location']:
                print(f"     🏠 Address ({cd['name']}): {cd['location']}")
    
    # Logout
    client.logout()
    
    print(f"\n✅ Export complete!")
    print(f"\n📝 Next steps:")
    print(f"   1. Review the exported JSON file")
    print(f"   2. Analyze the contact data structure")
    print(f"   3. Build transformation functions")
    print(f"   4. Test import with this sample data")

if __name__ == '__main__':
    # Suppress SSL warnings
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    try:
        export_sample_patients()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()

