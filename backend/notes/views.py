"""
Views for Notes API
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Note
from .serializers import NoteSerializer, NoteListSerializer


class NoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing patient notes
    
    SECURITY: Requires authentication (inherited from REST_FRAMEWORK settings)
    
    Supports:
    - List notes for a patient (filter by patient_id)
    - Create new note
    - Update note
    - Delete note
    - Filter by note_type
    """
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    # permission_classes inherited from REST_FRAMEWORK settings (IsAuthenticated)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['patient', 'note_type']
    search_fields = ['content']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Use lightweight serializer for list actions"""
        if self.action == 'list':
            return NoteListSerializer
        return NoteSerializer
    
    def get_queryset(self):
        """Filter notes by patient if patient_id is provided"""
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get('patient_id', None)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new note"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        """Save note with authenticated user"""
        # Save note with the authenticated user
        serializer.save()
