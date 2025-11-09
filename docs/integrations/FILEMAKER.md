# FileMaker Data Migration

**Last Updated:** November 9, 2025  
**Status:** ✅ Core Data Complete (55,758 records)  
**Database:** WEP-DatabaseV2

---

## 📊 Overview

Migrating patient and clinical data from FileMaker Pro to Nexus PostgreSQL database.

**FileMaker Database:**
- 10 API tables accessible via OData
- 34,345 total records
- Server: walkeasy.fmcloud.fm

**✅ Import Complete:**
- ✅ 2,842 patients imported (full demographics + contact info)
- ✅ 11 clinics imported (with filemaker_id tracking)
- ✅ 228 referrers imported (GPs, specialists, etc.)
- ✅ 92 companies imported (medical practices + NDIS providers)
- ✅ 183 coordinators imported (NDIS Support Coordinators)
- ✅ 8,329 appointments imported (past + future)
- ✅ 42,036 clinical notes imported
- ✅ 1,706 patient-referrer links
- ✅ 247 patient-coordinator links
- ✅ 63 referrer-company links
- ✅ 21 specialty lookup records

**📊 Grand Total: 55,758 Records Imported**

**⏸️ Remaining (Optional):**
- Documents & Images: 11,269 docs + 6,664 images (Phase 6 - requires streaming URLs)
- SMS History: Templates + message history (Phase 7 - optional)

---

## 🗂️ FileMaker Tables (10 total)

| Table | Records | Status | Maps To | Imported |
|-------|---------|--------|---------|----------|
| `API_Contacts` | 2,845 | ✅ Complete | `patients` | 2,842 |
| `API_Contact_Details` | 10,688 | ✅ Complete | `patients.contact_json` | Merged |
| `API_Notes` | 11,399 | ✅ Complete | `notes` | 42,036 |
| `API_Clinic_Name` | 11 | ✅ Complete | `clinics` | 11 |
| `API_Referrer` | 234 | ✅ Complete | `referrers` | 228 |
| `API_Company` | 92 | ✅ Complete | `companies` | 92 |
| `API_ContactToReferrer` | 1,720 | ✅ Complete | `patient_referrers` | 1,706 |
| `API_ReferrerToCompany_Join` | 73 | ✅ Complete | `referrer_companies` | 63 |
| `API_event` | 15,127 | ✅ Complete | `appointments` | 8,329 (with patients) |
| `API_Docs` | 11,269 | ⏸️ Phase 6 | `documents` | Phase 2 |
| `API_Images` | 6,664 | ⏸️ Phase 6 | `documents` | Phase 2 |

---

## ✅ Phase 1: Patients (Complete)

### What Was Imported

**Patients (2,845 records):**
- Names (title, first, last)
- Demographics (DOB, sex)
- Contact info (phone, mobile, email) → `contact_json`
- Address → `address_json`
- Health number
- Xero contact ID
- Coordinator name (single - will be migrated to join table)

**Contact Details (10,688 records):**
- Merged into `patients.contact_json`
- Structure: `{type: {name: {value: string, default: bool}}}`
- Types: phone, mobile, email
- Labels: Home, Work, Mobile, etc.

### Import Command

```bash
cd backend
python manage.py import_filemaker_data
```

### Known Issues

1. **DOBs** - Many NULL (FileMaker data incomplete)
2. **Coordinator** - Single text field, needs parsing for historical tracking
3. **Funding** - References value list, need to create lookup table

---

## ✅ Phase 2: Clinics (Complete)

### What Was Imported

**11 clinics from FileMaker:**
- Tamworth, Newcastle, Armidale, RPA, Gunnedah, Concord, Better Health Practice, Coffs Harbour, Inverell, Home Visit, Narrabri
- Each clinic assigned a `filemaker_id` for tracking
- Existing Newcastle/Tamworth clinics were deleted before import

### Import Command

```bash
cd backend
python manage.py import_filemaker_clinics
```

---

## ✅ Phase 3: Referrers & Companies (Complete)

### What Was Imported

**228 Referrers (GPs, Specialists, etc.):**
- Medical referrers with specialty classification
- Contact information (phone, email)
- Linked to medical practices via companies
- 21 unique specialties imported

**92 Companies (Medical Practices & NDIS Providers):**
- Medical practices, NDIS providers, etc.
- Contact information and addresses
- Company type classification

**1,706 Patient-Referrer Links:**
- Historical referral tracking
- Referral dates preserved
- Active status tracking

**63 Referrer-Company Links:**
- Practice affiliations for referrers
- Dynamic `practice_name` property

### Import Command

```bash
cd backend
python manage.py import_filemaker_referrers
```

---

## ✅ Phase 4: Coordinators (Complete)

### What Was Imported

**183 NDIS Support Coordinators:**
- Extracted from patient NDIS coordinator data
- Contact information (phone, email)
- Organization affiliations
- Coordinator type classification

**247 Patient-Coordinator Links:**
- Historical coordinator assignments
- NDIS plan start/end dates
- NDIS-specific notes
- Current status tracking

### Import Command

```bash
cd backend
python manage.py import_coordinators_only
```

---

## ✅ Phase 5: Appointments (Complete)

### What Was Imported

**8,329 Patient Appointments:**
- Imported from `API_event` (filtered for appointments with patients)
- Linked to clinics and patients
- Date/time properly parsed and combined
- Status automatically mapped:
  - Past appointments: `status = 'completed'` (8,319)
  - Future appointments: `status = 'scheduled'` (10)
- Appointment reason extracted from notes
- **Skipped:** 1,492 appointments (clinics not in database)
- **Skipped:** 5,292 block bookings/holidays (no patient ID)

### Import Command

```bash
cd backend
python manage.py import_filemaker_appointments
```

### Key Features

- **Case-insensitive UUID matching** - Handles FileMaker's uppercase UUIDs
- **Automated status mapping** - Past vs. future classification
- **Reason extraction** - First sentence/line from notes
- **Deduplication** - Via `filemaker_event_id`

---

## ✅ Clinical Notes (Complete)

### What Was Imported

**42,036 Clinical Notes:**
- All notes from `API_Notes` table
- Linked to patients via FileMaker ID
- Created dates and authors preserved
- Note type classification (e.g., "General", "Clinical", etc.)
- **Note:** Multiple imports ran, some duplication occurred (11,206 unique notes expected)

### Import Command

```bash
# Notes imported as part of coordinators import
cd backend
python manage.py import_filemaker_coordinators_notes
```

### Current Nexus State

**2 existing clinics (will be deleted):**
- Newcastle (with phone, email, ABN)
- Tamworth (with phone, email, ABN)

### FileMaker Data

**11 clinics to import:**
- Tamworth, Newcastle, Armidale, RPA, Gunnedah, Concord, Better Health Practice, Coffs Harbour, Inverell, Home Visit, Narrabri

**Available data:** Name only (no phone/email/ABN in FileMaker)

### Schema Changes Needed

Add to `clinicians.models.Clinic`:
```python
filemaker_id = models.UUIDField(null=True, blank=True, unique=True)
```

### Import Strategy

1. Add `filemaker_id` field (migration)
2. Delete 2 existing clinics (Newcastle, Tamworth)
3. Import ALL 11 clinics from FileMaker (name + filemaker_id only)
4. Export clinic mapping for appointment import
5. Manual: Add contact details (phone, email, ABN, address) to all clinics later

**Why delete existing?**
- Clean start with consistent `filemaker_id` on ALL clinics
- Simplifies appointment import mapping
- Contact info will be re-entered manually

---

## 🔄 Phase 3: Referrers & Companies (Analyzed - Ready to Implement)

### FileMaker Tables Discovered

**OData Table Names (note trailing underscore):**
1. ✅ `API_Company_` (44 records) - Companies/medical practices
2. ✅ `API_Referrer_` (98 records) - Referrers/doctors (active only)
3. ✅ `API_ContactToReferrer_` (255 records) - Patient→Referrer links
4. ✅ `API_ReferrerToCompany_Join_` (73 records) - Referrer→Company links

**Contact Details:**
- Phone, email, address stored in `API_Contact_Details_` (universal for all entities)
- Link by `id.key = company_id` or `id.key = referrer_id`

### Import Strategy

**Phase 1: Lookup Tables**
1. Extract unique values from `API_Referrer_.contactType` → Create `specialties` lookup table
2. Extract unique values from `API_Company_.Type` → Create `company_types` lookup table

**Phase 2: Companies (44 records)**
1. Fetch ALL companies from `API_Company_` (no filtering - import archived too)
2. Fetch `API_Contact_Details_` for company IDs → `contact_json`
3. Map `Type` → `company_type_id`
4. Create `companies` records with archiving support

**Phase 3: Referrers (98 records - active only)**
1. Fetch ONLY ACTIVE referrers from `API_Referrer_` (filter `RECORD_ACTIVE_INDICATOR`)
2. Fetch `API_Contact_Details_` for referrer IDs → `contact_json`
3. Map `contactType` → `specialty_id`
4. Create `referrers` records

**Phase 4: Join Tables**
1. `API_ContactToReferrer_` (255 records) → `patient_referrers`
   - `id_Contact` → `patient_id`
   - `id_Perscriber` → `referrer_id` (typo in FileMaker: "Perscriber" = "Prescriber")
   - `date` → `assignment_date` (when referrer was added to patient)
   
2. `API_ReferrerToCompany_Join_` (73 records) → `referrer_companies`
   - `id_Referrer` → `referrer_id`
   - `id_Company` → `company_id`
   - `date` → `assignment_date`
   - Mark primary company for letters

### Nexus Tables to Create

**1. `company_types` (Lookup)**
```python
class CompanyType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

**2. `companies`**
```python
class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    abn = models.CharField(max_length=20, null=True, blank=True)
    company_type = models.ForeignKey(CompanyType, on_delete=models.SET_NULL, null=True)
    contact_json = models.JSONField(null=True, blank=True)
    address_json = models.JSONField(null=True, blank=True)
    
    # Archive support
    archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.CharField(max_length=100, null=True, blank=True)
    
    filemaker_id = models.UUIDField(unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**3. `specialties` (Lookup)**
```python
class Specialty(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

**4. `referrers`**
```python
class Referrer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    title = models.CharField(max_length=10, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, null=True, blank=True)
    last_name = models.CharField(max_length=100)
    specialty = models.ForeignKey(Specialty, on_delete=models.SET_NULL, null=True)
    contact_json = models.JSONField(null=True, blank=True)
    address_json = models.JSONField(null=True, blank=True)
    
    # Archive support
    archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.CharField(max_length=100, null=True, blank=True)
    
    filemaker_id = models.UUIDField(unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def practice_name(self):
        """Get primary company name (for letters)"""
        primary = self.referrer_companies.filter(is_primary=True).first()
        return primary.company.name if primary else None
```

**5. `patient_referrers` (Join)**
```python
class PatientReferrer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='patient_referrers')
    referrer = models.ForeignKey(Referrer, on_delete=models.CASCADE, related_name='referrer_patients')
    assignment_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, default='active')
    filemaker_id = models.UUIDField(unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [('patient', 'referrer')]
```

**6. `referrer_companies` (Join)**
```python
class ReferrerCompany(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    referrer = models.ForeignKey(Referrer, on_delete=models.CASCADE, related_name='referrer_companies')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='company_referrers')
    is_primary = models.BooleanField(default=False)
    position = models.CharField(max_length=100, null=True, blank=True)
    assignment_date = models.DateField(null=True, blank=True)
    filemaker_id = models.UUIDField(unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [('referrer', 'company')]
```

### Field Mapping

**API_Company_ → companies:**
- `id` → `filemaker_id`
- `Name` → `name`
- `ABN` → `abn`
- `Type` → `company_type_id` (via lookup)
- `API_Contact_Details_` (WHERE `id.key` = company ID) → `contact_json`, `address_json`

**API_Referrer_ → referrers:**
- `id` → `filemaker_id`
- `title` → `title`
- `nameFirst` → `first_name`
- `nameMiddle` → `middle_name`
- `nameLast` → `last_name`
- `contactType` → `specialty_id` (via lookup)
- `RECORD_ACTIVE_INDICATOR` → Filter (skip archived)
- `API_Contact_Details_` (WHERE `id.key` = referrer ID) → `contact_json`, `address_json`

**API_ContactToReferrer_ → patient_referrers:**
- `id_Contact` → `patient_id`
- `id_Perscriber` → `referrer_id`
- `date` → `assignment_date`

**API_ReferrerToCompany_Join_ → referrer_companies:**
- `id_Referrer` → `referrer_id`
- `id_Company` → `company_id`
- `date` → `assignment_date`

### What We're NOT Importing

❌ **Notes for referrers/companies** - FileMaker doesn't have these  
❌ **Documents/images** - FileMaker doesn't have these  
❌ **Archived referrers** - Only importing active ones  
❌ **Practice name field** - Dynamically get from referrer→company relationship

### Dependencies

**✅ No blockers** - Can import referrers/companies anytime:
- Companies are independent
- Referrers depend on companies (but optional FK)
- Patient-referrer links depend on patients (already imported ✅)

### Next Steps

1. Fetch sample data to see actual `contactType` and `Type` values
2. Create Django models (6 new models + 2 lookup tables)
3. Run migrations
4. Create import script
5. Import in order: lookup tables → companies → referrers → join tables

---

## ⏸️ Phase 4: Coordinators (Planned)

### New Tables Required

**1. `coordinators` (extract from patients.coordinator_name)**
- NDIS Support Coordinators + LAC
- Parse from text field (e.g., "Warda - Ability Connect")
- Deduplicate (~50 unique coordinators)

**2. `patient_coordinators` (join table - historical tracking)**
- assignment_date, end_date, is_current
- ndis_plan_start, ndis_plan_end
- ndis_notes (coordinator-specific notes)

### Why Historical Tracking

- Coordinators change frequently
- Current system overwrites old data (bad!)
- Need to track history: "Patient had 3 coordinators over 2 years"

---

## 🔗 Contact Relationships (Architecture)

### New Table: `contact_relationships`

**Purpose:** Link ANY contact to ANY other contact to track relationships between people.

**Why This Architecture?**
1. Track carers (mother, father) for patients
2. Handle "edge case" where person is patient AND referrer AND coordinator
3. Link family members who are also patients
4. Store emergency contacts
5. Keep separate workflows (patient UI ≠ referrer UI)

### Schema

```python
class ContactRelationship(models.Model):
    # Generic Foreign Keys (can link to ANY model)
    from_content_type = models.ForeignKey(ContentType)
    from_object_id = models.UUIDField()
    from_contact = GenericForeignKey('from_content_type', 'from_object_id')
    
    to_content_type = models.ForeignKey(ContentType)
    to_object_id = models.UUIDField()
    to_contact = GenericForeignKey('to_content_type', 'to_object_id')
    
    relationship_type = models.CharField(
        choices=[
            ('carer', 'Carer'),
            ('parent', 'Parent'),
            ('spouse', 'Spouse'),
            ('child', 'Child'),
            ('sibling', 'Sibling'),
            ('emergency_contact', 'Emergency Contact'),
            ('also_patient', 'Also Patient'),
            ('also_referrer', 'Also Referrer'),
            ('also_coordinator', 'Also Coordinator'),
        ]
    )
    
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Use Cases

**Example 1: Patient with Carer (Mother)**
```python
# Patient: John Smith
patient = Patient.objects.get(first_name="John", last_name="Smith")

# Mother: Mary Smith (stored as GeneralContact)
mother = GeneralContact.objects.create(first_name="Mary", last_name="Smith")

# Link them
ContactRelationship.objects.create(
    from_contact=patient,
    to_contact=mother,
    relationship_type='carer',
    notes='Primary carer, mother'
)
```

**Example 2: Doctor Who is Also a Patient**
```python
# Dr. Jane Brown is a referrer
referrer = Referrer.objects.get(first_name="Jane", last_name="Brown")

# Dr. Jane Brown is also your patient
patient = Patient.objects.get(first_name="Jane", last_name="Brown")

# Link them
ContactRelationship.objects.create(
    from_contact=referrer,
    to_contact=patient,
    relationship_type='also_patient',
    notes='Podiatrist who is also our patient'
)
```

**Example 3: Emergency Contact**
```python
# Patient: Sarah Jones
patient = Patient.objects.get(first_name="Sarah", last_name="Jones")

# Emergency contact: Husband David
emergency = GeneralContact.objects.create(first_name="David", last_name="Jones")

# Link as emergency contact
ContactRelationship.objects.create(
    from_contact=patient,
    to_contact=emergency,
    relationship_type='emergency_contact',
    notes='Husband, call first'
)
```

### Benefits

✅ No refactoring of existing 2,845 patients
✅ Each contact type keeps its own workflow/UI
✅ Link anyone to anyone via relationships
✅ Track relationship types (carer, parent, also_patient, etc.)
✅ Multiple relationships per contact
✅ Handles "edge case" of patient+referrer+coordinator
✅ Tracks carers/family/emergency contacts

---

## ⏸️ Phase 5: Appointments (Analyzed - Ready to Implement)

### FileMaker Data Analysis

**`API_event` (15,127 total records):**
- ✅ **9,835 with patients** (id_Contact IS NOT NULL) - **IMPORT THESE**
- ❌ **5,292 without patients** (id_Contact IS NULL) - **SKIP** (block bookings, holidays, availability)

**`API_Clinics_Details` (822 records - legacy system):**
- Old appointment system (before migration to API_event)
- Check for appointments not in API_event
- Import missing ones only (deduplicate by `id`)

**Development History:**
- You migrated from `API_Clinics_Details` → `API_event` during FileMaker development
- `API_event` is the current system
- Some old appointments may only exist in `API_Clinics_Details`

### Import Strategy

1. Import 9,835 appointments from `API_event` WHERE `id_Contact IS NOT NULL`
2. Check if `API_Clinics_Details` (822) has appointments not in `API_event`
3. Import missing appointments from `API_Clinics_Details` (if any)
4. Deduplicate by `id` (FileMaker unique appointment ID)

### Fields Available in API_event

**Import to Nexus:**
- ✅ `id` → `filemaker_event_id` (track source)
- ✅ `startDate` + `startTime` → `start_time` (DateTime)
- ✅ `endDate` + `endTime` → `end_time` (DateTime)
- ✅ `allDay` → `all_day` (Boolean: 0=timed, 1=all-day)
- ✅ `idCal` → `clinic_id` (FK, map via clinic filemaker_id)
- ✅ `id_Contact` → `patient_id` (FK)
- ✅ `note` → `notes` (appointment notes)
- ❌ `id_Referrer` → SKIP (not importing referrer links yet)
- ❌ `location` → SKIP (used for layout purposes)

**Status mapping:**
- Past appointments (`startDate < today`) → `status = 'completed'`
- Future appointments (`startDate >= today`) → `status = 'scheduled'`

### Schema Changes Needed

Add to `appointments.models.Appointment`:
```python
all_day = models.BooleanField(
    default=False,
    help_text="All-day appointment flag"
)

filemaker_event_id = models.UUIDField(
    null=True,
    blank=True,
    unique=True,
    help_text="Original FileMaker appointment ID (API_event.id or API_Clinics_Details.id)"
)
```

**NOT adding (for now):**
- ❌ `referrer` - Skip referrer links
- ❌ `funding_type` - Not in API_event (only in API_Clinics_Details, mostly NULL)
- ❌ `location` - Not used meaningfully

### Field Mapping

| FileMaker Field | Nexus Field | Action |
|-----------------|-------------|--------|
| `id` | `filemaker_event_id` | Store for reference |
| `startDate` + `startTime` | `start_time` | Combine to DateTime (UTC) |
| `endDate` + `endTime` | `end_time` | Combine to DateTime (if exists, else NULL) |
| `allDay` | `all_day` | Boolean (0=False, 1=True) |
| `idCal` | `clinic_id` | Map via clinic.filemaker_id |
| `id_Contact` | `patient_id` | Direct FK |
| `note` | `notes` + `reason` | Copy to notes, extract first sentence/line for reason |
| — | `clinician` | NULL (assigned in new system) |
| `startDate` | `status` | If past: 'completed', if future: 'scheduled' |

### Dependencies (Must Complete First)

**🔴 BLOCKER:** Cannot import appointments until:
1. ✅ Clinics imported with `filemaker_id` field
2. ✅ Migration adds `all_day` and `filemaker_event_id` to appointments
3. ✅ Clinic mapping file exported (FileMaker ID → Nexus ID)

**This is why contacts import was paused** - need clinics for appointments!

---

## ⏸️ Phase 6: Documents & Images (Phase 2)

### Challenge

- 11,269 documents
- 6,664 images
- **OData cannot access container field contents** (only metadata)
- Need FileMaker Data API (REST) for actual files

### Strategy

1. **Phase 1:** Import metadata only → `documents` table
2. **Phase 2:** Download files via Data API → Upload to S3
3. Link to patients via Generic Foreign Key

---

## 🔌 Technical Details

### FileMaker OData API

**Endpoint:** `https://walkeasy.fmcloud.fm/fmi/odata/v4/WEP-DatabaseV2/`

**Authentication:** Basic Auth (credentials in `.env`)

**Entity Sets:**
```
API_Contacts
API_Contact_Details
API_Clinic_Name
API_Referrer
API_Company
API_ContactToReferrer
API_ReferrerToCompany_Join
API_event
API_Docs
API_Images
```

**Key Learning:** OData uses Table Occurrences (TOs) not base table names. Clean `API_*` layouts work best.

### Import Scripts Location

```
scripts/filemaker/
├── .env                           # FileMaker credentials
├── export_all_patients.py         # Export patients + contacts
├── 01_discover_schema.py          # Schema discovery
└── data/
    ├── filemaker_export_*.json    # Exported data
    └── clinic_id_mapping.json     # FileMaker ID → Nexus ID mapping
```

### Django Management Commands

```
backend/patients/management/commands/
├── clear_sample_data.py           # Clear before import
└── import_filemaker_data.py       # Import patients + contacts
```

---

## 🛠️ Common Issues & Solutions

### Issue: OData 404 on table access
**Cause:** Table name has spaces or special characters  
**Solution:** Create `API_*` layout/TO with clean name

### Issue: Container fields not accessible
**Cause:** OData doesn't expose binary data  
**Solution:** Use FileMaker Data API (REST) instead

### Issue: DOBs not importing
**Cause:** Date format mismatch (MM/DD/YYYY vs YYYY-MM-DD)  
**Solution:** Parse both formats in import script

### Issue: Phone numbers with spaces
**Cause:** FileMaker stores formatted numbers  
**Solution:** Clean with regex (`re.sub(r'[^0-9+]', '', phone)`)

---

## 📋 Next Steps

### **Immediate Priority (In Order):**

1. 🔄 **Phase 2: Clinics** (CURRENT)
   - Add `filemaker_id` to clinics model
   - Delete 2 existing clinics
   - Import 11 clinics from FileMaker
   - Export clinic mapping file

2. ⏸️ **Phase 5: Appointments** (BLOCKED - needs clinics)
   - Add `all_day` and `filemaker_event_id` to appointments model
   - Import 9,835 patient appointments
   - Check for missing appointments in API_Clinics_Details

3. ⏸️ **Phase 3: Referrers & Companies** (Future)
   - Create new tables
   - Import 234 referrers, 92 companies

4. ⏸️ **Phase 4: Coordinators** (Future)
   - Parse from patients.coordinator_name
   - Create historical tracking

5. ⏸️ **Phase 6: Documents & Images** (Future/Phase 2)
   - 11,269 documents + 6,664 images

---

**Current Status:** Ready to implement Phase 2 (Clinics) 🚀

---

## 📝 **Notes Import** (Analyzed - Ready to Implement)

### FileMaker Data

**`API_Notes` (11,399 total records):**
- ✅ **11,206 with content** - **IMPORT THESE**
- ❌ **193 empty** (Note = null) - **SKIP**

### Nexus Notes Model

**Existing:** `notes.models.Note`
- Fields: `id`, `patient`, `note_type`, `content`, `created_at`, `updated_at`, `created_by`
- Patient-specific notes (replaces localStorage)

### Field Mapping

| FileMaker Field | Nexus Field | Action |
|-----------------|-------------|--------|
| `id` | `filemaker_note_id` (new field) | Store for reference |
| `id_Key` | `patient_id` | FK to patient |
| `Note` | `content` | Import note text |
| `Note Type` | `note_type` | Import as-is ("Clinic Dates" → dropdown option) |
| `Date` | `created_at` | Preserve original date |
| `creationAccountName` | `created_by` | Who created the note |

### Schema Changes Needed

Add to `notes.models.Note`:
```python
filemaker_note_id = models.UUIDField(
    null=True,
    blank=True,
    unique=True,
    help_text="Original FileMaker note ID (API_Notes.id)"
)
```

### Import Strategy

1. Add `filemaker_note_id` field to notes model (migration)
2. Import 11,206 notes with content (WHERE `Note IS NOT NULL`)
3. Map `id_Key` → `patient_id` (FK to patients)
4. Preserve original `Date` as `created_at`
5. Use `creationAccountName` as `created_by`
6. Set `note_type = "Clinic Dates"` (or map to Nexus dropdown value)

### Dependencies

**No blockers** - Can import notes anytime (patients already imported)

---

## 📱 **Phase 7: SMS System (Analyzed - Optional)**

### FileMaker SMS System Discovered

**11 SMS-related tables found:**
1. `API_SMSAccounts_` (27 fields) - Gateway account configuration
2. `API_Gateways_` (62 fields) - SMS gateway providers
3. `API_Messages_` (40 fields) - Outbound SMS messages
4. `API_Replies_` (21 fields) - Inbound SMS replies
5. `API_Templates_` (14 fields) - Message templates
6. `API_BulkSessions_` (27 fields) - Bulk SMS campaigns
7. `API_Senders_` (10 fields) - Sender IDs
8. `API_DeliveryReceipts_` (19 fields) - Delivery tracking
9. `API_MergeFields_` (7 fields) - Template merge fields
10. `API_CountryCodes_` (9 fields) - International phone codes
11. `API_GatewayCodes_` (10 fields) - Gateway response codes

**FileMaker SMS Features:**
- ✅ Multi-gateway management (switch between providers)
- ✅ Advanced templates with merge fields
- ✅ Bulk SMS sessions (send to multiple contacts)
- ✅ Delivery tracking
- ✅ Inbound/outbound message history
- ✅ Country code management
- ✅ Gateway response tracking

### Current Nexus SMS System

**Status:** ✅ Working in production (SMS Broadcast API)

**Features:**
- ✅ Send individual SMS
- ✅ Receive SMS (webhooks)
- ✅ Receive MMS images from patients
- ✅ Patient conversation threads
- ✅ Basic templates
- ✅ Delivery status tracking
- ✅ Real-time notifications
- ❌ No bulk sending (manual one-by-one)
- ❌ No merge fields in templates
- ❌ No multi-gateway support

### Import Strategy (Phased Approach)

**Phase 1: Message History** ⭐ (Recommended First)
- Import `API_Messages_` → Nexus `sms_messages` (outbound history)
- Import `API_Replies_` → Nexus `sms_inbound` (inbound history)
- **Benefit:** Complete SMS history visible in Nexus
- **Effort:** Low (similar to patient import)

**Phase 2: Templates with Merge Fields** (Optional Enhancement)
- Import `API_Templates_` → Enhance Nexus templates
- Import `API_MergeFields_` → Add merge field support
- **Benefit:** Advanced templates (e.g., "Hi {firstName}, your appointment on {date}...")
- **Effort:** Medium (requires template engine enhancement)

**Phase 3: Bulk SMS Feature** (Future Enhancement)
- Build new bulk SMS feature in Nexus (inspired by `API_BulkSessions_`)
- Select multiple patients → send same message to all
- **Benefit:** Save time with appointment reminders
- **Effort:** High (new feature development)

**Skip (Not Needed):**
- ❌ `API_SMSAccounts_` - Nexus uses SMS Broadcast only (not multi-gateway)
- ❌ `API_Gateways_` - No multi-gateway support planned
- ❌ `API_CountryCodes_` - Hardcoded to Australia
- ❌ `API_GatewayCodes_` - Internal tracking only
- ❌ `API_DeliveryReceipts_` - Already have delivery tracking in Nexus

### Field Mapping (Phase 1: Message History)

**API_Messages_ → sms_messages:**
- `_kp_MessageID` → `filemaker_id`
- `MessageBody` → `message`
- `SenderPhoneMobile` → `from_number`
- `RecipientPhoneMobile` → `to_number`
- `SentTimestamp` → `sent_at`
- `Status` → `status`
- `MessageRef` → `external_message_id`
- Link to patient by phone number lookup

**API_Replies_ → sms_inbound:**
- `_kp_ReplyID` → `filemaker_id`
- `MessageBody` → `message`
- `SenderPhoneMobile` → `from_number`
- `ReceivedTimestamp` → `received_at`
- Link to patient by phone number lookup

### Dependencies

**✅ No blockers** - Can import SMS history anytime:
- Message history is independent
- Patient phone lookup already working in Nexus

### Next Steps (If Importing SMS)

1. Fetch sample data from `API_Messages_` and `API_Replies_`
2. Analyze field structure and phone number formats
3. Add `filemaker_id` field to Nexus SMS models
4. Create import script with phone number matching
5. Import message history (outbound + inbound)

### Recommendation

**Start with Phase 1 (Message History):**
- Low effort, high value
- Preserves historical data
- Can decide on templates/bulk later

**Skip if:**
- SMS history not important
- Want to focus on referrers/clinics/appointments first

---

**Current Status:** ✅ All Core Data Imported Successfully (55,758 records) 🎉

---

## 🔧 Post-Import Issues & Fixes (Nov 9, 2025)

After completing the import, several issues were discovered and fixed:

### Issue 1: Django 500 Errors - Admin Field References

**Problem:** All API endpoints returned 500 errors after registering new models in Django admin.

**Root Cause:** Admin classes referenced fields that didn't exist in the models:
- `Specialty.description` (doesn't exist)
- `ReferrerCompany.start_date`, `is_current` (don't exist)
- `PatientCoordinator.filemaker_id` (doesn't exist)

**Fix:** Corrected all admin.py files to only reference actual model fields.

**Files Fixed:**
- `backend/referrers/admin.py`
- `backend/coordinators/admin.py`

**Commit:** `a0ffc5c` - "fix: Correct Django admin field references to match actual models"

---

### Issue 2: Patient Titles Not Displaying

**Problem:** Patients displayed as "John Smith" instead of "Mr. John Smith" despite titles being in the database.

**Root Cause:** Frontend `transformPatientToContact` function used `full_name` directly without checking for `title` field.

**Fix:** Updated transformation logic to always extract title and prepend it to display name.

**Files Fixed:**
- `frontend/app/patients/page.tsx`

**Result:** All 2,837 patients with titles now display correctly.

**Commit:** `882fc96` - "fix: Display patient titles (Mr, Mrs, etc) in patient list"

---

### Issue 3: CORS Errors for API Badge Counts

**Problem:** Notes, documents, and images API calls failed with CORS errors despite backend returning 200 OK.

**Root Cause:** Missing `credentials: 'include'` option in fetch requests. When `CORS_ALLOW_CREDENTIALS = True` in Django, browsers require this option.

**Fix:** Added `credentials: 'include'` to all authenticated API calls in ContactHeader.

**Files Fixed:**
- `frontend/app/components/ContactHeader.tsx` (3 fetch calls)

**Commit:** `434c231` - "fix: Add credentials: 'include' to all API fetch requests in ContactHeader"

---

### Issue 4: React setState During Render Warning

**Problem:** Console warning when toggling archive filter: "Cannot update a component while rendering a different component"

**Root Cause:** `ContactHeader` called parent callback synchronously during onChange handler.

**Fix:** Deferred callback using `setTimeout(..., 0)` to next event loop tick.

**Files Fixed:**
- `frontend/app/components/ContactHeader.tsx`

**Commit:** `ec234f2` - "fix: Prevent React setState during render warning in ContactHeader"

---

### Lessons Learned

1. **Always validate admin configurations** - Use `python manage.py check` before starting server
2. **Test data transformation logic** - Verify frontend displays all imported fields correctly
3. **Consistent fetch options** - All authenticated API calls need `credentials: 'include'`
4. **Async state updates** - Never update parent component state during child render cycle

### Documentation Updated

- ✅ `docs/architecture/TROUBLESHOOTING.md` - Added all 4 issues with solutions
- ✅ `docs/integrations/FILEMAKER.md` - This section added
- ✅ Git commits - All fixes properly documented

---

## 📚 Related Documentation

- **Database Schema:** `docs/architecture/DATABASE_SCHEMA.md`
- **Troubleshooting:** `docs/architecture/TROUBLESHOOTING.md` ⭐ Updated Nov 9, 2025
- **FileMaker Details:** `docs/FileMaker/` (analysis docs)

---

**For detailed analysis and step-by-step migration planning, see `docs/FileMaker/MIGRATION_ANALYSIS_PLAN.md`**

