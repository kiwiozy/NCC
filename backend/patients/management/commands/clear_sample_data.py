"""
Django management command to clear sample data before FileMaker import

Usage:
    python manage.py clear_sample_data
"""

from django.core.management.base import BaseCommand
from django.db import transaction
import json
import os
from datetime import datetime

from patients.models import Patient
from appointments.models import Appointment
from sms_integration.models import SMSMessage, SMSInbound
from letters.models import PatientLetter
from reminders.models import Reminder


class Command(BaseCommand):
    help = 'Backup and clear sample data to prepare for FileMaker import'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-backup',
            action='store_true',
            help='Skip backup (NOT recommended)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Skip confirmation prompt',
        )
        parser.add_argument(
            '--allow-production',
            action='store_true',
            help='Allow clearing even if > 20 patients (DANGEROUS!)',
        )

    def get_counts(self):
        """Get current record counts"""
        return {
            'patients': Patient.objects.count(),
            'appointments': Appointment.objects.count(),
            'sms_messages': SMSMessage.objects.count(),
            'sms_inbound': SMSInbound.objects.count(),
            'letters': PatientLetter.objects.count(),
            'reminders': Reminder.objects.count(),
        }

    def backup_data(self):
        """Backup all data to JSON file"""
        backup_dir = os.path.join(os.path.dirname(__file__), '../../../scripts/filemaker/data/backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(backup_dir, f'sample_data_backup_{timestamp}.json')
        
        self.stdout.write(self.style.SUCCESS('\n📦 Creating backup...'))
        
        backup_data = {
            'backup_date': datetime.now().isoformat(),
            'counts': self.get_counts(),
            'patients': [],
            'appointments': [],
            'sms_messages': [],
            'sms_inbound': [],
            'letters': [],
            'reminders': [],
        }
        
        # Backup patients
        for patient in Patient.objects.all():
            backup_data['patients'].append({
                'id': str(patient.id),
                'first_name': patient.first_name,
                'last_name': patient.last_name,
                'dob': str(patient.dob) if patient.dob else None,
                'contact_json': patient.contact_json,
                'address_json': patient.address_json,
                'created_at': patient.created_at.isoformat(),
            })
        
        # Backup appointments
        for appt in Appointment.objects.all():
            backup_data['appointments'].append({
                'id': str(appt.id),
                'patient_id': str(appt.patient_id),
                'start_time': appt.start_time.isoformat(),
                'end_time': appt.end_time.isoformat() if appt.end_time else None,
                'status': appt.status,
            })
        
        # Backup SMS messages
        for sms in SMSMessage.objects.all():
            backup_data['sms_messages'].append({
                'id': str(sms.id),
                'patient_id': str(sms.patient_id) if sms.patient_id else None,
                'phone_number': sms.phone_number,
                'message': sms.message,
                'sent_at': sms.sent_at.isoformat() if sms.sent_at else None,
            })
        
        # Backup inbound SMS
        for sms in SMSInbound.objects.all():
            backup_data['sms_inbound'].append({
                'id': str(sms.id),
                'patient_id': str(sms.patient_id) if sms.patient_id else None,
                'from_number': sms.from_number,
                'message': sms.message,
                'received_at': sms.received_at.isoformat(),
            })
        
        # Backup letters
        for letter in PatientLetter.objects.all():
            backup_data['letters'].append({
                'id': str(letter.id),
                'patient_id': str(letter.patient_id),
                'letter_type': letter.letter_type,
                'subject': letter.subject,
                'created_at': letter.created_at.isoformat(),
            })
        
        # Backup reminders
        for reminder in Reminder.objects.all():
            backup_data['reminders'].append({
                'id': str(reminder.id),
                'patient_id': str(reminder.patient_id),
                'note': reminder.note,
                'reminder_date': str(reminder.reminder_date) if reminder.reminder_date else None,
                'status': reminder.status,
            })
        
        # Save to file
        with open(backup_file, 'w') as f:
            json.dump(backup_data, f, indent=2)
        
        self.stdout.write(self.style.SUCCESS(f'✅ Backup saved to: {backup_file}'))
        self.stdout.write(f'   File size: {os.path.getsize(backup_file):,} bytes')
        
        return backup_file

    @transaction.atomic
    def clear_data(self):
        """Delete all data (must delete in correct order due to PROTECT foreign keys)"""
        self.stdout.write(self.style.WARNING('\n🗑️  Deleting data...'))
        
        # Delete SMS messages (not cascaded from patients)
        sms_out_count, _ = SMSMessage.objects.all().delete()
        sms_in_count, _ = SMSInbound.objects.all().delete()
        
        # Delete appointments FIRST (they have PROTECT foreign key to patients)
        appt_count, _ = Appointment.objects.all().delete()
        
        # Delete patients (will cascade to letters, reminders, but NOT appointments due to PROTECT)
        patient_count, details = Patient.objects.all().delete()
        
        return {
            'patients': patient_count,
            'appointments': appt_count,
            'sms_messages': sms_out_count,
            'sms_inbound': sms_in_count,
            'details': details
        }

    def handle(self, *args, **options):
        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('🗑️  CLEAR SAMPLE DATA - Prepare for FileMaker Import'))
        self.stdout.write('=' * 70)
        
        # Get current counts
        counts = self.get_counts()
        
        self.stdout.write('\n📊 Current Database Counts:')
        for key, value in counts.items():
            self.stdout.write(f'   {key:20s}: {value:,}')
        
        total = sum(counts.values())
        self.stdout.write(f'   {"TOTAL":20s}: {total:,}')
        
        # Safety check - only proceed if < 20 patients (unless --allow-production)
        if counts['patients'] > 20 and not options['allow_production']:
            self.stdout.write(self.style.ERROR(f'\n❌ ERROR: Too many patients ({counts["patients"]})!'))
            self.stdout.write(self.style.ERROR(f'   This command is designed for clearing SAMPLE data only.'))
            self.stdout.write(self.style.ERROR(f'   If you really want to clear this data, use --allow-production flag.'))
            self.stdout.write(self.style.ERROR(f'   Example: python manage.py clear_sample_data --allow-production'))
            return
        
        if total == 0:
            self.stdout.write(self.style.SUCCESS('\n✅ Database is already empty! Nothing to clear.'))
            return
        
        # Ask for confirmation (unless --force)
        if not options['force']:
            self.stdout.write(self.style.WARNING('\n⚠️  WARNING: This will DELETE all data shown above!'))
            self.stdout.write('   A backup will be created first.')
            confirm = input('\nType "YES" to confirm: ')
            
            if confirm != 'YES':
                self.stdout.write(self.style.ERROR('\n❌ Cancelled. No data was deleted.'))
                return
        
        # Create backup (unless --no-backup)
        if not options['no_backup']:
            backup_file = self.backup_data()
        
        # Clear data
        deleted_counts = self.clear_data()
        
        self.stdout.write(self.style.SUCCESS('\n✅ Data Deleted:'))
        for key, value in deleted_counts.items():
            if key != 'details' and value > 0:
                self.stdout.write(f'   {key:20s}: {value:,} records')
        
        # Show cascade details
        if deleted_counts['details']:
            self.stdout.write('\n   Cascaded deletes:')
            for model, count in deleted_counts['details'].items():
                if count > 0:
                    self.stdout.write(f'     - {model}: {count}')
        
        # Verify empty
        final_counts = self.get_counts()
        final_total = sum(final_counts.values())
        
        self.stdout.write('\n📊 Final Database Counts:')
        for key, value in final_counts.items():
            self.stdout.write(f'   {key:20s}: {value:,}')
        self.stdout.write(f'   {"TOTAL":20s}: {final_total:,}')
        
        if final_total == 0:
            self.stdout.write(self.style.SUCCESS('\n✅ SUCCESS! Database is now empty and ready for FileMaker import.'))
            if not options['no_backup']:
                self.stdout.write(f'\n📦 Backup Location: {backup_file}')
        else:
            self.stdout.write(self.style.WARNING('\n⚠️  WARNING: Some records remain. Check for foreign key constraints.'))
        
        self.stdout.write('\n📝 Next Steps:')
        self.stdout.write('   1. Review backup file if needed')
        self.stdout.write('   2. Run FileMaker import scripts')
        self.stdout.write('   3. Validate imported data')

