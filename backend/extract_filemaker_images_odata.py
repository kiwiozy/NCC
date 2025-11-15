#!/usr/bin/env python3
"""
Extract FileMaker Image Metadata via OData (No Export Needed!)

This script:
1. Connects to FileMaker OData API
2. Retrieves ALL image metadata with NexusExportDate = "1"
3. Saves to CSV for the linking script
4. Batches requests to avoid timeouts

Usage:
    python extract_filemaker_images_odata.py
    python extract_filemaker_images_odata.py --batch-size 500
    python extract_filemaker_images_odata.py --output custom_name.csv
"""

import requests
from requests.auth import HTTPBasicAuth
import csv
import json
import time
from datetime import datetime
import urllib3
import os

# Suppress SSL warnings for FileMaker Cloud
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

DEFAULT_BATCH_SIZE = 500  # Records per request
DEFAULT_OUTPUT_FILE = "filemaker_images_metadata.csv"

# ============================================================================
# FUNCTIONS
# ============================================================================

def fetch_batch(skip=0, top=500):
    """
    Fetch a batch of records from FileMaker OData
    
    Args:
        skip: Number of records to skip
        top: Number of records to return
    
    Returns:
        List of records or None if error
    """
    try:
        params = {
            "$select": "__ID,id_Contact,date,Type,Note",
            "$filter": "NexusExportDate eq '1'",
            "$skip": skip,
            "$top": top,
            "$count": "true"  # Get total count in first request
        }
        
        response = requests.get(
            FILEMAKER_ODATA_URL,
            auth=HTTPBasicAuth(FILEMAKER_USERNAME, FILEMAKER_PASSWORD),
            params=params,
            verify=False,
            timeout=120  # 2 minute timeout
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
        print(f"⏱️  Timeout fetching batch (skip={skip}, top={top})")
        return None, None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None, None


def extract_all_records(batch_size=500, output_file=DEFAULT_OUTPUT_FILE):
    """
    Extract all image metadata from FileMaker via OData in batches
    
    Args:
        batch_size: Records per batch
        output_file: CSV output filename
    """
    print("=" * 70)
    print("📊 FileMaker Image Metadata Extraction (OData)")
    print("=" * 70)
    print(f"Batch size: {batch_size}")
    print(f"Output file: {output_file}")
    print()
    
    # Track progress
    all_records = []
    skip = 0
    total_count = None
    batch_num = 1
    
    start_time = time.time()
    
    # Fetch batches until we have all records
    while True:
        print(f"\n⚡ Batch {batch_num}: Fetching records {skip+1} to {skip+batch_size}...")
        
        records, count = fetch_batch(skip=skip, top=batch_size)
        
        if records is None:
            print(f"⚠️  Failed to fetch batch {batch_num}")
            # Try again with smaller batch
            if batch_size > 100:
                print(f"   Retrying with smaller batch ({batch_size // 2})...")
                batch_size = batch_size // 2
                continue
            else:
                print(f"   Skipping batch after retry failure")
                skip += batch_size
                batch_num += 1
                continue
        
        # First batch gets total count
        if total_count is None and count is not None:
            total_count = count
            print(f"   📊 Total records to fetch: {total_count}")
        
        # Add records to collection
        all_records.extend(records)
        fetched = len(all_records)
        
        if total_count:
            progress = (fetched / total_count) * 100
            print(f"   ✅ Got {len(records)} records ({fetched}/{total_count} = {progress:.1f}%)")
        else:
            print(f"   ✅ Got {len(records)} records (total: {fetched})")
        
        # Check if we're done
        if len(records) < batch_size:
            print(f"\n🎉 Reached end of records!")
            break
        
        if total_count and fetched >= total_count:
            print(f"\n🎉 Fetched all {total_count} records!")
            break
        
        # Next batch
        skip += batch_size
        batch_num += 1
        
        # Small delay to be nice to FileMaker server
        time.sleep(0.5)
    
    elapsed = time.time() - start_time
    
    print()
    print("=" * 70)
    print("💾 Writing CSV...")
    print("=" * 70)
    
    if not all_records:
        print("❌ No records to write!")
        return
    
    # Write to CSV
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            # Define field mapping
            fieldnames = ['recid', 'id_Contact', 'date', 'Type', 'Note']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            
            for record in all_records:
                writer.writerow({
                    'recid': record.get('__ID', ''),
                    'id_Contact': record.get('id_Contact', ''),
                    'date': record.get('date', ''),
                    'Type': record.get('Type', ''),
                    'Note': record.get('Note', '')
                })
        
        print(f"✅ Wrote {len(all_records)} records to {output_file}")
        print(f"⏱️  Total time: {elapsed:.1f} seconds")
        print()
        
        # Show sample
        print("📋 Sample records:")
        for i, record in enumerate(all_records[:3]):
            print(f"   {i+1}. RecordID={record.get('__ID')}, "
                  f"Patient={record.get('id_Contact', 'N/A')[:8]}..., "
                  f"Date={record.get('date', 'N/A')}")
        
        print()
        print("=" * 70)
        print("✅ EXTRACTION COMPLETE!")
        print("=" * 70)
        print()
        print("📍 Next step:")
        print(f"   python manage.py link_filemaker_images --csv {output_file}")
        
    except Exception as e:
        print(f"❌ Error writing CSV: {str(e)}")


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Extract FileMaker image metadata via OData')
    parser.add_argument('--batch-size', type=int, default=DEFAULT_BATCH_SIZE,
                      help=f'Records per batch (default: {DEFAULT_BATCH_SIZE})')
    parser.add_argument('--output', type=str, default=DEFAULT_OUTPUT_FILE,
                      help=f'Output CSV filename (default: {DEFAULT_OUTPUT_FILE})')
    
    args = parser.parse_args()
    
    extract_all_records(batch_size=args.batch_size, output_file=args.output)

