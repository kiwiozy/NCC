"""
Django management command to drop all tables
Usage: python manage.py drop_all_tables
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Drop all tables in the database (for clean migration)'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Get all table names
            cursor.execute("""
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename NOT LIKE 'pg_%'
                AND tablename != 'django_migrations'
            """)
            tables = [row[0] for row in cursor.fetchall()]
            
            self.stdout.write(f"Found {len(tables)} tables to drop")
            
            if not tables:
                self.stdout.write(self.style.SUCCESS("No tables to drop"))
                return
            
            # Drop all tables with CASCADE
            for table in tables:
                try:
                    cursor.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
                    self.stdout.write(self.style.SUCCESS(f"✅ Dropped: {table}"))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"⚠️  {table}: {e}"))
            
            # Also drop the migrations table
            cursor.execute('DROP TABLE IF EXISTS "django_migrations" CASCADE')
            
            self.stdout.write(self.style.SUCCESS(f"\n✅ Dropped {len(tables)} tables successfully!"))

