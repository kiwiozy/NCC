"""
Django management command to import appointments from FileMaker

Usage:
    python manage.py import_filemaker_appointments

This command imports appointments from API_event table, linking them to:
- Patients (via id_Contact)
- Clinics (via idCal)

Only imports appointments with patients (id_Contact IS NOT NULL).
"""

import os
import json
import requests
from datetime import datetime, date, time
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
import pytz
from appointments.models import Appointment
from patients.models import Patient
from clinicians.models import Clinic
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
    help = 'Import appointments from FileMaker'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def fetch_appointments_with_patients(self):
        """Fetch only appointments that have patients"""
        all_records = []
        skip = 0
        top = 100
        
        self.stdout.write(f"\n   Fetching appointments (with patients only)...")
        
        while True:
            # Filter for appointments with patients (id_Contact IS NOT NULL)
            url = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}/API_event?$skip={skip}&$top={top}&$filter=id_Contact ne null"
            
            try:
                response = requests.get(url, auth=(FM_USERNAME, FM_PASSWORD), verify=False, timeout=30)
                if response.status_code != 200:
                    self.stdout.write(self.style.ERROR(f"❌ HTTP {response.status_code}"))
                    break
                
                data = response.json()
                records = data.get('value', [])
                
                if not records:
                    break
                
                all_records.extend(records)
                skip += top
                
                if skip % 500 == 0:
                    self.stdout.write(f"   ...fetched {skip} appointments...")
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))
                break
        
        return all_records

    def parse_datetime(self, date_str, time_str):
        """
        Parse FileMaker date + time to Python datetime (timezone-aware, Australia/Sydney)
        FileMaker sends times in local Sydney time, so we need to localize them properly.
        date_str: '2017-10-17' or '2017-10-17 13:30:00'
        time_str: '13:30:00' or None
        """
        if not date_str:
            return None
        
        # Australia/Sydney timezone
        sydney_tz = pytz.timezone('Australia/Sydney')
        
        try:
            naive_dt = None
            
            # If date_str already contains time
            if ' ' in str(date_str):
                naive_dt = datetime.strptime(str(date_str), '%Y-%m-%d %H:%M:%S')
            # Combine date + time
            elif time_str and str(time_str).strip():
                date_part = datetime.strptime(str(date_str), '%Y-%m-%d').date()
                time_part = datetime.strptime(str(time_str), '%H:%M:%S').time()
                naive_dt = datetime.combine(date_part, time_part)
            else:
                # Date only (all-day event) - use noon Sydney time
                naive_dt = datetime.strptime(str(date_str), '%Y-%m-%d').replace(hour=12)
            
            if naive_dt:
                # Localize the naive datetime to Sydney timezone
                # This tells Django: "this time is in Sydney timezone, please convert to UTC for storage"
                aware_dt = sydney_tz.localize(naive_dt)
                return aware_dt
            
            return None
                
        except Exception as e:
            return None

    def extract_reason(self, note_text):
        """Extract first sentence/line from note as appointment reason"""
        if not note_text or not str(note_text).strip():
            return None
        
        note_text = str(note_text).strip()
        
        # Get first sentence (up to period, newline, or 100 chars)
        if '.' in note_text:
            reason = note_text.split('.')[0].strip()
        elif '\n' in note_text:
            reason = note_text.split('\n')[0].strip()
        else:
            reason = note_text[:100].strip()
        
        return reason if reason else None

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write("📅 Import Appointments from FileMaker")
        self.stdout.write("="*80)

        if not all([FM_BASE_URL, FM_DATABASE, FM_USERNAME, FM_PASSWORD]):
            self.stdout.write(self.style.ERROR("\n❌ Missing FileMaker credentials"))
            return

        # Step 1: Fetch appointments
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("📥 Step 1: Fetch Appointments")
        self.stdout.write("="*80)

        fm_appointments = self.fetch_appointments_with_patients()
        self.stdout.write(f"✅ Fetched {len(fm_appointments)} appointments with patients")

        # Step 2: Build clinic mapping
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("🏥 Step 2: Build Clinic Mapping")
        self.stdout.write("="*80)

        clinic_map = {}  # FileMaker clinic ID → Nexus Clinic object
        for clinic in Clinic.objects.filter(filemaker_id__isnull=False):
            # Store both lowercase and original case for matching
            clinic_map[str(clinic.filemaker_id).lower()] = clinic
        
        self.stdout.write(f"✅ Mapped {len(clinic_map)} clinics")

        # Step 3: Import appointments
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("💾 Step 3: Import Appointments")
        self.stdout.write("="*80)

        imported = 0
        skipped_no_patient = 0
        skipped_no_clinic = 0  # Kept for backwards compatibility, but we now allow null
        skipped_invalid_date = 0
        skipped_error = 0
        orphaned_appointments = 0  # Appointments with unknown clinic IDs (clinic=None)

        for fm_appt in fm_appointments:
            appt_id = fm_appt.get('id')
            patient_id = fm_appt.get('id_Contact')
            clinic_id = fm_appt.get('idCal')
            start_date_str = fm_appt.get('startDate')
            start_time_str = fm_appt.get('startTime')
            end_date_str = fm_appt.get('endDate')
            end_time_str = fm_appt.get('endTime')
            all_day = fm_appt.get('allDay')
            note_text = fm_appt.get('note')

            # Find patient
            if not patient_id:
                skipped_no_patient += 1
                continue

            try:
                patients_found = Patient.objects.filter(notes__contains=f'"filemaker_id": "{patient_id}"')
                if not patients_found.exists():
                    skipped_no_patient += 1
                    continue
                patient = patients_found.first()
            except:
                skipped_no_patient += 1
                continue

            # Find clinic (allow null for orphaned appointments)
            clinic = None
            if clinic_id:
                clinic = clinic_map.get(str(clinic_id).lower())  # Case-insensitive match
                if not clinic:
                    orphaned_appointments += 1
            
            # Note: We allow appointments without clinics for historical data

            # Parse dates
            start_time = self.parse_datetime(start_date_str, start_time_str)
            if not start_time:
                skipped_invalid_date += 1
                continue

            end_time = self.parse_datetime(end_date_str, end_time_str)

            # Determine status (past = completed, future = scheduled)
            today = date.today()
            if start_time.date() < today:
                status = 'completed'
            else:
                status = 'scheduled'

            # Extract reason from notes
            reason = self.extract_reason(note_text)

            if options['dry_run']:
                if imported < 5:  # Show first 5 in dry run
                    self.stdout.write(f"\n   [DRY RUN] Would create:")
                    self.stdout.write(f"      Patient: {patient.first_name} {patient.last_name}")
                    self.stdout.write(f"      Clinic: {clinic.name if clinic else 'Unknown/Archived'}")
                    self.stdout.write(f"      Start: {start_time}")
                    self.stdout.write(f"      Status: {status}")
                    self.stdout.write(f"      Reason: {reason}")
                imported += 1
                continue

            # Import appointment
            try:
                with transaction.atomic():
                    Appointment.objects.get_or_create(
                        filemaker_event_id=appt_id,
                        defaults={
                            'clinic': clinic,
                            'patient': patient,
                            'start_time': start_time,
                            'end_time': end_time,
                            'status': status,
                            'reason': reason,
                            'notes': note_text if note_text else '',
                        }
                    )
                    imported += 1

                    if imported % 500 == 0:
                        self.stdout.write(f"   ✅ Imported {imported} appointments...")

            except Exception as e:
                skipped_error += 1
                if skipped_error < 5:  # Show first 5 errors
                    self.stdout.write(f"   ⚠️  Error: {str(e)[:100]}")

        # Summary
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("✅ Import Complete!")
        self.stdout.write("="*80)

        if options['dry_run']:
            self.stdout.write(f"\n   [DRY RUN] Would import {imported} appointments")
        else:
            self.stdout.write(f"\n   ✅ Imported: {imported}")
        
        if orphaned_appointments > 0:
            self.stdout.write(f"   ⚠️  Orphaned (unknown clinic): {orphaned_appointments}")
        if skipped_no_patient > 0:
            self.stdout.write(f"   ⚠️  Skipped (no patient): {skipped_no_patient}")
        if skipped_invalid_date > 0:
            self.stdout.write(f"   ⚠️  Skipped (invalid date): {skipped_invalid_date}")
        if skipped_error > 0:
            self.stdout.write(f"   ⚠️  Skipped (errors): {skipped_error}")

        self.stdout.write(f"\n")

