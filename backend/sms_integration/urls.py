"""
SMS Integration URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'templates', views.SMSTemplateViewSet, basename='smstemplate')
router.register(r'messages', views.SMSMessageViewSet, basename='smsmessage')
router.register(r'inbound', views.SMSInboundViewSet, basename='smsinbound')

urlpatterns = [
    path('', include(router.urls)),
    path('balance/', views.sms_balance, name='sms-balance'),
    path('appointment/<uuid:appointment_id>/reminder/', views.send_appointment_reminder, name='send-appointment-reminder'),
]

