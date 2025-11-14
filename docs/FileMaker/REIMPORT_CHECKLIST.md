# FileMaker Full Reimport Checklist

**Goal:** Delete all patient data and reimport fresh from FileMaker, while preserving documents and images.

**Status:** Planning Phase  
**Last Updated:** 2025-11-14

---

## 📋 Pre-Import Checklist

### ✅ Protected Data (DO NOT DELETE)
- [x] **Documents** (99% complete) - S3 files preserved
- [x] **Images** (99% complete) - S3 files preserved
- [x] **Document records** - Database records with `filemaker_id` tracking
- [x] **Image records** - Database records with `filemaker_id` tracking
- [x] **ImageBatch records** - Metadata preserved

### ⚠️ Data to DELETE and Reimport
- [ ] **Patients** (2,842 records)
- [ ] **Appointments** (9,830 records)
  - [ ] 32 appointments still have NULL clinic
  - [ ] 1,496 appointments missing clinician
  - [ ] 1,496 appointments missing appointment_type
- [ ] **Notes** (if any)
- [ ] **Letters** (if any)
- [ ] **Reminders** (if any)
- [ ] **SMS Messages** (if any)

### 🔧 System Configuration (PRESERVE)
- [x] **Clinics** - Keep existing clinic records with colors
- [x] **Clinicians** - Keep existing clinician records
- [x] **Appointment Types** - Keep existing types
- [x] **Funding Types** - Keep existing funding types
- [x] **Gmail Integration** - Keep settings
- [x] **Xero Integration** - Keep settings
- [x] **SMS Integration** - Keep settings
- [x] **S3 Integration** - Keep settings

---

## 📊 Current Data Status

### Patient Records
- **Total patients:** 2,842
- **Patients with clinic:** 2,756 (97%)
- **Patients without clinic:** 86 (3%)
- **Patients with FileMaker metadata:** 2,842 (100%)

### Appointment Records
- **Total appointments:** 9,830
- **Appointments with clinic:** 9,798 (99.7%)
- **Appointments with NULL clinic:** 32 (0.3%)
- **Appointments missing clinician:** 1,496 (15.2%)
- **Appointments missing appointment_type:** 1,496 (15.2%)

### Document Records
- **Status:** 99% complete
- **S3 Storage:** Organized by patient/doc_type/filemaker_id
- **Tracking:** `filemaker_id` field prevents duplicates
- **NexusExportDate:** Synced in FileMaker

### Image Records
- **Status:** 99% complete
- **S3 Storage:** Organized in batches
- **Tracking:** `filemaker_id` field prevents duplicates
- **NexusExportDate:** Synced in FileMaker

---

## 🎯 Reimport Strategy

### Phase 1: Preparation
- [ ] **Create backup of current database**
  - [ ] Export patients table to CSV
  - [ ] Export appointments table to CSV
  - [ ] Export notes, letters, reminders, SMS to CSV
- [ ] **Verify FileMaker data is complete**
  - [ ] All patients have clinic assigned in FileMaker
  - [ ] All appointments have clinic/clinician/type in FileMaker
  - [ ] All NexusExportDate fields are set (for docs/images)
- [ ] **Document current system state**
  - [ ] Current patient count
  - [ ] Current appointment count
  - [ ] Current document/image links

### Phase 2: Create Reimport Tool (Settings Page)
- [ ] **Create Settings → Data Management sub-tab**
  - [ ] Show current data counts
  - [ ] Show FileMaker connection status
  - [ ] Dry-run preview of reimport
  - [ ] Actual reimport button (with confirmation)
- [ ] **Reimport process**
  - [ ] Delete patients (CASCADE deletes appointments, notes, etc.)
  - [ ] Reimport patients from FileMaker
  - [ ] Reimport appointments from FileMaker
  - [ ] Re-link documents using `filemaker_id`
  - [ ] Re-link images using `filemaker_id`
  - [ ] Verify all links are restored

### Phase 3: FileMaker Data Requirements
**What needs to be in FileMaker for a successful reimport:**

#### Patient Fields (Required)
- [ ] `id` - FileMaker UUID
- [ ] `first_name`
- [ ] `last_name`
- [ ] `title`
- [ ] `dob` - Date of birth
- [ ] `gender` - Sex
- [ ] `health_number`
- [ ] `clinic_name` - MUST be populated
- [ ] `funding_type` - NEW: Need to add this to export
- [ ] `coordinator_name` - NEW: Need to add this to export
- [ ] `coordinator_date` - NEW: Need to add this to export
- [ ] `plan_start_date` - NEW: Need to add this to export
- [ ] `plan_end_date` - NEW: Need to add this to export
- [ ] `xero_contact_id`

#### Contact Fields (Patient Related)
- [ ] `phone` - With name/type
- [ ] `mobile` - With name/type
- [ ] `email` - With name/type
- [ ] `address_1`, `address_2`, `suburb`, `state`, `postcode`

#### Appointment Fields (Required)
- [ ] `id` - FileMaker UUID
- [ ] `patient_id` - Link to patient
- [ ] `clinic_name` - MUST be populated
- [ ] `clinician_name` - MUST be populated
- [ ] `appointment_type` - MUST be populated
- [ ] `start_time` - DateTime
- [ ] `end_time` - DateTime
- [ ] `status` - scheduled/completed/cancelled
- [ ] `notes` - Optional

#### Document/Image Fields (Already Complete)
- [x] `id` - FileMaker UUID
- [x] `patient_id` - Link to patient
- [x] `doc_type` - Category
- [x] `NexusExportDate` - Prevents re-upload

---

## 🚨 Critical Issues to Fix BEFORE Reimport

### 1. Missing Funding Type (All 2,842 patients)
- **Problem:** No patients have funding type assigned
- **FileMaker Status:** Unknown if field exists
- **Action Required:**
  - [ ] Check if FileMaker has funding type field
  - [ ] Add to export script if available
  - [ ] Or: Manually assign after reimport

### 2. Missing Coordinator (Some patients)
- **Problem:** Coordinator info might not be exported
- **FileMaker Status:** Unknown if field exists
- **Action Required:**
  - [ ] Check if FileMaker has coordinator fields
  - [ ] Add to export script if available

### 3. Missing Plan Dates (Some NDIS patients)
- **Problem:** Plan dates might not be exported
- **FileMaker Status:** Unknown if field exists
- **Action Required:**
  - [ ] Check if FileMaker has plan date fields
  - [ ] Add to export script if available

### 4. Missing Appointment Data (1,496 appointments)
- **Problem:** 1,496 appointments missing clinician and type
- **FileMaker Status:** Unknown if appointment export is complete
- **Action Required:**
  - [ ] Check FileMaker appointments export
  - [ ] Ensure all appointments have: clinic, clinician, type

### 5. Patients Without Clinic (86 patients)
- **Problem:** 86 patients have no clinic assigned
- **Action Required:**
  - [ ] Review these patients in FileMaker
  - [ ] Assign clinic in FileMaker
  - [ ] Or: Flag for manual review after reimport

---

## 🔍 Data Validation Checks

### Before Reimport
- [ ] FileMaker patient count matches expected
- [ ] FileMaker appointment count matches expected
- [ ] All patients have clinic assigned
- [ ] All appointments have clinic/clinician/type
- [ ] Documents have NexusExportDate set
- [ ] Images have NexusExportDate set

### After Reimport
- [ ] Patient count matches FileMaker
- [ ] Appointment count matches FileMaker
- [ ] All patients have clinic assigned
- [ ] All appointments have clinic/clinician/type
- [ ] Documents are re-linked (count matches)
- [ ] Images are re-linked (count matches)
- [ ] Test: Open random patient → docs/images appear
- [ ] Test: Calendar shows all appointments
- [ ] Test: Search works correctly

---

## 📝 Settings Page UI Design

### Location
`/settings/data-management`

### UI Layout

```
Settings → Data Management
├── Current Data Status
│   ├── Patients: 2,842
│   ├── Appointments: 9,830
│   ├── Documents: X (linked)
│   └── Images: X (linked)
├── FileMaker Connection
│   ├── Status: Connected ✅ / Not Connected ❌
│   └── Last Sync: [timestamp]
├── Reimport Options
│   ├── [Dry Run Preview] - Show what will be deleted/imported
│   ├── [Full Reimport] - Delete & reimport everything
│   └── Warning: This will delete all patient/appointment data!
└── Logs
    └── Show reimport progress/errors
```

---

## 🛠️ Technical Implementation

### Database Tables to Clear
```python
# CASCADE deletes (automatic):
Patient.objects.all().delete()  # Will cascade to:
  ├── Appointments (via patient FK)
  ├── Notes (via patient FK)
  ├── Letters (via patient FK)
  ├── Reminders (via patient FK)
  └── (Other patient-related models)

# Preserve (DO NOT DELETE):
- Document records (re-link by filemaker_id)
- Image records (re-link by filemaker_id)
- ImageBatch records
- Clinic, Clinician, AppointmentType, FundingType
- Integration settings (Gmail, Xero, SMS, S3)
```

### Re-linking Logic
```python
# After reimport, re-link documents:
for doc in Document.objects.filter(filemaker_id__isnull=False):
    # Find patient by filemaker_id from metadata
    patient = Patient.objects.filter(
        filemaker_metadata__filemaker_id=doc.filemaker_id
    ).first()
    if patient:
        doc.patient = patient
        doc.save()

# Same for images
```

---

## ⚠️ Risks & Mitigation

### Risk 1: Data Loss
- **Mitigation:** Full database backup before reimport
- **Recovery Plan:** Restore from backup if needed

### Risk 2: Documents/Images Not Re-linked
- **Mitigation:** `filemaker_id` tracking ensures re-linking
- **Recovery Plan:** Re-run linking script

### Risk 3: FileMaker Data Incomplete
- **Mitigation:** Dry-run validation before actual import
- **Recovery Plan:** Fix FileMaker data, retry import

### Risk 4: Downtime During Import
- **Mitigation:** Import during off-hours
- **Recovery Plan:** Show maintenance page

---

## 📅 Recommended Timeline

1. **Week 1: Preparation**
   - Review FileMaker data completeness
   - Fix missing fields (funding, coordinator, plan dates)
   - Create settings page UI
   - Test dry-run on development

2. **Week 2: Testing**
   - Full reimport on development environment
   - Validate all data
   - Test re-linking of docs/images
   - Fix any issues

3. **Week 3: Production**
   - Schedule maintenance window
   - Backup production database
   - Execute reimport
   - Validate and test

---

## ✅ Sign-Off Checklist

Before executing production reimport:
- [ ] All FileMaker data verified complete
- [ ] Settings page tested on development
- [ ] Dry-run completed successfully
- [ ] Database backup created
- [ ] Maintenance window scheduled
- [ ] Rollback plan documented
- [ ] User notified of maintenance

---

## 📞 Support

If issues occur during reimport:
1. Check logs for error messages
2. Verify FileMaker connection
3. Check S3 file permissions
4. Review backup for rollback option

---

**Next Steps:**
1. Review this checklist
2. Check FileMaker for missing fields (funding, coordinator, appointments)
3. Create Settings → Data Management page
4. Test on development environment

