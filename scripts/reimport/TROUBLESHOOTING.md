# FileMaker Reimport - Troubleshooting Guide

**Purpose:** Solutions to common issues encountered during reimport

---

## 🖼️ Issue: Images Not Displaying After Import

### Problem
After full reimport, images don't appear in the frontend despite being in the database.

### Root Cause
Image batches contain old patient UUIDs from a previous run. When patients are deleted and reimported in Phase 2-3, they get new UUIDs, orphaning the image batches.

### Symptoms
```python
ImageBatch.objects.count()  # Shows batches exist
# But trying to access patient:
batch.object_id  # Returns a UUID
Patient.objects.get(id=batch.object_id)  # Patient.DoesNotExist!
```

### Solution
1. **Delete existing image data:**
   ```python
   from images.models import Image, ImageBatch
   Image.objects.all().delete()
   ImageBatch.objects.all().delete()
   ```

2. **Re-run Phase 7:**
   ```bash
   cd /Users/craig/Documents/nexus-core-clinic
   python scripts/reimport/phase7_images/link_filemaker_images_csv.py
   ```

### Result
Images will be linked to the current patient UUIDs and appear in the frontend.

**Note:** This only deletes database records. Image files remain safely in S3.

---

## 🔐 Issue: CSV BOM Encoding

### Problem
CSV columns not reading correctly, first column appears as `\ufeffcolumn_name`.

### Root Cause
CSV file exported from FileMaker/Excel/Windows contains UTF-8 Byte Order Mark (BOM).

### Symptoms
```python
with open('Image_dataV9.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    print(reader.fieldnames)
# Output: ['\ufeffrecid', 'id_Contact', 'date', ...]
#          ^^^^^^^^^ BOM corrupts first column name
```

### Solution
Use `utf-8-sig` encoding instead of `utf-8`:

```python
with open('Image_dataV9.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
```

The `-sig` suffix automatically strips the BOM.

### Files Fixed
- `backend/images/management/commands/link_filemaker_images_csv.py`

---

## 🔍 Issue: Patient Lookup Failing

### Problem
Images or documents failing to link to patients with "Patient not found" errors.

### Root Cause
Searching in wrong JSON field for FileMaker ID.

### Common Mistakes

**❌ Wrong: Searching in `notes` field**
```python
patient = Patient.objects.get(notes__contains=f'"filemaker_id": "{fm_id}"')
```

**✅ Correct: Searching in `filemaker_metadata` field**
```python
patient = Patient.objects.get(filemaker_metadata__filemaker_id=fm_id)
```

### How to Verify
Check the `Patient` model structure:
```python
from patients.models import Patient
patient = Patient.objects.first()
print(patient.filemaker_metadata)  # Should contain {'filemaker_id': '...'}
```

---

## ⏱️ Issue: FileMaker API Timeouts

### Problem
Scripts timeout when fetching data from FileMaker, especially with 10,000+ records.

### Root Causes
1. FileMaker OData has 10,000 record limit
2. Pagination (`$skip`) is broken in FileMaker OData
3. Network timeouts on slow connections

### Solutions

**Solution 1: Increase Timeout (temporary)**
```python
# In filemaker_client.py
self.timeout = 120  # Increase from 30 to 120 seconds
```

**Solution 2: Sample-Based Validation (better)**
```python
# Instead of:
patients = fm.get_all_patients()  # Times out!

# Use:
patients = fm.odata_query('@Contacts', top=500)  # Sample only
```

**Solution 3: Excel Export (best for bulk data)**
Export from FileMaker to Excel, then read Excel file:
```python
import openpyxl
wb = openpyxl.load_workbook('Notes.xlsx')
```

### Files Fixed
- `phase0_validation/validate_filemaker_data.py`
- `phase0_validation/validate_system_config.py`
- `phase5_notes/fetch_notes_from_excel.py` (switched to Excel)

---

## 🗄️ Issue: Database Backup Failing

### Problem
`pg_dump: connection refused` error when trying to backup database.

### Root Cause
Script assumes PostgreSQL but project uses SQLite.

### Solution
Script now detects database type automatically:

```python
db_engine = settings.DATABASES['default']['ENGINE']

if 'sqlite' in db_engine:
    # Use file copy for SQLite
    shutil.copy2(db_path, backup_path)
elif 'postgresql' in db_engine:
    # Use pg_dump for PostgreSQL
    subprocess.run(['pg_dump', ...])
```

### Files Fixed
- `phase0_validation/backup_postgres_to_s3.py`

---

## 📅 Issue: Appointment Date/Time Parsing

### Problem
All appointments skipped with "no start time" error.

### Root Cause
FileMaker exports separate `startDate` and `startTime` fields, but script looked for combined `Start` field.

### Solution
Created `combine_date_time()` function to merge separate fields:

```python
def combine_date_time(date_str, time_str):
    # Handles ISO dates: "2017-10-05T00:00:00"
    # Handles times: "09:30:00" or "1 day, 09:30:00"
    # Special case: "24:00:00" → "23:59:59"
```

### Files Fixed
- `phase4_appointments/import_appointments.py`

---

## 📝 Issue: Notes Import Returns 0 Records

### Problem
Notes import shows 0 notes imported despite Excel file having 11,408 records.

### Root Cause
Patient lookup using wrong field name. Excel export uses `id_Key` but script looked for `id_Contact`.

### Solution
Updated patient lookup to check multiple fields:

```python
# Try multiple possible field names
fm_id = note_data.get('id_Contact') or note_data.get('id_Key') or note_data.get('patient_id')
```

### Files Fixed
- `phase5_notes/import_notes.py`

---

## 📄 Issue: Documents Not Relinking

### Problem
Document relinking fails with "Patient not found: 10160"

### Root Cause
Documents had `filemaker_id` (document's own ID) but no link to new patient UUIDs.

### Solution
Use `Docs.xlsx` mapping file:
- Contains `id` (document FileMaker ID)
- Contains `id_Contact` (patient FileMaker ID)
- Script maps document → patient → new UUID

### Files Fixed
- Created `phase6_documents/relink_documents_clean.py`

---

## 🔌 Issue: Django Module Not Found

### Problem
```
ModuleNotFoundError: No module named 'django'
ModuleNotFoundError: No module named 'ncc_api'
```

### Root Cause
Scripts run without Django virtual environment activated.

### Solution
Update `run_master.sh` to explicitly activate venv:

```bash
# Find and activate venv
VENV_PATH="$PROJECT_ROOT/backend/venv"
source "$VENV_PATH/bin/activate"
```

### Files Fixed
- `scripts/reimport/run_master.sh`

---

## 🔑 Issue: FileMaker Credentials Not Found

### Problem
```
ValueError: FileMaker credentials not provided
```

### Root Cause
`python-dotenv` not installed or `.env` file not loaded.

### Solutions

**Solution 1: Install python-dotenv**
```bash
cd backend
source venv/bin/activate
pip install python-dotenv
```

**Solution 2: Add to filemaker_client.py**
```python
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / 'backend' / '.env')
```

### Files Fixed
- `scripts/reimport/utils/filemaker_client.py`

---

## 🚫 Issue: Git Push Blocked (Credentials in History)

### Problem
```
remote: GitHub Push Protection: Blocked - AWS credentials detected
```

### Root Cause
Old commits contain hardcoded AWS credentials in documentation files.

### Solution
Use interactive rebase to rewrite history:

```bash
# Find commit with secrets
git log --oneline

# Start rebase
git rebase -i <commit-before-secrets>

# Mark commit for editing
# In editor, change 'pick' to 'edit' for the problematic commit

# Edit files to remove credentials
# Replace with placeholders like YOUR_AWS_ACCESS_KEY_ID

# Amend the commit
git add <files>
git commit --amend

# Continue rebase
git rebase --continue

# Force push (with lease for safety)
git push origin <branch> --force-with-lease
```

---

## 💡 Prevention Tips

### 1. Always Use Dry-Run First
```bash
python master_reimport.py --dry-run
python <any-script>.py --dry-run
```

### 2. Check Sample Data Before Full Run
```bash
# Test with small sample first
python import_script.py --limit 100
```

### 3. Verify Environment Before Running
```bash
# Check credentials loaded
python phase0_validation/validate_filemaker_connection.py

# Check venv activated
which python  # Should show backend/venv/bin/python
```

### 4. Always Backup First
```bash
# Database backup
python phase0_validation/backup_postgres_to_s3.py

# S3 backup
python phase0_validation/backup_s3_files.py
```

### 5. Monitor Logs
```bash
tail -f scripts/reimport/logs/django.log
```

---

## 📋 Quick Diagnostic Checklist

When something goes wrong:

- [ ] Is virtual environment activated?
- [ ] Are environment variables loaded?
- [ ] Did you run dry-run first?
- [ ] Is Django server running (if needed)?
- [ ] Are FileMaker credentials correct?
- [ ] Is S3 accessible?
- [ ] Did you check the logs?
- [ ] Did previous phases complete successfully?
- [ ] Is database backed up?

---

## 🆘 Common Error Messages

| Error | Likely Cause | Solution |
|-------|-------------|----------|
| `Patient.DoesNotExist` | UUID mismatch | Delete images, re-run Phase 7 |
| `ModuleNotFoundError` | Venv not activated | Activate venv, check paths |
| `ValueError: credentials not found` | Missing `.env` | Install python-dotenv, check `.env` |
| `ConnectionError` | FileMaker unreachable | Check network, credentials |
| `TimeoutError` | Large dataset | Use Excel export instead |
| `KeyError: 'column'` | CSV BOM issue | Use `utf-8-sig` encoding |
| `exit code 1` | Script failed | Check logs for details |

---

**Last Updated:** November 15, 2025  
**Status:** Covers all known issues from production import

