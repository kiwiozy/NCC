# 🗓️ Calendar & Clinics Workflow - Planning Document

**Date:** November 10, 2025  
**Status:** 🎯 PLANNING PHASE  
**Purpose:** Design how calendar, clinics, clinicians, and appointments work together

---

## 📊 Current State (What We Have)

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

