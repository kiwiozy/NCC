from django.urls import path
from .views import RewriteClinicalNotesView

urlpatterns = [
    path('rewrite-clinical-notes/', RewriteClinicalNotesView.as_view(), name='rewrite-clinical-notes'),
]

