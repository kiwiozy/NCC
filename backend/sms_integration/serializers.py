"""
SMS Integration Serializers
"""
from rest_framework import serializers
from .models import SMSMessage, SMSTemplate, SMSInbound


class SMSTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMSTemplate
        fields = [
            'id',
            'name',
            'description',
            'message_template',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SMSMessageSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    template_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SMSMessage
        fields = [
            'id',
            'patient',
            'patient_name',
            'appointment',
            'template',
            'template_name',
            'phone_number',
            'message',
            'status',
            'external_message_id',
            'created_at',
            'scheduled_at',
            'sent_at',
            'delivered_at',
            'error_message',
            'retry_count',
            'sms_count',
            'cost',
            'notes'
        ]
        read_only_fields = [
            'id',
            'external_message_id',
            'created_at',
            'sent_at',
            'delivered_at',
            'sms_count',
            'cost'
        ]
    
    def get_patient_name(self, obj):
        return obj.patient.get_full_name() if obj.patient else None
    
    def get_template_name(self, obj):
        return obj.template.name if obj.template else None


class SMSInboundSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SMSInbound
        fields = [
            'id',
            'from_number',
            'to_number',
            'message',
            'external_message_id',
            'received_at',
            'patient',
            'patient_name',
            'is_processed',
            'processed_at',
            'processed_by',
            'notes'
        ]
        read_only_fields = [
            'id',
            'external_message_id',
            'received_at'
        ]
    
    def get_patient_name(self, obj):
        return obj.patient.get_full_name() if obj.patient else None


class SendSMSSerializer(serializers.Serializer):
    """Serializer for sending SMS"""
    phone_number = serializers.CharField(max_length=20, required=True)
    message = serializers.CharField(required=True)
    patient_id = serializers.UUIDField(required=False, allow_null=True)
    appointment_id = serializers.UUIDField(required=False, allow_null=True)
    template_id = serializers.UUIDField(required=False, allow_null=True)


class SendFromTemplateSerializer(serializers.Serializer):
    """Serializer for sending SMS from template"""
    template_name = serializers.CharField(required=True)
    phone_number = serializers.CharField(max_length=20, required=True)
    context = serializers.DictField(required=True)
    patient_id = serializers.UUIDField(required=False, allow_null=True)
    appointment_id = serializers.UUIDField(required=False, allow_null=True)

