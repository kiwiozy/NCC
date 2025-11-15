#!/usr/bin/env python
"""
Test ODBC connection to FileMaker Server
"""
import os
import sys
import pyodbc
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set ODBC environment variables
os.environ['ODBCSYSINI'] = '/Users/craig'
os.environ['ODBCINI'] = '/Users/craig/.odbc.ini'

# Get FileMaker credentials
FM_SERVER = os.getenv('FM_SERVER', 'walkeasy.fmcloud.fm')
FM_DATABASE = os.getenv('FM_DB_NAME', 'WEP-DatabaseV2')
FM_USERNAME = os.getenv('FM_USERNAME')
FM_PASSWORD = os.getenv('FM_PASSWORD')

print("="*80)
print("TESTING ODBC CONNECTION TO FILEMAKER")
print("="*80)

# List available drivers
print("\n1. Available ODBC Drivers:")
drivers = pyodbc.drivers()
for driver in drivers:
    print(f"   - {driver}")

if 'FileMaker ODBC' not in drivers:
    print("\n❌ ERROR: FileMaker ODBC driver not found!")
    sys.exit(1)

print(f"\n2. Connection Details:")
print(f"   Server: {FM_SERVER}")
print(f"   Database: {FM_DATABASE}")
print(f"   Username: {FM_USERNAME}")

# Build connection string - Try different formats
connection_strings = [
    # Format 1: Standard format
    (
        f"DRIVER={{FileMaker ODBC}};"
        f"SERVER={FM_SERVER};"
        f"DATABASE={FM_DATABASE};"
        f"UID={FM_USERNAME};"
        f"PWD={FM_PASSWORD};"
    ),
    # Format 2: With Port
    (
        f"DRIVER={{FileMaker ODBC}};"
        f"SERVER={FM_SERVER}:443;"
        f"DATABASE={FM_DATABASE};"
        f"UID={FM_USERNAME};"
        f"PWD={FM_PASSWORD};"
    ),
    # Format 3: Simplified
    (
        f"Driver=FileMaker ODBC;"
        f"Server={FM_SERVER};"
        f"Database={FM_DATABASE};"
        f"UID={FM_USERNAME};"
        f"PWD={FM_PASSWORD}"
    ),
]

print(f"\n3. Attempting connection...")

connection_successful = False
for idx, connection_string in enumerate(connection_strings, 1):
    try:
        print(f"\n   Attempt {idx}...")
        # Connect
        conn = pyodbc.connect(connection_string, timeout=30)
        print(f"   ✅ Connected successfully with format {idx}!")
        connection_successful = True
        break
    except pyodbc.Error as e:
        print(f"   ❌ Format {idx} failed: {e}")
        continue

if not connection_successful:
    print("\n❌ All connection attempts failed!")
    sys.exit(1)

try:
    
    # Test query
    print(f"\n4. Testing query on API_Images...")
    cursor = conn.cursor()
    
    # Get total count
    cursor.execute("SELECT COUNT(*) FROM API_Images")
    count = cursor.fetchone()[0]
    print(f"   Total images: {count}")
    
    # Get sample record
    cursor.execute("SELECT id, image_Full, image_Ex_large, image_large FROM API_Images LIMIT 1")
    row = cursor.fetchone()
    if row:
        print(f"\n5. Sample Record:")
        print(f"   ID: {row[0]}")
        print(f"   image_Full: {row[1][:50] if row[1] else 'Empty'}...")
        print(f"   image_Ex_large: {row[2][:50] if row[2] else 'Empty'}...")
        print(f"   image_large: {row[3][:50] if row[3] else 'Empty'}...")
    
    # Close connection
    cursor.close()
    conn.close()
    
    print("\n" + "="*80)
    print("✅ SUCCESS! ODBC connection working perfectly!")
    print("="*80)

except pyodbc.Error as e:
    print(f"\n❌ Connection failed!")
    print(f"Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Unexpected error!")
    print(f"Error: {e}")
    sys.exit(1)

