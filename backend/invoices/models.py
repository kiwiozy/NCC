"""
Email Template Models - Multi-Template Library System
"""
from django.db import models
from django.contrib.auth.models import User


class EmailTemplate(models.Model):
    """
    Individual email template - can have multiple per document type
    Users can create unlimited templates for each category
    
    Examples:
    - Letters: "Referral Letter", "Discharge Summary", "Report Request"
    - Invoices: "Standard Invoice", "Overdue Notice", "Payment Plan"
    - AT Reports: "Standard Assessment", "Review Report", "Urgent"
    """
    CATEGORY_CHOICES = [
        ('invoice', 'Invoice'),
        ('receipt', 'Receipt'),
        ('quote', 'Quote'),
        ('at_report', 'AT Report'),
        ('letter', 'Letter'),
    ]
    
    # Identity
    name = models.CharField(
        max_length=100,
        help_text='Template name (e.g., "Referral Letter", "Overdue Invoice")'
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        db_index=True
    )
    description = models.TextField(
        blank=True,
        help_text='Internal note about when to use this template'
    )
    
    # Template Content
    subject = models.CharField(
        max_length=255,
        help_text='Email subject line. Use tokens like {patient_name}, {invoice_number}'
    )
    body_html = models.TextField(
        help_text='HTML email body. Supports tokens.'
    )
    body_text = models.TextField(
        blank=True,
        help_text='Plain text version (optional, auto-generated if empty)'
    )
    
    # Appearance
    header_color = models.CharField(
        max_length=7,
        default='#10b981',
        help_text='Hex color for email header (e.g., #10b981)'
    )
    
    # Settings
    is_default = models.BooleanField(
        default=False,
        help_text='Default template for this category'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Inactive templates are hidden but not deleted'
    )
    
    # Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_email_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('category', 'name')
        ordering = ['category', '-is_default', 'name']
        verbose_name = 'Email Template'
        verbose_name_plural = 'Email Templates'
    
    def __str__(self):
        default_marker = ' [DEFAULT]' if self.is_default else ''
        return f"{self.get_category_display()}: {self.name}{default_marker}"
    
    def save(self, *args, **kwargs):
        # If this is being set as default, unset other defaults in same category
        if self.is_default:
            EmailTemplate.objects.filter(
                category=self.category,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)
    
    @classmethod
    def get_default_for_category(cls, category):
        """Get the default template for a category"""
        try:
            return cls.objects.get(category=category, is_default=True, is_active=True)
        except cls.DoesNotExist:
            # Return first active template if no default set
            return cls.objects.filter(category=category, is_active=True).first()
    
    @classmethod
    def get_active_for_category(cls, category):
        """Get all active templates for a category"""
        return cls.objects.filter(category=category, is_active=True)


class EmailGlobalSettings(models.Model):
    """
    Singleton model for settings shared across all email templates
    Contains sender info, clinic details, payment info, etc.
    """
    # Sender Settings
    default_gmail_account = models.EmailField(
        blank=True,
        null=True,
        help_text='Default Gmail account to send from'
    )
    reply_to_email = models.EmailField(
        blank=True,
        null=True,
        help_text='Reply-to address (if different from sender)'
    )
    bcc_all_to = models.EmailField(
        blank=True,
        null=True,
        help_text='BCC all emails to this address'
    )
    
    # Clinic Contact Info (for footer)
    clinic_name = models.CharField(max_length=255, default='WalkEasy Nexus')
    clinic_phone = models.CharField(max_length=50, blank=True)
    clinic_email = models.EmailField(blank=True)
    clinic_website = models.URLField(blank=True)
    clinic_address = models.TextField(blank=True)
    clinic_abn = models.CharField(max_length=20, blank=True, verbose_name='ABN')
    clinic_acn = models.CharField(max_length=20, blank=True, verbose_name='ACN')
    
    # Payment Details (for invoice/receipt emails)
    bank_account_name = models.CharField(
        max_length=255,
        default='WalkEasy Nexus Pty Ltd'
    )
    bank_bsb = models.CharField(max_length=10, blank=True, verbose_name='BSB')
    bank_account_number = models.CharField(max_length=20, blank=True)
    payment_instructions_text = models.TextField(
        blank=True,
        help_text='Additional payment instructions'
    )
    payment_reference_format = models.CharField(
        max_length=50,
        default='invoice_number',
        help_text='Format for payment reference'
    )
    
    # Legal/Compliance
    confidentiality_notice = models.TextField(
        default='This email and any attachments are confidential and may contain privileged information.',
        help_text='Confidentiality notice for email footer'
    )
    
    # Email Signature
    company_signature_html = models.TextField(
        blank=True,
        help_text='Company email signature for info@walkeasy.com.au (HTML format)'
    )
    company_signature_email = models.EmailField(
        default='info@walkeasy.com.au',
        help_text='Email address that uses the company signature'
    )
    use_email_signatures = models.BooleanField(
        default=True,
        help_text='Automatically append signatures to emails (company or user signatures)'
    )
    
    # Appearance Defaults
    default_email_width = models.CharField(
        max_length=10,
        default='600px',
        help_text='Default email width (e.g., 600px, 100%)'
    )
    show_logo = models.BooleanField(
        default=True,
        help_text='Show clinic logo in email header'
    )
    show_contact_info = models.BooleanField(
        default=True,
        help_text='Show contact info in footer'
    )
    show_payment_instructions = models.BooleanField(
        default=True,
        help_text='Show payment instructions in invoice/receipt emails'
    )
    show_bank_details = models.BooleanField(
        default=True,
        help_text='Show bank details in invoice/receipt emails'
    )
    show_confidentiality = models.BooleanField(
        default=True,
        help_text='Show confidentiality notice in footer'
    )
    
    # Auto-Send Rules
    auto_send_invoices = models.BooleanField(default=False)
    auto_send_receipts = models.BooleanField(default=False)
    auto_send_quotes = models.BooleanField(default=False)
    send_payment_reminders = models.BooleanField(default=False)
    send_overdue_notices = models.BooleanField(default=False)
    
    reminder_days_before = models.JSONField(
        default=list,
        blank=True,
        help_text='Days before due date to send reminders (e.g., [7, 3, 1])'
    )
    overdue_days_after = models.JSONField(
        default=list,
        blank=True,
        help_text='Days after due date to send overdue notices (e.g., [7, 14, 30])'
    )
    
    require_confirmation = models.BooleanField(
        default=True,
        help_text='Require confirmation before auto-sending'
    )
    business_hours_only = models.BooleanField(
        default=False,
        help_text='Only send emails during business hours'
    )
    
    # Timestamps
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Email Global Settings'
        verbose_name_plural = 'Email Global Settings'
    
    def save(self, *args, **kwargs):
        # Ensure singleton
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance"""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings
    
    def __str__(self):
        return 'Email Global Settings'
