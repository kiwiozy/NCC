#!/usr/bin/env python3
"""
Fetch OData metadata for Referrers and Companies tables

This script fetches metadata (field names, types, relationships) from FileMaker OData API
for the 4 referrer/company tables.

Tables:
1. API_Company (44 records)
2. API_Referrer (98 records)
3. API_ContactToReferrer (255 records)
4. API_ReferrerToCompany_Join (73 records)

Output: JSON file with metadata for each table
"""

import os
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
import urllib3
import xml.etree.ElementTree as ET

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables
load_dotenv()

# FileMaker OData API Configuration
FM_BASE_URL = os.getenv('FM_BASE_URL')
FM_DATABASE = os.getenv('FM_DATABASE')
FM_USERNAME = os.getenv('FM_USERNAME')
FM_PASSWORD = os.getenv('FM_PASSWORD')

# OData metadata endpoint
METADATA_URL = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}/$metadata"

def fetch_metadata():
    """
    Fetch OData metadata XML
    
    Returns:
        str: Metadata XML content
    """
    print("\n" + "="*80)
    print("📥 Fetching OData Metadata")
    print("="*80)
    print(f"URL: {METADATA_URL}")
    
    try:
        response = requests.get(
            METADATA_URL,
            auth=(FM_USERNAME, FM_PASSWORD),
            verify=False,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Metadata fetched successfully")
            return response.text
        else:
            print(f"❌ HTTP {response.status_code}: {response.text[:200]}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {str(e)}")
        return None

def parse_metadata(xml_content, target_tables):
    """
    Parse OData metadata XML for specific tables
    
    Args:
        xml_content: Raw XML metadata
        target_tables: List of table names to extract
    
    Returns:
        dict: Parsed metadata for each table
    """
    print("\n" + "="*80)
    print("🔍 Parsing Metadata XML")
    print("="*80)
    
    # Parse XML
    root = ET.fromstring(xml_content)
    
    # Define namespaces
    namespaces = {
        'edmx': 'http://docs.oasis-open.org/odata/ns/edmx',
        'edm': 'http://docs.oasis-open.org/odata/ns/edm'
    }
    
    # Find the Schema element
    schema = root.find('.//edm:Schema', namespaces)
    
    if schema is None:
        print("❌ No Schema found in metadata")
        return {}
    
    metadata = {}
    
    # Look for each target table
    for table_name in target_tables:
        print(f"\n📋 Searching for: {table_name}")
        
        # Find EntityType for this table
        entity_type = schema.find(f".//edm:EntityType[@Name='{table_name}']", namespaces)
        
        if entity_type is None:
            print(f"   ⚠️  Not found in metadata")
            metadata[table_name] = {
                'found': False,
                'fields': []
            }
            continue
        
        print(f"   ✅ Found!")
        
        # Extract fields (Properties)
        fields = []
        for prop in entity_type.findall('edm:Property', namespaces):
            field_name = prop.get('Name')
            field_type = prop.get('Type')
            nullable = prop.get('Nullable', 'true')
            max_length = prop.get('MaxLength', '')
            
            fields.append({
                'name': field_name,
                'type': field_type,
                'nullable': nullable == 'true',
                'max_length': max_length if max_length else None
            })
            
            print(f"      • {field_name}: {field_type} {'(nullable)' if nullable == 'true' else ''}")
        
        # Extract keys
        keys = []
        key_element = entity_type.find('edm:Key', namespaces)
        if key_element is not None:
            for prop_ref in key_element.findall('edm:PropertyRef', namespaces):
                keys.append(prop_ref.get('Name'))
        
        # Extract navigation properties (relationships)
        nav_properties = []
        for nav_prop in entity_type.findall('edm:NavigationProperty', namespaces):
            nav_properties.append({
                'name': nav_prop.get('Name'),
                'type': nav_prop.get('Type')
            })
        
        metadata[table_name] = {
            'found': True,
            'fields': fields,
            'keys': keys,
            'navigation_properties': nav_properties,
            'field_count': len(fields)
        }
        
        print(f"   Fields: {len(fields)}")
        print(f"   Keys: {', '.join(keys) if keys else 'None'}")
    
    return metadata

def fetch_sample_records(table_name, limit=5):
    """
    Fetch a few sample records to see actual data
    
    Args:
        table_name: Name of the table
        limit: Number of records to fetch
    
    Returns:
        list: Sample records
    """
    url = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}/{table_name}?$top={limit}"
    
    try:
        response = requests.get(
            url,
            auth=(FM_USERNAME, FM_PASSWORD),
            verify=False,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get('value', [])
        else:
            return []
            
    except requests.exceptions.RequestException:
        return []

def main():
    print("\n" + "="*80)
    print("🚀 FileMaker Referrers & Companies - Metadata Discovery")
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
    
    # Target tables (note: FileMaker adds trailing underscore)
    target_tables = [
        'API_Company_',
        'API_Referrer_',
        'API_ContactToReferrer_',
        'API_ReferrerToCompany_Join_'
    ]
    
    # Fetch metadata
    xml_content = fetch_metadata()
    if not xml_content:
        print("\n❌ Failed to fetch metadata")
        sys.exit(1)
    
    # Parse metadata
    metadata = parse_metadata(xml_content, target_tables)
    
    # Fetch sample records for each table
    print("\n" + "="*80)
    print("📥 Fetching Sample Records (5 per table)")
    print("="*80)
    
    for table_name in target_tables:
        if metadata.get(table_name, {}).get('found'):
            print(f"\n📋 {table_name}:")
            samples = fetch_sample_records(table_name, limit=5)
            metadata[table_name]['sample_records'] = samples
            metadata[table_name]['sample_count'] = len(samples)
            print(f"   ✅ Fetched {len(samples)} sample records")
        else:
            print(f"\n📋 {table_name}:")
            print(f"   ⚠️  Skipped (not found in metadata)")
    
    # Save to JSON file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f"data/discovery/referrers_companies_metadata_{timestamp}.json"
    
    # Create directory if it doesn't exist
    os.makedirs('data/discovery', exist_ok=True)
    
    # Prepare output
    output = {
        'discovery_date': datetime.now().isoformat(),
        'server': FM_BASE_URL,
        'database': FM_DATABASE,
        'tables': metadata
    }
    
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
    
    print("\n" + "="*80)
    print("✅ Metadata Discovery Complete!")
    print("="*80)
    print(f"📁 Output file: {output_file}")
    
    # Print summary
    print(f"\n📊 Summary:")
    for table_name, data in metadata.items():
        if data.get('found'):
            field_count = data.get('field_count', 0)
            sample_count = data.get('sample_count', 0)
            print(f"   ✅ {table_name}: {field_count} fields, {sample_count} sample records")
        else:
            print(f"   ❌ {table_name}: Not found in metadata")
    
    print(f"\n🎯 Next Steps:")
    print(f"   1. Review the metadata JSON file")
    print(f"   2. Analyze field types and relationships")
    print(f"   3. Map FileMaker fields → Django model fields")
    print(f"   4. Create Django models")
    print(f"   5. Create import script")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())

