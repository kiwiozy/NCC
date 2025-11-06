"""
SMS Integration URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import patient_views

router = DefaultRouter()
router.register(r'templates', views.SMSTemplateViewSet, basename='smstemplate')
router.register(r'messages', views.SMSMessageViewSet, basename='smsmessage')
router.register(r'inbound', views.SMSInboundViewSet, basename='smsinbound')

urlpatterns = [
    path('', include(router.urls)),
    path('balance/', views.sms_balance, name='sms-balance'),
    path('appointment/<uuid:appointment_id>/reminder/', views.send_appointment_reminder, name='send-appointment-reminder'),
    # Patient-specific endpoints
    path('patient/<uuid:patient_id>/conversation/', patient_views.patient_conversation, name='patient-sms-conversation'),
    path('patient/<uuid:patient_id>/phones/', patient_views.patient_phone_numbers, name='patient-phone-numbers'),
    path('patient/<uuid:patient_id>/send/', patient_views.patient_send_sms, name='patient-send-sms'),
    # Webhook endpoints (CSRF exempt - called by SMS Broadcast)
    path('webhook/dlr/', views.sms_delivery_receipt, name='sms-delivery-receipt'),
    path('webhook/inbound/', views.sms_inbound, name='sms-inbound'),
]

