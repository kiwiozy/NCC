from django.contrib import admin
from .models import (
    XeroConnection,
    XeroContactLink,
    XeroInvoiceLink,
    XeroItemMapping,
    XeroTrackingCategory,
    XeroSyncLog
)


@admin.register(XeroConnection)
class XeroConnectionAdmin(admin.ModelAdmin):
    list_display = ['tenant_name', 'tenant_id', 'is_active', 'expires_at', 'connected_at']
    list_filter = ['is_active', 'connected_at']
    search_fields = ['tenant_name', 'tenant_id']
    readonly_fields = ['id', 'connected_at', 'created_at', 'updated_at', 'expires_at', 'last_refresh_at']
    
    fieldsets = (
        ('Xero Organisation', {
            'fields': ('tenant_id', 'tenant_name', 'is_active')
        }),
        ('OAuth2 Tokens', {
            'fields': ('access_token', 'refresh_token', 'id_token', 'token_type', 'expires_at', 'scopes'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('connected_at', 'last_refresh_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(XeroContactLink)
class XeroContactLinkAdmin(admin.ModelAdmin):
    list_display = ['local_type', 'local_id', 'xero_contact_name', 'xero_contact_number', 'is_active', 'last_synced_at']
    list_filter = ['local_type', 'is_active', 'last_synced_at']
    search_fields = ['xero_contact_name', 'xero_contact_id', 'xero_contact_number']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Local Entity', {
            'fields': ('local_type', 'local_id')
        }),
        ('Xero Contact', {
            'fields': ('xero_contact_id', 'xero_contact_number', 'xero_contact_name')
        }),
        ('Status', {
            'fields': ('is_active', 'last_synced_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(XeroInvoiceLink)
class XeroInvoiceLinkAdmin(admin.ModelAdmin):
    list_display = ['xero_invoice_number', 'status', 'total', 'amount_due', 'amount_paid', 'appointment', 'invoice_date']
    list_filter = ['status', 'invoice_date', 'currency']
    search_fields = ['xero_invoice_id', 'xero_invoice_number']
    readonly_fields = ['id', 'created_at', 'updated_at', 'last_synced_at']
    
    fieldsets = (
        ('Local Link', {
            'fields': ('appointment',)
        }),
        ('Xero Invoice', {
            'fields': ('xero_invoice_id', 'xero_invoice_number', 'xero_invoice_type', 'status')
        }),
        ('Financial Details', {
            'fields': ('total', 'amount_due', 'amount_paid', 'currency')
        }),
        ('Dates', {
            'fields': ('invoice_date', 'due_date', 'fully_paid_on_date')
        }),
        ('Sync', {
            'fields': ('last_synced_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(XeroItemMapping)
class XeroItemMappingAdmin(admin.ModelAdmin):
    list_display = ['local_code', 'xero_item_code', 'unit_price', 'tax_rate_name', 'is_active']
    list_filter = ['is_active', 'tax_type']
    search_fields = ['local_code', 'xero_item_code', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Local Item', {
            'fields': ('local_code', 'description', 'unit_price')
        }),
        ('Xero Mapping', {
            'fields': ('xero_item_code', 'xero_account_code', 'tax_rate_name', 'tax_type')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(XeroTrackingCategory)
class XeroTrackingCategoryAdmin(admin.ModelAdmin):
    list_display = ['clinic', 'category_name', 'option_name', 'is_active']
    list_filter = ['is_active', 'category_name']
    search_fields = ['category_name', 'option_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Local Clinic', {
            'fields': ('clinic',)
        }),
        ('Xero Tracking', {
            'fields': ('tracking_category_id', 'tracking_option_id', 'category_name', 'option_name')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(XeroSyncLog)
class XeroSyncLogAdmin(admin.ModelAdmin):
    list_display = ['operation_type', 'status', 'local_entity_type', 'duration_ms', 'created_at']
    list_filter = ['operation_type', 'status', 'local_entity_type', 'created_at']
    search_fields = ['local_entity_id', 'xero_entity_id', 'error_message']
    readonly_fields = ['id', 'created_at']
    
    fieldsets = (
        ('Operation', {
            'fields': ('operation_type', 'status', 'duration_ms')
        }),
        ('Entities', {
            'fields': ('local_entity_type', 'local_entity_id', 'xero_entity_id')
        }),
        ('Request/Response', {
            'fields': ('request_data', 'response_data', 'error_message'),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )
    
    def has_add_permission(self, request):
        # Sync logs are created programmatically only
        return False
    
    def has_change_permission(self, request, obj=None):
        # Sync logs are read-only
        return False
