"""
Unified Document PDF Generator for Walk Easy Pedorthics
Generates professional tax invoices AND quotes matching the FileMaker format

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
    Eliminates code duplication between InvoicePDFGenerator and QuotePDFGenerator.
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
            document_type: 'invoice' or 'quote' (default: 'invoice')
            debug: If True, adds red borders around components for debugging
        
        document_data = {
            # Document number (invoice_number or quote_number)
            'invoice_number': 'INV-6719',  # or 'quote_number': 'QU-6719'
            
            # Dates
            'invoice_date': datetime,  # or 'quote_date'
            'due_date': datetime,  # or 'expiry_date'
            
            # Contact info
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
            'payments': [  # Only for invoices
                {
                    'date': datetime,
                    'type': 'EFT',
                    'amount': 100.00,
                }
            ],
            'payment_terms_days': 7,  # Default 7 days
        }
        """
        self.document_data = document_data
        self.document_type = document_type.lower()
        self.debug = debug
        self.width, self.height = A4
        self.styles = getSampleStyleSheet()
        
        # Set up document-specific labels
        if self.document_type == 'quote':
            self.doc_title = 'Quote'
            self.number_key = 'quote_number'
            self.date_key = 'quote_date'
            self.end_date_key = 'expiry_date'
            self.date_label = 'Quote Date'
            self.number_label = 'Quote Number'
            self.end_date_label = 'Expiry Date'
        else:  # invoice
            self.doc_title = 'Tax Invoice'
            self.number_key = 'invoice_number'
            self.date_key = 'invoice_date'
            self.end_date_key = 'due_date'
            self.date_label = 'Invoice Date'
            self.number_label = 'Invoice Number'
            self.end_date_label = 'Due Date'
        
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom text styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='InvoiceTitle',
            parent=self.styles['Heading1'],
            fontSize=18,  # Reduced from 32pt for more compact look
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
            fontSize=11,  # Increased from 8pt to 11pt for better readability
            textColor=colors.black,
            alignment=TA_RIGHT,
            leading=14,  # Increased line spacing to match larger font
            fontName='Helvetica',  # Removed bold - now regular weight
        ))
        
        # Reference section info (smaller)
        self.styles.add(ParagraphStyle(
            name='RefInfo',
            parent=self.styles['Normal'],
            fontSize=9,  # Increased from 8pt to 9pt
            textColor=colors.black,
            alignment=TA_RIGHT,
            leading=11,  # Slightly more spacing
            fontName='Helvetica',
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
        
        # Create the PDF document with custom page template
        # Use smaller bottom margin - we'll handle footer space dynamically per page
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=0.5*cm,
            bottomMargin=2*cm,  # Default smaller margin for pages without footer
        )
        
        # Build the story (content) - everything EXCEPT footer
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
        
        # Add payments and totals section (side by side if payments exist)
        if self.document_type == 'invoice' and self.document_data.get('payments'):
            combined_elements = self._build_payments_and_totals_section()
            for elem in combined_elements:
                story.append(self._debug_box(elem, "Payments & Totals"))
        else:
            # Just totals if no payments
            totals_elements = self._build_totals_section()
            for elem in totals_elements:
                story.append(self._debug_box(elem, "Totals"))
        
        # Add spacer at the end to reserve space for footer on last page
        # Reduced spacer for tighter layout
        story.append(Spacer(1, 1.5*cm))
        
        # Store total page count (will be set during build)
        total_pages = [0]  # Use list to allow modification in nested function
        
        # Build PDF with custom page template that adds footer
        def add_page_footer(canvas_obj, doc_obj):
            """Add footer only on last page"""
            canvas_obj.saveState()
            
            # Get current page number
            current_page = canvas_obj.getPageNumber()
            
            # Only draw footer on the last page
            if current_page == total_pages[0]:
                # Position footer at bottom
                # With 2cm bottom margin, we have space from 2cm to bottom of page
                # Footer components: payment terms + bank details + blue bar with reduced spacing
                footer_y = 0.8*cm  # Start from 0.8cm from page bottom
                
                # Payment terms text
                terms_days = self.document_data.get('payment_terms_days', 30 if self.document_type == 'quote' else 7)
                end_date = self.document_data[self.end_date_key].strftime('%d/%m/%Y')
                
                # Draw payment terms box (no border) - reduced spacing
                canvas_obj.setFont('Helvetica-Bold', 10)
                # Center the text in the box (box is 17cm wide, centered at 2cm + 8.5cm = 10.5cm from left edge)
                canvas_obj.drawCentredString(10.5*cm, footer_y + 1.6*cm,  # Reduced from 2.0cm
                    f"Please note this is a {terms_days} Day Account. Due on the {end_date}")
                
                # Draw bank details box (no border) - reduced spacing
                canvas_obj.setFont('Helvetica', 8)  # Reduced from 10 to 8
                # Center the bank details text
                canvas_obj.drawCentredString(10.5*cm, footer_y + 0.85*cm,  # Reduced from 1.0cm
                    f"EFT | {self.BUSINESS_NAME} | BSB: {self.BSB} ACC: {self.ACCOUNT} | Please use last name as reference")
                
                # Draw blue footer bar
                canvas_obj.setFillColor(colors.HexColor('#4897d2'))
                canvas_obj.rect(2*cm, footer_y, 17*cm, 0.6*cm, stroke=0, fill=1)
                canvas_obj.setFillColor(colors.white)
                canvas_obj.setFont('Helvetica', 9)
                canvas_obj.drawCentredString(10.5*cm, footer_y + 0.2*cm,
                    f"{self.WEBSITE} | {self.EMAIL} | A.B.N {self.ABN}")
            
            canvas_obj.restoreState()
        
        # Custom canvas that tracks total pages
        class PageCountingCanvas(canvas.Canvas):
            def __init__(self, *args, **kwargs):
                canvas.Canvas.__init__(self, *args, **kwargs)
                self.pages = []
            
            def showPage(self):
                self.pages.append(dict(self.__dict__))
                self._startPage()
            
            def save(self):
                # Set total page count
                total_pages[0] = len(self.pages)
                # Now draw each page with footer callback
                for page_dict in self.pages:
                    self.__dict__.update(page_dict)
                    add_page_footer(self, doc)
                    canvas.Canvas.showPage(self)
                canvas.Canvas.save(self)
        
        # Build PDF with custom canvas
        doc.build(story, canvasmaker=PageCountingCanvas)
        
        # Get the PDF data
        buffer.seek(0)
        return buffer
    
    def _build_header(self):
        """Build logo and business info header"""
        elements = []
        
        # Try to load logo - use Logo_Nexus.png
        logo_path = os.path.join(settings.BASE_DIR, '../frontend/public/images/Logo_Nexus.png')
        address_graphic_path = os.path.join(settings.BASE_DIR, '../frontend/public/images/Address.png')
        
        # Document date info (right side)
        doc_date = self.document_data[self.date_key].strftime('%d/%m/%Y')
        end_date = self.document_data[self.end_date_key].strftime('%d/%m/%Y')
        doc_number = self.document_data[self.number_key]
        
        date_info = Paragraph(
            f"<b>{self.date_label}</b><br/>{doc_date}<br/><br/>"
            f"<b>{self.number_label}</b><br/>{doc_number}<br/><br/>"
            f"<b>{self.end_date_label}</b><br/>{end_date}",
            self.styles['RightInfo']
        )
        
        # Create header table - 3 columns
        header_data = []
        
        if os.path.exists(logo_path):
            logo = Image(logo_path, width=4*cm, height=4*cm, kind='proportional')
            
            # Use Address.png graphic for business info (300 DPI print quality)
            if os.path.exists(address_graphic_path):
                # Load the Address.png graphic - match logo height (4cm)
                # Image is 2710x1373 pixels, aspect ratio = 1.974:1
                # Set height to match logo (4cm), width will auto-scale proportionally
                address_graphic = Image(address_graphic_path, width=9.03*cm, height=4*cm, kind='bound')
                header_data.append([logo, address_graphic, date_info])
            else:
                # Fallback to text if Address.png not found
                business_info = Paragraph(
                    f"<b>{self.BUSINESS_NAME}</b><br/>"
                    f"<br/>"
                    f"43 Harrison St, Cardiff, NSW 2285<br/>"
                    f"<br/>"
                    f"21 Dowe St, Tamworth, NSW 2285<br/>"
                    f"<br/>"
                    f"02 6766 3153<br/>"
                    f"<br/>"
                    f"info@walkeasy.com.au",
                    self.styles['HeaderInfo']
                )
                header_data.append([logo, business_info, date_info])
            
            colWidths = [4*cm, 9.03*cm, 3.97*cm]  # Logo | Business info (expanded) | Date info
        else:
            # No logo, just business info and date info (2 columns)
            business_info = Paragraph(
                f"<b>{self.BUSINESS_NAME}</b><br/>"
                f"<i>P:</i> {self.POSTAL_ADDRESS} | <i>A:</i> {self.PHYSICAL_ADDRESS}<br/>"
                f"<i>Ph:</i> {self.PHONE}",
                self.styles['HeaderInfo']
            )
            
            header_data.append([business_info, date_info])
            colWidths = [11.34*cm, 5.67*cm]  # 2 columns
        
        header_table = Table(header_data, colWidths=colWidths)
        
        # Build table style - add grid lines in debug mode
        table_style = [
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),  # Right-align column 2 (Address.png)
            ('ALIGN', (-1, 0), (-1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]
        
        # Add grid lines in debug mode
        if self.debug:
            table_style.extend([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.blue),  # Blue grid lines
                ('LINEAFTER', (0, 0), (0, -1), 1, colors.red),  # Vertical line after col 1
                ('LINEAFTER', (1, 0), (1, -1), 1, colors.red) if len(colWidths) > 2 else None,  # Vertical line after col 2
            ])
            # Remove None if it exists
            table_style = [s for s in table_style if s is not None]
        
        header_table.setStyle(TableStyle(table_style))
        
        elements.append(header_table)
        
        # Add 5mm spacer before document title
        elements.append(Spacer(1, 0.5*cm))
        
        # Add document title (Tax Invoice or Quote)
        title = Paragraph(f"<b>{self.doc_title}</b>", self.styles['InvoiceTitle'])
        elements.append(title)
        
        return elements
    
    def _build_info_section(self):
        """Build patient info and reference section"""
        elements = []
        
        patient = self.document_data['patient']
        practitioner = self.document_data.get('practitioner', {})
        patient_reference = self.document_data.get('patient_reference')  # Separate reference for company billing
        
        # Patient address - larger font for name
        patient_address = Paragraph(
            f"<font size='14'><b>{patient['name']}</b></font><br/>"
            f"{patient['address']}<br/>"
            f"{patient['suburb']} {patient['state']} {patient['postcode']}",
            self.styles['Normal']
        )
        
        # Reference info - use patient_reference if provided (for company billing), otherwise use patient
        if patient_reference:
            # Company billing: Show patient name in reference even though address is company
            ref_name = patient_reference['name']
            ref_ndis = patient_reference.get('ndis_number', '')
        else:
            # Direct billing: Use patient info
            ref_name = patient['name']
            ref_ndis = patient.get('ndis_number', '')
        
        ref_info_text = f"<b>Reference / PO#</b><br/>{ref_name}"
        if ref_ndis:
            ref_info_text += f"<br/>NDIS # {ref_ndis}"
        ref_info_text += f"<br/><b>Provider Registration #</b> {self.PROVIDER_REGISTRATION}"
        
        # Add practitioner info to reference section
        if practitioner.get('name'):
            ref_info_text += f"<br/><br/><i>Practitioner:</i><br/><b>{practitioner['name']}</b>"
            if practitioner.get('qualification'):
                ref_info_text += f"<br/>{practitioner['qualification']}"
            if practitioner.get('registration'):
                ref_info_text += f"<br/>Pedorthic Registration # {practitioner['registration']}"
            ref_info_text += f"<br/>www.pedorthics.org.au"
        
        # In debug mode, add dummy data to test 11 lines
        if self.debug:
            ref_info_text = (
                "<b>Reference / PO#</b><br/>"
                "Mr. John Smith<br/>"
                "NDIS # 430372789<br/>"
                "<b>Provider Registration #</b> 4050009706<br/>"
                "<br/>"
                "<i>Practitioner:</i><br/>"
                "<b>Craig Laird</b><br/>"
                "CPed CM au<br/>"
                "Pedorthic Registration # 3454<br/>"
                "www.pedorthics.org.au<br/>"
                "Additional info line 11"
            )
        
        ref_info = Paragraph(ref_info_text, self.styles['RefInfo'])
        
        info_table = Table([[patient_address, ref_info]], colWidths=[10*cm, 7*cm])
        
        # Build table style - add borders in debug mode
        info_table_style = [
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (0, 0), 2.5*cm),  # Add 2.5cm left padding to patient address
        ]
        
        # Add grid lines in debug mode
        if self.debug:
            info_table_style.extend([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.blue),  # Blue grid lines
                ('LINEAFTER', (0, 0), (0, -1), 1, colors.red),  # Vertical line between columns
            ])
        
        info_table.setStyle(TableStyle(info_table_style))
        
        elements.append(info_table)
        
        return elements
    
    def _build_line_items_table(self):
        """Build the line items table with support for multi-line descriptions and page breaks"""
        elements = []
        
        # Header row
        table_data = [['Description', 'Qty', 'Unit Price', 'Discount', 'GST', 'Amount']]
        
        # Line items - wrap descriptions in Paragraphs for proper text wrapping
        for item in self.document_data['line_items']:
            qty = item['quantity']
            unit_price = item['unit_price']
            gst_rate = item['gst_rate']
            discount = item.get('discount', 0)  # Discount percentage (0-100)
            
            # Calculate amount with discount
            subtotal = qty * unit_price
            discount_amount = subtotal * (discount / 100)
            amount = subtotal - discount_amount
            
            # Wrap description in Paragraph for proper text wrapping
            # Clean text (escape XML special characters)
            description = str(item['description']).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            # Preserve line breaks in description
            description = description.replace('\n', '<br/>')
            desc_para = Paragraph(description, self.styles['Normal'])
            
            table_data.append([
                desc_para,
                str(qty),
                f"$ {unit_price:,.2f}",
                f"{discount}%" if discount > 0 else "",
                f"{gst_rate:.2%}",
                f"$ {amount:,.2f}",
            ])
        
        line_table = Table(table_data, colWidths=[7*cm, 1.5*cm, 2.5*cm, 1.5*cm, 1.5*cm, 2.5*cm], repeatRows=1)
        line_table.setStyle(TableStyle([
            # Header row styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4897d2')),  # Blue header
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            # Data rows
            ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('VALIGN', (0, 1), (-1, -1), 'TOP'),  # Top align for multi-line descriptions
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('LINEBELOW', (0, 1), (-1, -2), 0.5, colors.grey),
            ('LINEBELOW', (0, -1), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(line_table)
        
        return elements
    
    def _build_payments_and_totals_section(self):
        """Build payments table and totals side-by-side (like in the PDF)"""
        elements = []
        
        # Build payments table (left side)
        payment_data = [['Date', 'Reference', 'Amount']]
        total_paid = 0
        
        for payment in self.document_data['payments']:
            if hasattr(payment['date'], 'strftime'):
                payment_date = payment['date'].strftime('%d/%m/%Y')
            else:
                payment_date = str(payment['date'])
            
            amount = payment.get('amount', 0)
            total_paid += amount
            
            payment_data.append([
                payment_date,
                payment.get('reference', '—'),
                f"$ {amount:,.2f}",
            ])
        
        # Add Total Paid row
        payment_data.append([
            '',
            'Total Paid:',
            f"$ {total_paid:,.2f}",
        ])
        
        # Payment table styling
        payment_table = Table(payment_data, colWidths=[2.5*cm, 5*cm, 3*cm])
        total_paid_row = len(payment_data) - 1
        
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4897d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),  # Reduced padding
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('FONTNAME', (1, total_paid_row), (2, total_paid_row), 'Helvetica-Bold'),
            ('BACKGROUND', (0, total_paid_row), (-1, total_paid_row), colors.HexColor('#f5f5f5')),
            ('LINEABOVE', (0, total_paid_row), (-1, total_paid_row), 1.5, colors.HexColor('#4897d2')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        
        # Build totals table (right side)
        subtotal = 0
        total_discount = 0
        total_gst = 0
        
        for item in self.document_data['line_items']:
            qty = item['quantity']
            unit_price = item['unit_price']
            gst_rate = item['gst_rate']
            discount = item.get('discount', 0)
            
            item_subtotal = qty * unit_price
            subtotal += item_subtotal
            discount_amount = item_subtotal * (discount / 100)
            total_discount += discount_amount
            discounted_amount = item_subtotal - discount_amount
            item_gst = discounted_amount * gst_rate
            total_gst += item_gst
        
        total = subtotal - total_discount + total_gst
        amount_paid = total_paid  # We already calculated this above
        amount_owing = total - amount_paid
        
        totals_data = [
            ['Subtotal', f"$ {subtotal:,.2f}"],
        ]
        
        if total_discount > 0:
            totals_data.append(['Total Discount', f"$ -{total_discount:,.2f}"])
        
        totals_data.extend([
            ['TOTAL GST', f"$ {total_gst:,.2f}"],
            ['TOTAL', f"$ {total:,.2f}"],
            ['', ''],
            ['Total Paid', f"$ -{amount_paid:,.2f}"],
            ['', ''],
            ['Amount Owing', f"$ {amount_owing:,.2f}"],
        ])
        
        totals_table = Table(totals_data, colWidths=[4*cm, 2.5*cm])
        
        # Find row indices for styling
        total_row_idx = 2 if total_discount == 0 else 3
        total_paid_row_idx = total_row_idx + 2
        amount_owing_row_idx = total_paid_row_idx + 2
        
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),  # All normal (no bold)
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('LINEABOVE', (1, total_row_idx), (1, total_row_idx), 1, colors.black),
            ('LINEABOVE', (1, total_paid_row_idx), (1, total_paid_row_idx), 1, colors.black),
            ('LINEABOVE', (1, amount_owing_row_idx), (1, amount_owing_row_idx), 1, colors.black),
        ]))
        
        # Combine both tables side by side in a wrapper table
        combined_table = Table(
            [[payment_table, totals_table]],
            colWidths=[10.5*cm, 6.5*cm]
        )
        combined_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        elements.append(combined_table)
        
        return elements
    
    def _build_payments_section(self):
        """Build payments section showing payment history"""
        elements = []
        
        # Payments table with header
        payment_data = [['Date', 'Reference', 'Amount']]
        
        # Total paid tracker
        total_paid = 0
        
        for payment in self.document_data['payments']:
            # Format date - handle both date and datetime objects
            if hasattr(payment['date'], 'strftime'):
                payment_date = payment['date'].strftime('%d/%m/%Y')
            else:
                payment_date = str(payment['date'])
            
            amount = payment.get('amount', 0)
            total_paid += amount
            
            payment_data.append([
                payment_date,
                payment.get('reference', '—'),
                f"$ {amount:,.2f}",
            ])
        
        # Add Total Paid row
        payment_data.append([
            '',
            'Total Paid:',
            f"$ {total_paid:,.2f}",
        ])
        
        payment_table = Table(payment_data, colWidths=[3.5*cm, 8*cm, 4*cm])
        
        # Calculate the index of the Total Paid row (last row)
        total_paid_row = len(payment_data) - 1
        
        payment_table.setStyle(TableStyle([
            # Header row styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4897d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),  # Date header centered
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),    # Reference header left
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),   # Amount header right
            
            # Data rows styling
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Date column centered
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),    # Reference column left
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),   # Amount column right
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            
            # Total Paid row styling
            ('FONTNAME', (1, total_paid_row), (2, total_paid_row), 'Helvetica-Bold'),
            ('BACKGROUND', (0, total_paid_row), (-1, total_paid_row), colors.HexColor('#f5f5f5')),
            ('LINEABOVE', (0, total_paid_row), (-1, total_paid_row), 1.5, colors.HexColor('#4897d2')),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        
        elements.append(payment_table)
        
        return elements
    
    def _build_totals_section(self):
        """Build totals section"""
        elements = []
        
        # Calculate totals with discount support
        subtotal = 0
        total_discount = 0
        total_gst = 0
        
        for item in self.document_data['line_items']:
            qty = item['quantity']
            unit_price = item['unit_price']
            gst_rate = item['gst_rate']
            discount = item.get('discount', 0)  # Discount percentage (0-100)
            
            # Calculate item subtotal
            item_subtotal = qty * unit_price
            subtotal += item_subtotal
            
            # Calculate discount amount
            discount_amount = item_subtotal * (discount / 100)
            total_discount += discount_amount
            
            # Calculate GST on discounted amount
            discounted_amount = item_subtotal - discount_amount
            item_gst = discounted_amount * gst_rate
            total_gst += item_gst
        
        # Calculate final total
        total = subtotal - total_discount + total_gst
        
        # Calculate amount paid
        amount_paid = sum(p.get('amount', 0) for p in self.document_data.get('payments', []))
        amount_owing = total - amount_paid
        
        # Build totals table (right-aligned)
        totals_data = [
            ['Subtotal', f"$ {subtotal:,.2f}"],
        ]
        
        # Only show discount line if there are discounts
        if total_discount > 0:
            totals_data.append(['Total Discount', f"$ -{total_discount:,.2f}"])
        
        totals_data.extend([
            ['TOTAL GST', f"$ {total_gst:,.2f}"],
            ['TOTAL', f"$ {total:,.2f}"],
        ])
        
        # Add Total Paid row if there are payments
        if amount_paid > 0:
            totals_data.extend([
                ['', ''],  # Spacer
                ['Total Paid', f"$ -{amount_paid:,.2f}"],
            ])
        
        totals_data.extend([
            ['', ''],  # Spacer
            ['Amount Owing', f"$ {amount_owing:,.2f}"],
        ])
        
        totals_table = Table(totals_data, colWidths=[12*cm, 5*cm])
        
        # Find the TOTAL row index dynamically (depends on whether we have discount)
        total_row_idx = 2 if total_discount == 0 else 3
        
        # Find Total Paid row index (if it exists)
        total_paid_row_idx = None
        if amount_paid > 0:
            total_paid_row_idx = total_row_idx + 2  # TOTAL + spacer + Total Paid
            amount_owing_row_idx = total_paid_row_idx + 2  # Total Paid + spacer + Amount Owing
        else:
            amount_owing_row_idx = total_row_idx + 2  # TOTAL + spacer + Amount Owing
        
        # Build style list
        style_list = [
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),  # All normal (no bold)
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('LINEABOVE', (1, total_row_idx), (1, total_row_idx), 1, colors.black),  # Line above TOTAL
        ]
        
        # Add line above Total Paid if it exists
        if total_paid_row_idx:
            style_list.append(('LINEABOVE', (1, total_paid_row_idx), (1, total_paid_row_idx), 1, colors.black))
        
        # Add line above Amount Owing
        style_list.append(('LINEABOVE', (1, amount_owing_row_idx), (1, amount_owing_row_idx), 1, colors.black))
        
        totals_table.setStyle(TableStyle(style_list))
        
        elements.append(totals_table)
        
        return elements
    
    def _build_practitioner_info(self):
        """Build practitioner information section"""
        elements = []
        
        practitioner = self.document_data.get('practitioner', {})
        
        if practitioner.get('name'):
            # Create centered practitioner info
            prac_info_text = f"<i>Practitioner:</i><br/><b>{practitioner['name']}</b>"
            if practitioner.get('qualification'):
                prac_info_text += f"<br/>{practitioner['qualification']}"
            if practitioner.get('registration'):
                prac_info_text += f"<br/>Pedorthic Registration # {practitioner['registration']}"
            prac_info_text += f"<br/>www.pedorthics.org.au"
            
            # Create a centered style for practitioner info
            from reportlab.lib.enums import TA_CENTER
            prac_style = ParagraphStyle(
                name='PractitionerInfo',
                parent=self.styles['Normal'],
                fontSize=9,
                alignment=TA_CENTER,
                leading=11,
            )
            
            prac_info = Paragraph(prac_info_text, prac_style)
            elements.append(Spacer(1, 0.5*cm))
            elements.append(prac_info)
        
        return elements
    
    def _build_payment_terms(self):
        """Build payment terms section"""
        elements = []
        
        terms_days = self.document_data.get('payment_terms_days', 7)
        due_date = self.document_data['due_date'].strftime('%d/%m/%Y')
        
        # Different text for quotes vs invoices
        if self.document_type == 'quote':
            terms_text = f"<b>This quote is valid for {terms_days} days until {due_date}</b>"
        else:
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
        invoice_data: Dictionary with invoice data (see DocumentPDFGenerator.__init__)
        debug: Boolean, if True shows red borders around all components for layout debugging
    
    Returns:
        BytesIO: PDF file buffer
    """
    generator = DocumentPDFGenerator(invoice_data, document_type='invoice', debug=debug)
    return generator.generate()


def generate_quote_pdf(quote_data, debug=False):
    """
    Convenience function to generate quote PDF
    
    Args:
        quote_data: Dictionary with quote data (see DocumentPDFGenerator.__init__)
        debug: Boolean, if True shows red borders around all components for layout debugging
    
    Returns:
        BytesIO: PDF file buffer
    """
    generator = DocumentPDFGenerator(quote_data, document_type='quote', debug=debug)
    return generator.generate()

