"""
Unified Invoice & Quote PDF Generator for Walk Easy Pedorthics
Generates professional tax invoices and quotes matching the FileMaker format

This replaces the duplicate InvoicePDFGenerator and QuotePDFGenerator classes.
"""
import os
from datetime import datetime, timedelta
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, KeepTogether, PageBreak
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from django.conf import settings

# Try to import svglib for SVG support
try:
    from svglib.svglib import svg2rlg
    from reportlab.graphics import renderPDF
    SVGLIB_AVAILABLE = True
except ImportError:
    SVGLIB_AVAILABLE = False


class DocumentPDFGenerator:
    """
    Generate Walk Easy Pedorthics invoice and quote PDFs
    
    Unified generator that handles both document types with a single codebase.
    """
    
    # Business details
    BUSINESS_NAME = "Walk Easy Pedorthics Australia Pty LTD"
    POSTAL_ADDRESS = "PO Box 210, Tamworth, NSW 2340"
    PHYSICAL_ADDRESS = "21 Dowe St, Tamworth, NSW 2340"
    PHONE = "02 6766-3153"
    WEBSITE = "www.walkeasy.com.au"
    EMAIL = "info@walkeasy.com.au"
    ABN = "63 612 528 971"
    BSB = "013287"
    ACCOUNT = "222796921"
    PROVIDER_REGISTRATION = "4050009706"
    
    def __init__(self, document_data, document_type='invoice', debug=False):
        """
        Initialize with document data
        
        Args:
            document_data: Dictionary with document information
            document_type: 'invoice' or 'quote'
            debug: If True, add visual debugging boxes
        
        document_data = {
            # Common fields
            'number': 'INV-6719' or 'QU-6719',
            'date': datetime,
            'end_date': datetime,  # due_date for invoices, expiry_date for quotes
            'patient': {
                'name': 'Mr. Scott Laird',
                'address': '8 Sherborne Street',
                'suburb': 'Tamworth',
                'state': 'NSW',
                'postcode': '2340',
                'ndis_number': '1234567890',
            },
            'practitioner': {
                'name': 'Craig Laird',
                'qualification': 'CPed CM au',
                'registration': '3454'
            },
            'line_items': [
                {
                    'description': 'Consultation',
                    'quantity': 1,
                    'unit_price': 150.00,
                    'discount': 0.0,  # 0-100 percentage
                    'gst_rate': 0.10,  # 0.10 = 10% GST, 0.0 = GST Free
                },
            ],
            'payments': [  # For invoices only
                {
                    'date': datetime,
                    'amount': 50.00,
                    'method': 'Cash',
                    'reference': 'Payment 1'
                }
            ],
            'payment_terms_days': 7,  # Default 7 days for invoices, 30 for quotes
        }
        """
        self.document_data = document_data
        self.document_type = document_type.lower()
        self.debug = debug
        self.width, self.height = A4
        self.styles = getSampleStyleSheet()
        
        # Document type specific labels
        if self.document_type == 'invoice':
            self.doc_label = 'Invoice'
            self.doc_label_upper = 'Tax Invoice'
        else:
            self.doc_label = 'Quote'
            self.doc_label_upper = 'Quote'
        
        # Define custom styles
        self._setup_styles()
    
    def _setup_styles(self):
        """Define custom paragraph styles"""
        # ... (keep all the existing style definitions from InvoicePDFGenerator)
        # This method is identical in both files, so just copy it once
        pass
    
    def generate(self):
        """Generate the PDF and return as BytesIO"""
        buffer = BytesIO()
        
        # Create document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=3.5*cm,
            bottomMargin=4*cm,
        )
        
        # Build story
        story = []
        
        # Add header (with business logo and patient info)
        header_elements = self._build_header()
        for elem in header_elements:
            story.append(self._debug_box(elem, "Header"))
        
        story.append(Spacer(1, 0.5*cm))
        
        # Add document type title
        story.append(self._build_title())
        
        story.append(Spacer(1, 0.5*cm))
        
        # Add patient/customer details
        patient_elements = self._build_patient_section()
        for elem in patient_elements:
            story.append(self._debug_box(elem, "Patient"))
        
        story.append(Spacer(1, 0.5*cm))
        
        # Add line items table
        items_table = self._build_line_items_table()
        story.append(self._debug_box(items_table, "LineItems"))
        
        story.append(Spacer(1, 0.5*cm))
        
        # Add payments section if invoice and has payments
        if self.document_type == 'invoice' and self.document_data.get('payments'):
            payment_elements = self._build_payments_section()
            for elem in payment_elements:
                story.append(self._debug_box(elem, "Payments"))
        
        # Build PDF with custom page template
        doc.build(story, onFirstPage=self._add_page_decoration, onLaterPages=self._add_page_decoration)
        
        # Return buffer
        buffer.seek(0)
        return buffer
    
    def _get_date_label(self):
        """Get the appropriate date label based on document type"""
        return 'Invoice Date' if self.document_type == 'invoice' else 'Quote Date'
    
    def _get_end_date_label(self):
        """Get the appropriate end date label based on document type"""
        return 'Due Date' if self.document_type == 'invoice' else 'Expiry Date'
    
    def _get_number_label(self):
        """Get the appropriate number label based on document type"""
        return 'Invoice Number' if self.document_type == 'invoice' else 'Quote Number'
    
    # ... (rest of the methods from InvoicePDFGenerator, with dynamic labels)
    
    # The key change is using self.doc_label, self._get_date_label(), etc.
    # instead of hard-coded "Invoice" or "Quote"


# Convenience functions for backward compatibility
def generate_invoice_pdf(invoice_data, debug=False):
    """Generate invoice PDF (backward compatible)"""
    generator = DocumentPDFGenerator(invoice_data, document_type='invoice', debug=debug)
    return generator.generate()


def generate_quote_pdf(quote_data, debug=False):
    """Generate quote PDF (backward compatible)"""
    generator = DocumentPDFGenerator(quote_data, document_type='quote', debug=debug)
    return generator.generate()

