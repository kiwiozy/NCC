from django.contrib import admin
from .models import Coordinator, PatientCoordinator


@admin.register(Coordinator)
class CoordinatorAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'coordinator_type', 'organization']
    list_filter = ['coordinator_type']
    search_fields = ['first_name', 'last_name', 'organization']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('id', 'first_name', 'last_name', 'coordinator_type', 'organization')
        }),
        ('Contact Information', {
            'fields': ('contact_json',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    full_name.short_description = 'Name'


@admin.register(PatientCoordinator)
class PatientCoordinatorAdmin(admin.ModelAdmin):
    list_display = ['patient', 'coordinator', 'assignment_date', 'is_current', 'ndis_plan_start', 'ndis_plan_end']
    list_filter = ['is_current', 'assignment_date']
    search_fields = ['patient__first_name', 'patient__last_name', 'coordinator__first_name', 'coordinator__last_name']
    raw_id_fields = ['patient', 'coordinator']
    date_hierarchy = 'assignment_date'
    readonly_fields = ['filemaker_id']
    
    fieldsets = (
        ('Relationship', {
            'fields': ('patient', 'coordinator', 'assignment_date', 'end_date', 'is_current')
        }),
        ('NDIS Plan Information', {
            'fields': ('ndis_plan_start', 'ndis_plan_end', 'ndis_notes')
        }),
        ('Import Tracking', {
            'fields': ('filemaker_id',)
        }),
    )
