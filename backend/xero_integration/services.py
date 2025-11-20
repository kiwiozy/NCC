"""
Xero API Service Layer

Provides functions for:
- OAuth2 authentication flow
- Token management (refresh)
- Contact synchronization
- Invoice creation and updates
- Payment synchronization
"""
import logging
import os
import time
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Optional, Dict, Any, List
from urllib.parse import urlencode

from django.conf import settings
from django.utils import timezone
from xero_python.api_client import ApiClient
from xero_python.api_client.configuration import Configuration
from xero_python.api_client.oauth2 import OAuth2Token
from xero_python.identity import IdentityApi
from xero_python.accounting import AccountingApi, Contact, Invoice, LineItem, Contacts, Invoices, Quote, Quotes, QuoteStatusCodes, Payment, Payments, Account
from xero_python.exceptions import AccountingBadRequestException

logger = logging.getLogger(__name__)

from .models import (
    XeroConnection,
    XeroContactLink,
    XeroInvoiceLink,
    XeroQuoteLink,
    XeroSyncLog
)


def generate_smart_reference(patient, custom_reference=None):
    """
    Generate invoice reference based on patient's funding source
    
    Simple logic:
    1. Custom reference (user typed something) → use it
    2. Patient funding source → show appropriate number
    3. Default → patient name
    
    Examples:
    - NDIS patient → "NDIS # 3333222"
    - DVA patient → "DVA # 682730"
    - Enable patient → "Enable Vendor # 508809"
    - BUPA patient → "BUPA - John Smith"
    - Custom funding source (e.g., HCF) → "HCF # 789012" or "HCF - John Smith"
    - Private patient → "Invoice for John Smith"
    """
    from invoices.models import EmailGlobalSettings
    from invoices.custom_funding_model import CustomFundingSource
    
    if custom_reference:
        return custom_reference
    
    if not patient:
        return "Invoice"
    
    # Get company settings for reference numbers
    settings = EmailGlobalSettings.get_settings()
    
    # Check patient's funding source
    if hasattr(patient, 'funding_source') and patient.funding_source:
        
        # First, check if it's a custom funding source (NEW system - takes priority)
        try:
            custom_source = CustomFundingSource.objects.get(
                name__iexact=patient.funding_source,  # Case-insensitive match
                is_active=True
            )
            
            # Use display format if provided
            if custom_source.display_format:
                # Get reference_number_label safely (may not exist in old migrations)
                ref_label = getattr(custom_source, 'reference_number_label', None) or 'Number'
                
                formatted_ref = custom_source.display_format.format(
                    name=custom_source.name,
                    reference_number=custom_source.reference_number or '',
                    reference_number_label=ref_label,
                    patient_name=patient.get_full_name(),
                    patient_health_number=patient.health_number or ''
                )
                return formatted_ref.strip()
            
            # No display format - use default
            if custom_source.reference_number:
                ref_label = getattr(custom_source, 'reference_number_label', None) or '#'
                return f"{custom_source.name} {ref_label} {custom_source.reference_number}"
            else:
                return f"{custom_source.name} - {patient.get_full_name()}"
                
        except CustomFundingSource.DoesNotExist:
            # Not in custom funding - check hardcoded fallbacks
            pass
        
        # Fallback: Check hardcoded funding sources (OLD system - legacy support)
        if patient.funding_source.upper() == 'NDIS' and patient.health_number:
            return f"NDIS # {patient.health_number}"
        
        elif patient.funding_source.upper() == 'DVA' and settings.dva_number:
            return f"DVA # {settings.dva_number}"
        
        elif patient.funding_source.upper() == 'ENABLE' and settings.enable_number:
            return f"Enable Vendor # {settings.enable_number}"
        
        elif patient.funding_source.upper() in ['BUPA', 'MEDIBANK', 'AHM']:
            return f"{patient.funding_source} - {patient.get_full_name()}"
        
        else:
            # Generic fallback - just patient name
            return patient.get_full_name()
    
    # Default: just patient name (no prefix)
    return patient.get_full_name()


class XeroService:
    """
    Main service class for Xero API interactions
    """
    
    def __init__(self):
        self.client_id = os.getenv('XERO_CLIENT_ID', '')
        self.client_secret = os.getenv('XERO_CLIENT_SECRET', '')
        self.redirect_uri = os.getenv('XERO_REDIRECT_URI', 'https://localhost:8000/xero/oauth/callback')
    
    def _check_credentials(self):
        """Check if Xero credentials are configured"""
        if not self.client_id or not self.client_secret:
            raise ValueError("XERO_CLIENT_ID and XERO_CLIENT_SECRET must be set in environment. See .env.example for setup.")
    
    def get_api_client(self) -> ApiClient:
        """
        Create and configure Xero API client with OAuth2 token
        """
        # Get stored token first
        token_dict = self._get_stored_token()
        
        if not token_dict:
            # No token available, return unconfigured client
            configuration = Configuration()
            configuration.debug = settings.DEBUG
            return ApiClient(configuration)
        
        # Create OAuth2Token object
        oauth2_token = OAuth2Token(
            client_id=self.client_id,
            client_secret=self.client_secret
        )
        oauth2_token.token = token_dict
        
        # Create configuration WITH the oauth2_token
        configuration = Configuration(
            debug=settings.DEBUG,
            oauth2_token=oauth2_token
        )
        
        # Create API client with the configured Configuration
        api_client = ApiClient(configuration)
        
        # Set up token getter callback on the API client
        def token_getter_callback():
            """Callback to retrieve current token as a dict"""
            try:
                return self._get_stored_token()  # Returns dict
            except Exception as e:
                print(f"Error retrieving token: {e}")
                return None
        
        # Set up token refresh callback on the API client
        def token_refresh_callback(token_data):
            """Callback to save refreshed tokens"""
            try:
                connection = XeroConnection.objects.filter(is_active=True).first()
                if connection:
                    connection.access_token = token_data['access_token']
                    connection.refresh_token = token_data['refresh_token']
                    connection.expires_at = timezone.datetime.fromtimestamp(
                        token_data['expires_at'], 
                        tz=timezone.get_current_timezone()
                    )
                    connection.save()
                    print(f"✓ Token auto-saved for {connection.tenant_name}")
            except Exception as e:
                print(f"Error saving refreshed token: {e}")
        
        # Set both callbacks on the API client
        api_client.oauth2_token_getter(token_getter_callback)
        api_client.oauth2_token_saver(token_refresh_callback)
        
        # Set the token on the API client (this updates the runtime token)
        api_client.set_oauth2_token(oauth2_token)
        
        return api_client
    
    def get_active_connection(self) -> Optional[XeroConnection]:
        """
        Get active Xero connection and auto-refresh if expired or about to expire
        
        Returns:
            XeroConnection or None if no active connection
        """
        try:
            connection = XeroConnection.objects.filter(is_active=True).first()
            if not connection:
                return None
            
            # Check if token is expired or expires within the next 5 minutes (300 seconds)
            # Refresh proactively to avoid API call failures
            expires_in_seconds = (connection.expires_at - timezone.now()).total_seconds()
            
            if connection.is_token_expired() or expires_in_seconds < 300:
                try:
                    connection = self.refresh_token(connection)
                    print(f"✓ Xero token auto-refreshed for {connection.tenant_name}")
                except Exception as e:
                    print(f"✗ Failed to auto-refresh Xero token: {str(e)}")
                    # Still return the connection - user can manually refresh
                    return connection
            
            return connection
        except Exception as e:
            print(f"Error getting active Xero connection: {e}")
            return None
    
    def _get_stored_token(self) -> Optional[Dict]:
        """
        Retrieve stored OAuth2 token from database as a dict
        Auto-refreshes if expired or about to expire
        """
        try:
            connection = self.get_active_connection()
            if not connection:
                return None
            
            # Return token as a dict (for set_oauth2_token)
            # Calculate expires_in (seconds until expiration)
            expires_at_timestamp = connection.expires_at.timestamp()
            now_timestamp = timezone.now().timestamp()
            expires_in = int(expires_at_timestamp - now_timestamp)
            
            return {
                'access_token': connection.access_token,
                'refresh_token': connection.refresh_token,
                'id_token': connection.id_token,
                'token_type': connection.token_type,
                'expires_at': expires_at_timestamp,
                'expires_in': expires_in,  # Required by xero-python library
                'scope': connection.scopes.split()
            }
        except Exception as e:
            print(f"Error retrieving stored token: {e}")
            return None
    
    def get_authorization_url(self, state: str = None) -> str:
        """
        Generate Xero OAuth2 authorization URL
        """
        self._check_credentials()
        
        # Create API client without token for initial auth
        api_client = ApiClient()
        api_client.configuration.client_id = self.client_id
        api_client.configuration.client_secret = self.client_secret
        
        # Scopes needed for accounting
        scopes = [
            'offline_access',
            'accounting.transactions',
            'accounting.contacts',
            'accounting.settings.read'
        ]
        
        # Generate authorization URL
        auth_url = (
            f"https://login.xero.com/identity/connect/authorize?"
            f"response_type=code&"
            f"client_id={self.client_id}&"
            f"redirect_uri={self.redirect_uri}&"
            f"scope={'+'.join(scopes)}&"
            f"state={state or 'nexus-clinic'}"
        )
        
        return auth_url
    
    def exchange_code_for_token(self, code: str) -> XeroConnection:
        """
        Exchange authorization code for access token
        """
        self._check_credentials()
        start_time = time.time()
        
        try:
            import requests
            import base64
            
            # Prepare Basic Auth header
            auth_string = f"{self.client_id}:{self.client_secret}"
            auth_bytes = auth_string.encode('ascii')
            base64_bytes = base64.b64encode(auth_bytes)
            base64_auth = base64_bytes.decode('ascii')
            
            # Exchange code for token via direct HTTP request
            token_url = "https://identity.xero.com/connect/token"
            headers = {
                "Authorization": f"Basic {base64_auth}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
            data = {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": self.redirect_uri
            }
            
            response = requests.post(token_url, headers=headers, data=data, timeout=30)
            response.raise_for_status()
            token_data = response.json()
            
            # Get tenant/organisation details
            connections_url = "https://api.xero.com/connections"
            headers = {
                "Authorization": f"Bearer {token_data['access_token']}",
                "Content-Type": "application/json"
            }
            
            conn_response = requests.get(connections_url, headers=headers, timeout=30)
            conn_response.raise_for_status()
            tenants = conn_response.json()
            
            if not tenants:
                raise ValueError("No Xero tenants/organisations found")
            
            # Use first tenant (default behavior)
            # Note: Multiple tenants are supported - use switch_tenant() method to change
            tenant = tenants[0]
            
            # Calculate token expiry
            expires_at = timezone.now() + timedelta(seconds=token_data.get('expires_in', 1800))
            
            # Store or update connection
            connection, created = XeroConnection.objects.update_or_create(
                tenant_id=tenant['tenantId'],
                defaults={
                    'tenant_name': tenant.get('tenantName', 'Unknown'),
                    'access_token': token_data['access_token'],
                    'refresh_token': token_data['refresh_token'],
                    'id_token': token_data.get('id_token', ''),
                    'token_type': token_data.get('token_type', 'Bearer'),
                    'expires_at': expires_at,
                    'scopes': token_data.get('scope', ''),
                    'is_active': True,
                }
            )
            
            # Update connected_at only if newly created
            if created:
                connection.connected_at = timezone.now()
                connection.save()
            
            # Log success
            XeroSyncLog.objects.create(
                operation_type='connection_created' if created else 'token_refresh',
                status='success',
                duration_ms=int((time.time() - start_time) * 1000),
                response_data={'tenant_id': tenant['tenantId'], 'tenant_name': tenant.get('tenantName')}
            )
            
            return connection
            
        except Exception as e:
            # Log error
            XeroSyncLog.objects.create(
                operation_type='token_exchange',
                status='failed',
                error_message=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
            raise
    
    def refresh_token(self, connection: XeroConnection) -> XeroConnection:
        """
        Refresh expired access token using direct HTTP request
        """
        self._check_credentials()
        start_time = time.time()
        
        try:
            import requests
            import base64
            
            # Prepare Basic Auth header
            auth_string = f"{self.client_id}:{self.client_secret}"
            auth_bytes = auth_string.encode('ascii')
            base64_bytes = base64.b64encode(auth_bytes)
            base64_auth = base64_bytes.decode('ascii')
            
            # Refresh token via direct HTTP request
            token_url = "https://identity.xero.com/connect/token"
            headers = {
                "Authorization": f"Basic {base64_auth}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
            data = {
                "grant_type": "refresh_token",
                "refresh_token": connection.refresh_token
            }
            
            response = requests.post(token_url, headers=headers, data=data, timeout=30)
            response.raise_for_status()
            token_data = response.json()
            
            # Update connection with new tokens
            expires_at = timezone.now() + timedelta(seconds=token_data.get('expires_in', 1800))
            connection.access_token = token_data['access_token']
            connection.refresh_token = token_data.get('refresh_token', connection.refresh_token)  # Xero may provide new refresh token
            connection.expires_at = expires_at
            connection.last_refresh_at = timezone.now()
            connection.save()
            
            # Log success
            XeroSyncLog.objects.create(
                operation_type='token_refresh',
                status='success',
                duration_ms=int((time.time() - start_time) * 1000)
            )
            
            print(f"✓ Xero token refreshed for {connection.tenant_name}")
            return connection
            
        except Exception as e:
            # Log error
            error_msg = str(e)
            print(f"✗ Failed to refresh Xero token: {error_msg}")
            XeroSyncLog.objects.create(
                operation_type='token_refresh',
                status='failed',
                error_message=error_msg,
                duration_ms=int((time.time() - start_time) * 1000)
            )
            raise
    
    def get_available_tenants(self) -> List[Dict[str, Any]]:
        """
        Get list of all Xero organisations the user has access to
        Returns list of tenants with their details
        
        Added Nov 2025: Allow switching between multiple Xero organisations
        """
        try:
            connection = XeroConnection.objects.filter(is_active=True).first()
            if not connection:
                raise ValueError("No active Xero connection found. Please connect to Xero first.")
            
            import requests
            
            # Get all tenant connections
            connections_url = "https://api.xero.com/connections"
            headers = {
                "Authorization": f"Bearer {connection.access_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(connections_url, headers=headers, timeout=30)
            response.raise_for_status()
            tenants = response.json()
            
            # Format tenant data
            tenant_list = []
            for tenant in tenants:
                tenant_list.append({
                    'tenant_id': tenant['tenantId'],
                    'tenant_name': tenant.get('tenantName', 'Unknown'),
                    'tenant_type': tenant.get('tenantType', 'ORGANISATION'),
                    'is_current': tenant['tenantId'] == connection.tenant_id,
                })
            
            return tenant_list
            
        except Exception as e:
            print(f"Error fetching available tenants: {e}")
            raise
    
    def switch_tenant(self, tenant_id: str) -> XeroConnection:
        """
        Switch active Xero connection to a different tenant/organisation
        
        Args:
            tenant_id: The Xero tenant ID to switch to
        
        Returns:
            Updated XeroConnection object
        
        Added Nov 2025: Support for switching between Demo Company and production
        """
        start_time = time.time()
        
        try:
            # Get current connection
            current_connection = XeroConnection.objects.filter(is_active=True).first()
            if not current_connection:
                raise ValueError("No active Xero connection found")
            
            import requests
            
            # Verify tenant is accessible
            connections_url = "https://api.xero.com/connections"
            headers = {
                "Authorization": f"Bearer {current_connection.access_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(connections_url, headers=headers, timeout=30)
            response.raise_for_status()
            tenants = response.json()
            
            # Find requested tenant
            target_tenant = None
            for tenant in tenants:
                if tenant['tenantId'] == tenant_id:
                    target_tenant = tenant
                    break
            
            if not target_tenant:
                raise ValueError(f"Tenant {tenant_id} not found or not accessible")
            
            # Deactivate all existing connections
            XeroConnection.objects.all().update(is_active=False)
            
            # Create or update connection for new tenant
            connection, created = XeroConnection.objects.update_or_create(
                tenant_id=target_tenant['tenantId'],
                defaults={
                    'tenant_name': target_tenant.get('tenantName', 'Unknown'),
                    'access_token': current_connection.access_token,
                    'refresh_token': current_connection.refresh_token,
                    'id_token': current_connection.id_token,
                    'token_type': current_connection.token_type,
                    'expires_at': current_connection.expires_at,
                    'scopes': current_connection.scopes,
                    'is_active': True,
                }
            )
            
            # Set connected_at if newly created
            if created:
                connection.connected_at = timezone.now()
                connection.save()
            
            # Log success
            XeroSyncLog.objects.create(
                operation_type='tenant_switch',
                status='success',
                response_data={
                    'from_tenant': current_connection.tenant_name,
                    'to_tenant': target_tenant.get('tenantName'),
                    'tenant_id': tenant_id
                },
                duration_ms=int((time.time() - start_time) * 1000)
            )
            
            print(f"✓ Switched Xero tenant to {target_tenant.get('tenantName')}")
            return connection
            
        except Exception as e:
            # Log error
            error_msg = str(e)
            print(f"✗ Failed to switch Xero tenant: {error_msg}")
            XeroSyncLog.objects.create(
                operation_type='tenant_switch',
                status='failed',
                error_message=error_msg,
                duration_ms=int((time.time() - start_time) * 1000)
            )
            raise
    
    def sync_contact(self, patient, force_update: bool = False) -> XeroContactLink:
        """
        Create or update a Xero contact for a patient
        """
        start_time = time.time()
        
        try:
            # Get connection
            connection = XeroConnection.objects.filter(is_active=True).first()
            if not connection:
                raise ValueError("No active Xero connection found")
            
            # Check if contact already exists
            existing_link = XeroContactLink.objects.filter(
                patient=patient,
                connection=connection
            ).first()
            
            if existing_link and not force_update:
                return existing_link
            
            # Get API client
            api_client = self.get_api_client()
            accounting_api = AccountingApi(api_client)
            
            # Build contact object
            contact = Contact(
                name=f"{patient.last_name}, {patient.first_name}",
                first_name=patient.first_name,
                last_name=patient.last_name,
                email_address=patient.get_email() or None,
                contact_number=str(patient.id)[:12],  # Use patient ID as reference
            )
            
            # Add phone if available
            mobile = patient.get_mobile()
            if mobile:
                from xero_python.accounting import Phone
                contact.phones = [
                    Phone(
                        phone_type='MOBILE',
                        phone_number=mobile
                    )
                ]
            
            # Create or update contact
            contacts = Contacts(contacts=[contact])
            
            if existing_link:
                # Update existing contact
                contact.contact_id = existing_link.xero_contact_id
                response = accounting_api.update_contact(
                    xero_tenant_id=connection.tenant_id,
                    contact_id=existing_link.xero_contact_id,
                    contacts=contacts
                )
            else:
                # Create new contact
                response = accounting_api.create_contacts(
                    xero_tenant_id=connection.tenant_id,
                    contacts=contacts
                )
            
            xero_contact = response.contacts[0]
            
            # Create or update link
            link, created = XeroContactLink.objects.update_or_create(
                patient=patient,
                connection=connection,
                defaults={
                    'xero_contact_id': xero_contact.contact_id,
                    'xero_contact_number': xero_contact.contact_number or '',
                    'xero_contact_name': xero_contact.name,
                    'is_active': True,
                    'last_synced_at': timezone.now()
                }
            )
            
            # Log success
            XeroSyncLog.objects.create(
                operation_type='contact_create' if created else 'contact_update',
                status='success',
                local_entity_type='patient',
                local_entity_id=patient.id,
                xero_entity_id=xero_contact.contact_id,
                duration_ms=int((time.time() - start_time) * 1000)
            )
            
            return link
            
        except Exception as e:
            # Log error
            XeroSyncLog.objects.create(
                operation_type='contact_sync',
                status='failed',
                local_entity_type='patient',
                local_entity_id=patient.id,
                error_message=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
            raise
    
    def sync_company_contact(self, company, force_update: bool = False) -> XeroContactLink:
        """
        Create or update a Xero contact for a company
        Added Nov 2025: Support for companies as invoice contacts
        """
        start_time = time.time()
        
        try:
            # Get connection
            connection = XeroConnection.objects.filter(is_active=True).first()
            if not connection:
                raise ValueError("No active Xero connection found")
            
            # Check if contact already exists
            existing_link = XeroContactLink.objects.filter(
                company=company,
                connection=connection
            ).first()
            
            if existing_link and not force_update:
                return existing_link
            
            # Get API client
            api_client = self.get_api_client()
            accounting_api = AccountingApi(api_client)
            
            # Build contact object
            contact = Contact(
                name=company.name,
                tax_number=company.abn if hasattr(company, 'abn') and company.abn else None,
                is_customer=True,
                contact_number=str(company.id)[:12],  # Use company ID as reference
            )
            
            # Add phones/emails from contact_json
            if company.contact_json:
                from xero_python.accounting import Phone
                phones = []
                emails = []
                
                # Extract phones
                for phone_item in company.contact_json.get('phones', []):
                    phone_type = phone_item.get('type', '').upper()
                    if phone_type == 'MOBILE':
                        phone_type = 'MOBILE'
                    elif phone_type == 'FAX':
                        phone_type = 'FAX'
                    else:
                        phone_type = 'DEFAULT'
                    
                    phones.append(Phone(
                        phone_type=phone_type,
                        phone_number=phone_item.get('number', '')
                    ))
                
                # Extract emails
                for email_item in company.contact_json.get('emails', []):
                    email_addr = email_item.get('address', '').strip()
                    if email_addr:
                        # Split by comma if multiple emails in one field
                        email_addresses = [e.strip() for e in email_addr.split(',') if e.strip()]
                        emails.extend(email_addresses)
                
                if phones:
                    contact.phones = phones
                if emails:
                    # Use first valid email only (Xero accepts single email)
                    contact.email_address = emails[0]
            
            # Add address from address_json
            if company.address_json:
                from xero_python.accounting import Address
                addr = company.address_json
                contact.addresses = [Address(
                    address_type='STREET',
                    address_line1=addr.get('street', ''),
                    city=addr.get('suburb', ''),
                    region=addr.get('state', ''),
                    postal_code=addr.get('postcode', ''),
                    country='Australia'
                )]
            
            # Create or update contact
            contacts = Contacts(contacts=[contact])
            
            if existing_link:
                # Update existing contact
                contact.contact_id = existing_link.xero_contact_id
                response = accounting_api.update_contact(
                    xero_tenant_id=connection.tenant_id,
                    contact_id=existing_link.xero_contact_id,
                    contacts=contacts
                )
            else:
                # Create new contact
                response = accounting_api.create_contacts(
                    xero_tenant_id=connection.tenant_id,
                    contacts=contacts
                )
            
            xero_contact = response.contacts[0]
            
            # Create or update link
            link, created = XeroContactLink.objects.update_or_create(
                company=company,
                connection=connection,
                defaults={
                    'xero_contact_id': xero_contact.contact_id,
                    'xero_contact_number': xero_contact.contact_number or '',
                    'xero_contact_name': xero_contact.name,
                    'is_active': True,
                    'last_synced_at': timezone.now()
                }
            )
            
            # Log success
            XeroSyncLog.objects.create(
                operation_type='contact_create' if created else 'contact_update',
                status='success',
                local_entity_type='company',
                local_entity_id=company.id,
                xero_entity_id=xero_contact.contact_id,
                duration_ms=int((time.time() - start_time) * 1000)
            )
            
            return link
            
        except Exception as e:
            # Log error
            XeroSyncLog.objects.create(
                operation_type='contact_sync',
                status='failed',
                local_entity_type='company',
                local_entity_id=company.id,
                error_message=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
            raise
    
    def create_invoice(
        self,
        appointment=None,
        patient=None,
        company=None,
        contact_type='patient',
        line_items: List[Dict[str, Any]] = None,
        tracking_category: Optional[Dict[str, str]] = None,
        billing_notes: str = '',
        invoice_date=None,
        due_date=None,
        send_immediately: bool = False,
        clinician=None
    ) -> XeroInvoiceLink:
        """
        Create an invoice in Xero
        Updated Nov 2025: Supports standalone invoices without appointments
        Updated Nov 2025: Added send_immediately option to bypass DRAFT
        Updated Nov 2025: Added clinician parameter for signature attribution
        
        Args:
            appointment: Optional appointment link
            patient: Required if no appointment (direct patient invoice)
            company: Optional company for billing
            contact_type: 'patient' or 'company' - who is the primary Xero contact
            line_items: List of invoice line items
            tracking_category: Optional tracking category
            billing_notes: Additional notes for reference field
            invoice_date: Invoice date (defaults to today)
            due_date: Due date (defaults to 7 days from invoice date)
            send_immediately: If True, creates as AUTHORISED; if False, creates as DRAFT
            clinician: Clinician who created/sent this invoice (for email signature)
            contact_type: 'patient' or 'company' (who is primary contact)
            line_items: List of line item dicts
            tracking_category: Optional tracking category
            billing_notes: Notes to appear on invoice
            invoice_date: Optional invoice date (default: today)
            due_date: Optional due date (default: 14 days from now)
        
        line_items format:
        [
            {
                'description': 'Initial Assessment',
                'quantity': 1,
                'unit_amount': 150.00,
                'account_code': '200',
                'tax_type': 'OUTPUT2',  # GST on Income
                'item_code': 'INITIAL_ASSESS'  # Optional
            }
        ]
        """
        start_time = time.time()
        
        try:
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            
            if not connection:
                raise ValueError("No active Xero connection found. Please connect to Xero first in Settings.")
            
            accounting_api = AccountingApi(api_client)
            
            # Determine patient and company from appointment or direct parameters
            if appointment:
                patient = appointment.patient
                company = appointment.billing_company if hasattr(appointment, 'billing_company') else company
                contact_type = appointment.invoice_contact_type if hasattr(appointment, 'invoice_contact_type') else contact_type
                billing_notes = appointment.billing_notes if hasattr(appointment, 'billing_notes') else billing_notes
            elif not patient:
                raise ValueError("Either appointment or patient must be provided")
            
            # ═══════════════════════════════════════════════════════════════════
            # DYNAMIC CONTACT SELECTION (Patient or Company)
            # ═══════════════════════════════════════════════════════════════════
            
            if contact_type == 'company' and company:
                # COMPANY AS PRIMARY CONTACT
                primary_contact_link = self.sync_company_contact(company)
                
                # Patient name only in reference (clean, no MRN/DOB)
                patient_name = f"{patient.first_name} {patient.last_name}"
                reference = patient_name
                
                # Add patient name to line item descriptions
                enhanced_line_items = []
                for item in line_items:
                    item_copy = item.copy()
                    item_copy['description'] = f"{item['description']} (Patient: {patient_name})"
                    enhanced_line_items.append(item_copy)
                line_items = enhanced_line_items
                
            else:
                # PATIENT AS PRIMARY CONTACT (default)
                primary_contact_link = self.sync_contact(patient)
                
                # Generate smart reference based on patient's funding source
                reference = generate_smart_reference(patient, custom_reference=billing_notes if billing_notes else None)
            
            # Build line items
            xero_line_items = []
            for item in line_items:
                line_item = LineItem(
                    description=item['description'],
                    quantity=item.get('quantity', 1),
                    unit_amount=float(item['unit_amount']),
                    account_code=item.get('account_code', '200'),
                    tax_type=item.get('tax_type', 'EXEMPTOUTPUT'),
                    discount_rate=float(item.get('discount', 0)),
                )
                
                if item.get('item_code'):
                    line_item.item_code = item['item_code']
                
                xero_line_items.append(line_item)
            
            # Build invoice
            from datetime import timedelta
            from xero_python.accounting import Contact as XeroContact, CurrencyCode
            
            # Determine invoice date and due date
            if invoice_date is None:
                invoice_date = timezone.now().date()
            if due_date is None:
                due_date = invoice_date + timedelta(days=14)
            
            invoice = Invoice(
                type='ACCREC',  # Accounts Receivable
                contact=XeroContact(contact_id=primary_contact_link.xero_contact_id),
                line_items=xero_line_items,
                date=invoice_date,
                due_date=due_date,
                reference=reference,
                status='AUTHORISED' if send_immediately else 'DRAFT',
                currency_code=CurrencyCode.AUD
            )
            
            # Add tracking category if provided
            if tracking_category:
                from xero_python.accounting import LineItemTracking, TrackingCategory as XeroTrackingCategory
                tracking = LineItemTracking(
                    tracking_category_id=tracking_category['category_id'],
                    tracking_option_id=tracking_category['option_id']
                )
                for line_item in xero_line_items:
                    line_item.tracking = [tracking]
            
            # Create invoice
            invoices = Invoices(invoices=[invoice])
            response = accounting_api.create_invoices(
                xero_tenant_id=connection.tenant_id,
                invoices=invoices
            )
            
            xero_invoice = response.invoices[0]
            
            # Create link with patient, company, and clinician
            link = XeroInvoiceLink.objects.create(
                appointment=appointment,
                patient=patient,
                company=company,
                clinician=clinician,
                xero_invoice_id=xero_invoice.invoice_id,
                xero_invoice_number=xero_invoice.invoice_number or '',
                status=xero_invoice.status,
                total=float(xero_invoice.total) if xero_invoice.total else 0,
                subtotal=float(xero_invoice.sub_total) if xero_invoice.sub_total else 0,
                total_tax=float(xero_invoice.total_tax) if xero_invoice.total_tax else 0,
                amount_due=float(xero_invoice.amount_due) if xero_invoice.amount_due else 0,
                amount_paid=float(xero_invoice.amount_paid) if xero_invoice.amount_paid else 0,
                invoice_date=xero_invoice.date,
                due_date=xero_invoice.due_date,
                last_synced_at=timezone.now()
            )
            
            # Log success
            entity_type = 'appointment' if appointment else 'patient'
            entity_id = appointment.id if appointment else patient.id
            XeroSyncLog.objects.create(
                operation_type='invoice_create',
                status='success',
                local_entity_type=entity_type,
                local_entity_id=entity_id,
                xero_entity_id=xero_invoice.invoice_id,
                duration_ms=int((time.time() - start_time) * 1000),
                request_data={'line_items': line_items, 'contact_type': contact_type}
            )
            
            return link
            
        except AccountingBadRequestException as e:
            # Log validation error
            entity_type = 'appointment' if appointment else 'patient'
            entity_id = appointment.id if appointment else (patient.id if patient else None)
            XeroSyncLog.objects.create(
                operation_type='invoice_create',
                status='failed',
                local_entity_type=entity_type,
                local_entity_id=entity_id,
                error_message=f"Validation error: {e.reason}",
                duration_ms=int((time.time() - start_time) * 1000),
                request_data={'line_items': line_items}
            )
            raise
            
        except Exception as e:
            # Log general error
            entity_type = 'appointment' if appointment else 'patient'
            entity_id = appointment.id if appointment else (patient.id if patient else None)
            XeroSyncLog.objects.create(
                operation_type='invoice_create',
                status='failed',
                local_entity_type=entity_type,
                local_entity_id=entity_id,
                error_message=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
            raise
    
    def get_invoice(self, invoice_id: str):
        """
        Fetch invoice details from Xero by invoice ID
        
        Args:
            invoice_id: Xero invoice GUID
        
        Returns:
            Xero Invoice object with line items
        """
        try:
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            
            if not connection:
                logger.warning("No active Xero connection found")
                return None
            
            accounting_api = AccountingApi(api_client)
            
            # Fetch invoice from Xero
            response = accounting_api.get_invoice(
                xero_tenant_id=connection.tenant_id,
                invoice_id=invoice_id
            )
            
            if response and response.invoices:
                return response.invoices[0]
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching invoice {invoice_id} from Xero: {e}")
            return None
    
    def get_quote(self, quote_id: str):
        """
        Fetch quote details from Xero by quote ID
        
        Args:
            quote_id: Xero quote GUID
        
        Returns:
            Xero Quote object with line items
        """
        try:
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            
            if not connection:
                logger.warning("No active Xero connection found")
                return None
            
            accounting_api = AccountingApi(api_client)
            
            # Fetch quote from Xero
            response = accounting_api.get_quote(
                xero_tenant_id=connection.tenant_id,
                quote_id=quote_id
            )
            
            if response and response.quotes:
                return response.quotes[0]
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching quote {quote_id} from Xero: {e}")
            return None
    
    def sync_invoice_status(self, invoice_link: XeroInvoiceLink) -> XeroInvoiceLink:
        """
        Fetch latest invoice status and payment details from Xero
        """
        start_time = time.time()
        
        try:
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            accounting_api = AccountingApi(api_client)
            
            # Fetch invoice
            response = accounting_api.get_invoice(
                xero_tenant_id=connection.tenant_id,
                invoice_id=invoice_link.xero_invoice_id
            )
            
            xero_invoice = response.invoices[0]
            
            # Update link
            invoice_link.status = xero_invoice.status
            invoice_link.total = float(xero_invoice.total) if xero_invoice.total else 0
            invoice_link.amount_due = float(xero_invoice.amount_due) if xero_invoice.amount_due else 0
            invoice_link.amount_paid = float(xero_invoice.amount_paid) if xero_invoice.amount_paid else 0
            
            if xero_invoice.fully_paid_on_date:
                invoice_link.fully_paid_on_date = xero_invoice.fully_paid_on_date
            
            invoice_link.last_synced_at = timezone.now()
            invoice_link.save()
            
            # Log success
            XeroSyncLog.objects.create(
                operation_type='payment_sync',
                status='success',
                xero_entity_id=invoice_link.xero_invoice_id,
                duration_ms=int((time.time() - start_time) * 1000),
                response_data={
                    'status': xero_invoice.status,
                    'amount_paid': float(xero_invoice.amount_paid) if xero_invoice.amount_paid else 0
                }
            )
            
            return invoice_link
            
        except Exception as e:
            # Log error
            XeroSyncLog.objects.create(
                operation_type='payment_sync',
                status='failed',
                xero_entity_id=invoice_link.xero_invoice_id,
                error_message=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
            raise
    
    def update_invoice(
        self,
        invoice_link: XeroInvoiceLink,
        line_items: List[Dict[str, Any]] = None,
        invoice_date=None,
        due_date=None,
        billing_notes: str = None
    ) -> XeroInvoiceLink:
        """
        Update a draft invoice in Xero
        Added Nov 2025: Edit invoice details within Nexus
        
        Args:
            invoice_link: XeroInvoiceLink object to update
            line_items: Updated list of line items (optional)
            invoice_date: Updated invoice date (optional)
            due_date: Updated due date (optional)
            billing_notes: Updated billing notes (optional)
        
        Returns:
            Updated XeroInvoiceLink object
        """
        start_time = time.time()
        
        try:
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            
            if not connection:
                raise ValueError("No active Xero connection found. Please connect to Xero first in Settings.")
            
            accounting_api = AccountingApi(api_client)
            
            # Fetch the current invoice from Xero
            response = accounting_api.get_invoice(
                xero_tenant_id=connection.tenant_id,
                invoice_id=invoice_link.xero_invoice_id
            )
            xero_invoice = response.invoices[0]
            
            # Validate invoice status
            if xero_invoice.status != 'DRAFT':
                raise ValueError(f"Cannot update invoice in {xero_invoice.status} status. Only DRAFT invoices can be updated.")
            
            # Update fields
            if line_items is not None:
                # Convert line items to Xero format
                xero_line_items = []
                for item in line_items:
                    line_item = LineItem(
                        description=item.get('description', ''),
                        quantity=item.get('quantity', 1),
                        unit_amount=item.get('unit_amount', 0),
                        account_code=item.get('account_code', '200'),
                        tax_type=item.get('tax_type', 'EXEMPTINPUT'),
                        discount_rate=float(item.get('discount', 0)),
                    )
                    if item.get('item_code'):
                        line_item.item_code = item.get('item_code')
                    xero_line_items.append(line_item)
                
                xero_invoice.line_items = xero_line_items
            
            if invoice_date is not None:
                xero_invoice.date = invoice_date
            
            if due_date is not None:
                xero_invoice.due_date = due_date
            
            if billing_notes is not None:
                xero_invoice.reference = billing_notes
            
            # Update invoice in Xero
            invoices = Invoices(invoices=[xero_invoice])
            update_response = accounting_api.update_invoice(
                xero_tenant_id=connection.tenant_id,
                invoice_id=invoice_link.xero_invoice_id,
                invoices=invoices
            )
            
            updated_xero_invoice = update_response.invoices[0]
            
            # Update local database
            invoice_link.status = updated_xero_invoice.status
            invoice_link.total = float(updated_xero_invoice.total) if updated_xero_invoice.total else 0
            invoice_link.subtotal = float(updated_xero_invoice.sub_total) if updated_xero_invoice.sub_total else 0
            invoice_link.total_tax = float(updated_xero_invoice.total_tax) if updated_xero_invoice.total_tax else 0
            invoice_link.amount_due = float(updated_xero_invoice.amount_due) if updated_xero_invoice.amount_due else 0
            invoice_link.amount_paid = float(updated_xero_invoice.amount_paid) if updated_xero_invoice.amount_paid else 0
            
            if updated_xero_invoice.date:
                invoice_link.invoice_date = updated_xero_invoice.date
            if updated_xero_invoice.due_date:
                invoice_link.due_date = updated_xero_invoice.due_date
            
            invoice_link.last_synced_at = timezone.now()
            invoice_link.save()
            
            # Log success
            XeroSyncLog.objects.create(
                operation_type='invoice_update',
                status='success',
                local_entity_type='invoice',
                local_entity_id=str(invoice_link.id),
                xero_entity_id=invoice_link.xero_invoice_id,
                duration_ms=int((time.time() - start_time) * 1000),
                response_data={
                    'invoice_number': updated_xero_invoice.invoice_number,
                    'total': float(updated_xero_invoice.total) if updated_xero_invoice.total else 0
                }
            )
            
            return invoice_link
            
        except Exception as e:
            # Log error
            XeroSyncLog.objects.create(
                operation_type='invoice_update',
                status='failed',
                local_entity_type='invoice',
                local_entity_id=str(invoice_link.id),
                xero_entity_id=invoice_link.xero_invoice_id,
                error_message=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
            raise
    
    def delete_invoice(self, invoice_link: XeroInvoiceLink):
        """
        Delete (void) a draft invoice in Xero
        Added Nov 2025: Delete invoice from Nexus
        
        Args:
            invoice_link: XeroInvoiceLink object to delete
        """
        start_time = time.time()
        
        try:
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            
            if not connection:
                raise ValueError("No active Xero connection found. Please connect to Xero first in Settings.")
            
            accounting_api = AccountingApi(api_client)
            
            # For DRAFT invoices, we need to update status to DELETED
            # Fetch the current invoice
            response = accounting_api.get_invoice(
                xero_tenant_id=connection.tenant_id,
                invoice_id=invoice_link.xero_invoice_id
            )
            xero_invoice = response.invoices[0]
            
            # Update status to DELETED
            xero_invoice.status = 'DELETED'
            
            # Update invoice in Xero
            invoices = Invoices(invoices=[xero_invoice])
            accounting_api.update_invoice(
                xero_tenant_id=connection.tenant_id,
                invoice_id=invoice_link.xero_invoice_id,
                invoices=invoices
            )
            
            # Delete from local database
            invoice_link.delete()
            
            # Log success
            XeroSyncLog.objects.create(
                operation_type='invoice_delete',
                status='success',
                local_entity_type='invoice',
                xero_entity_id=invoice_link.xero_invoice_id,
                duration_ms=int((time.time() - start_time) * 1000),
                response_data={
                    'invoice_number': invoice_link.xero_invoice_number,
                }
            )
            
        except Exception as e:
            # Log error
            XeroSyncLog.objects.create(
                operation_type='invoice_delete',
                status='failed',
                local_entity_type='invoice',
                xero_entity_id=invoice_link.xero_invoice_id,
                error_message=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
            raise
    
    def authorize_invoice(self, invoice_link: XeroInvoiceLink) -> XeroInvoiceLink:
        """
        Authorize a draft invoice in Xero (change status from DRAFT to AUTHORISED)
        Added Nov 2025: Send draft invoices to Xero
        
        Args:
            invoice_link: XeroInvoiceLink object to authorize
        
        Returns:
            Updated XeroInvoiceLink object with AUTHORISED status
        """
        start_time = time.time()
        logger.info(f"🔧 [authorize_invoice] Starting authorization for invoice {invoice_link.xero_invoice_number}")
        
        try:
            # Get API client and connection
            logger.info(f"🔌 [authorize_invoice] Getting API client and connection...")
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            
            if not connection:
                logger.error(f"❌ [authorize_invoice] No active Xero connection found")
                raise ValueError("No active Xero connection found. Please connect to Xero first in Settings.")
            
            logger.info(f"✅ [authorize_invoice] Connected to tenant: {connection.tenant_id}")
            accounting_api = AccountingApi(api_client)
            
            # Fetch the current invoice from Xero
            logger.info(f"📥 [authorize_invoice] Fetching invoice from Xero: {invoice_link.xero_invoice_id}")
            response = accounting_api.get_invoice(
                xero_tenant_id=connection.tenant_id,
                invoice_id=invoice_link.xero_invoice_id
            )
            xero_invoice = response.invoices[0]
            logger.info(f"✅ [authorize_invoice] Fetched invoice - current status in Xero: {xero_invoice.status}")
            
            # Validate invoice status
            if xero_invoice.status != 'DRAFT':
                logger.error(f"❌ [authorize_invoice] Invalid status: {xero_invoice.status}")
                raise ValueError(f"Cannot authorize invoice in {xero_invoice.status} status. Only DRAFT invoices can be authorized.")
            
            # Change status to AUTHORISED
            logger.info(f"🔄 [authorize_invoice] Changing status from DRAFT to AUTHORISED...")
            xero_invoice.status = 'AUTHORISED'
            
            # Update invoice in Xero
            logger.info(f"📤 [authorize_invoice] Sending update to Xero...")
            invoices = Invoices(invoices=[xero_invoice])
            update_response = accounting_api.update_invoice(
                xero_tenant_id=connection.tenant_id,
                invoice_id=invoice_link.xero_invoice_id,
                invoices=invoices
            )
            
            updated_xero_invoice = update_response.invoices[0]
            logger.info(f"✅ [authorize_invoice] Invoice updated in Xero - new status: {updated_xero_invoice.status}")
            
            # Update local database
            logger.info(f"💾 [authorize_invoice] Updating local database...")
            invoice_link.status = updated_xero_invoice.status
            invoice_link.total = float(updated_xero_invoice.total) if updated_xero_invoice.total else 0
            invoice_link.subtotal = float(updated_xero_invoice.sub_total) if updated_xero_invoice.sub_total else 0
            invoice_link.total_tax = float(updated_xero_invoice.total_tax) if updated_xero_invoice.total_tax else 0
            invoice_link.amount_due = float(updated_xero_invoice.amount_due) if updated_xero_invoice.amount_due else 0
            invoice_link.amount_paid = float(updated_xero_invoice.amount_paid) if updated_xero_invoice.amount_paid else 0
            invoice_link.last_synced_at = timezone.now()
            invoice_link.save()
            logger.info(f"✅ [authorize_invoice] Local database updated")
            
            # Log success
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"⏱️ [authorize_invoice] Operation completed in {duration_ms}ms")
            XeroSyncLog.objects.create(
                operation_type='invoice_authorize',
                status='success',
                local_entity_type='invoice',
                local_entity_id=str(invoice_link.id),
                xero_entity_id=invoice_link.xero_invoice_id,
                duration_ms=duration_ms,
                response_data={
                    'invoice_number': updated_xero_invoice.invoice_number,
                    'status': updated_xero_invoice.status,
                    'total': float(updated_xero_invoice.total) if updated_xero_invoice.total else 0
                }
            )
            
            return invoice_link
            
        except Exception as e:
            # Log error
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [authorize_invoice] Error after {duration_ms}ms: {str(e)}", exc_info=True)
            XeroSyncLog.objects.create(
                operation_type='invoice_authorize',
                status='failed',
                local_entity_type='invoice',
                local_entity_id=str(invoice_link.id),
                xero_entity_id=invoice_link.xero_invoice_id,
                error_message=str(e),
                duration_ms=duration_ms
            )
            raise
    
    def authorize_quote(self, quote_link) -> 'XeroQuoteLink':
        """
        Authorize a draft quote in Xero (change status from DRAFT to SENT)
        Added Nov 2025: Allow sending draft quotes to Xero
        
        Args:
            quote_link: XeroQuoteLink object to authorize
        
        Returns:
            Updated XeroQuoteLink object with SENT status
        """
        from .models import XeroQuoteLink  # Import here to avoid circular import
        
        start_time = time.time()
        logger.info(f"🔧 [authorize_quote] Starting authorization for quote {quote_link.xero_quote_number}")
        
        try:
            # Get API client and connection
            logger.info(f"🔌 [authorize_quote] Getting API client and connection...")
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            
            if not connection:
                logger.error(f"❌ [authorize_quote] No active Xero connection found")
                raise ValueError("No active Xero connection found. Please connect to Xero first in Settings.")
            
            logger.info(f"✅ [authorize_quote] Connected to tenant: {connection.tenant_id}")
            accounting_api = AccountingApi(api_client)
            
            # Fetch the current quote from Xero
            logger.info(f"📥 [authorize_quote] Fetching quote from Xero: {quote_link.xero_quote_id}")
            response = accounting_api.get_quote(
                xero_tenant_id=connection.tenant_id,
                quote_id=quote_link.xero_quote_id
            )
            xero_quote = response.quotes[0]
            logger.info(f"✅ [authorize_quote] Fetched quote - current status in Xero: {xero_quote.status}")
            
            # Validate quote status
            if str(xero_quote.status).replace('QuoteStatusCodes.', '') != 'DRAFT':
                logger.error(f"❌ [authorize_quote] Invalid status: {xero_quote.status}")
                raise ValueError(f"Cannot authorize quote in {xero_quote.status} status. Only DRAFT quotes can be authorized.")
            
            # Change status to SENT
            logger.info(f"🔄 [authorize_quote] Changing status from DRAFT to SENT...")
            from xero_python.accounting import QuoteStatusCodes, Quotes
            xero_quote.status = QuoteStatusCodes.SENT
            
            # Update quote in Xero
            logger.info(f"📤 [authorize_quote] Sending update to Xero...")
            quotes = Quotes(quotes=[xero_quote])
            update_response = accounting_api.update_quote(
                xero_tenant_id=connection.tenant_id,
                quote_id=quote_link.xero_quote_id,
                quotes=quotes
            )
            
            updated_xero_quote = update_response.quotes[0]
            logger.info(f"✅ [authorize_quote] Quote updated in Xero - new status: {updated_xero_quote.status}")
            
            # Update local database
            logger.info(f"💾 [authorize_quote] Updating local database...")
            quote_link.status = updated_xero_quote.status.value if hasattr(updated_xero_quote.status, 'value') else str(updated_xero_quote.status).replace('QuoteStatusCodes.', '')
            quote_link.total = float(updated_xero_quote.total) if updated_xero_quote.total else 0
            quote_link.subtotal = float(updated_xero_quote.sub_total) if updated_xero_quote.sub_total else 0
            quote_link.total_tax = float(updated_xero_quote.total_tax) if updated_xero_quote.total_tax else 0
            quote_link.last_synced_at = timezone.now()
            quote_link.save()
            logger.info(f"✅ [authorize_quote] Local database updated")
            
            # Log success
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"⏱️ [authorize_quote] Operation completed in {duration_ms}ms")
            XeroSyncLog.objects.create(
                operation_type='quote_authorize',
                status='success',
                local_entity_type='quote',
                local_entity_id=str(quote_link.id),
                xero_entity_id=quote_link.xero_quote_id,
                duration_ms=duration_ms,
                response_data={
                    'quote_number': updated_xero_quote.quote_number,
                    'status': str(updated_xero_quote.status),
                    'total': float(updated_xero_quote.total) if updated_xero_quote.total else 0
                }
            )
            
            return quote_link
            
        except Exception as e:
            # Log error
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [authorize_quote] Error after {duration_ms}ms: {str(e)}", exc_info=True)
            XeroSyncLog.objects.create(
                operation_type='quote_authorize',
                status='failed',
                local_entity_type='quote',
                local_entity_id=str(quote_link.id),
                xero_entity_id=quote_link.xero_quote_id,
                error_message=str(e),
                duration_ms=duration_ms
            )
            raise
    
    def create_quote(
        self,
        patient,
        company,
        line_items: List[Dict[str, Any]],
        expiry_date,
        appointment=None,
        quote_date=None,
        billing_notes: str = None,
        send_immediately: bool = False
    ) -> XeroQuoteLink:
        """
        Create a quote in Xero
        Added Nov 2025: Support for quotes (estimates) before service delivery
        Updated Nov 2025: Added send_immediately option to bypass DRAFT
        
        Args:
            patient: Patient object (service recipient)
            company: Company object (optional - who pays)
            line_items: List of service line items
            expiry_date: Quote expiry date (datetime.date)
            appointment: Optional appointment to link to
            quote_date: Quote date (datetime.date, defaults to today)
            billing_notes: Optional billing notes/terms
            send_immediately: If True, creates as SENT; if False, creates as DRAFT
            billing_notes: Terms and conditions for the quote
        
        Returns:
            XeroQuoteLink object
        """
        start_time = time.time()
        
        try:
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            accounting_api = AccountingApi(api_client)
            
            # Determine primary contact (company or patient)
            if company:
                primary_contact_link = self.sync_company_contact(company)
                if patient:
                    patient_name = f"{patient.first_name} {patient.last_name}"
                    reference = f"Service for: {patient_name}"
                    reference += f"\nMRN: {patient.mrn}"
                    if patient.dob:
                        reference += f"\nDOB: {patient.dob.strftime('%d/%m/%Y')}"
                else:
                    reference = f"Quote for: {company.name}"
            else:
                # Patient is primary contact
                if not patient:
                    raise ValueError("Either patient or company must be provided")
                primary_contact_link = self.sync_contact(patient)
                
                # Generate smart reference based on patient's funding source
                reference = generate_smart_reference(patient, custom_reference=billing_notes if billing_notes else None)
                # Change "Invoice" to "Quote" in the reference
                if reference.startswith("Invoice for"):
                    reference = reference.replace("Invoice for", "Quote for")
            
            # Build line items
            xero_line_items = []
            for item in line_items:
                line_item = LineItem(
                    description=item['description'],
                    quantity=item.get('quantity', 1),
                    unit_amount=float(item['unit_amount']),
                    account_code=item.get('account_code', '200'),
                    tax_type=item.get('tax_type', 'EXEMPTOUTPUT'),
                    discount_rate=float(item.get('discount', 0)),
                )
                xero_line_items.append(line_item)
            
            # Build quote
            from xero_python.accounting import Contact as XeroContact
            quote = Quote(
                contact=XeroContact(contact_id=primary_contact_link.xero_contact_id),
                date=quote_date if quote_date else timezone.now().date(),
                expiry_date=expiry_date,
                reference=reference,
                line_items=xero_line_items,
                status=QuoteStatusCodes.SENT if send_immediately else QuoteStatusCodes.DRAFT,
                terms=billing_notes if billing_notes else "Quote valid until expiry date. Services subject to availability.",
                title="Service Quote"
            )
            
            # Create quote in Xero
            quotes = Quotes(quotes=[quote])
            response = accounting_api.create_quotes(
                xero_tenant_id=connection.tenant_id,
                quotes=quotes
            )
            
            created_quote = response.quotes[0]
            
            # Create link record
            quote_link = XeroQuoteLink.objects.create(
                appointment=appointment,
                patient=patient,
                company=company,
                xero_quote_id=created_quote.quote_id,
                xero_quote_number=created_quote.quote_number or '',
                status=created_quote.status.value if hasattr(created_quote.status, 'value') else str(created_quote.status),
                total=float(created_quote.total) if created_quote.total else 0,
                subtotal=float(created_quote.sub_total) if created_quote.sub_total else 0,
                total_tax=float(created_quote.total_tax) if created_quote.total_tax else 0,
                quote_date=created_quote.date,
                expiry_date=created_quote.expiry_date,
                last_synced_at=timezone.now()
            )
            
            # Log success
            XeroSyncLog.objects.create(
                operation_type='quote_create',
                status='success',
                local_entity_type='patient' if patient else 'company',
                local_entity_id=str(patient.id) if patient else str(company.id),
                xero_entity_id=created_quote.quote_id,
                duration_ms=int((time.time() - start_time) * 1000),
                request_data={'line_items': line_items}
            )
            
            return quote_link
            
        except Exception as e:
            # Log error
            XeroSyncLog.objects.create(
                operation_type='quote_create',
                status='failed',
                local_entity_type='patient' if patient else 'company',
                local_entity_id=str(patient.id) if patient else (str(company.id) if company else None),
                error_message=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
            raise
    
    def convert_quote_to_invoice(self, quote_link: XeroQuoteLink) -> XeroInvoiceLink:
        """
        Convert an accepted quote to an invoice
        Added Nov 2025: One-click quote conversion
        
        Args:
            quote_link: XeroQuoteLink object to convert
        
        Returns:
            XeroInvoiceLink object (new invoice)
        """
        start_time = time.time()
        logger.info(f"🔧 [convert_quote_to_invoice] Starting conversion for quote {quote_link.xero_quote_number}")
        
        try:
            # Validate quote can be converted
            logger.info(f"🔍 [convert_quote_to_invoice] Validating quote status: {quote_link.status}")
            if not quote_link.can_convert_to_invoice():
                logger.error(f"❌ [convert_quote_to_invoice] Quote cannot be converted - invalid status: {quote_link.status}")
                raise ValueError(f"Quote {quote_link.xero_quote_number} cannot be converted (status: {quote_link.status})")
            
            # Get API client and connection
            logger.info(f"🔌 [convert_quote_to_invoice] Getting API client and connection...")
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            logger.info(f"✅ [convert_quote_to_invoice] Connected to tenant: {connection.tenant_id}")
            accounting_api = AccountingApi(api_client)
            
            # Fetch the original quote from Xero
            logger.info(f"📥 [convert_quote_to_invoice] Fetching quote from Xero: {quote_link.xero_quote_id}")
            quote_response = accounting_api.get_quote(
                xero_tenant_id=connection.tenant_id,
                quote_id=quote_link.xero_quote_id
            )
            original_quote = quote_response.quotes[0]
            logger.info(f"✅ [convert_quote_to_invoice] Fetched quote - {len(original_quote.line_items) if original_quote.line_items else 0} line items")
            
            # Create invoice with same details
            logger.info(f"📝 [convert_quote_to_invoice] Creating new invoice from quote...")
            from xero_python.accounting import CurrencyCode
            invoice_date = timezone.now().date()
            due_date = invoice_date + timedelta(days=14)  # Default 14 days payment terms
            
            invoice = Invoice(
                type='ACCREC',
                contact=original_quote.contact,  # Same contact
                line_items=original_quote.line_items,  # Same line items
                reference=f"Quote #{original_quote.quote_number}",
                date=invoice_date,
                due_date=due_date,  # Required for AUTHORISED invoices
                status='AUTHORISED',  # Create as AUTHORISED instead of DRAFT
                currency_code=CurrencyCode.AUD
            )
            logger.info(f"✅ [convert_quote_to_invoice] Invoice object created - status: AUTHORISED, due: {due_date}")
            
            # Create invoice in Xero
            logger.info(f"📤 [convert_quote_to_invoice] Sending new invoice to Xero...")
            invoices = Invoices(invoices=[invoice])
            response = accounting_api.create_invoices(
                xero_tenant_id=connection.tenant_id,
                invoices=invoices
            )
            
            created_invoice = response.invoices[0]
            logger.info(f"✅ [convert_quote_to_invoice] Invoice created in Xero: {created_invoice.invoice_number} (status: {created_invoice.status})")
            
            # Create invoice link
            logger.info(f"💾 [convert_quote_to_invoice] Creating invoice link in database...")
            invoice_link = XeroInvoiceLink.objects.create(
                appointment=quote_link.appointment,  # Link to same appointment if any
                patient=quote_link.patient,  # Copy patient from quote
                company=quote_link.company,  # Copy company from quote
                xero_invoice_id=created_invoice.invoice_id,
                xero_invoice_number=created_invoice.invoice_number or '',
                status=created_invoice.status,
                total=float(created_invoice.total) if created_invoice.total else 0,
                subtotal=float(created_invoice.sub_total) if created_invoice.sub_total else 0,
                total_tax=float(created_invoice.total_tax) if created_invoice.total_tax else 0,
                amount_due=float(created_invoice.amount_due) if created_invoice.amount_due else 0,
                amount_paid=float(created_invoice.amount_paid) if created_invoice.amount_paid else 0,
                invoice_date=created_invoice.date,
                due_date=created_invoice.due_date,
                last_synced_at=timezone.now()
            )
            logger.info(f"✅ [convert_quote_to_invoice] Invoice link created with patient: {quote_link.patient}, company: {quote_link.company}")
            
            # Update quote link to mark as converted
            logger.info(f"💾 [convert_quote_to_invoice] Updating quote status to INVOICED...")
            quote_link.status = 'INVOICED'
            quote_link.converted_invoice = invoice_link
            quote_link.converted_at = timezone.now()
            quote_link.save()
            logger.info(f"✅ [convert_quote_to_invoice] Quote marked as INVOICED")
            
            # Log success
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"⏱️ [convert_quote_to_invoice] Conversion completed in {duration_ms}ms")
            XeroSyncLog.objects.create(
                operation_type='quote_convert',
                status='success',
                xero_entity_id=quote_link.xero_quote_id,
                duration_ms=duration_ms,
                response_data={
                    'quote_id': quote_link.xero_quote_id,
                    'invoice_id': invoice_link.xero_invoice_id,
                    'invoice_number': created_invoice.invoice_number,
                    'quote_number': original_quote.quote_number
                }
            )
            
            return invoice_link
            
        except Exception as e:
            # Log error
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [convert_quote_to_invoice] Error after {duration_ms}ms: {str(e)}", exc_info=True)
            XeroSyncLog.objects.create(
                operation_type='quote_convert',
                status='failed',
                xero_entity_id=quote_link.xero_quote_id,
                error_message=str(e),
                duration_ms=duration_ms
            )
            raise
    
    def sync_quote_status(self, quote_link: XeroQuoteLink) -> XeroQuoteLink:
        """
        Fetch latest quote status from Xero
        Added Nov 2025: Keep quote status in sync
        
        Args:
            quote_link: XeroQuoteLink object to sync
        
        Returns:
            Updated XeroQuoteLink object
        """
        start_time = time.time()
        
        try:
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            accounting_api = AccountingApi(api_client)
            
            # Fetch quote
            response = accounting_api.get_quote(
                xero_tenant_id=connection.tenant_id,
                quote_id=quote_link.xero_quote_id
            )
            
            xero_quote = response.quotes[0]
            
            # Update link
            quote_link.status = xero_quote.status
            quote_link.total = float(xero_quote.total) if xero_quote.total else 0
            quote_link.subtotal = float(xero_quote.sub_total) if xero_quote.sub_total else 0
            quote_link.total_tax = float(xero_quote.total_tax) if xero_quote.total_tax else 0
            quote_link.last_synced_at = timezone.now()
            quote_link.save()
            
            # Log success
            XeroSyncLog.objects.create(
                operation_type='quote_sync',
                status='success',
                xero_entity_id=quote_link.xero_quote_id,
                duration_ms=int((time.time() - start_time) * 1000),
                response_data={'status': xero_quote.status}
            )
            
            return quote_link
            
        except Exception as e:
            # Log error
            XeroSyncLog.objects.create(
                operation_type='quote_sync',
                status='failed',
                xero_entity_id=quote_link.xero_quote_id,
                error_message=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
            raise


    def delete_draft_invoice(self, invoice_link: XeroInvoiceLink) -> XeroInvoiceLink:
        """
        Delete a DRAFT invoice in Xero (set status to DELETED)
        Added Nov 2025: Smart delete for draft invoices
        
        Args:
            invoice_link: XeroInvoiceLink object to delete
        
        Returns:
            Updated XeroInvoiceLink object with DELETED status
        """
        start_time = time.time()
        logger.info(f"🗑️ [delete_draft_invoice] Deleting draft invoice {invoice_link.xero_invoice_number}")
        
        try:
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            
            if not connection:
                logger.error(f"❌ [delete_draft_invoice] No active Xero connection found")
                raise ValueError("No active Xero connection found. Please connect to Xero first in Settings.")
            
            accounting_api = AccountingApi(api_client)
            
            # Fetch the current invoice from Xero
            logger.info(f"📥 [delete_draft_invoice] Fetching invoice from Xero: {invoice_link.xero_invoice_id}")
            response = accounting_api.get_invoice(
                xero_tenant_id=connection.tenant_id,
                invoice_id=invoice_link.xero_invoice_id
            )
            xero_invoice = response.invoices[0]
            logger.info(f"✅ [delete_draft_invoice] Fetched invoice - current status: {xero_invoice.status}")
            
            # Validate invoice status
            if xero_invoice.status not in ['DRAFT', 'SUBMITTED']:
                logger.error(f"❌ [delete_draft_invoice] Invalid status: {xero_invoice.status}")
                raise ValueError(f"Cannot delete invoice in {xero_invoice.status} status. Only DRAFT/SUBMITTED invoices can be deleted.")
            
            # Change status to DELETED
            logger.info(f"🔄 [delete_draft_invoice] Changing status to DELETED...")
            xero_invoice.status = 'DELETED'
            
            # Update invoice in Xero
            logger.info(f"📤 [delete_draft_invoice] Sending update to Xero...")
            invoices = Invoices(invoices=[xero_invoice])
            update_response = accounting_api.update_invoice(
                xero_tenant_id=connection.tenant_id,
                invoice_id=invoice_link.xero_invoice_id,
                invoices=invoices
            )
            
            updated_xero_invoice = update_response.invoices[0]
            logger.info(f"✅ [delete_draft_invoice] Invoice deleted in Xero - new status: {updated_xero_invoice.status}")
            
            # Update local database
            invoice_link.status = updated_xero_invoice.status
            invoice_link.last_synced_at = timezone.now()
            invoice_link.save()
            
            # Log success
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"⏱️ [delete_draft_invoice] Operation completed in {duration_ms}ms")
            XeroSyncLog.objects.create(
                operation_type='invoice_delete',
                status='success',
                local_entity_type='invoice',
                local_entity_id=str(invoice_link.id),
                xero_entity_id=invoice_link.xero_invoice_id,
                duration_ms=duration_ms,
                response_data={
                    'invoice_number': updated_xero_invoice.invoice_number,
                    'status': updated_xero_invoice.status
                }
            )
            
            return invoice_link
            
        except Exception as e:
            # Log error
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [delete_draft_invoice] Error after {duration_ms}ms: {str(e)}", exc_info=True)
            XeroSyncLog.objects.create(
                operation_type='invoice_delete',
                status='failed',
                local_entity_type='invoice',
                local_entity_id=str(invoice_link.id),
                xero_entity_id=invoice_link.xero_invoice_id,
                error_message=str(e),
                duration_ms=duration_ms
            )
            raise


    def void_invoice(self, invoice_link: XeroInvoiceLink) -> XeroInvoiceLink:
        """
        Void an AUTHORISED invoice in Xero (set status to VOIDED)
        Added Nov 2025: Smart delete for authorised invoices
        
        Args:
            invoice_link: XeroInvoiceLink object to void
        
        Returns:
            Updated XeroInvoiceLink object with VOIDED status
        """
        start_time = time.time()
        logger.info(f"🚫 [void_invoice] Voiding invoice {invoice_link.xero_invoice_number}")
        
        try:
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            
            if not connection:
                logger.error(f"❌ [void_invoice] No active Xero connection found")
                raise ValueError("No active Xero connection found. Please connect to Xero first in Settings.")
            
            accounting_api = AccountingApi(api_client)
            
            # Fetch the current invoice from Xero
            logger.info(f"📥 [void_invoice] Fetching invoice from Xero: {invoice_link.xero_invoice_id}")
            response = accounting_api.get_invoice(
                xero_tenant_id=connection.tenant_id,
                invoice_id=invoice_link.xero_invoice_id
            )
            xero_invoice = response.invoices[0]
            logger.info(f"✅ [void_invoice] Fetched invoice - current status: {xero_invoice.status}")
            
            # Validate invoice status
            if xero_invoice.status not in ['AUTHORISED', 'SUBMITTED']:
                logger.error(f"❌ [void_invoice] Invalid status: {xero_invoice.status}")
                raise ValueError(f"Cannot void invoice in {xero_invoice.status} status. Only AUTHORISED/SUBMITTED invoices can be voided.")
            
            # Change status to VOIDED
            logger.info(f"🔄 [void_invoice] Changing status to VOIDED...")
            xero_invoice.status = 'VOIDED'
            
            # Update invoice in Xero
            logger.info(f"📤 [void_invoice] Sending update to Xero...")
            invoices = Invoices(invoices=[xero_invoice])
            update_response = accounting_api.update_invoice(
                xero_tenant_id=connection.tenant_id,
                invoice_id=invoice_link.xero_invoice_id,
                invoices=invoices
            )
            
            updated_xero_invoice = update_response.invoices[0]
            logger.info(f"✅ [void_invoice] Invoice voided in Xero - new status: {updated_xero_invoice.status}")
            
            # Update local database
            invoice_link.status = updated_xero_invoice.status
            invoice_link.last_synced_at = timezone.now()
            invoice_link.save()
            
            # Log success
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"⏱️ [void_invoice] Operation completed in {duration_ms}ms")
            XeroSyncLog.objects.create(
                operation_type='invoice_void',
                status='success',
                local_entity_type='invoice',
                local_entity_id=str(invoice_link.id),
                xero_entity_id=invoice_link.xero_invoice_id,
                duration_ms=duration_ms,
                response_data={
                    'invoice_number': updated_xero_invoice.invoice_number,
                    'status': updated_xero_invoice.status
                }
            )
            
            return invoice_link
            
        except Exception as e:
            # Log error
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [void_invoice] Error after {duration_ms}ms: {str(e)}", exc_info=True)
            XeroSyncLog.objects.create(
                operation_type='invoice_void',
                status='failed',
                local_entity_type='invoice',
                local_entity_id=str(invoice_link.id),
                xero_entity_id=invoice_link.xero_invoice_id,
                error_message=str(e),
                duration_ms=duration_ms
            )
            raise


    def delete_draft_quote(self, quote_link: XeroQuoteLink) -> XeroQuoteLink:
        """
        Delete a DRAFT quote in Xero (set status to DELETED)
        Added Nov 2025: Smart delete for draft quotes
        
        Args:
            quote_link: XeroQuoteLink object to delete
        
        Returns:
            Updated XeroQuoteLink object with DELETED status
        """
        start_time = time.time()
        logger.info(f"🗑️ [delete_draft_quote] Deleting draft quote {quote_link.xero_quote_number}")
        
        try:
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            
            if not connection:
                logger.error(f"❌ [delete_draft_quote] No active Xero connection found")
                raise ValueError("No active Xero connection found. Please connect to Xero first in Settings.")
            
            accounting_api = AccountingApi(api_client)
            
            # Fetch the current quote from Xero
            logger.info(f"📥 [delete_draft_quote] Fetching quote from Xero: {quote_link.xero_quote_id}")
            response = accounting_api.get_quote(
                xero_tenant_id=connection.tenant_id,
                quote_id=quote_link.xero_quote_id
            )
            xero_quote = response.quotes[0]
            logger.info(f"✅ [delete_draft_quote] Fetched quote - current status: {xero_quote.status}")
            
            # Validate quote status (normalize to handle both string and enum)
            status_str = str(xero_quote.status).replace('QuoteStatusCodes.', '')
            if status_str not in ['DRAFT', 'SENT']:
                logger.error(f"❌ [delete_draft_quote] Invalid status: {xero_quote.status}")
                raise ValueError(f"Cannot delete quote in {status_str} status. Only DRAFT/SENT quotes can be deleted.")
            
            # Change status to DELETED
            logger.info(f"🔄 [delete_draft_quote] Changing status to DELETED...")
            xero_quote.status = QuoteStatusCodes.DELETED
            
            # Update quote in Xero
            logger.info(f"📤 [delete_draft_quote] Sending update to Xero...")
            quotes = Quotes(quotes=[xero_quote])
            update_response = accounting_api.update_quote(
                xero_tenant_id=connection.tenant_id,
                quote_id=quote_link.xero_quote_id,
                quotes=quotes
            )
            
            updated_xero_quote = update_response.quotes[0]
            logger.info(f"✅ [delete_draft_quote] Quote deleted in Xero - new status: {updated_xero_quote.status}")
            
            # Update local database
            quote_link.status = str(updated_xero_quote.status)
            quote_link.last_synced_at = timezone.now()
            quote_link.save()
            
            # Log success
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"⏱️ [delete_draft_quote] Operation completed in {duration_ms}ms")
            XeroSyncLog.objects.create(
                operation_type='quote_delete',
                status='success',
                local_entity_type='quote',
                local_entity_id=str(quote_link.id),
                xero_entity_id=quote_link.xero_quote_id,
                duration_ms=duration_ms,
                response_data={
                    'quote_number': updated_xero_quote.quote_number,
                    'status': str(updated_xero_quote.status)
                }
            )
            
            return quote_link
            
        except Exception as e:
            # Log error
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [delete_draft_quote] Error after {duration_ms}ms: {str(e)}", exc_info=True)
            XeroSyncLog.objects.create(
                operation_type='quote_delete',
                status='failed',
                local_entity_type='quote',
                local_entity_id=str(quote_link.id),
                xero_entity_id=quote_link.xero_quote_id,
                error_message=str(e),
                duration_ms=duration_ms
            )
            raise


    # ==================== PAYMENT METHODS ====================
    
    def create_payment(
        self,
        invoice_id: str,
        amount: Decimal,
        payment_date: date,
        account_code: str,
        reference: str = None
    ) -> Payment:
        """
        Create a payment for a single invoice in Xero.
        
        Args:
            invoice_id: UUID of the invoice in Xero
            amount: Payment amount
            payment_date: Date of payment
            account_code: Bank account code in Xero
            reference: Optional payment reference
            
        Returns:
            Payment object from Xero
        """
        start_time = time.time()
        logger.info(f"🔵 [create_payment] Creating payment for invoice {invoice_id}: ${amount}")
        
        try:
            # Get API client and tenant
            api_client = self.get_api_client()
            accounting_api = AccountingApi(api_client)
            connection = self.get_active_connection()
            
            if not connection:
                raise ValueError("No active Xero connection found")
            
            # Prepare payment data
            payment = Payment(
                invoice=Invoice(invoice_id=invoice_id),
                account=Account(code=account_code),
                date=payment_date,
                amount=float(amount)
            )
            
            if reference:
                payment.reference = reference
            
            # Create payment in Xero
            payments = Payments(payments=[payment])
            api_response = accounting_api.create_payments(
                xero_tenant_id=connection.tenant_id,
                payments=payments
            )
            
            created_payment = api_response.payments[0] if api_response.payments else None
            
            if not created_payment:
                raise ValueError("No payment returned from Xero API")
            
            # Log success
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"✅ [create_payment] Payment created successfully in {duration_ms}ms: {created_payment.payment_id}")
            
            XeroSyncLog.objects.create(
                operation_type='payment_create',
                status='success',
                local_entity_type='payment',
                xero_entity_id=created_payment.payment_id,
                duration_ms=duration_ms,
                response_data={
                    'payment_id': created_payment.payment_id,
                    'amount': float(amount),
                    'invoice_id': invoice_id
                }
            )
            
            return created_payment
            
        except AccountingBadRequestException as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [create_payment] Xero API error after {duration_ms}ms: {e}", exc_info=True)
            XeroSyncLog.objects.create(
                operation_type='payment_create',
                status='failed',
                local_entity_type='payment',
                xero_entity_id=invoice_id,
                error_message=str(e),
                duration_ms=duration_ms
            )
            raise
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [create_payment] Error after {duration_ms}ms: {str(e)}", exc_info=True)
            XeroSyncLog.objects.create(
                operation_type='payment_create',
                status='failed',
                local_entity_type='payment',
                error_message=str(e),
                duration_ms=duration_ms
            )
            raise
    
    
    def create_batch_payment(
        self,
        payments_data: List[dict],
        batch_reference: str
    ) -> List[Payment]:
        """
        Create a batch payment for multiple invoices in Xero.
        
        Args:
            payments_data: List of payment dictionaries containing:
                - invoice_id: UUID of invoice
                - amount: Payment amount (Decimal)
                - payment_date: Date of payment
                - account_code: Bank account code
            batch_reference: Common reference for all payments (remittance advice number)
            
        Returns:
            List of created Payment objects from Xero
        """
        start_time = time.time()
        logger.info(f"🔵 [create_batch_payment] Creating batch payment '{batch_reference}' with {len(payments_data)} payments")
        
        try:
            # Get API client and tenant
            api_client = self.get_api_client()
            accounting_api = AccountingApi(api_client)
            connection = self.get_active_connection()
            
            if not connection:
                raise ValueError("No active Xero connection found")
            
            # Prepare all payments
            payment_objects = []
            total_amount = Decimal('0')
            
            for payment_info in payments_data:
                payment = Payment(
                    invoice=Invoice(invoice_id=payment_info['invoice_id']),
                    account=Account(code=payment_info['account_code']),
                    date=payment_info['payment_date'],
                    amount=float(payment_info['amount']),
                    reference=batch_reference
                )
                payment_objects.append(payment)
                total_amount += payment_info['amount']
            
            # Create all payments in a single API call
            payments = Payments(payments=payment_objects)
            api_response = accounting_api.create_payments(
                xero_tenant_id=connection.tenant_id,
                payments=payments
            )
            
            created_payments = api_response.payments if api_response.payments else []
            
            if not created_payments:
                raise ValueError("No payments returned from Xero API")
            
            # Log success
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"✅ [create_batch_payment] Batch payment created successfully in {duration_ms}ms: {len(created_payments)} payments, total ${total_amount}")
            
            XeroSyncLog.objects.create(
                operation_type='payment_batch_create',
                status='success',
                local_entity_type='batch_payment',
                duration_ms=duration_ms,
                response_data={
                    'batch_reference': batch_reference,
                    'payment_count': len(created_payments),
                    'total_amount': float(total_amount)
                }
            )
            
            return created_payments
            
        except AccountingBadRequestException as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [create_batch_payment] Xero API error after {duration_ms}ms: {e}", exc_info=True)
            XeroSyncLog.objects.create(
                operation_type='payment_batch_create',
                status='failed',
                local_entity_type='batch_payment',
                error_message=str(e),
                duration_ms=duration_ms,
                request_data={'batch_reference': batch_reference, 'payment_count': len(payments_data)}
            )
            raise
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [create_batch_payment] Error after {duration_ms}ms: {str(e)}", exc_info=True)
            XeroSyncLog.objects.create(
                operation_type='payment_batch_create',
                status='failed',
                local_entity_type='batch_payment',
                error_message=str(e),
                duration_ms=duration_ms,
                request_data={'batch_reference': batch_reference, 'payment_count': len(payments_data)}
            )
            raise
    
    
    def get_payment(self, payment_id: str) -> Optional[Payment]:
        """
        Retrieve a specific payment from Xero by ID.
        
        Args:
            payment_id: UUID of the payment in Xero
            
        Returns:
            Payment object from Xero or None if not found
        """
        start_time = time.time()
        logger.info(f"🔵 [get_payment] Fetching payment {payment_id}")
        
        try:
            # Get API client and tenant
            api_client = self.get_api_client()
            accounting_api = AccountingApi(api_client)
            connection = self.get_active_connection()
            
            if not connection:
                raise ValueError("No active Xero connection found")
            
            # Get payment from Xero
            api_response = accounting_api.get_payment(
                xero_tenant_id=connection.tenant_id,
                payment_id=payment_id
            )
            
            payment = api_response.payments[0] if api_response.payments else None
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            if payment:
                logger.info(f"✅ [get_payment] Payment fetched successfully in {duration_ms}ms")
            else:
                logger.warning(f"⚠️ [get_payment] Payment not found after {duration_ms}ms")
            
            return payment
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [get_payment] Error after {duration_ms}ms: {str(e)}", exc_info=True)
            raise
    
    
    def get_payments_for_invoice(self, invoice_id: str) -> List[Payment]:
        """
        Retrieve all payments for a specific invoice from Xero.
        
        Args:
            invoice_id: UUID of the invoice in Xero
            
        Returns:
            List of Payment objects from Xero
        """
        start_time = time.time()
        logger.info(f"🔵 [get_payments_for_invoice] Fetching payments for invoice {invoice_id}")
        
        try:
            # Get API client and tenant
            api_client = self.get_api_client()
            accounting_api = AccountingApi(api_client)
            connection = self.get_active_connection()
            
            if not connection:
                raise ValueError("No active Xero connection found")
            
            # Get payments from Xero filtered by invoice ID
            where_clause = f'Invoice.InvoiceID=guid"{invoice_id}"'
            api_response = accounting_api.get_payments(
                xero_tenant_id=connection.tenant_id,
                where=where_clause
            )
            
            payments = api_response.payments if api_response.payments else []
            
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"✅ [get_payments_for_invoice] Found {len(payments)} payment(s) in {duration_ms}ms")
            
            return payments
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [get_payments_for_invoice] Error after {duration_ms}ms: {str(e)}", exc_info=True)
            raise


# Global service instance
xero_service = XeroService()

