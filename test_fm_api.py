#!/usr/bin/env python3
"""
FileMaker Data API - Full Connectivity Test Script
Tests all endpoints described in Test_FileMaker_Data_API.md
"""

import os
import sys
import json
import requests
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime

# Disable SSL warnings (if needed for self-signed certs)
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables
load_dotenv()

# Configuration
FM_BASE = os.getenv("FM_BASE", "").rstrip("/")
FM_DB = os.getenv("FM_DB")
FM_USER = os.getenv("FM_USER")
FM_PASS = os.getenv("FM_PASS")
FM_LAYOUT = os.getenv("FM_LAYOUT", "Contacts")

# Add https:// if not present
if FM_BASE and not FM_BASE.startswith(("http://", "https://")):
    FM_BASE = f"https://{FM_BASE}"

# Validation
if not all([FM_BASE, FM_DB, FM_USER, FM_PASS]):
    print("❌ Missing required environment variables!")
    print("Please ensure .env contains: FM_BASE, FM_DB, FM_USER, FM_PASS")
    sys.exit(1)

print("=" * 70)
print("🧪 FileMaker Data API - Full Connectivity Test")
print("=" * 70)
print(f"📍 Server: {FM_BASE}")
print(f"📊 Database: {FM_DB}")
print(f"👤 User: {FM_USER}")
print(f"📄 Layout: {FM_LAYOUT}")
print("=" * 70)
print()

# Create downloads directory
downloads_dir = Path("downloads")
downloads_dir.mkdir(exist_ok=True)

class FileMakerAPI:
    def __init__(self, base_url, database, username, password):
        self.base_url = base_url
        self.database = database
        self.username = username
        self.password = password
        self.token = None
        self.session = requests.Session()
        # For self-signed certs, set verify=False (not recommended for production)
        self.verify_ssl = True
        
    def authenticate(self):
        """Step 2: Get API Token"""
        print("🔑 Step 1: Authenticating...")
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/sessions"
        
        try:
            response = self.session.post(
                url,
                auth=(self.username, self.password),
                headers={"Content-Type": "application/json"},
                verify=self.verify_ssl,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("response", {}).get("token")
                if self.token:
                    print(f"   ✅ Success! Token: {self.token[:8]}...")
                    return True
                else:
                    print("   ❌ No token in response")
                    print(f"   Response: {json.dumps(data, indent=2)}")
                    return False
            else:
                print(f"   ❌ Authentication failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Connection error: {e}")
            return False
    
    def list_layouts(self):
        """Step 3: List Available Layouts"""
        print("\n📋 Step 2: Listing Available Layouts...")
        if not self.token:
            print("   ❌ Not authenticated")
            return None
            
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/layouts"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = self.session.get(url, headers=headers, verify=self.verify_ssl, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                layouts = data.get("response", {}).get("layouts", [])
                print(f"   ✅ Found {len(layouts)} layouts:")
                for layout in layouts[:20]:  # Show first 20
                    layout_name = layout.get("name") if isinstance(layout, dict) else layout
                    print(f"      • {layout_name}")
                if len(layouts) > 20:
                    print(f"      ... and {len(layouts) - 20} more")
                return layouts
            else:
                print(f"   ❌ Failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Connection error: {e}")
            return None
    
    def fetch_records(self, layout_name, limit=5):
        """Step 4: Fetch Sample Records"""
        print(f"\n📄 Step 3: Fetching Records from '{layout_name}' (limit={limit})...")
        if not self.token:
            print("   ❌ Not authenticated")
            return None
            
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/layouts/{layout_name}/records"
        headers = {"Authorization": f"Bearer {self.token}"}
        params = {"_limit": limit}
        
        try:
            response = self.session.get(
                url, 
                headers=headers, 
                params=params, 
                verify=self.verify_ssl,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                records = data.get("response", {}).get("data", [])
                print(f"   ✅ Retrieved {len(records)} records")
                
                if records:
                    print("\n   📋 Sample Record Fields:")
                    first_record = records[0]
                    field_data = first_record.get("fieldData", {})
                    
                    for field_name, field_value in list(field_data.items())[:10]:
                        # Truncate long values
                        display_value = str(field_value)
                        if len(display_value) > 60:
                            display_value = display_value[:60] + "..."
                        print(f"      • {field_name}: {display_value}")
                    
                    if len(field_data) > 10:
                        print(f"      ... and {len(field_data) - 10} more fields")
                
                return records
            else:
                print(f"   ❌ Failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Connection error: {e}")
            return None
    
    def download_container(self, container_url, filename=None):
        """Step 5: Download Container Field"""
        print(f"\n📎 Step 4: Downloading Container Field...")
        if not self.token:
            print("   ❌ Not authenticated")
            return False
            
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"container_{timestamp}.bin"
        
        filepath = downloads_dir / filename
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = self.session.get(
                container_url, 
                headers=headers, 
                verify=self.verify_ssl,
                timeout=30,
                stream=True
            )
            
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                file_size = filepath.stat().st_size
                print(f"   ✅ Downloaded: {filepath} ({file_size:,} bytes)")
                return True
            else:
                print(f"   ❌ Failed: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Connection error: {e}")
            return False
    
    def find_and_download_containers(self, records):
        """Find container fields in records and download them"""
        if not records:
            return
        
        container_count = 0
        print("\n🔍 Searching for container fields...")
        
        for idx, record in enumerate(records[:3]):  # Check first 3 records
            field_data = record.get("fieldData", {})
            for field_name, field_value in field_data.items():
                # Container fields typically contain URLs
                if isinstance(field_value, str) and "/fmi/" in field_value and ":" in field_value:
                    print(f"\n   Found container field: {field_name}")
                    print(f"   URL: {field_value}")
                    
                    # Extract filename from field name
                    filename = f"record_{idx}_{field_name}.bin"
                    self.download_container(field_value, filename)
                    container_count += 1
        
        if container_count == 0:
            print("   ℹ️  No container fields found in sample records")
    
    def logout(self):
        """Step 7: Logout"""
        print("\n🚪 Step 5: Logging out...")
        if not self.token:
            print("   ℹ️  No active session")
            return
            
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/sessions/{self.token}"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = self.session.delete(url, headers=headers, verify=self.verify_ssl, timeout=10)
            
            if response.status_code == 200:
                print("   ✅ Logged out successfully")
            else:
                print(f"   ⚠️  Logout status: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Connection error: {e}")


def main():
    # Initialize API
    api = FileMakerAPI(FM_BASE, FM_DB, FM_USER, FM_PASS)
    
    # Step 1: Authenticate
    if not api.authenticate():
        print("\n❌ Authentication failed. Please check your credentials and server URL.")
        print("\nTroubleshooting:")
        print("  • Verify the FileMaker account has 'fmrest' extended privilege")
        print("  • Check that the database name is correct (without .fmp12)")
        print("  • Confirm the server URL is accessible")
        sys.exit(1)
    
    # Step 2: List Layouts
    layouts = api.list_layouts()
    
    # Step 3: Fetch Records
    if layouts:
        records = api.fetch_records(FM_LAYOUT, limit=5)
        
        # Step 4: Download Containers
        if records:
            api.find_and_download_containers(records)
    
    # Step 5: Logout
    api.logout()
    
    # Summary
    print("\n" + "=" * 70)
    print("✅ Test Complete!")
    print("=" * 70)
    print("\n📊 Summary:")
    print(f"   • Server: {FM_BASE}")
    print(f"   • Database: {FM_DB}")
    print(f"   • Layouts: {'✅ Retrieved' if layouts else '❌ Failed'}")
    print(f"   • Records: {'✅ Retrieved' if records else '❌ Failed'}")
    print(f"   • Downloads: Check {downloads_dir}/ folder")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

