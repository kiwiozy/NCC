#!/usr/bin/env python
"""
Drop all tables in the database for clean migration
Run this before migrations to start fresh
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings_production')
django.setup()

from django.db import connection

def drop_all_tables():
    """Drop all tables in the database"""
    with connection.cursor() as cursor:
        # Disable foreign key checks temporarily
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;" if connection.vendor == 'mysql' else "")
        
        # Get all table names
        if connection.vendor == 'postgresql':
            cursor.execute("""
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename NOT LIKE 'pg_%'
            """)
            tables = [row[0] for row in cursor.fetchall()]
        else:
            cursor.execute("SHOW TABLES")
            tables = [row[0] for row in cursor.fetchall()]
        
        print(f"Found {len(tables)} tables to drop")
        
        # Drop all tables
        for table in tables:
            try:
                cursor.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
                print(f"✅ Dropped table: {table}")
            except Exception as e:
                print(f"⚠️  Error dropping {table}: {e}")
        
        # Re-enable foreign key checks
        if connection.vendor == 'mysql':
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        
        print("\n✅ All tables dropped successfully!")

if __name__ == '__main__':
    drop_all_tables()

