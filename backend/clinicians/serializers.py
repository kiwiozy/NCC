"""
API Serializers for Clinician models
"""
from rest_framework import serializers
from .models import Clinic, Clinician


class ClinicSerializer(serializers.ModelSerializer):
    """Serializer for Clinic model"""
    
    class Meta:
        model = Clinic
        fields = [
            'id', 'name', 'abn', 'phone', 'email', 
            'address_json', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClinicianSerializer(serializers.ModelSerializer):
    """Serializer for Clinician model"""
    
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Clinician
        fields = [
            'id', 'clinic', 'clinic_name', 'full_name', 'credential',
            'email', 'phone', 'role', 'active',
            'created_at', 'updated_at', 'display_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'clinic_name', 'display_name']
    
    def get_display_name(self, obj):
        """Get clinician display name with credentials"""
        return obj.get_display_name()


class ClinicianListSerializer(serializers.ModelSerializer):
    """Simplified serializer for clinician lists (for calendar resources)"""
    
    title = serializers.SerializerMethodField()
    clinic_id = serializers.CharField(source='clinic.id', read_only=True)
    
    class Meta:
        model = Clinician
        fields = ['id', 'title', 'clinic_id', 'active']
    
    def get_title(self, obj):
        """Return display name for FullCalendar"""
        return obj.get_display_name()

