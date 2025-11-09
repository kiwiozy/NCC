#!/usr/bin/env python3
"""
Test FileMaker Data API container field access for API_Docs.

Container field name: 'doc'

This script will:
1. Get a sample document record via Data API
2. Check if the 'doc' container field is accessible
3. Determine the format (Base64, URL, or other)
4. Test downloading the actual file
"""
import os
import sys
import json
import base64
import requests
from datetime import datetime

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

FM_BASE_URL = f"https://walkeasy.fmcloud.fm/fmi/data/v1/databases/{FM_DATABASE}"

def authenticate():
    """Authenticate with FileMaker Data API"""
    print("=" * 80)
    print("Authenticating with FileMaker Data API...")
    print("=" * 80)
    
    auth_url = f"{FM_BASE_URL}/sessions"
    
    # Use Base64-encoded Basic Auth (FileMaker Data API standard)
    auth_string = base64.b64encode(f"{FM_USERNAME}:{FM_PASSWORD}".encode()).decode()
    headers = {
        'Authorization': f'Basic {auth_string}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(
            auth_url,
            headers=headers,
            timeout=30,
            verify=False  # FileMaker cloud uses self-signed cert
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('response', {}).get('token')
            print(f"✅ Authentication successful")
            print(f"   Token: {token[:20]}...")
            return token
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def find_record_by_uuid(token, uuid):
    """Find a record by UUID to get the FileMaker record ID"""
    print("\n" + "=" * 80)
    print(f"Finding Record by UUID: {uuid}")
    print("=" * 80)
    
    layout = "API_Docs"
    url = f"{FM_BASE_URL}/layouts/{layout}/_find"
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Search for the record by UUID
    search_data = {
        "query": [
            {"id": uuid}
        ]
    }
    
    try:
        response = requests.post(
            url,
            headers=headers,
            json=search_data,
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('response', {}).get('data', [])
            if records:
                record = records[0]
                fm_record_id = record.get('recordId')
                print(f"✅ Record found")
                print(f"   UUID: {uuid}")
                print(f"   FileMaker Record ID: {fm_record_id}")
                return fm_record_id
            else:
                print(f"❌ No records found with UUID: {uuid}")
                return None
        else:
            print(f"❌ Search failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def get_sample_record(token, record_id):
    """Get a specific record with container field"""
    print("\n" + "=" * 80)
    print(f"Fetching Record ID: {record_id}")
    print("=" * 80)
    
    # Use the layout that exposes API_Docs
    layout = "API_Docs"
    url = f"{FM_BASE_URL}/layouts/{layout}/records/{record_id}"
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(
            url,
            headers=headers,
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            data = response.json()
            record = data.get('response', {}).get('data', [{}])[0]
            field_data = record.get('fieldData', {})
            
            print(f"✅ Record retrieved successfully")
            print(f"\n📄 Record Details:")
            print(f"   Record ID: {record.get('recordId')}")
            print(f"   Modified By: {record.get('modId')}")
            
            print(f"\n📋 Field Data:")
            for key, value in field_data.items():
                if key.lower() == 'doc':
                    print(f"   🔥 {key:30} = {type(value).__name__} (CONTAINER FIELD)")
                    if value:
                        print(f"      Container value preview: {str(value)[:200]}")
                else:
                    value_str = str(value)[:50] if value else 'null'
                    print(f"      {key:30} = {value_str}")
            
            # Check container field specifically (case-insensitive)
            container_value = field_data.get('Doc') or field_data.get('doc')
            print(f"\n🔍 Container Field Analysis:")
            print(f"   Field Name: 'Doc' (capital D)")
            print(f"   Value Type: {type(container_value).__name__}")
            print(f"   Is Empty: {not container_value}")
            
            if container_value:
                print(f"   Value: {container_value}")
                
                # Check if it's a URL
                if isinstance(container_value, str) and container_value.startswith('http'):
                    print(f"   Format: URL (External)")
                    return {'type': 'url', 'value': container_value, 'token': token}
                
                # Check if it's Base64
                elif isinstance(container_value, str) and len(container_value) > 100:
                    print(f"   Format: Possibly Base64")
                    return {'type': 'base64', 'value': container_value}
                
                # Check if it's a filename
                elif isinstance(container_value, str):
                    print(f"   Format: Filename or path")
                    return {'type': 'filename', 'value': container_value}
                
                else:
                    print(f"   Format: Unknown")
                    return {'type': 'unknown', 'value': container_value}
            else:
                print(f"   ❌ Container field is empty or not accessible")
                return None
            
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def download_container_url(container_data):
    """Download file from container URL"""
    print("\n" + "=" * 80)
    print("Attempting to Download Container File...")
    print("=" * 80)
    
    url = container_data['value']
    token = container_data.get('token')
    
    headers = {
        'Authorization': f'Bearer {token}',
    }
    
    try:
        response = requests.get(
            url,
            headers=headers,
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            print(f"✅ File downloaded successfully")
            print(f"   Content-Type: {response.headers.get('Content-Type')}")
            print(f"   Content-Length: {len(response.content)} bytes")
            print(f"   Content-Disposition: {response.headers.get('Content-Disposition')}")
            
            # Save to test file
            output_dir = os.path.join(script_dir, 'data', 'test_downloads')
            os.makedirs(output_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = os.path.join(output_dir, f'test_document_{timestamp}.pdf')
            
            with open(output_file, 'wb') as f:
                f.write(response.content)
            
            print(f"   💾 Saved to: {output_file}")
            print(f"\n✅ Container field download SUCCESSFUL!")
            return True
            
        else:
            print(f"❌ Download failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def logout(token):
    """Logout from FileMaker Data API"""
    print("\n" + "=" * 80)
    print("Logging out...")
    print("=" * 80)
    
    logout_url = f"{FM_BASE_URL}/sessions/{token}"
    
    try:
        response = requests.delete(
            logout_url,
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            print(f"✅ Logout successful")
        else:
            print(f"⚠️ Logout warning: {response.status_code}")
            
    except Exception as e:
        print(f"⚠️ Logout error: {e}")

if __name__ == '__main__':
    if not FM_USERNAME or not FM_PASSWORD:
        print("❌ FileMaker credentials not found in .env file")
        sys.exit(1)
    
    # Test with the first sample record we know exists (UUID)
    test_uuid = "1A127CC7-2A4E-4473-A07F-3D124EE15BB9"
    
    print("=" * 80)
    print("FileMaker Data API - Container Field Test")
    print("=" * 80)
    print(f"Database: {FM_DATABASE}")
    print(f"Layout: API_Docs")
    print(f"Container Field: 'doc'")
    print(f"Test Record UUID: {test_uuid}")
    print()
    
    # Authenticate
    token = authenticate()
    if not token:
        sys.exit(1)
    
    # Find record by UUID to get FileMaker record ID
    fm_record_id = find_record_by_uuid(token, test_uuid)
    if not fm_record_id:
        print("\n❌ Could not find record by UUID")
        logout(token)
        sys.exit(1)
    
    # Get record with container field
    container_data = get_sample_record(token, fm_record_id)
    
    # If we got a URL, try to download it
    if container_data and container_data.get('type') == 'url':
        success = download_container_url(container_data)
        if success:
            print("\n" + "=" * 80)
            print("🎉 SUCCESS! Container field is accessible via Data API")
            print("=" * 80)
            print("\nNext Steps:")
            print("1. ✅ Container field 'doc' confirmed working")
            print("2. ✅ Files can be downloaded via URL")
            print("3. ⏭️ Design bulk export script")
            print("4. ⏭️ Upload to S3")
    elif container_data:
        print("\n" + "=" * 80)
        print(f"⚠️ Container field found but format is: {container_data.get('type')}")
        print("=" * 80)
        print("\nMay need alternative approach for this format")
    else:
        print("\n" + "=" * 80)
        print("❌ Container field not accessible or empty")
        print("=" * 80)
        print("\nNext Steps:")
        print("1. Check if container field name is correct")
        print("2. Check if record has a file")
        print("3. Try alternative export methods")
    
    # Logout
    logout(token)
    
    print("\n" + "=" * 80)
    print("✅ Test complete!")
    print("=" * 80)

