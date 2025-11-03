# 📋 Cursor Rules - Quick Copy/Paste

**Just copy the sections below into Cursor Settings**

---

## 🎯 PROJECT RULES (Copy everything below this line)

```
# WalkEasy Nexus - Project Rules

## CRITICAL: Protected Files (NEVER modify without explicit permission)

### Backend Protected Files:
- backend/gmail_integration/services.py - Production ready, working OAuth & email
- backend/xero_integration/services.py - Production ready, working OAuth & sync
- backend/sms_integration/services.py - Production ready, working SMS sending
- backend/documents/services.py - Production ready, working S3 storage
- backend/ai_services/services.py - Production ready, working OpenAI integration
- backend/patients/models.py - Core data model, critical
- backend/appointments/models.py - Core data model, critical
- backend/ncc_api/settings.py - Django configuration, critical
- backend/ncc_api/urls.py - URL routing, critical

### Frontend Protected Files:
- frontend/app/components/settings/GmailIntegration.tsx - Working integration
- frontend/app/components/settings/XeroIntegration.tsx - Working integration
- frontend/app/components/settings/SMSIntegration.tsx - Working integration
- frontend/app/components/settings/S3Integration.tsx - Working integration
- frontend/app/components/settings/ATReport.tsx - Working integration
- frontend/app/components/Navigation.tsx - Core navigation component
- frontend/app/components/ClinicCalendar.tsx - Working calendar component
- frontend/app/layout.tsx - Root layout, critical

## Rules for Code Changes:

1. ALWAYS use file paths - Never say "the email component", say "frontend/app/components/settings/GmailIntegration.tsx"
2. ALWAYS specify what NOT to modify - If modifying a file, explicitly list protected files that should NOT be touched
3. ALWAYS create new files for new features - Don't modify existing working files unless absolutely necessary
4. ALWAYS check .cursorignore - Files listed there are protected and should not be modified
5. ALWAYS be specific - Instead of "fix the email system", say "fix the button styling on line 145 of GmailIntegration.tsx"
6. ALWAYS suggest Git branches - Remind user to create a branch before making changes
7. NEVER modify multiple protected files at once - One protected file at a time, with explicit permission
8. NEVER make sweeping changes - If asked to "update all integrations", suggest doing them one at a time
9. NEVER modify core models (patients/models.py, appointments/models.py) without explicit permission
10. ALWAYS suggest testing - Before modifying any protected file, suggest testing current functionality first

## Code Organization:
- New features go in new files/directories
- Keep features isolated in separate directories
- Use feature flags for experimental features
- Document all changes in CHANGELOG.md

## Testing Requirements:
- Before modifying protected files: test current functionality
- After modifications: run tests and manual verification
- Integration changes: test end-to-end flow

## Git Workflow:
- Always work on feature branches
- Never push directly to main
- Commit frequently with clear messages
- Review changes with git diff before committing
```

---

## 👤 USER RULES (Copy everything below this line)

```
# WalkEasy Nexus - User Rules

## General Principles:
1. Safety First - Protect working code at all costs
2. Be Specific - Always use exact file paths in requests
3. Test Before Modify - Never modify working code without testing first
4. Create New Files - Prefer new files over modifying existing ones
5. Use Git Branches - Always work on feature branches, never directly on main

## When User Asks to Modify Code:
1. Check if file is protected - If in .cursorignore or protected list, warn user
2. Suggest Git branch - Remind to create branch first
3. Ask for specificity - If request is vague, ask for specific file and line numbers
4. Suggest testing - Remind to test before and after changes
5. Offer alternatives - Suggest creating new files instead of modifying existing

## Response Patterns:
- If user asks vague question → Ask for specific file path and line numbers
- If user asks to modify protected file → Warn and suggest testing first
- If user asks to modify multiple files → Suggest doing one at a time
- If user asks for new feature → Suggest creating new files/directories

## Code Quality:
- Follow existing patterns in the codebase
- Use TypeScript for frontend (type safety)
- Use Django conventions for backend
- Add comments for complex logic
- Update documentation when making changes
```

---

## 🚀 PROJECT COMMANDS (Add each one separately)

### Command 1: Check Protected Files
```
Check if any files I'm modifying are in the protected list (.cursorignore or docs/setup/CODE_ORGANIZATION_STRATEGY.md). Warn me if I'm about to modify protected files.
```

### Command 2: Create Feature Branch
```
Remind me to create a Git branch for this change. Suggest branch name based on the feature (e.g., feature/patient-search, fix/calendar-bug).
```

### Command 3: Review Protected Changes
```
Before I commit, review the diff and warn me if any protected files (from .cursorignore) were modified. List which protected files changed and suggest testing them.
```

### Command 4: Suggest File Organization
```
For this new feature, suggest the best file/directory structure following the project's organization patterns. Prefer creating new files over modifying existing ones.
```

### Command 5: Test Checklist
```
Before modifying [FILE], provide a checklist of what to test:
1. Current functionality
2. Related integrations
3. Database changes (if any)
4. API endpoints (if any)
5. Frontend components (if any)
```

---

## 💡 USER COMMANDS (Optional - Add each one separately)

### Command 1: Safe Modify
```
I want to modify [FILE]. Before proceeding:
1. Check if it's protected
2. Suggest a Git branch name
3. List what should be tested
4. Suggest any alternative approaches (like creating new file)
```

### Command 2: New Feature Template
```
I want to add a new feature: [FEATURE_NAME]. Create a plan that includes:
1. New files to create (don't modify existing)
2. Directory structure
3. Integration points (if any)
4. Testing requirements
5. Documentation updates needed
```

### Command 3: Protected File Review
```
I need to modify [PROTECTED_FILE]. Before I do:
1. Show me what this file does
2. List related files that might be affected
3. Suggest testing approach
4. Warn about breaking changes
5. Suggest backup strategy
```

---

## 📝 How to Use:

1. **Project Rules**: Copy the entire "PROJECT RULES" block above → Paste into Cursor Settings → Project Rules
2. **User Rules**: Copy the entire "USER RULES" block above → Paste into Cursor Settings → User Rules
3. **Project Commands**: Copy each command individually → Add to Cursor Settings → Project Commands
4. **User Commands**: Copy each command individually → Add to Cursor Settings → User Commands (optional)

---

**Ready to paste!** Just copy the sections you need.

