# S3 Bucket Folder Structure

**Bucket:** `walkeasy-nexus-documents`  
**Region:** `ap-southeast-2` (Sydney, Australia)

---

## Current State (Before Cleanup)

**Total:** 215 files, 328.82 MB

**Folders:**
- `/` (root) - 11 files, 11.47 MB (orphaned, should be in folders)
- `documents/` - 81 files, 156.45 MB (mixed content)
- `images/` - 117 files, 160.50 MB (patient images with UUID paths)
- `mms/outbound/` - 6 files, 0.40 MB (SMS MMS attachments)

**Issues with Current Structure:**
- ❌ Files in root (no organization)
- ❌ Mixed content in `documents/` folder
- ❌ No clear separation between user uploads and system files
- ❌ No separation by patient/entity type
- ❌ Difficult to apply retention policies
- ❌ Hard to troubleshoot or clean up

---

## Proposed Folder Structure

### Design Principles
1. **Clear separation** - User uploads vs imported data vs system files
2. **Entity-based** - Organized by what the file relates to (patient, referrer, etc.)
3. **Type-based** - Separate documents, images, MMS, etc.
4. **Scalable** - Easy to add new categories
5. **Maintainable** - Easy to apply retention policies and cleanup

### Folder Hierarchy

```
walkeasy-nexus-documents/
│
├── patients/                              # Patient-related files
│   ├── documents/                         # Patient documents (reports, letters)
│   │   ├── {patient_id}/                  # One folder per patient
│   │   │   ├── {uuid}.pdf                 # User uploaded docs
│   │   │   ├── {uuid}.docx
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── images/                            # Patient clinical images
│   │   ├── {patient_id}/                  # One folder per patient
│   │   │   ├── {batch_id}/                # Organized by batch/session
│   │   │   │   ├── {uuid}.jpg
│   │   │   │   ├── {uuid}.png
│   │   │   │   └── ...
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── at-reports/                        # Generated AT Reports (PDFs)
│   │   ├── {patient_id}/
│   │   │   ├── {uuid}_AT_Report_2024-11-09.pdf
│   │   │   └── ...
│   │   └── ...
│   │
│   └── filemaker-import/                  # Imported from FileMaker
│       ├── documents/                     # From API_Docs (11,269)
│       │   ├── referrals/
│       │   │   ├── {patient_id}/
│       │   │   │   ├── {filemaker_id}.pdf
│       │   │   │   └── ...
│       │   │   └── ...
│       │   ├── reports/
│       │   ├── letters/
│       │   └── other/
│       │
│       └── images/                        # From API_Images (6,664)
│           ├── clinical-photos/
│           │   ├── {patient_id}/
│           │   │   ├── left-dorsal/
│           │   │   │   ├── {filemaker_id}.jpg
│           │   │   │   └── ...
│           │   │   ├── right-plantar/
│           │   │   └── ...
│           │   └── ...
│           └── scanned-documents/
│
├── referrers/                             # Referrer documents
│   ├── documents/
│   │   ├── {referrer_id}/
│   │   │   └── {uuid}.pdf
│   │   └── ...
│   └── images/
│       └── {referrer_id}/
│           └── {uuid}.jpg
│
├── companies/                             # Company/practice documents
│   └── documents/
│       ├── {company_id}/
│       │   └── {uuid}.pdf
│       └── ...
│
├── sms/                                   # SMS/MMS attachments
│   ├── inbound/                           # MMS from patients
│   │   ├── {patient_id}/                  # Organized by patient
│   │   │   ├── {message_id}.jpg
│   │   │   ├── {message_id}.png
│   │   │   └── ...
│   │   └── ...
│   │
│   └── outbound/                          # MMS sent to patients
│       ├── {patient_id}/
│       │   ├── {message_id}.jpg
│       │   └── ...
│       └── ...
│
├── system/                                # System-generated files
│   ├── backups/                           # Database/system backups
│   ├── exports/                           # Data exports (CSV, etc.)
│   └── temp/                              # Temporary files (auto-delete after 7 days)
│
└── archive/                               # Archived/old files
    ├── patients/
    ├── referrers/
    └── sms/
```

---

## Path Examples

### Patient Document (User Upload)
```
patients/documents/{patient_id}/{uuid}.pdf
patients/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/9f8e7d6c-5b4a-3210-fedc-ba0987654321.pdf
```

### Patient Clinical Image (Batch)
```
patients/images/{patient_id}/{batch_id}/{uuid}.jpg
patients/images/a1b2c3d4-e5f6-7890-abcd-ef1234567890/2024-11-09_clinic_visit/left-foot.jpg
```

### FileMaker Imported Document
```
patients/filemaker-import/documents/referrals/{patient_id}/{filemaker_id}.pdf
patients/filemaker-import/documents/referrals/a1b2c3d4-e5f6-7890-abcd-ef1234567890/F8E7D6C5-B4A3-2109-8765-4321FEDC.pdf
```

### MMS Inbound (From Patient)
```
sms/inbound/{patient_id}/{message_id}.jpg
sms/inbound/a1b2c3d4-e5f6-7890-abcd-ef1234567890/msg-12345.jpg
```

### AT Report
```
patients/at-reports/{patient_id}/{uuid}_AT_Report_{date}.pdf
patients/at-reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890/report-2024-11-09.pdf
```

---

## Benefits of This Structure

### 1. Clear Organization
- ✅ Everything is categorized by entity type (patient, referrer, company)
- ✅ Easy to find files related to specific entities
- ✅ Clear separation between user uploads and imports

### 2. Patient-Centric
- ✅ All patient files in `patients/` folder
- ✅ Each patient has their own subfolder
- ✅ Easy to export/archive all files for a patient
- ✅ Easy to delete patient data (GDPR compliance)

### 3. FileMaker Import Isolation
- ✅ Imported files in separate `filemaker-import/` subfolder
- ✅ Won't mix with ongoing uploads
- ✅ Can re-import without affecting current data
- ✅ Easy to track migration progress

### 4. Scalability
- ✅ Can add new entity types easily (coordinators, clinics, etc.)
- ✅ Can add new document types under each entity
- ✅ Supports multi-tenant in future (add clinic prefix)

### 5. Retention & Cleanup
- ✅ Can apply retention policies per folder
- ✅ `archive/` folder for old data
- ✅ `system/temp/` auto-deletes after 7 days
- ✅ Easy to identify orphaned files

### 6. Performance
- ✅ Files organized by entity prevents large flat folders
- ✅ S3 listing operations are faster with good structure
- ✅ Can use S3 lifecycle policies per prefix

---

## Migration Plan

### Phase 1: Empty Current Bucket ✋
1. Backup current contents (download to local)
2. Review what needs to be kept
3. Empty bucket (DELETE ALL)

### Phase 2: Update Code 🔧
1. Update `S3Service` to use new folder structure
2. Update document upload views
3. Update image upload views
4. Update MMS handling
5. Update AT report generation

### Phase 3: Re-upload Current Data 📤
1. Re-upload using new structure
2. Update database records with new S3 keys
3. Verify all files accessible

### Phase 4: FileMaker Import 📥
1. Import metadata (see all files pending)
2. Download from FileMaker
3. Upload to new structure
4. Update database records

---

## Implementation: S3Service Updates

### Current Path Generation
```python
# OLD (flat structure)
s3_key = f"documents/{uuid}.{ext}"
s3_key = f"images/{uuid}.{ext}"
```

### New Path Generation
```python
# NEW (organized structure)
def generate_patient_document_key(patient_id, filename):
    """Generate S3 key for patient document"""
    ext = os.path.splitext(filename)[1]
    uuid = str(uuid.uuid4())
    return f"patients/documents/{patient_id}/{uuid}{ext}"

def generate_patient_image_key(patient_id, batch_id, filename):
    """Generate S3 key for patient image"""
    ext = os.path.splitext(filename)[1]
    uuid = str(uuid.uuid4())
    return f"patients/images/{patient_id}/{batch_id}/{uuid}{ext}"

def generate_filemaker_document_key(patient_id, doc_type, filemaker_id, filename):
    """Generate S3 key for FileMaker imported document"""
    ext = os.path.splitext(filename)[1]
    # Map document type to folder
    type_folders = {
        'Referral': 'referrals',
        'Report': 'reports',
        'Letter': 'letters',
    }
    folder = type_folders.get(doc_type, 'other')
    return f"patients/filemaker-import/documents/{folder}/{patient_id}/{filemaker_id}{ext}"

def generate_mms_key(patient_id, message_id, filename, direction='inbound'):
    """Generate S3 key for MMS attachment"""
    ext = os.path.splitext(filename)[1]
    return f"sms/{direction}/{patient_id}/{message_id}{ext}"
```

---

## S3 Lifecycle Policies (Future)

Once structure is in place, can add lifecycle policies:

```json
{
  "Rules": [
    {
      "Id": "Archive old patient documents",
      "Prefix": "patients/documents/",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        }
      ]
    },
    {
      "Id": "Delete temp files",
      "Prefix": "system/temp/",
      "Status": "Enabled",
      "Expiration": {
        "Days": 7
      }
    }
  ]
}
```

---

---

## Access Patterns & Use Cases

### 1. Patient Document Upload (User)
**Flow:** User uploads document for patient  
**Path:** `patients/documents/{patient_id}/{uuid}.pdf`  
**Who:** Clinician, Admin  
**Frequency:** Daily

### 2. Patient Image Batch Upload
**Flow:** Clinician takes multiple photos during visit  
**Path:** `patients/images/{patient_id}/{batch_id}/{uuid}.jpg`  
**Who:** Clinician  
**Frequency:** Per appointment  
**Batch ID:** Date-based or UUID (e.g., `2024-11-09_clinic_visit`)

### 3. AT Report Generation
**Flow:** System generates PDF report for patient  
**Path:** `patients/at-reports/{patient_id}/{uuid}_AT_Report_{date}.pdf`  
**Who:** System (automated)  
**Frequency:** Per assessment

### 4. MMS Inbound (Patient sends image)
**Flow:** Patient sends photo via SMS  
**Path:** `sms/inbound/{patient_id}/{message_id}.jpg`  
**Who:** Patient  
**Frequency:** Ad-hoc

### 5. MMS Outbound (Send image to patient)
**Flow:** Clinician sends image via SMS  
**Path:** `sms/outbound/{patient_id}/{message_id}.jpg`  
**Who:** Clinician  
**Frequency:** Rare

### 6. FileMaker Document Import
**Flow:** Migration script imports historical documents  
**Path:** `patients/filemaker-import/documents/{type}/{patient_id}/{filemaker_id}.pdf`  
**Who:** System (one-time migration)  
**Frequency:** Once

### 7. FileMaker Image Import
**Flow:** Migration script imports historical clinical photos  
**Path:** `patients/filemaker-import/images/{type}/{patient_id}/{filemaker_id}.jpg`  
**Who:** System (one-time migration)  
**Frequency:** Once

---

## Database Schema Integration

### Document Model Updates Needed

**Current `Document` model:**
```python
class Document(models.Model):
    # Generic FK (can link to any entity)
    content_type = ForeignKey(ContentType)
    object_id = UUIDField()
    
    # S3 fields
    s3_key = CharField(max_length=500)  # Full S3 path
    original_filename = CharField(max_length=255)
    file_type = CharField(max_length=100)
    file_size = BigIntegerField()
```

**What the s3_key will contain:**
```python
# Old (flat):
s3_key = "documents/abc123.pdf"

# New (organized):
s3_key = "patients/documents/patient-uuid/abc123.pdf"
s3_key = "patients/images/patient-uuid/batch-uuid/abc123.jpg"
s3_key = "patients/filemaker-import/documents/referrals/patient-uuid/filemaker-id.pdf"
```

**No schema changes needed!** Just update the path generation logic.

---

## Storage Size Estimates

### Current State
- **User-uploaded documents:** ~156 MB (81 files in `documents/`)
- **User-uploaded images:** ~160 MB (117 files in `images/`)
- **MMS attachments:** ~0.4 MB (6 files in `mms/`)
- **Orphaned files:** ~11 MB (11 files in root)
- **Total:** ~328 MB

### FileMaker Import Projections
- **Documents (API_Docs):** 11,269 files
  - Average size estimate: 500 KB per document
  - Estimated total: ~5.6 GB
- **Images (API_Images):** 6,664 files
  - Average size estimate: 1.5 MB per image
  - Estimated total: ~10 GB
- **FileMaker Total:** ~15.6 GB

### Total S3 Storage Projection
- Current: 0.3 GB
- After FileMaker import: ~16 GB
- With growth (1 year): ~25 GB
- **AWS Cost Estimate:** ~$0.58/month for 25 GB in ap-southeast-2

---

## Retention & Lifecycle Policies

### Policy Recommendations

**1. Patient Documents**
- Retain: 7 years (regulatory requirement)
- After 7 years: Move to Glacier (cheaper storage)
- Never auto-delete (legal/compliance)

**2. Patient Images**
- Retain: 7 years
- After 7 years: Move to Glacier
- Clinical photos may be needed for comparison

**3. AT Reports**
- Retain: 7 years (regulatory)
- After 7 years: Move to Glacier
- Can be regenerated from database if needed

**4. MMS Attachments**
- Retain: 2 years (communication records)
- After 2 years: Move to Glacier or delete
- Less critical than clinical documents

**5. FileMaker Imports**
- Retain: Permanently (historical records)
- Can move to Glacier after 1 year (rarely accessed)
- Important for audit trail

**6. System Temp Files**
- Retain: 7 days only
- Auto-delete after 7 days
- No archival needed

---

## Security & Access Control

### S3 Bucket Policies (Future Enhancement)

**Current:** Single IAM user with full bucket access

**Recommended:**
1. **Principle of Least Privilege**
   - Backend API: Read/Write to specific prefixes
   - Backup system: Read-only access
   - Migration scripts: Write to `filemaker-import/` only

2. **Bucket Policy Example:**
```json
{
  "Statement": [
    {
      "Sid": "BackendAPIAccess",
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::xxx:user/backend-api"},
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::walkeasy-nexus-documents/patients/*",
        "arn:aws:s3:::walkeasy-nexus-documents/referrers/*",
        "arn:aws:s3:::walkeasy-nexus-documents/sms/*"
      ]
    },
    {
      "Sid": "FileMakerImportAccess",
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::xxx:user/filemaker-import"},
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::walkeasy-nexus-documents/patients/filemaker-import/*"
    }
  ]
}
```

3. **Presigned URL Expiration**
   - Current: 1 hour (3600 seconds)
   - Consider: 15 minutes for sensitive documents
   - Consider: 24 hours for AT reports (email links)

---

## Migration Strategy: Current Files

### Current Bucket Contents (215 files)

**Root folder (11 files - 11.47 MB):**
- Orphaned files with no folder
- **Action:** Determine what they are, then organize or delete

**documents/ (81 files - 156.45 MB):**
- Mixed patient documents
- **Action:** Re-upload to `patients/documents/{patient_id}/`
- **Challenge:** Determine which patient each document belongs to (check database)

**images/ (117 files - 160.50 MB):**
- Patient images organized by UUID paths
- **Action:** Re-upload to `patients/images/{patient_id}/{batch_id}/`
- **Challenge:** Parse existing UUID structure to extract patient and batch IDs

**mms/outbound/ (6 files - 0.40 MB):**
- MMS sent to patients
- **Action:** Re-upload to `sms/outbound/{patient_id}/{message_id}.jpg`
- **Challenge:** Link message IDs to patient IDs (query SMS database)

### Migration Options

**Option A: Clean Slate (Recommended)**
1. Document what's currently in bucket
2. Empty bucket completely
3. Start fresh with new structure
4. Re-upload files as needed (if important)
5. **Pros:** Clean, organized from day 1
6. **Cons:** Lose current files (if not backed up)

**Option B: Migrate Existing Files**
1. Download all 215 files locally
2. Query database for each file's metadata
3. Determine correct patient/entity ID
4. Re-upload with new structure
5. Update database s3_key fields
6. Delete old files
7. **Pros:** Keep all existing files
8. **Cons:** Time-consuming, complex mapping needed

**Option C: Hybrid**
1. Empty bucket (clean slate)
2. Don't migrate old files
3. Focus on FileMaker import (11,269 + 6,664 = 17,933 files)
4. **Pros:** Clean start, focus on important migration
5. **Cons:** Lose 215 current files (but they may be test data)

---

## Code Changes Required (Summary)

**Files to Update:**
1. `backend/documents/services.py` - S3Service path generation
2. `backend/documents/views.py` - Document upload/download
3. `backend/images/views.py` (if exists) - Image batch uploads
4. `backend/sms_integration/views.py` - MMS handling
5. `backend/ai_services/pdf_generator.py` - AT report storage

**Key Changes:**
- Replace `folder='documents'` with entity-specific paths
- Add patient_id parameter to path generation
- Add batch_id for image uploads
- Update all `upload_file()` calls throughout codebase

**Testing Required:**
- Document upload (per patient)
- Image batch upload (per patient)
- AT report generation
- MMS inbound/outbound
- File download (presigned URLs)
- File deletion

---

## Questions to Answer

### Business Questions
1. **Current files:** Keep or discard the 215 existing files?
2. **Batch IDs:** How should we name image batches? (date? appointment_id? UUID?)
3. **Retention:** Confirm 7-year retention for clinical documents?
4. **Access:** Who needs access to referrer/company documents?

### Technical Questions
1. **Migration timing:** Empty bucket now or after code updates?
2. **Database updates:** Update existing Document records or leave as-is?
3. **Testing:** Test in production bucket or create separate test bucket?
4. **Rollback:** How to rollback if new structure causes issues?

---

## Next Steps (Documentation Phase)

1. ✅ Document current bucket state
2. ✅ Design folder structure
3. ✅ Document benefits and use cases
4. ⏸️ Review with Craig - approve structure
5. ⏸️ Answer open questions
6. ⏸️ Decide on migration option (A, B, or C)
7. ⏸️ Create code update checklist
8. ⏸️ Plan testing approach

---

**Status:** 📋 Documentation complete, awaiting review and approval

**Created:** November 9, 2025  
**Branch:** `filemaker-import-docs`  
**Next:** Review folder structure and answer questions above

