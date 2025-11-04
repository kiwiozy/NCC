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
- `GET /api/referrers/` - List all referrers
- `GET /api/referrers/:id` - Get single referrer
- `POST /api/referrers/` - Create referrer
- `PUT /api/referrers/:id` - Update referrer
- `DELETE /api/referrers/:id` - Delete referrer

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
- `GET /api/coordinators/` - List all coordinators
- `GET /api/coordinators/:id` - Get single coordinator
- `POST /api/coordinators/` - Create coordinator
- `PUT /api/coordinators/:id` - Update coordinator
- `DELETE /api/coordinators/:id` - Delete coordinator

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
- `GET /api/ndis-lac/` - List all NDIS LACs
- `GET /api/ndis-lac/:id` - Get single NDIS LAC
- `POST /api/ndis-lac/` - Create NDIS LAC
- `PUT /api/ndis-lac/:id` - Update NDIS LAC
- `DELETE /api/ndis-lac/:id` - Delete NDIS LAC

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
- `GET /api/contacts/` - List all contacts
- `GET /api/contacts/:id` - Get single contact
- `POST /api/contacts/` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

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
- `GET /api/companies/` - List all companies
- `GET /api/companies/:id` - Get single company
- `POST /api/companies/` - Create company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

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
- [ ] Create Referrers model
- [ ] Create Coordinators model
- [ ] Create NDIS LAC model
- [ ] Create Contacts model
- [ ] Create Companies model
- [ ] Create migrations for all models

### **Phase 3: Backend API** (After Phase 2)
- [ ] Create serializers for each model
- [ ] Create ViewSets for each model
- [ ] Create URL routing for each model
- [ ] Add admin interface for each model

### **Phase 4: Frontend Integration** (After Phase 3)
- [ ] Update ContactHeader to handle all types
- [ ] Create type-specific form components
- [ ] Update patients page to load different types
- [ ] Add type-specific filtering

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
- `active` - BooleanField (default True)
- `notes` - TextField (general notes)
- `created_at` - DateTimeField
- `updated_at` - DateTimeField

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

