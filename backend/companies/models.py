"""
Company models for WalkEasy Nexus
Based on FileMaker migration schema from: docs/architecture/DATABASE_SCHEMA.md
"""
import uuid
from django.db import models


class Company(models.Model):
    """
    Medical practices, NDIS providers, and other organizations.
    Imported from FileMaker API_Company table (44 records).
    """
    
    COMPANY_TYPE_CHOICES = [
        ('MEDICAL_PRACTICE', 'Medical Practice'),
        ('NDIS_PROVIDER', 'NDIS Provider'),
        ('OTHER', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(
        max_length=200,
        help_text="Company/practice name"
    )
    
    abn = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name="ABN",
        help_text="Australian Business Number"
    )
    
    contact_json = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Contact details (phone, email, fax)"
    )
    
    address_json = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Address details"
    )
    
    company_type = models.CharField(
        max_length=50,
        choices=COMPANY_TYPE_CHOICES,
        default='MEDICAL_PRACTICE',
        help_text="Type of company/organization"
    )
    
    filemaker_id = models.UUIDField(
        unique=True,
        null=True,
        blank=True,
        help_text="Original FileMaker company ID (for import tracking)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'companies'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['company_type']),
        ]
        verbose_name = 'Company'
        verbose_name_plural = 'Companies'
    
    def __str__(self):
        return self.name
