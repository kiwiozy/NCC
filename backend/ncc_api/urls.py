"""
URL configuration for ncc_api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from patients.views import PatientViewSet
from clinicians.views import ClinicViewSet, ClinicianViewSet
from appointments.views import AppointmentViewSet, EncounterViewSet
from reminders.views import ReminderViewSet

# Create API router
router = routers.DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'clinics', ClinicViewSet, basename='clinic')
router.register(r'clinicians', ClinicianViewSet, basename='clinician')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'encounters', EncounterViewSet, basename='encounter')
router.register(r'reminders', ReminderViewSet, basename='reminder')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('xero/', include('xero_integration.urls')),
    path('api/sms/', include('sms_integration.urls')),
    path('gmail/', include('gmail_integration.urls')),
    path('api/', include('documents.urls')),  # S3 document management
    path('api/ai/', include('ai_services.urls')),  # AI services
    path('api/settings/', include('settings.urls')),  # Settings management (Funding Sources)
]
