"""
SMS Integration URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import patient_views
from . import webhook_views

router = DefaultRouter()
router.register(r'templates', views.SMSTemplateViewSet, basename='smstemplate')
router.register(r'messages', views.SMSMessageViewSet, basename='smsmessage')
router.register(r'inbound', views.SMSInboundViewSet, basename='smsinbound')

urlpatterns = [
    path('', include(router.urls)),
    path('balance/', views.sms_balance, name='sms-balance'),
    path('appointment/<uuid:appointment_id>/reminder/', views.send_appointment_reminder, name='send-appointment-reminder'),
    # Patient-specific endpoints
    path('conversations/', patient_views.conversation_list, name='sms-conversation-list'),
    path('patient/<uuid:patient_id>/conversation/', patient_views.patient_conversation, name='patient-sms-conversation'),
    path('patient/<uuid:patient_id>/phones/', patient_views.patient_phone_numbers, name='patient-phone-numbers'),
    path('patient/<uuid:patient_id>/send/', patient_views.patient_send_sms, name='patient-send-sms'),
    path('patient/<uuid:patient_id>/unread-count/', patient_views.patient_unread_count, name='patient-sms-unread-count'),
    path('patient/<uuid:patient_id>/mark-read/', patient_views.patient_mark_read, name='patient-sms-mark-read'),
    # SMS History endpoints
    path('history/', patient_views.sms_history, name='sms-history'),
    path('history/<uuid:message_id>/', patient_views.delete_sms_message, name='delete-sms-message'),
    # Webhook endpoints (CSRF exempt - called by SMS Broadcast)
    path('webhook/dlr/', views.sms_delivery_receipt, name='sms-delivery-receipt'),
    path('webhook/inbound/', webhook_views.sms_inbound, name='sms-inbound'),
    # Global SMS notification widget endpoints
    path('unread-count/', views.global_unread_count, name='global-unread-count'),
    path('inbound/<uuid:message_id>/', views.get_inbound_message, name='get-inbound-message'),
]
