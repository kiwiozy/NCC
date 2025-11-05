from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.db.models import Q

from .models import ImageBatch, Image
from .serializers import ImageBatchSerializer, ImageBatchListSerializer, ImageSerializer
from documents.services import S3Service

import uuid
from datetime import datetime


class ImageBatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing image batches.
    
    Endpoints:
    - GET /api/images/batches/ - List batches (filtered by patient_id)
    - POST /api/images/batches/ - Create new batch
    - GET /api/images/batches/{id}/ - Get batch with images
    - PUT /api/images/batches/{id}/ - Update batch (rename)
    - DELETE /api/images/batches/{id}/ - Delete batch and all images
    - POST /api/images/batches/{id}/upload/ - Upload images to batch
    """
    
    queryset = ImageBatch.objects.all()
    serializer_class = ImageBatchSerializer
    
    def get_queryset(self):
        """Filter batches by patient_id or other content object"""
        queryset = super().get_queryset()
        
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            # Get Patient content type
            from patients.models import Patient
            content_type = ContentType.objects.get_for_model(Patient)
            queryset = queryset.filter(
                content_type=content_type,
                object_id=patient_id
            )
        
        return queryset.prefetch_related('images')
    
    def get_serializer_class(self):
        """Use lightweight serializer for list view"""
        if self.action == 'list':
            return ImageBatchListSerializer
        return ImageBatchSerializer
    
    def perform_create(self, serializer):
        """Set uploaded_by when creating batch"""
        serializer.save(uploaded_by=self.request.user if self.request.user.is_authenticated else None)
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request, pk=None):
        """
        Upload images to an existing batch.
        
        Request:
        - POST /api/images/batches/{id}/upload/
        - FormData with files and metadata
        
        Body:
        - images: File[] (multiple images)
        - categories: string[] (category for each image)
        - captions: string[] (optional caption for each image)
        """
        batch = self.get_object()
        s3_service = S3Service()
        
        uploaded_images = []
        errors = []
        
        # Get uploaded files
        files = request.FILES.getlist('images')
        categories = request.POST.getlist('categories')
        captions = request.POST.getlist('captions')
        
        for idx, file in enumerate(files):
            try:
                # Generate S3 key: images/{patient_id}/{batch_id}/{uuid}.ext
                file_ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
                s3_key = f"images/{batch.object_id}/{batch.id}/{uuid.uuid4()}.{file_ext}"
                
                # Upload to S3
                success = s3_service.upload_file(file, s3_key)
                
                if not success:
                    errors.append(f"Failed to upload {file.name} to S3")
                    continue
                
                # Create Image record
                image = Image.objects.create(
                    batch=batch,
                    s3_key=s3_key,
                    original_name=file.name,
                    file_size=file.size,
                    mime_type=file.content_type or 'image/jpeg',
                    category=categories[idx] if idx < len(categories) else 'other',
                    caption=captions[idx] if idx < len(captions) else '',
                    uploaded_by=request.user if request.user.is_authenticated else None,
                    order=batch.images.count()
                )
                
                uploaded_images.append(ImageSerializer(image).data)
                
            except Exception as e:
                errors.append(f"Error uploading {file.name}: {str(e)}")
        
        # Update batch image count
        batch.update_image_count()
        
        return Response({
            'success': len(uploaded_images),
            'uploaded': uploaded_images,
            'errors': errors,
            'batch': ImageBatchSerializer(batch).data
        }, status=status.HTTP_201_CREATED if uploaded_images else status.HTTP_400_BAD_REQUEST)


class ImageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing individual images.
    
    Endpoints:
    - GET /api/images/ - List images (filtered by batch_id or patient_id)
    - GET /api/images/{id}/ - Get image details
    - PUT /api/images/{id}/ - Update image metadata (category, caption, date)
    - DELETE /api/images/{id}/ - Delete image
    - POST /api/images/{id}/move/ - Move image to different batch
    """
    
    queryset = Image.objects.all()
    serializer_class = ImageSerializer
    
    def get_queryset(self):
        """Filter images by batch_id or patient_id"""
        queryset = super().get_queryset()
        
        batch_id = self.request.query_params.get('batch_id')
        if batch_id:
            queryset = queryset.filter(batch_id=batch_id)
        
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            from patients.models import Patient
            content_type = ContentType.objects.get_for_model(Patient)
            queryset = queryset.filter(
                batch__content_type=content_type,
                batch__object_id=patient_id
            )
        
        return queryset.select_related('batch')
    
    def perform_destroy(self, instance):
        """Delete from S3 when deleting image"""
        s3_service = S3Service()
        
        # Delete full image
        s3_service.delete_file(instance.s3_key)
        
        # Delete thumbnail if exists
        if instance.s3_thumbnail_key:
            s3_service.delete_file(instance.s3_thumbnail_key)
        
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """
        Move image to a different batch.
        
        Request:
        - POST /api/images/{id}/move/
        - Body: { "batch_id": "uuid" }
        """
        image = self.get_object()
        new_batch_id = request.data.get('batch_id')
        
        if not new_batch_id:
            return Response(
                {'error': 'batch_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            new_batch = ImageBatch.objects.get(id=new_batch_id)
            old_batch = image.batch
            
            # Move image
            image.batch = new_batch
            image.order = new_batch.images.count()
            image.save()
            
            # Update both batch counts
            old_batch.update_image_count()
            new_batch.update_image_count()
            
            return Response({
                'message': 'Image moved successfully',
                'image': ImageSerializer(image).data
            })
            
        except ImageBatch.DoesNotExist:
            return Response(
                {'error': 'Batch not found'},
                status=status.HTTP_404_NOT_FOUND
            )
