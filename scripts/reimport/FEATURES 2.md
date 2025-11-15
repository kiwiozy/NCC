# FileMaker Reimport - Features & Configuration

**Purpose:** Documentation for key features and configuration requirements

---

## 🔒 Environment Variables Configuration

### Required Variables

The reimport scripts need these environment variables in your `.env` file:

```bash
# FileMaker API Connection
FILEMAKER_HOST=walkeasy.fmcloud.fm
FILEMAKER_DATABASE=WEP-DatabaseV2
FILEMAKER_USERNAME=Craig
FILEMAKER_PASSWORD=<your-password>

# AWS S3 (for documents & images)
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET_NAME=walkeasy-nexus-documents
```

### Location

File: `/Users/craig/Documents/nexus-core-clinic/backend/.env`

### Testing Configuration

```bash
cd /Users/craig/Documents/nexus-core-clinic/scripts/reimport
python phase0_validation/validate_filemaker_connection.py
```

---

## 💾 S3 Backup Feature

### Overview

Automatically backs up ALL S3 images and documents before any reimport operations.

### Features

- **Automatic:** Runs as first step in Phase 0
- **Timestamped:** Each backup has unique identifier
- **Non-destructive:** Only copies, never deletes
- **Organized:** Separates images and documents
- **Server-side:** Fast S3-to-S3 copy (no local download)

### Backup Structure

```
s3://walkeasy-nexus-documents/backup/reimport_YYYYMMDD_HHMMSS/
├── Images/
│   └── (all image files)
└── Docs/
    └── (all document files)
```

### Usage

**Automatic (with master orchestrator):**
```bash
python master_reimport.py --full
```

**Manual (standalone):**
```bash
cd scripts/reimport/phase0_validation
python backup_s3_files.py --dry-run  # Preview
python backup_s3_files.py            # Actual backup
```

### Restore Process

If something goes wrong:

```bash
# Restore all images
aws s3 cp s3://walkeasy-nexus-documents/backup/reimport_20251115_123456/Images/ \
          s3://walkeasy-nexus-documents/ \
          --recursive

# Restore all documents
aws s3 cp s3://walkeasy-nexus-documents/backup/reimport_20251115_123456/Docs/ \
          s3://walkeasy-nexus-documents/ \
          --recursive
```

### What Gets Backed Up

**Images:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.tiff`, `.webp`  
**Documents:** `.pdf`, `.doc`, `.docx`, `.txt`, `.rtf`, `.odt`

**Not backed up:**
- Files already in `backup/` folder (prevents recursion)
- Directory markers
- Other file types

### Performance

- **Speed:** 2-5 minutes for ~8,000 files
- **Method:** Server-side S3 copy (very fast)
- **Cost:** Minimal (temporary storage duplication)

### Script

`scripts/reimport/phase0_validation/backup_s3_files.py` (348 lines)

---

## 💓 Heartbeat Progress Messages

### Overview

Live progress indicators every **50 records** (25 for images) during long-running imports.

### What You'll See

```
[04:43:20] [PHASE 3] 💓 Still working... 50/2845 patients processed
[04:43:25] [PHASE 3] 💓 Still working... 100/2845 patients processed
[04:43:25] [PHASE 3] ▓▓░░░░░░░░░░░░░░ 3% (100/2845) - Importing patients
```

### Heartbeat Frequency

| Phase | Records | Heartbeat Every | Progress Bar Every |
|-------|---------|----------------|-------------------|
| Patients | ~2,845 | 50 records | 100 records |
| Appointments | ~9,837 | 50 records | 100 records |
| Notes | ~11,210 | 50 records | 100 records |
| Documents | ~10,190 | 50 records | 100 records |
| Images | ~6,489 | 25 batches | 50 batches |

### Benefits

1. **No "Is it hung?" anxiety** - See activity every 10-30 seconds
2. **Clear progress** - Know exactly how far along you are
3. **Easy to spot** - 💓 emoji makes messages stand out
4. **Time estimation** - Progress bars help estimate completion

### Files Updated

- `phase3_patients/import_patients.py`
- `phase4_appointments/import_appointments.py`
- `phase4_communications/import_communications.py`
- `phase5_notes/import_notes.py`
- `phase6_documents/relink_documents_clean.py`
- `phase7_images/link_filemaker_images_csv.py`

---

## 📊 Progress Tracking & Checkpoints

### Overview

Built-in progress tracking system that saves state and can resume from failures.

### Features

- **Checkpointing:** Saves progress after each phase
- **Resume capability:** Continue from last successful phase
- **Time tracking:** Shows elapsed time per phase
- **Statistics:** Tracks success/error/skipped counts
- **Phase summaries:** Detailed reports for each phase

### Checkpoint Location

```
scripts/reimport/checkpoints/reimport_progress.json
```

### Checkpoint Format

```json
{
  "last_phase": "patients",
  "last_phase_status": "success",
  "timestamp": "2025-11-15T14:30:00",
  "phases_completed": ["validation", "delete", "patients"],
  "statistics": {
    "patients": {
      "processed": 2842,
      "success": 2842,
      "errors": 0,
      "duration": 45.2
    }
  }
}
```

### Usage

Progress tracking happens automatically when using the master orchestrator.

**Resume from checkpoint:**
```bash
python master_reimport.py --resume
```

**Clear checkpoints:**
```bash
rm scripts/reimport/checkpoints/reimport_progress.json
```

### Implementation

Handled by `scripts/reimport/utils/progress_tracker.py` (210 lines)

---

## 🎨 Color-Coded Logging

### Overview

Advanced logging system with color-coded output for easy reading.

### Log Levels

- ✅ **Success** - Green text
- ⚠️ **Warning** - Yellow text
- ❌ **Error** - Red text
- ℹ️ **Info** - Blue text
- 💓 **Heartbeat** - Cyan text
- ▓ **Progress Bar** - Visual progress

### Log Destinations

1. **Console:** Color-coded, real-time
2. **File:** `scripts/reimport/logs/<phase>_YYYYMMDD_HHMMSS.log`
3. **Summary:** Printed at phase completion

### Example Output

```
[14:30:15] [PHASE 3] ======================================================================
[14:30:15] [PHASE 3] 🔄 Phase 3: Import Patients
[14:30:15] [PHASE 3] ======================================================================
[14:30:15] [PHASE 3] Loading patients from: data/patients_20251115_143000.json
[14:30:15] [PHASE 3] ✅ Loaded 2,842 patients
[14:30:16] [PHASE 3] 💓 Still working... 50/2842 patients processed
[14:30:17] [PHASE 3] ✅ ✅ Imported 2,842 patients successfully
[14:30:17] [PHASE 3] ======================================================================
[14:30:17] [PHASE 3] ✅ PHASE 3 completed successfully!
[14:30:17] [PHASE 3] ======================================================================
```

### Implementation

Handled by `scripts/reimport/utils/logger.py` (185 lines)

---

## 🔄 Dry-Run Mode

### Overview

Preview what will happen without making any actual changes.

### Supported Operations

- **Validation:** Check connections and data
- **Backup:** Preview what would be backed up
- **Delete:** See what would be deleted
- **Import:** Preview imports (but not all phases support this yet)

### Usage

```bash
# Dry-run entire reimport
python master_reimport.py --dry-run

# Dry-run specific phase
python master_reimport.py --phase patients --dry-run

# Dry-run individual scripts
python phase0_validation/backup_s3_files.py --dry-run
python phase2_delete/delete_existing_data.py --dry-run
python phase4_communications/import_communications.py --dry-run
```

### Output

Dry-run mode clearly indicates it's a preview:

```
⚠️ DRY RUN MODE - No changes will be made
...
🔍 DRY RUN - No changes made to database
```

---

## 🎯 Feature Summary

| Feature | Status | Script | Lines |
|---------|--------|--------|-------|
| S3 Backup | ✅ Complete | `backup_s3_files.py` | 348 |
| Database Backup | ✅ Complete | `backup_postgres_to_s3.py` | 210 |
| Progress Tracking | ✅ Complete | `progress_tracker.py` | 210 |
| Color Logging | ✅ Complete | `logger.py` | 185 |
| Heartbeat Messages | ✅ Complete | Multiple files | - |
| Dry-Run Mode | ✅ Complete | Multiple files | - |
| FileMaker Client | ✅ Complete | `filemaker_client.py` | 420 |
| Master Orchestrator | ✅ Complete | `master_reimport.py` | 434 |

---

## 📝 Configuration Checklist

Before running reimport:

- [ ] Environment variables set in `.env`
- [ ] FileMaker credentials tested
- [ ] AWS credentials configured
- [ ] S3 bucket accessible
- [ ] Virtual environment activated
- [ ] `python-dotenv` installed
- [ ] Test dry-run completed
- [ ] Database backed up

---

**Last Updated:** November 15, 2025  
**Status:** All features complete and tested

