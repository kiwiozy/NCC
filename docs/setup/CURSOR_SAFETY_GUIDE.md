# 🤖 Cursor AI Safety Guide

**Quick reference for working safely with Cursor on a large codebase**

---

## ⚡ **Quick Tips**

### ✅ **DO:**
- Be **specific** about which files to modify
- Use **file paths** in your requests
- Create **new files** for new features
- Use **Git branches** for all changes
- Test **before and after** changes

### ❌ **DON'T:**
- Ask vague questions like "fix the email system"
- Let Cursor modify multiple files at once
- Skip testing after changes
- Modify protected files without review

---

## 🎯 **Safe Request Patterns**

### **Pattern 1: New Feature**
```
"Create a new file: frontend/app/components/patients/PatientSearch.tsx
for searching patients. Use the existing PatientCard component 
as a reference, but DO NOT modify PatientCard.tsx"
```

### **Pattern 2: Bug Fix (Specific)**
```
"Fix the button styling in 
frontend/app/components/settings/GmailIntegration.tsx 
line 145. The button should be blue, not gray. 
DO NOT modify any other files or the OAuth logic."
```

### **Pattern 3: Add Functionality**
```
"Add a new function to 
backend/patients/utils.py called get_patient_summary() 
that returns a summary string. 
DO NOT modify any existing functions in that file."
```

### **Pattern 4: Update Documentation**
```
"Update docs/Email/README.md to add information about 
the new email template feature. 
DO NOT modify any code files."
```

---

## 🚨 **Dangerous Request Patterns**

### **❌ Too Vague**
```
"Fix the email system"
→ Too broad! What specifically?

"Improve the calendar"
→ Which part? What needs improving?
```

### **❌ Multiple Files**
```
"Update all the integration files"
→ Too risky! Be specific.

"Fix errors in the backend"
→ Which errors? Which files?
```

### **❌ Protected Files**
```
"Refactor the Gmail integration"
→ Protected! Use caution.

"Update the Xero service"
→ Protected! Test thoroughly.
```

---

## 📋 **Before Making Changes**

### **Checklist:**
- [ ] Is this a protected file? (See `.cursorignore`)
- [ ] Am I on a Git branch?
- [ ] Have I tested the current functionality?
- [ ] Do I have a backup/commit?
- [ ] Am I being specific about what to change?

---

## 🔄 **Safe Workflow**

### **Step 1: Create Branch**
```bash
git checkout -b feature/my-new-feature
```

### **Step 2: Make Specific Request**
```
"Add patient search to PatientList.tsx. 
Search by name only. 
DO NOT modify PatientCard or PatientForm components."
```

### **Step 3: Review Changes**
```bash
git diff
# Review what changed
```

### **Step 4: Test**
```bash
# Run tests
npm test
python manage.py test

# Manual testing
# Test the specific feature you changed
```

### **Step 5: Commit**
```bash
git add .
git commit -m "feat: add patient search to PatientList"
```

### **Step 6: Push**
```bash
git push origin feature/my-new-feature
```

---

## 🛡️ **Protected Files Reference**

### **Backend Protected:**
- `backend/gmail_integration/services.py`
- `backend/xero_integration/services.py`
- `backend/sms_integration/services.py`
- `backend/documents/services.py`
- `backend/ai_services/services.py`
- `backend/patients/models.py`
- `backend/appointments/models.py`
- `backend/ncc_api/settings.py`

### **Frontend Protected:**
- `frontend/app/components/settings/GmailIntegration.tsx`
- `frontend/app/components/settings/XeroIntegration.tsx`
- `frontend/app/components/settings/SMSIntegration.tsx`
- `frontend/app/components/settings/S3Integration.tsx`
- `frontend/app/components/Navigation.tsx`
- `frontend/app/components/ClinicCalendar.tsx`

---

## 💡 **Pro Tips**

### **1. Use Comments to Guide AI**
```typescript
// TODO: Add patient search here
// DO NOT modify the PatientCard component below
// This is a working integration - handle with care
```

### **2. Break Down Large Requests**
Instead of:
```
"Add patient management with search, filtering, and export"
```

Break it down:
```
1. "Add patient search functionality"
2. "Add patient filtering"
3. "Add patient export"
```

### **3. Use File Paths Always**
```
✅ "Modify frontend/app/components/patients/PatientList.tsx"
❌ "Modify the patient list component"
```

### **4. Specify What NOT to Change**
```
"Add validation to the patient form.
DO NOT modify:
- GmailIntegration.tsx
- XeroIntegration.tsx
- Navigation.tsx"
```

---

## 🆘 **Emergency Recovery**

### **If Cursor Made Unwanted Changes:**

1. **Check Git Status**
```bash
git status
```

2. **See What Changed**
```bash
git diff
```

3. **Discard Changes**
```bash
git checkout -- <file>
```

4. **Or Revert Entire Branch**
```bash
git reset --hard HEAD
```

---

## 📚 **More Resources**

- **Full Strategy:** `docs/setup/CODE_ORGANIZATION_STRATEGY.md`
- **Protected Files:** `.cursorignore`
- **Git Workflow:** See Git documentation
- **Testing Guide:** `docs/backend/QUICK_START.md`

---

**Remember:** When in doubt, create a new file or branch first!

