"""
Reminder models for WalkEasy Nexus
Reminders are created from patient profiles and appear in calendar as waiting list
"""
import uuid
from django.db import models
from django.utils import timezone


class Reminder(models.Model):
    """
    Reminder for scheduling patients
    Created from patient profile, appears in calendar waiting list
    Can be converted to appointment when scheduling
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),  # Converted to appointment
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Primary identifier
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique reminder identifier (UUID)"
    )
    
    # Patient (required)
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='reminders',
        help_text="Patient this reminder is for"
    )
    
    # Clinic (optional)
    clinic = models.ForeignKey(
        'clinicians.Clinic',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reminders',
        help_text="Clinic location for this reminder"
    )
    
    # Reminder note
    note = models.TextField(
        help_text="Reminder note/description"
    )
    
    # Optional reminder date
    reminder_date = models.DateField(
        null=True,
        blank=True,
        help_text="Specific date for this reminder (optional)"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Reminder status"
    )
    
    # Link to appointment if converted
    appointment_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Link to appointment if reminder was converted"
    )
    
    # Audit fields
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when reminder was created"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when reminder was last updated"
    )
    
    # When converted to appointment
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when reminder was converted to appointment"
    )
    
    # Who created it
    created_by = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="User who created this reminder (optional)"
    )
    
    class Meta:
        db_table = 'reminders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['clinic', 'status']),
            models.Index(fields=['patient']),
            models.Index(fields=['reminder_date']),
        ]
        verbose_name = 'Reminder'
        verbose_name_plural = 'Reminders'
    
    def __str__(self):
        """String representation of reminder"""
        patient_name = self.patient.get_full_name() if self.patient else "Unknown"
        return f"Reminder for {patient_name} - {self.status}"
    
    def convert_to_appointment(self, appointment_id, scheduled_at=None):
        """Mark reminder as scheduled and link to appointment"""
        self.status = 'scheduled'
        self.appointment_id = appointment_id
        self.scheduled_at = scheduled_at or timezone.now()
        self.save()
