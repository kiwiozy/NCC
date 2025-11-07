"""
API Serializers for Reminder models
"""
from rest_framework import serializers
from .models import Reminder
from patients.serializers import PatientListSerializer


class ReminderSerializer(serializers.ModelSerializer):
    """Serializer for Reminder model"""
    
    patient_name = serializers.SerializerMethodField()
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    
    class Meta:
        model = Reminder
        fields = [
            'id', 'patient', 'patient_name', 'clinic', 'clinic_name',
            'note', 'reminder_date', 'status', 'appointment_id',
            'created_at', 'updated_at', 'scheduled_at', 'created_by'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'patient_name', 'clinic_name',
            'scheduled_at', 'appointment_id'
        ]
    
    def get_patient_name(self, obj):
        """Get patient full name"""
        return obj.patient.get_full_name() if obj.patient else None


class ReminderListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list view"""
    
    patient_name = serializers.SerializerMethodField()
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    
    class Meta:
        model = Reminder
        fields = [
            'id', 'patient', 'patient_name', 'clinic', 'clinic_name',
            'note', 'reminder_date', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'patient_name', 'clinic_name', 'created_at']
    
    def get_patient_name(self, obj):
        """Get patient full name"""
        return obj.patient.get_full_name() if obj.patient else None

