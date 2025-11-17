"""
Quote PDF Views
"""
import logging
from datetime import datetime, timedelta
from django.http import HttpResponse
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .quote_pdf_generator import QuotePDFGenerator

logger = logging.getLogger(__name__)


def generate_quote_pdf(quote_data, debug=False):
    """
    Generate PDF for a quote
    
    Args:
        quote_data: Quote information dictionary
        debug: Whether to show debug grid lines
    
    Returns:
        BytesIO buffer containing the PDF
    """
    generator = QuotePDFGenerator(quote_data, debug=debug)
    return generator.generate()


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
        if quote_link.patient:
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
                
        elif quote_link.company:
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
        
        # Convert Xero line items to PDF format
        line_items = []
        if xero_quote.line_items:
            for item in xero_quote.line_items:
                line_items.append({
                    'description': item.description or 'Quote item',
                    'quantity': float(item.quantity) if item.quantity else 1,
                    'unit_price': float(item.unit_amount) if item.unit_amount else 0,
                    'discount': float(item.discount_rate) if item.discount_rate else 0,
                    'gst_rate': 0.10 if item.tax_type and 'OUTPUT' in item.tax_type else 0.0,
                })
        
        # Prepare quote data
        quote_data = {
            'quote_number': quote_link.xero_quote_number,
            'quote_date': quote_link.quote_date or datetime.now(),
            'expiry_date': quote_link.expiry_date or (datetime.now() + timedelta(days=30)),
            'patient': patient_info,
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

