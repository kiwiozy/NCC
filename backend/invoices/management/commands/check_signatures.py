"""
Django management command to check email signature settings
"""
from django.core.management.base import BaseCommand
from invoices.models import EmailGlobalSettings
from clinicians.models import Clinician


class Command(BaseCommand):
    help = 'Check email signature settings'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('='*80))
        self.stdout.write(self.style.SUCCESS('EMAIL SIGNATURE SETTINGS'))
        self.stdout.write(self.style.SUCCESS('='*80))
        
        settings = EmailGlobalSettings.get_settings()
        
        self.stdout.write(f"\nGlobal Settings:")
        self.stdout.write(f"  use_email_signatures: {settings.use_email_signatures}")
        self.stdout.write(f"  company_signature_email: {settings.company_signature_email}")
        self.stdout.write(f"  clinic_email: {settings.clinic_email}")
        self.stdout.write(f"  company_signature_html set: {bool(settings.company_signature_html)}")
        if settings.company_signature_html:
            self.stdout.write(f"  company_signature_html length: {len(settings.company_signature_html)} chars")
            self.stdout.write(f"  First 100 chars: {settings.company_signature_html[:100]}...")
        
        self.stdout.write(f"\n\nClinician Signatures:")
        clinicians = Clinician.objects.filter(active=True)
        for clinician in clinicians:
            self.stdout.write(f"\n  {clinician.full_name} ({clinician.email or clinician.user.email if clinician.user else 'No email'}):")
            self.stdout.write(f"    Has signature: {bool(clinician.signature_html)}")
            if clinician.signature_html:
                self.stdout.write(f"    Signature length: {len(clinician.signature_html)} chars")
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*80))

