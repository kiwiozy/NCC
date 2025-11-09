from django.contrib import admin
from .models import GeneralContact, ContactRelationship


@admin.register(GeneralContact)
class GeneralContactAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'contact_type']
    list_filter = ['contact_type']
    search_fields = ['first_name', 'last_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('id', 'first_name', 'last_name', 'contact_type')
        }),
        ('Contact Information', {
            'fields': ('contact_json', 'address_json')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    full_name.short_description = 'Name'


@admin.register(ContactRelationship)
class ContactRelationshipAdmin(admin.ModelAdmin):
    list_display = ['from_contact_display', 'relationship_type', 'to_contact_display', 'is_active']
    list_filter = ['relationship_type', 'is_active']
    search_fields = ['notes']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('From Contact (GenericForeignKey)', {
            'fields': ('from_content_type', 'from_object_id')
        }),
        ('Relationship', {
            'fields': ('relationship_type', 'notes', 'is_active')
        }),
        ('To Contact (GenericForeignKey)', {
            'fields': ('to_content_type', 'to_object_id')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at')
        }),
    )
    
    def from_contact_display(self, obj):
        return str(obj.from_contact) if obj.from_contact else 'N/A'
    from_contact_display.short_description = 'From'
    
    def to_contact_display(self, obj):
        return str(obj.to_contact) if obj.to_contact else 'N/A'
    to_contact_display.short_description = 'To'
