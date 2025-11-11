# 📄 Page Inventory & Data Requirements

**Approach:** Build pages first → Identify data needs → Design database schema

---

## 🎯 **Current Pages (Existing)**

### **1. Dashboard (`/`)**
**Purpose:** Overview and key metrics

**Data Needed:**
- ✅ Today's appointments count
- ✅ Total patients count
- ✅ Pending orders count
- ✅ Upcoming appointments (7 days)

**Tables Required:**
- `appointments` (filter by date)
- `patients` (count)
- `orders` (filter by status = pending) ❌ **MISSING**

**Status:** Partially functional (needs Orders table)

---

### **2. Patients Page (`/patients`)**
**Purpose:** Patient search, list, and management

**Data Needed:**
- ✅ Patient list (searchable)
- ✅ Patient details (name, DOB, contact)
- ✅ Patient creation/editing
- ❌ Patient documents (linked)
- ❌ Patient appointments history
- ❌ Patient orders history

**Tables Required:**
- `patients` ✅
- `documents` (linked to patients) ⚠️ Needs patient FK
- `appointments` (patient history)
- `orders` (patient orders) ❌ **MISSING**

**Status:** Basic functionality, needs enhancements

---

### **3. Calendar Page (`/calendar`)**
**Purpose:** Appointment scheduling and viewing

**Data Needed:**
- ✅ Appointments list (by date/clinic)
- ✅ Appointment details (patient, clinician, time)
- ✅ Appointment creation/editing
- ✅ Drag & drop rescheduling
- ❌ Appointment reminders
- ❌ Appointment notes/encounters

**Tables Required:**
- `appointments` ✅
- `patients` ✅
- `clinicians` ✅
- `clinics` ✅
- `encounters` ✅ (linked to appointments)

**Status:** Fully functional

---

### **4. Settings Page (`/settings`)**
**Purpose:** System configuration

**Tabs:**
- General Settings
- Gmail Integration ✅
- Letters ✅
- Xero Integration ✅
- SMS Integration ✅
- S3 Integration ✅
- Notes Test ✅
- AT Reports ✅
- Notifications (coming soon)

**Status:** Mostly functional

---

## 🚧 **Pages Needed (To Build)**

### **5. Patient Detail Page (`/patients/[id]`)**
**Purpose:** View complete patient information

**Data Needed:**
- Patient basic info
- Contact details
- Address
- Medical history
- All appointments (past & future)
- All orders (past & current)
- All invoices (paid & unpaid)
- All documents (medical, prescriptions, etc.)
- Emergency contacts
- Risk flags/alerts
- Notes/clinical notes

**Tables Required:**
- `patients` ✅
- `appointments` ✅
- `encounters` ✅
- `orders` ❌ **MISSING**
- `invoices` ❌ **MISSING**
- `documents` ⚠️ Needs patient FK
- `patient_notes` ❌ **MISSING** (or use flags_json?)

**Status:** ❌ **NOT BUILT**

---

### **6. Orders Page (`/orders`)**
**Purpose:** Manage patient orders (footwear, orthoses, etc.)

**Data Needed:**
- Order list (all orders)
- Order details:
  - Patient info
  - Order type (footwear, orthoses, etc.)
  - Order items/specifications
  - Status (draft, confirmed, in_progress, completed, cancelled)
  - Clinician who created it
  - Dates (created, confirmed, completed)
  - Linked invoice
- Order creation/editing
- Order status updates
- Order search/filter

**Tables Required:**
- `orders` ❌ **MISSING**
  - `id` (UUID)
  - `patient_id` (FK)
  - `clinician_id` (FK)
  - `order_type` (text)
  - `status` (text)
  - `details_json` (JSONB - items, specifications)
  - `created_at`, `updated_at`
- `patients` ✅
- `clinicians` ✅
- `invoices` (linked) ❌ **MISSING**

**Status:** ❌ **NOT BUILT**

---

### **7. Order Detail Page (`/orders/[id]`)**
**Purpose:** View and manage a specific order

**Data Needed:**
- Full order details
- Order items/line items
- Status history
- Linked appointment/encounter
- Linked invoice
- Documents (measurements, prescriptions, etc.)
- Notes/comments

**Tables Required:**
- `orders` ❌ **MISSING**
- `order_items` ❌ **MISSING** (or use details_json?)
- `order_status_history` ❌ **MISSING** (or audit trail?)
- `invoices` ❌ **MISSING**
- `documents` (linked to order)

**Status:** ❌ **NOT BUILT**

---

### **8. Invoices Page (`/invoices`)**
**Purpose:** Manage invoices and payments

**Data Needed:**
- Invoice list (all invoices)
- Invoice details:
  - Patient info
  - Linked order (if applicable)
  - Line items
  - Total amount
  - Status (unpaid, part_paid, paid, void)
  - Dates (issued, due, paid)
  - Payment history
- Invoice creation
- Payment recording
- Invoice search/filter

**Tables Required:**
- `invoices` ❌ **MISSING**
  - `id` (UUID)
  - `order_id` (FK, optional)
  - `patient_id` (FK)
  - `total_cents` (BigInt)
  - `currency` (text, default 'AUD')
  - `status` (text)
  - `issued_at`, `due_at` (timestamps)
  - `created_at`, `updated_at`
- `invoice_line_items` ❌ **MISSING** (or use JSON?)
- `payments` ❌ **MISSING** (or use JSON?)
- `patients` ✅
- `orders` ❌ **MISSING**

**Status:** ❌ **NOT BUILT**

---

### **9. Invoice Detail Page (`/invoices/[id]`)**
**Purpose:** View and manage a specific invoice

**Data Needed:**
- Full invoice details
- Line items
- Payment history
- Linked order
- Patient info
- PDF generation
- Email sending

**Tables Required:**
- `invoices` ❌ **MISSING**
- `invoice_line_items` ❌ **MISSING**
- `payments` ❌ **MISSING**
- `orders` ❌ **MISSING**

**Status:** ❌ **NOT BUILT**

---

### **10. Documents Page (`/documents`)**
**Purpose:** Document management and viewing

**Data Needed:**
- Document list (all documents)
- Filter by:
  - Patient
  - Category/type
  - Date range
  - Uploaded by
- Document details:
  - Patient link
  - Encounter link (if applicable)
  - File info (name, size, type)
  - Upload date
  - Uploaded by
- Document upload
- Document download
- Document deletion

**Tables Required:**
- `documents` ⚠️ Needs refactoring
  - Currently uses generic FK
  - Should have direct `patient_id` FK
  - Should have `encounter_id` FK (optional)
- `document_assets` ❌ **MISSING** (separate storage metadata)
- `patients` ✅
- `encounters` ✅

**Status:** ⚠️ **PARTIALLY BUILT** (needs refactoring)

---

### **11. Patient Documents Page (`/patients/[id]/documents`)**
**Purpose:** View all documents for a specific patient

**Data Needed:**
- Patient info
- All documents linked to patient
- Filter by category/type
- Document upload
- Document viewing

**Tables Required:**
- `documents` (with patient FK) ⚠️
- `patients` ✅

**Status:** ❌ **NOT BUILT**

---

### **12. Reports Page (`/reports`)**
**Purpose:** Generate various reports

**Data Needed:**
- Report types:
  - Sales reports (by date, clinician, clinic)
  - Patient reports (new patients, active patients)
  - Appointment reports (attendance, no-shows)
  - Order reports (pending, completed)
  - Invoice reports (unpaid, revenue)
- Date range filters
- Export options

**Tables Required:**
- All tables (aggregated queries)

**Status:** ❌ **NOT BUILT**

---

## 📊 **Data Requirements Summary**

### **Tables Needed (High Priority)**

1. **`orders`** ❌
   - Core business function
   - Needed for: Dashboard, Orders pages, Patient detail

2. **`invoices`** ❌
   - Billing essential
   - Needed for: Invoices pages, Order detail, Patient detail

3. **`document_assets`** ❌
   - Better document structure
   - Needed for: Documents pages, Patient documents

### **Tables Needed (Medium Priority)**

4. **`invoice_line_items`** ❌
   - Or use JSON in invoices?
   - Needed for: Invoice detail page

5. **`payments`** ❌
   - Or use JSON in invoices?
   - Needed for: Invoice detail, payment tracking

6. **`order_items`** ❌
   - Or use JSON in orders?
   - Needed for: Order detail page

### **Model Updates Needed**

- **`documents`** ⚠️
  - Add direct `patient_id` FK (instead of generic FK)
  - Add `encounter_id` FK (optional)
  - Link to `document_assets` table

---

## 🎯 **Recommended Build Order**

### **Phase 1: Patient Detail (Foundation)**
1. Build `/patients/[id]` page
2. Discover what data is missing
3. Add missing fields to models

### **Phase 2: Orders System**
1. Build `/orders` list page
2. Design Orders model from UI needs
3. Build `/orders/[id]` detail page
4. Create Orders table

### **Phase 3: Invoices System**
1. Build `/invoices` list page
2. Design Invoices model from UI needs
3. Build `/invoices/[id]` detail page
4. Create Invoices table

### **Phase 4: Documents Refactoring**
1. Build `/documents` page
2. Refactor Documents model
3. Create document_assets table

---

## ✅ **Next Steps**

1. **Start with Patient Detail Page** (`/patients/[id]`)
   - Shows all patient-related data in one place
   - Reveals what's missing
   - Foundation for everything else

2. **Then Build Orders Pages**
   - Core business function
   - Clear data requirements

3. **Then Build Invoices Pages**
   - Depends on Orders
   - Financial tracking

**This approach ensures we only build tables for what the UI actually needs!**

---

**Last Updated:** November 4, 2025  
**Status:** Planning Phase  
**Approach:** Frontend-first → Database design

