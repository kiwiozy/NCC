#!/usr/bin/env python3
"""
Test FileMaker OData API
Explore table-level access without needing layouts
"""

import os
import sys
import requests
from dotenv import load_dotenv
from urllib3.exceptions import InsecureRequestWarning

# Suppress SSL warnings for self-signed certificates
requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

def test_odata():
    """Test OData API endpoints"""
    
    # Load credentials
    load_dotenv()
    
    FM_BASE_URL = os.getenv('FM_BASE_URL')
    FM_DATABASE = os.getenv('FM_DATABASE')
    FM_USERNAME = os.getenv('FM_USERNAME')
    FM_PASSWORD = os.getenv('FM_PASSWORD')
    
    print("=" * 70)
    print("🔬 TESTING FileMaker OData API")
    print("=" * 70)
    print(f"\n📡 Server: {FM_BASE_URL}")
    print(f"📊 Database: {FM_DATABASE}")
    print(f"👤 Username: {FM_USERNAME}")
    
    # Test 1: Get OData metadata (schema)
    print(f"\n" + "=" * 70)
    print("📋 TEST 1: Get OData Metadata ($metadata)")
    print("=" * 70)
    
    metadata_url = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}/$metadata"
    print(f"\n🔗 URL: {metadata_url}")
    
    try:
        response = requests.get(
            metadata_url,
            auth=(FM_USERNAME, FM_PASSWORD),
            verify=False,  # Skip SSL verification for self-signed certs
            timeout=30
        )
        
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ SUCCESS! Got metadata")
            print(f"📄 Content Type: {response.headers.get('Content-Type')}")
            print(f"📏 Response Size: {len(response.text):,} bytes")
            
            # Save metadata to file
            metadata_file = 'data/odata/metadata.xml'
            os.makedirs('data/odata', exist_ok=True)
            
            with open(metadata_file, 'w', encoding='utf-8') as f:
                f.write(response.text)
            
            print(f"💾 Saved to: {metadata_file}")
            
            # Parse and show first few lines
            print(f"\n📝 First 1000 characters:")
            print("-" * 70)
            print(response.text[:1000])
            print("...")
            
        else:
            print(f"❌ FAILED: {response.status_code}")
            print(f"📄 Response: {response.text[:500]}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False
    
    # Test 2: List available entity sets (tables)
    print(f"\n" + "=" * 70)
    print("📋 TEST 2: List Entity Sets (Tables)")
    print("=" * 70)
    
    root_url = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}"
    print(f"\n🔗 URL: {root_url}")
    
    try:
        response = requests.get(
            root_url,
            auth=(FM_USERNAME, FM_PASSWORD),
            verify=False,
            timeout=30
        )
        
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ SUCCESS! Got entity sets")
            
            # Try to parse JSON
            try:
                data = response.json()
                print(f"\n📊 Entity Sets (Tables):")
                print("-" * 70)
                
                if 'value' in data:
                    for i, entity_set in enumerate(data['value'], 1):
                        name = entity_set.get('name', 'Unknown')
                        url = entity_set.get('url', '')
                        print(f"  [{i}] {name}")
                        if i >= 20:  # Show first 20
                            print(f"  ... and {len(data['value']) - 20} more")
                            break
                else:
                    print(data)
                    
            except Exception as e:
                print(f"⚠️  Not JSON format, raw response:")
                print(response.text[:1000])
                
        else:
            print(f"❌ FAILED: {response.status_code}")
            print(f"📄 Response: {response.text[:500]}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
    
    # Test 3: Try to access a specific table (if we know one exists)
    print(f"\n" + "=" * 70)
    print("📋 TEST 3: Query Specific Table")
    print("=" * 70)
    
    # Try "Contacts" table (common name)
    table_url = f"{FM_BASE_URL}/fmi/odata/v4/{FM_DATABASE}/Contacts?$top=5"
    print(f"\n🔗 URL: {table_url}")
    print(f"📝 Query: Get first 5 records from 'Contacts' table")
    
    try:
        response = requests.get(
            table_url,
            auth=(FM_USERNAME, FM_PASSWORD),
            verify=False,
            timeout=30
        )
        
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ SUCCESS! Got records")
            
            try:
                data = response.json()
                if 'value' in data:
                    print(f"\n📊 Found {len(data['value'])} records")
                    print(f"\n📝 First record:")
                    print("-" * 70)
                    if data['value']:
                        import json
                        print(json.dumps(data['value'][0], indent=2))
            except:
                print(response.text[:1000])
                
        elif response.status_code == 404:
            print(f"⚠️  Table 'Contacts' not found (expected - just testing)")
        else:
            print(f"❌ FAILED: {response.status_code}")
            print(f"📄 Response: {response.text[:500]}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
    
    print(f"\n" + "=" * 70)
    print("✅ ODATA TESTING COMPLETE")
    print("=" * 70)
    
    return True

if __name__ == '__main__':
    try:
        success = test_odata()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

