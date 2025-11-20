# Auto-Save Bug Fixes - Complete Report

**Date:** November 20, 2025  
**Branch:** `loading-optimisation`  
**Status:** ✅ All fields fixed

---

## 🎯 Root Cause: Incomplete Implementation

**User Question:** *"When something in the front end across the whole system should always update the database, is that not correct?"*

**Answer:** **YES - Absolutely correct!**

This app uses the **auto-save pattern** - every field should save to the database immediately when changed. No "Save" button needed.

### The Problem:
Multiple fields were **only updating local React state** - they weren't saving to the database. This is a **bug**, not by design.

**Symptom:**
- User changes field (clinic, health number, etc.)
- Field shows new value in UI temporarily
- User refreshes browser
- Field reverts to old value (database was never updated)

---

## 🐛 Fields That Were Broken (Fixed)

### 1. **Title Dropdown** ❌ → ✅ FIXED
- **Line:** 1405-1409
- **Problem:** Only updated local state, no backend save
- **Fix:** Added full auto-save with smart cache update

### 2. **Health Number** ❌ → ✅ FIXED  
- **Line:** 1483-1489
- **Problem:** Only updated local state, no backend save
- **Fix:** Added `onBlur` handler with full auto-save

### 3. **Date of Birth** ❌ → ✅ FIXED
- **Line:** 1448-1455
- **Problem:** Only updated local state, no backend save
- **Fix:** Added full auto-save with smart cache update

### 4. **Clinic Dropdown** ❌ → ✅ FIXED
- **Line:** 1497-1501
- **Problem:** Only updated local state, no backend save
- **Fix:** Added full auto-save with smart cache update (user reported this)

### 5. **Funding Source** ✅ Already Working
- **Line:** 1530-1604
- **Status:** Was already implemented correctly
- **Pattern:** This is the reference implementation we copied for all other fields

---

## ✅ The Fix Pattern

Every editable field now follows this pattern:

```typescript
onChange={async (value) => {
  // 1. Update UI immediately (instant feedback)
  setSelectedContact({ ...selectedContact, field: value });
  
  // 2. Save to backend (persist to database)
  const response = await fetch(`/api/patients/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ field: value }),
  });
  
  // 3. Update caches intelligently (no full clear!)
  await updatePatientCaches(id, 'field', value, archived);
  
  // 4. Show success notification
  notifications.show({
    title: 'Success',
    message: 'Field updated',
    color: 'green',
  });
}
```

---

## 📊 Complete Field Audit

| Field | Type | Status | Saves to DB | Updates Cache |
|-------|------|--------|-------------|---------------|
| Title | Select | ✅ FIXED | Yes | Yes (smart) |
| First Name | TextInput | 🔒 Read-only | N/A | N/A |
| Middle Name | TextInput | 🔒 Read-only | N/A | N/A |
| Last Name | TextInput | 🔒 Read-only | N/A | N/A |
| Date of Birth | DatePicker | ✅ FIXED | Yes | Yes (smart) |
| Health Number | TextInput | ✅ FIXED | Yes | Yes (smart) |
| Clinic | Select | ✅ FIXED | Yes | Yes (smart) |
| Funding Source | Select | ✅ Working | Yes | Yes (smart) |

---

## 🔧 Implementation Details

### **Title Dropdown**
```typescript
onChange={async (value) => {
  setSelectedContact({ ...selectedContact, title: value || '' });
  
  await fetch(`/api/patients/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ title: value }),
  });
  
  await updatePatientCaches(id, 'title', value, archived);
  
  notifications.show({ message: 'Title updated', color: 'green' });
}}
```

### **Health Number** (Text Input)
```typescript
onBlur={async (e) => {
  const newValue = e.currentTarget.value;
  
  if (newValue !== selectedContact.healthNumber) {
    await fetch(`/api/patients/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ health_number: newValue }),
    });
    
    await updatePatientCaches(id, 'health_number', newValue, archived);
    
    notifications.show({ message: 'Health number updated', color: 'green' });
  }
}}
onChange={(e) => {
  setSelectedContact({ ...selectedContact, healthNumber: e.currentTarget.value });
}}
```

**Note:** Text inputs use `onBlur` (save when user leaves field) + `onChange` (update UI as they type)

### **Date of Birth**
```typescript
onChange={async (date) => {
  const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : '';
  const calculatedAge = date ? dayjs().diff(dayjs(date), 'year') : 0;
  
  setSelectedContact({ ...selectedContact, dob: dateStr, age: calculatedAge });
  
  await fetch(`/api/patients/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ dob: dateStr || null }),
  });
  
  await updatePatientCaches(id, 'dob', dateStr, archived);
  
  notifications.show({ message: 'Date of birth updated', color: 'green' });
}}
```

### **Clinic Dropdown**
```typescript
onChange={async (value) => {
  setSelectedContact({ ...selectedContact, clinic: value || '' });
  
  await fetch(`/api/patients/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ clinic: value }),
  });
  
  await updatePatientCaches(id, 'clinic', value, archived);
  
  notifications.show({ message: 'Clinic updated', color: 'green' });
}}
```

---

## 🎨 Smart Cache Updates

All fields now use the **smart update** strategy:

```typescript
// Fields that affect LIST display (shown in left sidebar)
const listFields = ['title', 'first_name', 'last_name', 'clinic', 'funding_source', 'dob'];

if (listFields.includes(field)) {
  // Update list cache immediately - user sees change in list
  await PatientListCache.updatePatient(id, { [field]: value }, archived);
} else {
  // Non-list field - mark patient as stale (refresh on demand)
  await PatientListCache.markAsStale(id, archived);
}

// Always update detail cache if it exists
await PatientDetailCache.updatePatient(id, { [field]: value });
```

**Benefit:** No more aggressive `PatientCache.clear()` calls that force 30-second reload!

---

## 🧪 Testing Checklist

### Test Each Fixed Field:

1. **✅ Title**
   - [ ] Change title from "Mrs." to "Mr."
   - [ ] Verify "Title updated" notification appears
   - [ ] Refresh browser
   - [ ] Verify title persists as "Mr."

2. **✅ Health Number**
   - [ ] Change health number to "TEST123"
   - [ ] Click away from field (triggers `onBlur`)
   - [ ] Verify "Health number updated" notification
   - [ ] Refresh browser
   - [ ] Verify health number persists as "TEST123"

3. **✅ Date of Birth**
   - [ ] Change date of birth
   - [ ] Verify "Date of birth updated" notification
   - [ ] Verify age updates automatically
   - [ ] Refresh browser
   - [ ] Verify DOB and age persist

4. **✅ Clinic**
   - [ ] Change clinic from "Narrabri" to "Gunnedah"
   - [ ] Verify "Clinic updated" notification
   - [ ] Verify list shows new clinic immediately
   - [ ] Refresh browser
   - [ ] Verify clinic persists as "Gunnedah"

5. **✅ Funding Source**
   - [ ] Change funding from "NDIS" to "Private"
   - [ ] Verify "Funding source updated" notification
   - [ ] Verify list shows new funding immediately
   - [ ] Refresh browser
   - [ ] Verify funding persists as "Private"

---

## 📝 Console Logging

Each field now logs its save operation:

```
🔄 CLINIC DROPDOWN CHANGED
  New value: "Gunnedah"
  Old value: "Narrabri"
  Patient ID: "18c0f51d-3487-4723-a86a-19354747ef9a"
  Patient Name: "Mrs. Phylis Brown"
  ✅ Updated selectedContact state
  📤 Sending PATCH request to backend...
  CSRF Token: Present
  Request body: {"clinic":"Gunnedah"}
  📥 Response status: 200 OK
  ✅ Save successful
  ✅ Updated list cache for clinic
  ✅ Caches updated intelligently
```

**Look for:** ✅ success indicators and green notifications

**Red flags:** ❌ errors or missing "Save successful" messages

---

## 🚀 Files Modified

1. **`frontend/app/patients/page.tsx`**
   - Fixed Title dropdown (added auto-save)
   - Fixed Health Number input (added auto-save with `onBlur`)
   - Fixed Date of Birth picker (added auto-save)
   - Fixed Clinic dropdown (added auto-save)
   - All fields now use `updatePatientCaches()` for smart updates

---

## ✅ Status Summary

- [x] Title - auto-save implemented
- [x] Health Number - auto-save implemented (onBlur)
- [x] Date of Birth - auto-save implemented
- [x] Clinic - auto-save implemented  
- [x] Funding Source - already working
- [ ] Browser testing (pending user approval)
- [ ] Git commit (pending user approval)

---

## 📋 Architecture Decision

**Why `onBlur` for text inputs?**

- **Dropdowns/Dates:** Use `onChange` (single interaction = save immediately)
- **Text inputs:** Use `onBlur` (save when user finishes typing, not on every keystroke)
- **Benefit:** Reduces API calls, better performance

**User types:** "H" → "E" → "L" → "L" → "O" (5 keystrokes)
- **With onChange:** 5 API calls
- **With onBlur:** 1 API call (when user clicks away)

---

**Next Step:** User tests all fields and confirms they persist after browser refresh! 🚀

