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
        ('medical', 'Medical Records'),
        ('prescription', 'Prescription'),
        ('referral', 'Referral Letter'),
        ('xray', 'X-Ray / Imaging'),
        ('invoice', 'Invoice'),
        ('quote', 'Quote'),
        ('consent', 'Consent Form'),
        ('insurance', 'Insurance Document'),
        ('dorsal', 'Dorsal'),
        ('plantar', 'Plantar'),
        ('posterior', 'Posterior'),
        ('anterior', 'Anterior'),
        ('medial', 'Medial'),
        ('lateral', 'Lateral'),
        ('wound', 'Wound'),
        ('right_leg', 'Right Leg'),
        ('left_leg', 'Left Leg'),
        ('l_brannock', 'L-Brannock'),
        ('r_brannock', 'R-Brannock'),
        ('r_mfoot_length', 'R-MFoot Length'),
        ('r_mfoot_width', 'R-MFoot Width'),
        ('l_mfoot_length', 'L-MFoot Length'),
        ('l_mfoot_width', 'L-MFoot Width'),
        ('casts', 'Casts'),
        ('left_lat', 'Left Lat'),
        ('right_lat', 'Right Lat'),
        ('r_shoe', 'R-Shoe'),
        ('l_shoe', 'L-Shoe'),
        ('afo', 'AFO'),
        ('x_ray', 'X-Ray'),
        ('cmo', 'CMO'),
        ('other', 'Other'),
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
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['category']),
            models.Index(fields=['uploaded_at']),
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
