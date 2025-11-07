"""
Admin interface for Notes
"""
from django.contrib import admin
from .models import Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    """Admin interface for Note model"""
    list_display = ['id', 'patient', 'note_type', 'created_at', 'updated_at', 'created_by']
    list_filter = ['note_type', 'created_at']
    search_fields = ['patient__first_name', 'patient__last_name', 'content']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
