"""
Patient models for WalkEasy Nexus
Based on schema from: 02-Target-Postgres-Schema.md
"""
import uuid
from django.db import models
from django.utils import timezone


class Patient(models.Model):
    """
    Core patient demographics and contact information.
    System of record for all patient data.
    """
    
    # Primary identifier
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False,
        help_text="Unique patient identifier (UUID)"
    )
    
    # Medical Record Number (optional, for legacy compatibility)
    mrn = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Medical Record Number",
        help_text="Local medical record number (optional)"
    )
    
    # Name fields
    first_name = models.CharField(
        max_length=100,
        help_text="Patient's first/given name"
    )
    
    last_name = models.CharField(
        max_length=100,
        help_text="Patient's last/family name"
    )
    
    middle_names = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Middle name(s) if any"
    )
    
    # Demographics
    dob = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date of Birth",
        help_text="Patient's date of birth"
    )
    
    sex = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=[
            ('M', 'Male'),
            ('F', 'Female'),
            ('O', 'Other'),
            ('U', 'Unknown'),
        ],
        help_text="Patient's sex"
    )
    
    # Title (Mr., Mrs., Ms., Dr., etc.)
    title = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        choices=[
            ('Mr', 'Mr.'),
            ('Mrs', 'Mrs.'),
            ('Ms', 'Ms.'),
            ('Miss', 'Miss'),
            ('Dr', 'Dr.'),
            ('Prof', 'Prof.'),
        ],
        help_text="Patient's title (Mr., Mrs., Ms., Dr., etc.)"
    )
    
    # Health Number (separate from MRN)
    health_number = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Health number (different from MRN)"
    )
    
    # Funding Source (ForeignKey to FundingSource)
    funding_type = models.ForeignKey(
        'settings.FundingSource',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='patients',
        help_text="Patient's funding source (NDIS, Private, DVA, etc.)"
    )
    
    # Clinic (ForeignKey to Clinic)
    clinic = models.ForeignKey(
        'clinicians.Clinic',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='patients',
        help_text="Clinic location for this patient"
    )
    
    # NDIS Coordinator
    coordinator_name = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text="Coordinator name (e.g., 'Warda - Ability Connect')"
    )
    
    coordinator_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when coordinator was assigned"
    )
    
    # NDIS Plan Dates
    plan_start_date = models.DateField(
        null=True,
        blank=True,
        help_text="NDIS plan start date"
    )
    
    plan_end_date = models.DateField(
        null=True,
        blank=True,
        help_text="NDIS plan end date"
    )
    
    # General Notes
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="General notes about the patient"
    )
    
    # Archive fields (soft delete - never actually delete records)
    archived = models.BooleanField(
        default=False,
        help_text="Whether this patient has been archived (soft deleted)"
    )
    
    archived_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when patient was archived"
    )
    
    archived_by = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="User who archived this patient (optional)"
    )
    
    # Contact information (stored as JSON for flexibility)
    contact_json = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Contact details: phones, emails (JSON format)"
    )
    
    # Address (stored as JSON for flexibility)
    address_json = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Address details (JSON format)"
    )
    
    # Emergency contact
    emergency_json = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Emergency contact details (JSON format)"
    )
    
    # Flags and alerts
    flags_json = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Risk flags, alerts, notes (JSON format)"
    )
    
    # Audit fields
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when patient record was created"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when patient record was last updated"
    )
    
    class Meta:
        db_table = 'patients'
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['mrn']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Patient'
        verbose_name_plural = 'Patients'
    
    def __str__(self):
        """String representation of patient"""
        return f"{self.last_name}, {self.first_name}"
    
    def get_full_name(self):
        """Return patient's full name"""
        parts = [self.first_name]
        if self.middle_names:
            parts.append(self.middle_names)
        parts.append(self.last_name)
        return " ".join(parts)
    
    def archive(self, archived_by=None):
        """Archive this patient (soft delete)"""
        self.archived = True
        self.archived_at = timezone.now()
        self.archived_by = archived_by
        self.save()
    
    def restore(self):
        """Restore this archived patient"""
        self.archived = False
        self.archived_at = None
        self.archived_by = None
        self.save()
    
    def get_age(self):
        """Calculate patient's age in years"""
        if not self.dob:
            return None
        today = timezone.now().date()
        age = today.year - self.dob.year
        # Adjust if birthday hasn't occurred this year
        if today.month < self.dob.month or (today.month == self.dob.month and today.day < self.dob.day):
            age -= 1
        return age
    
    def get_mobile(self):
        """Extract mobile phone from contact_json"""
        if self.contact_json and 'mobile' in self.contact_json:
            return self.contact_json['mobile']
        return None
    
    def get_email(self):
        """Extract email from contact_json"""
        if self.contact_json and 'email' in self.contact_json:
            return self.contact_json['email']
        return None
    
    @property
    def display_name(self):
        """Property for easy display name access"""
        return self.get_full_name()
