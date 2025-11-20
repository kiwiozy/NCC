# 📋 PATIENTS PAGE - READ-ONLY vs EDITABLE FIELDS

**URL:** `https://localhost:3000/patients?type=patients`  
**Date:** November 20, 2025

---

## ✅ READ-ONLY FIELDS (Cannot Edit - Correct Behavior)

### 1. **First Name**
```typescript
Location: Line 1412-1417
Attribute: readOnly
Reason: Core identity field - should not be changed casually
Status: ✅ Correct
```

### 2. **Middle Name**
```typescript
Location: Line 1420-1427
Attribute: readOnly
Reason: Core identity field - should not be changed casually
Status: ✅ Correct
```

### 3. **Last Name**
```typescript
Location: Line 1431-1436
Attribute: readOnly
Reason: Core identity field - should not be changed casually
Status: ✅ Correct
```

### 4. **Age**
```typescript
Location: Line 1431-1435 (display only)
Type: Calculated field
Reason: Automatically calculated from Date of Birth
Status: ✅ Correct
```

---

## ✏️ EDITABLE FIELDS (Can Edit - All Now Saving)

### 1. **Title** (Dropdown)
```typescript
Location: Line 1352-1407
Editable: ✅ Yes
Saves: ✅ Yes (auto-save on change)
Status: ✅ FIXED TODAY
```

### 2. **Date of Birth** (Date Picker)
```typescript
Location: Line 1440-1468
Editable: ✅ Yes
Saves: ⚠️ UNKNOWN - No save logic found
Status: ⚠️ NEEDS INVESTIGATION
```
**Note:** Has `onChange` that updates state, but no PATCH request visible. Need to check if DOB should be editable.

### 3. **Health Number** (Text Input)
```typescript
Location: Line 1479-1522
Editable: ✅ Yes
Saves: ✅ Yes (save on blur)
Status: ✅ FIXED TODAY
```

### 4. **Clinic** (Dropdown)
```typescript
Location: Line 1524-1579
Editable: ✅ Yes
Saves: ✅ Yes (auto-save on change)
Status: ✅ FIXED TODAY
```

### 5. **Funding Source** (Dropdown)
```typescript
Location: Line 1581-1655
Editable: ✅ Yes
Saves: ✅ Yes (auto-save on change)
Status: ✅ Working (already had save logic)
```

### 6. **Plan Dates** (Modal)
```typescript
Location: Multiple dates via modal
Editable: ✅ Yes
Saves: ✅ Yes (via modal Save button)
Status: ✅ Working
```

### 7. **Coordinators/Referrers** (Modal)
```typescript
Location: Search & add via modal
Editable: ✅ Yes
Saves: ✅ Yes (via modal Save button)
Status: ✅ Working
```

### 8. **Communication** (Modal - Phone/Email/Address)
```typescript
Location: Modal with multiple fields
Editable: ✅ Yes
Saves: ✅ Yes (via modal Save button)
Status: ✅ Working
```

### 9. **Note** (Textarea)
```typescript
Location: Line 2377-2460
Editable: ✅ Yes
Saves: ✅ Yes (save on blur)
Status: ✅ FIXED EARLIER TODAY
```

---

## 📊 SUMMARY TABLE

| Field | Read-Only? | Editable? | Saves? | Status |
|-------|-----------|-----------|--------|--------|
| **First Name** | ✅ Yes | ❌ No | N/A | ✅ Correct |
| **Middle Name** | ✅ Yes | ❌ No | N/A | ✅ Correct |
| **Last Name** | ✅ Yes | ❌ No | N/A | ✅ Correct |
| **Age** | ✅ Yes (Calculated) | ❌ No | N/A | ✅ Correct |
| **Title** | ❌ No | ✅ Yes | ✅ Yes | ✅ Fixed |
| **Date of Birth** | ❌ No | ✅ Yes | ⚠️ Unknown | ⚠️ Check |
| **Health Number** | ❌ No | ✅ Yes | ✅ Yes | ✅ Fixed |
| **Clinic** | ❌ No | ✅ Yes | ✅ Yes | ✅ Fixed |
| **Funding** | ❌ No | ✅ Yes | ✅ Yes | ✅ Working |
| **Plan Dates** | ❌ No | ✅ Yes | ✅ Yes | ✅ Working |
| **Coordinators** | ❌ No | ✅ Yes | ✅ Yes | ✅ Working |
| **Communication** | ❌ No | ✅ Yes | ✅ Yes | ✅ Working |
| **Note** | ❌ No | ✅ Yes | ✅ Yes | ✅ Fixed |

---

## ⚠️ ONE REMAINING QUESTION

### Date of Birth Field
```typescript
// Has this onChange:
onChange={(date) => {
  if (selectedContact) {
    const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : '';
    const calculatedAge = date ? dayjs().diff(dayjs(date), 'year') : 0;
    setSelectedContact({ ...selectedContact, dob: dateStr, age: calculatedAge });
  }
}}
```

**Question:** Should Date of Birth be editable?
- ✅ **If YES** → Need to add save logic (PATCH request)
- ✅ **If NO** → Should be marked as `readOnly` like name fields

**Current State:** 
- Has date picker (looks editable)
- Updates local state
- No save logic found
- Changes are LOST on navigation

**Recommendation:**
1. If DOB should be editable → Add save logic
2. If DOB should NOT be editable → Add `readOnly` attribute

---

## 🎯 ANSWER TO YOUR QUESTION

**"Are all these fields readonly?"**

**No** - Only 4 fields are read-only:
1. ✅ First Name
2. ✅ Middle Name  
3. ✅ Last Name
4. ✅ Age (calculated)

**All other fields are editable**, and as of today, **all editable fields are now saving correctly** (except possibly DOB which needs clarification).

---

## 💡 WHY ARE NAME FIELDS READ-ONLY?

The name fields (First, Middle, Last) are correctly set to read-only because:

1. **Identity Integrity** - Names are core identity fields that shouldn't change frequently
2. **Data Consistency** - Changing names affects historical records, appointments, documents
3. **Audit Trail** - Name changes should be tracked and deliberate
4. **Best Practice** - Most medical/clinical systems make name changes a deliberate admin action

**If you need to change a patient's name**, you would typically:
- Go through an admin interface
- Create a name change record
- Update all related records
- Maintain an audit trail

**Current behavior is correct** ✅

---

## ✅ CONCLUSION

- **Read-only fields:** 4 (correct)
- **Editable fields:** 9
- **Saving correctly:** 8 for sure
- **Unknown:** 1 (Date of Birth - needs decision)

**All editable fields that SHOULD save are now saving!** 🎉

