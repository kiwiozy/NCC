"""
API Views for Patient models
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Patient
from .serializers import PatientSerializer, PatientListSerializer


class PatientViewSet(viewsets.ModelViewSet):
    """API endpoint for patients"""
    
    queryset = Patient.objects.filter(archived=False).order_by('-created_at')
    serializer_class = PatientSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sex', 'clinic', 'funding_type', 'archived']
    search_fields = ['first_name', 'last_name', 'mrn', 'health_number']
    ordering_fields = ['last_name', 'first_name', 'created_at']
    
    def get_queryset(self):
        """Filter out archived patients by default"""
        queryset = Patient.objects.all()
        # Only show archived if explicitly requested
        archived = self.request.query_params.get('archived', 'false').lower() == 'true'
        if not archived:
            queryset = queryset.filter(archived=False)
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        """Use simplified serializer for list view"""
        if self.action == 'list':
            return PatientListSerializer
        return PatientSerializer
    
    @action(detail=True, methods=['patch'])
    def archive(self, request, pk=None):
        """Archive a patient (soft delete)"""
        patient = self.get_object()
        if patient.archived:
            return Response(
                {'detail': 'Patient is already archived'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        patient.archived = True
        patient.archived_at = timezone.now()
        patient.archived_by = request.user.username if request.user.is_authenticated else None
        patient.save()
        
        serializer = self.get_serializer(patient)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def restore(self, request, pk=None):
        """Restore an archived patient"""
        patient = self.get_object()
        if not patient.archived:
            return Response(
                {'detail': 'Patient is not archived'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        patient.archived = False
        patient.archived_at = None
        patient.archived_by = None
        patient.save()
        
        serializer = self.get_serializer(patient)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def archived(self, request):
        """List all archived patients"""
        archived_patients = Patient.objects.filter(archived=True).order_by('-archived_at')
        page = self.paginate_queryset(archived_patients)
        if page is not None:
            serializer = PatientListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = PatientListSerializer(archived_patients, many=True)
        return Response(serializer.data)
