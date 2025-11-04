"""
Django management command to create mock patient data for development and testing.

Usage:
    python manage.py create_mock_patients --count 50
    python manage.py create_mock_patients --count 100 --clear
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
import random
from patients.models import Patient
from clinicians.models import Clinic
from settings.models import FundingSource


class Command(BaseCommand):
    help = 'Create mock patient data for development and testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Number of mock patients to create (default: 50)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing patients before creating new ones'
        )

    def handle(self, *args, **options):
        count = options['count']
        clear = options['clear']

        if clear:
            self.stdout.write(self.style.WARNING('Clearing all existing patients...'))
            Patient.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✓ All patients cleared'))

        # Get existing clinics and funding sources
        clinics = list(Clinic.objects.all())
        funding_sources = list(FundingSource.objects.filter(active=True))

        if not clinics:
            self.stdout.write(self.style.WARNING('⚠ No clinics found. Creating mock patients without clinic assignment.'))
        
        if not funding_sources:
            self.stdout.write(self.style.WARNING('⚠ No funding sources found. Creating mock patients without funding type.'))

        # First names pool
        first_names = [
            'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'James', 'Olivia',
            'Robert', 'Sophia', 'William', 'Isabella', 'Richard', 'Charlotte',
            'Joseph', 'Mia', 'Thomas', 'Amelia', 'Charles', 'Harper',
            'Christopher', 'Evelyn', 'Daniel', 'Abigail', 'Matthew', 'Emily',
            'Anthony', 'Elizabeth', 'Mark', 'Sofia', 'Donald', 'Avery',
            'Steven', 'Ella', 'Paul', 'Scarlett', 'Andrew', 'Grace',
            'Joshua', 'Victoria', 'Kenneth', 'Aria', 'Kevin', 'Chloe',
            'Brian', 'Luna', 'George', 'Penelope', 'Edward', 'Layla'
        ]

        # Last names pool
        last_names = [
            'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
            'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson',
            'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
            'Lee', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
            'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen',
            'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill',
            'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall',
            'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
        ]

        # Titles
        titles = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof']

        # Sex choices
        sex_choices = ['M', 'F', 'O', 'U']

        self.stdout.write(self.style.SUCCESS(f'Creating {count} mock patients...'))

        created_count = 0
        for i in range(count):
            # Generate random data
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            middle_names = random.choice([None, 'Anne', 'Marie', 'John', 'Lee', 'James', 'Rose'])
            
            # Generate DOB (ages between 18 and 85)
            age = random.randint(18, 85)
            dob = date.today() - timedelta(days=age * 365 + random.randint(0, 364))
            
            # Random clinic and funding source
            clinic = random.choice(clinics) if clinics else None
            funding_type = random.choice(funding_sources) if funding_sources else None
            
            # Generate contact info
            phone = f"04{random.randint(10000000, 99999999)}"
            email = f"{first_name.lower()}.{last_name.lower()}@example.com"
            
            # Some patients have coordinator info
            has_coordinator = random.choice([True, False, False])  # 33% have coordinator
            coordinator_name = None
            coordinator_date = None
            if has_coordinator:
                coordinators = ['Warda - Ability Connect', 'Sarah - NDIS Support', 'Michael - Care Coordination']
                coordinator_name = random.choice(coordinators)
                coordinator_date = date.today() - timedelta(days=random.randint(1, 365))
            
            # Some patients have plan dates
            has_plan = random.choice([True, False])  # 50% have plan dates
            plan_start_date = None
            plan_end_date = None
            if has_plan:
                plan_start_date = date.today() - timedelta(days=random.randint(30, 365))
                plan_end_date = plan_start_date + timedelta(days=365)  # 1 year plan
            
            # Create patient
            patient = Patient.objects.create(
                mrn=f"MRN{random.randint(10000, 99999)}" if random.choice([True, False]) else None,
                title=random.choice([None, None, None, random.choice(titles)]),  # 75% have no title
                first_name=first_name,
                middle_names=middle_names,
                last_name=last_name,
                dob=dob,
                sex=random.choice(sex_choices),
                health_number=f"H{random.randint(1000000, 9999999)}" if random.choice([True, False]) else None,
                clinic=clinic,
                funding_type=funding_type,
                coordinator_name=coordinator_name,
                coordinator_date=coordinator_date,
                plan_start_date=plan_start_date,
                plan_end_date=plan_end_date,
                contact_json={
                    'phone': phone,
                    'email': email,
                    'mobile': phone,
                },
                address_json={
                    'street': f"{random.randint(1, 999)} {random.choice(['Main', 'High', 'Park', 'Oak', 'Elm'])} Street",
                    'city': random.choice(['Newcastle', 'Tamworth', 'Port Macquarie', 'Armidale', 'Sydney']),
                    'state': 'NSW',
                    'postcode': str(random.randint(2000, 2999)),
                },
                notes=random.choice([
                    None,
                    'Regular patient, follow up in 3 months',
                    'Requires wheelchair access',
                    'Prefers morning appointments',
                    'Allergic to latex',
                ]),
            )
            
            created_count += 1
            if created_count % 10 == 0:
                self.stdout.write(f'  Created {created_count}/{count} patients...')

        self.stdout.write(self.style.SUCCESS(f'✓ Successfully created {created_count} mock patients'))
        self.stdout.write(self.style.SUCCESS(f'  - Total patients in database: {Patient.objects.count()}'))

