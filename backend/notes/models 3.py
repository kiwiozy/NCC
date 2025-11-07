"""
Notes models for WalkEasy Nexus
Patient-specific notes with different types (clinical notes, clinic dates, etc.)
"""
import uuid
from django.db import models
from django.utils import timezone


class Note(models.Model):
    """
    Patient-specific notes with different types
    Supports clinical notes, clinic dates, order notes, admin notes, etc.
    """
    
    NOTE_TYPE_CHOICES = [
        ('clinical_notes', 'Clinical Notes'),
        ('clinic_dates', 'Clinic Dates'),
        ('order_notes', 'Order Notes'),
        ('admin_notes', 'Admin Notes'),
        ('referral', 'Referral'),
        ('3d_scan_data', '3D Scan Data'),
        ('workshop_note', 'Workshop Note'),
        ('other', 'Other'),
    ]
    
    # Primary identifier
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique note identifier (UUID)"
    )
    
    # Patient (required)
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='patient_notes',
        help_text="Patient this note belongs to"
    )
    
    # Note type
    note_type = models.CharField(
        max_length=50,
        choices=NOTE_TYPE_CHOICES,
        default='clinical_notes',
        help_text="Type of note"
    )
    
    # Note content
    content = models.TextField(
        help_text="Note content"
    )
    
    # Audit fields
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when note was created"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when note was last updated"
    )
    
    # Who created it
    created_by = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="User who created this note (optional)"
    )
    
    class Meta:
        db_table = 'notes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient']),
            models.Index(fields=['note_type']),
            models.Index(fields=['patient', 'note_type']),
            models.Index(fields=['-created_at']),
        ]
        verbose_name = 'Note'
        verbose_name_plural = 'Notes'
    
    def __str__(self):
        """String representation of note"""
        patient_name = self.patient.get_full_name() if self.patient else "Unknown"
        note_type_label = dict(self.NOTE_TYPE_CHOICES).get(self.note_type, self.note_type)
        return f"{note_type_label} for {patient_name}"
