# FileMaker Reimport Scripts

**Purpose:** Complete reimport of all patient data from FileMaker while preserving documents and images.

**⚠️ WARNING:** These scripts will DELETE all existing patient and appointment data!

---

## 📁 Folder Structure

```
scripts/reimport/
├── README.md (this file)
├── master_reimport.py (main orchestrator)
│
├── phase0_validation/
│   ├── validate_filemaker_connection.py
│   ├── validate_filemaker_data.py
│   ├── validate_system_config.py
│   └── create_backup.py
│
├── phase2_delete/
│   └── delete_existing_data.py
│
├── phase3_patients/
│   ├── fetch_patients_from_filemaker.py
│   └── import_patients.py
│
├── phase4_appointments/
│   ├── fetch_appointments_from_filemaker.py
│   └── import_appointments.py
│
├── phase5_notes/
│   ├── fetch_notes_from_filemaker.py
│   └── import_notes.py
│
├── phase6_documents/
│   └── relink_documents.py
│
├── phase7_images/
│   └── relink_images.py
│
├── phase8_validation/
│   ├── validate_data_counts.py
│   ├── validate_relationships.py
│   └── validate_functional.py
│
└── utils/
    ├── logger.py
    ├── filemaker_client.py
    └── progress_tracker.py
```

---

## 🚀 Quick Start

### Option 1: Full Automated Reimport
```bash
cd /Users/craig/Documents/nexus-core-clinic/scripts/reimport
python master_reimport.py --full
```

### Option 2: Dry Run (Preview Only)
```bash
python master_reimport.py --dry-run
```

### Option 3: Run Individual Phases
```bash
# Phase 0: Validation
python master_reimport.py --phase validation

# Phase 2: Delete
python master_reimport.py --phase delete

# Phase 3: Patients
python master_reimport.py --phase patients

# Phase 4: Appointments
python master_reimport.py --phase appointments

# Phase 6: Re-link Documents
python master_reimport.py --phase documents

# Phase 7: Re-link Images
python master_reimport.py --phase images

# Phase 8: Validation
python master_reimport.py --phase validation-post
```

---

## 📋 Import Sequence (MUST follow this order)

### Phase 0: Pre-Import Validation
**Scripts:**
- `validate_filemaker_connection.py` - Test FileMaker API connection
- `validate_filemaker_data.py` - Check all required fields in FileMaker
- `validate_system_config.py` - Verify Clinics, Clinicians, Types exist in Nexus
- `create_backup.py` - Export current database to CSV

**Validation Checks:**
- ✅ FileMaker connection working
- ✅ All patients have clinic assigned
- ✅ All appointments have clinic/clinician/type
- ✅ All documents have NexusExportDate
- ✅ All images have NexusExportDate
- ✅ Database backup created

**❌ STOP if any validation fails**

---

### Phase 1: System Configuration (No Scripts - Already Configured)
**These are PRESERVED and never deleted:**
- ✅ Clinics (with colors)
- ✅ Clinicians
- ✅ Appointment Types
- ✅ Funding Types
- ✅ Integration Settings (Gmail, Xero, SMS, S3)

**Action:** None - these remain unchanged

---

### Phase 2: Delete Existing Patient Data
**Script:** `delete_existing_data.py`

**What gets deleted:**
- ❌ All patients (CASCADE deletes appointments, notes, letters, etc.)

**What gets preserved:**
- ✅ Documents (orphaned temporarily, re-linked in Phase 6)
- ✅ Images (orphaned temporarily, re-linked in Phase 7)
- ✅ ImageBatches
- ✅ S3 files
- ✅ All System Config (Phase 1)

---

### Phase 3: Import Patients
**Scripts:**
- `fetch_patients_from_filemaker.py` - Export patients from FileMaker via OData
- `import_patients.py` - Import patients into Nexus

**Dependencies:**
- ✅ Clinic table (Phase 1)
- ✅ FundingType table (Phase 1)

**Validation After:**
- Patient count matches FileMaker
- All patients have clinic assigned
- All patients have filemaker_metadata with filemaker_id

---

### Phase 4: Import Appointments
**Scripts:**
- `fetch_appointments_from_filemaker.py` - Export appointments from FileMaker
- `import_appointments.py` - Import appointments into Nexus

**Dependencies:**
- ✅ Patient table (Phase 3)
- ✅ Clinic table (Phase 1)
- ✅ Clinician table (Phase 1)
- ✅ AppointmentType table (Phase 1)

**Validation After:**
- Appointment count matches FileMaker
- All appointments have patient, clinic, clinician, type

---

### Phase 5: Import Notes/Letters (Optional)
**Scripts:**
- `fetch_notes_from_filemaker.py` - Export notes from FileMaker
- `import_notes.py` - Import notes into Nexus

**Dependencies:**
- ✅ Patient table (Phase 3)
- ✅ Appointment table (Phase 4)

**Note:** Skip if FileMaker doesn't have notes/letters

---

### Phase 6: Re-Link Documents
**Script:** `relink_documents.py`

**Dependencies:**
- ✅ Patient table (Phase 3)
- ✅ Document records (already exist, orphaned)

**Process:**
- Find documents by filemaker_id
- Match to newly imported patients by filemaker_id
- Update patient FK

**Validation After:**
- All documents have patient assigned
- Document count matches before reimport

---

### Phase 7: Re-Link Images
**Script:** `relink_images.py`

**Dependencies:**
- ✅ Patient table (Phase 3)
- ✅ Image records (already exist, orphaned)
- ✅ ImageBatch records (already exist, orphaned)

**Process:**
- Find ImageBatches by filemaker_id
- Match to newly imported patients by filemaker_id
- Update patient FK

**Validation After:**
- All ImageBatches have patient assigned
- Image count matches before reimport

---

### Phase 8: Post-Import Validation
**Scripts:**
- `validate_data_counts.py` - Check record counts match FileMaker
- `validate_relationships.py` - Check all FKs are valid
- `validate_functional.py` - Test frontend functionality

**Validation Checks:**
- ✅ Patient count matches FileMaker
- ✅ Appointment count matches FileMaker
- ✅ Document count matches before reimport
- ✅ Image count matches before reimport
- ✅ All FKs valid (no NULL)
- ✅ Random spot checks (open patient, see docs/images)

---

## 🔧 Configuration

### Environment Variables
```bash
# FileMaker Connection
FILEMAKER_HOST=walkeasy.fmcloud.fm
FILEMAKER_DATABASE=WEP-DatabaseV2
FILEMAKER_USERNAME=your_username
FILEMAKER_PASSWORD=your_password

# Django Settings
DJANGO_SETTINGS_MODULE=ncc_api.settings
```

### FileMaker API Endpoints
- **OData API:** `https://walkeasy.fmcloud.fm/fmi/odata/v4/WEP-DatabaseV2`
- **Data API:** `https://walkeasy.fmcloud.fm/fmi/data/v1/databases/WEP-DatabaseV2`

---

## 📊 Progress Logging

All scripts log to:
- **Console:** Real-time progress
- **Log File:** `logs/reimport_TIMESTAMP.log`

**Log Format:**
```
[2025-11-14 10:00:00] [PHASE 0] Starting validation...
[2025-11-14 10:00:05] [PHASE 0] ✅ FileMaker connection successful
[2025-11-14 10:00:10] [PHASE 0] ✅ All clinics validated
...
```

---

## 🚨 Error Handling

### If Phase Fails:
1. **Check logs** - `logs/reimport_TIMESTAMP.log`
2. **Review error** - Fix issue in FileMaker or Nexus
3. **Rollback** - Restore from backup if needed
4. **Retry** - Re-run specific phase

### Rollback Options:
- **Partial:** Re-run failed phase only
- **Full:** Restore entire database from backup

---

## ⏱️ Estimated Time

**Total Duration:** 30-60 minutes for 2,842 patients + 9,830 appointments

- **Phase 0:** 2-5 minutes (validation)
- **Phase 2:** 1 minute (delete)
- **Phase 3:** 5-10 minutes (patient import)
- **Phase 4:** 10-15 minutes (appointment import)
- **Phase 5:** 5 minutes (notes, if applicable)
- **Phase 6:** 5-10 minutes (document re-linking)
- **Phase 7:** 5-10 minutes (image re-linking)
- **Phase 8:** 5 minutes (validation)

---

## 🔐 Access Control

**Who can run this:**
- Only Django superusers (admin users)
- Requires FileMaker credentials
- All actions are logged with user ID and timestamp

---

## 📞 Support

**If import fails:**
1. Check `logs/reimport_TIMESTAMP.log`
2. Review error message
3. Fix data issue in FileMaker or Nexus
4. Re-run failed phase (or restore from backup)

**Emergency Contacts:**
- Technical Support: [contact info]
- Database Backup Location: `backups/reimport_TIMESTAMP/`

---

## 📚 Related Documentation

- **Import Sequence:** `docs/FileMaker/IMPORT_SEQUENCE.md`
- **Reimport Checklist:** `docs/FileMaker/REIMPORT_CHECKLIST.md`
- **Import Guide:** `docs/FileMaker/IMPORT_COMPLETE_GUIDE.md`
- **API Documentation:** `docs/FileMaker/API_TABLES_COMPLETE_OVERVIEW.md`

---

**Last Updated:** 2025-11-14  
**Status:** In Development  
**Next Steps:** Build individual phase scripts based on IMPORT_SEQUENCE.md

