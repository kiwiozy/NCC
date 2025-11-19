"""
Email Template API Views - Template Library System
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import EmailTemplate, EmailGlobalSettings
from .email_serializers import EmailTemplateSerializer, EmailGlobalSettingsSerializer
import logging

logger = logging.getLogger(__name__)


class EmailTemplateViewSet(viewsets.ModelViewSet):
    """
    API endpoint for email templates
    
    - GET /api/invoices/email-templates/ - List all templates
    - POST /api/invoices/email-templates/ - Create new template
    - GET /api/invoices/email-templates/{id}/ - Get specific template
    - PUT /api/invoices/email-templates/{id}/ - Update template
    - DELETE /api/invoices/email-templates/{id}/ - Delete template
    - GET /api/invoices/email-templates/by_category/?category=letter - Filter by category
    - GET /api/invoices/email-templates/default/?category=letter - Get default for category
    """
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter templates by category if provided"""
        queryset = EmailTemplate.objects.all()
        
        # Filter by category
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def perform_create(self, serializer):
        """Set created_by to current user"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get all active templates for a specific category"""
        category = request.query_params.get('category')
        if not category:
            return Response(
                {'error': 'category parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        templates = EmailTemplate.get_active_for_category(category)
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def default(self, request):
        """Get the default template for a category"""
        category = request.query_params.get('category')
        if not category:
            return Response(
                {'error': 'category parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        template = EmailTemplate.get_default_for_category(category)
        if not template:
            return Response(
                {'error': f'No default template found for category: {category}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(template)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate an existing template"""
        original = self.get_object()
        
        # Create a copy
        new_name = request.data.get('name', f"{original.name} (Copy)")
        
        # Check if name already exists in category
        if EmailTemplate.objects.filter(category=original.category, name=new_name).exists():
            return Response(
                {'error': f'Template with name "{new_name}" already exists in {original.get_category_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        duplicate = EmailTemplate.objects.create(
            name=new_name,
            category=original.category,
            description=original.description,
            subject=original.subject,
            body_html=original.body_html,
            body_text=original.body_text,
            header_color=original.header_color,
            is_default=False,  # Duplicates are never default
            is_active=True,
            created_by=request.user
        )
        
        serializer = self.get_serializer(duplicate)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set this template as the default for its category"""
        template = self.get_object()
        template.is_default = True
        template.save()  # save() method will unset other defaults
        
        serializer = self.get_serializer(template)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive template (set is_active=False)"""
        template = self.get_object()
        template.is_active = False
        template.save()
        
        serializer = self.get_serializer(template)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore archived template (set is_active=True)"""
        template = self.get_object()
        template.is_active = True
        template.save()
        
        serializer = self.get_serializer(template)
        return Response(serializer.data)


class EmailGlobalSettingsViewSet(viewsets.ViewSet):
    """
    API endpoint for email global settings (singleton)
    
    - GET /api/invoices/email-global-settings/ - Get settings
    - POST /api/invoices/email-global-settings/ - Update settings
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get the global settings"""
        settings = EmailGlobalSettings.get_settings()
        serializer = EmailGlobalSettingsSerializer(settings)
        return Response(serializer.data)
    
    def create(self, request):
        """Update the global settings (POST is used for updates since it's a singleton)"""
        settings = EmailGlobalSettings.get_settings()
        serializer = EmailGlobalSettingsSerializer(settings, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
