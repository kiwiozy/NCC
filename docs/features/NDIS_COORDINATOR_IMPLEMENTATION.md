# 🎯 NDIS Coordinator Implementation Plan

## 📋 Current Situation

### What We Have Now:
1. **Referrers System** - Working perfectly for GPs, specialists, podiatrists, etc.
2. **PatientReferrer** join table - Links patients to referrers with:
   - `referral_date`
   - `referral_reason`
   - `status` (ACTIVE/INACTIVE)
   - `is_primary` flag
3. **Coordinators Page** - Filters referrers by specialty ("Support Coordinator", "NDIS Coordinator")

### What FileMaker Has:
Looking at your screenshots, FileMaker stores NDIS coordinator data directly on the **Patient** record:
- `NDIS Coordinator Email`
- `NDIS Coordinator Name`
- `NDIS Coordinator Phone`
- `NDIS notes`
- `NDIS Plan End Date`
- `NDIS Plan Start Date`

---

## 🤔 The Problem

We need to decide: **Should coordinators be:**

### Option A: Part of the Referrer System (Recommended) ✅
**Store coordinators as Referrers, link via PatientReferrer**

**Pros:**
- ✅ Reuses existing, working infrastructure
- ✅ Coordinators already ARE referrers (just a different specialty)
- ✅ One coordinator can work with multiple patients (real-world scenario)
- ✅ Tracks history (when coordinator changed, who was previous, etc.)
- ✅ Allows multiple coordinators per patient over time
- ✅ `is_primary` flag shows current coordinator
- ✅ Easy to search all patients for a specific coordinator
- ✅ Coordinator gets their own detail page (contact info, patients, companies)

**Cons:**
- ⚠️ Need to add NDIS-specific fields somewhere (plan dates, NDIS notes)
- ⚠️ Slightly more complex than storing directly on patient

**Data Structure:**
```
Referrer (Coordinator)
├── id (UUID)
├── first_name
├── last_name
├── specialty → "Support Coordinator" / "NDIS Coordinator"
├── contact_json → { phone, mobile, email }
├── address_json
└── company (optional)

PatientReferrer (Patient-Coordinator Link)
├── patient_id
├── referrer_id (the coordinator)
├── referral_date (when they became coordinator)
├── status (ACTIVE/INACTIVE)
├── is_primary (TRUE for current coordinator)
└── referral_reason (optional)

Patient (NDIS-specific fields)
├── ndis_plan_start_date (NEW)
├── ndis_plan_end_date (NEW)
└── ndis_notes (NEW - or use regular notes system?)
```

---

### Option B: Direct Patient Fields (Simple but Limited) ❌
**Store coordinator info directly on Patient model**

**Pros:**
- ✅ Simpler to implement
- ✅ Matches FileMaker structure exactly

**Cons:**
- ❌ Coordinator data duplicated across multiple patients
- ❌ Can't update coordinator details in one place
- ❌ Can't see all patients for a specific coordinator
- ❌ No history tracking (who was previous coordinator?)
- ❌ Coordinator doesn't get their own page
- ❌ Hard to maintain data integrity
- ❌ What if coordinator's phone changes? Update 50 patients?

**Data Structure:**
```
Patient
├── ... existing fields ...
├── coordinator_name (NEW - plain text, duplicated)
├── coordinator_phone (NEW - duplicated)
├── coordinator_email (NEW - duplicated)
├── ndis_plan_start_date (NEW)
├── ndis_plan_end_date (NEW)
└── ndis_notes (NEW)
```

---

## 💡 Recommended Approach: Option A (Referrer System)

### Phase 1: Backend Changes

#### 1.1. Add NDIS Fields to Patient Model
**File:** `backend/patients/models.py`

```python
class Patient(models.Model):
    # ... existing fields ...
    
    # NDIS Plan Information
    ndis_plan_start_date = models.DateField(
        null=True,
        blank=True,
        help_text="NDIS plan start date"
    )
    
    ndis_plan_end_date = models.DateField(
        null=True,
        blank=True,
        help_text="NDIS plan end date"
    )
```

**Why on Patient, not PatientReferrer?**
- Plan dates are about the PATIENT's NDIS plan, not the coordinator relationship
- One patient, one active plan (even if coordinator changes)
- Makes sense conceptually

**Note:** `NDIS notes` from FileMaker will be stored on the Referrer (Coordinator) model, not on Patient

#### 1.2. Update Patient Serializer
**File:** `backend/patients/serializers.py`

Add new fields to serializer:
```python
class PatientSerializer(serializers.ModelSerializer):
    # ... existing fields ...
    
    class Meta:
        model = Patient
        fields = [
            # ... existing fields ...
            'ndis_plan_start_date',
            'ndis_plan_end_date',
        ]
```

#### 1.3. Add Notes Field to Referrer Model
**File:** `backend/referrers/models.py`

```python
class Referrer(models.Model):
    # ... existing fields ...
    
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="Notes about this referrer/coordinator (NDIS notes from FileMaker will be stored here)"
    )
```

**Why notes on Referrer?**
- FileMaker's `NDIS notes` field is mixed/unstructured data about the coordinator
- Multiple patients may mention the same coordinator with different notes
- We'll combine/merge all notes for each coordinator during import

#### 1.4. Run Migration
```bash
python manage.py makemigrations
python manage.py migrate
```

---

### Phase 2: Import Script Updates

#### 2.1. Import Coordinator Contact Details
**Create:** `scripts/reimport/phase10_referrers/import_coordinators_from_contacts.py`

**What it does:**
1. Read `Contacts.xlsx` (patient records)
2. Extract unique coordinator names/phones/emails/notes
3. Merge contact details for coordinators mentioned by multiple patients
4. Create `Referrer` records with specialty = "Support Coordinator"
5. Store combined notes in `Referrer.notes`

**Columns from Contacts.xlsx:**
- `NDIS Coordinator Name` → Referrer.first_name, last_name
- `NDIS Coordinator Phone` → Referrer.contact_json.phones (array)
- `NDIS Coordinator Email` → Referrer.contact_json.emails (array)
- `NDIS notes` → Referrer.notes (merged from all patients who mention this coordinator)

**Merge Logic:**
If the same coordinator appears multiple times:
- Combine all unique phone numbers into array
- Combine all unique email addresses into array
- Concatenate all notes with separators (e.g., `\n---\n`)

Example:
```
Patient 1: "John Smith", phone: "0412 345 678", email: "john@ndis.com.au", notes: "Prefers mornings"
Patient 2: "John Smith", phone: "0498 765 432", email: "john@provider.com", notes: "Based in Newcastle"

Result:
Referrer (John Smith)
├── contact_json: {
│       phones: ["0412 345 678", "0498 765 432"],
│       emails: ["john@ndis.com.au", "john@provider.com"]
│   }
└── notes: "Prefers mornings\n---\nBased in Newcastle"
```

#### 2.2. Link Patients to Coordinators
**Update:** `scripts/reimport/phase3_patients/import_patients_from_excel.py`

**What it does:**
1. Import patient data (as it does now)
2. **NEW:** Read NDIS plan dates from patient row
3. **NEW:** Store `NDIS Plan Start Date` and `NDIS Plan End Date` on Patient
4. **NEW:** Read `NDIS Coordinator Name` from patient row
5. **NEW:** Look up coordinator in `Referrer` table (by name)
6. **NEW:** Create `PatientReferrer` link with:
   - `referrer_id` → coordinator
   - `referral_date` → `NDIS Plan Start Date` or today
   - `status` → 'ACTIVE'
   - `is_primary` → True (they're the current coordinator)

**Columns from Contacts.xlsx:**
- `NDIS Coordinator Name` → Look up Referrer → Create PatientReferrer link
- `NDIS Plan Start Date` → Patient.ndis_plan_start_date
- `NDIS Plan End Date` → Patient.ndis_plan_end_date
- ~~`NDIS notes`~~ → (Stored on Referrer, not Patient)

#### 2.3. Update Master Import
**File:** `scripts/reimport/master_reimport.py`

Add new phase:
```python
{
    'name': 'coordinators',
    'number': 10.5,
    'description': 'Import Coordinators from Patient Data',
    'scripts': [
        'phase10_referrers/import_coordinators_from_contacts.py',  # Extract coordinators
        # Patient import (Phase 3) will then link patients to these coordinators
    ],
    'required': False,
    'stop_on_error': False,
}
```

**Import Order:**
1. **Phase 2.5: Extract Coordinators from Contacts** (NEW - runs before patient import)
   - Scan all patients in Contacts.xlsx
   - Extract unique coordinators with merged contact details and notes
   - Create Referrer records
2. Phase 3: Import Patients
   - Reads NDIS plan dates
   - Stores on Patient model
3. **Phase 3.5: Link Patients to Coordinators** (NEW - runs after patient import)
   - Links each patient to their coordinator via PatientReferrer
4. Phase 10: Import Referrers (GPs, specialists)
5. Phase 10+: Patient-Referrer relationships for medical referrers

---

### Phase 3: Frontend Updates

#### 3.1. Patient Details Page
**File:** `frontend/app/patients/page.tsx`

**Add new section: "NDIS Plan Information"**

```typescript
{/* NDIS Plan Information - Only show for NDIS patients */}
{selectedContact?.funding === 'NDIS' && (
  <Paper p="xl" shadow="xs">
    <Text size="lg" fw={600} mb="md">NDIS Plan Information</Text>
    <Stack gap="md">
      {/* Plan Dates */}
      <Group gap="lg">
        <div>
          <Text size="sm" c="dimmed">Plan Start Date</Text>
          <Text size="md">
            {selectedContact.ndis_plan_start_date 
              ? formatDate(selectedContact.ndis_plan_start_date)
              : 'Not set'}
          </Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Plan End Date</Text>
          <Text size="md">
            {selectedContact.ndis_plan_end_date 
              ? formatDate(selectedContact.ndis_plan_end_date)
              : 'Not set'}
          </Text>
        </div>
      </Group>
    </Stack>
  </Paper>
)}
```

**Note:** NDIS notes are stored on the Coordinator (Referrer) record, not the patient. They can be viewed on the Coordinator's detail page.

#### 3.2. Coordinator Section (Already Exists!)
**The coordinator section you already built** will automatically work:
- Shows coordinator name, contact details (from Referrer record)
- Shows "Primary" badge for current coordinator
- Allows searching and selecting different coordinators
- Shows history of coordinators

**It just needs the backend data to be populated!**

#### 3.3. Search/Filter Separation
**Important:** Coordinators and Referrers must be kept separate in searches and lists:

**Referrers Page** (`/referrers`):
```typescript
// Exclude coordinators from referrers list
const referrersList = allData.filter(r => {
  const specialty = r.specialty_name?.toLowerCase() || '';
  return !specialty.includes('support coordinator') && 
         !specialty.includes('ndis coordinator') &&
         !specialty.includes('plan manager');
});
```

**Coordinators Page** (`/coordinators`):
```typescript
// Only show coordinators (already implemented)
const coordinatorsList = allData.filter(r => {
  const specialty = r.specialty_name?.toLowerCase() || '';
  return specialty.includes('support coordinator') || 
         specialty.includes('ndis coordinator') ||
         specialty.includes('plan manager');
});
```

**Patient Page - Coordinator Search**:
```typescript
// When searching for coordinator to link to patient
const coordinatorResults = searchResults.filter(r => {
  const specialty = r.specialty_name?.toLowerCase() || '';
  return specialty.includes('support coordinator') || 
         specialty.includes('ndis coordinator') ||
         specialty.includes('plan manager');
});
```

**Result:**
- Searching for "referrers" won't show coordinators
- Searching for "coordinators" won't show GPs/specialists
- Patient coordinator search only shows coordinators

---

## 🔄 Data Flow

### Import Flow:
```
FileMaker Contacts.xlsx
    ↓
1. Extract unique coordinators (Phase 2.5 - NEW)
    ↓
    Referrer table (specialty = "Support Coordinator")
    - Merge contact details (phones, emails) from multiple patient records
    - Merge NDIS notes from multiple patient records
    ↓
2. Import patients with NDIS fields (Phase 3)
    ↓
    Patient table (ndis_plan_start_date, ndis_plan_end_date)
    ↓
3. Link patients to coordinators (Phase 3.5 - NEW)
    ↓
    PatientReferrer table (patient ↔ coordinator, is_primary=True)
```

### Frontend Display Flow:
```
Patient Details Page
    ↓
Fetch Patient API (/api/patients/{id}/)
    ↓ (includes referrers array)
Patient object with:
    - ndis_plan_start_date
    - ndis_plan_end_date
    - referrers: [{ name, specialty, is_primary, notes, ... }]
    ↓
Display:
    - NDIS Plan section (if funding = NDIS) - shows plan dates only
    - Coordinator section (shows referrer where specialty = "Support Coordinator")
    - Click coordinator → view their detail page → see notes
```

---

## 📊 Benefits of This Approach

### 1. **Data Integrity**
- Coordinator stored once, linked to many patients
- Update coordinator phone in one place → updates for all patients
- No data duplication

### 2. **Flexibility**
- Patient can have multiple coordinators over time
- Track when coordinator changed
- Easy to report: "Show all patients for Coordinator X"

### 3. **Consistency**
- Coordinators and Referrers use same system
- Same UI patterns (search, select, view history)
- Same backend infrastructure

### 4. **Real-World Scenarios**
- ✅ Coordinator leaves company → mark as INACTIVE, assign new coordinator
- ✅ Patient switches to different coordinator → new PatientReferrer link, old one becomes non-primary
- ✅ View coordinator's caseload → PatientReferrer query
- ✅ Coordinator's phone changes → update Referrer record once

---

## 🚀 Implementation Steps

### Step 1: Backend (Django)
1. ✅ Add NDIS fields to Patient model
2. ✅ Update Patient serializer
3. ✅ Run migration

### Step 2: Import Scripts
1. ✅ Create `import_coordinators_from_contacts.py`
   - Extract unique coordinators from Contacts.xlsx
   - Create Referrer records
2. ✅ Update `import_patients_from_excel.py`
   - Read NDIS fields
   - Link to coordinators
3. ✅ Update `master_reimport.py`
   - Add coordinator extraction phase
4. ✅ Test full reimport

### Step 3: Frontend (Next.js)
1. ✅ Add NDIS Plan section to Patient Details page
   - Show plan start/end dates
   - Show NDIS notes
   - Only visible for NDIS-funded patients
2. ✅ Test coordinator display (should already work!)

### Step 4: Testing
1. ✅ Run full reimport with new coordinator logic
2. ✅ Verify coordinators appear on Coordinators page
3. ✅ Verify patients linked to coordinators
4. ✅ Verify NDIS plan dates display correctly
5. ✅ Test selecting different coordinator

---

## 🤔 Discussion Points

### Question 1: NDIS Notes Location ✅ **RESOLVED**
**Decision:** Store on `Referrer.notes` (coordinator), NOT on Patient

**Reasoning:** 
- FileMaker's NDIS notes field is mixed/unstructured data about the coordinator
- Multiple patients may mention same coordinator with different notes
- We merge/combine all notes for each coordinator during import

**Implementation:**
- Patient has: `ndis_plan_start_date`, `ndis_plan_end_date` (plan-specific)
- Referrer has: `notes` (coordinator-specific, merged from all patients)

### Question 2: Coordinator Specialty
**What should we use for specialty?**
- "Support Coordinator"? ✅ (Most common)
- "NDIS Coordinator"? ✅ (Alternative)
- "Plan Manager"? (Different role, but related)

**Recommendation:** Accept all three in the filter, create as "Support Coordinator" by default.

### Question 4: Contact Details Merge ✅ **RESOLVED**
**Decision:** Merge/combine all contact details when same coordinator appears multiple times

**Implementation:**
```python
Referrer.contact_json = {
    "phones": ["0412 345 678", "0498 765 432"],  # All unique phones
    "emails": ["john@ndis.com.au", "j.smith@provider.com"]  # All unique emails
}

Referrer.notes = "Note from patient 1\n---\nNote from patient 2\n---\nNote from patient 3"
```

### Question 5: Search/Filter Separation ✅ **RESOLVED**
**Decision:** Keep coordinators and referrers separate in searches

**Implementation:**
- Referrers page: Exclude "Support Coordinator" specialty
- Coordinators page: Only show "Support Coordinator" specialty
- Patient coordinator search: Only show coordinators
- Backend uses same table, frontend filters by specialty

### Question 6: Plan Date Changes
**What happens when plan is renewed?**
- Update `ndis_plan_end_date` on Patient
- Keep same coordinator link (unless coordinator changes)
- Add renewal notes in `Referrer.notes` if needed

**Recommendation:** Simple update of dates via admin interface.

---

## 📝 Summary

**We treat Coordinators as a special type of Referrer:**
- ✅ Store coordinator details in `Referrer` table (specialty = "Support Coordinator")
- ✅ Store coordinator notes in `Referrer.notes` (merged from all patients)
- ✅ Merge contact details (phones/emails) from multiple patient records
- ✅ Link patients to coordinators via `PatientReferrer` table
- ✅ Store NDIS plan dates on `Patient` model (not notes)
- ✅ Filter searches to keep coordinators and referrers separate
- ✅ Reuse existing UI for coordinator selection (it already works!)
- ✅ Import coordinator data from FileMaker Contacts.xlsx

**This gives us:**
- One source of truth for coordinator data
- Full history tracking
- Easy reporting
- Consistent UX with referrers system
- Scalable for future needs
- Clean separation in search/filter

---

## ❓ Next Steps

**✅ Decisions Made:**
1. ✅ Coordinators are stored as Referrers (specialty-based)
2. ✅ NDIS notes go on Referrer.notes (not Patient)
3. ✅ Contact details merged/combined for duplicate coordinators
4. ✅ Searches filtered to keep coordinators and referrers separate
5. ✅ NDIS plan dates stored on Patient model

**Ready to implement! 🚀**

The implementation plan is complete and approved. Next step: Start coding the backend models and import scripts.

