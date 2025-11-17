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
from appointments.models import Appointment, AppointmentType
from companies.models import Company
from .models import (
    XeroConnection,
    XeroContactLink,
    XeroInvoiceLink,
    XeroQuoteLink,
    XeroItemMapping,
    XeroTrackingCategory,
    XeroSyncLog
)
from .serializers import (
    XeroConnectionSerializer,
    XeroContactLinkSerializer,
    XeroInvoiceLinkSerializer,
    XeroQuoteLinkSerializer,
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


@api_view(['GET'])
def xero_available_tenants(request):
    """
    Get list of all available Xero organisations
    Added Nov 2025: Support switching between multiple Xero orgs (e.g., Demo Company)
    """
    try:
        tenants = xero_service.get_available_tenants()
        
        return JsonResponse({
            'tenants': tenants,
            'count': len(tenants)
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Failed to fetch available tenants',
            'detail': str(e)
        }, status=500)


@api_view(['POST'])
def xero_switch_tenant(request):
    """
    Switch to a different Xero organisation
    Added Nov 2025: Support switching to Demo Company for testing
    
    Request body:
    {
        "tenant_id": "76906313-afb7-4861-ad17-bca617af599c"
    }
    """
    try:
        tenant_id = request.data.get('tenant_id')
        if not tenant_id:
            return JsonResponse({
                'error': 'tenant_id is required'
            }, status=400)
        
        connection = xero_service.switch_tenant(tenant_id)
        serializer = XeroConnectionSerializer(connection)
        
        return JsonResponse({
            'message': f'Switched to {connection.tenant_name}',
            'connection': serializer.data
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Failed to switch tenant',
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
    Updated Nov 2025: Support for patient AND company contacts
    """
    queryset = XeroContactLink.objects.select_related('patient', 'company', 'connection').all()
    serializer_class = XeroContactLinkSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active', 'patient', 'company']
    
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
    Updated Nov 2025: Support for standalone invoices without appointments
    """
    queryset = XeroInvoiceLink.objects.select_related('appointment', 'patient', 'company').all()
    serializer_class = XeroInvoiceLinkSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'appointment']
    
    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve to include line items from Xero
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Fetch line items from Xero
        try:
            from xero_python.accounting import AccountingApi
            api_client = xero_service.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            
            if connection:
                accounting_api = AccountingApi(api_client)
                response = accounting_api.get_invoice(
                    xero_tenant_id=connection.tenant_id,
                    invoice_id=instance.xero_invoice_id
                )
                
                xero_invoice = response.invoices[0]
                
                # Convert line items to frontend format
                line_items = []
                if xero_invoice.line_items:
                    for idx, item in enumerate(xero_invoice.line_items):
                        line_items.append({
                            'id': str(idx + 1),
                            'description': item.description or '',
                            'quantity': float(item.quantity) if item.quantity else 1,
                            'unit_amount': float(item.unit_amount) if item.unit_amount else 0,
                            'discount': float(item.discount_rate) if item.discount_rate else 0,
                            'account_code': item.account_code or '200',
                            'tax_type': item.tax_type or 'EXEMPTOUTPUT',
                        })
                
                data['line_items'] = line_items
        except Exception as e:
            # If fetching from Xero fails, just return without line items
            print(f"Error fetching line items from Xero: {e}")
        
        return Response(data)
    
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


class XeroQuoteLinkViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing quote links
    Added Nov 2025: Support for Xero quotes (estimates)
    """
    queryset = XeroQuoteLink.objects.all()
    serializer_class = XeroQuoteLinkSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']
    
    @action(detail=True, methods=['post'])
    def convert_to_invoice(self, request, pk=None):
        """Convert a quote to an invoice"""
        try:
            quote_link = self.get_object()
            
            # Validate quote can be converted
            if not quote_link.can_convert_to_invoice():
                return Response({
                    'error': 'Quote cannot be converted',
                    'detail': f'Quote must be DRAFT, SENT, or ACCEPTED and not already converted (current status: {quote_link.status})'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Convert quote to invoice
            invoice_link = xero_service.convert_quote_to_invoice(quote_link)
            
            return Response({
                'message': 'Quote converted to invoice successfully',
                'invoice': XeroInvoiceLinkSerializer(invoice_link).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': 'Failed to convert quote',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def create_xero_invoice(request):
    """
    Create a Xero invoice with flexible contact selection
    Updated Nov 2025: Supports patient OR company as primary contact
    
    Request body:
    {
        "patient_id": "uuid",
        "company_id": "uuid" (optional),
        "contact_type": "patient" or "company",
        "line_items": [...],
        "billing_notes": "...",
        "invoice_date": "YYYY-MM-DD",
        "due_date": "YYYY-MM-DD",
        "appointment_id": "uuid" (optional)
    }
    """
    try:
        # Validate required fields
        patient_id = request.data.get('patient_id')
        contact_type = request.data.get('contact_type', 'patient')
        line_items = request.data.get('line_items', [])
        
        if not patient_id:
            return JsonResponse({
                'error': 'patient_id is required'
            }, status=400)
        
        if contact_type == 'company' and not request.data.get('company_id'):
            return JsonResponse({
                'error': 'company_id is required when contact_type is company'
            }, status=400)
        
        if not line_items or len(line_items) == 0:
            return JsonResponse({
                'error': 'At least one line item is required'
            }, status=400)
        
        # Get patient
        try:
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            return JsonResponse({
                'error': f'Patient with id {patient_id} not found'
            }, status=404)
        
        # Get company (if specified)
        company = None
        company_id = request.data.get('company_id')
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
            except Company.DoesNotExist:
                return JsonResponse({
                    'error': f'Company with id {company_id} not found'
                }, status=404)
        
        # Get or use appointment (optional - not required for standalone invoices)
        appointment = None
        appointment_id = request.data.get('appointment_id')
        if appointment_id:
            try:
                appointment = Appointment.objects.get(id=appointment_id)
                
                # Update appointment with billing info
                appointment.invoice_contact_type = contact_type
                appointment.billing_company = company
                appointment.billing_notes = request.data.get('billing_notes', '')
                appointment.save()
                
            except Appointment.DoesNotExist:
                return JsonResponse({
                    'error': f'Appointment with id {appointment_id} not found'
                }, status=404)
        
        # Parse dates if provided (frontend sends ISO format strings)
        invoice_date = None
        due_date = None
        
        if request.data.get('invoice_date'):
            try:
                from datetime import datetime
                invoice_date = datetime.fromisoformat(request.data.get('invoice_date').replace('Z', '+00:00')).date()
            except (ValueError, AttributeError):
                pass  # Use default if parsing fails
        
        if request.data.get('due_date'):
            try:
                from datetime import datetime
                due_date = datetime.fromisoformat(request.data.get('due_date').replace('Z', '+00:00')).date()
            except (ValueError, AttributeError):
                pass  # Use default if parsing fails
        
        # Create invoice via Xero service (now supports standalone invoices!)
        invoice_link = xero_service.create_invoice(
            appointment=appointment,
            patient=patient,
            company=company,
            contact_type=contact_type,
            line_items=line_items,
            tracking_category=None,
            billing_notes=request.data.get('billing_notes', ''),
            invoice_date=invoice_date,
            due_date=due_date,
            send_immediately=request.data.get('send_immediately', False)
        )
        
        return JsonResponse({
            'message': 'Invoice created successfully',
            'invoice_id': str(invoice_link.id),
            'xero_invoice_id': invoice_link.xero_invoice_id,
            'xero_invoice_number': invoice_link.xero_invoice_number,
            'status': invoice_link.status,
            'total': str(invoice_link.total)
        }, status=201)
        
    except Exception as e:
        import traceback
        return JsonResponse({
            'error': 'Failed to create invoice',
            'detail': str(e),
            'traceback': traceback.format_exc()
        }, status=500)


@api_view(['POST'])
def create_xero_quote(request):
    """
    Create a Xero quote with flexible contact selection
    Added Nov 2025: Quotes (estimates) before service delivery
    
    Request body:
    {
        "patient_id": "uuid",
        "company_id": "uuid" (optional),
        "contact_type": "patient" or "company",
        "line_items": [...],
        "billing_notes": "...",
        "quote_date": "YYYY-MM-DD",
        "expiry_date": "YYYY-MM-DD",
        "appointment_id": "uuid" (optional)
    }
    """
    try:
        # Validate required fields
        patient_id = request.data.get('patient_id')
        company_id = request.data.get('company_id')
        contact_type = request.data.get('contact_type', 'patient')
        line_items = request.data.get('line_items', [])
        expiry_date = request.data.get('expiry_date')
        
        # Validate that we have at least one contact (patient or company)
        if not patient_id and not company_id:
            return JsonResponse({
                'error': 'Either patient_id or company_id is required'
            }, status=400)
        
        if contact_type == 'company' and not company_id:
            return JsonResponse({
                'error': 'company_id is required when contact_type is company'
            }, status=400)
        
        if contact_type == 'patient' and not patient_id:
            return JsonResponse({
                'error': 'patient_id is required when contact_type is patient'
            }, status=400)
        
        if not line_items or len(line_items) == 0:
            return JsonResponse({
                'error': 'At least one line item is required'
            }, status=400)
        
        if not expiry_date:
            return JsonResponse({
                'error': 'expiry_date is required'
            }, status=400)
        
        # Get patient (if provided)
        patient = None
        if patient_id:
            try:
                patient = Patient.objects.get(id=patient_id)
            except Patient.DoesNotExist:
                return JsonResponse({
                    'error': f'Patient with id {patient_id} not found'
                }, status=404)
        
        # Get company (if provided)
        company = None
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
            except Company.DoesNotExist:
                return JsonResponse({
                    'error': f'Company with id {company_id} not found'
                }, status=404)
        
        # Get appointment (optional for quotes)
        appointment = None
        appointment_id = request.data.get('appointment_id')
        if appointment_id:
            try:
                appointment = Appointment.objects.get(id=appointment_id)
            except Appointment.DoesNotExist:
                pass  # OK for quotes to not have appointment
        
        # Parse dates
        quote_date = None
        if request.data.get('quote_date'):
            from datetime import datetime
            quote_date = datetime.fromisoformat(request.data.get('quote_date').replace('Z', '+00:00')).date()
        
        expiry_date_parsed = None
        if expiry_date:
            from datetime import datetime
            expiry_date_parsed = datetime.fromisoformat(expiry_date.replace('Z', '+00:00')).date()
        
        # Create quote via Xero service
        quote_link = xero_service.create_quote(
            patient=patient,
            company=company,
            line_items=line_items,
            expiry_date=expiry_date_parsed,
            quote_date=quote_date,
            appointment=appointment,
            billing_notes=request.data.get('billing_notes', ''),
            send_immediately=request.data.get('send_immediately', False)
        )
        
        return JsonResponse({
            'message': 'Quote created successfully',
            'quote_id': str(quote_link.id),
            'xero_quote_id': quote_link.xero_quote_id,
            'xero_quote_number': quote_link.xero_quote_number,
            'status': quote_link.status,
            'total': str(quote_link.total)
        }, status=201)
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print("=" * 80)
        print("QUOTE CREATION ERROR:")
        print(f"Error: {str(e)}")
        print(f"Traceback:\n{error_traceback}")
        print("=" * 80)
        return JsonResponse({
            'error': 'Failed to create quote',
            'detail': str(e),
            'traceback': error_traceback
        }, status=500)


@api_view(['PUT'])
def update_xero_invoice(request, xero_invoice_id):
    """
    Update a Xero invoice (DRAFT only)
    Added Nov 2025: Edit invoice details within Nexus
    
    Request body:
    {
        "line_items": [...],
        "invoice_date": "YYYY-MM-DD",
        "due_date": "YYYY-MM-DD",
        "billing_notes": "..."
    }
    """
    try:
        # Get invoice link
        try:
            invoice_link = XeroInvoiceLink.objects.get(xero_invoice_id=xero_invoice_id)
        except XeroInvoiceLink.DoesNotExist:
            return JsonResponse({
                'error': f'Invoice with Xero ID {xero_invoice_id} not found'
            }, status=404)
        
        # Validate invoice is editable (DRAFT only)
        if invoice_link.status != 'DRAFT':
            return JsonResponse({
                'error': f'Cannot edit invoice in {invoice_link.status} status. Only DRAFT invoices can be edited.',
                'detail': 'Submit the invoice to Xero first if you need to make changes'
            }, status=400)
        
        # Parse dates if provided
        invoice_date = None
        due_date = None
        
        if request.data.get('invoice_date'):
            try:
                from datetime import datetime
                invoice_date = datetime.fromisoformat(request.data.get('invoice_date').replace('Z', '+00:00')).date()
            except (ValueError, AttributeError):
                pass
        
        if request.data.get('due_date'):
            try:
                from datetime import datetime
                due_date = datetime.fromisoformat(request.data.get('due_date').replace('Z', '+00:00')).date()
            except (ValueError, AttributeError):
                pass
        
        # Update invoice via Xero service
        updated_link = xero_service.update_invoice(
            invoice_link=invoice_link,
            line_items=request.data.get('line_items'),
            invoice_date=invoice_date,
            due_date=due_date,
            billing_notes=request.data.get('billing_notes')
        )
        
        return JsonResponse({
            'message': 'Invoice updated successfully',
            'invoice_id': str(updated_link.id),
            'xero_invoice_id': updated_link.xero_invoice_id,
            'xero_invoice_number': updated_link.xero_invoice_number,
            'status': updated_link.status,
            'total': str(updated_link.total)
        })
        
    except Exception as e:
        import traceback
        return JsonResponse({
            'error': 'Failed to update invoice',
            'detail': str(e),
            'traceback': traceback.format_exc()
        }, status=500)


@api_view(['DELETE'])
def delete_xero_invoice(request, xero_invoice_id):
    """
    Delete (void) a Xero invoice (DRAFT only)
    Added Nov 2025: Delete invoice from Nexus
    
    Only DRAFT invoices can be deleted. This will void the invoice in Xero.
    """
    try:
        # Get invoice link
        try:
            invoice_link = XeroInvoiceLink.objects.get(xero_invoice_id=xero_invoice_id)
        except XeroInvoiceLink.DoesNotExist:
            return JsonResponse({
                'error': f'Invoice with Xero ID {xero_invoice_id} not found'
            }, status=404)
        
        # Validate invoice is deletable (DRAFT only)
        if invoice_link.status != 'DRAFT':
            return JsonResponse({
                'error': f'Cannot delete invoice in {invoice_link.status} status. Only DRAFT invoices can be deleted.',
                'detail': 'Submitted invoices must be voided in Xero directly'
            }, status=400)
        
        # Delete invoice from Xero
        xero_service.delete_invoice(invoice_link)
        
        return JsonResponse({
            'message': 'Invoice deleted successfully'
        })
        
    except Exception as e:
        import traceback
        return JsonResponse({
            'error': 'Failed to delete invoice',
            'detail': str(e),
            'traceback': traceback.format_exc()
        }, status=500)


