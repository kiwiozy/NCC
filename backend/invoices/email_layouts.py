"""
Email Layouts - Layout definitions for each email type

Each layout class defines how to compose components into a complete email.
Layouts are responsible for the structure and flow of content.
"""
from typing import Optional
from datetime import datetime
from .email_data_models import (
    InvoiceEmailData,
    ReceiptEmailData,
    QuoteEmailData,
    ATReportEmailData,
    LetterEmailData
)
from .email_components import EmailComponents


class EmailLayoutBase:
    """Base class for all email layouts"""
    
    def __init__(self, header_color: str = '#3b82f6'):
        """
        Initialize layout
        
        Args:
            header_color: Color for header and accents
        """
        self.header_color = header_color
        self.components = EmailComponents()
    
    def render(self, data) -> str:
        """
        Render the complete email content (without wrapper)
        
        Args:
            data: EmailDataBase subclass
        
        Returns:
            HTML content string
        """
        raise NotImplementedError("Subclasses must implement render()")
    
    def format_currency(self, amount) -> str:
        """Format currency value"""
        return f"${float(amount):.2f}"
    
    def format_date(self, date_obj) -> str:
        """Format date in Australian format"""
        if isinstance(date_obj, str):
            return date_obj
        return date_obj.strftime('%d %b %Y')


class InvoiceLayout(EmailLayoutBase):
    """Layout for invoice emails"""
    
    def render(self, data: InvoiceEmailData) -> str:
        """
        Render invoice email content
        
        Args:
            data: InvoiceEmailData object
        
        Returns:
            HTML content
        """
        sections = []
        
        # Greeting
        sections.append(self.components.greeting(data.contact.name))
        
        # Status badge if PAID or OVERDUE
        if data.status == 'PAID':
            sections.append(self.components.status_badge('PAID', '#5b95cf'))
        elif data.is_overdue():
            sections.append(self.components.status_badge('OVERDUE', '#ef4444'))
        
        # Intro paragraph
        if data.status == 'PAID':
            intro = f"Thank you for your payment. Your invoice {data.invoice_number} has been marked as PAID."
        elif data.is_overdue():
            intro = f"This is a reminder that invoice {data.invoice_number} is now overdue. Please arrange payment at your earliest convenience."
        else:
            intro = f"Thank you for visiting {data.clinic_name}. Please find your invoice details below."
        
        sections.append(self.components.paragraph(intro))
        
        # Invoice details info card
        fields = [
            {'label': 'Invoice Number', 'value': data.invoice_number},
            {'label': 'Invoice Date', 'value': self.format_date(data.invoice_date)},
            {'label': 'Due Date', 'value': self.format_date(data.due_date)},
            {'label': 'Subtotal', 'value': self.format_currency(data.subtotal)},
            {'label': 'Tax (GST)', 'value': self.format_currency(data.tax_total)},
            {'label': 'Total', 'value': self.format_currency(data.total)},
        ]
        
        # Add payment info if partially paid
        if data.amount_paid > 0:
            fields.append({'label': 'Amount Paid', 'value': self.format_currency(data.amount_paid)})
        
        # Highlight amount due
        fields.append({
            'label': 'Amount Due',
            'value': self.format_currency(data.amount_due),
            'highlight': data.amount_due > 0
        })
        
        sections.append(self.components.info_card('Invoice Details', fields, self.header_color))
        
        # Line items table
        if data.line_items:
            sections.append(self.components.line_items_table(data.line_items, show_tax=True))
        
        # Payment methods (only if amount due)
        if data.amount_due > 0 and data.payment_methods:
            sections.append(self.components.payment_methods_section(
                data.payment_methods,
                data.invoice_number
            ))
        
        # Overdue alert
        if data.is_overdue():
            days_overdue = (datetime.now().date() - data.due_date).days
            sections.append(self.components.alert_box(
                f"This invoice is {days_overdue} days overdue. Please contact us if you need to arrange a payment plan.",
                alert_type='warning'
            ))
        
        # Notes (if any)
        if data.notes:
            sections.append(self.components.paragraph(data.notes, css_class='notes'))
        
        # Closing
        if data.status == 'PAID':
            sections.append(self.components.thank_you_section("Thank you for your business!"))
        
        sections.append(self.components.closing(data.clinic_name))
        
        return '\n\n'.join(sections)


class ReceiptLayout(EmailLayoutBase):
    """Layout for receipt emails"""
    
    def render(self, data: ReceiptEmailData) -> str:
        """
        Render receipt email content
        
        Args:
            data: ReceiptEmailData object
        
        Returns:
            HTML content
        """
        sections = []
        
        # Greeting
        sections.append(self.components.greeting(data.contact.name))
        
        # PAID badge
        sections.append(self.components.status_badge('✓ PAYMENT RECEIVED', '#5b95cf'))
        
        # Intro
        intro = f"Thank you for your payment. Please find attached your receipt for invoice {data.invoice_number}."
        sections.append(self.components.paragraph(intro))
        
        # Payment details
        fields = [
            {'label': 'Invoice Number', 'value': data.invoice_number},
            {'label': 'Receipt Number', 'value': data.receipt_number or data.invoice_number},
        ]
        
        if data.invoice_date:
            fields.append({'label': 'Invoice Date', 'value': self.format_date(data.invoice_date)})
        
        fields.extend([
            {'label': 'Payment Date', 'value': self.format_date(data.payment_date)},
            {'label': 'Payment Method', 'value': data.payment_method},
        ])
        
        if data.payment_reference:
            fields.append({'label': 'Payment Reference', 'value': data.payment_reference})
        
        fields.append({
            'label': 'Amount Paid',
            'value': self.format_currency(data.amount_paid),
            'highlight': True
        })
        
        sections.append(self.components.info_card('Payment Details', fields, self.header_color))
        
        # Line items (if provided)
        if data.line_items:
            sections.append(self.components.line_items_table(data.line_items, show_tax=True))
        
        # Confirmation message
        sections.append(self.components.alert_box(
            "This invoice is now marked as PAID in our system. No further payment is required.",
            alert_type='success'
        ))
        
        # Thank you section
        sections.append(self.components.thank_you_section("Thank you for your business!"))
        
        # Closing
        sections.append(self.components.closing(data.clinic_name))
        
        return '\n\n'.join(sections)


class QuoteLayout(EmailLayoutBase):
    """Layout for quote emails"""
    
    def render(self, data: QuoteEmailData) -> str:
        """
        Render quote email content
        
        Args:
            data: QuoteEmailData object
        
        Returns:
            HTML content
        """
        sections = []
        
        # Greeting
        sections.append(self.components.greeting(data.contact.name))
        
        # Intro
        intro = f"Thank you for your enquiry. Please find your quote details below. This quote is valid until {self.format_date(data.expiry_date)}."
        sections.append(self.components.paragraph(intro))
        
        # Quote details
        fields = [
            {'label': 'Quote Number', 'value': data.quote_number},
            {'label': 'Quote Date', 'value': self.format_date(data.quote_date)},
            {'label': 'Valid Until', 'value': self.format_date(data.expiry_date)},
            {'label': 'Subtotal', 'value': self.format_currency(data.subtotal)},
            {'label': 'Tax (GST)', 'value': self.format_currency(data.tax_total)},
            {
                'label': 'Total',
                'value': self.format_currency(data.total),
                'highlight': True
            },
        ]
        
        sections.append(self.components.info_card('Quote Details', fields, self.header_color))
        
        # Line items
        if data.line_items:
            sections.append(self.components.line_items_table(data.line_items, show_tax=True))
        
        # Expiry warning if close to expiry
        days_until_expiry = (data.expiry_date - datetime.now().date()).days
        if days_until_expiry <= 7:
            sections.append(self.components.alert_box(
                f"This quote expires in {days_until_expiry} days. Please contact us if you would like to proceed.",
                alert_type='warning'
            ))
        
        # Notes
        if data.notes:
            sections.append(self.components.paragraph(data.notes, css_class='notes'))
        
        # Next steps
        sections.append(self.components.paragraph(
            "To proceed with this quote, please contact us at your earliest convenience. We're happy to answer any questions you may have."
        ))
        
        # Closing
        sections.append(self.components.closing(data.clinic_name))
        
        return '\n\n'.join(sections)


class ATReportLayout(EmailLayoutBase):
    """Layout for AT Report emails"""
    
    def render(self, data: ATReportEmailData) -> str:
        """
        Render AT Report email content
        
        Args:
            data: ATReportEmailData object
        
        Returns:
            HTML content
        """
        sections = []
        
        # Greeting
        sections.append(self.components.greeting(data.contact.name))
        
        # Custom message (if provided)
        if data.custom_message:
            sections.append(self.components.paragraph(data.custom_message))
        else:
            # Default intro
            intro = f"Please find attached the {data.report_type} for {data.participant_name}."
            sections.append(self.components.paragraph(intro))
        
        # Report details
        fields = [
            {'label': 'Participant', 'value': data.participant_name},
        ]
        
        if data.ndis_number:
            fields.append({'label': 'NDIS Number', 'value': data.ndis_number})
        
        if data.assessment_date:
            fields.append({'label': 'Assessment Date', 'value': self.format_date(data.assessment_date)})
        
        fields.extend([
            {'label': 'Report Date', 'value': self.format_date(data.report_date)},
            {'label': 'Assessor', 'value': data.assessor_name},
        ])
        
        sections.append(self.components.info_card('Report Details', fields, self.header_color))
        
        # Important note
        sections.append(self.components.alert_box(
            "This report is provided as a professional assessment. Please review carefully and contact us if you have any questions.",
            alert_type='info'
        ))
        
        # Next steps
        sections.append(self.components.paragraph(
            "If you have any questions about this report or need further clarification, please don't hesitate to contact us."
        ))
        
        # Closing
        sections.append(self.components.closing(data.clinic_name))
        
        return '\n\n'.join(sections)


class LetterLayout(EmailLayoutBase):
    """Layout for letter emails"""
    
    def render(self, data: LetterEmailData) -> str:
        """
        Render letter email content
        
        Args:
            data: LetterEmailData object
        
        Returns:
            HTML content
        """
        sections = []
        
        # Recipient name with title if provided
        if data.recipient_name:
            recipient = data.recipient_title + ' ' + data.recipient_name if data.recipient_title else data.recipient_name
            sections.append(self.components.greeting(recipient, custom_greeting=f"Dear {recipient},"))
        else:
            sections.append(self.components.greeting(data.contact.name))
        
        # Subject line (if provided)
        if data.subject:
            sections.append(self.components.paragraph(
                f"<strong>Re: {data.subject}</strong>",
                css_class='subject-line'
            ))
        
        # Patient details (if this is a clinical letter)
        if data.patient_name:
            fields = [
                {'label': 'Patient Name', 'value': data.patient_name},
            ]
            if data.patient_dob:
                fields.append({'label': 'Date of Birth', 'value': self.format_date(data.patient_dob)})
            
            sections.append(self.components.info_card('Patient Details', fields, self.header_color))
        
        # Body paragraphs
        for paragraph in data.body_paragraphs:
            sections.append(self.components.paragraph(paragraph))
        
        # Sender details (if provided)
        if data.sender_name:
            signature = data.sender_name
            if data.sender_qualifications:
                signature += f", {data.sender_qualifications}"
            if data.sender_title:
                signature += f"<br>{data.sender_title}"
            
            sections.append(self.components.paragraph(
                f"<strong>{signature}</strong>",
                css_class='sender-details'
            ))
        else:
            sections.append(self.components.closing(data.clinic_name))
        
        return '\n\n'.join(sections)


# Factory to get appropriate layout
def get_layout(email_type: str, header_color: str = '#3b82f6') -> EmailLayoutBase:
    """
    Factory function to get the appropriate layout class
    
    Args:
        email_type: Type of email (invoice, receipt, quote, at_report, letter)
        header_color: Color for header and accents
    
    Returns:
        Appropriate EmailLayoutBase subclass
    
    Raises:
        ValueError: If email_type is unknown
    """
    layouts = {
        'invoice': InvoiceLayout,
        'receipt': ReceiptLayout,
        'quote': QuoteLayout,
        'at_report': ATReportLayout,
        'letter': LetterLayout,
    }
    
    layout_class = layouts.get(email_type)
    if not layout_class:
        raise ValueError(f"Unknown email type: {email_type}")
    
    return layout_class(header_color)

