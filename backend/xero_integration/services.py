"""
Xero API Service Layer

Provides functions for:
- OAuth2 authentication flow
- Token management (refresh)
- Contact synchronization
- Invoice creation and updates
- Payment synchronization
"""
import os
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from urllib.parse import urlencode

from django.conf import settings
from django.utils import timezone
from xero_python.api_client import ApiClient
from xero_python.api_client.configuration import Configuration
from xero_python.api_client.oauth2 import OAuth2Token
from xero_python.identity import IdentityApi
from xero_python.accounting import AccountingApi, Contact, Invoice, LineItem, Contacts, Invoices, Quote, Quotes
from xero_python.exceptions import AccountingBadRequestException

from .models import (
    XeroConnection,
    XeroContactLink,
    XeroInvoiceLink,
    XeroQuoteLink,
    XeroSyncLog
)


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
                        emails.append(email_addr)
                
                if phones:
                    contact.phones = phones
                if emails:
                    contact.email_address = emails[0]  # Primary email
            
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
        due_date=None
    ) -> XeroInvoiceLink:
        """
        Create a draft invoice in Xero
        Updated Nov 2025: Supports standalone invoices without appointments
        
        Args:
            appointment: Optional appointment link
            patient: Required if no appointment (direct patient invoice)
            company: Optional company for billing
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
                
                # Patient details go in reference
                patient_name = f"{patient.first_name} {patient.last_name}"
                reference = f"Service for: {patient_name}"
                reference += f"\nMRN: {patient.mrn}"
                if patient.dob:
                    reference += f"\nDOB: {patient.dob.strftime('%d/%m/%Y')}"
                
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
                
                # Company details go in reference (if applicable)
                if company:
                    reference = f"Bill to: {company.name}"
                    if hasattr(company, 'abn') and company.abn:
                        reference += f"\nABN: {company.abn}"
                else:
                    patient_name = f"{patient.first_name} {patient.last_name}"
                    reference = f"Invoice for {patient_name}"
            
            # Add billing notes to reference
            if billing_notes:
                reference += f"\n{billing_notes}"
            
            # Build line items
            xero_line_items = []
            for item in line_items:
                line_item = LineItem(
                    description=item['description'],
                    quantity=item.get('quantity', 1),
                    unit_amount=float(item['unit_amount']),
                    account_code=item.get('account_code', '200'),
                    tax_type=item.get('tax_type', 'OUTPUT2'),
                )
                
                if item.get('item_code'):
                    line_item.item_code = item['item_code']
                
                xero_line_items.append(line_item)
            
            # Build invoice
            from datetime import timedelta
            from xero_python.accounting import Contact as XeroContact
            
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
                status='DRAFT',
                currency_code='AUD'
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
            
            # Create link with patient and company
            link = XeroInvoiceLink.objects.create(
                appointment=appointment,
                patient=patient,
                company=company,
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
    
    def create_quote(
        self,
        patient,
        company,
        line_items: List[Dict[str, Any]],
        expiry_date,
        appointment=None
    ) -> XeroQuoteLink:
        """
        Create a quote in Xero
        Added Nov 2025: Support for quotes (estimates) before service delivery
        
        Args:
            patient: Patient object (service recipient)
            company: Company object (optional - who pays)
            line_items: List of service line items
            expiry_date: Quote expiry date (datetime.date)
            appointment: Optional appointment to link to
        
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
                patient_name = f"{patient.first_name} {patient.last_name}"
                reference = f"Service for: {patient_name}"
                reference += f"\nMRN: {patient.mrn}"
                if patient.dob:
                    reference += f"\nDOB: {patient.dob.strftime('%d/%m/%Y')}"
            else:
                primary_contact_link = self.sync_contact(patient)
                patient_name = f"{patient.first_name} {patient.last_name}"
                reference = f"Quote for: {patient_name}"
            
            # Build line items
            xero_line_items = []
            for item in line_items:
                line_item = LineItem(
                    description=item['description'],
                    quantity=item.get('quantity', 1),
                    unit_amount=float(item['unit_amount']),
                    account_code=item.get('account_code', '200'),
                    tax_type=item.get('tax_type', 'OUTPUT2'),
                )
                xero_line_items.append(line_item)
            
            # Build quote
            from xero_python.accounting import Contact as XeroContact
            quote = Quote(
                contact=XeroContact(contact_id=primary_contact_link.xero_contact_id),
                date=timezone.now().date(),
                expiry_date=expiry_date,
                reference=reference,
                line_items=xero_line_items,
                status='DRAFT',
                terms="Quote valid until expiry date. Services subject to availability.",
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
                xero_quote_id=created_quote.quote_id,
                xero_quote_number=created_quote.quote_number or '',
                status=created_quote.status,
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
                local_entity_type='patient',
                local_entity_id=patient.id,
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
                local_entity_type='patient',
                local_entity_id=patient.id,
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
        
        try:
            # Validate quote can be converted
            if not quote_link.can_convert_to_invoice():
                raise ValueError(f"Quote {quote_link.xero_quote_number} cannot be converted (status: {quote_link.status})")
            
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
            accounting_api = AccountingApi(api_client)
            
            # Fetch the original quote from Xero
            quote_response = accounting_api.get_quote(
                xero_tenant_id=connection.tenant_id,
                quote_id=quote_link.xero_quote_id
            )
            original_quote = quote_response.quotes[0]
            
            # Create invoice with same details
            invoice = Invoice(
                type='ACCREC',
                contact=original_quote.contact,  # Same contact
                line_items=original_quote.line_items,  # Same line items
                reference=f"Quote #{original_quote.quote_number}",
                date=timezone.now().date(),
                status='DRAFT',
                currency_code='AUD'
            )
            
            # Create invoice in Xero
            invoices = Invoices(invoices=[invoice])
            response = accounting_api.create_invoices(
                xero_tenant_id=connection.tenant_id,
                invoices=invoices
            )
            
            created_invoice = response.invoices[0]
            
            # Create invoice link
            invoice_link = XeroInvoiceLink.objects.create(
                appointment=quote_link.appointment,  # Link to same appointment if any
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
            
            # Update quote link to mark as converted
            quote_link.status = 'INVOICED'
            quote_link.converted_invoice = invoice_link
            quote_link.converted_at = timezone.now()
            quote_link.save()
            
            # Log success
            XeroSyncLog.objects.create(
                operation_type='quote_convert',
                status='success',
                xero_entity_id=quote_link.xero_quote_id,
                duration_ms=int((time.time() - start_time) * 1000),
                response_data={
                    'quote_id': quote_link.xero_quote_id,
                    'invoice_id': invoice_link.xero_invoice_id
                }
            )
            
            return invoice_link
            
        except Exception as e:
            # Log error
            XeroSyncLog.objects.create(
                operation_type='quote_convert',
                status='failed',
                xero_entity_id=quote_link.xero_quote_id,
                error_message=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
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


# Global service instance
xero_service = XeroService()

