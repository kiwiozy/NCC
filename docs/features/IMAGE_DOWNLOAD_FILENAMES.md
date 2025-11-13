# 📸 Image Download Filename Convention

**Last Updated:** November 14, 2025  
**Status:** ✅ Implemented

---

## 🎯 **Filename Format**

All image downloads (single or batch) use a standardized naming convention for easy identification and organization.

### **Single Image Download:**

**Format:** `{FirstName}_{LastName}_{Category}.{extension}`

**Examples:**
- `John_Smith_Left_Dorsal.jpg`
- `Mary_Jones_Plantar.png`
- `Robert_Brown_R-Brannock.jpg`

### **Batch ZIP Download:**

**ZIP Filename:** `{FirstName}_{LastName}_Images_{Date}.zip`

**Format:** `{FirstName}_{LastName}_Images_{DD}_{MMM}_{YYYY}.zip`

**Examples:**
- `John_Smith_Images_24_Aug_2018.zip`
- `Mary_Jones_Images_15_Jan_2025.zip`

**Files Inside ZIP:** Each file renamed using the single image format
- `John_Smith_Left_Dorsal.jpg`
- `John_Smith_Right_Dorsal.jpg`
- `John_Smith_Plantar.jpg`

---

## 🔢 **Handling Duplicate Filenames**

When multiple images have the same category (e.g., multiple "Left Dorsal" images), the system automatically adds a counter:

**First Image:** `John_Smith_Left_Dorsal.jpg`  
**Second Image:** `John_Smith_Left_Dorsal_2.jpg`  
**Third Image:** `John_Smith_Left_Dorsal_3.jpg`

---

## 📋 **Implementation Details**

### **Frontend (Single Download):**
- **File:** `frontend/app/components/dialogs/ImagesDialog.tsx`
- **Function:** `ImageViewer.handleDownload()`
- **Logic:**
  - Extracts patient name from props
  - Gets category from image
  - Formats both with underscores replacing spaces
  - Constructs filename: `{PatientName}_{Category}.{ext}`

### **Backend (Batch ZIP Download):**
- **File:** `backend/images/views.py`
- **Endpoint:** `GET /api/images/batches/{id}/download/`
- **Logic:**
  1. Gets patient from batch's `content_object` (Generic FK)
  2. Formats patient name: `{first_name}_{last_name}`
  3. For each image:
     - Extracts category and extension
     - Creates new filename: `{PatientName}_{Category}.{ext}`
     - Tracks duplicates with counter
  4. ZIP filename includes date from batch name or uploaded_at date

---

## 🗓️ **Date Format**

Date is extracted from the batch name (e.g., "24 Aug 2018 (FileMaker Import)"):
- **Format:** `DD_MMM_YYYY`
- **Example:** `24_Aug_2018`

**Fallback:** If date can't be parsed from batch name, uses `batch.uploaded_at` date.

---

## ✅ **Where This Applies**

### **Images:**
- ✅ Single image download (from viewer)
- ✅ Batch download (entire batch as ZIP)
- ✅ Selected images download (checked images as ZIP)

### **Documents:**
- ⚠️ **To be implemented** - will use same naming convention

---

## 📝 **Special Cases**

### **FileMaker Imported Images:**
- Categories like "Left Dorsal", "Planter", "R-Brannock" are preserved
- Spaces in categories are replaced with underscores
- Example: `John_Smith_Left_Dorsal.jpg`

### **New Uploaded Images:**
- Use standard Nexus categories (dorsal, plantar, medial, etc.)
- Example: `John_Smith_dorsal.jpg`

### **Uncategorized Images:**
- If no category set, uses "Uncategorized"
- Example: `John_Smith_Uncategorized.jpg`

---

## 🔧 **Testing**

To verify the implementation:

1. **Single Image Download:**
   - Open patient images
   - Click download icon on any image
   - Verify filename matches: `{FirstName}_{LastName}_{Category}.{ext}`

2. **Batch Download:**
   - Click download icon on a batch
   - Verify ZIP filename: `{FirstName}_{LastName}_Images_{Date}.zip`
   - Extract ZIP and verify individual files are renamed

3. **Selected Images:**
   - Check multiple images
   - Click "Download Selected"
   - Verify same behavior as batch download

---

## 🐛 **Troubleshooting**

### **Issue:** Filename shows "undefined" or is malformed
**Cause:** Patient name not being passed correctly  
**Fix:** Check that `patientName` prop is passed to `ImageViewer` component

### **Issue:** Category shows as blank
**Cause:** Image category field is empty  
**Fix:** Ensure images have categories set (either from FileMaker import or manual entry)

### **Issue:** Duplicate filenames overwrite each other
**Cause:** Counter logic not working  
**Fix:** Check `filename_counter` dictionary in batch download function

---

## 📚 **Related Documentation**

- `docs/features/APPOINTMENT_TYPES.md` - Appointment types feature
- `docs/FileMaker/LINK_IMAGES_HYBRID.md` - FileMaker image import process
- `docs/architecture/DATABASE_SCHEMA.md` - Image model schema

---

**Status:** ✅ Complete and tested  
**Applies to:** Images (all download methods)  
**Next:** Implement same convention for document downloads

