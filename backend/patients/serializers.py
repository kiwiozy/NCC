"""
API Serializers for Patient models
"""
from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    """Serializer for Patient model"""
    
    age = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    mobile = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = [
            'id', 'mrn', 'first_name', 'last_name', 'middle_names',
            'dob', 'sex', 'contact_json', 'address_json', 'emergency_json',
            'flags_json', 'created_at', 'updated_at',
            'age', 'full_name', 'mobile', 'email'  # computed fields
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'age', 'full_name', 'mobile', 'email']
    
    def get_age(self, obj):
        """Get patient age"""
        return obj.get_age()
    
    def get_full_name(self, obj):
        """Get patient full name"""
        return obj.get_full_name()
    
    def get_mobile(self, obj):
        """Get patient mobile phone"""
        return obj.get_mobile()
    
    def get_email(self, obj):
        """Get patient email"""
        return obj.get_email()


class PatientListSerializer(serializers.ModelSerializer):
    """Simplified serializer for patient lists"""
    
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = ['id', 'mrn', 'full_name', 'dob', 'age']
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    
    def get_age(self, obj):
        return obj.get_age()

