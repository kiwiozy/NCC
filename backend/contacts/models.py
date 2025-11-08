"""
Contact models for WalkEasy Nexus
Based on FileMaker migration schema from: docs/architecture/DATABASE_SCHEMA.md
"""
import uuid
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey


class GeneralContact(models.Model):
    """
    Non-medical contacts: carers, family, emergency contacts, suppliers, etc.
    No FileMaker import initially - new feature for tracking various contact types.
    """
    
    CONTACT_TYPE_CHOICES = [
        ('CARER', 'Carer'),
        ('FAMILY', 'Family'),
        ('EMERGENCY_CONTACT', 'Emergency Contact'),
        ('SUPPLIER', 'Supplier'),
        ('OTHER', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    first_name = models.CharField(max_length=100, help_text="Contact's first name")
    last_name = models.CharField(max_length=100, help_text="Contact's last name")
    
    contact_type = models.CharField(
        max_length=50,
        choices=CONTACT_TYPE_CHOICES,
        default='OTHER',
        help_text="Type of contact"
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
    
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="Additional notes about this contact"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'general_contacts'
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['contact_type']),
        ]
        verbose_name = 'General Contact'
        verbose_name_plural = 'General Contacts'
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_contact_type_display()})"
    
    def get_full_name(self):
        """Get full name"""
        return f"{self.first_name} {self.last_name}"


class ContactRelationship(models.Model):
    """
    Generic relationship table linking ANY contact to ANY other contact.
    Uses Django's GenericForeignKey to support polymorphic relationships.
    
    Examples:
    - Patient → GeneralContact (carer, emergency contact)
    - Patient → Patient (family member who is also a patient)
    - Referrer → Patient (same person, dual role)
    - Patient → Coordinator (also a patient)
    """
    
    RELATIONSHIP_TYPE_CHOICES = [
        ('CARER', 'Carer'),
        ('PARENT', 'Parent'),
        ('SPOUSE', 'Spouse'),
        ('CHILD', 'Child'),
        ('SIBLING', 'Sibling'),
        ('EMERGENCY_CONTACT', 'Emergency Contact'),
        ('ALSO_PATIENT', 'Also a Patient'),
        ('ALSO_REFERRER', 'Also a Referrer'),
        ('ALSO_COORDINATOR', 'Also a Coordinator'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # "From" contact (source of relationship)
    from_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name='relationships_from',
        help_text="Content type of source contact"
    )
    from_object_id = models.UUIDField(help_text="UUID of source contact")
    from_contact = GenericForeignKey('from_content_type', 'from_object_id')
    
    # "To" contact (target of relationship)
    to_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name='relationships_to',
        help_text="Content type of target contact"
    )
    to_object_id = models.UUIDField(help_text="UUID of target contact")
    to_contact = GenericForeignKey('to_content_type', 'to_object_id')
    
    relationship_type = models.CharField(
        max_length=50,
        choices=RELATIONSHIP_TYPE_CHOICES,
        help_text="Type of relationship"
    )
    
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="Additional relationship notes"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Is this relationship currently active?"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'contact_relationships'
        ordering = ['-is_active', '-created_at']
        indexes = [
            models.Index(fields=['from_content_type', 'from_object_id', 'is_active']),
            models.Index(fields=['to_content_type', 'to_object_id', 'is_active']),
            models.Index(fields=['relationship_type']),
        ]
        verbose_name = 'Contact Relationship'
        verbose_name_plural = 'Contact Relationships'
    
    def __str__(self):
        return f"{self.from_contact} → {self.to_contact} ({self.get_relationship_type_display()})"
