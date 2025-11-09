#!/usr/bin/env python3
"""
Export ALL patients with contact details from FileMaker
"""
import os
import sys
import json
import requests
import base64
from datetime import datetime

# Suppress SSL warnings
requests.packages.urllib3.disable_warnings()

# Read credentials
with open('.env') as f:
    for line in f:
        if line.startswith('FM_BASE_URL='):
            FM_BASE_URL = line.split('=', 1)[1].strip()
        elif line.startswith('FM_DATABASE='):
            FM_DATABASE = line.split('=', 1)[1].strip()
        elif line.startswith('FM_USERNAME='):
            FM_USERNAME = line.split('=', 1)[1].strip()
        elif line.startswith('FM_PASSWORD='):
            FM_PASSWORD = line.split('=', 1)[1].strip()

print("=" * 70)
print("📤 EXPORT ALL PATIENTS WITH CONTACT DETAILS")
print("=" * 70)

# Authenticate
auth_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/sessions"
auth_string = base64.b64encode(f"{FM_USERNAME}:{FM_PASSWORD}".encode()).decode()
headers = {"Authorization": f"Basic {auth_string}", "Content-Type": "application/json"}

response = requests.post(auth_url, headers=headers, verify=False)
if response.status_code != 200:
    print(f"❌ Authentication failed: {response.status_code}")
    print(f"Response: {response.text}")
    sys.exit(1)

token = response.json()["response"]["token"]
print("✅ Authenticated")

headers = {"Authorization": f"Bearer {token}"}

# Step 1: Get ALL patients (using pagination)
print("\n📋 STEP 1: Fetching ALL patients...")
patients = []
offset = 1
limit = 100
total_fetched = 0

while True:
    records_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/layouts/API_Contacts/records?_offset={offset}&_limit={limit}"
    response = requests.get(records_url, headers=headers, verify=False)
    
    if response.status_code != 200:
        print(f"\n⚠️  Stopped at offset {offset} (status: {response.status_code})")
        break
    
    data = response.json()
    batch = data.get("response", {}).get("data", [])
    
    if not batch:
        break
    
    patients.extend(batch)
    total_fetched += len(batch)
    
    print(f"   Fetched {total_fetched} patients...", end='\r')
    
    # Check if we got less than limit (last page)
    if len(batch) < limit:
        break
    
    offset += limit

print(f"\n✅ Retrieved {len(patients)} patients total")

# Step 2: Get ALL contact details (using pagination)
print("\n📋 STEP 2: Fetching ALL contact details...")
all_contact_details = []
offset = 1
limit = 100
total_fetched = 0

while True:
    records_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/layouts/API_Contact_Details/records?_offset={offset}&_limit={limit}"
    response = requests.get(records_url, headers=headers, verify=False)
    
    if response.status_code != 200:
        print(f"\n⚠️  Stopped at offset {offset} (status: {response.status_code})")
        break
    
    data = response.json()
    batch = data.get("response", {}).get("data", [])
    
    if not batch:
        break
    
    all_contact_details.extend(batch)
    total_fetched += len(batch)
    
    print(f"   Fetched {total_fetched} contact details...", end='\r')
    
    # Check if we got less than limit (last page)
    if len(batch) < limit:
        break
    
    offset += limit

print(f"\n✅ Retrieved {len(all_contact_details)} contact detail records total")

# Index by patient ID
contacts_by_patient = {}
for cd_record in all_contact_details:
    cd_data = cd_record.get('fieldData', {})
    patient_id = cd_data.get('id.key')
    
    if patient_id:
        if patient_id not in contacts_by_patient:
            contacts_by_patient[patient_id] = []
        contacts_by_patient[patient_id].append(cd_data)

print(f"📊 Indexed contacts for {len(contacts_by_patient)} unique patients")

# Build export data
print("\n📋 STEP 3: Building export data...")
export_data = {
    'export_date': datetime.now().isoformat(),
    'total_patients': len(patients),
    'patients': []
}

for i, patient_record in enumerate(patients, 1):
    if i % 100 == 0:
        print(f"   Processing patient {i}/{len(patients)}...")
    
    patient_data = patient_record.get('fieldData', {})
    patient_id = patient_data.get('id')
    
    contact_details = contacts_by_patient.get(patient_id, [])
    
    # Extract contacts
    extracted_contacts = []
    for cd_data in contact_details:
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
output_file = f'data/export/all_patients_{timestamp}.json'

print(f"\n💾 Saving to file...")
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(export_data, f, indent=2, ensure_ascii=False)

file_size = os.path.getsize(output_file)
print(f"✅ Exported to: {output_file}")
print(f"   File size: {file_size:,} bytes ({file_size / 1024 / 1024:.1f} MB)")

# Logout
logout_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/sessions/{token}"
requests.delete(logout_url, headers=headers, verify=False)

print(f"\n✅ Export complete!")
print(f"\n📊 SUMMARY:")
print(f"   Patients exported: {len(patients)}")
print(f"   Contact details: {len(all_contact_details)}")
print(f"\n📝 Next step:")
print(f"   python manage.py import_filemaker_data --file ../scripts/filemaker/{output_file}")

