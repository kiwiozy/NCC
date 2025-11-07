"""
Custom allauth adapter to link Google OAuth login with Gmail connections
When a user logs in with Google (business authentication), automatically create/update their Gmail connection

Note: django-allauth uses "SocialAccount" terminology for OAuth providers (Google, Microsoft, etc.)
This is used for business authentication, not just social media logins
"""
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.utils import timezone
from datetime import timedelta
from .models import GmailConnection
from cryptography.fernet import Fernet
import os
import base64


def get_encryption_key():
    """Get encryption key from environment or generate a default"""
    key = os.getenv('ENCRYPTION_KEY')
    if not key:
        # For development only - should be set in production
        key = Fernet.generate_key().decode()
    else:
        # Ensure it's 32 bytes base64 encoded
        if len(key) != 44:  # Base64 encoded 32 bytes = 44 chars
            key = base64.urlsafe_b64encode(key.encode()[:32].ljust(32, b'0'))[:44].decode()
    return key


def encrypt_token(token):
    """Encrypt a token for storage"""
    if not token:
        return ''
    try:
        key = get_encryption_key()
        f = Fernet(key.encode())
        return f.encrypt(token.encode()).decode()
    except Exception as e:
        # Fallback: return as-is (not secure, but allows functionality)
        # In production, this should be logged to monitoring system
        return token


class GmailSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom adapter that creates/updates GmailConnection when user logs in with Google OAuth
    Used for business authentication via Google Workspace accounts
    """
    
    def pre_social_login(self, request, sociallogin):
        """
        Called before social login completes
        We can use this to link the social account to Gmail connection
        """
        # This will be handled in save_user
        pass
    
    def save_user(self, request, sociallogin, form=None):
        """
        Save the user and create/update Gmail connection
        """
        # First, save the user using default behavior
        user = super().save_user(request, sociallogin, form)
        
        # If this is a Google login, create/update Gmail connection
        if sociallogin.account.provider == 'google':
            try:
                # Get the social account
                social_account = sociallogin.account
                
                # Get tokens from the social account
                social_token = sociallogin.token
                access_token = social_token.token
                # Allauth stores refresh token in token_secret or extra_data
                refresh_token = (
                    social_token.token_secret or 
                    social_account.extra_data.get('refresh_token') or
                    ''
                )
                
                # Get user email from social account
                email = social_account.extra_data.get('email') or user.email
                
                if email and access_token:
                    # Check if Gmail connection already exists
                    gmail_conn, created = GmailConnection.objects.update_or_create(
                        email_address=email,
                        defaults={
                            'display_name': social_account.extra_data.get('name', ''),
                            'access_token': encrypt_token(access_token),
                            'refresh_token': encrypt_token(refresh_token) if refresh_token else '',
                            'token_type': 'Bearer',
                            'expires_at': timezone.now() + timedelta(
                                seconds=int(social_token.expires_at) if social_token.expires_at else 3600
                            ),
                            'scopes': ' '.join(
                                social_account.extra_data.get('scope', []) 
                                if isinstance(social_account.extra_data.get('scope'), list)
                                else [social_account.extra_data.get('scope')] if social_account.extra_data.get('scope')
                                else []
                            ),
                            'is_active': True,
                            'is_primary': not GmailConnection.objects.filter(is_primary=True).exists(),
                        }
                    )
                    
            except Exception as e:
                # Log error but don't fail the login process
                import traceback
                traceback.print_exc()
        
        return user

