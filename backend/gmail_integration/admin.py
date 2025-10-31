"""
Gmail Integration Admin
"""
from django.contrib import admin
from .models import GmailConnection, EmailTemplate, SentEmail


@admin.register(GmailConnection)
class GmailConnectionAdmin(admin.ModelAdmin):
    list_display = [
        'email_address', 'display_name', 'is_primary', 'is_active',
        'emails_sent', 'connected_at', 'expires_at'
    ]
    list_filter = ['is_active', 'is_primary', 'connected_at']
    search_fields = ['email_address', 'display_name']
    readonly_fields = [
        'id', 'email_address', 'display_name', 'access_token', 'refresh_token',
        'expires_at', 'connected_at', 'last_refresh_at', 'last_used_at',
        'emails_sent', 'created_at', 'updated_at'
    ]
    fieldsets = (
        ('Account Info', {
            'fields': ('id', 'email_address', 'display_name')
        }),
        ('Status', {
            'fields': ('is_active', 'is_primary')
        }),
        ('OAuth2 Tokens', {
            'fields': ('access_token', 'refresh_token', 'token_type', 'expires_at', 'scopes'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('emails_sent', 'last_used_at')
        }),
        ('Timestamps', {
            'fields': ('connected_at', 'last_refresh_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'is_active', 'attach_pdf', 'created_at']
    list_filter = ['category', 'is_active', 'attach_pdf', 'created_at']
    search_fields = ['name', 'description', 'subject']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Template Info', {
            'fields': ('id', 'name', 'description', 'category')
        }),
        ('Email Content', {
            'fields': ('subject', 'body_html', 'body_text')
        }),
        ('Settings', {
            'fields': ('is_active', 'attach_pdf')
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SentEmail)
class SentEmailAdmin(admin.ModelAdmin):
    list_display = [
        'subject', 'to_addresses', 'connection', 'status',
        'has_attachments', 'sent_at'
    ]
    list_filter = ['status', 'has_attachments', 'sent_at', 'related_report_type']
    search_fields = [
        'subject', 'to_addresses', 'cc_addresses',
        'related_patient_id', 'gmail_message_id'
    ]
    readonly_fields = [
        'id', 'connection', 'to_addresses', 'cc_addresses', 'bcc_addresses',
        'subject', 'body_preview', 'has_attachments', 'attachment_names',
        'template', 'status', 'error_message', 'gmail_message_id',
        'gmail_thread_id', 'related_patient_id', 'related_appointment_id',
        'related_report_type', 'sent_at', 'sent_by'
    ]
    fieldsets = (
        ('Email Details', {
            'fields': ('id', 'connection', 'subject', 'to_addresses', 'cc_addresses', 'bcc_addresses')
        }),
        ('Content', {
            'fields': ('body_preview', 'has_attachments', 'attachment_names', 'template')
        }),
        ('Status', {
            'fields': ('status', 'error_message')
        }),
        ('Gmail Info', {
            'fields': ('gmail_message_id', 'gmail_thread_id'),
            'classes': ('collapse',)
        }),
        ('Related Records', {
            'fields': ('related_patient_id', 'related_appointment_id', 'related_report_type'),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('sent_at', 'sent_by')
        }),
    )
    
    def has_add_permission(self, request):
        # Emails can only be sent via API, not added manually
        return False
    
    def has_change_permission(self, request, obj=None):
        # Sent emails are read-only
        return False
