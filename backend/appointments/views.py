"""
API Views for Appointment models
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.dateparse import parse_datetime
from .models import Appointment, Encounter
from .serializers import (
    AppointmentSerializer, 
    AppointmentCalendarSerializer,
    EncounterSerializer
)


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
        clinic_colors = {
            0: '#e11d48',  # Red
            1: '#f97316',  # Orange
            2: '#eab308',  # Yellow
            3: '#22c55e',  # Green
            4: '#06b6d4',  # Cyan
            5: '#3b82f6',  # Blue
            6: '#8b5cf6',  # Purple
            7: '#ec4899',  # Pink
            8: '#14b8a6',  # Teal
            9: '#f59e0b',  # Amber
        }
        
        resources = []
        for idx, clinic in enumerate(clinics):
            resources.append({
                'id': str(clinic.id),
                'title': clinic.name,
                'color': clinic_colors.get(idx % len(clinic_colors), '#3b82f6')
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
