"""
Management command to set up Home Visit clinics for Craig and Jono.
Usage: python manage.py setup_home_visit_clinics
"""
from django.core.management.base import BaseCommand
from clinicians.models import Clinic


class Command(BaseCommand):
    help = 'Set up Home Visit clinics for Craig and Jono'

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write("SETTING UP HOME VISIT CLINICS")
        self.stdout.write("="*80 + "\n")

        # Create Home Visit - Craig
        craig_clinic, created_craig = Clinic.objects.get_or_create(
            name="Home Visit - Craig",
            defaults={
                'phone': '6766 3153',
                'email': 'info@walkeasy.com.au',
                'color': '#10B981',  # Green
                'sms_reminders_enabled': True,
            }
        )
        
        if created_craig:
            self.stdout.write(f"   ✅ Created: Home Visit - Craig")
            self.stdout.write(f"      Phone: 6766 3153")
            self.stdout.write(f"      Email: info@walkeasy.com.au")
            self.stdout.write(f"      Color: #10B981 (Green)")
        else:
            self.stdout.write(f"   ⏭️  Skipped: Home Visit - Craig (already exists)")

        self.stdout.write()

        # Create Home Visit - Jono
        jono_clinic, created_jono = Clinic.objects.get_or_create(
            name="Home Visit - Jono",
            defaults={
                'phone': '6766 3153',
                'email': 'info@walkeasy.com.au',
                'color': '#8B5CF6',  # Purple
                'sms_reminders_enabled': True,
            }
        )
        
        if created_jono:
            self.stdout.write(f"   ✅ Created: Home Visit - Jono")
            self.stdout.write(f"      Phone: 6766 3153")
            self.stdout.write(f"      Email: info@walkeasy.com.au")
            self.stdout.write(f"      Color: #8B5CF6 (Purple)")
        else:
            self.stdout.write(f"   ⏭️  Skipped: Home Visit - Jono (already exists)")

        self.stdout.write()

        # Check for old generic "Home Visit" clinic
        old_home_visit = Clinic.objects.filter(name="Home Visit").first()
        if old_home_visit:
            # Check if it has appointments
            appointment_count = old_home_visit.appointments.count()
            
            if appointment_count > 0:
                self.stdout.write(f"   ⚠️  Old 'Home Visit' clinic found with {appointment_count} appointments")
                self.stdout.write(f"      Keeping it for historical data")
                self.stdout.write(f"      New appointments should use 'Home Visit - Craig' or 'Home Visit - Jono'")
            else:
                self.stdout.write(f"   🗑️  Old 'Home Visit' clinic found (no appointments) - consider deleting manually")
        
        self.stdout.write("\n" + "="*80)
        self.stdout.write("SUMMARY")
        self.stdout.write("="*80)
        self.stdout.write(f"✅ Home Visit - Craig: {'Created' if created_craig else 'Already exists'}")
        self.stdout.write(f"✅ Home Visit - Jono: {'Created' if created_jono else 'Already exists'}")
        self.stdout.write("="*80 + "\n")

        self.stdout.write(self.style.SUCCESS('✅ Home Visit clinics setup complete!'))

