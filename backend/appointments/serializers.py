"""
API Serializers for Appointment models
"""
from rest_framework import serializers
from .models import Appointment, Encounter, AppointmentType
from patients.serializers import PatientListSerializer
from clinicians.serializers import ClinicianListSerializer


class AppointmentTypeSerializer(serializers.ModelSerializer):
    """Serializer for AppointmentType model"""
    
    class Meta:
        model = AppointmentType
        fields = [
            'id', 'name', 'default_duration_minutes', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AppointmentSerializer(serializers.ModelSerializer):
    """Serializer for Appointment model"""
    
    patient_name = serializers.SerializerMethodField()
    clinician_name = serializers.SerializerMethodField()
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    appointment_type_name = serializers.CharField(source='appointment_type.name', read_only=True)
    duration_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'clinic', 'clinic_name', 'patient', 'patient_name',
            'clinician', 'clinician_name', 'appointment_type', 'appointment_type_name',
            'start_time', 'end_time', 'status', 'reason', 'notes', 'duration_minutes',
            'parent_appointment', 'needs_followup_reminder', 'followup_scheduled',
            # Recurring fields (added Nov 2025)
            'is_recurring', 'recurrence_pattern', 'recurrence_group_id', 'recurrence_end_date',
            'created_at', 'updated_at',
            # Xero billing fields (added Nov 2025)
            'invoice_contact_type', 'billing_company', 'billing_notes',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'patient_name', 'clinician_name', 'clinic_name', 'appointment_type_name', 'duration_minutes']
    
    def get_patient_name(self, obj):
        """Get patient full name"""
        return obj.patient.get_full_name() if obj.patient else None
    
    def get_clinician_name(self, obj):
        """Get clinician display name"""
        return obj.clinician.get_display_name() if obj.clinician else None
    
    def get_duration_minutes(self, obj):
        """Get appointment duration"""
        return obj.get_duration_minutes()


class AppointmentCalendarSerializer(serializers.ModelSerializer):
    """Serializer for calendar view - FullCalendar format (single timeline, color by clinic)"""
    
    # FullCalendar event fields
    title = serializers.SerializerMethodField()
    start = serializers.DateTimeField(source='start_time')
    end = serializers.DateTimeField(source='end_time')
    color = serializers.SerializerMethodField()
    allDay = serializers.SerializerMethodField()
    
    # Extended properties for the calendar
    extendedProps = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = ['id', 'title', 'start', 'end', 'color', 'allDay', 'extendedProps']
    
    def get_title(self, obj):
        """Generate event title - patient name | appointment type"""
        if obj.patient:
            # Regular appointment with patient
            patient_name = obj.patient.get_full_name()
            appointment_type = obj.appointment_type.name if obj.appointment_type else None
            
            if appointment_type:
                return f"{patient_name} | {appointment_type}"
            return f"{patient_name}"
        else:
            # All-day event without patient (holiday, closure, etc.)
            # Format: "Clinic Name - Event Notes"
            clinic_name = obj.clinic.name if obj.clinic else "Unknown"
            event_notes = obj.notes or "All-Day Event"
            return f"{clinic_name} - {event_notes}"
    
    def get_allDay(self, obj):
        """Determine if this is an all-day event"""
        # If no patient, it's an all-day clinic event
        if not obj.patient:
            return True
        
        # Check if appointment spans entire day (00:00 to 23:59)
        duration = obj.get_duration_minutes()
        if duration >= 1439:  # 23 hours 59 minutes or more
            return True
        
        return False
    
    def get_color(self, obj):
        """Get color based on status"""
        color_map = {
            'scheduled': '#3b82f6',  # Blue
            'checked_in': '#22c55e',  # Green
            'completed': '#8b5cf6',   # Purple
            'cancelled': '#ef4444',   # Red
            'no_show': '#f59e0b',     # Orange
        }
        return color_map.get(obj.status, '#3b82f6')
    
    def get_extendedProps(self, obj):
        """Additional properties for calendar events"""
        return {
            'clinicId': str(obj.clinic.id) if obj.clinic else None,
            'clinicName': obj.clinic.name if obj.clinic else None,
            'patientName': obj.patient.get_full_name() if obj.patient else None,
            'patientId': str(obj.patient.id) if obj.patient else None,
            'clinicianName': obj.clinician.full_name if obj.clinician else None,
            'status': obj.status,
            'reason': obj.reason,
            'notes': obj.notes,
            # SMS Confirmation fields
            'smsReminderSentAt': obj.sms_reminder_sent_at.isoformat() if obj.sms_reminder_sent_at else None,
            'smsConfirmed': obj.sms_confirmed,
            'smsConfirmedAt': obj.sms_confirmed_at.isoformat() if obj.sms_confirmed_at else None,
            'smsConfirmationMessage': obj.sms_confirmation_message,
        }


class EncounterSerializer(serializers.ModelSerializer):
    """Serializer for Encounter model"""
    
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    clinician_name = serializers.CharField(source='clinician.get_display_name', read_only=True)
    
    class Meta:
        model = Encounter
        fields = [
            'id', 'patient', 'patient_name', 'clinician', 'clinician_name',
            'appointment', 'start_time', 'end_time', 'type', 'reason',
            'summary', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'patient_name', 'clinician_name']

