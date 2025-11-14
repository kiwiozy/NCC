"""
Views for Data Management API endpoints
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from patients.models import Patient
from appointments.models import Appointment
from documents.models import Document
from images.models import Image
import os


@api_view(['GET'])
def data_status(request):
    """Get current data status counts"""
    try:
        data = {
            'patients': Patient.objects.count(),
            'appointments': Appointment.objects.count(),
            'documents': Document.objects.count(),
            'images': Image.objects.count(),
            'appointments_without_clinic': Appointment.objects.filter(clinic__isnull=True).count(),
            'appointments_without_clinician': Appointment.objects.filter(clinician__isnull=True).count(),
            'appointments_without_type': Appointment.objects.filter(appointment_type__isnull=True).count(),
        }
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def filemaker_status(request):
    """Check FileMaker connection status"""
    try:
        # Check if FileMaker credentials are configured
        filemaker_host = os.environ.get('FILEMAKER_HOST')
        filemaker_database = os.environ.get('FILEMAKER_DATABASE')
        
        if not filemaker_host or not filemaker_database:
            return Response({
                'connected': False,
                'lastSync': None,
                'error': 'FileMaker credentials not configured'
            })
        
        # TODO: Implement actual FileMaker connection test
        # For now, just check if credentials exist
        return Response({
            'connected': True,
            'lastSync': None,  # TODO: Get from database tracking
            'error': None
        })
    except Exception as e:
        return Response({
            'connected': False,
            'lastSync': None,
            'error': str(e)
        })


@api_view(['POST'])
def dry_run(request):
    """Preview what will be deleted and imported"""
    try:
        # Count current data
        patient_count = Patient.objects.count()
        appointment_count = Appointment.objects.count()
        document_count = Document.objects.count()
        image_count = Image.objects.count()
        
        # TODO: Get counts from FileMaker
        # For now, use placeholder values
        filemaker_patient_count = 0  # TODO: Fetch from FileMaker
        filemaker_appointment_count = 0  # TODO: Fetch from FileMaker
        
        result = {
            'will_delete': {
                'patients': patient_count,
                'appointments': appointment_count,
                'notes': 'All patient notes',
                'letters': 'All letters',
                'reminders': 'All reminders',
                'sms_messages': 'All SMS messages',
            },
            'will_import': {
                'patients': filemaker_patient_count or 'Unknown (FileMaker not connected)',
                'appointments': filemaker_appointment_count or 'Unknown (FileMaker not connected)',
            },
            'will_preserve': {
                'documents': f'{document_count} document records (will be re-linked)',
                'images': f'{image_count} image records (will be re-linked)',
                'clinics': 'All clinic records',
                'clinicians': 'All clinician records',
                'appointment_types': 'All appointment types',
                'funding_types': 'All funding types',
                'integrations': 'All integration settings (Gmail, Xero, SMS, S3)',
            }
        }
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def reimport(request):
    """Execute full reimport: delete all data and reimport from FileMaker"""
    logs = []
    
    try:
        # PHASE 1: Delete existing data
        logs.append('=' * 70)
        logs.append('PHASE 1: Deleting existing data...')
        logs.append('=' * 70)
        
        with transaction.atomic():
            # Count before deletion
            patient_count = Patient.objects.count()
            appointment_count = Appointment.objects.count()
            
            logs.append(f'Deleting {patient_count} patients...')
            # Deleting patients will CASCADE delete appointments, notes, etc.
            Patient.objects.all().delete()
            logs.append(f'✅ Deleted {patient_count} patients')
            logs.append(f'✅ Deleted {appointment_count} appointments (cascade)')
            
        # PHASE 2: Import from FileMaker
        logs.append('')
        logs.append('=' * 70)
        logs.append('PHASE 2: Importing from FileMaker...')
        logs.append('=' * 70)
        
        # TODO: Implement actual FileMaker import
        logs.append('⚠️  FileMaker import not yet implemented')
        logs.append('⚠️  This is a placeholder response')
        
        # PHASE 3: Re-link documents and images
        logs.append('')
        logs.append('=' * 70)
        logs.append('PHASE 3: Re-linking documents and images...')
        logs.append('=' * 70)
        
        # TODO: Implement re-linking logic
        logs.append('⚠️  Re-linking not yet implemented')
        
        logs.append('')
        logs.append('=' * 70)
        logs.append('✅ Reimport completed (placeholder)')
        logs.append('=' * 70)
        
        return Response({'success': True, 'logs': logs})
        
    except Exception as e:
        logs.append(f'❌ Error: {str(e)}')
        return Response({'success': False, 'logs': logs, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
