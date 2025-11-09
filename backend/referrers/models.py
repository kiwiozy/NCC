"""
Referrer models for WalkEasy Nexus
Based on FileMaker migration schema from: docs/architecture/DATABASE_SCHEMA.md
"""
import uuid
from django.db import models
from patients.models import Patient


class Specialty(models.Model):
    """
    Medical specialties lookup table.
    Examples: GP, Physiotherapist, Occupational Therapist, Psychologist, Podiatrist
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, help_text="Medical specialty name")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'specialties'
        ordering = ['name']
        verbose_name = 'Specialty'
        verbose_name_plural = 'Specialties'
    
    def __str__(self):
        return self.name


class Referrer(models.Model):
    """
    Medical professionals who refer patients (GPs, specialists, podiatrists, etc.)
    Imported from FileMaker API_Referrer table (98 records).
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    title = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        help_text="Title: Mr, Mrs, Dr, Prof, etc."
    )
    
    first_name = models.CharField(max_length=100, help_text="Referrer's first name")
    last_name = models.CharField(max_length=100, help_text="Referrer's last name")
    
    specialty = models.ForeignKey(
        Specialty,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referrers',
        help_text="Medical specialty"
    )
    
    contact_json = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Contact details (phone, email, mobile) - same structure as patients"
    )
    
    address_json = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Address details"
    )
    
    practice_name = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text="Name of medical practice"
    )
    
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referrers',
        help_text="Links to medical practice/company"
    )
    
    filemaker_id = models.UUIDField(
        unique=True,
        null=True,
        blank=True,
        help_text="Original FileMaker referrer ID (for import tracking)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'referrers'
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['specialty']),
        ]
        verbose_name = 'Referrer'
        verbose_name_plural = 'Referrers'
    
    def __str__(self):
        name = f"{self.first_name} {self.last_name}"
        if self.title:
            name = f"{self.title} {name}"
        if self.specialty:
            name = f"{name} ({self.specialty.name})"
        return name
    
    def get_full_name(self):
        """Get full name with title"""
        if self.title:
            return f"{self.title} {self.first_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"


class PatientReferrer(models.Model):
    """
    Join table linking patients to referrers with referral metadata.
    Imported from FileMaker API_ContactToReferrer table (255 records).
    """
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('PENDING', 'Pending'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='patient_referrers',
        help_text="Patient being referred"
    )
    
    referrer = models.ForeignKey(
        Referrer,
        on_delete=models.CASCADE,
        related_name='patient_referrers',
        help_text="Referrer who referred the patient"
    )
    
    referral_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date of referral"
    )
    
    referral_reason = models.TextField(
        null=True,
        blank=True,
        help_text="Reason for referral"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ACTIVE',
        help_text="Referral status"
    )
    
    filemaker_id = models.UUIDField(
        unique=True,
        null=True,
        blank=True,
        help_text="Original FileMaker join record ID"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'patient_referrers'
        unique_together = [('patient', 'referrer')]
        ordering = ['-referral_date']
        indexes = [
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['referrer', 'status']),
        ]
        verbose_name = 'Patient Referrer'
        verbose_name_plural = 'Patient Referrers'
    
    def __str__(self):
        return f"{self.patient} ← {self.referrer}"


class ReferrerCompany(models.Model):
    """
    Join table linking referrers to companies.
    A doctor can work at multiple practices.
    Imported from FileMaker API_ReferrerToCompany_Join table (73 records).
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    referrer = models.ForeignKey(
        Referrer,
        on_delete=models.CASCADE,
        related_name='referrer_companies',
        help_text="Referrer"
    )
    
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='referrer_companies',
        help_text="Company/Medical Practice"
    )
    
    position = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Position at practice (e.g., Senior Podiatrist, GP Partner)"
    )
    
    is_primary = models.BooleanField(
        default=False,
        help_text="Is this their primary practice?"
    )
    
    filemaker_id = models.UUIDField(
        unique=True,
        null=True,
        blank=True,
        help_text="Original FileMaker join record ID"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'referrer_companies'
        unique_together = [('referrer', 'company')]
        ordering = ['-is_primary', 'company__name']
        indexes = [
            models.Index(fields=['referrer', 'is_primary']),
            models.Index(fields=['company']),
        ]
        verbose_name = 'Referrer Company'
        verbose_name_plural = 'Referrer Companies'
    
    def __str__(self):
        primary = " (Primary)" if self.is_primary else ""
        return f"{self.referrer} @ {self.company}{primary}"
