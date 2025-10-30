from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for Document model"""
    
    file_size_display = serializers.CharField(source='get_file_size_display', read_only=True)
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id',
            'file_name',
            'original_name',
            'file_size',
            'file_size_display',
            'mime_type',
            's3_bucket',
            's3_key',
            'download_url',
            'category',
            'description',
            'tags',
            'uploaded_by',
            'uploaded_at',
            'updated_at',
            'is_active',
            'content_type',
            'object_id',
        ]
        read_only_fields = [
            'id',
            'file_size',
            's3_bucket',
            's3_key',
            'uploaded_at',
            'updated_at',
        ]
    
    def get_download_url(self, obj):
        """Generate a pre-signed URL for download"""
        from .services import S3Service
        try:
            s3_service = S3Service()
            return s3_service.generate_presigned_url(
                obj.s3_key, 
                expiration=3600,
                filename=obj.original_name
            )
        except Exception:
            return None


class DocumentUploadSerializer(serializers.Serializer):
    """Serializer for uploading documents"""
    
    file = serializers.FileField()
    category = serializers.ChoiceField(choices=Document.CATEGORY_CHOICES, default='other')
    description = serializers.CharField(required=False, allow_blank=True)
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    content_type_id = serializers.IntegerField(required=False)
    object_id = serializers.UUIDField(required=False)
    uploaded_by = serializers.CharField(required=False, allow_blank=True)

