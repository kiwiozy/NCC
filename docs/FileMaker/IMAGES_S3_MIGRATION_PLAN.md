# FileMaker Images Migration to S3 - Detailed Plan

**Date:** November 10, 2025  
**Status:** 📋 Planning Phase - Metadata Discovered  
**Branch:** `filemaker-import-docs`

---

## 📊 Overview

**Goal:** Migrate 6,664 clinical images from FileMaker `API_Images` table to AWS S3 storage.

**Scope:**
- **6,664 images** from `API_Images` table
- Link to existing patients in Nexus
- Preserve all metadata (dates, types, categories)
- Organize into clinical image batches

---

## 🔍 Metadata Discovery Results (Nov 10, 2025)

### ✅ Key Findings:

| Metric | Value |
|--------|-------|
| **Total Images** | 6,664 |
| **Container Field** | `Recovered` (Edm.Stream) |
| **Patient Link** | `id_Contact` (FK to patient) |
| **Image Date** | `date` field |
| **Image Type** | `Type` field (9 categories) |
| **File Info** | `Name of file`, `filesize` |
| **Import Status** | `imported` field (tracking) |

### 📋 API_Images Table Structure:

**Key Fields:**
```
- id                     Primary key (UUID)
- id_Contact             Patient FK (UUID) ✅
- date                   Image date (Edm.Date)
- Type                   Image type/category (Edm.String) ✅
- Recovered              Container field (Edm.Stream) ✅ **THIS IS THE IMAGE**
- Name of file           Original filename
- filesize               File size (formatted string, e.g., ".03 MB")
- imported               Import flag (1 = already migrated?)
- recid                  FileMaker internal record ID
- ID.KEY                 ??? (UUID, purpose unclear)
- result                 "Not found" (???)
- fileNane               Duplicate of "Name of file" (typo in FileMaker?)
- Z_XJOIN                Null (unused?)

- creationAccountName
- creationTimestamp
- modificationAccountName
- modificationTimestamp
```

### 🏷️ Image Types (9 Categories):

1. **Left Dorsal** - Clinical photo (top of left foot)
2. **Left Medial** - Clinical photo (inner side of left foot)
3. **Left Planter** - Clinical photo (bottom of left foot - note typo "Planter" should be "Plantar")
4. **Planter** - General plantar view
5. **Posterior** - Back view
6. **L-Brannock** - Brannock device measurement (left foot)
7. **Shoe Box** - Shoe box/packaging
8. **Side and bottom of shoes** - Shoe assessment
9. **Soles of shoes** - Shoe sole wear patterns

**Categories breakdown:**
- **Clinical Photos (Foot Assessment):** Left Dorsal, Left Medial, Left Planter, Planter, Posterior
- **Measurements:** L-Brannock
- **Equipment/Shoes:** Shoe Box, Side and bottom of shoes, Soles of shoes

### 📄 Sample Record:
```json
{
  "id": "8EECA11F-4273-4775-A977-33B59BE916B5",
  "id_Contact": "43669346-9656-4029-A607-E4E8E4386F9E",
  "date": "2016-10-18",
  "Type": "Left Dorsal",
  "Name of file": "Left-Dorsal.jpg",
  "filesize": ".03 MB",
  "imported": 1,
  "Recovered": "<base64 image data truncated>",
  "creationAccountName": "Admin",
  "creationTimestamp": "2016-10-18T16:04:13+10:00",
  "modificationAccountName": "Jono",
  "modificationTimestamp": "2025-06-02T10:46:04+10:00"
}
```

---

## 🎯 Comparison with Documents Import

### Similarities ✅
- Both use container fields
- Both link to patients via `id_Contact`
- Both have date fields
- Both have type/category fields
- Both can use FileMaker Data API for download
- Both can use `NexusExportDate` tracking field

### Differences ⚠️
- **Images** use `Recovered` field (not `Doc`)
- **Images** already have an `imported` flag (1 = already migrated)
- **Images** should be organized into **batches** (not individual files)
- **Images** have **9 specific categories** (vs documents' 20+ types)
- **Images** are typically **clinical assessment photos** (taken during appointments)

---

## 🗂️ Nexus Database Integration

### Current `Document` Model

The existing `Document` model can handle images, but we should consider if images need a separate model or if they should use the existing batch system.

**Current Nexus Image System:**
- **`ImageBatch` model** - Groups of images (e.g., clinical photo session)
- **`Image` model** - Individual images within a batch
- **Frontend:** `ImagesDialog.tsx` - manages batches and images

**Options:**

#### Option A: Use Existing Image Models ✅ **RECOMMENDED**
- **Pro:** Already built, frontend exists, matches clinical workflow
- **Pro:** Images are naturally grouped by batch (e.g., "Left Foot Assessment - 18 Oct 2016")
- **Pro:** Preserves FileMaker's clinical image organization
- **Con:** Need to create batches from FileMaker data

#### Option B: Use Document Model
- **Pro:** Simpler import (same as documents)
- **Pro:** Single system for all file types
- **Con:** Loses batch organization
- **Con:** Clinical photos work better in groups

#### Option C: Hybrid Approach
- **Pro:** Documents use Document model, Images use Image models
- **Con:** More complex, need to decide per file

**DECISION: Option A - Use Existing Image Models**

---

## 📐 S3 Folder Structure for Images

Based on the documents import, images should follow:

```
walkeasy-nexus-documents/
└── patients/
    └── filemaker-import/
        └── images/                          # From API_Images (6,664)
            └── {patient_id}/
                ├── left-dorsal/             # Image type subfolder
                │   ├── {filemaker_id}.jpg
                │   └── ...
                ├── left-medial/
                ├── left-plantar/            # Note: "Planter" → "plantar"
                ├── plantar/
                ├── posterior/
                ├── l-brannock/
                ├── shoe-box/
                ├── shoe-sides-bottom/
                └── shoe-soles/
```

**Folder Name Normalization:**
- `Left Dorsal` → `left-dorsal`
- `Left Planter` → `left-plantar` (fix typo)
- `Planter` → `plantar` (fix typo)
- `Side and bottom of shoes` → `shoe-sides-bottom`
- `Soles of shoes` → `shoe-soles`

---

## 🔄 Import Strategy

### Phase 1: FileMaker Layout Setup
**Action:** Create `API_Images` layout in FileMaker
- **Include fields:**
  - `id` (UUID)
  - `id_Contact` (Patient FK)
  - `date`
  - `Type`
  - `Recovered` (container field - THE IMAGE)
  - `Name of file`
  - `filesize`
  - `imported`
  - `NexusExportDate` (NEW - for tracking exports)
  - All timestamp/account fields

**Why:** FileMaker Data API requires a layout to access container fields.

---

### Phase 2: Batch Organization Strategy

**Challenge:** FileMaker stores images individually, Nexus groups them into batches.

**Solution:** Create batches based on patient + date + image type similarity.

**Batch Creation Logic:**
```
For each patient:
  Group images by:
    - Same date (or within 1 day)
    - Related types (e.g., "Left Dorsal", "Left Medial", "Left Planter" = "Left Foot Assessment")
  
  Create batch with:
    - Name: "{Type Category} - {Date}"
    - Date: Image date
    - Patient: id_Contact
    - Images: All images in group
```

**Batch Categories:**
- **"Left Foot Assessment"** - Left Dorsal, Left Medial, Left Planter
- **"Plantar Views"** - Planter, Posterior
- **"Foot Measurements"** - L-Brannock
- **"Shoe Assessment"** - Shoe Box, Side and bottom of shoes, Soles of shoes
- **"Uncategorized"** - Any images that don't fit above

**Alternative (Simpler):**
- Create **one batch per image** with batch name = image type
- Pros: Simpler logic, no grouping complexity
- Cons: Many small batches, less organized
- **DECISION:** Start with simpler approach, can reorganize later in UI

---

### Phase 3: Database Schema

#### Option A: Extend Existing Image Models ✅ **RECOMMENDED**

**`ImageBatch` model** (already exists):
```python
class ImageBatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    batch_name = models.CharField(max_length=200)
    captured_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    # NEW FIELDS FOR FILEMAKER IMPORT:
    filemaker_batch_id = models.UUIDField(
        null=True,
        blank=True,
        help_text='FileMaker image ID (for single-image batches)'
    )
    import_source = models.CharField(
        max_length=50,
        default='user_upload',
        choices=[
            ('user_upload', 'User Upload'),
            ('filemaker_import', 'FileMaker Import'),
        ]
    )
```

**`Image` model** (already exists):
```python
class Image(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    batch = models.ForeignKey(ImageBatch, related_name='images', on_delete=models.CASCADE)
    s3_key = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # NEW FIELDS FOR FILEMAKER IMPORT:
    filemaker_id = models.UUIDField(
        null=True,
        blank=True,
        unique=True,
        help_text='Original FileMaker image ID (API_Images.id)'
    )
    filemaker_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Original FileMaker image type'
    )
    filemaker_date = models.DateField(
        null=True,
        blank=True,
        help_text='Original image date from FileMaker'
    )
```

**Migrations Required:**
```bash
python manage.py makemigrations images
python manage.py migrate images
```

---

### Phase 4: Import Script Development

**Script:** `backend/images/management/commands/import_filemaker_images.py`

**Based on:** `import_filemaker_documents.py` (similar logic)

**Key Differences:**
1. Use `Recovered` container field (not `Doc`)
2. Create `ImageBatch` + `Image` records (not `Document`)
3. Apply image type normalization
4. Handle batch organization
5. Use S3 images folder structure

**Import Flow:**
```
1. Authenticate with FileMaker Data API
2. Query: WHERE NexusExportDate IS EMPTY (unexported images)
3. For each image:
   a. Download from Recovered container field
   b. Determine image type category
   c. Upload to S3: patients/filemaker-import/images/{patient_id}/{type}/{filemaker_id}.{ext}
   d. Find or create ImageBatch (patient + date + simple batch name)
   e. Create Image record (linked to batch)
   f. Update NexusExportDate in FileMaker
4. Handle pagination (batches of 50)
5. Log results
```

---

### Phase 5: Container Field Testing

**Before bulk import, test container field access:**

**Script:** `scripts/filemaker/12_test_image_container_field.py`

**Test Steps:**
1. Create `API_Images` layout in FileMaker
2. Test Data API access to `Recovered` field
3. Download one test image
4. Verify file integrity
5. Confirm file type/extension detection

**Expected Result:** Similar to documents test - should get streaming URL and download image.

---

## 📊 Import Estimates

### Time Estimates:

**Based on documents import (33 images/minute):**
- **6,664 images** ÷ 33 images/minute = **~202 minutes** (**~3.4 hours**)

**Storage Estimates:**

**Sample:** `.03 MB` per image (from metadata)
- **6,664 images** × 0.03 MB = **~200 MB**
- **Realistic estimate (larger clinical photos):** 0.5 MB/image = **~3.3 GB**

**AWS S3 Cost:**
- 3.3 GB × $0.023/GB = **~$0.08/month**

---

## 🚨 Key Decisions Needed

### 1. ✅ Container Field Name
**CONFIRMED:** `Recovered` (Edm.Stream)

### 2. ⏸️ Batch Organization
**Options:**
- **A) Simple:** One batch per image (batch name = image type)
- **B) Smart:** Group by patient + date + type category
- **C) Manual:** Import all, let users reorganize in UI

**RECOMMENDATION:** Start with **Option A (Simple)**, can reorganize later.

### 3. ⏸️ Handle `imported = 1` Flag
**Question:** FileMaker has `imported` field set to 1 for many images. What does this mean?

**Options:**
- **A) Ignore it** - Import all images where `NexusExportDate` is empty
- **B) Skip imported = 1** - Only import images with `imported = 0`
- **C) Ask user** - What does this flag mean in FileMaker?

**ACTION REQUIRED:** User to clarify what `imported = 1` means.

### 4. ⏸️ Image Type Typos
**FileMaker has:** "Planter" (should be "Plantar")

**Options:**
- **A) Fix during import** - Store as "plantar" in Nexus
- **B) Keep original** - Preserve FileMaker typo
- **C) Both** - Store corrected in Nexus, keep original in `filemaker_type`

**RECOMMENDATION:** **Option C (Both)** - Fix for Nexus, preserve original for reference.

### 5. ⏸️ Missing Patients
**Documents import showed:** Many documents have no matching patient (`id_Contact` not in Nexus).

**Expected for images?** Likely yes (same issue).

**Solution:** Store in `unlinked/` folder, can link later when patients imported.

---

## ⏭️ Next Steps

### 1. ✅ Metadata Discovery - COMPLETE
- [x] Get API_Images table metadata
- [x] Identify container field (`Recovered`)
- [x] Get sample records
- [x] Analyze image types

### 2. ⏸️ User Decisions Required
- [ ] Clarify `imported = 1` flag meaning
- [ ] Confirm batch organization approach (Simple vs Smart)
- [ ] Confirm image type handling (fix typos or keep?)

### 3. ⏸️ FileMaker Layout Setup
- [ ] Create `API_Images` layout in FileMaker
- [ ] Add `NexusExportDate` field to API_Images table
- [ ] Expose `Recovered` container field on layout
- [ ] Test layout access via Data API

### 4. ⏸️ Container Field Testing
- [ ] Write test script (`12_test_image_container_field.py`)
- [ ] Download test image
- [ ] Verify image integrity
- [ ] Confirm file type detection

### 5. ⏸️ Database Schema Updates
- [ ] Add `filemaker_batch_id` to `ImageBatch` model
- [ ] Add `import_source` to `ImageBatch` model
- [ ] Add `filemaker_id` to `Image` model
- [ ] Add `filemaker_type` to `Image` model
- [ ] Add `filemaker_date` to `Image` model
- [ ] Run migrations

### 6. ⏸️ S3Service Updates
- [ ] Add `generate_filemaker_image_key()` method
- [ ] Handle image type normalization
- [ ] Test S3 upload with image files

### 7. ⏸️ Import Script Development
- [ ] Create `import_filemaker_images.py` management command
- [ ] Implement FileMaker API connection
- [ ] Implement batch finding/creation logic
- [ ] Implement image download and S3 upload
- [ ] Implement Image record creation
- [ ] Implement NexusExportDate tracking
- [ ] Add error handling and logging

### 8. ⏸️ Testing & Execution
- [ ] Test import with 10 sample images
- [ ] Review batches/images in Django admin
- [ ] Check S3 folder structure
- [ ] Run full import (6,664 images)
- [ ] Verify results

### 9. ⏸️ Documentation Update
- [ ] Update `docs/integrations/FILEMAKER.md`
- [ ] Document image import process
- [ ] Update `docs/architecture/DATABASE_SCHEMA.md`
- [ ] Push to Git

---

## 📝 Open Questions

1. **What does `imported = 1` mean in FileMaker?**
   - Already migrated to a different system?
   - Just a flag for FileMaker internal use?
   - Should we skip these or import them anyway?

2. **What is `ID.KEY` field used for?**
   - Different from `id` (primary key)
   - Should we store this?

3. **What does `result = "Not found"` mean?**
   - All sample records have this value
   - Related to `imported` flag?

4. **Right foot images?**
   - Sample only shows "Left" views
   - Are there "Right Dorsal", "Right Medial", etc.?
   - Or are right foot images also in the same types?

5. **Image quality/resolution?**
   - Sample shows `.03 MB` (30 KB) - very small!
   - Are these thumbnails or full-size images?
   - Should we be concerned about image quality?

---

## 🎯 Success Criteria

- [ ] All 6,664 images imported to S3
- [ ] All images linked to patients (or marked as unlinked)
- [ ] All images organized into batches
- [ ] All image metadata preserved (type, date, filename)
- [ ] FileMaker tracking updated (`NexusExportDate`)
- [ ] Images visible in Nexus frontend (`ImagesDialog`)
- [ ] S3 folder structure follows documents pattern
- [ ] ~80%+ success rate (like documents import)

---

## 📚 Related Documentation

- **Documents Import:** `docs/FileMaker/DOCS_IMAGES_S3_MIGRATION_PLAN.md`
- **Documents Import Analysis:** `docs/FileMaker/DOCUMENT_IMPORT_ANALYSIS.md`
- **S3 Integration:** `docs/integrations/S3.md`
- **Database Schema:** `docs/architecture/DATABASE_SCHEMA.md`
- **FileMaker Integration:** `docs/integrations/FILEMAKER.md`

---

**END OF PLAN** 🎉

**Waiting for user decisions on open questions before proceeding to implementation.**

