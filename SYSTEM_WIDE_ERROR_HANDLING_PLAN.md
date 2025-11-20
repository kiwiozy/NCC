# 🔧 SYSTEM-WIDE API ERROR HANDLING - IMPLEMENTATION PLAN

**Date:** November 20, 2025  
**Status:** 🚧 **IN PROGRESS**  
**Goal:** Add comprehensive error handling to ALL 85 API calls

---

## 📊 AUDIT RESULTS

### Total API Calls Found: **85**
- **Files with API calls:** 35
- **Methods:** PATCH, POST, PUT, DELETE

---

## 🎯 NEW ERROR HANDLING UTILITY

**Created:** `frontend/app/utils/apiErrorHandler.ts`

### Features:
- ✅ **Detailed console logging** with grouped output
- ✅ **Automatic error diagnosis** (404, 403, 400, 500, network errors)
- ✅ **User-friendly notifications**
- ✅ **Helper functions** for PATCH, POST, PUT, DELETE
- ✅ **Comprehensive troubleshooting hints**

### Usage Example:

**Before (Old Way):**
```typescript
try {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    credentials: 'include',
    body: JSON.stringify({ field: value }),
  });
  
  if (response.ok) {
    notifications.show({ message: 'Saved', color: 'green' });
  } else {
    throw new Error('Failed');
  }
} catch (error) {
  notifications.show({ message: 'Error', color: 'red' });
}
```

**After (New Way):**
```typescript
import { patchRequest } from '../utils/apiErrorHandler';
import { getCsrfToken } from '../utils/csrf';

const csrfToken = await getCsrfToken();
const result = await patchRequest(
  url,
  { field: value },
  {
    fieldName: 'Title',
    csrfToken,
    successMessage: 'Title saved',
  }
);

if (result.success) {
  // Update cache, etc.
}
```

---

## 📋 FILES TO UPDATE (Priority Order)

### 🔴 **CRITICAL** - Patient Data (19 calls)
**File:** `frontend/app/patients/page.tsx`

**Fields to update:**
1. ✅ Title (line ~1377) - UPDATED with detailed logging
2. ⚠️ First Name (line ~1425) - Needs apiErrorHandler
3. ⚠️ Middle Name (line ~1470) - Needs apiErrorHandler
4. ⚠️ Last Name (line ~1515) - Needs apiErrorHandler
5. ⚠️ Date of Birth (line ~1560) - Needs apiErrorHandler
6. ⚠️ Health Number (line ~1488) - Needs apiErrorHandler
7. ⚠️ Clinic (line ~1541) - Needs apiErrorHandler
8. ⚠️ Funding Source (line ~1585) - Needs apiErrorHandler
9. ⚠️ Plan Dates - Add (modal)
10. ⚠️ Plan Dates - Edit (modal)
11. ⚠️ Plan Dates - Delete (modal)
12. ⚠️ Coordinator - Add (modal)
13. ⚠️ Coordinator - Delete (modal)
14. ⚠️ Communication - Save (modal)
15. ⚠️ Communication - Delete (modal)
16. ⚠️ Note (line ~2387) - Needs apiErrorHandler
17. ⚠️ Archive patient
18. ⚠️ Restore patient
19. ⚠️ Reminder - Create (modal)

### 🟠 **HIGH** - Dialogs (16 calls)
**Files:**
- `frontend/app/components/dialogs/NotesDialog.tsx` (3 calls)
- `frontend/app/components/dialogs/DocumentsDialog.tsx` (1 call)
- `frontend/app/components/dialogs/ImagesDialog.tsx` (3 calls)
- `frontend/app/components/dialogs/PatientLettersDialog.tsx` (6 calls)
- `frontend/app/components/dialogs/SMSDialog.tsx` (2 calls)

### 🟡 **MEDIUM** - Settings (17 calls)
**Files:**
- `frontend/app/components/settings/FundingSourcesSettings.tsx` (2 calls)
- `frontend/app/components/settings/ClinicsSettings.tsx` (needs check)
- `frontend/app/components/settings/CompanySettings.tsx` (1 call)
- `frontend/app/components/settings/GmailIntegration.tsx` (4 calls)
- `frontend/app/components/settings/XeroIntegration.tsx` (4 calls)
- `frontend/app/components/settings/SMSIntegration.tsx` (1 call)
- `frontend/app/components/settings/S3Integration.tsx` (1 call)
- `frontend/app/components/settings/ATReport.tsx` (3 calls)
- `frontend/app/components/settings/EmailTemplateManager.tsx` (4 calls)
- `frontend/app/components/settings/UserProfiles.tsx` (1 call)
- `frontend/app/components/settings/DataManagementSettings.tsx` (2 calls)

### 🟢 **LOW** - Other Components (33 calls)
**Files:**
- `frontend/app/components/ClinicCalendar.tsx` (2 calls)
- `frontend/app/components/xero/*` (10+ calls)
- `frontend/app/xero/*` (5+ calls)
- `frontend/app/letters/LetterEditor.tsx` (2 calls)

---

## 🚀 IMPLEMENTATION STRATEGY

### Phase 1: Critical (TODAY) ✅
1. ✅ Create `apiErrorHandler.ts` utility
2. ✅ Update Title field with detailed logging
3. ⏳ Update all remaining patient page fields

### Phase 2: High Priority (Next)
1. Update all dialog API calls
2. Test each dialog thoroughly

### Phase 3: Medium Priority
1. Update all settings forms
2. Test settings

### Phase 4: Low Priority
1. Update calendar and Xero components
2. Final testing

---

## 📝 UPDATE TEMPLATE

For each field, replace the old error handling with:

```typescript
import { patchRequest } from '../utils/apiErrorHandler';
import { getCsrfToken } from '../utils/csrf';

// In your save handler:
const csrfToken = await getCsrfToken();
const result = await patchRequest(
  `https://localhost:8000/api/patients/${selectedContact.id}/`,
  { field_name: newValue },
  {
    fieldName: 'Field Display Name',
    csrfToken,
    successMessage: 'Field saved successfully',
  }
);

if (result.success) {
  // Update caches
  await updatePatientCaches(selectedContact.id, 'field_name', newValue, archived);
}
```

---

## 🎯 EXPECTED BENEFITS

### Better Debugging
- **Console logs** show exact URL, method, body, response
- **Error diagnosis** tells you what's wrong (Django not running, wrong ID, etc.)
- **Grouped logging** keeps console organized

### Better UX
- **Specific error messages** instead of generic "Failed to save"
- **Actionable hints** (e.g., "Is Django running?")
- **Consistent notifications** across all forms

### Easier Maintenance
- **Single source of truth** for error handling
- **Easy to update** error messages globally
- **Consistent patterns** across codebase

---

## 🔍 ERROR TYPES HANDLED

### 1. **404 Not Found**
**Diagnosis:**
- Django server not running ⭐
- Invalid patient/resource ID
- URL routing issue
- Endpoint not registered

### 2. **403 Forbidden**
**Diagnosis:**
- CSRF token missing/invalid
- User not authenticated
- Insufficient permissions

### 3. **400 Bad Request**
**Diagnosis:**
- Invalid data format
- Missing required fields
- Validation error

### 4. **500 Server Error**
**Diagnosis:**
- Backend exception
- Database error
- Check Django logs

### 5. **Network Error (no status)**
**Diagnosis:**
- Django server not running
- HTTPS certificate not accepted
- CORS issue
- Network problem

---

## 📊 PROGRESS TRACKING

### Phase 1: Patients Page (19 calls)
- [x] Title - DONE
- [ ] First Name
- [ ] Middle Name
- [ ] Last Name  
- [ ] Date of Birth
- [ ] Health Number
- [ ] Clinic
- [ ] Funding Source
- [ ] Plan Dates (3 operations)
- [ ] Coordinators (2 operations)
- [ ] Communication (2 operations)
- [ ] Note
- [ ] Archive/Restore (2 operations)
- [ ] Reminder

**Progress:** 1/19 (5%)

### Phase 2: Dialogs (16 calls)
**Progress:** 0/16 (0%)

### Phase 3: Settings (17 calls)
**Progress:** 0/17 (0%)

### Phase 4: Other (33 calls)
**Progress:** 0/33 (0%)

**TOTAL PROGRESS:** 1/85 (1%)

---

## 🎯 NEXT ACTIONS

1. **Immediate:** Update all patient page fields (remaining 18)
2. **Then:** Update all dialogs
3. **Then:** Update all settings
4. **Finally:** Update other components

---

## ✅ WHEN COMPLETE

All 85 API calls will have:
- ✅ Detailed console logging
- ✅ Automatic error diagnosis  
- ✅ User-friendly error messages
- ✅ Consistent patterns
- ✅ Easy debugging

**This will solve the 404 error and ALL future API errors!**

---

**Status:** Ready to implement across entire system  
**Estimated Time:** 2-3 hours for all 85 calls  
**Priority:** HIGH - Prevents data loss and improves debugging

