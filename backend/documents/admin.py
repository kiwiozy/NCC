from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = [
        'original_name',
        'category',
        'file_size_display',
        'uploaded_by',
        'uploaded_at',
        'is_active',
    ]
    list_filter = ['category', 'is_active', 'uploaded_at']
    search_fields = ['original_name', 'description', 'uploaded_by']
    readonly_fields = [
        'id',
        'file_name',
        'file_size',
        'mime_type',
        's3_bucket',
        's3_key',
        'uploaded_at',
        'updated_at',
    ]
    
    fieldsets = (
        ('File Information', {
            'fields': ('id', 'file_name', 'original_name', 'file_size', 'mime_type')
        }),
        ('S3 Storage', {
            'fields': ('s3_bucket', 's3_key', 's3_url')
        }),
        ('Classification', {
            'fields': ('category', 'description', 'tags')
        }),
        ('Linked Object', {
            'fields': ('content_type', 'object_id')
        }),
        ('Metadata', {
            'fields': ('uploaded_by', 'uploaded_at', 'updated_at', 'is_active')
        }),
    )
    
    def file_size_display(self, obj):
        return obj.get_file_size_display()
    file_size_display.short_description = 'File Size'
