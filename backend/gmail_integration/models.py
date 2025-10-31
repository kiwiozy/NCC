"""
Gmail Integration Models

Stores:
- OAuth2 connection (tokens, email account)
- Email templates
- Sent email logs
"""
import uuid
from django.db import models
from django.utils import timezone


class GmailConnection(models.Model):
    """
    Store Gmail OAuth2 tokens and account info.
    Typically one row per Gmail account connected.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Email account info
    email_address = models.EmailField(unique=True, help_text="Gmail address")
    display_name = models.CharField(max_length=255, blank=True, help_text="User's display name")
    
    # OAuth2 tokens
    access_token = models.TextField(help_text="Encrypted access token")
    refresh_token = models.TextField(help_text="Encrypted refresh token")
    token_type = models.CharField(max_length=50, default="Bearer")
    expires_at = models.DateTimeField(help_text="When the access token expires")
    
    # Scopes granted
    scopes = models.TextField(help_text="Space-separated OAuth2 scopes")
    
    # Status
    is_active = models.BooleanField(default=True)
    is_primary = models.BooleanField(default=False, help_text="Primary sending account")
    connected_at = models.DateTimeField(default=timezone.now)
    last_refresh_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    # Stats
    emails_sent = models.IntegerField(default=0, help_text="Total emails sent")
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'gmail_connections'
        ordering = ['-is_primary', '-connected_at']
    
    def __str__(self):
        return f"Gmail: {self.email_address}"
    
    def is_token_expired(self):
        """Check if the access token has expired"""
        return timezone.now() >= self.expires_at
    
    def save(self, *args, **kwargs):
        # If this is set as primary, unset all others
        if self.is_primary:
            GmailConnection.objects.filter(is_primary=True).exclude(id=self.id).update(is_primary=False)
        super().save(*args, **kwargs)


class EmailTemplate(models.Model):
    """
    Store email templates for common communications
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Template details
    name = models.CharField(max_length=255, help_text="Template name")
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True, help_text="e.g., 'AT Report', 'Appointment', 'Invoice'")
    
    # Email content
    subject = models.CharField(max_length=255, help_text="Email subject (can include {{variables}}")
    body_html = models.TextField(help_text="HTML email body (can include {{variables}})")
    body_text = models.TextField(blank=True, help_text="Plain text alternative")
    
    # Settings
    is_active = models.BooleanField(default=True)
    attach_pdf = models.BooleanField(default=False, help_text="Automatically attach PDF report")
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, blank=True)
    
    class Meta:
        db_table = 'email_templates'
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.category}: {self.name}" if self.category else self.name


class SentEmail(models.Model):
    """
    Log of all emails sent through the system
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Connection used
    connection = models.ForeignKey(
        GmailConnection,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_emails'
    )
    
    # Email details
    to_addresses = models.TextField(help_text="Comma-separated recipient emails")
    cc_addresses = models.TextField(blank=True, help_text="CC recipients")
    bcc_addresses = models.TextField(blank=True, help_text="BCC recipients")
    subject = models.CharField(max_length=500)
    
    # Content
    body_preview = models.TextField(blank=True, help_text="First 500 chars of body")
    has_attachments = models.BooleanField(default=False)
    attachment_names = models.TextField(blank=True, help_text="Comma-separated attachment filenames")
    
    # Template used (if any)
    template = models.ForeignKey(
        EmailTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_emails'
    )
    
    # Status
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('queued', 'Queued'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    error_message = models.TextField(blank=True)
    
    # Gmail message ID
    gmail_message_id = models.CharField(max_length=255, blank=True)
    gmail_thread_id = models.CharField(max_length=255, blank=True)
    
    # Related records (optional)
    related_patient_id = models.CharField(max_length=100, blank=True)
    related_appointment_id = models.CharField(max_length=100, blank=True)
    related_report_type = models.CharField(max_length=100, blank=True, help_text="e.g., 'AT Report'")
    
    # Audit
    sent_at = models.DateTimeField(default=timezone.now)
    sent_by = models.CharField(max_length=255, blank=True)
    
    class Meta:
        db_table = 'sent_emails'
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['-sent_at']),
            models.Index(fields=['status']),
            models.Index(fields=['related_patient_id']),
        ]
    
    def __str__(self):
        return f"Email to {self.to_addresses[:50]} - {self.sent_at.strftime('%Y-%m-%d %H:%M')}"
