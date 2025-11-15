from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Company
from .serializers import CompanySerializer


class CompanyViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Companies (Medical practices, NDIS providers, etc.)
    
    Supports:
    - List all companies
    - Retrieve specific company
    - Create/Update/Delete companies
    - Search by name
    - Filter by company_type
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['company_type']
    search_fields = ['name', 'abn']
    ordering_fields = ['name', 'company_type', 'created_at']
    ordering = ['name']  # Default ordering
