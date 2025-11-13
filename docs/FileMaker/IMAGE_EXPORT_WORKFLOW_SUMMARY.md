# 📋 FileMaker Image Export Workflow Summary

**Date:** November 14, 2025  
**Status:** ✅ Export Complete - Ready for Import

---

## 🎯 **What Craig Did**

### **Step 1: S3 Upload (Already Complete)**
- ✅ Ran FileMaker script to upload 6,490 images to S3
- ✅ Script marks uploaded images with `NexusExportDate = "1"`
- ✅ Images stored in: `s3://walkeasy-nexus-documents/filemaker-import/images-bulk-dump/`
- ✅ Filenames are RecordIDs (e.g., `2.jpg`, `3.jpg`, `6066.jpg`)

### **Step 2: Export Metadata (Just Completed)**
1. **Found Records** - In FileMaker, found all records where `NexusExportDate = "1"`
2. **Created Found Set** - 6,490 records that match the uploaded S3 images
3. **Exported to Tab File** - Exported the found set to `Image_DataV6.tab`
   - Format: Tab-delimited
   - Line endings: CR (Carriage Return - old Mac format)
   - Fields: `date`, `fileName`, `id`, `id_Contact`, `Name_of_file`, `NexusExportDate`, **`recid`**, `Type`

---

## 📁 **Key Information**

### **Critical Field: `recid`**
- **Location:** Column 7 (0-indexed: column 6)
- **Purpose:** This is the S3 filename!
- **Example:** `recid = 6066` → S3 file is `6066.jpg`

### **Other Important Fields:**
- `id_Contact` - Patient UUID (links to Nexus patient)
- `date` - Image date (format: `10/18/2016`)
- `Type` - Image category (e.g., "Left Dorsal", "Plantar")

---

## 🔄 **Next Steps (Python Import)**

### **Step 1: Convert Tab to CSV**
```bash
cd backend
python convert_fm_tab_to_csv.py
```

**What it does:**
- Reads `Image_DataV6.tab` (handles CR line endings)
- Extracts: `recid`, `id_Contact`, `date`, `Type`
- Writes: `filemaker_images_metadata.csv`

### **Step 2: Link Images to Patients**
```bash
python manage.py link_filemaker_images --csv filemaker_images_metadata.csv --dry-run
python manage.py link_filemaker_images --csv filemaker_images_metadata.csv
```

**What it does:**
1. Reads CSV metadata
2. Finds S3 images in `images-bulk-dump/`
3. Matches RecordIDs to patients
4. Groups by date
5. Creates `ImageBatch` and `Image` records
6. **COPIES** images to `patients/{uuid}/images/{batch}/`
7. **KEEPS** originals in `images-bulk-dump/` as backup

---

## 📂 **S3 Structure (After Import)**

```
walkeasy-nexus-documents/
├── filemaker-import/
│   └── images-bulk-dump/        ← ORIGINAL BACKUP (NEVER DELETE!)
│       ├── 2.jpg
│       ├── 3.jpg
│       ├── 6066.jpg
│       └── ... (6,490 images)
│
└── patients/
    └── {patient-uuid}/
        └── images/
            └── {batch-uuid}/     ← COPIES FOR DISPLAY
                ├── 2.jpg
                ├── 3.jpg
                └── ...
```

**Important:** 
- ✅ **Originals stay in `images-bulk-dump/`** (backup)
- ✅ **Copies go to patient folders** (for display)
- ✅ **Never delete `images-bulk-dump/`** (it's your safety net!)

---

## 🔮 **Future Image Exports**

**For any future images:**

1. **Upload to S3** (FileMaker script automatically marks with `NexusExportDate = "1"`)
2. **Find in FileMaker** - Search for `NexusExportDate = "1"` to see what's uploaded
3. **Export Found Set** - Export to tab-delimited file
4. **Convert to CSV** - Run `convert_fm_tab_to_csv.py`
5. **Link to Patients** - Run `link_filemaker_images.py --csv`

**This ensures we only process images that are confirmed in S3!**

---

## ✅ **Why This Approach Works**

1. **Fast** - No OData API issues (FileMaker OData has problems with text field filters)
2. **Reliable** - Direct export from FileMaker, no timeouts
3. **Simple** - One export, one conversion, done!
4. **Safe** - Originals stay in S3 as backup
5. **Future-proof** - `NexusExportDate = "1"` shows exactly what's uploaded

---

## 📊 **Expected Results**

After running the import:

- **Total Images:** 6,490
- **Batches Created:** ~500-800 (varies by unique dates)
- **Images Linked:** ~6,000-6,200 (some may be skipped if no date/patient)
- **Time:** ~15 minutes total

---

**Status:** ✅ Ready to convert and import!  
**Next Step:** Run `convert_fm_tab_to_csv.py`

