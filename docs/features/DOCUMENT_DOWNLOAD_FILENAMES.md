# 📄 Document Download Filename Convention

**Last Updated:** November 14, 2025  
**Status:** ✅ Implemented

---

## 🎯 **Filename Format**

All document downloads use a standardized naming convention for easy identification and organization.

### **Single Document Download:**

**Format:** `{FirstName}_{LastName}_{Category}.{extension}`

**Examples:**
- `John_Smith_ERF.pdf`
- `Mary_Jones_Medical_Records.pdf`
- `Robert_Brown_Referral.pdf`

---

## 📋 **Implementation Details**

### **Frontend (Single Download):**
- **File:** `frontend/app/components/dialogs/DocumentsDialog.tsx`
- **Function:** `handleDownload()`
- **Logic:**
  - Fetches document as blob
  - Extracts patient name from props
  - Gets category from document
  - Formats both with underscores replacing spaces
  - Constructs filename: `{PatientName}_{Category}.{ext}`

---

## 🗂️ **Category System**

### **Standard Categories (Grouped):**

**Medical:**
- Medical Records
- Prescription
- X-Ray / Imaging

**NDIS & Funding:**
- ERF
- EnableNSW Application
- Remittance Advice

**Administrative:**
- Referral
- Purchase Order
- Quote
- Invoice
- Consent Form
- Insurance Document

**Other:**
- Other

### **Flexible Categories:**
- Documents support both standard categories AND custom categories
- Custom categories from FileMaker imports are preserved
- Frontend dropdown shows current category (even if custom) + standard options
- Backend allows any category text (no constraint)

---

## ✅ **Where This Applies**

### **Documents:**
- ✅ Single document download (from viewer)

### **Images:**
- ✅ Single image download - see [Image Download Filenames](IMAGE_DOWNLOAD_FILENAMES.md)
- ✅ Batch ZIP download - see [Image Download Filenames](IMAGE_DOWNLOAD_FILENAMES.md)

---

## 📝 **Special Cases**

### **FileMaker Imported Documents:**
- Custom categories are preserved
- Spaces in categories are replaced with underscores
- Example: `John_Smith_Custom_Category.pdf`

### **New Uploaded Documents:**
- Use standard Nexus categories
- Example: `John_Smith_ERF.pdf`

### **Uncategorized Documents:**
- If no category set, uses "Uncategorized"
- Example: `John_Smith_Uncategorized.pdf`

---

## 🔧 **Testing**

To verify the implementation:

1. **Single Document Download:**
   - Open patient documents
   - Click download button on any document
   - Verify filename matches: `{FirstName}_{LastName}_{Category}.{ext}`

2. **Custom Categories:**
   - Upload document with custom category text
   - Verify dropdown shows custom category
   - Download and verify filename includes custom category

---

## 🐛 **Troubleshooting**

### **Issue:** Filename shows "undefined" or is malformed
**Cause:** Patient name not being passed correctly  
**Fix:** Check that `patientName` prop is passed to `DocumentsDialog` component

### **Issue:** Category shows as blank
**Cause:** Document category field is empty  
**Fix:** Ensure documents have categories set (either from upload or manual entry)

### **Issue:** Download doesn't use custom filename
**Cause:** Browser security blocking download attribute  
**Fix:** Implementation uses blob URL + download attribute which works in all modern browsers

---

## 📚 **Related Documentation**

- `docs/features/IMAGE_DOWNLOAD_FILENAMES.md` - Image download naming
- `docs/FileMaker/LINK_IMAGES_HYBRID.md` - FileMaker import process
- `docs/architecture/DATABASE_SCHEMA.md` - Document model schema

---

**Status:** ✅ Complete and tested  
**Applies to:** Documents (single download)  
**Naming Pattern:** `{FirstName}_{LastName}_{Category}.{extension}`

