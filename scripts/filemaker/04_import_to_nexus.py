#!/usr/bin/env python3
"""
Import FileMaker data into Nexus PostgreSQL database
Transforms FileMaker format to Nexus schema
"""

import os
import sys
import json
import django
from datetime import datetime
from pathlib import Path

# Add the Django project to the path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_ROOT = PROJECT_ROOT / 'backend'
sys.path.insert(0, str(BACKEND_ROOT))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

# Now we can import Django models
from patients.models import Patient
from django.db import transaction

def parse_filemaker_date(date_str):
    """
    Parse FileMaker date format (MM/DD/YYYY) to Django date
    Returns None if date_str is empty or invalid
    """
    if not date_str or date_str.strip() == '':
        return None
    
    try:
        # FileMaker format: "08/28/1969"
        return datetime.strptime(date_str, '%m/%d/%Y').date()
    except (ValueError, AttributeError):
        print(f"    ⚠️  Invalid date format: {date_str}")
        return None

def transform_patient(fm_patient, fm_contacts):
    """
    Transform FileMaker patient data to Nexus format
    """
    # Parse dates
    dob = parse_filemaker_date(fm_patient.get('dob'))
    
    # Build communication JSON from contact details
    communication = {}
    address_json = {}
    
    for contact in fm_contacts:
        contact_type = contact.get('type', '').lower()
        name = contact.get('name', '').lower()  # Home, Work, etc.
        
        if contact_type == 'phone':
            phone = contact.get('phone', '')
            if phone:
                if 'phone' not in communication:
                    communication['phone'] = []
                communication['phone'].append({
                    'value': phone,
                    'label': name or 'Home'
                })
        
        elif contact_type == 'mobile':
            phone = contact.get('phone', '')
            if phone:
                if 'mobile' not in communication:
                    communication['mobile'] = []
                communication['mobile'].append({
                    'value': phone,
                    'label': name or 'Mobile'
                })
        
        elif contact_type == 'email':
            email = contact.get('email')
            if email and email != 0:  # FileMaker sometimes returns 0
                if 'email' not in communication:
                    communication['email'] = []
                communication['email'].append({
                    'value': str(email),
                    'label': name or 'Email'
                })
        
        elif contact_type == 'address':
            address_1 = contact.get('address_1', '')
            address_2 = contact.get('address_2', '')
            suburb = contact.get('suburb', '')
            state = contact.get('state', '')
            postcode = contact.get('postcode', '')
            
            if address_1 or suburb:
                address_json = {
                    'street1': address_1,
                    'street2': address_2,
                    'city': suburb,
                    'state': state,
                    'postal_code': str(postcode) if postcode else '',
                    'country': 'Australia'
                }
    
    # Map to Nexus Patient model
    patient_data = {
        'first_name': fm_patient.get('first_name', ''),
        'last_name': fm_patient.get('last_name', ''),
        'date_of_birth': dob,
        'gender': fm_patient.get('gender', '') or None,
        'medicare_number': fm_patient.get('health_number', ''),
        'communication': communication if communication else None,
        'address_json': address_json if address_json else None,
        # Store FileMaker metadata
        'notes': json.dumps({
            'filemaker_id': fm_patient.get('id'),
            'filemaker_clinic': fm_patient.get('clinic_name'),
            'xero_contact_id': fm_patient.get('xero_contact_id'),
            'imported_at': datetime.now().isoformat()
        })
    }
    
    return patient_data

def import_patients(json_file):
    """
    Import patients from FileMaker export JSON
    """
    print("=" * 70)
    print("📥 IMPORT FILEMAKER DATA TO NEXUS")
    print("=" * 70)
    
    # Load JSON file
    print(f"\n📄 Loading: {json_file}")
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    total_patients = len(data['patients'])
    print(f"✅ Loaded {total_patients} patients")
    
    # Stats
    imported = 0
    skipped = 0
    errors = 0
    
    print(f"\n" + "=" * 70)
    print("💾 IMPORTING PATIENTS")
    print("=" * 70)
    
    with transaction.atomic():
        for i, patient_record in enumerate(data['patients'], 1):
            fm_patient = patient_record['patient']
            fm_contacts = patient_record['contact_details']
            
            patient_name = f"{fm_patient.get('first_name', '')} {fm_patient.get('last_name', '')}".strip()
            
            try:
                # Transform data
                patient_data = transform_patient(fm_patient, fm_contacts)
                
                # Skip if no name
                if not patient_data['first_name'] and not patient_data['last_name']:
                    print(f"[{i}/{total_patients}] ⏭️  Skipping (no name)")
                    skipped += 1
                    continue
                
                # Create patient
                patient = Patient.objects.create(**patient_data)
                
                print(f"[{i}/{total_patients}] ✅ {patient_name}")
                if fm_contacts:
                    print(f"    📞 {len(fm_contacts)} contact details")
                
                imported += 1
                
            except Exception as e:
                print(f"[{i}/{total_patients}] ❌ {patient_name}: {e}")
                errors += 1
    
    print(f"\n" + "=" * 70)
    print("✅ IMPORT COMPLETE")
    print("=" * 70)
    print(f"\n📊 SUMMARY:")
    print(f"   Total:    {total_patients}")
    print(f"   Imported: {imported}")
    print(f"   Skipped:  {skipped}")
    print(f"   Errors:   {errors}")
    
    return imported, errors

if __name__ == '__main__':
    # Use the latest export file
    export_dir = Path(__file__).parent / 'data' / 'export'
    
    if len(sys.argv) > 1:
        json_file = sys.argv[1]
    else:
        # Find the latest export file
        export_files = sorted(export_dir.glob('sample_patients_with_contacts_*.json'))
        if not export_files:
            print("❌ No export files found in data/export/")
            sys.exit(1)
        json_file = export_files[-1]
    
    try:
        imported, errors = import_patients(json_file)
        sys.exit(0 if errors == 0 else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

