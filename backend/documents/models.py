import uuid
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class Document(models.Model):
    """
    Document model for storing file metadata.
    Actual files are stored in AWS S3.
    Uses Generic Foreign Key to link to any model (Patient, Appointment, etc.)
    """
    
    CATEGORY_CHOICES = [
        ('erf', 'ERF'),
        ('purchase_order', 'Purchase Order'),
        ('referral', 'Referral'),
        ('enablensw_application', 'EnableNSW Application'),
        ('remittance_advice', 'Remittance Advice'),
        ('quote', 'Quote'),
        ('medical', 'Medical Records'),
        ('prescription', 'Prescription'),
        ('xray', 'X-Ray / Imaging'),
        ('consent', 'Consent Form'),
        ('insurance', 'Insurance Document'),
        ('invoice', 'Invoice'),
        ('other', 'Other')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Generic relation to link to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.UUIDField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # File information
    file_name = models.CharField(max_length=255)
    original_name = models.CharField(max_length=255)
    file_size = models.IntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=100)
    
    # S3 information
    s3_bucket = models.CharField(max_length=255)
    s3_key = models.CharField(max_length=512, help_text="S3 object key/path")
    s3_url = models.URLField(max_length=1024, blank=True, help_text="Pre-signed or public URL")
    
    # Metadata
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    description = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    
    # Audit fields
    uploaded_by = models.CharField(max_length=100, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    document_date = models.DateField(
        null=True,
        blank=True,
        help_text='Date associated with this document (e.g., document issue date)'
    )
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    # FileMaker import tracking
    filemaker_id = models.UUIDField(
        null=True,
        blank=True,
        unique=True,
        help_text='Original FileMaker document ID (from API_Docs.id) - for imported documents only'
    )
    
    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['category']),
            models.Index(fields=['uploaded_at']),
            models.Index(fields=['filemaker_id']),  # For FileMaker import lookups
        ]
    
    def __str__(self):
        return f"{self.original_name} ({self.category})"
    
    def get_file_size_display(self):
        """Return human-readable file size"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
