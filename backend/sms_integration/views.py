"""
SMS Integration API Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.http import JsonResponse

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
    filterset_fields = ['is_active']


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
    filterset_fields = ['is_processed', 'patient']


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
