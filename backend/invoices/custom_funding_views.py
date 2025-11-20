"""
API Views for Custom Funding Sources
"""
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .custom_funding_model import CustomFundingSource
from .email_serializers import CustomFundingSourceSerializer


class CustomFundingSourceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing custom funding sources
    
    Permissions:
    - List/Read: All authenticated users
    - Create/Update/Delete: Staff only
    """
    queryset = CustomFundingSource.objects.all()
    serializer_class = CustomFundingSourceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'reference_number']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter to active funding sources by default"""
        queryset = super().get_queryset()
        
        # Filter by active status (default: show only active)
        is_active = self.request.query_params.get('is_active', 'true')
        if is_active.lower() == 'true':
            queryset = queryset.filter(is_active=True)
        elif is_active.lower() == 'false':
            queryset = queryset.filter(is_active=False)
        # If 'all', show both active and inactive
        
        return queryset
    
    def perform_create(self, serializer):
        """Only staff can create custom funding sources"""
        if not self.request.user.is_staff:
            raise PermissionDenied("Only administrators can create custom funding sources")
        serializer.save()
    
    def perform_update(self, serializer):
        """Only staff can update custom funding sources"""
        if not self.request.user.is_staff:
            raise PermissionDenied("Only administrators can update custom funding sources")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Only staff can delete custom funding sources"""
        if not self.request.user.is_staff:
            raise PermissionDenied("Only administrators can delete custom funding sources")
        instance.delete()

