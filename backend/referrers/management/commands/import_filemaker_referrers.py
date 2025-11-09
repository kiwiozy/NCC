"""
Django management command to import referrers, companies, and relationships from FileMaker

Usage:
    python manage.py import_filemaker_referrers

This command:
1. Extracts unique specialties from FileMaker → Creates `specialties` lookup table
2. Imports companies from FileMaker `API_Company_` (44 records)
3. Imports referrers from FileMaker `API_Referrer_` (98 active records)
4. Imports patient-referrer links from `API_ContactToReferrer_` (255 records)
5. Imports referrer-company links from `API_ReferrerToCompany_Join_` (73 records)

FileMaker Tables:
- API_Company_ (44 records)
- API_Referrer_ (98 active records)
- API_Contact_Details_ (contact information for both)
- API_ContactToReferrer_ (255 patient→referrer links)
- API_ReferrerToCompany_Join_ (73 referrer→company links)
"""

import os
import sys
import json
import requests
from datetime import datetime, date
from django.core.management.base import BaseCommand
from django.db import transaction
from referrers.models import Specialty, Referrer, PatientReferrer, ReferrerCompany
from companies.models import Company
from patients.models import Patient
import urllib3

# Disable SSL warnings for FileMaker server
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables from scripts/filemaker/.env
env_path = '/Users/craig/Documents/nexus-core-clinic/scripts/filemaker/.env'

# Parse .env file manually
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
    help = 'Import referrers, companies, and relationships from FileMaker'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def fetch_odata(self, table_name, skip_archived=False):
        """Fetch all records from an OData table"""
        url = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}/{table_name}"
        
        try:
            response = requests.get(
                url,
                auth=(FM_USERNAME, FM_PASSWORD),
                verify=False,
                timeout=30
            )

            if response.status_code != 200:
                self.stdout.write(self.style.ERROR(f"❌ HTTP {response.status_code}: {response.text[:200]}"))
                return []

            data = response.json()
            records = data.get('value', [])
            
            # Filter out archived records if requested
            if skip_archived and records:
                records = [r for r in records if r.get('RECORD_ACTIVE_INDICATOR') != 'Archived']
            
            return records

        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f"❌ Request failed: {str(e)}"))
            return []

    def parse_date(self, date_str):
        """Parse FileMaker date format to Django date"""
        if not date_str or date_str.strip() == '':
            return None

        # Try ISO format (YYYY-MM-DD) - from OData
        try:
            return datetime.strptime(date_str, '%Y-%m-%d').date()
        except (ValueError, AttributeError):
            pass

        # Try US format (MM/DD/YYYY) - from Data API
        try:
            return datetime.strptime(date_str, '%m/%d/%Y').date()
        except (ValueError, AttributeError):
            self.stdout.write(self.style.WARNING(f"    ⚠️  Invalid date: {date_str}"))
            return None

    def clean_phone_number(self, phone):
        """Clean phone number by removing whitespace, hyphens, and parentheses"""
        if not phone:
            return ''
        
        cleaned = str(phone).strip()
        cleaned = cleaned.replace(' ', '')
        cleaned = cleaned.replace('-', '')
        cleaned = cleaned.replace('(', '')
        cleaned = cleaned.replace(')', '')
        cleaned = cleaned.replace('.', '')
        
        return cleaned

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write(self.style.SUCCESS("FileMaker Referrers & Companies Import"))
        self.stdout.write("="*80)

        if not all([FM_BASE_URL, FM_DATABASE, FM_USERNAME, FM_PASSWORD]):
            self.stdout.write(self.style.ERROR("\n❌ Missing FileMaker credentials"))
            return

        self.stdout.write(f"\n📊 Configuration:")
        self.stdout.write(f"   Server: {FM_BASE_URL}")
        self.stdout.write(f"   Database: {FM_DATABASE}")
        self.stdout.write(f"   Dry run: {options['dry_run']}")

        # Step 1: Fetch all data from FileMaker
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("📥 Step 1: Fetch Data from FileMaker")
        self.stdout.write("="*80)

        self.stdout.write(f"\n   Fetching referrers...")
        fm_referrers = self.fetch_odata('API_Referrer', skip_archived=True)
        self.stdout.write(f"   ✅ Fetched {len(fm_referrers)} active referrers")

        self.stdout.write(f"\n   Fetching companies...")
        fm_companies = self.fetch_odata('API_Company')
        self.stdout.write(f"   ✅ Fetched {len(fm_companies)} companies")

        self.stdout.write(f"\n   Fetching contact details...")
        fm_contact_details = self.fetch_odata('API_Contact_Details')
        self.stdout.write(f"   ✅ Fetched {len(fm_contact_details)} contact details")

        self.stdout.write(f"\n   Fetching patient-referrer links...")
        fm_patient_referrers = self.fetch_odata('API_ContactToReferrer')
        self.stdout.write(f"   ✅ Fetched {len(fm_patient_referrers)} patient-referrer links")

        self.stdout.write(f"\n   Fetching referrer-company links...")
        fm_referrer_companies = self.fetch_odata('API_ReferrerToCompany_Join')
        self.stdout.write(f"   ✅ Fetched {len(fm_referrer_companies)} referrer-company links")

        # Index contact details by id
        contact_details_by_id = {}
        for cd in fm_contact_details:
            id_key = cd.get('id_key') or cd.get('id.key')
            if id_key:
                if id_key not in contact_details_by_id:
                    contact_details_by_id[id_key] = []
                contact_details_by_id[id_key].append(cd)

        # Step 2: Extract and import specialties
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("🏥 Step 2: Import Specialties (Lookup Table)")
        self.stdout.write("="*80)

        specialties = set()
        for ref in fm_referrers:
            specialty = ref.get('contactType')
            if specialty and specialty.strip():
                specialties.add(specialty.strip())

        self.stdout.write(f"\n   Found {len(specialties)} unique specialties:")
        for spec in sorted(specialties):
            self.stdout.write(f"      • {spec}")

        specialty_map = {}
        if not options['dry_run']:
            with transaction.atomic():
                for spec_name in specialties:
                    spec, created = Specialty.objects.get_or_create(name=spec_name)
                    specialty_map[spec_name] = spec
                    if created:
                        self.stdout.write(self.style.SUCCESS(f"   ✅ Created specialty: {spec_name}"))
                    else:
                        self.stdout.write(f"   ℹ️  Existing specialty: {spec_name}")

        # Step 3: Import companies
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("🏢 Step 3: Import Companies")
        self.stdout.write("="*80)

        company_map = {}
        imported_companies = 0

        for fm_company in fm_companies:
            company_id = fm_company.get('id')
            company_name = fm_company.get('name') or fm_company.get('Name')
            company_type_raw = fm_company.get('Type') or fm_company.get('type')

            if not company_name:
                continue

            # Map company type
            company_type = 'MEDICAL_PRACTICE'  # Default
            if company_type_raw:
                if 'NDIS' in company_type_raw.upper():
                    company_type = 'NDIS_PROVIDER'
                elif company_type_raw.upper() not in ['MEDICAL PRACTICE', 'MEDICAL_PRACTICE']:
                    company_type = 'OTHER'

            # Get contact details for this company
            contacts = contact_details_by_id.get(company_id, [])
            contact_json = {}
            address_json = {}

            for cd in contacts:
                cd_type = (cd.get('type') or '').lower()
                cd_name = cd.get('Name') or cd.get('name') or 'Main'
                cd_phone = cd.get('phone') or cd.get('Phone')
                cd_email = cd.get('email') or cd.get('Email')
                cd_address = cd.get('address') or cd.get('Address')

                if cd_type in ['phone', 'landline'] and cd_phone:
                    if 'phone' not in contact_json:
                        contact_json['phone'] = {}
                    contact_json['phone'][cd_name] = {
                        'value': self.clean_phone_number(cd_phone),
                        'default': len(contact_json.get('phone', {})) == 0
                    }
                elif cd_type == 'mobile' and cd_phone:
                    if 'mobile' not in contact_json:
                        contact_json['mobile'] = {}
                    contact_json['mobile'][cd_name] = {
                        'value': self.clean_phone_number(cd_phone),
                        'default': len(contact_json.get('mobile', {})) == 0
                    }
                elif cd_type == 'email' and cd_email:
                    if 'email' not in contact_json:
                        contact_json['email'] = {}
                    contact_json['email'][cd_name] = {
                        'value': cd_email.strip(),
                        'default': len(contact_json.get('email', {})) == 0
                    }
                
                if cd_address and cd_address.strip():
                    address_json = {'full_address': cd_address.strip()}

            self.stdout.write(f"\n   📋 {company_name}")
            self.stdout.write(f"      Type: {company_type}")
            self.stdout.write(f"      FileMaker ID: {company_id}")
            self.stdout.write(f"      Contacts: {len(contacts)}")

            if options['dry_run']:
                self.stdout.write(f"      [DRY RUN] Would create company")
                continue

            try:
                with transaction.atomic():
                    company, created = Company.objects.get_or_create(
                        filemaker_id=company_id,
                        defaults={
                            'name': company_name,
                            'company_type': company_type,
                            'contact_json': contact_json if contact_json else None,
                            'address_json': address_json if address_json else None,
                        }
                    )
                    company_map[company_id] = company
                    if created:
                        imported_companies += 1
                        self.stdout.write(self.style.SUCCESS(f"      ✅ Created: {company.id}"))
                    else:
                        self.stdout.write(f"      ℹ️  Already exists: {company.id}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"      ❌ Failed: {str(e)}"))

        # Step 4: Import referrers
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("👨‍⚕️ Step 4: Import Referrers")
        self.stdout.write("="*80)

        referrer_map = {}
        imported_referrers = 0

        for fm_referrer in fm_referrers:
            referrer_id = fm_referrer.get('id')
            title = fm_referrer.get('title') or fm_referrer.get('Title')
            first_name = fm_referrer.get('nameFirst') or fm_referrer.get('first_name') or fm_referrer.get('first')
            last_name = fm_referrer.get('nameLast') or fm_referrer.get('last_name') or fm_referrer.get('last')
            specialty_name = fm_referrer.get('contactType')

            if not last_name:
                continue

            # Get specialty
            specialty = specialty_map.get(specialty_name) if specialty_name else None

            # Get contact details
            contacts = contact_details_by_id.get(referrer_id, [])
            contact_json = {}
            address_json = {}

            for cd in contacts:
                cd_type = (cd.get('type') or '').lower()
                cd_name = cd.get('Name') or cd.get('name') or 'Main'
                cd_phone = cd.get('phone') or cd.get('Phone')
                cd_email = cd.get('email') or cd.get('Email')
                cd_address = cd.get('address') or cd.get('Address')

                if cd_type in ['phone', 'landline'] and cd_phone:
                    if 'phone' not in contact_json:
                        contact_json['phone'] = {}
                    contact_json['phone'][cd_name] = {
                        'value': self.clean_phone_number(cd_phone),
                        'default': len(contact_json.get('phone', {})) == 0
                    }
                elif cd_type == 'mobile' and cd_phone:
                    if 'mobile' not in contact_json:
                        contact_json['mobile'] = {}
                    contact_json['mobile'][cd_name] = {
                        'value': self.clean_phone_number(cd_phone),
                        'default': len(contact_json.get('mobile', {})) == 0
                    }
                elif cd_type == 'email' and cd_email:
                    if 'email' not in contact_json:
                        contact_json['email'] = {}
                    contact_json['email'][cd_name] = {
                        'value': cd_email.strip(),
                        'default': len(contact_json.get('email', {})) == 0
                    }
                
                if cd_address and cd_address.strip():
                    address_json = {'full_address': cd_address.strip()}

            full_name = f"{title} {first_name} {last_name}" if title else f"{first_name} {last_name}"
            self.stdout.write(f"\n   📋 {full_name}")
            self.stdout.write(f"      Specialty: {specialty_name or 'None'}")
            self.stdout.write(f"      FileMaker ID: {referrer_id}")
            self.stdout.write(f"      Contacts: {len(contacts)}")

            if options['dry_run']:
                self.stdout.write(f"      [DRY RUN] Would create referrer")
                continue

            try:
                with transaction.atomic():
                    referrer, created = Referrer.objects.get_or_create(
                        filemaker_id=referrer_id,
                        defaults={
                            'title': title,
                            'first_name': first_name or '',
                            'last_name': last_name,
                            'specialty': specialty,
                            'contact_json': contact_json if contact_json else None,
                            'address_json': address_json if address_json else None,
                        }
                    )
                    referrer_map[referrer_id] = referrer
                    if created:
                        imported_referrers += 1
                        self.stdout.write(self.style.SUCCESS(f"      ✅ Created: {referrer.id}"))
                    else:
                        self.stdout.write(f"      ℹ️  Already exists: {referrer.id}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"      ❌ Failed: {str(e)}"))

        # Step 5: Import patient-referrer links
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("🔗 Step 5: Import Patient-Referrer Links")
        self.stdout.write("="*80)

        imported_patient_referrers = 0
        skipped_patient_referrers = 0

        for fm_link in fm_patient_referrers:
            patient_id = fm_link.get('id_Contact')
            referrer_id = fm_link.get('id_Perscriber')  # Note: typo in FileMaker
            link_date = self.parse_date(fm_link.get('date'))
            fm_link_id = fm_link.get('id')

            if not patient_id or not referrer_id:
                skipped_patient_referrers += 1
                continue

            # Get patient by FileMaker ID stored in notes JSON
            try:
                # Query patients where notes JSON contains the filemaker_id
                patients = Patient.objects.filter(notes__contains=f'"filemaker_id": "{patient_id}"')
                if not patients.exists():
                    self.stdout.write(f"   ⚠️  Patient not found: {patient_id}")
                    skipped_patient_referrers += 1
                    continue
                patient = patients.first()
            except Exception as e:
                self.stdout.write(f"   ⚠️  Error finding patient {patient_id}: {str(e)}")
                skipped_patient_referrers += 1
                continue

            referrer = referrer_map.get(referrer_id)
            if not referrer:
                self.stdout.write(f"   ⚠️  Referrer not found: {referrer_id}")
                skipped_patient_referrers += 1
                continue

            if options['dry_run']:
                continue

            try:
                with transaction.atomic():
                    PatientReferrer.objects.get_or_create(
                        patient=patient,
                        referrer=referrer,
                        defaults={
                            'referral_date': link_date,
                            'status': 'ACTIVE',
                            'filemaker_id': fm_link_id
                        }
                    )
                    imported_patient_referrers += 1
                    
                    if imported_patient_referrers % 50 == 0:
                        self.stdout.write(f"   ✅ Processed {imported_patient_referrers} links...")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"   ❌ Failed to link: {str(e)}"))
                skipped_patient_referrers += 1

        self.stdout.write(f"\n   ✅ Imported {imported_patient_referrers} patient-referrer links")
        if skipped_patient_referrers > 0:
            self.stdout.write(f"   ⚠️  Skipped {skipped_patient_referrers} links")

        # Step 6: Import referrer-company links
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("🔗 Step 6: Import Referrer-Company Links")
        self.stdout.write("="*80)

        imported_referrer_companies = 0
        skipped_referrer_companies = 0

        for fm_link in fm_referrer_companies:
            referrer_id = fm_link.get('id_Referrer')
            company_id = fm_link.get('id_Company')
            fm_link_id = fm_link.get('id')

            if not referrer_id or not company_id:
                skipped_referrer_companies += 1
                continue

            referrer = referrer_map.get(referrer_id)
            company = company_map.get(company_id)

            if not referrer or not company:
                skipped_referrer_companies += 1
                continue

            if options['dry_run']:
                continue

            try:
                with transaction.atomic():
                    ReferrerCompany.objects.get_or_create(
                        referrer=referrer,
                        company=company,
                        defaults={
                            'is_primary': imported_referrer_companies == 0,  # First one is primary
                            'filemaker_id': fm_link_id
                        }
                    )
                    imported_referrer_companies += 1

                    if imported_referrer_companies % 20 == 0:
                        self.stdout.write(f"   ✅ Processed {imported_referrer_companies} links...")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"   ❌ Failed to link: {str(e)}"))
                skipped_referrer_companies += 1

        self.stdout.write(f"\n   ✅ Imported {imported_referrer_companies} referrer-company links")
        if skipped_referrer_companies > 0:
            self.stdout.write(f"   ⚠️  Skipped {skipped_referrer_companies} links")

        # Summary
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write(self.style.SUCCESS("✅ Import Complete!"))
        self.stdout.write("="*80)

        if options['dry_run']:
            self.stdout.write(f"\n   [DRY RUN] No changes made")
        else:
            self.stdout.write(f"\n   📊 Summary:")
            self.stdout.write(f"      Specialties: {len(specialties)}")
            self.stdout.write(f"      Companies: {imported_companies}")
            self.stdout.write(f"      Referrers: {imported_referrers}")
            self.stdout.write(f"      Patient-Referrer Links: {imported_patient_referrers}")
            self.stdout.write(f"      Referrer-Company Links: {imported_referrer_companies}")

        self.stdout.write(f"\n🎯 Next Steps:")
        self.stdout.write(f"   1. Verify data in Django admin")
        self.stdout.write(f"   2. Import coordinators and notes")
        self.stdout.write(f"   3. Import appointments\n")

