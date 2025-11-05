from rest_framework import serializers
from .models import ImageBatch, Image
from documents.services import S3Service


class ImageSerializer(serializers.ModelSerializer):
    """Serializer for individual images with S3 URLs"""
    
    download_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Image
        fields = [
            'id', 'batch', 'original_name', 'file_size', 'mime_type',
            'width', 'height', 'category', 'caption', 'date_taken',
            'order', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
            'download_url', 'thumbnail_url', 's3_key', 's3_thumbnail_key'
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at', 's3_key', 's3_thumbnail_key']
    
    def get_download_url(self, obj):
        """Generate presigned URL for full-size image"""
        s3_service = S3Service()
        return s3_service.generate_presigned_url(
            obj.s3_key,
            expiration=3600,
            filename=obj.original_name
        )
    
    def get_thumbnail_url(self, obj):
        """Generate presigned URL for thumbnail (if exists)"""
        if not obj.s3_thumbnail_key:
            return None
        s3_service = S3Service()
        return s3_service.generate_presigned_url(
            obj.s3_thumbnail_key,
            expiration=3600
        )
    
    def get_uploaded_by_name(self, obj):
        """Get uploader's name"""
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None


class ImageBatchSerializer(serializers.ModelSerializer):
    """Serializer for image batches with image count and preview"""
    
    images = ImageSerializer(many=True, read_only=True)
    uploaded_by_name = serializers.SerializerMethodField()
    first_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ImageBatch
        fields = [
            'id', 'name', 'description', 'image_count',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at',
            'images', 'first_image_url',
            'content_type', 'object_id'
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at', 'image_count', 'content_type']
    
    def get_uploaded_by_name(self, obj):
        """Get uploader's name"""
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None
    
    def get_first_image_url(self, obj):
        """Get thumbnail of first image for batch preview"""
        first_image = obj.images.first()
        if not first_image:
            return None
        
        s3_service = S3Service()
        # Use thumbnail if available, otherwise full image
        key = first_image.s3_thumbnail_key or first_image.s3_key
        return s3_service.generate_presigned_url(key, expiration=3600)


class ImageBatchListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for batch list (without images)"""
    
    uploaded_by_name = serializers.SerializerMethodField()
    first_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ImageBatch
        fields = [
            'id', 'name', 'description', 'image_count',
            'uploaded_by_name', 'uploaded_at', 'first_image_url'
        ]
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None
    
    def get_first_image_url(self, obj):
        first_image = obj.images.first()
        if not first_image:
            return None
        
        s3_service = S3Service()
        key = first_image.s3_thumbnail_key or first_image.s3_key
        return s3_service.generate_presigned_url(key, expiration=3600)

