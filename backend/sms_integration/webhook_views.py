"""
SMS Webhook views for receiving inbound messages and delivery receipts
"""
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from patients.models import Patient
from .models import SMSMessage, SMSInbound
import re
import logging
import json

logger = logging.getLogger(__name__)


def normalize_phone(phone):
    """Normalize phone number for comparison (remove spaces, +, etc.)"""
    if not phone:
        return None
    # Remove all non-digit characters except leading +
    normalized = re.sub(r'[^\d+]', '', phone)
    # Remove leading + if present
    if normalized.startswith('+'):
        normalized = normalized[1:]
    # Remove leading 0 and replace with country code if needed
    if normalized.startswith('0'):
        normalized = '61' + normalized[1:]
    return normalized


def find_patient_by_phone(phone_number):
    """
    Find a patient by phone number
    Searches in contact_json.mobile, contact_json.phone, and emergency_json
    """
    if not phone_number:
        return None
    
    normalized_target = normalize_phone(phone_number)
    if not normalized_target:
        return None
    
    # Search all patients
    patients = Patient.objects.all()
    
    for patient in patients:
        contact_json = patient.contact_json or {}
        emergency_json = patient.emergency_json or {}
        
        # Check mobile numbers - handle both string and dict formats
        mobile = contact_json.get('mobile')
        if mobile:
            if isinstance(mobile, str):
                if normalize_phone(mobile) == normalized_target:
                    return patient
            elif isinstance(mobile, dict):
                for key, value in mobile.items():
                    if isinstance(value, dict) and 'value' in value:
                        if normalize_phone(value['value']) == normalized_target:
                            return patient
                    elif isinstance(value, str):
                        if normalize_phone(value) == normalized_target:
                            return patient
        
        # Check phone numbers - handle both string and dict formats
        phone = contact_json.get('phone')
        if phone:
            if isinstance(phone, str):
                if normalize_phone(phone) == normalized_target:
                    return patient
            elif isinstance(phone, dict):
                for key, value in phone.items():
                    if isinstance(value, dict) and 'value' in value:
                        if normalize_phone(value['value']) == normalized_target:
                            return patient
                    elif isinstance(value, str):
                        if normalize_phone(value) == normalized_target:
                            return patient
        
        # Check emergency contacts
        for contact_type in ['mother', 'father', 'emergency', 'guardian']:
            contact = emergency_json.get(contact_type, {})
            if isinstance(contact, dict):
                emergency_mobile = contact.get('mobile') or contact.get('phone')
                if emergency_mobile and normalize_phone(emergency_mobile) == normalized_target:
                    return patient
    
    return None


@csrf_exempt
@require_http_methods(["GET", "POST"])
def sms_inbound(request):
    """
    Webhook endpoint for inbound SMS messages from SMS Broadcast
    
    Expected parameters (GET or POST):
    - from: Sender phone number
    - to: Our number that received the message
    - message: Message content
    - ref: Optional reference from original outbound message (UUID)
    - smsref: SMS Broadcast message ID
    - secret: Optional secret token for security
    - media_url: Optional URL to MMS media (image)
    - media_type: Optional MIME type (image/jpeg, image/png)
    """
    print(f"[SMS Webhook] ===== WEBHOOK RECEIVED =====")
    print(f"[SMS Webhook] Method: {request.method}")
    print(f"[SMS Webhook] Content-Type: {request.content_type}")
    print(f"[SMS Webhook] Body: {request.body[:500]}")  # First 500 chars
    
    try:
        # Get parameters from GET or POST
        if request.method == 'GET':
            from_number = request.GET.get('from') or request.GET.get('sourceAddress')
            to_number = request.GET.get('to') or request.GET.get('destinationAddress')
            message_text = request.GET.get('message') or request.GET.get('messageText')
            ref = request.GET.get('ref') or request.GET.get('msgref')
            smsref = request.GET.get('smsref') or request.GET.get('externalId')
            media_url = request.GET.get('media_url') or request.GET.get('mediaUrl')  # MMS
            media_type = request.GET.get('media_type') or request.GET.get('mediaType')  # MMS
        else:
            # POST - try JSON body first, then form data
            data = None
            if request.content_type == 'application/json':
                try:
                    data = json.loads(request.body.decode('utf-8'))
                except (ValueError, UnicodeDecodeError) as e:
                    logger.warning(f"[SMS Webhook] Failed to parse JSON body: {e}")
            
            if data:
                from_number = data.get('from') or data.get('sourceAddress')
                to_number = data.get('to') or data.get('destinationAddress')
                message_text = data.get('message') or data.get('messageText')
                ref = data.get('ref') or data.get('msgref')
                smsref = data.get('smsref') or data.get('externalId')
                media_url = data.get('media_url') or data.get('mediaUrl')  # MMS
                media_type = data.get('media_type') or data.get('mediaType')  # MMS
            else:
                from_number = request.POST.get('from') or request.POST.get('sourceAddress')
                to_number = request.POST.get('to') or request.POST.get('destinationAddress')
                message_text = request.POST.get('message') or request.POST.get('messageText')
                ref = request.POST.get('ref') or request.POST.get('msgref')
                smsref = request.POST.get('smsref') or request.POST.get('externalId')
                media_url = request.POST.get('media_url') or request.POST.get('mediaUrl')  # MMS
                media_type = request.POST.get('media_type') or request.POST.get('mediaType')  # MMS
        
        # Validate required fields
        if not from_number or not message_text:
            logger.warning(f"[SMS Webhook] Missing required fields - from: {from_number}, message: {bool(message_text)}")
            return HttpResponse('OK', status=200)  # Always return OK to prevent retries
        
        # Normalize phone numbers
        from_number_normalized = normalize_phone(from_number)
        to_number_normalized = normalize_phone(to_number) if to_number else None
        
        logger.info(f"[SMS Webhook] Inbound message - from={from_number_normalized}, to={to_number_normalized}, message_len={len(message_text)}")
        
        # Find patient by phone number
        patient = find_patient_by_phone(from_number)
        
        # Link to original outbound message if ref provided
        linked_message = None
        if ref:
            try:
                # Validate that ref is a UUID before querying
                import uuid
                uuid.UUID(ref)
                linked_message = SMSMessage.objects.get(id=ref)
                if not patient and linked_message.patient:
                    # Use patient from linked message if not found by phone
                    patient = linked_message.patient
            except (SMSMessage.DoesNotExist, ValueError):
                print(f"[SMS Webhook] Linked message not found or invalid UUID: {ref}")
        
        # Create SMSInbound record
        sms_inbound = SMSInbound.objects.create(
            from_number=from_number_normalized or from_number,
            to_number=to_number_normalized or to_number or '',
            message=message_text,
            external_message_id=smsref or '',
            received_at=timezone.now(),
            patient=patient,
            is_processed=False,
            # MMS support
            has_media=bool(media_url),
            media_url=media_url or '',
            media_type=media_type or '',
            download_status='pending' if media_url else ''
        )
        
        # Download MMS media in background (if present)
        if media_url:
            print(f"[SMS Webhook] MMS detected - media_url: {media_url}")
            # Start background download
            import threading
            from .mms_service import mms_service
            
            def download_media():
                try:
                    result = mms_service.download_inbound_media(media_url, str(sms_inbound.id))
                    sms_inbound.media_downloaded_url = result['media_downloaded_url']
                    sms_inbound.s3_key = result['s3_key']
                    sms_inbound.media_size = result['media_size']
                    sms_inbound.download_status = 'downloaded'
                    sms_inbound.save()
                    print(f"[SMS Webhook] ✓ MMS media downloaded: {result['s3_key']}")
                except Exception as e:
                    sms_inbound.download_status = 'failed'
                    sms_inbound.save()
                    print(f"[SMS Webhook] ✗ MMS media download failed: {str(e)}")
            
            thread = threading.Thread(target=download_media)
            thread.start()
        
        # Auto-detect simple replies
        message_upper = message_text.upper().strip()
        if message_upper in ['YES', 'Y', 'OK', 'CONFIRM']:
            sms_inbound.notes = 'Auto-detected: Confirmation'
        elif message_upper in ['NO', 'N', 'CANCEL']:
            sms_inbound.notes = 'Auto-detected: Cancellation'
        elif message_upper in ['STOP', 'UNSUBSCRIBE', 'OPT OUT']:
            sms_inbound.notes = 'Auto-detected: Opt-out request'
            sms_inbound.save()
        
        if patient:
            logger.info(f"[SMS Webhook] ✓ Matched to patient: {patient.get_full_name()} (ID: {patient.id})")
        else:
            logger.info(f"[SMS Webhook] ✓ Message saved (no patient match) - from: {from_number_normalized}")
        
        return HttpResponse('OK', status=200)
        
    except Exception as e:
        logger.error(f"[SMS Webhook] Error processing inbound message: {str(e)}", exc_info=True)
        # Always return OK to prevent SMS Broadcast from retrying
        return HttpResponse('OK', status=200)

