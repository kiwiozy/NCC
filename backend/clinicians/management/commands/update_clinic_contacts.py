"""
Django management command to update clinic contact information.
Updates phone and email for all clinics.
"""
from django.core.management.base import BaseCommand
from clinicians.models import Clinic


class Command(BaseCommand):
    help = 'Update phone and email for all clinics'

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("📞 Updating Clinic Contact Information")
        self.stdout.write("=" * 80)
        self.stdout.write("")
        
        # Default contact info
        default_phone = "6766 3153"
        default_email = "info@walkeasy.com.au"
        
        # Get all clinics
        clinics = Clinic.objects.all().order_by('name')
        
        self.stdout.write(f"Found {clinics.count()} clinics to update")
        self.stdout.write("")
        
        updated_count = 0
        
        for clinic in clinics:
            old_phone = clinic.phone
            old_email = clinic.email
            
            # Update phone and email
            clinic.phone = default_phone
            clinic.email = default_email
            clinic.save()
            
            self.stdout.write(f"✅ {clinic.name}")
            if old_phone != default_phone:
                self.stdout.write(f"   Phone: {old_phone or 'None'} → {default_phone}")
            if old_email != default_email:
                self.stdout.write(f"   Email: {old_email or 'None'} → {default_email}")
            
            updated_count += 1
        
        self.stdout.write("")
        self.stdout.write("=" * 80)
        self.stdout.write(f"✅ Updated {updated_count} clinics")
        self.stdout.write("=" * 80)
        self.stdout.write("")
        self.stdout.write("All clinics now have:")
        self.stdout.write(f"  Phone: {default_phone}")
        self.stdout.write(f"  Email: {default_email}")
        self.stdout.write("")

