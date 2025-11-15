# 🔄 FileMaker Script: Sync NexusExportDate with S3

**Purpose:** Reset NexusExportDate to match what's actually in S3  
**Date:** November 13, 2025

---

## 🎯 **The Problem:**

- S3 has **1,000 images** uploaded
- FileMaker has **6,577 records** with `NexusExportDate` set
- This means **5,577 records** have dates but no S3 upload!

---

## ✅ **Solution: Two-Step Process**

### **Step 1: Clear ALL NexusExportDate Fields**

```filemaker
# ============================================================================
# SCRIPT: Clear All NexusExportDate Fields
# PURPOSE: Reset all dates to prepare for fresh sync
# ============================================================================

Allow User Abort [ On ]
Set Error Capture [ On ]

Go to Layout [ "API_Images_Export" (@Images) ; Animation: None ]
Show All Records

Set Variable [ $totalRecords ; Value: Get ( FoundCount ) ]

Show Custom Dialog [ "Clear All Dates?" ; "This will clear NexusExportDate for all " & $totalRecords & " records." & ¶ & ¶ & "Ready to proceed?" ]

If [ Get ( LastMessageChoice ) = 2 ]
    Exit Script [ Text Result: "" ]
End If

Go to Record/Request/Page [ First ]

Set Variable [ $counter ; Value: 0 ]

Loop [ Flush: Always ]
    Exit Loop If [ Get ( RecordNumber ) > $totalRecords ]
    
    # Clear the date
    Set Field [ API_Images::NexusExportDate ; "" ]
    Commit Records/Requests [ With dialog: Off ]
    
    Set Variable [ $counter ; Value: $counter + 1 ]
    
    # Progress every 500 records
    If [ Mod ( $counter ; 500 ) = 0 ]
        Show Custom Dialog [ "Progress" ; "Cleared: " & $counter & " of " & $totalRecords ]
    End If
    
    Go to Record/Request/Page [ Next ; Exit after last: On ]
End Loop

Show Custom Dialog [ "Complete!" ; "Cleared " & $counter & " NexusExportDate fields." & ¶ & ¶ & "Now run the upload script to re-mark uploaded images." ]
```

---

### **Step 2: Use Python to Get S3 List and Update FileMaker**

Since OData connection failed, let's create a **CSV file** of RecordIDs that ARE in S3, then import into FileMaker:

```python
#!/usr/bin/env python3
# Generate CSV of uploaded RecordIDs from S3

import os
import sys
import django
from datetime import datetime
import csv

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from documents.services import S3Service

print("Reading S3...")
s3 = S3Service()
response = s3.s3_client.list_objects_v2(
    Bucket='walkeasy-nexus-documents',
    Prefix='filemaker-import/images-bulk-dump/',
    MaxKeys=10000
)

uploaded_ids = []
if 'Contents' in response:
    for obj in response['Contents']:
        filename = obj['Key'].split('/')[-1]
        record_id = filename.split('.')[0]
        try:
            uploaded_ids.append(int(record_id))
        except ValueError:
            pass

# Write to CSV
csv_file = '/tmp/uploaded_record_ids.csv'
with open(csv_file, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['RecordID'])
    for record_id in sorted(uploaded_ids):
        writer.writerow([record_id])

print(f"✅ Wrote {len(uploaded_ids)} RecordIDs to {csv_file}")
print(f"   Import this file into FileMaker to update NexusExportDate")
```

---

## 🚀 **Easier Alternative: Just Re-Upload Everything!**

Since you only have **1,000 images** uploaded out of **6,664**, the **simplest solution** is:

### **OPTION A: Clear All Dates & Re-Upload** (RECOMMENDED)

1. **Run this script in FileMaker:**

```filemaker
# Quick script to clear all dates
Go to Layout [ "API_Images_Export" (@Images) ]
Show All Records
Replace Field Contents [ API_Images::NexusExportDate ; "" ]
```

2. **Run your upload script**
   - It will find ALL 6,664 records (all have empty dates now)
   - It will skip the 1,000 that actually exist in S3 (they'll fail with "already exists")
   - It will upload the missing 5,664

---

## 🎯 **RECOMMENDED ACTION:**

Since you only have 1,000 uploaded and 5,664 to go, the **fastest solution** is:

1. **Click OK** in your current dialog (upload the 87)
2. **Then run this simple clear script:**

```filemaker
Go to Layout [ "API_Images_Export" (@Images) ]
Show All Records
Replace Field Contents [ API_Images::NexusExportDate ; "" ]
Show Custom Dialog [ "Done!" ; "All dates cleared. Run upload script." ]
```

3. **Run your upload script again**
   - It will process all 6,664 records
   - 1,000 will report as "already uploaded" or fail (already in S3)
   - 5,664 will upload successfully

**This is the SIMPLEST approach!** 

---

## 📋 **Which do you prefer?**

**A)** Clear all dates → Re-run upload script (SIMPLE)  
**B)** Try to fix OData connection (COMPLEX)  
**C)** Just upload the 87 and manually investigate (TEMPORARY)

**I recommend Option A - it's clean, simple, and will work!** 🚀

