#!/usr/bin/env python3
"""
Export specific patients by ID with their contact details
"""
import os
import sys
import json
import requests
import base64
from datetime import datetime
from collections import Counter

# Suppress SSL warnings
requests.packages.urllib3.disable_warnings()

# Patient IDs to export
PATIENT_IDS = [
    '8B045521-3157-4ED8-A68B-E432AD4F3A06',  # Jacqueline Laird
    'EB1CF8AC-284D-43F0-8558-8353C58457FD',  # Craig Laird
    '19ACA9D7-013D-4703-9E6D-94762E004892',  # Scott Laird
]

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
print("📤 EXPORT LAIRD PATIENTS WITH CONTACT DETAILS")
print("=" * 70)

# Authenticate
auth_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/sessions"
auth_string = base64.b64encode(f"{FM_USERNAME}:{FM_PASSWORD}".encode()).decode()
headers = {"Authorization": f"Basic {auth_string}", "Content-Type": "application/json"}

response = requests.post(auth_url, headers=headers, verify=False)
token = response.json()["response"]["token"]
print("✅ Authenticated")

headers = {"Authorization": f"Bearer {token}"}

# Get all patients
print("\n📋 STEP 1: Fetching patients...")
records_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/layouts/API_Contacts/records?_limit=500"
response = requests.get(records_url, headers=headers, verify=False)
all_patients = response.json()["response"]["data"]

# Filter for our target patients
patients = [p for p in all_patients if p.get('fieldData', {}).get('id') in PATIENT_IDS]
print(f"✅ Found {len(patients)} Laird patients")

# Get contact details
print("\n📋 STEP 2: Fetching contact details...")
records_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/layouts/API_Contact_Details/records?_limit=10000"
response = requests.get(records_url, headers=headers, verify=False)
all_contact_details = response.json()["response"]["data"]
print(f"✅ Retrieved {len(all_contact_details)} contact detail records")

# Index by patient ID
contacts_by_patient = {}
for cd_record in all_contact_details:
    cd_data = cd_record.get('fieldData', {})
    patient_id = cd_data.get('id.key')
    
    if patient_id:
        if patient_id not in contacts_by_patient:
            contacts_by_patient[patient_id] = []
        contacts_by_patient[patient_id].append(cd_data)

# Build export data
export_data = {
    'export_date': datetime.now().isoformat(),
    'total_patients': len(patients),
    'patients': []
}

print("\n📋 STEP 3: Building export data...")
for i, patient_record in enumerate(patients, 1):
    patient_data = patient_record.get('fieldData', {})
    patient_id = patient_data.get('id')
    patient_name = f"{patient_data.get('nameFirst', '')} {patient_data.get('nameLast', '')}".strip()
    
    contact_details = contacts_by_patient.get(patient_id, [])
    
    print(f"[{i}/{len(patients)}] {patient_name} - {len(contact_details)} contacts")
    
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
output_file = f'data/export/laird_patients_{timestamp}.json'

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(export_data, f, indent=2, ensure_ascii=False)

print(f"\n✅ Exported to: {output_file}")

# Logout
logout_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/sessions/{token}"
requests.delete(logout_url, headers=headers, verify=False)

print(f"✅ Export complete")

