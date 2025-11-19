"""
Email Data Models - Type-safe data structures for email generation

This module defines strongly-typed data classes for each email type.
All email data must go through these classes for validation.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import date


@dataclass
class LineItem:
    """Single line item in an invoice/quote"""
    description: str
    quantity: Decimal = Decimal('1.0')
    unit_amount: Decimal = Decimal('0.00')
    discount: Decimal = Decimal('0.00')
    tax_amount: Decimal = Decimal('0.00')
    total: Decimal = Decimal('0.00')
    
    def __post_init__(self):
        """Calculate total if not provided"""
        if self.total == Decimal('0.00'):
            subtotal = self.quantity * self.unit_amount
            discounted = subtotal - self.discount
            self.total = discounted + self.tax_amount


@dataclass
class PaymentMethod:
    """Payment method details"""
    method_type: str  # 'bank', 'card', 'cash'
    account_name: Optional[str] = None
    bsb: Optional[str] = None
    account_number: Optional[str] = None
    reference: Optional[str] = None
    instructions: Optional[str] = None


@dataclass
class Contact:
    """Contact information"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class EmailDataBase:
    """Base class for all email data"""
    
    def __init__(self):
        self.clinic_name: str = "WalkEasy Team"
        self.email_type: str = "email"
    
    def validate(self) -> bool:
        """Validate required fields"""
        if not hasattr(self, 'contact') or not self.contact.name:
            raise ValueError("Contact name is required")
        return True


@dataclass
class InvoiceEmailData(EmailDataBase):
    """Data for invoice emails"""
    contact: Contact
    invoice_number: str
    invoice_date: date
    due_date: date
    subtotal: Decimal
    tax_total: Decimal
    total: Decimal
    amount_paid: Decimal = Decimal('0.00')
    amount_due: Decimal = Decimal('0.00')
    line_items: List[LineItem] = field(default_factory=list)
    payment_methods: List[PaymentMethod] = field(default_factory=list)
    reference: Optional[str] = None
    notes: Optional[str] = None
    status: str = "DRAFT"  # DRAFT, AUTHORISED, PAID
    clinic_name: str = "WalkEasy Team"
    
    def __post_init__(self):
        """Calculate amount_due if not provided"""
        self.email_type = "invoice"
        if self.amount_due == Decimal('0.00'):
            self.amount_due = self.total - self.amount_paid
    
    def validate(self) -> bool:
        """Validate invoice data"""
        super().validate()
        if not self.invoice_number:
            raise ValueError("Invoice number is required")
        if self.total < 0:
            raise ValueError("Invoice total cannot be negative")
        if self.amount_due < 0:
            raise ValueError("Amount due cannot be negative")
        return True
    
    def is_overdue(self) -> bool:
        """Check if invoice is overdue"""
        from datetime import datetime
        return datetime.now().date() > self.due_date and self.amount_due > 0


@dataclass
class ReceiptEmailData(EmailDataBase):
    """Data for receipt emails (paid invoices)"""
    contact: Contact
    invoice_number: str
    amount_paid: Decimal
    payment_method: str = "Bank Transfer"
    receipt_number: Optional[str] = None
    invoice_date: Optional[date] = None
    payment_date: Optional[date] = None
    payment_reference: Optional[str] = None
    line_items: List[LineItem] = field(default_factory=list)
    subtotal: Decimal = Decimal('0.00')
    tax_total: Decimal = Decimal('0.00')
    total: Decimal = Decimal('0.00')
    clinic_name: str = "WalkEasy Team"
    
    def __post_init__(self):
        """Set defaults"""
        self.email_type = "receipt"
        if not self.receipt_number:
            self.receipt_number = self.invoice_number
        if not self.payment_date:
            from datetime import datetime
            self.payment_date = datetime.now().date()
    
    def validate(self) -> bool:
        """Validate receipt data"""
        super().validate()
        if not self.invoice_number:
            raise ValueError("Invoice number is required")
        if self.amount_paid <= 0:
            raise ValueError("Payment amount must be positive")
        return True


@dataclass
class QuoteEmailData(EmailDataBase):
    """Data for quote emails"""
    contact: Contact
    quote_number: str
    quote_date: date
    expiry_date: date
    subtotal: Decimal
    tax_total: Decimal
    total: Decimal
    line_items: List[LineItem] = field(default_factory=list)
    reference: Optional[str] = None
    notes: Optional[str] = None
    status: str = "DRAFT"  # DRAFT, SENT, ACCEPTED, DECLINED
    valid_days: int = 30
    clinic_name: str = "WalkEasy Team"
    
    def __post_init__(self):
        """Set defaults"""
        self.email_type = "quote"
        # Calculate expiry if not set
        if not self.expiry_date:
            from datetime import timedelta
            self.expiry_date = self.quote_date + timedelta(days=self.valid_days)
    
    def validate(self) -> bool:
        """Validate quote data"""
        super().validate()
        if not self.quote_number:
            raise ValueError("Quote number is required")
        if self.total < 0:
            raise ValueError("Quote total cannot be negative")
        if self.expiry_date < self.quote_date:
            raise ValueError("Expiry date must be after quote date")
        return True
    
    def is_expired(self) -> bool:
        """Check if quote is expired"""
        from datetime import datetime
        return datetime.now().date() > self.expiry_date


@dataclass
class ATReportEmailData(EmailDataBase):
    """Data for AT Report emails"""
    contact: Contact
    participant_name: str
    assessor_name: str = "WalkEasy Team"
    report_type: str = "AT Assessment"
    ndis_number: Optional[str] = None
    assessment_date: Optional[date] = None
    report_date: Optional[date] = None
    custom_message: Optional[str] = None
    clinic_name: str = "WalkEasy Team"
    
    def __post_init__(self):
        """Set defaults"""
        self.email_type = "at_report"
        if not self.report_date:
            from datetime import datetime
            self.report_date = datetime.now().date()
    
    def validate(self) -> bool:
        """Validate AT report data"""
        super().validate()
        if not self.participant_name:
            raise ValueError("Participant name is required")
        return True


@dataclass
class LetterEmailData(EmailDataBase):
    """Data for letter emails (flexible)"""
    contact: Contact
    subject: str
    letter_type: str = "general"  # referral, discharge, general
    body_paragraphs: List[str] = field(default_factory=list)
    recipient_name: Optional[str] = None
    recipient_title: Optional[str] = None  # Dr., Mr., Ms., etc.
    sender_name: Optional[str] = None
    sender_title: Optional[str] = None
    sender_qualifications: Optional[str] = None
    patient_name: Optional[str] = None
    patient_dob: Optional[date] = None
    clinic_name: str = "WalkEasy Team"
    
    def __post_init__(self):
        """Set defaults"""
        self.email_type = "letter"
    
    def validate(self) -> bool:
        """Validate letter data"""
        super().validate()
        if not self.subject:
            raise ValueError("Letter subject is required")
        if not self.body_paragraphs:
            raise ValueError("Letter must have at least one paragraph")
        return True


# Factory function to create appropriate data object
def create_email_data(email_type: str, data: Dict[str, Any]) -> EmailDataBase:
    """
    Factory function to create the appropriate email data object
    
    Args:
        email_type: Type of email (invoice, receipt, quote, at_report, letter)
        data: Dictionary of data
    
    Returns:
        Appropriate EmailDataBase subclass
    
    Raises:
        ValueError: If email_type is unknown or data is invalid
    """
    email_classes = {
        'invoice': InvoiceEmailData,
        'receipt': ReceiptEmailData,
        'quote': QuoteEmailData,
        'at_report': ATReportEmailData,
        'letter': LetterEmailData,
    }
    
    email_class = email_classes.get(email_type)
    if not email_class:
        raise ValueError(f"Unknown email type: {email_type}")
    
    try:
        email_data = email_class(**data)
        email_data.validate()
        return email_data
    except TypeError as e:
        raise ValueError(f"Invalid data for {email_type}: {e}")

