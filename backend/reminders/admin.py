"""
Admin interface for Reminder models
"""
from django.contrib import admin
from .models import Reminder


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    """Admin configuration for Reminder model"""
    
    list_display = [
        'id', 'patient', 'clinic', 'note', 'status', 'reminder_date', 'created_at'
    ]
    list_filter = ['status', 'clinic', 'created_at', 'reminder_date']
    search_fields = ['note', 'patient__first_name', 'patient__last_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'scheduled_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'patient', 'clinic', 'note', 'reminder_date')
        }),
        ('Status', {
            'fields': ('status', 'appointment_id', 'scheduled_at')
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )
