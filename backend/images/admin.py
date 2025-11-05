from django.contrib import admin
from .models import ImageBatch, Image


@admin.register(ImageBatch)
class ImageBatchAdmin(admin.ModelAdmin):
    list_display = ('name', 'image_count', 'uploaded_by', 'uploaded_at', 'content_type', 'object_id')
    list_filter = ('uploaded_at', 'content_type')
    search_fields = ('name', 'description')
    readonly_fields = ('id', 'uploaded_at', 'image_count')
    
    fieldsets = (
        ('Batch Information', {
            'fields': ('id', 'name', 'description', 'image_count')
        }),
        ('Linked To', {
            'fields': ('content_type', 'object_id')
        }),
        ('Upload Information', {
            'fields': ('uploaded_by', 'uploaded_at')
        }),
    )


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ('original_name', 'batch', 'category', 'file_size_mb', 'width', 'height', 'uploaded_at')
    list_filter = ('category', 'uploaded_at', 'batch')
    search_fields = ('original_name', 'caption', 'batch__name')
    readonly_fields = ('id', 'uploaded_at', 'file_size_mb')
    
    fieldsets = (
        ('Image Information', {
            'fields': ('id', 'original_name', 'batch', 'order')
        }),
        ('S3 Storage', {
            'fields': ('s3_key', 's3_thumbnail_key')
        }),
        ('File Details', {
            'fields': ('file_size', 'file_size_mb', 'mime_type', 'width', 'height')
        }),
        ('Metadata', {
            'fields': ('category', 'caption', 'date_taken')
        }),
        ('Upload Information', {
            'fields': ('uploaded_by', 'uploaded_at')
        }),
    )
    
    def file_size_mb(self, obj):
        """Display file size in MB"""
        return f"{obj.file_size / (1024 * 1024):.2f} MB"
    file_size_mb.short_description = 'File Size (MB)'
