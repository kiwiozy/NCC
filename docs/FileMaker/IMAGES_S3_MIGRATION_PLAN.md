# FileMaker Images Migration to S3 - Detailed Plan

**Date:** November 10, 2025  
**Status:** ✅ Strategy Finalized - Ready for Implementation  
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
| **Container Fields** | **2 fields discovered!** |
| **Primary Container** | `image_Full` (Full-size - Data API URL) ✅ **USE THIS** |
| **Secondary Container** | `Recovered` (Thumbnail - Base64, ~46 KB) |
| **Patient Link** | `id_Contact` (FK to patient) |
| **Image Date** | `date` field |
| **Image Type** | `Type` field (9 categories) |
| **File Info** | `Name of file`, `filesize` |
| **Import Status** | `imported` field (tracking) |

### 🎯 **CRITICAL FINDING: FIVE Different Image Sizes!**

FileMaker stores **FIVE versions** of each clinical image in the **`Images`** table:

| # | Field Name | Size | Quality | Import Priority |
|---|------------|------|---------|-----------------|
| 1 | **`image_Full`** | Full resolution | Highest | ✅ **PRIMARY** |
| 2 | **`image_Ex_large`** | Extra Large | High | ✅ **FALLBACK 1** |
| 3 | **`image_large`** | Large | Good | ✅ **FALLBACK 2** |
| 4 | **`image_medium`** | Medium | Lower | ⚠️ Fallback 3 |
| 5 | **`image_small`** | Small | Low | ❌ Last resort |
| 6 | **`Recovered`** | Thumbnail | Very low (~46 KB) | ❌ Skip |

**Import Strategy - Waterfall Approach:**

```python
# Try each field in order until we find one with data:
1. Try image_Full (best quality)
2. If empty → try image_Ex_large
3. If empty → try image_large
4. If empty → try image_medium
5. If empty → try image_small
6. If all empty → skip (or log warning)
```

**Why This Matters:**
- ✅ **Guarantees best quality:** Always gets the largest available image
- ✅ **Handles missing data:** Falls back to next best if primary is empty
- ✅ **No data loss:** Ensures every image is imported at best available quality
- ✅ **Clinical accuracy:** Full resolution critical for foot assessment photos

### 📋 Images Table Structure (NOT API_Images):

**IMPORTANT:** User discovered the main **`Images`** table has ALL 5 container fields!

**Key Fields:**
```
- id                     Primary key (UUID)
- id_Contact             Patient FK (UUID) ✅
- date                   Image date (Edm.Date)
- Type                   Image type/category (Edm.String) ✅

** CONTAINER FIELDS (5 sizes) **
- image_Full             Full resolution ✅ **PRIMARY - USE THIS FIRST**
- image_Ex_large         Extra Large ✅ **FALLBACK 1**
- image_large            Large ✅ **FALLBACK 2**
- image_medium           Medium ⚠️ **FALLBACK 3**
- image_small            Small ❌ **FALLBACK 4 (last resort)**

- Recovered              Thumbnail (~46 KB) (Skip - too small)
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

**Note:** The `API_Images` table may be a Table Occurrence (TO) of the base `Images` table.

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

Based on the documents import, images should follow the same pattern:

```
walkeasy-nexus-documents/
└── patients/
    └── filemaker-import/
        └── images/                          # From API_Images (6,664)
            └── {patient_id}/
                ├── {date}/                  # Date folder (e.g., "2016-10-18")
                │   ├── {filemaker_id}.jpg   # Original FileMaker UUID as filename
                │   └── ...
                ├── {date}/
                └── unknown-date/            # Images with no date
```

**Image S3 Path Format:**
```
patients/filemaker-import/images/{patient_id}/{date}/{filemaker_id}.jpg
```

**Example:**
```
patients/filemaker-import/images/a1b2c3d4-e5f6-7890-abcd-ef1234567890/2016-10-18/F8E7D6C5-B4A3-2109-8765-4321FEDC.jpg
```

**Benefits:**
- ✅ **Consistent with documents** - Same `filemaker-import/` pattern
- ✅ **Clear separation** - FileMaker imports vs user uploads
- ✅ **Date-based organization** - Easy to find images by date
- ✅ **Preserves FileMaker ID** - Original UUID in filename for tracking
- ✅ **Easy cleanup** - Can delete entire `filemaker-import/` folder if needed

**Note:** The date folder is derived from `API_Images.date` field. Images without a date go to `unknown-date/`.

---

## 🔄 Import Strategy

### ✅ FINALIZED STRATEGY (Nov 10, 2025)

**User Requirements Confirmed:**

1. **✅ Batch Organization: Group by Date + Patient**
   - Images taken on the **same day** = **one batch**
   - Batch = "folder for that particular day"
   - Users can view all images from a specific date together
   - Example: "18 Oct 2016 (FileMaker Import)" batch

2. **✅ Category Handling: Preserve Exact FileMaker Categories**
   - NO mapping/conversion
   - Store categories exactly as-is from FileMaker
   - Keep "Left Planter" typo for historical accuracy
   - Moving forward: Simplified dropdown for NEW uploads (future enhancement)

3. **✅ Integration: Use Existing Nexus Image System**
   - Import into existing `ImageBatch` and `Image` models
   - Will display automatically in existing `ImagesDialog.tsx`
   - Same S3 storage structure as current images
   - Seamless user experience

---

### Phase 1: FileMaker Layout Setup
**Action:** Create `API_Images` layout in FileMaker
- **Include fields:**
  - `id` (UUID)
  - `id_Contact` (Patient FK)
  - `date` (Image date)
  - `Type` (Image category)
  - `Recovered` (container field - THE IMAGE)
  - `Name of file`
  - `filesize`
  - `imported`
  - `NexusExportDate` (NEW - for tracking exports)
  - All timestamp/account fields

**Why:** FileMaker Data API requires a layout to access container fields.

---

### Phase 2: Batch Organization Strategy ✅ FINALIZED

**Strategy: Group by Date + Patient**

**Logic:**
```python
For each patient in FileMaker:
  1. Get all images for this patient (from API_Images)
  2. Group images by date (using image.date field)
  3. For each unique date:
     - Create ONE ImageBatch:
       - name = "{date} (FileMaker Import)"
         Example: "18 Oct 2016 (FileMaker Import)"
       - captured_date = date from FileMaker
       - patient = nexus_patient_id
       - import_source = 'filemaker_import'
       - filemaker_batch_id = NULL (multiple images, not 1:1)
     
     - Add ALL images from that date to this batch:
       - category = Exact FileMaker Type (e.g., "Left Dorsal")
       - filemaker_id = FileMaker image UUID
       - filemaker_type = Original Type (for tracking)
       - filemaker_date = Original date
```

**Example Result:**

**Patient: John Smith (FM ID: 43669346-9656-4029-A607-E4E8E4386F9E)**

**Batch 1: "18 Oct 2016 (FileMaker Import)"** (4 images)
- Left-Dorsal.jpg (category: "Left Dorsal")
- Left-Medial.jpg (category: "Left Medial")
- Left-Planter.jpg (category: "Left Planter")
- Posterior.jpg (category: "Posterior")

**Batch 2: "5 Nov 2016 (FileMaker Import)"** (3 images)
- L-Brannock.jpg (category: "L-Brannock")
- Shoe-Box.jpg (category: "Shoe Box")
- Side-and-bottom.jpg (category: "Side and bottom of shoes")

**Batch 3: "12 Mar 2017 (FileMaker Import)"** (2 images)
- Soles.jpg (category: "Soles of shoes")
- Left-Dorsal-2.jpg (category: "Left Dorsal")

**Benefits:**
- ✅ Chronological organization (by date)
- ✅ Easy to find images from specific appointments
- ✅ Matches clinical workflow (images taken during visit)
- ✅ Natural grouping for users
- ✅ Preserves historical context

---

### Phase 3: Category Handling ✅ FINALIZED

**Strategy: Preserve Exact FileMaker Categories (No Mapping)**

**FileMaker Categories (Store As-Is):**
1. "Left Dorsal"
2. "Left Medial"
3. "Left Planter" (typo preserved for accuracy)
4. "Planter"
5. "Posterior"
6. "L-Brannock"
7. "Shoe Box"
8. "Side and bottom of shoes"
9. "Soles of shoes"

**Database Storage:**
```python
Image.category = "Left Dorsal"  # Exact from FileMaker (for display)
Image.filemaker_type = "Left Dorsal"  # Also in tracking field
Image.filemaker_id = "8EECA11F-..."  # Original FM UUID
Image.filemaker_date = "2016-10-18"  # Original date
```

**Frontend Display:**
- Category dropdown will show exact FileMaker category
- No conversion or mapping needed
- Users see historical data as it was recorded

**Future Enhancement:**
- Simplified category dropdown for NEW uploads (post-import)
- FileMaker-imported images keep original categories
- New images use updated category list

---

### Phase 4: Database Schema ✅ CONFIRMED

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

## ✅ Key Decisions - ALL RESOLVED

### 1. ✅ Container Field Name
**CONFIRMED:** `Recovered` (Edm.Stream)

### 2. ✅ Batch Organization - RESOLVED
**DECISION:** Group by Date + Patient (Smart grouping)
- One batch per date per patient
- Batch name: "{date} (FileMaker Import)"
- Example: "18 Oct 2016 (FileMaker Import)"

### 3. ✅ Category Handling - RESOLVED
**DECISION:** Preserve Exact FileMaker Categories
- NO mapping/conversion
- Store as-is in `category` field
- Keep "Left Planter" typo for historical accuracy
- Future: Simplified dropdown for NEW uploads only

### 4. ✅ Handle `imported = 1` Flag - RESOLVED
**DECISION:** Ignore it - Import all images where `NexusExportDate` is empty
- The `imported` flag appears to be for FileMaker internal use
- Our `NexusExportDate` tracking is more reliable
- Will prevent duplicates across multiple import runs

### 5. ✅ Missing Patients - RESOLVED
**DECISION:** Store in `unlinked/` folder (same as documents)
- Many images likely have no matching patient in Nexus yet
- Can link later when those patients are imported
- Organize by image type in unlinked folder

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

### 7. ✅ Import Script Development (COMPLETE - Nov 10, 2025)
- [x] Create `import_filemaker_images.py` management command
- [x] Implement FileMaker API connection with authentication
- [x] Implement **waterfall container field strategy** (5 sizes)
- [x] Implement patient-to-Nexus UUID mapping
- [x] Implement batch finding/creation logic (group by date + patient)
- [x] Implement image download and S3 upload
- [x] Implement Image record creation
- [x] Implement NexusExportDate tracking (prevent duplicates)
- [x] Add error handling and logging
- [x] Add container field usage statistics

**Script Location:** `backend/images/management/commands/import_filemaker_images.py`

**Key Features:**
- **Waterfall Strategy:** Tries image_Full → image_Ex_large → image_large → image_medium → image_small
- **Smart Batching:** Groups images by patient + date (same day = one batch)
- **Batch Naming:** "{date} (FileMaker Import)" e.g., "18 Oct 2016 (FileMaker Import)"
- **Category Preservation:** Stores exact FileMaker Type (no mapping)
- **Progress Tracking:** Uses NexusExportDate to prevent duplicates
- **Usage Stats:** Reports which container fields were used (percentage breakdown)

**Run Command:**
```bash
cd backend
python manage.py import_filemaker_images
```

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

## 📝 Questions - ANSWERED & ARCHIVED

All questions have been answered and decisions documented above in "Key Decisions - ALL RESOLVED" section.

**For reference, original questions were:**
1. `imported = 1` meaning → **Ignore it, use NexusExportDate**
2. `ID.KEY` usage → **Not needed for import**
3. `result = "Not found"` → **Not critical for import**
4. Right foot images → **Will discover during import**
5. Image quality → **Will accept as-is (30 KB thumbnails or full images)**

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

