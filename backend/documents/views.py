from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.contenttypes.models import ContentType
from .models import Document
from .serializers import DocumentSerializer, DocumentUploadSerializer
from .services import S3Service


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Document model
    Provides CRUD operations for documents and S3 file management
    """
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        """Filter documents by query parameters"""
        queryset = Document.objects.filter(is_active=True)
        
        # Filter by category
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by content type and object ID (e.g., patient documents)
        content_type_id = self.request.query_params.get('content_type_id', None)
        object_id = self.request.query_params.get('object_id', None)
        if content_type_id and object_id:
            queryset = queryset.filter(
                content_type_id=content_type_id,
                object_id=object_id
            )
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        """
        Upload a new document to S3
        
        POST /api/documents/upload/
        Form data:
            - file: File to upload
            - category: Document category (optional)
            - description: Document description (optional)
            - tags: JSON array of tags (optional)
            - content_type_id: ID of content type to link (optional)
            - object_id: UUID of object to link (optional)
            - uploaded_by: Username of uploader (optional)
        """
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        file_obj = serializer.validated_data['file']
        category = serializer.validated_data.get('category', 'other')
        description = serializer.validated_data.get('description', '')
        tags = serializer.validated_data.get('tags', [])
        content_type_id = serializer.validated_data.get('content_type_id')
        object_id = serializer.validated_data.get('object_id')
        uploaded_by = serializer.validated_data.get('uploaded_by', 'system')
        
        try:
            # Upload to S3
            s3_service = S3Service()
            s3_data = s3_service.upload_file(
                file_obj,
                file_obj.name,
                folder='documents',
                metadata={
                    'original_name': file_obj.name,
                    'category': category,
                }
            )
            
            # Create document record
            document = Document.objects.create(
                file_name=file_obj.name,
                original_name=file_obj.name,
                file_size=s3_data['file_size'],
                mime_type=s3_data['mime_type'],
                s3_bucket=s3_data['s3_bucket'],
                s3_key=s3_data['s3_key'],
                category=category,
                description=description,
                tags=tags,
                uploaded_by=uploaded_by,
                content_type_id=content_type_id,
                object_id=object_id,
            )
            
            return Response(
                DocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return Response(
                {'error': f'Upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download_url(self, request, pk=None):
        """
        Generate a pre-signed download URL for a document
        
        GET /api/documents/{id}/download_url/
        """
        document = self.get_object()
        
        try:
            s3_service = S3Service()
            url = s3_service.generate_presigned_url(
                document.s3_key, 
                expiration=3600,
                filename=document.original_name
            )
            
            return Response({
                'id': document.id,
                'file_name': document.original_name,
                'download_url': url,
                'expires_in': 3600,
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate download URL: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a document (soft delete in DB, hard delete from S3)
        """
        document = self.get_object()
        
        try:
            # Delete from S3
            s3_service = S3Service()
            s3_service.delete_file(document.s3_key)
            
            # Soft delete in database
            document.is_active = False
            document.save()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            return Response(
                {'error': f'Delete failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def bucket_status(self, request):
        """
        Check S3 bucket status and accessibility
        
        GET /api/documents/bucket_status/
        """
        try:
            s3_service = S3Service()
            bucket_info = s3_service.get_bucket_info()
            
            return Response(bucket_info)
            
        except Exception as e:
            return Response(
                {
                    'accessible': False,
                    'error': str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
