# Documents Dialog

**Component:** `frontend/app/components/dialogs/DocumentsDialog.tsx`  
**Status:** ✅ Built and Integrated  
**Last Updated:** 2025-11-05

---

## 📋 **Purpose**

The Documents Dialog provides a comprehensive interface for managing patient-specific documents. Documents are stored in AWS S3 and metadata is tracked in the database. The dialog supports drag-and-drop upload, inline PDF viewing (with Safari support), image viewing, and document management.

---

## 🎨 **UI Components**

### **Dialog Layout**
- **Size:** `95vw x 90vh` (full-screen feel)
- **Layout:** 2-column grid (4:8 split)
- **Header:** Patient name with badges for document type and count

### **Left Column: Documents List** (33% width)
- **Scrollable list** of all documents for the patient
- **Document Items Display:**
  - Document type badge (e.g., "Referral", "ID Document")
  - Document filename (truncated if long)
  - File size (e.g., "2.4 MB")
  - Upload timestamp (formatted: "DD MMM YYYY, HH:MM AM/PM")
  - Selected state highlighting (blue border, light background)
  - Hover effects
- **Actions on Hover:**
  - Edit button (blue pencil icon) - Allows changing document type/date
  - Delete button (red trash icon) - Opens confirmation modal
- **Empty State:** "No documents yet. Upload your first document!"
- **Add Button:** Header has "+ Add Document" button

### **Right Column: Upload/View Area** (67% width)

#### **Upload Mode** (when no document selected)
- **Drag-and-Drop Zone:**
  - Large icon (upload cloud)
  - Text: "Drag PDF or image here, or click to browse"
  - File size limit: "Max 10 MB"
  - Supported formats: PDF, PNG, JPEG, WEBP, GIF
  - Click to open file browser
  - Drag-and-drop active state
- **Upload Form Fields:**
  - **Document Type Dropdown:** (same row)
    - Options: "Referral", "3D Scan", "Photo - Pre", "Photo - Post", "Notes", "ID Document", "Invoice", "Other"
    - Searchable
    - Default: "Referral"
  - **Document Date:** (same row)
    - Date picker
    - Default: Today
- **File Preview:** (after file selected, before upload)
  - Filename
  - File size
  - "Upload Document" button
- **"Add First Document" Button:** (if list is empty)

#### **View Mode** (when document selected)
- **Top Row:** Document Type and Date
  - Document type badge
  - Document date (formatted)
  - Both in same row
- **Viewer Area:**
  - **PDF Files:**
    - Inline scrollable PDF viewer (using `<object>` tag)
    - Safari support: Fetches PDF via backend proxy, caches in IndexedDB, uses blob URL
    - Reload button for Safari (if PDF doesn't load)
    - Fallback: "Download PDF" button
  - **Image Files:**
    - Full-size image display
    - Centered, responsive
- **Bottom Row:** File Info
  - Filename (truncated if long)
  - File size (e.g., "2.4 MB")
  - Timestamp (formatted: "DD MMM YYYY, HH:MM AM/PM")
- **"Add Another Document" Button:** (at bottom)

---

## 🛠 **Technical Implementation**

### **Backend**

#### **Django App:** `documents`
- **Models:** `backend/documents/models.py`
  - `Document` model with fields:
    - `id` (UUID, primary key)
    - `s3_key` (CharField, S3 object key)
    - `original_name` (CharField, original filename)
    - `file_size` (IntegerField, bytes)
    - `mime_type` (CharField, e.g., "application/pdf")
    - `document_type` (CharField, e.g., "referral", "id_document")
    - `document_date` (DateField, document date)
    - `uploaded_by` (ForeignKey to User, nullable)
    - `uploaded_at` (DateTimeField, auto)
    - Generic foreign key for linking to any model (Patient, Order, etc.)
      - `content_type` (ForeignKey to ContentType)
      - `object_id` (UUIDField)
      - `content_object` (GenericForeignKey)

- **Serializers:** `backend/documents/serializers.py`
  - `DocumentSerializer` with download URL generation

- **Views:** `backend/documents/views.py`
  - `DocumentViewSet` (Django REST Framework)
  - Supports filtering by `patient_id` query parameter
  - Generates presigned S3 URLs for download

- **Proxy View:** `backend/documents/proxy_views.py`
  - `DocumentProxyView` - Backend endpoint to fetch PDFs from S3
  - Bypasses CORS issues for Safari PDF viewing
  - Endpoint: `GET /api/documents/{id}/proxy/`

- **Services:** `backend/documents/services.py`
  - `S3Service` - Handles S3 uploads, downloads, and presigned URL generation

#### **API Endpoints**
- `GET /api/documents/?patient_id={uuid}` - List documents for patient
- `POST /api/documents/` - Upload new document
- `GET /api/documents/{id}/` - Get document metadata
- `PUT /api/documents/{id}/` - Update document (type, date)
- `DELETE /api/documents/{id}/` - Delete document
- `GET /api/documents/{id}/proxy/` - Proxy download (bypasses CORS)

### **Frontend**

#### **State Management**
- `documents` - Array of document metadata
- `selectedDocument` - Currently selected document for viewing
- `uploading` - Upload in progress
- `uploadProgress` - Upload progress percentage
- `documentType` - Selected document type for upload
- `documentDate` - Selected document date for upload
- `dragActive` - Drag-and-drop active state
- `pdfUrl` - Blob URL for Safari PDF viewing
- `isLoadingPdf` - PDF loading state
- `pdfError` - PDF loading error

#### **Key Features**
1. **Drag-and-Drop Upload:**
   - Uses Mantine `FileButton` and `Dropzone`
   - Validates file type and size
   - Uploads to S3 via Django API

2. **PDF Caching (Safari):**
   - **Utility:** `frontend/app/utils/pdfCache.ts`
   - **Strategy:** Cache-first approach
     1. Check IndexedDB cache
     2. If not cached, fetch via backend proxy (`/api/documents/{id}/proxy/`)
     3. Store blob in IndexedDB
     4. Create blob URL for viewing
   - **Cleanup:** Automatic cleanup based on age (7 days) and size (100MB limit, cleanup at 80MB)
   - **Benefits:**
     - Zero bandwidth on subsequent views
     - Bypasses CORS issues
     - Works offline after first load

3. **Browser Detection:**
   - **Utility:** `frontend/app/utils/browserDetection.ts`
   - Detects Safari for specific PDF handling

4. **Document Count Badge:**
   - Displayed in `ContactHeader` menu item for "Documents"
   - Real-time count of patient's documents

5. **Edit Document:**
   - Edit button on hover
   - Updates document type and date only (not file itself)

6. **Delete Document:**
   - Delete button on hover
   - Confirmation modal before deletion
   - Deletes both metadata and S3 file

---

## 📊 **Data Flow**

### **Upload Flow**
1. User selects file (drag-and-drop or browse)
2. User selects document type and date
3. Frontend uploads file to Django API (`POST /api/documents/`)
4. Django uploads file to S3 using `S3Service`
5. Django creates `Document` record in database
6. Django returns document metadata with presigned download URL
7. Frontend updates document list and displays success notification

### **View Flow (Chrome/Firefox)**
1. User selects document from list
2. Frontend sets `selectedDocument` state
3. For PDFs: `<object>` tag loads PDF from S3 presigned URL
4. For images: `<img>` tag loads image from S3 presigned URL

### **View Flow (Safari - PDF)**
1. User selects document from list
2. Frontend detects Safari browser
3. Frontend checks IndexedDB cache (`pdfCache.get(documentId)`)
4. If cached: Use cached blob URL
5. If not cached:
   - Fetch PDF via backend proxy (`GET /api/documents/{id}/proxy/`)
   - Store blob in IndexedDB (`pdfCache.set(documentId, blob)`)
   - Create blob URL
6. Frontend renders PDF using `<object>` tag with blob URL
7. User sees "Reload PDF" button if needed

### **Delete Flow**
1. User clicks delete button (on hover)
2. Confirmation modal opens
3. User confirms deletion
4. Frontend calls API (`DELETE /api/documents/{id}/`)
5. Django deletes S3 file and database record
6. Frontend updates document list

---

## 🗂 **Database Schema**

See `docs/architecture/DATABASE_SCHEMA.md` for full schema documentation.

**Relevant Tables:**
- `documents_document` - Document metadata and S3 keys
  - Linked to patients via Generic Foreign Key
  - Stores S3 key, filename, file size, MIME type, type, date, timestamps

---

## 🔗 **Related Components**

- **`ContactHeader.tsx`** - Shows document count badge, opens dialog
- **`S3Service` (backend)** - Handles S3 upload/download
- **`pdfCache.ts` (frontend)** - IndexedDB caching for Safari
- **`browserDetection.ts` (frontend)** - Detects browser type

---

## 🐛 **Known Issues & Solutions**

### **Safari PDF Rendering**
**Problem:** Safari's `<object>` tag doesn't reliably reload PDFs from cross-origin URLs (S3).

**Solution:** Implemented 3-part approach:
1. **Backend Proxy:** Django endpoint to fetch PDFs from S3, bypassing client-side CORS
2. **IndexedDB Cache:** Client-side caching to avoid repeated fetches
3. **Blob URLs:** Use blob URLs for Safari PDF viewing

**Documentation:** `docs/troubleshooting/SAFARI_PDF_RENDERING_ISSUE.md`

### **CORS Errors**
**Problem:** Cross-origin requests from `localhost:3000` to S3 bucket.

**Solution:** 
- Backend proxy for document fetching
- IndexedDB cache to minimize S3 requests

**Documentation:** 
- `docs/troubleshooting/CORS_FIX_S3_BUCKET.md`
- `docs/troubleshooting/DJANGO_CORS_FIX.md`

---

## 🚀 **Future Enhancements**

1. **Bulk Upload:** Upload multiple documents at once
2. **Document Versioning:** Track document versions over time
3. **Document Sharing:** Share documents with patients or external parties
4. **OCR/Text Extraction:** Extract text from PDFs and images for search
5. **Document Templates:** Predefined document templates for common types
6. **Document Signing:** E-signature support for consent forms, etc.
7. **Document Expiry:** Track expiry dates for ID documents, etc.

---

## 📝 **Testing Checklist**

- [x] Upload PDF document
- [x] Upload image document (PNG, JPEG)
- [x] View PDF in Chrome
- [x] View PDF in Safari (with caching)
- [x] View image
- [x] Edit document type/date
- [x] Delete document
- [x] Drag-and-drop upload
- [x] Document count badge updates
- [x] Cache cleanup (automatic)
- [x] Reload PDF (Safari)
- [x] Multiple documents for same patient
- [x] Empty state display
- [x] File size validation
- [x] File type validation

---

**Next Steps:**
1. ✅ Implement document viewer
2. ✅ Implement Safari PDF support
3. ✅ Implement caching solution
4. ⏳ Implement bulk upload
5. ⏳ Implement document versioning

