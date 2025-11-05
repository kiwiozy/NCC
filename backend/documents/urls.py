from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet
from .proxy_views import proxy_document_download

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
    # Proxy endpoint for document downloads (avoids CORS issues)
    path('documents/<uuid:document_id>/proxy/', proxy_document_download, name='document-proxy'),
]

