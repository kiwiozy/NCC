from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Referrer, Specialty, PatientReferrer, ReferrerCompany
from .serializers import (
    ReferrerSerializer,
    SpecialtySerializer,
    PatientReferrerSerializer,
    ReferrerCompanySerializer
)


class SpecialtyViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Specialties (GP, Podiatrist, etc.)
    """
    queryset = Specialty.objects.all()
    serializer_class = SpecialtySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']


class ReferrerViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Referrers (Medical professionals who refer patients)
    
    Supports:
    - List all referrers
    - Retrieve specific referrer
    - Create/Update/Delete referrers
    - Search by name, practice name
    - Filter by specialty
    """
    queryset = Referrer.objects.select_related('specialty', 'company').all()
    serializer_class = ReferrerSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['specialty', 'company']
    search_fields = ['first_name', 'last_name', 'practice_name', 'title']
    ordering_fields = ['last_name', 'first_name', 'specialty__name', 'created_at']
    ordering = ['last_name', 'first_name']


class PatientReferrerViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Patient-Referrer relationships
    """
    queryset = PatientReferrer.objects.select_related('patient', 'referrer').all()
    serializer_class = PatientReferrerSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['patient', 'referrer', 'status']
    ordering_fields = ['referral_date', 'created_at']
    ordering = ['-referral_date']


class ReferrerCompanyViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Referrer-Company relationships
    """
    queryset = ReferrerCompany.objects.select_related('referrer', 'company').all()
    serializer_class = ReferrerCompanySerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['referrer', 'company', 'is_primary']
    ordering_fields = ['is_primary', 'company__name']
    ordering = ['-is_primary', 'company__name']
