# Settings Requirements

**Purpose:** Document all settings that need to be managed through the Settings page

**Last Updated:** November 4, 2025

---

## 🎯 **Overview**

The Settings page (`/settings`) needs to manage configuration data that is used throughout the application. This includes:

1. **Funding Sources** - List of funding types for patients
2. **Clinics** - Clinic details used in calendar, patients, and clinicians
3. **Integration Settings** - Already implemented (Gmail, Xero, SMS, S3)

---

## 📋 **Required Settings**

### **1. Funding Sources Management** ⚠️ **NOT YET IMPLEMENTED**

**Location:** Settings → General (or new "Funding Sources" tab)

**Purpose:** Manage the list of funding sources available in dropdowns throughout the app.

#### **Fields:**
- **Name** - Text (e.g., "NDIS", "Private", "DVA", "Workers Comp", "Medicare")
- **Code** - Optional short code (e.g., "NDIS", "PRV", "DVA")
- **Active** - Boolean (default: true)
- **Order** - Integer (for sorting in dropdowns)

#### **Actions:**
- ✅ Add new funding source
- ✅ Edit existing funding source
- ✅ Archive/delete funding source
- ✅ Reorder funding sources

#### **Usage:**
- Used in **Patients Page** filter dropdown
- Used in **Patients Page** patient detail form (Funding dropdown)
- Used in **Patient Model** `funding_type` field

#### **Database:**
```python
# Option 1: Separate table
class FundingSource(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True, null=True)
    active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

# Option 2: JSON field in Settings model
# Store as JSON array in a Settings model
```

#### **API Endpoints Needed:**
- `GET /api/settings/funding-sources/` - List all funding sources
- `POST /api/settings/funding-sources/` - Create new funding source
- `PUT /api/settings/funding-sources/:id` - Update funding source
- `DELETE /api/settings/funding-sources/:id` - Archive funding source

---

### **2. Clinics Management** ⚠️ **BACKEND EXISTS, FRONTEND SETTINGS UI NEEDED**

**Location:** Settings → General (or new "Clinics" tab)

**Purpose:** Manage clinic details used in calendar, patients, and clinicians.

#### **Current Status:**
- ✅ **Backend Model Exists:** `backend/clinicians/models.py` - `Clinic` model
- ✅ **Backend API Exists:** `GET /api/clinics/` endpoint
- ❌ **Frontend Settings UI:** Not yet built
- ⚠️ **Currently Hardcoded:** Frontend uses hardcoded list

#### **Fields (from existing Clinic model):**
- **Name** - Text (e.g., "Walk Easy Tamworth")
- **ABN** - Text (Australian Business Number, optional)
- **Phone** - Text (main clinic phone)
- **Email** - Email (main clinic email)
- **Address** - JSON (clinic address details)
  - `street`, `city`, `state`, `postcode`, `country`

#### **Additional Fields Needed:**
- **Active** - Boolean (default: true)
- **Order** - Integer (for sorting in dropdowns)
- **Color** - Optional hex color for calendar display

#### **Actions:**
- ✅ Add new clinic
- ✅ Edit existing clinic
- ✅ Archive/delete clinic
- ✅ Reorder clinics

#### **Usage:**
- **Patients Page:**
  - Filter dropdown (filter patients by clinic)
  - Patient detail form (assign clinic to patient)
- **Calendar:**
  - Clinic selection for appointments
  - Location-based scheduling
  - Resource grouping in FullCalendar
- **Clinicians:**
  - Clinic assignment for clinicians
  - Link clinicians to their clinic

#### **Database:**
```python
# Already exists in backend/clinicians/models.py
class Clinic(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    abn = models.CharField(max_length=20, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address_json = models.JSONField(default=dict, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # TODO: Add these fields
    active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    color_hex = models.CharField(max_length=7, blank=True, null=True)
```

#### **API Endpoints:**
- ✅ `GET /api/clinics/` - List all clinics (exists)
- ✅ `POST /api/clinics/` - Create new clinic (exists)
- ✅ `PUT /api/clinics/:id` - Update clinic (exists)
- ✅ `DELETE /api/clinics/:id` - Archive clinic (exists)
- ❌ **Frontend Settings UI:** Needs to be built

---

## 🔗 **Relationships**

### **Clinic → Patient**
- Patient has `clinic_id` ForeignKey to Clinic
- When assigning clinic to patient, dropdown loads from Clinic settings

### **Clinic → Calendar**
- Appointments can be assigned to a clinic
- Calendar resources can be grouped by clinic
- Clinic color used for calendar display

### **Clinic → Clinician**
- Clinician has `clinic_id` ForeignKey to Clinic
- Clinicians are assigned to a clinic

### **Funding Source → Patient**
- Patient has `funding_type` field (currently string, should be FK or enum)
- Filter dropdown loads from Funding Source settings

---

## 📝 **Implementation Plan**

### **Phase 1: Funding Sources**
1. Create `FundingSource` model (or use Settings JSON)
2. Create API endpoints
3. Create Settings UI component
4. Update Patients page to use API instead of hardcoded list
5. Update Patient model to use ForeignKey or enum

### **Phase 2: Clinics Settings UI**
1. Create Settings UI component for Clinics
2. Connect to existing `/api/clinics/` endpoint
3. Add `active`, `order`, `color_hex` fields to Clinic model
4. Update Patients page to use API instead of hardcoded list
5. Update Calendar to load clinics from API

---

## 🎨 **UI Design**

### **Settings Page Structure**
```
Settings
├── General
│   ├── Funding Sources (NEW)
│   └── Clinics (NEW)
├── Gmail ✅
├── Xero ✅
├── SMS ✅
├── S3 ✅
├── Notes ✅
└── AT Report ✅
```

### **Funding Sources Settings UI**
- List view with Add button
- Each row: Name, Code, Active toggle, Order, Actions
- Edit/Delete buttons
- Drag to reorder (optional)

### **Clinics Settings UI**
- List view with Add button
- Each row: Name, ABN, Phone, Email, Active toggle, Order, Actions
- Edit/Delete buttons
- Form fields: Name, ABN, Phone, Email, Address (JSON), Color picker

---

## ✅ **Status Checklist**

### **Funding Sources**
- [ ] Database model created
- [ ] API endpoints created
- [ ] Settings UI component created
- [ ] Patients page updated to use API
- [ ] Patient model updated to use FK/enum

### **Clinics**
- [x] Database model exists
- [x] API endpoints exist
- [ ] Settings UI component created
- [ ] Additional fields added (active, order, color)
- [ ] Patients page updated to use API
- [ ] Calendar updated to use API

---

## 📚 **Related Documentation**

- [Patients Page](./pages/PatientsPage.md)
- [Calendar Guide](../frontend/CALENDAR_GUIDE.md)
- [Backend Clinicians Models](../backend/CLINICIANS.md)

