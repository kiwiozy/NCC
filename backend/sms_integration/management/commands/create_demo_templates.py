"""
Management command to create demo SMS templates
Run: python manage.py create_demo_templates
"""
from django.core.management.base import BaseCommand
from sms_integration.models import SMSTemplate


class Command(BaseCommand):
    help = 'Create demo SMS templates for testing'

    def handle(self, *args, **options):
        templates = [
            {
                'name': 'appointment_reminder',
                'description': 'Appointment reminder template',
                'message_template': 'Hi {patient_name}, this is a reminder that you have an appointment on {appointment_date} at {appointment_time}. Please reply CONFIRM to confirm or CANCEL to cancel. Thank you!',
                'is_active': True,
            },
            {
                'name': 'appointment_confirmation',
                'description': 'Appointment confirmation template',
                'message_template': 'Hi {patient_name}, your appointment has been confirmed for {appointment_date} at {appointment_time} at {clinic_name}. We look forward to seeing you!',
                'is_active': True,
            },
            {
                'name': 'test_message',
                'description': 'Simple test message template',
                'message_template': 'Hi {patient_name}, this is a test message from Walk Easy Pedorthics. Thank you!',
                'is_active': True,
            },
        ]

        created_count = 0
        updated_count = 0

        for template_data in templates:
            template, created = SMSTemplate.objects.update_or_create(
                name=template_data['name'],
                defaults={
                    'description': template_data['description'],
                    'message_template': template_data['message_template'],
                    'is_active': template_data['is_active'],
                }
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created template: {template.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'↻ Updated template: {template.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Created {created_count} templates, updated {updated_count} templates'
            )
        )

