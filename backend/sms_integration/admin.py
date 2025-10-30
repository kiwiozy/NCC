"""
SMS Integration Admin
Django admin interface for managing SMS messages and templates
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import SMSTemplate, SMSMessage, SMSInbound


@admin.register(SMSTemplate)
class SMSTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description', 'message_template']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = [
        ('Template Information', {
            'fields': ['id', 'name', 'description', 'is_active']
        }),
        ('Message Template', {
            'fields': ['message_template'],
            'description': 'Available placeholders: {patient_name}, {appointment_date}, {appointment_time}, {clinic_name}, {clinician_name}'
        }),
        ('Audit', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]


@admin.register(SMSMessage)
class SMSMessageAdmin(admin.ModelAdmin):
    list_display = [
        'phone_number',
        'patient_link',
        'status_badge',
        'sms_count',
        'sent_at',
        'created_at'
    ]
    list_filter = ['status', 'created_at', 'sent_at']
    search_fields = ['phone_number', 'message', 'patient__first_name', 'patient__last_name']
    readonly_fields = [
        'id',
        'external_message_id',
        'created_at',
        'sent_at',
        'delivered_at',
        'sms_count'
    ]
    date_hierarchy = 'created_at'
    
    fieldsets = [
        ('Message Details', {
            'fields': ['id', 'patient', 'appointment', 'template', 'phone_number', 'message']
        }),
        ('Status', {
            'fields': ['status', 'external_message_id', 'error_message', 'retry_count']
        }),
        ('Timing', {
            'fields': ['created_at', 'scheduled_at', 'sent_at', 'delivered_at']
        }),
        ('Costs', {
            'fields': ['sms_count', 'cost'],
            'classes': ['collapse']
        }),
        ('Notes', {
            'fields': ['notes'],
            'classes': ['collapse']
        }),
    ]
    
    def patient_link(self, obj):
        if obj.patient:
            return format_html(
                '<a href="/admin/patients/patient/{}/change/">{}</a>',
                obj.patient.id,
                obj.patient.get_full_name()
            )
        return '-'
    patient_link.short_description = 'Patient'
    
    def status_badge(self, obj):
        colors = {
            'pending': '#ffc107',
            'sent': '#17a2b8',
            'delivered': '#28a745',
            'failed': '#dc3545',
            'cancelled': '#6c757d',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'


@admin.register(SMSInbound)
class SMSInboundAdmin(admin.ModelAdmin):
    list_display = [
        'from_number',
        'patient_link',
        'message_preview',
        'processed_badge',
        'received_at'
    ]
    list_filter = ['is_processed', 'received_at']
    search_fields = ['from_number', 'message', 'patient__first_name', 'patient__last_name']
    readonly_fields = ['id', 'external_message_id', 'received_at', 'from_number', 'to_number', 'message']
    date_hierarchy = 'received_at'
    
    fieldsets = [
        ('Message Details', {
            'fields': ['id', 'from_number', 'to_number', 'message', 'external_message_id', 'received_at']
        }),
        ('Patient Matching', {
            'fields': ['patient']
        }),
        ('Processing', {
            'fields': ['is_processed', 'processed_at', 'processed_by', 'notes']
        }),
    ]
    
    def patient_link(self, obj):
        if obj.patient:
            return format_html(
                '<a href="/admin/patients/patient/{}/change/">{}</a>',
                obj.patient.id,
                obj.patient.get_full_name()
            )
        return '❓ Unknown'
    patient_link.short_description = 'Patient'
    
    def message_preview(self, obj):
        if len(obj.message) > 50:
            return obj.message[:50] + '...'
        return obj.message
    message_preview.short_description = 'Message'
    
    def processed_badge(self, obj):
        if obj.is_processed:
            return format_html(
                '<span style="background-color: #28a745; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">✓ Processed</span>'
            )
        return format_html(
            '<span style="background-color: #ffc107; color: black; padding: 3px 10px; border-radius: 3px; font-weight: bold;">⏳ Pending</span>'
        )
    processed_badge.short_description = 'Status'
