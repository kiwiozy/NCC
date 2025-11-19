"""
Email Signature Helper - Logic for appending signatures to emails

Logic:
1. If sending from company email (e.g., info@walkeasy.com.au) → Use company signature
2. If sending from any other email → Use user's personal signature from their Clinician profile
3. If signatures disabled globally → Don't append any signature
"""
from invoices.models import EmailGlobalSettings
from clinicians.models import Clinician
import logging

logger = logging.getLogger(__name__)


def get_email_signature(sender_email, user=None):
    """
    Get the appropriate email signature based on sender email and user.
    
    Args:
        sender_email (str): The email address sending the email
        user (User): Django User object (optional, used to find clinician profile)
    
    Returns:
        str: HTML signature to append to email body, or empty string if none
    """
    try:
        # Get global settings
        settings = EmailGlobalSettings.get_settings()
        
        # Check if signatures are globally enabled
        if not settings.use_email_signatures:
            logger.info("Email signatures disabled globally")
            return ''
        
        # Check if sending from company email
        if sender_email and sender_email.lower() == settings.company_signature_email.lower():
            logger.info(f"Using company signature for {sender_email}")
            return settings.company_signature_html or ''
        
        # Otherwise, try to get user's personal signature
        if user:
            try:
                clinician = Clinician.objects.get(user=user)
                if clinician.signature_html:
                    logger.info(f"Using personal signature for user {user.username}")
                    return clinician.signature_html
                else:
                    logger.info(f"No personal signature found for user {user.username}")
            except Clinician.DoesNotExist:
                logger.warning(f"No clinician profile found for user {user.username}")
        
        # No signature found
        logger.info("No signature to append")
        return ''
        
    except Exception as e:
        logger.error(f"Error getting email signature: {e}")
        return ''


def append_signature_to_email(email_body_html, sender_email, user=None):
    """
    Append the appropriate signature to email body.
    
    Args:
        email_body_html (str): The email body (HTML format)
        sender_email (str): The email address sending the email
        user (User): Django User object (optional)
    
    Returns:
        str: Email body with signature appended
    """
    signature = get_email_signature(sender_email, user)
    
    if not signature:
        return email_body_html
    
    # Append signature with a separator
    return f"""
{email_body_html}

<br><br>
<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
{signature}
</div>
"""


# Example usage:
"""
from invoices.email_signature_helper import append_signature_to_email

# In your email sending code:
email_body = "<p>Dear Patient,</p><p>Your invoice is attached.</p>"
sender = "info@walkeasy.com.au"
current_user = request.user

# Append signature
email_body_with_signature = append_signature_to_email(email_body, sender, current_user)

# Send email with signature
gmail_service.send_email(
    to=recipient_email,
    subject=subject,
    body_html=email_body_with_signature,
    ...
)
"""

