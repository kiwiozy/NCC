#!/usr/bin/env python3
"""
Convert FileMaker tab export to CSV for image linking

Reads: Image_DataV6.tab (with CR line endings)
Writes: filemaker_images_metadata.csv

Fields we need:
- recid (column 7 / index 6) - S3 filename
- id_Contact (column 4 / index 3) - Patient UUID
- date (column 1 / index 0) - Image date
- Type (column 8 / index 7) - Image category
"""

import csv
import sys

INPUT_FILE = "../Image_DataV6.tab"  # In project root
OUTPUT_FILE = "filemaker_images_metadata.csv"

print("=" * 70)
print("🔄 Converting FileMaker Tab Export to CSV")
print("=" * 70)
print(f"Input: {INPUT_FILE}")
print(f"Output: {OUTPUT_FILE}")
print()

try:
    # Read tab file with universal newlines mode to handle CR
    with open(INPUT_FILE, 'r', encoding='utf-8', newline='') as f:
        content = f.read()
    
    # Split by CR (carriage return) - FileMaker export uses \r
    lines = [line for line in content.split('\r') if line.strip()]
    
    print(f"✅ Found {len(lines)} records")
    
    # Parse and write CSV
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=['recid', 'id_Contact', 'date', 'Type', 'Note'])
        writer.writeheader()
        
        for i, line in enumerate(lines):
            if not line.strip():
                continue
            
            # Split by tab
            fields = line.split('\t')
            
            if len(fields) < 8:
                print(f"⚠️  Skipping line {i+1}: Not enough fields ({len(fields)})")
                continue
            
            # Extract fields (0-indexed)
            # 0: date, 1: fileName, 2: id, 3: id_Contact, 
            # 4: Name_of_file, 5: NexusExportDate, 6: recid, 7: Type
            
            recid = fields[6].strip()
            id_contact = fields[3].strip()
            date = fields[0].strip()
            image_type = fields[7].strip() if len(fields) > 7 else ''
            
            # Skip if no recid (essential)
            if not recid:
                print(f"⚠️  Skipping line {i+1}: No recid")
                continue
            
            writer.writerow({
                'recid': recid,
                'id_Contact': id_contact,
                'date': date,
                'Type': image_type,
                'Note': ''  # Not in FileMaker export
            })
    
    print()
    print("=" * 70)
    print("✅ CONVERSION COMPLETE!")
    print("=" * 70)
    print()
    print("📊 Sample records:")
    
    # Show first 5 records
    with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= 5:
                break
            print(f"   {i+1}. recid={row['recid']}, patient={row['id_Contact'][:8]}..., date={row['date']}, type={row['Type']}")
    
    print()
    print("📍 Next step:")
    print(f"   python manage.py link_filemaker_images --csv {OUTPUT_FILE}")
    print()

except Exception as e:
    print(f"❌ Error: {str(e)}")
    sys.exit(1)

