from django.urls import path
from .views import RewriteClinicalNotesView, ExtractATReportView

urlpatterns = [
    path('rewrite-clinical-notes/', RewriteClinicalNotesView.as_view(), name='rewrite-clinical-notes'),
    path('extract-at-report/', ExtractATReportView.as_view(), name='extract-at-report'),
]

