#!/usr/bin/env python3
"""
FileMaker Schema Discovery Script

This script queries the FileMaker Data API to discover:
1. All available layouts (tables)
2. All fields in each layout
3. Field types and metadata
4. Sample data to understand data structure

Usage:
    python3 01_discover_schema.py

Requirements:
    pip install requests python-dotenv

Configuration:
    Create a .env file with:
    FM_BASE_URL=https://your-server.example.com
    FM_DATABASE=YourDatabaseName
    FM_USERNAME=username
    FM_PASSWORD=password
"""

import os
import json
import base64
import requests
from datetime import datetime
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
FM_BASE_URL = os.getenv('FM_BASE_URL')
FM_DATABASE = os.getenv('FM_DATABASE')
FM_USERNAME = os.getenv('FM_USERNAME')
FM_PASSWORD = os.getenv('FM_PASSWORD')

# Output directory
OUTPUT_DIR = 'data/discovery'
os.makedirs(OUTPUT_DIR, exist_ok=True)

class FileMakerClient:
    """FileMaker Data API Client"""
    
    def __init__(self, base_url: str, database: str, username: str, password: str):
        self.base_url = base_url.rstrip('/')
        self.database = database
        self.username = username
        self.password = password
        self.token: Optional[str] = None
        self.session = requests.Session()
        # Disable SSL verification for self-signed certificates (development only)
        self.session.verify = False
        
    def authenticate(self) -> bool:
        """Get API token from FileMaker Server"""
        print(f"🔑 Authenticating with FileMaker Server...")
        
        auth_url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/sessions"
        auth_string = f"{self.username}:{self.password}"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Basic {auth_b64}'
        }
        
        try:
            response = self.session.post(auth_url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            self.token = data['response']['token']
            
            print(f"✅ Authentication successful!")
            print(f"   Token: {self.token[:8]}...")
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Authentication failed: {e}")
            if hasattr(e.response, 'json'):
                print(f"   Error details: {e.response.json()}")
            return False
    
    def get_layouts(self) -> List[Dict[str, Any]]:
        """Get list of all layouts"""
        print(f"\n📋 Fetching available layouts...")
        
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/layouts"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = self.session.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            layouts = data['response']['layouts']
            
            print(f"✅ Found {len(layouts)} layouts")
            return layouts
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to get layouts: {e}")
            return []
    
    def get_layout_metadata(self, layout_name: str) -> Optional[Dict[str, Any]]:
        """Get metadata (field definitions) for a specific layout"""
        print(f"   📊 Getting metadata for: {layout_name}")
        
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/layouts/{layout_name}"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = self.session.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            return data['response']
            
        except requests.exceptions.RequestException as e:
            print(f"      ❌ Failed: {e}")
            return None
    
    def get_sample_records(self, layout_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get sample records from a layout"""
        print(f"   📝 Getting sample records from: {layout_name}")
        
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/layouts/{layout_name}/records"
        headers = {'Authorization': f'Bearer {self.token}'}
        params = {'_limit': limit}
        
        try:
            response = self.session.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            records = data['response']['data']
            
            print(f"      ✅ Retrieved {len(records)} sample records")
            return records
            
        except requests.exceptions.RequestException as e:
            print(f"      ⚠️  No records or error: {e}")
            return []
    
    def get_record_count(self, layout_name: str) -> int:
        """Get total record count for a layout"""
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/layouts/{layout_name}/records"
        headers = {'Authorization': f'Bearer {self.token}'}
        params = {'_limit': 1}
        
        try:
            response = self.session.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            count = data['response']['dataInfo']['foundCount']
            return count
            
        except requests.exceptions.RequestException as e:
            return 0
    
    def logout(self):
        """Close the FileMaker session"""
        if not self.token:
            return
        
        print(f"\n🚪 Logging out...")
        
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/sessions/{self.token}"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            self.session.delete(url, headers=headers)
            print(f"✅ Logged out successfully")
        except:
            pass

def analyze_field_type(sample_value: Any) -> str:
    """Guess field type from sample value"""
    if sample_value is None or sample_value == '':
        return 'unknown'
    
    # Check if it looks like a date
    if isinstance(sample_value, str):
        if len(sample_value) == 10 and sample_value.count('/') == 2:
            return 'date'
        if len(sample_value) == 10 and sample_value.count('-') == 2:
            return 'date'
        if 'http' in sample_value.lower():
            return 'url/container'
    
    # Check if numeric
    try:
        float(sample_value)
        return 'number'
    except (ValueError, TypeError):
        pass
    
    # Default to text
    if isinstance(sample_value, str):
        if len(sample_value) > 255:
            return 'text (long)'
        return 'text'
    
    return 'unknown'

def discover_schema():
    """Main schema discovery function"""
    
    print("=" * 70)
    print("🔍 FileMaker Schema Discovery")
    print("=" * 70)
    
    # Validate configuration
    if not all([FM_BASE_URL, FM_DATABASE, FM_USERNAME, FM_PASSWORD]):
        print("\n❌ ERROR: Missing configuration!")
        print("\nPlease create a .env file with:")
        print("  FM_BASE_URL=https://your-server.example.com")
        print("  FM_DATABASE=YourDatabaseName")
        print("  FM_USERNAME=username")
        print("  FM_PASSWORD=password")
        return
    
    print(f"\n📡 Server: {FM_BASE_URL}")
    print(f"📊 Database: {FM_DATABASE}")
    print(f"👤 Username: {FM_USERNAME}")
    
    # Create client and authenticate
    client = FileMakerClient(FM_BASE_URL, FM_DATABASE, FM_USERNAME, FM_PASSWORD)
    
    if not client.authenticate():
        print("\n❌ Cannot proceed without authentication")
        return
    
    # Get all layouts
    layouts = client.get_layouts()
    
    if not layouts:
        print("\n❌ No layouts found")
        client.logout()
        return
    
    # Discover schema for each layout
    schema_data = {
        'discovery_date': datetime.now().isoformat(),
        'server': FM_BASE_URL,
        'database': FM_DATABASE,
        'total_layouts': len(layouts),
        'layouts': []
    }
    
    print(f"\n" + "=" * 70)
    print(f"📊 LAYOUT DISCOVERY")
    print("=" * 70)
    
    for i, layout_info in enumerate(layouts, 1):
        layout_name = layout_info['name']
        
        print(f"\n[{i}/{len(layouts)}] 🗂️  {layout_name}")
        print("-" * 70)
        
        # Get metadata
        metadata = client.get_layout_metadata(layout_name)
        
        if not metadata:
            print(f"   ⚠️  Skipping (no metadata)")
            continue
        
        # Get record count
        record_count = client.get_record_count(layout_name)
        print(f"   📊 Total Records: {record_count:,}")
        
        # Get sample records
        sample_records = client.get_sample_records(layout_name, limit=5)
        
        # Analyze fields
        field_data = metadata.get('fieldMetaData', [])
        
        layout_schema = {
            'name': layout_name,
            'is_folder': layout_info.get('isFolder', False),
            'record_count': record_count,
            'field_count': len(field_data),
            'fields': []
        }
        
        print(f"   📋 Fields: {len(field_data)}")
        
        # Analyze each field
        for field in field_data:
            field_name = field.get('name', '')
            field_type = field.get('type', 'unknown')
            
            # Get sample value from first record
            sample_value = None
            if sample_records:
                field_data_obj = sample_records[0].get('fieldData', {})
                sample_value = field_data_obj.get(field_name)
            
            # Analyze type from sample
            inferred_type = analyze_field_type(sample_value)
            
            field_info = {
                'name': field_name,
                'type': field_type,
                'inferred_type': inferred_type,
                'sample_value': str(sample_value)[:100] if sample_value else None,
                'max_repeat': field.get('maxRepeat', 1),
                'max_characters': field.get('maxCharacters', 0),
                'auto_enter': field.get('autoEnter', False),
                'global': field.get('global', False),
                'not_empty': field.get('notEmpty', False)
            }
            
            layout_schema['fields'].append(field_info)
        
        # Add sample records
        layout_schema['sample_records'] = sample_records[:2]  # Just first 2 for reference
        
        schema_data['layouts'].append(layout_schema)
    
    # Save schema to JSON file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f"{OUTPUT_DIR}/filemaker_schema_{timestamp}.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(schema_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n" + "=" * 70)
    print(f"✅ DISCOVERY COMPLETE")
    print("=" * 70)
    print(f"\n📄 Schema saved to: {output_file}")
    
    # Print summary
    print(f"\n📊 SUMMARY:")
    print(f"   Total Layouts: {len(schema_data['layouts'])}")
    
    total_records = sum(layout['record_count'] for layout in schema_data['layouts'])
    print(f"   Total Records: {total_records:,}")
    
    print(f"\n🗂️  LAYOUTS BY RECORD COUNT:")
    sorted_layouts = sorted(schema_data['layouts'], key=lambda x: x['record_count'], reverse=True)
    for layout in sorted_layouts[:10]:  # Top 10
        print(f"   - {layout['name']}: {layout['record_count']:,} records ({layout['field_count']} fields)")
    
    # Logout
    client.logout()
    
    print(f"\n✅ Schema discovery complete!")
    print(f"\n📝 Next steps:")
    print(f"   1. Review the schema file: {output_file}")
    print(f"   2. Identify which layouts map to which Nexus tables")
    print(f"   3. Create field mapping document")
    print(f"   4. Update FILEMAKER_IMPORT_PLAN.md with findings")

if __name__ == '__main__':
    # Suppress SSL warnings (for self-signed certificates)
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    try:
        discover_schema()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()

