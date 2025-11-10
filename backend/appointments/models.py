"""
Appointment and Encounter models for WalkEasy Nexus
Based on schema from: 02-Target-Postgres-Schema.md
"""
import uuid
from django.db import models
from patients.models import Patient
from clinicians.models import Clinic, Clinician


class AppointmentType(models.Model):
    """
    Lookup table for appointment types (e.g., Initial Consultation, Follow-up, Fitting).
    Managed in Settings by admins.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Name of appointment type (e.g., 'Initial Consultation')"
    )
    
    default_duration_minutes = models.IntegerField(
        default=30,
        help_text="Default duration in minutes"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this type is active and available for use"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'appointment_types'
        ordering = ['name']
        verbose_name = 'Appointment Type'
        verbose_name_plural = 'Appointment Types'
    
    def __str__(self):
        return self.name


class Appointment(models.Model):
    """
    Patient appointments/bookings.
    Represents scheduled visits to the clinic.
    """
    
    # Status choices
    STATUS_SCHEDULED = 'scheduled'
    STATUS_CHECKED_IN = 'checked_in'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_NO_SHOW = 'no_show'
    
    STATUS_CHOICES = [
        (STATUS_SCHEDULED, 'Scheduled'),
        (STATUS_CHECKED_IN, 'Checked In'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_NO_SHOW, 'No Show'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    filemaker_event_id = models.UUIDField(
        null=True,
        blank=True,
        unique=True,
        help_text="Original FileMaker appointment ID (for import tracking)"
    )
    
    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.PROTECT,
        related_name='appointments',
        null=True,
        blank=True,
        help_text="Clinic location for this appointment (null for historical appointments with archived clinics)"
    )
    
    patient = models.ForeignKey(
        Patient,
        on_delete=models.PROTECT,
        related_name='appointments',
        help_text="Patient for this appointment"
    )
    
    clinician = models.ForeignKey(
        Clinician,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appointments',
        help_text="Assigned clinician"
    )
    
    appointment_type = models.ForeignKey(
        AppointmentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appointments',
        help_text="Type of appointment (e.g., Initial Consultation, Follow-up)"
    )
    
    start_time = models.DateTimeField(
        help_text="Appointment start time (UTC, display in Australia/Sydney)"
    )
    
    end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Appointment end time (optional)"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_SCHEDULED,
        help_text="Current appointment status"
    )
    
    reason = models.TextField(
        null=True,
        blank=True,
        help_text="Reason for appointment/chief complaint"
    )
    
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="Additional appointment notes"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'appointments'
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['clinic', '-start_time']),
            models.Index(fields=['patient', '-start_time']),
            models.Index(fields=['clinician', '-start_time']),
            models.Index(fields=['status', '-start_time']),
        ]
        verbose_name = 'Appointment'
        verbose_name_plural = 'Appointments'
    
    def __str__(self):
        return f"{self.patient} - {self.start_time.strftime('%Y-%m-%d %H:%M')} ({self.status})"
    
    def get_duration_minutes(self):
        """Calculate appointment duration in minutes"""
        if self.end_time:
            delta = self.end_time - self.start_time
            return int(delta.total_seconds() / 60)
        return None
    
    def is_past(self):
        """Check if appointment is in the past"""
        from django.utils import timezone
        return self.start_time < timezone.now()
    
    def can_cancel(self):
        """Check if appointment can be cancelled"""
        return self.status in [self.STATUS_SCHEDULED, self.STATUS_CHECKED_IN]


class Encounter(models.Model):
    """
    Clinical encounter/visit record.
    Represents the actual clinical interaction and documentation.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    patient = models.ForeignKey(
        Patient,
        on_delete=models.PROTECT,
        related_name='encounters',
        help_text="Patient for this encounter"
    )
    
    clinician = models.ForeignKey(
        Clinician,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='encounters',
        help_text="Clinician who performed the encounter"
    )
    
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='encounter',
        help_text="Associated appointment (if any)"
    )
    
    start_time = models.DateTimeField(
        help_text="Encounter start time"
    )
    
    end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Encounter end time"
    )
    
    type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=[
            ('ASSESSMENT', 'Initial Assessment'),
            ('FITTING', 'Fitting'),
            ('REVIEW', 'Review'),
            ('FOLLOW_UP', 'Follow-up'),
            ('OTHER', 'Other'),
        ],
        help_text="Type of encounter"
    )
    
    reason = models.TextField(
        null=True,
        blank=True,
        help_text="Reason for encounter"
    )
    
    summary = models.TextField(
        null=True,
        blank=True,
        help_text="Clinical summary/notes"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'encounters'
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['patient', '-start_time']),
            models.Index(fields=['clinician', '-start_time']),
        ]
        verbose_name = 'Encounter'
        verbose_name_plural = 'Encounters'
    
    def __str__(self):
        return f"{self.patient} - {self.start_time.strftime('%Y-%m-%d')} ({self.type or 'Encounter'})"
