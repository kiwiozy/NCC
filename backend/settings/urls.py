"""
URL routing for Settings API
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FundingSourceViewSet

router = DefaultRouter()
router.register(r'funding-sources', FundingSourceViewSet, basename='funding-source')

urlpatterns = [
    path('', include(router.urls)),
]

