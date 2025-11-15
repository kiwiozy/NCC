#!/usr/bin/env python3
"""
Test script to discover if FileMaker has multiple container fields for different image sizes.

This will:
1. Connect to FileMaker Data API
2. Get a sample image record
3. Check all container-related fields
4. Identify the largest/best quality image field
"""

import os
import sys
import json
import requests
import base64
from datetime import datetime

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

FM_BASE_URL = f"https://walkeasy.fmcloud.fm/fmi/data/v1/databases/{FM_DATABASE}"

def authenticate():
    """Authenticate with FileMaker Data API"""
    print("=" * 80)
    print("Authenticating with FileMaker Data API...")
    print("=" * 80)
    
    auth_url = f"{FM_BASE_URL}/sessions"
    auth_string = base64.b64encode(f"{FM_USERNAME}:{FM_PASSWORD}".encode()).decode()
    headers = {
        'Authorization': f'Basic {auth_string}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(auth_url, headers=headers, timeout=30, verify=False)
        if response.status_code == 200:
            token = response.json()['response']['token']
            print(f"✅ Authentication successful")
            return token
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def find_sample_record(token, layout="API_Images"):
    """Find a sample image record"""
    print("\n" + "=" * 80)
    print(f"Finding Sample Record from {layout}")
    print("=" * 80)
    
    url = f"{FM_BASE_URL}/layouts/{layout}/_find"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Find any record (limit 1) - use wildcard search
    search_data = {
        "query": [{"id": "*"}],  # Wildcard = get all
        "limit": "1"
    }
    
    try:
        response = requests.post(url, headers=headers, json=search_data, timeout=30, verify=False)
        if response.status_code == 200:
            data = response.json()
            records = data.get('response', {}).get('data', [])
            if records:
                record = records[0]
                print(f"✅ Found sample record")
                print(f"   Record ID: {record.get('recordId')}")
                return record
            else:
                print(f"❌ No records found in {layout}")
                return None
        else:
            print(f"❌ Find failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def analyze_container_fields(record):
    """Analyze all fields to identify container fields"""
    print("\n" + "=" * 80)
    print("Analyzing Fields for Container Data")
    print("=" * 80)
    
    field_data = record.get('fieldData', {})
    container_fields = []
    
    print(f"\n📊 Total Fields: {len(field_data)}")
    print(f"\n🔍 Checking each field...\n")
    
    for field_name, field_value in field_data.items():
        # Check if value is a URL (container field from Data API)
        if isinstance(field_value, str) and field_value.startswith('http'):
            size_bytes = estimate_size_from_url(field_value)
            container_fields.append({
                'name': field_name,
                'type': 'URL (Container)',
                'value': field_value[:100] + '...' if len(field_value) > 100 else field_value,
                'estimated_size_bytes': size_bytes,
                'estimated_size_mb': round(size_bytes / (1024 * 1024), 3) if size_bytes else None
            })
            print(f"✅ CONTAINER FIELD: {field_name}")
            print(f"   Type: URL")
            print(f"   Value: {field_value[:100]}...")
            if size_bytes:
                print(f"   Estimated Size: {round(size_bytes / (1024 * 1024), 3)} MB")
            print()
        # Check if value contains base64 image data (from OData)
        elif isinstance(field_value, str) and ('base64' in field_value.lower() or len(field_value) > 1000):
            size_bytes = len(field_value.encode('utf-8'))
            container_fields.append({
                'name': field_name,
                'type': 'Base64 (Container)',
                'value': field_value[:100] + '...' if len(field_value) > 100 else field_value,
                'estimated_size_bytes': size_bytes,
                'estimated_size_mb': round(size_bytes / (1024 * 1024), 3)
            })
            print(f"✅ CONTAINER FIELD (Base64): {field_name}")
            print(f"   Type: Base64 encoded data")
            print(f"   Size: {round(size_bytes / (1024 * 1024), 3)} MB ({size_bytes} bytes)")
            print()
    
    return container_fields

def estimate_size_from_url(url):
    """Try to estimate file size from URL (optional, for display)"""
    # Could try HEAD request, but for now just return None
    return None

def download_and_compare(container_fields, token):
    """Download each container field and compare actual sizes"""
    print("\n" + "=" * 80)
    print("Downloading & Comparing Container Fields")
    print("=" * 80)
    
    results = []
    
    for field in container_fields:
        if field['type'] == 'URL (Container)':
            url = field['value'].replace('...', '')  # Get full URL from field
            
            # Extract full URL from original record
            # (We'd need to pass the full record here, but for now just document the approach)
            print(f"\n📥 Downloading: {field['name']}")
            print(f"   URL: {url[:80]}...")
            
            try:
                headers = {'Authorization': f'Bearer {token}'}
                response = requests.get(url, headers=headers, stream=True, timeout=60, verify=False)
                response.raise_for_status()
                
                content = response.content
                size_bytes = len(content)
                size_mb = round(size_bytes / (1024 * 1024), 3)
                
                results.append({
                    'field_name': field['name'],
                    'size_bytes': size_bytes,
                    'size_mb': size_mb,
                    'content_type': response.headers.get('Content-Type')
                })
                
                print(f"   ✅ Downloaded: {size_mb} MB ({size_bytes} bytes)")
                print(f"   Content-Type: {response.headers.get('Content-Type')}")
                
            except Exception as e:
                print(f"   ❌ Download failed: {e}")
                results.append({
                    'field_name': field['name'],
                    'error': str(e)
                })
    
    return results

def identify_largest_field(container_fields):
    """Identify which container field has the largest/best quality image"""
    print("\n" + "=" * 80)
    print("🏆 Recommendation: Which Field to Use for Import")
    print("=" * 80)
    
    if not container_fields:
        print("❌ No container fields found!")
        return None
    
    # Sort by estimated size (largest first)
    sorted_fields = sorted(
        [f for f in container_fields if f.get('estimated_size_bytes')],
        key=lambda x: x['estimated_size_bytes'],
        reverse=True
    )
    
    if sorted_fields:
        largest = sorted_fields[0]
        print(f"\n✅ RECOMMENDED FIELD: {largest['name']}")
        print(f"   Size: {largest['estimated_size_mb']} MB")
        print(f"   Type: {largest['type']}")
        print(f"\nReason: Largest file size = best quality")
        
        if len(sorted_fields) > 1:
            print(f"\n📋 Other container fields found:")
            for field in sorted_fields[1:]:
                print(f"   - {field['name']}: {field['estimated_size_mb']} MB")
                print(f"     (Use this as fallback if '{largest['name']}' fails)")
        
        return largest['name']
    else:
        print("❌ Could not determine field sizes")
        return None

def logout(token):
    """Logout from FileMaker Data API"""
    print("\n" + "=" * 80)
    print("Logging out...")
    print("=" * 80)
    
    logout_url = f"{FM_BASE_URL}/sessions/{token}"
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.delete(logout_url, headers=headers, timeout=10, verify=False)
        if response.status_code == 200:
            print("✅ Logout successful")
        else:
            print(f"⚠️ Logout warning: {response.status_code}")
    except Exception as e:
        print(f"⚠️ Logout error: {e}")

if __name__ == '__main__':
    if not FM_USERNAME or not FM_PASSWORD:
        print("❌ FileMaker credentials not found in .env file")
        sys.exit(1)
    
    print("=" * 80)
    print("FileMaker Multiple Image Size Discovery")
    print("=" * 80)
    print(f"Database: {FM_DATABASE}")
    print(f"Layout: API_Images")
    print()
    print("Purpose: Discover if FileMaker stores multiple sizes of the same image")
    print("         (e.g., thumbnail, medium, full-size)")
    print()
    
    # Authenticate
    token = authenticate()
    if not token:
        sys.exit(1)
    
    # Find a sample record
    record = find_sample_record(token, layout="API_Images")
    if not record:
        logout(token)
        sys.exit(1)
    
    # Analyze fields
    container_fields = analyze_container_fields(record)
    
    if not container_fields:
        print("\n❌ No container fields found!")
        print("   This is unexpected - 'Recovered' should be a container field.")
        logout(token)
        sys.exit(1)
    
    # Identify largest field
    recommended_field = identify_largest_field(container_fields)
    
    # Save results
    output_dir = os.path.join(script_dir, 'data', 'discovery')
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = os.path.join(output_dir, f'image_container_analysis_{timestamp}.json')
    
    analysis_data = {
        'timestamp': timestamp,
        'layout': 'API_Images',
        'sample_record_id': record.get('recordId'),
        'container_fields_found': container_fields,
        'recommended_field': recommended_field
    }
    
    with open(output_file, 'w') as f:
        json.dump(analysis_data, f, indent=2)
    
    print(f"\n💾 Analysis saved to: {output_file}")
    
    # Logout
    logout(token)
    
    print("\n" + "=" * 80)
    print("✅ Analysis Complete!")
    print("=" * 80)
    
    if recommended_field:
        print(f"\n🎯 NEXT STEPS:")
        print(f"   1. Use '{recommended_field}' field for image import")
        print(f"   2. Update import script to download from this field")
        print(f"   3. This ensures you get the highest quality images")
    
    print("\n" + "=" * 80)

