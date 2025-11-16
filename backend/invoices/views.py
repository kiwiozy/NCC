"""
Invoice PDF Views
"""
from datetime import datetime, timedelta
from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .pdf_generator import generate_invoice_pdf


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
    """
    try:
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
        patient_info = {
            'name': '',
            'address': '',
            'suburb': '',
            'state': '',
            'postcode': '',
        }
        
        if invoice_link.patient:
            patient = invoice_link.patient
            patient_info['name'] = f"{patient.title or ''} {patient.first_name} {patient.last_name}".strip()
            
            # Get address from address_json
            if patient.address_json:
                addr = patient.address_json
                patient_info['address'] = addr.get('street', '')
                patient_info['suburb'] = addr.get('suburb', '')
                patient_info['state'] = addr.get('state', '')
                patient_info['postcode'] = addr.get('postcode', '')
            
            # Get NDIS number
            if patient.ndis_number:
                patient_info['ndis_number'] = patient.ndis_number
        
        elif invoice_link.company:
            company = invoice_link.company
            patient_info['name'] = company.name
            
            # Get address from address_json
            if company.address_json:
                addr = company.address_json
                patient_info['address'] = addr.get('street', '')
                patient_info['suburb'] = addr.get('suburb', '')
                patient_info['state'] = addr.get('state', '')
                patient_info['postcode'] = addr.get('postcode', '')
        
        # Parse line items from xero_line_items JSON
        line_items = []
        if invoice_link.xero_line_items:
            for item in invoice_link.xero_line_items:
                gst_rate = 0.0
                if item.get('tax_type') == 'OUTPUT':
                    gst_rate = 0.10  # 10% GST
                
                line_items.append({
                    'description': item.get('description', ''),
                    'quantity': int(item.get('quantity', 1)),
                    'unit_price': float(item.get('unit_amount', 0)),
                    'gst_rate': gst_rate,
                })
        
        # Prepare invoice data
        invoice_data = {
            'invoice_number': invoice_link.xero_invoice_number,
            'invoice_date': invoice_link.invoice_date or datetime.now(),
            'due_date': invoice_link.due_date or (datetime.now() + timedelta(days=7)),
            'patient': patient_info,
            'practitioner': {},  # TODO: Get from appointment or settings
            'line_items': line_items,
            'payments': [],  # TODO: Get from Xero or database
            'payment_terms_days': 7,
        }
        
        # Generate PDF
        pdf_buffer = generate_invoice_pdf(invoice_data)
        
        # Return PDF
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice_link.xero_invoice_number}.pdf"'
        
        return response
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error generating PDF: {error_details}")
        return Response({
            'error': str(e),
            'details': error_details
        }, status=400)

