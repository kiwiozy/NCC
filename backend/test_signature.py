import os
import sys
import django

sys.path.insert(0, '/Users/craig/Documents/nexus-core-clinic/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from clinicians.models import Clinician

# Test 1: info@walkeasy.com.au (should be None)
from_email1 = "info@walkeasy.com.au"
clinician1 = None
if from_email1 and from_email1.lower() != 'info@walkeasy.com.au':
    clinician1 = Clinician.objects.filter(user__email__iexact=from_email1, active=True).first()

print(f"Test 1: from_email={from_email1}")
print(f"  Result: clinician={clinician1}")
print()

# Test 2: craig@walkeasy.com.au (should find Craig)
from_email2 = "craig@walkeasy.com.au"
clinician2 = None
if from_email2 and from_email2.lower() != 'info@walkeasy.com.au':
    clinician2 = Clinician.objects.filter(user__email__iexact=from_email2, active=True).first()

print(f"Test 2: from_email={from_email2}")
print(f"  Result: clinician={clinician2}")
