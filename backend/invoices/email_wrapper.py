"""
Email HTML Wrapper - Professional Email Template System

This module wraps simple HTML email content in a professional, branded email structure.
It uses the template's header_color to create beautiful gradient headers.
"""


def wrap_email_html(
    body_html: str, 
    header_color: str = '#5b95cf', 
    email_type: str = 'Email', 
    title: str = None,
    clinician=None
) -> str:
    """
    Wrap plain HTML email content in a professional email structure
    
    Args:
        body_html: The basic HTML content (from EmailTemplate.body_html)
        header_color: Hex color for header gradient (from EmailTemplate.header_color)
        email_type: Type of email for header (e.g., 'Invoice', 'Receipt', 'Quote')
        title: Optional specific title (e.g., invoice number)
        clinician: Optional Clinician object to append email signature
    
    Returns:
        Complete HTML email with professional styling (and clinician signature if provided)
    """
    # Calculate lighter color for gradient (add 20% to RGB values)
    lighter_color = lighten_color(header_color, 0.1)
    
    # Determine icon based on email type
    icons = {
        'invoice': '📄',
        'receipt': '✓',
        'quote': '💼',
        'at_report': '📋',
        'at report': '📋',
        'letter': '✉️',
        'payment': '⚠️',
        'overdue': '⚠️',
        'reminder': '⏰',
    }
    
    email_type_lower = email_type.lower()
    icon = next((v for k, v in icons.items() if k in email_type_lower), '📧')
    
    # Append signature (clinician personal signature or company signature)
    signature_html = ''
    if clinician and clinician.signature_html:
        # Use clinician's personal signature
        signature_html = f'''
        <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
            {clinician.signature_html}
        </div>
        '''
    else:
        # No clinician provided, use company signature
        try:
            from .models import EmailGlobalSettings
            settings = EmailGlobalSettings.get_settings()
            if settings.company_signature_html:
                signature_html = f'''
                <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
                    {settings.company_signature_html}
                </div>
                '''
        except Exception as e:
            # Silently fail if no company signature available
            pass
    
    # Build complete HTML structure
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f7fa;
            line-height: 1.6;
        }}
        .email-wrapper {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }}
        .header {{
            background: linear-gradient(135deg, {header_color} 0%, {lighter_color} 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 600;
        }}
        .header .subtitle {{
            margin: 0;
            font-size: 16px;
            opacity: 0.95;
            font-weight: 500;
        }}
        .content {{
            padding: 40px 30px;
        }}
        .content p {{
            font-size: 15px;
            color: #4b5563;
            margin: 0 0 15px 0;
        }}
        .content strong {{
            color: #1f2937;
        }}
        .content ul, .content ol {{
            font-size: 15px;
            color: #4b5563;
            padding-left: 20px;
            margin: 15px 0;
        }}
        .content li {{
            margin: 8px 0;
        }}
        .footer {{
            background: #1f2937;
            color: #9ca3af;
            padding: 30px;
            text-align: center;
            font-size: 13px;
        }}
        .footer-logo {{
            font-size: 20px;
            color: #ffffff;
            font-weight: 600;
            margin: 0 0 15px 0;
        }}
        .footer-links {{
            margin: 20px 0;
        }}
        .footer-link {{
            color: {header_color};
            text-decoration: none;
            margin: 0 10px;
        }}
        .footer-divider {{
            border: none;
            border-top: 1px solid #374151;
            margin: 20px 0;
        }}
        .footer-text {{
            line-height: 1.8;
            margin: 10px 0;
        }}
        
        /* Mobile responsive */
        @media only screen and (max-width: 600px) {{
            .header {{
                padding: 30px 20px;
            }}
            .header h1 {{
                font-size: 24px;
            }}
            .content {{
                padding: 30px 20px;
            }}
            .footer {{
                padding: 20px;
            }}
        }}
    </style>
</head>
<body>
    <div class="email-wrapper">
        <!-- Header -->
        <div class="header">
            <h1>{icon} {email_type}</h1>
            {f'<p class="subtitle">{title}</p>' if title else ''}
        </div>
        
        <!-- Content -->
        <div class="content">
            {body_html}
            {signature_html}
        </div>
    </div>
</body>
</html>"""
    
    return html


def lighten_color(hex_color: str, amount: float = 0.1) -> str:
    """
    Lighten a hex color by a percentage
    
    Args:
        hex_color: Hex color string (e.g., '#10b981')
        amount: Amount to lighten (0.0 to 1.0)
    
    Returns:
        Lightened hex color string
    """
    # Remove # if present
    hex_color = hex_color.lstrip('#')
    
    # Convert to RGB
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    
    # Lighten by moving towards 255
    r = min(255, int(r + (255 - r) * amount))
    g = min(255, int(g + (255 - g) * amount))
    b = min(255, int(b + (255 - b) * amount))
    
    # Convert back to hex
    return f'#{r:02x}{g:02x}{b:02x}'


def get_email_type_from_category(category: str) -> str:
    """
    Get friendly email type name from category
    
    Args:
        category: Template category (e.g., 'invoice', 'receipt')
    
    Returns:
        Friendly name (e.g., 'Invoice', 'Receipt')
    """
    type_map = {
        'invoice': 'Invoice',
        'receipt': 'Payment Received',
        'quote': 'Quote',
        'at_report': 'AT Report',
        'letter': 'Letter',
    }
    
    return type_map.get(category, 'Email')


def extract_title_from_body(body_html: str, category: str) -> str:
    """
    Try to extract a title from the email body (e.g., invoice number)
    
    Args:
        body_html: The email body HTML
        category: Template category
    
    Returns:
        Extracted title or None
    """
    import re
    
    # Try to extract invoice/quote numbers
    if category in ['invoice', 'receipt']:
        match = re.search(r'INV-\d+', body_html, re.IGNORECASE)
        if match:
            return match.group(0)
    
    elif category == 'quote':
        match = re.search(r'QU-\d+', body_html, re.IGNORECASE)
        if match:
            return match.group(0)
    
    return None

