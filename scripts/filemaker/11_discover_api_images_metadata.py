#!/usr/bin/env python3
"""
Discover metadata for API_Images table in FileMaker.
This will help us understand:
1. What is the container field name?
2. What image types exist?
3. How are images categorized?
4. Sample data structure
"""
import os
import sys
import json
from datetime import datetime
import requests
from requests.auth import HTTPBasicAuth

# Suppress SSL warnings
requests.packages.urllib3.disable_warnings()

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
    """Get metadata for API_Images table"""
    print("=" * 80)
    print("FileMaker API_Images Metadata Discovery")
    print("=" * 80)
    print(f"Database: {FM_DATABASE}")
    print(f"Table: API_Images")
    print()
    
    # Get metadata
    metadata_url = f"{FM_BASE_URL}/$metadata"
    
    try:
        response = requests.get(
            metadata_url,
            auth=HTTPBasicAuth(FM_USERNAME, FM_PASSWORD),
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            print("✅ Metadata retrieved successfully")
            
            # Save raw metadata
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            metadata_file = os.path.join(script_dir, 'data', 'discovery', f'api_images_metadata_{timestamp}.xml')
            os.makedirs(os.path.dirname(metadata_file), exist_ok=True)
            
            with open(metadata_file, 'w', encoding='utf-8') as f:
                f.write(response.text)
            
            print(f"💾 Raw metadata saved: {metadata_file}")
            
            # Parse and display key fields
            content = response.text
            if 'API_Images' in content:
                print("\n✅ API_Images table found in metadata")
                
                # Extract field information (basic parsing)
                import re
                property_pattern = r'<Property Name="([^"]+)" Type="([^"]+)"'
                properties = re.findall(property_pattern, content)
                
                if properties:
                    print(f"\n📋 Fields in API_Images ({len(properties)} total):")
                    for name, field_type in properties:
                        print(f"   - {name:40} ({field_type})")
            else:
                print("\n❌ API_Images table NOT found in metadata")
        else:
            print(f"❌ Failed to retrieve metadata: {response.status_code}")
            print(response.text[:500])
            
    except Exception as e:
        print(f"❌ Error: {e}")

def get_sample_records():
    """Get sample records from API_Images"""
    print("\n" + "=" * 80)
    print("Getting Sample Records")
    print("=" * 80)
    
    # Get first 10 records
    records_url = f"{FM_BASE_URL}/API_Images?$top=10"
    
    try:
        response = requests.get(
            records_url,
            auth=HTTPBasicAuth(FM_USERNAME, FM_PASSWORD),
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('value', [])
            
            print(f"✅ Retrieved {len(records)} sample records")
            
            if records:
                # Save sample records
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                sample_file = os.path.join(script_dir, 'data', 'discovery', f'api_images_samples_{timestamp}.json')
                
                with open(sample_file, 'w', encoding='utf-8') as f:
                    json.dump(records, f, indent=2)
                
                print(f"💾 Sample records saved: {sample_file}")
                
                # Display first record structure
                print("\n📄 First Record Structure:")
                first_record = records[0]
                for key, value in first_record.items():
                    value_str = str(value)[:100] if value else 'null'
                    print(f"   {key:40} = {value_str}")
                
                # Analyze image types if Type field exists
                if 'Type' in first_record or 'type' in first_record:
                    type_field = 'Type' if 'Type' in first_record else 'type'
                    types = set()
                    for record in records:
                        if record.get(type_field):
                            types.add(record[type_field])
                    
                    if types:
                        print(f"\n🏷️  Image Types Found ({len(types)}):")
                        for img_type in sorted(types):
                            print(f"   - {img_type}")
            else:
                print("⚠️  No records returned")
        else:
            print(f"❌ Failed to retrieve records: {response.status_code}")
            print(response.text[:500])
            
    except Exception as e:
        print(f"❌ Error: {e}")

def get_record_count():
    """Get total record count"""
    print("\n" + "=" * 80)
    print("Getting Record Count")
    print("=" * 80)
    
    count_url = f"{FM_BASE_URL}/API_Images?$count=true&$top=0"
    
    try:
        response = requests.get(
            count_url,
            auth=HTTPBasicAuth(FM_USERNAME, FM_PASSWORD),
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            data = response.json()
            count = data.get('@odata.count', 'unknown')
            print(f"✅ Total records in API_Images: {count:,}")
        else:
            print(f"❌ Failed to get count: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    if not FM_USERNAME or not FM_PASSWORD:
        print("❌ FileMaker credentials not found in .env file")
        sys.exit(1)
    
    print("Starting API_Images metadata discovery...")
    print()
    
    # Run discovery
    get_metadata()
    get_record_count()
    get_sample_records()
    
    print("\n" + "=" * 80)
    print("✅ Discovery complete!")
    print("=" * 80)
    print("\nNext Steps:")
    print("1. Review metadata and sample records")
    print("2. Identify container field name")
    print("3. Create API_Images layout in FileMaker (if needed)")
    print("4. Plan import strategy")
