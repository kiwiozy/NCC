"""
Management command to update all email templates from green to blue

This fixes templates that were created with the old green color (#10b981)
and updates them to the new WalkEasy Blue (#5b95cf)
"""
from django.core.management.base import BaseCommand
from invoices.models import EmailTemplate


class Command(BaseCommand):
    help = 'Update all email templates from green to WalkEasy Blue'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🔍 Checking email templates for green colors...'))
        
        # Find all templates with green color
        green_templates = EmailTemplate.objects.filter(header_color='#10b981')
        count = green_templates.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('✅ No templates found with green color!'))
            return
        
        self.stdout.write(self.style.WARNING(f'Found {count} templates with green color'))
        
        # Update all to blue
        for template in green_templates:
            old_color = template.header_color
            template.header_color = '#5b95cf'
            template.save()
            self.stdout.write(
                self.style.SUCCESS(f'✅ Updated template "{template.name}" from {old_color} to #5b95cf')
            )
        
        self.stdout.write(self.style.SUCCESS(f'\n🎉 Successfully updated {count} templates to WalkEasy Blue!'))

