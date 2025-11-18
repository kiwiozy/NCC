from django.contrib import admin
from .models import (
    XeroConnection,
    XeroContactLink,
    XeroInvoiceLink,
    XeroQuoteLink,
    XeroItemMapping,
    XeroTrackingCategory,
    XeroSyncLog,
    XeroPayment,
    XeroBatchPayment
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
    list_display = ['get_entity_type', 'get_entity_name', 'xero_contact_name', 'xero_contact_number', 'is_active', 'last_synced_at']
    list_filter = ['is_active', 'last_synced_at']
    search_fields = ['xero_contact_name', 'xero_contact_id', 'xero_contact_number']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    def get_entity_type(self, obj):
        """Display entity type (Patient or Company)"""
        if obj.patient:
            return "Patient"
        elif obj.company:
            return "Company"
        return "Unknown"
    get_entity_type.short_description = 'Entity Type'
    
    def get_entity_name(self, obj):
        """Display entity name"""
        return obj.get_entity_name()
    get_entity_name.short_description = 'Entity Name'
    
    fieldsets = (
        ('Link Type', {
            'fields': ('connection', 'patient', 'company'),
            'description': 'Must link to EITHER a patient OR a company'
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
            'fields': ('total', 'subtotal', 'total_tax', 'amount_due', 'amount_paid', 'currency')
        }),
        ('Dates', {
            'fields': ('invoice_date', 'due_date', 'fully_paid_on_date')
        }),
        ('Sync', {
            'fields': ('last_synced_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(XeroQuoteLink)
class XeroQuoteLinkAdmin(admin.ModelAdmin):
    list_display = ['xero_quote_number', 'status', 'total', 'appointment', 'quote_date', 'expiry_date', 'can_convert_to_invoice']
    list_filter = ['status', 'quote_date', 'currency']
    search_fields = ['xero_quote_id', 'xero_quote_number']
    readonly_fields = ['id', 'created_at', 'updated_at', 'last_synced_at', 'converted_at']
    
    fieldsets = (
        ('Local Link', {
            'fields': ('appointment',)
        }),
        ('Xero Quote', {
            'fields': ('xero_quote_id', 'xero_quote_number', 'status')
        }),
        ('Financial Details', {
            'fields': ('total', 'subtotal', 'total_tax', 'currency')
        }),
        ('Dates', {
            'fields': ('quote_date', 'expiry_date')
        }),
        ('Conversion', {
            'fields': ('converted_invoice', 'converted_at')
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


class XeroPaymentInline(admin.TabularInline):
    """Inline display of payments in batch payment admin"""
    model = XeroPayment
    extra = 0
    can_delete = False
    fields = ['xero_payment_id', 'invoice_link', 'amount', 'payment_date', 'status']
    readonly_fields = ['xero_payment_id', 'invoice_link', 'amount', 'payment_date', 'status']


@admin.register(XeroPayment)
class XeroPaymentAdmin(admin.ModelAdmin):
    list_display = ['xero_payment_id', 'get_invoice_number', 'amount', 'payment_date', 'status', 'get_batch_reference']
    list_filter = ['status', 'payment_date', 'connection']
    search_fields = ['xero_payment_id', 'reference', 'invoice_link__xero_invoice_number']
    readonly_fields = ['id', 'xero_payment_id', 'created_at', 'updated_at', 'synced_at']
    date_hierarchy = 'payment_date'
    
    def get_invoice_number(self, obj):
        """Display invoice number"""
        return obj.invoice_link.xero_invoice_number if obj.invoice_link else '—'
    get_invoice_number.short_description = 'Invoice Number'
    
    def get_batch_reference(self, obj):
        """Display batch reference if part of batch"""
        return obj.batch_payment.batch_reference if obj.batch_payment else '—'
    get_batch_reference.short_description = 'Batch Reference'
    
    fieldsets = (
        ('Xero Payment', {
            'fields': ('connection', 'xero_payment_id', 'status')
        }),
        ('Relationships', {
            'fields': ('invoice_link', 'batch_payment')
        }),
        ('Payment Details', {
            'fields': ('amount', 'payment_date', 'account_code', 'reference')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'synced_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(XeroBatchPayment)
class XeroBatchPaymentAdmin(admin.ModelAdmin):
    list_display = ['batch_reference', 'payment_count', 'total_amount', 'payment_date', 'get_connection']
    list_filter = ['payment_date', 'connection']
    search_fields = ['batch_reference', 'notes']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'payment_date'
    inlines = [XeroPaymentInline]
    
    def get_connection(self, obj):
        """Display connection tenant name"""
        return obj.connection.tenant_name if obj.connection else '—'
    get_connection.short_description = 'Xero Connection'
    
    fieldsets = (
        ('Batch Details', {
            'fields': ('connection', 'batch_reference', 'payment_date', 'account_code')
        }),
        ('Summary', {
            'fields': ('payment_count', 'total_amount')
        }),
        ('Remittance Details', {
            'fields': ('remittance_file', 'notes'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

