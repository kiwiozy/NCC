"""
Email Template Serializers
"""
from rest_framework import serializers
from .models import EmailTemplate, EmailGlobalSettings


class EmailTemplateSerializer(serializers.ModelSerializer):
    """Serializer for EmailTemplate model"""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailTemplate
        fields = [
            'id',
            'name',
            'category',
            'category_display',
            'description',
            'subject',
            'body_html',
            'body_text',
            'header_color',
            'is_default',
            'is_active',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'category_display', 'created_by_name']
    
    def get_created_by_name(self, obj):
        """Get the name of the user who created this template"""
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None


class EmailTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing templates"""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = EmailTemplate
        fields = [
            'id',
            'name',
            'category',
            'category_display',
            'description',
            'subject',
            'is_default',
            'is_active',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at', 'category_display']


class EmailGlobalSettingsSerializer(serializers.ModelSerializer):
    """Serializer for EmailGlobalSettings model"""
    
    class Meta:
        model = EmailGlobalSettings
        fields = [
            'id',
            # Sender Settings
            'default_gmail_account',
            'reply_to_email',
            'bcc_all_to',
            # Clinic Contact Info
            'clinic_name',
            'clinic_phone',
            'clinic_email',
            'clinic_website',
            'clinic_address',
            'clinic_abn',
            'clinic_acn',
            # Payment Details
            'bank_account_name',
            'bank_bsb',
            'bank_account_number',
            'payment_instructions_text',
            'payment_reference_format',
            # Legal
            'confidentiality_notice',
            # Email Signature
            'company_signature_html',
            'company_signature_email',
            'use_email_signatures',
            # Provider Registration Numbers
            'provider_registration_number',
            'dva_number',
            'enable_number',
            # Appearance
            'header_color',
            'default_email_width',
            'show_logo',
            'show_contact_info',
            'show_payment_instructions',
            'show_bank_details',
            'show_confidentiality',
            # Auto-Send Rules
            'auto_send_invoices',
            'auto_send_receipts',
            'auto_send_quotes',
            'send_payment_reminders',
            'send_overdue_notices',
            'reminder_days_before',
            'overdue_days_after',
            'require_confirmation',
            'business_hours_only',
            # Timestamps
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']

