# Nexus Backup System

**Last Updated:** 2025-11-15  
**Status:** ✅ Production Ready

---

## 📦 Overview

The Nexus reimport system creates **three types of backups** before any destructive operations:

1. **Database Backup (S3)** - Full SQLite/PostgreSQL backup
2. **S3 Files Backup** - Server-side copy of all images & documents
3. **JSON Backup (Local)** - Metadata for all records

---

## 🔄 Backup Types

### 1. Database Backup to S3

**Location:** `s3://walkeasy-nexus-documents/backup/database/`

**What:** Complete database file (SQLite) or pg_dump (PostgreSQL)

**When:** First step of Phase 0 (before any changes)

**Example:**
```
s3://walkeasy-nexus-documents/backup/database/nexus_sqlite_backup_20251115_064209.db
Size: 55.51 MB
Format: SQLite database file (or PostgreSQL custom dump)
Encryption: AES256 server-side
Storage Class: STANDARD_IA (Infrequent Access)
```

**How to Restore:**
```bash
# 1. Download from S3
aws s3 cp s3://walkeasy-nexus-documents/backup/database/nexus_sqlite_backup_20251115_064209.db .

# 2. Stop Django server
# (stop your running Django server)

# 3. Replace database file
cp nexus_sqlite_backup_20251115_064209.db /Users/craig/Documents/nexus-core-clinic/backend/db.sqlite3

# 4. Restart Django server
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate
python manage.py runserver
```

**For PostgreSQL:**
```bash
# 1. Download from S3
aws s3 cp s3://walkeasy-nexus-documents/backup/database/nexus_postgres_backup_TIMESTAMP.dump .

# 2. Restore
pg_restore -h localhost -U postgres -d nexus_db --clean nexus_postgres_backup_TIMESTAMP.dump
```

---

### 2. S3 Files Backup

**Location:** `s3://walkeasy-nexus-documents/backup/reimport_TIMESTAMP/`

**What:** Server-side copy of all images, documents, and other files

**When:** Second step of Phase 0 (after database backup)

**Example:**
```
s3://walkeasy-nexus-documents/backup/reimport_20251115_064233/
  ├── images/ (6,712 files, 12.05 GB)
  ├── documents/ (9,432 files, 6.46 GB)
  └── other/ (1,397 files)
Total: 18.50 GB
```

**Structure:**
```
backup/reimport_20251115_064233/
  ├── images/
  │   ├── filemaker-import/images-bulk-dump/1000.jpg
  │   ├── filemaker-import/images-bulk-dump/1001.jpg
  │   └── ... (all image files)
  ├── documents/
  │   ├── documents/uuid1/filename.pdf
  │   ├── documents/uuid2/filename.docx
  │   └── ... (all document files)
  └── other/
      └── ... (other files)
```

**How to Restore:**

**Option A: Restore All Files**
```bash
# Restore all images
aws s3 cp s3://walkeasy-nexus-documents/backup/reimport_20251115_064233/images/ \
  s3://walkeasy-nexus-documents/ --recursive

# Restore all documents
aws s3 cp s3://walkeasy-nexus-documents/backup/reimport_20251115_064233/documents/ \
  s3://walkeasy-nexus-documents/ --recursive
```

**Option B: Restore Specific Files**
```bash
# Restore specific image
aws s3 cp s3://walkeasy-nexus-documents/backup/reimport_20251115_064233/images/filemaker-import/images-bulk-dump/1000.jpg \
  s3://walkeasy-nexus-documents/filemaker-import/images-bulk-dump/1000.jpg

# Restore specific document
aws s3 cp s3://walkeasy-nexus-documents/backup/reimport_20251115_064233/documents/documents/uuid/file.pdf \
  s3://walkeasy-nexus-documents/documents/uuid/file.pdf
```

**Performance:**
- Uses S3 server-side copy (no download/upload)
- ~1-2 files per second
- 6,712 images = ~5-10 minutes
- 9,432 documents = ~5-10 minutes
- Total backup time: ~10-20 minutes

---

### 3. JSON Backup (Local)

**Location:** `scripts/reimport/backups/reimport_TIMESTAMP/`

**What:** JSON export of all database records (metadata only, not files)

**When:** Last step of Phase 0 (after S3 backup)

**Example:**
```
/Users/craig/Documents/nexus-core-clinic/scripts/reimport/backups/reimport_20251115_063849/
  ├── patients.json (2,842 records)
  ├── appointments.json (0 records)
  ├── documents.json (10,190 records)
  ├── images.json (6,574 records)
  ├── image_batches.json (1,701 records)
  └── backup_summary.json
```

**Contents:**
- `patients.json` - All patient records with metadata
- `appointments.json` - All appointment records
- `documents.json` - Document metadata (not files)
- `images.json` - Image metadata (not files)
- `image_batches.json` - Image batch groupings
- `backup_summary.json` - Backup metadata

**How to Restore:**
```bash
# Manual restore (not automated yet)
# 1. Read JSON files
# 2. Re-create Django model instances
# 3. Save to database

# Note: This is for reference/recovery only
# Primary restore method is database backup (Method #1)
```

**Use Cases:**
- Data recovery if database backup fails
- Audit trail of what was deleted
- Data migration reference
- Debugging import issues

---

## 🔐 Security & Retention

### Encryption
- **Database Backup:** AES256 server-side encryption
- **S3 Files Backup:** Inherits original encryption settings
- **JSON Backup:** Plain text (local only)

### Storage Class
- **Database:** STANDARD_IA (Infrequent Access) - cost-effective for backups
- **S3 Files:** STANDARD (same as originals)
- **JSON:** Local disk

### Retention Policy
**Recommended:**
- Keep database backups: 30 days
- Keep S3 file backups: 7 days (large, expensive)
- Keep JSON backups: 90 days (small, cheap)

**Manual Cleanup:**
```bash
# Delete old database backups (>30 days)
aws s3 ls s3://walkeasy-nexus-documents/backup/database/ | \
  awk '{print $4}' | while read file; do
    # Check age and delete if >30 days
    echo "Check: $file"
  done

# Delete old S3 file backups (>7 days)
aws s3 ls s3://walkeasy-nexus-documents/backup/ --recursive | \
  grep "reimport_" | awk '{print $4}' | while read file; do
    # Check age and delete if >7 days
    echo "Check: $file"
  done
```

---

## 🚨 Disaster Recovery

### Scenario 1: Import Failed, Database Corrupted

**Use Database Backup (Fastest):**
```bash
# 1. Download latest backup
aws s3 ls s3://walkeasy-nexus-documents/backup/database/ | tail -1
aws s3 cp s3://walkeasy-nexus-documents/backup/database/nexus_sqlite_backup_LATEST.db .

# 2. Stop Django
# (stop server)

# 3. Restore
cp nexus_sqlite_backup_LATEST.db /path/to/backend/db.sqlite3

# 4. Restart Django
# (start server)
```

**Time to Recovery:** ~2 minutes

---

### Scenario 2: S3 Files Corrupted/Deleted

**Use S3 Files Backup:**
```bash
# Find latest backup
aws s3 ls s3://walkeasy-nexus-documents/backup/ | grep reimport_ | tail -1

# Restore all files
aws s3 cp s3://walkeasy-nexus-documents/backup/reimport_TIMESTAMP/ \
  s3://walkeasy-nexus-documents/ --recursive --exclude "backup/*"
```

**Time to Recovery:** ~20-30 minutes (copying 18 GB)

---

### Scenario 3: Both Database AND Files Corrupted

**Use Both Backups:**
```bash
# 1. Restore database (see Scenario 1)
# 2. Restore S3 files (see Scenario 2)
```

**Time to Recovery:** ~30-40 minutes

---

### Scenario 4: Need Specific Record Data

**Use JSON Backup:**
```bash
# Find patient data
cd /Users/craig/Documents/nexus-core-clinic/scripts/reimport/backups/
ls -ltr | tail -1  # Find latest backup
cd reimport_TIMESTAMP

# Search for specific patient
cat patients.json | jq '.[] | select(.first_name=="John" and .last_name=="Smith")'

# Get appointment count
cat appointments.json | jq '. | length'
```

**Time to Recovery:** ~5 minutes (manual)

---

## 📊 Backup Verification

### Check Database Backup Exists
```bash
aws s3 ls s3://walkeasy-nexus-documents/backup/database/ | tail -5
```

### Check S3 Files Backup Exists
```bash
aws s3 ls s3://walkeasy-nexus-documents/backup/ | grep reimport_
```

### Check JSON Backup Exists
```bash
ls -ltr /Users/craig/Documents/nexus-core-clinic/scripts/reimport/backups/ | tail -5
```

### Verify Backup Contents
```bash
# Database size
aws s3 ls s3://walkeasy-nexus-documents/backup/database/ --recursive --human-readable | tail -1

# S3 files count
aws s3 ls s3://walkeasy-nexus-documents/backup/reimport_20251115_064233/ --recursive | wc -l

# JSON records count
cd /Users/craig/Documents/nexus-core-clinic/scripts/reimport/backups/reimport_20251115_063849
cat backup_summary.json
```

---

## 🔧 Backup Scripts

### Create Manual Database Backup
```bash
cd /Users/craig/Documents/nexus-core-clinic/scripts/reimport
source ../../backend/venv/bin/activate
python phase0_validation/backup_postgres_to_s3.py
```

### Create Manual S3 Files Backup
```bash
cd /Users/craig/Documents/nexus-core-clinic/scripts/reimport
source ../../backend/venv/bin/activate
python phase0_validation/backup_s3_files.py
```

### Create Manual JSON Backup
```bash
cd /Users/craig/Documents/nexus-core-clinic/scripts/reimport
source ../../backend/venv/bin/activate
python phase0_validation/create_backup.py
```

---

## 📋 Backup Checklist

**Before Every Full Reimport:**

- [ ] Verify disk space (local: 100 MB for JSON, S3: 20+ GB available)
- [ ] Verify AWS credentials are valid
- [ ] Verify S3 bucket is accessible
- [ ] Run Phase 0 validation (creates all backups automatically)
- [ ] Verify all 3 backup types created successfully
- [ ] Note backup timestamps/locations for recovery
- [ ] Test restore process on staging (optional but recommended)

**After Every Full Reimport:**

- [ ] Verify database backup uploaded to S3
- [ ] Verify S3 files backup completed
- [ ] Verify JSON backup created locally
- [ ] Document backup locations in runbook
- [ ] Set calendar reminder to clean up old backups

---

## 🆘 Emergency Contacts

**Database Backup Issues:**
- Check: `phase0_validation/backup_postgres_to_s3.py`
- Logs: Look for "Database backup" in reimport logs

**S3 Files Backup Issues:**
- Check: `phase0_validation/backup_s3_files.py`
- Logs: Look for "S3 Backup Summary" in reimport logs

**JSON Backup Issues:**
- Check: `phase0_validation/create_backup.py`
- Logs: Look for "Backup Summary" in reimport logs

---

## 📚 Related Documentation

- [IMPORT_SEQUENCE.md](IMPORT_SEQUENCE.md) - Full import workflow
- [S3_BACKUP.md](S3_BACKUP.md) - S3 backup details
- [COMPREHENSIVE_GAP_ANALYSIS.md](../../scripts/reimport/COMPREHENSIVE_GAP_ANALYSIS.md) - System overview
- [WHERE_TO_RUN.md](WHERE_TO_RUN.md) - Execution environment setup

---

**Generated:** 2025-11-15  
**Version:** 1.0  
**Author:** AI Assistant (Claude Sonnet 4.5)

