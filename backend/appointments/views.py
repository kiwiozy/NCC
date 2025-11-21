"""
API Views for Appointment models
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.dateparse import parse_datetime
from .models import Appointment, Encounter, AppointmentType
from .serializers import (
    AppointmentSerializer, 
    AppointmentCalendarSerializer,
    EncounterSerializer,
    AppointmentTypeSerializer
)


class AppointmentTypeViewSet(viewsets.ModelViewSet):
    """API endpoint for appointment types"""
    
    queryset = AppointmentType.objects.all().order_by('name')
    serializer_class = AppointmentTypeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'default_duration_minutes', 'created_at']
    
    def get_queryset(self):
        """Filter by active status if requested"""
        queryset = super().get_queryset()
        
        # By default, only show active types unless include_inactive is specified
        include_inactive = self.request.query_params.get('include_inactive', 'false').lower()
        if include_inactive != 'true':
            queryset = queryset.filter(is_active=True)
        
        return queryset


class AppointmentViewSet(viewsets.ModelViewSet):
    """API endpoint for appointments"""
    
    queryset = Appointment.objects.all().select_related(
        'clinic', 'patient', 'clinician'
    ).order_by('-start_time')
    
    serializer_class = AppointmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['clinic', 'patient', 'clinician', 'status']
    search_fields = ['patient__first_name', 'patient__last_name', 'reason']
    ordering_fields = ['start_time', 'created_at']
    
    def get_serializer_class(self):
        """Use calendar serializer when requested"""
        if self.request.query_params.get('format') == 'calendar':
            return AppointmentCalendarSerializer
        return AppointmentSerializer
    
    def get_queryset(self):
        """Filter by date range if provided"""
        queryset = super().get_queryset()
        
        # Filter by date range for calendar
        start = self.request.query_params.get('from')
        end = self.request.query_params.get('to')
        
        if start:
            start_dt = parse_datetime(start)
            if start_dt:
                queryset = queryset.filter(start_time__gte=start_dt)
        
        if end:
            end_dt = parse_datetime(end)
            if end_dt:
                queryset = queryset.filter(start_time__lte=end_dt)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def calendar_data(self, request):
        """
        Custom endpoint that returns both resources and events
        Format suitable for FullCalendar - organized by CLINIC
        """
        from clinicians.models import Clinic
        from clinicians.serializers import ClinicSerializer
        
        # Get clinics as resources
        clinics = Clinic.objects.all().order_by('name')
        
        # Filter by clinic if provided
        clinic_id = request.query_params.get('clinic_id')
        if clinic_id and clinic_id != 'all':
            clinics = clinics.filter(id=clinic_id)
        
        # Format clinics as FullCalendar resources with colors
        resources = []
        for clinic in clinics:
            resources.append({
                'id': str(clinic.id),
                'title': clinic.name,
                'color': clinic.color or '#3B82F6'  # Use clinic's color or default blue
            })
        
        # Get appointments (events)
        appointments = self.get_queryset()
        if clinic_id and clinic_id != 'all':
            appointments = appointments.filter(clinic_id=clinic_id)
        
        events_serializer = AppointmentCalendarSerializer(appointments, many=True)
        
        return Response({
            'resources': resources,
            'events': events_serializer.data
        })


class EncounterViewSet(viewsets.ModelViewSet):
    """API endpoint for encounters"""
    
    queryset = Encounter.objects.all().select_related(
        'patient', 'clinician', 'appointment'
    ).order_by('-start_time')
    
    serializer_class = EncounterSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'clinician', 'type']
    search_fields = ['patient__first_name', 'patient__last_name', 'reason', 'summary']
    ordering_fields = ['start_time', 'created_at']
