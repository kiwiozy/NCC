from django.contrib import admin
from .models import Specialty, Referrer, PatientReferrer, ReferrerCompany


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name', 'description']
    ordering = ['name']


@admin.register(Referrer)
class ReferrerAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'specialty', 'filemaker_id']
    list_filter = ['specialty']
    search_fields = ['first_name', 'last_name', 'specialty__name']
    raw_id_fields = ['specialty']
    readonly_fields = ['id', 'filemaker_id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('id', 'title', 'first_name', 'last_name', 'specialty')
        }),
        ('Contact Information', {
            'fields': ('contact_json', 'address_json')
        }),
        ('Import Tracking', {
            'fields': ('filemaker_id', 'created_at', 'updated_at')
        }),
    )
    
    def full_name(self, obj):
        return f"{obj.title} {obj.first_name} {obj.last_name}"
    full_name.short_description = 'Name'


@admin.register(PatientReferrer)
class PatientReferrerAdmin(admin.ModelAdmin):
    list_display = ['patient', 'referrer', 'referral_date', 'status']
    list_filter = ['status', 'referral_date']
    search_fields = ['patient__first_name', 'patient__last_name', 'referrer__first_name', 'referrer__last_name']
    raw_id_fields = ['patient', 'referrer']
    date_hierarchy = 'referral_date'


@admin.register(ReferrerCompany)
class ReferrerCompanyAdmin(admin.ModelAdmin):
    list_display = ['referrer', 'company', 'start_date', 'is_current']
    list_filter = ['is_current', 'start_date']
    search_fields = ['referrer__first_name', 'referrer__last_name', 'company__name']
    raw_id_fields = ['referrer', 'company']
    date_hierarchy = 'start_date'
