"""
Django admin configuration for Patient models
"""
from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    """Admin interface for Patient model"""
    
    list_display = ('last_name', 'first_name', 'mrn', 'clinic', 'funding_type', 'dob', 'get_age_display', 'get_mobile', 'created_at')
    list_filter = ('sex', 'clinic', 'funding_type', 'created_at')
    search_fields = ('first_name', 'last_name', 'mrn', 'health_number', 'contact_json')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'mrn', 'title', 'first_name', 'middle_names', 'last_name')
        }),
        ('Demographics', {
            'fields': ('dob', 'sex', 'health_number')
        }),
        ('Clinic & Funding', {
            'fields': ('clinic', 'funding_type')
        }),
        ('NDIS Information', {
            'fields': ('coordinator_name', 'coordinator_date', 'plan_start_date', 'plan_end_date'),
            'classes': ('collapse',)
        }),
        ('Contact Information', {
            'fields': ('contact_json', 'address_json', 'emergency_json'),
            'classes': ('collapse',)
        }),
        ('Notes & Flags', {
            'fields': ('notes', 'flags_json'),
            'classes': ('collapse',)
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_age_display(self, obj):
        """Display patient age"""
        age = obj.get_age()
        return f"{age} years" if age is not None else "-"
    get_age_display.short_description = 'Age'
