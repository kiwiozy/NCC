"""
PatientLetter models for WalkEasy Nexus
"""
import uuid
from django.db import models
from django.utils import timezone
from patients.models import Patient


class PatientLetter(models.Model):
    """
    Patient correspondence/letters system.
    Stores letters written for patients with full TipTap editor content.
    """
    
    # Primary identifier
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique letter identifier (UUID)"
    )
    
    # Patient relationship
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='letters',
        help_text="Patient this letter is for"
    )
    
    # Letter metadata
    letter_type = models.CharField(
        max_length=255,
        help_text="Type of letter (e.g., Support Letter, Follow-up Letter, etc.)"
    )
    
    recipient_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Recipient's name (optional)"
    )
    
    subject = models.CharField(
        max_length=255,
        blank=True,
        help_text="Letter subject/title (optional)"
    )
    
    # Letter content (array of HTML pages from TipTap)
    pages = models.JSONField(
        default=list,
        help_text="Array of HTML content for each page: ['<p>Page 1...</p>', '<p>Page 2...</p>']"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the letter was created"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When the letter was last modified"
    )
    
    class Meta:
        ordering = ['-updated_at']  # Most recent first
        indexes = [
            models.Index(fields=['patient', '-updated_at']),
            models.Index(fields=['letter_type']),
        ]
    
    def __str__(self):
        return f"{self.letter_type} - {self.patient.first_name} {self.patient.last_name} ({self.updated_at.strftime('%Y-%m-%d')})"
    
    def get_preview_text(self, max_length=100):
        """Get preview text from first page"""
        if not self.pages or len(self.pages) == 0:
            return ""
        
        # Strip HTML tags for preview
        import re
        first_page = self.pages[0]
        text = re.sub('<[^<]+?>', '', first_page)
        text = text.strip()
        
        if len(text) > max_length:
            return text[:max_length] + "..."
        return text

