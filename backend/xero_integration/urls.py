"""
Xero Integration URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'connections', views.XeroConnectionViewSet, basename='xero-connection')
router.register(r'contacts', views.XeroContactLinkViewSet, basename='xero-contact')
router.register(r'invoices', views.XeroInvoiceLinkViewSet, basename='xero-invoice')
router.register(r'items', views.XeroItemMappingViewSet, basename='xero-item')
router.register(r'tracking', views.XeroTrackingCategoryViewSet, basename='xero-tracking')
router.register(r'logs', views.XeroSyncLogViewSet, basename='xero-log')

app_name = 'xero_integration'

urlpatterns = [
    # OAuth2 flow endpoints
    path('oauth/connect/', views.xero_connect, name='connect'),
    path('oauth/callback/', views.xero_callback, name='callback'),
    path('oauth/disconnect/', views.xero_disconnect, name='disconnect'),
    path('oauth/refresh/', views.xero_refresh_token, name='refresh'),
    
    # API endpoints
    path('', include(router.urls)),
]

