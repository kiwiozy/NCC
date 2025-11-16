#!/usr/bin/env python3
"""
Drop all tables using raw SQL connection
Doesn't require Django setup
"""
import os
import psycopg2
from google.cloud.sql.connector import Connector
import sqlalchemy

def drop_all_tables():
    """Drop all tables in PostgreSQL database"""
    # Get credentials
    db_password = os.getenv('DB_PASSWORD')
    if not db_password:
        print("❌ DB_PASSWORD not set")
        return
    
    # Connect using Cloud SQL Connector
    connector = Connector()
    
    def getconn():
        conn = connector.connect(
            "nexus-walkeasy-prod:australia-southeast1:nexus-production-db",
            "pg8000",
            user="postgres",
            password=db_password,
            db="nexus_production",
        )
        return conn
    
    pool = sqlalchemy.create_engine(
        "postgresql+pg8000://",
        creator=getconn,
    )
    
    with pool.connect() as conn:
        # Get all table names
        result = conn.execute(sqlalchemy.text("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename NOT LIKE 'pg_%'
        """))
        tables = [row[0] for row in result]
        
        print(f"Found {len(tables)} tables to drop")
        
        if not tables:
            print("No tables to drop")
            return
        
        # Drop all tables with CASCADE
        for table in tables:
            try:
                conn.execute(sqlalchemy.text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
                print(f"✅ Dropped: {table}")
            except Exception as e:
                print(f"⚠️  {table}: {e}")
        
        print(f"\n✅ Dropped {len(tables)} tables successfully!")
    
    connector.close()

if __name__ == '__main__':
    drop_all_tables()

