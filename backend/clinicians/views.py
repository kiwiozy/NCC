"""
API Views for Clinician models
"""
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Clinic, Clinician
from .serializers import ClinicSerializer, ClinicianSerializer, ClinicianListSerializer


class ClinicViewSet(viewsets.ModelViewSet):
    """API endpoint for clinics"""
    
    queryset = Clinic.objects.all().order_by('name')
    serializer_class = ClinicSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'abn']
    ordering_fields = ['name', 'created_at']


class ClinicianViewSet(viewsets.ModelViewSet):
    """API endpoint for clinicians"""
    
    queryset = Clinician.objects.all().select_related('clinic').order_by('full_name')
    serializer_class = ClinicianSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['clinic', 'role', 'active']
    search_fields = ['full_name', 'credential', 'email']
    ordering_fields = ['full_name', 'created_at']
    
    def get_serializer_class(self):
        """Use simplified serializer for list view when requested"""
        if self.request.query_params.get('format') == 'calendar':
            return ClinicianListSerializer
        return ClinicianSerializer
