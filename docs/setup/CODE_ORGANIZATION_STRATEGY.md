# 🛡️ Code Organization & Protection Strategy

**How to keep your large codebase organized and prevent accidental overwrites**

---

## 🎯 **The Problem**

As your app grows, you need to:
- ✅ Keep working features safe from AI assistant changes
- ✅ Organize code so it's easy to find and modify
- ✅ Prevent Cursor chat from making sweeping changes
- ✅ Maintain clear boundaries between features
- ✅ Enable safe experimentation

---

## 📁 **1. File Organization Strategy**

### **Directory Structure Rules**

```
nexus-core-clinic/
├── backend/
│   ├── ncc_api/              # Core Django config (PROTECTED)
│   ├── patients/             # Patient module (STABLE)
│   ├── appointments/         # Appointment module (STABLE)
│   ├── clinicians/           # Clinician module (STABLE)
│   ├── gmail_integration/    # Gmail (WORKING - PROTECTED)
│   ├── xero_integration/    # Xero (WORKING - PROTECTED)
│   ├── sms_integration/     # SMS (WORKING - PROTECTED)
│   ├── documents/           # S3 (WORKING - PROTECTED)
│   └── ai_services/         # AI (WORKING - PROTECTED)
│
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── settings/     # Settings components (WORKING)
│   │   │   │   ├── GmailIntegration.tsx      # PROTECTED
│   │   │   │   ├── XeroIntegration.tsx       # PROTECTED
│   │   │   │   ├── SMSIntegration.tsx        # PROTECTED
│   │   │   │   ├── S3Integration.tsx          # PROTECTED
│   │   │   │   └── ATReport.tsx              # PROTECTED
│   │   │   └── Navigation.tsx                # PROTECTED
│   │   ├── calendar/        # Calendar (WORKING)
│   │   ├── settings/        # Settings pages (WORKING)
│   │   └── [other pages]    # New features
│   └── utils/               # Shared utilities
│
└── docs/
    ├── [feature]/           # Feature-specific docs
    └── setup/               # Setup guides
```

### **Protection Labels**

**Mark protected files with comments at the top:**

```python
# PROTECTED: Gmail Integration - DO NOT MODIFY
# This file is production-ready and working.
# Last tested: 2025-11-03
# Changes require: Manual review + testing
```

```typescript
/**
 * PROTECTED: Gmail Integration Component
 * Status: Production Ready ✅
 * Last tested: 2025-11-03
 * 
 * DO NOT MODIFY without:
 * 1. Testing email sending
 * 2. Verifying OAuth flow
 * 3. Checking multi-account support
 */
```

---

## 🔒 **2. Critical Files Protection List**

### **Backend - NEVER Modify Without Testing**

```
backend/
├── gmail_integration/
│   ├── services.py           # ⛔ CRITICAL - OAuth & email sending
│   ├── models.py             # ⛔ CRITICAL - Database schema
│   └── views.py              # ⛔ CRITICAL - API endpoints
│
├── xero_integration/
│   ├── services.py           # ⛔ CRITICAL - OAuth & sync logic
│   ├── models.py             # ⛔ CRITICAL - Database schema
│   └── views.py              # ⛔ CRITICAL - API endpoints
│
├── sms_integration/
│   ├── services.py           # ⛔ CRITICAL - SMS sending logic
│   └── models.py             # ⛔ CRITICAL - Database schema
│
├── documents/
│   ├── services.py           # ⛔ CRITICAL - S3 upload logic
│   └── models.py             # ⛔ CRITICAL - Document storage
│
├── ai_services/
│   ├── services.py           # ⛔ CRITICAL - OpenAI integration
│   └── pdf_generator.py      # ⛔ CRITICAL - PDF generation
│
├── ncc_api/
│   ├── settings.py           # ⛔ CRITICAL - Django configuration
│   └── urls.py               # ⛔ CRITICAL - URL routing
│
└── patients/models.py        # ⛔ CRITICAL - Core data model
└── appointments/models.py   # ⛔ CRITICAL - Core data model
```

### **Frontend - NEVER Modify Without Testing**

```
frontend/app/
├── components/
│   ├── Navigation.tsx         # ⛔ CRITICAL - Main navigation
│   └── settings/
│       ├── GmailIntegration.tsx      # ⛔ CRITICAL
│       ├── XeroIntegration.tsx        # ⛔ CRITICAL
│       ├── SMSIntegration.tsx         # ⛔ CRITICAL
│       ├── S3Integration.tsx          # ⛔ CRITICAL
│       └── ATReport.tsx              # ⛔ CRITICAL
│
├── components/ClinicCalendar.tsx      # ⛔ CRITICAL - Calendar
│
└── layout.tsx                # ⛔ CRITICAL - Root layout
```

---

## 🌿 **3. Git Branching Strategy**

### **Branch Naming Convention**

```bash
# Feature branches
feature/patient-search
feature/appointment-notes
feature/new-report

# Bug fixes
fix/calendar-timezone
fix/gmail-oauth-refresh

# Integration work
integration/new-sms-provider
integration/xero-payments

# Experimental (safe to break)
experiment/ai-summaries
experiment/new-ui-component
```

### **Protection Rules**

1. **Main Branch (`main` or `master`)**
   - ✅ Protected - requires PR review
   - ✅ Only merge working, tested code
   - ✅ Never push directly to main

2. **Working Feature Branches**
   - ✅ Create branch for each feature
   - ✅ Test thoroughly before merging
   - ✅ Keep branches small and focused

3. **Staging Branch (`staging`)**
   - ✅ Test integration before production
   - ✅ Safe place to experiment

### **Git Workflow Example**

```bash
# 1. Create feature branch
git checkout -b feature/new-patient-form

# 2. Make changes
# ... edit files ...

# 3. Commit frequently
git add .
git commit -m "feat: add patient form validation"

# 4. Test thoroughly
# ... run tests, manual testing ...

# 5. Push to remote
git push origin feature/new-patient-form

# 6. Create Pull Request (review before merge)
# 7. Merge after approval

# 8. Delete branch after merge
git branch -d feature/new-patient-form
```

---

## 🛡️ **4. Code Protection Mechanisms**

### **A. File-Level Protection Comments**

Add to top of protected files:

```python
"""
PROTECTED FILE - Gmail Integration Service
==========================================

STATUS: ✅ Production Ready
LAST TESTED: 2025-11-03
CRITICAL: OAuth2, email sending, token management

⚠️  DO NOT MODIFY WITHOUT:
1. Testing OAuth flow end-to-end
2. Verifying email sending works
3. Checking token refresh logic
4. Testing multi-account support

MODIFICATIONS REQUIRED:
- Update LAST_TESTED date
- Add change log entry
- Test affected functionality

CHANGE LOG:
- 2025-11-03: Multi-account support added
- 2025-10-30: Initial production version
"""
```

### **B. Feature Flags**

Use environment variables for new features:

```python
# backend/ncc_api/settings.py
FEATURE_FLAGS = {
    'NEW_PATIENT_FORM': os.getenv('ENABLE_NEW_PATIENT_FORM', 'False') == 'True',
    'EXPERIMENTAL_AI': os.getenv('ENABLE_EXPERIMENTAL_AI', 'False') == 'True',
    'NEW_SMS_PROVIDER': os.getenv('ENABLE_NEW_SMS_PROVIDER', 'False') == 'True',
}
```

```typescript
// frontend/app/utils/featureFlags.ts
export const FEATURE_FLAGS = {
  NEW_PATIENT_FORM: process.env.NEXT_PUBLIC_ENABLE_NEW_PATIENT_FORM === 'true',
  EXPERIMENTAL_AI: process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_AI === 'true',
};
```

### **C. Integration Tests**

Create test files that verify critical paths:

```python
# backend/gmail_integration/tests.py
class GmailIntegrationTests(TestCase):
    """CRITICAL: These tests must pass before modifying gmail_integration"""
    
    def test_oauth_flow(self):
        """Verify OAuth flow works"""
        # ... test code ...
    
    def test_email_sending(self):
        """Verify email sending works"""
        # ... test code ...
    
    def test_token_refresh(self):
        """Verify token refresh works"""
        # ... test code ...
```

---

## 🤖 **5. Cursor-Specific Best Practices**

### **A. Be Specific in Requests**

**❌ BAD:**
```
"Fix the email system"
```

**✅ GOOD:**
```
"Fix the email sending button in GmailIntegration.tsx - 
the button is disabled but should be enabled when 
a Gmail account is connected. 
DO NOT modify the OAuth flow or email sending logic."
```

### **B. Use File Paths in Requests**

**✅ GOOD:**
```
"Add a new validation function to 
frontend/app/utils/patientValidation.ts. 
DO NOT modify any existing files in 
backend/gmail_integration/ or 
frontend/app/components/settings/GmailIntegration.tsx"
```

### **C. Create New Files for New Features**

**✅ GOOD:**
```
"Create a new file: 
frontend/app/components/patients/PatientSearch.tsx 
for the patient search feature. 
Use existing patterns from PatientCard.tsx 
but do not modify PatientCard.tsx"
```

### **D. Use .cursorignore**

Create `.cursorignore` file:

```
# Protected working integrations
backend/gmail_integration/services.py
backend/xero_integration/services.py
backend/sms_integration/services.py
backend/documents/services.py
backend/ai_services/services.py

# Protected models
backend/patients/models.py
backend/appointments/models.py
backend/clinicians/models.py

# Protected frontend components
frontend/app/components/settings/GmailIntegration.tsx
frontend/app/components/settings/XeroIntegration.tsx
frontend/app/components/settings/SMSIntegration.tsx
frontend/app/components/ClinicCalendar.tsx

# Configuration files
backend/ncc_api/settings.py
backend/ncc_api/urls.py
frontend/next.config.js
```

---

## 📝 **6. Change Documentation**

### **A. Change Log File**

Create `CHANGELOG.md`:

```markdown
# Changelog

## [Unreleased]

### Added
- Patient search functionality

### Changed
- Updated patient form validation

### Fixed
- Calendar timezone display issue

### Protected (No Changes)
- Gmail integration (stable)
- Xero integration (stable)
- SMS integration (stable)
```

### **B. Feature Documentation**

Document new features immediately:

```markdown
# New Feature: Patient Search

**File:** `frontend/app/components/patients/PatientSearch.tsx`
**Status:** ✅ Working
**Dependencies:** None
**Tests:** Manual testing complete

**Usage:**
- Search by name, MRN, or phone
- Results update in real-time

**Known Issues:**
- None

**Future Enhancements:**
- Add fuzzy search
- Add search history
```

---

## 🧪 **7. Testing Before Changes**

### **Pre-Change Checklist**

Before modifying any protected file:

- [ ] Read the file completely
- [ ] Understand what it does
- [ ] Check related tests
- [ ] Review recent changes (git log)
- [ ] Test current functionality
- [ ] Create backup branch
- [ ] Document intended changes
- [ ] Test after changes

### **Test Script**

Create `scripts/test-critical.sh`:

```bash
#!/bin/bash

echo "🧪 Testing Critical Integrations..."

# Test Gmail
echo "Testing Gmail integration..."
python backend/manage.py test gmail_integration

# Test Xero
echo "Testing Xero integration..."
python backend/manage.py test xero_integration

# Test SMS
echo "Testing SMS integration..."
python backend/manage.py test sms_integration

# Test S3
echo "Testing S3 integration..."
python backend/manage.py test documents

echo "✅ All critical tests passed!"
```

---

## 🎯 **8. Feature Isolation Strategy**

### **A. Separate Directories**

Keep features in separate directories:

```
backend/
├── features/
│   ├── patient_search/      # New feature
│   │   ├── models.py
│   │   ├── views.py
│   │   └── serializers.py
│   └── appointment_notes/   # New feature
│       ├── models.py
│       └── views.py
```

### **B. Microservices Pattern (Future)**

For very large features, consider separate services:

```
services/
├── patient-service/         # Separate Django app
├── appointment-service/     # Separate Django app
└── integration-service/     # Gmail, Xero, SMS, S3
```

---

## 📊 **9. Monitoring & Alerts**

### **A. Code Review Checklist**

Before merging PRs:

- [ ] No changes to protected files (unless approved)
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Manual testing completed
- [ ] No breaking changes to APIs

### **B. Automated Checks**

Add to `.github/workflows/checks.yml`:

```yaml
name: Protected Files Check

on: [pull_request]

jobs:
  check-protected:
    runs-on: ubuntu-latest
    steps:
      - name: Check for protected file changes
        run: |
          if git diff --name-only origin/main | grep -E "(gmail_integration/services.py|xero_integration/services.py)"; then
            echo "⚠️  Protected files modified - review required"
            exit 1
          fi
```

---

## 🚨 **10. Emergency Recovery**

### **A. Git Revert**

If something breaks:

```bash
# 1. Find the bad commit
git log --oneline

# 2. Revert it
git revert <commit-hash>

# 3. Push fix
git push origin main
```

### **B. Branch Rollback**

```bash
# 1. Create backup branch
git branch backup-before-changes

# 2. Reset to last working commit
git reset --hard <last-working-commit>

# 3. Force push (only if necessary)
git push origin main --force
```

---

## ✅ **Quick Reference: Protection Rules**

| Action | Protection Level | Required |
|--------|------------------|----------|
| **Modify protected files** | ⛔ CRITICAL | Manual review + testing |
| **Add new features** | ✅ Safe | Create new files |
| **Fix bugs** | ⚠️  Careful | Test affected area |
| **Refactor code** | ⚠️  Careful | Full test suite |
| **Update dependencies** | ⚠️  Careful | Test all integrations |
| **Change API endpoints** | ⛔ CRITICAL | Update frontend + test |
| **Modify database models** | ⛔ CRITICAL | Migration + test |

---

## 📞 **When to Ask for Help**

Ask for review before modifying:
- ✅ Any file marked PROTECTED
- ✅ Core models (Patient, Appointment, Clinician)
- ✅ Integration services (Gmail, Xero, SMS, S3)
- ✅ Critical components (Navigation, Calendar)
- ✅ Configuration files (settings.py, urls.py)

---

## 🎯 **Summary**

1. **Mark protected files** with comments
2. **Use Git branches** for all changes
3. **Test before modifying** protected code
4. **Be specific** in Cursor requests
5. **Create new files** for new features
6. **Document changes** immediately
7. **Use feature flags** for experiments
8. **Review before merging** to main

---

**Last Updated:** 2025-11-03  
**Status:** ✅ Active Protection Strategy  
**Protected Files:** 15+ critical integration files

