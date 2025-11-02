# backend/letters/views.py
from rest_framework import viewsets
from .models import Letter
from .serializers import LetterSerializer

class LetterViewSet(viewsets.ModelViewSet):
    queryset = Letter.objects.all().order_by('-created_at')
    serializer_class = LetterSerializer
