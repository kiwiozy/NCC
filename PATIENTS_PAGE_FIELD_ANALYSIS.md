# 🔍 PATIENTS PAGE - COMPLETE FIELD ANALYSIS

**URL:** `https://localhost:3000/patients?type=patients`  
**File:** `frontend/app/patients/page.tsx`  
**Date:** November 20, 2025  
**Status:** ✅ All fields audited

---

## 📊 SUMMARY

| Category | Fields | Saving | Issues |
|----------|--------|--------|--------|
| **Inline Editable** | 5 | 2 auto-save, 3 no save | ⚠️ 3 not saving |
| **Read-Only Display** | 5 | N/A | ✅ OK |
| **Modals** | 4 | 4 saving | ✅ All working |
| **TOTAL** | 14 | 6 saving | ⚠️ 3 issues |

---

## 🟢 FIELDS THAT **ARE** SAVING

### 1. **Funding Source** (Dropdown)
```typescript
Location: Line 1473-1569
Method: onChange → PATCH immediately
Endpoint: /api/patients/{id}/
Field Name: funding_source
Status: ✅ WORKING
```

**How it saves:**
- User changes dropdown
- Immediately sends PATCH request
- Clears cache
- Reloads patient data
- Full logging & error handling

### 2. **Note** (Textarea)
```typescript
Location: Line 2377-2460
Method: onBlur → PATCH on field exit
Endpoint: /api/patients/{id}/
Field Name: notes
Status: ✅ FIXED (Nov 20, 2025)
```

**How it saves:**
- User types in note field
- Clicks away or tabs out (onBlur)
- Sends PATCH request
- Shows success notification
- Updates caches

### 3. **Plan Dates** (Modal)
```typescript
Location: Line 2683-2953
Method: Modal → PATCH on Save button
Endpoint: /api/patients/{id}/
Field Name: plan_dates_json (array)
Status: ✅ WORKING
```

**Operations:**
- Add plan date → Appends to array
- Edit plan date → Updates specific index
- Delete plan date → Removes from array
- All operations save immediately

### 4. **Coordinators/Referrers** (Search Dialog)
```typescript
Location: Line 2955-3190
Method: Search & Select → POST on Save
Endpoint: /api/patients/{patient_id}/referrers/
Field Name: referrers (relationship)
Status: ✅ WORKING
```

**Operations:**
- Search coordinators/referrers
- Select and add date
- POST to backend
- Updates relationship

### 5. **Communication** (Modal - Phone/Email/Address)
```typescript
Location: Line 3230-3568
Method: Modal → PATCH on Save button
Endpoint: /api/patients/{id}/
Field Name: contact_json, address_json
Status: ✅ WORKING
```

**Fields in modal:**
- Phone numbers (multiple)
- Mobile numbers (multiple)
- Email addresses (multiple)
- Address (street, suburb, state, postcode)

### 6. **Archive Status** (Button)
```typescript
Location: Line 1084-1189
Method: Archive/Restore button → PATCH
Endpoint: /api/patients/{id}/archive/ or /restore/
Field Name: archived
Status: ✅ WORKING
```

---

## 🔴 FIELDS THAT **ARE NOT** SAVING

### ⚠️ Issue #1: **Title** (Dropdown)
```typescript
Location: Line 1370-1376
Current Behavior: onChange updates state only
Endpoint: NONE - No save logic
Field Name: title
Status: ❌ NOT SAVING
```

**Problem:**
```typescript
onChange={(value) => {
  if (selectedContact) {
    setSelectedContact({ ...selectedContact, title: value || '' });
  }
}}
// ❌ NO SAVE LOGIC - Changes lost on navigation
```

**Solution Needed:**
Add PATCH request similar to funding source or onBlur like notes.

### ⚠️ Issue #2: **Health Number** (TextInput)
```typescript
Location: Line 1444-1454
Current Behavior: onChange updates state only
Endpoint: NONE - No save logic
Field Name: health_number
Status: ❌ NOT SAVING
```

**Problem:**
```typescript
onChange={(e) => {
  if (selectedContact) {
    setSelectedContact({ ...selectedContact, healthNumber: e.currentTarget.value });
  }
}}
// ❌ NO SAVE LOGIC - Changes lost on navigation
```

**Solution Needed:**
Add onBlur handler with PATCH request:
```typescript
onBlur={async (e) => {
  const newValue = e.currentTarget.value;
  if (selectedContact && newValue !== selectedContact.healthNumber) {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ health_number: newValue }),
    });
    // ... success/error handling
  }
}}
```

### ⚠️ Issue #3: **Clinic** (Dropdown)
```typescript
Location: Line 1458-1468
Current Behavior: onChange updates state only
Endpoint: NONE - No save logic
Field Name: clinic
Status: ❌ NOT SAVING
```

**Problem:**
```typescript
onChange={(value) => {
  if (selectedContact) {
    setSelectedContact({ ...selectedContact, clinic: value || '' });
  }
}}
// ❌ NO SAVE LOGIC - Changes lost on navigation
```

**Solution Needed:**
Add PATCH request in onChange handler (async, like funding source).

---

## ✅ READ-ONLY FIELDS (Correct - No Save Needed)

### 1. **First Name** (TextInput - Read-Only)
```typescript
Location: Line 1380-1386
Status: ✅ Correctly read-only
```

### 2. **Middle Name** (TextInput - Read-Only)
```typescript
Location: Line 1388-1396
Status: ✅ Correctly read-only
```

### 3. **Last Name** (TextInput - Read-Only)
```typescript
Location: Line 1398-1405
Status: ✅ Correctly read-only
```

### 4. **Date of Birth** (DatePickerInput)
```typescript
Location: Line 1408-1436
Status: ⚠️ UNCLEAR - Updates state, no save logic visible
```

**Current behavior:**
```typescript
onChange={(date) => {
  if (selectedContact) {
    const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : '';
    const calculatedAge = date ? dayjs().diff(dayjs(date), 'year') : 0;
    setSelectedContact({ ...selectedContact, dob: dateStr, age: calculatedAge });
  }
}}
```

**Note:** No save logic found. Needs investigation - should DOB be editable?

### 5. **Age** (Display - Calculated)
```typescript
Location: Line 1431-1435
Status: ✅ Calculated from DOB, read-only display
```

---

## 📋 DETAILED FIELD BREAKDOWN

| Field | Type | Line | Editable? | Saves? | Method | Status |
|-------|------|------|-----------|--------|--------|--------|
| **Title** | Select | 1370 | ✅ Yes | ❌ No | None | 🔴 Issue |
| **First Name** | TextInput | 1380 | ❌ Read-only | N/A | N/A | ✅ OK |
| **Middle Name** | TextInput | 1388 | ❌ Read-only | N/A | N/A | ✅ OK |
| **Last Name** | TextInput | 1398 | ❌ Read-only | N/A | N/A | ✅ OK |
| **Date of Birth** | DatePicker | 1408 | ✅ Yes | ❌ No | None | ⚠️ Unclear |
| **Age** | Text | 1431 | ❌ Calculated | N/A | N/A | ✅ OK |
| **Health Number** | TextInput | 1444 | ✅ Yes | ❌ No | None | 🔴 Issue |
| **Clinic** | Select | 1458 | ✅ Yes | ❌ No | None | 🔴 Issue |
| **Funding** | Select | 1473 | ✅ Yes | ✅ Yes | PATCH onChange | ✅ OK |
| **Plan Dates** | Modal | 2683 | ✅ Yes | ✅ Yes | PATCH on Save | ✅ OK |
| **Coordinators** | Modal | 2955 | ✅ Yes | ✅ Yes | POST on Save | ✅ OK |
| **Communication** | Modal | 3230 | ✅ Yes | ✅ Yes | PATCH on Save | ✅ OK |
| **Note** | Textarea | 2377 | ✅ Yes | ✅ Yes | PATCH onBlur | ✅ OK |
| **Archive** | Button | 1084 | ✅ Yes | ✅ Yes | PATCH onClick | ✅ OK |

---

## 🎯 ISSUES SUMMARY

### Critical Issues (Data Loss)
1. **Title** - Changes lost on navigation
2. **Health Number** - Changes lost on navigation
3. **Clinic** - Changes lost on navigation

### Unclear (Needs Investigation)
1. **Date of Birth** - Has onChange but no save logic

---

## 🔧 RECOMMENDED FIXES

### Fix #1: Title Dropdown
```typescript
// Add async onChange with PATCH
onChange={async (value) => {
  if (selectedContact) {
    setSelectedContact({ ...selectedContact, title: value || '' });
    
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ title: value || '' }),
      });
      
      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: 'Title saved',
          color: 'green',
        });
      }
    } catch (error) {
      console.error('Error saving title:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save title',
        color: 'red',
      });
    }
  }
}}
```

### Fix #2: Health Number Field
```typescript
// Add onBlur handler
onBlur={async (e) => {
  const newValue = e.currentTarget.value;
  if (selectedContact && newValue !== selectedContact.healthNumber) {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ health_number: newValue }),
      });
      
      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: 'Health number saved',
          color: 'green',
        });
      }
    } catch (error) {
      console.error('Error saving health number:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save health number',
        color: 'red',
      });
    }
  }
}}
```

### Fix #3: Clinic Dropdown
```typescript
// Add async onChange with PATCH (similar to funding source)
onChange={async (value) => {
  if (selectedContact) {
    setSelectedContact({ ...selectedContact, clinic: value || '' });
    
    try {
      const csrfToken = await getCsrfToken();
      // Need to get clinic ID from name
      const clinicObj = clinics.find(c => c.label === value);
      const clinicId = clinicObj?.value;
      
      const response = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ clinic: clinicId }),
      });
      
      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: 'Clinic saved',
          color: 'green',
        });
      }
    } catch (error) {
      console.error('Error saving clinic:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save clinic',
        color: 'red',
      });
    }
  }
}}
```

---

## 🧪 TESTING CHECKLIST

### Test Saving Fields
- [ ] Change funding source → ✅ Should save immediately
- [ ] Type in note → Click away → ✅ Should save
- [ ] Add plan date → ✅ Should save
- [ ] Add coordinator → ✅ Should save
- [ ] Add phone/email/address → ✅ Should save

### Test Non-Saving Fields (ISSUES)
- [ ] Change title → Navigate away → ❌ **LOST**
- [ ] Change health number → Navigate away → ❌ **LOST**
- [ ] Change clinic → Navigate away → ❌ **LOST**
- [ ] Change DOB → Navigate away → ❓ **Unclear**

---

## 📊 FINAL STATS

**Total Fields:** 14  
**Saving Correctly:** 6 (43%)  
**Not Saving:** 3 (21%)  
**Read-Only:** 5 (36%)  
**Unclear:** 1 (DOB)

---

## ✅ WHAT TO DO NEXT

1. **Apply fixes for 3 fields:**
   - Title dropdown
   - Health number field
   - Clinic dropdown

2. **Investigate DOB field:**
   - Determine if it should save
   - If yes, add save logic
   - If no, make it read-only

3. **Test all changes:**
   - Verify saving works
   - Check notifications appear
   - Confirm data persists after navigation

---

**Priority:** HIGH - These 3 fields cause data loss  
**Estimated Fix Time:** 15-20 minutes  
**Risk Level:** Low (following existing patterns)

