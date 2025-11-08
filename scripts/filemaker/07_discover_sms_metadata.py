#!/usr/bin/env python3
"""
Fetch metadata for FileMaker SMS system tables

Tables to analyze:
- API_SMSAccounts_
- API_BulkSessions_
- API_CountryCodes_
- API_DeliveryReceipts_
- API_GatewayCodes_
- API_Gateways_
- API_Senders_
- API_Templates_
- API_Replies_
- API_Messages_
- API_MergeFields_
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
    """Fetch OData metadata XML"""
    print("\n" + "="*80)
    print("📥 Fetching OData Metadata")
    print("="*80)
    
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
            print(f"❌ HTTP {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {str(e)}")
        return None

def parse_metadata(xml_content, target_tables):
    """Parse OData metadata XML for specific tables"""
    print("\n" + "="*80)
    print("🔍 Parsing SMS System Metadata")
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
        print(f"\n📋 {table_name}")
        
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
            
            fields.append({
                'name': field_name,
                'type': field_type,
                'nullable': nullable == 'true'
            })
            
            # Only print key fields to avoid spam
            if field_name in ['id', 'Name', 'Type', 'Status', 'message', 'to', 'from']:
                print(f"      • {field_name}: {field_type}")
        
        # Extract keys
        keys = []
        key_element = entity_type.find('edm:Key', namespaces)
        if key_element is not None:
            for prop_ref in key_element.findall('edm:PropertyRef', namespaces):
                keys.append(prop_ref.get('Name'))
        
        metadata[table_name] = {
            'found': True,
            'fields': fields,
            'keys': keys,
            'field_count': len(fields)
        }
        
        print(f"   Fields: {len(fields)}, Keys: {', '.join(keys) if keys else 'None'}")
    
    return metadata

def fetch_sample_records(table_name, limit=3):
    """Fetch a few sample records"""
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
    print("🚀 FileMaker SMS System - Metadata Discovery")
    print("="*80)
    
    # Check environment variables
    if not all([FM_BASE_URL, FM_DATABASE, FM_USERNAME, FM_PASSWORD]):
        print("\n❌ ERROR: Missing FileMaker credentials in .env file")
        sys.exit(1)
    
    print(f"\n📊 Configuration:")
    print(f"   Server: {FM_BASE_URL}")
    print(f"   Database: {FM_DATABASE}")
    
    # SMS system tables
    target_tables = [
        'API_SMSAccounts_',
        'API_BulkSessions_',
        'API_CountryCodes_',
        'API_DeliveryReceipts_',
        'API_GatewayCodes_',
        'API_Gateways_',
        'API_Senders_',
        'API_Templates_',
        'API_Replies_',
        'API_Messages_',
        'API_MergeFields_'
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
    print("📥 Fetching Sample Records (3 per table)")
    print("="*80)
    
    for table_name in target_tables:
        if metadata.get(table_name, {}).get('found'):
            print(f"\n📋 {table_name}:")
            samples = fetch_sample_records(table_name, limit=3)
            metadata[table_name]['sample_records'] = samples
            metadata[table_name]['sample_count'] = len(samples)
            print(f"   ✅ Fetched {len(samples)} sample records")
    
    # Save to JSON file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f"data/discovery/sms_system_metadata_{timestamp}.json"
    
    os.makedirs('data/discovery', exist_ok=True)
    
    output = {
        'discovery_date': datetime.now().isoformat(),
        'server': FM_BASE_URL,
        'database': FM_DATABASE,
        'tables': metadata
    }
    
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
    
    print("\n" + "="*80)
    print("✅ SMS System Metadata Discovery Complete!")
    print("="*80)
    print(f"📁 Output file: {output_file}")
    
    # Print summary
    print(f"\n📊 Summary:")
    found_count = sum(1 for data in metadata.values() if data.get('found'))
    print(f"   Found: {found_count}/{len(target_tables)} tables")
    
    for table_name, data in metadata.items():
        if data.get('found'):
            field_count = data.get('field_count', 0)
            sample_count = data.get('sample_count', 0)
            print(f"   ✅ {table_name}: {field_count} fields, {sample_count} samples")
    
    print(f"\n🎯 Next Steps:")
    print(f"   1. Review the metadata JSON file")
    print(f"   2. Analyze SMS system architecture")
    print(f"   3. Compare with current Nexus SMS system")
    print(f"   4. Determine what to import/migrate")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())

