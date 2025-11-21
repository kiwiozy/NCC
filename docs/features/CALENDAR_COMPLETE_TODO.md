# 📅 Calendar System - Complete TODO List

**Date:** November 21, 2025 (Updated 8:20 PM)  
**Purpose:** Consolidated list of what's done vs what needs to be completed  
**Status:** 🟢 Core Complete - Dialogs Built!

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

#### **Frontend - CORE COMPLETE** ✅
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
- ✅ **AppointmentDetailsDialog** (view/edit/delete appointments) - **COMPLETE!** (Nov 21, 2025)
- ✅ **CreateAppointmentDialog** (create new appointments) - **COMPLETE!** (Nov 21, 2025)
- ✅ **Dialog Integration** - Single-click to view, double-click to create
- ✅ **Follow-up Appointment Scheduling** - Schedule follow-ups with pre-filled data (Nov 21, 2025)
- ✅ **Vertical Day Separators** - 1px lines in week view for better clarity (Nov 21, 2025)

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

## ✅ **Major Features Completed Today (Nov 21, 2025)**

### 🎉 **AppointmentDetailsDialog.tsx** - COMPLETE!
**Location:** `frontend/app/components/dialogs/AppointmentDetailsDialog.tsx`

**Features:**
- ✅ Display appointment details (Patient, Clinic, Clinician, Date/Time, Notes)
- ✅ Status badge with color coding (Scheduled, Checked In, Completed, etc.)
- ✅ Edit mode with inline editing
- ✅ Delete appointment with confirmation
- ✅ "View Patient" button navigation
- ✅ Auto-refresh calendar after changes
- ✅ Mantine UI components throughout
- ✅ **Follow-up Scheduling** - Schedule follow-ups with dropdown (1w, 2w, 3w, 4w, 8w, 3m, 6m)
- ✅ **Follow-up Tracking** - "Needs follow-up reminder" checkbox, badges for status
- ✅ **Appointment Type Display** - Shows type with duration, editable in edit mode

### 🎉 **CreateAppointmentDialog.tsx** - COMPLETE!
**Location:** `frontend/app/components/dialogs/CreateAppointmentDialog.tsx`

**Features:**
- ✅ Patient search with full pagination (searches all patients)
- ✅ Clinic and Clinician dropdowns with full data
- ✅ Date/time pickers with auto-calculated end time
- ✅ Duration selector (auto-updates from appointment type)
- ✅ Appointment type dropdown (auto-fills duration)
- ✅ Notes textarea
- ✅ Status selector at bottom
- ✅ Form validation (Patient, Clinic, Date/Time required)
- ✅ Auto-refresh calendar after creation
- ✅ Mantine UI components throughout
- ✅ **Follow-up Pre-fill** - Accepts pre-filled data from follow-up scheduling
- ✅ **Parent Appointment Linking** - Links follow-up to original appointment

### 🎉 **Calendar Integration** - COMPLETE!
**Location:** `frontend/app/components/ClinicCalendar.tsx`

**Features:**
- ✅ Single-click on event → Opens AppointmentDetailsDialog
- ✅ Double-click on empty slot → Opens CreateAppointmentDialog
- ✅ URL parameter navigation for follow-ups (date + view)
- ✅ Calendar ref for programmatic navigation
- ✅ sessionStorage for follow-up data passing
- ✅ Auto-open dialog when followup pending
- ✅ **Vertical day separators** - 1px lines between days in week view

### 🎉 **Follow-up Appointment System** - COMPLETE!
**Backend Changes:**
- ✅ `parent_appointment` FK field for linking
- ✅ `needs_followup_reminder` flag for tracking
- ✅ `followup_scheduled` flag for status
- ✅ Migration: `0007_add_followup_fields.py`
- ✅ Serializer includes all new fields

**Frontend Workflow:**
1. Click appointment → View details
2. Click "Schedule Follow-up" → Select interval
3. Appointment marked as "Follow-up Scheduled"
4. Calendar navigates to target date in week view
5. CreateAppointmentDialog opens with pre-filled data
6. User adjusts time and creates linked follow-up

---

## ❌ **What Was MISSING (Now FIXED):**

### ✅ **FIXED - These dialogs NOW EXIST:**

1. **`AppointmentDetailsDialog.tsx`** - ✅ NOW EXISTS
   - ✅ Handles: View/Edit/Delete appointment
   - ✅ Shows: Patient details, clinic, time, status, notes, appointment type
   - ✅ Has: "View Patient" button, status change, delete confirmation, follow-up scheduling

2. **`CreateAppointmentDialog.tsx`** - ✅ NOW EXISTS
   - ✅ Handles: Create new appointment
   - ✅ Has: Patient search (all patients), clinic dropdown, date/time picker
   - ✅ Has: Duration selector, appointment type, notes, follow-up pre-fill

3. **Calendar Integration** - ✅ NOW DONE
   - ✅ Single-click opens AppointmentDetailsDialog
   - ✅ Double-click opens CreateAppointmentDialog
   - ✅ Follow-up navigation with URL parameters
   - ✅ All using Mantine UI components

---

## ❌ **What's STILL MISSING (Future Work):**

## 📋 **COMPLETE TODO LIST**

### **✅ PHASE 1: Build Missing Dialogs** - **COMPLETE!** ✅

#### **✅ Task 1.1: Create AppointmentDetailsDialog.tsx** - DONE!
**File:** `frontend/app/components/dialogs/AppointmentDetailsDialog.tsx`

All features implemented:
- ✅ Display appointment details (read-only mode)
- ✅ Patient name (clickable "View Patient" button)
- ✅ Clinic, Clinician, Date/Time, Duration, Appointment Type
- ✅ Status badge (color-coded)
- ✅ Notes display
- ✅ Edit mode with toggle
- ✅ Delete with confirmation
- ✅ Follow-up scheduling dropdown (1w, 2w, 3w, 4w, 8w, 3m, 6m)
- ✅ "Needs follow-up reminder" checkbox
- ✅ Auto-refresh calendar after changes
- ✅ Error handling and loading states

---

#### **✅ Task 1.2: Create CreateAppointmentDialog.tsx** - DONE!
**File:** `frontend/app/components/dialogs/CreateAppointmentDialog.tsx`

All features implemented:
- ✅ Patient search/select (searchable, paginated, all patients)
- ✅ Clinic dropdown (all clinics)
- ✅ Clinician dropdown (all clinicians)
- ✅ Date/time pickers with auto-calculated end time
- ✅ Duration selector (auto-updates from appointment type)
- ✅ Appointment type dropdown
- ✅ Notes textarea
- ✅ Status selector
- ✅ Validation (Patient, Clinic, Date/Time required)
- ✅ Follow-up pre-fill support
- ✅ Parent appointment linking
- ✅ Auto-refresh calendar after creation
- ✅ Error handling and loading states

**Note:** Quick-add patient feature deferred to future (not critical for MVP)

---

#### **✅ Task 1.3: Integrate Dialogs with Calendar** - DONE!
**File:** `frontend/app/components/ClinicCalendar.tsx`

All integrations complete:
- ✅ Import both dialogs
- ✅ State management (detailsDialogOpen, createDialogOpen, selectedAppointmentId)
- ✅ Single-click event opens AppointmentDetailsDialog
- ✅ Double-click empty slot opens CreateAppointmentDialog
- ✅ URL parameter navigation for follow-ups
- ✅ sessionStorage for follow-up data
- ✅ Calendar ref for programmatic navigation
- ✅ Auto-refresh on dialog close
- ✅ Vertical day separators in week view (1px, dark gray)

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
- Backend: **100% Complete** ✅ (including follow-up fields)
- Frontend Core: **100% Complete** ✅ (all dialogs built!)
- Frontend Dialogs: **100% Complete** ✅ (AppointmentDetailsDialog + CreateAppointmentDialog)
- Calendar Integration: **100% Complete** ✅ (single-click view, double-click create, follow-ups)
- Data Population: **30% Complete** 🟡
- SMS Integration: **0% Complete** ⚠️
- Advanced Features: **0% Complete** ⚠️

### **Estimated Work:**

| Phase | Status | Effort |
|-------|--------|--------|
| Phase 1: Build Dialogs | ✅ **COMPLETE!** | ~~2-3 days~~ **DONE!** |
| Phase 2: Data Population | 🟡 Partial | 2-4 hours |
| Phase 3: SMS Integration | ⚠️ Not Started | 1-2 days |
| Phase 4: Enhanced Features | ⚠️ Not Started | 1-2 weeks |
| Phase 5: Advanced Features | ⚠️ Not Started | 2-4 weeks |

### **Critical Path ~~(Must Do First)~~ - COMPLETED! ✅:**
1. ✅ ~~**Build AppointmentDetailsDialog.tsx**~~ **DONE!** (Task 1.1)
2. ✅ ~~**Build CreateAppointmentDialog.tsx**~~ **DONE!** (Task 1.2)
3. ✅ ~~**Integrate dialogs with calendar**~~ **DONE!** (Task 1.3)
4. 🟡 **Populate clinic data** (Task 2.1) - NEXT
5. 🟡 **Add real clinicians** (Task 2.2) - NEXT

---

## 🎯 **Next Actions**

### **~~Immediate (Today/Tomorrow):~~** - ✅ **COMPLETE!**
1. ✅ ~~**Build `AppointmentDetailsDialog.tsx`**~~
   - ✅ Read-only view
   - ✅ Edit functionality
   - ✅ Delete functionality
   - ✅ Follow-up scheduling
   - ✅ Tested with real appointments

2. ✅ ~~**Build `CreateAppointmentDialog.tsx`**~~
   - ✅ Patient search dropdown (paginated)
   - ✅ Clinic/clinician dropdowns
   - ✅ Date/time pickers
   - ✅ Duration selector
   - ✅ Form validation
   - ✅ Follow-up pre-fill
   - ✅ Tested creation

3. ✅ ~~**Integrate with `ClinicCalendar.tsx`**~~
   - ✅ Replace alert() calls
   - ✅ Add state management
   - ✅ Single-click / double-click detection
   - ✅ Vertical day separators
   - ✅ Tested full workflow

### **This Week:**
4. **Populate real data**
   - Update clinic contact details
   - Add real clinicians (Craig, Jono)
   - Create home visit clinics
   - Test with production data

5. **Test thoroughly**
   - ✅ Create appointment from slot click (double-click)
   - ✅ Create appointment with follow-up pre-fill
   - ✅ Edit appointment details
   - ✅ Delete appointment
   - ✅ Drag & drop reschedule
   - ✅ Resize appointment
   - ✅ Schedule follow-up appointments

### **Next Week:**
6. **SMS Integration** (if needed soon)
7. **Enhanced filters** (if requested)
8. **Reporting** (if requested)

---

## 📝 **Notes**

### **✅ Dialogs ARE NOW Built!**
As of **November 21, 2025 (8:20 PM)**:
- ✅ `AppointmentDetailsDialog.tsx` file exists and is fully functional
- ✅ `CreateAppointmentDialog.tsx` file exists and is fully functional
- ✅ Calendar uses real dialogs (no more `alert()` placeholders)
- ✅ Follow-up appointment system implemented
- ✅ Vertical day separators added to week view
- ✅ All using Mantine UI components

**Commits:**
- `d431d2b` - feat: Build AppointmentDetailsDialog and CreateAppointmentDialog
- `491f360` - feat: Add follow-up appointment scheduling feature  
- `1eddbdb` - style: Add vertical day separators to calendar week view

### **What Works Now:**
- ✅ View calendar with real appointments
- ✅ Filter by clinic (multi-select)
- ✅ Drag & drop to reschedule (saves to backend)
- ✅ Resize to change duration (saves to backend)
- ✅ **Single-click event opens AppointmentDetailsDialog**
- ✅ **Double-click slot opens CreateAppointmentDialog**
- ✅ **Edit appointment details inline**
- ✅ **Delete appointments with confirmation**
- ✅ **Schedule follow-up appointments with pre-filled data**
- ✅ **Track follow-up reminders and status**
- ✅ **Vertical lines separate days in week view**

### **What Still Needs Work:**
- ⏳ Quick-add patient feature (deferred)
- ⏳ Populate real clinic data
- ⏳ Add real clinicians
- ⏳ SMS integration
- ⏳ Advanced filters
- ⏳ Reporting

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

**Last Updated:** November 21, 2025 (8:20 PM)  
**Status:** ✅ **Phase 1 COMPLETE!** - Dialogs built, calendar fully functional  
**Next Review:** After Phase 2 complete (data population)

