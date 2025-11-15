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
    referrers = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = [
            'id', 'mrn', 'first_name', 'last_name', 'middle_names',
            'dob', 'sex', 'title', 'health_number', 'funding_type', 'clinic',
            'coordinator_name', 'coordinator_date', 'plan_start_date', 'plan_end_date',
            'plan_dates_json', 'ndis_plan_start_date', 'ndis_plan_end_date', 'notes', 'filemaker_metadata', 'contact_json', 'address_json', 'emergency_json',
            'flags_json', 'archived', 'archived_at', 'archived_by',
            'created_at', 'updated_at',
            'age', 'full_name', 'mobile', 'email', 'referrers'  # computed fields
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'archived_at', 'age', 'full_name', 'mobile', 'email', 'referrers']
    
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
                'color': instance.clinic.color,
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
    
    def get_referrers(self, obj):
        """Get patient's referrers (PatientReferrer relationships)"""
        try:
            from referrers.models import PatientReferrer
            patient_referrers = PatientReferrer.objects.filter(
                patient=obj,
                status='ACTIVE'
            ).select_related('referrer', 'referrer__specialty').order_by('-is_primary', '-referral_date', '-updated_at')
            
            return [{
                'id': str(pr.id),
                'referrer_id': str(pr.referrer.id),
                'name': pr.referrer.get_full_name(),
                'specialty': pr.referrer.specialty.name if pr.referrer.specialty else None,
                'practice_name': pr.referrer.practice_name,
                'referral_date': pr.referral_date.strftime('%Y-%m-%d') if pr.referral_date else None,
                'referral_reason': pr.referral_reason,
                'status': pr.status,
                'is_primary': pr.is_primary,
            } for pr in patient_referrers]
        except Exception as e:
            # If referrers app not available or error, return empty list
            return []


class PatientListSerializer(serializers.ModelSerializer):
    """Simplified serializer for patient lists"""
    
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    referrers = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = [
            'id', 'mrn', 'full_name', 'dob', 'age', 'clinic', 'funding_type', 
            'first_name', 'last_name', 'middle_names', 'title', 'health_number',
            'contact_json', 'address_json', 'plan_dates_json',  # Include JSON fields for communication/address
            'ndis_plan_start_date', 'ndis_plan_end_date',  # Include NDIS plan dates from import
            'coordinator_name', 'coordinator_date',  # Include coordinator info
            'notes',  # Include general notes field
            'filemaker_metadata',  # Include FileMaker import metadata
            'referrers',  # Include referrers
        ]
    
    def to_representation(self, instance):
        """Customize serialization to include related object names"""
        representation = super().to_representation(instance)
        
        # Include clinic name if available
        if instance.clinic:
            representation['clinic'] = {
                'id': str(instance.clinic.id),
                'name': instance.clinic.name,
                'color': instance.clinic.color,
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
    
    def get_referrers(self, obj):
        """Get patient's referrers (PatientReferrer relationships)"""
        try:
            from referrers.models import PatientReferrer
            patient_referrers = PatientReferrer.objects.filter(
                patient=obj,
                status='ACTIVE'
            ).select_related('referrer', 'referrer__specialty').order_by('-is_primary', '-referral_date', '-updated_at')
            
            return [{
                'id': str(pr.id),
                'referrer_id': str(pr.referrer.id),
                'name': pr.referrer.get_full_name(),
                'specialty': pr.referrer.specialty.name if pr.referrer.specialty else None,
                'practice_name': pr.referrer.practice_name,
                'referral_date': pr.referral_date.strftime('%Y-%m-%d') if pr.referral_date else None,
                'referral_reason': pr.referral_reason,
                'status': pr.status,
                'is_primary': pr.is_primary,
            } for pr in patient_referrers]
        except Exception as e:
            # If referrers app not available or error, return empty list
            return []

