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
from xero_python.accounting import AccountingApi, Contact, Invoice, LineItem, Contacts, Invoices
from xero_python.exceptions import AccountingBadRequestException

from .models import (
    XeroConnection,
    XeroContactLink,
    XeroInvoiceLink,
    XeroSyncLog
)


class XeroService:
    """
    Main service class for Xero API interactions
    """
    
    def __init__(self):
        self.client_id = os.getenv('XERO_CLIENT_ID', '')
        self.client_secret = os.getenv('XERO_CLIENT_SECRET', '')
        self.redirect_uri = os.getenv('XERO_REDIRECT_URI', 'http://localhost:8000/xero/oauth/callback')
    
    def _check_credentials(self):
        """Check if Xero credentials are configured"""
        if not self.client_id or not self.client_secret:
            raise ValueError("XERO_CLIENT_ID and XERO_CLIENT_SECRET must be set in environment. See .env.example for setup.")
    
    def get_api_client(self) -> ApiClient:
        """
        Create and configure Xero API client
        """
        configuration = Configuration()
        configuration.debug = settings.DEBUG
        api_client = ApiClient(
            configuration,
            oauth2_token=self._get_stored_token()
        )
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
    
    def _get_stored_token(self) -> Optional[OAuth2Token]:
        """
        Retrieve stored OAuth2 token from database
        Auto-refreshes if expired or about to expire
        """
        try:
            connection = self.get_active_connection()
            if not connection:
                return None
            
            token = OAuth2Token(
                client_id=self.client_id,
                client_secret=self.client_secret,
                token={
                    'access_token': connection.access_token,
                    'refresh_token': connection.refresh_token,
                    'id_token': connection.id_token,
                    'token_type': connection.token_type,
                    'expires_at': connection.expires_at.timestamp(),
                    'scope': connection.scopes.split()
                }
            )
            return token
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
            
            # Use first tenant
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
    
    def sync_contact(self, patient, force_update: bool = False) -> XeroContactLink:
        """
        Create or update a Xero contact for a patient
        """
        start_time = time.time()
        
        try:
            # Check if contact already exists
            existing_link = XeroContactLink.objects.filter(
                local_type='patient',
                local_id=patient.id
            ).first()
            
            if existing_link and not force_update:
                return existing_link
            
            # Get API client and connection
            api_client = self.get_api_client()
            connection = XeroConnection.objects.filter(is_active=True).first()
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
                local_type='patient',
                local_id=patient.id,
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
    
    def create_invoice(
        self,
        appointment,
        line_items: List[Dict[str, Any]],
        tracking_category: Optional[Dict[str, str]] = None
    ) -> XeroInvoiceLink:
        """
        Create a draft invoice in Xero for an appointment
        
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
            accounting_api = AccountingApi(api_client)
            
            # Ensure patient has a Xero contact
            contact_link = self.sync_contact(appointment.patient)
            
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
            from xero_python.accounting import Contact as XeroContact
            invoice = Invoice(
                type='ACCREC',  # Accounts Receivable
                contact=XeroContact(contact_id=contact_link.xero_contact_id),
                line_items=xero_line_items,
                date=appointment.start_time.date() if appointment.start_time else timezone.now().date(),
                due_date=None,  # Will use default payment terms
                reference=f"Appointment {appointment.id}",
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
            
            # Create link
            link = XeroInvoiceLink.objects.create(
                appointment=appointment,
                xero_invoice_id=xero_invoice.invoice_id,
                xero_invoice_number=xero_invoice.invoice_number or '',
                status=xero_invoice.status,
                total=float(xero_invoice.total) if xero_invoice.total else 0,
                amount_due=float(xero_invoice.amount_due) if xero_invoice.amount_due else 0,
                amount_paid=float(xero_invoice.amount_paid) if xero_invoice.amount_paid else 0,
                invoice_date=xero_invoice.date,
                due_date=xero_invoice.due_date,
                last_synced_at=timezone.now()
            )
            
            # Log success
            XeroSyncLog.objects.create(
                operation_type='invoice_create',
                status='success',
                local_entity_type='appointment',
                local_entity_id=appointment.id,
                xero_entity_id=xero_invoice.invoice_id,
                duration_ms=int((time.time() - start_time) * 1000),
                request_data={'line_items': line_items}
            )
            
            return link
            
        except AccountingBadRequestException as e:
            # Log validation error
            XeroSyncLog.objects.create(
                operation_type='invoice_create',
                status='failed',
                local_entity_type='appointment',
                local_entity_id=appointment.id,
                error_message=f"Validation error: {e.reason}",
                duration_ms=int((time.time() - start_time) * 1000),
                request_data={'line_items': line_items}
            )
            raise
            
        except Exception as e:
            # Log general error
            XeroSyncLog.objects.create(
                operation_type='invoice_create',
                status='failed',
                local_entity_type='appointment',
                local_entity_id=appointment.id,
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


# Global service instance
xero_service = XeroService()

