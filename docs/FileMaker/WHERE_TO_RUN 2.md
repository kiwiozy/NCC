# Where to Run FileMaker Reimport Scripts

**Quick Answer:** From the project root: `/Users/craig/Documents/nexus-core-clinic`

---

## 📍 Run Location

### From Terminal:
```bash
cd /Users/craig/Documents/nexus-core-clinic
```

**All commands below assume you're in this directory.**

---

## 🚀 How to Run

### Option 1: Individual Phase Scripts (Recommended for Testing)

Each script can be run directly from the project root:

```bash
# Phase 0: Validation
python scripts/reimport/phase0_validation/validate_filemaker_connection.py
python scripts/reimport/phase0_validation/validate_filemaker_data.py
python scripts/reimport/phase0_validation/validate_system_config.py

# Phase 2: Delete (⚠️ DESTRUCTIVE!)
python scripts/reimport/phase2_delete/delete_existing_data.py --dry-run  # Preview first!
python scripts/reimport/phase2_delete/delete_existing_data.py            # Actual delete

# Phase 3: Patients
python scripts/reimport/phase3_patients/fetch_patients_from_filemaker.py
python scripts/reimport/phase3_patients/import_patients.py --dry-run     # Preview first!
python scripts/reimport/phase3_patients/import_patients.py               # Actual import

# Phase 4: Appointments
python scripts/reimport/phase4_appointments/fetch_appointments_from_filemaker.py
python scripts/reimport/phase4_appointments/import_appointments.py --dry-run
python scripts/reimport/phase4_appointments/import_appointments.py --fix-missing-clinics

# Phase 5: Notes & SMS
python scripts/reimport/phase5_notes/fetch_notes_from_filemaker.py
python scripts/reimport/phase5_notes/import_notes_sms.py --dry-run
python scripts/reimport/phase5_notes/import_notes_sms.py

# Phase 6: Re-link Documents
python scripts/reimport/phase6_documents/relink_documents.py --dry-run
python scripts/reimport/phase6_documents/relink_documents.py

# Phase 7: Re-link Images
python scripts/reimport/phase7_images/relink_images.py --dry-run
python scripts/reimport/phase7_images/relink_images.py

# Phase 8: Post-validation
python scripts/reimport/phase8_validation/validate_data_counts.py
python scripts/reimport/phase8_validation/validate_relationships.py
```

---

### Option 2: Master Orchestrator (Future - Not Built Yet)

```bash
# Full automated reimport (all phases)
python scripts/reimport/master_reimport.py --full

# Dry run (preview only)
python scripts/reimport/master_reimport.py --dry-run

# Single phase
python scripts/reimport/master_reimport.py --phase patients
```

**Note:** Master orchestrator is optional and not yet built. Individual scripts work perfectly.

---

## 📂 File Structure

```
/Users/craig/Documents/nexus-core-clinic/
│
├── scripts/
│   └── reimport/                    👈 All reimport scripts here
│       ├── README.md
│       ├── phase0_validation/
│       ├── phase2_delete/
│       ├── phase3_patients/
│       ├── phase4_appointments/
│       ├── phase5_notes/
│       ├── phase6_documents/
│       ├── phase7_images/
│       ├── phase8_validation/
│       └── utils/
│
├── backend/                         👈 Django backend (auto-configured by scripts)
│   ├── manage.py
│   ├── patients/
│   ├── appointments/
│   └── ...
│
├── data/                            👈 Export files saved here
│   └── reimport/
│       ├── patients_export_*.json
│       ├── appointments_export_*.json
│       ├── notes_export_*.json
│       └── sms_export_*.json
│
└── logs/                            👈 Log files saved here
    └── reimport_*.log
```

---

## 🔧 Prerequisites

### 1. FileMaker Credentials

Set environment variables (or script will prompt):

```bash
export FILEMAKER_HOST="walkeasy.fmcloud.fm"
export FILEMAKER_DATABASE="WEP-DatabaseV2"
export FILEMAKER_USERNAME="your_username"
export FILEMAKER_PASSWORD="your_password"
```

**Or create `.env` file:**
```bash
# /Users/craig/Documents/nexus-core-clinic/.env
FILEMAKER_HOST=walkeasy.fmcloud.fm
FILEMAKER_DATABASE=WEP-DatabaseV2
FILEMAKER_USERNAME=your_username
FILEMAKER_PASSWORD=your_password
```

### 2. Python Environment

The scripts auto-configure Django paths, but make sure Python 3 is available:

```bash
python --version  # Should be Python 3.8+
```

### 3. Django Backend Running (Optional)

Scripts work standalone, but if you want to verify in the frontend:

```bash
# Terminal 1: Start Django
cd /Users/craig/Documents/nexus-core-clinic/backend
python manage.py runserver

# Terminal 2: Run reimport scripts
cd /Users/craig/Documents/nexus-core-clinic
python scripts/reimport/phase3_patients/import_patients.py
```

---

## 📊 Output Locations

### Export Files (from FileMaker)
```
/Users/craig/Documents/nexus-core-clinic/data/reimport/
├── patients_export_20251114_103045.json
├── appointments_export_20251114_103512.json
├── notes_export_20251114_104022.json
└── sms_export_20251114_104022.json
```

### Log Files
```
/Users/craig/Documents/nexus-core-clinic/logs/
└── reimport_20251114_103000.log
```

### Backup Files (Phase 0)
```
/Users/craig/Documents/nexus-core-clinic/backups/reimport_20251114_103000/
├── patients.csv
├── appointments.csv
├── documents.csv
└── images.csv
```

---

## ⚡ Quick Test Workflow

### 1. Test FileMaker Connection
```bash
cd /Users/craig/Documents/nexus-core-clinic
python scripts/reimport/phase0_validation/validate_filemaker_connection.py
```

**Expected Output:**
```
[PHASE 0] Starting FileMaker connection validation...
✅ FileMaker Data API: Connected
✅ FileMaker OData API: Connected
✅ Database: WEP-DatabaseV2 accessible
✅ Validation complete!
```

### 2. Test Patient Fetch
```bash
python scripts/reimport/phase3_patients/fetch_patients_from_filemaker.py
```

**Expected Output:**
```
[PHASE 3] Fetching patients from FileMaker...
[1234/2842] Fetching patients... 43.4%
✅ Fetched 2,842 patients from FileMaker
✅ Saved to: data/reimport/patients_export_20251114_103045.json
```

### 3. Test Dry Run Import
```bash
python scripts/reimport/phase3_patients/import_patients.py --dry-run
```

**Expected Output:**
```
[PHASE 3] Import Patients into Nexus
🔍 DRY RUN MODE - No data will be saved

[1234/2842] Importing patients... 43.4%

📊 Import Summary
Total Records: 2,842
✅ Imported: 2,839
⏭️  Skipped: 3 (no name)
❌ Errors: 0

Patients with funding: 2,500
Patients without funding: 339
```

---

## 🚨 Important Notes

### Scripts are Self-Contained
- Each script auto-configures Django paths
- No need to activate virtualenv or set PYTHONPATH
- Just run: `python scripts/reimport/phaseX/script.py`

### Always Test with --dry-run First
```bash
# ALWAYS do this first:
python script.py --dry-run

# Then if it looks good:
python script.py
```

### Scripts Create Necessary Directories
- `data/reimport/` - Created automatically
- `logs/` - Created automatically
- `backups/` - Created automatically

### FileMaker Connection Required
- All fetch/validation scripts need FileMaker API access
- Import scripts work offline (use exported JSON files)
- Re-linking scripts work offline (use existing database)

---

## 🎯 Recommended Testing Order

1. **From project root:**
   ```bash
   cd /Users/craig/Documents/nexus-core-clinic
   ```

2. **Test connection:**
   ```bash
   python scripts/reimport/phase0_validation/validate_filemaker_connection.py
   ```

3. **Fetch patients (doesn't modify database):**
   ```bash
   python scripts/reimport/phase3_patients/fetch_patients_from_filemaker.py
   ```

4. **Dry run import (doesn't modify database):**
   ```bash
   python scripts/reimport/phase3_patients/import_patients.py --dry-run
   ```

5. **Review output, then decide if ready for actual import**

---

## 📞 If Something Goes Wrong

### Script Can't Find Django
```bash
# Make sure you're in the project root:
cd /Users/craig/Documents/nexus-core-clinic
pwd  # Should show: /Users/craig/Documents/nexus-core-clinic
```

### FileMaker Connection Fails
```bash
# Check environment variables:
echo $FILEMAKER_USERNAME
echo $FILEMAKER_HOST

# Or set them:
export FILEMAKER_USERNAME="your_username"
export FILEMAKER_PASSWORD="your_password"
```

### Import File Not Found
```bash
# Check if export file exists:
ls -la data/reimport/

# If not, run fetch script first:
python scripts/reimport/phase3_patients/fetch_patients_from_filemaker.py
```

---

## ✅ Summary

**Run Location:** `/Users/craig/Documents/nexus-core-clinic` (project root)

**Command Pattern:**
```bash
python scripts/reimport/phase{N}_{name}/{script}.py [--dry-run] [--options]
```

**Key Points:**
- ✅ Run from project root
- ✅ Scripts are self-contained
- ✅ Always test with `--dry-run` first
- ✅ Export files saved to `data/reimport/`
- ✅ Logs saved to `logs/`

---

**Last Updated:** November 14, 2025  
**Status:** Ready for Development Testing

