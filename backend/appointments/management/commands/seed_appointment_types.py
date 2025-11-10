"""
Management command to seed default appointment types.
Usage: python manage.py seed_appointment_types
"""
from django.core.management.base import BaseCommand
from appointments.models import AppointmentType


class Command(BaseCommand):
    help = 'Seed default appointment types'

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write("SEEDING DEFAULT APPOINTMENT TYPES")
        self.stdout.write("="*80 + "\n")

        default_types = [
            {
                'name': 'Appointment',
                'default_duration_minutes': 30,
            },
            {
                'name': 'Initial Consultation',
                'default_duration_minutes': 30,
            },
            {
                'name': 'Follow-up',
                'default_duration_minutes': 30,
            },
            {
                'name': 'Fitting',
                'default_duration_minutes': 30,
            },
        ]

        created_count = 0
        skipped_count = 0

        for type_data in default_types:
            existing = AppointmentType.objects.filter(name=type_data['name']).first()
            
            if existing:
                self.stdout.write(f"   ⏭️  Skipped: '{type_data['name']}' (already exists)")
                skipped_count += 1
            else:
                AppointmentType.objects.create(**type_data)
                self.stdout.write(f"   ✅ Created: '{type_data['name']}' ({type_data['default_duration_minutes']} min)")
                created_count += 1

        self.stdout.write("\n" + "="*80)
        self.stdout.write("SUMMARY")
        self.stdout.write("="*80)
        self.stdout.write(f"✅ Created: {created_count}")
        self.stdout.write(f"⏭️  Skipped: {skipped_count}")
        self.stdout.write("="*80 + "\n")

        self.stdout.write(self.style.SUCCESS('✅ Appointment types seeded successfully!'))

