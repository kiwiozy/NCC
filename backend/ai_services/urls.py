from django.urls import path
from .views import (
    RewriteClinicalNotesView,
    ExtractATReportView,
    GenerateATPDFView,
    EmailATReportView,
    TestEmailView
)

urlpatterns = [
    path('rewrite-clinical-notes/', RewriteClinicalNotesView.as_view(), name='rewrite-clinical-notes'),
    path('extract-at-report/', ExtractATReportView.as_view(), name='extract-at-report'),
    path('generate-at-pdf/', GenerateATPDFView.as_view(), name='generate-at-pdf'),
    path('email-at-report/', EmailATReportView.as_view(), name='email-at-report'),
    path('test-email/', TestEmailView.as_view(), name='test-email'),
]

