# FileMaker Import Script - Improvements Checklist

**Date Created:** November 9, 2025  
**Status:** 🔄 In Progress  
**File:** `backend/patients/management/commands/import_filemaker_data.py`

---

## ✅ Completed Improvements

### 1. ✅ Date Parsing Fixed
- **Issue:** OData returns dates in ISO format (`YYYY-MM-DD`), but parser only understood US format
- **Solution:** Updated `parse_filemaker_date()` to handle both ISO and US formats
- **Status:** ✅ Complete - 85.6% of patients now have DOB data

### 2. ✅ Phone Number Cleaning
- **Issue:** FileMaker phone numbers have whitespaces, hyphens, parentheses
- **Solution:** Added `clean_phone_number()` function to strip all formatting
- **Examples:**
  - `"0412 345 678"` → `"0412345678"`
  - `"(02) 1234 5678"` → `"0212345678"`
  - `"04-12-34-56-78"` → `"0412345678"`
- **Status:** ✅ Complete - Ready for contact details import

### 3. ✅ Title Field Added
- **Issue:** Patient titles were not being imported
- **Solution:** Added `title` field mapping to import
- **Status:** ✅ Complete - All titles (Mr., Mrs., Ms., Dr., etc.) now imported

---

## 🔄 Pending Improvements

### 4. 🔴 Funding Type Import - CRITICAL
- **Issue:** Funding type field not in FileMaker export
- **What's needed:**
  - Add `funding_type` or `funding_source` field to FileMaker `@Contacts` table
  - OR create OData query to get funding from another table
  - OR infer funding from NDIS plan dates (if plan exists → NDIS, else → DVA/Private)
  - Map FileMaker funding values to Nexus funding sources
  - Link to existing funding sources in Nexus database
- **Priority:** 🔴 Critical - Required for patient categorization
- **Estimated effort:** Medium (depends on FileMaker schema)
- **Status:** ⏳ Not Started

### 5. ⏳ Contact Details Import
- **Issue:** OData export doesn't include contact details yet
- **What's needed:**
  - Export contact details from `@Contact Details` or `API_Contact_Details` table
  - Link contact details to patients using patient ID
  - Import phone, mobile, email, and address data
  - Apply phone number cleaning to all imported numbers
- **Priority:** 🔴 High - Patients need contact information
- **Estimated effort:** Medium
- **Status:** ⏳ Not Started

### 6. ⏳ Email Validation
- **Issue:** Some FileMaker emails might be invalid or malformed
- **What's needed:**
  - Add email validation function
  - Check for valid email format (e.g., `user@domain.com`)
  - Skip or flag invalid emails
  - Log warnings for invalid emails
- **Priority:** 🟡 Medium
- **Estimated effort:** Small
- **Status:** ⏳ Not Started

### 7. ⏳ Phone Number Validation
- **Issue:** After cleaning, some phone numbers might be invalid
- **What's needed:**
  - Validate Australian phone numbers:
    - Mobile: 10 digits starting with `04`
    - Landline: 10 digits starting with `02`, `03`, `07`, `08`
  - Flag or skip invalid numbers
  - Log warnings for invalid phone numbers
- **Priority:** 🟡 Medium
- **Estimated effort:** Small
- **Status:** ⏳ Not Started

### 8. ⏳ Duplicate Detection
- **Issue:** Need to avoid importing the same patient twice
- **What's needed:**
  - Check for existing patients by FileMaker ID
  - Option to update existing patients vs skip
  - Add `--update` flag to command
  - Log which patients are updates vs new imports
- **Priority:** 🟡 Medium
- **Estimated effort:** Medium
- **Status:** ⏳ Not Started

### 9. ⏳ Data Validation & Error Handling
- **Issue:** Need better validation and error reporting
- **What's needed:**
  - Validate required fields (first_name, last_name)
  - Catch and log import errors per patient
  - Continue import even if one patient fails
  - Generate error report at end
- **Priority:** 🟡 Medium
- **Estimated effort:** Medium
- **Status:** ⏳ Not Started

### 10. ⏳ Health Number Validation
- **Issue:** Medicare/DVA numbers should be validated
- **What's needed:**
  - Validate Medicare number format (10 digits)
  - Validate DVA number format
  - Flag invalid health numbers
- **Priority:** 🟢 Low
- **Estimated effort:** Small
- **Status:** ⏳ Not Started

### 11. ⏳ Postcode Validation
- **Issue:** Postcodes should be valid Australian postcodes
- **What's needed:**
  - Validate Australian postcode (4 digits)
  - Ensure postcode matches state (optional)
  - Convert to string and pad with leading zeros if needed
- **Priority:** 🟢 Low
- **Estimated effort:** Small
- **Status:** ⏳ Not Started

### 12. ⏳ Gender/Sex Standardization
- **Issue:** FileMaker might have inconsistent gender values
- **What's needed:**
  - Map FileMaker gender values to Nexus format
  - Handle variations: M/Male, F/Female, etc.
  - Set to `None` for unknown/unspecified
- **Priority:** 🟢 Low
- **Estimated effort:** Small
- **Status:** ⏳ Not Started

### 13. ⏳ Import Statistics & Reporting
- **Issue:** Need detailed import statistics
- **What's needed:**
  - Count imported vs skipped vs errors
  - Report by data type (patients, contacts, addresses)
  - Show data quality metrics (% with DOB, % with phone, etc.)
  - Export report to file
- **Priority:** 🟡 Medium
- **Estimated effort:** Small
- **Status:** ⏳ Not Started

### 14. ⏳ Dry Run Mode Enhancement
- **Issue:** Dry run doesn't show detailed validation issues
- **What's needed:**
  - Show validation errors in dry run
  - Preview data transformations
  - Show what would be skipped/updated
- **Priority:** 🟢 Low
- **Estimated effort:** Small
- **Status:** ⏳ Not Started

### 15. ⏳ Progress Bar/Better Output
- **Issue:** Import output could be more user-friendly
- **What's needed:**
  - Add progress bar for large imports
  - Group output (show every 100 patients instead of all)
  - Add color coding for different message types
  - Add estimated time remaining
- **Priority:** 🟢 Low
- **Estimated effort:** Small
- **Status:** ⏳ Not Started

### 16. ⏳ Clinic Mapping
- **Issue:** FileMaker clinic names need to map to Nexus clinic IDs
- **What's needed:**
  - Create clinic lookup table
  - Map FileMaker clinic names to Nexus clinic objects
  - Handle missing/new clinics
  - Log unmapped clinics
- **Priority:** 🟡 Medium
- **Estimated effort:** Medium
- **Status:** ⏳ Not Started

### 17. ⏳ NDIS Data Import
- **Issue:** NDIS plan dates and coordinator info not imported yet
- **What's needed:**
  - Import `ndis_plan_start` and `ndis_plan_end` dates
  - Import coordinator name, phone, email
  - Parse NDIS dates correctly
  - Map to `plan_dates_json` field
- **Priority:** 🟢 Low
- **Estimated effort:** Medium
- **Status:** ⏳ Not Started

### 18. ⏳ Xero Contact ID Validation
- **Issue:** Xero contact IDs should be valid GUIDs
- **What's needed:**
  - Validate Xero ID format
  - Handle missing Xero IDs gracefully
  - Log patients with invalid Xero IDs
- **Priority:** 🟢 Low
- **Estimated effort:** Small
- **Status:** ⏳ Not Started

### 19. ⏳ Default Phone Selection
- **Issue:** Need to intelligently set default phone number
- **What's needed:**
  - Priority: Mobile > Phone > Work
  - Set most likely contact as default
  - Handle cases with no phone numbers
- **Priority:** 🟢 Low
- **Estimated effort:** Small
- **Status:** ⏳ Not Started

---

## 📋 Future Enhancements (Post-Initial Import)

### 20. 📅 Appointments Import
- Import appointment history from FileMaker
- Map to Nexus appointment model
- Link to imported patients

### 21. 📄 Documents/Images Import
- Import patient documents from FileMaker
- Upload to S3
- Link to patients

### 22. 👥 Referrers/Coordinators Import
- Import referrer contacts
- Import NDIS coordinators
- Create separate contact records

---

## 🎯 Recommended Priority Order

### Phase 1 - Critical (Do Before Full Import)
1. ✅ Date parsing (COMPLETE)
2. ✅ Phone number cleaning (COMPLETE)
3. ⏳ **Contact details import** (HIGH PRIORITY)
4. ⏳ **Email validation** (MEDIUM PRIORITY)
5. ⏳ **Phone number validation** (MEDIUM PRIORITY)
6. ⏳ **Duplicate detection** (MEDIUM PRIORITY)

### Phase 2 - Important (Do Soon After)
7. ⏳ Data validation & error handling
8. ⏳ Import statistics & reporting
9. ⏳ Clinic mapping

### Phase 3 - Nice to Have (Can Do Later)
10. ⏳ Health number validation
11. ⏳ Postcode validation
12. ⏳ Gender standardization
13. ⏳ Progress bar
14. ⏳ NDIS data import
15. ⏳ Xero ID validation
16. ⏳ Default phone selection

---

## 📊 Current Import Quality Metrics

Based on the last import (2,845 patients):

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Patients** | 2,845 | 100% |
| **Imported Successfully** | 2,842 | 99.9% |
| **Skipped (No Name)** | 3 | 0.1% |
| **With DOB** | 2,433 | 85.6% |
| **Without DOB** | 409 | 14.4% |
| **With Contact Details** | 0 | 0% ⚠️ |
| **Errors** | 0 | 0% ✅ |

---

## 🔧 Testing Checklist

Before final production import, test:

- [ ] Import with contact details
- [ ] Phone number cleaning (all formats)
- [ ] Email validation
- [ ] Duplicate patient handling
- [ ] Error handling (malformed data)
- [ ] Large dataset performance (2,845 patients)
- [ ] Database rollback if needed
- [ ] Frontend display of imported data

---

## 📝 Notes

- Keep backup of current data before major imports
- Test with small sample (10-20 patients) before full import
- Document any data quality issues discovered
- Keep import scripts version controlled
- Consider adding unit tests for validation functions

---

**Last Updated:** November 9, 2025, 4:00 AM  
**Next Review:** Before contact details import

