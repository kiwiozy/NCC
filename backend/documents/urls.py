from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet
from .proxy_views import DocumentProxyView

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
    path('documents/<uuid:pk>/proxy/', DocumentProxyView.as_view(), name='document-proxy'),
]

