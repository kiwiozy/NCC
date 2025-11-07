"""
API Views for Reminder models
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Reminder
from .serializers import ReminderSerializer, ReminderListSerializer


class ReminderViewSet(viewsets.ModelViewSet):
    """API endpoint for reminders"""
    
    queryset = Reminder.objects.all().select_related('patient', 'clinic').order_by('-created_at')
    serializer_class = ReminderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'clinic', 'status']
    search_fields = ['note', 'patient__first_name', 'patient__last_name']
    ordering_fields = ['created_at', 'reminder_date', 'status']
    
    def get_queryset(self):
        """Filter reminders by status"""
        queryset = super().get_queryset()
        
        # Filter by status (default to pending)
        status_param = self.request.query_params.get('status', 'pending')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        return queryset
    
    def get_serializer_class(self):
        """Use simplified serializer for list view"""
        if self.action == 'list':
            return ReminderListSerializer
        return ReminderSerializer
    
    @action(detail=True, methods=['patch'])
    def convert_to_appointment(self, request, pk=None):
        """Convert reminder to appointment"""
        from django.utils import timezone
        
        reminder = self.get_object()
        
        if reminder.status != 'pending':
            return Response(
                {'detail': f'Reminder is already {reminder.status}. Only pending reminders can be converted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        appointment_id = request.data.get('appointment_id')
        if not appointment_id:
            return Response(
                {'detail': 'appointment_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reminder.convert_to_appointment(appointment_id, timezone.now())
        serializer = self.get_serializer(reminder)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """List all pending reminders (waiting list)"""
        pending_reminders = Reminder.objects.filter(status='pending').select_related(
            'patient', 'clinic'
        ).order_by('-created_at')
        
        page = self.paginate_queryset(pending_reminders)
        if page is not None:
            serializer = ReminderListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ReminderListSerializer(pending_reminders, many=True)
        return Response(serializer.data)
