#!/usr/bin/env python3
"""
Discover metadata for API_Docs table in FileMaker.
This will help us understand:
1. What is the container field name?
2. What document types exist?
3. Sample data structure
"""
import os
import sys
import json
from datetime import datetime
import requests
from requests.auth import HTTPBasicAuth

# Load environment variables from local .env file
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')

FM_USERNAME = None
FM_PASSWORD = None
FM_DATABASE = 'WEP-DatabaseV2'

if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('FM_USERNAME='):
                FM_USERNAME = line.split('=', 1)[1].strip().strip('"').strip("'")
            elif line.startswith('FM_PASSWORD='):
                FM_PASSWORD = line.split('=', 1)[1].strip().strip('"').strip("'")
            elif line.startswith('FM_DATABASE='):
                FM_DATABASE = line.split('=', 1)[1].strip().strip('"').strip("'")

FM_BASE_URL = f"https://walkeasy.fmcloud.fm/fmi/odata/v4/{FM_DATABASE}"

def get_metadata():
    """Get metadata for API_Docs table"""
    print("=" * 80)
    print("FileMaker API_Docs Metadata Discovery")
    print("=" * 80)
    print(f"Database: {FM_DATABASE}")
    print(f"Table: API_Docs")
    print()
    
    # Get metadata
    metadata_url = f"{FM_BASE_URL}/$metadata"
    print(f"📡 Fetching metadata from: {metadata_url}")
    
    try:
        response = requests.get(
            metadata_url,
            auth=HTTPBasicAuth(FM_USERNAME, FM_PASSWORD),
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Metadata retrieved successfully")
            
            # Save raw metadata
            output_dir = os.path.join(script_dir, 'data', 'discovery')
            os.makedirs(output_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = os.path.join(output_dir, f'api_docs_metadata_{timestamp}.xml')
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(response.text)
            
            print(f"💾 Saved to: {output_file}")
            
            # Parse XML to find API_Docs fields
            import xml.etree.ElementTree as ET
            root = ET.fromstring(response.text)
            
            # Find EntityType for API_Docs
            ns = {'edmx': 'http://docs.oasis-open.org/odata/ns/edmx',
                  'edm': 'http://docs.oasis-open.org/odata/ns/edm'}
            
            print("\n" + "=" * 80)
            print("API_Docs Fields:")
            print("=" * 80)
            
            for entity_type in root.findall('.//edm:EntityType', ns):
                if entity_type.get('Name') == 'API_Docs':
                    print(f"\n✅ Found API_Docs EntityType")
                    print(f"\nFields:")
                    print("-" * 80)
                    
                    fields = []
                    for prop in entity_type.findall('.//edm:Property', ns):
                        field_name = prop.get('Name')
                        field_type = prop.get('Type')
                        nullable = prop.get('Nullable', 'true')
                        
                        fields.append({
                            'name': field_name,
                            'type': field_type,
                            'nullable': nullable == 'true'
                        })
                        
                        # Highlight container fields
                        if 'container' in field_name.lower() or 'file' in field_name.lower() or 'document' in field_name.lower():
                            print(f"  🔥 {field_name:30} {field_type:30} (nullable: {nullable})")
                        else:
                            print(f"     {field_name:30} {field_type:30} (nullable: {nullable})")
                    
                    # Save fields to JSON
                    fields_file = os.path.join(output_dir, f'api_docs_fields_{timestamp}.json')
                    with open(fields_file, 'w', encoding='utf-8') as f:
                        json.dump({'table': 'API_Docs', 'fields': fields}, f, indent=2)
                    
                    print(f"\n💾 Fields saved to: {fields_file}")
                    print(f"\nTotal fields: {len(fields)}")
                    
                    break
            
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def get_sample_records():
    """Get sample records from API_Docs"""
    print("\n" + "=" * 80)
    print("Sample Records:")
    print("=" * 80)
    
    # Get first 5 records
    url = f"{FM_BASE_URL}/API_Docs?$top=5"
    print(f"\n📡 Fetching sample records from: {url}")
    
    try:
        response = requests.get(
            url,
            auth=HTTPBasicAuth(FM_USERNAME, FM_PASSWORD),
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('value', [])
            
            print(f"✅ Retrieved {len(records)} sample records")
            
            # Save sample records
            output_dir = os.path.join(script_dir, 'data', 'discovery')
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = os.path.join(output_dir, f'api_docs_samples_{timestamp}.json')
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({'table': 'API_Docs', 'count': len(records), 'samples': records}, f, indent=2)
            
            print(f"💾 Saved to: {output_file}")
            
            # Print sample data
            for i, record in enumerate(records, 1):
                print(f"\n--- Record {i} ---")
                for key, value in sorted(record.items()):
                    # Highlight important fields
                    if key in ['id', 'id_Contact', 'Type', 'Date', 'imported', 'num']:
                        print(f"  🔹 {key:20} = {value}")
                    elif 'container' in key.lower() or 'file' in key.lower() or 'document' in key.lower():
                        print(f"  🔥 {key:20} = {value}")
                    else:
                        value_str = str(value)[:50] if value else 'null'
                        print(f"     {key:20} = {value_str}")
            
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def get_record_count():
    """Get total record count"""
    print("\n" + "=" * 80)
    print("Record Count:")
    print("=" * 80)
    
    url = f"{FM_BASE_URL}/API_Docs?$count=true&$top=0"
    
    try:
        response = requests.get(
            url,
            auth=HTTPBasicAuth(FM_USERNAME, FM_PASSWORD),
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            count = data.get('@odata.count', 'unknown')
            print(f"\n📊 Total records in API_Docs: {count}")
            
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    if not FM_USERNAME or not FM_PASSWORD:
        print("❌ FileMaker credentials not found in .env file")
        sys.exit(1)
    
    get_metadata()
    get_record_count()
    get_sample_records()
    
    print("\n" + "=" * 80)
    print("✅ Discovery complete!")
    print("=" * 80)

