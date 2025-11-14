# Django URLs example

from django.urls import path, include
from rest_framework import routers
from letters.views import LetterViewSet
from letters.pdf_views import generate_letter_pdf

router = routers.DefaultRouter()
router.register(r'letters', LetterViewSet, basename='letter')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/letters/<int:pk>/pdf/', generate_letter_pdf),
]
