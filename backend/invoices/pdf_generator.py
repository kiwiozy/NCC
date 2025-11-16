"""
Invoice PDF Generator for Walk Easy Pedorthics
Generates professional tax invoices matching the FileMaker format
"""
import os
from datetime import datetime, timedelta
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from django.conf import settings


class InvoicePDFGenerator:
    """Generate Walk Easy Pedorthics invoice PDFs"""
    
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
    
    def __init__(self, invoice_data, debug=False):
        """
        Initialize with invoice data
        
        invoice_data = {
            'invoice_number': 'INV-6719',
            'invoice_date': datetime,
            'due_date': datetime,
            'patient': {
                'name': 'Mr. Scott Laird',
                'address': '8 Sherborne Street',
                'suburb': 'North Tamworth',
                'state': 'NSW',
                'postcode': '2340',
                'ndis_number': '430372789',
            },
            'practitioner': {
                'name': 'Craig Laird',
                'qualification': 'CPed CM au',
                'registration': '3454',
            },
            'line_items': [
                {
                    'description': 'Custom Cast Footwear...',
                    'quantity': 2,
                    'unit_price': 5400.00,
                    'gst_rate': 0.00,  # 0.00 for GST Free, 0.10 for 10%
                }
            ],
            'payments': [
                {
                    'date': datetime,
                    'type': 'EFT',
                    'amount': 100.00,
                }
            ],
            'payment_terms_days': 7,  # Default 7 days
        }
        """
        self.invoice_data = invoice_data
        self.debug = debug
        self.width, self.height = A4
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom text styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='InvoiceTitle',
            parent=self.styles['Heading1'],
            fontSize=32,
            textColor=colors.black,
            spaceAfter=20,
            alignment=TA_RIGHT,
            fontName='Helvetica-Bold',
        ))
        
        # Header info style
        self.styles.add(ParagraphStyle(
            name='HeaderInfo',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.black,
            alignment=TA_LEFT,
            leading=12,
        ))
        
        # Right aligned info
        self.styles.add(ParagraphStyle(
            name='RightInfo',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            alignment=TA_RIGHT,
            leading=14,
            fontName='Helvetica-Bold',
        ))
        
        # Footer style
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.white,
            alignment=TA_CENTER,
            leading=12,
        ))
    
    def _debug_box(self, element, label=""):
        """
        Wrap an element with a red border for debugging layout
        
        Args:
            element: The element to wrap
            label: Optional label for the box
        
        Returns:
            The element wrapped in a table with red border if debug=True, otherwise returns element as-is
        """
        if not self.debug:
            return element
        
        # Wrap in a table with red border
        wrapper_table = Table([[element]])
        wrapper_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 0.5, colors.red),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        return wrapper_table
    
    def generate(self):
        """Generate the PDF and return as BytesIO"""
        buffer = BytesIO()
        
        # Create the PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm,
        )
        
        # Build the story (content)
        story = []
        
        # Add logo and header
        header_elements = self._build_header()
        for elem in header_elements:
            story.append(self._debug_box(elem, "Header"))
        story.append(Spacer(1, 0.5*cm))
        
        # Add patient and invoice info
        info_elements = self._build_info_section()
        for elem in info_elements:
            story.append(self._debug_box(elem, "Patient Info"))
        story.append(Spacer(1, 0.5*cm))
        
        # Add line items table
        line_items_elements = self._build_line_items_table()
        for elem in line_items_elements:
            story.append(self._debug_box(elem, "Line Items"))
        story.append(Spacer(1, 0.5*cm))
        
        # Add payments section if any
        if self.invoice_data.get('payments'):
            payment_elements = self._build_payments_section()
            for elem in payment_elements:
                story.append(self._debug_box(elem, "Payments"))
            story.append(Spacer(1, 0.3*cm))
        
        # Add totals
        totals_elements = self._build_totals_section()
        for elem in totals_elements:
            story.append(self._debug_box(elem, "Totals"))
        story.append(Spacer(1, 0.5*cm))
        
        # Add payment terms
        terms_elements = self._build_payment_terms()
        for elem in terms_elements:
            story.append(self._debug_box(elem, "Payment Terms"))
        story.append(Spacer(1, 0.3*cm))
        
        # Add footer
        footer_elements = self._build_footer()
        for elem in footer_elements:
            story.append(self._debug_box(elem, "Footer"))
        
        # Build PDF
        doc.build(story)
        
        # Get the PDF data
        buffer.seek(0)
        return buffer
    
    def _build_header(self):
        """Build logo and business info header"""
        elements = []
        
        # Try to load logo - use Logo_Nexus.png
        logo_path = os.path.join(settings.BASE_DIR, '../frontend/public/images/Logo_Nexus.png')
        
        # Create header table with logo and business info
        header_data = []
        
        if os.path.exists(logo_path):
            logo = Image(logo_path, width=4*cm, height=4*cm, kind='proportional')
            business_info = Paragraph(
                f"<b>{self.BUSINESS_NAME}</b><br/>"
                f"<i>P:</i> {self.POSTAL_ADDRESS} | <i>A:</i> {self.PHYSICAL_ADDRESS}<br/>"
                f"<i>Ph:</i> {self.PHONE}",
                self.styles['HeaderInfo']
            )
            
            # Invoice date info (right side)
            invoice_date = self.invoice_data['invoice_date'].strftime('%d/%m/%Y')
            due_date = self.invoice_data['due_date'].strftime('%d/%m/%Y')
            
            date_info = Paragraph(
                f"<b>Invoice Date</b><br/>{invoice_date}<br/>"
                f"<b>Invoice Number</b><br/>{self.invoice_data['invoice_number']}<br/>"
                f"<b>Due Date</b><br/>{due_date}",
                self.styles['RightInfo']
            )
            
            header_data.append([logo, business_info, date_info])
        else:
            # No logo, just business info and date info
            invoice_date = self.invoice_data['invoice_date'].strftime('%d/%m/%Y')
            due_date = self.invoice_data['due_date'].strftime('%d/%m/%Y')
            
            business_info = Paragraph(
                f"<b>{self.BUSINESS_NAME}</b><br/>"
                f"<i>P:</i> {self.POSTAL_ADDRESS} | <i>A:</i> {self.PHYSICAL_ADDRESS}<br/>"
                f"<i>Ph:</i> {self.PHONE}",
                self.styles['HeaderInfo']
            )
            
            date_info = Paragraph(
                f"<b>Invoice Date</b><br/>{invoice_date}<br/>"
                f"<b>Invoice Number</b><br/>{self.invoice_data['invoice_number']}<br/>"
                f"<b>Due Date</b><br/>{due_date}",
                self.styles['RightInfo']
            )
            
            header_data.append([business_info, date_info])
        
        # Adjust column widths based on whether logo exists
        if os.path.exists(logo_path):
            header_table = Table(header_data, colWidths=[4*cm, 9*cm, 4*cm])
        else:
            header_table = Table(header_data, colWidths=[13*cm, 4*cm])
        
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(header_table)
        
        # Add "Tax Invoice" title
        title = Paragraph("<b>Tax Invoice</b>", self.styles['InvoiceTitle'])
        elements.append(title)
        
        return elements
    
    def _build_info_section(self):
        """Build patient info and reference section"""
        elements = []
        
        patient = self.invoice_data['patient']
        practitioner = self.invoice_data.get('practitioner', {})
        
        # Patient address
        patient_address = Paragraph(
            f"<b>{patient['name']}</b><br/>"
            f"{patient['address']}<br/>"
            f"{patient['suburb']} {patient['state']} {patient['postcode']}",
            self.styles['Normal']
        )
        
        # Reference info
        ref_info_text = f"<b>Reference / PO#</b><br/>{patient['name']}"
        if patient.get('ndis_number'):
            ref_info_text += f"<br/>NDIS # {patient['ndis_number']}"
        ref_info_text += f"<br/><b>Provider Registration #</b> {self.PROVIDER_REGISTRATION}"
        
        if practitioner.get('name'):
            ref_info_text += f"<br/><br/><i>Practitioner:</i><br/><b>{practitioner['name']}</b>"
            if practitioner.get('qualification'):
                ref_info_text += f"<br/>{practitioner['qualification']}"
            if practitioner.get('registration'):
                ref_info_text += f"<br/>Pedorthic Registration # {practitioner['registration']}"
            ref_info_text += f"<br/>www.pedorthics.org.au"
        
        ref_info = Paragraph(ref_info_text, self.styles['RightInfo'])
        
        info_table = Table([[patient_address, ref_info]], colWidths=[10*cm, 7*cm])
        info_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(info_table)
        
        return elements
    
    def _build_line_items_table(self):
        """Build the line items table"""
        elements = []
        
        # Header row
        table_data = [['Description', 'Qty', 'Unit Price', 'GST', 'Amount']]
        
        # Line items
        for item in self.invoice_data['line_items']:
            qty = item['quantity']
            unit_price = item['unit_price']
            gst_rate = item['gst_rate']
            amount = qty * unit_price
            
            table_data.append([
                item['description'],
                str(qty),
                f"$ {unit_price:,.2f}",
                f"{gst_rate:.2%}",
                f"$ {amount:,.2f}",
            ])
        
        line_table = Table(table_data, colWidths=[9*cm, 2*cm, 2.5*cm, 2*cm, 2.5*cm])
        line_table.setStyle(TableStyle([
            # Header row styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B5998')),  # Blue header
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            # Data rows
            ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('LINEBELOW', (0, 1), (-1, -2), 0.5, colors.grey),
            ('LINEBELOW', (0, -1), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(line_table)
        
        return elements
    
    def _build_payments_section(self):
        """Build payments section"""
        elements = []
        
        # Payments header
        payment_header = Paragraph("<b>Payments</b>", self.styles['Heading2'])
        
        # Payments table
        payment_data = [['Date', 'Type of Payment', 'Amount']]
        
        for payment in self.invoice_data['payments']:
            payment_date = payment['date'].strftime('%d/%m/%Y')
            payment_data.append([
                payment_date,
                payment['type'],
                f"$ {payment['amount']:,.2f}" if payment.get('amount') else '?',
            ])
        
        payment_table = Table(payment_data, colWidths=[4*cm, 6*cm, 4*cm])
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B5998')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        
        elements.append(payment_table)
        
        return elements
    
    def _build_totals_section(self):
        """Build totals section"""
        elements = []
        
        # Calculate totals
        subtotal = sum(item['quantity'] * item['unit_price'] for item in self.invoice_data['line_items'])
        total_gst = sum(
            item['quantity'] * item['unit_price'] * item['gst_rate'] 
            for item in self.invoice_data['line_items']
        )
        total = subtotal + total_gst
        
        # Calculate amount paid
        amount_paid = sum(p.get('amount', 0) for p in self.invoice_data.get('payments', []))
        amount_owing = total - amount_paid
        
        # Build totals table (right-aligned)
        totals_data = [
            ['Subtotal', f"$ {subtotal:,.2f}"],
            ['TOTAL GST', f"$ {total_gst:,.2f}"],
            ['TOTAL', f"$ {total:,.2f}"],
            ['', ''],  # Spacer
            ['Amount Owing', f"$ {amount_owing:,.2f}"],
        ]
        
        totals_table = Table(totals_data, colWidths=[12*cm, 5*cm])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('LINEABOVE', (1, 2), (1, 2), 1, colors.black),  # Line above TOTAL
            ('LINEABOVE', (1, 4), (1, 4), 1, colors.black),  # Line above Amount Owing
        ]))
        
        elements.append(totals_table)
        
        return elements
    
    def _build_payment_terms(self):
        """Build payment terms section"""
        elements = []
        
        terms_days = self.invoice_data.get('payment_terms_days', 7)
        due_date = self.invoice_data['due_date'].strftime('%d/%m/%Y')
        
        terms_text = f"<b>Please note this is a {terms_days} Day Account. Due on the {due_date}</b>"
        terms = Paragraph(terms_text, self.styles['Normal'])
        elements.append(terms)
        
        bank_text = f"EFT | {self.BUSINESS_NAME} | BSB: {self.BSB} ACC: {self.ACCOUNT} | Please use last name as reference"
        bank_details = Paragraph(bank_text, self.styles['Normal'])
        elements.append(bank_details)
        
        return elements
    
    def _build_footer(self):
        """Build footer section"""
        elements = []
        
        footer_text = f"{self.WEBSITE} | {self.EMAIL} | A.B.N {self.ABN}"
        footer = Paragraph(footer_text, self.styles['Normal'])
        
        # Create footer with blue background
        footer_table = Table([[footer]], colWidths=[17*cm])
        footer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#3B5998')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        elements.append(footer_table)
        
        return elements


def generate_invoice_pdf(invoice_data, debug=False):
    """
    Convenience function to generate invoice PDF
    
    Args:
        invoice_data: Dictionary with invoice data (see InvoicePDFGenerator.__init__)
        debug: Boolean, if True shows red borders around all components for layout debugging
    
    Returns:
        BytesIO: PDF file buffer
    """
    generator = InvoicePDFGenerator(invoice_data, debug=debug)
    return generator.generate()

