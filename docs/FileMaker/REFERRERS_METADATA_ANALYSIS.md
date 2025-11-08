# Referrers & Companies - Metadata Analysis

**Date:** 2025-11-09  
**Source:** FileMaker OData API Metadata Discovery  
**Status:** ✅ Metadata Retrieved Successfully

---

## 📊 **Tables Discovered**

All 4 target tables found and accessible via OData:

1. ✅ `API_Company_` (30 fields)
2. ✅ `API_Referrer_` (25 fields)
3. ✅ `API_ContactToReferrer_` (9 fields)
4. ✅ `API_ReferrerToCompany_Join_` (9 fields)

---

## 📋 **Table 1: `API_Company_` (Companies/Practices)**

**Expected Records:** 44  
**Primary Key:** `id` (Edm.String)

### **Core Fields:**
| FileMaker Field | Type | Nexus Field | Notes |
|----------------|------|-------------|-------|
| `id` | String | `filemaker_id` | UUID primary key |
| `Name` | String | `name` | Company name |
| `ABN` | String | `abn` | Australian Business Number |
| `Type` | String | `company_type` | Type of company |
| `Location` | String | `address_json` (?) | May contain address |
| `_kf_XeroContactID` | String | Skip | Xero integration ID |

### **Count Fields (Related Records):**
- `_kz_Email_gc` (Decimal) - Email count
- `_kz_Mobile_gc` (Decimal) - Mobile count
- `_kz_Address_gc` (Decimal) - Address count
- `_kz_Phone_gc` (Decimal) - Phone count
- `_kz_Work_gc` (Decimal) - Work address count
- `_kz_Postal_gc` (Decimal) - Postal address count

### **Skip Fields:**
- `%_sortBy`, `summaryListOfNames`, `Link`, `SEARCH`, `KEYS` - UI/calc fields
- `LastAPIResult`, `XeroContactPOSTCalc` - Xero integration
- `zv_Pivot_gt`, `sortListKey`, `Sort Selection`, `Xero address` - Internal

### **Missing Data:**
- ❌ No contact details (phone, email, address) - Must be in related `@Contact Details` table
- ❌ No `id.key` (shows in list but may be calc field)

---

## 📋 **Table 2: `API_Referrer_` (Referrers/Doctors)**

**Expected Records:** 98  
**Primary Key:** `id` (Edm.String)

### **Core Fields:**
| FileMaker Field | Type | Nexus Field | Notes |
|----------------|------|-------------|-------|
| `id` | String | `filemaker_id` | UUID primary key |
| `title` | String | `title` | Mr, Mrs, Dr, Prof |
| `nameFirst` | String | `first_name` | First name |
| `nameMiddle` | String | `middle_name` | Middle name |
| `nameLast` | String | `last_name` | Last name |
| `gender` | String | Skip | Not needed |
| `contactType` | String | Skip/Analyze | May indicate specialty? |
| `id_Clinic` | String | Skip | Clinic association (legacy?) |
| `RECORD_ACTIVE_INDICATOR` | String | `is_active` | Active/archived flag |

### **Calculated/Display Fields:**
- `Initial` - Calculated initials
- `Name`, `Name Full`, `Name for Labels` - Display names
- `QuickFind` - Search field

### **Skip Fields:**
- `%_sortBy`, `summaryListOfLastName`, `Link`, `SEARCH`, `KEYS` - UI/calc fields

### **Missing Data:**
- ❌ No `Specialty` field - May be in `contactType` or need separate table
- ❌ No contact details (phone, email, address) - Must be in related `@Contact Details` table
- ❌ No practice/company link - Only in join table

### **Questions:**
1. What does `contactType` contain? (Specialty? Or "Referrer" type?)
2. Where is `Specialty` stored? (Need sample data to confirm)
3. Is `id_Clinic` relevant? (Or legacy field?)

---

## 📋 **Table 3: `API_ContactToReferrer_` (Patient-Referrer Links)**

**Expected Records:** 255  
**Primary Key:** None (join table)

### **Core Fields:**
| FileMaker Field | Type | Nexus Field | Notes |
|----------------|------|-------------|-------|
| `id_Contact` | String | `patient_id` | Foreign key to `API_Contacts_.id` |
| `id_Perscriber` | String | `referrer_id` | Foreign key to `API_Referrer_.id` (typo: "Perscriber" = "Prescriber"?) |
| `date` | Date | `referral_date` | When referral was made |

### **Audit Fields:**
- `creationAccountName`, `creationTimestamp`, `creationHostTimestamp`
- `modificationAccountName`, `modificationTimestamp`, `modificationHostTimestamp`

### **Notes:**
- Simple join table
- No primary key defined in metadata
- `id_Perscriber` is a typo for "Prescriber" (referrer who prescribes)

---

## 📋 **Table 4: `API_ReferrerToCompany_Join_` (Referrer-Company Links)**

**Expected Records:** 73  
**Primary Key:** None (join table)

### **Core Fields:**
| FileMaker Field | Type | Nexus Field | Notes |
|----------------|------|-------------|-------|
| `id_Company` | String | `company_id` | Foreign key to `API_Company_.id` |
| `id_Referrer` | String | `referrer_id` | Foreign key to `API_Referrer_.id` |
| `date` | Date | `assignment_date` (?) | When referrer joined company? |

### **Audit Fields:**
- `creationAccountName`, `creationTimestamp`, `creationHostTimestamp`
- `modificationAccountName`, `modificationTimestamp`, `modificationHostTimestamp`

### **Notes:**
- Simple join table
- No primary key defined in metadata
- `date` field purpose unclear (assignment date? referral date?)

---

## 🔍 **Key Findings**

### **✅ Good News:**
1. All 4 tables accessible via OData
2. Clean foreign key relationships (`id_Contact`, `id_Referrer`, `id_Company`)
3. Audit fields available (creation/modification tracking)
4. Simple structure (no complex nested data)

### **❌ Missing Data:**
1. **Contact Details Missing:**
   - Companies: No phone, email, address in `API_Company_`
   - Referrers: No phone, email, address in `API_Referrer_`
   - **Solution:** Must be in `API_Contact_Details_` table (like patients)

2. **Specialty Field Missing:**
   - Not in `API_Referrer_` metadata
   - May be in `contactType` field (need sample data)
   - **Solution:** Check sample data, or create separate lookup table

3. **Sample Records = 0:**
   - All tables returned 0 sample records
   - **Solution:** Fetch actual data (not just metadata)

---

## 🎯 **Next Steps**

### **Step 1: Fetch Sample Data** (IMMEDIATE)
Export 5-10 sample records from each table to see actual data:
- Check if `contactType` contains specialty
- See if contact details are embedded anywhere
- Understand the `date` fields better

### **Step 2: Fetch Contact Details for Companies/Referrers**
Query `API_Contact_Details_` filtered by:
- `id.key IN (company IDs)` - Get company contact details
- `id.key IN (referrer IDs)` - Get referrer contact details

### **Step 3: Create Django Models**
Based on findings from Steps 1 & 2:
- `companies.models.Company`
- `referrers.models.Referrer`
- `referrers.models.Specialty` (if needed)
- `referrers.models.PatientReferrer` (join)
- `referrers.models.ReferrerCompany` (join)

### **Step 4: Create Import Script**
Import in dependency order:
1. Companies (independent)
2. Specialties (independent, if needed)
3. Referrers (depends on companies, specialties)
4. PatientReferrers (depends on patients, referrers)
5. ReferrerCompanies (depends on referrers, companies)

---

## 📝 **Field Mapping Summary**

### **Company Fields to Import:**
- `id` → `filemaker_id`
- `Name` → `name`
- `ABN` → `abn`
- `Type` → `company_type`
- Contact details from `API_Contact_Details_` → `contact_json`

### **Referrer Fields to Import:**
- `id` → `filemaker_id`
- `title` → `title`
- `nameFirst` → `first_name`
- `nameMiddle` → `middle_name`
- `nameLast` → `last_name`
- `contactType` (?) → `specialty_id` (?)
- `RECORD_ACTIVE_INDICATOR` → `is_active`
- Contact details from `API_Contact_Details_` → `contact_json`

### **PatientReferrer Fields to Import:**
- `id_Contact` → `patient_id`
- `id_Perscriber` → `referrer_id`
- `date` → `referral_date`

### **ReferrerCompany Fields to Import:**
- `id_Company` → `company_id`
- `id_Referrer` → `referrer_id`
- `date` → `assignment_date` (?)

---

## ⚠️ **Critical Questions to Answer:**

1. **Where is Specialty stored?**
   - ✅ **RESOLVED:** In `contactType` field - create separate `specialties` lookup table

2. **Where are contact details?**
   - ✅ **RESOLVED:** `API_Contact_Details_` table (universal for all entities)
   - Link by: `id.key` = company ID or referrer ID

3. **What is the `date` field in join tables?**
   - ✅ **RESOLVED:**
     - `API_ContactToReferrer_.date` = When referrer was added to patient (assignment date)
     - `API_ReferrerToCompany_Join_.date` = When referrer joined company (assignment date)

4. **Do we need `RECORD_ACTIVE_INDICATOR`?**
   - ✅ **RESOLVED:** Yes - filter OUT archived referrers (only import active ones)

5. **What's in `Type` field?**
   - ✅ **RESOLVED:** Create `company_types` lookup table from unique values

6. **Track referral reason/status?**
   - ✅ **RESOLVED:** Just date is enough - tracks when referrer was added to patient

7. **Where is `practice_name`?**
   - ✅ **RESOLVED:** Dynamic property from referrer→company relationship (primary company)

8. **Notes for referrers/companies?**
   - ✅ **RESOLVED:** FileMaker doesn't have notes for these entities

9. **Documents/images for referrers/companies?**
   - ✅ **RESOLVED:** FileMaker doesn't have docs/images for these entities

10. **Import archived companies?**
    - ✅ **RESOLVED:** YES - import all companies (build better archiving system in Nexus)

---

**Status:** All questions resolved! Ready to fetch sample data and start implementation! 🚀

