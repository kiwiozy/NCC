# Database Schema Documentation

**Purpose:** Centralized documentation of all database tables, fields, and relationships as we build features.

**Approach:** Document as we go - update this file whenever we add/modify tables, fields, or relationships.

> ⚠️ **IMPORTANT:** If this database schema documentation is updated, you **MUST** also update the "Database Schema Documentation" section in `.cursor/rules/projectrules.mdc` to keep them synchronized. The project rules file is used by Cursor AI to provide context-aware assistance, so both files must stay in sync.

**Last Updated:** 2025-01-15

---

## 📊 **Current Database Tables**

### ✅ **1. `patients` Table**

**Model:** `patients.models.Patient`  
**Status:** ✅ Exists (updated with new fields)

**Fields:**

#### Primary & Identifiers
- `id` - UUID (primary key)
- `mrn` - CharField(50) - Medical Record Number (optional, unique)
- `health_number` - CharField(50) - Health number (optional, different from MRN)

#### Name Fields
- `title` - CharField(10) - Choices: Mr, Mrs, Ms, Miss, Dr, Prof
- `first_name` - CharField(100)
- `middle_names` - CharField(100) (optional)
- `last_name` - CharField(100)

#### Demographics
- `dob` - DateField - Date of Birth
- `sex` - CharField(20) - Choices: M, F, O, U
- `age` - Property (calculated from DOB)

#### Relationships
- `funding_type` - **ForeignKey** → `settings.FundingSource` (nullable)
  - Related name: `patients`
  - On delete: SET_NULL
- `clinic` - **ForeignKey** → `clinicians.Clinic` (nullable)
  - Related name: `patients`
  - On delete: SET_NULL

#### NDIS/Plan Information
- `coordinator_name` - CharField(200) - Coordinator name (e.g., "Warda - Ability Connect")
- `coordinator_date` - DateField - Date when coordinator was assigned
- `plan_start_date` - DateField - NDIS plan start date
- `plan_end_date` - DateField - NDIS plan end date

**⚠️ Note:** Frontend supports multiple coordinators with dates (array format), but backend currently only has single coordinator fields. Backend decision needed for multiple coordinators support.

#### JSON Fields
- `contact_json` - JSONField - Contact details (phones, emails, mobile)
  - **Structure:**
    ```json
    {
      "phone": {
        "home": { "value": "0412345678", "default": true },
        "work": { "value": "0298765432", "default": false }
      },
      "mobile": {
        "home": { "value": "0412345678", "default": false }
      },
      "email": {
        "home": { "value": "patient@example.com", "default": true },
        "work": { "value": "patient@work.com", "default": false }
      }
    }
    ```
    - **Legacy format also supported:** `{ "phone": "0412345678", "email": "patient@example.com" }`

- `address_json` - JSONField - Address details
  - **Structure:**
    ```json
    {
      "street": "123 Main St",
      "street2": "Unit 4",
      "suburb": "Sydney",
      "postcode": "2000",
      "state": "NSW",
      "type": "home",
      "default": true
    }
    ```

- `emergency_json` - JSONField - Emergency contact details
- `flags_json` - JSONField - Risk flags, alerts, notes

#### Notes & Archive
- `notes` - TextField - General notes about patient
- `archived` - BooleanField - Soft delete flag
- `archived_at` - DateTimeField - When archived
- `archived_by` - CharField(100) - Who archived (optional)

#### Audit Fields
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)

**Indexes:**
- `['last_name', 'first_name']`
- `['mrn']`
- `['created_at']`
- `['archived']`

---

### ✅ **2. `funding_sources` Table**

**Model:** `settings.models.FundingSource`  
**Status:** ✅ Exists

**Fields:**
- `id` - UUID (primary key)
- `name` - CharField(100) - Funding source name (e.g., "NDIS", "Private", "DVA")
- `code` - CharField(20) - Optional short code (e.g., "NDIS", "PRV", "DVA")
- `active` - BooleanField - Whether this funding source is active
- `order` - IntegerField - Order for sorting in dropdowns
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)

**Relationships:**
- **One-to-Many:** `patients` ← Patient.funding_type

**Usage:**
- Managed through Settings page
- Used in patient forms/dropdowns
- Linked to patients via `funding_type` FK

---

### ✅ **3. `clinics` Table**

**Model:** `clinicians.models.Clinic`  
**Status:** ✅ Exists

**Fields:** (Need to check actual model)
- `id` - UUID (primary key)
- `name` - CharField - Clinic name
- (Other fields to be documented)

**Relationships:**
- **One-to-Many:** `patients` ← Patient.clinic
- **One-to-Many:** `appointments` ← Appointment.clinic
- **One-to-Many:** `clinicians` ← Clinician.clinic (if exists)

**Usage:**
- Managed through Settings page
- Used in calendar for scheduling
- Linked to patients, appointments, and clinicians

---

### ✅ **4. `appointments` Table**

**Model:** `appointments.models.Appointment`  
**Status:** ✅ Exists

**Fields:**
- `id` - UUID (primary key)
- `start_time` - DateTimeField - Appointment start (UTC, display in Australia/Sydney)
- `end_time` - DateTimeField - Appointment end (optional)
- `status` - CharField(20) - Choices: scheduled, checked_in, completed, cancelled, no_show
- `reason` - TextField - Reason for appointment/chief complaint
- `notes` - TextField - Additional appointment notes
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)

**Relationships:**
- `patient` - **ForeignKey** → `patients.Patient`
  - Related name: `appointments`
  - On delete: PROTECT
- `clinician` - **ForeignKey** → `clinicians.Clinician` (nullable)
  - Related name: `appointments`
  - On delete: SET_NULL
- `clinic` - **ForeignKey** → `clinicians.Clinic`
  - Related name: `appointments`
  - On delete: PROTECT

---

### ✅ **5. `documents` Table**

**Model:** `documents.models.Document`  
**Status:** ✅ Exists

**Fields:**
- `id` - UUID (primary key)
- `object_id` - UUIDField - Generic Foreign Key target ID
- `content_type` - **ForeignKey** → `contenttypes.ContentType` (Generic FK)
- `file_name` - CharField(255)
- `original_name` - CharField(255)
- `file_size` - IntegerField - File size in bytes
- `mime_type` - CharField(100)
- `s3_bucket` - CharField(255)
- `s3_key` - CharField(512) - S3 object key/path
- `s3_url` - URLField(1024) - Pre-signed or public URL
- `category` - CharField(50) - Choices: medical, prescription, referral, xray, invoice, quote, consent, insurance, other
- `description` - TextField
- `tags` - JSONField - Array of tags
- `uploaded_by` - CharField(100)
- `uploaded_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)
- `is_active` - BooleanField

**Relationships:**
- **Generic Foreign Key:** Can link to any model (Patient, Appointment, etc.)
  - Uses `content_type` and `object_id` pattern

---

### ✅ **6. `reminders` Table**

**Model:** `reminders.models.Reminder`  
**Status:** ✅ Exists (Built)

**Fields:**

#### Primary & Relationships
- `id` - UUID (primary key)
- `patient` - **ForeignKey** → `patients.Patient` (CASCADE)
  - Related name: `reminders`
- `clinic` - **ForeignKey** → `clinicians.Clinic` (SET_NULL, nullable)
  - Related name: `reminders`

#### Reminder Details
- `note` - TextField - Reminder note/description
- `reminder_date` - DateField (optional) - Specific date for reminder
- `status` - CharField(20) - Choices: pending, scheduled, completed, cancelled
  - Default: 'pending'

#### Appointment Link
- `appointment_id` - UUIDField (nullable) - Link to appointment if converted
- `scheduled_at` - DateTimeField (nullable) - When converted to appointment

#### Audit Fields
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)
- `created_by` - CharField(100) (nullable) - User who created reminder

**Indexes:**
- `['status']`
- `['clinic', 'status']`
- `['patient']`
- `['reminder_date']`

**Usage:**
- Created from patient profile via ReminderDialog
- Appears in calendar "waiting list" section (pending status)
- Can be converted to appointment when scheduling
- API endpoints: See `docs/architecture/dialogs/ReminderDialog.md`

---

## 🔗 **Relationship Diagram**

```
patients
  ├── funding_type → funding_sources (FK, nullable)
  ├── clinic → clinics (FK, nullable)
  └── appointments ← appointments (One-to-Many)

funding_sources
  └── patients ← patients.funding_type (One-to-Many)

clinics
  ├── patients ← patients.clinic (One-to-Many)
  ├── appointments ← appointments.clinic (One-to-Many)
  └── clinicians ← clinicians.clinic (One-to-Many, if exists)

appointments
  ├── patient → patients (FK, PROTECT)
  ├── clinician → clinicians (FK, nullable, SET_NULL)
  └── clinic → clinics (FK, PROTECT)

reminders ✅
  ├── patient → patients (FK, CASCADE)
  └── clinic → clinics (FK, nullable, SET_NULL)

documents
  └── Generic FK → Any model (content_type + object_id)
```

---

## 📝 **Pending/Planned Tables**

### ❌ **Orders Table** (Not Yet Built)
- Needed for: Orders pages, Patient Detail, Dashboard
- Will link to: `patients`, `invoices`

### ❌ **Invoices Table** (Not Yet Built)
- Needed for: Invoice pages, Patient Detail, Order Detail
- Will link to: `patients`, `orders`

### ❌ **Patient Coordinators Table** (Decision Needed)
- **Option A:** Add `coordinators_json` JSONField to `patients` table (recommended for now)
- **Option B:** Create separate `patient_coordinators` table with FK
  - Fields: `id`, `patient_id` (FK), `coordinator_name`, `assignment_date`, `created_at`, `updated_at`
- **Current Status:** Frontend supports multiple coordinators, backend needs decision

---

## 🔄 **Data Flow Notes**

### Communication Data
- **Phone/Mobile/Email:** Stored in `patients.contact_json`
  - New format: `{ phone: { home: { value: "...", default: true } } }`
  - Legacy format: `{ phone: "..." }` (still supported)
- **Address:** Stored in `patients.address_json`
  - Format: `{ street, suburb, postcode, state, type, default }`

### Archive/Soft Delete
- All patient records use soft delete (`archived` flag)
- Never actually delete records
- Archive filter in frontend shows/hides archived records

---

## 🚧 **Migration Notes**

### Completed Migrations
- ✅ Patient model with all basic fields
- ✅ Added `title`, `health_number`, `funding_type`, `clinic` FKs
- ✅ Added `coordinator_name`, `coordinator_date`
- ✅ Added `plan_start_date`, `plan_end_date`
- ✅ Added `notes` field
- ✅ Added archive fields (`archived`, `archived_at`, `archived_by`)
- ✅ Created `reminders` table with all fields and relationships

### Pending Migrations
- ⚠️ **Multiple Coordinators:** Need to decide on JSONField vs separate table
- ⚠️ **Orders/Invoices:** Tables not yet created
- ⚠️ **Any new fields:** Document here as we add them

---

## 📚 **Related Documentation**

- **Page Documentation:** `docs/architecture/pages/PatientsPage.md` - Patient page requirements
- **Dialog Documentation:** 
  - `docs/architecture/dialogs/CommunicationDialog.md` - Communication data structure
  - `docs/architecture/dialogs/ReminderDialog.md` - Reminder functionality
- **Settings:** `docs/architecture/settings/SETTINGS_REQUIREMENTS.md` - Settings tables

---

**Update Strategy:**
1. Update this file whenever we:
   - Add a new table/model
   - Add/modify fields in existing tables
   - Add/modify relationships (FKs)
   - Change JSON field structures
2. Keep it synchronized with actual Django models
3. Document decisions and alternatives considered
4. Note any pending decisions or TODO items

