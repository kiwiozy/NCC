"""
Invoice and Quote URLs
"""
from django.urls import path
from . import views
from . import quote_views

urlpatterns = [
    path('generate-pdf/', views.generate_invoice_pdf_view, name='generate_invoice_pdf'),
    path('xero/<str:invoice_link_id>/pdf/', views.generate_xero_invoice_pdf, name='xero_invoice_pdf'),
    path('xero/<str:invoice_link_id>/receipt/pdf/', views.generate_xero_receipt_pdf, name='xero_receipt_pdf'),
    path('xero/quotes/<str:quote_link_id>/pdf/', quote_views.generate_xero_quote_pdf, name='xero_quote_pdf'),
]

