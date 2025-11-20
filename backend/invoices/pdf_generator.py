"""
PDF Generator Helper Functions

These functions generate PDF bytes directly without going through HTTP views.
Used for email attachments and other programmatic PDF generation.
"""
import logging
from typing import Optional
from io import BytesIO

logger = logging.getLogger(__name__)


def generate_invoice_pdf_bytes(invoice_link_id: str, is_receipt: bool = False) -> Optional[bytes]:
    """
    Generate invoice PDF bytes for email attachment
    
    Args:
        invoice_link_id: UUID of XeroInvoiceLink
        is_receipt: Whether to add PAID watermark
    
    Returns:
        PDF content as bytes, or None if generation fails
    """
    try:
        from xero_integration.models import XeroInvoiceLink, XeroConnection
        from patients.models import Patient
        from companies.models import Company
        from xero_integration.services import XeroService
        from .invoice_generator import generate_invoice_pdf
        from decimal import Decimal
        
        # Get invoice link
        try:
            invoice_link = XeroInvoiceLink.objects.get(id=invoice_link_id)
        except XeroInvoiceLink.DoesNotExist:
            logger.error(f"Invoice link {invoice_link_id} not found")
            return None
        
        # Get patient or company info
        patient_info = {
            'name': '',
            'address': '',
            'suburb': '',
            'state': '',
            'postcode': '',
        }
        
        patient_reference = None
        
        if invoice_link.company:
            company = invoice_link.company
            patient_info['name'] = company.name
            
            if company.address_json:
                addr = company.address_json
                patient_info['address'] = addr.get('street', '')
                patient_info['suburb'] = addr.get('suburb', '')
                patient_info['state'] = addr.get('state', '')
                patient_info['postcode'] = addr.get('postcode', '')
            
            if invoice_link.patient:
                patient = invoice_link.patient
                patient_reference = {
                    'name': f"{patient.first_name} {patient.last_name}",
                    'ndis_number': patient.health_number if patient.health_number else ''
                }
        
        elif invoice_link.patient:
            patient = invoice_link.patient
            patient_info['name'] = f"{patient.title or ''} {patient.first_name} {patient.last_name}".strip()
            
            if patient.address_json:
                addr = patient.address_json
                patient_info['address'] = addr.get('street', '')
                patient_info['suburb'] = addr.get('suburb', '')
                patient_info['state'] = addr.get('state', '')
                patient_info['postcode'] = addr.get('postcode', '')
            
            if patient.health_number:
                patient_info['ndis_number'] = patient.health_number
        
        # Fetch line items from Xero
        line_items = []
        connection = XeroConnection.objects.filter(is_active=True).first()
        if connection:
            xero_service = XeroService()
            xero_invoice = xero_service.get_invoice(invoice_link.xero_invoice_id)
            
            if xero_invoice and 'LineItems' in xero_invoice:
                for item in xero_invoice['LineItems']:
                    line_items.append({
                        'description': item.get('Description', ''),
                        'quantity': Decimal(str(item.get('Quantity', 1))),
                        'unit_price': Decimal(str(item.get('UnitAmount', 0))),
                        'tax_amount': Decimal(str(item.get('TaxAmount', 0))),
                        'total': Decimal(str(item.get('LineAmount', 0)))
                    })
        
        # Build invoice data
        invoice_data = {
            'invoice_number': invoice_link.xero_invoice_number,
            'invoice_date': invoice_link.invoice_date,
            'due_date': invoice_link.due_date,
            'patient_name': patient_info['name'],
            'patient_address': patient_info['address'],
            'patient_suburb': patient_info['suburb'],
            'patient_state': patient_info['state'],
            'patient_postcode': patient_info['postcode'],
            'patient_ndis': patient_info.get('ndis_number', ''),
            'line_items': line_items,
            'subtotal': invoice_link.subtotal or Decimal('0'),
            'tax': invoice_link.total_tax or Decimal('0'),
            'total': invoice_link.total or Decimal('0'),
            'amount_paid': invoice_link.amount_paid or Decimal('0'),
            'amount_due': invoice_link.amount_due or Decimal('0'),
            'status': invoice_link.status,
            'reference': patient_reference['name'] if patient_reference else '',
            'is_receipt': is_receipt,
        }
        
        # Generate PDF
        pdf_buffer = generate_invoice_pdf(invoice_data)
        return pdf_buffer.getvalue()
        
    except Exception as e:
        logger.error(f"Error generating invoice PDF: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None


def generate_quote_pdf_bytes(quote_link_id: str) -> Optional[bytes]:
    """
    Generate quote PDF bytes for email attachment
    
    Args:
        quote_link_id: UUID of XeroQuoteLink
    
    Returns:
        PDF content as bytes, or None if generation fails
    """
    try:
        from xero_integration.models import XeroQuoteLink, XeroConnection
        from patients.models import Patient
        from companies.models import Company
        from xero_integration.services import XeroService
        from .quote_generator import generate_quote_pdf
        from decimal import Decimal
        
        # Get quote link
        try:
            quote_link = XeroQuoteLink.objects.get(id=quote_link_id)
        except XeroQuoteLink.DoesNotExist:
            logger.error(f"Quote link {quote_link_id} not found")
            return None
        
        # Get patient or company info
        patient_info = {
            'name': '',
            'address': '',
            'suburb': '',
            'state': '',
            'postcode': '',
        }
        
        patient_reference = None
        
        if quote_link.company:
            company = quote_link.company
            patient_info['name'] = company.name
            
            if company.address_json:
                addr = company.address_json
                patient_info['address'] = addr.get('street', '')
                patient_info['suburb'] = addr.get('suburb', '')
                patient_info['state'] = addr.get('state', '')
                patient_info['postcode'] = addr.get('postcode', '')
            
            if quote_link.patient:
                patient = quote_link.patient
                patient_reference = {
                    'name': f"{patient.first_name} {patient.last_name}",
                }
        
        elif quote_link.patient:
            patient = quote_link.patient
            patient_info['name'] = f"{patient.title or ''} {patient.first_name} {patient.last_name}".strip()
            
            if patient.address_json:
                addr = patient.address_json
                patient_info['address'] = addr.get('street', '')
                patient_info['suburb'] = addr.get('suburb', '')
                patient_info['state'] = addr.get('state', '')
                patient_info['postcode'] = addr.get('postcode', '')
            
            if patient.health_number:
                patient_info['ndis_number'] = patient.health_number
        
        # Fetch line items from Xero
        line_items = []
        connection = XeroConnection.objects.filter(is_active=True).first()
        if connection:
            xero_service = XeroService()
            xero_quote = xero_service.get_quote(quote_link.xero_quote_id)
            
            if xero_quote and 'LineItems' in xero_quote:
                for item in xero_quote['LineItems']:
                    line_items.append({
                        'description': item.get('Description', ''),
                        'quantity': Decimal(str(item.get('Quantity', 1))),
                        'unit_price': Decimal(str(item.get('UnitAmount', 0))),
                        'tax_amount': Decimal(str(item.get('TaxAmount', 0))),
                        'total': Decimal(str(item.get('LineAmount', 0)))
                    })
        
        # Build quote data
        quote_data = {
            'quote_number': quote_link.xero_quote_number,
            'quote_date': quote_link.quote_date,
            'expiry_date': quote_link.expiry_date,
            'patient_name': patient_info['name'],
            'patient_address': patient_info['address'],
            'patient_suburb': patient_info['suburb'],
            'patient_state': patient_info['state'],
            'patient_postcode': patient_info['postcode'],
            'patient_ndis': patient_info.get('ndis_number', ''),
            'line_items': line_items,
            'subtotal': quote_link.subtotal or Decimal('0'),
            'tax': quote_link.total_tax or Decimal('0'),
            'total': quote_link.total or Decimal('0'),
            'status': quote_link.status,
            'reference': patient_reference['name'] if patient_reference else '',
        }
        
        # Generate PDF
        pdf_buffer = generate_quote_pdf(quote_data)
        return pdf_buffer.getvalue()
        
    except Exception as e:
        logger.error(f"Error generating quote PDF: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None
