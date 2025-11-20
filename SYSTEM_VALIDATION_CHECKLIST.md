# 🔍 SYSTEM-WIDE VALIDATION CHECKLIST

**Purpose:** Find ALL backend/frontend mismatches like the Title field issue  
**Date:** November 20, 2025  
**Status:** Ready to use

---

## 🎯 TWO APPROACHES

### Approach 1: Automated Script ⭐ RECOMMENDED
**File:** `scripts/validate_system.py`

### Approach 2: Manual Checklist
**File:** This document

---

## 🤖 AUTOMATED VALIDATION (Quick & Comprehensive)

### Step 1: Run the Validation Script

```bash
cd /Users/craig/Documents/nexus-core-clinic
python3 scripts/validate_system.py
```

### What It Checks:
✅ **All Django models** for choice fields  
✅ **All frontend dropdowns** for value/label mismatches  
✅ **All API calls** for error handling  
✅ **String arrays** vs object arrays  
✅ **Potential value mismatches** (periods, cases, etc.)

### Output:
- Console report with color-coded issues
- JSON report: `validation_report.json`
- Issue severity (HIGH, MEDIUM, LOW)

---

## 📋 MANUAL VALIDATION CHECKLIST

If you prefer to check manually, follow this comprehensive checklist:

---

## 1️⃣ PATIENT MODEL FIELDS

### ✅ Title Field - FIXED
**Backend:** `backend/patients/models.py:74-87`
- Valid values: `'Mr'`, `'Mrs'`, `'Ms'`, `'Miss'`, `'Dr'`, `'Prof'`

**Frontend:** `frontend/app/patients/page.tsx:~1352`
- ✅ Fixed to use `{ value: 'Mr', label: 'Mr.' }`

### 🔍 Sex Field
**Backend:** `backend/patients/models.py:60-71`
```python
choices=[
    ('M', 'Male'),
    ('F', 'Female'),
    ('O', 'Other'),
    ('U', 'Unknown'),
]
```

**Check Frontend:**
- [ ] Does sex dropdown send 'M', 'F', 'O', 'U'?
- [ ] Or does it send 'Male', 'Female', 'Other', 'Unknown'?

### 🔍 Funding Source Field
**Backend:** `backend/patients/models.py:98-113`
```python
choices=[
    ('NDIS', 'NDIS'),
    ('DVA', 'DVA'),
    ('ENABLE', 'Enable'),
    ('BUPA', 'BUPA'),
    ('MEDIBANK', 'Medibank'),
    ('AHM', 'AHM'),
    ('PRIVATE', 'Private/Self-Funded'),
    ('OTHER', 'Other'),
]
```

**Check Frontend:** `frontend/app/patients/page.tsx:~1581`
- [ ] Does funding dropdown send correct values?
- [ ] Are labels matching or different from values?

---

## 2️⃣ APPOINTMENT MODEL FIELDS

### 🔍 Status Field
**Backend:** Check `backend/appointments/models.py`

**Check:**
- [ ] What are valid status choices?
- [ ] Does frontend match exactly?

### 🔍 Appointment Type
**Backend:** Check `backend/appointments/models.py`

**Check:**
- [ ] What are valid appointment types?
- [ ] Does calendar dropdown match?

---

## 3️⃣ REFERRER/COORDINATOR FIELDS

### 🔍 Specialty Field
**Backend:** Check `backend/referrers/models.py`

**Check:**
- [ ] Are there specialty choices?
- [ ] Does frontend match?

---

## 4️⃣ DOCUMENT CATEGORIES

### 🔍 Document Category Field
**Backend:** Check `backend/documents/models.py`

**Check:**
- [ ] What are valid document categories?
- [ ] Does DocumentsDialog match exactly?

---

## 5️⃣ IMAGE CATEGORIES

### 🔍 Image Category Field
**Backend:** Check `backend/images/models.py`

**Check:**
- [ ] What are valid image categories?
- [ ] Does ImagesDialog match exactly?

---

## 6️⃣ NOTE TYPES

### 🔍 Note Type Field
**Backend:** Check `backend/notes/models.py`

**Check:**
- [ ] What are valid note types?
- [ ] Does NotesDialog match exactly?

---

## 7️⃣ LETTER TYPES

### 🔍 Letter Type Field
**Backend:** Check `backend/letters/models.py`

**Check:**
- [ ] What are valid letter types?
- [ ] Does PatientLettersDialog match exactly?

---

## 🔍 HOW TO CHECK EACH FIELD

### For Each Model Field with Choices:

1. **Find Backend Choices:**
```bash
# Search for the field in models.py
grep -A 10 "field_name = models" backend/app_name/models.py
```

2. **Find Frontend Usage:**
```bash
# Search for the field in frontend
grep -r "field_name" frontend/
```

3. **Compare Values:**
- Backend value (first item in tuple): `'VALUE'`
- Frontend should send: `'VALUE'` (exact match)
- Frontend can display: `'Display Text'` (different)

4. **Check Pattern:**

**❌ BAD (String Array):**
```typescript
data={['Value 1', 'Value 2', 'Value 3']}
```

**✅ GOOD (Value/Label Objects):**
```typescript
data={[
    { value: 'VALUE1', label: 'Value 1' },
    { value: 'VALUE2', label: 'Value 2' },
    { value: 'VALUE3', label: 'Value 3' },
]}
```

---

## 🎯 COMMON MISMATCH PATTERNS

### Pattern 1: Period Mismatch
**Backend:** `'Mr'`  
**Frontend sends:** `'Mr.'` ❌  
**Fix:** Send `'Mr'`, display `'Mr.'`

### Pattern 2: Case Mismatch
**Backend:** `'NDIS'`  
**Frontend sends:** `'ndis'` ❌  
**Fix:** Send `'NDIS'`

### Pattern 3: Label as Value
**Backend:** `('PRIVATE', 'Private/Self-Funded')`  
**Frontend sends:** `'Private/Self-Funded'` ❌  
**Fix:** Send `'PRIVATE'`, display `'Private/Self-Funded'`

### Pattern 4: Extra Options
**Frontend:** Has 10 options  
**Backend:** Has 6 options  
**Result:** 4 options will fail with 400 ❌  
**Fix:** Only include backend-valid options

---

## 🚀 QUICK VALIDATION SCRIPT

Run this to find ALL choice fields in backend:

```bash
cd /Users/craig/Documents/nexus-core-clinic/backend

# Find all choice fields
find . -name "models.py" -not -path "*/migrations/*" -exec grep -H "choices=" {} \;

# More detailed:
find . -name "models.py" -not -path "*/migrations/*" -exec grep -B 2 -A 10 "choices=" {} \;
```

---

## 📊 MODELS TO CHECK (Priority Order)

### 🔴 CRITICAL
- [x] ✅ Patient.title - FIXED
- [ ] Patient.sex
- [ ] Patient.funding_source
- [ ] Appointment.status
- [ ] Document.category
- [ ] Image.category

### 🟡 HIGH
- [ ] Note.note_type
- [ ] Letter.letter_type
- [ ] Referrer.specialty
- [ ] Clinician fields (if any choices)

### 🟢 MEDIUM
- [ ] Any other models with choice fields
- [ ] Settings-related choices
- [ ] Xero-related choices

---

## ✅ VALIDATION CHECKLIST SUMMARY

### For EACH Model with Choices:

1. [ ] Identify backend choice values
2. [ ] Find frontend dropdown/select
3. [ ] Verify frontend sends VALUE not LABEL
4. [ ] Check for period/case mismatches
5. [ ] Ensure no extra invalid options
6. [ ] Test save operation
7. [ ] Verify no 400 errors

---

## 🎯 RECOMMENDED WORKFLOW

### Daily/Weekly Check:
```bash
# Run automated validator
python3 scripts/validate_system.py

# Review report
cat validation_report.json
```

### Before Deploy:
```bash
# Run full validation
python3 scripts/validate_system.py

# Fix any HIGH priority issues
# Test all dropdowns
# Deploy
```

### After Adding New Fields:
```bash
# Check if field has choices
# If yes, validate frontend immediately
python3 scripts/validate_system.py
```

---

## 📚 DOCUMENTATION

### Create Model Choice Reference:
Keep a document listing all choice fields:

```markdown
# Choice Fields Reference

## Patient Model
- title: Mr, Mrs, Ms, Miss, Dr, Prof
- sex: M, F, O, U
- funding_source: NDIS, DVA, ENABLE, BUPA, MEDIBANK, AHM, PRIVATE, OTHER

## Appointment Model
- status: [list values]

## Document Model
- category: [list values]
```

Update this whenever you add new choice fields.

---

## 🎉 WHEN COMPLETE

All choice fields will:
- ✅ Have matching frontend/backend values
- ✅ Send correct values (not display labels)
- ✅ No 400 errors
- ✅ Save successfully
- ✅ Have proper error handling

---

**Next Action:** Run `python3 scripts/validate_system.py` to find all mismatches automatically! 🚀

