"""
Clinician and Clinic models for Nexus Core Clinic
Based on schema from: 02-Target-Postgres-Schema.md
"""
import uuid
from django.db import models


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
