# Contact Types Architecture

**Purpose:** Document the different contact types and their unique information requirements

**Last Updated:** November 4, 2025

---

## 📋 **Contact Types Overview**

The system supports 7 different contact types, each with unique information requirements:

1. **Patients** - Healthcare recipients
2. **Referrers** - Medical professionals who refer patients
3. **Coordinators** - NDIS coordinators
4. **NDIS LAC** - NDIS Local Area Coordinators
5. **Contacts** - General contacts
6. **Companies** - Business/organization contacts
7. **Clinics** - Clinic locations (already exists as separate model)

---

## 🏗️ **Architecture Approach**

### **Option 1: Separate Models** (Recommended)
- Create separate Django models for each contact type
- Each model has its own API endpoints
- Pros: Type safety, clear separation, optimized queries
- Cons: More models to maintain

### **Option 2: Single Contact Model with Type Field**
- One `Contact` model with a `type` field
- Use JSON fields for type-specific data
- Pros: Single table, simpler queries
- Cons: Less type safety, harder to query

### **Option 3: Polymorphic Models**
- Base `Contact` model with type-specific sub-models
- Pros: Shared fields, type-specific extensions
- Cons: More complex queries, Django-Polymorphic dependency

**Recommendation:** Start with **Option 1** (Separate Models) for clarity and type safety.

---

## 📊 **Contact Type Requirements**

### **1. Patients** ✅ **EXISTS**

**Model:** `backend/patients/models.py` - `Patient`

**Fields:**
- Basic: `title`, `first_name`, `middle_names`, `last_name`, `dob`, `sex`
- Medical: `mrn`, `health_number`
- Organization: `clinic` (FK), `funding_type` (FK)
- NDIS: `coordinator_name`, `coordinator_date`, `plan_start_date`, `plan_end_date`
- Contact: `contact_json` (phone, email, mobile)
- Address: `address_json`
- Emergency: `emergency_json`
- Notes: `notes`
- Flags: `flags_json`

**Status:** ✅ Fully implemented

---

### **2. Referrers** ❌ **TO BE CREATED**

**Model:** `backend/referrers/models.py` - `Referrer` (to be created)

**Fields Needed:**
- **Basic Info:**
  - `title` - CharField (Mr., Mrs., Ms., Dr., Prof.)
  - `first_name` - CharField
  - `middle_names` - CharField (optional)
  - `last_name` - CharField
  - `credential` - CharField (e.g., "MBBS", "RN", "Physiotherapist")
  - `specialty` - CharField (e.g., "GP", "Orthopedic Surgeon", "Physiotherapist")
  
- **Professional Info:**
  - `organization` - CharField (e.g., "John Hunter Hospital")
  - `practice_name` - CharField (e.g., "Newcastle Medical Centre")
  - `provider_number` - CharField (optional, for Medicare billing)
  - `ahpra_number` - CharField (optional, AHPRA registration number)
  
- **Contact:**
  - `contact_json` - JSONField
    - `phone` - Office phone
    - `mobile` - Mobile phone
    - `email` - Email address
    - `fax` - Fax number (optional)
  
- **Address:**
  - `address_json` - JSONField
    - `street` - Street address
    - `city` - City
    - `state` - State
    - `postcode` - Postcode
  
- **Relationship:**
  - `referral_count` - IntegerField (calculated, how many patients referred)
  - `last_referral_date` - DateField (last time they referred a patient)
  
- **System:**
  - `active` - BooleanField (default True)
  - `notes` - TextField (general notes)
  - `created_at` - DateTimeField
  - `updated_at` - DateTimeField

**API Endpoints Needed:**
- `GET /api/referrers/` - List all active referrers (filter: `archived=False`)
- `GET /api/referrers/:id` - Get single referrer (includes archived)
- `POST /api/referrers/` - Create referrer
- `PUT /api/referrers/:id` - Update referrer
- `PATCH /api/referrers/:id/archive` - Archive referrer (soft delete)
- `PATCH /api/referrers/:id/restore` - Restore archived referrer
- `GET /api/referrers/archived/` - List archived referrers

---

### **3. Coordinators** ❌ **TO BE CREATED**

**Model:** `backend/coordinators/models.py` - `Coordinator` (to be created)

**Fields Needed:**
- **Basic Info:**
  - `first_name` - CharField
  - `last_name` - CharField
  - `title` - CharField (optional)
  
- **Organization:**
  - `organization` - CharField (e.g., "Ability Connect", "NDIS Support Services")
  - `role` - CharField (e.g., "Support Coordinator", "Plan Manager")
  - `coordinator_number` - CharField (optional, NDIS coordinator ID)
  
- **Contact:**
  - `contact_json` - JSONField
    - `phone` - Office phone
    - `mobile` - Mobile phone
    - `email` - Email address
  
- **Address:**
  - `address_json` - JSONField (optional, organization address)
  
- **Relationship:**
  - `patient_count` - IntegerField (calculated, how many patients assigned)
  - `last_assignment_date` - DateField (last time assigned to patient)
  
- **System:**
  - `active` - BooleanField (default True)
  - `notes` - TextField (general notes)
  - `created_at` - DateTimeField
  - `updated_at` - DateTimeField

**API Endpoints Needed:**
- `GET /api/coordinators/` - List all active coordinators (filter: `archived=False`)
- `GET /api/coordinators/:id` - Get single coordinator (includes archived)
- `POST /api/coordinators/` - Create coordinator
- `PUT /api/coordinators/:id` - Update coordinator
- `PATCH /api/coordinators/:id/archive` - Archive coordinator (soft delete)
- `PATCH /api/coordinators/:id/restore` - Restore archived coordinator
- `GET /api/coordinators/archived/` - List archived coordinators

---

### **4. NDIS LAC** ❌ **TO BE CREATED**

**Model:** `backend/ndis_lac/models.py` - `NDISLAC` (to be created)

**Fields Needed:**
- **Basic Info:**
  - `first_name` - CharField
  - `last_name` - CharField
  - `title` - CharField (optional)
  
- **Organization:**
  - `organization` - CharField (e.g., "NDIS", "Local Area Coordinator Service")
  - `lac_number` - CharField (NDIS LAC identifier)
  - `region` - CharField (e.g., "Hunter", "Newcastle", "Port Macquarie")
  
- **Contact:**
  - `contact_json` - JSONField
    - `phone` - Office phone
    - `mobile` - Mobile phone
    - `email` - Email address
  
- **Address:**
  - `address_json` - JSONField (office address)
  
- **System:**
  - `active` - BooleanField (default True)
  - `notes` - TextField (general notes)
  - `created_at` - DateTimeField
  - `updated_at` - DateTimeField

**API Endpoints Needed:**
- `GET /api/ndis-lac/` - List all active NDIS LACs (filter: `archived=False`)
- `GET /api/ndis-lac/:id` - Get single NDIS LAC (includes archived)
- `POST /api/ndis-lac/` - Create NDIS LAC
- `PUT /api/ndis-lac/:id` - Update NDIS LAC
- `PATCH /api/ndis-lac/:id/archive` - Archive NDIS LAC (soft delete)
- `PATCH /api/ndis-lac/:id/restore` - Restore archived NDIS LAC
- `GET /api/ndis-lac/archived/` - List archived NDIS LACs

---

### **5. Contacts** ❌ **TO BE CREATED**

**Model:** `backend/contacts/models.py` - `Contact` (to be created)

**Fields Needed:**
- **Basic Info:**
  - `first_name` - CharField
  - `last_name` - CharField
  - `title` - CharField (optional)
  - `relationship` - CharField (e.g., "Family", "Friend", "Other")
  
- **Contact:**
  - `contact_json` - JSONField
    - `phone` - Phone number
    - `mobile` - Mobile phone
    - `email` - Email address
  
- **Address:**
  - `address_json` - JSONField (optional)
  
- **System:**
  - `active` - BooleanField (default True)
  - `notes` - TextField (general notes)
  - `created_at` - DateTimeField
  - `updated_at` - DateTimeField

**API Endpoints Needed:**
- `GET /api/contacts/` - List all active contacts (filter: `archived=False`)
- `GET /api/contacts/:id` - Get single contact (includes archived)
- `POST /api/contacts/` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `PATCH /api/contacts/:id/archive` - Archive contact (soft delete)
- `PATCH /api/contacts/:id/restore` - Restore archived contact
- `GET /api/contacts/archived/` - List archived contacts

---

### **6. Companies** ❌ **TO BE CREATED**

**Model:** `backend/companies/models.py` - `Company` (to be created)

**Fields Needed:**
- **Basic Info:**
  - `name` - CharField (company name)
  - `abn` - CharField (Australian Business Number)
  - `acn` - CharField (optional, Australian Company Number)
  - `trading_name` - CharField (optional, different from registered name)
  
- **Contact:**
  - `contact_json` - JSONField
    - `phone` - Main phone
    - `email` - Main email
    - `website` - Website URL
    - `fax` - Fax number (optional)
  
- **Address:**
  - `address_json` - JSONField
    - `street` - Street address
    - `city` - City
    - `state` - State
    - `postcode` - Postcode
  
- **People:**
  - `primary_contact_name` - CharField (optional, main contact person)
  - `primary_contact_role` - CharField (optional, e.g., "Manager", "Director")
  
- **System:**
  - `active` - BooleanField (default True)
  - `notes` - TextField (general notes)
  - `created_at` - DateTimeField
  - `updated_at` - DateTimeField

**API Endpoints Needed:**
- `GET /api/companies/` - List all active companies (filter: `archived=False`)
- `GET /api/companies/:id` - Get single company (includes archived)
- `POST /api/companies/` - Create company
- `PUT /api/companies/:id` - Update company
- `PATCH /api/companies/:id/archive` - Archive company (soft delete)
- `PATCH /api/companies/:id/restore` - Restore archived company
- `GET /api/companies/archived/` - List archived companies

---

### **7. Clinics** ✅ **EXISTS**

**Model:** `backend/clinicians/models.py` - `Clinic`

**Fields:**
- `name` - CharField
- `abn` - CharField (optional)
- `phone` - CharField (optional)
- `email` - EmailField (optional)
- `address_json` - JSONField
- `created_at` - DateTimeField
- `updated_at` - DateTimeField

**Status:** ✅ Fully implemented

**API Endpoints:** ✅ Already exists at `/api/clinics/`

---

## 🎯 **Implementation Plan**

### **Phase 1: Document Requirements** ✅ **COMPLETE**
- [x] Document all contact types
- [x] Define fields for each type
- [x] Plan architecture approach

### **Phase 2: Backend Models** (Next)
- [ ] Add `archived`, `archived_at`, `archived_by` fields to Patient model
- [ ] Create Referrers model (with archive fields)
- [ ] Create Coordinators model (with archive fields)
- [ ] Create NDIS LAC model (with archive fields)
- [ ] Create Contacts model (with archive fields)
- [ ] Create Companies model (with archive fields)
- [ ] Update Clinic model to add archive fields (if needed)
- [ ] Create migrations for all models

### **Phase 3: Backend API** (After Phase 2)
- [ ] Create serializers for each model
- [ ] Create ViewSets for each model
- [ ] Create URL routing for each model
- [ ] Add admin interface for each model

### **Phase 4: Frontend Integration** (After Phase 3)
- [ ] Update ContactHeader to handle all types
- [ ] Implement context-aware "Add" button (detects activeType)
- [ ] Create type-specific form components/dialogs for each contact type
- [ ] Update patients page to load different types
- [ ] Add type-specific filtering
- [ ] Implement archive functionality (archive button, archive view)
- [ ] Add archive/restore UI components

### **Phase 5: Relationships** (After Phase 4)
- [ ] Link Referrers to Patients (referral relationship)
- [ ] Link Coordinators to Patients (already exists in Patient model)
- [ ] Link Companies to Patients (if needed)

---

## 📝 **Notes**

### **Shared Fields Pattern**
All contact types share some common fields:
- `id` - UUID (primary key)
- `contact_json` - JSONField (phone, email, mobile)
- `address_json` - JSONField (address details)
- `active` - BooleanField (default True) - Controls visibility in active lists
- `archived` - BooleanField (default False) - **Soft delete** - Never actually delete records
- `archived_at` - DateTimeField (null=True) - When record was archived
- `archived_by` - CharField (optional) - Who archived the record
- `notes` - TextField (general notes)
- `created_at` - DateTimeField
- `updated_at` - DateTimeField

### **Archive Pattern** ⚠️ **CRITICAL**
- **Never delete contacts** - Always archive them instead
- When a contact is archived:
  - Set `archived = True`
  - Set `archived_at = timezone.now()`
  - Set `archived_by = user_id` (optional)
  - Set `active = False` (hide from active lists)
- Archived contacts remain in database for historical records
- Can be restored by setting `archived = False` and `active = True`
- API endpoints should filter out archived contacts by default
- Separate endpoint/view for viewing archived contacts

### **Add/New Button - Context Aware**
The blue "+" button in the header must be context-aware:
- Detects which contact type tab is active (Patients, Referrers, Coordinators, etc.)
- Opens the appropriate create dialog/form for that type
- Passes `activeType` to the handler: `handleAddNew(activeType)`
- Frontend routes to type-specific create forms/dialogs

### **Naming Convention**
- Model names: Singular (Referrer, Coordinator, NDISLAC, Contact, Company)
- API endpoints: Plural with hyphens (`/api/referrers/`, `/api/ndis-lac/`)
- Frontend types: Lowercase with hyphens (`'referrers'`, `'ndis-lac'`)

---

## 🔗 **Related Documentation**

- `docs/architecture/pages/PatientsPage.md` - Current Patients page implementation
- `docs/architecture/CURRENT_STATE_ANALYSIS.md` - Existing models
- `backend/patients/models.py` - Patient model reference

---

**Last Updated:** November 4, 2025

