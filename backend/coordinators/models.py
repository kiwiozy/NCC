"""
Coordinator models for WalkEasy Nexus
Based on FileMaker migration schema from: docs/architecture/DATABASE_SCHEMA.md
"""
import uuid
from django.db import models
from patients.models import Patient


class Coordinator(models.Model):
    """
    NDIS Support Coordinators and LAC (Local Area Coordinators).
    Extracted from patients.coordinator_name field (~50 unique coordinators).
    """
    
    COORDINATOR_TYPE_CHOICES = [
        ('SUPPORT_COORDINATOR', 'Support Coordinator'),
        ('LAC', 'LAC (Local Area Coordinator)'),
        ('PLAN_MANAGER', 'Plan Manager'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    first_name = models.CharField(max_length=100, help_text="Coordinator's first name")
    last_name = models.CharField(max_length=100, help_text="Coordinator's last name")
    
    organization = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text="Organization (e.g., Ability Connect, Afford)"
    )
    
    coordinator_type = models.CharField(
        max_length=50,
        choices=COORDINATOR_TYPE_CHOICES,
        default='SUPPORT_COORDINATOR',
        help_text="Type of coordinator"
    )
    
    contact_json = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Contact details (phone, email, mobile)"
    )
    
    address_json = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Address details"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'coordinators'
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['organization']),
        ]
        verbose_name = 'Coordinator'
        verbose_name_plural = 'Coordinators'
    
    def __str__(self):
        name = f"{self.first_name} {self.last_name}"
        if self.organization:
            name = f"{name} ({self.organization})"
        return name
    
    def get_full_name(self):
        """Get full name"""
        return f"{self.first_name} {self.last_name}"


class PatientCoordinator(models.Model):
    """
    Join table linking patients to coordinators with historical tracking.
    Each patient can have multiple coordinators over time.
    Coordinators change frequently, so we need to track the full history.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='patient_coordinators',
        help_text="Patient being coordinated"
    )
    
    coordinator = models.ForeignKey(
        Coordinator,
        on_delete=models.PROTECT,
        related_name='patient_coordinators',
        help_text="Coordinator assigned to patient"
    )
    
    assignment_date = models.DateField(
        help_text="Date coordinator was assigned to patient"
    )
    
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date assignment ended (null if still current)"
    )
    
    is_current = models.BooleanField(
        default=True,
        help_text="Is this the current coordinator?"
    )
    
    ndis_plan_start = models.DateField(
        null=True,
        blank=True,
        help_text="NDIS plan start date for this coordinator period"
    )
    
    ndis_plan_end = models.DateField(
        null=True,
        blank=True,
        help_text="NDIS plan end date for this coordinator period"
    )
    
    ndis_notes = models.TextField(
        null=True,
        blank=True,
        help_text="Notes specific to this coordinator assignment period"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'patient_coordinators'
        ordering = ['-is_current', '-assignment_date']
        indexes = [
            models.Index(fields=['patient', 'is_current']),
            models.Index(fields=['coordinator', 'is_current']),
            models.Index(fields=['assignment_date']),
        ]
        verbose_name = 'Patient Coordinator'
        verbose_name_plural = 'Patient Coordinators'
    
    def __str__(self):
        status = "Current" if self.is_current else "Historical"
        return f"{self.patient} ← {self.coordinator} ({status})"
