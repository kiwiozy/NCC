# Notes Dialog

**Component:** `frontend/app/components/dialogs/NotesDialog.tsx`  
**Status:** ✅ Built and Integrated  
**Last Updated:** 2025-01-15

---

## 📋 **Purpose**

The Notes Dialog provides a comprehensive interface for managing patient-specific notes. Notes are stored persistently in the database and support multiple note types (clinical notes, clinic dates, order notes, etc.).

---

## 🎨 **UI Components**

### **Dialog Layout**
- **Size:** `xl` (large modal)
- **Height:** 600px (fixed)
- **Layout:** 2-column grid (4:8 split)

### **Left Column: Notes List** (25% width)
- **Scrollable list** of all notes for the patient
- **Note Items Display:**
  - Badge showing note type (e.g., "Clinical Notes", "Clinic Dates")
  - Preview of note content (2 lines, truncated)
  - Created date/time (formatted: "DD MMM YYYY, HH:MM")
  - Selected state highlighting
  - Hover effects
- **Actions on Hover:**
  - Edit button (blue pencil icon) - Opens edit form with note data
  - Delete button (red trash icon) - Opens confirmation modal
- **Empty State:** "No notes yet. Create your first note!"

### **Right Column: Create/Edit Form & Note View** (75% width)

#### **Create/Edit Form** (when editing or no note selected)
- **Note Type Dropdown:**
  - Options: Clinical Notes, Clinic Dates, Order Notes, Admin Notes, Referral, 3D Scan Data, Workshop Note, Other...
  - Searchable
  - Default: "Clinical Notes"
- **Content Textarea:**
  - Large text area (18-30 rows, auto-sizing)
  - Placeholder: "Enter note content..."
  - Required field
- **Action Buttons:**
  - **Create/Update Button:**
    - Shows "Create" or "Update" based on mode
    - Left icon: Plus (create) or Edit (update)
    - Loading state while saving
  - **Cancel Button:** (only when editing)
    - Outline variant
    - Resets form
  - **Rewrite with AI Button:** (only for Clinical Notes with content)
    - Gradient button (blue to cyan)
    - Sparkles icon
    - Opens AI rewrite dialog

#### **Selected Note View** (when note selected)
- **Note Type:** Badge showing type
- **Content:** Full note content (read-only)
- **Metadata:**
  - Created date/time
  - Updated date/time (if different from created)
- **Action Buttons:**
  - **New Note Button:** Switches back to create form
  - **Edit Button:** Switches to edit mode with note data
  - **Delete Button:** Opens confirmation modal

---

## 🔄 **Data Flow**

### **Note Types**
- `clinical_notes` - Clinical Notes
- `clinic_dates` - Clinic Dates
- `order_notes` - Order Notes
- `admin_notes` - Admin Notes
- `referral` - Referral
- `3d_scan_data` - 3D Scan Data
- `workshop_note` - Workshop Note
- `other` - Other...

### **API Integration**

#### **Fetch Notes**
```typescript
GET /api/notes/?patient_id={patientId}
```
- Returns list of notes for patient
- Sorted by `created_at` descending (newest first)
- Response format: `{ results: [...] }` or `[...]`

#### **Create Note**
```typescript
POST /api/notes/
Body: {
  patient: string (UUID),
  note_type: string,
  content: string
}
```

#### **Update Note**
```typescript
PATCH /api/notes/{noteId}/
Body: {
  note_type?: string,
  content?: string
}
```

#### **Delete Note**
```typescript
DELETE /api/notes/{noteId}/
```

### **Badge Count Updates**
- Badge count in menu updates automatically when notes change
- Uses `notesUpdated` custom event
- Also refreshes every 2 seconds as fallback
- Loads from API for patient-specific notes

---

## 💾 **Backend Storage**

### **Database Model**
**Table:** `notes`  
**Model:** `notes.models.Note`

**Fields:**
- `id` - UUID (primary key)
- `patient` - ForeignKey → `patients.Patient` (CASCADE)
- `note_type` - CharField(50) - Type of note
- `content` - TextField - Note content
- `created_by` - CharField(100) (optional)
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)

**Indexes:**
- `['patient']`
- `['note_type']`
- `['patient', 'note_type']`
- `['-created_at']`

### **Related Name**
- Patient model: `patient_notes` (to avoid conflict with `notes` TextField)

---

## ✨ **Features**

### **AI Rewrite** (Clinical Notes only)
- **Button:** "Rewrite with AI" (gradient blue to cyan)
- **Only available for:** Clinical Notes type
- **Requires:** Note content to be entered
- **Opens:** AI rewrite dialog
- **Uses:** OpenAI GPT-4o-mini via `/api/ai/rewrite-clinical-notes/`
- **Features:**
  - Custom prompt support
  - Refinement options
  - Accept/Reject result

### **Real-time Updates**
- Notes list updates immediately after create/update/delete
- Badge count updates in menu
- No page refresh needed

### **Error Handling**
- Displays error alerts for API failures
- Falls back to localStorage for non-patient notes (global notes)
- Graceful degradation if API unavailable

---

## 🔗 **Integration Points**

### **ContactHeader Component**
- **Menu Item:** "Notes" with notification badge
- **Badge Position:** Right side of text, vertically centered
- **Badge Behavior:**
  - Only shows when count > 0
  - Shows "99+" for counts over 99
  - Updates in real-time

### **Patients Page**
- **Access:** Via hamburger menu → Notes
- **Patient Context:** Passes `patientId` to dialog
- **State Management:** Dialog state managed in `patients/page.tsx`

---

## 📝 **Next Steps**

1. ✅ Notes persistence (database storage)
2. ✅ Notification badge in menu
3. ✅ Badge positioning (inline with text)
4. ⚠️ **Future:** User authentication for `created_by` field
5. ⚠️ **Future:** Note sharing/export functionality
6. ⚠️ **Future:** Note templates
7. ⚠️ **Future:** Rich text editing (TipTap integration)

---

## 📚 **Related Files**

- **Component:** `frontend/app/components/dialogs/NotesDialog.tsx`
- **Page:** `frontend/app/patients/page.tsx`
- **Header:** `frontend/app/components/ContactHeader.tsx`
- **Backend Model:** `backend/notes/models.py`
- **Backend Views:** `backend/notes/views.py`
- **Backend Serializers:** `backend/notes/serializers.py`
- **API Routes:** `backend/ncc_api/urls.py`

---

## 🐛 **Known Issues**

- None currently

---

## 📋 **Testing Checklist**

- ✅ Create note for patient
- ✅ Edit existing note
- ✅ Delete note
- ✅ View note details
- ✅ Badge count updates correctly
- ✅ Badge appears/disappears based on count
- ✅ AI rewrite works for Clinical Notes
- ✅ Notes persist after page refresh
- ✅ Multiple note types supported
- ✅ Error handling for API failures

