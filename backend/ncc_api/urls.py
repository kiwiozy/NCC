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
from notes.views import NoteViewSet
from . import auth_views

# Create API router
router = routers.DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'clinics', ClinicViewSet, basename='clinic')
router.register(r'clinicians', ClinicianViewSet, basename='clinician')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'encounters', EncounterViewSet, basename='encounter')
router.register(r'reminders', ReminderViewSet, basename='reminder')
router.register(r'notes', NoteViewSet, basename='note')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    # Authentication endpoints
    path('api/auth/user/', auth_views.user_info, name='user-info'),
    path('api/auth/logout/', auth_views.logout_view, name='logout-api'),  # Custom logout endpoint
    path('api/auth/csrf-token/', auth_views.csrf_token, name='csrf-token'),  # CSRF token endpoint
    path('api/auth/google/login/', auth_views.google_login_direct, name='google-login-direct'),  # Direct Google login (skips intermediate page) - not using @api_view decorator
    # Login redirect (redirects to frontend after login)
    path('', auth_views.login_redirect, name='login-redirect'),
    # Allauth URLs (for Google OAuth)
    path('accounts/', include('allauth.urls')),
    # Project URLs
    path('xero/', include('xero_integration.urls')),
    path('api/sms/', include('sms_integration.urls')),
    path('gmail/', include('gmail_integration.urls')),
    path('api/', include('documents.urls')),  # S3 document management
    path('api/images/', include('images.urls')),  # Patient images
    path('api/ai/', include('ai_services.urls')),  # AI services
    path('api/settings/', include('settings.urls')),  # Settings management (Funding Sources)
    path('api/letters/', include('letters.urls')),  # Patient letters
]
