"""
Gmail Integration Service

Handles:
- OAuth2 authentication flow
- Token management and refresh
- Email sending via Gmail API
- Template rendering
"""
import os
import base64
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import timedelta
from typing import List, Optional, Dict, Any
from django.utils import timezone
from django.conf import settings
from .models import GmailConnection, EmailTemplate, SentEmail


class GmailService:
    """
    Main service class for Gmail API interactions
    """
    
    def __init__(self):
        """Initialize Gmail service with OAuth2 credentials"""
        self.client_id = os.getenv('GMAIL_CLIENT_ID', '')
        self.client_secret = os.getenv('GMAIL_CLIENT_SECRET', '')
        self.redirect_uri = os.getenv('GMAIL_REDIRECT_URI', 'http://localhost:8000/gmail/oauth/callback/')
        
        # Gmail API scopes
        self.scopes = [
            'https://www.googleapis.com/auth/gmail.send',  # Send emails
            'https://www.googleapis.com/auth/gmail.readonly',  # Read email metadata
            'https://www.googleapis.com/auth/userinfo.email',  # Get user email
            'https://www.googleapis.com/auth/userinfo.profile',  # Get user profile
        ]
    
    def _check_credentials(self):
        """Verify OAuth2 credentials are configured"""
        if not self.client_id or not self.client_secret:
            raise ValueError(
                "Gmail OAuth2 credentials not configured. "
                "Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your .env file"
            )
    
    def get_authorization_url(self, state: str = None) -> str:
        """
        Generate OAuth2 authorization URL
        
        Args:
            state: Optional state parameter for CSRF protection
            
        Returns:
            Authorization URL to redirect user to
        """
        self._check_credentials()
        
        # Build scope string
        scope_string = ' '.join(self.scopes)
        
        # Build authorization URL
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={self.client_id}&"
            f"redirect_uri={self.redirect_uri}&"
            f"response_type=code&"
            f"scope={scope_string}&"
            f"access_type=offline&"  # Get refresh token
            f"prompt=consent&"  # Force consent to get refresh token
            f"state={state or 'nexus-clinic'}"
        )
        
        return auth_url
    
    def exchange_code_for_token(self, code: str) -> GmailConnection:
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code from OAuth callback
            
        Returns:
            GmailConnection object with tokens stored
        """
        self._check_credentials()
        start_time = time.time()
        
        try:
            import requests
            
            # Exchange code for token
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                "code": code,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "redirect_uri": self.redirect_uri,
                "grant_type": "authorization_code"
            }
            
            response = requests.post(token_url, data=data, timeout=30)
            response.raise_for_status()
            token_data = response.json()
            
            # Get user info
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {
                "Authorization": f"Bearer {token_data['access_token']}"
            }
            
            user_response = requests.get(userinfo_url, headers=headers, timeout=30)
            user_response.raise_for_status()
            user_data = user_response.json()
            
            # Calculate token expiry
            expires_at = timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600))
            
            # Store or update connection
            connection, created = GmailConnection.objects.update_or_create(
                email_address=user_data.get('email'),
                defaults={
                    'display_name': user_data.get('name', ''),
                    'access_token': token_data['access_token'],
                    'refresh_token': token_data.get('refresh_token', ''),  # May not always be present
                    'token_type': token_data.get('token_type', 'Bearer'),
                    'expires_at': expires_at,
                    'scopes': ' '.join(self.scopes),
                    'is_active': True,
                }
            )
            
            # Set connected_at only for new connections
            if created:
                connection.connected_at = timezone.now()
                connection.save()
            
            # If no other primary account exists, make this primary
            if not GmailConnection.objects.filter(is_primary=True).exists():
                connection.is_primary = True
                connection.save()
            
            duration_ms = int((time.time() - start_time) * 1000)
            print(f"✓ Gmail OAuth completed in {duration_ms}ms")
            
            return connection
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            print(f"✗ Gmail OAuth failed after {duration_ms}ms: {str(e)}")
            raise
    
    def refresh_access_token(self, connection: GmailConnection) -> GmailConnection:
        """
        Refresh an expired access token
        
        Args:
            connection: GmailConnection with refresh token
            
        Returns:
            Updated GmailConnection
        """
        self._check_credentials()
        
        if not connection.refresh_token:
            raise ValueError("No refresh token available. Please reconnect your Gmail account.")
        
        try:
            import requests
            
            # Refresh token
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": connection.refresh_token,
                "grant_type": "refresh_token"
            }
            
            response = requests.post(token_url, data=data, timeout=30)
            response.raise_for_status()
            token_data = response.json()
            
            # Update connection with new token
            expires_at = timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600))
            connection.access_token = token_data['access_token']
            connection.expires_at = expires_at
            connection.last_refresh_at = timezone.now()
            connection.save()
            
            print(f"✓ Gmail token refreshed for {connection.email_address}")
            
            return connection
            
        except Exception as e:
            print(f"✗ Failed to refresh Gmail token: {str(e)}")
            raise
    
    def get_active_connection(self) -> Optional[GmailConnection]:
        """Get the primary active Gmail connection"""
        # Try primary first
        connection = GmailConnection.objects.filter(is_active=True, is_primary=True).first()
        
        # Fallback to any active connection
        if not connection:
            connection = GmailConnection.objects.filter(is_active=True).first()
        
        # Refresh token if expired
        if connection and connection.is_token_expired():
            try:
                connection = self.refresh_access_token(connection)
            except Exception as e:
                print(f"Failed to refresh token: {e}")
                return None
        
        return connection
    
    def get_connection_by_email(self, email: str) -> Optional[GmailConnection]:
        """
        Get a specific Gmail connection by email address
        
        Args:
            email: Email address of the connection to retrieve
            
        Returns:
            GmailConnection or None
        """
        try:
            connection = GmailConnection.objects.get(email_address=email, is_active=True)
            
            # Refresh token if expired
            if connection.is_token_expired():
                connection = self.refresh_access_token(connection)
            
            return connection
        except GmailConnection.DoesNotExist:
            return None
    
    def get_all_active_connections(self) -> List[GmailConnection]:
        """
        Get all active Gmail connections
        
        Returns:
            List of active GmailConnection objects
        """
        return list(GmailConnection.objects.filter(is_active=True).order_by('-is_primary', '-connected_at'))
    
    def get_send_as_addresses(self, connection: GmailConnection = None) -> List[Dict[str, Any]]:
        """
        Fetch all 'Send As' addresses configured for the Gmail account
        
        Args:
            connection: GmailConnection to use (optional, uses active if not provided)
            
        Returns:
            List of dicts with send as address information
        """
        if not connection:
            connection = self.get_active_connection()
            if not connection:
                raise ValueError("No active Gmail connection available")
        
        try:
            import requests
            
            # Fetch send as addresses from Gmail API
            url = "https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs"
            headers = {
                "Authorization": f"Bearer {connection.access_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            # Parse and format the send as addresses
            send_as_list = []
            for send_as in result.get('sendAs', []):
                send_as_list.append({
                    'email': send_as.get('sendAsEmail'),
                    'display_name': send_as.get('displayName', ''),
                    'is_default': send_as.get('isDefault', False),
                    'is_primary': send_as.get('isPrimary', False),
                    'verification_status': send_as.get('verificationStatus', 'unknown'),
                    'reply_to': send_as.get('replyToAddress', ''),
                    'signature': send_as.get('signature', ''),
                })
            
            print(f"✓ Fetched {len(send_as_list)} Send As addresses")
            return send_as_list
            
        except Exception as e:
            print(f"✗ Failed to fetch Send As addresses: {str(e)}")
            # Return at least the connected account's email
            return [{
                'email': connection.email_address,
                'display_name': connection.display_name,
                'is_default': True,
                'is_primary': True,
                'verification_status': 'accepted',
                'reply_to': '',
                'signature': '',
            }]
    
    def _load_email_signature(self) -> str:
        """
        Load the email signature HTML template
        
        Returns:
            HTML signature string
        """
        try:
            import os
            from django.conf import settings
            
            # Get the path to the signature file
            signature_path = os.path.join(
                os.path.dirname(__file__),
                'email_signature.html'
            )
            
            # Read the signature
            with open(signature_path, 'r', encoding='utf-8') as f:
                signature_html = f.read()
            
            return signature_html
            
        except Exception as e:
            print(f"Warning: Could not load email signature: {e}")
            # Return a simple fallback signature
            return """
            <br><br>
            <div style="font-family: Verdana, sans-serif; font-size: 12px; color: #777;">
                <strong>Walk Easy Pedorthics</strong><br>
                Phone: 02 6766 3153<br>
                Email: info@walkeasy.com.au<br>
                Web: <a href="http://www.walkeasy.com.au">www.walkeasy.com.au</a>
            </div>
            """
    
    def _append_signature_to_body(self, body_html: str) -> str:
        """
        Append email signature to HTML body
        
        Args:
            body_html: Original email body HTML
            
        Returns:
            Email body with signature appended
        """
        # Ensure body_html is a string, not bytes
        if isinstance(body_html, bytes):
            body_html = body_html.decode('utf-8')
        
        signature = self._load_email_signature()
        
        # If body is a complete HTML document, insert signature before </body>
        if '</body>' in body_html.lower():
            return body_html.replace('</body>', f'{signature}</body>')
        
        # Otherwise, just append the signature
        return f"{body_html}\n\n{signature}"
    
    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body_html: str,
        body_text: str = None,
        cc_emails: List[str] = None,
        bcc_emails: List[str] = None,
        attachments: List[Dict[str, Any]] = None,
        connection: GmailConnection = None,
        connection_email: str = None,
        template: EmailTemplate = None,
        metadata: Dict[str, Any] = None,
        from_address: str = None
    ) -> SentEmail:
        """
        Send an email via Gmail API
        
        Args:
            to_emails: List of recipient email addresses
            subject: Email subject
            body_html: HTML body content
            body_text: Plain text alternative (optional)
            cc_emails: CC recipients (optional)
            bcc_emails: BCC recipients (optional)
            attachments: List of dicts with 'filename' and 'content' (bytes)
            connection: Specific GmailConnection to use (optional, uses primary if not provided)
            connection_email: Email address of connection to use (alternative to connection parameter)
            template: EmailTemplate used (optional)
            metadata: Additional metadata for logging (optional)
            from_address: Specific email address to send from (optional, must be a configured Send As address)
            
        Returns:
            SentEmail log entry
        """
        # Get connection - prioritize connection_email, then connection, then default
        if connection_email:
            connection = self.get_connection_by_email(connection_email)
            if not connection:
                raise ValueError(f"No active connection found for {connection_email}")
        elif not connection:
            connection = self.get_active_connection()
            if not connection:
                raise ValueError("No active Gmail connection available. Please connect your Gmail account.")
        
        try:
            import requests
            
            # Append email signature to HTML body
            body_html_with_signature = self._append_signature_to_body(body_html)
            
            # Create MIME message structure
            # For emails with attachments, use 'mixed' and nest 'alternative' inside
            if attachments:
                message = MIMEMultipart('mixed')
                message['To'] = ', '.join(to_emails)
                message['Subject'] = subject
                # Use from_address if provided, otherwise use connection's email
                message['From'] = from_address if from_address else connection.email_address
                
                if cc_emails:
                    message['Cc'] = ', '.join(cc_emails)
                
                # Create alternative part for text/html
                msg_alternative = MIMEMultipart('alternative')
                
                # Add text parts to alternative
                if body_text:
                    text_part = MIMEText(body_text, 'plain', 'utf-8')
                    msg_alternative.attach(text_part)
                
                html_part = MIMEText(body_html_with_signature, 'html', 'utf-8')
                msg_alternative.attach(html_part)
                
                # Attach the alternative part to the main message
                message.attach(msg_alternative)
                
            else:
                # No attachments, use simple alternative structure
                message = MIMEMultipart('alternative')
                message['To'] = ', '.join(to_emails)
                message['Subject'] = subject
                # Use from_address if provided, otherwise use connection's email
                message['From'] = from_address if from_address else connection.email_address
                
                if cc_emails:
                    message['Cc'] = ', '.join(cc_emails)
                
                # Add text parts
                if body_text:
                    text_part = MIMEText(body_text, 'plain', 'utf-8')
                    message.attach(text_part)
                
                html_part = MIMEText(body_html_with_signature, 'html', 'utf-8')
                message.attach(html_part)
            
            # Add attachments
            attachment_names = []
            if attachments:
                for attachment in attachments:
                    # Create the attachment part
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment['content'])
                    encoders.encode_base64(part)
                    
                    # Add header with proper filename (no space before filename)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename="{attachment["filename"]}"'
                    )
                    
                    message.attach(part)
                    attachment_names.append(attachment['filename'])
            
            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            # Send via Gmail API
            send_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
            headers = {
                "Authorization": f"Bearer {connection.access_token}",
                "Content-Type": "application/json"
            }
            data = {
                "raw": raw_message
            }
            
            response = requests.post(send_url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            # Update connection stats
            connection.emails_sent += 1
            connection.last_used_at = timezone.now()
            connection.save()
            
            # Log sent email
            sent_email = SentEmail.objects.create(
                connection=connection,
                to_addresses=', '.join(to_emails),
                cc_addresses=', '.join(cc_emails) if cc_emails else '',
                bcc_addresses=', '.join(bcc_emails) if bcc_emails else '',
                subject=subject,
                body_preview=body_text[:500] if body_text else body_html[:500],
                has_attachments=bool(attachments),
                attachment_names=', '.join(attachment_names),
                template=template,
                status='sent',
                gmail_message_id=result.get('id', ''),
                gmail_thread_id=result.get('threadId', ''),
                related_patient_id=metadata.get('patient_id', '') if metadata else '',
                related_appointment_id=metadata.get('appointment_id', '') if metadata else '',
                related_report_type=metadata.get('report_type', '') if metadata else '',
                sent_by=metadata.get('sent_by', '') if metadata else '',
            )
            
            print(f"✓ Email sent via Gmail: {subject} to {', '.join(to_emails)}")
            
            return sent_email
            
        except Exception as e:
            # Log failed attempt
            sent_email = SentEmail.objects.create(
                connection=connection,
                to_addresses=', '.join(to_emails),
                cc_addresses=', '.join(cc_emails) if cc_emails else '',
                subject=subject,
                body_preview=body_text[:500] if body_text else body_html[:500],
                has_attachments=bool(attachments),
                status='failed',
                error_message=str(e),
            )
            
            print(f"✗ Failed to send email via Gmail: {str(e)}")
            raise


# Singleton instance
gmail_service = GmailService()

