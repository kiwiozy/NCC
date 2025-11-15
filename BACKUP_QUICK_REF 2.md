# Backup Quick Reference Card

**Current Import Started:** 2025-11-15 06:42 AM  
**Expected Completion:** ~07:15-07:45 AM (30-60 minutes)

---

## 📦 Your Current Backups

### 1. Database Backup ✅
```
s3://walkeasy-nexus-documents/backup/database/nexus_sqlite_backup_20251115_064209.db
Size: 55.51 MB
Created: 06:42 AM
Status: ✅ Uploaded to S3
```

**Restore Command:**
```bash
aws s3 cp s3://walkeasy-nexus-documents/backup/database/nexus_sqlite_backup_20251115_064209.db .
# Stop Django
cp nexus_sqlite_backup_20251115_064209.db /Users/craig/Documents/nexus-core-clinic/backend/db.sqlite3
# Restart Django
```

---

### 2. S3 Files Backup 🔄
```
s3://walkeasy-nexus-documents/backup/reimport_20251115_064233/
Images: 6,712 files (12.05 GB)
Documents: 9,432 files (6.46 GB)
Total: 18.50 GB
Created: 06:42 AM
Status: 🔄 IN PROGRESS
```

**Restore Command:**
```bash
# Restore all files
aws s3 cp s3://walkeasy-nexus-documents/backup/reimport_20251115_064233/ \
  s3://walkeasy-nexus-documents/ --recursive --exclude "backup/*"
```

---

### 3. JSON Backup ✅
```
/Users/craig/Documents/nexus-core-clinic/scripts/reimport/backups/reimport_20251115_063849/
Patients: 2,842
Documents: 10,190
Images: 6,574
Image Batches: 1,701
Created: 06:38 AM
Status: ✅ Complete
```

**Location:**
```bash
cd /Users/craig/Documents/nexus-core-clinic/scripts/reimport/backups/reimport_20251115_063849
ls -lh
```

---

## 🔍 Check Import Progress

```bash
# View live log
tail -f /tmp/reimport_full.log

# Check if still running
ps aux | grep "master_reimport.py --full" | grep -v grep

# View last 50 lines
tail -50 /tmp/reimport_full.log

# Search for errors
grep -i error /tmp/reimport_full.log
```

---

## ✅ After Import Completes

### 1. Verify Success
```bash
tail -100 /tmp/reimport_full.log | grep -E "(SUMMARY|completed|failed)"
```

**Look for:**
- ✅ `✅ Reimport completed successfully!`
- ✅ `Completed: 8/8 phases`

### 2. Link Images
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate
python manage.py link_filemaker_images_csv --csv ../Image_dataV9.csv
```

### 3. Verify in UI
- Open patient detail pages
- Check images appear
- Verify data is correct

---

## 🆘 If Import Fails

### Quick Restore
```bash
# 1. Download database backup
aws s3 cp s3://walkeasy-nexus-documents/backup/database/nexus_sqlite_backup_20251115_064209.db .

# 2. Stop Django server

# 3. Restore database
cp nexus_sqlite_backup_20251115_064209.db /Users/craig/Documents/nexus-core-clinic/backend/db.sqlite3

# 4. Restart Django server
```

---

## 📞 Full Documentation

- **Backup System:** `docs/FileMaker/BACKUP_SYSTEM.md`
- **Import Sequence:** `docs/FileMaker/IMPORT_SEQUENCE.md`
- **Troubleshooting:** `docs/architecture/TROUBLESHOOTING.md`

---

**Created:** 2025-11-15 06:44 AM  
**Import Log:** `/tmp/reimport_full.log`

