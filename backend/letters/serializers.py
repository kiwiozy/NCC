from rest_framework import serializers
from .models import PatientLetter


class PatientLetterSerializer(serializers.ModelSerializer):
    """Serializer for PatientLetter model"""
    
    preview_text = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientLetter
        fields = [
            'id',
            'patient',
            'patient_name',
            'letter_type',
            'recipient_name',
            'subject',
            'pages',
            'preview_text',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'preview_text', 'patient_name']
    
    def get_preview_text(self, obj):
        return obj.get_preview_text()
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"


class PatientLetterListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for letter list (no full pages content)"""
    
    preview_text = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientLetter
        fields = [
            'id',
            'letter_type',
            'recipient_name',
            'subject',
            'preview_text',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'preview_text']
    
    def get_preview_text(self, obj):
        return obj.get_preview_text()

