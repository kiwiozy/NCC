from django.contrib import admin
from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'company_type', 'filemaker_id']
    list_filter = ['company_type']
    search_fields = ['name']
    readonly_fields = ['id', 'filemaker_id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Company Information', {
            'fields': ('id', 'name', 'company_type')
        }),
        ('Contact Information', {
            'fields': ('contact_json', 'address_json')
        }),
        ('Import Tracking', {
            'fields': ('filemaker_id', 'created_at', 'updated_at')
        }),
    )
