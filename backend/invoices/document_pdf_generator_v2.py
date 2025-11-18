"""
PDF Generator V2 - Complete Rewrite
====================================

Clean implementation with:
- Fixed row heights (consistent spacing GUARANTEED)
- Single unified method for financial summary
- Optional payment section (stacked layout)
- Support for all 4 document types: Invoice, Invoice+Payments, Quote, Receipt
- Receipt watermark support (13% opacity)

This replaces document_pdf_generator.py with a robust, maintainable solution.
"""

import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from django.conf import settings


# ============================================
# CONSTANTS - Based on PDF_GENERATOR_REDESIGN.md
# ============================================

# Colors
COLOR_PRIMARY_BLUE = colors.HexColor('#4897d2')  # Table headers, footer bar
COLOR_GREY_LIGHT = colors.HexColor('#f5f5f5')    # Total Paid row background
COLOR_GREY_BORDER = colors.HexColor('#cccccc')   # Table borders
COLOR_BLACK = colors.black
COLOR_WHITE = colors.white

# Margins (in cm)
MARGIN_LEFT = 2*cm
MARGIN_RIGHT = 2*cm
MARGIN_TOP = 2*cm
MARGIN_BOTTOM = 2*cm

# Page dimensions
PAGE_WIDTH = 21*cm   # A4 width
PAGE_HEIGHT = 29.7*cm  # A4 height
USABLE_WIDTH = 17*cm   # Page width - margins

# Row heights (CRITICAL for consistent spacing!)
ROW_HEIGHT_STANDARD = 0.6*cm  # Standard row height
ROW_HEIGHT_LINE_ITEMS = 0.7*cm  # Line items rows (slightly taller)

# Padding (in points - ReportLab uses points for padding)
PADDING_MINIMAL = 2   # Minimal padding when row height is fixed
PADDING_STANDARD = 4  # Standard padding
PADDING_HEADER = 8    # Table header padding

# Font sizes (in points)
FONT_SIZE_NORMAL = 11
FONT_SIZE_HEADER = 12
FONT_SIZE_TITLE = 16
FONT_SIZE_SMALL = 9
FONT_SIZE_PATIENT_NAME = 14
FONT_SIZE_TINY = 8  # For footer bank details

# Spacers (in cm)
SPACER_SMALL = 0.3*cm
SPACER_MEDIUM = 0.5*cm
SPACER_LARGE = 1.0*cm

# Specific gaps throughout document
GAP_HEADER_TO_PATIENT = SPACER_MEDIUM       # 0.5cm
GAP_PATIENT_TO_TITLE = SPACER_SMALL         # 0.3cm
GAP_TITLE_TO_LINEITEMS = SPACER_MEDIUM      # 0.5cm
GAP_LINEITEMS_TO_PAYMENTS = SPACER_MEDIUM   # 0.5cm
GAP_PAYMENTS_TO_TOTALS = SPACER_MEDIUM      # 0.5cm
GAP_TOTALS_TO_FOOTER = 1.5*cm               # 1.5cm

# Header dimensions
LOGO_WIDTH = 4*cm
LOGO_HEIGHT = 4*cm
ADDRESS_GRAPHIC_WIDTH = 9.03*cm
ADDRESS_GRAPHIC_HEIGHT = 4*cm

# Header column widths (must total 17cm)
COL_HEADER_LOGO = 4*cm
COL_HEADER_ADDRESS = 9.03*cm
COL_HEADER_INFO = 3.97*cm

# Patient/Company section dimensions
COL_PATIENT_LEFT = 10*cm    # Name and address
COL_PATIENT_RIGHT = 7*cm    # Reference and practitioner

# Line items column widths (must total ~17cm)
COL_DESCRIPTION = 7.0*cm
COL_QTY = 1.5*cm
COL_UNIT_PRICE = 2.5*cm
COL_DISCOUNT = 1.5*cm
COL_GST = 1.5*cm
COL_AMOUNT = 2.5*cm

# Financial summary column widths (must total 17cm)
COL_TOTALS_LABEL = 12*cm
COL_TOTALS_VALUE = 5*cm

# Payment history column widths (must total 9cm = 90mm)
COL_PAYMENT_DATE = 2.5*cm   # 25mm
COL_PAYMENT_REF = 4.5*cm    # 45mm
COL_PAYMENT_AMOUNT = 2*cm   # 20mm

# Line lengths
LINE_LENGTH_TOTALS = 30*mm  # 3cm lines above totals

# Image paths
LOGO_PATH = '../frontend/public/images/Logo_Nexus.png'
ADDRESS_GRAPHIC_PATH = '../frontend/public/images/Address.png'
WATERMARK_PATH = 'backend/invoices/assets/Paid.png'  # For receipts

# Company details
COMPANY_NAME = "Walk Easy Pedorthics Australia Pty LTD"
POSTAL_ADDRESS = "PO Box 210, Tamworth, NSW 2340"
PHYSICAL_ADDRESS = "21 Dowe St, Tamworth, NSW 2340"
PHONE = "02 6766 3153"
EMAIL = "info@walkeasy.com.au"
WEBSITE = "www.walkeasy.com.au"
ABN = "63 612 528 971"
BSB = "013287"
ACC = "222796921"


# ============================================
# FORMATTING HELPER FUNCTIONS
# ============================================

def format_currency(amount):
    """
    Format currency with proper alignment for decimal points.
    
    Rules:
    - Thousand separators: YES (1,000.00)
    - Zero values: Show as $ 0.00
    - Negative values: $ -3.00 (space after $, then minus)
    - Positive values: $  5.00 (two spaces after $ for alignment)
    - Always 2 decimal places
    """
    if amount == 0:
        return "$  0.00"  # Two spaces for alignment
    elif amount < 0:
        return f"$ -{abs(amount):,.2f}"  # One space, then minus
    else:
        return f"$  {amount:,.2f}"  # Two spaces for alignment


def format_quantity(qty):
    """
    Format quantity field.
    
    Rules:
    - Whole numbers: Show as integer (1, not 1.0)
    - Decimals: Show one decimal place (1.5)
    """
    if qty == int(qty):
        return f"{int(qty)}"
    else:
        return f"{qty:.1f}"


def format_discount(pct):
    """
    Format discount percentage.
    
    Rules:
    - Zero values: Show as empty string (not 0.00%)
    - Non-zero: Show with 2 decimals (5.00%, 10.50%)
    """
    if pct == 0 or pct is None:
        return ""
    else:
        return f"{pct:.2f}%"


def format_gst(rate):
    """
    Format GST rate.
    
    Rules:
    - Zero values: Show as empty string
    - Non-zero: Show as percentage without decimals (10%)
    - Input is decimal (0.1 = 10%)
    """
    if rate == 0 or rate is None:
        return ""
    else:
        return f"{rate*100:.0f}%"


def format_date_au(date_obj):
    """Format date in Australian format: DD/MM/YYYY"""
    if isinstance(date_obj, str):
        try:
            date_obj = datetime.fromisoformat(date_obj.replace('Z', '+00:00'))
        except:
            return date_obj
    return date_obj.strftime('%d/%m/%Y')


# ============================================
# CUSTOM CANVAS FOR WATERMARK (RECEIPTS)
# ============================================

class ReceiptCanvasMaker(canvas.Canvas):
    """
    Custom canvas that adds a PAID watermark at 13% opacity.
    Only used for receipt documents.
    """
    def __init__(self, *args, **kwargs):
        self.doc = kwargs.pop('doc', None)
        self.add_watermark = kwargs.pop('add_watermark', False)
        canvas.Canvas.__init__(self, *args, **kwargs)
    
    def showPage(self):
        """Add watermark to every page before showing it"""
        if self.add_watermark:
            self._add_paid_watermark()
        canvas.Canvas.showPage(self)
    
    def _add_paid_watermark(self):
        """Add PAID watermark stamp at 13% opacity"""
        if not os.path.exists(WATERMARK_PATH):
            return  # Skip if watermark image not found
        
        # Calculate center position
        watermark_width = 8*cm
        watermark_height = 8*cm
        
        x = (PAGE_WIDTH - watermark_width) / 2
        y = (PAGE_HEIGHT - watermark_height) / 2
        
        # Save state, set opacity, draw watermark
        self.saveState()
        self.setFillAlpha(0.13)  # 13% opacity
        self.drawImage(
            WATERMARK_PATH, x, y,
            width=watermark_width,
            height=watermark_height,
            mask='auto',
            preserveAspectRatio=True
        )
        self.restoreState()


# ============================================
# MAIN GENERATOR CLASS
# ============================================

class UnifiedDocumentGenerator:
    """
    Unified PDF generator for all document types.
    
    Supports:
    - Invoice (no payments)
    - Invoice (with payments)
    - Quote
    - Receipt (with watermark)
    
    Key features:
    - Fixed row heights for consistent spacing
    - Single financial summary method
    - Stacked layout for payments + totals
    - Optional watermark for receipts
    """
    
    def __init__(self, invoice_data, patient_info, line_items, payments=None, doc_type='invoice'):
        """
        Initialize generator.
        
        Args:
            invoice_data: Dict with invoice/quote details (number, date, due_date, etc.)
            patient_info: Dict with patient/company details (name, address, etc.)
            line_items: List of dicts with line item data
            payments: List of dicts with payment data (optional)
            doc_type: 'invoice' | 'quote' | 'receipt'
        """
        self.invoice_data = invoice_data
        self.patient_info = patient_info
        self.line_items = line_items
        self.payments = payments or []
        self.doc_type = doc_type
        
        # Styles
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Tax Invoice/Quote heading style
        self.styles.add(ParagraphStyle(
            name='TaxInvoiceHeading',
            parent=self.styles['Heading1'],
            fontSize=FONT_SIZE_TITLE,
            textColor=COLOR_BLACK,
            spaceAfter=0,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Patient name style (larger, bold)
        self.styles.add(ParagraphStyle(
            name='PatientName',
            parent=self.styles['Normal'],
            fontSize=FONT_SIZE_PATIENT_NAME,
            textColor=COLOR_BLACK,
            fontName='Helvetica-Bold'
        ))
    
    def generate(self, filename):
        """
        Generate the PDF document.
        
        Args:
            filename: Output PDF filename (path)
        
        Returns:
            str: Path to generated PDF
        """
        # Determine if we need watermark (receipts only)
        add_watermark = (self.doc_type == 'receipt')
        
        # Create document with custom canvas for receipts
        doc = SimpleDocTemplate(
            filename,
            pagesize=A4,
            rightMargin=MARGIN_RIGHT,
            leftMargin=MARGIN_LEFT,
            topMargin=MARGIN_TOP,
            bottomMargin=MARGIN_BOTTOM
        )
        
        # Build document elements
        elements = self._build_document()
        
        # Build PDF (with or without watermark)
        if add_watermark:
            doc.build(
                elements,
                canvasmaker=lambda *args, **kwargs: ReceiptCanvasMaker(
                    *args, doc=doc, add_watermark=True, **kwargs
                )
            )
        else:
            doc.build(elements)
        
        return filename
    
    def _build_document(self):
        """
        Build all document elements.
        
        Returns:
            List of flowables for the document
        """
        elements = []
        
        # 1. Header (logo + address graphic + invoice details)
        elements.append(self._build_header())
        elements.append(Spacer(1, GAP_HEADER_TO_PATIENT))
        
        # 2. Patient/Company details
        elements.append(self._build_patient_section())
        elements.append(Spacer(1, GAP_PATIENT_TO_TITLE))
        
        # 3. Document title (Tax Invoice / Quote / Receipt)
        elements.append(self._build_title())
        elements.append(Spacer(1, GAP_TITLE_TO_LINEITEMS))
        
        # 4. Line items table
        if self.doc_type != 'receipt' or self.invoice_data.get('show_line_items', False):
            elements.append(self._build_line_items())
            elements.append(Spacer(1, GAP_LINEITEMS_TO_PAYMENTS))
        
        # 5. Payment history (if payments exist)
        if self.payments:
            elements.append(self._build_payment_history())
            elements.append(Spacer(1, GAP_PAYMENTS_TO_TOTALS))
        
        # 6. Financial summary
        elements.append(self._build_financial_summary())
        elements.append(Spacer(1, GAP_TOTALS_TO_FOOTER))
        
        # 7. Footer (payment terms + bank details)
        elements.append(self._build_footer())
        
        return elements
    
    # ============================================
    # BUILD METHODS - Each section of the document
    # ============================================
    
    def _build_title(self):
        """Build document title (Tax Invoice / Quote / Receipt)"""
        if self.doc_type == 'receipt':
            title_text = "RECEIPT"
        elif self.doc_type == 'quote':
            title_text = "QUOTE"
        else:
            title_text = "Tax Invoice"
        
        return Paragraph(title_text, self.styles['TaxInvoiceHeading'])
    
    def _build_header(self):
        """
        Build header section with logo, address graphic, and invoice details.
        
        Structure: [Logo | Address Graphic | Invoice Info]
        Widths: [4cm | 9.03cm | 3.97cm] = 17cm ✓
        """
        # Logo
        logo_path = os.path.join(settings.BASE_DIR, LOGO_PATH)
        logo = None
        if os.path.exists(logo_path):
            logo = Image(logo_path, width=LOGO_WIDTH, height=LOGO_HEIGHT, kind='proportional')
        else:
            # Fallback: empty cell
            logo = Paragraph("", self.styles['Normal'])
        
        # Address graphic
        address_path = os.path.join(settings.BASE_DIR, ADDRESS_GRAPHIC_PATH)
        address_graphic = None
        if os.path.exists(address_path):
            address_graphic = Image(
                address_path,
                width=ADDRESS_GRAPHIC_WIDTH,
                height=ADDRESS_GRAPHIC_HEIGHT,
                kind='bound'
            )
        else:
            # Fallback: text-based address
            address_graphic = Paragraph(
                f"{COMPANY_NAME}<br/>{PHYSICAL_ADDRESS}<br/>{PHONE}<br/>{EMAIL}",
                self.styles['Normal']
            )
        
        # Invoice/Quote details (right column)
        doc_label = "Invoice" if self.doc_type != 'quote' else "Quote"
        
        date_info_lines = [
            f"<b>{doc_label} Date</b><br/>{format_date_au(self.invoice_data['date'])}",
            f"<b>{doc_label} Number</b><br/>{self.invoice_data['number']}",
        ]
        
        if self.doc_type != 'quote' and self.invoice_data.get('due_date'):
            date_info_lines.append(
                f"<b>Due Date</b><br/>{format_date_au(self.invoice_data['due_date'])}"
            )
        
        date_info = Paragraph("<br/><br/>".join(date_info_lines), self.styles['Normal'])
        
        # Build header table
        header_data = [[logo, address_graphic, date_info]]
        header_table = Table(
            header_data,
            colWidths=[COL_HEADER_LOGO, COL_HEADER_ADDRESS, COL_HEADER_INFO]
        )
        
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),    # Logo left
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),   # Address graphic right
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),   # Invoice info right
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        return header_table
    
    def _build_patient_section(self):
        """
        Build patient/company details section.
        
        Structure: [Patient Name/Address | Reference/Practitioner]
        Widths: [10cm | 7cm] = 17cm ✓
        """
        # Left column: Patient/Company name and address
        patient_name = Paragraph(
            self.patient_info['name'],
            self.styles['PatientName']
        )
        
        patient_address_lines = [
            self.patient_info.get('address', ''),
            self.patient_info.get('city_state', ''),
            self.patient_info.get('postcode', ''),
        ]
        patient_address_text = '<br/>'.join([line for line in patient_address_lines if line])
        patient_address = Paragraph(patient_address_text, self.styles['Normal'])
        
        # Right column: Reference and practitioner info
        ref_lines = []
        if self.patient_info.get('reference'):
            ref_lines.append(f"<b>Reference / PO#</b><br/>{self.patient_info['reference']}")
        if self.patient_info.get('provider_registration'):
            ref_lines.append(f"<b>Provider Registration #</b><br/>{self.patient_info['provider_registration']}")
        if self.patient_info.get('practitioner'):
            ref_lines.append(
                f"<i>Practitioner:</i><br/>{self.patient_info['practitioner']}"
            )
        
        ref_info = Paragraph("<br/><br/>".join(ref_lines), self.styles['Normal']) if ref_lines else Paragraph("", self.styles['Normal'])
        
        # Combine into table
        patient_data = [[
            Table([[patient_name], [patient_address]], colWidths=[10*cm]),
            ref_info
        ]]
        
        patient_table = Table(patient_data, colWidths=[COL_PATIENT_LEFT, COL_PATIENT_RIGHT])
        patient_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),
            ('LEFTPADDING', (0, 0), (0, 0), 2.5*cm),  # 2.5cm left padding
            ('LEFTPADDING', (1, 0), (1, 0), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        return patient_table
    
    def _build_line_items(self):
        """
        Build line items table.
        
        Columns: Description | Qty | Unit Price | Discount | GST | Amount
        Widths: [7cm | 1.5cm | 2.5cm | 1.5cm | 1.5cm | 2.5cm] ≈ 17cm
        """
        # Header row
        line_data = [[
            'Description', 'Qty', 'Unit Price', 'Discount', 'GST', 'Amount'
        ]]
        
        # Data rows
        for item in self.line_items:
            line_data.append([
                item['description'],
                format_quantity(item['quantity']),
                format_currency(item['unit_price']),
                format_discount(item.get('discount', 0)),
                format_gst(item.get('gst_rate', 0)),
                format_currency(item['amount'])
            ])
        
        # Create table with FIXED row heights
        num_rows = len(line_data)
        line_table = Table(
            line_data,
            colWidths=[COL_DESCRIPTION, COL_QTY, COL_UNIT_PRICE, COL_DISCOUNT, COL_GST, COL_AMOUNT],
            rowHeights=[ROW_HEIGHT_LINE_ITEMS] * num_rows  # FIXED HEIGHTS!
        )
        
        # Styling
        line_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), FONT_SIZE_NORMAL),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),    # Description left
            ('ALIGN', (1, 0), (-1, 0), 'CENTER'),  # Other headers centered
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), FONT_SIZE_NORMAL),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),    # Description left
            ('ALIGN', (1, 1), (1, -1), 'CENTER'),  # Qty center
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),  # Prices/amounts right
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, COLOR_GREY_BORDER),
            
            # Padding
            ('TOPPADDING', (0, 0), (-1, 0), PADDING_HEADER),
            ('BOTTOMPADDING', (0, 0), (-1, 0), PADDING_HEADER),
            ('TOPPADDING', (0, 1), (-1, -1), PADDING_STANDARD),
            ('BOTTOMPADDING', (0, 1), (-1, -1), PADDING_STANDARD),
            ('LEFTPADDING', (0, 0), (-1, -1), PADDING_STANDARD),
            ('RIGHTPADDING', (0, 0), (-1, -1), PADDING_STANDARD),
            
            # Valign
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        return line_table
    
    def _build_payment_history(self):
        """
        Build payment history table (STACKED layout).
        
        Columns: Date | Reference | Amount
        Widths: [2.5cm | 4.5cm | 2cm] = 9cm (90mm)
        Left-aligned on page.
        """
        # Header row
        payment_data = [['Date', 'Reference', 'Amount']]
        
        # Payment rows
        total_paid = 0
        for payment in self.payments:
            payment_data.append([
                format_date_au(payment['date']),
                payment.get('reference', ''),
                format_currency(payment['amount'])
            ])
            total_paid += payment['amount']
        
        # Total Paid row
        payment_data.append([
            '',
            'Total Paid:',
            format_currency(total_paid)
        ])
        
        # Create table with FIXED row heights
        num_rows = len(payment_data)
        payment_table = Table(
            payment_data,
            colWidths=[COL_PAYMENT_DATE, COL_PAYMENT_REF, COL_PAYMENT_AMOUNT],
            rowHeights=[ROW_HEIGHT_STANDARD] * num_rows  # FIXED HEIGHTS!
        )
        
        # Styling
        total_paid_row = num_rows - 1
        payment_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), FONT_SIZE_NORMAL),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, total_paid_row-1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),  # Slightly smaller for payments
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),    # Date left
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),    # Reference left
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),   # Amount right
            
            # Total Paid row
            ('FONTNAME', (1, total_paid_row), (2, total_paid_row), 'Helvetica-Bold'),
            ('BACKGROUND', (0, total_paid_row), (-1, total_paid_row), COLOR_GREY_LIGHT),
            ('LINEABOVE', (0, total_paid_row), (-1, total_paid_row), 1.5, COLOR_PRIMARY_BLUE),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), PADDING_STANDARD),
            ('BOTTOMPADDING', (0, 0), (-1, -1), PADDING_STANDARD),
            ('LEFTPADDING', (0, 0), (-1, -1), PADDING_STANDARD),
            ('RIGHTPADDING', (0, 0), (-1, -1), PADDING_STANDARD),
            
            # Valign
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        return payment_table
    
    def _build_financial_summary(self):
        """
        Build financial summary (THE MOST CRITICAL METHOD!).
        
        This uses FIXED ROW HEIGHTS to guarantee consistent spacing.
        No spacer rows, no padding tricks - just clean data + fixed heights.
        
        Columns: Label | Amount
        Widths: [12cm | 5cm] = 17cm
        
        Rows (depends on payments):
        - Without payments: Subtotal, TOTAL GST, TOTAL, Amount Owing
        - With payments: Subtotal, TOTAL GST, TOTAL, Total Paid, Amount Owing
        """
        # Calculate totals
        subtotal = self.invoice_data.get('subtotal', 0)
        total_gst = self.invoice_data.get('total_gst', 0)
        total = self.invoice_data.get('total', 0)
        
        # Calculate total paid (from payments)
        total_paid = sum(p['amount'] for p in self.payments) if self.payments else 0
        
        # Calculate amount owing
        amount_owing = total - total_paid
        
        # Build data rows (NO EMPTY SPACER ROWS!)
        totals_data = []
        totals_data.append(['Subtotal', format_currency(subtotal)])
        totals_data.append(['TOTAL GST', format_currency(total_gst)])
        totals_data.append(['TOTAL', format_currency(total)])
        
        # Track row indices for styling
        total_gst_row = 1
        total_row = 2
        total_paid_row = None
        amount_owing_row = None
        
        # Add Total Paid row if payments exist
        if self.payments:
            totals_data.append(['Total Paid', format_currency(-total_paid)])  # Negative!
            total_paid_row = 3
            amount_owing_row = 4
        else:
            amount_owing_row = 3
        
        totals_data.append(['Amount Owing', format_currency(amount_owing)])
        
        # Create table with FIXED ROW HEIGHTS (CRITICAL!)
        num_rows = len(totals_data)
        totals_table = Table(
            totals_data,
            colWidths=[COL_TOTALS_LABEL, COL_TOTALS_VALUE],
            rowHeights=[ROW_HEIGHT_STANDARD] * num_rows  # FIXED HEIGHTS = CONSISTENT SPACING!
        )
        
        # Styling (NO BOLD - removed earlier!)
        style_commands = [
            # Alignment
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),   # Labels right
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),   # Values right
            
            # Fonts (ALL NORMAL - no bold!)
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),  # 11pt consistently
            
            # Minimal padding (row height controls spacing)
            ('TOPPADDING', (0, 0), (-1, -1), PADDING_MINIMAL),
            ('BOTTOMPADDING', (0, 0), (-1, -1), PADDING_MINIMAL),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            
            # Valign
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Lines above certain rows (30mm = 3cm)
            ('LINEABOVE', (1, total_gst_row), (1, total_gst_row), 1, COLOR_BLACK),  # Above TOTAL GST
            ('LINEABOVE', (1, total_row), (1, total_row), 1, COLOR_BLACK),          # Above TOTAL
        ]
        
        # Line above Total Paid (if exists)
        if total_paid_row is not None:
            style_commands.append(
                ('LINEABOVE', (1, total_paid_row), (1, total_paid_row), 1, COLOR_BLACK)
            )
            # Background for Total Paid row
            style_commands.append(
                ('BACKGROUND', (0, total_paid_row), (-1, total_paid_row), COLOR_GREY_LIGHT)
            )
        
        # Line above Amount Owing
        style_commands.append(
            ('LINEABOVE', (1, amount_owing_row), (1, amount_owing_row), 1, COLOR_BLACK)
        )
        
        totals_table.setStyle(TableStyle(style_commands))
        
        return totals_table
    
    def _build_footer(self):
        """
        Build footer section.
        
        Structure:
        - Payment terms (centered, above footer bar)
        - Bank details (single line, small font)
        - Blue contact bar (website | email | ABN)
        """
        # Payment terms
        due_date_str = format_date_au(self.invoice_data.get('due_date', ''))
        payment_terms = Paragraph(
            f"Please note this is a 7 Day Account. Due on the {due_date_str}",
            ParagraphStyle(
                name='PaymentTerms',
                parent=self.styles['Normal'],
                fontSize=FONT_SIZE_NORMAL,
                alignment=TA_CENTER
            )
        )
        
        # Bank details (centered, smaller font to fit)
        bank_details = Paragraph(
            f"EFT | {COMPANY_NAME} | BSB: {BSB} ACC: {ACC} | Please use last name as reference",
            ParagraphStyle(
                name='BankDetails',
                parent=self.styles['Normal'],
                fontSize=FONT_SIZE_TINY,  # 8pt to fit
                alignment=TA_CENTER
            )
        )
        
        # Contact bar (blue background)
        contact_bar_data = [[Paragraph(
            f"{WEBSITE} | {EMAIL} | A.B.N {ABN}",
            ParagraphStyle(
                name='ContactBar',
                parent=self.styles['Normal'],
                fontSize=FONT_SIZE_NORMAL,
                textColor=COLOR_WHITE,
                alignment=TA_CENTER
            )
        )]]
        
        contact_bar = Table(contact_bar_data, colWidths=[USABLE_WIDTH])
        contact_bar.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_PRIMARY_BLUE),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        # Combine footer elements
        footer_data = [
            [payment_terms],
            [bank_details],
            [contact_bar]
        ]
        
        footer_table = Table(footer_data, colWidths=[USABLE_WIDTH])
        footer_table.setStyle(TableStyle([
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        return footer_table


# ============================================
# CONVENIENCE FUNCTION FOR GENERATING PDFs
# ============================================

def generate_invoice_pdf_v2(invoice_data, patient_info, line_items, payments=None, filename='invoice.pdf', doc_type='invoice'):
    """
    Convenience function to generate a PDF document.
    
    Args:
        invoice_data: Dict with invoice/quote details
        patient_info: Dict with patient/company details
        line_items: List of line item dicts
        payments: List of payment dicts (optional)
        filename: Output PDF filename
        doc_type: 'invoice' | 'quote' | 'receipt'
    
    Returns:
        str: Path to generated PDF
    """
    generator = UnifiedDocumentGenerator(
        invoice_data=invoice_data,
        patient_info=patient_info,
        line_items=line_items,
        payments=payments,
        doc_type=doc_type
    )
    return generator.generate(filename)
