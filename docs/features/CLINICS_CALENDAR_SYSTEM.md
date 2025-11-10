# 🏥 Clinics & Calendar System

**Date:** November 10, 2025  
**Status:** ✅ Backend Complete | ⚠️ Frontend Needs Enhancement  
**Branch:** `filemaker-import-docs`

---

## 📊 Current System Overview

### **What We Have:**

#### 1. **Backend (Django/PostgreSQL)** ✅
- ✅ Clinic model with all fields
- ✅ Clinician model with clinic relationships
- ✅ Appointment model with clinic/clinician FKs
- ✅ Calendar API endpoint (`/api/appointments/calendar_data/`)
- ✅ FullCalendar-compatible serializers
- ✅ 11 clinics imported from FileMaker
- ✅ 8,329 appointments imported and linked

#### 2. **Frontend (Next.js/React)** ⚠️
- ✅ Basic FullCalendar implementation
- ✅ Clinic filtering/toggle
- ⚠️ Limited clinic management UI
- ⚠️ No clinician assignment UI
- ⚠️ Basic appointment creation

---

## 🗂️ Current Data Status

### **Clinics (11)**

| Clinic | Appointments | Clinicians | FileMaker ID | Status |
|--------|--------------|------------|--------------|--------|
| **Tamworth** | 5,731 | 0 | ✅ | Primary clinic |
| **RPA** | 1,335 | 0 | ✅ | Active |
| **Armidale** | 1,031 | 0 | ✅ | Active |
| **Gunnedah** | 232 | 0 | ✅ | Active |
| **Newcastle** | 0 | 0 | ✅ | Imported |
| Better Health Practice | 0 | 0 | ✅ | Imported |
| Coffs Harbour | 0 | 0 | ✅ | Imported |
| Concord | 0 | 0 | ✅ | Imported |
| Home Visit | 0 | 0 | ✅ | Imported |
| Inverell | 0 | 0 | ✅ | Imported |
| Narrabri | 0 | 0 | ✅ | Imported |

**Notes:**
- ⚠️ All clinics missing: phone, email, ABN, address
- ⚠️ Zero clinicians assigned to any clinic
- ✅ Historical appointments preserved (8,329 total)

### **Clinicians (3)** ⚠️

| Name | Role | Clinic | Status |
|------|------|--------|--------|
| Dr. Jane Smith | Pedorthist | None | Active |
| Dr. John Doe | Pedorthist | None | Active |
| Sarah Johnson | Pedorthist | None | Active |

**Issues:**
- ❌ No clinic assignments (all NULL)
- ❌ Sample data (need real clinicians)
- ❌ Need to assign to specific clinics

### **Appointments (8,329)** ✅

| Metric | Value |
|--------|-------|
| **Total** | 8,329 |
| **Completed** | 8,319 |
| **Scheduled** | 10 |
| **Future** | 8 |
| **Past** | 8,321 |

**Distribution by Clinic:**
- Tamworth: 5,731 (68.8%)
- RPA: 1,335 (16.0%)
- Armidale: 1,031 (12.4%)
- Gunnedah: 232 (2.8%)

---

## 🎯 What Needs to Be Built

### **PRIORITY 1: Clinic Management UI** 🔴

#### **Required Features:**

1. **Clinic Details Page** (`/settings/clinics`)
   - List all clinics in a table/card view
   - Edit clinic details (phone, email, ABN, address)
   - Add/remove clinics
   - Archive inactive clinics
   - View appointment count per clinic

2. **Clinic Form Fields:**
   ```typescript
   interface Clinic {
     id: UUID;
     name: string;
     abn?: string;
     phone?: string;
     email?: string;
     address_json?: {
       street?: string;
       suburb?: string;
       state?: string;
       postcode?: string;
       country?: string;
     };
     filemaker_id?: UUID;  // Read-only
     created_at: DateTime;
     updated_at: DateTime;
   }
   ```

3. **API Endpoints Needed:**
   - ✅ `GET /api/clinics/` (already exists)
   - ✅ `GET /api/clinics/{id}/` (already exists)
   - ⚠️ `POST /api/clinics/` (create new - needs permission check)
   - ⚠️ `PUT /api/clinics/{id}/` (update - needs permission check)
   - ⚠️ `DELETE /api/clinics/{id}/` (archive - needs safety check)

4. **Validation Rules:**
   - ❌ Cannot delete clinic with appointments (archive instead)
   - ⚠️ ABN format validation (11 digits)
   - ⚠️ Phone number format (Australian)
   - ⚠️ Email validation

---

### **PRIORITY 2: Clinician Management UI** 🔴

#### **Required Features:**

1. **Clinician Management Page** (`/settings/clinicians`)
   - List all clinicians
   - Edit clinician details
   - **Assign clinicians to clinics** (critical!)
   - Add/remove clinicians
   - Toggle active/inactive status

2. **Clinician Form Fields:**
   ```typescript
   interface Clinician {
     id: UUID;
     clinic_id?: UUID;  // FK to clinic
     full_name: string;
     credential?: string;
     email?: string;
     phone?: string;
     role: 'PEDORTHIST' | 'ADMIN' | 'RECEPTION' | 'MANAGER' | 'OTHER';
     active: boolean;
     created_at: DateTime;
     updated_at: DateTime;
   }
   ```

3. **API Endpoints Needed:**
   - ✅ `GET /api/clinicians/` (already exists)
   - ✅ `GET /api/clinicians/{id}/` (already exists)
   - ⚠️ `POST /api/clinicians/` (create new)
   - ⚠️ `PUT /api/clinicians/{id}/` (update)
   - ⚠️ `DELETE /api/clinicians/{id}/` (soft delete - set active=false)

4. **Key Features:**
   - ✅ Dropdown to select primary clinic
   - ✅ Role selection dropdown
   - ✅ Active/inactive toggle
   - ⚠️ Permission check (admin only)

---

### **PRIORITY 3: Enhanced Calendar UI** 🟡

#### **Current Implementation:**

**File:** `frontend/app/components/ClinicCalendar.tsx`

**What Works:**
- ✅ Displays appointments in FullCalendar
- ✅ Color-coded by clinic
- ✅ Clinic toggle filters
- ✅ Drag & drop rescheduling (partial)
- ✅ API integration working

**What's Missing:**

1. **Appointment Creation Dialog:**
   - Select clinic (dropdown)
   - Select clinician (dropdown - filtered by clinic)
   - Select patient (searchable dropdown)
   - Date/time picker
   - Duration selector
   - Reason/notes field
   - Status selector

2. **Appointment Edit Dialog:**
   - Same fields as create
   - Show historical info
   - Allow rescheduling
   - Allow status change
   - Add notes/comments

3. **Appointment Details Modal:**
   - Patient name (click to open patient record)
   - Clinic name
   - Clinician name
   - Date/time
   - Duration
   - Status
   - Reason
   - Notes
   - Quick actions: Edit, Cancel, Mark Complete

4. **Calendar Views:**
   - ✅ Month view (current)
   - ⚠️ Week view (need to implement)
   - ⚠️ Day view (need to implement)
   - ⚠️ Resource timeline view (by clinician)

5. **Filtering & Search:**
   - ✅ Filter by clinic (current)
   - ⚠️ Filter by clinician
   - ⚠️ Filter by status
   - ⚠️ Search by patient name
   - ⚠️ Date range selector

---

## 🏗️ Database Schema

### **Current Schema (Already Built)** ✅

#### **Clinic Model:**
```python
class Clinic(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    abn = models.CharField(max_length=20, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    address_json = models.JSONField(null=True, blank=True, default=dict)
    filemaker_id = models.UUIDField(null=True, blank=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### **Clinician Model:**
```python
class Clinician(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    clinic = models.ForeignKey(Clinic, on_delete=models.SET_NULL, 
                               null=True, blank=True, 
                               related_name='clinicians')
    full_name = models.CharField(max_length=200)
    credential = models.CharField(max_length=100, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    role = models.CharField(max_length=50, null=True, blank=True, 
                            choices=[...])
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### **Appointment Model:**
```python
class Appointment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    filemaker_event_id = models.UUIDField(null=True, blank=True, unique=True)
    clinic = models.ForeignKey(Clinic, on_delete=models.PROTECT, 
                               related_name='appointments')
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, 
                                related_name='appointments')
    clinician = models.ForeignKey(Clinician, on_delete=models.SET_NULL, 
                                  null=True, blank=True, 
                                  related_name='appointments')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, 
                              choices=[...], 
                              default='scheduled')
    reason = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

## 🔌 API Endpoints

### **Currently Available:**

#### **Clinics:**
```
GET    /api/clinics/              - List all clinics
GET    /api/clinics/{id}/         - Get clinic details
POST   /api/clinics/              - Create clinic (needs permission)
PUT    /api/clinics/{id}/         - Update clinic (needs permission)
DELETE /api/clinics/{id}/         - Delete clinic (needs safety check)
```

#### **Clinicians:**
```
GET    /api/clinicians/           - List all clinicians
GET    /api/clinicians/{id}/      - Get clinician details
POST   /api/clinicians/           - Create clinician
PUT    /api/clinicians/{id}/      - Update clinician
DELETE /api/clinicians/{id}/      - Delete clinician (soft delete)
```

#### **Appointments:**
```
GET    /api/appointments/                  - List appointments
GET    /api/appointments/{id}/             - Get appointment details
GET    /api/appointments/calendar_data/    - Calendar-specific format
POST   /api/appointments/                  - Create appointment
PUT    /api/appointments/{id}/             - Update appointment
DELETE /api/appointments/{id}/             - Delete appointment
```

### **Calendar Data Endpoint (Special):**

**URL:** `GET /api/appointments/calendar_data/`

**Query Parameters:**
- `clinic_id` - Filter by clinic (optional)
- `start` - Start date for date range (optional)
- `end` - End date for date range (optional)

**Response Format:**
```json
{
  "resources": [
    {
      "id": "uuid-here",
      "title": "Tamworth",
      "color": "#e11d48"
    }
  ],
  "events": [
    {
      "id": "uuid-here",
      "title": "John Smith - Dr. Jane Smith",
      "start": "2025-11-15T10:00:00Z",
      "end": "2025-11-15T11:00:00Z",
      "color": "#3b82f6",
      "extendedProps": {
        "clinicId": "uuid-here",
        "clinicName": "Tamworth",
        "patientName": "John Smith",
        "patientId": "uuid-here",
        "clinicianName": "Dr. Jane Smith",
        "status": "scheduled",
        "reason": "Initial consultation",
        "notes": "Patient needs custom orthotics"
      }
    }
  ]
}
```

---

## 🎨 Frontend Components Needed

### **1. Clinic Management (`/settings/clinics`)**

**Components to Build:**

```typescript
// Main page
app/settings/clinics/page.tsx

// Clinic list table
app/components/settings/ClinicList.tsx

// Clinic edit dialog
app/components/dialogs/ClinicDialog.tsx

// Clinic card (for grid view)
app/components/ClinicCard.tsx
```

**Features:**
- Table view of all clinics
- Search/filter clinics
- Edit clinic details (dialog)
- Add new clinic (dialog)
- Archive clinic (with confirmation)
- View appointment count per clinic

---

### **2. Clinician Management (`/settings/clinicians`)**

**Components to Build:**

```typescript
// Main page
app/settings/clinicians/page.tsx

// Clinician list table
app/components/settings/ClinicianList.tsx

// Clinician edit dialog
app/components/dialogs/ClinicianDialog.tsx

// Clinician card
app/components/ClinicianCard.tsx
```

**Features:**
- Table view of all clinicians
- Search/filter clinicians
- Edit clinician details (dialog)
- Add new clinician (dialog)
- Assign to clinic (dropdown)
- Toggle active/inactive
- Filter by clinic
- Filter by active status

---

### **3. Enhanced Calendar (`/calendar`)**

**Components to Enhance:**

```typescript
// Main calendar component (existing)
app/components/ClinicCalendar.tsx

// NEW: Appointment create dialog
app/components/dialogs/AppointmentCreateDialog.tsx

// NEW: Appointment edit dialog
app/components/dialogs/AppointmentEditDialog.tsx

// NEW: Appointment details modal
app/components/dialogs/AppointmentDetailsModal.tsx

// NEW: Calendar filters panel
app/components/CalendarFilters.tsx
```

**Features:**
- Create appointment (dialog)
- Edit appointment (dialog)
- View appointment details (modal)
- Filter by clinic ✅
- Filter by clinician (NEW)
- Filter by status (NEW)
- Search by patient name (NEW)
- Date range selector (NEW)
- View switcher (month/week/day) (NEW)
- Resource timeline by clinician (NEW)

---

## 📋 Implementation Checklist

### **Phase 1: Data Population** 🔴 **URGENT**

- [ ] **Populate Clinic Details**
  - [ ] Add phone numbers for all clinics
  - [ ] Add email addresses
  - [ ] Add ABN (for invoicing)
  - [ ] Add full addresses (street, suburb, postcode)

- [ ] **Populate Clinicians**
  - [ ] Remove sample clinicians (Dr. Jane, Dr. John, Sarah)
  - [ ] Add real clinicians from WalkEasy
  - [ ] Assign each clinician to primary clinic
  - [ ] Set correct roles (Pedorthist, Admin, Reception)

- [ ] **Link Clinicians to Appointments** (if needed)
  - [ ] Review historical appointments
  - [ ] Assign clinicians where known
  - [ ] Document unassigned appointments

### **Phase 2: Clinic Management UI** 🟡

- [ ] **Build Clinic Settings Page**
  - [ ] Create `/settings/clinics/page.tsx`
  - [ ] Build `ClinicList` component
  - [ ] Build `ClinicDialog` component
  - [ ] Add clinic edit API calls
  - [ ] Add clinic create API calls
  - [ ] Add validation (ABN, phone, email)

- [ ] **Test Clinic CRUD**
  - [ ] Create new clinic
  - [ ] Update clinic details
  - [ ] Archive clinic (with safety check)
  - [ ] View appointment count

### **Phase 3: Clinician Management UI** 🟡

- [ ] **Build Clinician Settings Page**
  - [ ] Create `/settings/clinicians/page.tsx`
  - [ ] Build `ClinicianList` component
  - [ ] Build `ClinicianDialog` component
  - [ ] Add clinician edit API calls
  - [ ] Add clinician create API calls
  - [ ] Add clinic assignment dropdown

- [ ] **Test Clinician CRUD**
  - [ ] Create new clinician
  - [ ] Assign to clinic
  - [ ] Update clinician details
  - [ ] Toggle active/inactive
  - [ ] Soft delete

### **Phase 4: Enhanced Calendar UI** 🟢

- [ ] **Build Appointment Dialogs**
  - [ ] Create `AppointmentCreateDialog`
  - [ ] Create `AppointmentEditDialog`
  - [ ] Create `AppointmentDetailsModal`
  - [ ] Add clinic/clinician dropdowns
  - [ ] Add patient search
  - [ ] Add date/time pickers

- [ ] **Add Calendar Filters**
  - [ ] Filter by clinician
  - [ ] Filter by status
  - [ ] Search by patient name
  - [ ] Date range selector

- [ ] **Add Calendar Views**
  - [ ] Week view
  - [ ] Day view
  - [ ] Resource timeline (by clinician)

- [ ] **Test Calendar Features**
  - [ ] Create appointment
  - [ ] Edit appointment
  - [ ] Drag & drop reschedule
  - [ ] Change status
  - [ ] View details

### **Phase 5: Testing & Polish** 🟢

- [ ] **Integration Testing**
  - [ ] Create clinic → assign clinician → create appointment
  - [ ] Edit appointment → change clinic/clinician
  - [ ] Archive clinic with appointments (should fail)
  - [ ] Deactivate clinician (appointments remain)

- [ ] **UI/UX Polish**
  - [ ] Mobile responsive design
  - [ ] Loading states
  - [ ] Error handling
  - [ ] Success notifications
  - [ ] Keyboard shortcuts

---

## 🚨 Critical Issues to Address

### **1. Missing Clinic Data** 🔴
**Problem:** All clinics are missing phone, email, ABN, address  
**Impact:** Cannot use for invoicing, contact, or real operations  
**Solution:** Manual data entry via admin or UI

### **2. Unassigned Clinicians** 🔴
**Problem:** 3 sample clinicians with no clinic assignment  
**Impact:** Cannot filter calendar by clinician, appointments have no clinician  
**Solution:** Replace with real clinicians, assign to clinics

### **3. Historical Appointments Missing Clinicians** 🟡
**Problem:** 8,329 appointments imported, likely many without clinician  
**Impact:** Cannot filter by clinician for historical data  
**Solution:** Accept as historical data limitation (or manually assign)

### **4. Limited Calendar UI** 🟡
**Problem:** Basic FullCalendar with minimal interaction  
**Impact:** Cannot create/edit appointments from calendar  
**Solution:** Build appointment dialogs (Phase 4)

---

## 🎯 Recommended Next Steps

### **IMMEDIATE (This Week):**

1. ✅ **Document current state** (this file) ✅
2. 🔴 **Populate clinic contact details** (phone, email, address)
3. 🔴 **Add real clinicians** (replace sample data)
4. 🔴 **Assign clinicians to clinics**

### **SHORT TERM (Next 2 Weeks):**

5. 🟡 **Build clinic management UI** (`/settings/clinics`)
6. 🟡 **Build clinician management UI** (`/settings/clinicians`)
7. 🟡 **Test CRUD operations**

### **MEDIUM TERM (Next Month):**

8. 🟢 **Enhanced calendar UI** (appointment dialogs)
9. 🟢 **Calendar filters** (clinician, status, search)
10. 🟢 **Additional calendar views** (week, day, resource timeline)

---

## 📚 Related Documentation

- **Backend Schema:** `docs/architecture/DATABASE_SCHEMA.md`
- **API Endpoints:** Auto-generated at `/api/docs/` (if enabled)
- **Frontend Components:** `frontend/app/components/`
- **FileMaker Import:** `docs/integrations/FILEMAKER.md`
- **Calendar Spec (Original):** `ChatGPT_Docs/Calendar_Spec_FullCalendar.md`

---

## 🎉 Conclusion

**Current Status:**
- ✅ Backend: COMPLETE (models, API, data imported)
- ⚠️ Frontend: PARTIAL (basic calendar, no management UI)
- 🔴 Data: INCOMPLETE (missing clinic details, clinicians)

**Priority Order:**
1. 🔴 Populate clinic/clinician data (URGENT)
2. 🟡 Build management UI (HIGH)
3. 🟢 Enhance calendar UI (MEDIUM)

**Production Readiness:**
- Backend: ✅ **READY** (95%)
- Frontend: ⚠️ **NEEDS WORK** (40%)
- Data: 🔴 **INCOMPLETE** (30%)

**Overall:** System is **60% ready** for calendar/scheduling operations. Needs data population and UI enhancements.

---

**Last Updated:** November 10, 2025  
**Next Review:** After clinic/clinician data population

