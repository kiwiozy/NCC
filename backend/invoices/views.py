"""
Invoice PDF Views
"""
import logging
from datetime import datetime, timedelta
from django.http import HttpResponse
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .document_pdf_generator import generate_invoice_pdf
from .document_pdf_generator_v2 import generate_invoice_pdf_v2

logger = logging.getLogger(__name__)


@api_view(['POST'])
def generate_invoice_pdf_view(request):
    """
    Generate invoice PDF from data
    
    POST /api/invoices/generate-pdf/
    {
        "invoice_number": "INV-6719",
        "invoice_date": "2025-06-05",
        "due_date": "2025-05-13",  // Optional, defaults to invoice_date + 7 days
        "patient": {
            "name": "Mr. Scott Laird",
            "address": "8 Sherborne Street",
            "suburb": "North Tamworth",
            "state": "NSW",
            "postcode": "2340",
            "ndis_number": "430372789"  // Optional
        },
        "practitioner": {  // Optional
            "name": "Craig Laird",
            "qualification": "CPed CM au",
            "registration": "3454"
        },
        "line_items": [
            {
                "description": "Custom Cast Footwear with custom Orthoses, made using 3D scans of the feet.",
                "quantity": 2,
                "unit_price": 5400.00,
                "gst_rate": 0.00
            }
        ],
        "payments": [  // Optional
            {
                "date": "2025-05-09",
                "type": "EFT",
                "amount": 100.00
            }
        ],
        "payment_terms_days": 7  // Optional, defaults to 7
    }
    """
    try:
        data = request.data
        
        # Parse dates
        invoice_date = datetime.strptime(data['invoice_date'], '%Y-%m-%d')
        
        # Calculate due date if not provided
        if 'due_date' in data:
            due_date = datetime.strptime(data['due_date'], '%Y-%m-%d')
        else:
            payment_terms_days = data.get('payment_terms_days', 7)
            due_date = invoice_date + timedelta(days=payment_terms_days)
        
        # Parse payment dates
        payments = []
        for payment in data.get('payments', []):
            payments.append({
                'date': datetime.strptime(payment['date'], '%Y-%m-%d'),
                'type': payment['type'],
                'amount': float(payment.get('amount', 0)),
            })
        
        # Prepare invoice data
        invoice_data = {
            'invoice_number': data['invoice_number'],
            'invoice_date': invoice_date,
            'due_date': due_date,
            'patient': data['patient'],
            'practitioner': data.get('practitioner', {}),
            'line_items': data['line_items'],
            'payments': payments,
            'payment_terms_days': data.get('payment_terms_days', 7),
        }
        
        # Generate PDF
        pdf_buffer = generate_invoice_pdf(invoice_data)
        
        # Return PDF
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Invoice_{data["invoice_number"]}.pdf"'
        
        return response
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=400)


@api_view(['GET'])
def generate_xero_invoice_pdf(request, invoice_link_id):
    """
    Generate PDF for a Xero invoice link
    
    GET /api/invoices/xero/<invoice_link_id>/pdf/
    GET /api/invoices/xero/<invoice_link_id>/pdf/?debug=true  (for layout debugging)
    GET /api/invoices/xero/<invoice_link_id>/pdf/?test_items=20  (test with 20 line items)
    """
    try:
        # Check for debug mode
        debug_mode = request.GET.get('debug', 'false').lower() == 'true'
        
        # Check for test items mode
        test_items_count = request.GET.get('test_items', None)
        if test_items_count:
            try:
                test_items_count = int(test_items_count)
            except ValueError:
                test_items_count = None
        
        from xero_integration.models import XeroInvoiceLink
        from patients.models import Patient
        from companies.models import Company
        
        # Get invoice link
        try:
            invoice_link = XeroInvoiceLink.objects.get(id=invoice_link_id)
        except XeroInvoiceLink.DoesNotExist:
            return Response({
                'error': 'Invoice not found'
            }, status=404)
        
        # Get patient or company info
        # IMPORTANT: Company takes precedence for address (determines who invoice is billed to)
        patient_info = {
            'name': '',
            'address': '',
            'suburb': '',
            'state': '',
            'postcode': '',
        }
        
        patient_reference = None  # Separate reference for company billing
        
        if invoice_link.company:
            # Company pays - use company's address BUT keep patient name for reference
            company = invoice_link.company
            patient_info['name'] = company.name
            
            # Get address from address_json
            if company.address_json:
                addr = company.address_json
                patient_info['address'] = addr.get('street', '')
                patient_info['suburb'] = addr.get('suburb', '')
                patient_info['state'] = addr.get('state', '')
                patient_info['postcode'] = addr.get('postcode', '')
            
            # Store patient reference separately for the Reference/PO# field
            if invoice_link.patient:
                patient = invoice_link.patient
                patient_reference = {
                    'name': f"{patient.first_name} {patient.last_name}",
                    'ndis_number': patient.health_number if patient.health_number else ''
                }
        
        elif invoice_link.patient:
            # Patient pays directly - use patient's address
            patient = invoice_link.patient
            patient_info['name'] = f"{patient.title or ''} {patient.first_name} {patient.last_name}".strip()
            
            # Get address from address_json
            if patient.address_json:
                addr = patient.address_json
                patient_info['address'] = addr.get('street', '')
                patient_info['suburb'] = addr.get('suburb', '')
                patient_info['state'] = addr.get('state', '')
                patient_info['postcode'] = addr.get('postcode', '')
            
            # Get NDIS/health number
            if patient.health_number:
                patient_info['ndis_number'] = patient.health_number
        
        # Parse line items - fetch from Xero API since they're not stored in DB
        line_items = []
        
        # Try to fetch full invoice details from Xero
        try:
            from xero_integration.services import XeroService
            from xero_integration.models import XeroConnection
            
            # Check if we have an active Xero connection
            connection = XeroConnection.objects.filter(is_active=True).first()
            if connection:
                xero_service = XeroService()  # XeroService doesn't take connection in __init__
                xero_invoice = xero_service.get_invoice(invoice_link.xero_invoice_id)
                
                if xero_invoice and xero_invoice.line_items:
                    for item in xero_invoice.line_items:
                        # Determine GST rate based on tax_type
                        # EXEMPTOUTPUT = GST Free (0%)
                        # OUTPUT2 = GST on Income (10%)
                        # INPUT2 = GST on Expenses (10%)
                        gst_rate = 0.0
                        if item.tax_type and ('OUTPUT2' in item.tax_type or 'INPUT2' in item.tax_type):
                            gst_rate = 0.10
                        
                        # Get discount rate (Xero stores it as percentage)
                        discount = float(item.discount_rate or 0)
                        
                        line_items.append({
                            'description': item.description or '',
                            'quantity': int(item.quantity or 1),
                            'unit_price': float(item.unit_amount or 0),
                            'discount': discount,
                            'gst_rate': gst_rate,
                        })
        except Exception as e:
            logger.warning(f"Could not fetch line items from Xero: {e}")
        
        # If no line items from Xero, add a placeholder
        if not line_items:
            line_items.append({
                'description': 'Invoice item',
                'quantity': 1,
                'unit_price': float(invoice_link.total or 0),
                'discount': 0,
                'gst_rate': 0.0,
            })
        
        # If test_items mode, generate multiple test line items
        if test_items_count:
            line_items = []
            for i in range(1, test_items_count + 1):
                line_items.append({
                    'description': f'Test Line Item {i} - Custom orthotic device with adjustments and fitting',
                    'quantity': 1,
                    'unit_price': 150.00 + (i * 10),  # Varying prices
                    'discount': 10 if i % 5 == 0 else 0,  # Every 5th item has 10% discount
                    'gst_rate': 0.10 if i % 3 == 0 else 0.0,  # Every 3rd item has GST
                })
        
        # Fetch payments from database
        payments = []
        try:
            from xero_integration.models import XeroPayment
            
            # Get all payments for this invoice, ordered by date
            payment_records = XeroPayment.objects.filter(
                invoice_link=invoice_link,
                status='AUTHORISED'  # Only show authorised payments
            ).order_by('payment_date')
            
            for payment in payment_records:
                payments.append({
                    'date': payment.payment_date,  # Already a date object
                    'reference': payment.reference or f'Payment {payment.xero_payment_id[:8]}',
                    'amount': float(payment.amount),
                })
            
            logger.info(f"Found {len(payments)} payment(s) for invoice {invoice_link.xero_invoice_number}")
        except Exception as e:
            logger.warning(f"Could not fetch payments: {e}")
        
        # Prepare invoice data
        invoice_data = {
            'invoice_number': invoice_link.xero_invoice_number,
            'invoice_date': invoice_link.invoice_date or datetime.now(),
            'due_date': invoice_link.due_date or (datetime.now() + timedelta(days=7)),
            'patient': patient_info,
            'patient_reference': patient_reference,  # Separate patient reference for company billing
            'practitioner': {
                'name': 'Craig Laird',
                'qualification': 'CPed CM au',
                'registration': '3454'
            },
            'line_items': line_items,
            'payments': payments,
            'payment_terms_days': 7,
        }
        
        # Generate PDF
        pdf_buffer = generate_invoice_pdf(invoice_data, debug=debug_mode)
        
        # Return PDF
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice_link.xero_invoice_number}.pdf"'
        
        return response
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error generating PDF: {error_details}")
        return Response({
            'error': str(e),
            'details': error_details if settings.DEBUG else 'An error occurred'
        }, status=400)


@api_view(['GET'])
def generate_xero_invoice_pdf_v2(request, invoice_link_id):
    """
    Generate PDF for a Xero invoice link using V2 generator
    
    GET /api/invoices/xero/<invoice_link_id>/pdf/v2/
    
    This is the NEW generator with:
    - Fixed row heights for consistent spacing
    - Cleaner architecture
    - Receipt watermark support
    """
    try:
        from xero_integration.models import XeroInvoiceLink, XeroPayment
        from patients.models import Patient
        from companies.models import Company
        from xero_integration.services import XeroService
        from xero_integration.models import XeroConnection
        import tempfile
        import os
        
        # Get invoice link
        try:
            invoice_link = XeroInvoiceLink.objects.get(id=invoice_link_id)
        except XeroInvoiceLink.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=404)
        
        # Build patient_info dict for v2 generator
        patient_info = {
            'name': '',
            'address': '',
            'city_state': '',
            'postcode': '',
            'reference': '',
            'provider_registration': '4050009706',
            'practitioner': 'Craig Laird\nCPed CM au\nPedorthric Registration # 3454\nwww.pedorthics.org.au',
        }
        
        # Get patient or company info
        if invoice_link.company:
            # Company billing
            company = invoice_link.company
            patient_info['name'] = company.name
            
            if company.address_json:
                addr = company.address_json
                patient_info['address'] = addr.get('street', '')
                patient_info['city_state'] = f"{addr.get('suburb', '')} {addr.get('state', '')}"
                patient_info['postcode'] = addr.get('postcode', '')
            
            # Add patient reference if exists
            if invoice_link.patient:
                patient = invoice_link.patient
                patient_name = f"{patient.first_name} {patient.last_name}"
                ndis = patient.health_number if patient.health_number else ''
                patient_info['reference'] = f"{patient_name}\nNDIS # {ndis}" if ndis else patient_name
        
        elif invoice_link.patient:
            # Patient billing
            patient = invoice_link.patient
            patient_info['name'] = f"{patient.title or ''} {patient.first_name} {patient.last_name}".strip()
            
            if patient.address_json:
                addr = patient.address_json
                patient_info['address'] = addr.get('street', '')
                patient_info['city_state'] = f"{addr.get('suburb', '')} {addr.get('state', '')}"
                patient_info['postcode'] = addr.get('postcode', '')
            
            if patient.health_number:
                patient_info['reference'] = f"NDIS # {patient.health_number}"
        
        # Fetch line items from Xero
        line_items = []
        try:
            connection = XeroConnection.objects.filter(is_active=True).first()
            if connection:
                xero_service = XeroService()
                xero_invoice = xero_service.get_invoice(invoice_link.xero_invoice_id)
                
                if xero_invoice and xero_invoice.line_items:
                    for item in xero_invoice.line_items:
                        gst_rate = 0.0
                        if item.tax_type and ('OUTPUT2' in item.tax_type or 'INPUT2' in item.tax_type):
                            gst_rate = 0.10
                        
                        discount = float(item.discount_rate or 0)
                        unit_price = float(item.unit_amount or 0)
                        quantity = int(item.quantity or 1)
                        
                        # Calculate amount
                        subtotal = unit_price * quantity
                        discount_amount = subtotal * (discount / 100)
                        amount = subtotal - discount_amount
                        
                        line_items.append({
                            'description': item.description or '',
                            'quantity': quantity,
                            'unit_price': unit_price,
                            'discount': discount,
                            'gst_rate': gst_rate,
                            'amount': amount,
                        })
        except Exception as e:
            logger.warning(f"Could not fetch line items from Xero: {e}")
        
        # Fallback line item
        if not line_items:
            line_items.append({
                'description': 'Invoice item',
                'quantity': 1,
                'unit_price': float(invoice_link.total or 0),
                'discount': 0,
                'gst_rate': 0.0,
                'amount': float(invoice_link.total or 0),
            })
        
        # Fetch payments
        payments = []
        payment_records = XeroPayment.objects.filter(
            invoice_link=invoice_link,
            status='AUTHORISED'
        ).order_by('payment_date')
        
        for payment in payment_records:
            payments.append({
                'date': payment.payment_date,
                'reference': payment.reference or f'Payment {payment.xero_payment_id[:8]}',
                'amount': float(payment.amount),
            })
        
        logger.info(f"V2 Generator: Found {len(payments)} payment(s) for invoice {invoice_link.xero_invoice_number}")
        
        # Build invoice_data dict for v2 generator
        invoice_data = {
            'number': invoice_link.xero_invoice_number,
            'date': invoice_link.invoice_date or datetime.now(),
            'due_date': invoice_link.due_date or (datetime.now() + timedelta(days=7)),
            'subtotal': float(invoice_link.subtotal or 0),
            'total_gst': float(invoice_link.total_tax or 0),
            'total': float(invoice_link.total or 0),
        }
        
        # Generate PDF with V2 generator
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            pdf_path = generate_invoice_pdf_v2(
                invoice_data=invoice_data,
                patient_info=patient_info,
                line_items=line_items,
                payments=payments if payments else None,
                filename=tmp_file.name,
                doc_type='invoice'
            )
            
            # Read the generated PDF
            with open(pdf_path, 'rb') as pdf_file:
                pdf_content = pdf_file.read()
            
            # Clean up temp file
            os.unlink(pdf_path)
        
        # Return PDF
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice_link.xero_invoice_number}_V2.pdf"'
        
        return response
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error generating V2 PDF: {error_details}")
        return Response({
            'error': str(e),
            'details': error_details if settings.DEBUG else 'An error occurred'
        }, status=500)


