#!/usr/bin/env python3
"""
Clear Sample Data Script

This script backs up and clears existing sample/test data from Nexus database
to prepare for FileMaker import.

Usage:
    cd backend
    python3 ../scripts/filemaker/00_clear_sample_data.py

Safety Features:
- Creates JSON backup before deleting
- Only runs if < 20 patients (safety check)
- Requires explicit confirmation
- Backs up to data/backups/
"""

import os
import sys
import json
from datetime import datetime

# Add Django project to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')

import django
django.setup()

from patients.models import Patient
from appointments.models import Appointment
from sms_integration.models import SMSMessage, SMSInbound
from letters.models import PatientLetter
from reminders.models import Reminder

# Output directory
BACKUP_DIR = os.path.join(os.path.dirname(__file__), 'data/backups')
os.makedirs(BACKUP_DIR, exist_ok=True)

def get_counts():
    """Get current record counts"""
    return {
        'patients': Patient.objects.count(),
        'appointments': Appointment.objects.count(),
        'sms_messages': SMSMessage.objects.count(),
        'sms_inbound': SMSInbound.objects.count(),
        'letters': PatientLetter.objects.count(),
        'reminders': Reminder.objects.count(),
    }

def backup_data():
    """Backup all data to JSON file"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = os.path.join(BACKUP_DIR, f'sample_data_backup_{timestamp}.json')
    
    print(f"\n📦 Creating backup...")
    
    backup_data = {
        'backup_date': datetime.now().isoformat(),
        'counts': get_counts(),
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
            'sent_at': sms.sent_at.isoformat(),
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
    
    print(f"✅ Backup saved to: {backup_file}")
    print(f"   File size: {os.path.getsize(backup_file):,} bytes")
    
    return backup_file

def clear_data():
    """Delete all data (cascading deletes will handle related records)"""
    print(f"\n🗑️  Deleting data...")
    
    # Delete in order (patients will cascade to appointments, letters, reminders)
    counts = {}
    
    # Delete SMS messages (not cascaded from patients)
    counts['sms_messages'] = SMSMessage.objects.all().delete()[0]
    counts['sms_inbound'] = SMSInbound.objects.all().delete()[0]
    
    # Delete patients (will cascade to appointments, letters, reminders)
    counts['patients'] = Patient.objects.all().delete()[0]
    
    return counts

def main():
    print("=" * 70)
    print("🗑️  CLEAR SAMPLE DATA - Prepare for FileMaker Import")
    print("=" * 70)
    
    # Get current counts
    counts = get_counts()
    
    print(f"\n📊 Current Database Counts:")
    for key, value in counts.items():
        print(f"   {key:20s}: {value:,}")
    
    total = sum(counts.values())
    print(f"   {'TOTAL':20s}: {total:,}")
    
    # Safety check - only proceed if < 20 patients
    if counts['patients'] > 20:
        print(f"\n❌ ERROR: Too many patients ({counts['patients']})!")
        print(f"   This script is designed for clearing SAMPLE data only.")
        print(f"   If you really want to clear production data, modify this script.")
        return
    
    if total == 0:
        print(f"\n✅ Database is already empty! Nothing to clear.")
        return
    
    # Ask for confirmation
    print(f"\n⚠️  WARNING: This will DELETE all data shown above!")
    print(f"   A backup will be created first.")
    print(f"\nType 'YES' to confirm: ", end='')
    
    confirmation = input().strip()
    
    if confirmation != 'YES':
        print(f"\n❌ Cancelled. No data was deleted.")
        return
    
    # Create backup
    backup_file = backup_data()
    
    # Clear data
    deleted_counts = clear_data()
    
    print(f"\n✅ Data Deleted:")
    for key, value in deleted_counts.items():
        if value > 0:
            print(f"   {key:20s}: {value:,} records")
    
    # Verify empty
    final_counts = get_counts()
    final_total = sum(final_counts.values())
    
    print(f"\n📊 Final Database Counts:")
    for key, value in final_counts.items():
        print(f"   {key:20s}: {value:,}")
    print(f"   {'TOTAL':20s}: {final_total:,}")
    
    if final_total == 0:
        print(f"\n✅ SUCCESS! Database is now empty and ready for FileMaker import.")
        print(f"\n📦 Backup Location: {backup_file}")
    else:
        print(f"\n⚠️  WARNING: Some records remain. Check for foreign key constraints.")
    
    print(f"\n📝 Next Steps:")
    print(f"   1. Review backup file if needed")
    print(f"   2. Run FileMaker import scripts")
    print(f"   3. Validate imported data")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user. No data was deleted.")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


