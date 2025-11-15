# FileMaker Import Sequence - Critical Order

**⚠️ CRITICAL: Import steps MUST be executed in this exact order due to database dependencies**

---

## 🎯 Why Order Matters

**Database Relationships (Foreign Keys):**
```
System Config (Independent)
    ├── Clinic (no dependencies)
    ├── Clinician (no dependencies)
    ├── AppointmentType (no dependencies)
    └── FundingType (no dependencies)
    
Patients (Depends on System Config)
    ├── FK → Clinic
    └── FK → FundingType
    
Appointments (Depends on Patients + System Config)
    ├── FK → Patient
    ├── FK → Clinic
    ├── FK → Clinician
    └── FK → AppointmentType
    
Documents (Depends on Patients)
    └── FK → Patient (via filemaker_id)
    
Images (Depends on Patients)
    └── FK → Patient (via filemaker_id + ImageBatch)
```

---

## 📋 Import Sequence (Step-by-Step)

### PHASE 0: Pre-Import Validation
**⚠️ DO NOT PROCEED if any validation fails**

1. **Backup Current Database**
   - Export all tables to CSV
   - Document current counts
   - Store backup in safe location

2. **Verify FileMaker Connection**
   - Test FileMaker Data API connectivity
   - Verify credentials are valid
   - Check API permissions

3. **Validate FileMaker Data Completeness**
   - [ ] All patients have `clinic_name` (required FK)
   - [ ] All patients have `funding_type` (required FK, if available)
   - [ ] All appointments have `clinic_name` (required FK)
   - [ ] All appointments have `clinician_name` (required FK)
   - [ ] All appointments have `appointment_type` (required FK)
   - [ ] All appointments have `patient_id` (required FK)
   - [ ] All documents have `NexusExportDate` (prevents re-upload)
   - [ ] All images have `NexusExportDate` (prevents re-upload)

4. **System Config Validation**
   - [ ] All FileMaker clinic names exist in Nexus `Clinic` table
   - [ ] All FileMaker clinician names exist in Nexus `Clinician` table
   - [ ] All FileMaker funding types exist in Nexus `FundingType` table
   - [ ] All FileMaker appointment types exist in Nexus `AppointmentType` table

**❌ STOP HERE if any validation fails. Fix FileMaker data first.**

---

### PHASE 1: System Configuration (PRESERVE - Do NOT Delete or Reimport)

**These tables are NEVER deleted or reimported:**

1. ✅ **Clinics** - Keep existing records with colors
   - Already configured in Nexus
   - Contains clinic colors (not in FileMaker)
   - Critical for patient and appointment FK

2. ✅ **Clinicians** - Keep existing records
   - Already configured in Nexus
   - Critical for appointment FK

3. ✅ **Appointment Types** - Keep existing records
   - Already configured in Nexus
   - Critical for appointment FK

4. ✅ **Funding Types** - Keep existing records
   - Already configured in Nexus
   - Critical for patient FK

5. ✅ **Integration Settings** - Keep all
   - Gmail Integration
   - Xero Integration
   - SMS Integration
   - S3 Integration

**Action:** No action required. These are preserved.

---

### PHASE 2: Delete Existing Patient Data

**⚠️ DESTRUCTIVE OPERATION - Creates space for clean reimport**

```python
# Django CASCADE deletes (automatic):
Patient.objects.all().delete()
```

**This will automatically CASCADE DELETE:**
- ✅ All appointments (via patient FK)
- ✅ All notes (via patient FK)
- ✅ All letters (via patient FK)
- ✅ All reminders (via patient FK)
- ✅ All SMS messages (via patient FK)
- ✅ All audit logs (via patient FK)

**This will PRESERVE (NOT deleted):**
- ✅ Document records (orphaned temporarily, re-linked in Phase 6)
- ✅ Image records (orphaned temporarily, re-linked in Phase 7)
- ✅ ImageBatch records
- ✅ S3 files (documents and images)
- ✅ All System Config (Phase 1)

**Database State After Phase 2:**
- Patients: 0
- Appointments: 0
- Notes: 0
- Documents: 10,190 (orphaned, patient_id points to deleted patients)
- Images: 6,574 (orphaned, linked via ImageBatch which has patient_id pointing to deleted patients)
- ImageBatches: X (orphaned, patient_id points to deleted patients)

---

### PHASE 3: Import Patients

**Dependencies:**
- ✅ Clinic table (from Phase 1)
- ✅ FundingType table (from Phase 1)

**Import Order:**
1. Fetch all patients from FileMaker API
2. For each patient:
   - Map FileMaker fields to Nexus fields
   - Look up `Clinic` by name (FK)
   - Look up `FundingType` by name (FK, if available)
   - Store FileMaker UUID in `filemaker_metadata.filemaker_id`
   - Create new Patient record in Nexus

**Critical Mappings:**
```python
# FileMaker → Nexus
filemaker_patient = {
    'id': 'UUID',  # Store in filemaker_metadata
    'clinic_name': 'Newcastle',  # Must match Clinic.name
    'funding_type': 'NDIS',  # Must match FundingType.name
    # ... other fields
}

nexus_patient = Patient.objects.create(
    clinic=Clinic.objects.get(name=filemaker_patient['clinic_name']),
    funding_type=FundingType.objects.get(name=filemaker_patient['funding_type']),
    filemaker_metadata={'filemaker_id': filemaker_patient['id'], ...},
    # ... other fields
)
```

**Validation After Phase 3:**
- [ ] Patient count matches FileMaker count
- [ ] All patients have clinic assigned (no NULL)
- [ ] All patients have filemaker_metadata with filemaker_id
- [ ] No duplicate patients (check by filemaker_id)

**Database State After Phase 3:**
- Patients: 2,842 (newly imported)
- Appointments: 0 (still empty, imported in Phase 4)
- Documents: 10,190 (still orphaned, re-linked in Phase 6)
- Images: 6,574 (still orphaned, re-linked in Phase 7)

---

### PHASE 4: Import Appointments

**Dependencies:**
- ✅ Patient table (from Phase 3)
- ✅ Clinic table (from Phase 1)
- ✅ Clinician table (from Phase 1)
- ✅ AppointmentType table (from Phase 1)

**Import Order:**
1. Fetch all appointments from FileMaker API
2. For each appointment:
   - Look up Patient by FileMaker patient_id (via filemaker_metadata)
   - Look up Clinic by name (FK)
   - Look up Clinician by name (FK)
   - Look up AppointmentType by name (FK)
   - Create new Appointment record in Nexus

**Critical Mappings:**
```python
# FileMaker → Nexus
filemaker_appointment = {
    'id': 'UUID',
    'patient_id': 'patient-uuid',  # FileMaker patient UUID
    'clinic_name': 'Newcastle',
    'clinician_name': 'Dr. Smith',
    'appointment_type': 'Initial Assessment',
    # ... other fields
}

# Find patient by filemaker_id
patient = Patient.objects.filter(
    filemaker_metadata__filemaker_id=filemaker_appointment['patient_id']
).first()

nexus_appointment = Appointment.objects.create(
    patient=patient,
    clinic=Clinic.objects.get(name=filemaker_appointment['clinic_name']),
    clinician=Clinician.objects.get(name=filemaker_appointment['clinician_name']),
    appointment_type=AppointmentType.objects.get(name=filemaker_appointment['appointment_type']),
    # ... other fields
)
```

**Validation After Phase 4:**
- [ ] Appointment count matches FileMaker count
- [ ] All appointments have patient assigned (no NULL)
- [ ] All appointments have clinic assigned (no NULL)
- [ ] All appointments have clinician assigned (no NULL)
- [ ] All appointments have appointment_type assigned (no NULL)
- [ ] No duplicate appointments

**Database State After Phase 4:**
- Patients: 2,842
- Appointments: 9,830 (newly imported)
- Documents: 10,190 (still orphaned, re-linked in Phase 6)
- Images: 6,574 (still orphaned, re-linked in Phase 7)

---

### PHASE 5: Import Notes, Letters, Reminders (If Applicable)

**Dependencies:**
- ✅ Patient table (from Phase 3)
- ✅ Appointment table (from Phase 4, if note is linked to appointment)

**Import Order:**
1. Fetch notes/letters/reminders from FileMaker API
2. For each record:
   - Look up Patient by FileMaker patient_id
   - Look up Appointment by FileMaker appointment_id (if applicable)
   - Create new record in Nexus

**Note:** If FileMaker doesn't have these, skip this phase.

**Database State After Phase 5:**
- Patients: 2,842
- Appointments: 9,830
- Notes: X (if imported)
- Letters: X (if imported)
- Documents: 10,190 (still orphaned, re-linked in Phase 6)
- Images: 6,574 (still orphaned, re-linked in Phase 7)

---

### PHASE 6: Re-Link Documents

**Dependencies:**
- ✅ Patient table (from Phase 3)
- ✅ Document records (already exist, orphaned)

**Re-linking Logic:**
```python
# For each document, find the new patient by filemaker_id
for doc in Document.objects.filter(filemaker_id__isnull=False):
    # Get filemaker patient_id from document's metadata
    filemaker_patient_id = doc.filemaker_metadata.get('filemaker_patient_id')
    
    if filemaker_patient_id:
        # Find the newly imported patient
        patient = Patient.objects.filter(
            filemaker_metadata__filemaker_id=filemaker_patient_id
        ).first()
        
        if patient:
            doc.patient = patient
            doc.save(update_fields=['patient'])
        else:
            # Log warning: Patient not found for document
            print(f"Warning: Patient not found for document {doc.id}")
```

**Validation After Phase 6:**
- [ ] All documents have patient assigned (no NULL or orphaned)
- [ ] Document count matches before reimport
- [ ] Random spot-check: Open patient → see documents
- [ ] Documents appear in correct patient records

**Database State After Phase 6:**
- Patients: 2,842
- Appointments: 9,830
- Documents: 10,190 (re-linked to new patients)
- Images: 6,574 (still orphaned, re-linked in Phase 7)

---

### PHASE 7: Re-Link Images (via ImageBatch)

**Dependencies:**
- ✅ Patient table (from Phase 3)
- ✅ Image records (already exist, orphaned)
- ✅ ImageBatch records (already exist, orphaned)

**Re-linking Logic:**
```python
# Step 1: Re-link ImageBatches to patients
for batch in ImageBatch.objects.all():
    # Get filemaker patient_id from batch metadata
    filemaker_patient_id = batch.metadata.get('filemaker_patient_id')
    
    if filemaker_patient_id:
        # Find the newly imported patient
        patient = Patient.objects.filter(
            filemaker_metadata__filemaker_id=filemaker_patient_id
        ).first()
        
        if patient:
            batch.patient = patient
            batch.save(update_fields=['patient'])

# Step 2: Images are already linked via ImageBatch (generic FK)
# They will automatically be accessible via the re-linked ImageBatch
```

**Validation After Phase 7:**
- [ ] All ImageBatches have patient assigned (no NULL or orphaned)
- [ ] Image count matches before reimport
- [ ] Random spot-check: Open patient → see images
- [ ] Images appear in correct patient records

**Database State After Phase 7:**
- Patients: 2,842
- Appointments: 9,830
- Documents: 10,190 (re-linked)
- Images: 6,574 (re-linked via ImageBatch)
- ImageBatches: X (re-linked)

---

### PHASE 8: Post-Import Validation

**Critical Checks:**

1. **Data Counts**
   - [ ] Patient count: Nexus = FileMaker
   - [ ] Appointment count: Nexus = FileMaker
   - [ ] Document count: Same as before reimport
   - [ ] Image count: Same as before reimport

2. **Relationships**
   - [ ] All patients have clinic (no NULL)
   - [ ] All appointments have patient, clinic, clinician, type (no NULL)
   - [ ] All documents have patient (no NULL)
   - [ ] All ImageBatches have patient (no NULL)

3. **FileMaker Metadata**
   - [ ] All patients have filemaker_metadata.filemaker_id
   - [ ] All documents have filemaker_id or filemaker_metadata
   - [ ] All images have filemaker_id (via batch)

4. **Functional Tests**
   - [ ] Open random patient → see correct info
   - [ ] Open random patient → see documents
   - [ ] Open random patient → see images
   - [ ] Open calendar → see appointments
   - [ ] Search for patient → find correctly
   - [ ] Filter patients by clinic → works
   - [ ] Filter patients by funding → works

5. **S3 Files**
   - [ ] Documents download correctly
   - [ ] Images display correctly
   - [ ] No 404 errors for S3 files

---

## 🚨 Error Handling & Rollback

### If Error Occurs During Import

**Phase 3 (Patient Import) Fails:**
- Rollback: Delete all newly imported patients
- Fix: Review FileMaker data, fix issue
- Retry: Start from Phase 3

**Phase 4 (Appointment Import) Fails:**
- Rollback: Delete all newly imported appointments
- Fix: Review FileMaker appointment data
- Retry: Start from Phase 4 (patients already imported)

**Phase 6 (Document Re-linking) Fails:**
- Rollback: Not needed (documents still exist)
- Fix: Adjust re-linking script
- Retry: Re-run Phase 6 only

**Phase 7 (Image Re-linking) Fails:**
- Rollback: Not needed (images still exist)
- Fix: Adjust re-linking script
- Retry: Re-run Phase 7 only

**Complete Failure / Abort:**
- Restore entire database from backup (Phase 0)
- Review errors
- Fix issues
- Retry entire sequence

---

## 📝 Import Progress Logging

**Log each step with:**
- Timestamp
- Phase number
- Records processed
- Errors encountered
- Time elapsed

**Example Log:**
```
[2025-11-14 10:00:00] Phase 0: Starting validation...
[2025-11-14 10:00:05] Phase 0: ✅ FileMaker connection successful
[2025-11-14 10:00:10] Phase 0: ✅ All clinics validated
[2025-11-14 10:00:15] Phase 0: ✅ Validation complete
[2025-11-14 10:00:20] Phase 2: Deleting existing patients...
[2025-11-14 10:00:25] Phase 2: ✅ Deleted 2,842 patients
[2025-11-14 10:00:30] Phase 3: Importing patients from FileMaker...
[2025-11-14 10:05:00] Phase 3: ✅ Imported 2,842 patients (5 minutes)
[2025-11-14 10:05:05] Phase 4: Importing appointments from FileMaker...
[2025-11-14 10:15:00] Phase 4: ✅ Imported 9,830 appointments (10 minutes)
[2025-11-14 10:15:05] Phase 6: Re-linking documents...
[2025-11-14 10:20:00] Phase 6: ✅ Re-linked 10,190 documents (5 minutes)
[2025-11-14 10:20:05] Phase 7: Re-linking images...
[2025-11-14 10:25:00] Phase 7: ✅ Re-linked 6,574 images (5 minutes)
[2025-11-14 10:25:05] Phase 8: Running validation...
[2025-11-14 10:30:00] Phase 8: ✅ All validation checks passed
[2025-11-14 10:30:05] ✅ Import complete! Total time: 30 minutes
```

---

## ⏱️ Estimated Time (2,842 patients, 9,830 appointments)

- **Phase 0:** 2-5 minutes (validation)
- **Phase 2:** 1 minute (delete)
- **Phase 3:** 5-10 minutes (patient import)
- **Phase 4:** 10-15 minutes (appointment import)
- **Phase 5:** 5 minutes (notes/letters, if applicable)
- **Phase 6:** 5-10 minutes (document re-linking)
- **Phase 7:** 5-10 minutes (image re-linking)
- **Phase 8:** 5 minutes (validation)

**Total Estimated Time:** 30-60 minutes

---

## 🔐 Access Control

**Who can run this:**
- Only admin users (`IsAdminUser` permission)
- Log all import attempts with user ID
- Send email notification before/after import

---

## 📞 Emergency Contacts

**If import fails:**
1. Check logs immediately
2. Do NOT retry without reviewing errors
3. Contact technical support if needed
4. Restore from backup if data is corrupted

---

**Next Steps:**
1. Review this import sequence
2. Validate FileMaker data completeness (Phase 0)
3. Create import script following this exact sequence
4. Test on development environment first
5. Schedule production import during off-hours


