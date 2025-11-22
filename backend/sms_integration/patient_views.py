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
    Handles multiple formats: phones array, legacy mobile/phone objects, and strings
    """
    if not patient:
        return []
    
    phones = []
    contact_json = patient.contact_json or {}
    emergency_json = patient.emergency_json or {}
    
    # NEW FORMAT: Check for phones array first
    phones_array = contact_json.get('phones', [])
    if phones_array and isinstance(phones_array, list):
        for phone_obj in phones_array:
            if isinstance(phone_obj, dict):
                phone_type = phone_obj.get('type', 'phone')
                number = phone_obj.get('number')
                label = phone_obj.get('label', 'Unknown')
                
                if number:
                    # Check for default flag (both 'default' and 'is_default')
                    is_default = phone_obj.get('is_default', False) or phone_obj.get('default', False)
                    
                    phones.append({
                        'value': number,
                        'label': f"{phone_type.title()} - {label}",
                        'is_default': is_default,
                        'type': phone_type
                    })
    
    # LEGACY FORMAT: Extract mobile numbers - handle both formats
    mobile = contact_json.get('mobile')
    if mobile:
        if isinstance(mobile, str):
            # Legacy format: simple string
            phones.append({
                'value': mobile,
                'label': 'Mobile - Home',
                'is_default': len(phones) == 0,  # First mobile is default if no phones array
                'type': 'mobile'
            })
        elif isinstance(mobile, dict):
            # New format: nested objects
            for key, value in mobile.items():
                if isinstance(value, dict) and 'value' in value:
                    # Check for 'default' flag in the object
                    is_default = value.get('default', False)
                    phones.append({
                        'value': value['value'],
                        'label': f"Mobile - {key.title()}",
                        'is_default': is_default,
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
    
    # LEGACY FORMAT: Extract phone numbers - handle both formats
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
                    # Check for 'default' flag in the object
                    is_default = value.get('default', False)
                    phones.append({
                        'value': value['value'],
                        'label': f"Phone - {key.title()}",
                        'is_default': is_default,
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
    Send SMS from patient context
    Body: {
        "phone_number": "+61412345678",
        "phone_label": "Default Mobile",  // optional, for display
        "message": "Your message here",   // optional if template_id provided
        "template_id": "uuid"             // optional, will render template with patient data
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
    appointment_id = request.data.get('appointment_id')  # Optional: for rendering appointment variables
    
    if not phone_number:
        return Response(
            {'error': 'phone_number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Import models
    from .models import SMSMessage, SMSTemplate
    from appointments.models import Appointment
    
    template = None
    rendered_message = message
    appointment = None
    
    # Fetch appointment if provided
    if appointment_id:
        try:
            appointment = Appointment.objects.select_related('clinic', 'clinician', 'appointment_type').get(id=appointment_id)
        except Appointment.DoesNotExist:
            pass  # Continue without appointment data
    
    # If template_id provided, render template with patient data
    if template_id:
        try:
            template = SMSTemplate.objects.get(id=template_id)
            
            # Build context data for template rendering
            context = {
                # Patient data
                'patient_name': patient.get_full_name() or f"{patient.first_name} {patient.last_name}",
                'patient_first_name': patient.first_name or '',
                'patient_last_name': patient.last_name or '',
                'patient_title': patient.title or '',
                'patient_full_name': f"{patient.title or ''} {patient.get_full_name() or ''}".strip(),
                'patient_mobile': phone_number,
                'patient_health_number': patient.health_number or '',
                
                # Clinic data
                'clinic_name': patient.clinic.name if patient.clinic else '',
                'clinic_phone': '',  # TODO: Add clinic phone to model
                'clinic_address': '',  # TODO: Add clinic address to model
                
                # Company data (TODO: Make this configurable)
                'company_name': 'WalkEasy Pedorthics',
                'company_phone': '02 6766 3153',
                'company_email': 'info@walkeasy.com.au',
                'company_website': 'https://www.walkeasy.com.au',
                
                # Appointment data (if appointment provided)
                'appointment_date': appointment.start_time.strftime('%A, %d %B %Y') if appointment else '',
                'appointment_time': appointment.start_time.strftime('%-I:%M %p') if appointment else '',
                'appointment_date_short': appointment.start_time.strftime('%d/%m/%Y') if appointment else '',
                'appointment_duration': f"{appointment.get_duration_minutes()} minutes" if appointment else '',
                'appointment_type': appointment.appointment_type.name if appointment and appointment.appointment_type else '',
                'clinician_name': appointment.clinician.full_name if appointment and appointment.clinician else '',
                'clinician_first_name': appointment.clinician.full_name.split()[0] if appointment and appointment.clinician and appointment.clinician.full_name else '',
                'clinician_title': appointment.clinician.credential if appointment and appointment.clinician else '',
            }
            
            # Render template with context
            rendered_message = template.render(context)
            
        except SMSTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    if not rendered_message:
        return Response(
            {'error': 'message or template_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create SMS message
    sms_message = SMSMessage.objects.create(
        patient=patient,
        appointment=appointment,  # Link to appointment if provided
        phone_number=phone_number,
        message=rendered_message,  # Store the rendered message
        template=template,
        status='pending'
    )
    
    # If this is an appointment reminder, track when it was sent
    if appointment and template and template.category in ['appointment_reminder', 'appointment_confirmation']:
        appointment.sms_reminder_sent_at = timezone.now()
        appointment.save(update_fields=['sms_reminder_sent_at'])
    
    # Try to send via SMS service (if available)
    try:
        from .services import SMSService
        sms_service = SMSService()
        result = sms_service.send_sms(
            phone_number=phone_number,
            message=rendered_message
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


@api_view(['GET'])
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_list(request):
    """
    Get list of all SMS conversations
    Returns patients with SMS history, sorted by most recent message
    Each conversation includes:
    - patient_id, patient_name
    - last_message, last_message_time
    - unread_count
    - phone_number (most recent used)
    """
    from django.db.models import Max, Count, Q, OuterRef, Subquery
    
    # Get all patients with SMS messages (outbound or inbound)
    # Only include patients that exist (not None)
    # Subquery for last outbound message
    last_outbound = SMSMessage.objects.filter(
        patient=OuterRef('pk')
    ).order_by('-created_at').values('created_at')[:1]
    
    # Subquery for last inbound message
    last_inbound = SMSInbound.objects.filter(
        patient=OuterRef('pk')
    ).order_by('-received_at').values('received_at')[:1]
    
    # Get patients with either outbound or inbound messages
    patients_with_messages = Patient.objects.annotate(
        last_outbound_time=Subquery(last_outbound),
        last_inbound_time=Subquery(last_inbound),
    ).filter(
        Q(last_outbound_time__isnull=False) | Q(last_inbound_time__isnull=False)
    )
    
    conversations = []
    
    for patient in patients_with_messages:
        try:
            # Get last outbound message
            last_outbound_msg = SMSMessage.objects.filter(
                patient=patient
            ).order_by('-created_at').first()
            
            # Get last inbound message
            last_inbound_msg = SMSInbound.objects.filter(
                patient=patient
            ).order_by('-received_at').first()
            
            # Determine which is most recent
            last_message = None
            last_message_time = None
            phone_number = None
            
            if last_outbound_msg and last_inbound_msg:
                outbound_time = last_outbound_msg.created_at
                inbound_time = last_inbound_msg.received_at
                
                if outbound_time > inbound_time:
                    last_message = last_outbound_msg.message
                    last_message_time = outbound_time
                    phone_number = last_outbound_msg.phone_number
                else:
                    last_message = last_inbound_msg.message
                    last_message_time = inbound_time
                    phone_number = last_inbound_msg.from_number
            elif last_outbound_msg:
                last_message = last_outbound_msg.message
                last_message_time = last_outbound_msg.created_at
                phone_number = last_outbound_msg.phone_number
            elif last_inbound_msg:
                last_message = last_inbound_msg.message
                last_message_time = last_inbound_msg.received_at
                phone_number = last_inbound_msg.from_number
            
            # Count unread inbound messages
            unread_count = SMSInbound.objects.filter(
                patient=patient,
                is_processed=False
            ).count()
            
            if last_message and last_message_time:
                patient_name = patient.get_full_name() or f"{patient.first_name} {patient.last_name}" if patient.first_name or patient.last_name else "Unknown Patient"
                
                conversations.append({
                    'patient_id': str(patient.id),
                    'patient_name': patient_name,
                    'last_message': last_message[:100],  # Truncate for preview
                    'last_message_time': last_message_time.isoformat(),
                    'unread_count': unread_count,
                    'phone_number': phone_number or '',
                })
        except Exception as e:
            # Skip patients that cause errors
            print(f"Error processing patient {patient.id}: {e}")
            continue
    
    # Sort by most recent message first
    conversations.sort(key=lambda x: x['last_message_time'], reverse=True)
    
    return Response({
        'conversations': conversations,
        'total_count': len(conversations)
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sms_history(request):
    """
    Get full SMS history with filtering options
    Returns all SMS messages (sent and received) with patient, clinic, and status info
    """
    from appointments.models import Appointment
    from clinicians.models import Clinic, Clinician
    import logging
    
    logger = logging.getLogger(__name__)
    history = []
    
    try:
        # Get all outbound messages
        outbound_messages = SMSMessage.objects.select_related(
            'patient', 'appointment', 'appointment__clinic', 'appointment__clinician'
        ).order_by('-created_at')
        
        for msg in outbound_messages:
            try:
                patient_name = "Unknown"
                patient_id = None
                if msg.patient:
                    try:
                        patient_name = msg.patient.get_full_name() if hasattr(msg.patient, 'get_full_name') else f"{msg.patient.first_name or ''} {msg.patient.last_name or ''}".strip()
                        patient_id = str(msg.patient.id)
                    except Exception as e:
                        logger.error(f"Error getting patient name for message {msg.id}: {e}")
                        patient_name = "Unknown"
                
                clinic_name = None
                clinician_name = None
                if msg.appointment:
                    try:
                        if msg.appointment.clinic:
                            clinic_name = msg.appointment.clinic.name
                        if msg.appointment.clinician:
                            clinician_name = msg.appointment.clinician.full_name
                    except Exception as e:
                        logger.error(f"Error getting appointment details for message {msg.id}: {e}")
                
                history.append({
                    'id': str(msg.id),
                    'patient_id': patient_id,
                    'patient_name': patient_name or "Unknown",
                    'phone_number': msg.phone_number or '',
                    'message': msg.message or '',
                    'direction': 'outbound',
                    'status': msg.delivery_status or 'sent',
                    'sent_at': msg.created_at.isoformat(),
                    'clinic_name': clinic_name,
                    'clinician_name': clinician_name,
                    'appointment_id': str(msg.appointment.id) if msg.appointment else None,
                    'template_name': None,
                    'character_count': len(msg.message or ''),
                    'segment_count': (len(msg.message or '') // 160) + 1,
                })
            except Exception as e:
                logger.error(f"Error processing outbound message {msg.id}: {e}")
                continue
        
        # Get all inbound messages
        inbound_messages = SMSInbound.objects.select_related('patient').order_by('-received_at')
        
        for msg in inbound_messages:
            try:
                patient_name = "Unknown"
                patient_id = None
                if msg.patient:
                    try:
                        patient_name = msg.patient.get_full_name() if hasattr(msg.patient, 'get_full_name') else f"{msg.patient.first_name or ''} {msg.patient.last_name or ''}".strip()
                        patient_id = str(msg.patient.id)
                    except Exception as e:
                        logger.error(f"Error getting patient name for inbound message {msg.id}: {e}")
                        patient_name = "Unknown"
                
                history.append({
                    'id': str(msg.id),
                    'patient_id': patient_id,
                    'patient_name': patient_name or "Unknown",
                    'phone_number': msg.from_number or '',
                    'message': msg.message or '',
                    'direction': 'inbound',
                    'status': 'received',
                    'sent_at': msg.received_at.isoformat(),
                    'clinic_name': None,
                    'clinician_name': None,
                    'appointment_id': None,
                    'template_name': None,
                    'character_count': len(msg.message or ''),
                    'segment_count': (len(msg.message or '') // 160) + 1,
                })
            except Exception as e:
                logger.error(f"Error processing inbound message {msg.id}: {e}")
                continue
        
        # Sort all messages by time (most recent first)
        history.sort(key=lambda x: x['sent_at'], reverse=True)
        
        return Response(history, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error in sms_history: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_sms_message(request, message_id):
    """
    Delete an SMS message (soft delete by marking as deleted)
    """
    try:
        # Try to find in outbound messages
        try:
            msg = SMSMessage.objects.get(id=message_id)
            msg.delete()
            return Response({'message': 'Message deleted successfully'}, status=status.HTTP_200_OK)
        except SMSMessage.DoesNotExist:
            pass
        
        # Try to find in inbound messages
        try:
            msg = SMSInbound.objects.get(id=message_id)
            msg.delete()
            return Response({'message': 'Message deleted successfully'}, status=status.HTTP_200_OK)
        except SMSInbound.DoesNotExist:
            pass
        
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_send_sms(request):
    """
    Send SMS to multiple recipients based on filters
    Supports:
    - By clinic (all patients at specific clinic)
    - By appointments (patients with appointments on specific date)
    - All patients (use with caution!)
    """
    import logging
    from clinicians.models import Clinic
    from appointments.models import Appointment
    
    logger = logging.getLogger(__name__)
    
    try:
        # Get filters from request
        recipient_type = request.data.get('recipient_type')  # 'clinic', 'appointments', 'all'
        clinic_id = request.data.get('clinic_id')
        appointment_date = request.data.get('appointment_date')
        message = request.data.get('message')
        template_id = request.data.get('template_id')
        
        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not recipient_type:
            return Response({'error': 'Recipient type is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Build recipient list based on type
        recipients = []
        
        if recipient_type == 'clinic':
            if not clinic_id:
                return Response({'error': 'Clinic ID is required for clinic sending'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get all active patients at this clinic
            patients = Patient.objects.filter(clinic_id=clinic_id, is_active=True)
            recipients = list(patients)
            
        elif recipient_type == 'appointments':
            if not appointment_date:
                return Response({'error': 'Appointment date is required for appointment sending'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get all appointments on this date
            from datetime import datetime
            date_obj = datetime.fromisoformat(appointment_date.replace('Z', '+00:00'))
            appointments = Appointment.objects.filter(
                start_time__date=date_obj.date(),
                patient__isnull=False
            ).select_related('patient')
            
            # Get unique patients (avoid duplicate SMS)
            patient_ids = set()
            for apt in appointments:
                if apt.patient and apt.patient.id not in patient_ids:
                    recipients.append(apt.patient)
                    patient_ids.add(apt.patient.id)
                    
        elif recipient_type == 'all':
            # Get all active patients (use with caution!)
            patients = Patient.objects.filter(is_active=True)
            recipients = list(patients)
            
        else:
            return Response({'error': 'Invalid recipient type'}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(recipients) == 0:
            return Response({'error': 'No recipients found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Send SMS to each recipient
        sent_count = 0
        failed_count = 0
        failed_recipients = []
        
        for patient in recipients:
            try:
                # Get patient's phone numbers
                phones = get_available_phone_numbers(patient)
                
                if len(phones) == 0:
                    failed_count += 1
                    failed_recipients.append({
                        'patient_id': str(patient.id),
                        'patient_name': patient.get_full_name() if hasattr(patient, 'get_full_name') else f"{patient.first_name} {patient.last_name}",
                        'reason': 'No phone number'
                    })
                    continue
                
                # Use default phone or first available
                default_phone = None
                for phone in phones:
                    if phone.get('is_default') or phone.get('default'):
                        default_phone = phone
                        break
                
                if not default_phone:
                    # Fall back to first mobile
                    for phone in phones:
                        if phone.get('type') == 'mobile':
                            default_phone = phone
                            break
                
                if not default_phone:
                    default_phone = phones[0]
                
                phone_number = default_phone.get('value') or default_phone.get('number')
                phone_label = default_phone.get('label', 'Mobile')
                
                # Render template if template_id provided
                final_message = message
                if template_id:
                    from .models import SMSTemplate
                    try:
                        template = SMSTemplate.objects.get(id=template_id)
                        # Build context with patient data
                        context = {
                            'patient_name': patient.get_full_name() if hasattr(patient, 'get_full_name') else f"{patient.first_name} {patient.last_name}",
                            'patient_first_name': patient.first_name or '',
                            'patient_last_name': patient.last_name or '',
                        }
                        
                        # Render template
                        rendered = template.message_template
                        for key, value in context.items():
                            rendered = rendered.replace(f'{{{key}}}', str(value))
                        
                        final_message = rendered
                    except SMSTemplate.DoesNotExist:
                        pass  # Use plain message if template not found
                
                # Send SMS using existing service
                from .services import send_sms
                
                sms_result = send_sms(
                    to_number=phone_number,
                    message=final_message,
                    from_number=None  # Use default
                )
                
                if sms_result.get('success'):
                    # Create SMS record
                    SMSMessage.objects.create(
                        patient=patient,
                        phone_number=phone_number,
                        phone_label=phone_label,
                        message=final_message,
                        delivery_status='sent',
                        created_by=request.user if hasattr(request, 'user') else None
                    )
                    sent_count += 1
                else:
                    failed_count += 1
                    failed_recipients.append({
                        'patient_id': str(patient.id),
                        'patient_name': patient.get_full_name() if hasattr(patient, 'get_full_name') else f"{patient.first_name} {patient.last_name}",
                        'reason': sms_result.get('error', 'Unknown error')
                    })
                    
            except Exception as e:
                logger.error(f"Error sending SMS to patient {patient.id}: {e}")
                failed_count += 1
                failed_recipients.append({
                    'patient_id': str(patient.id),
                    'patient_name': patient.get_full_name() if hasattr(patient, 'get_full_name') else f"{patient.first_name} {patient.last_name}",
                    'reason': str(e)
                })
        
        return Response({
            'success': True,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'total_recipients': len(recipients),
            'failed_recipients': failed_recipients,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in bulk_send_sms: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
