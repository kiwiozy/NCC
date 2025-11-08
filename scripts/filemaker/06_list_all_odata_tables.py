#!/usr/bin/env python3
"""
List all available tables in FileMaker OData metadata

This will show us the exact names of all tables available via OData.
"""

import os
import sys
import requests
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

def main():
    print("\n" + "="*80)
    print("📋 List All Available OData Tables")
    print("="*80)
    
    # Fetch metadata
    print(f"Fetching metadata from: {METADATA_URL}")
    
    try:
        response = requests.get(
            METADATA_URL,
            auth=(FM_USERNAME, FM_PASSWORD),
            verify=False,
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"❌ HTTP {response.status_code}")
            return 1
        
        print("✅ Metadata fetched\n")
        
        # Parse XML
        root = ET.fromstring(response.text)
        
        # Define namespaces
        namespaces = {
            'edmx': 'http://docs.oasis-open.org/odata/ns/edmx',
            'edm': 'http://docs.oasis-open.org/odata/ns/edm'
        }
        
        # Find the Schema element
        schema = root.find('.//edm:Schema', namespaces)
        
        if schema is None:
            print("❌ No Schema found")
            return 1
        
        # Find all EntityTypes
        entity_types = schema.findall('edm:EntityType', namespaces)
        
        print(f"Found {len(entity_types)} tables:")
        print("="*80)
        
        # Filter for tables starting with "API_"
        api_tables = []
        other_tables = []
        
        for entity in entity_types:
            name = entity.get('Name')
            if name.startswith('API_'):
                api_tables.append(name)
            else:
                other_tables.append(name)
        
        # Print API_ tables
        if api_tables:
            print(f"\n✅ API_* Tables ({len(api_tables)}):")
            for name in sorted(api_tables):
                print(f"   • {name}")
        
        # Print tables that contain "Company", "Referrer", or "Contact"
        print(f"\n🔍 Tables containing 'Company', 'Referrer', or 'Contact':")
        matches = [t for t in other_tables if any(keyword in t for keyword in ['Company', 'Referrer', 'Contact', 'company', 'referrer', 'contact'])]
        if matches:
            for name in sorted(matches):
                print(f"   • {name}")
        else:
            print("   (none found)")
        
        # Print all other tables
        print(f"\n📋 All Other Tables ({len(other_tables)}):")
        for name in sorted(other_tables):
            if name not in matches:  # Don't duplicate
                print(f"   • {name}")
        
        print("\n" + "="*80)
        print("✅ Complete")
        print("="*80)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())

