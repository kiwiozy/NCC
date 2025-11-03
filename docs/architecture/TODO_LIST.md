# 📋 TODO List - Patients & Contacts Implementation

**Purpose:** Track all tasks needed to complete the Patients/Contacts feature and related Settings  
**Last Updated:** November 4, 2025  
**Status:** 🔴 In Progress

---

## 🎯 **Priority 1: Settings Management**

### **1. Funding Sources Management** ⚠️ **NOT STARTED**

#### Backend Tasks:
- [ ] Create `FundingSource` model in new `settings` app
  - Fields: `id`, `name`, `code`, `active`, `order`, `created_at`, `updated_at`
  - Order by `order`, then `name`
- [ ] Create migration for `FundingSource` model
- [ ] Create `FundingSourceSerializer`
- [ ] Create `FundingSourceViewSet` (CRUD operations)
- [ ] Add URL routing: `/api/settings/funding-sources/`
- [ ] Add default funding sources via migration or fixture:
  - NDIS
  - Private
  - DVA
  - Workers Comp
  - Medicare

#### Frontend Tasks:
- [ ] Create `FundingSourcesSettings.tsx` component
  - List view with Add button
  - Each row: Name, Code, Active toggle, Order, Actions
  - Edit/Delete buttons
  - Drag to reorder (optional enhancement)
- [ ] Add "Funding Sources" tab to Settings page
- [ ] Connect to API (`GET /api/settings/funding-sources/`)
- [ ] Implement Add/Edit/Delete functionality
- [ ] Update Patients page filter to load from API
- [ ] Update Patients page detail form dropdown to load from API

---

### **2. Clinics Management** ⚠️ **PARTIAL - BACKEND EXISTS**

#### Backend Tasks:
- [x] Clinic model exists (`backend/clinicians/models.py`)
- [x] Clinic API exists (`GET /api/clinics/`)
- [ ] Add `active` field to Clinic model
- [ ] Add `order` field to Clinic model
- [ ] Add `color_hex` field to Clinic model
- [ ] Create migration for new fields
- [ ] Update ClinicSerializer to include new fields
- [ ] Update Clinic admin to include new fields

#### Frontend Tasks:
- [ ] Create `ClinicsSettings.tsx` component
  - List view with Add button
  - Each row: Name, ABN, Phone, Email, Active toggle, Order, Actions
  - Edit/Delete buttons
  - Form fields: Name, ABN, Phone, Email, Address (JSON), Color picker
- [ ] Add "Clinics" tab to Settings page
- [ ] Connect to existing API (`GET /api/clinics/`)
- [ ] Implement Add/Edit/Delete functionality
- [ ] Update Patients page filter to load from API
- [ ] Update Patients page detail form dropdown to load from API
- [ ] Update Calendar to load clinics from API

---

## 🎯 **Priority 2: Patient Model Updates**

### **3. Patient Model Enhancements** ⚠️ **NOT STARTED**

#### Backend Tasks:
- [ ] Add `title` field to Patient model (CharField with choices)
- [ ] Add `health_number` field to Patient model
- [ ] Add `funding_type` ForeignKey to FundingSource
- [ ] Add `clinic_id` ForeignKey to Clinic (replace hardcoded string)
- [ ] Add `coordinator_name` field
- [ ] Add `coordinator_date` field
- [ ] Add `plan_start_date` field
- [ ] Add `plan_end_date` field
- [ ] Add `notes` field (or clarify if using `flags_json`)
- [ ] Create migration for all new fields
- [ ] Update PatientSerializer to include new fields
- [ ] Update Patient admin to include new fields

#### Data Migration:
- [ ] Migrate existing hardcoded clinic strings to Clinic ForeignKeys
- [ ] Migrate existing hardcoded funding types to FundingSource ForeignKeys

---

## 🎯 **Priority 3: Patients Page API Integration**

### **4. Connect Patients Page to Backend** ⚠️ **NOT STARTED**

#### API Endpoints Needed:
- [x] `GET /api/patients/` - List all patients (exists?)
- [ ] `GET /api/patients/?search=` - Search patients
- [ ] `GET /api/patients/?clinic=` - Filter by clinic
- [ ] `GET /api/patients/?funding=` - Filter by funding
- [ ] `GET /api/patients/?status=` - Filter by status
- [ ] `GET /api/patients/:id` - Get single patient
- [ ] `POST /api/patients/` - Create new patient
- [ ] `PUT /api/patients/:id` - Update patient
- [ ] `DELETE /api/patients/:id` - Archive patient (soft delete)

#### Frontend Tasks:
- [ ] Replace mock data with API calls
- [ ] Implement search functionality (connect to API)
- [ ] Implement filter functionality (connect to API)
- [ ] Implement patient selection (load details from API)
- [ ] Implement patient editing (save to API)
- [ ] Implement add new patient (create via API)
- [ ] Implement archive patient (soft delete via API)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success/error notifications

---

## 🎯 **Priority 4: Patient Form Enhancements**

### **5. Patient Detail Form Features** ⚠️ **PARTIAL - UI EXISTS**

#### Form Fields Status:
- [x] Title dropdown (UI exists)
- [x] First Name input (UI exists)
- [x] Middle Name input (UI exists)
- [x] Last Name input (UI exists)
- [x] Date of Birth input (UI exists)
- [x] Age display (calculated, UI exists)
- [x] Health Number input (UI exists)
- [x] Clinic dropdown (UI exists, needs API connection)
- [x] Funding dropdown (UI exists, needs API connection)
- [x] Coordinator selector (UI exists, needs functionality)
- [x] Plan Dates display (UI exists, needs functionality)
- [x] Communication section (UI exists, needs API connection)
- [x] Notes section (UI exists, needs API connection)

#### Tasks:
- [ ] Connect all form fields to Patient model
- [ ] Implement coordinator selector functionality
- [ ] Implement plan dates picker (date range)
- [ ] Implement communication methods (add/remove multiple phones/emails)
- [ ] Implement save functionality
- [ ] Add form validation
- [ ] Add dirty state tracking (prompt before leaving unsaved changes)

---

## 🎯 **Priority 5: Additional Features**

### **6. Patient Actions Menu** ⚠️ **UI EXISTS, FUNCTIONALITY NEEDED**

The hamburger menu has these items (all need implementation):
- [ ] Notes
- [ ] Documents
- [ ] Images
- [ ] Appointments
- [ ] Accounts | Quotes
- [ ] Orders
- [ ] Evaluation
- [ ] Letters
- [ ] SMS
- [ ] PDFs
- [ ] NDIS
- [ ] Workshop Notes

### **7. Archive Functionality** ⚠️ **NOT IMPLEMENTED**

- [ ] Implement archive button functionality
- [ ] Add archive view/filter
- [ ] Add restore functionality
- [ ] Add permanent delete functionality (optional)

---

## 🎯 **Priority 6: Calendar Integration**

### **8. Connect Clinics to Calendar** ⚠️ **NOT STARTED**

- [ ] Update Calendar to load clinics from API
- [ ] Add clinic selection to appointment creation
- [ ] Display clinic name in calendar events
- [ ] Use clinic color for calendar display
- [ ] Add clinic filter to calendar

---

## 📊 **Progress Summary**

### **By Category:**

| Category | Total Tasks | Completed | In Progress | Not Started |
|----------|-------------|-----------|-------------|-------------|
| Settings - Funding Sources | 11 | 0 | 0 | 11 |
| Settings - Clinics | 11 | 2 | 0 | 9 |
| Patient Model | 11 | 0 | 0 | 11 |
| API Integration | 9 | 0 | 0 | 9 |
| Form Enhancements | 8 | 0 | 0 | 8 |
| Additional Features | 13 | 0 | 0 | 13 |
| Calendar Integration | 5 | 0 | 0 | 5 |
| **TOTAL** | **68** | **2** | **0** | **66** |

### **By Priority:**

- **Priority 1 (Settings):** 22 tasks - 2 complete, 20 remaining
- **Priority 2 (Patient Model):** 11 tasks - 0 complete, 11 remaining
- **Priority 3 (API Integration):** 9 tasks - 0 complete, 9 remaining
- **Priority 4 (Form Enhancements):** 8 tasks - 0 complete, 8 remaining
- **Priority 5 (Additional Features):** 13 tasks - 0 complete, 13 remaining
- **Priority 6 (Calendar Integration):** 5 tasks - 0 complete, 5 remaining

---

## 🚀 **Recommended Implementation Order**

1. **Start with Settings (Priority 1)**
   - Build Funding Sources (backend + frontend)
   - Build Clinics Settings UI (frontend only, backend exists)
   - This enables dropdowns to work properly

2. **Update Patient Model (Priority 2)**
   - Add all new fields
   - Create migrations
   - This provides the data structure

3. **Connect API (Priority 3)**
   - Build/update API endpoints
   - Connect frontend to backend
   - This makes the page functional

4. **Enhance Forms (Priority 4)**
   - Add missing functionality
   - Improve UX
   - This completes the core feature

5. **Additional Features (Priority 5)**
   - Menu actions
   - Archive functionality
   - This adds polish

6. **Calendar Integration (Priority 6)**
   - Connect clinics to calendar
   - This completes the integration

---

## 📝 **Notes**

- **Protected Files:** Be careful not to modify protected files without permission
- **Git Workflow:** Always work on feature branches
- **Testing:** Test each feature before moving to the next
- **Documentation:** Update docs as you build

---

## 🔗 **Related Documentation**

- [Patients Page](./pages/PatientsPage.md)
- [Settings Requirements](./settings/SETTINGS_REQUIREMENTS.md)
- [Approach for Patients](./APPROACH_PATIENTS.md)

