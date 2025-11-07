from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from patients.models import Patient
from .models import PatientLetter
from .serializers import PatientLetterSerializer, PatientLetterListSerializer


class PatientLetterViewSet(viewsets.ModelViewSet):
    """
    ViewSet for patient letters.
    Provides CRUD operations plus duplicate action.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PatientLetterSerializer
    
    def get_queryset(self):
        """Filter letters by patient_id from query params"""
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            return PatientLetter.objects.filter(patient_id=patient_id)
        return PatientLetter.objects.none()
    
    def get_serializer_class(self):
        """Use lightweight serializer for list view"""
        if self.action == 'list':
            return PatientLetterListSerializer
        return PatientLetterSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new letter"""
        patient_id = request.data.get('patient')
        if not patient_id:
            return Response(
                {'error': 'patient_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify patient exists
        get_object_or_404(Patient, id=patient_id)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate an existing letter"""
        original_letter = self.get_object()
        
        # Create a copy
        new_letter = PatientLetter.objects.create(
            patient=original_letter.patient,
            letter_type=f"{original_letter.letter_type} (Copy)",
            recipient_name=original_letter.recipient_name,
            subject=original_letter.subject,
            pages=original_letter.pages.copy() if original_letter.pages else []
        )
        
        serializer = self.get_serializer(new_letter)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

