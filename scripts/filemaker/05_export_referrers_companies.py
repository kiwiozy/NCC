#!/usr/bin/env python3
"""
Export Referrers and Companies data from FileMaker OData API

This script exports data from 4 FileMaker tables:
1. API_Company (44 records) - Companies/practices
2. API_Referrer (98 records) - Referrers (doctors, specialists)
3. API_ContactToReferrer (255 records) - Patient-Referrer links
4. API_ReferrerToCompany_Join (73 records) - Referrer-Company links

Output: JSON file with all data for analysis
"""

import os
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
import urllib3

# Disable SSL warnings (FileMaker often uses self-signed certs)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables
load_dotenv()

# FileMaker OData API Configuration
FM_BASE_URL = os.getenv('FM_BASE_URL')
FM_DATABASE = os.getenv('FM_DATABASE')
FM_USERNAME = os.getenv('FM_USERNAME')
FM_PASSWORD = os.getenv('FM_PASSWORD')

# OData endpoint
ODATA_BASE = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}"

def get_odata_records(table_name, limit=1000):
    """
    Fetch all records from an OData table
    
    Args:
        table_name: Name of the FileMaker table (e.g., 'API_Company')
        limit: Records per page (default 1000)
    
    Returns:
        list: All records from the table
    """
    print(f"\n{'='*80}")
    print(f"📥 Fetching records from: {table_name}")
    print(f"{'='*80}")
    
    all_records = []
    skip = 0
    
    while True:
        url = f"{ODATA_BASE}/{table_name}?$top={limit}&$skip={skip}"
        
        try:
            response = requests.get(
                url,
                auth=(FM_USERNAME, FM_PASSWORD),
                verify=False,  # Skip SSL verification for self-signed certs
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                records = data.get('value', [])
                
                if not records:
                    break  # No more records
                
                all_records.extend(records)
                print(f"   ✅ Fetched {len(records)} records (total: {len(all_records)})")
                
                skip += limit
                
                # If we got fewer records than limit, we've reached the end
                if len(records) < limit:
                    break
                    
            elif response.status_code == 401:
                print(f"   ❌ Authentication failed for {table_name}")
                print(f"   Check FM_USERNAME and FM_PASSWORD in .env")
                return []
            elif response.status_code == 404:
                print(f"   ❌ Table not found: {table_name}")
                print(f"   This table may not be accessible via OData")
                return []
            else:
                print(f"   ❌ HTTP {response.status_code}: {response.text[:200]}")
                return []
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Request failed: {str(e)}")
            return []
    
    print(f"   🎉 Total records fetched: {len(all_records)}")
    return all_records

def analyze_table_structure(table_name, records):
    """
    Analyze the structure of a table
    
    Args:
        table_name: Name of the table
        records: List of records
    
    Returns:
        dict: Analysis results
    """
    if not records:
        return {
            'record_count': 0,
            'fields': [],
            'sample_record': None
        }
    
    # Get field names from first record
    fields = list(records[0].keys())
    
    # Get sample values for each field (from first record)
    sample_record = records[0]
    
    # Count non-null values for each field
    field_stats = {}
    for field in fields:
        non_null_count = sum(1 for r in records if r.get(field) is not None and r.get(field) != '')
        field_stats[field] = {
            'non_null_count': non_null_count,
            'null_count': len(records) - non_null_count,
            'sample_value': sample_record.get(field)
        }
    
    return {
        'record_count': len(records),
        'fields': fields,
        'field_stats': field_stats,
        'sample_records': records[:3]  # First 3 records for analysis
    }

def main():
    print("\n" + "="*80)
    print("🚀 FileMaker Referrers & Companies Data Export")
    print("="*80)
    
    # Check environment variables
    if not all([FM_BASE_URL, FM_DATABASE, FM_USERNAME, FM_PASSWORD]):
        print("\n❌ ERROR: Missing FileMaker credentials in .env file")
        print("Required: FM_BASE_URL, FM_DATABASE, FM_USERNAME, FM_PASSWORD")
        sys.exit(1)
    
    print(f"\n📊 Configuration:")
    print(f"   Server: {FM_BASE_URL}")
    print(f"   Database: {FM_DATABASE}")
    print(f"   Username: {FM_USERNAME}")
    
    # Tables to export (in dependency order)
    tables = [
        'API_Company',              # 44 records (independent)
        'API_Referrer',             # 98 records (depends on companies - optional)
        'API_ContactToReferrer',    # 255 records (depends on patients + referrers)
        'API_ReferrerToCompany_Join' # 73 records (depends on referrers + companies)
    ]
    
    # Export data from each table
    export_data = {
        'export_date': datetime.now().isoformat(),
        'tables': {}
    }
    
    for table in tables:
        print(f"\n{'='*80}")
        print(f"📋 Processing: {table}")
        print(f"{'='*80}")
        
        # Fetch records
        records = get_odata_records(table)
        
        # Analyze structure
        analysis = analyze_table_structure(table, records)
        
        # Store in export data
        export_data['tables'][table] = {
            'records': records,
            'analysis': analysis
        }
        
        # Print summary
        print(f"\n📊 Summary for {table}:")
        print(f"   Record count: {analysis['record_count']}")
        print(f"   Fields: {len(analysis['fields'])}")
        if analysis['fields']:
            print(f"   Field list: {', '.join(analysis['fields'])}")
    
    # Save to JSON file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f"data/export/referrers_companies_{timestamp}.json"
    
    # Create directory if it doesn't exist
    os.makedirs('data/export', exist_ok=True)
    
    with open(output_file, 'w') as f:
        json.dump(export_data, f, indent=2)
    
    print(f"\n{'='*80}")
    print(f"✅ Export Complete!")
    print(f"{'='*80}")
    print(f"📁 Output file: {output_file}")
    
    # Print overall summary
    print(f"\n📊 Overall Summary:")
    for table, data in export_data['tables'].items():
        count = data['analysis']['record_count']
        print(f"   {table}: {count} records")
    
    print(f"\n🎯 Next Steps:")
    print(f"   1. Review the exported JSON file")
    print(f"   2. Analyze field mappings and data types")
    print(f"   3. Create Django models based on the structure")
    print(f"   4. Create import script to load the data")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())

