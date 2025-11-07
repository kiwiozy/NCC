"""
Serializers for Notes API
"""
from rest_framework import serializers
from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    """Serializer for Note model"""
    
    note_type_label = serializers.CharField(source='get_note_type_display', read_only=True)
    patient_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Note
        fields = [
            'id',
            'patient',
            'patient_name',
            'note_type',
            'note_type_label',
            'content',
            'created_at',
            'updated_at',
            'created_by',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_patient_name(self, obj):
        """Get patient's full name"""
        return obj.patient.get_full_name() if obj.patient else None


class NoteListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for note lists"""
    
    note_type_label = serializers.CharField(source='get_note_type_display', read_only=True)
    
    class Meta:
        model = Note
        fields = [
            'id',
            'note_type',
            'note_type_label',
            'content',
            'created_at',
            'updated_at',
        ]

