"""
SMS Integration Models
Handles SMS messaging for patient communications, reminders, and notifications
"""
import uuid
from django.db import models
from django.utils import timezone


class SMSTemplate(models.Model):
    """
    Reusable SMS message templates
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, help_text="Template name (e.g., 'appointment_reminder')")
    description = models.TextField(blank=True, help_text="What this template is used for")
    message_template = models.TextField(
        help_text="Template text. Use {patient_name}, {appointment_date}, {appointment_time}, {clinic_name}, {clinician_name}"
    )
    is_active = models.BooleanField(default=True)
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sms_templates'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name}"
    
    def render(self, context: dict) -> str:
        """Render template with provided context variables"""
        message = self.message_template
        for key, value in context.items():
            placeholder = '{' + key + '}'
            message = message.replace(placeholder, str(value))
        return message


class SMSMessage(models.Model):
    """
    Sent SMS messages
    Tracks all outbound messages and their delivery status
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sms_messages',
        help_text="Patient this message is for (optional for ad-hoc messages)"
    )
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sms_messages',
        help_text="Related appointment (if applicable)"
    )
    template = models.ForeignKey(
        SMSTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Template used to generate this message"
    )
    
    # Message details
    phone_number = models.CharField(max_length=20, help_text="Recipient phone number (E.164 format preferred)")
    message = models.TextField(help_text="Message content (max 160 chars per SMS)")
    
    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    external_message_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Message ID from SMS provider"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When to send this message (for scheduled sends)"
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    # Error tracking
    error_message = models.TextField(blank=True, help_text="Error details if sending failed")
    retry_count = models.IntegerField(default=0, help_text="Number of send attempts")
    
    # Cost tracking
    sms_count = models.IntegerField(
        default=1,
        help_text="Number of SMS segments (messages > 160 chars use multiple)"
    )
    cost = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Cost in AUD"
    )
    
    # Metadata
    notes = models.TextField(blank=True, help_text="Internal notes")
    
    class Meta:
        db_table = 'sms_messages'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient', '-created_at']),
            models.Index(fields=['appointment']),
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"SMS to {self.phone_number} - {self.status} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def is_multipart(self) -> bool:
        """Check if message requires multiple SMS segments"""
        return len(self.message) > 160
    
    def calculate_sms_count(self) -> int:
        """Calculate number of SMS segments required"""
        length = len(self.message)
        if length <= 160:
            return 1
        # After 160 chars, each SMS can hold 153 chars (7 chars used for segmentation)
        return 1 + ((length - 160) // 153) + (1 if (length - 160) % 153 > 0 else 0)
    
    def save(self, *args, **kwargs):
        """Auto-calculate SMS count on save"""
        if not self.sms_count or self.sms_count == 1:
            self.sms_count = self.calculate_sms_count()
        super().save(*args, **kwargs)


class SMSInbound(models.Model):
    """
    Received SMS messages (replies from patients)
    For handling inbound messages via webhook
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Message details
    from_number = models.CharField(max_length=20, help_text="Sender phone number")
    to_number = models.CharField(max_length=20, help_text="Our number that received the message")
    message = models.TextField(help_text="Received message content")
    
    # Tracking
    external_message_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Message ID from SMS provider"
    )
    received_at = models.DateTimeField(default=timezone.now)
    
    # Patient linking (if we can identify them)
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sms_received',
        help_text="Matched patient (if found)"
    )
    
    # Processing
    is_processed = models.BooleanField(default=False, help_text="Has this been reviewed/handled?")
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.CharField(max_length=100, blank=True, help_text="Staff member who processed")
    notes = models.TextField(blank=True, help_text="Processing notes")
    
    class Meta:
        db_table = 'sms_inbound'
        ordering = ['-received_at']
        indexes = [
            models.Index(fields=['from_number', '-received_at']),
            models.Index(fields=['is_processed', '-received_at']),
            models.Index(fields=['-received_at']),
        ]
    
    def __str__(self):
        return f"SMS from {self.from_number} - {self.received_at.strftime('%Y-%m-%d %H:%M')}"
