"""
Django admin configuration for Appointment models
"""
from django.contrib import admin
from .models import Appointment, Encounter


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    """Admin interface for Appointment model"""
    
    list_display = ('patient', 'clinician', 'clinic', 'start_time', 'status', 'created_at')
    list_filter = ('status', 'clinic', 'clinician', 'start_time')
    search_fields = ('patient__first_name', 'patient__last_name', 'clinician__full_name', 'reason')
    readonly_fields = ('id', 'created_at', 'updated_at')
    date_hierarchy = 'start_time'
    
    fieldsets = (
        ('Appointment Details', {
            'fields': ('id', 'patient', 'clinician', 'clinic')
        }),
        ('Timing', {
            'fields': ('start_time', 'end_time', 'status')
        }),
        ('Clinical Information', {
            'fields': ('reason', 'notes')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queries with select_related"""
        qs = super().get_queryset(request)
        return qs.select_related('patient', 'clinician', 'clinic')


@admin.register(Encounter)
class EncounterAdmin(admin.ModelAdmin):
    """Admin interface for Encounter model"""
    
    list_display = ('patient', 'clinician', 'type', 'start_time', 'created_at')
    list_filter = ('type', 'clinician', 'start_time')
    search_fields = ('patient__first_name', 'patient__last_name', 'clinician__full_name', 'reason', 'summary')
    readonly_fields = ('id', 'created_at', 'updated_at')
    date_hierarchy = 'start_time'
    
    fieldsets = (
        ('Encounter Details', {
            'fields': ('id', 'patient', 'clinician', 'appointment', 'type')
        }),
        ('Timing', {
            'fields': ('start_time', 'end_time')
        }),
        ('Clinical Information', {
            'fields': ('reason', 'summary')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queries with select_related"""
        qs = super().get_queryset(request)
        return qs.select_related('patient', 'clinician', 'appointment')
