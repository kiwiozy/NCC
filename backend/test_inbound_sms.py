"""
Test script to simulate an inbound SMS webhook
This will create an inbound SMS message for testing the conversation dialog
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from patients.models import Patient
from sms_integration.models import SMSInbound
from django.utils import timezone

# Get the first patient (or you can specify a UUID)
patient = Patient.objects.first()

if not patient:
    print("❌ No patients found in database")
else:
    # Get patient's mobile number
    contact_json = patient.contact_json or {}
    mobile = contact_json.get('mobile')
    
    if isinstance(mobile, dict):
        # Get first mobile number
        for key, value in mobile.items():
            if isinstance(value, dict) and 'value' in value:
                mobile = value['value']
                break
            elif isinstance(value, str):
                mobile = value
                break
    
    if not mobile:
        print(f"❌ Patient {patient.get_full_name()} has no mobile number")
        print(f"   Add a mobile number in communication details")
    else:
        # Normalize phone number (remove +, spaces, etc.)
        from sms_integration.webhook_views import normalize_phone
        mobile_normalized = normalize_phone(mobile)
        
        # Create a test inbound message
        inbound_msg = SMSInbound.objects.create(
            from_number=mobile_normalized or mobile,
            to_number='61400000000',  # Your business number
            message='This is a test reply from the patient!',
            external_message_id='test_' + str(timezone.now().timestamp()),
            received_at=timezone.now(),
            patient=patient,
            is_processed=False,
            notes='Test message created by script'
        )
        
        print(f"✅ Created test inbound SMS")
        print(f"   Patient: {patient.get_full_name()} (ID: {patient.id})")
        print(f"   From: {mobile_normalized or mobile}")
        print(f"   Message: {inbound_msg.message}")
        print(f"   Received: {inbound_msg.received_at}")
        print(f"\n📱 Open the SMS dialog for this patient to see the message!")

