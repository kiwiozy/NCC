"""
Email Sending Views for Invoices/Quotes
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from xero_integration.models import XeroInvoiceLink, XeroQuoteLink
from gmail_integration.services import GmailService
from .email_signature_helper import append_signature_to_email

logger = logging.getLogger(__name__)


class SendInvoiceEmailView(APIView):
    """
    Send invoice/quote email with template
    
    POST /api/invoices/send-email/
    {
        "invoice_id": "uuid",
        "to": "recipient@example.com",
        "cc": "cc@example.com",  // optional
        "bcc": "bcc@example.com",  // optional
        "subject": "Invoice INV-001",
        "body_html": "<p>Email body</p>",
        "attach_pdf": true,
        "from_email": "info@walkeasy.com.au",
        "document_type": "invoice"  // "invoice", "receipt", or "quote"
    }
    """
    
    def post(self, request):
        try:
            data = request.data
            invoice_id = data.get('invoice_id')
            to_email = data.get('to')
            cc_email = data.get('cc', '')
            bcc_email = data.get('bcc', '')
            subject = data.get('subject')
            body_html = data.get('body_html')
            attach_pdf = data.get('attach_pdf', True)
            from_email = data.get('from_email', 'info@walkeasy.com.au')
            document_type = data.get('document_type', 'invoice')
            
            # Validation
            if not all([invoice_id, to_email, subject, body_html]):
                return Response({
                    'error': 'Missing required fields: invoice_id, to, subject, body_html'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get invoice/quote
            invoice = None
            if document_type in ['invoice', 'receipt']:
                try:
                    invoice = XeroInvoiceLink.objects.get(id=invoice_id)
                except XeroInvoiceLink.DoesNotExist:
                    return Response({
                        'error': 'Invoice not found'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:  # quote
                try:
                    invoice = XeroQuoteLink.objects.get(id=invoice_id)
                except XeroQuoteLink.DoesNotExist:
                    return Response({
                        'error': 'Quote not found'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Append email signature
            body_with_signature = append_signature_to_email(
                email_body_html=body_html,
                sender_email=from_email,
                user=request.user
            )
            
            # Generate PDF attachment if requested
            attachments = []
            if attach_pdf:
                try:
                    # Generate PDF (reuse existing PDF generation logic)
                    if document_type == 'quote':
                        from .quote_views import generate_xero_quote_pdf
                        from django.http import HttpRequest, QueryDict
                        
                        # Create a request for PDF generation
                        pdf_request = HttpRequest()
                        pdf_request.method = 'GET'
                        pdf_request.GET = QueryDict('', mutable=True)
                        pdf_response = generate_xero_quote_pdf(pdf_request, str(invoice_id))
                    else:
                        from django.http import HttpRequest, QueryDict
                        pdf_request = HttpRequest()
                        pdf_request.method = 'GET'
                        pdf_request.GET = QueryDict('', mutable=True)
                        if document_type == 'receipt':
                            pdf_request.GET['receipt'] = 'true'
                        
                        from .views import generate_xero_invoice_pdf
                        pdf_response = generate_xero_invoice_pdf(pdf_request, str(invoice_id))
                    
                    if pdf_response.status_code == 200:
                        pdf_content = pdf_response.content
                        pdf_filename = f"{invoice.xero_invoice_number if hasattr(invoice, 'xero_invoice_number') else invoice.xero_quote_number}_{document_type}.pdf"
                        
                        attachments.append({
                            'content': pdf_content,
                            'filename': pdf_filename,
                            'mimetype': 'application/pdf'
                        })
                        logger.info(f"PDF attached: {pdf_filename} ({len(pdf_content)} bytes)")
                    else:
                        logger.warning(f"Failed to generate PDF attachment: {pdf_response.status_code}")
                except Exception as e:
                    logger.error(f"Error generating PDF attachment: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
                    # Continue without attachment
            
            # Send email via Gmail
            gmail_service = GmailService()
            
            # Split CC and BCC if multiple
            cc_list = [email.strip() for email in cc_email.split(',') if email.strip()] if cc_email else []
            bcc_list = [email.strip() for email in bcc_email.split(',') if email.strip()] if bcc_email else []
            
            sent_email = gmail_service.send_email(
                to_emails=[to_email],
                subject=subject,
                body_html=body_with_signature,
                body_text=None,  # Gmail will auto-generate
                from_address=from_email,
                cc_emails=cc_list if cc_list else None,
                bcc_emails=bcc_list if bcc_list else None,
                attachments=attachments if attachments else None
            )
            
            logger.info(f"Email sent successfully for {document_type} {invoice_id}")
            return Response({
                'success': True,
                'message': f'{document_type.capitalize()} email sent successfully',
                'email_id': str(sent_email.id)
            })
                
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Error sending email: {error_details}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
