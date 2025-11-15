"""
URL Configuration for Data Management API
"""
from django.urls import path
from . import views

urlpatterns = [
    path('status/', views.data_status, name='data_status'),
    path('filemaker-status/', views.filemaker_status, name='filemaker_status'),
    path('dry-run/', views.dry_run, name='dry_run'),
    path('reimport/', views.reimport, name='reimport'),
]

