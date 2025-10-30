"""
Xero Integration Views

Provides API endpoints for:
- OAuth2 flow (connect, callback, disconnect)
- Connection status
- Contact synchronization
- Invoice management
- Sync logs
"""
from django.shortcuts import redirect
from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from patients.models import Patient
from appointments.models import Appointment
from .models import (
    XeroConnection,
    XeroContactLink,
    XeroInvoiceLink,
    XeroItemMapping,
    XeroTrackingCategory,
    XeroSyncLog
)
from .serializers import (
    XeroConnectionSerializer,
    XeroContactLinkSerializer,
    XeroInvoiceLinkSerializer,
    XeroItemMappingSerializer,
    XeroTrackingCategorySerializer,
    XeroSyncLogSerializer,
    CreateInvoiceSerializer,
    SyncContactSerializer
)
from .services import xero_service


@api_view(['GET'])
def xero_connect(request):
    """
    Start OAuth2 authorization flow
    Redirects user to Xero login
    """
    try:
        auth_url = xero_service.get_authorization_url(state='nexus-clinic')
        return redirect(auth_url)
    except Exception as e:
        return JsonResponse({
            'error': 'Failed to generate authorization URL',
            'detail': str(e)
        }, status=500)


@api_view(['GET'])
def xero_callback(request):
    """
    OAuth2 callback endpoint
    Exchanges authorization code for access token
    """
    code = request.GET.get('code')
    error = request.GET.get('error')
    
    if error:
        return JsonResponse({
            'error': error,
            'error_description': request.GET.get('error_description', '')
        }, status=400)
    
    if not code:
        return JsonResponse({
            'error': 'No authorization code provided'
        }, status=400)
    
    try:
        connection = xero_service.exchange_code_for_token(code)
        
        # Redirect to frontend with success
        return redirect(f'https://localhost:3000/xero?status=connected&tenant={connection.tenant_name}')
        
    except Exception as e:
        # Redirect to frontend with error
        return redirect(f'https://localhost:3000/xero?status=error&message={str(e)}')


@api_view(['POST'])
def xero_disconnect(request):
    """
    Disconnect Xero integration
    Marks connection as inactive
    """
    try:
        connection = XeroConnection.objects.filter(is_active=True).first()
        if connection:
            connection.is_active = False
            connection.save()
            return JsonResponse({
                'message': 'Xero connection disconnected successfully'
            })
        else:
            return JsonResponse({
                'message': 'No active Xero connection found'
            }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': 'Failed to disconnect',
            'detail': str(e)
        }, status=500)


@api_view(['POST'])
def xero_refresh_token(request):
    """
    Manually refresh OAuth2 token
    """
    try:
        connection = XeroConnection.objects.filter(is_active=True).first()
        if not connection:
            return JsonResponse({
                'error': 'No active Xero connection found'
            }, status=404)
        
        connection = xero_service.refresh_token(connection)
        serializer = XeroConnectionSerializer(connection)
        
        return JsonResponse({
            'message': 'Token refreshed successfully',
            'connection': serializer.data
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Failed to refresh token',
            'detail': str(e)
        }, status=500)


class XeroConnectionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing Xero connection status
    """
    queryset = XeroConnection.objects.all()
    serializer_class = XeroConnectionSerializer
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get current connection status"""
        connection = XeroConnection.objects.filter(is_active=True).first()
        
        if connection:
            serializer = self.get_serializer(connection)
            return Response({
                'connected': True,
                'connection': serializer.data
            })
        else:
            return Response({
                'connected': False,
                'connection': None
            })


class XeroContactLinkViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing contact links
    """
    queryset = XeroContactLink.objects.all()
    serializer_class = XeroContactLinkSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['local_type', 'local_id', 'is_active']
    
    @action(detail=False, methods=['post'])
    def sync_patient(self, request):
        """Sync a patient to Xero as a contact"""
        serializer = SyncContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            patient = Patient.objects.get(id=serializer.validated_data['patient_id'])
            force_update = serializer.validated_data.get('force_update', False)
            
            link = xero_service.sync_contact(patient, force_update=force_update)
            
            return Response({
                'message': 'Contact synced successfully',
                'link': XeroContactLinkSerializer(link).data
            })
            
        except Patient.DoesNotExist:
            return Response({
                'error': 'Patient not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({
                'error': 'Failed to sync contact',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class XeroInvoiceLinkViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing invoice links
    """
    queryset = XeroInvoiceLink.objects.all()
    serializer_class = XeroInvoiceLinkSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'appointment']
    
    @action(detail=False, methods=['post'])
    def create_invoice(self, request):
        """Create a draft invoice in Xero for an appointment"""
        serializer = CreateInvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            appointment = Appointment.objects.get(
                id=serializer.validated_data['appointment_id']
            )
            line_items = serializer.validated_data['line_items']
            use_clinic_tracking = serializer.validated_data.get('use_clinic_tracking', True)
            
            # Get clinic tracking if requested
            tracking_category = None
            if use_clinic_tracking and appointment.clinic:
                try:
                    tracking = XeroTrackingCategory.objects.get(
                        clinic=appointment.clinic,
                        is_active=True
                    )
                    tracking_category = {
                        'category_id': tracking.tracking_category_id,
                        'option_id': tracking.tracking_option_id
                    }
                except XeroTrackingCategory.DoesNotExist:
                    pass
            
            # Create invoice
            invoice_link = xero_service.create_invoice(
                appointment,
                line_items,
                tracking_category
            )
            
            return Response({
                'message': 'Invoice created successfully',
                'invoice': XeroInvoiceLinkSerializer(invoice_link).data
            }, status=status.HTTP_201_CREATED)
            
        except Appointment.DoesNotExist:
            return Response({
                'error': 'Appointment not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({
                'error': 'Failed to create invoice',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def sync_status(self, request, pk=None):
        """Sync invoice status and payment details from Xero"""
        try:
            invoice_link = self.get_object()
            updated_link = xero_service.sync_invoice_status(invoice_link)
            
            return Response({
                'message': 'Invoice status synced successfully',
                'invoice': XeroInvoiceLinkSerializer(updated_link).data
            })
            
        except Exception as e:
            return Response({
                'error': 'Failed to sync invoice status',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class XeroItemMappingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing item mappings
    """
    queryset = XeroItemMapping.objects.all()
    serializer_class = XeroItemMappingSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active', 'local_code']


class XeroTrackingCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tracking categories
    """
    queryset = XeroTrackingCategory.objects.all()
    serializer_class = XeroTrackingCategorySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['clinic', 'is_active']


class XeroSyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing sync logs (read-only)
    """
    queryset = XeroSyncLog.objects.all()
    serializer_class = XeroSyncLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['operation_type', 'status', 'local_entity_type']
