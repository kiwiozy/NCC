"""
Invoice URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('generate-pdf/', views.generate_invoice_pdf_view, name='generate_invoice_pdf'),
    path('xero/<str:invoice_link_id>/pdf/', views.generate_xero_invoice_pdf, name='xero_invoice_pdf'),
]

