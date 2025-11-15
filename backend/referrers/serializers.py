from rest_framework import serializers
from .models import Referrer, Specialty, PatientReferrer, ReferrerCompany


class SpecialtySerializer(serializers.ModelSerializer):
    """
    Serializer for Specialty model
    """
    
    class Meta:
        model = Specialty
        fields = ['id', 'name']


class ReferrerSerializer(serializers.ModelSerializer):
    """
    Serializer for Referrer model
    """
    specialty_name = serializers.CharField(source='specialty.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Referrer
        fields = [
            'id',
            'title',
            'first_name',
            'last_name',
            'full_name',
            'specialty',
            'specialty_name',
            'contact_json',
            'address_json',
            'practice_name',
            'company',
            'company_name',
            'filemaker_id',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'full_name', 'specialty_name', 'company_name']
    
    def get_full_name(self, obj):
        """Get full name with title"""
        return obj.get_full_name()


class PatientReferrerSerializer(serializers.ModelSerializer):
    """
    Serializer for PatientReferrer join table
    """
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    referrer_name = serializers.CharField(source='referrer.get_full_name', read_only=True)
    
    class Meta:
        model = PatientReferrer
        fields = [
            'id',
            'patient',
            'patient_name',
            'referrer',
            'referrer_name',
            'referral_date',
            'referral_reason',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'patient_name', 'referrer_name']


class ReferrerCompanySerializer(serializers.ModelSerializer):
    """
    Serializer for ReferrerCompany join table
    """
    referrer_name = serializers.CharField(source='referrer.get_full_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = ReferrerCompany
        fields = [
            'id',
            'referrer',
            'referrer_name',
            'company',
            'company_name',
            'position',
            'is_primary',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'referrer_name', 'company_name']

