"""
API Views for Clinician models
"""
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Clinic, Clinician
from .serializers import ClinicSerializer, ClinicianSerializer, ClinicianListSerializer


class ClinicViewSet(viewsets.ModelViewSet):
    """
    API endpoint for clinics
    SECURITY: Requires authentication (inherited from REST_FRAMEWORK settings)
    """
    
    queryset = Clinic.objects.all().order_by('name')
    serializer_class = ClinicSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'abn']
    ordering_fields = ['name', 'created_at']
    
    def get_queryset(self):
        """
        Filter queryset based on user permissions
        - Staff users: see all clinics
        - Regular users: see all clinics (read-only operations controlled by perform_* methods)
        """
        return Clinic.objects.all().order_by('name')
    
    def perform_create(self, serializer):
        """Only staff can create clinics"""
        if not self.request.user.is_staff:
            raise PermissionDenied("Only administrators can create clinics")
        serializer.save()
    
    def perform_update(self, serializer):
        """Only staff can update clinics"""
        if not self.request.user.is_staff:
            raise PermissionDenied("Only administrators can update clinics")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Only staff can delete clinics"""
        if not self.request.user.is_staff:
            raise PermissionDenied("Only administrators can delete clinics")
        instance.delete()


class ClinicianViewSet(viewsets.ModelViewSet):
    """
    API endpoint for clinicians
    SECURITY: 
    - Requires authentication (inherited from REST_FRAMEWORK settings)
    - Regular users can view all active clinicians
    - Regular users can only edit their own profile
    - Staff users can edit all profiles and see inactive clinicians
    """
    
    queryset = Clinician.objects.all().select_related('clinic', 'user').order_by('full_name')
    serializer_class = ClinicianSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['clinic', 'role', 'active']
    search_fields = ['full_name', 'credential', 'email']
    ordering_fields = ['full_name', 'created_at']
    
    def get_queryset(self):
        """
        Filter queryset based on user permissions
        - Staff users: see all clinicians (active and inactive)
        - Regular users: only see active clinicians
        """
        if self.request.user.is_staff:
            return Clinician.objects.all().select_related('clinic', 'user').order_by('full_name')
        else:
            return Clinician.objects.filter(active=True).select_related('clinic', 'user').order_by('full_name')
    
    def get_serializer_class(self):
        """Use simplified serializer for list view when requested"""
        if self.request.query_params.get('format') == 'calendar':
            return ClinicianListSerializer
        return ClinicianSerializer
    
    def perform_create(self, serializer):
        """
        Only staff can create clinician profiles
        Regular users cannot create new profiles
        """
        if not self.request.user.is_staff:
            raise PermissionDenied("Only administrators can create clinician profiles")
        serializer.save()
    
    def perform_update(self, serializer):
        """
        Authorization for updating clinician profiles:
        - Staff users: can update any profile
        - Regular users: can only update their own profile (linked via user field)
        - Regular users: cannot change sensitive fields (user, active, role)
        """
        clinician = self.get_object()
        
        # Staff can update anyone
        if self.request.user.is_staff:
            serializer.save()
            return
        
        # Regular users can only update their own profile
        if clinician.user != self.request.user:
            raise PermissionDenied("You can only edit your own profile")
        
        # Check if regular user is trying to change restricted fields
        restricted_fields = {'user', 'active', 'role'}
        attempted_changes = set(serializer.validated_data.keys())
        
        if restricted_fields & attempted_changes:
            raise PermissionDenied(
                f"You cannot modify these fields: {', '.join(restricted_fields & attempted_changes)}. "
                "Contact an administrator."
            )
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Only staff can delete clinician profiles
        Regular users cannot delete profiles (not even their own)
        """
        if not self.request.user.is_staff:
            raise PermissionDenied("Only administrators can delete clinician profiles")
        instance.delete()
