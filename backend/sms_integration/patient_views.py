"""
Patient-specific SMS views for conversation thread
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Q
from patients.models import Patient
from .models import SMSMessage, SMSInbound
from .serializers import SMSMessageSerializer, SMSInboundSerializer
import re


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


def get_phone_number_label(patient, phone_number):
    """
    Determine the label for a phone number based on patient's contact_json
    Returns label like "Default Mobile", "Mobile - Home", "Mother", etc.
    """
    if not patient or not phone_number:
        return None
    
    normalized_target = normalize_phone(phone_number)
    if not normalized_target:
        return None
    
    contact_json = patient.contact_json or {}
    emergency_json = patient.emergency_json or {}
    
    # Check mobile numbers - handle both formats
    mobile = contact_json.get('mobile')
    if mobile:
        if isinstance(mobile, str):
            # Legacy format: simple string
            if normalize_phone(mobile) == normalized_target:
                return "Default Mobile"
        elif isinstance(mobile, dict):
            # New format: nested objects
            for key, value in mobile.items():
                if isinstance(value, dict) and 'value' in value:
                    if normalize_phone(value['value']) == normalized_target:
                        is_default = value.get('default', False)
                        if is_default:
                            return "Default Mobile"
                        return f"Mobile - {key.title()}"
                elif isinstance(value, str):
                    if normalize_phone(value) == normalized_target:
                        return f"Mobile - {key.title()}"
    
    # Check phone numbers - handle both formats
    phone = contact_json.get('phone')
    if phone:
        if isinstance(phone, str):
            # Legacy format: simple string
            if normalize_phone(phone) == normalized_target:
                return "Phone - Home"
        elif isinstance(phone, dict):
            # New format: nested objects
            for key, value in phone.items():
                if isinstance(value, dict) and 'value' in value:
                    if normalize_phone(value['value']) == normalized_target:
                        is_default = value.get('default', False)
                        if is_default:
                            return "Default Phone"
                        return f"Phone - {key.title()}"
                elif isinstance(value, str):
                    if normalize_phone(value) == normalized_target:
                        return f"Phone - {key.title()}"
    
    # Check emergency contacts
    for contact_type in ['mother', 'father', 'emergency', 'guardian']:
        contact = emergency_json.get(contact_type, {})
        if isinstance(contact, dict):
            mobile = contact.get('mobile') or contact.get('phone')
            if mobile and normalize_phone(mobile) == normalized_target:
                return contact_type.title()
    
    return None


def get_available_phone_numbers(patient):
    """
    Extract all available phone numbers from patient's contact_json and emergency_json
    Returns list of dicts: [{value, label, is_default}, ...]
    Handles both legacy string format and new nested object format
    """
    if not patient:
        return []
    
    phones = []
    contact_json = patient.contact_json or {}
    emergency_json = patient.emergency_json or {}
    
    # Extract mobile numbers - handle both formats
    mobile = contact_json.get('mobile')
    if mobile:
        if isinstance(mobile, str):
            # Legacy format: simple string
            phones.append({
                'value': mobile,
                'label': 'Mobile - Home',
                'is_default': True,  # If it's the only one, it's default
                'type': 'mobile'
            })
        elif isinstance(mobile, dict):
            # New format: nested objects
            for key, value in mobile.items():
                if isinstance(value, dict) and 'value' in value:
                    phones.append({
                        'value': value['value'],
                        'label': f"Mobile - {key.title()}",
                        'is_default': value.get('default', False),
                        'type': 'mobile'
                    })
                elif isinstance(value, str):
                    # Handle case where value is directly a string
                    phones.append({
                        'value': value,
                        'label': f"Mobile - {key.title()}",
                        'is_default': False,
                        'type': 'mobile'
                    })
    
    # Extract phone numbers - handle both formats
    phone = contact_json.get('phone')
    if phone:
        if isinstance(phone, str):
            # Legacy format: simple string
            phones.append({
                'value': phone,
                'label': 'Phone - Home',
                'is_default': False,  # Mobile takes priority
                'type': 'phone'
            })
        elif isinstance(phone, dict):
            # New format: nested objects
            for key, value in phone.items():
                if isinstance(value, dict) and 'value' in value:
                    phones.append({
                        'value': value['value'],
                        'label': f"Phone - {key.title()}",
                        'is_default': value.get('default', False),
                        'type': 'phone'
                    })
                elif isinstance(value, str):
                    # Handle case where value is directly a string
                    phones.append({
                        'value': value,
                        'label': f"Phone - {key.title()}",
                        'is_default': False,
                        'type': 'phone'
                    })
    
    # Extract emergency contact numbers
    for contact_type in ['mother', 'father', 'emergency', 'guardian']:
        contact = emergency_json.get(contact_type, {})
        if isinstance(contact, dict):
            mobile = contact.get('mobile') or contact.get('phone')
            if mobile:
                phones.append({
                    'value': mobile,
                    'label': contact_type.title(),
                    'is_default': False,
                    'type': 'emergency'
                })
    
    # If no default is set but we have phones, make the first mobile the default
    has_default = any(p.get('is_default') for p in phones)
    if not has_default and phones:
        # Find first mobile, or first phone if no mobile
        mobile_phones = [p for p in phones if p['type'] == 'mobile']
        if mobile_phones:
            mobile_phones[0]['is_default'] = True
        elif phones:
            phones[0]['is_default'] = True
    
    # Sort: default first, then by type (mobile > phone > emergency)
    phones.sort(key=lambda x: (
        not x['is_default'],
        {'mobile': 0, 'phone': 1, 'emergency': 2}.get(x['type'], 3)
    ))
    
    return phones


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_conversation(request, patient_id):
    """
    Get unified conversation thread for a patient
    Merges outbound (SMSMessage) and inbound (SMSInbound) messages
    Returns chronological list of all messages
    """
    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return Response(
            {'error': 'Patient not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get all outbound messages
    outbound_messages = SMSMessage.objects.filter(
        patient=patient
    ).order_by('created_at')
    
    # Get all inbound messages
    inbound_messages = SMSInbound.objects.filter(
        patient=patient
    ).order_by('received_at')
    
    # Serialize messages - convert ReturnDict/ReturnList to regular Python dicts/lists
    outbound_serializer = SMSMessageSerializer(outbound_messages, many=True)
    inbound_serializer = SMSInboundSerializer(inbound_messages, many=True)
    
    # Convert to regular Python lists to avoid ReturnDict/ReturnList issues
    outbound_data = [dict(msg.items()) for msg in outbound_serializer.data]
    inbound_data = [dict(msg.items()) for msg in inbound_serializer.data]
    
    # Add phone_number_label to outbound messages
    for msg in outbound_data:
        label = get_phone_number_label(patient, msg.get('phone_number'))
        msg['phone_number_label'] = label
        msg['direction'] = 'outbound'
        msg['timestamp'] = msg.get('sent_at') or msg.get('created_at')
    
    # Add direction and timestamp to inbound messages
    for msg in inbound_data:
        msg['direction'] = 'inbound'
        msg['timestamp'] = msg.get('received_at')
        msg['phone_number_label'] = None  # Inbound doesn't need label
    
    # Merge and sort by timestamp
    all_messages = outbound_data + inbound_data
    all_messages.sort(key=lambda x: x.get('timestamp') or '')
    
    # Get available phone numbers for this patient
    available_phones = get_available_phone_numbers(patient)
    
    # Get default phone number
    default_phone = None
    for phone in available_phones:
        if phone.get('is_default'):
            default_phone = phone
            break
    
    return Response({
        'patient_id': str(patient.id),
        'patient_name': patient.get_full_name(),
        'default_phone': default_phone,
        'available_phones': available_phones,
        'messages': all_messages,
        'total_messages': len(all_messages)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_phone_numbers(request, patient_id):
    """
    Get all available phone numbers for a patient
    """
    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return Response(
            {'error': 'Patient not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    available_phones = get_available_phone_numbers(patient)
    
    return Response({
        'patient_id': str(patient.id),
        'available_phones': available_phones
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def patient_send_sms(request, patient_id):
    """
    Send SMS or MMS from patient context
    Body: {
        "phone_number": "+61412345678",
        "phone_label": "Default Mobile",  // optional, for display
        "message": "Your message here",
        "template_id": "uuid",  // optional
        "media_url": "https://s3.../mms/outbound/uuid.jpg"  // optional, for MMS
    }
    """
    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return Response(
            {'error': 'Patient not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    phone_number = request.data.get('phone_number')
    message = request.data.get('message')
    template_id = request.data.get('template_id')
    phone_label = request.data.get('phone_label')
    media_url = request.data.get('media_url')  # MMS support
    
    if not phone_number:
        return Response(
            {'error': 'phone_number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not message and not media_url:
        return Response(
            {'error': 'message or media_url is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Import SMS service (assuming it exists in views.py)
    from . import views
    
    # Use existing send SMS logic
    # Create a request-like object with the data
    send_data = {
        'phone_number': phone_number,
        'message': message,
        'patient_id': str(patient.id),
        'template_id': template_id
    }
    
    # Import models
    from .models import SMSMessage, SMSTemplate
    
    template = None
    if template_id:
        try:
            template = SMSTemplate.objects.get(id=template_id)
        except SMSTemplate.DoesNotExist:
            pass
    
    # Create SMS/MMS message
    sms_message = SMSMessage.objects.create(
        patient=patient,
        phone_number=phone_number,
        message=message or '',  # Allow empty message for MMS
        template=template,
        status='pending',
        # MMS support
        has_media=bool(media_url),
        media_url=media_url or '',
    )
    
    # Try to send via SMS service (if available)
    try:
        from .services import SMSService
        sms_service = SMSService()
        result = sms_service.send_sms(
            phone_number=phone_number,
            message=message or '',
            media_url=media_url  # MMS support
        )
        
        # Ensure result is a dict (SMSService might return a model instance)
        if isinstance(result, SMSMessage):
            # If result is an SMSMessage instance, convert to dict
            result = {
                'success': result.status == 'sent',
                'message_id': result.external_message_id,
                'sms_count': result.sms_count or 1,
                'cost': result.cost,
                'error': result.error_message
            }
        
        # Now safely access dict properties
        if isinstance(result, dict) and result.get('success'):
            sms_message.status = 'sent'
            sms_message.external_message_id = result.get('message_id')
            sms_message.sent_at = timezone.now()
            sms_message.sms_count = result.get('sms_count', 1)
            sms_message.cost = result.get('cost')
        else:
            sms_message.status = 'failed'
            error_msg = 'Unknown error'
            if isinstance(result, dict):
                error_msg = result.get('error', 'Unknown error')
            sms_message.error_message = error_msg
        
        sms_message.save()
        
    except ImportError:
        # SMSService not available, mark as pending for manual sending
        sms_message.status = 'pending'
        sms_message.error_message = 'SMS service not configured'
        sms_message.save()
    except Exception as e:
        sms_message.status = 'failed'
        sms_message.error_message = str(e)
        sms_message.save()
    
    # Serialize response
    serializer = SMSMessageSerializer(sms_message)
    
    # Convert ReturnDict to regular dict to avoid .get() errors
    response_data = dict(serializer.data.items())
    response_data['phone_number_label'] = phone_label or get_phone_number_label(patient, phone_number)
    
    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_unread_count(request, patient_id):
    """
    Get count of unread SMS messages for a specific patient
    Returns count of inbound messages where is_processed=False
    """
    try:
        # Validate patient exists
        patient = Patient.objects.get(id=patient_id)
        
        # Count unread inbound messages for this patient
        unread_count = SMSInbound.objects.filter(
            patient=patient,
            is_processed=False
        ).count()
        
        return Response({
            'patient_id': str(patient.id),
            'unread_count': unread_count
        }, status=status.HTTP_200_OK)
        
    except Patient.DoesNotExist:
        return Response(
            {'error': 'Patient not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def patient_mark_read(request, patient_id):
    """
    Mark all unread SMS messages as read (is_processed=True) for a specific patient
    """
    try:
        # Validate patient exists
        patient = Patient.objects.get(id=patient_id)
        
        # Update all unread inbound messages for this patient
        updated_count = SMSInbound.objects.filter(
            patient=patient,
            is_processed=False
        ).update(
            is_processed=True,
            processed_at=timezone.now()
        )
        
        return Response({
            'patient_id': str(patient.id),
            'marked_read': updated_count
        }, status=status.HTTP_200_OK)
        
    except Patient.DoesNotExist:
        return Response(
            {'error': 'Patient not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_mms_media(request):
    """
    Upload image for MMS sending
    
    POST /api/sms/upload-media/
    
    Body (multipart/form-data):
        - file: Image file (JPEG, PNG, GIF, HEIC)
    
    Returns:
        {
            'media_url': 'https://s3.../mms/outbound/uuid.jpg',
            'media_type': 'image/jpeg',
            'media_size': 12345,
            'media_filename': 'image.jpg',
            's3_key': 'mms/outbound/uuid.jpg',
            'width': 800,
            'height': 600
        }
    """
    from .mms_service import mms_service
    
    # Get uploaded file
    file = request.FILES.get('file')
    if not file:
        return Response(
            {'error': 'No file provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Upload to S3 (handles HEIC conversion, resizing, validation)
        result = mms_service.upload_media_for_sending(file, file.name)
        
        return Response(result, status=status.HTTP_201_CREATED)
        
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        print(f"❌ MMS upload error: {str(e)}")
        return Response(
            {'error': 'Failed to upload media'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
