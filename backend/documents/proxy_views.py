"""
Proxy views for document downloads to bypass CORS issues.
This is a temporary workaround until S3 CORS is properly configured.
"""
from django.http import HttpResponse, Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Document
from .services import S3Service
import requests


class DocumentProxyView(APIView):
    """
    Proxy endpoint to download documents from S3 via Django backend.
    This bypasses CORS issues by serving the file through Django.
    
    GET /api/documents/{id}/proxy/
    """
    
    def get(self, request, pk):
        """Fetch document from S3 and stream it through Django"""
        try:
            # Get document
            document = Document.objects.get(pk=pk)
            
            # Generate presigned URL
            s3_service = S3Service()
            presigned_url = s3_service.generate_presigned_url(
                document.s3_key,
                expiration=3600,
                filename=document.original_name
            )
            
            if not presigned_url:
                return Response(
                    {'error': 'Failed to generate download URL'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Fetch from S3
            response = requests.get(presigned_url, stream=True, timeout=30)
            response.raise_for_status()
            
            # Create Django response with appropriate headers
            django_response = HttpResponse(
                response.content,
                content_type=document.mime_type or 'application/pdf'
            )
            
            # Set headers for proper download/viewing
            django_response['Content-Disposition'] = f'inline; filename="{document.original_name}"'
            django_response['Content-Length'] = str(document.file_size)
            django_response['Cache-Control'] = 'public, max-age=3600'
            
            return django_response
            
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except requests.RequestException as e:
            return Response(
                {'error': f'Failed to fetch document from S3: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            return Response(
                {'error': f'Internal error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

