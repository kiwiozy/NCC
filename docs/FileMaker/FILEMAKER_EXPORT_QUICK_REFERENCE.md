# 📤 FileMaker Export: S3 Folder Structure Reference

**Date:** November 11, 2025  
**Purpose:** Quick reference for FileMaker S3 export paths  
**Bucket:** `walkeasy-nexus-documents`  
**Region:** `ap-southeast-2` (Sydney, Australia)

---

## 🔑 **AWS Credentials**

**Location:** `/Users/craig/Documents/nexus-core-clinic/backend/.env`

**To get your credentials:**
```bash
# Open the .env file
cat /Users/craig/Documents/nexus-core-clinic/backend/.env | grep AWS

# You'll see:
# AWS_ACCESS_KEY_ID=<your_actual_key>
# AWS_SECRET_ACCESS_KEY=<your_actual_secret>
# AWS_S3_BUCKET_NAME=walkeasy-nexus-documents
# AWS_REGION=ap-southeast-2
```

**Or open in your editor:**
```bash
# Use VS Code
code /Users/craig/Documents/nexus-core-clinic/backend/.env

# Or use any text editor
open -a TextEdit /Users/craig/Documents/nexus-core-clinic/backend/.env
```

**What you need for FileMaker:**
- `AWS_ACCESS_KEY_ID` → Copy this value
- `AWS_SECRET_ACCESS_KEY` → Copy this value
- Region: `ap-southeast-2` (Sydney)
- Bucket: `walkeasy-nexus-documents`

---

## 📂 **S3 Folder Structure for FileMaker Export**

### **Images Export (6,664 images)**

**Path Format:**
```
filemaker-import/images-bulk-dump/{RecordID}.{extension}
```

**Examples:**
```
filemaker-import/images-bulk-dump/7119.jpeg
filemaker-import/images-bulk-dump/7120.jpeg
filemaker-import/images-bulk-dump/8543.jpeg
```

**What gets exported:**
- **Field used:** Waterfall logic (Full → Ex_large → large → medium → small)
- **File naming:** `Get(RecordID)` + original extension (e.g., `7119.jpeg`)
- **Metadata tracked:** NexusExportDate, best_image_container

**🎯 Why RecordID?**
- Allows direct OData lookup: `API_Images?$filter=__ID eq 7119`
- Python can query FileMaker metadata using the filename
- Gets `id_Contact`, `image_type`, `Note`, `Created_Date`
- Links to Nexus patient via `Patient.notes->>'filemaker_id'`

---

### **Documents Export (11,269+ documents)**

**Path Format:**
```
filemaker-import/documents-bulk-dump/{DocID}.{extension}
```

**Examples:**
```
filemaker-import/documents-bulk-dump/7F9E8D6C-5B4A-3210-FEDC-BA0987654321.pdf
filemaker-import/documents-bulk-dump/1A2B3C4D-E5F6-7890-1234-567890ABCDEF.docx
filemaker-import/documents-bulk-dump/9876FEDC-BA09-8765-4321-FEDCBA098765.xlsx
```

**What gets exported:**
- **Field used:** `API_Docs::doc` (container field)
- **File naming:** FileMaker UUID + original extension
- **Metadata tracked:** NexusExportDate

---

## 📊 **Export Status Tracking**

### **In FileMaker (API_Images):**
```
Records with NexusExportDate = empty → NOT YET EXPORTED
Records with NexusExportDate ≠ empty → ALREADY EXPORTED
```

### **In FileMaker (API_Docs):**
```
Records with NexusExportDate = empty → NOT YET EXPORTED
Records with NexusExportDate ≠ empty → ALREADY EXPORTED
```

### **Check Progress:**
```filemaker
# In FileMaker, create a calculation field:
If ( IsEmpty(NexusExportDate) ; "⏳ Pending" ; "✅ Exported" )
```

---

## ✅ **Testing Complete - Production Ready!**

**Date:** November 11, 2025  
**Status:** ✅ WORKING PERFECTLY

### **Test Results:**

**Test 1: Single Image (`$testLimit = 1`)**
- ✅ Uploaded exactly 1 image
- ✅ Correct filename format: `{RecordID}.{extension}`
- ✅ File size: 33.52 KB

**Test 2: Batch of 10 (`$testLimit = 10`)**
- ✅ Uploaded exactly 10 images
- ✅ Multiple formats: JPG, PNG, PDF
- ✅ File sizes: 26 KB to 2.42 MB
- ✅ All filenames correct
- ✅ Total size: 4.45 MB

**Files uploaded in Test 2:**
1. `2.jpg` - 33.52 KB
2. `3.jpg` - 26.32 KB
3. `77.jpg` - 2.42 MB
4. `87.jpg` - 1.22 MB
5. `160.png` - 179.50 KB
6. `161.png` - 156.38 KB
7. `164.pdf` - 339.18 KB
8. `165.jpg` - 28.74 KB
9. `166.jpg` - 28.08 KB
10. `167.jpg` - 35.26 KB

### **Script Features Verified:**

✅ **Test limit working** - Exits after exactly N records  
✅ **Multiple file types** - JPG, PNG, PDF all working  
✅ **Waterfall container logic** - Selects best quality available  
✅ **Error tracking** - Counts success/failed/skipped  
✅ **Progress updates** - Shows every 10 records  
✅ **Filename format** - RecordID.extension (perfect for OData lookup)  
✅ **Timestamp tracking** - NexusExportDate and best_image_container fields  
✅ **Resume capability** - Only processes records where NexusExportDate is empty

---

## 🎯 **Why "Bulk Dump" Folders?**

### **Simple 2-Step Strategy:**

**Step 1: FileMaker → S3 (Bulk Dump)**
- Dump ALL images/docs into simple flat folders
- Just `{UUID}.{extension}` - no patient linking yet
- Fast! No database lookups needed in FileMaker
- Resumable - re-run script only processes unexported

**Step 2: Python Script → Organize by Patient** (Later)
- Read from bulk-dump folders
- Look up patient IDs in Nexus database
- Move/copy to proper patient folders:
  ```
  patients/filemaker-import/images/{patient_id}/{filemaker_id}.jpg
  patients/filemaker-import/documents/{doc_type}/{patient_id}/{filemaker_id}.pdf
  ```
- Update Document records in database

---

## 📋 **Full S3 Folder Structure (Reference)**

```
walkeasy-nexus-documents/
│
├── filemaker-import/                     ⭐ FileMaker dumps go here first
│   ├── images-bulk-dump/                 ⭐ YOUR IMAGES GO HERE
│   │   ├── 7119.jpeg                     (6,664 images - RecordID naming)
│   │   ├── 7120.jpeg
│   │   └── 8543.jpeg
│   │
│   ├── documents-bulk-dump/              ⭐ YOUR DOCUMENTS GO HERE
│   │   ├── {uuid}.pdf                    (11,269+ documents)
│   │   ├── {uuid}.docx
│   │   └── {uuid}.xlsx
│   │
│   └── [organized later by Python script]
│
├── patients/                             (Organized structure - created by Python)
│   ├── filemaker-import/
│   │   ├── images/
│   │   │   └── {patient_id}/
│   │   │       └── {filemaker_id}.jpg
│   │   └── documents/
│   │       ├── referrals/
│   │       │   └── {patient_id}/
│   │       │       └── {filemaker_id}.pdf
│   │       ├── reports/
│   │       ├── letters/
│   │       └── other/
│   │
│   ├── documents/                        (Current Nexus uploads)
│   ├── images/                           (Current Nexus uploads)
│   └── at-reports/                       (Generated reports)
│
├── sms/                                  (SMS/MMS)
│   ├── inbound/
│   └── outbound/
│
└── system/                               (System files)
    └── temp/
```

---

## 🔧 **Cloud Manipulator Plugin Settings**

### **Authentication:**
```filemaker
Set Variable [ $auth ; 
  Value: PCCM_UseCredentials(
    "S3" ;
    "YOUR_AWS_ACCESS_KEY_HERE" ;
    "YOUR_AWS_SECRET_KEY_HERE" ;
    "region=ap-southeast-2"
  )
]
```

### **Upload Function:**
```filemaker
Set Variable [ $uploadResult ;
  Value: PCCM_PostObject(
    "walkeasy-nexus-documents" ;           # Bucket name
    "filemaker-import/images-bulk-dump/" & Get(RecordID) & $extension ;  # S3 key (e.g., 7119.jpeg)
    $localFilePath ;                       # Temp file path
    True                                   # Delete temp file after upload
  )
]
```

**🎯 Key Change:**
- **Old:** `$imageID & $extension` (FileMaker UUID)
- **New:** `Get(RecordID) & $extension` (FileMaker RecordID for OData lookup)

---

## ✅ **Verification Commands**

### **Check in FileMaker:**
```filemaker
# Find exported images
Find: NexusExportDate ≠ ""

# Find pending images
Find: NexusExportDate = ""
```

### **Check S3 (Python):**
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate

python manage.py shell
```

```python
from documents.services import S3Service
s3 = S3Service()

# List images in bulk-dump
response = s3.s3_client.list_objects_v2(
    Bucket='walkeasy-nexus-documents',
    Prefix='filemaker-import/images-bulk-dump/'
)

if 'Contents' in response:
    print(f"✅ Images exported: {len(response['Contents'])}")
else:
    print("❌ No images found")

# List documents in bulk-dump
response = s3.s3_client.list_objects_v2(
    Bucket='walkeasy-nexus-documents',
    Prefix='filemaker-import/documents-bulk-dump/'
)

if 'Contents' in response:
    print(f"✅ Documents exported: {len(response['Contents'])}")
else:
    print("❌ No documents found")
```

### **Check S3 (AWS CLI):**
```bash
# Count images
aws s3 ls s3://walkeasy-nexus-documents/filemaker-import/images-bulk-dump/ --recursive | wc -l

# Count documents
aws s3 ls s3://walkeasy-nexus-documents/filemaker-import/documents-bulk-dump/ --recursive | wc -l

# Check total size
aws s3 ls s3://walkeasy-nexus-documents/filemaker-import/ --recursive --human-readable --summarize
```

---

## 📝 **FileMaker Required Fields**

### **API_Images table:**
```
✅ id (UUID) - Primary key
✅ image_Full (Container)
✅ image_Ex_large (Container)
✅ image_large (Container)
✅ image_medium (Container)
✅ image_small (Container)
⭐ NexusExportDate (Timestamp) - CREATE THIS
⭐ best_image_container (Text, 50 chars) - CREATE THIS
```

### **API_Docs table:**
```
✅ id (UUID) - Primary key
✅ doc (Container)
✅ id_Contact (Foreign key to patient)
✅ Type (Document type)
⭐ NexusExportDate (Timestamp) - CREATE THIS (if not exists)
```

---

## 🚀 **Export Workflow**

### **Phase 1: Bulk Export (FileMaker)**
1. Run script: "Bulk Export Images to S3"
   - → Exports to `filemaker-import/images-bulk-dump/`
   
2. Run script: "Bulk Export Documents to S3"
   - → Exports to `filemaker-import/documents-bulk-dump/`

**Result:** All files dumped into S3, tracked in FileMaker

---

### **Phase 2: Organize & Link (Python)** - Do this later!
1. Python reads from bulk-dump folders
2. Extracts RecordID from filename (e.g., `7119.jpeg` → `7119`)
3. Queries OData: `API_Images?$filter=__ID eq 7119`
   - Gets `id_Contact`, `image_type`, `Note`, `Created_Date`
4. Finds Patient where `notes->>'filemaker_id'` = `id_Contact`
5. Creates Document record linked to Patient
6. Moves file to organized structure:
   ```
   patients/filemaker-import/images/{patient_id}/{recordid}.jpg
   ```

**Result:** All files organized by patient, linked in database

---

## 🎯 **Ready for Production Export!**

**Current Task:** Full image export from FileMaker to S3

**Script to run:** "Bulk Upload Images to S3"  
**Target folder:** `filemaker-import/images-bulk-dump/`  
**Expected files:** ~6,664 images  
**Estimated time:** ~55-90 minutes (depends on file sizes and network)

**Script settings for full run:**
```filemaker
Set Variable [ $testLimit ; Value: 0 ]    # 0 = process all records
```

**Progress tracking:**
- Shows dialog every 10 records
- Tracks: success count, failed count, skipped count
- Final summary dialog with total time

**Next steps after images complete:**
1. Run script for documents export
2. Use Python to organize files by patient
3. Link files to patients in Nexus database

---

## 📞 **Need Help?**

**FileMaker Script:** See `docs/FileMaker/FILEMAKER_S3_UPLOAD_SCRIPT.md`  
**S3 Structure:** See `docs/architecture/S3_FOLDER_STRUCTURE.md`  
**Migration Plan:** See `docs/FileMaker/DOCS_IMAGES_S3_MIGRATION_PLAN.md`  
**Linking Strategy:** See `docs/FileMaker/LINKING_IMAGES_TO_PATIENTS.md`

---

**Status:** ✅ PRODUCTION READY  
**Last Updated:** November 11, 2025 23:47 UTC  
**Testing:** Complete - 2 successful tests (1 image, 10 images)  
**Your current task:** Set `$testLimit = 0` and run full export!

