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
    Searches in contact_json.phones array, contact_json.mobile, contact_json.phone, and emergency_json
    """
    if not phone_number:
        return None
    
    normalized_target = normalize_phone(phone_number)
    if not normalized_target:
        return None
    
    logger.info(f"[SMS Webhook] Searching for patient with phone: {normalized_target}")
    
    # Search all patients
    patients = Patient.objects.all()
    
    for patient in patients:
        contact_json = patient.contact_json or {}
        emergency_json = patient.emergency_json or {}
        
        # NEW FORMAT: Check phones array first
        phones_array = contact_json.get('phones', [])
        if phones_array and isinstance(phones_array, list):
            for phone_obj in phones_array:
                if isinstance(phone_obj, dict):
                    number = phone_obj.get('number')
                    if number and normalize_phone(number) == normalized_target:
                        logger.info(f"[SMS Webhook] ✓ Found patient via phones array: {patient.get_full_name()}")
                        return patient
        
        # LEGACY FORMAT: Check mobile numbers - handle both string and dict formats
        mobile = contact_json.get('mobile')
        if mobile:
            if isinstance(mobile, str):
                if normalize_phone(mobile) == normalized_target:
                    logger.info(f"[SMS Webhook] ✓ Found patient via mobile string: {patient.get_full_name()}")
                    return patient
            elif isinstance(mobile, dict):
                for key, value in mobile.items():
                    if isinstance(value, dict) and 'value' in value:
                        if normalize_phone(value['value']) == normalized_target:
                            logger.info(f"[SMS Webhook] ✓ Found patient via mobile dict: {patient.get_full_name()}")
                            return patient
                    elif isinstance(value, str):
                        if normalize_phone(value) == normalized_target:
                            logger.info(f"[SMS Webhook] ✓ Found patient via mobile dict value: {patient.get_full_name()}")
                            return patient
        
        # LEGACY FORMAT: Check phone numbers - handle both string and dict formats
        phone = contact_json.get('phone')
        if phone:
            if isinstance(phone, str):
                if normalize_phone(phone) == normalized_target:
                    logger.info(f"[SMS Webhook] ✓ Found patient via phone string: {patient.get_full_name()}")
                    return patient
            elif isinstance(phone, dict):
                for key, value in phone.items():
                    if isinstance(value, dict) and 'value' in value:
                        if normalize_phone(value['value']) == normalized_target:
                            logger.info(f"[SMS Webhook] ✓ Found patient via phone dict: {patient.get_full_name()}")
                            return patient
                    elif isinstance(value, str):
                        if normalize_phone(value) == normalized_target:
                            logger.info(f"[SMS Webhook] ✓ Found patient via phone dict value: {patient.get_full_name()}")
                            return patient
        
        # Check emergency contacts
        for contact_type in ['mother', 'father', 'emergency', 'guardian']:
            contact = emergency_json.get(contact_type, {})
            if isinstance(contact, dict):
                emergency_mobile = contact.get('mobile') or contact.get('phone')
                if emergency_mobile and normalize_phone(emergency_mobile) == normalized_target:
                    logger.info(f"[SMS Webhook] ✓ Found patient via emergency contact: {patient.get_full_name()}")
                    return patient
    
    logger.warning(f"[SMS Webhook] ✗ No patient found for phone: {normalized_target}")
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
            else:
                from_number = request.POST.get('from') or request.POST.get('sourceAddress')
                to_number = request.POST.get('to') or request.POST.get('destinationAddress')
                message_text = request.POST.get('message') or request.POST.get('messageText')
                ref = request.POST.get('ref') or request.POST.get('msgref')
                smsref = request.POST.get('smsref') or request.POST.get('externalId')
        
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
            is_processed=False
        )
        
        # Auto-detect confirmation replies (flexible matching)
        message_upper = message_text.upper().strip()
        message_words = set(message_upper.split())
        
        # Confirmation keywords and patterns
        confirmation_exact = {'YES', 'Y', 'OK', 'CONFIRM', 'CONFIRMED', 'K', 'YEP', 'YUP', 'YEAH', 'SURE'}
        confirmation_phrases = [
            'CONFIRMED APPOINTMENT',
            'WILL BE THERE',
            'SEE YOU THEN',
            'SOUNDS GOOD',
            'ALL GOOD',
            'IM COMING',
            "I'M COMING",
            'ILL BE THERE',
            "I'LL BE THERE",
            'YES PLEASE',
            'OK THANKS',
            'THANK YOU',
            'THANKS',
            'CONFIRM APPOINTMENT',
        ]
        confirmation_emojis = ['👍', '✅', '✓', '☑', '✔']
        
        # Check for confirmation
        is_confirmation = False
        
        # Check exact word matches
        if message_words.intersection(confirmation_exact):
            is_confirmation = True
        
        # Check phrase contains
        for phrase in confirmation_phrases:
            if phrase in message_upper:
                is_confirmation = True
                break
        
        # Check emojis
        for emoji in confirmation_emojis:
            if emoji in message_text:
                is_confirmation = True
                break
        
        if is_confirmation:
            sms_inbound.notes = 'Auto-detected: Confirmation'
            sms_inbound.save()
            
            # STRICT MATCHING: Only confirm the appointment that sent the original reminder
            # We do NOT use fallback matching to prevent confirming wrong appointments
            appointment_to_confirm = None
            
            # ONLY METHOD: Find appointment via linked message ref
            if linked_message and linked_message.appointment:
                appointment_to_confirm = linked_message.appointment
                logger.info(f"[SMS Webhook] ✓ Found appointment via linked message: {appointment_to_confirm.id}")
            else:
                logger.warning(f"[SMS Webhook] ✗ No linked message/appointment found for confirmation. Reply saved but not auto-confirmed.")
            
            # Mark appointment as confirmed (overwrite cancellation if exists)
            if appointment_to_confirm:
                appointment_to_confirm.sms_confirmed = True
                appointment_to_confirm.sms_confirmed_at = timezone.now()
                appointment_to_confirm.sms_confirmation_message = message_text
                # Clear cancellation status (last reply wins)
                appointment_to_confirm.sms_cancelled = False
                appointment_to_confirm.sms_cancelled_at = None
                appointment_to_confirm.sms_cancellation_message = None
                appointment_to_confirm.save(update_fields=[
                    'sms_confirmed', 
                    'sms_confirmed_at', 
                    'sms_confirmation_message',
                    'sms_cancelled',
                    'sms_cancelled_at',
                    'sms_cancellation_message'
                ])
                
                logger.info(f"[SMS Webhook] ✓ Appointment confirmed: {appointment_to_confirm.id} for {patient.get_full_name() if patient else 'Unknown'}")
                sms_inbound.notes += f" - Linked to appointment {appointment_to_confirm.id}"
                sms_inbound.save()
        
        # Detect cancellation requests (flexible matching)
        cancellation_words = {'NO', 'N', 'CANCEL', 'CANT', "CAN'T", 'UNABLE', 'WONT', "WON'T"}
        cancellation_phrases = [
            'NEED TO CANCEL',
            'HAVE TO CANCEL',
            'CANT MAKE IT',
            "CAN'T MAKE IT",
            'UNABLE TO ATTEND',
            'WONT BE THERE',
            "WON'T BE THERE",
            'CANT COME',
            "CAN'T COME",
            'NOT COMING',
            'NEED TO RESCHEDULE',
            'RESCHEDULE',
        ]
        
        is_cancellation = False
        if message_words.intersection(cancellation_words):
            is_cancellation = True
        for phrase in cancellation_phrases:
            if phrase in message_upper:
                is_cancellation = True
                break
        
        if is_cancellation:
            sms_inbound.notes = 'Auto-detected: Cancellation/Reschedule request'
            sms_inbound.save()
            
            # STRICT MATCHING: Only cancel the appointment that sent the original reminder
            # We do NOT use fallback matching to prevent cancelling wrong appointments
            appointment_to_cancel = None
            
            # ONLY METHOD: Find appointment via linked message ref
            if linked_message and linked_message.appointment:
                appointment_to_cancel = linked_message.appointment
                logger.info(f"[SMS Webhook] ✓ Found appointment to cancel via linked message: {appointment_to_cancel.id}")
            else:
                logger.warning(f"[SMS Webhook] ✗ No linked message/appointment found for cancellation. Reply saved but not auto-cancelled.")
            
            # Mark appointment as cancelled (overwrite confirmation if exists)
            if appointment_to_cancel:
                appointment_to_cancel.sms_cancelled = True
                appointment_to_cancel.sms_cancelled_at = timezone.now()
                appointment_to_cancel.sms_cancellation_message = message_text
                # Clear confirmation status (last reply wins)
                appointment_to_cancel.sms_confirmed = False
                appointment_to_cancel.sms_confirmed_at = None
                appointment_to_cancel.sms_confirmation_message = None
                appointment_to_cancel.save(update_fields=[
                    'sms_cancelled', 
                    'sms_cancelled_at', 
                    'sms_cancellation_message',
                    'sms_confirmed',
                    'sms_confirmed_at',
                    'sms_confirmation_message'
                ])
                
                logger.info(f"[SMS Webhook] ✓ Appointment marked as cancelled via SMS: {appointment_to_cancel.id} for {patient.get_full_name() if patient else 'Unknown'}")
                sms_inbound.notes += f" - Linked to appointment {appointment_to_cancel.id}"
                sms_inbound.save()
        
        # Detect opt-out requests (flexible matching)
        elif message_upper in ['STOP', 'UNSUBSCRIBE', 'OPT OUT', 'OPTOUT', 'REMOVE', 'REMOVE ME']:
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

