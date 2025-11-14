# Image Linking Fix - CSV Metadata Integration

**Date:** 2025-11-14  
**Status:** ✅ COMPLETE  
**Branch:** `filemaker-import-docs-clean`

---

## 🎯 Problem

The image linking script (`link_filemaker_images_csv`) was skipping ALL 6,490 images during import:

```
Total images:          6490
⏭️  Skipped:             6490
✅ Images linked:       0
```

---

## 🔍 Root Causes Identified

### Issue #1: Incorrect Patient Lookup Field
**Problem:** Script was looking for `filemaker_id` in the `notes` JSON field  
**Reality:** Patient `filemaker_id` is stored in the `filemaker_metadata` JSON field  

**Before:**
```python
patient = Patient.objects.get(notes__contains=f'"filemaker_id": "{id_contact}"')
```

**After:**
```python
patient = Patient.objects.get(filemaker_metadata__filemaker_id=id_contact)
```

### Issue #2: CSV BOM (Byte Order Mark) Encoding
**Problem:** CSV file had UTF-8 BOM (`\ufeff`) at start of file  
**Impact:** First column was named `\ufeffdate` instead of `date`, causing date parsing to fail

**CSV Headers Detected:**
```python
['\ufeffdate', 'fileNane', 'id', 'id_Contact', 'Name of file', 'NexusExportDate', 'recid', 'Type']
```

**Before:**
```python
with open(csv_file, 'r', encoding='utf-8') as f:
```

**After:**
```python
with open(csv_file, 'r', encoding='utf-8-sig') as f:  # utf-8-sig strips BOM
```

---

## ✅ Solution Applied

### Files Modified:

1. **`backend/images/management/commands/link_filemaker_images_csv.py`**
   - Fixed CSV encoding from `utf-8` to `utf-8-sig` (strips BOM)
   - Changed patient lookup from `notes__contains` to `filemaker_metadata__filemaker_id`

2. **`scripts/reimport/phase7_images/link_filemaker_images_csv.py`** (NEW)
   - Created wrapper script for Phase 7 integration
   - Uses reimport logger and progress tracker
   - Supports dry-run and limit options

3. **`scripts/reimport/master_reimport.py`**
   - Added `link_filemaker_images_csv.py` to Phase 7 scripts

---

## 📊 Results (After Fix)

### Dry Run Test (Full 6490 images):
```
✅ Total images:          6490
✅ Images linked:         6489 (99.98% success rate!)
✅ Patients matched:      1303
✅ Batches created:       1661
⏭️  Skipped:               1 (missing metadata)
❌ Errors:                0
```

### Performance:
- CSV load: 6662 metadata records (instant)
- S3 list: 6490 images (~2 seconds)
- Patient matching: 6489 matched (~5 seconds)
- Total dry run time: ~8 seconds for 6490 images

---

## 🔧 How It Works

### CSV Structure (`Image_dataV9.csv`):
```csv
date,fileNane,id,id_Contact,Name of file,NexusExportDate,recid,Type
10/18/2016,Left-Dorsal.jpg,UUID,PATIENT_UUID,Left-Dorsal.jpg,1,2,Left Dorsal
```

### S3 Structure:
```
s3://walkeasy-nexus-documents/filemaker-import/images-bulk-dump/
  ├── 2.jpg      (recid from CSV)
  ├── 3.jpg
  ├── 77.jpg
  └── ...
```

### Matching Process:
1. **Load CSV metadata** → Create lookup dict by `recid`
2. **List S3 images** → Extract `recid` from filename (`1000.jpg` → `1000`)
3. **Match locally** → Instant lookup: `metadata_lookup[recid]`
4. **Find patient** → Query: `Patient.objects.get(filemaker_metadata__filemaker_id=id_contact)`
5. **Group by date** → Group images by patient + date
6. **Create batches** → One ImageBatch per patient + date
7. **Create images** → Link each image to its batch

### Date Handling:
- FileMaker format: `10/18/2016` (MM/DD/YYYY)
- Parsed to: `2016-10-18` (ISO format)
- Display as: `18 Oct 2016 (FileMaker Import)`

### Image Categories:
Maps FileMaker `Type` field to Nexus categories:
- "Left Dorsal" → `dorsal`
- "Left Plantar" → `plantar`
- "L-Brannock" → `l_brannock`
- etc.

---

## 🧪 Testing

### Test 1: Small Sample (100 images)
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate
python manage.py link_filemaker_images_csv --csv ../Image_dataV9.csv --dry-run --limit 100
```

**Result:** ✅ 100/100 images matched, 24 patients, 24 batches

### Test 2: Medium Sample (500 images)
```bash
python manage.py link_filemaker_images_csv --csv ../Image_dataV9.csv --dry-run --limit 500
```

**Result:** ✅ 500/500 images matched, 106 patients, 108 batches

### Test 3: Full Run (6490 images)
```bash
python manage.py link_filemaker_images_csv --csv ../Image_dataV9.csv --dry-run
```

**Result:** ✅ 6489/6490 images matched (99.98%)

### Test 4: Via Reimport Wrapper
```bash
cd /Users/craig/Documents/nexus-core-clinic/scripts/reimport
python phase7_images/link_filemaker_images_csv.py --dry-run --limit 50
```

**Result:** ✅ 50/50 images matched, integrated with reimport logger

---

## 🚀 Usage

### Standalone (Django Management Command):
```bash
cd backend
source venv/bin/activate

# Dry run (preview only)
python manage.py link_filemaker_images_csv --csv ../Image_dataV9.csv --dry-run

# Production run (links images to database)
python manage.py link_filemaker_images_csv --csv ../Image_dataV9.csv

# Limit for testing
python manage.py link_filemaker_images_csv --csv ../Image_dataV9.csv --limit 100
```

### Integrated (Reimport Workflow):
```bash
cd scripts/reimport

# Run only Phase 7 (images)
python master_reimport.py --phase images

# Or run full reimport (includes Phase 7)
python master_reimport.py --full
```

---

## 📝 Requirements

1. **CSV File:** `Image_dataV9.csv` must exist in project root
2. **S3 Images:** Must be uploaded to `s3://walkeasy-nexus-documents/filemaker-import/images-bulk-dump/`
3. **Patients Imported:** Patients must exist in database with `filemaker_metadata.filemaker_id` set
4. **Django Environment:** Backend virtual environment must be activated

---

## 🎓 Lessons Learned

### 1. **Always Check CSV Encoding**
- BOM can cause silent failures
- Use `utf-8-sig` for files exported from Windows/Excel
- Test with `csv.DictReader(f).fieldnames` to verify headers

### 2. **Verify Database Field Locations**
- Don't assume data is where documentation says
- Test patient lookup with Django shell first
- Use proper JSON field lookups (`field__key` vs `field__contains`)

### 3. **Start Small, Scale Up**
- Test with `--limit 10` first
- Then 100, 500, before full run
- Catches issues early without wasting time

### 4. **Wrapper Scripts are Valuable**
- Integrate Django management commands into workflows
- Add project-specific logging and error handling
- Provide consistent interface across all phases

---

## ✅ Next Steps

1. **Run full production import:**
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py link_filemaker_images_csv --csv ../Image_dataV9.csv
   ```

2. **Verify in UI:**
   - Check patient detail pages show images
   - Verify image thumbnails render correctly
   - Test image categories are correct

3. **Run full reimport:**
   ```bash
   cd scripts/reimport
   python master_reimport.py --full
   ```

---

## 📊 Statistics

- **Time to Fix:** ~45 minutes
- **Files Modified:** 3 files
- **Lines of Code:** +149 lines, -4 lines
- **Success Rate:** 99.98% (6489/6490 images)
- **Performance:** ~8 seconds for 6490 images (dry run)

---

**Status:** ✅ READY FOR PRODUCTION  
**Git Commit:** `457589a`  
**Branch:** `filemaker-import-docs-clean`

