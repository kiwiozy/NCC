"""
Django management command to sync clinic assignments from FileMaker metadata.

This command reads the filemaker_metadata.filemaker_clinic field and sets the
patient.clinic ForeignKey to the matching Clinic record.

Usage:
    python manage.py sync_filemaker_clinics
    python manage.py sync_filemaker_clinics --dry-run  # Preview changes without saving
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from patients.models import Patient
from clinicians.models import Clinic


class Command(BaseCommand):
    help = 'Sync clinic assignments from FileMaker metadata to patient.clinic field'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without saving to database',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN MODE - No changes will be saved\n'))
        
        self.stdout.write(self.style.SUCCESS('\n========================================'))
        self.stdout.write(self.style.SUCCESS('📋 Syncing Clinic Assignments'))
        self.stdout.write(self.style.SUCCESS('========================================\n'))
        
        # Get all clinics
        clinics = list(Clinic.objects.all())
        clinic_map = {clinic.name.lower(): clinic for clinic in clinics}
        
        self.stdout.write(f'Found {len(clinics)} clinics in database:')
        for clinic in clinics:
            self.stdout.write(f'  • {clinic.name}')
        self.stdout.write('')
        
        # Get all patients with FileMaker metadata that have a filemaker_clinic
        patients = Patient.objects.filter(
            filemaker_metadata__isnull=False
        ).exclude(
            filemaker_metadata__filemaker_clinic__isnull=True
        ).exclude(
            filemaker_metadata__filemaker_clinic=''
        )
        
        total_patients = patients.count()
        self.stdout.write(f'Found {total_patients} patients with FileMaker clinic metadata\n')
        
        # Statistics
        updated_count = 0
        skipped_no_match = 0
        skipped_already_set = 0
        clinic_stats = {}
        
        # Process each patient
        for patient in patients:
            filemaker_clinic = patient.filemaker_metadata.get('filemaker_clinic', '').strip()
            
            if not filemaker_clinic:
                continue
            
            # Try to find matching clinic (case-insensitive)
            clinic = clinic_map.get(filemaker_clinic.lower())
            
            if not clinic:
                skipped_no_match += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'⚠️  No clinic match for "{filemaker_clinic}" (Patient: {patient.first_name} {patient.last_name})'
                    )
                )
                continue
            
            # Check if clinic is already set correctly
            if patient.clinic == clinic:
                skipped_already_set += 1
                continue
            
            # Update the patient's clinic
            if not dry_run:
                patient.clinic = clinic
                patient.save(update_fields=['clinic'])
            
            updated_count += 1
            
            # Track statistics
            clinic_name = clinic.name
            if clinic_name not in clinic_stats:
                clinic_stats[clinic_name] = 0
            clinic_stats[clinic_name] += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ {"[DRY RUN] Would set" if dry_run else "Set"} {patient.first_name} {patient.last_name} → {clinic.name}'
                )
            )
        
        # Print summary
        self.stdout.write(self.style.SUCCESS('\n========================================'))
        self.stdout.write(self.style.SUCCESS('📊 Summary'))
        self.stdout.write(self.style.SUCCESS('========================================\n'))
        
        self.stdout.write(f'Total patients processed: {total_patients}')
        self.stdout.write(self.style.SUCCESS(f'✅ Updated: {updated_count}'))
        self.stdout.write(f'⏭️  Skipped (already set): {skipped_already_set}')
        if skipped_no_match > 0:
            self.stdout.write(self.style.WARNING(f'⚠️  Skipped (no clinic match): {skipped_no_match}'))
        
        if clinic_stats:
            self.stdout.write('\nPatients assigned by clinic:')
            for clinic_name, count in sorted(clinic_stats.items(), key=lambda x: x[1], reverse=True):
                self.stdout.write(f'  • {clinic_name}: {count} patients')
        
        self.stdout.write(self.style.SUCCESS('\n========================================'))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 DRY RUN COMPLETE - No changes were saved'))
            self.stdout.write(self.style.WARNING('Run without --dry-run to apply changes'))
        else:
            self.stdout.write(self.style.SUCCESS('✅ SYNC COMPLETE'))
        
        self.stdout.write(self.style.SUCCESS('========================================\n'))

