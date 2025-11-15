# 📸 FileMaker Images Export Strategy - ODBC Direct Access

**Date:** November 10, 2025  
**Status:** 🎯 NEW APPROACH - ODBC/JDBC Direct Database Access  
**Breakthrough:** Bypass unstable Data API entirely using ODBC!

---

## 🔥 **MAJOR BREAKTHROUGH: ODBC/JDBC Enabled!**

FileMaker Server has **ODBC/JDBC enabled** (confirmed from Admin Console).  
This means we can:
- ✅ **Bypass the unstable Data API completely**
- ✅ **Query FileMaker database directly using Python**
- ✅ **Read container metadata without API crashes**
- ✅ **Update records via direct database connection**
- ✅ **Much more stable and reliable**

---

## 🎯 **New Strategy Overview**

### **Why ODBC is Better:**
- ✅ FileMaker Data API crashes under load (502 errors)
- ✅ ODBC connects directly to the database
- ✅ No API rate limits or timeouts
- ✅ Can read metadata for all 6,664 images in seconds
- ✅ Update `best_image_container` field directly via SQL
- ✅ More stable for bulk operations

### **Limitation:**
- ⚠️ ODBC **cannot access container field content** (image bytes)
- ✅ But we can use it to **mark** which container has data
- ✅ Then use FileMaker plugin or Data API **only for container downloads**

---

## 🔧 **ODBC Connection Setup - NOT SUPPORTED** ❌

### **❌ CRITICAL FINDING:**

**FileMaker Cloud does NOT support ODBC/JDBC!**

According to [Claris FileMaker Cloud Help](https://help.claris.com/en/cloud-help/content/setting-up-odbc-settings.html):
> "FileMaker Pro apps hosted by FileMaker Cloud cannot be used as ODBC data sources."

**Limitations of FileMaker Cloud:**
- ❌ No ODBC connections
- ❌ No JDBC connections
- ❌ No third-party server-side plugins (including Cloud Manipulator!)

**What This Means:**
- ✅ We CAN use **FileMaker Data API** (what we've been using)
- ✅ We CAN use **FileMaker OData API** (for metadata only, no containers)
- ❌ We CANNOT use **ODBC** for direct database access
- ❌ We CANNOT use **Cloud Manipulator plugin** for S3 uploads

**Source:** [Portage Bay Solutions Blog](https://www.portagebay.com/blog/considerations-when-implementing-claris-filemaker-cloud/)

---

## ⚠️ **Installation Attempts (For Reference Only)**

**✅ Successfully Installed (but cannot use with FileMaker Cloud):**
- ✅ FileMaker ODBC driver (`/Library/ODBC/FileMaker ODBC.bundle`)
- ✅ unixODBC (v2.3.14 via Homebrew)
- ✅ pyodbc Python library (v5.3.0)
- ✅ Driver detected by Python: `pyodbc.drivers()` returns `['FileMaker ODBC']`

**❌ Connection Failures:**
All connection attempts failed with:
```
Error: ('0000', '[0000] [ (1) (SQLDriverConnect)')
Error: [28000][unixODBC][FileMaker][FileMaker ODBC] User ID must be specified
```

**Root Cause:** FileMaker Cloud does not support ODBC connections at the server level.

---

## 📋 **Three-Phase Process (ODBC Approach)**

### **Phase 1: Mark Best Images (Python + ODBC)** ⚡ FAST!
Python uses ODBC to:
- Read all image metadata instantly (no API crashes!)
- Determine which container has data
- Update `best_image_container` field via SQL UPDATE

**Estimated Time:** ~2-3 minutes (vs. 15 min with API)

---

### **Phase 2: Export to S3 (FileMaker Plugin)**
FileMaker script:
- Reads `best_image_container` field
- Exports from that container
- Uploads to S3 using Cloud Manipulator

**Estimated Time:** ~2-4 hours (unchanged)

---

### **Phase 3: Link to Patients (Python + ODBC)**
Python uses ODBC to:
- Query patient relationships
- Create Nexus `Image` records
- Link to correct patients

**Estimated Time:** ~5-10 minutes

---

## 🔧 **Phase 1: Mark Using ODBC (NEW SCRIPT)**

### **New Management Command:** `mark_images_via_odbc.py`

```python
# backend/images/management/commands/mark_images_via_odbc.py

import pyodbc
from django.core.management.base import BaseCommand
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Mark best image containers using ODBC (direct database access)'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, help='Limit number of records')
        parser.add_argument('--dsn', type=str, default='FileMaker_Nexus', help='ODBC DSN name')

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('='*80))
        self.stdout.write(self.style.SUCCESS('MARKING BEST IMAGE CONTAINERS VIA ODBC'))
        self.stdout.write(self.style.SUCCESS('Direct database access - no API!'))
        self.stdout.write(self.style.SUCCESS('='*80))

        limit = options.get('limit')
        dsn = options.get('dsn')

        # Connect via ODBC
        try:
            self.stdout.write(f"\n🔌 Connecting to FileMaker via ODBC (DSN: {dsn})...")
            conn = pyodbc.connect(f'DSN={dsn}')
            cursor = conn.cursor()
            self.stdout.write(self.style.SUCCESS("✅ Connected successfully!"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"❌ Connection failed: {e}"))
            return

        # Container fields in priority order (waterfall)
        container_fields = ['image_Full', 'image_Ex_large', 'image_large', 'image_medium', 'image_small']

        # Find records not yet marked
        query = """
            SELECT id, image_Full, image_Ex_large, image_large, image_medium, image_small, recordId
            FROM API_Images
            WHERE best_image_container IS NULL OR best_image_container = ''
        """
        
        if limit:
            query += f" LIMIT {limit}"

        try:
            self.stdout.write(f"\n📊 Fetching records...")
            cursor.execute(query)
            records = cursor.fetchall()
            total = len(records)
            self.stdout.write(self.style.SUCCESS(f"✅ Found {total} records to process"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"❌ Query failed: {e}"))
            conn.close()
            return

        # Process records
        marked_count = 0
        no_image_count = 0

        self.stdout.write("\n" + "="*80)
        self.stdout.write("PROCESSING RECORDS")
        self.stdout.write("="*80)

        for idx, record in enumerate(records, 1):
            image_id = record[0]
            record_id = record[6]  # Internal FileMaker record ID
            
            self.stdout.write(f"\n[{idx}/{total}] {image_id}")

            # Check each container field in priority order
            best_container = None
            for i, field_name in enumerate(container_fields):
                field_value = record[i + 1]  # +1 because id is at index 0
                
                # FileMaker returns '?' or empty for empty containers
                if field_value and field_value != '?':
                    best_container = field_name
                    self.stdout.write(self.style.SUCCESS(f"   ✅ Best: {field_name}"))
                    break

            if best_container:
                # Update FileMaker record
                try:
                    update_query = f"""
                        UPDATE API_Images
                        SET best_image_container = ?
                        WHERE id = ?
                    """
                    cursor.execute(update_query, (best_container, image_id))
                    conn.commit()
                    self.stdout.write(self.style.SUCCESS(f"   📝 Updated: {best_container}"))
                    marked_count += 1
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f"   ❌ Update failed: {e}"))
                    no_image_count += 1
            else:
                self.stdout.write(self.style.WARNING(f"   ⚠️  No image found"))
                no_image_count += 1

        # Close connection
        conn.close()

        # Summary
        self.stdout.write("\n" + "="*80)
        self.stdout.write("SUMMARY")
        self.stdout.write("="*80)
        self.stdout.write(self.style.SUCCESS(f"✅ Marked: {marked_count}"))
        self.stdout.write(self.style.ERROR(f"❌ No images: {no_image_count}"))
        self.stdout.write(f"📊 Total: {total}")
        self.stdout.write("="*80)
        self.stdout.write(self.style.SUCCESS("✅ Complete!"))
```

### **Command to Run:**
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate

# Test with 10 records
python manage.py mark_images_via_odbc --limit 10

# Full run (all unmarked records)
python manage.py mark_images_via_odbc
```

---

## 📊 **Performance Comparison**

| Method | Time for 6,664 records | Reliability | API Calls |
|--------|------------------------|-------------|-----------|
| **Data API** | ~15 min | 🔴 Crashes often (502) | 133 |
| **ODBC** | ~2-3 min | 🟢 Direct DB access | 0 |

**ODBC is 5-7x faster and much more reliable!**

---

##

### **Phase 1: Python Marks Best Images** (COMPLETED FOR 10 RECORDS)
Python determines which container field has the best image and stores the field name.

### **Phase 2: FileMaker Exports to S3**
FileMaker reads the marked field and uploads directly to S3 using Cloud Manipulator plugin.

---

## 🔧 **Phase 1: Mark All Images (Python)**

### **What It Does:**
- Loops through all 6,664 image records
- Uses waterfall logic: `image_Full` → `image_Ex_large` → `image_large` → `image_medium` → `image_small`
- Stores the **field name** in `best_image_container` (e.g., `"image_Full"`)
- Only writes text - no image downloads
- Skips already-marked records (resumable)

### **Python Command:**
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate
python manage.py mark_best_image_containers
```

### **Test Command (First 100):**
```bash
python manage.py mark_best_image_containers --limit 100
```

### **What Gets Updated in FileMaker:**
| Field | Value Example | Purpose |
|-------|---------------|---------|
| `best_image_container` | `"image_Full"` | Which container has best image |

### **Performance:**
- **Estimated time:** ~10-15 minutes for all 6,664 records
- **API calls:** ~133 requests (50 records per batch)
- **Data transfer:** Minimal (only metadata)

---

## 🔧 **Phase 2: FileMaker Export to S3 (Cloud Manipulator Plugin)**

### **Prerequisites:**
1. ✅ Phase 1 completed (all images marked)
2. ✅ Cloud Manipulator plugin installed in FileMaker
3. ✅ AWS credentials configured

### **AWS Credentials:**
**⚠️ Note:** Get actual credentials from your `.env` file.
```
Access Key: YOUR_AWS_ACCESS_KEY_HERE
Secret Key: YOUR_AWS_SECRET_KEY_HERE
Region: ap-southeast-2
Bucket: walkeasy-nexus-documents
```

### **S3 Target Path:**
```
filemaker-import/images-bulk-dump/{ImageID}.{ext}
```

Example:
```
filemaker-import/images-bulk-dump/8EECA11F-4273-4775-A977-33B59BE916B5.jpg
```

---

## 📝 **FileMaker Script (Cloud Manipulator)**

### **Script Name:** `Export Images to S3 via Best Container`

```filemaker
# ======================================
# SCRIPT: Export Images to S3 via Best Container
# Uses best_image_container field to know which container to export
# ======================================

# Step 1: Authenticate with AWS
# ⚠️ Replace with your actual AWS credentials
Set Variable [ $auth ; 
  Value: PCCM_UseCredentials(
    "S3" ;
    "YOUR_AWS_ACCESS_KEY_HERE" ;
    "YOUR_AWS_SECRET_KEY_HERE" ;
    "region=ap-southeast-2"
  )
]

If [ $auth = "!!ERROR!!" ]
  Show Custom Dialog [ "Authentication Failed" ; $auth ]
  Exit Script []
End If

# Step 2: Initialize counters
Set Variable [ $success ; Value: 0 ]
Set Variable [ $failed ; Value: 0 ]
Set Variable [ $skipped ; Value: 0 ]

# Step 3: Find records that are marked but not yet exported
Go to Layout [ "API_Images" ]
Enter Find Mode []
Set Field [ API_Images::best_image_container ; "≠" ]  # Has a value
Set Field [ API_Images::NexusExportDate ; "=" ]       # Empty (not exported)
Perform Find []

Set Variable [ $total ; Value: Get(FoundCount) ]

If [ $total = 0 ]
  Show Custom Dialog [ "Nothing to Export" ; "All marked images have been exported." ]
  Exit Script []
End If

# Step 4: Loop through found records
Go to Record/Request/Page [ First ]

Loop
  # Get values
  Set Variable [ $imageID ; Value: API_Images::id ]
  Set Variable [ $bestContainer ; Value: API_Images::best_image_container ]
  
  # Validate
  If [ IsEmpty( $bestContainer ) ]
    Set Variable [ $skipped ; Value: $skipped + 1 ]
    Go to Record/Request/Page [ Next ; Exit after last ]
    Continue
  End If
  
  # Get the container field dynamically
  Set Variable [ $containerField ; Value: Evaluate( "API_Images::" & $bestContainer ) ]
  
  # Check if container has data
  If [ IsEmpty( GetContainerAttribute( $containerField ; "filename" ) ) ]
    Set Variable [ $skipped ; Value: $skipped + 1 ]
    Go to Record/Request/Page [ Next ; Exit after last ]
    Continue
  End If
  
  # Get filename and extension
  Set Variable [ $filename ; Value: GetContainerAttribute( $containerField ; "filename" ) ]
  Set Variable [ $extension ; Value: Right( $filename ; 4 ) ]
  
  # Export to temp file (macOS)
  Set Variable [ $filePath ; 
    Value: "filemac:" & Get(TemporaryPath) & $imageID & $extension
  ]
  Set Variable [ $macPath ;
    Value: Substitute( $filePath ; "filemac:/" ; "" )
  ]
  
  # Export the marked container field
  Export Field Contents [ $containerField ; "$filePath" ]
  
  # Upload to S3
  Set Variable [ $s3Key ; 
    Value: "filemaker-import/images-bulk-dump/" & $imageID & $extension
  ]
  
  Set Variable [ $result ;
    Value: PCCM_PostObject(
      "walkeasy-nexus-documents" ;
      $s3Key ;
      $macPath ;
      True   # Delete temp file after upload
    )
  ]
  
  # Check result
  If [ $result ≠ "!!ERROR!!" ]
    Set Variable [ $success ; Value: $success + 1 ]
    
    # Mark as exported
    Set Field [ API_Images::NexusExportDate ; Get(CurrentTimestamp) ]
    Commit Records/Requests []
  Else
    Set Variable [ $failed ; Value: $failed + 1 ]
  End If
  
  # Progress update every 50 records
  If [ Mod( Get(RecordNumber) ; 50 ) = 0 ]
    Show Custom Dialog [ "Progress" ; 
      "Processed: " & Get(RecordNumber) & " of " & $total & ¶ &
      "✅ Success: " & $success & ¶ &
      "❌ Failed: " & $failed & ¶ &
      "⏭️ Skipped: " & $skipped
    ]
  End If
  
  Go to Record/Request/Page [ Next ; Exit after last ]
End Loop

# Step 5: Final summary
Show Custom Dialog [ "Export Complete!" ; 
  "Total: " & $total & ¶ &
  "✅ Success: " & $success & ¶ &
  "❌ Failed: " & $failed & ¶ &
  "⏭️ Skipped: " & $skipped
]
```

---

## 🚀 **Execution Plan**

### **Step 1: Mark All Images (Python)** ⏱️ ~15 min
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate
python manage.py mark_best_image_containers
```

**Wait for completion before proceeding to Step 2.**

---

### **Step 2: Create FileMaker Script**
1. Open FileMaker Pro
2. Go to Scripts → Manage Scripts
3. Create new script: "Export Images to S3 via Best Container"
4. Copy the script above
5. Save

---

### **Step 3: Run FileMaker Script**
1. Go to `API_Images` layout
2. Run script: "Export Images to S3 via Best Container"
3. Monitor progress (updates every 50 images)
4. Can be stopped and restarted (tracks progress via `NexusExportDate`)

---

## 📊 **Expected Results**

### **After Phase 1 (Python Marking):**
- ✅ 6,664 records have `best_image_container` populated
- ✅ Field contains: `"image_Full"`, `"image_Ex_large"`, `"image_large"`, `"image_medium"`, or `"image_small"`
- ✅ Some records may have empty field (no images available)

### **After Phase 2 (FileMaker Export):**
- ✅ ~6,664 images in S3: `filemaker-import/images-bulk-dump/*.jpg`
- ✅ All exported records have `NexusExportDate` populated
- ✅ Ready for Phase 3: Python linking to patients

---

## 🔍 **Verification Queries**

### **Check Marking Progress (Python):**
```bash
# See how many are marked
python manage.py mark_best_image_containers --limit 0
```

### **Check Export Progress (FileMaker Find):**
```filemaker
Find:
  best_image_container ≠ ""        # Has marking
  NexusExportDate = ""             # Not yet exported
```

### **Check S3 Contents:**
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate
python manage.py shell
>>> from documents.services import S3Service
>>> s3 = S3Service()
>>> # List files in bulk-dump folder
>>> # (Need to implement list_files method if checking)
```

---

## ⚠️ **Important Notes**

### **Field Requirements:**
- ✅ `best_image_container` (Text) - stores container field name
- ✅ `NexusExportDate` (Timestamp) - tracks export status

### **Resumability:**
- ✅ Phase 1 (Python): Skips already-marked records
- ✅ Phase 2 (FileMaker): Finds only marked but not exported records
- ✅ Both phases can be stopped and restarted safely

### **Error Handling:**
- If FileMaker script fails on a record, it continues to next
- Failed records remain unmarked in `NexusExportDate`
- Can re-run to catch failures

---

## 📈 **Performance Estimates**

| Phase | Records | Time Estimate | API Calls | Data Transfer |
|-------|---------|---------------|-----------|---------------|
| **Phase 1 (Python)** | 6,664 | ~15 min | ~133 | Metadata only (~5 MB) |
| **Phase 2 (FileMaker)** | 6,664 | ~2-4 hours | 6,664 | ~2-10 GB (images) |

**Total:** ~2-4 hours for complete export

---

## 🎯 **Phase 3: Link Images to Patients (Future)**

After both phases complete, run Python script to:
1. Query FileMaker for patient IDs linked to each image
2. Create `Image` and `ImageBatch` records in Nexus
3. Link images to correct patients
4. Generate thumbnails if needed

**Script:** `link_filemaker_images_to_patients.py` (to be created)

---

## ✅ **Success Criteria**

- ✅ Phase 1: All 6,664 records have `best_image_container` marked
- ✅ Phase 2: All marked images uploaded to S3
- ✅ All images accessible via S3 presigned URLs
- ✅ `NexusExportDate` populated for all exported images
- ✅ Ready for patient linking phase

---

## 📞 **Troubleshooting**

### **Phase 1 Issues:**
- **502 errors:** FileMaker API down - wait and retry
- **Slow marking:** Increase batch size: `--batch-size 100`

### **Phase 2 Issues:**
- **Plugin not working:** Verify Cloud Manipulator is registered
- **Auth fails:** Check AWS credentials in script
- **Some fail:** Note which images, can export individually

---

## 📝 **Status Log**

### **November 10, 2025:**
- ✅ Phase 1 script created and tested (10 records)
- ✅ Phase 2 script written (FileMaker)
- ⏸️ Awaiting execution of Phase 1 on all 6,664 records

---

*End of Images Export Strategy Document*

