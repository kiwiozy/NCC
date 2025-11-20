"""
Invoice and Quote URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import quote_views
from . import email_settings_views
from . import email_views
from . import custom_funding_views

# Create router for viewsets
router = DefaultRouter()
router.register(r'email-templates', email_settings_views.EmailTemplateViewSet, basename='email-template')
router.register(r'email-global-settings', email_settings_views.EmailGlobalSettingsViewSet, basename='email-global-settings')
router.register(r'custom-funding-sources', custom_funding_views.CustomFundingSourceViewSet, basename='custom-funding-source')

urlpatterns = [
    # PDF Generation
    path('generate-pdf/', views.generate_invoice_pdf_view, name='generate_invoice_pdf'),
    path('xero/<str:invoice_link_id>/pdf/', views.generate_xero_invoice_pdf, name='xero_invoice_pdf'),
    path('xero/<str:invoice_link_id>/receipt/pdf/', views.generate_xero_receipt_pdf, name='xero_receipt_pdf'),
    path('xero/quotes/<str:quote_link_id>/pdf/', quote_views.generate_xero_quote_pdf, name='xero_quote_pdf'),
    
    # Email Sending
    path('send-email/', email_views.SendInvoiceEmailView.as_view(), name='send_invoice_email'),
    
    # Email Template API (viewsets)
    path('', include(router.urls)),
]


