"""
Django management command to import ONLY coordinators from FileMaker
(Notes already imported separately)

Usage:
    python manage.py import_coordinators_only
"""

import os
import json
import requests
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from coordinators.models import Coordinator, PatientCoordinator
from patients.models import Patient
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables
env_path = '/Users/craig/Documents/nexus-core-clinic/scripts/filemaker/.env'

FM_BASE_URL = None
FM_DATABASE = None
FM_USERNAME = None
FM_PASSWORD = None

if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith('FM_BASE_URL='):
                FM_BASE_URL = line.split('=', 1)[1].strip()
            elif line.startswith('FM_DATABASE='):
                FM_DATABASE = line.split('=', 1)[1].strip()
            elif line.startswith('FM_USERNAME='):
                FM_USERNAME = line.split('=', 1)[1].strip()
            elif line.startswith('FM_PASSWORD='):
                FM_PASSWORD = line.split('=', 1)[1].strip()


class Command(BaseCommand):
    help = 'Import coordinators from FileMaker (notes already imported)'

    def fetch_odata(self, table_name):
        """Fetch all records with pagination"""
        all_records = []
        skip = 0
        top = 100
        
        while True:
            url = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}/{table_name}?$skip={skip}&$top={top}"
            
            try:
                response = requests.get(url, auth=(FM_USERNAME, FM_PASSWORD), verify=False, timeout=30)
                if response.status_code != 200:
                    break
                data = response.json()
                records = data.get('value', [])
                if not records:
                    break
                all_records.extend(records)
                skip += top
                if skip % 500 == 0:
                    self.stdout.write(f"   ...fetched {skip} records...")
            except:
                break
        return all_records

    def parse_date(self, date_str):
        if not date_str or str(date_str).strip() == '':
            return None
        try:
            return datetime.strptime(str(date_str), '%Y-%m-%d').date()
        except:
            try:
                return datetime.strptime(str(date_str), '%m/%d/%Y').date()
            except:
                return None

    def parse_coordinator_name(self, coord_str):
        """Parse: 'FirstName LastName - Organization'"""
        if not coord_str or str(coord_str).strip() == '':
            return None, None, None
        coord_str = str(coord_str).strip()
        if ' - ' in coord_str:
            name_part, org_part = coord_str.split(' - ', 1)
        else:
            name_part = coord_str
            org_part = None
        name_parts = name_part.strip().split()
        if len(name_parts) == 0:
            return None, None, org_part
        elif len(name_parts) == 1:
            return name_parts[0], '', org_part
        else:
            return name_parts[0], ' '.join(name_parts[1:]), org_part

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write("👥 Import Coordinators from FileMaker")
        self.stdout.write("="*80)

        # Step 1: Fetch patients
        self.stdout.write(f"\n📥 Fetching patients...")
        fm_patients = self.fetch_odata('API_Contacts')
        self.stdout.write(f"✅ Fetched {len(fm_patients)} patients")

        # Step 2: Extract coordinator data
        self.stdout.write(f"\n📋 Extracting coordinators...")
        coordinator_strings = set()
        coordinator_data = {}

        for patient in fm_patients:
            coord_name = patient.get('NDIS Coordinator Name')
            if coord_name and str(coord_name).strip():
                coord_name_clean = str(coord_name).strip()
                coordinator_strings.add(coord_name_clean)
                if coord_name_clean not in coordinator_data:
                    coordinator_data[coord_name_clean] = {
                        'phone': patient.get('NDIS Coordinator Phone'),
                        'email': patient.get('NDIS Coordinator Email'),
                    }

        self.stdout.write(f"✅ Found {len(coordinator_strings)} unique coordinators")

        # Step 3: Create coordinators
        self.stdout.write(f"\n💾 Creating coordinator records...")
        coordinator_map = {}
        imported = 0

        for coord_str in sorted(coordinator_strings):
            first_name, last_name, org = self.parse_coordinator_name(coord_str)
            if not first_name:
                continue

            coord_info = coordinator_data.get(coord_str, {})
            contact_json = {}
            
            phone = coord_info.get('phone')
            if phone and str(phone).strip():
                contact_json['phone'] = {'Work': {'value': str(phone).strip(), 'default': True}}
            
            email = coord_info.get('email')
            if email and str(email).strip():
                contact_json['email'] = {'Work': {'value': str(email).strip(), 'default': True}}

            try:
                with transaction.atomic():
                    coordinator, created = Coordinator.objects.get_or_create(
                        first_name=first_name,
                        last_name=last_name or '',
                        organization=org,
                        defaults={
                            'coordinator_type': 'SUPPORT_COORDINATOR',
                            'contact_json': contact_json if contact_json else None,
                        }
                    )
                    coordinator_map[coord_str] = coordinator
                    if created:
                        imported += 1
                        if imported % 20 == 0:
                            self.stdout.write(f"   ...created {imported} coordinators...")
            except Exception as e:
                self.stdout.write(f"   ⚠️  Failed: {coord_str[:50]}... - {str(e)[:50]}")

        self.stdout.write(f"✅ Created {imported} coordinators")

        # Step 4: Link to patients
        self.stdout.write(f"\n🔗 Linking coordinators to patients...")
        linked = 0
        skipped = 0

        for fm_patient in fm_patients:
            coord_name = fm_patient.get('NDIS Coordinator Name')
            if not coord_name or not str(coord_name).strip():
                continue

            coord_name_clean = str(coord_name).strip()
            coordinator = coordinator_map.get(coord_name_clean)
            if not coordinator:
                skipped += 1
                continue

            patient_id = fm_patient.get('id')
            try:
                patients_found = Patient.objects.filter(notes__contains=f'"filemaker_id": "{patient_id}"')
                if not patients_found.exists():
                    skipped += 1
                    continue
                patient = patients_found.first()
            except:
                skipped += 1
                continue

            assignment_date = self.parse_date(fm_patient.get('NDIS Plan Start Date'))
            if not assignment_date:
                assignment_date = self.parse_date(fm_patient.get('creationDate'))
            if not assignment_date:
                assignment_date = datetime.now().date()

            plan_start = self.parse_date(fm_patient.get('NDIS Plan Start Date'))
            plan_end = self.parse_date(fm_patient.get('NDIS Plan End Date'))
            
            ndis_notes = fm_patient.get('NDIS notes')
            if ndis_notes and str(ndis_notes).strip():
                ndis_notes = str(ndis_notes).strip()
            else:
                ndis_notes = None

            try:
                with transaction.atomic():
                    PatientCoordinator.objects.get_or_create(
                        patient=patient,
                        coordinator=coordinator,
                        defaults={
                            'assignment_date': assignment_date,
                            'is_current': True,
                            'ndis_plan_start': plan_start,
                            'ndis_plan_end': plan_end,
                            'ndis_notes': ndis_notes,
                        }
                    )
                    linked += 1
                    if linked % 100 == 0:
                        self.stdout.write(f"   ...linked {linked} relationships...")
            except:
                skipped += 1

        self.stdout.write(f"✅ Linked {linked} patient-coordinator relationships")
        if skipped > 0:
            self.stdout.write(f"⚠️  Skipped {skipped} links")

        # Summary
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("✅ Import Complete!")
        self.stdout.write("="*80)
        self.stdout.write(f"\n   Coordinators: {imported}")
        self.stdout.write(f"   Patient Links: {linked}")
        self.stdout.write(f"\n")

