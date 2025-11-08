# FileMaker → Nexus Field Mapping

**Created:** 2025-11-08  
**Source:** `filemaker_schema_20251108_170805.json`  
**Status:** 🔄 Draft - Needs Review

---

## 📊 **Table Mapping Overview**

| FileMaker Layout | Records | Nexus Table | Priority | Status |
|------------------|---------|-------------|----------|--------|
| **NDIS Service Agreement Contact** | 2,845 | `patients` | 🔴 **CRITICAL** | Mapping below |
| **@event / event / Event** | 15,127 | `appointments` | 🔴 **CRITICAL** | TODO |
| **@contact Images** | 6,664 | `documents` | 🟡 **HIGH** | TODO |
| **Letters / Report_Doc** | 11,269 | `letters_patientletter` | 🟡 **HIGH** | TODO |
| **Order list / Work List** | 3,293 | `orders` (NEW) | 🟡 **HIGH** | TODO |
| **Invoice Print Template** | 6,785 | `invoices` (NEW) | 🟡 **HIGH** | TODO |
| **Messages** | 5,341 | `notes` or `sms_messages` | 🟢 **MEDIUM** | TODO |
| **Inventory** | 4,168 | Product catalog? | 🟢 **MEDIUM** | TODO |
| **NDIS Assessment** | 164 | `patients.plan_dates_json`? | 🟢 **MEDIUM** | TODO |

---

## 👤 **PATIENTS TABLE MAPPING**

### **Source:** `NDIS Service Agreement Contact` (2,845 records, 77 fields)
### **Target:** `patients` table

| FileMaker Field | Type | Nexus Field | Transform | Notes |
|-----------------|------|-------------|-----------|-------|
| **PRIMARY & IDENTIFIERS** |
| `id` | UUID | `id` (UUID) | ✅ Direct | Primary key - already UUID! |
| `old.id` | Text | - | ❌ Skip | Old ID, not needed |
| `id_Clinic` | UUID | `clinic` (FK) | 🔄 FK Lookup | Need to map to Nexus clinic UUID |
| **NAME FIELDS** |
| `title` | Text | `title` | 🔄 Clean | "Mr." → "Mr" (remove period) |
| `nameFirst` | Text | `first_name` | ✅ Direct | |
| `nameMiddle` | Text | `middle_names` | ✅ Direct | (nullable) |
| `nameLast` | Text | `last_name` | ✅ Direct | |
| **DEMOGRAPHICS** |
| `DOB` | Date | `dob` | 🔄 Parse | Parse FileMaker date format |
| `gender` | Text | `sex` | 🔄 Map | Map to M/F/O/U |
| `Health Number` | Text | `health_number` | ✅ Direct | (nullable) |
| **NDIS INFORMATION** |
| `NDIS Plan Start Date` | Date | `plan_start_date` | 🔄 Parse | **LEGACY** field |
| `NDIS Plan End Date` | Date | `plan_end_date` | 🔄 Parse | **LEGACY** field |
| `NDIS Plan Start Date` | Date | `plan_dates_json` | 🔄 JSON | **NEW** array format |
| `NDIS Plan End Date` | Date | `plan_dates_json` | 🔄 JSON | **NEW** array format |
| `NDIS Coordinator Name` | Text | `coordinator_name` | ✅ Direct | |
| `NDIS Coordinator Phone` | Text | `coordinator_date` | ❓ QUESTION | Where is coordinator date in FM? |
| `NDIS Coordinator Email` | Text | - | ⚠️ **MISSING** | Nexus doesn't have coordinator email field! |
| `NDIS notes` | Text | `notes` | ✅ Direct | (or separate notes table?) |
| `NDIS Report` | Container? | ? | ❓ QUESTION | What is this field? |
| `NDIS logo` | Container? | ? | ❓ QUESTION | What is this field? |
| `Funding` | Text | `funding_type` (FK) | 🔄 Lookup | Map "Enable" → NDIS funding source |
| **CONTACT INFORMATION** |
| `_kz_Email_gc` | Text | `contact_json` | 🔄 JSON | Build `{ email: { home: { value: "...", default: true } } }` |
| `_kz_Mobile_gc` | Text | `contact_json` | 🔄 JSON | Build `{ mobile: { home: { value: "...", default: true } } }` |
| `_kz_Phone_gc` | Text | `contact_json` | 🔄 JSON | Build `{ phone: { home: { value: "...", default: true } } }` |
| `_kz_Address_gc` | Text | `address_json` | 🔄 JSON | Parse address into street, suburb, postcode, state |
| **XERO INTEGRATION** |
| `_kf_XeroContactID` | UUID | - | ⚠️ **MISSING** | Nexus doesn't store Xero Contact ID! Need to add? |
| `LastAPIResult` | Text | - | ❌ Skip | Not needed |
| `XeroContactPOSTCalc` | XML | - | ❌ Skip | Not needed |
| **STATUS & FLAGS** |
| `RECORD_ACTIVE_INDICATOR` | Flag | `archived` | 🔄 Invert | If empty → archived=false, if set → archived=true? |
| `Flaged` | Text | `flags_json` | 🔄 JSON | Convert to flags_json structure |
| `Impaired Vision` | Flag | `flags_json` | 🔄 JSON | Add to flags_json |
| `Impaired Hearing` | Flag | `flags_json` | 🔄 JSON | Add to flags_json |
| `Diabetes` | Flag | `flags_json` | 🔄 JSON | Add to flags_json |
| **AUDIT FIELDS** |
| `creationAccountName` | Text | - | ❌ Skip | Not tracked in Nexus |
| `creationTimestamp` | Timestamp | `created_at` | 🔄 Parse | Parse FileMaker timestamp |
| `modificationAccountName` | Text | - | ❌ Skip | Not tracked in Nexus |
| `modificationTimestamp` | Timestamp | `updated_at` | 🔄 Parse | Parse FileMaker timestamp |
| **IMAGES & DOCUMENTS** |
| `imageKeys` | Text | - | 🔄 **LOOKUP** | Links to @contact Images table |
| `docKeys` | Text | - | 🔄 **LOOKUP** | Links to Letters/Report_Doc table |
| `faceImage_*` | Container? | - | 🔄 **EXTRACT** | Extract face images, upload to S3? |
| **CALCULATED/INTERNAL FIELDS** |
| `Initial` | Calculated | - | ❌ Skip | Can be calculated in Nexus |
| `Name` | Calculated | - | ❌ Skip | Calculated field |
| `Name Full` | Calculated | - | ❌ Skip | Calculated field |
| `%_sortBy` | Calculated | - | ❌ Skip | UI sorting |
| *(Many other calculated fields)* | Calculated | - | ❌ Skip | Not needed |

---

## ⚠️ **MISSING FIELDS IN NEXUS**

These FileMaker fields don't have a direct match in Nexus:

1. **`NDIS Coordinator Email`** - Nexus only has `coordinator_name` and `coordinator_date`
   - **Solution:** Add to `patients` model or store in JSON field?
   
2. **`_kf_XeroContactID`** - Xero Contact ID from integration
   - **Solution:** Add field to `patients` model for Xero sync?
   
3. **`Order State`** - Order status tracking
   - **Solution:** Will be in `orders` table (not yet built)

4. **Face images** (`faceImage_Ex_large`, `faceImage_large`, etc.)
   - **Solution:** Extract and upload to S3, link via `documents` table?

---

## ❓ **QUESTIONS TO ANSWER**

### **1. Contact Information Structure**
- How are phone/email/address stored in FileMaker?
  - Are `_kz_Email_gc`, `_kz_Mobile_gc`, `_kz_Phone_gc` single fields or repeating fields?
  - Can a patient have multiple phone numbers/emails?
  - **ACTION:** Need to look at sample data more closely

### **2. NDIS Coordinator Date**
- Where is the coordinator assignment date stored in FileMaker?
  - Nexus has `coordinator_date` but FileMaker only shows `NDIS Coordinator Name/Phone/Email`
  - **ACTION:** Search for date field in FileMaker or use creation timestamp?

### **3. Archive/Active Status**
- What does `RECORD_ACTIVE_INDICATOR` actually mean?
  - Is empty = active, or is there a specific value?
  - **ACTION:** Check sample data to understand the values

### **4. Funding Type Mapping**
- FileMaker has `Funding` field with value "Enable"
  - How do we map this to Nexus `funding_sources` table?
  - **ACTION:** Get list of all unique funding values in FileMaker
  - **ACTION:** Map to existing Nexus funding sources (NDIS, Private, DVA, etc.)

### **5. Clinic Mapping**
- FileMaker has `id_Clinic` UUID and `Clinic_Name` text
  - Sample: `95BD76C6-5591-48C1-8C1A-D88776933504` → "Tamworth"
  - **ACTION:** Export all clinics from FileMaker
  - **ACTION:** Map to Nexus `clinics` table (or create new clinics)

### **6. Images & Documents**
- `imageKeys` and `docKeys` appear to be comma-separated IDs
  - How do we extract these from the `@contact Images` and `Letters` tables?
  - **ACTION:** Analyze image/document table structure
  - **ACTION:** Plan S3 upload strategy

### **7. Face Images**
- FileMaker has multiple face image fields (different sizes)
  - Should we extract these to S3 or just use the full-size version?
  - **ACTION:** Decide on image strategy (profile pictures)

### **8. Emergency Contacts**
- Where are emergency contacts stored in FileMaker?
  - Nexus has `emergency_json` field
  - **ACTION:** Search for emergency contact fields in FileMaker schema

---

## 🔄 **DATA TRANSFORMATION RULES**

### **Phone Numbers**
- **FileMaker format:** Unknown (need samples)
- **Nexus format:** E.164 with spaces: `+61 4 1234 5678`
- **Transform:** Normalize to E.164, add +61 country code if missing

### **Dates**
- **FileMaker format:** `MM/DD/YYYY` or `DD/MM/YYYY`? (need to check)
- **Nexus format:** `YYYY-MM-DD` (ISO 8601)
- **Transform:** Parse and convert to ISO format

### **Timestamps**
- **FileMaker format:** `10/11/2016 10:53:33`
- **Nexus format:** `2016-10-11T10:53:33+00:00` (ISO 8601 with timezone)
- **Transform:** Parse and convert to ISO with UTC timezone

### **Gender**
- **FileMaker values:** Unknown (need samples)
- **Nexus values:** M, F, O (Other), U (Unknown)
- **Transform:** Map FileMaker values to Nexus choices

### **Title**
- **FileMaker format:** `Mr.`, `Mrs.`, etc. (with period)
- **Nexus format:** `Mr`, `Mrs`, etc. (without period)
- **Transform:** Strip trailing period

### **Address**
- **FileMaker format:** `_kz_Address_gc` (single field? or multiple fields?)
- **Nexus format:** JSON with `street`, `suburb`, `postcode`, `state`
- **Transform:** Parse address string into components

---

## 📝 **NEXT STEPS**

### **Immediate Actions:**
1. ✅ Schema discovery complete
2. ⚠️ **Analyze sample data** - Get more representative samples from FileMaker
3. ⚠️ **Answer questions** - Clarify missing information above
4. ⚠️ **Map appointments table** - Analyze `@event` layout
5. ⚠️ **Map documents table** - Analyze `@contact Images` layout
6. ⚠️ **Map letters table** - Analyze `Letters` layout
7. ⚠️ **Build Phase 2 export script** - Export data from FileMaker to JSON/CSV

### **Decisions Needed:**
- [ ] Add `coordinator_email` field to `patients` model?
- [ ] Add `xero_contact_id` field to `patients` model?
- [ ] How to handle face images (profile pictures)?
- [ ] How to handle emergency contacts?
- [ ] Create new `orders` and `invoices` tables?

---

## 📚 **Related Documentation**

- **Schema Discovery Output:** `scripts/filemaker/data/discovery/filemaker_schema_20251108_170805.json`
- **Import Plan:** `docs/FileMaker/FILEMAKER_IMPORT_PLAN.md`
- **Nexus Schema:** `docs/architecture/DATABASE_SCHEMA.md`
- **FileMaker API Guide:** `docs/FileMaker/README.md`

---

**Status:** 🔄 In Progress - Patient table mapping complete, other tables pending

