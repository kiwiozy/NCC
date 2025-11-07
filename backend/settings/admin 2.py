"""
Django admin configuration for Settings models
"""
from django.contrib import admin
from .models import FundingSource


@admin.register(FundingSource)
class FundingSourceAdmin(admin.ModelAdmin):
    """Admin interface for FundingSource model"""
    
    list_display = ('name', 'code', 'active', 'order', 'created_at')
    list_filter = ('active', 'created_at')
    search_fields = ('name', 'code')
    ordering = ('order', 'name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'code', 'active', 'order')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
