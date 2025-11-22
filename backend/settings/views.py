"""
API Views for Settings models
"""
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import FundingSource
from .serializers import FundingSourceSerializer


class FundingSourceViewSet(viewsets.ModelViewSet):
    """API endpoint for funding sources"""
    
    queryset = FundingSource.objects.all().order_by('order', 'name')
    serializer_class = FundingSourceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['order', 'name', 'created_at']
    
    def get_queryset(self):
        """Optionally filter by active status"""
        queryset = super().get_queryset()
        active_only = self.request.query_params.get('active', None)
        if active_only == 'true':
            queryset = queryset.filter(active=True)
        return queryset
