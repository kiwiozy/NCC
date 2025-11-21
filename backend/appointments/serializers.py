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
    
    # Extended properties for the calendar
    extendedProps = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = ['id', 'title', 'start', 'end', 'color', 'extendedProps']
    
    def get_title(self, obj):
        """Generate event title - patient name and clinician"""
        patient_name = obj.patient.get_full_name() if obj.patient else "Unknown"
        clinician_name = obj.clinician.full_name if obj.clinician else ""
        if clinician_name:
            return f"{patient_name} - {clinician_name}"
        return f"{patient_name}"
    
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

