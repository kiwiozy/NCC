"""
API Views for Appointment models
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.dateparse import parse_datetime
from datetime import timedelta
import uuid
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
    
    def create(self, request, *args, **kwargs):
        """
        Override create to handle recurring appointments.
        If is_recurring is True, generate multiple appointments.
        """
        data = request.data
        is_recurring = data.get('is_recurring', False)
        
        print(f"🔵 CREATE APPOINTMENT - is_recurring: {is_recurring}")
        print(f"🔵 CREATE APPOINTMENT - data: {data}")
        
        if not is_recurring:
            # Normal single appointment creation
            return super().create(request, *args, **kwargs)
        
        # Recurring appointment logic
        recurrence_pattern = data.get('recurrence_pattern')
        recurrence_end_date = data.get('recurrence_end_date')
        number_of_occurrences = data.get('number_of_occurrences', 4)
        
        if not recurrence_pattern:
            return Response(
                {'error': 'recurrence_pattern is required for recurring appointments'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate recurrence group ID
        recurrence_group_id = uuid.uuid4()
        
        # Parse start time
        start_time = parse_datetime(data['start_time'])
        end_time = parse_datetime(data['end_time'])
        
        if not start_time or not end_time:
            return Response(
                {'error': 'Invalid start_time or end_time format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate duration
        duration = end_time - start_time
        
        # Determine increment based on pattern
        if recurrence_pattern == 'daily':
            increment = timedelta(days=1)
        elif recurrence_pattern == 'weekly':
            increment = timedelta(weeks=1)
        elif recurrence_pattern == 'biweekly':
            increment = timedelta(weeks=2)
        elif recurrence_pattern == 'monthly':
            increment = timedelta(days=30)  # Approximate month
        else:
            return Response(
                {'error': f'Invalid recurrence_pattern: {recurrence_pattern}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create appointments
        created_appointments = []
        current_start = start_time
        
        # Fetch related objects once
        from clinicians.models import Clinic, Clinician
        
        clinic = Clinic.objects.get(id=data['clinic'])
        clinician = Clinician.objects.get(id=data['clinician']) if data.get('clinician') else None
        patient_obj = None
        if data.get('patient'):
            from patients.models import Patient
            patient_obj = Patient.objects.get(id=data['patient'])
        appointment_type_obj = None
        if data.get('appointment_type'):
            appointment_type_obj = AppointmentType.objects.get(id=data['appointment_type'])
        
        # Determine when to stop
        if recurrence_end_date:
            end_date = parse_datetime(recurrence_end_date)
            max_occurrences = 365  # Safety limit
        else:
            end_date = None
            max_occurrences = int(number_of_occurrences)
        
        occurrence_count = 0
        while occurrence_count < max_occurrences:
            # Check if we've passed the end date
            if end_date and current_start > end_date:
                break
            
            current_end = current_start + duration
            
            # Create appointment data with object instances
            appointment_data = {
                'clinic': clinic,
                'patient': patient_obj,
                'clinician': clinician,
                'appointment_type': appointment_type_obj,
                'start_time': current_start,
                'end_time': current_end,
                'status': data.get('status', 'scheduled'),
                'notes': data.get('notes', ''),
                'is_recurring': True,
                'recurrence_pattern': recurrence_pattern,
                'recurrence_group_id': recurrence_group_id,
                'recurrence_end_date': recurrence_end_date,
            }
            
            # Create appointment
            appointment = Appointment.objects.create(**appointment_data)
            created_appointments.append(appointment)
            
            # Move to next occurrence
            current_start += increment
            occurrence_count += 1
        
        # Serialize and return all created appointments
        serializer = self.get_serializer(created_appointments, many=True)
        return Response(
            {
                'message': f'Created {len(created_appointments)} recurring appointments',
                'appointments': serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    
    def partial_update(self, request, *args, **kwargs):
        """
        Override partial_update (PATCH) to handle converting an existing event to recurring.
        """
        print(f"🟢 PARTIAL_UPDATE METHOD CALLED")
        print(f"🟢 request.data: {request.data}")
        
        # Call the common update logic
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """
        Override update to handle converting an existing event to recurring.
        If is_recurring changes from False to True, generate additional recurring events.
        """
        print(f"🟢 UPDATE METHOD CALLED")
        print(f"🟢 request.data: {request.data}")
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Check if we're converting a non-recurring event to recurring
        was_recurring = instance.is_recurring
        is_now_recurring = request.data.get('is_recurring', False)
        
        print(f"🔵 UPDATE APPOINTMENT - was_recurring: {was_recurring}, is_now_recurring: {is_now_recurring}")
        
        if not was_recurring and is_now_recurring:
            # Converting to recurring - generate additional events
            print(f"🔵 Converting existing event to recurring")
            
            recurrence_pattern = request.data.get('recurrence_pattern')
            recurrence_end_date = request.data.get('recurrence_end_date')
            number_of_occurrences = request.data.get('number_of_occurrences', 4)
            
            if not recurrence_pattern:
                return Response(
                    {'error': 'recurrence_pattern is required for recurring appointments'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate recurrence group ID
            recurrence_group_id = uuid.uuid4()
            
            # Update the current appointment to be part of the recurring series
            instance.is_recurring = True
            instance.recurrence_group_id = recurrence_group_id
            instance.recurrence_pattern = recurrence_pattern
            if recurrence_end_date:
                instance.recurrence_end_date = parse_datetime(recurrence_end_date)
            
            # Get the other fields for copying
            start_time = instance.start_time
            end_time = instance.end_time
            duration = end_time - start_time
            
            # Determine increment based on pattern
            if recurrence_pattern == 'daily':
                increment = timedelta(days=1)
            elif recurrence_pattern == 'weekly':
                increment = timedelta(weeks=1)
            elif recurrence_pattern == 'biweekly':
                increment = timedelta(weeks=2)
            elif recurrence_pattern == 'monthly':
                increment = timedelta(days=30)
            else:
                return Response(
                    {'error': f'Invalid recurrence_pattern: {recurrence_pattern}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Fetch related objects
            patient = instance.patient
            clinic = Clinic.objects.get(id=instance.clinic_id) if instance.clinic_id else None
            clinician = Clinician.objects.get(id=instance.clinician_id) if instance.clinician_id else None
            appointment_type = AppointmentType.objects.get(id=instance.appointment_type_id) if instance.appointment_type_id else None
            
            # Save the first appointment (the one being edited)
            instance.save()
            
            # Generate additional recurring appointments (starting from the second occurrence)
            appointments_created = []
            current_start = start_time
            
            # Determine how many to create
            if recurrence_end_date:
                end_date = parse_datetime(recurrence_end_date)
                occurrences_to_create = 0
                temp_start = current_start + increment
                while temp_start <= end_date:
                    occurrences_to_create += 1
                    temp_start += increment
            else:
                occurrences_to_create = number_of_occurrences - 1  # -1 because we already have the first one
            
            print(f"🔵 Creating {occurrences_to_create} additional recurring events")
            
            for i in range(occurrences_to_create):
                current_start += increment
                current_end = current_start + duration
                
                new_appointment = Appointment.objects.create(
                    patient=patient,
                    clinic=clinic,
                    clinician=clinician,
                    appointment_type=appointment_type,
                    start_time=current_start,
                    end_time=current_end,
                    status=instance.status,
                    notes=instance.notes,
                    is_recurring=True,
                    recurrence_group_id=recurrence_group_id,
                    recurrence_pattern=recurrence_pattern,
                    recurrence_end_date=instance.recurrence_end_date,
                )
                appointments_created.append(new_appointment.id)
            
            print(f"🔵 Created {len(appointments_created)} additional events")
            
            # Return success response with info about created appointments
            serializer = self.get_serializer(instance)
            return Response({
                'message': f'Updated appointment and created {len(appointments_created)} recurring events',
                'appointment': serializer.data,
                'additional_appointments_created': len(appointments_created)
            }, status=status.HTTP_200_OK)
        
        # Normal update (not converting to recurring)
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Override destroy to handle recurring appointment deletion.
        Supports deleting 'this', 'future', or 'all' events in a series.
        """
        appointment = self.get_object()
        delete_type = request.data.get('delete_type', 'this')
        
        if not appointment.is_recurring or delete_type == 'this':
            # Normal single appointment deletion
            appointment.delete()
            return Response(
                {'message': 'Appointment deleted successfully'},
                status=status.HTTP_200_OK
            )
        
        # Recurring appointment deletion
        recurrence_group_id = appointment.recurrence_group_id
        start_time = parse_datetime(request.data.get('start_time', appointment.start_time.isoformat()))
        
        if delete_type == 'all':
            # Delete all appointments in the series
            deleted_count = Appointment.objects.filter(
                recurrence_group_id=recurrence_group_id
            ).delete()[0]
            return Response(
                {'message': f'Deleted {deleted_count} recurring appointments'},
                status=status.HTTP_200_OK
            )
        
        elif delete_type == 'future':
            # Delete this and all future appointments in the series
            deleted_count = Appointment.objects.filter(
                recurrence_group_id=recurrence_group_id,
                start_time__gte=start_time
            ).delete()[0]
            return Response(
                {'message': f'Deleted {deleted_count} future appointments'},
                status=status.HTTP_200_OK
            )
        
        # Default to single deletion
        appointment.delete()
        return Response(
            {'message': 'Appointment deleted successfully'},
            status=status.HTTP_200_OK
        )
    
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
