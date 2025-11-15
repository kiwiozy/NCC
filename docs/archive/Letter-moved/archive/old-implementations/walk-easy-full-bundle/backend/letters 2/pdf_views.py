# backend/letters/pdf_views.py
import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Letter

NEXT_PDF_URL = "http://nextjs:3000/api/letters/{id}/pdf"

@api_view(['POST'])
def generate_letter_pdf(request, pk):
    letter = Letter.objects.get(pk=pk)
    res = requests.post(
        NEXT_PDF_URL.format(id=pk),
        json={'html': letter.html},
    )
    return Response(res.content, content_type='application/pdf')
