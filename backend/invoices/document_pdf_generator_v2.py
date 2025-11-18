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

