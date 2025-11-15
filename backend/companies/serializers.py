from rest_framework import serializers
from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    """
    Serializer for Company model
    """
    
    class Meta:
        model = Company
        fields = [
            'id',
            'name',
            'abn',
            'contact_json',
            'address_json',
            'company_type',
            'filemaker_id',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

