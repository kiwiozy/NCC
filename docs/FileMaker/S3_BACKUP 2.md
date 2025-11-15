# S3 Backup for Reimport

**Created:** November 14, 2025  
**Purpose:** Backup all S3 images and documents before reimport  
**Script:** `phase0_validation/backup_s3_files.py`

---

## 🎯 What It Does

Before any reimport starts, the system now automatically backs up **ALL** images and documents stored in S3 to a timestamped backup folder.

### Backup Structure

```
s3://walkeasy-nexus-documents/backup/reimport_20251114_153045/
├── Images/
│   ├── patients_UUID1_images_batch1_filename.jpg
│   ├── patients_UUID2_images_batch2_filename.jpg
│   ├── filemaker-import_images-bulk-dump_2.jpg
│   └── ... (all images)
│
└── Docs/
    ├── patients_UUID1_documents_filename.pdf
    ├── patients_UUID2_documents_filename.pdf
    └── ... (all documents)
```

---

## 🚀 How It Works

### Automatic Execution

The S3 backup runs **automatically** as the **FIRST** step in Phase 0 (Validation):

```bash
python master_reimport.py --full
# OR
python master_reimport.py --dry-run
```

**Order of execution:**
1. ✅ **Backup S3 files** (NEW - runs first!)
2. Validate FileMaker connection
3. Validate FileMaker data
4. Validate system config
5. Create database backup

### Manual Execution

You can also run the backup independently:

```bash
cd scripts/reimport/phase0_validation

# Preview backup (no copying)
python backup_s3_files.py --dry-run

# Actual backup
python backup_s3_files.py
```

---

## 📊 What Gets Backed Up

### Images
- **Extensions:** .jpg, .jpeg, .png, .gif, .bmp, .tiff, .webp
- **Source:** All images from any location in the bucket
- **Destination:** `backup/reimport_TIMESTAMP/Images/`

### Documents
- **Extensions:** .pdf, .doc, .docx, .txt, .rtf, .odt
- **Source:** All documents from any location in the bucket
- **Destination:** `backup/reimport_TIMESTAMP/Docs/`

### What's NOT Backed Up
- Files already in the `backup/` folder (avoids recursive backup)
- Directory markers (keys ending with `/`)
- Files with other extensions (can be added if needed)

---

## 📈 Example Output

```
=======================================================================
🚀 Phase 0.5: Backup S3 Files (Images & Documents)
=======================================================================

S3 Bucket: walkeasy-nexus-documents

Step 1: Scanning S3 bucket for files...
✅ Found 8,523 total objects

Step 2: Categorizing files...
📸 Images: 6,490 files
📄 Documents: 1,987 files
🔧 Other: 46 files

📊 Total backup size: 3.42 GB
   - Images: 2.87 GB
   - Documents: 550.23 MB

Step 3: Backup location: s3://walkeasy-nexus-documents/backup/reimport_20251114_153045/

Step 4: Backing up 6,490 images...
✅ Backed up 6,490/6,490 images

Step 5: Backing up 1,987 documents...
✅ Backed up 1,987/1,987 documents

=======================================================================
📊 S3 Backup Summary
=======================================================================
Backup Location: s3://walkeasy-nexus-documents/backup/reimport_20251114_153045/
Images Backed Up: 6,490 files (2.87 GB)
Documents Backed Up: 1,987 files (550.23 MB)
Total Size: 3.42 GB

✅ S3 backup complete!

⚠️  IMPORTANT: Keep this backup until reimport is verified successful
To restore: Copy files from backup/reimport_20251114_153045/ back to their original locations
=======================================================================
```

---

## 🔄 How to Restore from Backup

If you need to restore files after a failed reimport:

### Option 1: AWS Console
1. Navigate to S3 bucket `walkeasy-nexus-documents`
2. Go to `backup/reimport_TIMESTAMP/`
3. Select files to restore
4. Copy them back to their original locations

### Option 2: AWS CLI
```bash
# Restore all images
aws s3 cp s3://walkeasy-nexus-documents/backup/reimport_20251114_153045/Images/ \
           s3://walkeasy-nexus-documents/ \
           --recursive

# Restore all documents
aws s3 cp s3://walkeasy-nexus-documents/backup/reimport_20251114_153045/Docs/ \
           s3://walkeasy-nexus-documents/ \
           --recursive
```

### Option 3: Python Script (Future Enhancement)
A `restore_s3_backup.py` script could be created to automate restoration.

---

## ⚙️ Configuration

The script uses Django settings for S3 configuration:

```python
# From backend/ncc_api/settings.py
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME', 'walkeasy-nexus-documents')
AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'ap-southeast-2')
```

Ensure these environment variables are set in your `.env` file.

---

## 🔒 Safety Features

1. **Non-Destructive:** Only copies files, never deletes originals
2. **Timestamped:** Each backup has unique timestamp, no overwriting
3. **Original Structure Preserved:** Files maintain their original paths in backup
4. **Dry Run Mode:** Preview backup without copying (`--dry-run`)
5. **Error Handling:** Continues on individual file errors, logs them
6. **Stop on Failure:** Master orchestrator stops if S3 backup fails

---

## 📝 Technical Details

### File Categorization

```python
image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
doc_extensions = {'.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'}
```

### S3 Operations

- Uses `boto3.client.list_objects_v2` with pagination for large buckets
- Uses `boto3.client.copy_object` for efficient server-side copying
- No data transfer to local machine (all happens in S3)

### Performance

- **Speed:** Server-side copy is fast (no network transfer)
- **Cost:** S3 copy operations are cheap (no data transfer charges)
- **Time:** Estimated 2-5 minutes for ~8,000 files

---

## ⚠️ Important Notes

1. **Keep Backup:** Don't delete backup until reimport is verified successful
2. **S3 Costs:** Backup doubles S3 storage temporarily (minimal cost)
3. **Cleanup:** Manually delete old backups when no longer needed
4. **AWS Credentials:** Must have S3 read/write permissions

---

## 🎯 Integration with Master Orchestrator

The S3 backup is now **Phase 0.5** (runs as first script in Phase 0):

```
Phase 0: Pre-Import Validation
  1. backup_s3_files.py          ← NEW! Runs first
  2. validate_filemaker_connection.py
  3. validate_filemaker_data.py
  4. validate_system_config.py
  5. create_backup.py            (database backup)
```

This ensures **BOTH** S3 files and database records are backed up before any destructive operations.

---

## 🔮 Future Enhancements

Potential improvements:
- [ ] Create `restore_s3_backup.py` for automated restoration
- [ ] Add selective backup (e.g., only images, only documents)
- [ ] Add incremental backup (only changed files)
- [ ] Add compression for documents
- [ ] Add verification checksums
- [ ] Add cleanup script for old backups
- [ ] Add email notification with backup summary

---

**Status:** ✅ **COMPLETE AND INTEGRATED**  
**Location:** `scripts/reimport/phase0_validation/backup_s3_files.py`  
**Runs:** Automatically as first step of Phase 0

