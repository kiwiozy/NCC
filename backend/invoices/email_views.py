"""
Email Sending Views for Invoices/Quotes

Updated to use the new EmailGenerator system for consistent, professional emails.
"""
import logging
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from xero_integration.models import XeroInvoiceLink, XeroQuoteLink
from gmail_integration.services import GmailService
from .email_signature_helper import append_signature_to_email
from .email_wrapper import wrap_email_html, get_email_type_from_category
from .models import EmailTemplate
from .email_generator import EmailGenerator
from .email_data_models import Contact, LineItem, PaymentMethod

logger = logging.getLogger(__name__)


class SendInvoiceEmailView(APIView):
    """
    Send invoice/quote email using EmailGenerator
    
    POST /api/invoices/send-email/
    {
        "invoice_id": "uuid",
        "to": "recipient@example.com",
        "cc": "cc@example.com",  // optional
        "bcc": "bcc@example.com",  // optional
        "subject": "Invoice INV-001",  // optional - auto-generated if not provided
        "body_html": "<p>Email body</p>",  // optional - only for legacy mode
        "attach_pdf": true,
        "from_email": "info@walkeasy.com.au",
        "document_type": "invoice",  // "invoice", "receipt", or "quote"
        "use_generator": true,  // NEW: use EmailGenerator (recommended)
        "template_id": "uuid"  // optional - for custom header color
    }
    """
    
    def post(self, request):
        try:
            data = request.data
            invoice_id = data.get('invoice_id')
            to_email = data.get('to')
            cc_email = data.get('cc', '')
            bcc_email = data.get('bcc', '')
            subject = data.get('subject')  # Optional now
            body_html = data.get('body_html')  # Optional now
            attach_pdf = data.get('attach_pdf', True)
            from_email = data.get('from_email', 'info@walkeasy.com.au')
            document_type = data.get('document_type', 'invoice')
            use_generator = data.get('use_generator', True)  # Default to generator
            template_id = data.get('template_id')
            
            # Validation
            if not all([invoice_id, to_email]):
                return Response({
                    'error': 'Missing required fields: invoice_id, to'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Legacy mode validation
            if not use_generator and not all([subject, body_html]):
                return Response({
                    'error': 'Legacy mode requires subject and body_html'
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
            
            # Get header color from template if provided
            header_color = None
            if template_id:
                try:
                    template = EmailTemplate.objects.get(id=template_id)
                    header_color = template.header_color
                except EmailTemplate.DoesNotExist:
                    pass
            
            # Generate email using new generator or legacy mode
            if use_generator:
                # NEW: Use EmailGenerator for consistent professional emails
                email_html, email_subject = self._generate_email_with_generator(
                    invoice,
                    document_type,
                    header_color
                )
                # Use provided subject if given, otherwise use generated
                if not subject:
                    subject = email_subject
            else:
                # LEGACY: Use provided body_html
                email_type = get_email_type_from_category(document_type)
                title = None
                
                if document_type in ['invoice', 'receipt']:
                    title = getattr(invoice, 'xero_invoice_number', None)
                elif document_type == 'quote':
                    title = getattr(invoice, 'xero_quote_number', None)
                
                # Wrap body_html in professional email structure
                email_html = wrap_email_html(
                    body_html=body_html,
                    header_color=header_color or '#10b981',
                    email_type=email_type,
                    title=title
                )
            
            # Append email signature
            body_with_signature = append_signature_to_email(
                email_body_html=email_html,
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
    
    def _generate_email_with_generator(self, invoice, document_type, header_color=None):
        """
        Generate email using EmailGenerator
        
        Args:
            invoice: XeroInvoiceLink or XeroQuoteLink object
            document_type: 'invoice', 'receipt', or 'quote'
            header_color: Optional custom header color
        
        Returns:
            Tuple of (email_html, subject)
        """
        # Build email data from invoice/quote
        if document_type == 'quote':
            email_data = self._build_quote_data(invoice)
        else:
            email_data = self._build_invoice_data(invoice, document_type)
        
        # Get clinician from invoice (if available)
        clinician = None
        if hasattr(invoice, 'clinician') and invoice.clinician:
            clinician = invoice.clinician
        
        # Create generator with clinician for signature
        generator = EmailGenerator(
            email_type=document_type,
            header_color=header_color,
            clinician=clinician
        )
        
        # Generate email HTML
        email_html = generator.generate(email_data)
        
        # Generate subject
        preview = generator.generate_preview(email_data)
        subject = preview['subject']
        
        return email_html, subject
    
    def _build_invoice_data(self, invoice, document_type):
        """Build InvoiceEmailData or ReceiptEmailData from XeroInvoiceLink"""
        from datetime import datetime
        from .email_data_models import Contact, LineItem, PaymentMethod
        
        # Parse line items (if available)
        line_items = []
        if hasattr(invoice, 'line_items') and invoice.line_items:
            for item in invoice.line_items:
                line_items.append(LineItem(
                    description=item.get('Description', ''),
                    quantity=Decimal(str(item.get('Quantity', 1))),
                    unit_amount=Decimal(str(item.get('UnitAmount', 0))),
                    tax_amount=Decimal(str(item.get('TaxAmount', 0))),
                    total=Decimal(str(item.get('LineAmount', 0)))
                ))
        else:
            # Create a single line item from invoice total if no line items available
            line_items.append(LineItem(
                description=f'Invoice {invoice.xero_invoice_number}',
                quantity=Decimal('1'),
                unit_amount=Decimal(str(invoice.subtotal or 0)),
                tax_amount=Decimal(str(invoice.total_tax or 0)),
                total=Decimal(str(invoice.total or 0))
            ))
        
        # Parse payment methods
        payment_methods = []
        if hasattr(invoice, 'payment_methods') and invoice.payment_methods:
            for method in invoice.payment_methods:
                payment_methods.append(PaymentMethod(
                    method_type=method.get('type', 'bank'),
                    account_name=method.get('account_name'),
                    bsb=method.get('bsb'),
                    account_number=method.get('account_number'),
                    reference=invoice.xero_invoice_number
                ))
        else:
            # Default payment method
            payment_methods.append(PaymentMethod(
                method_type='bank',
                account_name='WalkEasy Nexus Pty Ltd',
                bsb='062-692',
                account_number='1060 3588',
                reference=invoice.xero_invoice_number
            ))
        
        # Determine status
        status_val = invoice.status if hasattr(invoice, 'status') and invoice.status else 'DRAFT'
        
        # Get contact details
        contact_name = 'Valued Customer'
        contact_email = None
        
        if hasattr(invoice, 'contact_name') and invoice.contact_name:
            contact_name = invoice.contact_name
        elif hasattr(invoice, 'patient') and invoice.patient:
            contact_name = invoice.patient.get_full_name()
            if hasattr(invoice.patient, 'communication') and invoice.patient.communication:
                contact_email = invoice.patient.communication.get('email')
        
        if hasattr(invoice, 'contact_email') and invoice.contact_email:
            contact_email = invoice.contact_email
        
        # Build data dict based on document type
        if document_type == 'receipt':
            # Receipt-specific data (no due_date or amount_due)
            data = {
                'contact': Contact(
                    name=contact_name,
                    email=contact_email,
                ),
                'invoice_number': invoice.xero_invoice_number,
                'amount_paid': Decimal(str(invoice.amount_paid or invoice.total or 0)),
                'payment_method': 'Bank Transfer',
                'receipt_number': invoice.xero_invoice_number,
                'invoice_date': invoice.invoice_date,
                'payment_date': datetime.now().date(),
                'payment_reference': None,
                'line_items': line_items,
                'subtotal': Decimal(str(invoice.subtotal or 0)),
                'tax_total': Decimal(str(invoice.total_tax or 0)),
                'total': Decimal(str(invoice.total or 0)),
                'clinic_name': 'WalkEasy Team',
            }
        else:
            # Invoice-specific data (has due_date, amount_due, payment_methods)
            data = {
                'contact': Contact(
                    name=contact_name,
                    email=contact_email,
                ),
                'invoice_number': invoice.xero_invoice_number,
                'invoice_date': invoice.invoice_date or datetime.now().date(),
                'due_date': invoice.due_date or datetime.now().date(),
                'subtotal': Decimal(str(invoice.subtotal or 0)),
                'tax_total': Decimal(str(invoice.total_tax or 0)),
                'total': Decimal(str(invoice.total or 0)),
                'amount_paid': Decimal(str(invoice.amount_paid or 0)),
                'amount_due': Decimal(str(invoice.amount_due or 0)),
                'line_items': line_items,
                'payment_methods': payment_methods,
                'status': status_val,
                'clinic_name': 'WalkEasy Team',
            }
        
        return data
    
    def _build_quote_data(self, quote):
        """Build QuoteEmailData from XeroQuoteLink"""
        from datetime import datetime, timedelta
        from .email_data_models import Contact, LineItem
        
        # Parse line items (if available)
        line_items = []
        if hasattr(quote, 'line_items') and quote.line_items:
            for item in quote.line_items:
                line_items.append(LineItem(
                    description=item.get('Description', ''),
                    quantity=Decimal(str(item.get('Quantity', 1))),
                    unit_amount=Decimal(str(item.get('UnitAmount', 0))),
                    tax_amount=Decimal(str(item.get('TaxAmount', 0))),
                    total=Decimal(str(item.get('LineAmount', 0)))
                ))
        else:
            # Create a single line item from quote total if no line items available
            line_items.append(LineItem(
                description=f'Quote {quote.xero_quote_number}',
                quantity=Decimal('1'),
                unit_amount=Decimal(str(quote.subtotal or 0)),
                tax_amount=Decimal(str(quote.total_tax or 0)),
                total=Decimal(str(quote.total or 0))
            ))
        
        # Get contact details
        contact_name = 'Valued Customer'
        contact_email = None
        
        if hasattr(quote, 'contact_name') and quote.contact_name:
            contact_name = quote.contact_name
        elif hasattr(quote, 'patient') and quote.patient:
            contact_name = quote.patient.get_full_name()
            if hasattr(quote.patient, 'communication') and quote.patient.communication:
                contact_email = quote.patient.communication.get('email')
        
        if hasattr(quote, 'contact_email') and quote.contact_email:
            contact_email = quote.contact_email
        
        # Calculate expiry date
        quote_date = quote.quote_date or datetime.now().date()
        expiry_date = quote.expiry_date or (quote_date + timedelta(days=30))
        
        data = {
            'contact': Contact(
                name=contact_name,
                email=contact_email,
            ),
            'quote_number': quote.xero_quote_number,
            'quote_date': quote_date,
            'expiry_date': expiry_date,
            'subtotal': Decimal(str(quote.subtotal or 0)),
            'tax_total': Decimal(str(quote.total_tax or 0)),
            'total': Decimal(str(quote.total or 0)),
            'line_items': line_items,
            'status': quote.status if hasattr(quote, 'status') and quote.status else 'DRAFT',
            'clinic_name': 'WalkEasy Nexus',
        }
        
        return data
