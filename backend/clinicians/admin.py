"""
Django admin configuration for Clinician models
"""
from django.contrib import admin
from .models import Clinic, Clinician


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    """Admin interface for Clinic model"""
    
    list_display = ('name', 'phone', 'email', 'abn', 'created_at')
    search_fields = ('name', 'abn', 'phone', 'email')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'abn')
        }),
        ('Contact Information', {
            'fields': ('phone', 'email', 'address_json')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Clinician)
class ClinicianAdmin(admin.ModelAdmin):
    """Admin interface for Clinician model"""
    
    list_display = ('full_name', 'credential', 'role', 'clinic', 'email', 'active', 'created_at')
    list_filter = ('active', 'role', 'clinic')
    search_fields = ('full_name', 'credential', 'email')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'full_name', 'credential', 'role', 'active')
        }),
        ('Clinic Assignment', {
            'fields': ('clinic',)
        }),
        ('Contact Information', {
            'fields': ('email', 'phone')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
