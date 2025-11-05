from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.db.models import Q
from django.core.files.uploadedfile import InMemoryUploadedFile

from .models import ImageBatch, Image
from .serializers import ImageBatchSerializer, ImageBatchListSerializer, ImageSerializer
from documents.services import S3Service

import uuid
from datetime import datetime
from PIL import Image as PILImage
from io import BytesIO
import sys


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
        """
        Set uploaded_by and convert content_type string to ContentType ID.
        Accepts content_type as 'app_label.model_name' string (e.g., 'patients.patient')
        """
        content_type_str = self.request.data.get('content_type')
        if content_type_str and isinstance(content_type_str, str):
            # Convert "patients.patient" to ContentType
            try:
                app_label, model = content_type_str.split('.')
                content_type = ContentType.objects.get(app_label=app_label, model=model)
                serializer.save(
                    uploaded_by=self.request.user if self.request.user.is_authenticated else None,
                    content_type=content_type
                )
            except (ValueError, ContentType.DoesNotExist) as e:
                serializer.save(uploaded_by=self.request.user if self.request.user.is_authenticated else None)
        else:
            serializer.save(uploaded_by=self.request.user if self.request.user.is_authenticated else None)
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request, pk=None):
        """
        Upload images to an existing batch with thumbnail generation.
        
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
        
        print(f"📦 Uploading {len(files)} images to batch {batch.id}")
        
        for idx, file in enumerate(files):
            try:
                # Reset file pointer
                file.seek(0)
                
                # Generate S3 keys
                file_ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
                base_key = f"images/{batch.object_id}/{batch.id}/{uuid.uuid4()}"
                s3_key = f"{base_key}.{file_ext}"
                s3_thumbnail_key = f"{base_key}_thumb.{file_ext}"
                
                print(f"  📤 Uploading {file.name} ({file.size} bytes)")
                
                # Open image with Pillow to get dimensions and generate thumbnail
                file.seek(0)
                img = PILImage.open(file)
                width, height = img.size
                
                print(f"    📐 Dimensions: {width}x{height}")
                
                # Generate thumbnail (300x300 max)
                thumb_img = img.copy()
                thumb_img.thumbnail((300, 300), PILImage.Resampling.LANCZOS)
                
                # Save thumbnail to BytesIO
                thumb_buffer = BytesIO()
                thumb_img.save(thumb_buffer, format=img.format or 'JPEG', quality=85)
                thumb_buffer.seek(0)
                
                # Wrap thumbnail in InMemoryUploadedFile for S3 upload
                thumb_file = InMemoryUploadedFile(
                    thumb_buffer,
                    None,
                    f"{file.name}_thumb",
                    file.content_type,
                    thumb_buffer.getbuffer().nbytes,
                    None
                )
                
                print(f"    🖼️  Generated thumbnail: {thumb_img.size[0]}x{thumb_img.size[1]} ({thumb_file.size} bytes)")
                
                # Upload full image to S3 (pass full key as filename, no folder prefix)
                file.seek(0)
                upload_result = s3_service.upload_file(file, s3_key, folder='')
                
                if not upload_result:
                    errors.append(f"Failed to upload {file.name} to S3")
                    print(f"    ❌ Full image upload failed")
                    continue
                
                print(f"    ✅ Full image uploaded: {s3_key}")
                
                # Upload thumbnail to S3 (pass full key as filename, no folder prefix)
                thumb_upload_result = s3_service.upload_file(thumb_file, s3_thumbnail_key, folder='')
                
                if not thumb_upload_result:
                    print(f"    ⚠️  Thumbnail upload failed (continuing without thumbnail)")
                    s3_thumbnail_key = None
                else:
                    print(f"    ✅ Thumbnail uploaded: {s3_thumbnail_key}")
                
                # Create Image record
                image = Image.objects.create(
                    batch=batch,
                    s3_key=s3_key,
                    s3_thumbnail_key=s3_thumbnail_key if thumb_upload_result else None,
                    original_name=file.name,
                    file_size=file.size,
                    mime_type=file.content_type or 'image/jpeg',
                    width=width,
                    height=height,
                    category=categories[idx] if idx < len(categories) else 'other',
                    caption=captions[idx] if idx < len(captions) else '',
                    uploaded_by=request.user if request.user.is_authenticated else None,
                    order=batch.images.count()
                )
                
                uploaded_images.append(ImageSerializer(image).data)
                print(f"    ✅ Image record created: {image.id}")
                
            except Exception as e:
                error_msg = f"Error uploading {file.name}: {str(e)}"
                errors.append(error_msg)
                print(f"    ❌ {error_msg}")
                import traceback
                traceback.print_exc()
        
        # Update batch image count
        batch.update_image_count()
        
        print(f"✅ Batch upload complete: {len(uploaded_images)} successful, {len(errors)} failed")
        
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
