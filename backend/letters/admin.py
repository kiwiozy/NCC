from django.contrib import admin
from .models import PatientLetter


@admin.register(PatientLetter)
class PatientLetterAdmin(admin.ModelAdmin):
    list_display = ['letter_type', 'patient', 'recipient_name', 'updated_at', 'created_at']
    list_filter = ['letter_type', 'created_at']
    search_fields = ['letter_type', 'recipient_name', 'subject', 'patient__first_name', 'patient__last_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'

