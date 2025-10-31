"""
Gmail Integration URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'connections', views.GmailConnectionViewSet, basename='gmail-connection')
router.register(r'templates', views.EmailTemplateViewSet, basename='email-template')
router.register(r'sent', views.SentEmailViewSet, basename='sent-email')

app_name = 'gmail_integration'

urlpatterns = [
    # OAuth2 flow endpoints
    path('oauth/connect/', views.gmail_connect, name='connect'),
    path('oauth/callback/', views.gmail_callback, name='callback'),
    path('oauth/disconnect/', views.gmail_disconnect, name='disconnect'),
    path('oauth/refresh/', views.gmail_refresh_token, name='refresh'),
    
    # Email sending
    path('send/', views.send_email_view, name='send-email'),
    path('test/', views.test_gmail_connection, name='test'),
    
    # Send As addresses and connected accounts
    path('send-as-addresses/', views.get_send_as_addresses, name='send-as-addresses'),
    path('connected-accounts/', views.get_connected_accounts, name='connected-accounts'),
    
    # API endpoints
    path('', include(router.urls)),
]

