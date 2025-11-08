#!/usr/bin/env python3
"""
Search for patients with last name 'Laird'
"""
import os
import sys
import requests
import base64

# Suppress SSL warnings
requests.packages.urllib3.disable_warnings()

# Read credentials from .env
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
print("🔍 SEARCHING FOR PATIENTS WITH LAST NAME 'LAIRD'")
print("=" * 70)

# Authenticate
auth_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/sessions"
auth_string = base64.b64encode(f"{FM_USERNAME}:{FM_PASSWORD}".encode()).decode()
headers = {"Authorization": f"Basic {auth_string}", "Content-Type": "application/json"}

response = requests.post(auth_url, headers=headers, verify=False)
token = response.json()["response"]["token"]
print("✅ Authenticated")

# Get patients
headers = {"Authorization": f"Bearer {token}"}
records_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/layouts/API_Contacts/records?_limit=500"

print("\n📋 Fetching patients...")
response = requests.get(records_url, headers=headers, verify=False)
data = response.json()
patients = data["response"]["data"]
print(f"✅ Retrieved {len(patients)} patients")

# Filter for Laird
laird_patients = []
for patient_record in patients:
    patient_data = patient_record.get('fieldData', {})
    last_name = patient_data.get('nameLast', '').strip().upper()
    
    if last_name == 'LAIRD':
        laird_patients.append(patient_data)

print(f"\n📊 Found {len(laird_patients)} patients with last name 'Laird':")
print("=" * 70)

for i, patient in enumerate(laird_patients, 1):
    first_name = patient.get('nameFirst', '')
    last_name = patient.get('nameLast', '')
    dob = patient.get('DOB', '')
    patient_id = patient.get('id', '')
    clinic = patient.get('Clinic_Name', '')
    
    print(f"\n[{i}] {first_name} {last_name}")
    print(f"    DOB: {dob}")
    print(f"    Clinic: {clinic}")
    print(f"    ID: {patient_id}")

# Logout
logout_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/sessions/{token}"
requests.delete(logout_url, headers=headers, verify=False)

print(f"\n✅ Search complete - Found {len(laird_patients)} Laird patients")

