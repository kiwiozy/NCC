"""
API Serializers for Settings models
"""
from rest_framework import serializers
from .models import FundingSource


class FundingSourceSerializer(serializers.ModelSerializer):
    """Serializer for FundingSource model"""
    
    class Meta:
        model = FundingSource
        fields = [
            'id', 'name', 'code', 'active', 'order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

