"""
Django management command to import clinics from FileMaker

Usage:
    python manage.py import_filemaker_clinics

This command:
1. Deletes existing clinics (Newcastle, Tamworth)
2. Imports 11 clinics from FileMaker API_Clinic_Name_ table
3. Exports clinic mapping file (FileMaker ID → Nexus ID)

FileMaker Table: API_Clinic_Name_ (11 records)
"""

import os
import sys
import json
import requests
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from clinicians.models import Clinic
from dotenv import load_dotenv
import urllib3

# Disable SSL warnings for FileMaker server
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables from scripts/filemaker/.env (manual parsing like export scripts)
# Get absolute path to .env file
env_path = '/Users/craig/Documents/nexus-core-clinic/scripts/filemaker/.env'

# Parse .env file manually (more reliable than python-dotenv)
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
    help = 'Import clinics from FileMaker API_Clinic_Name_ table'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-delete',
            action='store_true',
            help='Skip deleting existing clinics',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write(self.style.SUCCESS("FileMaker Clinic Import"))
        self.stdout.write("="*80)

        # Check environment variables (use global variables loaded at module level)
        if not all([FM_BASE_URL, FM_DATABASE, FM_USERNAME, FM_PASSWORD]):
            self.stdout.write(self.style.ERROR("\n❌ Missing FileMaker credentials in .env file"))
            self.stdout.write(f"   .env path: {env_path}")
            return

        self.stdout.write(f"\n📊 Configuration:")
        self.stdout.write(f"   Server: {FM_BASE_URL}")
        self.stdout.write(f"   Database: {FM_DATABASE}")
        self.stdout.write(f"   Dry run: {options['dry_run']}")

        # Step 1: Delete existing clinics
        if not options['no_delete']:
            self.stdout.write(f"\n{'='*80}")
            self.stdout.write("🗑️  Step 1: Delete Existing Clinics")
            self.stdout.write("="*80)

            existing_clinics = Clinic.objects.all()
            self.stdout.write(f"\n   Found {existing_clinics.count()} existing clinics:")
            for clinic in existing_clinics:
                self.stdout.write(f"      • {clinic.name} (ID: {clinic.id})")

            if options['dry_run']:
                self.stdout.write(f"\n   [DRY RUN] Would delete {existing_clinics.count()} clinics")
            else:
                with transaction.atomic():
                    count = existing_clinics.count()
                    existing_clinics.delete()
                    self.stdout.write(self.style.SUCCESS(f"\n   ✅ Deleted {count} clinics"))
        else:
            self.stdout.write(f"\n⏭️  Skipping clinic deletion (--no-delete flag)")

        # Step 2: Fetch clinics from FileMaker
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("📥 Step 2: Fetch Clinics from FileMaker")
        self.stdout.write("="*80)

        odata_url = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}/API_Clinic_Name"

        try:
            response = requests.get(
                odata_url,
                auth=(FM_USERNAME, FM_PASSWORD),
                verify=False,
                timeout=30
            )

            if response.status_code != 200:
                self.stdout.write(self.style.ERROR(f"\n❌ HTTP {response.status_code}: {response.text[:200]}"))
                return

            data = response.json()
            fm_clinics = data.get('value', [])

            self.stdout.write(f"\n   ✅ Fetched {len(fm_clinics)} clinics from FileMaker")

            if len(fm_clinics) == 0:
                self.stdout.write(self.style.WARNING("\n⚠️  No clinics found in FileMaker!"))
                return

        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f"\n❌ Request failed: {str(e)}"))
            return

        # Step 3: Import clinics to Nexus
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("💾 Step 3: Import Clinics to Nexus")
        self.stdout.write("="*80)

        clinic_mapping = {}
        imported_count = 0

        for fm_clinic in fm_clinics:
            clinic_name = fm_clinic.get('Clinic') or fm_clinic.get('name') or fm_clinic.get('Name')
            filemaker_id = fm_clinic.get('id')

            if not clinic_name:
                self.stdout.write(self.style.WARNING(f"\n   ⚠️  Skipping clinic with no name: {fm_clinic}"))
                continue

            if not filemaker_id:
                self.stdout.write(self.style.WARNING(f"\n   ⚠️  Skipping clinic with no ID: {clinic_name}"))
                continue

            self.stdout.write(f"\n   📋 {clinic_name}")
            self.stdout.write(f"      FileMaker ID: {filemaker_id}")

            if options['dry_run']:
                self.stdout.write(f"      [DRY RUN] Would create clinic")
                continue

            # Create clinic in Nexus
            try:
                with transaction.atomic():
                    clinic = Clinic.objects.create(
                        name=clinic_name,
                        filemaker_id=filemaker_id
                    )

                    clinic_mapping[filemaker_id] = str(clinic.id)
                    imported_count += 1

                    self.stdout.write(self.style.SUCCESS(f"      ✅ Created: Nexus ID = {clinic.id}"))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"      ❌ Failed to create: {str(e)}"))

        # Step 4: Export clinic mapping
        if not options['dry_run'] and imported_count > 0:
            self.stdout.write(f"\n{'='*80}")
            self.stdout.write("📤 Step 4: Export Clinic Mapping")
            self.stdout.write("="*80)

            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f"scripts/filemaker/data/export/clinic_mapping_{timestamp}.json"

            # Create directory if needed
            os.makedirs(os.path.dirname(output_file), exist_ok=True)

            mapping_data = {
                'export_date': datetime.now().isoformat(),
                'total_clinics': imported_count,
                'mapping': clinic_mapping
            }

            with open(output_file, 'w') as f:
                json.dump(mapping_data, f, indent=2)

            self.stdout.write(f"\n   ✅ Exported clinic mapping to: {output_file}")

        # Summary
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write(self.style.SUCCESS("✅ Import Complete!"))
        self.stdout.write("="*80)

        if options['dry_run']:
            self.stdout.write(f"\n   [DRY RUN] No changes made")
            self.stdout.write(f"   Would import {len(fm_clinics)} clinics")
        else:
            self.stdout.write(f"\n   📊 Summary:")
            self.stdout.write(f"      Imported: {imported_count} clinics")
            if clinic_mapping:
                self.stdout.write(f"      Mapping file: clinic_mapping_{timestamp}.json")

        self.stdout.write(f"\n🎯 Next Steps:")
        self.stdout.write(f"   1. Verify clinics in Nexus admin or frontend")
        self.stdout.write(f"   2. Manually add contact details (phone, email, ABN) for each clinic")
        self.stdout.write(f"   3. Use clinic mapping file for appointment import")
        self.stdout.write(f"   4. Ready to import appointments (Phase 5)!\n")

