# Documents Dialog

**Component:** `frontend/app/components/dialogs/DocumentsDialog.tsx`  
**Status:** ✅ Built and Integrated  
**Last Updated:** 2025-11-14

---

## 📋 **Purpose**

The Documents Dialog provides a comprehensive interface for managing patient-specific documents. Documents are stored in AWS S3 and metadata is tracked in the database. The dialog supports drag-and-drop upload, inline PDF viewing (with Safari support), image viewing, and document management.

---

## 🎨 **UI Components**

### **Dialog Layout**
- **Size:** `60vw x 98vh` (tall, narrower dialog)
- **Layout:** 2-column grid (2:10 split - 20% left, 80% right)
- **Header:** "Documents" title

### **Left Column: Documents List** (20% width)
- **Scrollable list** of all documents for the patient (using Mantine `ScrollArea`)
- **Document Items Display:**
  - Category badge (e.g., "EnableNSW Application", "ERF", "Medical Records")
  - File size (e.g., "259.6 KB")
  - Document date (formatted: "DD/MM/YYYY")
  - Selected state highlighting (light background)
  - Hover effects
- **Actions:**
  - Delete button (red trash icon) - Opens confirmation dialog
  - Click document to view
- **Empty State:** "No documents yet. Upload your first document!"
- **Add Button:** Header has "+" button to create new upload

### **Right Column: Upload/View Area** (80% width)

#### **View Mode** (when document selected)
- **Top Row:** Document Info (compact, flexShrink: 0)
  - Document category (large, bold text)
  - Document date (right-aligned)
  - Action icons: Reload (PDFs only), Preview (scroll to viewer), Download, Delete, Close
- **Second Row:** Metadata (compact, flexShrink: 0)
  - Category dropdown (hybrid: shows current category + standard options)
  - File size (e.g., "259.6 KB")
  - Description (if present)
- **Viewer Area:** (flex: 1, takes all remaining space)
  - **Height:** `calc(98vh - 200px)` - Explicit height calculation
  - **Scrolling:** Natural overflow scrolling on the viewer container
  - **PDF Files:**
    - Inline PDF viewer using `<object>` tag
    - Safari support: Fetches PDF via backend proxy, caches in IndexedDB, uses blob URL
    - Reload button for Safari (if PDF doesn't load)
    - Fallback: "Download PDF" button
  - **Image Files:**
    - Full-size image display
    - Centered, responsive

#### **Upload Mode** (when no document selected)
- **Drag-and-Drop Zone:**
  - Large icon (upload cloud)
  - Text: "Drag PDF or image here, or click to browse"
  - File size limit: "Max 10 MB"
  - Supported formats: PDF, PNG, JPEG, WEBP, GIF
  - Click to open file browser
  - Drag-and-drop active state
- **Upload Form Fields:**
  - **Category Dropdown:**
    - Hybrid data list: Shows standard categories + any custom FileMaker categories
    - Grouped options: "Document Categories", "Clinical Documents", "Administrative Documents", "Other"
    - Searchable
    - Default: "Other"
  - **Document Date:**
    - Date picker
    - Default: Today
  - **Description:** (optional)
    - Text area
- **File Preview:** (after file selected, before upload)
  - Filename
  - File size
  - "Upload Document" button

---

## 🛠 **Technical Implementation**

### **Scrolling Architecture**
- **Main Dialog Body:** Natural overflow (default) - Scrollbar appears when content overflows
- **Left Sidebar:** `ScrollArea` component for document list scrolling (independent)
- **PDF Viewer:** Scrolling handled by main dialog body scrollbar
- **Key Decision:** Simplified approach using natural dialog scrolling for better mouse wheel compatibility
- **Benefits:**
  - Keyboard arrows work (direct to PDF)
  - Mouse wheel works (via dialog scrollbar)
  - Simple, reliable, no positioning conflicts

### **Layout System**
- **Flexbox Chain:**
  1. Modal body: `display: flex`, `flexDirection: column`, `height: calc(98vh - 60px)`
  2. Grid: `height: 100%`
  3. Right Grid.Col: `display: flex`, `flexDirection: column`, `height: 100%`
  4. Stack containers: `flex: 1`, proper flex direction
  5. Viewer Box: `height: calc(98vh - 200px)` - Explicit height ensures proper sizing
- **Why Explicit Height:** The viewer needs a concrete height value for the PDF `<object>` tag to render properly. Using `flex: 1` alone wasn't sufficient.

### **Category System (Hybrid Dropdown)**
- **Backend:** `category` field is flexible text (no enum restriction)
- **Frontend:** Dropdown shows:
  - Current document's category (if not in standard list) - at top
  - Standard grouped categories
- **FileMaker Import:** Old FileMaker document types are preserved as custom categories
- **New Documents:** Users can select standard categories or type custom ones
- **Display:** Category is shown as the primary document identifier (instead of UUID filename)
- **Formatting:** Custom categories are formatted for display:
  - Hyphens replaced with spaces: `"enable-waiver"` → `"enable waiver"`
  - First letter capitalized: `"enable waiver"` → `"Enable waiver"`
  - Standard categories unchanged (use exact label from list)

### **Download Filenames**
- **Format:** `{FirstName}_{LastName}_{Category}.{extension}`
- **Example:** `John_Smith_Medical_Records.pdf`
- **Spaces:** Replaced with underscores
- **Extension:** Preserved from original file
- **Multiple Files:** Browser auto-numbers if same category downloaded multiple times
- **Documentation:** `docs/features/DOCUMENT_DOWNLOAD_FILENAMES.md`

### **Backend**

#### **Django App:** `documents`
- **Models:** `backend/documents/models.py`
  - `Document` model with fields:
    - `id` (UUID, primary key)
    - `s3_key` (CharField, S3 object key)
    - `original_name` (CharField, original filename)
    - `file_size` (IntegerField, bytes)
    - `mime_type` (CharField, e.g., "application/pdf")
    - `category` (CharField, max_length=100, flexible text - no enum restriction)
    - `document_date` (DateField, document date, nullable)
    - `description` (TextField, optional)
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
- `PUT /api/documents/{id}/` - Update document (category, date, description)
- `DELETE /api/documents/{id}/` - Delete document
- `GET /api/documents/{id}/proxy/` - Proxy download (bypasses CORS)

### **Frontend**

#### **State Management**
- `documents` - Array of document metadata
- `selectedDocument` - Currently selected document for viewing
- `uploading` - Upload in progress
- `uploadProgress` - Upload progress percentage
- `documentType` - Selected category for upload
- `documentDate` - Selected document date for upload
- `description` - Optional description for upload
- `dragActive` - Drag-and-drop active state
- `pdfBlobUrl` - Blob URL for Safari PDF viewing
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
   - Polling interval: 5 seconds (only when menu is open)

5. **Edit Document:**
   - Category dropdown (inline edit)
   - Updates category, date, description in real-time
   - No separate "edit mode"

6. **Delete Document:**
   - Delete button in header
   - Confirmation dialog before deletion
   - Deletes both metadata and S3 file

7. **Download Document:**
   - Download button with standardized filename
   - Client-side filename construction: `{FirstName}_{LastName}_{Category}.{ext}`

---

## 📊 **Data Flow**

### **Upload Flow**
1. User selects file (drag-and-drop or browse)
2. User selects category and date (optional description)
3. Frontend uploads file to Django API (`POST /api/documents/`)
4. Django uploads file to S3 using `S3Service`
5. Django creates `Document` record in database
6. Django returns document metadata with presigned download URL
7. Frontend updates document list and displays success notification
8. Event dispatched: `window.dispatchEvent(new Event('documentsUpdated'))`

### **View Flow (Chrome/Firefox)**
1. User selects document from list
2. Frontend sets `selectedDocument` state
3. For PDFs: `<object>` tag loads PDF from S3 presigned URL
4. For images: `<img>` tag loads image from S3 presigned URL
5. Dialog scrolls naturally via main body scrollbar

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
1. User clicks delete button
2. Confirmation dialog opens
3. User confirms deletion
4. Frontend calls API (`DELETE /api/documents/{id}/`)
5. Django deletes S3 file and database record
6. Frontend updates document list
7. Event dispatched: `window.dispatchEvent(new Event('documentsUpdated'))`

### **Download Flow**
1. User clicks download button
2. Frontend fetches document blob via **backend proxy** (bypasses CORS)
   - URL: `GET /api/documents/{id}/proxy/`
   - Includes credentials for authentication
3. Frontend constructs filename: `{FirstName}_{LastName}_{Category}.{ext}`
   - Category formatting: hyphens → spaces, capitalize first letter
4. Frontend creates temporary download link
5. Browser downloads file with custom filename
6. Temporary link cleaned up

---

## 🗂 **Database Schema**

See `docs/architecture/DATABASE_SCHEMA.md` for full schema documentation.

**Relevant Tables:**
- `documents_document` - Document metadata and S3 keys
  - Linked to patients via Generic Foreign Key
  - Stores S3 key, filename, file size, MIME type, category (flexible text), date, description, timestamps

---

## 🔗 **Related Components**

- **`ContactHeader.tsx`** - Shows document count badge, opens dialog
- **`S3Service` (backend)** - Handles S3 upload/download
- **`pdfCache.ts` (frontend)** - IndexedDB caching for Safari
- **`browserDetection.ts` (frontend)** - Detects browser type
- **`ImagesDialog.tsx`** - Similar pattern for image management

---

## 🐛 **Known Issues & Solutions**

### **Safari PDF Rendering**
**Problem:** Safari's `<object>` tag doesn't reliably reload PDFs from cross-origin URLs (S3).

**Solution:** Implemented 3-part approach:
1. **Backend Proxy:** Django endpoint to fetch PDFs from S3, bypassing client-side CORS
2. **IndexedDB Cache:** Client-side caching to avoid repeated fetches
3. **Blob URLs:** Use blob URLs for Safari PDF viewing

**Documentation:** `docs/troubleshooting/SAFARI_PDF_RENDERING_ISSUE.md`

### **PDF Viewer Height Issues**
**Problem:** PDF viewer not filling full dialog height due to flexbox positioning conflicts.

**Solution:**
- Use explicit height calculation: `height: calc(98vh - 200px)`
- Remove conflicting `flex: 1` and `minHeight: 0` from viewer Box
- Let main dialog body handle scrolling naturally
- Remove absolute positioning from PDF `<object>` tag

**Why:** Absolute positioning on PDF object blocked mouse wheel events. Natural document flow with explicit height works better.

### **Mouse Scrolling in PDF**
**Problem:** Mouse wheel scrolling didn't work in PDF viewer (keyboard arrows worked).

**Solution:**
- Remove `overflow: 'hidden'` from main dialog body
- Use natural overflow (default/auto) for dialog scrolling
- Remove absolute positioning from PDF `<object>` element
- Use `display: block` and `width: 100%, height: 100%` for PDF

**Result:** Simple, reliable scrolling with both mouse and keyboard.

### **CORS Errors**
**Problem:** Cross-origin requests from `localhost:3000` to S3 bucket.

**Solution:** 
- Backend proxy for document fetching (viewing AND downloading)
- IndexedDB cache to minimize S3 requests (PDF viewing only)
- All downloads use proxy to bypass CORS

**Documentation:** 
- `docs/troubleshooting/CORS_FIX_S3_BUCKET.md`
- `docs/troubleshooting/DJANGO_CORS_FIX.md`

### **Memory Leak - API Polling**
**Problem:** Document count polling (`/api/documents/`) firing every 2 seconds continuously, even when menu closed.

**Solution:**
- Only poll when `ContactHeader` menu is open (`if (menuOpened)`)
- Increased polling interval from 2s to 5s
- Added conditional checks to event listeners

**Documentation:** `docs/features/SESSION_SUMMARY_2025-11-14_DOCUMENTS.md`

---

## 🚀 **Future Enhancements**

1. **Bulk Upload:** Upload multiple documents at once
2. **Document Versioning:** Track document versions over time
3. **Document Sharing:** Share documents with patients or external parties
4. **OCR/Text Extraction:** Extract text from PDFs and images for search
5. **Document Templates:** Predefined document templates for common types
6. **Document Signing:** E-signature support for consent forms, etc.
7. **Document Expiry:** Track expiry dates for ID documents, etc.
8. **Batch ZIP Download:** Download multiple selected documents as ZIP (like ImagesDialog)

---

## 📝 **Testing Checklist**

- [x] Upload PDF document
- [x] Upload image document (PNG, JPEG)
- [x] View PDF in Chrome
- [x] View PDF in Safari (with caching)
- [x] View image
- [x] Edit document category/date inline
- [x] Delete document
- [x] Drag-and-drop upload
- [x] Document count badge updates
- [x] Cache cleanup (automatic)
- [x] Reload PDF (Safari)
- [x] Multiple documents for same patient
- [x] Empty state display
- [x] File size validation
- [x] File type validation
- [x] Mouse wheel scrolling in PDF
- [x] Keyboard arrow scrolling in PDF
- [x] Custom category from FileMaker import
- [x] Standardized download filenames
- [x] Dialog height fills screen properly
- [x] Left sidebar scrolling works
- [x] No memory leaks from polling

---

**Implementation Complete:**
- ✅ Document viewer with hybrid category system
- ✅ Safari PDF support with caching
- ✅ Standardized download filenames
- ✅ Proper scrolling architecture
- ✅ Memory leak fixes (polling)
- ✅ FileMaker import compatibility

**Next Steps:**
1. ⏳ Implement bulk upload
2. ⏳ Implement batch ZIP download
3. ⏳ Implement document versioning

