# Patients Page

**Route:** `/patients`  
**Status:** ✅ Built (UI Complete, Needs API Connection)  
**Last Updated:** November 4, 2025

---

## 📋 **Purpose**

The Patients page provides a comprehensive view for managing patient contacts. It displays a list of patients in a left sidebar and detailed patient information in the main content area. This is the primary interface for viewing and editing patient data.

---

## 🎨 **UI Components**

### **Layout**
- ✅ Header bar with search, filters, and actions
- ✅ Left sidebar (25% width) - Patient list
- ✅ Right panel (75% width) - Patient detail form
- ✅ Scrollable areas for both panels

### **Left Sidebar - Patient List**
- ✅ Search bar with filter button
- ✅ Patient list items showing:
  - Patient name (title + first + last)
  - Clinic name (badge)
  - Funding type (badge)
- ✅ Selected state highlighting
- ✅ Hover effects

### **Right Panel - Patient Detail Form**

#### **Column 1: Name & DOB**
- ✅ Title dropdown (Mr., Mrs., Ms., Dr.)
- ✅ First Name input
- ✅ Middle Name input (optional)
- ✅ Last Name input
- ✅ Date of Birth input (with calendar icon)
- ✅ Age display (calculated from DOB)

#### **Column 2: Health & Clinic**
- ✅ Health Number input
- ✅ Clinic dropdown (Newcastle, Tamworth, Port Macquarie, Armidale)
- ✅ Funding dropdown (NDIS, Private, DVA, Workers Comp, Medicare)

#### **Column 3: Coordinator & Plans**
- ✅ Coordinator selector (with add button)
  - Shows coordinator name and date
  - Or "Select coordinator" placeholder
- ✅ Reminder button (with add icon)
- ✅ Current Plan Dates display
  - Shows date range or "No plan dates set"
  - Add buttons for plan dates

#### **Full Width Sections**
- ✅ Communication section
  - Phone Home (with label)
  - Email Home (with label)
  - Add button to add more communication methods
- ✅ Note section
  - Large textarea for additional notes

---

## 📊 **Data Requirements**

### **Data Displayed**

#### **Patient Basic Info**
- **Title** - Mr., Mrs., Ms., Dr. (currently string, could be enum)
- **First Name** - Text (required)
- **Middle Name** - Text (optional)
- **Last Name** - Text (required)
- **Date of Birth** - Date (required for age calculation)
- **Age** - Calculated from DOB (not stored)

#### **Patient Medical/Health**
- **Health Number** - Text (optional) ❌ **NOT IN CURRENT MODEL**
- **MRN** - Medical Record Number (exists in model, but not displayed)

#### **Patient Clinic/Organization**
- **Clinic** - String (currently hardcoded list) ⚠️ **SHOULD BE FK TO CLINIC**
- **Funding Type** - Enum (NDIS, Private, DVA, Workers Comp, Medicare) ❌ **NOT IN CURRENT MODEL**

#### **NDIS Specific**
- **Coordinator** - Object with:
  - `name` - String (e.g., "Warda - Ability Connect") ❌ **NOT IN CURRENT MODEL**
  - `date` - Date (e.g., "30/10/2025") ❌ **NOT IN CURRENT MODEL**
- **Plan Dates** - Date range string (e.g., "17 Jul 2024 - 27 Jul 2024") ❌ **NOT IN CURRENT MODEL**

#### **Communication**
- **Phone** - Text (from `contact_json`) ✅ Exists in model
- **Email** - Text (from `contact_json`) ✅ Exists in model
- Structure: `contact_json.phone` and `contact_json.email`

#### **Notes**
- **Note** - Text (general notes) ⚠️ **Could use `flags_json` or separate field**

---

## 🔌 **API Endpoints Needed**

### **GET Endpoints**
- `GET /api/patients/` - List all patients
  - Query params: `?search=`, `?clinic=`, `?funding=`, `?status=`
  - Returns: Array of patient objects

- `GET /api/patients/:id` - Get single patient
  - Returns: Full patient object with all details

### **POST Endpoints**
- `POST /api/patients/` - Create new patient
  - Payload: Patient object with all fields
  - Returns: Created patient

### **PUT/PATCH Endpoints**
- `PUT /api/patients/:id` - Update patient
  - Payload: Patient object (partial updates)
  - Returns: Updated patient

### **DELETE Endpoints**
- `DELETE /api/patients/:id` - Delete/archive patient (soft delete)
  - Returns: Success status

---

## 🗄️ **Database Requirements**

### **Tables Needed**

#### **1. `patients` Table** ✅ EXISTS (needs updates)

**Current Fields:**
- ✅ `id` - UUID
- ✅ `mrn` - Medical Record Number
- ✅ `first_name` - Text
- ✅ `last_name` - Text
- ✅ `middle_names` - Text (optional)
- ✅ `dob` - Date
- ✅ `sex` - Enum (M/F/O/U)
- ✅ `contact_json` - JSON (phones, emails)
- ✅ `address_json` - JSON
- ✅ `emergency_json` - JSON
- ✅ `flags_json` - JSON (risk flags, alerts)

**Missing Fields Needed:**
- ❌ `title` - CharField (Mr., Mrs., Ms., Dr.) or Enum
- ❌ `health_number` - CharField (optional) - Different from MRN
- ❌ `funding_type` - CharField or Enum (NDIS, Private, DVA, Workers Comp, Medicare)
- ❌ `clinic_id` - ForeignKey to Clinic (currently clinic is just a string)
- ❌ `coordinator_name` - CharField (optional) - Coordinator name
- ❌ `coordinator_date` - DateField (optional) - When coordinator was assigned
- ❌ `plan_start_date` - DateField (optional) - NDIS plan start
- ❌ `plan_end_date` - DateField (optional) - NDIS plan end
- ❌ `notes` - TextField (optional) - General notes (or use flags_json?)

**Relationships Needed:**
- ⚠️ `clinic` - Should be ForeignKey to `clinics` table (currently missing)

---

### **Missing Tables**

#### **2. `coordinators` Table** ❌ NEW TABLE (Optional - could be JSON or separate table)

**If we want to track coordinators separately:**
- `id` - UUID
- `name` - Text
- `organization` - Text (e.g., "Ability Connect")
- `phone` - Text (optional)
- `email` - Text (optional)
- `created_at`, `updated_at` - Timestamps

**Then patient would have:**
- `coordinator_id` - ForeignKey to coordinators (optional)

**OR** - Keep as simple fields in patient:
- `coordinator_name` - Text
- `coordinator_date` - Date

**Decision Needed:** Separate table or simple fields?

---

### **Model Updates Summary**

**Patient Model Needs:**
1. Add `title` field (enum or char)
2. Add `health_number` field
3. Add `funding_type` field (enum)
4. Add `clinic_id` FK (instead of string)
5. Add `coordinator_name` and `coordinator_date` fields
6. Add `plan_start_date` and `plan_end_date` fields
7. Add `notes` field (or clarify if using flags_json)

---

## 🎯 **User Actions**

### **Available Actions**
1. **Search Patients**
   - Search by name, health number, MRN
   - Real-time filtering

2. **Filter Patients**
   - By clinic
   - By funding type
   - By status (Active, Inactive, Archived)

3. **Select Patient**
   - Click patient in list
   - View details in right panel

4. **Edit Patient** (Currently read-only)
   - Edit all fields in the form
   - Save changes

5. **Add New Patient**
   - Click "+" button
   - Opens create dialog (not yet built)

6. **Archive Patient**
   - Click archive button
   - Soft delete/archive

7. **Menu Actions** (Hamburger menu)
   - Notes, Documents, Images, Appointments, Accounts/Quotes, Orders, Evaluation, Letters, SMS, PDFs, NDIS, Workshop Notes

---

## ✅ **Status Checklist**

- [x] **Design** - UI mockup created
- [x] **Component Structure** - Components identified
- [x] **Frontend Built** - Page component created
- [ ] **API Design** - Endpoints defined
- [ ] **Database Design** - Tables/fields identified
- [ ] **Backend Built** - API endpoints implemented
- [ ] **Database Created** - Missing fields added
- [ ] **Connected** - Frontend connected to backend
- [ ] **Tested** - Functionality verified
- [ ] **Documented** - This doc completed

---

## 📝 **Notes**

### **Current Implementation**
- Uses mock data (`mockContacts` array)
- All fields are editable but not saved
- No API connection yet
- Clinic is hardcoded dropdown (not FK to Clinic model)

### **Decisions Needed**

1. **Coordinator Storage:**
   - Option A: Simple fields (`coordinator_name`, `coordinator_date`) in Patient
   - Option B: Separate `coordinators` table with FK
   - **Recommendation:** Start with Option A (simple), upgrade to B if needed

2. **Notes Storage:**
   - Option A: Add `notes` TextField to Patient
   - Option B: Use `flags_json` for notes
   - **Recommendation:** Add dedicated `notes` field (clearer)

3. **Plan Dates:**
   - Store as `plan_start_date` and `plan_end_date` (two DateFields)
   - Or store as JSON string?
   - **Recommendation:** Two separate DateFields (easier to query)

4. **Clinic Relationship:**
   - Currently clinic is a string
   - Should be ForeignKey to Clinic model
   - **Action:** Update Patient model to use `clinic_id` FK

5. **Funding Type:**
   - Should be Enum or CharField with choices?
   - **Recommendation:** CharField with choices (flexible)

---

## 🔗 **Related Pages/Dialogs**

- **Uses:** ContactHeader component
- **Will use:** CreatePatientDialog (not yet built)
- **Will link to:** Patient detail page `/patients/[id]` (when built)
- **Menu items link to:** Notes, Documents, Appointments, Orders, etc. (to be built)

---

## 🚀 **Next Steps**

1. **Document missing fields** ✅ Done
2. **Update Patient model** - Add missing fields
3. **Create migration** - Add fields to database
4. **Update API** - Add endpoints for patient CRUD
5. **Connect frontend** - Replace mock data with API calls
6. **Test** - Verify all functionality

---

**Next Action:** Update Patient model with missing fields

