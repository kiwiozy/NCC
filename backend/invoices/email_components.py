"""
Email Components - Reusable HTML components for email generation

Each component is a pure function that takes data and returns HTML.
Components are composable and testable.
"""
from typing import List, Optional, Dict, Any
from decimal import Decimal
from .email_data_models import LineItem, PaymentMethod


class EmailComponents:
    """
    Reusable email HTML components
    Each method returns a self-contained HTML string
    """
    
    # ============================================================
    # TYPOGRAPHY & BASIC ELEMENTS
    # ============================================================
    
    @staticmethod
    def greeting(contact_name: str, custom_greeting: Optional[str] = None) -> str:
        """
        Render greeting paragraph
        
        Args:
            contact_name: Name of recipient
            custom_greeting: Optional custom greeting text
        
        Returns:
            HTML string
        """
        # Extract first name only (before first space or comma)
        first_name = contact_name.split()[0].split(',')[0] if contact_name else 'there'
        
        text = custom_greeting or f"Hi {first_name},"
        return f'<p class="greeting">{text}</p>'
    
    @staticmethod
    def paragraph(text: str, css_class: str = "text") -> str:
        """Render a paragraph"""
        return f'<p class="{css_class}">{text}</p>'
    
    @staticmethod
    def closing(clinic_name: str = "WalkEasy Team") -> str:
        """Render closing signature"""
        return f'''
        <p class="closing">Best regards,</p>
        <p class="signature">{clinic_name}</p>
        '''
    
    # ============================================================
    # BADGES & STATUS INDICATORS
    # ============================================================
    
    @staticmethod
    def status_badge(status: str, color: str = None) -> str:
        """
        Render status badge
        
        Args:
            status: Status text (e.g., "PAID", "OVERDUE")
            color: Optional color override
        
        Returns:
            HTML badge
        """
        # Default colors by status - using blue tones
        colors = {
            'PAID': '#5b95cf',      # WalkEasy Blue
            'OVERDUE': '#ef4444',   # Red (keep for urgency)
            'DRAFT': '#6b7280',     # Gray
            'SENT': '#5b95cf',      # WalkEasy Blue
            'ACCEPTED': '#5b95cf',  # WalkEasy Blue
            'DECLINED': '#ef4444',  # Red
        }
        
        bg_color = color or colors.get(status.upper(), '#5b95cf')
        
        # Calculate lighter background (20% opacity)
        bg_light = bg_color + '33'  # Add alpha for light background
        
        return f'''
        <div style="text-align: center; margin: 25px 0;">
            <span style="
                display: inline-block;
                background: {bg_light};
                color: {bg_color};
                padding: 10px 20px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
                border: 2px solid {bg_color};
            ">
                {status}
            </span>
        </div>
        '''
    
    # ============================================================
    # INFO CARDS
    # ============================================================
    
    @staticmethod
    def info_card(title: str, fields: List[Dict[str, str]], accent_color: str = '#3b82f6') -> str:
        """
        Render info card with key-value pairs
        
        Args:
            title: Card title
            fields: List of dicts with 'label' and 'value' keys
                   Optional 'highlight' key for emphasized values
            accent_color: Color for border and highlights
        
        Returns:
            HTML info card
        """
        rows_html = []
        
        for field in fields:
            label = field.get('label', '')
            value = field.get('value', '')
            highlight = field.get('highlight', False)
            
            value_class = 'info-value-highlight' if highlight else 'info-value'
            value_style = f'font-size: 24px; color: {accent_color};' if highlight else ''
            
            rows_html.append(f'''
            <div style="
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #e5e7eb;
            ">
                <span style="font-size: 14px; color: #6b7280; font-weight: 500;">
                    {label}
                </span>
                <span style="font-size: 14px; color: #1f2937; font-weight: 600; text-align: right; margin-left: 20px; {value_style}">
                    {value}
                </span>
            </div>
            ''')
        
        # Remove border from last row
        if rows_html:
            rows_html[-1] = rows_html[-1].replace('border-bottom: 1px solid #e5e7eb;', '')
        
        return f'''
        <div style="
            background: #f9fafb;
            border-left: 4px solid {accent_color};
            border-radius: 8px;
            padding: 25px;
            margin: 30px 0;
        ">
            <h2 style="
                margin: 0 0 20px 0;
                font-size: 18px;
                color: #1f2937;
                font-weight: 600;
            ">{title}</h2>
            {''.join(rows_html)}
        </div>
        '''
    
    # ============================================================
    # LINE ITEMS TABLE
    # ============================================================
    
    @staticmethod
    def line_items_table(line_items: List[LineItem], show_tax: bool = True) -> str:
        """
        Render line items table
        
        Args:
            line_items: List of LineItem objects
            show_tax: Whether to show tax column
        
        Returns:
            HTML table
        """
        if not line_items:
            return ''
        
        # Build table rows
        rows_html = []
        for item in line_items:
            tax_cell = f'<td style="padding: 12px; text-align: right;">${item.tax_amount:.2f}</td>' if show_tax else ''
            
            rows_html.append(f'''
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px;">{item.description}</td>
                <td style="padding: 12px; text-align: center;">{item.quantity}</td>
                <td style="padding: 12px; text-align: right;">${item.unit_amount:.2f}</td>
                {tax_cell}
                <td style="padding: 12px; text-align: right; font-weight: 600;">${item.total:.2f}</td>
            </tr>
            ''')
        
        tax_header = '<th style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Tax</th>' if show_tax else ''
        
        return f'''
        <div style="margin: 30px 0; overflow-x: auto;">
            <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1f2937; font-weight: 600;">
                Items & Services
            </h3>
            <table style="
                width: 100%;
                border-collapse: collapse;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #e5e7eb;
            ">
                <thead>
                    <tr style="background: #f9fafb;">
                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Description</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Qty</th>
                        <th style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
                        {tax_header}
                        <th style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Total</th>
                    </tr>
                </thead>
                <tbody style="font-size: 14px; color: #4b5563;">
                    {''.join(rows_html)}
                </tbody>
            </table>
        </div>
        '''
    
    # ============================================================
    # PAYMENT METHODS
    # ============================================================
    
    @staticmethod
    def payment_methods_section(
        payment_methods: List[PaymentMethod],
        invoice_number: Optional[str] = None
    ) -> str:
        """
        Render payment methods section
        
        Args:
            payment_methods: List of PaymentMethod objects
            invoice_number: Optional invoice number for reference
        
        Returns:
            HTML payment methods section
        """
        if not payment_methods:
            return ''
        
        methods_html = []
        
        for method in payment_methods:
            if method.method_type == 'bank':
                methods_html.append(f'''
                <div style="
                    background: white;
                    border-radius: 6px;
                    padding: 15px;
                    margin: 10px 0;
                ">
                    <p style="font-size: 14px; font-weight: 600; color: #1f2937; margin: 0 0 8px 0;">
                        Bank Transfer (Preferred)
                    </p>
                    <p style="font-size: 13px; color: #6b7280; margin: 4px 0;">
                        <strong>Account Name:</strong> {method.account_name or 'N/A'}
                    </p>
                    <p style="font-size: 13px; color: #6b7280; margin: 4px 0;">
                        <strong>BSB:</strong> {method.bsb or 'N/A'}
                    </p>
                    <p style="font-size: 13px; color: #6b7280; margin: 4px 0;">
                        <strong>Account:</strong> {method.account_number or 'N/A'}
                    </p>
                    <p style="font-size: 13px; color: #6b7280; margin: 4px 0;">
                        <strong>Reference:</strong> {method.reference or invoice_number or 'N/A'}
                    </p>
                </div>
                ''')
            
            elif method.method_type == 'card':
                methods_html.append(f'''
                <div style="
                    background: white;
                    border-radius: 6px;
                    padding: 15px;
                    margin: 10px 0;
                ">
                    <p style="font-size: 14px; font-weight: 600; color: #1f2937; margin: 0 0 8px 0;">
                        Credit Card / EFTPOS
                    </p>
                    <p style="font-size: 13px; color: #6b7280; margin: 4px 0;">
                        {method.instructions or 'Available at our clinic locations'}
                    </p>
                </div>
                ''')
        
        return f'''
        <div style="
            background: #e3f2fd;
            border-radius: 8px;
            padding: 25px;
            margin: 30px 0;
        ">
            <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e3a5f; font-weight: 600;">
                💳 Payment Options
            </h3>
            {''.join(methods_html)}
        </div>
        '''
    
    # ============================================================
    # ALERT BOXES
    # ============================================================
    
    @staticmethod
    def alert_box(
        message: str,
        alert_type: str = 'info',
        icon: Optional[str] = None
    ) -> str:
        """
        Render alert box
        
        Args:
            message: Alert message
            alert_type: 'info', 'warning', 'success', 'error'
            icon: Optional emoji icon
        
        Returns:
            HTML alert box
        """
        colors = {
            'info': {'bg': '#e3f2fd', 'border': '#5b95cf', 'text': '#1e3a5f'},      # Blue tones
            'warning': {'bg': '#fef3c7', 'border': '#f59e0b', 'text': '#92400e'},   # Keep amber for warnings
            'success': {'bg': '#e3f2fd', 'border': '#5b95cf', 'text': '#1e3a5f'},   # Blue tones (was green)
            'error': {'bg': '#fee2e2', 'border': '#ef4444', 'text': '#991b1b'},     # Keep red for errors
        }
        
        icons_default = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'success': '✓',
            'error': '❌',
        }
        
        style = colors.get(alert_type, colors['info'])
        display_icon = icon or icons_default.get(alert_type, '')
        
        return f'''
        <div style="
            background: {style['bg']};
            border-left: 4px solid {style['border']};
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        ">
            <p style="margin: 0; font-size: 14px; color: {style['text']};">
                {f'<strong>{display_icon}</strong> ' if display_icon else ''}{message}
            </p>
        </div>
        '''
    
    # ============================================================
    # CALL-TO-ACTION BUTTON
    # ============================================================
    
    @staticmethod
    def cta_button(text: str, href: str, color: str = '#5b95cf') -> str:
        """
        Render call-to-action button
        
        Args:
            text: Button text
            href: Link URL
            color: Button background color
        
        Returns:
            HTML button
        """
        return f'''
        <div style="text-align: center; margin: 30px 0;">
            <a href="{href}" style="
                display: inline-block;
                background: {color};
                color: white;
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
            ">
                {text}
            </a>
        </div>
        '''
    
    # ============================================================
    # THANK YOU SECTION
    # ============================================================
    
    @staticmethod
    def thank_you_section(message: str = "Thank you for your business!") -> str:
        """Render thank you section"""
        return f'''
        <div style="
            background: #e3f2fd;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            text-align: center;
        ">
            <div style="font-size: 40px; margin-bottom: 10px;">🎉</div>
            <p style="font-size: 16px; color: #1e3a5f; font-weight: 500; margin: 0;">
                {message}
            </p>
        </div>
        '''

