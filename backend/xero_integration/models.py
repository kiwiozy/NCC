"""
Xero Integration Models

Mapping tables for:
- OAuth2 connection (tokens, tenant)
- Contact links (Patient → Xero Contact)
- Invoice links (Appointment/Order → Xero Invoice)
- Item mappings (Local service codes → Xero items)
- Tracking categories (Clinic → Xero tracking option)
"""
import uuid
from django.db import models
from django.utils import timezone


class XeroConnection(models.Model):
    """
    Store Xero OAuth2 tokens and tenant info.
    Typically one row for the organization.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_id = models.CharField(max_length=255, help_text="Xero tenant/organisation ID")
    tenant_name = models.CharField(max_length=255, blank=True)
    
    # OAuth2 tokens
    access_token = models.TextField(help_text="Encrypted access token")
    refresh_token = models.TextField(help_text="Encrypted refresh token")
    id_token = models.TextField(blank=True, help_text="OpenID ID token")
    token_type = models.CharField(max_length=50, default="Bearer")
    expires_at = models.DateTimeField(help_text="When the access token expires")
    
    # Scopes granted
    scopes = models.TextField(help_text="Space-separated OAuth2 scopes")
    
    # Status
    is_active = models.BooleanField(default=True)
    connected_at = models.DateTimeField(default=timezone.now)
    last_refresh_at = models.DateTimeField(null=True, blank=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'xero_connections'
        ordering = ['-connected_at']
    
    def __str__(self):
        return f"Xero Connection: {self.tenant_name or self.tenant_id}"
    
    def is_token_expired(self):
        """Check if the access token has expired"""
        return timezone.now() >= self.expires_at


class XeroContactLink(models.Model):
    """
    Link local entities (Patient, Clinician, Referrer) to Xero Contacts
    """
    CONTACT_TYPES = [
        ('patient', 'Patient'),
        ('clinician', 'Clinician'),
        ('referrer', 'Referrer'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    local_type = models.CharField(max_length=20, choices=CONTACT_TYPES)
    local_id = models.UUIDField(help_text="FK to local entity (patient/clinician)")
    
    # Xero contact details
    xero_contact_id = models.CharField(max_length=255, unique=True, help_text="Xero Contact GUID")
    xero_contact_number = models.CharField(max_length=50, blank=True, help_text="Human-readable contact number")
    xero_contact_name = models.CharField(max_length=255, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'xero_contact_links'
        unique_together = [['local_type', 'local_id']]
        indexes = [
            models.Index(fields=['local_type', 'local_id']),
            models.Index(fields=['xero_contact_id']),
        ]
    
    def __str__(self):
        return f"{self.local_type}:{self.local_id} → {self.xero_contact_name}"


class XeroInvoiceLink(models.Model):
    """
    Link local appointments/orders to Xero Invoices
    """
    INVOICE_STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('AUTHORISED', 'Authorised'),
        ('PAID', 'Paid'),
        ('VOIDED', 'Voided'),
        ('DELETED', 'Deleted'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to local entities (nullable - could be appointment, order, or manual invoice)
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='xero_invoices'
    )
    # order_id could link to future Order model
    
    # Xero invoice details
    xero_invoice_id = models.CharField(max_length=255, unique=True, help_text="Xero Invoice GUID")
    xero_invoice_number = models.CharField(max_length=50, blank=True, help_text="Human-readable invoice number")
    xero_invoice_type = models.CharField(max_length=20, default='ACCREC', help_text="ACCREC or ACCPAY")
    
    # Financial details
    status = models.CharField(max_length=20, choices=INVOICE_STATUS_CHOICES, default='DRAFT')
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='AUD')
    
    # Dates
    invoice_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    fully_paid_on_date = models.DateField(null=True, blank=True)
    
    # Sync
    last_synced_at = models.DateTimeField(null=True, blank=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'xero_invoice_links'
        indexes = [
            models.Index(fields=['xero_invoice_id']),
            models.Index(fields=['status']),
            models.Index(fields=['appointment']),
        ]
    
    def __str__(self):
        return f"Invoice {self.xero_invoice_number} - {self.status} (${self.total})"


class XeroItemMapping(models.Model):
    """
    Map local service/product codes to Xero Items
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Local item details
    local_code = models.CharField(max_length=50, unique=True, help_text="Local service/product code")
    description = models.TextField(blank=True)
    
    # Xero item details
    xero_item_code = models.CharField(max_length=100, help_text="Xero Item Code")
    xero_account_code = models.CharField(max_length=20, blank=True, help_text="Xero Account Code (e.g., 200)")
    
    # Pricing
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Default unit price")
    
    # Tax
    tax_rate_name = models.CharField(max_length=100, blank=True, help_text="e.g., 'GST on Income', 'Tax Exempt'")
    tax_type = models.CharField(max_length=50, default='OUTPUT2', help_text="Xero TaxType code")
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'xero_item_mappings'
        indexes = [
            models.Index(fields=['local_code']),
            models.Index(fields=['xero_item_code']),
        ]
    
    def __str__(self):
        return f"{self.local_code} → {self.xero_item_code} (${self.unit_price})"


class XeroTrackingCategory(models.Model):
    """
    Map clinics to Xero Tracking Category Options
    Enables multi-clinic revenue tracking in Xero reports
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to local clinic
    clinic = models.OneToOneField(
        'clinicians.Clinic',
        on_delete=models.CASCADE,
        related_name='xero_tracking'
    )
    
    # Xero tracking category details
    tracking_category_id = models.CharField(max_length=255, help_text="Xero Tracking Category GUID")
    tracking_option_id = models.CharField(max_length=255, help_text="Xero Tracking Option GUID")
    category_name = models.CharField(max_length=100, help_text="e.g., 'Clinic', 'Location'")
    option_name = models.CharField(max_length=100, help_text="e.g., 'Tamworth', 'Newcastle'")
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'xero_tracking_categories'
        indexes = [
            models.Index(fields=['clinic']),
            models.Index(fields=['tracking_category_id', 'tracking_option_id']),
        ]
    
    def __str__(self):
        return f"{self.clinic.name} → {self.category_name}: {self.option_name}"


class XeroSyncLog(models.Model):
    """
    Audit log for Xero sync operations
    """
    OPERATION_TYPES = [
        ('contact_create', 'Contact Created'),
        ('contact_update', 'Contact Updated'),
        ('invoice_create', 'Invoice Created'),
        ('invoice_update', 'Invoice Updated'),
        ('payment_sync', 'Payment Synced'),
        ('token_refresh', 'Token Refreshed'),
    ]
    
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('partial', 'Partial Success'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operation_type = models.CharField(max_length=50, choices=OPERATION_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    
    # Request/Response details
    request_data = models.JSONField(null=True, blank=True, help_text="Request payload (sanitized)")
    response_data = models.JSONField(null=True, blank=True, help_text="Response data")
    error_message = models.TextField(blank=True)
    
    # Related objects
    local_entity_type = models.CharField(max_length=50, blank=True)
    local_entity_id = models.UUIDField(null=True, blank=True)
    xero_entity_id = models.CharField(max_length=255, blank=True)
    
    # Timing
    duration_ms = models.IntegerField(null=True, blank=True, help_text="Operation duration in milliseconds")
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'xero_sync_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['operation_type', 'status']),
            models.Index(fields=['local_entity_type', 'local_entity_id']),
        ]
    
    def __str__(self):
        return f"{self.operation_type} - {self.status} at {self.created_at}"
