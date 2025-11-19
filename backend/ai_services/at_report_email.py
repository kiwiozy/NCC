"""
Updated AT Report Email Service using Gmail Integration

This module provides email functionality for AT Reports using the Gmail API integration.
"""
from gmail_integration.services import gmail_service
from gmail_integration.models import EmailTemplate
from .pdf_generator import generate_at_report_pdf


def send_at_report_email_via_gmail(
    form_data: dict,
    to_emails: list,
    cc_emails: list = None,
    custom_message: str = None,
    from_address: str = None,
    connection_email: str = None
) -> dict:
    """
    Send AT Report email via Gmail API integration
    
    Args:
        form_data: Complete AT Report form data
        to_emails: List of recipient email addresses
        cc_emails: List of CC email addresses (optional)
        custom_message: Custom message to include in email (optional)
        
    Returns:
        dict with success status and details
    """
    # Generate PDF
    pdf_buffer = generate_at_report_pdf(form_data)
    
    # Convert BytesIO to bytes
    if hasattr(pdf_buffer, 'getvalue'):
        pdf_bytes = pdf_buffer.getvalue()
    else:
        pdf_bytes = pdf_buffer
    
    # Get participant info for filename
    participant_name = form_data.get('participant', {}).get('name', 'Report')
    ndis_number = form_data.get('participant', {}).get('ndisNumber', '')
    
    # Clean filename
    safe_name = ''.join(c for c in participant_name if c.isalnum() or c in (' ', '-', '_'))
    safe_name = safe_name.replace(' ', '_')
    safe_ndis = ''.join(c for c in ndis_number if c.isalnum())
    
    if safe_ndis:
        filename = f'{safe_name}_{safe_ndis}.pdf'
    else:
        filename = f'{safe_name}.pdf'
    
    # Build email subject
    subject = f'NDIS AT Assessment Report - {participant_name}'
    
    # Build email body (HTML)
    body_html = f"""
    <html>
        <head>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 8px 8px 0 0;
                    text-align: center;
                }}
                .content {{
                    background: #f9fafb;
                    padding: 30px;
                    border-radius: 0 0 8px 8px;
                }}
                .info-box {{
                    background: white;
                    border-left: 4px solid #667eea;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .checklist {{
                    background: white;
                    padding: 20px;
                    border-radius: 4px;
                    margin: 20px 0;
                }}
                .checklist ul {{
                    list-style: none;
                    padding: 0;
                }}
                .checklist li {{
                    padding: 8px 0;
                    border-bottom: 1px solid #e5e7eb;
                }}
                .checklist li:before {{
                    content: "✓ ";
                    color: #5b95cf;  /* WalkEasy Blue (no more green!) */
                    font-weight: bold;
                    margin-right: 8px;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #6b7280;
                    font-size: 14px;
                }}
                .button {{
                    display: inline-block;
                    background: #667eea;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="margin: 0;">NDIS AT Assessment Report</h1>
            </div>
            
            <div class="content">
                <p>Hello,</p>
                
                <p>Please find attached the completed NDIS Assistive Technology Assessment Report.</p>
                
                <div class="info-box">
                    <strong>Participant:</strong> {participant_name}<br>
                    {'<strong>NDIS Number:</strong> ' + ndis_number + '<br>' if ndis_number else ''}
                    <strong>Report Type:</strong> AT Assessment<br>
                    <strong>Prepared by:</strong> {form_data.get('assessor', {}).get('name', 'WalkEasy Nexus')}
                </div>
                
                {f'<div style="background: white; padding: 20px; border-radius: 4px; margin: 20px 0;"><p style="margin: 0;"><em>{custom_message}</em></p></div>' if custom_message else ''}
                
                <div class="checklist">
                    <h3 style="margin-top: 0;">📋 Report Contents</h3>
                    <ul>
                        <li>Participant and plan management details</li>
                        <li>Comprehensive assessment of needs and goals</li>
                        <li>AT recommendations with evidence and rationale</li>
                        <li>Implementation and monitoring plan</li>
                        <li>Risk assessment and mitigation strategies</li>
                        <li>Declarations and consent documentation</li>
                    </ul>
                </div>
                
                <p><strong>📎 Attached:</strong> {filename}</p>
                
                <p style="margin-top: 30px;">
                    Please review the attached PDF for complete assessment details. If you have any questions or require clarification, please don't hesitate to contact us.
                </p>
            </div>
            
            <div class="footer">
                <p><strong>WalkEasy Nexus</strong></p>
                <p style="font-size: 12px; color: #9ca3af;">
                    This email and any attachments may contain confidential information. 
                    If you are not the intended recipient, please delete this email and notify the sender immediately.
                </p>
            </div>
        </body>
    </html>
    """
    
    # Plain text version
    body_text = f"""
NDIS AT Assessment Report

Participant: {participant_name}
{'NDIS Number: ' + ndis_number if ndis_number else ''}
Report Type: AT Assessment
Prepared by: {form_data.get('assessor', {}).get('name', 'WalkEasy Nexus')}

{custom_message if custom_message else ''}

Report Contents:
- Participant and plan management details
- Comprehensive assessment of needs and goals
- AT recommendations with evidence and rationale
- Implementation and monitoring plan
- Risk assessment and mitigation strategies
- Declarations and consent documentation

Attached: {filename}

Please review the attached PDF for complete assessment details.

---
WalkEasy Nexus
This email and any attachments may contain confidential information.
    """
    
    # Prepare attachment
    attachments = [{
        'filename': filename,
        'content': pdf_bytes
    }]
    
    # Metadata for logging
    metadata = {
        'patient_id': form_data.get('participant', {}).get('ndisNumber', ''),
        'report_type': 'AT Report',
        'sent_by': 'system',
    }
    
    # Send email via Gmail API
    sent_email = gmail_service.send_email(
        to_emails=to_emails,
        subject=subject,
        body_html=body_html,
        body_text=body_text,
        cc_emails=cc_emails or [],
        attachments=attachments,
        metadata=metadata,
        from_address=from_address,
        connection_email=connection_email
    )
    
    return {
        'success': True,
        'message': f'Email sent successfully to {len(to_emails)} recipient(s)',
        'recipients': len(to_emails) + len(cc_emails or []),
        'email_id': str(sent_email.id),
        'gmail_message_id': sent_email.gmail_message_id,
        'filename': filename
    }

