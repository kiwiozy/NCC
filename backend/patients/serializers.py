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
            'dob', 'sex', 'title', 'health_number', 'funding_type', 'clinic',
            'coordinator_name', 'coordinator_date', 'plan_start_date', 'plan_end_date',
            'plan_dates_json', 'notes', 'contact_json', 'address_json', 'emergency_json',
            'flags_json', 'archived', 'archived_at', 'archived_by',
            'created_at', 'updated_at',
            'age', 'full_name', 'mobile', 'email'  # computed fields
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'archived_at', 'age', 'full_name', 'mobile', 'email']
    
    def to_representation(self, instance):
        """Customize serialization to include related object names"""
        representation = super().to_representation(instance)
        if instance.funding_type:
            representation['funding_type'] = {
                'id': str(instance.funding_type.id),
                'name': instance.funding_type.name,
                'code': instance.funding_type.code,
            }
        else:
            representation['funding_type'] = None
        
        if instance.clinic:
            representation['clinic'] = {
                'id': str(instance.clinic.id),
                'name': instance.clinic.name,
            }
        else:
            representation['clinic'] = None
        
        return representation
    
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
        fields = [
            'id', 'mrn', 'full_name', 'dob', 'age', 'clinic', 'funding_type', 
            'first_name', 'last_name', 'middle_names', 'title', 'health_number',
            'contact_json', 'address_json', 'plan_dates_json',  # Include JSON fields for communication/address
            'coordinator_name', 'coordinator_date',  # Include coordinator info
            'notes',  # Include general notes field
        ]
    
    def to_representation(self, instance):
        """Customize serialization to include related object names"""
        representation = super().to_representation(instance)
        
        # Include clinic name if available
        if instance.clinic:
            representation['clinic'] = {
                'id': str(instance.clinic.id),
                'name': instance.clinic.name,
            }
        else:
            representation['clinic'] = None
        
        # Include funding_type name if available
        if instance.funding_type:
            representation['funding_type'] = {
                'id': str(instance.funding_type.id),
                'name': instance.funding_type.name,
                'code': instance.funding_type.code,
            }
        else:
            representation['funding_type'] = None
        
        return representation
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    
    def get_age(self, obj):
        return obj.get_age()

