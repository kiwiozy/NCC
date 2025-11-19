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
            'address_json', 'color', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClinicianSerializer(serializers.ModelSerializer):
    """Serializer for Clinician model"""
    
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    display_name = serializers.SerializerMethodField()
    signature_url = serializers.SerializerMethodField()
    full_credentials_display = serializers.SerializerMethodField()
    username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    user_email = serializers.CharField(source='user.email', read_only=True, allow_null=True)
    
    class Meta:
        model = Clinician
        fields = [
            'id', 'clinic', 'clinic_name', 'full_name', 'credential',
            'email', 'phone', 'role', 'active',
            # User profile fields
            'user', 'username', 'user_email',
            'registration_number', 'professional_body_url',
            'signature_image', 'signature_html', 'signature_url',
            'created_at', 'updated_at', 
            'display_name', 'full_credentials_display'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'clinic_name', 
            'display_name', 'full_credentials_display', 'signature_url',
            'username', 'user_email'
        ]
    
    def validate_professional_body_url(self, value):
        """
        Automatically prepend https:// to professional body URL if protocol is missing
        Also validates that it's a valid URL format
        """
        if value and value.strip():
            value = value.strip()
            # If it doesn't start with http:// or https://, add https://
            if not value.startswith(('http://', 'https://')):
                value = f'https://{value}'
            
            # Basic validation: should contain at least one dot
            if '.' not in value:
                raise serializers.ValidationError("Enter a valid URL (e.g., www.example.com)")
        
        return value
    
    def get_display_name(self, obj):
        """Get clinician display name with credentials"""
        return obj.get_display_name()
    
    def get_signature_url(self, obj):
        """Get presigned S3 URL for signature image"""
        return obj.get_signature_url()
    
    def get_full_credentials_display(self, obj):
        """Get full credentials display with registration and URL"""
        return obj.get_full_credentials_display()


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

