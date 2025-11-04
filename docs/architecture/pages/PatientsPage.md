# Patients Page

**Route:** `/patients`  
**Status:** ✅ Built (UI Complete, Filter Working, Needs Patient API Connection)  
**Last Updated:** November 4, 2025

---

## 📋 **Purpose**

The Patients page provides a comprehensive view for managing patient contacts. It displays a list of patients in a left sidebar and detailed patient information in the main content area. This is the primary interface for viewing and editing patient data.

---

## 🎨 **UI Components**

### **Layout**
- ✅ Header bar with search, filters, and actions (fixed at top)
- ✅ Left sidebar (25% width) - Patient list (independently scrollable)
- ✅ Right panel (75% width) - Patient detail form (fixed/stationary)
- ✅ Independent scrolling: Left list scrolls while right panel stays fixed
- ✅ Flexbox layout for proper height management

### **Left Sidebar - Patient List**
- ✅ Search bar with filter button
- ✅ Patient list items showing:
  - Patient name (title + first + last)
  - Clinic name (badge) - Linked to Clinic settings
  - Funding type (badge) - Linked to Funding Source settings
- ✅ Selected state highlighting
- ✅ Hover effects

### **Filter Component** 🔍 ✅ **IMPLEMENTED**
- ✅ **Filter Icon Button** - Funnel icon, opens popover
- ✅ **Filter Popover** - Contains filter dropdowns:
  - **Funding Source dropdown** - Currently hardcoded (NDIS, Private, DVA, Workers Comp, Medicare)
    - **TODO:** Load from `/api/settings/funding-sources/` when endpoint exists
  - **Clinic dropdown** - ✅ **Loads from API** (`/api/clinics/`)
    - Falls back to hardcoded list if API fails
    - Extracts clinic names from API response
  - **Status dropdown** - Active, Inactive, Archived
- ✅ **Apply Filters** button - Filters patient list
- ✅ **Clear Filters** button - Resets all filters
- ✅ **Filter Logic** - Filters by clinic, funding, and search query
- ✅ **Search Integration** - Search works together with active filters

### **Right Panel - Patient Detail Form**

#### **Column 1: Name & DOB**
- ✅ Title dropdown (Mr., Mrs., Ms., Dr.)
- ✅ First Name input
- ✅ Middle Name input (optional)
- ✅ Last Name input
- ✅ Date of Birth input (with calendar icon)
  - **Format:** Displays as "DD MMM YYYY" (e.g., "25 Jun 1949")
  - **Storage:** ISO format (YYYY-MM-DD) in database
  - **Formatting:** Uses `formatDateOnlyAU` utility with Luxon
- ✅ Age display (calculated from DOB)

#### **Column 2: Health & Clinic**
- ✅ Health Number input
- ✅ **Clinic dropdown** 
  - Currently hardcoded: Newcastle, Tamworth, Port Macquarie, Armidale
  - **Settings Requirement:** Clinics must be managed in Settings
  - **Data Model:** Should be ForeignKey to `clinics` table
  - **Usage:** Linked to patients, calendar, and clinicians
  - **Clinic Details Needed:**
    - Name (e.g., "Walk Easy Tamworth")
    - ABN (Australian Business Number)
    - Phone
    - Email
    - Address (JSON format)
    - Used in calendar for location-based scheduling
- ✅ **Funding dropdown**
  - Currently hardcoded: NDIS, Private, DVA, Workers Comp, Medicare
  - **Settings Requirement:** Funding sources must be managed in Settings
  - Users should be able to:
    - Add new funding sources
    - Edit existing funding sources
    - Remove/archive funding sources
  - **Data Model:** Should be Enum or separate table for funding types

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
- **Clinic** - ForeignKey to Clinic model ⚠️ **SHOULD BE FK TO CLINIC**
  - Currently: Hardcoded string dropdown
  - Should be: ForeignKey to `clinics` table
  - **Settings:** Clinics managed in Settings → Clinics
  - **Usage:** Linked to calendar, clinicians, patients
- **Funding Type** - ForeignKey to FundingSource or Enum ❌ **NOT IN CURRENT MODEL**
  - Currently: Hardcoded dropdown
  - Should be: ForeignKey to `funding_sources` table or Enum
  - **Settings:** Funding sources managed in Settings → Funding Sources

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
- ❌ `funding_type` - ForeignKey to FundingSource or CharField/Enum
  - **Settings Requirement:** Funding sources managed in Settings
  - Options loaded from Settings API
- ❌ `clinic_id` - ForeignKey to Clinic (currently clinic is just a string)
  - **Settings Requirement:** Clinics managed in Settings
  - Clinic details used in calendar, linked to patients and clinicians
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

1. **Add New Contact** ➕ **CONTEXT-AWARE** ⚠️ **TODO**
   - Blue "+" button in header
   - **Context-Aware:** Detects active contact type tab (Patients, Referrers, Coordinators, etc.)
   - Opens type-specific create dialog/form based on `activeType`
   - Passes `activeType` to handler: `handleAddNew(activeType)`
   - **Implementation:** Needs type-specific create dialogs for each contact type
   - **Status:** ⚠️ TODO - Handler exists but needs implementation

2. **Archive Contact** 📦 **SOFT DELETE** ⚠️ **TODO**
   - Grey archive button in header
   - **Never deletes records** - Always archives them instead
   - Sets `archived = True`, `archived_at = now()`, `active = False`
   - Archived contacts remain in database for historical records
   - Can be restored later by setting `archived = False` and `active = True`
   - **API Endpoint:** `PATCH /api/{type}/:id/archive` (soft delete)
   - **Status:** ⚠️ TODO - Handler exists but needs implementation

3. **Search Patients** ✅ **IMPLEMENTED**
   - Search by name (real-time filtering) ✅
   - Works together with active filters ✅
   - **TODO:** Search by health number, MRN (when fields exist)

4. **Filter Patients** 🔍 ✅ **IMPLEMENTED**
   - **Filter Icon Button** - Opens filter popover ✅
   - **Funding Source Filter** - Dropdown to filter by funding type ✅
     - Options: NDIS, Private, DVA, Workers Comp, Medicare (hardcoded)
     - **Status:** Working with hardcoded list
     - **TODO:** Load from `/api/settings/funding-sources/` when endpoint exists
     - **Settings Requirement:** Funding sources must be managed in Settings page
   - **Clinic Filter** - Dropdown to filter by clinic ✅
     - **Status:** ✅ **Loads from API** (`/api/clinics/`)
     - Falls back to hardcoded list (Newcastle, Tamworth, Port Macquarie, Armidale) if API fails
     - **Settings Requirement:** Clinics managed in Settings page (backend exists)
     - Clinics are linked to:
       - **Patients** (when assigning clinic to patient)
       - **Calendar** (for scheduling appointments)
       - **Users/Clinicians** (clinic assignment)
   - **Status Filter** - Dropdown to filter by status ✅
     - Options: Active, Inactive, Archived
   - **Apply Filters** - Button to apply selected filters ✅ **Working**
     - Filters patient list based on selected criteria
     - Combines multiple filters (clinic + funding + search)
   - **Clear Filters** - Button to reset all filters ✅ **Working**
   - **Filter Count** - Shows filtered count vs total count in header ✅

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
- [x] **Filter Functionality** - Filter popover implemented ✅
- [x] **Clinic API Integration** - Loads clinics from `/api/clinics/` ✅
- [x] **Funding Sources API** - Endpoint created and connected ✅
- [x] **API Design** - Patient endpoints defined ✅
- [x] **Database Design** - Patient model fields identified ✅
- [x] **Backend Built** - Patient API endpoints implemented ✅
- [x] **Database Created** - Missing fields added to Patient model ✅
- [x] **Connected** - Frontend connected to Patient API ✅
- [x] **Date Formatting** - Fixed Luxon format strings, displays as "DD MMM YYYY" ✅
- [x] **Scroll Behavior** - Left list scrolls independently, right panel fixed ✅
- [x] **Tested** - Basic functionality verified ✅
- [x] **Documented** - Implementation documented ✅

---

## 📝 **Notes**

### **Current Implementation**
- ✅ Connected to `/api/patients/` API endpoint
- ✅ Loads clinics from `/api/clinics/` API
- ✅ Loads funding sources from `/api/settings/funding-sources/` API
- ✅ Date formatting: Displays as "DD MMM YYYY" (e.g., "25 Jun 1949")
- ✅ Independent scrolling: Left list scrolls, right panel fixed
- ⚠️ All fields are displayed but not yet editable/saveable (read-only for now)

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

