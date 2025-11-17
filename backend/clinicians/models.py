"""
Clinician and Clinic models for WalkEasy Nexus
Based on schema from: 02-Target-Postgres-Schema.md
"""
import uuid
from django.db import models
from django.contrib.auth.models import User


class Clinic(models.Model):
    """
    Clinic/location information.
    Represents different practice locations (e.g., Tamworth, Newcastle).
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    name = models.CharField(
        max_length=200,
        help_text="Clinic name (e.g., 'Walk Easy Tamworth')"
    )
    
    abn = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name="ABN",
        help_text="Australian Business Number"
    )
    
    phone = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        help_text="Main clinic phone number"
    )
    
    email = models.EmailField(
        null=True,
        blank=True,
        help_text="Main clinic email address"
    )
    
    address_json = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Clinic address (JSON format)"
    )
    
    color = models.CharField(
        max_length=7,
        null=True,
        blank=True,
        default='#3B82F6',
        help_text="Hex color code for calendar display (e.g., '#3B82F6')"
    )
    
    sms_reminder_template = models.TextField(
        null=True,
        blank=True,
        help_text="SMS reminder template for this clinic (use {patient_name}, {date}, {time}, {clinic_name} placeholders)"
    )
    
    sms_reminders_enabled = models.BooleanField(
        default=True,
        help_text="Whether automatic SMS reminders are enabled for this clinic"
    )
    
    filemaker_id = models.UUIDField(
        null=True,
        blank=True,
        unique=True,
        help_text="Original FileMaker clinic ID (for import tracking)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'clinics'
        ordering = ['name']
        verbose_name = 'Clinic'
        verbose_name_plural = 'Clinics'
    
    def __str__(self):
        return self.name


class Clinician(models.Model):
    """
    Clinician/staff member information.
    Includes pedorthists, admin staff, and other healthcare providers.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clinicians',
        help_text="Primary clinic location"
    )
    
    full_name = models.CharField(
        max_length=200,
        help_text="Clinician's full name"
    )
    
    credential = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Professional credentials (e.g., 'C.Ped CM Au')"
    )
    
    email = models.EmailField(
        null=True,
        blank=True,
        help_text="Clinician's email address"
    )
    
    phone = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        help_text="Clinician's phone number"
    )
    
    role = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=[
            ('PEDORTHIST', 'Pedorthist'),
            ('ADMIN', 'Administrator'),
            ('RECEPTION', 'Reception'),
            ('MANAGER', 'Manager'),
            ('OTHER', 'Other'),
        ],
        help_text="Clinician's role in the organization"
    )
    
    active = models.BooleanField(
        default=True,
        help_text="Is the clinician currently active?"
    )
    
    # User Profile Fields (added November 2025)
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clinician_profile',
        help_text="Link to Django User account (for Google OAuth login)"
    )
    
    registration_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Professional registration number (e.g., 'Pedorthic Registration # 3454')"
    )
    
    professional_body_url = models.URLField(
        max_length=200,
        null=True,
        blank=True,
        help_text="Professional body website (e.g., 'www.pedorthics.org.au')"
    )
    
    signature_image = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text="S3 key for signature image (used in letters and PDFs)"
    )
    
    signature_html = models.TextField(
        null=True,
        blank=True,
        help_text="HTML signature for emails (rich text format)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'clinicians'
        ordering = ['full_name']
        indexes = [
            models.Index(fields=['active', 'full_name']),
            models.Index(fields=['clinic', 'active']),
        ]
        verbose_name = 'Clinician'
        verbose_name_plural = 'Clinicians'
    
    def __str__(self):
        if self.credential:
            return f"{self.full_name}, {self.credential}"
        return self.full_name
    
    def get_display_name(self):
        """Get display name with credentials"""
        return str(self)
    
    def get_signature_url(self):
        """Get full S3 URL for signature image"""
        if self.signature_image:
            # Will use S3 service to generate presigned URL
            from documents.services import S3Service
            try:
                s3_service = S3Service()
                return s3_service.generate_presigned_url(self.signature_image)
            except Exception:
                return None
        return None
    
    def get_full_credentials_display(self):
        """
        Get full display string for professional credentials
        Example: "Craig Laird, CPed CM au\nPedorthic Registration # 3454\nwww.pedorthics.org.au"
        """
        lines = [self.get_display_name()]
        if self.registration_number:
            lines.append(self.registration_number)
        if self.professional_body_url:
            lines.append(self.professional_body_url)
        return '\n'.join(lines)
