# Phase 1: Patient Contacts Import - Detailed Plan

**Created:** 2025-11-08  
**Target:** Import ONLY patients + communication data (phone/email/address)  
**Status:** 🔄 Planning

---

## 🎯 **Goal: Import Basic Patient Records**

**What we're importing:**
- ✅ Patient basic info (name, DOB, gender)
- ✅ Phone numbers
- ✅ Email addresses
- ✅ Physical addresses

**What we're NOT importing (yet):**
- ❌ Appointments
- ❌ Images/Documents
- ❌ Letters
- ❌ Orders/Invoices
- ❌ NDIS assessments
- ❌ Messages/Notes

---

## 📋 **Step-by-Step Plan**

### **Step 1: Analyze Communication Data Structure** ⚠️ CRITICAL

**BEFORE we write ANY code, we need to understand:**

#### **Question 1: How are phone numbers stored?**
- Is `_kz_Mobile_gc` a single field or repeating field?
- Can a patient have multiple mobile numbers?
- What about home phone, work phone?
- What format? (with spaces, dashes, country code?)

**Sample data we have:**
```
_kz_Mobile_gc: "Mobile"  ← This looks like a label, not actual data!
_kz_Phone_gc: "Phone"    ← Also looks like a label!
```

**ACTION NEEDED:** Get sample data with ACTUAL phone numbers

---

#### **Question 2: How are email addresses stored?**
- Is `_kz_Email_gc` a single field or repeating field?
- Can a patient have multiple emails (home, work)?
- What format?

**Sample data we have:**
```
_kz_Email_gc: "Email"  ← This looks like a label, not actual data!
```

**ACTION NEEDED:** Get sample data with ACTUAL email addresses

---

#### **Question 3: How are addresses stored?**
- Is `_kz_Address_gc` a single text field with full address?
- Or are there separate fields for street, suburb, postcode, state?
- What format?

**Sample data we have:**
```
_kz_Address_gc: "Address"  ← This looks like a label, not actual data!
```

**ACTION NEEDED:** Get sample data with ACTUAL addresses

---

#### **Question 4: Are there RELATED tables for communication?**

Looking at the schema, I see these related tables:
- **`Interface » Contacts`** - 10,688 records (MORE than 2,845 patients!)
- **`@Contact Details Export`** - 10,688 records, 23 fields

**This suggests:**
- There might be a SEPARATE communication table (many-to-many relationship)
- One patient can have MULTIPLE contact records
- We might need to export from a DIFFERENT layout!

**ACTION NEEDED:** 
1. Analyze what "Interface » Contacts" layout contains
2. Check if it's a related table for phone/email/address
3. Understand the relationship between patients and contacts

---

### **Step 2: Export Sample Data** 🔍

**Create a script to export 10-20 sample patient records with their communication data.**

**Script: `scripts/filemaker/02_export_sample_contacts.py`**

**What it should do:**
1. Connect to FileMaker
2. Export 10-20 records from `NDIS Service Agreement Contact` layout
3. Include ALL fields (so we can see actual data)
4. Save to `data/export/sample_contacts.json`
5. Print summary of what we found

**Deliverable:** `data/export/sample_contacts.json` with real data

---

### **Step 3: Analyze Sample Data** 🔬

**Manually review the sample data to understand:**
1. Phone number format(s)
2. Email format(s)
3. Address format(s)
4. Which fields are actually populated
5. Which fields are labels vs data
6. Are there related records?

**Questions to answer:**
- [ ] How many phone fields are actually populated per patient?
- [ ] What's the format of phone numbers?
- [ ] How many email fields are actually populated per patient?
- [ ] What's the format of emails?
- [ ] Is address in one field or multiple fields?
- [ ] Do we need to query related tables?

**Deliverable:** Updated `FIELD_MAPPING.md` with actual data examples

---

### **Step 4: Design Contact JSON Structure** 📐

**Based on sample data analysis, design the exact JSON structure for Nexus.**

**Example (this might change based on actual data):**

```json
{
  "contact_json": {
    "phone": {
      "home": {
        "value": "+61 2 9876 5432",
        "default": true
      },
      "work": {
        "value": "+61 2 1234 5678",
        "default": false
      }
    },
    "mobile": {
      "home": {
        "value": "+61 412 345 678",
        "default": true
      }
    },
    "email": {
      "home": {
        "value": "patient@example.com",
        "default": true
      },
      "work": {
        "value": "patient@work.com",
        "default": false
      }
    }
  },
  "address_json": {
    "street": "123 Main St",
    "street2": "Unit 4",
    "suburb": "Tamworth",
    "postcode": "2340",
    "state": "NSW",
    "type": "home",
    "default": true
  }
}
```

**Deliverable:** `docs/FileMaker/CONTACT_JSON_DESIGN.md`

---

### **Step 5: Build Transformation Functions** 🔧

**Create utility functions to transform data (NOT the full import yet!).**

**Script: `scripts/filemaker/utils/transformers.py`**

**Functions to create:**
1. `transform_phone_number(fm_phone: str) -> str`
   - Input: FileMaker phone format
   - Output: E.164 with spaces: `+61 4 1234 5678`
   
2. `transform_email(fm_email: str) -> str`
   - Input: FileMaker email
   - Output: Cleaned/validated email
   
3. `transform_address(fm_address: str) -> dict`
   - Input: FileMaker address (whatever format it is)
   - Output: Parsed dict with street, suburb, postcode, state
   
4. `transform_date(fm_date: str) -> str`
   - Input: FileMaker date format (`10/11/2016`)
   - Output: ISO format (`2016-10-11`)
   
5. `transform_timestamp(fm_timestamp: str) -> str`
   - Input: `10/11/2016 10:53:33`
   - Output: ISO with timezone (`2016-10-11T10:53:33+00:00`)
   
6. `transform_gender(fm_gender: str) -> str`
   - Input: FileMaker gender value
   - Output: M, F, O, or U
   
7. `transform_title(fm_title: str) -> str`
   - Input: `Mr.`, `Mrs.`
   - Output: `Mr`, `Mrs` (no period)

**Deliverable:** Tested transformation functions with unit tests

---

### **Step 6: Test Transformations** ✅

**Create test file: `scripts/filemaker/tests/test_transformers.py`**

**Test each function with:**
- Valid inputs
- Edge cases (empty, None, weird formats)
- Invalid inputs (should handle gracefully)

**Run tests:**
```bash
python3 -m pytest scripts/filemaker/tests/
```

**Deliverable:** All tests passing ✅

---

### **Step 7: Build Contact Import Script (DRY RUN)** 🏗️

**Script: `scripts/filemaker/03_import_contacts_dryrun.py`**

**What it should do:**
1. Load sample data from `data/export/sample_contacts.json`
2. Transform EACH field using the transformation functions
3. Build the complete patient record for Nexus
4. **DO NOT INSERT INTO DATABASE**
5. Save transformed data to `data/transformed/contacts_transformed.json`
6. Print summary report showing:
   - How many records processed
   - How many records have phone numbers
   - How many records have email addresses
   - How many records have addresses
   - Any validation errors/warnings

**Deliverable:** `data/transformed/contacts_transformed.json` ready for review

---

### **Step 8: Review Transformed Data** 👀

**Manually review the transformed data:**
1. Check 5-10 records in detail
2. Verify phone numbers are correctly formatted
3. Verify email addresses are valid
4. Verify addresses are properly parsed
5. Verify dates are in ISO format
6. Check for any missing/null fields

**Questions to answer:**
- [ ] Are all phone numbers valid?
- [ ] Are all email addresses valid?
- [ ] Are all addresses properly parsed?
- [ ] Are there any edge cases we missed?
- [ ] Do we need to adjust transformation logic?

**Deliverable:** Approval to proceed OR list of fixes needed

---

### **Step 9: Build Contact Import Script (REAL - Staging DB)** 💾

**Script: `scripts/filemaker/04_import_contacts_staging.py`**

**What it should do:**
1. Load transformed data from `data/transformed/contacts_transformed.json`
2. Connect to **STAGING** PostgreSQL database (NOT production!)
3. For each patient record:
   - Check if patient already exists (by FileMaker ID?)
   - Insert into `patients` table
   - Handle foreign keys (clinic, funding_type)
   - Log success/failure
4. Generate import report:
   - Total records processed
   - Records inserted successfully
   - Records skipped (already exist)
   - Records failed (with error details)
5. Save report to `data/validation/import_report_contacts.txt`

**Deliverable:** Patients imported to staging database

---

### **Step 10: Validate Import (Staging DB)** ✅

**Script: `scripts/filemaker/05_validate_contacts_import.py`**

**Validation checks:**
1. Record count matches (FileMaker vs Nexus)
2. Sample 10 random patients and compare ALL fields
3. Check phone numbers are in correct JSON format
4. Check email addresses are in correct JSON format
5. Check addresses are in correct JSON format
6. Check all dates are valid
7. Check all foreign keys are valid (clinic, funding_type)

**Deliverable:** Validation report showing success or issues

---

### **Step 11: Review & Approve** 🎯

**Manual review of staging database:**
1. Login to Nexus frontend (pointing to staging DB)
2. Open 10-20 patient records
3. Verify all data looks correct
4. Check phone/email/address display correctly
5. Check for any obvious issues

**Deliverable:** Approval to proceed to production

---

### **Step 12: Import to Production** 🚀

**Only after staging is approved:**
1. Backup production database
2. Run same import script but pointed to production
3. Validate production import
4. Generate final report

**Deliverable:** Patients imported to production ✅

---

## ⚠️ **Critical Questions to Answer FIRST**

**Before we write ANY code, we need answers to:**

### **1. Communication Data Structure**
- Where is the ACTUAL phone/email/address data stored?
- Is it in the `NDIS Service Agreement Contact` layout?
- Or is it in a related table like `Interface » Contacts`?
- Can you run this query and share results?

**Suggested FileMaker query:**
```python
# Get one patient with ALL their communication data
GET /fmi/data/vLatest/databases/WEP-DatabaseV2/layouts/NDIS Service Agreement Contact/records?_limit=1
```

### **2. Related Tables**
- What is the `Interface » Contacts` table? (10,688 records vs 2,845 patients)
- Is this a many-to-many relationship table?
- Do we need to export from BOTH layouts?

### **3. Clinic & Funding Type Mapping**
- How many unique clinics exist in FileMaker?
- Do they match the clinics in Nexus?
- Do we need to create new clinics?
- What are the unique funding type values in FileMaker?

---

## 🎯 **Our Next Steps**

**What should we do RIGHT NOW?**

1. **Option A: Export sample data** - Run a script to export 10-20 patients with ALL fields
2. **Option B: Manual exploration** - You tell me what phone/email/address data looks like
3. **Option C: Analyze related tables** - Figure out if `Interface » Contacts` is what we need

**Which option do you prefer?** I recommend **Option A** - let me create a sample export script so we can see REAL data.

---

**Want me to:**
1. Create the sample export script (`02_export_sample_contacts.py`)?
2. First, manually check what a patient record looks like in FileMaker?
3. Analyze the `Interface » Contacts` table structure first?

Let me know and we'll build this step by step! 🚀

