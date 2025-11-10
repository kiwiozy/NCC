# 🗓️ Calendar & Clinics Workflow - Planning Document

**Date:** November 10, 2025  
**Status:** ✅ COMPLETE - Ready to Build  
**Purpose:** Design how calendar, clinics, clinicians, and appointments work together

---

## 📊 Complete Requirements Specification

This document contains all decisions made during the planning session.

---

## 1. CLINICS & LOCATIONS 🏥

### **Clinic Types:**
- ✅ **All 13 clinics tracked** (11 physical + 2 home visit)
- ✅ **Physical clinics (11):**
  - Tamworth (main clinic - 5,731 historical appointments)
  - Newcastle
  - RPA (1,335 historical appointments)
  - Armidale (1,031 historical appointments)
  - Gunnedah (232 historical appointments)
  - Concord
  - Better Health Practice
  - Coffs Harbour
  - Inverell
  - Narrabri
  
- 🏠 **Home Visit Clinics (2):**
  - **Home Visit - Craig** (appointments at patient homes, Craig)
  - **Home Visit - Jono** (appointments at patient homes, Jono)
  - **Why separate:** Easy filtering/reporting per clinician's home visits

### **Operating Hours:**
- ❌ **No operating hours enforcement** at this stage
- ✅ Can schedule appointments anytime at any clinic
- 📝 May add later if needed

### **Multi-Clinic Operations:**
- ✅ **Common to work at multiple clinics in one day**
- 📅 Calendar shows all clinics together with visual distinction
- ❌ **No travel time tracking** - manually managed

---

## 2. CLINICIANS & STAFF 👨‍⚕️

### **Clinicians:**
- **Craig** - works at all clinics
- **Jono** - works at all clinics

### **Workflow:**
- ✅ **Patients booked to CLINIC** (location-based scheduling)
- ✅ **Either Craig or Jono can see them** at physical clinics
- ✅ **Can book appointments for each other**
- 🏠 **Home visits: Clinician assigned via clinic** (Home Visit - Craig vs Home Visit - Jono)

### **Clinician Assignment:**
- 🏥 **Physical clinics:** No clinician field needed (flexible)
- 🏠 **Home visits:** Clinician determined by clinic choice
- 📋 **Historical appointments (8,329):** Remain unassigned (no clinician)
- ✅ **Going forward:** All new appointments have clear clinic (and thus clinician for home visits)

---

## 3. APPOINTMENT TYPES 📋

### **Initial Appointment Types (4):**
1. ✅ **Appointment** (generic/default)
2. ✅ **Initial Consultation**
3. ✅ **Follow-up**
4. ✅ **Fitting**

### **Management:**
- ✅ **Lookup table** managed in Settings
- ✅ Admin can add/edit/delete types
- ✅ Flexible - evolves with business needs

### **Duration:**
- ⏱️ **Default: 30 minutes** for all types
- ✅ Can manually adjust per appointment
- 📅 Calendar shows time blocks (e.g., 9:00 AM - 9:30 AM)

---

## 4. CALENDAR VIEWS 📅

### **Enabled Views (3):**
1. ✅ **Month view** - See whole month at a glance
2. ✅ **Week view** - See one week, hour-by-hour
3. ✅ **Day view** - Single day, detailed schedule

### **Color Coding:**
- 🎨 **Color by Clinic**
- ✅ Each clinic has **color picker in Settings**
- ✅ Admin can set/change colors anytime
- ✅ Calendar automatically uses those colors
- 🎯 Visual distinction between locations

**Example:**
```
Clinic Settings:
- Tamworth: 🎨 Blue
- Newcastle: 🎨 Green
- Home Visit - Craig: 🎨 Purple
- Home Visit - Jono: 🎨 Orange
```

---

## 5. WORKFLOW - Day-to-Day Operations 🔄

### **Creating Appointments:**
- ✅ **Click time slot on calendar** → opens "New Appointment" dialog
- ✅ Date/time pre-filled from clicked slot
- ✅ Quick and visual

**Dialog fields:**
1. Patient (search/select or quick-add new)
2. Clinic (dropdown with color indicator)
3. Date & Time (pre-filled, adjustable)
4. Appointment Type (dropdown)
5. Duration (default 30 min, adjustable)
6. Notes (optional, free text)

### **Quick-Add New Patients:**
- ✅ **During appointment creation**
- ✅ Minimum fields: Name + Phone
- ✅ Full patient details added later
- ✅ Fast booking, no friction

**Workflow:**
1. Click time slot
2. Start typing patient name → "Not found"
3. **"+ Add New Patient"** button
4. Quick form: Name + Phone → Save
5. Patient created, appointment linked

### **Viewing Appointments:**
- ✅ **Click existing appointment** → View-only popup
- ✅ Shows: Patient, clinic, date/time, type, notes
- ✅ **"Edit" button** → opens edit dialog
- ✅ **"Delete" button** → confirms and cancels
- ✅ **"View Patient Record" link** → full patient page
- ✅ **Quick patient info** in popup (name, phone, DOB)

### **Filtering:**
- ✅ **Multi-select clinic filter**
- ✅ Checkboxes for each clinic
- ✅ Select multiple clinics to view
- ✅ **Save preference** (remembers selection)

**Use cases:**
- "Show me Tamworth + Home Visit - Craig only"
- "Show all clinics except Narrabri"
- "Show only home visits (both clinicians)"

### **Default View:**
- ✅ **Show all clinics at once** when calendar opens
- ✅ Color-coded by clinic
- ✅ Big picture of all operations
- ✅ Filter down using multi-select as needed

---

## 6. PATIENT INTEGRATION 🤝

### **New Patient Booking:**
- ✅ **Quick-add during appointment creation**
- ✅ Minimum: Name + Phone
- ✅ Complete patient record later

### **Patient History Access:**
- ✅ **Quick info in appointment popup**
- ✅ **"View Full Record" button** → patient page
- ✅ Stay on calendar or dive deeper

### **Data Integrity:**
- ✅ All appointments linked to patients
- ✅ No orphaned appointments

---

## 7. REPORTING & ANALYTICS 📊

### **Current Phase:**
- ⏳ **Defer dashboard/reporting widgets** - build later
- ✅ Focus on core calendar functionality first

### **Future Dashboard Widgets:**
- Today's appointments count
- This week's appointments
- Busy clinics overview
- Upcoming week summary
- Appointments by clinic/type

### **For Now:**
- ✅ Basic appointment list/search
- ✅ Filter by date range
- ⏳ Export to CSV (add later if needed)

---

## 8. MOBILE ACCESS 📱

### **Current Phase:**
- ✅ **Desktop/laptop focus** - build core system first
- ✅ Make it **responsive** (works on mobile browser)
- ⏳ **Optimized mobile experience later**

### **Future Mobile Features:**
- Quick appointment view
- Easy patient search
- One-tap call patient
- Push notifications for appointments

### **For Now:**
- ✅ Desktop calendar fully functional
- ✅ Basic mobile browser access (not optimized)

---

## 9. SMS APPOINTMENT REMINDERS 📱

### **Integration:**
- ✅ **Use existing SMS system** (SMS Broadcast)
- ✅ **Trigger from calendar appointments**
- ✅ Use existing SMS tracking (don't duplicate)

### **Sending:**
- ✅ **Automatic reminders:** Day before at 9:00 AM
- ✅ **Manual send button** on each appointment
- ✅ Track which reminders were sent (via existing SMS system)

**Examples:**
- Appointment: Wednesday 2:00 PM → SMS: Tuesday 9:00 AM
- Appointment: Monday 9:00 AM → SMS: Sunday 9:00 AM

### **SMS Templates:**
- ✅ **Per-clinic templates** (in Clinic Settings)
- ✅ **Template variables:**
  - `{patient_name}` - Patient's first name
  - `{appointment_time}` - Time (e.g., "10:00 AM")
  - `{appointment_date}` - Date (e.g., "Wednesday, Nov 12")
  - `{clinic_name}` - Clinic name
  - `{clinic_phone}` - Clinic phone
  - `{clinic_address}` - Clinic address (if set)

**Example templates:**

**Tamworth:**
```
Hi {patient_name}, reminder: appointment tomorrow at {appointment_time} 
at our Tamworth clinic. Call 6766 3153 to reschedule. - WalkEasy
```

**Home Visit - Craig:**
```
Hi {patient_name}, Craig will visit you at home tomorrow at {appointment_time}. 
Call 6766 3153 if you need to reschedule. - WalkEasy
```

### **Patient Preferences:**
- ✅ **Patient record has "SMS Reminders" toggle** (Yes/No)
- ✅ Default: **Yes** (opt-in by default)
- ✅ Can be changed in patient settings
- ✅ System respects preference

---

## 10. FILEMAKER COMPARISON 🔄

### **Philosophy:**
- ❌ **Don't copy FileMaker** - build something better
- ✅ Fresh start with modern tools
- ✅ Learn from 9 years of experience
- ✅ Modern web-based calendar (FullCalendar)
- ✅ Clean, fast, intuitive interface

---

## 📋 IMPLEMENTATION CHECKLIST

### **Phase 1: Core Calendar (Priority)**
- [ ] Update Clinic model with color field
- [ ] Create 2 new Home Visit clinics (Craig, Jono)
- [ ] Remove old generic "Home Visit" clinic
- [ ] Create AppointmentType lookup table
- [ ] Seed 4 default appointment types
- [ ] Update Appointment model (link to AppointmentType)
- [ ] Enhance FullCalendar component:
  - [ ] Click time slot → Create appointment
  - [ ] Click appointment → View/Edit dialog
  - [ ] Multi-select clinic filter
  - [ ] Color by clinic
  - [ ] Month/Week/Day views
- [ ] Quick-add patient during booking
- [ ] Patient info in appointment popup

### **Phase 2: Settings Management**
- [ ] Clinic color picker
- [ ] Appointment types CRUD
- [ ] SMS template per clinic
- [ ] SMS reminders toggle per patient

### **Phase 3: SMS Integration**
- [ ] Automatic reminder scheduler (daily job at 9 AM)
- [ ] Manual "Send SMS" button per appointment
- [ ] Template variable replacement
- [ ] Respect patient opt-out preference

### **Phase 4: Future Enhancements**
- [ ] Dashboard widgets
- [ ] Advanced reporting
- [ ] Export to CSV
- [ ] Optimized mobile UI
- [ ] Operating hours enforcement
- [ ] Travel time warnings

---

## 🎯 SUCCESS CRITERIA

The calendar system is successful when:
1. ✅ Can book appointments in seconds (click slot → select patient → done)
2. ✅ Clear visual distinction between clinics (colors)
3. ✅ Easy to filter view (multi-select clinics)
4. ✅ Automatic SMS reminders work reliably
5. ✅ Quick patient info access from appointments
6. ✅ Fast, modern, web-based (better than FileMaker!)

---

**Next Step:** Start implementation - Phase 1 (Core Calendar)

### **Data Imported:** ✅
- ✅ **11 Clinics** (Tamworth, Newcastle, RPA, Armidale, etc.)
  - All have phone: 6766 3153
  - All have email: info@walkeasy.com.au
  - Missing: addresses (optional)
- ✅ **8,329 Appointments** imported from FileMaker
  - Linked to clinics ✅
  - Linked to patients ✅
  - Missing: clinicians ⚠️
- ⚠️ **3 Sample Clinicians** (need real data)
  - Dr. Jane Smith, Dr. John Doe, Sarah Johnson
  - None assigned to clinics yet

### **UI Built:** ✅
- ✅ Clinic management page (`/settings?tab=clinics`)
- ✅ Basic calendar view (`/calendar`)
- ⚠️ No appointment creation/editing UI yet
- ⚠️ No clinician management page yet

---

## 🎯 Key Questions to Answer

Before we build the appointment system, let's define exactly how it should work:

---

### **1. CLINICS & LOCATIONS** 🏥

#### **Question 1.1: How do clinics work in your business?**
- [ ] Do you see patients at multiple physical locations? (e.g., Tamworth office, Newcastle office)
- [ ] Are some "clinics" virtual? (e.g., "Home Visit", "Telehealth")
- [ ] Can a clinician work at multiple clinics?

#### **Question 1.2: Clinic scheduling**
- [ ] Does each clinic have its own operating hours?
- [ ] Can you have appointments at multiple clinics on the same day?
- [ ] Should the calendar filter by clinic or show all clinics at once?

**Current FileMaker Data:**
- Tamworth: 5,731 appointments (68.8%)
- RPA: 1,335 appointments (16.0%)
- Armidale: 1,031 appointments (12.4%)
- Gunnedah: 232 appointments (2.8%)

**My Understanding:** Tamworth is your main clinic?

---

### **2. CLINICIANS & STAFF** 👨‍⚕️

#### **Question 2.1: Who are your clinicians?**
Please list the actual pedorthists/staff who see patients:
```
Example:
- John Smith (Pedorthist) - Primary clinic: Tamworth
- Jane Doe (Pedorthist) - Works at: Tamworth, Newcastle
- Sarah Johnson (Admin) - Reception only
```

**Real clinicians:** (please fill in)
- ?
- ?
- ?

#### **Question 2.2: Clinician assignment**
- [ ] Can multiple clinicians be at the same clinic at the same time?
- [ ] Does each clinician have their own appointment slots?
- [ ] Should the calendar show appointments per clinician or per clinic?

**Example scenarios:**
- **Scenario A:** Calendar shows all appointments at Tamworth, color-coded by clinician
- **Scenario B:** Calendar has separate columns for each clinician
- **Scenario C:** Calendar shows clinic view, click to see which clinician

**Which scenario matches your workflow?**

---

### **3. APPOINTMENT TYPES** 📋

#### **Question 3.1: What types of appointments do you have?**
Please list all appointment types:
```
Example:
- Initial Consultation (60 min)
- Follow-up (30 min)
- Fitting (45 min)
- Assessment (90 min)
```

**Your appointment types:** (please fill in)
- ?
- ?
- ?

#### **Question 3.2: Duration & Scheduling**
- [ ] Are appointment lengths fixed or flexible?
- [ ] Do you use time blocks (e.g., 30-min slots)?
- [ ] Can appointments overlap?

---

### **4. CALENDAR VIEWS** 📅

#### **Question 4.1: How do you want to view appointments?**

**FileMaker View (from your screenshot):**
```
Time      | Clinic      | Date
----------|-------------|-------------
9:30 AM   | Newcastle   | 11 Nov 2025
11:15 AM  | Newcastle   | 25 Aug 2025
11:30 AM  | Newcastle   | 4 Aug 2025
```

**Possible Nexus Views:**

**Option A: List View (Like FileMaker)**
- Simple table: Time, Clinic, Patient, Date
- Easy to scan
- Good for daily schedule

**Option B: Calendar Grid (Current)**
- Visual calendar with color-coded events
- See entire week/month at once
- Better for long-term planning

**Option C: Timeline View**
- Horizontal timeline by clinician
- See who's busy when
- Good for scheduling conflicts

**Which view(s) do you need?**
- [ ] List view (like FileMaker)
- [ ] Calendar grid
- [ ] Timeline view
- [ ] All of the above with tabs to switch?

---

### **5. APPOINTMENT WORKFLOW** 🔄

#### **Question 5.1: Creating appointments**

**Where do appointments come from?**
- [ ] Receptionist creates manually
- [ ] Patients can book online (future feature?)
- [ ] Imported from FileMaker (already done ✅)

**When creating a new appointment, what do you need to select?**
1. Patient (search/select)
2. Clinic (dropdown)
3. Clinician (dropdown - filtered by clinic?)
4. Date & Time
5. Duration
6. Appointment type/reason
7. Notes

**Is this order correct?**

#### **Question 5.2: Appointment statuses**

**Current statuses in Nexus:**
- `scheduled` - Future appointment
- `checked_in` - Patient arrived
- `completed` - Appointment done
- `cancelled` - Cancelled
- `no_show` - Patient didn't show up

**Are these correct? Need more?**

---

### **6. COMMON WORKFLOWS** 🔁

#### **Scenario 6.1: Daily Schedule**
**User:** Receptionist checking today's schedule

**Workflow:**
1. Open calendar
2. Filter to today
3. See all appointments at main clinic (Tamworth?)
4. Click appointment to see details
5. Mark patient as "checked in" when they arrive

**Questions:**
- Should today's schedule be the default view?
- Should it show ALL clinics or just the main one?
- Do you need a "Today's Schedule" widget on dashboard?

#### **Scenario 6.2: Booking New Appointment**
**User:** Receptionist booking appointment for patient

**Workflow:**
1. Patient calls for appointment
2. Receptionist searches for patient
3. Opens patient record → Appointments tab
4. Clicks "New Appointment"
5. Selects: Clinic, Date/Time, Clinician, Type
6. Saves

**OR:**

1. Receptionist opens calendar
2. Clicks on time slot
3. Searches for patient
4. Fills in details
5. Saves

**Which workflow do you prefer?**

#### **Scenario 6.3: Rescheduling**
**User:** Receptionist rescheduling appointment

**Workflow Option A (Drag & Drop):**
1. Find appointment on calendar
2. Drag to new date/time
3. Confirm

**Workflow Option B (Edit Dialog):**
1. Click appointment
2. Click "Edit"
3. Change date/time
4. Save

**Which do you prefer?**

---

### **7. MULTI-CLINIC OPERATIONS** 🏢

#### **Question 7.1: How do you handle multiple clinics?**

**Scenario:** You have appointments at Tamworth AND Newcastle on the same day.

**Option A: Single Calendar, Color-Coded**
- One calendar showing all clinics
- Color-coded by clinic
- Toggle clinics on/off with checkboxes

**Option B: Separate Calendars per Clinic**
- Tab for each clinic
- Switch between clinic views
- Can't see all clinics at once

**Option C: Clinic Dropdown Filter**
- One calendar
- Dropdown to select clinic
- Or "All Clinics" to see everything

**Which option makes sense for your workflow?**

#### **Question 7.2: Clinician travel**
If a clinician works at multiple clinics:
- [ ] Do they have appointments at multiple clinics on the same day?
- [ ] Do you need to block "travel time" between clinics?
- [ ] Should the system warn if they're double-booked?

---

### **8. INTEGRATION WITH PATIENT RECORDS** 👤

#### **Question 8.1: Appointment history**

**When viewing a patient's record:**
- Should we show appointment history?
- How far back? (All time? Last 12 months?)
- Should we show upcoming appointments prominently?

#### **Question 8.2: Quick appointment booking**

**From patient record:**
- Should there be a "Book Appointment" button on patient detail page?
- Should it pre-fill the clinic (based on patient's usual clinic)?
- Should it suggest next available slot?

---

### **9. REPORTING & ANALYTICS** 📊

#### **Question 9.1: What reports do you need?**

**Possible reports:**
- [ ] Daily schedule (printable)
- [ ] Clinician utilization (how busy are they?)
- [ ] No-show rates
- [ ] Appointments by clinic/clinician
- [ ] Revenue per appointment (future with billing)

**What's most important?**

---

### **10. MOBILE & ACCESSIBILITY** 📱

#### **Question 10.1: Mobile usage**
- [ ] Do you need to check/manage appointments on mobile?
- [ ] Just view or also create/edit?
- [ ] Should calendar be responsive for tablets?

---

## 🎨 Proposed Architecture (Based on Answers)

**Once you answer the questions above, I'll design:**

### **Phase 1: Clinician Management**
- Build clinician management UI
- Assign clinicians to clinics
- Set up roles (Pedorthist, Admin, Reception)

### **Phase 2: Enhanced Calendar**
- Implement your preferred view (list/grid/timeline)
- Add appointment creation dialog
- Add appointment edit/reschedule
- Filter by clinic/clinician/status

### **Phase 3: Patient Integration**
- Add appointment history to patient records
- Add "Book Appointment" button
- Show upcoming appointments

### **Phase 4: Advanced Features**
- Drag & drop rescheduling
- Conflict detection
- Email/SMS reminders
- Waitlist management

---

## 📝 Decision Log

As we discuss, I'll record decisions here:

### **Decisions Made:**
- (none yet - waiting for your input)

### **Decisions Pending:**
- How many real clinicians do you have?
- What appointment types do you need?
- Which calendar view(s) do you prefer?
- How do clinicians work across multiple clinics?

---

## 🚀 Next Steps

**After you answer the questions:**
1. I'll create a detailed technical specification
2. We'll prioritize features (must-have vs nice-to-have)
3. We'll build in phases (working system at each phase)
4. We'll test with your real data

---

## 💭 Notes & Discussion

Use this section to add any thoughts, requirements, or edge cases:

```
(Add your notes here as we discuss)
```

---

**Let's start with the most important questions:**
1. **How many real clinicians/staff do you have?**
2. **What are your main appointment types?**
3. **Which calendar view would be most useful for your daily workflow?**

I'll wait for your answers before we design the system! 🎯

