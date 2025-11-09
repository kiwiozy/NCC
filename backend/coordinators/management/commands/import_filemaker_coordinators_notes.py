"""
Django management command to import coordinators and notes from FileMaker

Usage:
    python manage.py import_filemaker_coordinators_notes

This command:
1. Extracts unique coordinators from patients.coordinator_name field
2. Creates coordinator records with organization info
3. Links patients to coordinators (historical tracking)
4. Imports notes from API_Notes table

FileMaker Sources:
- patients.notes JSON → coordinator_name field (e.g., "Warda - Ability Connect")
- API_Notes → notes table (11,206 notes with content)
"""

import os
import sys
import json
import requests
from datetime import datetime, date
from django.core.management.base import BaseCommand
from django.db import transaction
from coordinators.models import Coordinator, PatientCoordinator
from notes.models import Note
from patients.models import Patient
import urllib3

# Disable SSL warnings
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
    help = 'Import coordinators and notes from FileMaker'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def fetch_odata(self, table_name):
        """Fetch all records from an OData table with pagination"""
        all_records = []
        skip = 0
        top = 100  # Fetch 100 at a time
        
        while True:
            url = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}/{table_name}?$skip={skip}&$top={top}"
            
            try:
                response = requests.get(
                    url,
                    auth=(FM_USERNAME, FM_PASSWORD),
                    verify=False,
                    timeout=30
                )

                if response.status_code != 200:
                    self.stdout.write(self.style.ERROR(f"❌ HTTP {response.status_code}: {response.text[:200]}"))
                    break

                data = response.json()
                records = data.get('value', [])
                
                if not records:
                    break  # No more records
                
                all_records.extend(records)
                skip += top
                
                # Progress indicator
                if skip % 500 == 0:
                    self.stdout.write(f"   ...fetched {skip} records...")

            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.ERROR(f"❌ Request failed: {str(e)}"))
                break

        return all_records

    def parse_date(self, date_str):
        """Parse FileMaker date format to Django date"""
        if not date_str or date_str.strip() == '':
            return None

        try:
            return datetime.strptime(date_str, '%Y-%m-%d').date()
        except (ValueError, AttributeError):
            pass

        try:
            return datetime.strptime(date_str, '%m/%d/%Y').date()
        except (ValueError, AttributeError):
            return None

    def parse_coordinator_name(self, coordinator_str):
        """
        Parse coordinator name format: "FirstName LastName - Organization"
        Returns: (first_name, last_name, organization)
        """
        if not coordinator_str or coordinator_str.strip() == '':
            return None, None, None

        coordinator_str = coordinator_str.strip()

        # Split by ' - ' to separate name from organization
        if ' - ' in coordinator_str:
            name_part, org_part = coordinator_str.split(' - ', 1)
        else:
            name_part = coordinator_str
            org_part = None

        # Split name into first and last
        name_parts = name_part.strip().split()
        if len(name_parts) == 0:
            return None, None, org_part
        elif len(name_parts) == 1:
            return name_parts[0], '', org_part
        else:
            first_name = name_parts[0]
            last_name = ' '.join(name_parts[1:])
            return first_name, last_name, org_part

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write(self.style.SUCCESS("FileMaker Coordinators & Notes Import"))
        self.stdout.write("="*80)

        if not all([FM_BASE_URL, FM_DATABASE, FM_USERNAME, FM_PASSWORD]):
            self.stdout.write(self.style.ERROR("\n❌ Missing FileMaker credentials"))
            return

        self.stdout.write(f"\n📊 Configuration:")
        self.stdout.write(f"   Server: {FM_BASE_URL}")
        self.stdout.write(f"   Database: {FM_DATABASE}")
        self.stdout.write(f"   Dry run: {options['dry_run']}")

        # ===== PART 1: COORDINATORS =====
        
        # Step 1: Extract coordinator names from FileMaker
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("👥 Step 1: Fetch Coordinator Data from FileMaker")
        self.stdout.write("="*80)

        self.stdout.write(f"\n   Fetching patients with coordinator data...")
        fm_patients = self.fetch_odata('API_Contacts')
        self.stdout.write(f"   ✅ Fetched {len(fm_patients)} patient records")

        coordinator_strings = set()
        coordinator_data = {}  # Maps coordinator_name → full coordinator info

        for patient in fm_patients:
            coord_name = patient.get('NDIS Coordinator Name')
            if coord_name and str(coord_name).strip():
                coord_name_clean = str(coord_name).strip()
                coordinator_strings.add(coord_name_clean)
                
                # Store additional coordinator info (for first occurrence)
                if coord_name_clean not in coordinator_data:
                    coordinator_data[coord_name_clean] = {
                        'phone': patient.get('NDIS Coordinator Phone'),
                        'email': patient.get('NDIS Coordinator Email'),
                    }

        self.stdout.write(f"\n   Found {len(coordinator_strings)} unique coordinators")

        # Step 2: Parse and create unique coordinators
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("📋 Step 2: Create Coordinator Records")
        self.stdout.write("="*80)

        coordinator_map = {}  # Maps coordinator_name → Coordinator object
        imported_coordinators = 0

        for coord_str in sorted(coordinator_strings):
            first_name, last_name, organization = self.parse_coordinator_name(coord_str)

            if not first_name:
                self.stdout.write(f"   ⚠️  Skipping invalid format: {coord_str}")
                continue

            # Get contact info
            coord_info = coordinator_data.get(coord_str, {})
            phone = coord_info.get('phone')
            email = coord_info.get('email')

            # Build contact_json
            contact_json = {}
            if phone and str(phone).strip():
                phone_clean = str(phone).strip()
                contact_json['phone'] = {'Work': {'value': phone_clean, 'default': True}}
            if email and str(email).strip():
                email_clean = str(email).strip()
                contact_json['email'] = {'Work': {'value': email_clean, 'default': True}}

            self.stdout.write(f"\n   📋 {coord_str}")
            self.stdout.write(f"      Name: {first_name} {last_name}")
            self.stdout.write(f"      Organization: {organization or 'None'}")
            if phone:
                self.stdout.write(f"      Phone: {phone}")
            if email:
                self.stdout.write(f"      Email: {email}")

            if options['dry_run']:
                self.stdout.write(f"      [DRY RUN] Would create coordinator")
                continue

            try:
                with transaction.atomic():
                    # Create or get coordinator by name + organization
                    coordinator, created = Coordinator.objects.get_or_create(
                        first_name=first_name,
                        last_name=last_name or '',
                        organization=organization,
                        defaults={
                            'coordinator_type': 'SUPPORT_COORDINATOR',
                            'contact_json': contact_json if contact_json else None,
                        }
                    )
                    coordinator_map[coord_str] = coordinator
                    
                    if created:
                        imported_coordinators += 1
                        self.stdout.write(self.style.SUCCESS(f"      ✅ Created: {coordinator.id}"))
                    else:
                        self.stdout.write(f"      ℹ️  Already exists: {coordinator.id}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"      ❌ Failed: {str(e)}"))

        # Step 3: Link patients to coordinators
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("🔗 Step 3: Link Patients to Coordinators")
        self.stdout.write("="*80)

        imported_links = 0
        skipped_links = 0

        for fm_patient in fm_patients:
            coord_name = fm_patient.get('NDIS Coordinator Name')
            if not coord_name or not str(coord_name).strip():
                continue

            coord_name_clean = str(coord_name).strip()
            coordinator = coordinator_map.get(coord_name_clean)
            if not coordinator:
                skipped_links += 1
                continue

            # Get patient by FileMaker ID
            patient_id = fm_patient.get('id')
            try:
                patients_found = Patient.objects.filter(notes__contains=f'"filemaker_id": "{patient_id}"')
                if not patients_found.exists():
                    skipped_links += 1
                    continue
                patient = patients_found.first()
            except Exception:
                skipped_links += 1
                continue

            # Get assignment date (plan start date or creation date)
            assignment_date = self.parse_date(fm_patient.get('NDIS Plan Start Date'))
            if not assignment_date:
                assignment_date = self.parse_date(fm_patient.get('creationDate'))
            if not assignment_date:
                assignment_date = datetime.now().date()

            # Get plan dates
            plan_start = self.parse_date(fm_patient.get('NDIS Plan Start Date'))
            plan_end = self.parse_date(fm_patient.get('NDIS Plan End Date'))

            # Get NDIS notes
            ndis_notes = fm_patient.get('NDIS notes')
            if ndis_notes and str(ndis_notes).strip():
                ndis_notes = str(ndis_notes).strip()
            else:
                ndis_notes = None

            if options['dry_run']:
                continue

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
                    imported_links += 1

                    if imported_links % 100 == 0:
                        self.stdout.write(f"   ✅ Processed {imported_links} links...")
            except Exception as e:
                skipped_links += 1

        self.stdout.write(f"\n   ✅ Imported {imported_links} patient-coordinator links")
        if skipped_links > 0:
            self.stdout.write(f"   ⚠️  Skipped {skipped_links} links")

        # ===== PART 2: NOTES =====

        # Step 4: Fetch notes from FileMaker
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("📝 Step 4: Fetch Notes from FileMaker")
        self.stdout.write("="*80)

        self.stdout.write(f"\n   Fetching notes...")
        fm_notes = self.fetch_odata('API_Notes')
        self.stdout.write(f"   ✅ Fetched {len(fm_notes)} note records")

        # Filter out empty notes
        fm_notes = [n for n in fm_notes if n.get('Note') and n.get('Note').strip()]
        self.stdout.write(f"   ✅ {len(fm_notes)} notes have content")

        # Step 5: Import notes
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("💾 Step 5: Import Notes to Nexus")
        self.stdout.write("="*80)

        imported_notes = 0
        skipped_notes = 0

        for fm_note in fm_notes:
            patient_id = fm_note.get('id_Key')
            note_content = fm_note.get('Note')
            note_type = fm_note.get('Note Type') or fm_note.get('NoteType')
            created_date = self.parse_date(fm_note.get('Date'))
            created_by = fm_note.get('creationAccountName')
            fm_note_id = fm_note.get('id')

            if not patient_id or not note_content:
                skipped_notes += 1
                continue

            # Find patient by FileMaker ID in notes JSON
            try:
                patients_found = Patient.objects.filter(notes__contains=f'"filemaker_id": "{patient_id}"')
                if not patients_found.exists():
                    skipped_notes += 1
                    continue
                patient = patients_found.first()
            except Exception:
                skipped_notes += 1
                continue

            if options['dry_run']:
                continue

            try:
                with transaction.atomic():
                    Note.objects.create(
                        patient=patient,
                        note_type=note_type or 'General',
                        content=note_content.strip(),
                        created_at=created_date or datetime.now(),
                        created_by=created_by or 'FileMaker Import',
                    )
                    imported_notes += 1

                    if imported_notes % 500 == 0:
                        self.stdout.write(f"   ✅ Processed {imported_notes} notes...")
            except Exception as e:
                skipped_notes += 1

        self.stdout.write(f"\n   ✅ Imported {imported_notes} notes")
        if skipped_notes > 0:
            self.stdout.write(f"   ⚠️  Skipped {skipped_notes} notes")

        # Summary
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write(self.style.SUCCESS("✅ Import Complete!"))
        self.stdout.write("="*80)

        if options['dry_run']:
            self.stdout.write(f"\n   [DRY RUN] No changes made")
        else:
            self.stdout.write(f"\n   📊 Summary:")
            self.stdout.write(f"      Coordinators: {imported_coordinators}")
            self.stdout.write(f"      Patient-Coordinator Links: {imported_links}")
            self.stdout.write(f"      Notes: {imported_notes}")

        self.stdout.write(f"\n🎯 Next Steps:")
        self.stdout.write(f"   1. Verify coordinators in Django admin")
        self.stdout.write(f"   2. Verify notes in patient records")
        self.stdout.write(f"   3. Import appointments (Phase 5)")
        self.stdout.write(f"   4. All core data imported! 🎉\n")

