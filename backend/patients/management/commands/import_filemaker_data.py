"""
Django management command to import FileMaker data
Usage: python manage.py import_filemaker_data
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from patients.models import Patient
from datetime import datetime
from pathlib import Path
import json

class Command(BaseCommand):
    help = 'Import patient data from FileMaker export JSON'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='Path to FileMaker export JSON file',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview import without saving to database',
        )

    def parse_filemaker_date(self, date_str):
        """Parse FileMaker date format to Django date
        Supports both:
        - ISO format: YYYY-MM-DD (from OData)
        - US format: MM/DD/YYYY (from Data API)
        """
        if not date_str or date_str.strip() == '':
            return None
        
        # Try ISO format first (YYYY-MM-DD) - from OData
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
        """Clean phone number by removing whitespace, hyphens, and parentheses
        Examples:
        - '0412 345 678' -> '0412345678'
        - '(02) 1234 5678' -> '0212345678'
        - '04-12-34-56-78' -> '0412345678'
        """
        if not phone:
            return ''
        
        # Remove all whitespace, hyphens, parentheses, and other common separators
        cleaned = str(phone).strip()
        cleaned = cleaned.replace(' ', '')
        cleaned = cleaned.replace('-', '')
        cleaned = cleaned.replace('(', '')
        cleaned = cleaned.replace(')', '')
        cleaned = cleaned.replace('.', '')
        
        return cleaned

    def transform_patient(self, fm_patient, fm_contacts):
        """Transform FileMaker patient data to Nexus format"""
        # Parse dates
        dob = self.parse_filemaker_date(fm_patient.get('dob'))
        
        # Build communication JSON from contact details
        # Frontend expects: {type: {name: {value: string, default: bool}}}
        communication = {}
        address_json = {}
        
        for contact in fm_contacts:
            contact_type = contact.get('type', '').lower()
            name = contact.get('name', '').lower() or 'home'  # Default to 'home' if empty
            
            if contact_type == 'phone':
                phone = contact.get('phone', '')
                if phone:
                    # Clean phone number (remove spaces, hyphens, etc.)
                    cleaned_phone = self.clean_phone_number(phone)
                    if cleaned_phone:  # Only add if there's something left after cleaning
                        if 'phone' not in communication:
                            communication['phone'] = {}
                        communication['phone'][name] = {
                            'value': cleaned_phone,
                            'default': False
                        }
            
            elif contact_type == 'mobile':
                phone = contact.get('phone', '')
                if phone:
                    # Clean phone number (remove spaces, hyphens, etc.)
                    cleaned_phone = self.clean_phone_number(phone)
                    if cleaned_phone:  # Only add if there's something left after cleaning
                        if 'mobile' not in communication:
                            communication['mobile'] = {}
                        communication['mobile'][name] = {
                            'value': cleaned_phone,
                            'default': False
                        }
            
            elif contact_type == 'email':
                email = contact.get('email')
                if email and email != 0:
                    if 'email' not in communication:
                        communication['email'] = {}
                    communication['email'][name] = {
                        'value': str(email),
                        'default': False
                    }
            
            elif contact_type == 'address':
                address_1 = contact.get('address_1', '')
                address_2 = contact.get('address_2', '')
                suburb = contact.get('suburb', '')
                state = contact.get('state', '')
                postcode = contact.get('postcode', '')
                
                if address_1 or suburb:
                    address_json = {
                        'street': address_1,
                        'street2': address_2,
                        'suburb': suburb,
                        'state': state,
                        'postcode': str(postcode) if postcode else '',
                        'type': name,
                        'default': True
                    }
        
        # Map to Nexus Patient model
        patient_data = {
            'title': fm_patient.get('title', ''),  # Add title
            'first_name': fm_patient.get('first_name', ''),
            'last_name': fm_patient.get('last_name', ''),
            'dob': dob,  # Not date_of_birth
            'sex': fm_patient.get('gender', '') or None,  # Not gender
            'health_number': fm_patient.get('health_number', ''),
            'contact_json': communication if communication else None,  # Not communication
            'address_json': address_json if address_json else None,
            'notes': json.dumps({
                'filemaker_id': fm_patient.get('id'),
                'filemaker_clinic': fm_patient.get('clinic_name'),
                'xero_contact_id': fm_patient.get('xero_contact_id'),
                'imported_at': datetime.now().isoformat()
            })
        }
        
        return patient_data

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("📥 IMPORT FILEMAKER DATA TO NEXUS"))
        self.stdout.write("=" * 70)
        
        # Load JSON file
        if options['file']:
            json_file = Path(options['file'])
        else:
            # Find the latest export file
            export_dir = Path('scripts/filemaker/data/export')
            if not export_dir.exists():
                export_dir = Path('../scripts/filemaker/data/export')
            
            export_files = sorted(export_dir.glob('sample_patients_with_contacts_*.json'))
            if not export_files:
                self.stdout.write(self.style.ERROR("❌ No export files found"))
                return
            json_file = export_files[-1]
        
        self.stdout.write(f"\n📄 Loading: {json_file.name}")
        
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        total_patients = len(data['patients'])
        self.stdout.write(self.style.SUCCESS(f"✅ Loaded {total_patients} patients"))
        
        current_count = Patient.objects.count()
        self.stdout.write(f"\n📊 Current database: {current_count} patients")
        
        if options['dry_run']:
            self.stdout.write(self.style.WARNING("\n🔍 DRY RUN MODE - No changes will be saved"))
        
        # Stats
        imported = 0
        skipped = 0
        errors = 0
        
        self.stdout.write(f"\n" + "=" * 70)
        self.stdout.write("💾 IMPORTING PATIENTS")
        self.stdout.write("=" * 70 + "\n")
        
        if not options['dry_run']:
            with transaction.atomic():
                for i, patient_record in enumerate(data['patients'], 1):
                    fm_patient = patient_record['patient']
                    fm_contacts = patient_record['contact_details']
                    
                    patient_name = f"{fm_patient.get('first_name', '')} {fm_patient.get('last_name', '')}".strip()
                    
                    try:
                        patient_data = self.transform_patient(fm_patient, fm_contacts)
                        
                        if not patient_data['first_name'] and not patient_data['last_name']:
                            self.stdout.write(f"[{i}/{total_patients}] ⏭️  Skipping (no name)")
                            skipped += 1
                            continue
                        
                        patient = Patient.objects.create(**patient_data)
                        
                        self.stdout.write(self.style.SUCCESS(f"[{i}/{total_patients}] ✅ {patient_name}"))
                        if fm_contacts:
                            self.stdout.write(f"    📞 {len(fm_contacts)} contact details")
                        
                        imported += 1
                        
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"[{i}/{total_patients}] ❌ {patient_name}: {e}"))
                        errors += 1
        else:
            # Dry run - just preview
            for i, patient_record in enumerate(data['patients'][:5], 1):
                fm_patient = patient_record['patient']
                fm_contacts = patient_record['contact_details']
                patient_name = f"{fm_patient.get('first_name', '')} {fm_patient.get('last_name', '')}".strip()
                self.stdout.write(f"[{i}] {patient_name} ({len(fm_contacts)} contacts)")
            
            self.stdout.write(f"\n... and {total_patients - 5} more patients")
            imported = total_patients
        
        self.stdout.write(f"\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("✅ IMPORT COMPLETE"))
        self.stdout.write("=" * 70)
        self.stdout.write(f"\n📊 SUMMARY:")
        self.stdout.write(f"   Total:    {total_patients}")
        self.stdout.write(f"   Imported: {imported}")
        self.stdout.write(f"   Skipped:  {skipped}")
        self.stdout.write(f"   Errors:   {errors}")

