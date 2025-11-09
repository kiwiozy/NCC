# FileMaker Documents & Images Migration to S3

**Date:** November 9, 2025  
**Status:** 📋 Planning Phase  
**Branch:** `filemaker-import-docs`

---

## 📊 Overview

**Goal:** Migrate 17,933 documents and images from FileMaker container fields to AWS S3 storage.

**Scope:**
- **11,269 documents** from `API_Docs` table
- **6,664 images** from `API_Images` table
- Link to existing patients in Nexus
- Preserve all metadata (dates, types, filenames)

---

## 🎯 Current Status

### What's Already Complete ✅
- ✅ 55,758 core records imported (patients, clinics, referrers, appointments, notes)
- ✅ S3 integration working in production
- ✅ Document upload/download system operational
- ✅ Frontend dialogs for documents and images
- ✅ FileMaker OData API access to metadata

### What's Remaining ⏸️
- ⏸️ Document/image metadata import
- ⏸️ Actual file migration from FileMaker to S3
- ⏸️ FileMaker Data API setup for container fields
- ⏸️ Batch processing script for 17,933 files

---

## 🔍 Understanding the Challenge

### The Container Field Problem

**FileMaker Container Fields:**
- Store binary data (PDFs, images, etc.)
- **Cannot be accessed via OData** (only metadata visible)
- Require **FileMaker Data API** (REST) for file download

**What OData Gives Us:**
```json
{
  "id": "ABC-123",
  "Name of file": "Referral_Letter.pdf",
  "Type": "Referral",
  "date": "2024-05-15",
  "id_Contact": "patient-uuid"
  // ❌ No actual file data!
}
```

**What We Need:**
- File bytes/binary data
- Requires Data API endpoint: `/layouts/{layout}/records/{recordId}/containers/{fieldName}`

---

## 🗂️ FileMaker Table Analysis

### API_Docs (11,269 records)

**Purpose:** Document metadata (referrals, reports, letters, etc.)

**Key Fields:**
- `id` - Primary key (UUID)
- `id_Contact` - Patient FK (UUID)
- `id_Order` - Order/invoice FK (UUID) - optional
- `Type` - Document type (e.g., "Referral", "Report")
- `Date` - Document date
- `imported` - Import flag (1 = already migrated elsewhere?)
- `num` - Document number
- `Container_Field_Name` - TBD (need to discover actual field name)

**Sample Record:**
```json
{
  "id": "F8E7D6C5-...",
  "id_Contact": "A1B2C3D4-...",
  "Type": "Referral",
  "Date": "2024-05-15",
  "imported": 0,
  "num": "REF-2024-001"
}
```

**Questions:**
1. What is the exact container field name? (e.g., `Document`, `File`, `Container`)
2. Are all documents stored in FileMaker, or some external?
3. What file types are present? (PDF, DOC, etc.)
4. What does `imported = 1` mean? (already migrated? skip these?)

---

### API_Images (6,664 records)

**Purpose:** Image metadata (clinical photos, scanned documents)

**Key Fields:**
- `id` - Primary key (UUID)
- `ID.KEY` - Parent record key (UUID) - relationship unclear
- `id_Contact` - Patient FK (UUID)
- `recid` - Record ID (integer)
- `Name of file` - Filename (e.g., "Left-Dorsal.jpg")
- `Type` - Image type (e.g., "Left Dorsal", "Right Plantar")
- `date` - Image date
- `result` - Processing result (e.g., "Not found")
- `Container_Field_Name` - TBD (need to discover)

**Sample Record:**
```json
{
  "id": "A1B2C3D4-...",
  "id_Contact": "E5F6G7H8-...",
  "Name of file": "Left-Dorsal.jpg",
  "Type": "Left Dorsal",
  "date": "2024-06-20",
  "result": ""
}
```

**Questions:**
1. What is the exact container field name?
2. What does `result = "Not found"` mean? (file missing? skip these?)
3. What does `ID.KEY` link to? (needed for import?)
4. What image formats are present? (JPG, PNG, etc.)

---

## 🏗️ Nexus Database Structure

### Current Document Model

**Location:** `backend/documents/models.py`

```python
class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    # Generic Foreign Key (can link to any model)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # S3 Storage
    s3_key = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField()
    
    # Metadata
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.CharField(max_length=100, null=True)
```

### Required Schema Changes

**Add FileMaker tracking fields:**

```python
class Document(models.Model):
    # ... existing fields ...
    
    # FileMaker Import Tracking (NEW)
    filemaker_id = models.UUIDField(
        null=True,
        blank=True,
        unique=True,
        help_text="Original FileMaker document/image ID"
    )
    
    filemaker_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=[
            ('document', 'Document (API_Docs)'),
            ('image', 'Image (API_Images)'),
        ],
        help_text="Source table in FileMaker"
    )
    
    filemaker_date = models.DateField(
        null=True,
        blank=True,
        help_text="Original document/image date from FileMaker"
    )
    
    import_status = models.CharField(
        max_length=20,
        default='pending',
        choices=[
            ('pending', 'Pending'),
            ('downloading', 'Downloading from FileMaker'),
            ('uploading', 'Uploading to S3'),
            ('complete', 'Complete'),
            ('failed', 'Failed'),
            ('skipped', 'Skipped'),
        ]
    )
    
    import_error = models.TextField(
        null=True,
        blank=True,
        help_text="Error message if import failed"
    )
```

**Migration Required:**
```bash
python manage.py makemigrations documents
python manage.py migrate documents
```

---

## 🔌 Technical Architecture

### FileMaker APIs: OData vs Data API

**OData API (Already Using):**
- ✅ Access to metadata (all fields except containers)
- ✅ Fast queries and filtering
- ✅ Simple REST endpoints
- ❌ Cannot access container field contents

**FileMaker Data API (Need to Use):**
- ✅ Can download container field contents
- ✅ RESTful API with JSON responses
- ✅ Same credentials as OData
- ⚠️ More complex authentication (token-based)

**Endpoint Structure:**
```
Base URL: https://walkeasy.fmcloud.fm/fmi/data/v1/databases/WEP-DatabaseV2

1. Login (get token):
   POST /sessions
   Body: { "fmDataSource": [{"database": "WEP-DatabaseV2", "username": "xxx", "password": "xxx"}] }
   Response: { "token": "abc123..." }

2. Get Record with Container:
   GET /layouts/{layout}/records/{recordId}
   Header: Authorization: Bearer {token}
   
3. Download Container File:
   GET /layouts/{layout}/records/{recordId}/containers/{fieldName}
   Header: Authorization: Bearer {token}
   Response: Binary file data
```

### S3 Bucket Configuration

**Current S3 Bucket:**
- **Name:** `walkeasy-nexus-documents`
- **Region:** `ap-southeast-2` (Sydney, Australia)
- **Environment Variables:**
  ```bash
  AWS_S3_BUCKET_NAME=walkeasy-nexus-documents
  AWS_REGION=ap-southeast-2
  AWS_ACCESS_KEY_ID=<from .env>
  AWS_SECRET_ACCESS_KEY=<from .env>
  ```

**Folder Structure (Current):**
```
walkeasy-nexus-documents/
└── documents/
    ├── {uuid}.pdf
    ├── {uuid}.jpg
    ├── {uuid}.docx
    └── ...
```

**Proposed Folder Structure (FileMaker Import):**
```
walkeasy-nexus-documents/
├── documents/                    # Existing uploaded documents
│   └── {uuid}.{ext}
│
├── filemaker-documents/          # Imported from FileMaker API_Docs
│   ├── referrals/
│   │   ├── {uuid}.pdf
│   │   └── ...
│   ├── reports/
│   │   └── {uuid}.pdf
│   ├── letters/
│   │   └── {uuid}.pdf
│   └── other/
│       └── {uuid}.{ext}
│
└── filemaker-images/             # Imported from FileMaker API_Images
    ├── clinical-photos/
    │   ├── left-dorsal/
    │   ├── right-plantar/
    │   └── ...
    ├── scanned-documents/
    └── other/
```

**Benefits of Organized Structure:**
- Easy to identify FileMaker-imported files
- Can apply different retention policies
- Easier to troubleshoot migration issues
- Can re-import specific folders if needed
- Clear separation from user-uploaded files

### S3 Upload Flow (Already Working)

**Existing S3Service:**
```python
# backend/documents/services.py
class S3Service:
    def upload_file(self, file_obj, filename, folder='documents'):
        """Upload file to S3 and return S3 key"""
        # Generates: "{folder}/{uuid}{ext}"
        s3_key = self.generate_s3_key(filename, folder)
        
        # Upload with proper MIME type and metadata
        self.s3_client.upload_fileobj(
            file_obj,
            self.bucket_name,
            s3_key,
            ExtraArgs={
                'ContentType': mime_type,
                'ContentDisposition': f'attachment; filename="{filename}"',
            }
        )
        return s3_key
    
    def generate_presigned_url(self, s3_key, expiration=3600):
        """Generate temporary download URL"""
        return self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': s3_key},
            ExpiresIn=expiration
        )
```

**For FileMaker Import:**
```python
# Use organized folder structure
def get_s3_folder(filemaker_type, document_type):
    """Get S3 folder based on FileMaker source and type"""
    if filemaker_type == 'document':
        # From API_Docs
        type_map = {
            'Referral': 'filemaker-documents/referrals',
            'Report': 'filemaker-documents/reports',
            'Letter': 'filemaker-documents/letters',
        }
        return type_map.get(document_type, 'filemaker-documents/other')
    
    elif filemaker_type == 'image':
        # From API_Images
        type_map = {
            'Left Dorsal': 'filemaker-images/clinical-photos/left-dorsal',
            'Right Plantar': 'filemaker-images/clinical-photos/right-plantar',
            # ... other image types
        }
        return type_map.get(document_type, 'filemaker-images/other')
```

---

## 📋 Migration Strategy

### Phase 1: Discovery & Planning (CURRENT)

**Tasks:**
1. ✅ Document current status
2. ⏸️ Discover container field names in FileMaker
3. ⏸️ Test Data API authentication
4. ⏸️ Test single file download (proof of concept)
5. ⏸️ Analyze file types and sizes
6. ⏸️ Identify missing files (`result = "Not found"`)
7. ⏸️ Determine what `imported = 1` means

**Deliverables:**
- This planning document
- Container field discovery script
- Single file download test
- Data quality report

---

### Phase 2: Metadata Import (Quick Win)

**Why Metadata First:**
- Can use existing OData API (fast)
- See all documents/images in Nexus immediately
- No file downloads needed yet
- Can filter/plan which files to migrate

**Tasks:**
1. Add schema changes to Document model (migration)
2. Create metadata import script
   - Fetch all `API_Docs` records via OData
   - Create Document records with `import_status='pending'`
   - Store FileMaker metadata (id, type, date, filename)
   - Link to patients via `id_Contact`
3. Repeat for `API_Images` records
4. Verify in Django admin

**Import Script Pseudocode:**
```python
# Import documents metadata
docs = fetch_odata("API_Docs")
for doc in docs:
    Document.objects.create(
        filemaker_id=doc['id'],
        filemaker_type='document',
        filemaker_date=doc['Date'],
        original_filename=doc.get('filename') or f"Document_{doc['num']}.pdf",
        content_type=ContentType.objects.get_for_model(Patient),
        object_id=doc['id_Contact'],
        import_status='pending',
        # S3 fields remain null for now
    )

# Import images metadata
images = fetch_odata("API_Images")
for img in images:
    Document.objects.create(
        filemaker_id=img['id'],
        filemaker_type='image',
        filemaker_date=img['date'],
        original_filename=img['Name of file'],
        content_type=ContentType.objects.get_for_model(Patient),
        object_id=img['id_Contact'],
        import_status='pending' if img['result'] != 'Not found' else 'skipped',
    )
```

**Result:** 17,933 document records visible in Nexus (files pending migration)

---

### Phase 3: File Migration (Batch Processing)

**Prerequisites:**
- ✅ Phase 2 complete (metadata imported)
- ✅ Data API authentication working
- ✅ Container field names discovered
- ✅ Single file test successful

**Tasks:**
1. Create batch processing script
2. For each Document with `import_status='pending'`:
   - Update status to `'downloading'`
   - Download file from FileMaker Data API
   - Update status to `'uploading'`
   - Upload to S3 using `S3Service`
   - Update Document record (s3_key, file_size, file_type)
   - Update status to `'complete'`
3. Handle errors gracefully (retry logic)
4. Progress tracking and logging
5. Resume capability (if interrupted)

**Batch Processing Strategy:**
```python
import time
import logging
from io import BytesIO

def migrate_files(batch_size=10, delay_seconds=1):
    """Migrate files in batches to avoid overwhelming FileMaker server"""
    
    pending_docs = Document.objects.filter(import_status='pending')
    total = pending_docs.count()
    
    logger.info(f"Starting migration of {total} files")
    
    for i, doc in enumerate(pending_docs):
        try:
            # Update status
            doc.import_status = 'downloading'
            doc.save()
            
            # Download from FileMaker
            file_data = download_from_filemaker(
                layout=get_layout_name(doc.filemaker_type),
                record_id=doc.filemaker_id,
                field_name=get_container_field_name(doc.filemaker_type)
            )
            
            # Update status
            doc.import_status = 'uploading'
            doc.save()
            
            # Upload to S3
            file_obj = BytesIO(file_data)
            s3_key = s3_service.upload_file(
                file_obj,
                doc.original_filename,
                folder=get_folder_name(doc.filemaker_type)
            )
            
            # Update document
            doc.s3_key = s3_key
            doc.file_size = len(file_data)
            doc.file_type = get_mime_type(doc.original_filename)
            doc.import_status = 'complete'
            doc.save()
            
            logger.info(f"✅ Migrated {i+1}/{total}: {doc.original_filename}")
            
            # Rate limiting
            if (i + 1) % batch_size == 0:
                time.sleep(delay_seconds)
                
        except Exception as e:
            doc.import_status = 'failed'
            doc.import_error = str(e)
            doc.save()
            logger.error(f"❌ Failed {doc.original_filename}: {e}")
            continue
```

**Monitoring:**
- Track progress: `Document.objects.filter(import_status='complete').count()`
- Check failures: `Document.objects.filter(import_status='failed')`
- Estimate time: ~17,933 files × 2 seconds = ~10 hours (conservative)

---

### Phase 4: Verification & Cleanup

**Tasks:**
1. Verify all files accessible in S3
2. Check file sizes match (no corruption)
3. Test random sample in frontend dialogs
4. Generate migration report:
   - Total files migrated
   - Total size (GB)
   - Failures and reasons
   - Skipped files (missing/corrupt)
5. Update documentation
6. Clean up import scripts (keep for reference)

**Verification Queries:**
```sql
-- Migration summary
SELECT 
    import_status,
    filemaker_type,
    COUNT(*) as count,
    SUM(file_size) / 1024 / 1024 / 1024 as size_gb
FROM documents_document
WHERE filemaker_id IS NOT NULL
GROUP BY import_status, filemaker_type;

-- Failed migrations
SELECT filemaker_id, original_filename, import_error
FROM documents_document
WHERE import_status = 'failed'
ORDER BY original_filename;
```

---

## 🚀 Implementation Plan

### Week 1: Discovery & Setup
- [ ] Test FileMaker Data API authentication
- [ ] Discover container field names
- [ ] Download single test file (proof of concept)
- [ ] Analyze file types and sizes
- [ ] Review data quality issues

### Week 2: Metadata Import
- [ ] Create database migration (add tracking fields)
- [ ] Write metadata import script
- [ ] Import all documents metadata (11,269)
- [ ] Import all images metadata (6,664)
- [ ] Verify in Django admin

### Week 3: File Migration
- [ ] Create batch processing script
- [ ] Add error handling and logging
- [ ] Add resume capability
- [ ] Test with small batch (10 files)
- [ ] Run full migration (17,933 files)

### Week 4: Verification & Polish
- [ ] Verify all files accessible
- [ ] Test in frontend dialogs
- [ ] Generate migration report
- [ ] Update documentation
- [ ] Merge to main

---

## ❓ Open Questions

### Technical Questions
1. **Container Field Names:**
   - What is the exact field name for documents in `API_Docs`?
   - What is the exact field name for images in `API_Images`?
   - Are there multiple container fields per table?

2. **Data API Access:**
   - Do we need special permissions for Data API?
   - Are container fields enabled for external access?
   - Any rate limits or throttling?

3. **File Storage:**
   - Are all files stored in FileMaker container fields?
   - Any files stored externally (network drive, cloud)?
   - Maximum file size in FileMaker?

4. **Data Quality:**
   - What percentage have `result = "Not found"`? (missing files)
   - What does `imported = 1` mean in API_Docs?
   - Are filenames unique or can there be duplicates?

### Business Questions
1. **Priority:**
   - Import documents first, then images? Or together?
   - Any specific document types needed urgently?
   - Can we skip old/archived documents?

2. **Validation:**
   - How to verify a successful migration?
   - What's acceptable failure rate? (5%? 10%?)
   - Manual review needed for failed files?

3. **Downtime:**
   - Does FileMaker need to stay online during migration?
   - Can we run migration during business hours?
   - Backup plan if migration fails?

---

## 📊 Estimated Effort

### Time Estimates
- **Discovery & Setup:** 2-4 hours
- **Metadata Import:** 2-3 hours
- **File Migration Script:** 4-6 hours
- **Actual Migration:** 8-12 hours (automated)
- **Verification:** 2-3 hours
- **Documentation:** 1-2 hours

**Total:** ~20-30 hours of development + 8-12 hours automated processing

### Resource Requirements
- FileMaker server availability
- AWS S3 storage (~? GB needed)
- Development server with good network connection
- Monitoring during long-running migration

---

## 🛡️ Risk Mitigation

### Potential Risks
1. **FileMaker server overload** → Batch processing with delays
2. **Network interruption** → Resume capability, save progress
3. **File corruption** → Verify checksums, manual review sample
4. **Missing files** → Skip gracefully, log for review
5. **S3 storage costs** → Estimate size first, monitor usage

### Backup Strategy
- Keep FileMaker data until verified
- Don't delete metadata even if file migration fails
- Export failure log for manual review
- Test with small batch before full migration

---

## 📝 Next Steps

### Immediate Actions (This Week)
1. **Run discovery script** to get container field names
2. **Test Data API** authentication and single file download
3. **Review with Craig** - confirm approach and priorities
4. **Create database migration** for Document model changes

### Scripts to Create
1. `scripts/filemaker/08_discover_container_fields.py` - Find field names
2. `scripts/filemaker/09_test_data_api.py` - Test authentication and download
3. `scripts/filemaker/10_analyze_file_metadata.py` - Data quality report
4. `backend/documents/management/commands/import_filemaker_docs_metadata.py` - Metadata import
5. `backend/documents/management/commands/migrate_filemaker_files.py` - File migration

---

## 📚 Reference Documentation

- **FileMaker Data API Docs:** https://help.claris.com/en/data-api-guide/
- **S3 Integration:** `docs/integrations/S3.md`
- **Current Migration Status:** `docs/integrations/FILEMAKER.md`
- **Database Schema:** `docs/architecture/DATABASE_SCHEMA.md`

---

**Status:** 📋 Ready for discovery phase  
**Next:** Create container field discovery script

