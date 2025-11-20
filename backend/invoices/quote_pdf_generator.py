"""
Quote PDF Generator for Walk Easy Pedorthics
Generates professional quotes matching the invoice format
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


class QuotePDFGenerator:
    """Generate Walk Easy Pedorthics quote PDFs"""
    
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
    
    def __init__(self, quote_data, debug=False):
        """
        Initialize with quote data
        
        quote_data = {
            'quote_number': 'QUO-6719',
            'quote_date': datetime,
            'expiry_date': datetime,
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
        self.quote_data = quote_data
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
        
        # Add payments section if any
        if self.quote_data.get('payments'):
            payment_elements = self._build_payments_section()
            for elem in payment_elements:
                story.append(self._debug_box(elem, "Payments"))
            story.append(Spacer(1, 0.3*cm))
        
        # Add totals
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
                terms_days = self.quote_data.get('payment_terms_days', 7)
                expiry_date = self.quote_data['expiry_date'].strftime('%d/%m/%Y')
                
                # Draw payment terms box (no border) - reduced spacing
                canvas_obj.setFont('Helvetica-Bold', 10)
                # Center the text in the box (box is 17cm wide, centered at 2cm + 8.5cm = 10.5cm from left edge)
                canvas_obj.drawCentredString(10.5*cm, footer_y + 1.6*cm,  # Reduced from 2.0cm
                    f"Please note this is a {terms_days} Day Account. Due on the {expiry_date}")
                
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
        
        # Invoice date info (right side)
        quote_date = self.quote_data['quote_date'].strftime('%d/%m/%Y')
        expiry_date = self.quote_data['expiry_date'].strftime('%d/%m/%Y')
        
        date_info = Paragraph(
            f"<b>Quote Date</b><br/>{quote_date}<br/><br/>"
            f"<b>Quote Number</b><br/>{self.quote_data['quote_number']}<br/><br/>"
            f"<b>Expiry Date</b><br/>{expiry_date}",
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
        
        # Add 5mm spacer before Quote title
        elements.append(Spacer(1, 0.5*cm))
        
        # Add "Quote" title
        title = Paragraph("<b>Quote</b>", self.styles['InvoiceTitle'])
        elements.append(title)
        
        return elements
    
    def _build_info_section(self):
        """Build patient info and reference section"""
        elements = []
        
        patient = self.quote_data['patient']
        practitioner = self.quote_data.get('practitioner', {})
        
        # Patient address - larger font for name
        patient_address = Paragraph(
            f"<font size='14'><b>{patient['name']}</b></font><br/>"
            f"{patient['address']}<br/>"
            f"{patient['suburb']} {patient['state']} {patient['postcode']}",
            self.styles['Normal']
        )
        
        # Reference info - priority order:
        # 1. xero_reference (the smart reference from Xero, e.g., "Enable Vendor # 508809")
        # 2. patient_reference (for company billing - just name)
        # 3. patient info (default - just name)
        xero_reference = self.quote_data.get('xero_reference')  # Smart reference from Xero
        patient_reference = self.quote_data.get('patient_reference')  # Separate reference for company billing
        
        if xero_reference:
            # Use the smart reference from Xero (funding-based) - NO hardcoded label
            ref_info_text = f"{xero_reference}"
        elif patient_reference:
            # Company billing: Show just patient name (no prefixes, no NDIS#)
            ref_name = patient_reference['name']
            ref_info_text = f"{ref_name}"
        else:
            # Direct billing: Show just patient name (no prefixes, no NDIS#)
            ref_info_text = f"{patient['name']}"
        
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
        for item in self.quote_data['line_items']:
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
    
    def _build_payments_section(self):
        """Build payments section"""
        elements = []
        
        # Payments header
        payment_header = Paragraph("<b>Payments</b>", self.styles['Heading2'])
        
        # Payments table
        payment_data = [['Date', 'Type of Payment', 'Amount']]
        
        for payment in self.quote_data['payments']:
            payment_date = payment['date'].strftime('%d/%m/%Y')
            payment_data.append([
                payment_date,
                payment['type'],
                f"$ {payment['amount']:,.2f}" if payment.get('amount') else '?',
            ])
        
        payment_table = Table(payment_data, colWidths=[4*cm, 6*cm, 4*cm])
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4897d2')),
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
        
        # Calculate totals with discount support
        subtotal = 0
        total_discount = 0
        total_gst = 0
        
        for item in self.quote_data['line_items']:
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
        amount_paid = sum(p.get('amount', 0) for p in self.quote_data.get('payments', []))
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
            ['', ''],  # Spacer
            ['Amount Owing', f"$ {amount_owing:,.2f}"],
        ])
        
        totals_table = Table(totals_data, colWidths=[12*cm, 5*cm])
        
        # Find the TOTAL row index dynamically
        total_row_idx = 2 if total_discount == 0 else 3
        amount_owing_row_idx = total_row_idx + 2
        
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('LINEABOVE', (1, total_row_idx), (1, total_row_idx), 1, colors.black),  # Line above TOTAL
            ('LINEABOVE', (1, amount_owing_row_idx), (1, amount_owing_row_idx), 1, colors.black),  # Line above Amount Owing
        ]))
        
        elements.append(totals_table)
        
        return elements
    
    def _build_practitioner_info(self):
        """Build practitioner information section"""
        elements = []
        
        practitioner = self.quote_data.get('practitioner', {})
        
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
        
        terms_days = self.quote_data.get('payment_terms_days', 7)
        expiry_date = self.quote_data['expiry_date'].strftime('%d/%m/%Y')
        
        terms_text = f"<b>Please note this is a {terms_days} Day Account. Due on the {expiry_date}</b>"
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


def generate_quote_pdf(quote_data, debug=False):
    """
    Convenience function to generate quote PDF
    
    Args:
        quote_data: Dictionary with quote data (see QuotePDFGenerator.__init__)
        debug: Boolean, if True shows red borders around all components for layout debugging
    
    Returns:
        BytesIO: PDF file buffer
    """
    generator = QuotePDFGenerator(quote_data, debug=debug)
    return generator.generate()

