"""
Xero Integration Serializers
"""
from rest_framework import serializers
from .models import (
    XeroConnection,
    XeroContactLink,
    XeroInvoiceLink,
    XeroQuoteLink,
    XeroItemMapping,
    XeroTrackingCategory,
    XeroSyncLog
)


class XeroConnectionSerializer(serializers.ModelSerializer):
    """Serializer for Xero connection status"""
    is_token_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = XeroConnection
        fields = [
            'id', 'tenant_id', 'tenant_name', 'is_active',
            'expires_at', 'connected_at', 'last_refresh_at',
            'is_token_expired', 'scopes'
        ]
        read_only_fields = fields


class XeroContactLinkSerializer(serializers.ModelSerializer):
    """Serializer for contact links"""
    
    class Meta:
        model = XeroContactLink
        fields = [
            'id', 'local_type', 'local_id', 'xero_contact_id',
            'xero_contact_number', 'xero_contact_name', 'is_active',
            'last_synced_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class XeroInvoiceLinkSerializer(serializers.ModelSerializer):
    """Serializer for invoice links"""
    appointment_details = serializers.SerializerMethodField()
    
    class Meta:
        model = XeroInvoiceLink
        fields = [
            'id', 'appointment', 'appointment_details',
            'xero_invoice_id', 'xero_invoice_number', 'xero_invoice_type',
            'status', 'total', 'amount_due', 'amount_paid', 'currency',
            'invoice_date', 'due_date', 'fully_paid_on_date',
            'last_synced_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_appointment_details(self, obj):
        if obj.appointment:
            return {
                'id': str(obj.appointment.id),
                'patient_name': obj.appointment.patient.get_full_name() if obj.appointment.patient else None,
                'start_time': obj.appointment.start_time,
            }
        return None


class XeroItemMappingSerializer(serializers.ModelSerializer):
    """Serializer for item mappings"""
    
    class Meta:
        model = XeroItemMapping
        fields = [
            'id', 'local_code', 'description', 'xero_item_code',
            'xero_account_code', 'unit_price', 'tax_rate_name',
            'tax_type', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class XeroTrackingCategorySerializer(serializers.ModelSerializer):
    """Serializer for tracking categories"""
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    
    class Meta:
        model = XeroTrackingCategory
        fields = [
            'id', 'clinic', 'clinic_name', 'tracking_category_id',
            'tracking_option_id', 'category_name', 'option_name',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class XeroSyncLogSerializer(serializers.ModelSerializer):
    """Serializer for sync logs"""
    
    class Meta:
        model = XeroSyncLog
        fields = [
            'id', 'operation_type', 'status', 'local_entity_type',
            'local_entity_id', 'xero_entity_id', 'error_message',
            'duration_ms', 'created_at'
        ]
        read_only_fields = fields


class CreateInvoiceSerializer(serializers.Serializer):
    """Serializer for creating invoices"""
    appointment_id = serializers.UUIDField()
    line_items = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of line items with description, quantity, unit_amount, etc."
    )
    use_clinic_tracking = serializers.BooleanField(
        default=True,
        help_text="Apply clinic tracking category to invoice"
    )
    
    def validate_line_items(self, value):
        """Validate line items structure"""
        required_fields = ['description', 'unit_amount']
        
        for item in value:
            for field in required_fields:
                if field not in item:
                    raise serializers.ValidationError(
                        f"Line item missing required field: {field}"
                    )
        
        return value


class SyncContactSerializer(serializers.Serializer):
    """Serializer for syncing contacts"""
    patient_id = serializers.UUIDField()
    force_update = serializers.BooleanField(default=False)


class XeroQuoteLinkSerializer(serializers.ModelSerializer):
    """
    Serializer for quote links
    Added Nov 2025: Support for Xero quotes (estimates)
    """
    appointment_details = serializers.SerializerMethodField()
    converted_invoice_details = serializers.SerializerMethodField()
    can_convert = serializers.BooleanField(source='can_convert_to_invoice', read_only=True)
    
    class Meta:
        model = XeroQuoteLink
        fields = [
            'id', 'appointment', 'appointment_details',
            'xero_quote_id', 'xero_quote_number', 'status',
            'total', 'subtotal', 'total_tax', 'currency',
            'quote_date', 'expiry_date',
            'converted_invoice', 'converted_invoice_details', 'converted_at', 'can_convert',
            'last_synced_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_appointment_details(self, obj):
        if obj.appointment:
            return {
                'id': str(obj.appointment.id),
                'patient_name': obj.appointment.patient.get_full_name() if obj.appointment.patient else None,
                'start_time': obj.appointment.start_time,
            }
        return None
    
    def get_converted_invoice_details(self, obj):
        if obj.converted_invoice:
            return {
                'id': str(obj.converted_invoice.id),
                'xero_invoice_number': obj.converted_invoice.xero_invoice_number,
                'status': obj.converted_invoice.status,
                'total': str(obj.converted_invoice.total),
            }
        return None


