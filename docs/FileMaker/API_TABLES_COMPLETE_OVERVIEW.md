# FileMaker API Tables - Complete Overview

**Date:** November 9, 2025  
**Status:** ✅ All 9 Tables Accessible via OData  
**Database:** WEP-DatabaseV2

---

## 📊 Complete Table Inventory

All 9 `API_*` tables are accessible via OData with full field access.

| # | Table Name | Fields | Records | Status | Priority |
|---|------------|--------|---------|--------|----------|
| 1 | `API_Contacts` | 75 | 2,845+ | ✅ Imported | Core |
| 2 | `API_Contact_Details` | 30 | Many | ✅ Imported | Core |
| 3 | `API_Clinic_Name` | 16 | ~16 | 🔵 Ready | High |
| 4 | `API_Clinics_Details` | 26 | Many | 🔵 Ready | High |
| 5 | `API_Referrer` | 27 | Many | 🔵 Ready | High |
| 6 | `API_ContactToReferrer` | 11 | Many | 🔵 Ready | High |
| 7 | `API_Company` | 32 | Few | 🔵 Ready | Medium |
| 8 | `API_Docs` | 15 | Many | 🔵 Ready | Medium |
| 9 | `API_Images` | 21 | Many | 🔵 Ready | Low |

**Legend:**
- ✅ Imported = Already imported to Nexus
- 🔵 Ready = Accessible and ready to import
- **Core** = Essential patient data
- **High** = Important clinical/business data
- **Medium** = Supporting data
- **Low** = Can be deferred

---

## 🗂️ Table Details & Relationships

### 1. `API_Contacts` (75 fields) ✅ IMPORTED

**Purpose:** Patient master records

**Key Fields:**
- `id` - Primary key (UUID)
- `id_Clinic` - Links to `API_Clinic_Name.id`
- `_kf_XeroContactID` - Links to Xero
- `nameFirst`, `nameLast`, `title`
- `DOB` - Date of birth
- `creationTimestamp`, `modificationTimestamp`

**Status:** ✅ 2,845 patients imported successfully

**Relationships:**
```
API_Contacts.id 
  → API_Contact_Details.id.key (communication details)
  → API_Clinics_Details.id_Contact (clinic sessions)
  → API_ContactToReferrer.id_Contact (referrers)
  → API_Docs.id_Contact (documents)
  → API_Images.id_Contact (images)

API_Contacts.id_Clinic
  → API_Clinic_Name.id (clinic location)
```

---

### 2. `API_Contact_Details` (30 fields) ✅ IMPORTED

**Purpose:** Communication details (phone, email, address)

**Key Fields:**
- `id` - Primary key (UUID)
- `id.key` - Foreign key to `API_Contacts.id`
- `type` - Type of contact (Phone, Mobile, Email, Address)
- `Name` - Label (e.g., "Work", "Home", "Jackie (mum)")
- `ph` - Phone number
- `address 1`, `address 2` - Address lines
- `Full Address`, `Full Address one line`

**Status:** ✅ Imported with patients (one-to-many relationship)

**Relationship:**
```
API_Contact_Details.id.key → API_Contacts.id
```

---

### 3. `API_Clinic_Name` (16 fields) 🔵 READY

**Purpose:** Clinic locations (master list)

**Key Fields:**
- `id` - Primary key (UUID)
- `Name` - Clinic name (e.g., "Armidale", "Tamworth", "RPA")
- `SMS Toggle` - SMS notifications enabled?
- `creationTimestamp`, `modificationTimestamp`

**Sample Data:**
- Armidale
- Tamworth
- RPA (Royal Prince Alfred Hospital)
- ~16 clinic locations total

**Status:** 🔵 Accessible, ready to import

**Relationship:**
```
API_Clinic_Name.id
  ← API_Contacts.id_Clinic (patients assigned to clinic)
  ← API_Clinics_Details.id_Clinic (clinic sessions)
  ← API_Company.Location (company location - may be UUID)
```

**Import Priority:** **HIGH** - Essential for clinic-based patient management

---

### 4. `API_Clinics_Details` (26 fields) 🔵 READY

**Purpose:** Clinic sessions/appointments with patients

**Key Fields:**
- `id` - Primary key (UUID)
- `id_Contact` - Links to `API_Contacts.id` (patient)
- `id_Clinic` - Links to `API_Clinic_Name.id` (clinic location)
- `id_Clinic_Date` - Session date ID (UUID)
- `id_Referrer` - Links to `API_Referrer.id`
- `id_Funding` - Links to funding source (table TBD)
- `Clinic Name` - Clinic name (e.g., "RPA")
- `Clinic Date` - Session date (e.g., "2016-11-02")
- `Time` - Appointment time (e.g., "13:00:00")
- `Contact Name`, `Referrer Name` - Display names
- `Note` - Session notes
- `id.Note` - Note ID (UUID)

**Status:** 🔵 Accessible, ready to import

**Relationships:**
```
API_Clinics_Details.id_Contact → API_Contacts.id (patient)
API_Clinics_Details.id_Clinic → API_Clinic_Name.id (clinic)
API_Clinics_Details.id_Referrer → API_Referrer.id (referrer)
API_Clinics_Details.id_Funding → [Funding table TBD]
```

**Import Priority:** **HIGH** - This is your appointment/session history!

**Nexus Mapping:**
- Could map to `Appointment` model
- Or create new `ClinicSession` model
- Includes session notes and referrer links

---

### 5. `API_Referrer` (27 fields) 🔵 READY

**Purpose:** Referrers (doctors, coordinators, etc.)

**Key Fields:**
- `id` - Primary key (UUID)
- `id_Clinic` - Associated clinic (may be null)
- `nameFirst`, `nameLast`, `nameMiddle`
- `title` - (e.g., "Dr.")
- `gender`
- `creationTimestamp`, `modificationTimestamp`

**Sample Data:**
- Dr. Robert Sharp

**Status:** 🔵 Accessible, ready to import

**Relationships:**
```
API_Referrer.id
  ← API_Clinics_Details.id_Referrer (clinic sessions)
  ← API_ContactToReferrer.id_Perscriber (patient referrals)
```

**Import Priority:** **HIGH** - Important for referral tracking

**Nexus Mapping:**
- Could map to existing `Contact` model with `contact_type = "Referrer"`
- Or enhance existing referrer system

---

### 6. `API_ContactToReferrer` (11 fields) 🔵 READY

**Purpose:** Many-to-many linking table (patients ↔ referrers)

**Key Fields:**
- `id_Contact` - Links to `API_Contacts.id` (patient)
- `id_Perscriber` - Links to `API_Referrer.id` (referrer)
- `date` - Date of referral
- `creationTimestamp`, `modificationTimestamp`

**Status:** 🔵 Accessible, ready to import

**Relationships:**
```
API_ContactToReferrer.id_Contact → API_Contacts.id (patient)
API_ContactToReferrer.id_Perscriber → API_Referrer.id (referrer)
```

**Import Priority:** **HIGH** - Links patients to their referrers

**Nexus Mapping:**
- Store in patient's `notes` JSON as referral history
- Or create `PatientReferrer` linking table in Nexus

---

### 7. `API_Company` (32 fields) 🔵 READY

**Purpose:** Company/organization information (e.g., clinics, practices)

**Key Fields:**
- `id` - Primary key (UUID)
- `Name` - Company name (e.g., "New England Foot Clinic")
- `Type` - Company type (e.g., "Podiatry")
- `Location` - Location ID (UUID, links to `API_Clinic_Name.id`?)
- `ABN` - Australian Business Number
- `_kf_XeroContactID` - Links to Xero
- `creationTimestamp`, `modificationTimestamp`

**Sample Data:**
- New England Foot Clinic (Podiatry)

**Status:** 🔵 Accessible, ready to import

**Relationships:**
```
API_Company.Location → API_Clinic_Name.id (possibly)
API_Company._kf_XeroContactID → Xero (external)
```

**Import Priority:** **MEDIUM** - Supporting organizational data

**Nexus Mapping:**
- Could create `Organization` model
- Or store in settings/configuration

---

### 8. `API_Docs` (15 fields) 🔵 READY

**Purpose:** Document metadata (referrals, reports, etc.)

**Key Fields:**
- `id` - Primary key (UUID)
- `id_Contact` - Links to `API_Contacts.id` (patient)
- `id_Order` - Links to order/invoice (UUID)
- `Type` - Document type (e.g., "Referral")
- `Date` - Document date
- `imported` - Import flag (1 = imported)
- `num` - Document number
- `creationTimestamp`, `modificationTimestamp`

**Sample Data:**
- Referral documents

**Status:** 🔵 Accessible, ready to import

**Relationships:**
```
API_Docs.id_Contact → API_Contacts.id (patient)
API_Docs.id_Order → [Order table TBD]
```

**Import Priority:** **MEDIUM** - Document tracking metadata

**Notes:**
- This is metadata only - actual files likely in `API_Images` or external storage
- `imported = 1` suggests some docs already migrated elsewhere

**Nexus Mapping:**
- Could create `DocumentMetadata` model
- Or enhance existing documents system

---

### 9. `API_Images` (21 fields) 🔵 READY

**Purpose:** Image metadata (clinical photos, documents as images)

**Key Fields:**
- `id` - Primary key (UUID)
- `ID.KEY` - Parent record key (UUID)
- `id_Contact` - Links to `API_Contacts.id` (patient)
- `recid` - Record ID (integer)
- `Name of file` - Filename (e.g., "Left-Dorsal.jpg")
- `Type` - Image type (e.g., "Left Dorsal")
- `date` - Image date
- `result` - Processing result (e.g., "Not found")
- `creationTimestamp`, `modificationTimestamp`

**Sample Data:**
- Left-Dorsal.jpg (clinical foot photos)

**Status:** 🔵 Accessible, ready to import

**Relationships:**
```
API_Images.id_Contact → API_Contacts.id (patient)
API_Images.ID.KEY → Parent record (possibly API_Docs or another table)
```

**Import Priority:** **LOW** - Can be deferred, focus on core data first

**Notes:**
- Metadata only - actual image files need separate handling
- `result = "Not found"` suggests some files may be missing
- Would need FileMaker container field access or external storage location

**Nexus Mapping:**
- Could enhance existing documents system
- Would need S3 migration for actual files

---

## 🔗 Complete Data Relationship Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FileMaker Data Structure                        │
└─────────────────────────────────────────────────────────────────────────┘

                          ┌──────────────────┐
                          │  API_Clinic_Name │ (16 fields)
                          │  (Locations)     │
                          └────────┬─────────┘
                                   │ id
                     ┌─────────────┼─────────────┐
                     │             │             │
                  id_Clinic    id_Clinic     Location?
                     │             │             │
          ┌──────────▼─────────┐   │   ┌─────────▼────────┐
          │   API_Contacts     │   │   │   API_Company    │
          │   (Patients)       │   │   │   (Organizations)│
          │   75 fields        │   │   │   32 fields      │
          │   ✅ 2,845 imported│   │   └──────────────────┘
          └──────┬─────────────┘   │
                 │ id              │
         ┌───────┼─────────────────┼──────────────┐
         │       │                 │              │
      id.key  id_Contact      id_Contact     id_Contact
         │       │                 │              │
    ┌────▼─────┐ │  ┌──────────────▼────────┐    │
    │API_Contact│ │  │ API_Clinics_Details  │    │
    │_Details   │ │  │ (Sessions/Appts)     │    │
    │30 fields  │ │  │ 26 fields            │    │
    │✅ Imported│ │  └───────┬──────────────┘    │
    └───────────┘ │          │                   │
                  │     id_Referrer               │
    ┌─────────────▼─────┐    │    ┌──────────────▼──────┐
    │API_ContactTo      │    │    │    API_Docs         │
    │Referrer           │    │    │    (Document Meta)  │
    │11 fields          │    │    │    15 fields        │
    │(Link Table)       │    │    └─────────────────────┘
    └───────────┬───────┘    │
                │            │
          id_Perscriber      │
                │            │         ┌──────────────────┐
         ┌──────▼────────────▼───────┐ │   API_Images    │
         │    API_Referrer           │ │   (Image Meta)  │
         │    (Referrers/Docs)       │ │   21 fields     │
         │    27 fields              │ └─────────────────┘
         └───────────────────────────┘

Legend:
  ✅ = Already imported to Nexus
  → = One-to-many relationship
  ── = Foreign key reference
```

---

## 📋 Recommended Import Order

### Phase 1: ✅ COMPLETE
1. `API_Contacts` - Patient master records (2,845 imported)
2. `API_Contact_Details` - Communication details (imported)

### Phase 2: 🔵 High Priority (Next)
3. `API_Clinic_Name` - Clinic locations (~16 clinics)
4. `API_Referrer` - Referrers/doctors
5. `API_ContactToReferrer` - Patient-referrer links
6. `API_Clinics_Details` - Clinic sessions/appointments (most important!)

### Phase 3: 🟡 Medium Priority
7. `API_Company` - Organizations
8. `API_Docs` - Document metadata

### Phase 4: 🟢 Low Priority (Can Defer)
9. `API_Images` - Image metadata (requires file migration)

---

## 🎯 Next Steps

### Immediate Actions

1. **Import Clinic Names**
   ```bash
   # Export clinic data
   python3 export_clinic_names.py
   
   # Import to Nexus
   python3 manage.py import_clinic_names
   ```

2. **Import Referrers**
   ```bash
   # Export referrer data
   python3 export_referrers.py
   
   # Import to Nexus
   python3 manage.py import_referrers
   ```

3. **Import Clinic Sessions** (KEY!)
   ```bash
   # Export clinic session data
   python3 export_clinic_sessions.py
   
   # Map to Nexus Appointment model
   python3 manage.py import_clinic_sessions
   ```

### Data Validation

Before importing, verify:
- Record counts in each table
- Foreign key integrity
- Data quality (nulls, duplicates, etc.)
- Date formats and ranges

### Nexus Schema Updates

May need to add/enhance:
- `Clinic` model or use existing settings
- `Referrer` enhancement (if not using Contact model)
- `ClinicSession` or enhance `Appointment` model
- `Organization` model for companies
- Document metadata fields

---

## 📊 Estimated Data Volumes

| Table | Estimated Records | Basis |
|-------|-------------------|-------|
| `API_Contacts` | 2,845 | ✅ Confirmed |
| `API_Contact_Details` | ~8,000+ | Multiple contacts per patient (3-5 avg) |
| `API_Clinic_Name` | ~16 | Few clinic locations |
| `API_Clinics_Details` | ~50,000+ | Many sessions over years |
| `API_Referrer` | ~500-1,000 | Many referring doctors |
| `API_ContactToReferrer` | ~5,000+ | Multiple referrers per patient |
| `API_Company` | ~10-20 | Few organizations |
| `API_Docs` | ~10,000+ | Document history |
| `API_Images` | ~5,000+ | Clinical photos |

**Note:** These are estimates. Run count queries to get exact numbers.

---

## 🔍 Count Records Script

```bash
cd /Users/craig/Documents/nexus-core-clinic/scripts/filemaker
python3 << 'EOF'
import requests

tables = ['API_Contacts', 'API_Contact_Details', 'API_Clinic_Name', 
          'API_Clinics_Details', 'API_Referrer', 'API_ContactToReferrer',
          'API_Company', 'API_Docs', 'API_Images']

for table in tables:
    url = f"https://walkeasy.fmcloud.fm/fmi/odata/v4/WEP-DatabaseV2/{table}/$count"
    response = requests.get(url, auth=(username, password), verify=False)
    if response.status_code == 200:
        print(f"{table}: {response.text} records")
EOF
```

---

## 🎉 Summary

**You have a complete, accessible FileMaker data structure with 9 tables!**

### Current Status
- ✅ **2 tables imported** (Contacts, Contact Details)
- 🔵 **7 tables ready** (Clinics, Referrers, Sessions, Company, Docs, Images)
- 🎯 **Clear import path** forward

### Most Valuable Next Import
**`API_Clinics_Details`** - This contains your appointment/session history with:
- Patient links
- Clinic locations
- Appointment dates/times
- Session notes
- Referrer information

This is goldmine data for understanding patient care history! 🏆

---

**Documentation:** This file provides complete reference for all FileMaker API tables  
**Date:** November 9, 2025  
**Status:** ✅ All tables accessible and documented

