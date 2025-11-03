"""
Email Service for sending AT Reports and other communications
Works with Gmail SMTP (compatible with Apple Mail)
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.utils import formataddr
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """
    Email service for clinic communications
    Configured for Gmail SMTP with Apple Mail compatibility
    """
    
    def __init__(self):
        """Initialize email service with Gmail SMTP settings"""
        self.smtp_host = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('EMAIL_PORT', '587'))
        self.smtp_user = os.getenv('EMAIL_HOST_USER', '')
        self.smtp_password = os.getenv('EMAIL_HOST_PASSWORD', '')
        self.from_email = os.getenv('EMAIL_FROM', self.smtp_user)
        self.from_name = os.getenv('EMAIL_FROM_NAME', 'WalkEasy Nexus')
        
        # Validate configuration
        if not self.smtp_user or not self.smtp_password:
            logger.warning("Email credentials not configured. Set EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in .env")
    
    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        attachments: Optional[List[dict]] = None,
        reply_to: Optional[str] = None
    ) -> dict:
        """
        Send an email via Gmail SMTP
        
        Args:
            to_emails: List of recipient email addresses
            subject: Email subject line
            body_html: HTML email body
            body_text: Plain text email body (optional, will strip HTML if not provided)
            cc_emails: List of CC recipients (optional)
            bcc_emails: List of BCC recipients (optional)
            attachments: List of attachment dicts with 'filename' and 'content' (bytes)
            reply_to: Reply-To email address (optional)
            
        Returns:
            dict with 'success' and 'message' keys
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = formataddr((self.from_name, self.from_email))
            msg['To'] = ', '.join(to_emails)
            
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            
            if reply_to:
                msg['Reply-To'] = reply_to
            
            # Add plain text version (fallback)
            if body_text:
                part1 = MIMEText(body_text, 'plain')
                msg.attach(part1)
            
            # Add HTML version
            part2 = MIMEText(body_html, 'html')
            msg.attach(part2)
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    part = MIMEApplication(attachment['content'], Name=attachment['filename'])
                    part['Content-Disposition'] = f'attachment; filename="{attachment["filename"]}"'
                    msg.attach(part)
            
            # Combine all recipients
            all_recipients = to_emails.copy()
            if cc_emails:
                all_recipients.extend(cc_emails)
            if bcc_emails:
                all_recipients.extend(bcc_emails)
            
            # Send email via Gmail SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()  # Secure connection
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_email, all_recipients, msg.as_string())
            
            logger.info(f"Email sent successfully to {', '.join(to_emails)}")
            return {
                'success': True,
                'message': f'Email sent successfully to {len(all_recipients)} recipient(s)'
            }
            
        except smtplib.SMTPAuthenticationError:
            error_msg = "Gmail authentication failed. Check EMAIL_HOST_USER and EMAIL_HOST_PASSWORD"
            logger.error(error_msg)
            return {'success': False, 'message': error_msg}
        
        except smtplib.SMTPException as e:
            error_msg = f"SMTP error: {str(e)}"
            logger.error(error_msg)
            return {'success': False, 'message': error_msg}
        
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            logger.error(error_msg)
            return {'success': False, 'message': error_msg}
    
    def send_at_report_email(
        self,
        to_emails: List[str],
        participant_name: str,
        ndis_number: str,
        pdf_content: bytes,
        pdf_filename: str,
        cc_emails: Optional[List[str]] = None,
        custom_message: Optional[str] = None
    ) -> dict:
        """
        Send AT Report PDF via email with professional template
        
        Args:
            to_emails: List of recipient email addresses
            participant_name: Name of the participant
            ndis_number: NDIS number
            pdf_content: PDF file content as bytes
            pdf_filename: Name of the PDF file
            cc_emails: Optional CC recipients
            custom_message: Optional custom message to include
            
        Returns:
            dict with 'success' and 'message' keys
        """
        subject = f"NDIS AT Assessment Report - {participant_name}"
        
        # Create professional HTML email body
        body_html = self._create_at_report_email_template(
            participant_name=participant_name,
            ndis_number=ndis_number,
            custom_message=custom_message
        )
        
        # Create plain text version
        body_text = f"""
NDIS AT Assessment Report

Participant: {participant_name}
NDIS Number: {ndis_number}

Please find attached the completed NDIS Assistive Technology Assessment Report.

{custom_message if custom_message else ''}

This report has been prepared in accordance with NDIS guidelines and includes:
- Participant and assessor details
- Comprehensive assessment of needs
- AT recommendations with evidence
- Implementation and monitoring plan
- Required declarations and consent

Please review the attached PDF document for complete details.

If you have any questions or require additional information, please don't hesitate to contact us.

Best regards,
WalkEasy Nexus
"""
        
        # Attach PDF
        attachments = [{
            'filename': pdf_filename,
            'content': pdf_content
        }]
        
        return self.send_email(
            to_emails=to_emails,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            cc_emails=cc_emails,
            attachments=attachments
        )
    
    def _create_at_report_email_template(
        self,
        participant_name: str,
        ndis_number: str,
        custom_message: Optional[str] = None
    ) -> str:
        """Create professional HTML email template for AT Report"""
        
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #663399 0%, #7B4BA1 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .content {{
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
        }}
        .info-box {{
            background: #f5f5f5;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }}
        .info-box p {{
            margin: 8px 0;
        }}
        .info-box strong {{
            color: #663399;
        }}
        .custom-message {{
            background: #e8f4fd;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .checklist {{
            margin: 20px 0;
        }}
        .checklist li {{
            padding: 8px 0;
        }}
        .checklist li:before {{
            content: "✓ ";
            color: #4CAF50;
            font-weight: bold;
            margin-right: 8px;
        }}
        .footer {{
            background: #f5f5f5;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 8px 8px;
            font-size: 14px;
            color: #666;
        }}
        .button {{
            display: inline-block;
            background: #663399;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 15px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>NDIS AT Assessment Report</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">WalkEasy Nexus</p>
    </div>
    
    <div class="content">
        <p>Dear Recipient,</p>
        
        <p>Please find attached the completed <strong>NDIS Assistive Technology Assessment Report</strong> for the following participant:</p>
        
        <div class="info-box">
            <p><strong>Participant:</strong> {participant_name}</p>
            <p><strong>NDIS Number:</strong> {ndis_number}</p>
            <p><strong>Report Type:</strong> General Assistive Technology Assessment</p>
        </div>
        
        {f'<div class="custom-message"><p>{custom_message}</p></div>' if custom_message else ''}
        
        <p>This comprehensive assessment report has been prepared in accordance with NDIS guidelines and includes:</p>
        
        <ul class="checklist">
            <li>Participant and plan management details</li>
            <li>Comprehensive assessment of needs</li>
            <li>AT recommendations with supporting evidence</li>
            <li>Implementation and monitoring plan</li>
            <li>Risk assessment and mitigation strategies</li>
            <li>Required declarations and consent documentation</li>
        </ul>
        
        <p><strong>Please review the attached PDF document for complete assessment details.</strong></p>
        
        <p>The report is formatted according to NDIS standards and includes all necessary information for funding consideration.</p>
        
        <p>If you have any questions, require additional information, or would like to discuss the assessment findings, please don't hesitate to contact us.</p>
        
        <p style="margin-top: 30px;">Best regards,</p>
        <p><strong>WalkEasy Nexus Team</strong></p>
    </div>
    
    <div class="footer">
        <p><strong>WalkEasy Nexus</strong></p>
        <p>This email and any attachments contain confidential information intended solely for the named recipient(s).</p>
        <p>If you have received this email in error, please notify the sender immediately and delete this email.</p>
    </div>
</body>
</html>
"""
    
    def send_test_email(self, to_email: str) -> dict:
        """
        Send a test email to verify configuration
        
        Args:
            to_email: Test recipient email address
            
        Returns:
            dict with 'success' and 'message' keys
        """
        subject = "Test Email from WalkEasy Nexus"
        body_html = """
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color: #663399;">Email Configuration Test</h2>
    <p>This is a test email from your WalkEasy Nexus application.</p>
    <p>If you're receiving this, your Gmail SMTP configuration is working correctly! ✓</p>
    <p><strong>Email system is ready to send AT Reports.</strong></p>
    <hr>
    <p style="color: #666; font-size: 12px;">Sent via Gmail SMTP</p>
</body>
</html>
"""
        body_text = "This is a test email from WalkEasy Nexus. If you're receiving this, your email configuration is working!"
        
        return self.send_email(
            to_emails=[to_email],
            subject=subject,
            body_html=body_html,
            body_text=body_text
        )


# Convenience function
def get_email_service() -> EmailService:
    """Get configured email service instance"""
    return EmailService()

