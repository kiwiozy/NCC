"""
Gmail Integration Views

Provides API endpoints for:
- OAuth2 flow (connect, callback, disconnect)
- Connection status and management
- Email sending
- Template management
- Sent email logs
"""
from django.shortcuts import redirect
from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import GmailConnection, EmailTemplate, SentEmail
from .serializers import (
    GmailConnectionSerializer,
    EmailTemplateSerializer,
    SentEmailSerializer,
    SendEmailSerializer
)
from .services import gmail_service


@api_view(['GET'])
def gmail_connect(request):
    """
    Start OAuth2 authorization flow
    Redirects user to Google login
    """
    try:
        auth_url = gmail_service.get_authorization_url(state='nexus-clinic')
        return redirect(auth_url)
    except Exception as e:
        return JsonResponse({
            'error': 'Failed to generate authorization URL',
            'detail': str(e)
        }, status=500)


@api_view(['GET'])
def gmail_callback(request):
    """
    OAuth2 callback endpoint
    Exchanges authorization code for access token
    """
    code = request.GET.get('code')
    error = request.GET.get('error')
    
    print(f"Gmail Callback - Code: {code[:20] if code else None}...")
    print(f"Gmail Callback - Error: {error}")
    
    if error:
        error_desc = request.GET.get('error_description', '')
        print(f"OAuth Error: {error} - {error_desc}")
        return redirect(f'https://localhost:3000/settings?tab=gmail&status=error&message={error}')
    
    if not code:
        print("No authorization code provided")
        return redirect(f'https://localhost:3000/settings?tab=gmail&status=error&message=No+authorization+code')
    
    try:
        print("Attempting to exchange code for token...")
        connection = gmail_service.exchange_code_for_token(code)
        print(f"✓ Connection created: {connection.email_address}")
        
        # Redirect to frontend with success (using HTTPS)
        # Add success=true parameter to show notification
        return redirect(f'https://localhost:3000/?gmail_added={connection.email_address}')
        
    except Exception as e:
        print(f"✗ Error in callback: {str(e)}")
        import traceback
        traceback.print_exc()
        # Redirect to frontend with error (using HTTPS)
        error_message = str(e).replace(' ', '+')
        return redirect(f'https://localhost:3000/?gmail_error={error_message}')


@api_view(['POST'])
def gmail_disconnect(request):
    """
    Disconnect Gmail integration
    Marks connection as inactive
    Supports disconnecting specific account by email, or primary account if no email provided
    """
    email = request.data.get('email')
    
    try:
        if email:
            connection = GmailConnection.objects.get(email_address=email, is_active=True)
        else:
            connection = GmailConnection.objects.filter(is_active=True, is_primary=True).first()
        
        if not connection:
            return Response({
                'error': 'No active Gmail connection found'
            }, status=404)
        
        connection.is_active = False
        connection.save()
        
        return Response({
            'success': True,
            'message': f'Gmail account {connection.email_address} disconnected'
        })
        
    except Exception as e:
        return Response({
            'error': 'Failed to disconnect Gmail',
            'detail': str(e)
        }, status=500)


@api_view(['GET'])
def get_connected_accounts(request):
    """
    Get all connected Gmail accounts
    
    Returns:
        List of connected accounts with basic info (email, is_primary, display name)
    """
    try:
        connections = gmail_service.get_all_active_connections()
        
        accounts = []
        for conn in connections:
            accounts.append({
                'email': conn.email_address,
                'display_name': conn.display_name or conn.email_address,
                'is_primary': conn.is_primary,
                'connected_at': conn.connected_at.isoformat() if conn.connected_at else None,
            })
        
        return Response({
            'accounts': accounts,
            'count': len(accounts)
        })
    
    except Exception as e:
        return Response({
            'error': f'Failed to fetch connected accounts: {str(e)}'
        }, status=500)


@api_view(['GET'])
def get_send_as_addresses(request):
    """
    Get all 'Send As' addresses configured for the connected Gmail account
    Returns list of email addresses that can be used as sender
    """
    try:
        send_as_list = gmail_service.get_send_as_addresses()
        
        return Response({
            'success': True,
            'send_as_addresses': send_as_list,
            'count': len(send_as_list)
        })
        
    except Exception as e:
        return Response({
            'error': 'Failed to fetch Send As addresses',
            'detail': str(e)
        }, status=500)


@api_view(['POST'])
def gmail_refresh_token(request):
    """
    Manually refresh OAuth2 token
    """
    email = request.data.get('email')
    
    try:
        if email:
            connection = GmailConnection.objects.get(email_address=email, is_active=True)
        else:
            connection = GmailConnection.objects.filter(is_active=True, is_primary=True).first()
        
        if not connection:
            return Response({
                'error': 'No active Gmail connection found'
            }, status=404)
        
        connection = gmail_service.refresh_access_token(connection)
        
        serializer = GmailConnectionSerializer(connection)
        return Response({
            'success': True,
            'message': 'Token refreshed successfully',
            'connection': serializer.data
        })
        
    except Exception as e:
        return Response({
            'error': 'Failed to refresh token',
            'detail': str(e)
        }, status=500)


class GmailConnectionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Gmail connections
    Read-only - connections are managed through OAuth flow
    """
    queryset = GmailConnection.objects.all()
    serializer_class = GmailConnectionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active', 'is_primary']
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """
        Get current connection status
        """
        connection = GmailConnection.objects.filter(is_active=True, is_primary=True).first()
        
        if not connection:
            connection = GmailConnection.objects.filter(is_active=True).first()
        
        return Response({
            'connected': connection is not None,
            'connection': GmailConnectionSerializer(connection).data if connection else None
        })
    
    @action(detail=True, methods=['post'])
    def set_primary(self, request, pk=None):
        """
        Set a connection as primary
        """
        connection = self.get_object()
        connection.is_primary = True
        connection.save()  # Will auto-unset others
        
        return Response({
            'success': True,
            'message': f'{connection.email_address} set as primary'
        })


class EmailTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for email templates
    """
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'is_active']
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate a template
        """
        template = self.get_object()
        
        # Create duplicate
        new_template = EmailTemplate.objects.create(
            name=f"{template.name} (Copy)",
            description=template.description,
            category=template.category,
            subject=template.subject,
            body_html=template.body_html,
            body_text=template.body_text,
            is_active=False,  # Start as inactive
            attach_pdf=template.attach_pdf,
        )
        
        serializer = self.get_serializer(new_template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SentEmailViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for sent email logs
    Read-only
    """
    queryset = SentEmail.objects.all()
    serializer_class = SentEmailSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'related_patient_id', 'related_report_type']
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get email statistics
        """
        from django.db.models import Count, Q
        from datetime import datetime, timedelta
        
        # Last 30 days
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        stats = {
            'total_sent': SentEmail.objects.filter(status='sent').count(),
            'total_failed': SentEmail.objects.filter(status='failed').count(),
            'last_30_days': SentEmail.objects.filter(
                sent_at__gte=thirty_days_ago
            ).count(),
            'by_status': dict(
                SentEmail.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')
            ),
        }
        
        return Response(stats)


@api_view(['POST'])
def send_email_view(request):
    """
    Send an email via Gmail API
    """
    serializer = SendEmailSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        data = serializer.validated_data
        
        # Get template if specified
        template = None
        if data.get('template_id'):
            template = EmailTemplate.objects.get(id=data['template_id'])
        
        # Prepare metadata
        metadata = {
            'patient_id': data.get('patient_id', ''),
            'appointment_id': data.get('appointment_id', ''),
            'report_type': data.get('report_type', ''),
            'sent_by': request.user.username if hasattr(request, 'user') and request.user.is_authenticated else 'api',
        }
        
        # Send email
        sent_email = gmail_service.send_email(
            to_emails=data['to_emails'],
            subject=data['subject'],
            body_html=data['body_html'],
            body_text=data.get('body_text', ''),
            cc_emails=data.get('cc_emails', []),
            bcc_emails=data.get('bcc_emails', []),
            template=template,
            metadata=metadata,
            from_address=data.get('from_address', None),
            connection_email=data.get('connection_email', None)
        )
        
        return Response({
            'success': True,
            'message': f'Email sent successfully to {len(data["to_emails"])} recipient(s)',
            'email_id': str(sent_email.id),
            'gmail_message_id': sent_email.gmail_message_id
        })
        
    except Exception as e:
        return Response({
            'error': 'Failed to send email',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def test_gmail_connection(request):
    """
    Test Gmail connection by sending a test email
    """
    to_email = request.data.get('to_email')
    
    if not to_email:
        return Response({
            'error': 'to_email is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Send test email
        sent_email = gmail_service.send_email(
            to_emails=[to_email],
            subject='Gmail Integration Test - WalkEasy Nexus',
            body_html="""
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #4CAF50;">✓ Gmail Integration Test Successful!</h2>
                    <p>Your Gmail integration is working correctly.</p>
                    <p>This test email was sent from <strong>WalkEasy Nexus</strong> via the Gmail API.</p>
                    <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">
                        If you received this email, your Gmail OAuth2 connection is configured correctly.
                    </p>
                </body>
            </html>
            """,
            body_text="Gmail Integration Test Successful! Your Gmail integration is working correctly.",
            metadata={'report_type': 'Test Email'}
        )
        
        return Response({
            'success': True,
            'message': f'Test email sent successfully to {to_email}',
            'email_id': str(sent_email.id)
        })
        
    except Exception as e:
        return Response({
            'error': 'Test email failed',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
