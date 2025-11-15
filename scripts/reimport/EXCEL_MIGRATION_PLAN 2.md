# 📊 Migration Plan: API-Based → Excel-Based Import

**Date:** November 15, 2025  
**Status:** 🎯 IN PROGRESS  
**Goal:** 100% Excel-based import with NO FileMaker API dependency

---

## 📋 CURRENT STATE

### ✅ What's Already Excel-Based:

| Phase | Data Type | Excel File | Script | Status |
|-------|-----------|------------|--------|--------|
| 4.5 | Communications | `Coms.xlsx` | `import_communications.py` | ✅ **WORKING** |
| 4 | Appointments | `Appointments.xlsx` | `fetch_appointments_from_excel.py` + `import_appointments.py` | ✅ **WORKING** |
| 5 | Notes | `Notes.xlsx` | `fetch_notes_from_excel.py` + `import_notes.py` | ✅ **WORKING** |
| 6 | Documents | `Docs.xlsx` | `relink_documents_clean.py` | ✅ **WORKING** |
| 7 | Images | `images.xlsx` | `link_filemaker_images_csv.py` | ⚠️ **NEEDS UPDATE** (UUID lookup) |

### ❌ What's Still API-Based:

| Phase | Data Type | Current Method | Issue |
|-------|-----------|----------------|-------|
| 3 | **Patients** | FileMaker Data API | ⚠️ **Still using API!** |
| 5 | SMS (optional) | FileMaker OData API | Works (under 10k limit) |

---

## 🎯 MIGRATION STEPS

### ✅ Step 1: Export All Files from FileMaker

**Status:** ✅ **COMPLETE!**

You have all required files in `scripts/Export_Filemaker/`:
1. ✅ `Contacts.xlsx` (2,845 patients)
2. ✅ `Appointments.xlsx` (15,149 appointments)
3. ✅ `Notes.xlsx` (11,408 notes)
4. ✅ `SMS.xlsx` (5,352 messages) - optional
5. ✅ `Coms.xlsx` (10,697 communications)
6. ✅ `Docs.xlsx` (11,000+ documents)
7. ✅ `images.xlsx` (6,662 images)

---

### 📝 Step 2: Create Patient Import Script

**Status:** ⏳ **TODO**

**Create:** `scripts/reimport/phase3_patients/import_patients_from_excel.py`

**What it needs to do:**
1. Read `Contacts.xlsx` from `scripts/Export_Filemaker/`
2. Extract patient fields:
   - Basic: First name, Last name, DOB, gender
   - Contact: Area, Clinic_Name
   - Metadata: FileMaker ID, etc.
3. Transform data to Nexus format
4. Create Patient records
5. Support dry-run mode

**Expected columns in Contacts.xlsx:**
```
Area, Clinic_Name, contactType, CYS_ID, Diabetes, DOB, 
Funding, gender, id (FileMaker ID), and more...
```

**Template (similar to existing scripts):**
```python
#!/usr/bin/env python3
"""
Import Patients from Contacts.xlsx

Reads patient data from Excel export instead of FileMaker API.
"""
import openpyxl
from patients.models import Patient
# ... rest of implementation
```

---

### 📝 Step 3: Update Image Linking Script

**Status:** ⏳ **TODO**

**Modify:** `backend/images/management/commands/link_filemaker_images_csv.py`

**Issue:** Your `images.xlsx` uses **UUIDs** for `id_Contact`, not FileMaker IDs.

**Current code (Line 137):**
```python
patient = Patient.objects.get(filemaker_metadata__filemaker_id=id_contact)
```

**Needs to be:**
```python
# Try UUID first (for new exports)
try:
    patient = Patient.objects.get(id=id_contact)  # Direct UUID lookup
except Patient.DoesNotExist:
    # Fall back to FileMaker ID (for old exports)
    try:
        patient = Patient.objects.get(filemaker_metadata__filemaker_id=id_contact)
    except Patient.DoesNotExist:
        stats['skipped'] += 1
        continue
```

**Why:** Makes it work with both UUID-based (new) and FileMaker ID-based (old) exports.

---

### 📝 Step 4: Update Master Orchestrator

**Status:** ⏳ **TODO**

**Modify:** `scripts/reimport/master_reimport.py`

**Changes needed:**

**Phase 3 (Line 72-82):**
```python
{
    'name': 'patients',
    'number': 3,
    'description': 'Import Patients',
    'scripts': [
        # OLD: 'phase3_patients/fetch_patients_from_filemaker.py',  # Remove API call
        'phase3_patients/import_patients_from_excel.py',  # NEW: Excel import
    ],
    'required': True,
    'stop_on_error': True,
},
```

**Phase 7 (Line 114-124):**
```python
{
    'name': 'images',
    'number': 7,
    'description': 'Link Images from Excel',  # Updated description
    'scripts': [
        'phase7_images/link_filemaker_images_csv.py',  # Now handles UUIDs!
    ],
    'required': True,
    'stop_on_error': True,
},
```

---

### 📝 Step 5: Create SMS Import Script (Optional)

**Status:** 💡 **OPTIONAL**

**Create:** `scripts/reimport/phase5_notes/import_sms_from_excel.py`

**Why:** Currently SMS imports via API (works fine - under 10k limit), but Excel would be:
- ✅ More consistent with other imports
- ✅ No API dependency
- ✅ Faster

**Only do this if:**
- You want 100% API-free import
- SMS count grows over 10,000
- API becomes unreliable

---

## 🔧 DETAILED IMPLEMENTATION

### Patient Import Script Structure

**File:** `scripts/reimport/phase3_patients/import_patients_from_excel.py`

```python
#!/usr/bin/env python3
"""
Import Patients from Contacts.xlsx

This script reads patient data from Excel export instead of FileMaker API.

Usage:
    python import_patients_from_excel.py
    python import_patients_from_excel.py --dry-run
    python import_patients_from_excel.py --excel-file ../Export_Filemaker/Contacts.xlsx
"""
import sys
import os
from pathlib import Path
from datetime import datetime
import json

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

# Django setup
backend_dir = Path(__file__).parent.parent.parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
import django
django.setup()

from patients.models import Patient
from clinicians.models import Clinic, Clinician
from django.db import transaction
import openpyxl

# Add project root for utils
sys.path.insert(0, str(project_root))
from scripts.reimport.utils.logger import create_logger


def import_patients(excel_file: str = None, dry_run: bool = False) -> bool:
    """
    Import patients from Contacts.xlsx.
    
    Args:
        excel_file: Path to Excel file (default: scripts/Export_Filemaker/Contacts.xlsx)
        dry_run: If True, preview changes without modifying database
    
    Returns:
        True if successful, False otherwise
    """
    logger = create_logger("PATIENTS")
    logger.phase_start("Phase 3", "Import Patients from Excel")
    
    if dry_run:
        logger.warning("🔍 DRY RUN MODE - No changes will be made")
        logger.info("")
    
    # Determine Excel file path
    if excel_file is None:
        excel_file = project_root / 'scripts' / 'Export_Filemaker' / 'Contacts.xlsx'
    else:
        excel_file = Path(excel_file)
        if not excel_file.is_absolute():
            # Check project root if relative path
            root_path = project_root / excel_file
            if root_path.exists():
                excel_file = root_path
    
    if not excel_file.exists():
        logger.error(f"Excel file not found: {excel_file}")
        logger.phase_end(success=False)
        return False
    
    logger.info(f"📊 Reading patients from: {excel_file.name}")
    logger.info("")
    
    # Load Excel file
    try:
        wb = openpyxl.load_workbook(excel_file, data_only=True)
        sheet = wb.active
        headers = [cell.value for cell in sheet[1] if cell.value]
        
        total_rows = sum(1 for row in sheet.iter_rows(min_row=2) if any(cell.value for cell in row))
        logger.success(f"✅ Loaded {total_rows:,} patient records")
    except Exception as e:
        logger.error(f"Failed to load Excel file: {e}")
        logger.phase_end(success=False)
        return False
    
    # Import patients
    logger.info("")
    logger.info("=" * 70)
    logger.info("Step 1: Importing patients...")
    logger.info("=" * 70)
    
    stats = {
        'total': 0,
        'created': 0,
        'updated': 0,
        'skipped': 0,
        'errors': 0
    }
    
    for i, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), 1):
        if not any(row):
            continue
        
        row_data = dict(zip(headers, row))
        stats['total'] += 1
        
        # Progress heartbeat
        if stats['total'] % 50 == 0:
            logger.info(f"  💓 Still working... {stats['total']:,}/{total_rows:,} patients processed")
        
        # Extract patient data
        filemaker_id = row_data.get('id') or row_data.get('_kp_id') or row_data.get('id_Contact')
        first_name = row_data.get('First Name') or row_data.get('FirstName')
        last_name = row_data.get('Last Name') or row_data.get('LastName')
        dob = row_data.get('DOB')
        gender = row_data.get('gender')
        
        if not filemaker_id or not last_name:
            stats['skipped'] += 1
            continue
        
        # Transform data
        patient_data = {
            'first_name': first_name or '',
            'last_name': last_name,
            'date_of_birth': parse_date(dob) if dob else None,
            'gender': transform_gender(gender),
            'filemaker_metadata': {
                'filemaker_id': str(filemaker_id),
                'clinic_name': row_data.get('Clinic_Name'),
                'area': row_data.get('Area'),
                # ... more metadata
            }
        }
        
        if not dry_run:
            try:
                with transaction.atomic():
                    # Check if patient exists by FileMaker ID
                    existing = Patient.objects.filter(
                        filemaker_metadata__filemaker_id=str(filemaker_id)
                    ).first()
                    
                    if existing:
                        # Update existing patient
                        for key, value in patient_data.items():
                            setattr(existing, key, value)
                        existing.save()
                        stats['updated'] += 1
                    else:
                        # Create new patient
                        Patient.objects.create(**patient_data)
                        stats['created'] += 1
            except Exception as e:
                logger.error(f"Error importing patient {filemaker_id}: {e}")
                stats['errors'] += 1
        else:
            stats['created'] += 1
    
    # Summary
    logger.info("")
    logger.info("=" * 70)
    logger.info("📊 SUMMARY")
    logger.info("=" * 70)
    logger.info(f"Total processed:  {stats['total']:,}")
    logger.info(f"Created:          {stats['created']:,}")
    logger.info(f"Updated:          {stats['updated']:,}")
    logger.info(f"Skipped:          {stats['skipped']:,}")
    logger.info(f"Errors:           {stats['errors']:,}")
    logger.info("")
    
    if dry_run:
        logger.warning("🔍 DRY RUN - No changes made to database")
    else:
        logger.success("✅ Patient import complete!")
    
    logger.info("")
    logger.phase_end(success=True)
    return True


def parse_date(date_str):
    """Parse date from various formats."""
    # Implementation here
    pass


def transform_gender(gender_str):
    """Transform gender to standard format."""
    # Implementation here
    pass


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Import patients from Contacts.xlsx'
    )
    parser.add_argument(
        '--excel-file',
        default=None,
        help='Path to Contacts Excel file'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without modifying database'
    )
    
    args = parser.parse_args()
    
    success = import_patients(
        excel_file=args.excel_file,
        dry_run=args.dry_run
    )
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
```

---

## 📊 MIGRATION CHECKLIST

### Phase 1: Preparation
- [x] Export all data from FileMaker to Excel
- [x] Verify all Excel files are valid
- [x] Identify what's API-based vs Excel-based

### Phase 2: Implementation
- [ ] Create `import_patients_from_excel.py`
- [ ] Update `link_filemaker_images_csv.py` for UUID lookup
- [ ] Update `master_reimport.py` Phase 3 to use Excel
- [ ] (Optional) Create `import_sms_from_excel.py`

### Phase 3: Testing
- [ ] Test patient import with `--dry-run`
- [ ] Test patient import (real)
- [ ] Verify patients created correctly
- [ ] Test image linking with updated script
- [ ] Verify images appear in frontend

### Phase 4: Integration
- [ ] Update `master_reimport.py` to use new scripts
- [ ] Test full reimport flow (dry-run)
- [ ] Test full reimport flow (real)
- [ ] Verify all data imported correctly

### Phase 5: Documentation
- [ ] Update README files
- [ ] Update QUICK_REFERENCE
- [ ] Document new Excel-based workflow
- [ ] Update troubleshooting guides

---

## 🎯 BENEFITS OF EXCEL-BASED IMPORT

### Before (API-Based):
- ❌ Network requests for every record
- ❌ 10,000 record limit (OData)
- ❌ Timeout issues
- ❌ Broken pagination
- ❌ Slow (especially for patients)
- ❌ Requires FileMaker server running
- ❌ Dependent on network connectivity

### After (Excel-Based):
- ✅ Read from local files
- ✅ No record limits
- ✅ No timeouts
- ✅ Fast (instant file read)
- ✅ Works offline
- ✅ Repeatable (just re-export files)
- ✅ Versioned (keep previous exports)
- ✅ **100% API-independent!**

---

## 📈 EXPECTED PERFORMANCE

| Phase | API-Based | Excel-Based | Improvement |
|-------|-----------|-------------|-------------|
| Patients (2,845) | ~5 minutes | ~30 seconds | **10x faster** |
| Appointments (15,149) | ~3 minutes (timeouts) | ~11 seconds | **16x faster** |
| Notes (11,408) | ~2 minutes (timeouts) | ~8 seconds | **15x faster** |
| Documents (11,000+) | N/A | ~45 minutes | (S3 operations) |
| Images (6,662) | N/A | ~15 minutes | (S3 operations) |
| **TOTAL** | ~10+ minutes (with failures) | ~56 minutes | **More reliable** |

**Key win:** No more API timeouts or 10k limits!

---

## 🚀 IMPLEMENTATION PRIORITY

### HIGH PRIORITY:
1. **Patient import from Excel** - Most critical (currently API-based)
2. **Image UUID lookup fix** - Needed for images to work

### MEDIUM PRIORITY:
3. **Master orchestrator update** - Integrate new scripts

### LOW PRIORITY:
4. **SMS from Excel** - Optional (API works fine for now)
5. **Documentation updates** - Important but not blocking

---

## 📋 NEXT ACTIONS

**Want me to:**
1. ✅ Create `import_patients_from_excel.py`?
2. ✅ Update `link_filemaker_images_csv.py` for UUIDs?
3. ✅ Update `master_reimport.py` orchestrator?

**Then you'll have 100% Excel-based import!** 🎉

---

**Status:** Ready to implement  
**Estimated Time:** 2-3 hours  
**Complexity:** Medium (following existing patterns)

