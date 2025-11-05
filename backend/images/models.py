"""
Image storage models for patient photos and clinical images.

Images are organized into batches (upload sessions), each batch can contain
multiple images. Batches can be auto-named by date/time or custom named by users.
"""

import uuid
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model

User = get_user_model()


class ImageBatch(models.Model):
    """
    A batch/folder of images uploaded together.
    
    Supports:
    - Auto-naming by upload datetime
    - Custom naming by user
    - Linking to any model (Patient, Appointment, etc.) via Generic FK
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Generic foreign key for linking to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Batch metadata
    name = models.CharField(
        max_length=255,
        help_text="Auto-generated or custom batch name (e.g., 'Pre-Surgery Photos', 'Uploaded 5 Nov 2025')"
    )
    description = models.TextField(blank=True, help_text="Optional description of this batch")
    
    # Upload tracking
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # Metadata
    image_count = models.IntegerField(default=0, help_text="Number of images in this batch")
    
    class Meta:
        db_table = 'images_batch'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['uploaded_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.image_count} images)"
    
    def update_image_count(self):
        """Update the cached image count"""
        self.image_count = self.images.count()
        self.save(update_fields=['image_count'])


class Image(models.Model):
    """
    Individual image stored in S3, linked to a batch.
    
    Supports:
    - S3 storage with presigned URLs
    - Image categories (anatomical views, document types)
    - Thumbnails (optional)
    - Individual metadata (caption, date taken)
    """
    
    # Image types/categories (from BatchUpload.tsx)
    IMAGE_CATEGORIES = [
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
        ('x_ray_doc', 'X-Ray (Document)'),
        ('cmo', 'CMO'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to batch
    batch = models.ForeignKey(
        ImageBatch,
        on_delete=models.CASCADE,
        related_name='images'
    )
    
    # S3 storage
    s3_key = models.CharField(
        max_length=500,
        help_text="S3 object key (path in bucket)"
    )
    s3_thumbnail_key = models.CharField(
        max_length=500,
        blank=True,
        help_text="S3 key for thumbnail (optional)"
    )
    
    # File metadata
    original_name = models.CharField(max_length=255)
    file_size = models.IntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=100, default='image/jpeg')
    width = models.IntegerField(null=True, blank=True, help_text="Image width in pixels")
    height = models.IntegerField(null=True, blank=True, help_text="Image height in pixels")
    
    # Image metadata
    category = models.CharField(
        max_length=50,
        choices=IMAGE_CATEGORIES,
        default='other'
    )
    caption = models.TextField(blank=True, help_text="Optional caption/notes")
    date_taken = models.DateField(null=True, blank=True, help_text="Date photo was taken")
    
    # Upload tracking
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # Order within batch
    order = models.IntegerField(default=0, help_text="Display order within batch")
    
    class Meta:
        db_table = 'images_image'
        ordering = ['batch', 'order', 'uploaded_at']
        indexes = [
            models.Index(fields=['batch', 'order']),
            models.Index(fields=['uploaded_at']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return f"{self.original_name} ({self.category})"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update batch image count
        if self.batch_id:
            self.batch.update_image_count()
    
    def delete(self, *args, **kwargs):
        batch = self.batch
        super().delete(*args, **kwargs)
        # Update batch image count after deletion
        if batch:
            batch.update_image_count()
