from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.db.models import Q
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.http import HttpResponse

from .models import ImageBatch, Image
from .serializers import ImageBatchSerializer, ImageBatchListSerializer, ImageSerializer
from documents.services import S3Service

import uuid
from datetime import datetime
from PIL import Image as PILImage
from io import BytesIO
import sys
import requests
import zipfile
from zipfile import ZipFile


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
                
                # Get thumbnail size before wrapping
                thumbnail_size = thumb_buffer.getbuffer().nbytes
                
                # Wrap thumbnail in InMemoryUploadedFile for S3 upload
                thumb_file = InMemoryUploadedFile(
                    thumb_buffer,
                    None,
                    f"{file.name}_thumb",
                    file.content_type,
                    thumbnail_size,
                    None
                )
                
                print(f"    🖼️  Generated thumbnail: {thumb_img.size[0]}x{thumb_img.size[1]} ({thumbnail_size} bytes = {round(thumbnail_size/1024, 1)} KB)")
                
                # Upload full image to S3 using boto3 directly (to control exact S3 key)
                file.seek(0)
                try:
                    s3_service.s3_client.put_object(
                        Bucket=s3_service.bucket_name,
                        Key=s3_key,
                        Body=file.read(),
                        ContentType=file.content_type or 'image/jpeg'
                    )
                    print(f"    ✅ Full image uploaded: {s3_key}")
                except Exception as e:
                    errors.append(f"Failed to upload {file.name} to S3: {str(e)}")
                    print(f"    ❌ Full image upload failed: {str(e)}")
                    continue
                
                # Upload thumbnail to S3 using boto3 directly
                thumb_file.seek(0)
                thumb_uploaded = False
                try:
                    s3_service.s3_client.put_object(
                        Bucket=s3_service.bucket_name,
                        Key=s3_thumbnail_key,
                        Body=thumb_file.read(),
                        ContentType=file.content_type or 'image/jpeg'
                    )
                    print(f"    ✅ Thumbnail uploaded: {s3_thumbnail_key}")
                    thumb_uploaded = True
                except Exception as e:
                    print(f"    ⚠️  Thumbnail upload failed: {str(e)}")
                    s3_thumbnail_key = None
                    thumbnail_size = None
                
                # Create Image record
                image = Image.objects.create(
                    batch=batch,
                    s3_key=s3_key,
                    s3_thumbnail_key=s3_thumbnail_key if thumb_uploaded else None,
                    thumbnail_size=thumbnail_size if thumb_uploaded else None,
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
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download all images in a batch as a ZIP file.
        
        GET /api/images/batches/{id}/download/
        """
        try:
            # Get batch
            batch = self.get_object()
            
            # Get image IDs from query parameters if provided
            image_ids_param = request.query_params.getlist('image_ids')
            
            if image_ids_param:
                # Filter to only selected images
                images = batch.images.filter(id__in=image_ids_param).order_by('order', 'uploaded_at')
                print(f"📦 Starting ZIP creation for batch '{batch.name}' with {len(image_ids_param)} selected images")
            else:
                # Include all images
                images = batch.images.all().order_by('order', 'uploaded_at')
                print(f"📦 Starting ZIP creation for batch '{batch.name}' with all images")
            
            total_images = images.count()
            
            if total_images == 0:
                return Response(
                    {'error': 'No images selected' if image_ids_param else 'No images in this batch'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Create ZIP file in memory
            zip_buffer = BytesIO()
            s3_service = S3Service()
            images_added = 0
            
            try:
                with ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                    for image in images:
                        try:
                            # Generate presigned URL for image
                            presigned_url = s3_service.generate_presigned_url(
                                image.s3_key,
                                expiration=3600,
                                filename=image.original_name
                            )
                            
                            if not presigned_url:
                                print(f"⚠️  No presigned URL for image {image.id}")
                                continue
                            
                            # Fetch image from S3
                            response = requests.get(presigned_url, stream=True, timeout=30)
                            response.raise_for_status()
                            
                            # Read content from stream
                            image_content = b''.join(response.iter_content(chunk_size=8192))
                            
                            if not image_content:
                                print(f"⚠️  Empty content for image {image.id}")
                                continue
                            
                            print(f"📦 Fetched {len(image_content)} bytes for {image.original_name}")
                            
                            # Add image to ZIP with original filename
                            zip_file.writestr(image.original_name, image_content)
                            images_added += 1
                            print(f"✅ Added {image.original_name} to ZIP ({images_added}/{total_images})")
                            
                        except Exception as e:
                            import traceback
                            print(f"❌ Error adding image {image.id} to ZIP: {str(e)}")
                            traceback.print_exc()
                            continue
                
                # Close the ZIP file explicitly
                zip_buffer.seek(0)
                zip_content = zip_buffer.getvalue()
                zip_buffer.close()
                
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                print(f"❌ ZIP creation error: {str(e)}")
                print(error_trace)
                zip_buffer.close()
                raise
            
            # Check if ZIP file has content
            if len(zip_content) == 0 or images_added == 0:
                return Response(
                    {'error': f'No images could be added to ZIP file (tried {total_images} images)'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            print(f"✅ ZIP file created: {len(zip_content)} bytes with {images_added} images")
            
            # Create Django response
            django_response = HttpResponse(
                zip_content,
                content_type='application/zip'
            )
            
            # Generate filename: sanitize batch name
            safe_name = ''.join(c for c in batch.name if c.isalnum() or c in (' ', '-', '_', '.'))
            safe_name = safe_name.replace(' ', '_')[:50]  # Limit length
            batch_id_str = str(batch.id)[:8]  # Convert UUID to string first
            zip_filename = f"{safe_name}_{batch_id_str}.zip"
            
            # Set headers for download
            django_response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
            django_response['Content-Length'] = str(len(zip_content))
            django_response['Cache-Control'] = 'public, max-age=3600'
            
            return django_response
            
        except ImageBatch.DoesNotExist:
            return Response(
                {'error': 'Batch not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except requests.RequestException as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"❌ S3 request error: {str(e)}")
            print(error_trace)
            return Response(
                {'error': f'Failed to fetch images from S3: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"❌ Download batch error: {str(e)}")
            print(error_trace)
            return Response(
                {'error': f'Internal error: {str(e)}', 'trace': error_trace},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download image from S3 via Django backend to bypass CORS issues.
        This proxies the image through Django with proper download headers.
        
        GET /api/images/{id}/download/
        """
        try:
            # Get image
            image = self.get_object()
            
            # Generate presigned URL
            s3_service = S3Service()
            presigned_url = s3_service.generate_presigned_url(
                image.s3_key,
                expiration=3600,
                filename=image.original_name
            )
            
            if not presigned_url:
                return Response(
                    {'error': 'Failed to generate download URL'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Fetch from S3
            response = requests.get(presigned_url, stream=True, timeout=30)
            response.raise_for_status()
            
            # Determine content type from original filename
            content_type = 'image/jpeg'  # default
            if image.original_name.lower().endswith('.png'):
                content_type = 'image/png'
            elif image.original_name.lower().endswith('.gif'):
                content_type = 'image/gif'
            elif image.original_name.lower().endswith('.webp'):
                content_type = 'image/webp'
            
            # Create Django response with appropriate headers for download
            django_response = HttpResponse(
                response.content,
                content_type=content_type
            )
            
            # Set headers for proper download (attachment forces download in Safari)
            django_response['Content-Disposition'] = f'attachment; filename="{image.original_name}"'
            django_response['Content-Length'] = str(image.file_size)
            django_response['Cache-Control'] = 'public, max-age=3600'
            
            return django_response
            
        except Image.DoesNotExist:
            return Response(
                {'error': 'Image not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except requests.RequestException as e:
            return Response(
                {'error': f'Failed to fetch image from S3: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            return Response(
                {'error': f'Internal error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
