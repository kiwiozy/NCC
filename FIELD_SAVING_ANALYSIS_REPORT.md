# Field Saving Analysis Report

**Date:** November 20, 2025  
**Status:** IN PROGRESS  
**Purpose:** Identify and fix any frontend fields that are not saving to the database

---

## Executive Summary

This report documents a comprehensive analysis of all data-saving operations in the WalkEasy Nexus application to identify any frontend fields that are not properly saving to the database.

---

## Analysis Methodology

1. **Identify all data-entry points** (forms, dialogs, inline editors)
2. **Check frontend field collection** (what data is captured)
3. **Verify API calls** (what data is sent to backend)
4. **Check backend serializers** (what fields are accepted)
5. **Verify database models** (what fields exist in database)
6. **Identify and fix discrepancies**

---

## Areas Analyzed

### ✅ 1. Patient Data Management

**Location:** `frontend/app/patients/page.tsx`, `frontend/app/components/ContactHeader.tsx`

**Fields Collected:**
- ✅ `title` - Inline editable dropdown
- ✅ `first_name` - Inline editable text
- ✅ `middle_names` - Inline editable text
- ✅ `last_name` - Inline editable text
- ✅ `dob` - Inline editable date picker
- ✅ `health_number` - Inline editable text (auto-saves onBlur)
- ✅ `funding_source` - Inline editable dropdown
- ✅ `clinic` - Inline editable dropdown

**Saving Mechanism:**
- Auto-save on blur for each field
- Individual PATCH requests to `/api/patients/{id}/`
- Includes CSRF token
- Updates local caches after successful save

**Backend Acceptance:**
- ✅ Serializer: `patients.serializers.PatientSerializer`
- ✅ All fields present in serializer
- ✅ All fields writeable (not in `read_only_fields`)

**Status:** ✅ **WORKING CORRECTLY**

---

### 🔄 2. Communication/Contact Information

**Location:** Need to analyze `frontend/app/patients/page.tsx` (communication section)

**Expected Fields:**
- Phone numbers (multiple, with types)
- Mobile numbers (multiple, with types)
- Email addresses (multiple, with types)
- Address (street, street2, suburb, postcode, state)
- Emergency contacts

**Status:** ⏳ **PENDING ANALYSIS**

---

### 🔄 3. Plan Dates (NDIS)

**Location:** `frontend/app/patients/page.tsx` (Plan Dates Dialog)

**Expected Fields:**
- `plan_dates_json` - Array of plan date objects
  - `start_date`
  - `end_date`
  - `type`

**Status:** ⏳ **PENDING ANALYSIS**

---

### 🔄 4. Coordinators/Referrers

**Location:** `frontend/app/patients/page.tsx` (Coordinator Dialog)

**Expected Fields:**
- Patient-Referrer relationships
- Referral date
- Primary status
- Status (ACTIVE/INACTIVE)

**Status:** ⏳ **PENDING ANALYSIS**

---

### 🔄 5. Appointments

**Location:** `frontend/app/components/dialogs/AppointmentsDialog.tsx`

**Expected Fields:**
- `start_time`
- `end_time`
- `clinic`
- `clinician`
- `patient`
- `appointment_type`
- `status`
- `reason`
- `notes`

**Status:** ⏳ **PENDING ANALYSIS**

---

### 🔄 6. Clinical Notes

**Location:** `frontend/app/components/dialogs/NotesDialog.tsx`

**Expected Fields:**
- `patient`
- `note_text`
- `note_type`
- `created_by`

**Status:** ⏳ **PENDING ANALYSIS**

---

### 🔄 7. Documents

**Location:** `frontend/app/components/dialogs/DocumentsDialog.tsx`

**Expected Fields:**
- `patient`
- `file_name`
- `original_name`
- `file_size`
- `mime_type`
- `category`
- `description`
- `tags`
- `s3_key`
- `s3_bucket`

**Status:** ⏳ **PENDING ANALYSIS**

---

### 🔄 8. Images

**Location:** `frontend/app/components/dialogs/ImagesDialog.tsx`

**Expected Fields:**
- Batch information
- Image metadata
- S3 keys
- Thumbnails

**Status:** ⏳ **PENDING ANALYSIS**

---

### 🔄 9. Patient Letters

**Location:** `frontend/app/components/dialogs/PatientLettersDialog.tsx`

**Expected Fields:**
- `patient`
- `letter_type`
- `recipient_name`
- `subject`
- `pages` (JSON array of HTML)

**Status:** ⏳ **PENDING ANALYSIS**

---

### 🔄 10. SMS Messages

**Location:** `frontend/app/components/dialogs/SMSDialog.tsx`

**Expected Fields:**
- `patient`
- `phone_number`
- `message`
- `status`

**Status:** ⏳ **PENDING ANALYSIS**

---

### 🔄 11. Settings - Funding Sources

**Location:** `frontend/app/components/settings/FundingSourcesSettings.tsx`

**Expected Fields:**
- `name`
- `code`
- `active`
- `order`

**Status:** ⏳ **PENDING ANALYSIS**

---

### 🔄 12. Settings - Clinics

**Location:** `frontend/app/components/settings/ClinicsSettings.tsx`

**Expected Fields:**
- `name`
- `abn`
- `phone`
- `email`
- `address_json`
- `color`
- `sms_reminder_template`
- `sms_reminders_enabled`

**Status:** ⏳ **PENDING ANALYSIS**

---

### 🔄 13. Settings - User Profiles

**Location:** `frontend/app/components/settings/UserProfiles.tsx`

**Expected Fields:**
- `full_name`
- `credential`
- `email`
- `phone`
- `role`
- `registration_number`
- `professional_body_url`
- `signature_image`
- `signature_html`

**Status:** ⏳ **PENDING ANALYSIS**

---

### 🔄 14. Xero Integration Forms

**Location:** Various Xero components

**Expected Areas:**
- Invoice creation
- Quote creation
- Payment processing
- Contact syncing

**Status:** ⏳ **PENDING ANALYSIS**

---

## Issues Found

### Critical Issues
*(None identified yet)*

### Major Issues
*(None identified yet)*

### Minor Issues
*(None identified yet)*

---

## Fixes Applied

*(None applied yet)*

---

## Next Steps

1. ⏳ Complete analysis of Communication/Contact fields
2. ⏳ Complete analysis of Plan Dates saving
3. ⏳ Complete analysis of Coordinators/Referrers saving
4. ⏳ Complete analysis of all dialog components
5. ⏳ Complete analysis of Settings forms
6. ⏳ Verify all backend serializers match their models
7. ⏳ Generate final comprehensive report

---

## User Feedback Request

**To help prioritize this analysis, please specify:**

1. Which specific fields are not saving?
2. Which forms/dialogs are affected?
3. Are there specific areas of concern (e.g., patient demographics, communications, clinical notes)?
4. Have you noticed any error messages when attempting to save?

**Examples:**
- "Patient phone numbers aren't saving"
- "Plan dates dialog doesn't persist changes"
- "Clinician credentials in User Profiles aren't being stored"

This information will help me focus the analysis on the most critical areas first.

---

**Report Status:** INCOMPLETE - Awaiting user feedback to prioritize analysis

