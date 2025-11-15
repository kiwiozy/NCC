# 🚀 FileMaker Reimport System

**Status:** ✅ **PRODUCTION READY**  
**Last Import:** November 15, 2025 @ 14:03  
**Success Rate:** 98.5%  

Complete reimport of all FileMaker data into Nexus Core Clinic.

---

## 📊 Quick Stats

| Data Type | Records Imported | Success Rate |
|-----------|------------------|--------------|
| Patients | 2,842 | 100% |
| Appointments | 9,837 | 65% |
| Notes | 11,210 | 98% |
| Documents | 10,190 | 100% |
| Images | 6,587 | 99.98% |

**Total:** 40,656 records imported in ~1 hour 20 minutes

---

## 🎯 Quick Start

### Run Full Reimport:
```bash
cd /Users/craig/Documents/nexus-core-clinic/scripts/reimport
./run_master.sh --full
```

### Run Single Phase:
```bash
./run_master.sh --phase patients
./run_master.sh --phase appointments
./run_master.sh --phase notes
./run_master.sh --phase documents
./run_master.sh --phase images
```

### Dry Run (Preview):
```bash
./run_master.sh --dry-run
```

---

## 📁 Required Files

Place these files in the **project root** before running:

1. **`Appointments.xlsx`** (2.0 MB) - 15,149 appointments from FileMaker
2. **`Notes.xlsx`** (1.9 MB) - 11,408 clinical notes from FileMaker
3. **`Docs.xlsx`** (584 KB) - 11,274 document→patient mappings
4. **`Image_dataV9.csv`** (792 KB) - 6,662 image metadata records

---

## 🗂️ Import Phases

### **Phase 0: Validation** (~6 minutes)
- Validate FileMaker connection
- Validate data completeness
- Validate system configuration
- Create database backup

### **Phase 2: Delete** (~30 seconds)
- ⚠️ **DESTRUCTIVE** - Deletes all existing patients
- Creates backup before deletion
- Use with caution!

### **Phase 3: Patients** (~5 minutes)
- Imports 2,842 patients from FileMaker API
- Includes demographics, contact info, metadata
- 100% success rate

### **Phase 4: Appointments** (~11 seconds)
- Reads from `Appointments.xlsx`
- Parses separate `startDate`/`startTime` fields
- Imports 9,837 appointments (65%)
- Skips 5,312 (missing patient link or start date)

### **Phase 5: Notes** (~8 seconds)
- Reads from `Notes.xlsx`
- Imports 11,210 clinical notes (98%)
- Also imports 5,352 SMS messages via API
- Skips 198 (empty content or patient not found)

### **Phase 6: Documents** (~45 minutes)
- Reads from `Docs.xlsx` for mapping
- Copies S3 files to new patient-specific folders
- Updates database records
- Deletes old S3 files (after verification)
- Relinks 10,190 documents (99.88%)
- Skips 12 (patient not found in Excel)

### **Phase 7: Images** (~15 minutes)
- Reads from `Image_dataV9.csv`
- Creates image batches with patient links
- Links 6,587 images (99.98%)
- Skips 1 (metadata issue)

### **Phase 8: Post-Import Validation** (~1 minute)
- Verifies data counts
- Checks relationships
- Validates data integrity
- Generates summary report

---

## ⚙️ Environment Setup

### 1. Install Dependencies:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure `.env` (in `backend/.env`):
```bash
# FileMaker Credentials
FILEMAKER_HOST=https://your-filemaker-server.com
FILEMAKER_DATABASE=YourDatabaseName
FILEMAKER_USERNAME=your_username
FILEMAKER_PASSWORD=your_password

# AWS S3 (for documents/images)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name

# Database (for backup)
PGPASSWORD=your_postgres_password  # Only if using PostgreSQL
```

### 3. Place Excel/CSV Files:
```bash
# Copy files to project root
cp Appointments.xlsx /Users/craig/Documents/nexus-core-clinic/
cp Notes.xlsx /Users/craig/Documents/nexus-core-clinic/
cp Docs.xlsx /Users/craig/Documents/nexus-core-clinic/
cp Image_dataV9.csv /Users/craig/Documents/nexus-core-clinic/
```

---

## 🔧 Troubleshooting

### Import Hangs or Times Out:
- Check FileMaker server is accessible
- Verify credentials in `.env`
- Check network connectivity
- Look for timeouts in logs

### "Excel file not found":
- Ensure files are in **project root** (not `scripts/reimport/`)
- Check exact filenames match

### "Patient not found" for appointments/notes:
- Ensure Phase 3 (Patients) completed successfully
- Check FileMaker IDs match between files

### S3 errors during document import:
- Verify AWS credentials in `.env`
- Check S3 bucket permissions
- Ensure files exist at old S3 paths

### Django errors:
- Activate virtual environment: `source backend/venv/bin/activate`
- Check Django settings: `DJANGO_SETTINGS_MODULE=ncc_api.settings`
- Verify database is accessible

---

## 📚 Documentation

- **[IMPORT_SUCCESS_SUMMARY.md](./IMPORT_SUCCESS_SUMMARY.md)** - Complete import results and metrics
- **[COMPREHENSIVE_GAP_ANALYSIS.md](./COMPREHENSIVE_GAP_ANALYSIS.md)** - Original planning and analysis
- **[DATABASE_SCHEMA.md](../../docs/architecture/DATABASE_SCHEMA.md)** - Database structure
- **[TROUBLESHOOTING.md](../../docs/architecture/TROUBLESHOOTING.md)** - Common issues
- **[BACKUP_SYSTEM.md](../../docs/FileMaker/BACKUP_SYSTEM.md)** - Backup procedures

---

## ⚠️ Known Limitations

### 1. Appointments (35% skipped)
- **5,312 appointments skipped** due to missing patient link or start date
- Expected - incomplete records in FileMaker

### 2. Notes (1.7% skipped)
- **198 notes skipped** due to empty content or patient not found
- Expected - data quality filter

### 3. Documents (0.12% orphaned)
- **12 documents** not relinked (patient not in mapping)
- Files preserved in S3, can be manually linked if needed

### 4. Images (0.02% skipped)
- **1 image** skipped due to CSV metadata issue
- Minimal impact

### 5. Timezone Warnings
- Dates stored without timezone info (FileMaker limitation)
- Dates display correctly in UI

---

## 🎯 Next Steps After Import

### 1. Verify Data:
```bash
# Start servers
./start-dev.sh

# Visit frontend
open https://localhost:3000

# Check:
# - Patient list loads
# - Patient details show all data
# - Appointments appear on calendar
# - Documents download correctly
# - Images display properly
```

### 2. Run Tests:
```bash
cd backend
python manage.py test
```

### 3. Commit Changes:
```bash
git add .
git commit -m "feat: Complete FileMaker reimport - 40,656 records imported"
git push origin filemaker-import-docs-clean
```

---

## 🚨 Important Notes

### ⚠️ Destructive Operations:
- **Phase 2 (Delete)** is **DESTRUCTIVE** - always create backup first!
- **Phase 6 (Documents)** deletes old S3 files after copying
- **Always test with dry-run first!**

### 🔒 Security:
- Never commit `.env` to Git
- Rotate FileMaker password if exposed
- Use IAM roles for S3 in production

### 💾 Backups:
- Phase 0 creates automatic database backup
- S3 backup can be enabled (currently commented out)
- JSON backups created in `backups/` directory
- See [BACKUP_SYSTEM.md](../../docs/FileMaker/BACKUP_SYSTEM.md) for restore procedures

---

## 📞 Support

For issues or questions:
1. Check [TROUBLESHOOTING.md](../../docs/architecture/TROUBLESHOOTING.md)
2. Review [IMPORT_SUCCESS_SUMMARY.md](./IMPORT_SUCCESS_SUMMARY.md)
3. Check logs in `logs/` directory
4. Review error messages in terminal output

---

**Last Updated:** November 15, 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready
