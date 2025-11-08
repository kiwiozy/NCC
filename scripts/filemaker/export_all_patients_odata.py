#!/usr/bin/env python3
"""
Export ALL patients using OData API (direct table access)
Faster and more reliable than Data API for bulk exports
"""
import os
import sys
import json
import requests
from datetime import datetime
from urllib.parse import quote

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
print("📤 EXPORT ALL PATIENTS USING ODATA")
print("=" * 70)
print(f"\n📡 Server: {FM_BASE_URL}")
print(f"📊 Database: {FM_DATABASE}")

# Step 1: Get ALL patients using OData
print("\n📋 STEP 1: Fetching ALL patients from @Contacts table...")

patients = []
skip = 0
top = 100  # Fetch 100 at a time

while True:
    url = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}/@Contacts?$top={top}&$skip={skip}"
    
    try:
        response = requests.get(url, auth=(FM_USERNAME, FM_PASSWORD), verify=False, timeout=30)
        
        if response.status_code != 200:
            print(f"\n⚠️  Stopped at skip {skip} (status: {response.status_code})")
            break
        
        data = response.json()
        batch = data.get('value', [])
        
        if not batch:
            break
        
        patients.extend(batch)
        skip += len(batch)
        
        print(f"   Fetched {skip} patients...", end='\r')
        
        # If we got less than requested, we're done
        if len(batch) < top:
            break
            
    except Exception as e:
        print(f"\n❌ Error at skip {skip}: {e}")
        break

print(f"\n✅ Retrieved {len(patients)} patients total")

# Step 2: Get ALL contact details using OData
print("\n📋 STEP 2: Fetching ALL contact details from @Contact Details table...")

all_contact_details = []
skip = 0
top = 100

# Need to URL encode the table name with space
table_name = quote("@Contact Details")

while True:
    url = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}/{table_name}?$top={top}&$skip={skip}"
    
    try:
        response = requests.get(url, auth=(FM_USERNAME, FM_PASSWORD), verify=False, timeout=30)
        
        if response.status_code != 200:
            print(f"\n⚠️  Stopped at skip {skip} (status: {response.status_code})")
            break
        
        data = response.json()
        batch = data.get('value', [])
        
        if not batch:
            break
        
        all_contact_details.extend(batch)
        skip += len(batch)
        
        print(f"   Fetched {skip} contact details...", end='\r')
        
        if len(batch) < top:
            break
            
    except Exception as e:
        print(f"\n❌ Error at skip {skip}: {e}")
        break

print(f"\n✅ Retrieved {len(all_contact_details)} contact detail records total")

# Index by patient ID
print("\n📋 STEP 3: Indexing contact details by patient...")
contacts_by_patient = {}
for cd_data in all_contact_details:
    patient_id = cd_data.get('id_key')  # OData uses id_key instead of id.key
    
    if patient_id:
        if patient_id not in contacts_by_patient:
            contacts_by_patient[patient_id] = []
        contacts_by_patient[patient_id].append(cd_data)

print(f"✅ Indexed contacts for {len(contacts_by_patient)} unique patients")

# Build export data
print("\n📋 STEP 4: Building export data...")
export_data = {
    'export_date': datetime.now().isoformat(),
    'export_method': 'OData',
    'total_patients': len(patients),
    'patients': []
}

for i, patient_data in enumerate(patients, 1):
    if i % 100 == 0:
        print(f"   Processing patient {i}/{len(patients)}...")
    
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
output_file = f'data/export/all_patients_odata_{timestamp}.json'

print(f"\n💾 Saving to file...")
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(export_data, f, indent=2, ensure_ascii=False)

file_size = os.path.getsize(output_file)
print(f"✅ Exported to: {output_file}")
print(f"   File size: {file_size:,} bytes ({file_size / 1024 / 1024:.1f} MB)")

print(f"\n" + "=" * 70)
print("✅ ODATA EXPORT COMPLETE!")
print("=" * 70)

print(f"\n📊 SUMMARY:")
print(f"   Patients exported: {len(patients)}")
print(f"   Contact details: {len(all_contact_details)}")
print(f"   Patients with contacts: {len(contacts_by_patient)}")

print(f"\n📝 Next step:")
print(f"   cd /Users/craig/Documents/nexus-core-clinic/backend")
print(f"   python manage.py import_filemaker_data --file ../{output_file}")

