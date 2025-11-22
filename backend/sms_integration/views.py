"""
SMS Integration API Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import SMSMessage, SMSTemplate, SMSInbound
from .serializers import (
    SMSMessageSerializer,
    SMSTemplateSerializer,
    SMSInboundSerializer,
    SendSMSSerializer,
    SendFromTemplateSerializer
)
from .services import sms_service


class SMSTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for SMS Templates
    """
    queryset = SMSTemplate.objects.all()
    serializer_class = SMSTemplateSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active', 'category']
    
    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """
        Preview template with sample data
        POST /api/sms/templates/{id}/preview/
        Body: {
            "patient_name": "John Smith",
            "appointment_date": "Monday, November 20",
            ...
        }
        """
        template = self.get_object()
        context = request.data
        
        try:
            rendered_message = template.render(context)
            character_count = len(rendered_message)
            
            # Calculate SMS segments
            if character_count <= 160:
                sms_segments = 1
            else:
                sms_segments = 1 + ((character_count - 160) // 153) + (1 if (character_count - 160) % 153 > 0 else 0)
            
            return Response({
                'rendered_message': rendered_message,
                'character_count': character_count,
                'sms_segment_count': sms_segments,
                'variables_used': template.get_variables(),
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class SMSMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for SMS Messages
    """
    queryset = SMSMessage.objects.select_related('patient', 'appointment', 'template').all()
    serializer_class = SMSMessageSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'patient', 'appointment']
    
    @action(detail=False, methods=['post'])
    def send(self, request):
        """
        Send an SMS message
        POST /api/sms/messages/send/
        Body: {
            "phone_number": "+61412345678",
            "message": "Hello World",
            "patient_id": "uuid" (optional),
            "appointment_id": "uuid" (optional)
        }
        """
        serializer = SendSMSSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            sms_message = sms_service.send_sms(
                phone_number=serializer.validated_data['phone_number'],
                message=serializer.validated_data['message'],
                patient_id=serializer.validated_data.get('patient_id'),
                appointment_id=serializer.validated_data.get('appointment_id')
            )
            
            return Response(
                SMSMessageSerializer(sms_message).data,
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def send_from_template(self, request):
        """
        Send SMS using a template
        POST /api/sms/messages/send_from_template/
        Body: {
            "template_name": "appointment_reminder",
            "phone_number": "+61412345678",
            "context": {
                "patient_name": "John",
                "appointment_date": "Monday, Nov 1",
                "appointment_time": "10:00 AM",
                "clinic_name": "Tamworth",
                "clinician_name": "Dr. Smith"
            },
            "patient_id": "uuid" (optional),
            "appointment_id": "uuid" (optional)
        }
        """
        serializer = SendFromTemplateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            sms_message = sms_service.send_from_template(
                template_name=serializer.validated_data['template_name'],
                phone_number=serializer.validated_data['phone_number'],
                context=serializer.validated_data['context'],
                patient_id=serializer.validated_data.get('patient_id'),
                appointment_id=serializer.validated_data.get('appointment_id')
            )
            
            return Response(
                SMSMessageSerializer(sms_message).data,
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class SMSInboundViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Inbound SMS Messages
    """
    queryset = SMSInbound.objects.select_related('patient').all()
    serializer_class = SMSInboundSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_processed', 'patient', 'from_number', 'to_number']


@api_view(['GET'])
def sms_balance(request):
    """
    Get SMS credit balance
    GET /api/sms/balance/
    """
    try:
        balance_info = sms_service.get_balance()
        return JsonResponse(balance_info)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@api_view(['POST'])
def send_appointment_reminder(request, appointment_id):
    """
    Send appointment reminder SMS
    POST /api/sms/appointment/{appointment_id}/reminder/
    """
    try:
        sms_message = sms_service.send_appointment_reminder(appointment_id)
        return JsonResponse(
            SMSMessageSerializer(sms_message).data,
            status=201
        )
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=400)


@csrf_exempt
@api_view(['GET', 'POST'])
def sms_delivery_receipt(request):
    """
    Webhook endpoint for SMS Broadcast delivery receipts (DLR)
    
    SMS Broadcast calls this when a message is delivered/failed:
    GET /api/sms/webhook/dlr?to=614...&ref={uuid}&smsref={message_id}&status=Delivered
    
    Security: Validates webhook secret token if configured
    """
    from django.utils import timezone
    from django.http import HttpResponse, HttpResponseForbidden
    import os
    
    # Optional webhook secret for security (set in .env)
    webhook_secret = os.getenv('SMSB_WEBHOOK_SECRET', '')
    if webhook_secret:
        provided_secret = request.GET.get('secret') or request.headers.get('X-Webhook-Secret', '')
        if provided_secret != webhook_secret:
            print(f"[SMS Webhook] ✗ Unauthorized DLR request - invalid secret")
            return HttpResponseForbidden('Unauthorized')
    
    smsref = request.GET.get('smsref')
    ref = request.GET.get('ref')  # Our UUID
    status = request.GET.get('status', '').lower()
    to = request.GET.get('to', '')
    
    print(f"[SMS Webhook] DLR received - smsref={smsref}, ref={ref}, status={status}, to={to}")
    
    try:
        # Try to find message by external_message_id first (most reliable)
        if smsref:
            message = SMSMessage.objects.filter(external_message_id=smsref).first()
        
        # Fallback to our UUID if external_message_id not found
        if not message and ref:
            try:
                import uuid
                message = SMSMessage.objects.get(id=uuid.UUID(ref))
            except (SMSMessage.DoesNotExist, ValueError):
                message = None
        
        if not message:
            print(f"[SMS Webhook] ⚠️ Message not found - smsref={smsref}, ref={ref}")
            return HttpResponse('OK')  # Still return OK to SMS Broadcast
        
        # Update message status based on delivery receipt
        if status == 'delivered':
            message.status = 'delivered'
            message.delivered_at = timezone.now()
            print(f"[SMS Webhook] ✓ Message {message.id} delivered to {message.phone_number}")
        elif status in ['failed', 'rejected', 'undelivered']:
            message.status = 'failed'
            message.error_message = f"Delivery failed: {status}"
            print(f"[SMS Webhook] ✗ Message {message.id} failed: {status}")
        else:
            # Unknown status, log but don't change status
            print(f"[SMS Webhook] ⚠️ Unknown status: {status}")
        
        message.save(update_fields=['status', 'delivered_at', 'error_message'])
        
    except Exception as e:
        print(f"[SMS Webhook] Error processing DLR: {str(e)}")
        # Still return OK to prevent SMS Broadcast from retrying
    
    return HttpResponse('OK')


@csrf_exempt
@api_view(['GET', 'POST'])
def sms_inbound(request):
    """
    Webhook endpoint for inbound SMS messages from SMS Broadcast
    
    SMS Broadcast calls this when we receive a message:
    GET /api/sms/webhook/inbound?to=614...&from=614...&message=YES&ref={uuid}
    
    Security: Validates webhook secret token if configured
    """
    from django.utils import timezone
    from django.http import HttpResponse, HttpResponseForbidden
    from patients.models import Patient
    import os
    
    # Optional webhook secret for security (set in .env)
    webhook_secret = os.getenv('SMSB_WEBHOOK_SECRET', '')
    if webhook_secret:
        provided_secret = request.GET.get('secret') or request.headers.get('X-Webhook-Secret', '')
        if provided_secret != webhook_secret:
            print(f"[SMS Webhook] ✗ Unauthorized inbound request - invalid secret")
            return HttpResponseForbidden('Unauthorized')
    
    # Handle both GET (URL params) and POST (JSON body or form data)
    from urllib.parse import unquote
    
    if request.method == 'POST':
        # Try JSON body first
        try:
            import json
            body_data = json.loads(request.body.decode('utf-8'))
            data_source = body_data
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Fall back to form data
            data_source = request.POST
    else:
        # GET request - use query parameters
        data_source = request.GET
    
    # Extract data from appropriate source (SMS Broadcast sends URL-encoded values even in JSON)
    to_number = unquote(str(data_source.get('to', '')))
    from_number = unquote(str(data_source.get('from', '')))
    message_text = unquote(str(data_source.get('message', '')))
    ref = unquote(str(data_source.get('ref', '')))  # Optional reference from original message
    msgref = unquote(str(data_source.get('msgref') or data_source.get('smsref', '')))  # Provider message ref
    
    # Clean up phone numbers (remove any parentheses or other characters)
    from_number = from_number.lstrip('+()').replace(' ', '').replace('-', '')
    to_number = to_number.lstrip('+()').replace(' ', '').replace('-', '')
    
    # Log ALL webhook calls for debugging
    print(f"\n{'='*60}")
    print(f"[SMS Webhook] Inbound webhook called")
    print(f"  Method: {request.method}")
    print(f"  Query Params: {dict(request.GET)}")
    if request.method == 'POST':
        if request.body:
            try:
                import json
                body_data = json.loads(request.body.decode('utf-8'))
                print(f"  POST Body (JSON): {body_data}")
            except (json.JSONDecodeError, UnicodeDecodeError):
                print(f"  POST Body (form/raw): {request.body.decode('utf-8', errors='ignore')[:200]}")
                print(f"  POST Data (form): {dict(request.POST)}")
        else:
            print(f"  POST Data (form): {dict(request.POST)}")
    print(f"{'='*60}\n")
    
    # Validate required fields - don't process empty webhooks
    if not from_number or not message_text:
        print(f"[SMS Webhook] ⚠️ Invalid inbound request - missing required fields: from={from_number}, message={message_text[:50]}")
        print(f"[SMS Webhook] All params: {dict(request.GET)}")
        return HttpResponse('OK')  # Still return OK to prevent retries, but don't save
    
    print(f"[SMS Webhook] ✓ Valid inbound message - from={from_number}, to={to_number}, message={message_text[:50]}...")
    
    try:
        # Format phone number for matching (remove + if present)
        formatted_from = from_number.lstrip('+')
        
        # Try to find associated outbound message if ref provided
        outbound_message = None
        if ref:
            try:
                import uuid
                outbound_message = SMSMessage.objects.get(id=uuid.UUID(ref))
            except (SMSMessage.DoesNotExist, ValueError):
                pass
        
        # Try to match to patient by phone number
        patient = None
        if formatted_from:
            # Normalize phone number formats for searching
            search_variants = [
                formatted_from,  # 61412345678
                formatted_from.lstrip('+'),  # Remove + if present
            ]
            
            # Add variants with/without leading 0
            if formatted_from.startswith('61'):
                search_variants.append('0' + formatted_from[2:])  # 0412345678
            elif not formatted_from.startswith('0') and len(formatted_from) >= 9:
                search_variants.append('0' + formatted_from)  # Add 0 prefix
            
            # Try to find patient by mobile number in contact_json
            try:
                from django.db.models import Q
                
                # Search in contact_json.mobile field
                queries = Q()
                for variant in search_variants:
                    queries |= Q(contact_json__mobile=variant)
                    queries |= Q(contact_json__mobile__icontains=variant)
                
                patient = Patient.objects.filter(queries).first()
                
                if patient:
                    print(f"[SMS Webhook] ✓ Matched to patient: {patient.get_full_name()}")
            except Exception as e:
                print(f"[SMS Webhook] ⚠️ Error finding patient: {str(e)}")
        
        # Create inbound message record
        inbound = SMSInbound.objects.create(
            from_number=formatted_from,
            to_number=to_number,
            message=message_text,
            external_message_id=msgref or ref or '',
            patient=patient,
            received_at=timezone.now()
        )
        
        print(f"[SMS Webhook] ✓ Inbound message saved: {inbound.id}")
        
        # Auto-process simple replies (YES/NO/STOP)
        message_lower = message_text.strip().lower()
        if message_lower in ['yes', 'y', 'confirm']:
            inbound.notes = "Auto-detected: Confirmation reply"
        elif message_lower in ['no', 'n', 'cancel']:
            inbound.notes = "Auto-detected: Cancellation reply"
        elif message_lower == 'stop':
            inbound.notes = "Auto-detected: Opt-out request"
            # TODO: Add opt-out logic here
        
        inbound.save()
        
    except Exception as e:
        print(f"[SMS Webhook] Error processing inbound message: {str(e)}")
        # Still return OK to prevent SMS Broadcast from retrying
    
    return HttpResponse('OK')


# New endpoints for SMS Notification Widget
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_unread_count(request):
    """
    Get total count of unread SMS messages across all patients
    Returns count + latest message ID (for change detection)
    """
    try:
        # Count all unread inbound messages
        unread_count = SMSInbound.objects.filter(is_processed=False).count()
        
        # Get latest message ID
        latest_message = SMSInbound.objects.order_by('-received_at').first()
        latest_id = str(latest_message.id) if latest_message else None
        
        return Response({
            'unread_count': unread_count,
            'latest_message_id': latest_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_inbound_message(request, message_id):
    """
    Get details of a single inbound SMS message
    Includes full patient details for notification display
    """
    try:
        message = SMSInbound.objects.get(id=message_id)
        serializer = SMSInboundSerializer(message)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except SMSInbound.DoesNotExist:
        return Response(
            {'error': 'Message not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
