#!/usr/bin/env python3
import os
import psycopg2

DB_PASSWORD = os.getenv('DB_PASSWORD')
if not DB_PASSWORD:
    print("ERROR: DB_PASSWORD not set")
    exit(1)

try:
    conn = psycopg2.connect(
        host='/cloudsql/nexus-walkeasy-prod:australia-southeast1:nexus-production-db',
        database='nexus_production',
        user='postgres',
        password=DB_PASSWORD
    )
    cur = conn.cursor()
    
    # Get all tables
    cur.execute("""
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
    """)
    tables = [row[0] for row in cur.fetchall()]
    
    print(f"Found {len(tables)} tables")
    
    # Drop all tables
    for table in tables:
        cur.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
        print(f"Dropped: {table}")
    
    conn.commit()
    print(f"\nSuccessfully dropped {len(tables)} tables")
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"ERROR: {e}")
    exit(1)

