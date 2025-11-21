# 📅 Calendar System - Complete TODO List

**Date:** November 21, 2025  
**Purpose:** Consolidated list of what's done vs what needs to be completed  
**Status:** 🟡 Partially Complete - Major work needed

---

## 📊 Current Reality Check

### ✅ **What's Actually Done:**

#### **Backend (Django) - COMPLETE**
- ✅ Clinic model with color field
- ✅ Clinician model with clinic relationships
- ✅ Appointment model with all fields
- ✅ AppointmentType lookup table
- ✅ AppointmentType API endpoints (`/api/appointment-types/`)
- ✅ AppointmentTypeViewSet with full CRUD
- ✅ Calendar API endpoint (`/api/appointments/calendar_data/`)
- ✅ FullCalendar-compatible serializers
- ✅ 11 clinics imported from FileMaker
- ✅ 8,329 appointments imported
- ✅ CRUD API endpoints for appointments
- ✅ Filtering by clinic, date range, patient, status
- ✅ Color-coded by status in API

#### **Frontend - PARTIAL**
- ✅ Basic FullCalendar component (`ClinicCalendar.tsx`)
- ✅ Clinic filter drawer (multi-select toggle)
- ✅ Color-coded events by clinic
- ✅ Drag & drop rescheduling (backend saves)
- ✅ Event resize (change duration)
- ✅ Month/Week/Day view switcher
- ✅ Business hours display (7 AM - 6 PM)
- ✅ API integration working
- ✅ Refresh button
- ✅ AppointmentsDialog (view patient appointment history)

#### **Settings - COMPLETE** ✅
- ✅ **Appointment Types** management UI - **NOW COMPLETE!** (Nov 21, 2025)
  - ✅ Component: `AppointmentTypesSettings.tsx`
  - ✅ Location: **Settings → Appointment Types** tab
  - ✅ Add/Edit/Delete appointment types (name + duration)
  - ✅ Active/Inactive toggle
  - ✅ Default types: Assessment (30 min), Fitting (15 min), Follow-up (15 min), Consultation (30 min), Review (20 min)
  - ✅ API endpoints: `/api/appointment-types/` (full CRUD with CSRF)
  - ✅ Database: `AppointmentType` model with `name`, `default_duration_minutes`, `is_active`
  - ⏳ Integration: Will auto-fill duration in CreateAppointmentDialog (once dialog is built)
  - ✅ Reporting ready: Can filter/report by appointment type (data tracked)
  - 📄 **Documentation:** `docs/features/APPOINTMENT_TYPES.md`

---

## ❌ **What's MISSING (Documented but Not Built):**

### 🔴 **CRITICAL - These dialogs DON'T EXIST:**

The documentation (`CALENDAR_IMPROVEMENTS_COMPLETE.md`) claims these were built on **Nov 12, 2025**, but they're **NOT in the codebase**:

1. **`AppointmentDetailsDialog.tsx`** - ❌ DOES NOT EXIST
   - Should handle: View/Edit/Delete appointment
   - Should show: Patient details, clinic, time, status, notes
   - Should have: "View Patient" button, status change, delete confirmation

2. **`CreateAppointmentDialog.tsx`** - ❌ DOES NOT EXIST
   - Should handle: Create new appointment
   - Should have: Patient search, clinic dropdown, date/time picker
   - Should have: Duration selector, appointment type, notes
   - Should have: Quick-add patient feature

3. **Calendar Integration** - ❌ NOT DONE
   - Current: Uses `alert()` popups (placeholder)
   - Needed: Integrate dialogs with calendar events
   - Needed: "New Appointment" button in calendar header

---

## 📋 **COMPLETE TODO LIST**

### **PHASE 1: Build Missing Dialogs** 🔴 **URGENT**

#### **Task 1.1: Create AppointmentDetailsDialog.tsx**
**File:** `frontend/app/components/dialogs/AppointmentDetailsDialog.tsx`

**Features needed:**
- [ ] Display appointment details (read-only mode)
  - [ ] Patient name (clickable → go to patient page)
  - [ ] Clinic name
  - [ ] Clinician name (if assigned)
  - [ ] Date & time (formatted for Australia/Sydney)
  - [ ] Duration
  - [ ] Appointment type
  - [ ] Status badge (color-coded)
  - [ ] Reason/notes
- [ ] Edit mode
  - [ ] Toggle "Edit" button
  - [ ] Change status dropdown
  - [ ] Edit notes/reason
  - [ ] "Save Changes" button
  - [ ] Auto-refresh calendar after save
- [ ] Delete appointment
  - [ ] "Delete" button
  - [ ] Confirmation modal
  - [ ] API call to delete
  - [ ] Auto-refresh calendar after delete
- [ ] Patient quick info
  - [ ] Show DOB, phone in dialog
  - [ ] "View Full Record" button → `/patients/{id}`
- [ ] Error handling
  - [ ] Show errors if save/delete fails
  - [ ] Loading states

**API Endpoints to use:**
```
GET   /api/appointments/{id}/           # Get details
PATCH /api/appointments/{id}/           # Update
DELETE /api/appointments/{id}/          # Delete
GET   /api/patients/{id}/               # Patient info
```

---

#### **Task 1.2: Create CreateAppointmentDialog.tsx**
**File:** `frontend/app/components/dialogs/CreateAppointmentDialog.tsx`

**Features needed:**
- [ ] Form fields
  - [ ] Patient search/select (searchable dropdown)
  - [ ] Clinic dropdown (all active clinics)
  - [ ] Date picker (default: clicked slot or today)
  - [ ] Time picker (default: clicked slot or now)
  - [ ] Duration selector (15, 30, 45, 60, 90, 120, 180 minutes)
  - [ ] Appointment type dropdown (optional, auto-fills duration)
  - [ ] Clinician dropdown (optional, filtered by clinic)
  - [ ] Reason/notes textarea (optional)
- [ ] Quick-add patient feature
  - [ ] "Patient not found?" message
  - [ ] "+ Add New Patient" button
  - [ ] Mini form: First name, Last name, Phone
  - [ ] API call to create patient
  - [ ] Auto-select newly created patient
- [ ] Validation
  - [ ] Patient required
  - [ ] Clinic required
  - [ ] Date/time required
  - [ ] Duration required (min 5, max 240)
- [ ] Smart defaults
  - [ ] Pre-fill date/time if slot clicked
  - [ ] Default duration: 30 minutes
  - [ ] Auto-fill duration when type selected
- [ ] Submit
  - [ ] Create appointment API call
  - [ ] Show success notification
  - [ ] Auto-refresh calendar
  - [ ] Close dialog
- [ ] Error handling
  - [ ] Show validation errors
  - [ ] Show API errors
  - [ ] Loading states

**API Endpoints to use:**
```
GET  /api/patients/?search={query}      # Search patients
POST /api/patients/                     # Quick-add patient
GET  /api/clinics/                      # Get clinics
GET  /api/clinicians/?clinic={id}       # Get clinicians (optional)
GET  /api/appointment-types/            # Get types
POST /api/appointments/                 # Create appointment
```

---

#### **Task 1.3: Integrate Dialogs with Calendar**
**File:** `frontend/app/components/ClinicCalendar.tsx`

**Changes needed:**
- [ ] Import both dialogs
- [ ] Add state management
  - [ ] `detailsDialogOpen` (boolean)
  - [ ] `createDialogOpen` (boolean)
  - [ ] `selectedAppointmentId` (string | null)
  - [ ] `selectedSlot` (DateSelectArg | null)
- [ ] Replace `alert()` in `handleEventClick()`
  - [ ] Set `selectedAppointmentId`
  - [ ] Open `AppointmentDetailsDialog`
- [ ] Replace `alert()` in `handleDateSelect()`
  - [ ] Set `selectedSlot` (date/time)
  - [ ] Open `CreateAppointmentDialog`
- [ ] Add "New Appointment" button in header
  - [ ] Button next to "Refresh"
  - [ ] Opens `CreateAppointmentDialog`
  - [ ] No pre-filled date/time (manual selection)
- [ ] Handle dialog close
  - [ ] Reset state
  - [ ] Refresh calendar data (`fetchAppointments()`)
- [ ] Render dialogs
  - [ ] `<AppointmentDetailsDialog ... />`
  - [ ] `<CreateAppointmentDialog ... />`

---

### **PHASE 2: Data Population** 🟡 **HIGH PRIORITY**

#### **Task 2.1: Populate Clinic Contact Details**
**Problem:** All clinics missing phone, email, ABN, address

**Action:**
- [ ] Gather real clinic data from business
- [ ] Update clinics via Django admin or API
- [ ] Required fields:
  - [ ] Phone number (for each clinic)
  - [ ] Email address
  - [ ] ABN (for invoicing)
  - [ ] Full address (street, suburb, state, postcode)
  - [ ] Color (for calendar display)
  - [ ] SMS reminder template (optional)

**API Endpoint:**
```
PATCH /api/clinics/{id}/
```

---

#### **Task 2.2: Add Real Clinicians**
**Problem:** Only sample data (Dr. Jane Smith, Dr. John Doe, Sarah Johnson)

**Action:**
- [ ] Remove sample clinicians
- [ ] Add real clinicians:
  - [ ] Craig (full details, credentials)
  - [ ] Jono (full details, credentials)
  - [ ] Any other staff
- [ ] Assign to primary clinics
- [ ] Set correct roles (Pedorthist, Admin, Reception)
- [ ] Add professional credentials
- [ ] Add contact details

**API Endpoint:**
```
POST /api/clinicians/
PATCH /api/clinicians/{id}/
DELETE /api/clinicians/{id}/  # Remove samples
```

---

#### **Task 2.3: Create Home Visit Clinics**
**Per requirements:** Need 2 separate home visit clinics

**Action:**
- [ ] Create "Home Visit - Craig" clinic
  - [ ] Color: Choose distinct color
  - [ ] Phone: Main clinic number
  - [ ] Email: Main clinic email
  - [ ] SMS template: "Craig will visit you at home..."
- [ ] Create "Home Visit - Jono" clinic
  - [ ] Color: Choose distinct color
  - [ ] Phone: Main clinic number
  - [ ] Email: Main clinic email
  - [ ] SMS template: "Jono will visit you at home..."
- [ ] Archive old generic "Home Visit" clinic (if exists)

**API Endpoint:**
```
POST /api/clinics/
```

---

### **PHASE 3: SMS Integration** 🟢 **FUTURE**

#### **Task 3.1: Automatic SMS Reminders**
**Requirement:** Day before at 9:00 AM

**Action:**
- [ ] Create Django management command
  - [ ] `send_appointment_reminders.py`
  - [ ] Query appointments for tomorrow
  - [ ] Filter patients with SMS enabled
  - [ ] Use clinic's SMS template
  - [ ] Replace variables: {patient_name}, {time}, {date}, {clinic_name}
  - [ ] Send via SMS Broadcast API
  - [ ] Log sent reminders
- [ ] Set up cron job / scheduler
  - [ ] Run daily at 9:00 AM
  - [ ] Use Django-cron or Celery Beat

---

#### **Task 3.2: Manual SMS Send Button**
**Requirement:** Send reminder from appointment details

**Action:**
- [ ] Add "Send SMS Reminder" button to `AppointmentDetailsDialog`
- [ ] Check if patient has SMS enabled
- [ ] Use clinic's SMS template
- [ ] Show preview before sending
- [ ] Send via SMS Broadcast API
- [ ] Show success/error notification
- [ ] Track that reminder was sent

---

#### **Task 3.3: Patient SMS Preferences**
**Requirement:** Opt-in/opt-out per patient

**Action:**
- [ ] Add `sms_reminders_enabled` field to Patient model (if not exists)
- [ ] Add toggle in patient settings
- [ ] Default: True (opt-in)
- [ ] Respect preference in reminder system

---

### **PHASE 4: Enhanced Features** 🟢 **FUTURE**

#### **Task 4.1: Clinic Management UI**
**Location:** `/settings/clinics` or Settings tab

**Action:**
- [ ] Create `ClinicsSettings.tsx` component (or enhance existing)
- [ ] Table view of all clinics
- [ ] Add/Edit/Archive clinics
- [ ] Color picker for calendar display
- [ ] SMS template editor per clinic
- [ ] Form validation (ABN, phone, email)
- [ ] Search/filter clinics
- [ ] View appointment count per clinic

---

#### **Task 4.2: Clinician Management UI**
**Location:** `/settings/clinicians` or Settings tab

**Action:**
- [ ] Create `CliniciansSettings.tsx` component
- [ ] Table view of all clinicians
- [ ] Add/Edit clinicians
- [ ] Assign to primary clinic (dropdown)
- [ ] Role selection (Pedorthist, Admin, Reception)
- [ ] Active/inactive toggle
- [ ] Professional credentials
- [ ] Filter by clinic
- [ ] Filter by active status

---

#### **Task 4.3: Calendar Filters Enhancement**
**Current:** Only clinic filter  
**Needed:** More filter options

**Action:**
- [ ] Add clinician filter
  - [ ] Multi-select checkboxes
  - [ ] Show only selected clinicians' appointments
- [ ] Add status filter
  - [ ] Checkboxes: Scheduled, Checked In, Completed, Cancelled, No Show
  - [ ] Show only selected statuses
- [ ] Add patient search
  - [ ] Search field in calendar header
  - [ ] Filter events by patient name
- [ ] Add date range selector
  - [ ] From/To date pickers
  - [ ] Quick buttons: Today, This Week, This Month

---

#### **Task 4.4: Recurring Appointments**
**Requirement:** Weekly/monthly recurring appointments

**Action:**
- [ ] Add recurrence fields to Appointment model
  - [ ] `recurrence_rule` (RRULE format)
  - [ ] `recurrence_end_date`
  - [ ] `parent_appointment_id` (for series)
- [ ] Add recurrence UI to CreateAppointmentDialog
  - [ ] Frequency dropdown: None, Daily, Weekly, Monthly
  - [ ] End date picker
  - [ ] "Until" vs "Number of occurrences"
- [ ] Backend: Generate recurring appointments
  - [ ] Parse RRULE
  - [ ] Create individual appointment records
  - [ ] Link to parent series
- [ ] Handle exceptions
  - [ ] Skip holidays
  - [ ] Allow editing single occurrence
  - [ ] Allow editing whole series

---

#### **Task 4.5: Dashboard Widgets**
**Location:** Dashboard page

**Action:**
- [ ] "Today's Appointments" widget
  - [ ] Count by clinic
  - [ ] Count by status
  - [ ] Next appointment time
- [ ] "This Week" summary
  - [ ] Total appointments
  - [ ] By clinic breakdown
  - [ ] Graph/chart
- [ ] "Busy Clinics" overview
  - [ ] Rank by appointment count
  - [ ] Show utilization %
- [ ] Quick stats
  - [ ] No-show rate
  - [ ] Average appointment duration
  - [ ] Most common appointment types

---

#### **Task 4.6: Reporting & Export**
**Requirement:** Generate reports and export data

**Action:**
- [ ] Daily schedule print view
  - [ ] Clean printable format
  - [ ] Filter by clinic
  - [ ] Group by time
  - [ ] Include patient phone numbers
- [ ] Export to CSV
  - [ ] Date range selection
  - [ ] Clinic filter
  - [ ] Include all appointment details
- [ ] Weekly/monthly reports
  - [ ] Appointment counts
  - [ ] **By clinic** (location performance)
  - [ ] **By clinician** (workload distribution)
  - [ ] **By appointment type** ✅ (data ready - e.g., "How many Assessments vs Fittings this month?")
  - [ ] No-show statistics
  - [ ] Average duration by type
  - [ ] PDF generation
  
**Note:** Appointment types are already tracked in database, so reporting by type is ready to implement!

---

### **PHASE 5: Advanced Features** 🟢 **NICE TO HAVE**

#### **Task 5.1: Appointment Templates**
**Requirement:** Pre-defined appointment packages

**Action:**
- [ ] Create AppointmentTemplate model
  - [ ] Name
  - [ ] Default type
  - [ ] Default duration
  - [ ] Default notes template
- [ ] Template management UI
- [ ] "Use Template" button in CreateAppointmentDialog

---

#### **Task 5.2: Bulk Operations**
**Requirement:** Manage multiple appointments at once

**Action:**
- [ ] Multi-select appointments on calendar
- [ ] Bulk status change
- [ ] Bulk delete (with confirmation)
- [ ] Bulk reschedule
- [ ] Bulk SMS send

---

#### **Task 5.3: Conflict Detection**
**Requirement:** Warn about double-booking

**Action:**
- [ ] Check clinician availability
- [ ] Warn if same clinician has overlapping appointment
- [ ] Warn if patient has overlapping appointment
- [ ] Show conflicts in CreateAppointmentDialog
- [ ] Allow override with confirmation

---

#### **Task 5.4: Mobile Optimization**
**Requirement:** Better mobile experience

**Action:**
- [ ] Responsive calendar layout
- [ ] Touch-friendly controls
- [ ] Simplified mobile view (list instead of grid)
- [ ] Mobile-optimized dialogs
- [ ] Pull to refresh
- [ ] Touch gestures for navigation

---

#### **Task 5.5: Operating Hours Enforcement**
**Requirement:** Prevent booking outside hours

**Action:**
- [ ] Add operating hours to Clinic model
  - [ ] Start time (per day of week)
  - [ ] End time (per day of week)
  - [ ] Closed days
- [ ] Validate appointments against hours
- [ ] Show only available slots in calendar
- [ ] Grey out unavailable times

---

#### **Task 5.6: Travel Time Warnings**
**Requirement:** Warn about tight schedules

**Action:**
- [ ] Add travel time between clinics
- [ ] Calculate time between appointments
- [ ] Warn if insufficient travel time
- [ ] Suggest alternative times

---

## 📊 **Progress Summary**

### **Overall Completion:**
- Backend: **95% Complete** ✅
- Frontend Core: **40% Complete** 🟡
- Frontend Dialogs: **0% Complete** ❌ (documented but not built)
- Data Population: **30% Complete** 🟡
- SMS Integration: **0% Complete** ⚠️
- Advanced Features: **0% Complete** ⚠️

### **Estimated Work:**

| Phase | Status | Effort |
|-------|--------|--------|
| Phase 1: Build Dialogs | ❌ Not Started | 2-3 days |
| Phase 2: Data Population | 🟡 Partial | 2-4 hours |
| Phase 3: SMS Integration | ⚠️ Not Started | 1-2 days |
| Phase 4: Enhanced Features | ⚠️ Not Started | 1-2 weeks |
| Phase 5: Advanced Features | ⚠️ Not Started | 2-4 weeks |

### **Critical Path (Must Do First):**
1. 🔴 **Build AppointmentDetailsDialog.tsx** (Task 1.1)
2. 🔴 **Build CreateAppointmentDialog.tsx** (Task 1.2)
3. 🔴 **Integrate dialogs with calendar** (Task 1.3)
4. 🟡 **Populate clinic data** (Task 2.1)
5. 🟡 **Add real clinicians** (Task 2.2)

---

## 🎯 **Next Actions**

### **Immediate (Today/Tomorrow):**
1. **Build `AppointmentDetailsDialog.tsx`**
   - Start with read-only view
   - Add edit functionality
   - Add delete functionality
   - Test with real appointments

2. **Build `CreateAppointmentDialog.tsx`**
   - Patient search dropdown
   - Clinic/clinician dropdowns
   - Date/time pickers
   - Duration selector
   - Form validation
   - Test creation

3. **Integrate with `ClinicCalendar.tsx`**
   - Replace alert() calls
   - Add state management
   - Add "New Appointment" button
   - Test full workflow

### **This Week:**
4. **Populate real data**
   - Update clinic contact details
   - Add real clinicians (Craig, Jono)
   - Create home visit clinics
   - Test with production data

5. **Test thoroughly**
   - Create appointment from slot click
   - Create appointment from button
   - Edit appointment details
   - Delete appointment
   - Drag & drop reschedule
   - Resize appointment

### **Next Week:**
6. **SMS Integration** (if needed soon)
7. **Enhanced filters** (if requested)
8. **Reporting** (if requested)

---

## 📝 **Notes**

### **Why Dialogs Aren't Built:**
The documentation file `CALENDAR_IMPROVEMENTS_COMPLETE.md` says they were built on Nov 12, 2025, but:
- ❌ No `AppointmentDetailsDialog.tsx` file exists
- ❌ No `CreateAppointmentDialog.tsx` file exists
- ❌ Calendar still uses `alert()` placeholders
- ✅ Only `AppointmentsDialog.tsx` exists (shows patient appointment history)

**Conclusion:** The docs were written as a **plan/specification**, not a completion report.

### **What Works Now:**
- ✅ View calendar with real appointments
- ✅ Filter by clinic
- ✅ Drag & drop to reschedule (saves to backend)
- ✅ Resize to change duration (saves to backend)
- ✅ Click event shows alert (placeholder)
- ✅ Click slot shows alert (placeholder)

### **What Doesn't Work:**
- ❌ Can't view appointment details (alert only)
- ❌ Can't edit appointment (no dialog)
- ❌ Can't delete appointment (no dialog)
- ❌ Can't create appointment (no dialog)
- ❌ No "New Appointment" button
- ❌ No quick-add patient feature

---

## 🗑️ **Docs to Consolidate/Delete**

After this document is reviewed:

### **Keep:**
- ✅ `CALENDAR_COMPLETE_TODO.md` (this file) - **Master TODO**
- ✅ `ChatGPT_Docs/Calendar_Spec_FullCalendar.md` - Original spec (reference)
- ✅ `APPOINTMENT_TYPES.md` - AppointmentType feature (complete)

### **Archive/Delete:**
- 🗑️ `CALENDAR_IMPROVEMENTS_COMPLETE.md` - Misleading (says complete, but isn't)
- 🗑️ `CALENDAR_CLINICS_WORKFLOW_PLAN.md` - Planning doc (merge into this TODO)
- 🗑️ `CLINICS_CALENDAR_SYSTEM.md` - Duplicate info (merge into this TODO)
- 🗑️ `CALENDAR_GUIDE.md` - Duplicate of `CALENDAR_GUIDE 2.md`
- 🗑️ `CALENDAR_GUIDE 2.md` - Outdated (says "mock data", but real data connected)

---

**Last Updated:** November 21, 2025  
**Status:** 📋 Master TODO List - Use this as single source of truth  
**Next Review:** After Phase 1 complete (dialogs built)

