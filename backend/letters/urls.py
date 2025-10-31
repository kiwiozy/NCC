from django.urls import path
from . import views

app_name = 'letters'

urlpatterns = [
    path('generate-pdf/', views.generate_pdf, name='generate-pdf'),
    path('email/', views.email_letter, name='email'),
]

