#!/usr/bin/env python3
"""
Extract FileMaker Image Metadata via OData (NO FILTER VERSION)

This version:
1. Gets ALL images from FileMaker (no filter - avoids OData syntax errors)
2. Matches with S3 images locally
3. Saves matched records to CSV

Usage:
    python extract_filemaker_all_images.py
"""

import requests
from requests.auth import HTTPBasicAuth
import csv
import time
import boto3
import os
import urllib3

# Suppress SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ============================================================================
# CONFIGURATION
# ============================================================================

FILEMAKER_ODATA_URL = "https://walkeasy.fmcloud.fm/fmi/odata/v4/WEP-DatabaseV2/API_Images"

# Get credentials from environment variables
FILEMAKER_USERNAME = os.environ.get('FILEMAKER_USERNAME')
FILEMAKER_PASSWORD = os.environ.get('FILEMAKER_PASSWORD')

if not FILEMAKER_USERNAME or not FILEMAKER_PASSWORD:
    raise ValueError(
        "FileMaker credentials not found!\n"
        "Please set FILEMAKER_USERNAME and FILEMAKER_PASSWORD environment variables.\n"
        "You can add them to .env.filemaker file."
    )

S3_BUCKET = "walkeasy-nexus-documents"
S3_PREFIX = "filemaker-import/images-bulk-dump/"

DEFAULT_BATCH_SIZE = 1000  # Records per request
OUTPUT_FILE = "filemaker_images_metadata.csv"

# ============================================================================
# STEP 1: Get S3 Image RecordIDs
# ============================================================================

def get_s3_record_ids():
    """Get all RecordIDs from S3 filenames"""
    print("=" * 70)
    print("📦 Step 1: Getting RecordIDs from S3...")
    print("=" * 70)
    
    s3 = boto3.client('s3')
    record_ids = set()
    
    paginator = s3.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=S3_BUCKET, Prefix=S3_PREFIX)
    
    for page in pages:
        for obj in page.get('Contents', []):
            key = obj['Key']
            if key == S3_PREFIX:
                continue
            
            # Extract RecordID from filename (e.g., "123.jpg" -> "123")
            filename = key.replace(S3_PREFIX, '')
            recid = filename.split('.')[0]
            record_ids.add(recid)
    
    print(f"✅ Found {len(record_ids)} images in S3")
    return record_ids

# ============================================================================
# STEP 2: Fetch FileMaker Metadata in Batches
# ============================================================================

def fetch_batch(skip=0, top=1000):
    """Fetch a batch of ALL records from FileMaker (no filter)"""
    try:
        params = {
            "$select": "__ID,id_Contact,date,Type,Note",
            "$skip": skip,
            "$top": top,
            "$count": "true"
        }
        
        response = requests.get(
            FILEMAKER_ODATA_URL,
            auth=HTTPBasicAuth(FILEMAKER_USERNAME, FILEMAKER_PASSWORD),
            params=params,
            verify=False,
            timeout=120
        )
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('value', [])
            total_count = data.get('@odata.count', None)
            return records, total_count
        else:
            print(f"❌ Error {response.status_code}: {response.text[:200]}")
            return None, None
            
    except requests.exceptions.Timeout:
        print(f"⏱️  Timeout fetching batch (skip={skip})")
        return None, None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None, None


def fetch_all_records(s3_record_ids, batch_size=1000):
    """Fetch all FileMaker records and filter locally"""
    print()
    print("=" * 70)
    print("📊 Step 2: Fetching metadata from FileMaker...")
    print("=" * 70)
    print(f"Batch size: {batch_size}")
    print()
    
    matched_records = []
    skip = 0
    total_count = None
    batch_num = 1
    start_time = time.time()
    
    while True:
        print(f"⚡ Batch {batch_num}: Fetching records {skip+1} to {skip+batch_size}...")
        
        records, count = fetch_batch(skip=skip, top=batch_size)
        
        if records is None:
            print(f"⚠️  Failed to fetch batch {batch_num}, skipping...")
            skip += batch_size
            batch_num += 1
            continue
        
        # First batch gets total count
        if total_count is None and count is not None:
            total_count = count
            print(f"   📊 Total FileMaker records: {total_count}")
        
        # Filter: only keep records that exist in S3
        batch_matched = 0
        for record in records:
            recid = str(record.get('__ID', ''))
            if recid in s3_record_ids:
                matched_records.append(record)
                batch_matched += 1
        
        print(f"   ✅ Got {len(records)} records, {batch_matched} matched S3")
        print(f"   📈 Total matched so far: {len(matched_records)}")
        
        # Check if we're done
        if len(records) < batch_size:
            print(f"\n🎉 Reached end of FileMaker records!")
            break
        
        # Next batch
        skip += batch_size
        batch_num += 1
        time.sleep(0.3)  # Be nice to server
    
    elapsed = time.time() - start_time
    print(f"\n⏱️  Fetched in {elapsed:.1f} seconds")
    
    return matched_records

# ============================================================================
# STEP 3: Write CSV
# ============================================================================

def write_csv(records, output_file=OUTPUT_FILE):
    """Write matched records to CSV"""
    print()
    print("=" * 70)
    print("💾 Step 3: Writing CSV...")
    print("=" * 70)
    
    if not records:
        print("❌ No records to write!")
        return False
    
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['recid', 'id_Contact', 'date', 'Type', 'Note']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            
            for record in records:
                writer.writerow({
                    'recid': record.get('__ID', ''),
                    'id_Contact': record.get('id_Contact', ''),
                    'date': record.get('date', ''),
                    'Type': record.get('Type', ''),
                    'Note': record.get('Note', '')
                })
        
        print(f"✅ Wrote {len(records)} records to {output_file}")
        print()
        
        # Show sample
        print("📋 Sample records:")
        for i, record in enumerate(records[:5]):
            print(f"   {i+1}. RecordID={record.get('__ID')}, "
                  f"Patient={record.get('id_Contact', 'N/A')[:8]}..., "
                  f"Date={record.get('date', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error writing CSV: {str(e)}")
        return False

# ============================================================================
# MAIN
# ============================================================================

def main():
    print()
    print("🚀 FileMaker Image Metadata Extraction (S3-Matched)")
    print()
    
    # Step 1: Get S3 RecordIDs
    s3_record_ids = get_s3_record_ids()
    
    if not s3_record_ids:
        print("❌ No images found in S3!")
        return
    
    # Step 2: Fetch all FileMaker records and match locally
    matched_records = fetch_all_records(s3_record_ids)
    
    print()
    print("=" * 70)
    print("📊 RESULTS")
    print("=" * 70)
    print(f"S3 images: {len(s3_record_ids)}")
    print(f"Matched records: {len(matched_records)}")
    print(f"Unmatched: {len(s3_record_ids) - len(matched_records)}")
    
    if matched_records:
        # Step 3: Write CSV
        success = write_csv(matched_records)
        
        if success:
            print()
            print("=" * 70)
            print("✅ EXTRACTION COMPLETE!")
            print("=" * 70)
            print()
            print("📍 Next step:")
            print(f"   python manage.py link_filemaker_images --csv {OUTPUT_FILE}")
            print()
    else:
        print()
        print("❌ No matched records found!")
        print("   This might mean the RecordIDs in S3 don't match FileMaker __ID field")

if __name__ == "__main__":
    main()

