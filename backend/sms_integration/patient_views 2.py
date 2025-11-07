"""
Patient-specific SMS views for conversation thread
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
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
    
    # Serialize messages
    outbound_serializer = SMSMessageSerializer(outbound_messages, many=True)
    inbound_serializer = SMSInboundSerializer(inbound_messages, many=True)
    
    # Convert ReturnList/ReturnDict to regular Python lists/dicts
    # This ensures .get() works correctly
    # DRF serializers return ReturnList/ReturnDict which need explicit conversion
    outbound_data = []
    if outbound_serializer.data:
        for msg in outbound_serializer.data:
            # CRITICAL: Check if msg is actually an SMSMessage instance (shouldn't happen, but be safe)
            from .models import SMSMessage as SMSMessageModel
            if isinstance(msg, SMSMessageModel):
                # This should never happen, but if it does, serialize it properly
                serializer = SMSMessageSerializer(msg)
                msg_dict = dict(serializer.data.items())
                outbound_data.append(msg_dict)
            elif isinstance(msg, dict):
                # Already a dict, use it directly
                outbound_data.append(dict(msg))
            elif hasattr(msg, 'items'):
                # ReturnDict or similar, convert using .items()
                outbound_data.append(dict(msg.items()))
            else:
                # Unexpected type - re-serialize to be safe
                serializer = SMSMessageSerializer(msg)
                outbound_data.append(dict(serializer.data.items()))
    
    inbound_data = []
    if inbound_serializer.data:
        for msg in inbound_serializer.data:
            # CRITICAL: Check if msg is actually an SMSInbound instance (shouldn't happen, but be safe)
            from .models import SMSInbound as SMSInboundModel
            if isinstance(msg, SMSInboundModel):
                # This should never happen, but if it does, serialize it properly
                serializer = SMSInboundSerializer(msg)
                msg_dict = dict(serializer.data.items())
                inbound_data.append(msg_dict)
            elif isinstance(msg, dict):
                # Already a dict, use it directly
                inbound_data.append(dict(msg))
            elif hasattr(msg, 'items'):
                # ReturnDict or similar, convert using .items()
                inbound_data.append(dict(msg.items()))
            else:
                # Unexpected type - re-serialize to be safe
                serializer = SMSInboundSerializer(msg)
                inbound_data.append(dict(serializer.data.items()))
    
    # Add phone_number_label to outbound messages
    # CRITICAL: Ensure all items in outbound_data are dicts, not model instances
    from .models import SMSMessage as SMSMessageModel
    for i, msg in enumerate(outbound_data):
        # Final safety check: if msg is still a model instance, serialize it
        if isinstance(msg, SMSMessageModel):
            serializer = SMSMessageSerializer(msg)
            msg = dict(serializer.data.items())
            # Replace the item in the list
            outbound_data[i] = msg
        
        # Now msg is guaranteed to be a dict
        if not isinstance(msg, dict):
            # Last resort: create a minimal dict
            msg = {
                'id': str(msg.id) if hasattr(msg, 'id') else None,
                'phone_number': msg.phone_number if hasattr(msg, 'phone_number') else None,
                'message': msg.message if hasattr(msg, 'message') else None,
                'status': msg.status if hasattr(msg, 'status') else None,
            }
            outbound_data[i] = msg
        
        # CRITICAL: Ensure msg is a dict before calling .get()
        if not isinstance(msg, dict):
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"ERROR: msg is not a dict! Type: {type(msg)}, Value: {msg}")
            # Last resort: create dict from msg attributes
            if hasattr(msg, 'phone_number'):
                msg = {
                    'id': str(msg.id) if hasattr(msg, 'id') else None,
                    'phone_number': msg.phone_number,
                    'message': msg.message if hasattr(msg, 'message') else None,
                    'status': msg.status if hasattr(msg, 'status') else None,
                    'sent_at': msg.sent_at.isoformat() if hasattr(msg, 'sent_at') and msg.sent_at else None,
                    'created_at': msg.created_at.isoformat() if hasattr(msg, 'created_at') and msg.created_at else None,
                }
                outbound_data[i] = msg
            else:
                # Skip this message if we can't convert it
                continue
        
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
    Send SMS from patient context
    Body: {
        "phone_number": "+61412345678",
        "phone_label": "Default Mobile",  // optional, for display
        "message": "Your message here",
        "template_id": "uuid"  // optional
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
    
    if not phone_number:
        return Response(
            {'error': 'phone_number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not message:
        return Response(
            {'error': 'message is required'},
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
    
    # Create SMS message
    sms_message = SMSMessage.objects.create(
        patient=patient,
        phone_number=phone_number,
        message=message,
        template=template,
        status='pending'
    )
    
    # Try to send via SMS service (if available)
    try:
        from .services import SMSService
        sms_service = SMSService()
        result = sms_service.send_sms(
            phone_number=phone_number,
            message=message
        )
        
        # CRITICAL: Ensure result is a dict before calling .get()
        # If result is not a dict, convert it or create a default dict
        if not isinstance(result, dict):
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"WARNING: SMS service returned non-dict result. Type: {type(result)}. Converting to dict.")
            
            # Check if result is an SMSMessage instance
            from .models import SMSMessage as SMSMessageModel
            if isinstance(result, SMSMessageModel):
                # SMS service returned the SMSMessage instance directly
                # Extract information from the model instance
                # If external_message_id exists, it was sent successfully
                success = bool(result.external_message_id) and result.status == 'sent'
                result = {
                    'success': success,
                    'message_id': result.external_message_id,
                    'sms_count': result.sms_count or 1,
                    'cost': result.cost,
                    'error': result.error_message if not success else None
                }
            elif hasattr(result, 'success'):
                # Result has a success attribute (some other object type)
                result = {
                    'success': result.success,
                    'message_id': getattr(result, 'message_id', None),
                    'sms_count': getattr(result, 'sms_count', 1),
                    'cost': getattr(result, 'cost', None),
                    'error': getattr(result, 'error', 'Unknown error')
                }
            else:
                # Last resort: create a default dict
                logger.error(f"ERROR: Cannot convert result to dict. Type: {type(result)}")
                result = {'success': False, 'error': f'Unexpected result type: {type(result)}'}
        
        if result.get('success'):
            sms_message.status = 'sent'
            sms_message.external_message_id = result.get('message_id')
            sms_message.sent_at = timezone.now()
            sms_message.sms_count = result.get('sms_count', 1)
            sms_message.cost = result.get('cost')
        else:
            sms_message.status = 'failed'
            sms_message.error_message = result.get('error', 'Unknown error')
        
        sms_message.save()
        
    except ImportError:
        # SMSService not available, mark as pending for manual sending
        sms_message.status = 'pending'
        sms_message.error_message = 'SMS service not configured'
        sms_message.save()
    except Exception as e:
        sms_message.status = 'failed'
        # CRITICAL: Ensure we never pass sms_message to str() or any function that might call .get()
        # Convert exception to string safely, avoiding any model instances
        try:
            # Get the error message without including any model instances
            error_str = f"{type(e).__name__}: {str(e)}"
            # If error_str contains an SMSMessage instance reference, simplify it
            if 'SMSMessage' in error_str and 'object has no attribute' in error_str:
                error_str = f"{type(e).__name__}: SMSMessage serialization error"
        except Exception:
            error_str = "Unknown error"
        sms_message.error_message = error_str
        sms_message.save()
    
    # Serialize response
    # Ensure we always return a proper dict, not a model instance
    # CRITICAL: Never pass sms_message (model instance) to code that expects a dict
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        serializer = SMSMessageSerializer(sms_message)
        serializer_data = serializer.data
        
        # CRITICAL: Check if serializer.data is actually a model instance (shouldn't happen)
        from .models import SMSMessage as SMSMessageModel
        if isinstance(serializer_data, SMSMessageModel):
            # This should never happen, but if it does, create dict manually
            logger.warning(f"WARNING: serializer.data is SMSMessage instance! Creating dict manually.")
            response_data = {
                'id': str(sms_message.id),
                'patient': str(sms_message.patient.id) if sms_message.patient else None,
                'phone_number': sms_message.phone_number,
                'message': sms_message.message,
                'status': sms_message.status,
                'created_at': sms_message.created_at.isoformat() if sms_message.created_at else None,
                'sent_at': sms_message.sent_at.isoformat() if sms_message.sent_at else None,
                'error_message': sms_message.error_message,
            }
        elif hasattr(serializer_data, 'items'):
            # ReturnDict - convert using .items()
            response_data = dict(serializer_data.items())
        elif isinstance(serializer_data, dict):
            # Already a dict
            response_data = dict(serializer_data)
        else:
            # Unexpected type - create dict manually
            logger.warning(f"WARNING: serializer.data is unexpected type: {type(serializer_data)}. Creating dict manually.")
            response_data = {
                'id': str(sms_message.id),
                'patient': str(sms_message.patient.id) if sms_message.patient else None,
                'phone_number': sms_message.phone_number,
                'message': sms_message.message,
                'status': sms_message.status,
                'created_at': sms_message.created_at.isoformat() if sms_message.created_at else None,
                'sent_at': sms_message.sent_at.isoformat() if sms_message.sent_at else None,
                'error_message': sms_message.error_message,
            }
        
        # Log the type of response_data after conversion
        if not isinstance(response_data, dict):
            logger.error(f"ERROR: response_data is not a dict after conversion! Type: {type(response_data)}, Value: {response_data}")
    except Exception as e:
        # If serialization fails, create a minimal dict response
        # CRITICAL: Ensure we never pass sms_message to str() or any function that might call .get()
        import traceback
        import sys
        try:
            # Get error message safely without including model instances
            error_type = type(e).__name__
            error_msg = str(e)
            # Get traceback to see where the error occurred
            tb_lines = traceback.format_exception(type(e), e, e.__traceback__)
            # Find the line that mentions .get() or SMSMessage
            error_location = None
            for line in tb_lines:
                if '.get(' in line or 'SMSMessage' in line:
                    error_location = line.strip()
                    break
            
            error_str = f"{error_type}: {error_msg}"
            if error_location:
                error_str += f" (at {error_location})"
            
            # If error_str contains an SMSMessage instance reference, simplify it
            if 'SMSMessage' in error_str and 'object has no attribute' in error_str:
                error_str = f"{error_type}: SMSMessage serialization error"
                if error_location:
                    error_str += f" (at {error_location})"
        except Exception as inner_e:
            error_str = f"Serialization error: {type(inner_e).__name__}"
        
        response_data = {
            'id': str(sms_message.id),
            'patient': str(sms_message.patient.id) if sms_message.patient else None,
            'phone_number': sms_message.phone_number,
            'message': sms_message.message,
            'status': sms_message.status,
            'created_at': sms_message.created_at.isoformat() if sms_message.created_at else None,
            'sent_at': sms_message.sent_at.isoformat() if sms_message.sent_at else None,
            'error_message': sms_message.error_message or error_str,
        }
    
    # CRITICAL: Ensure response_data is a dict before adding phone_number_label
    if not isinstance(response_data, dict):
        logger.error(f"ERROR: response_data is not a dict before adding phone_number_label! Type: {type(response_data)}, Value: {response_data}")
        # Last resort: create dict from sms_message directly
        response_data = {
            'id': str(sms_message.id),
            'patient': str(sms_message.patient.id) if sms_message.patient else None,
            'phone_number': sms_message.phone_number,
            'message': sms_message.message,
            'status': sms_message.status,
            'created_at': sms_message.created_at.isoformat() if sms_message.created_at else None,
            'sent_at': sms_message.sent_at.isoformat() if sms_message.sent_at else None,
            'error_message': sms_message.error_message,
        }
    
    # Final check before adding phone_number_label
    if not isinstance(response_data, dict):
        logger.error(f"ERROR: response_data is still not a dict after conversion! Type: {type(response_data)}, Value: {response_data}")
        # Create minimal dict as absolute last resort
        response_data = {
            'id': str(sms_message.id),
            'phone_number': sms_message.phone_number,
            'message': sms_message.message,
            'status': sms_message.status,
        }
    
    response_data['phone_number_label'] = phone_label or get_phone_number_label(patient, phone_number)
    
    # CRITICAL: Final check - ensure response_data is a dict before returning
    if not isinstance(response_data, dict):
        # This should never happen, but if it does, create a minimal dict
        response_data = {
            'id': str(sms_message.id),
            'phone_number': sms_message.phone_number,
            'message': sms_message.message,
            'status': sms_message.status,
        }
    
    return Response(response_data, status=status.HTTP_201_CREATED)

