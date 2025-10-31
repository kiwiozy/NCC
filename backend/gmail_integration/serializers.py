"""
Gmail Integration Serializers
"""
from rest_framework import serializers
from .models import GmailConnection, EmailTemplate, SentEmail


class GmailConnectionSerializer(serializers.ModelSerializer):
    """Serializer for Gmail connection"""
    is_token_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = GmailConnection
        fields = [
            'id', 'email_address', 'display_name', 'is_active', 'is_primary',
            'expires_at', 'connected_at', 'last_refresh_at', 'last_used_at',
            'emails_sent', 'is_token_expired', 'scopes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'email_address', 'expires_at', 'connected_at',
            'last_refresh_at', 'last_used_at', 'emails_sent', 'created_at', 'updated_at'
        ]
    
    def get_is_token_expired(self, obj):
        return obj.is_token_expired()


class EmailTemplateSerializer(serializers.ModelSerializer):
    """Serializer for email templates"""
    
    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'name', 'description', 'category', 'subject',
            'body_html', 'body_text', 'is_active', 'attach_pdf',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SentEmailSerializer(serializers.ModelSerializer):
    """Serializer for sent email logs"""
    connection_email = serializers.CharField(source='connection.email_address', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True, allow_null=True)
    
    class Meta:
        model = SentEmail
        fields = [
            'id', 'connection', 'connection_email', 'to_addresses', 'cc_addresses',
            'bcc_addresses', 'subject', 'body_preview', 'has_attachments',
            'attachment_names', 'template', 'template_name', 'status',
            'error_message', 'gmail_message_id', 'gmail_thread_id',
            'related_patient_id', 'related_appointment_id', 'related_report_type',
            'sent_at', 'sent_by'
        ]
        read_only_fields = [
            'id', 'connection_email', 'template_name', 'gmail_message_id',
            'gmail_thread_id', 'sent_at'
        ]


class SendEmailSerializer(serializers.Serializer):
    """Serializer for sending emails"""
    to_emails = serializers.ListField(
        child=serializers.EmailField(),
        help_text="List of recipient email addresses"
    )
    subject = serializers.CharField(max_length=500)
    body_html = serializers.CharField()
    body_text = serializers.CharField(required=False, allow_blank=True)
    cc_emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        allow_empty=True
    )
    bcc_emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        allow_empty=True
    )
    template_id = serializers.UUIDField(required=False, allow_null=True)
    
    # Metadata
    patient_id = serializers.CharField(required=False, allow_blank=True)
    appointment_id = serializers.CharField(required=False, allow_blank=True)
    report_type = serializers.CharField(required=False, allow_blank=True)

