"""
Email Generator - Centralized email generation system

This is the main orchestrator that brings together:
- Data models (type-safe data)
- Components (reusable HTML elements)
- Layouts (email structure)
- Wrapper (professional HTML shell)

Usage:
    from invoices.email_generator import EmailGenerator
    
    # Create generator
    generator = EmailGenerator(email_type='invoice')
    
    # Generate email HTML
    html = generator.generate(invoice_data_dict)
    
    # Or with custom color
    generator = EmailGenerator(email_type='invoice', header_color='#10b981')
    html = generator.generate(invoice_data_dict)
"""
from typing import Dict, Any, Optional
import logging
from .email_data_models import create_email_data, EmailDataBase
from .email_layouts import get_layout
from .email_wrapper import wrap_email_html, get_email_type_from_category

logger = logging.getLogger(__name__)


class EmailGenerator:
    """
    Centralized email generation system
    
    This class orchestrates the entire email generation process:
    1. Validates and structures data
    2. Selects appropriate layout
    3. Renders content
    4. Wraps in professional HTML
    
    Similar to PDF generator, but for emails.
    """
    
    # Default colors by email type
    DEFAULT_COLORS = {
        'invoice': '#5b95cf',      # WalkEasy Blue
        'receipt': '#5b95cf',      # WalkEasy Blue (ALL emails same color)
        'quote': '#5b95cf',        # WalkEasy Blue
        'at_report': '#5b95cf',    # WalkEasy Blue
        'letter': '#5b95cf',       # WalkEasy Blue
    }
    
    # Email type display names
    TYPE_NAMES = {
        'invoice': '📄 Invoice',
        'receipt': '✓ Payment Received',
        'quote': '💼 Quote',
        'at_report': '📋 AT Assessment Report',
        'letter': '✉️ Letter',
    }
    
    def __init__(
        self,
        email_type: str,
        header_color: Optional[str] = None,
        clinic_settings: Optional[Any] = None
    ):
        """
        Initialize email generator
        
        Args:
            email_type: Type of email (invoice, receipt, quote, at_report, letter)
            header_color: Optional custom header color (hex)
            clinic_settings: Optional EmailGlobalSettings object
        
        Raises:
            ValueError: If email_type is invalid
        """
        if email_type not in self.DEFAULT_COLORS:
            raise ValueError(
                f"Invalid email_type: {email_type}. "
                f"Must be one of: {', '.join(self.DEFAULT_COLORS.keys())}"
            )
        
        self.email_type = email_type
        self.header_color = header_color or self.DEFAULT_COLORS[email_type]
        self.clinic_settings = clinic_settings
        
        # Load clinic settings if not provided
        if not self.clinic_settings:
            try:
                from .models import EmailGlobalSettings
                self.clinic_settings = EmailGlobalSettings.get_settings()
            except Exception as e:
                logger.warning(f"Could not load clinic settings: {e}")
                self.clinic_settings = None
    
    def generate(
        self,
        data: Dict[str, Any],
        include_wrapper: bool = True,
        subtitle: Optional[str] = None
    ) -> str:
        """
        Generate complete email HTML from data
        
        Args:
            data: Dictionary with email data (will be validated)
            include_wrapper: Whether to wrap in full HTML email structure
            subtitle: Optional subtitle for email header (e.g., "Invoice #INV-001")
        
        Returns:
            Complete HTML email as string
        
        Raises:
            ValueError: If data is invalid or missing required fields
        
        Example:
            generator = EmailGenerator('invoice')
            html = generator.generate({
                'contact': {'name': 'John Smith', 'email': 'john@example.com'},
                'invoice_number': 'INV-001',
                'invoice_date': date(2025, 1, 15),
                'due_date': date(2025, 1, 29),
                'subtotal': Decimal('100.00'),
                'tax_total': Decimal('10.00'),
                'total': Decimal('110.00'),
                'line_items': [
                    {
                        'description': 'Consultation',
                        'quantity': Decimal('1'),
                        'unit_amount': Decimal('100.00'),
                        'tax_amount': Decimal('10.00'),
                        'total': Decimal('110.00'),
                    }
                ],
            })
        """
        try:
            # Step 1: Create and validate data object
            logger.info(f"Generating {self.email_type} email")
            email_data = create_email_data(self.email_type, data)
            
            # Step 2: Get appropriate layout
            layout = get_layout(self.email_type, self.header_color)
            
            # Step 3: Render content using layout
            content_html = layout.render(email_data)
            
            # Step 4: Wrap in email structure (if requested)
            if include_wrapper:
                email_title = self.TYPE_NAMES.get(self.email_type, 'Email')
                
                # Generate subtitle if not provided
                if not subtitle:
                    subtitle = self._generate_subtitle(email_data)
                
                complete_html = wrap_email_html(
                    body_html=content_html,
                    header_color=self.header_color,
                    email_type=email_title,
                    title=subtitle
                )
            else:
                complete_html = content_html
            
            logger.info(f"Successfully generated {self.email_type} email")
            return complete_html
            
        except ValueError as e:
            # Data validation error
            logger.error(f"Data validation error for {self.email_type}: {e}")
            raise
        
        except Exception as e:
            # Unexpected error
            logger.error(f"Error generating {self.email_type} email: {e}", exc_info=True)
            raise ValueError(f"Failed to generate email: {str(e)}")
    
    def _generate_subtitle(self, email_data: EmailDataBase) -> Optional[str]:
        """
        Generate subtitle for email header based on data
        
        Args:
            email_data: Email data object
        
        Returns:
            Subtitle string or None
        """
        try:
            if hasattr(email_data, 'invoice_number'):
                return f"Invoice {email_data.invoice_number}"
            elif hasattr(email_data, 'quote_number'):
                return f"Quote {email_data.quote_number}"
            elif hasattr(email_data, 'participant_name'):
                return f"Report for {email_data.participant_name}"
            elif hasattr(email_data, 'subject'):
                return email_data.subject
            return None
        except Exception:
            return None
    
    def generate_preview(self, data: Dict[str, Any]) -> Dict[str, str]:
        """
        Generate preview data for email (subject + snippet)
        
        Args:
            data: Email data dictionary
        
        Returns:
            Dict with 'subject' and 'preview' keys
        
        Example:
            generator = EmailGenerator('invoice')
            preview = generator.generate_preview(invoice_data)
            # Returns: {
            #     'subject': 'Invoice INV-001 from WalkEasy Nexus',
            #     'preview': 'Invoice due on 29 Jan 2025 - Amount: $110.00'
            # }
        """
        try:
            email_data = create_email_data(self.email_type, data)
            
            subject = self._generate_subject(email_data)
            preview = self._generate_preview_text(email_data)
            
            return {
                'subject': subject,
                'preview': preview
            }
        
        except Exception as e:
            logger.error(f"Error generating preview: {e}")
            return {
                'subject': f"{self.email_type.title()} from {data.get('clinic_name', 'WalkEasy Team')}",
                'preview': 'Please see details below'
            }
    
    def _generate_subject(self, email_data: EmailDataBase) -> str:
        """Generate email subject line"""
        clinic = email_data.clinic_name
        
        if hasattr(email_data, 'invoice_number'):
            if hasattr(email_data, 'status') and email_data.status == 'PAID':
                return f"Receipt for Invoice {email_data.invoice_number} - {clinic}"
            elif hasattr(email_data, 'is_overdue') and email_data.is_overdue():
                return f"Overdue Invoice {email_data.invoice_number} - {clinic}"
            else:
                return f"Invoice {email_data.invoice_number} - {clinic}"
        
        elif hasattr(email_data, 'quote_number'):
            return f"Quote {email_data.quote_number} - {clinic}"
        
        elif hasattr(email_data, 'participant_name'):
            return f"AT Assessment Report - {email_data.participant_name}"
        
        elif hasattr(email_data, 'subject'):
            return f"{email_data.subject} - {clinic}"
        
        return f"{self.email_type.title()} from {clinic}"
    
    def _generate_preview_text(self, email_data: EmailDataBase) -> str:
        """Generate preview text (first line snippet)"""
        if hasattr(email_data, 'amount_due') and email_data.amount_due > 0:
            return f"Amount due: ${float(email_data.amount_due):.2f} - Due {email_data.due_date.strftime('%d %b %Y')}"
        
        elif hasattr(email_data, 'amount_paid'):
            return f"Payment received: ${float(email_data.amount_paid):.2f} - Thank you!"
        
        elif hasattr(email_data, 'total'):
            return f"Total: ${float(email_data.total):.2f}"
        
        elif hasattr(email_data, 'participant_name'):
            return f"AT Assessment Report for {email_data.participant_name}"
        
        return f"Please see {self.email_type} details"
    
    @classmethod
    def get_available_types(cls) -> Dict[str, Dict[str, str]]:
        """
        Get list of available email types with metadata
        
        Returns:
            Dict of email types with their colors and names
        
        Example:
            types = EmailGenerator.get_available_types()
            # Returns: {
            #     'invoice': {'color': '#3b82f6', 'name': '📄 Invoice'},
            #     'receipt': {'color': '#10b981', 'name': '✓ Payment Received'},
            #     ...
            # }
        """
        return {
            email_type: {
                'color': cls.DEFAULT_COLORS[email_type],
                'name': cls.TYPE_NAMES[email_type]
            }
            for email_type in cls.DEFAULT_COLORS.keys()
        }
    
    def __repr__(self):
        return f"EmailGenerator(type='{self.email_type}', color='{self.header_color}')"


# Convenience functions for common use cases

def generate_invoice_email(invoice_data: Dict[str, Any], header_color: Optional[str] = None) -> str:
    """
    Convenience function to generate invoice email
    
    Args:
        invoice_data: Invoice data dictionary
        header_color: Optional custom color
    
    Returns:
        Complete HTML email
    """
    generator = EmailGenerator('invoice', header_color)
    return generator.generate(invoice_data)


def generate_receipt_email(receipt_data: Dict[str, Any], header_color: Optional[str] = None) -> str:
    """
    Convenience function to generate receipt email
    
    Args:
        receipt_data: Receipt data dictionary
        header_color: Optional custom color
    
    Returns:
        Complete HTML email
    """
    generator = EmailGenerator('receipt', header_color)
    return generator.generate(receipt_data)


def generate_quote_email(quote_data: Dict[str, Any], header_color: Optional[str] = None) -> str:
    """
    Convenience function to generate quote email
    
    Args:
        quote_data: Quote data dictionary
        header_color: Optional custom color
    
    Returns:
        Complete HTML email
    """
    generator = EmailGenerator('quote', header_color)
    return generator.generate(quote_data)


def generate_at_report_email(report_data: Dict[str, Any], header_color: Optional[str] = None) -> str:
    """
    Convenience function to generate AT report email
    
    Args:
        report_data: Report data dictionary
        header_color: Optional custom color
    
    Returns:
        Complete HTML email
    """
    generator = EmailGenerator('at_report', header_color)
    return generator.generate(report_data)

