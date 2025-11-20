"""
Quote PDF Views
"""
import logging
from datetime import datetime, timedelta
from django.http import HttpResponse
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .document_pdf_generator import generate_quote_pdf

logger = logging.getLogger(__name__)


@api_view(['GET'])
def generate_xero_quote_pdf(request, quote_link_id):
    """
    Generate PDF for a Xero quote link
    
    GET /api/quotes/xero/<quote_link_id>/pdf/
    GET /api/quotes/xero/<quote_link_id>/pdf/?debug=true  (for layout debugging)
    """
    try:
        # Check for debug mode
        debug_mode = request.GET.get('debug', 'false').lower() == 'true'
        
        from xero_integration.models import XeroQuoteLink, XeroConnection
        from xero_integration.services import XeroService
        
        # Get the quote link
        try:
            quote_link = XeroQuoteLink.objects.select_related('patient', 'company').get(id=quote_link_id)
        except XeroQuoteLink.DoesNotExist:
            return Response({'error': 'Quote not found'}, status=404)
        
        # Initialize Xero service
        xero_service = XeroService()
        
        # Fetch full quote details from Xero including line items
        xero_quote = xero_service.get_quote(quote_link.xero_quote_id)
        
        if not xero_quote:
            return Response({'error': 'Could not fetch quote from Xero'}, status=500)
        
        # Build patient/contact info
        # IMPORTANT: Company takes precedence for address (determines who quote is billed to)
        if quote_link.company:
            # Company pays - use company's address BUT keep patient name for reference
            company = quote_link.company
            patient_info = {
                'name': company.name,
                'address': '',
                'suburb': '',
                'state': '',
                'postcode': '',
                'ndis_number': ''
            }
            
            # Get address from address_json
            if company.address_json:
                addr = company.address_json
                patient_info['address'] = addr.get('street', '')
                patient_info['suburb'] = addr.get('suburb', '')
                patient_info['state'] = addr.get('state', '')
                patient_info['postcode'] = addr.get('postcode', '')
            
            # Store patient reference separately for the Reference/PO# field
            patient_reference = None
            if quote_link.patient:
                patient = quote_link.patient
                patient_reference = {
                    'name': f"{patient.first_name} {patient.last_name}",
                    'ndis_number': patient.health_number if patient.health_number else ''
                }
                
        elif quote_link.patient:
            # Patient pays directly - use patient's address
            patient = quote_link.patient
            patient_info = {
                'name': f"{patient.first_name} {patient.last_name}",
                'address': '',
                'suburb': '',
                'state': '',
                'postcode': '',
                'ndis_number': ''
            }
            
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
            
            # Patient reference is same as patient_info for direct billing
            patient_reference = None
                
        else:
            # Fallback to contact from Xero
            patient_info = {
                'name': xero_quote.contact.name if xero_quote.contact else 'Unknown',
                'address': '',
                'suburb': '',
                'state': '',
                'postcode': '',
                'ndis_number': ''
            }
            patient_reference = None
        
        # Convert Xero line items to PDF format
        line_items = []
        xero_reference = None  # Will store the Reference/PO# from Xero quote
        
        # Extract reference/PO# from Xero quote
        if hasattr(xero_quote, 'reference'):
            xero_reference = xero_quote.reference
            logger.info(f"Original Xero reference: {xero_reference}")
            
            # Always regenerate reference from patient funding if patient exists
            # This ensures old quotes get updated references based on current funding
            if quote_link.patient:
                from xero_integration.services import generate_smart_reference
                regenerated_reference = generate_smart_reference(quote_link.patient)
                
                # Only use regenerated reference if it's different from just the patient name
                # (i.e., if there's actual funding source info)
                patient_full_name = quote_link.patient.get_full_name()
                if regenerated_reference != patient_full_name:
                    xero_reference = regenerated_reference
                    logger.info(f"Using regenerated reference from funding source: {xero_reference}")
                else:
                    logger.info(f"No funding source, keeping original reference")
            
            logger.info(f"Final Xero quote reference: {xero_reference}")
        
        if xero_quote.line_items:
            for item in xero_quote.line_items:
                # Determine GST rate based on tax_type
                # EXEMPTOUTPUT = GST Free (0%)
                # OUTPUT2 = GST on Income (10%)
                # INPUT2 = GST on Expenses (10%)
                gst_rate = 0.0
                if item.tax_type and ('OUTPUT2' in item.tax_type or 'INPUT2' in item.tax_type):
                    gst_rate = 0.10
                
                line_items.append({
                    'description': item.description or 'Quote item',
                    'quantity': float(item.quantity) if item.quantity else 1,
                    'unit_price': float(item.unit_amount) if item.unit_amount else 0,
                    'discount': float(item.discount_rate) if item.discount_rate else 0,
                    'gst_rate': gst_rate,
                })
        
        # Prepare quote data
        quote_data = {
            'quote_number': quote_link.xero_quote_number,
            'quote_date': quote_link.quote_date or datetime.now(),
            'expiry_date': quote_link.expiry_date or (datetime.now() + timedelta(days=30)),
            'patient': patient_info,
            'patient_reference': patient_reference,  # Separate patient reference for company billing
            'xero_reference': xero_reference,  # Reference/PO# from Xero quote (funding-based)
            'practitioner': {
                'name': 'Craig Laird',
                'qualification': 'CPed CM au',
                'registration': '3454'
            },
            'line_items': line_items,
            'payments': [],  # Quotes don't have payments
            'payment_terms_days': 30,  # Default for quotes
        }
        
        # Generate PDF
        pdf_buffer = generate_quote_pdf(quote_data, debug=debug_mode)
        
        # Return PDF
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Quote_{quote_link.xero_quote_number}.pdf"'
        
        return response
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error generating quote PDF: {error_details}")
        return Response({
            'error': str(e),
            'details': error_details if settings.DEBUG else 'An error occurred'
        }, status=400)

