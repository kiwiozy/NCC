# 🔗 Link S3 Images to Patient Records (CSV IMPORT METHOD)

**Purpose:** Link the 6,490 images in S3 to patient records using date-based batches

**Strategy:** CSV Export from FileMaker → Python Import → Link to Patients

**Date:** November 14, 2025 (Updated for CSV Import)

---

## 📋 **FileMaker Export Workflow**

### **What Craig Did:**

1. **Created Export Query in FileMaker:**
   - Found all records where `NexusExportDate = "1"` (6,490 images already uploaded to S3)
   - Selected the records that match the S3 images
   
2. **Copied Data to Export Table:**
   - Created a temporary "found set" of the 6,490 records
   - Exported this found set to a **tab-delimited file** (`Image_DataV6.tab`)
   
3. **Exported Tab File:**
   - File contains: `date`, `fileName`, `id`, `id_Contact`, `Name_of_file`, `NexusExportDate`, **`recid`**, `Type`
   - **Key field:** `recid` (column 7) - This is the S3 filename!
   - Export uses **CR (Carriage Return) line endings** (old Mac format)

### **Why This Works:**

- ✅ **Fast:** No OData API issues (FileMaker OData doesn't like filters on text fields)
- ✅ **Reliable:** Direct export from FileMaker, no timeout issues
- ✅ **Simple:** One export, one CSV conversion, done!
- ✅ **Future-proof:** For future image dumps, just find `NexusExportDate = "1"` to see what's left to export

### **Moving Forward:**

**For future image exports:**
1. Run FileMaker S3 upload script (marks images with `NexusExportDate = "1"`)
2. Find all records where `NexusExportDate = "1"` in FileMaker
3. Export that found set to tab-delimited file
4. Run Python conversion script
5. Run linking script

This ensures we only process images that have been successfully uploaded to S3!

---

## 🎯 **CSV Import Strategy**

Instead of querying FileMaker OData API (which has issues with text field filters), we:

### What We Have:
- ✅ 6,490 images in S3 `filemaker-import/images-bulk-dump/`
- ✅ Filenames are RecordIDs (`2.jpg`, `3.jpg`, `6066.jpg`)
- ✅ Tab-delimited export from FileMaker (`Image_DataV6.tab`)
- ✅ Images stay in S3 as backup, **COPIED** (not moved) to patient folders

### What We'll Do:
1. 🔄 **Convert tab file to CSV** (handle CR line endings)
2. 📊 **Read CSV metadata** (recid, patient ID, date, type)
3. 🔍 **Match RecordIDs to S3 images** (local lookups)
4. 📅 **Group by patient + date**
5. 📦 **Create `ImageBatch` + `Image` records**
6. 📁 **COPY images** from `images-bulk-dump/` to `patients/{uuid}/images/{batch}/`
7. 🎨 **Display in Images tab**

### S3 Structure:
```
walkeasy-nexus-documents/
├── filemaker-import/
│   └── images-bulk-dump/        ← ORIGINAL BACKUP (KEEP!)
│       ├── 2.jpg
│       ├── 3.jpg
│       └── ...
│
└── patients/
    └── {patient-uuid}/
        └── images/
            └── {batch-uuid}/     ← COPIES (for display)
                ├── 2.jpg
                ├── 3.jpg
                └── ...
```

### Speed:
- ✅ **CSV conversion:** ~2 seconds
- ✅ **Linking:** ~5-10 minutes for 6,490 images 🚀
- ✅ **Total:** Under 15 minutes!

---

## 📊 **Data Flow**

```
Step 1: FileMaker Export (Craig did this!)
   ↓
Image_DataV6.tab (tab-delimited, CR line endings)
   ↓
Step 2: Convert to CSV
   ↓
convert_fm_tab_to_csv.py
   ↓
filemaker_images_metadata.csv
   ↓
Step 3: Link to Patients
   ↓
link_filemaker_images.py --csv filemaker_images_metadata.csv
   ↓
Reads CSV → Matches S3 images → Groups by date → Creates batches → COPIES to patient folders
```

**Example:**

Patient **John Smith** (`id_Contact = "43669346-9656-4029-A607-E4E8E4386F9E"`) has 10 images:
- 4 images from `10/18/2016` → **Batch 1** ("18 Oct 2016")
- 3 images from `11/05/2016` → **Batch 2** ("5 Nov 2016")
- 3 images from `03/12/2017` → **Batch 3** ("12 Mar 2017")

---

## 🐍 **Python Scripts**

### **Script 1: Convert Tab to CSV**

**File:** `backend/convert_fm_tab_to_csv.py`

This script:
- Reads `Image_DataV6.tab` (handles CR line endings)
- Extracts fields: `recid`, `id_Contact`, `date`, `Type`
- Writes `filemaker_images_metadata.csv`

**Usage:**
```bash
cd backend
python convert_fm_tab_to_csv.py
```

**Output:**
```csv
recid,id_Contact,date,Type,Note
2,43669346-9656-4029-A607-E4E8E4386F9E,10/18/2016,Left Dorsal,
3,43669346-9656-4029-A607-E4E8E4386F9E,10/18/2016,Left Medial,
```

---

### **Script 2: Link Images to Patients (CSV VERSION)**

**File:** `backend/images/management/commands/link_filemaker_images.py`

This Django management command:
1. Reads CSV metadata
2. Lists S3 images in `filemaker-import/images-bulk-dump/`
3. Matches RecordIDs to metadata
4. Groups by patient + date
5. Creates `ImageBatch` records (one per date)
6. Creates `Image` records
7. **COPIES** images from `images-bulk-dump/` to `patients/{uuid}/images/{batch}/`

**Key Changes from OData Version:**
- ✅ Uses `--csv` argument to read CSV file
- ✅ No FileMaker API calls (faster, more reliable!)
- ✅ Handles FileMaker date formats (`10/18/2016`)
- ✅ COPIES files to patient folders (originals stay as backup)

**Usage:**
```bash
cd backend
python manage.py link_filemaker_images --csv filemaker_images_metadata.csv --dry-run
python manage.py link_filemaker_images --csv filemaker_images_metadata.csv
```

---

## 🚀 **Usage**

### **Step 1: Convert Tab to CSV**
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
python convert_fm_tab_to_csv.py
```

**Output:**
```
======================================================================
🔄 Converting FileMaker Tab Export to CSV
======================================================================
Input: Image_DataV6.tab
Output: filemaker_images_metadata.csv

✅ Found 6490 records

======================================================================
✅ CONVERSION COMPLETE!
======================================================================

📊 Sample records:
   1. recid=2, patient=43669346..., date=10/18/2016, type=Left Dorsal
   2. recid=3, patient=43669346..., date=10/18/2016, type=Left Medial
   ...

📍 Next step:
   python manage.py link_filemaker_images --csv filemaker_images_metadata.csv
```

---

### **Step 2: Test Mode (Dry Run)**
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate
python manage.py link_filemaker_images --csv filemaker_images_metadata.csv --dry-run
```

---

### **Step 3: Process First 100 Images (Test)**
```bash
python manage.py link_filemaker_images --csv filemaker_images_metadata.csv --limit 100
```

---

### **Step 4: Full Run (All 6,490 Images)**
```bash
python manage.py link_filemaker_images --csv filemaker_images_metadata.csv
```

**Expected time:** ~10-15 minutes for 6,490 images! 🚀

---

## 📋 **Prerequisites**

1. ✅ **FileMaker sync complete** - All 6,490 images marked with `NexusExportDate = "1"`
2. ✅ **Patients imported** - All patients have `filemaker_id` in their `notes` field
3. ✅ **S3 images uploaded** - All 6,490 images in `filemaker-import/images-bulk-dump/`
4. ✅ **Image models updated** - `ImageBatch` and `Image` models have FileMaker fields

---

## 📊 **Expected Results**

```
📊 SUMMARY
======================================================================
Total images:          6,490
✅ Batches created:     ~500-800 (depends on how many unique dates)
✅ Images linked:       ~6,000-6,200
⏭️  Skipped:             ~200-400 (no date, no patient, etc.)
❌ Errors:              ~10-20
```

---

## 🔍 **What Gets Created**

### **ImageBatch Records**
```python
ImageBatch(
    patient=patient,
    batch_name="18 Oct 2016 (FileMaker Import)",
    captured_date=datetime.date(2016, 10, 18),
    import_source='filemaker_import'
)
```

### **Image Records**
```python
Image(
    batch=batch,
    s3_key="filemaker-import/images-bulk-dump/228.jpg",
    original_filename="228.jpg",
    file_size=2048000,
    category="Left Dorsal",
    filemaker_id=228,
    filemaker_type="Left Dorsal",
    filemaker_date=datetime.date(2016, 10, 18)
)
```

---

## ⚠️ **Important Notes**

1. **Requires date field** - Images without `date` in FileMaker will be skipped
2. **Groups by exact date** - Same date = same batch
3. **Preserves categories** - Uses exact FileMaker `Type` field
4. **COPIES files (not moves)** - Originals stay in `images-bulk-dump/` as backup, copies go to patient folders
5. **Safe to re-run** - Skips images already linked (checks `filemaker_id`)
6. **Never delete `images-bulk-dump/`** - This is your backup! Files are copied, not moved.

---

## 📝 **Next Steps**

After linking images:

1. **Test display** - Open patient record → Images tab
2. **Verify batches** - Check date grouping is correct
3. **Test downloads** - Images download with standardized filenames (see [Image Download Filenames](../features/IMAGE_DOWNLOAD_FILENAMES.md))
4. **Run documents script** - Link documents using similar approach
5. **Optional cleanup** - Move files to organized structure later

---

**Status:** ✅ Documentation Updated - CSV Import Method  
**Last Updated:** November 14, 2025  
**Next Task:** Convert tab file to CSV and test import with `--dry-run`


