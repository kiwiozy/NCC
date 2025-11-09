# 🔧 Troubleshooting Guide

**Common issues and solutions for WalkEasy Nexus development**

**Last Updated:** November 9, 2025 - Added FileMaker import issues

> ⚠️ **IMPORTANT:** If this troubleshooting guide is updated, you **MUST** also update the "Troubleshooting Reference" section in `.cursor/rules/projectrules.mdc` to keep them synchronized. The project rules file is used by Cursor AI to provide context-aware assistance, so both files must stay in sync.

---

## 📊 **FileMaker Import Issues** (Added: Nov 9, 2025)

### **Django 500 Errors After Adding New Models to Admin**

**Symptoms:**
- All API requests return 500 Internal Server Error
- CORS errors in browser console
- "Origin https://localhost:3000 is not allowed by Access-Control-Allow-Origin"
- Frontend cannot load any data

**Root Cause:**
Django admin.py files reference fields that don't exist in the models, causing Django's system check to fail on every request.

**Common Errors in Django Logs:**
```
ERRORS:
<class 'coordinators.admin.PatientCoordinatorAdmin'>: (admin.E035) 
  The value of 'readonly_fields[0]' is not a callable, an attribute of 
  'PatientCoordinatorAdmin', or an attribute of 'coordinators.PatientCoordinator'.
  
<class 'referrers.admin.ReferrerCompanyAdmin'>: (admin.E108) 
  The value of 'list_display[2]' refers to 'start_date', which is not a 
  callable, an attribute of 'ReferrerCompanyAdmin', or an attribute or 
  method on 'referrers.ReferrerCompany'.
```

**Solution:**
1. Check Django logs: `tail -n 100 logs/django.log | grep ERRORS`
2. Identify which admin classes have incorrect field references
3. Compare admin.py field references with actual model fields
4. Remove or correct any references to non-existent fields
5. Restart Django server: `./stop-dev.sh && ./quick-start.sh`

**Example Fix:**
```python
# BEFORE (causes error)
@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']  # 'description' doesn't exist!

# AFTER (fixed)
@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']  # Use actual fields
    readonly_fields = ['id', 'created_at']
```

**Prevention:**
- Always check model fields before adding them to admin
- Use `python manage.py check` to validate admin configuration
- Test admin registration immediately after creating it

---

### **Patient Titles Not Displaying in Frontend**

**Symptoms:**
- Patients display as "John Smith" instead of "Mr. John Smith"
- Titles exist in database (check with Django shell)
- Backend API returns title field correctly
- Frontend ignores the title

**Root Cause:**
The `transformPatientToContact` function uses `full_name` from the API but doesn't prepend the title when available.

**Solution:**
Update `frontend/app/patients/page.tsx` to extract and use title regardless of serializer type:

```typescript
// BEFORE (ignores title)
if (patient.full_name) {
  displayName = patient.full_name;  // No title!
}

// AFTER (includes title)
const titleMap: Record<string, string> = {
  'Mr': 'Mr.', 'Mrs': 'Mrs.', 'Ms': 'Ms.', /* ... */
};
title = patient.title ? (titleMap[patient.title] || patient.title) : '';

if (patient.full_name) {
  displayName = title ? `${title} ${patient.full_name}` : patient.full_name;
}
```

**Verification:**
1. Check database has titles: `Patient.objects.exclude(title='').count()`
2. Check API returns titles: `curl -k https://localhost:8000/api/patients/ | grep title`
3. Hard refresh browser (Cmd+Shift+R) after fix

---

### **CORS Errors for Notes/Documents/Images API Calls**

**Symptoms:**
- "Fetch API cannot load ... due to access control checks"
- Notes count, documents count, images count show as 0
- Backend logs show 200 OK responses
- Only happens for specific endpoints (notes, documents, images)

**Root Cause:**
When `CORS_ALLOW_CREDENTIALS = True` is set in Django, browsers require `credentials: 'include'` in fetch requests. Some fetch calls had this option, others didn't.

**Solution:**
Add `credentials: 'include'` to all fetch requests in `ContactHeader.tsx`:

```typescript
// BEFORE (causes CORS error)
const response = await fetch(`https://localhost:8000/api/notes/?patient_id=${patientId}`);

// AFTER (works correctly)
const response = await fetch(`https://localhost:8000/api/notes/?patient_id=${patientId}`, {
  credentials: 'include',
});
```

**Files to Check:**
- `frontend/app/components/ContactHeader.tsx` - Badge count API calls
- `frontend/app/patients/page.tsx` - Patient data loading
- Any component making API calls to authenticated endpoints

**Why This Happens:**
- Django has `CORS_ALLOW_CREDENTIALS = True` for session authentication
- Browsers enforce stricter CORS rules when credentials are enabled
- Without `credentials: 'include'`, browser blocks the request

**Verification:**
1. Check Django logs show 200 OK: `tail -f logs/django.log`
2. Check browser console for CORS errors
3. Add credentials option to all authenticated API calls
4. Hard refresh browser to clear cached CORS preflight responses

---

### **React "Cannot Update Component While Rendering" Warning**

**Symptoms:**
- Console warning: "Cannot update a component (`ContactsPage`) while rendering a different component (`ContactHeader`)"
- Warning appears when toggling archive filter
- App still works but console is noisy

**Root Cause:**
`ContactHeader` calls `onFilterApply` (which updates parent state) synchronously during the `onChange` handler, which happens during render.

**Solution:**
Defer the callback to the next tick using `setTimeout`:

```typescript
// BEFORE (causes warning)
onChange={(event) => {
  setFilters(prev => {
    const updated = { ...prev, archived: newArchived };
    onFilterApply?.(updated);  // Updates parent during render!
    return updated;
  });
}}

// AFTER (defers to next tick)
onChange={(event) => {
  const updatedFilters = { ...filters, archived: newArchived };
  setFilters(updatedFilters);
  setTimeout(() => {
    onFilterApply?.(updatedFilters);  // Deferred to next tick
  }, 0);
}}
```

**Why This Works:**
- `setTimeout(..., 0)` defers execution to the next JavaScript event loop tick
- This ensures state update completes before calling parent callback
- Parent component receives update after render cycle finishes

---

## 🚨 **Google OAuth "Redirect URI Mismatch" Error**

### **Symptoms:**
- "Error 400: redirect_uri_mismatch" when clicking "Continue" on Google login
- "Access blocked" page from Google
- Login works on Gmail test page but not on main login page
- OAuth flow fails after user grants permissions

### **Causes & Solutions:**

#### **1. Wrong Callback URL in Google Cloud Console** ⚠️ **MOST COMMON**

**The Problem:**
Allauth uses a different callback URL than the Gmail integration:
- **Gmail OAuth**: `https://localhost:8000/gmail/oauth/callback/`
- **Allauth Google**: `https://localhost:8000/accounts/google/login/callback/` ⚠️ **Note the `/login/` in the path!**

**The Fix:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Edit your OAuth 2.0 Client ID
4. In **"Authorized redirect URIs"**, ensure you have **BOTH**:
   - `https://localhost:8000/gmail/oauth/callback/` (for Gmail integration)
   - `https://localhost:8000/accounts/google/login/callback/` (for user authentication) ⚠️ **Must include `/login/`!**
5. Click **"SAVE"**
6. Wait 1-2 minutes for changes to propagate

**Common Mistakes:**
- ❌ `https://localhost:8000/accounts/google/callback/` (missing `/login/`)
- ❌ `http://localhost:8000/accounts/google/login/callback/` (HTTP instead of HTTPS)
- ❌ `https://127.0.0.1:8000/accounts/google/login/callback/` (127.0.0.1 instead of localhost)
- ❌ Missing trailing slash `/`

**Verify:**
```bash
# Check what allauth is actually using
cd backend
source venv/bin/activate
python manage.py shell -c "
from django.urls import reverse
print('Allauth callback:', reverse('google_callback'))
"
```

#### **2. Site Domain Mismatch**

**Check Site configuration:**
```bash
cd backend
source venv/bin/activate
python manage.py shell -c "
from django.contrib.sites.models import Site
site = Site.objects.get(pk=1)
print(f'Site Domain: {site.domain}')
print('Should be: localhost:8000 (no protocol, no trailing slash)')
"
```

**Fix if wrong:**
```bash
python manage.py shell -c "
from django.contrib.sites.models import Site
site = Site.objects.get(pk=1)
site.domain = 'localhost:8000'
site.name = 'Nexus Core Clinic'
site.save()
print('✅ Site updated')
"
```

#### **3. SocialApp Not Linked to Site**

**Check SocialApp:**
```bash
python manage.py shell -c "
from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site
app = SocialApp.objects.filter(provider='google').first()
site = Site.objects.get(pk=1)
if app:
    print(f'App: {app.name}')
    print(f'Sites: {[s.domain for s in app.sites.all()]}')
    print(f'Current Site: {site.domain}')
    print(f'Linked: {site in app.sites.all()}')
else:
    print('❌ No SocialApp found')
"
```

**Fix if not linked:**
```bash
python manage.py shell -c "
from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site
import os
from dotenv import load_dotenv
load_dotenv()

site = Site.objects.get(pk=1)
client_id = os.getenv('GMAIL_CLIENT_ID')
client_secret = os.getenv('GMAIL_CLIENT_SECRET')

if client_id and client_secret:
    app, created = SocialApp.objects.get_or_create(
        provider='google',
        defaults={
            'name': 'Google OAuth',
            'client_id': client_id,
            'secret': client_secret,
        }
    )
    app.sites.add(site)
    print(f'✅ {\"Created\" if created else \"Updated\"} SocialApp')
else:
    print('❌ GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET not set')
"
```

---

## 🚨 **Google OAuth Intermediate Page Issue**

### **Symptoms:**
- After clicking "Sign in with Google", user sees intermediate "Sign In Via Google" page
- User must click "Continue" button to proceed
- Flow works but has unnecessary step

### **Causes & Solutions:**

#### **1. Missing `SOCIALACCOUNT_LOGIN_ON_GET` Setting** ⚠️ **MOST COMMON**

**The Problem:**
django-allauth by default shows an intermediate confirmation page for security (CSRF protection). This requires a POST request before starting OAuth.

**The Fix:**
Add this setting to `backend/ncc_api/settings.py`:

```python
# OAuth Provider Settings (django-allauth uses "SOCIALACCOUNT" prefix for OAuth providers)
SOCIALACCOUNT_LOGIN_ON_GET = True  # Skip intermediate page, start OAuth immediately on GET
SOCIALACCOUNT_AUTO_SIGNUP = True  # Automatically create user account on first login
SOCIALACCOUNT_QUERY_EMAIL = True  # Request email from OAuth provider
SOCIALACCOUNT_EMAIL_REQUIRED = True  # Require email for OAuth accounts
SOCIALACCOUNT_EMAIL_VERIFICATION = 'none'  # Skip email verification for OAuth accounts
```

**What This Does:**
- `SOCIALACCOUNT_LOGIN_ON_GET = True` - Skips the intermediate page and starts OAuth immediately on GET requests
- `SOCIALACCOUNT_AUTO_SIGNUP = True` - Automatically creates user account without showing signup form
- Other settings ensure seamless flow without extra verification steps

**Verify:**
1. Restart backend server after adding settings
2. Try logging in again
3. Should go directly to Google account selection (no intermediate page)

#### **2. Using Wrong Endpoint**

**The Problem:**
Using `/accounts/google/login/` instead of custom `/api/auth/google/login/` endpoint.

**The Fix:**
Ensure frontend uses the custom endpoint:

```typescript
// frontend/app/login/page.tsx
const handleGoogleLogin = () => {
  window.location.href = 'https://localhost:8000/api/auth/google/login/';
};
```

**Note:** The custom endpoint (`/api/auth/google/login/`) uses `OAuth2LoginView` which properly handles the seamless flow.

---

## 🚨 **SMS Sending Fails with Database Error**

### **Symptoms:**
- SMS send fails with `500 Internal Server Error`
- Console shows: `Origin https://localhost:3000 is not allowed by Access-Control-Allow-Origin`
- Django logs show: `django.db.utils.IntegrityError: NOT NULL constraint failed: sms_messages.has_media`
- Error occurs after reverting MMS code changes

### **Root Cause:**
Database schema has MMS fields (like `has_media`, `media_url`) but the code was reverted to pre-MMS state, causing a mismatch.

### **Solution: Apply Migration to Remove MMS Fields**

**1. Check if migration exists:**
```bash
cd backend/sms_integration/migrations
ls -la | grep "0003_remove_mms"
```

**2. If migration file exists, apply it:**
```bash
cd backend
python manage.py migrate sms_integration
```

**3. If migration doesn't exist, create it:**

Create `backend/sms_integration/migrations/0003_remove_mms_fields.py`:
```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('sms_integration', '0002_alter_smsmessage_patient'),
    ]
    operations = [
        # Remove MMS fields from SMSMessage
        migrations.RemoveField(model_name='smsmessage', name='has_media'),
        migrations.RemoveField(model_name='smsmessage', name='media_url'),
        migrations.RemoveField(model_name='smsmessage', name='media_type'),
        migrations.RemoveField(model_name='smsmessage', name='media_size'),
        migrations.RemoveField(model_name='smsmessage', name='media_filename'),
        migrations.RemoveField(model_name='smsmessage', name='s3_key'),
        # Remove MMS fields from SMSInbound
        migrations.RemoveField(model_name='smsinbound', name='has_media'),
        migrations.RemoveField(model_name='smsinbound', name='media_url'),
        migrations.RemoveField(model_name='smsinbound', name='media_downloaded_url'),
        migrations.RemoveField(model_name='smsinbound', name='media_type'),
        migrations.RemoveField(model_name='smsinbound', name='media_size'),
        migrations.RemoveField(model_name='smsinbound', name='s3_key'),
        migrations.RemoveField(model_name='smsinbound', name='download_status'),
    ]
```

Then run: `python manage.py migrate sms_integration`

**4. Restart services:**
```bash
./restart-dev.sh
```

**5. Verify:**
- Django startup should show no migration warnings
- SMS sending should work without errors

### **Alternative: Manual SQLite Fix (If Migration Fails)**

If the migration fails, you can manually fix the SQLite database:

```bash
cd backend
sqlite3 db.sqlite3 << 'EOF'
-- Recreate sms_messages table without MMS fields
CREATE TABLE sms_messages_new AS SELECT 
  id, phone_number, message, status, external_message_id, created_at,
  scheduled_at, sent_at, delivered_at, error_message, retry_count,
  sms_count, cost, notes, appointment_id, patient_id, template_id
FROM sms_messages;

DROP TABLE sms_messages;
ALTER TABLE sms_messages_new RENAME TO sms_messages;

-- Recreate sms_inbound table without MMS fields  
CREATE TABLE sms_inbound_new AS SELECT
  id, from_number, to_number, message, external_message_id, received_at,
  is_processed, processed_at, processed_by, notes, patient_id
FROM sms_inbound;

DROP TABLE sms_inbound;
ALTER TABLE sms_inbound_new RENAME TO sms_inbound;

-- Mark migration as applied
INSERT INTO django_migrations (app, name, applied) 
VALUES ('sms_integration', '0003_remove_mms_fields', datetime('now'));
EOF
```

---

## 🚨 **Patients Not Loading**

### **Symptoms:**
- "No patients found" message
- TLS errors in console
- "Failed to load resource" errors

### **Causes & Solutions:**

#### **1. Backend Server Not Running** ⚠️ **MOST COMMON**

**Check if server is running:**
```bash
lsof -ti:8000
# or
ps aux | grep "manage.py runserver"
```

**Start the backend server:**
```bash
cd backend
source venv/bin/activate
./start-https.sh
# or
python manage.py runserver_plus --cert-file cert.pem --key-file key.pem 0.0.0.0:8000
```

**Expected output:**
```
🚀 Starting Django with HTTPS...
Backend:  https://localhost:8000
```

#### **2. TLS Certificate Issues**

**Browser will show certificate warning:**
- Click "Advanced"
- Click "Proceed to localhost (unsafe)"
- This is normal for local development with self-signed certificates

**Frontend will show TLS errors:**
- These are expected if backend isn't running
- Start the backend server first

#### **3. CORS Issues**

If you see CORS errors, check:
- Backend is running on `https://localhost:8000`
- Frontend is making requests to the correct URL
- Django CORS settings are configured

---

## 🔄 **Hydration Mismatch Errors**

### **Symptoms:**
```
Hydration failed because the server rendered HTML didn't match the client
```

### **Causes:**
- Date formatting differences between server and client
- Random values or `Date.now()` in components
- Browser extensions modifying HTML

### **Solutions:**

#### **1. Use Client-Side Only Rendering**
```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    // Client-side only code
    loadData();
  }
}, []);
```

#### **2. Use Consistent Date Formatting**
```typescript
import { formatDateOnlyAU } from '../utils/dateFormatting';

// Instead of:
new Date(dateStr).toLocaleDateString()

// Use:
formatDateOnlyAU(dateStr)
```

**Important:** Dates are displayed as "DD MMM YYYY" format (e.g., "25 Jun 1949") but stored in ISO format (YYYY-MM-DD) in the database.

#### **3. Avoid Random Values in Render**
```typescript
// ❌ Bad
const id = Math.random();

// ✅ Good
const [id] = useState(() => Math.random());
```

---

## 📊 **API Connection Issues**

### **Check Backend Status:**
```bash
# Check if server is running
curl -k https://localhost:8000/api/patients/ | head -20

# If you see JSON, server is running
# If you see connection error, server is not running
```

### **Common Errors:**

#### **"Failed to load resource: A TLS error"**
- **Solution:** Start the backend server
- Backend must be running before frontend can connect

#### **"404 Not Found"**
- **Solution:** Check API endpoint URL
- Verify URL routing in `backend/ncc_api/urls.py`

#### **"CORS error"**
- **Solution:** Check Django CORS settings
- Verify `CORS_ALLOWED_ORIGINS` includes frontend URL

---

## 🗄️ **Database Issues**

### **No Patients in Database:**

**Check if patients exist:**
```bash
cd backend
source venv/bin/activate
python manage.py shell

>>> from patients.models import Patient
>>> Patient.objects.count()
```

**Create mock patients:**
```bash
python manage.py create_mock_patients --count 50
```

### **Migration Issues:**

**Run migrations:**
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

---

## 📅 **Date Formatting Issues**

### **Symptoms:**
- Dates showing as ISO format (e.g., "1949-06-25") instead of formatted (e.g., "25 Jun 1949")
- Console warnings about "Invalid date parts"
- Dates showing with "/YYYY" suffix (e.g., "25 Jun 1949/06/YYYY")

### **Causes & Solutions:**

#### **1. Luxon Format String Issue** ⚠️ **CRITICAL**

**Problem:**
Using incorrect Luxon format tokens:
- `DD` = Day of year (wrong!)
- `YYYY` = Week year (wrong!)

**Solution:**
Use correct format tokens:
- `dd` = Day of month (correct)
- `yyyy` = Calendar year (correct)

**Example:**
```typescript
// ❌ Wrong - Returns malformed dates
dt.toFormat('DD/MM/YYYY')  // Returns "Jun 25, 1949/06/YYYY"

// ✅ Correct - Returns proper format
dt.toFormat('dd/MM/yyyy')  // Returns "25/06/1949"
```

**Fixed in:**
- `frontend/app/utils/dateFormatting.ts` - `formatDateOnlyAU` and `formatDateAU` now use `dd/MM/yyyy`

#### **2. Double Formatting Protection**

**Problem:**
`formatDateOnlyAU` being called on already-formatted dates (dates with month names).

**Solution:**
Multiple layers of protection:
1. Check in `transformPatientToContact` - Only format ISO dates
2. Check in `formatDate` - Detect letters before calling `formatDateOnlyAU`
3. Check in `formatDateOnlyAU` - Reject dates with letters
4. Check in `formatDateAU` - Validate DateTime before formatting

**Date Format:**
- **Display:** "DD MMM YYYY" (e.g., "25 Jun 1949")
- **Storage:** ISO format "YYYY-MM-DD" (e.g., "1949-06-25")
- **Processing:** Convert ISO → "dd/MM/yyyy" → "DD MMM YYYY"

#### **3. Stale React State**

**Problem:**
React state may contain old formatted dates from previous renders.

**Solution:**
Always clear state before fetching new data:
```typescript
setAllContacts([]);
setContacts([]);
setSelectedContact(null);
// Then fetch fresh data from API
```

---

## 🎨 **Frontend Issues**

### **Build Errors:**

**Clear Next.js cache:**
```bash
cd frontend
rm -rf .next
npm run dev
```

**Reinstall dependencies:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### **Type Errors:**

**Run TypeScript check:**
```bash
cd frontend
npx tsc --noEmit
```

---

## 🔍 **Debugging Steps**

### **1. Check Backend Logs**
```bash
# Backend should show request logs
# Look for 404, 500, or connection errors
```

### **2. Check Browser Console**
- Open DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests

### **3. Check Network Requests**
- Open DevTools → Network tab
- Look for requests to `https://localhost:8000`
- Check status codes (200 = success, 404 = not found, 500 = server error)

### **4. Verify API Endpoints**
```bash
# Test patients endpoint
curl -k https://localhost:8000/api/patients/

# Test clinics endpoint
curl -k https://localhost:8000/api/clinics/

# Test funding sources endpoint
curl -k https://localhost:8000/api/settings/funding-sources/
```

---

## ✅ **Quick Checklist**

Before reporting issues, check:

- [ ] Backend server is running (`https://localhost:8000`)
- [ ] Backend server shows no errors in terminal
- [ ] Browser allows self-signed certificate (click "Advanced" → "Proceed")
- [ ] No CORS errors in browser console
- [ ] Database has data (run `create_mock_patients` if needed)
- [ ] Migrations are up to date
- [ ] Frontend dev server is running
- [ ] No TypeScript errors
- [ ] Browser console shows no blocking errors

---

## 📞 **Getting Help**

If issues persist:

1. **Check the logs:**
   - Backend terminal output
   - Browser console errors
   - Network tab in DevTools

2. **Verify setup:**
   - Virtual environment activated
   - Dependencies installed
   - Environment variables set

3. **Try restarting:**
   - Stop all servers
   - Clear caches
   - Restart backend, then frontend

---

## Communication Display Issues

### Problem: Address not showing when added first
**Symptoms:**
- Adding an address first doesn't display
- Adding a phone first works, then address shows

**Root Cause:**
- Communication section only rendered when `selectedContact.communication` exists
- Address is saved to `address_json`, not `communication`
- When only address exists, `communication` is `undefined`, so section doesn't render

**Solution:**
- Updated condition to: `{(selectedContact.communication || selectedContact.address_json) && (`
- Added null-safe handling: `const comms = selectedContact.communication || {};`
- Added null checks before accessing `comms.phone`, `comms.mobile`, `comms.email`

### Problem: TypeError: undefined is not an object (evaluating 'comms.phone')
**Symptoms:**
- Console error when viewing communication section
- App crashes when trying to display communications

**Root Cause:**
- Code tried to access `comms.phone` when `comms` was `undefined`

**Solution:**
- Initialize `comms` with empty object: `const comms = selectedContact.communication || {};`
- Add null checks: `if (comms && comms.phone)`

### Problem: CORS error with Cache-Control header
**Symptoms:**
- Error: "Request header field Cache-Control is not allowed by Access-Control-Allow-Headers"
- Reload after save fails

**Root Cause:**
- Backend CORS configuration doesn't allow `Cache-Control` header

**Solution:**
- Removed `Cache-Control` header from fetch requests
- Use timestamp query parameter for cache-busting: `?t=${Date.now()}`

---

## 📄 **PDF Rendering and CORS Issues**

### Problem: PDFs not loading from S3 (CORS errors)
**Symptoms:**
- "Origin http://localhost:3000 is not allowed by Access-Control-Allow-Origin. Status code: 403"
- PDFs fail to load in Safari
- "Load failed" error in document viewer

**Root Cause:**
- S3 bucket CORS configuration doesn't allow `http://localhost:3000`
- Browser blocks cross-origin requests to S3

**Solution Implemented:**
- **Backend Proxy Endpoint**: `/api/documents/{id}/proxy/`
  - Fetches PDFs from S3 server-side (bypasses CORS)
  - Streams PDF through Django to frontend
- **IndexedDB Cache**: `frontend/app/utils/pdfCache.ts`
  - Caches PDFs locally for instant subsequent loads
  - Automatic cleanup (7 days, 100MB limit)
- **Updated Dialog**: `DocumentsDialog.tsx`
  - Checks cache first, falls back to proxy if not cached
  - Stores in cache after fetching

**Benefits:**
- ✅ No CORS errors (proxy bypasses browser restrictions)
- ✅ Works consistently in Safari
- ✅ Instant loads for cached PDFs (zero bandwidth)
- ✅ Automatic storage management

**Documentation:**
- See `docs/troubleshooting/PDF_CACHING_SOLUTION.md` for complete details
- See `docs/troubleshooting/SAFARI_PDF_RENDERING_ISSUE.md` for original problem analysis

---

## 📱 **SMS Issues**

### **403 Forbidden on Patient SMS**

**Symptoms:**
- Can't send SMS from patient page
- Error: "Failed to load resource: 403 (Forbidden)"
- Works in SMS test page but not patient dialog

**Cause:**
Patient SMS endpoints require authentication with CSRF tokens.

**Solution:**
1. **Backend:** Ensure CSRF token endpoint exists
   ```bash
   # Check endpoint exists
   curl -X GET https://localhost:8000/api/auth/csrf-token/ \
     -H "Accept: application/json" -k
   ```

2. **Frontend:** Include CSRF token in requests
   - Must include `credentials: 'include'` in fetch calls
   - Must include `X-CSRFToken` header in POST requests
   - Token fetched from cookies or `/api/auth/csrf-token/` endpoint

3. **Verify user is authenticated:**
   ```bash
   curl -X GET https://localhost:8000/api/auth/user/ \
     -H "Accept: application/json" -k --cookie-jar cookies.txt
   ```

**Files to check:**
- `backend/ncc_api/auth_views.py` - `csrf_token` view
- `backend/ncc_api/urls.py` - `/api/auth/csrf-token/` route
- `frontend/app/components/dialogs/SMSDialog.tsx` - `getCsrfToken()` function

---

### **"'SMSMessage' object has no attribute 'get'" Error**

**Symptoms:**
- SMS sends successfully but error notification appears
- Error: `'SMSMessage' object has no attribute 'get'`
- Message appears in database but frontend shows error

**Cause:**
Django REST Framework serializers return `ReturnDict` objects (not regular Python dicts). Also, `SMSService.send_sms()` might return model instances instead of dicts.

**Solution:**

1. **Convert serializer.data to regular dict:**
   ```python
   # In patient_views.py
   serializer = SMSMessageSerializer(sms_message)
   response_data = dict(serializer.data.items())  # Convert ReturnDict
   ```

2. **Check result type from SMSService:**
   ```python
   result = sms_service.send_sms(phone_number, message)
   
   # Ensure result is a dict
   if isinstance(result, SMSMessage):
       result = {
           'success': result.status == 'sent',
           'message_id': result.external_message_id,
           'sms_count': result.sms_count or 1,
           'cost': result.cost,
           'error': result.error_message
       }
   
   # Now safe to use .get()
   if isinstance(result, dict) and result.get('success'):
       # ...
   ```

**Files affected:**
- `backend/sms_integration/patient_views.py` - `patient_send_sms()`
- `backend/sms_integration/patient_views.py` - `patient_conversation()`

**Prevention:**
- Always convert `serializer.data` to regular dict before modifying
- Always check instance type before calling `.get()` on results
- Use `isinstance()` to verify dict vs model instance

---

### **Patient Not Found When Replying to SMS**

**Symptoms:**
- Inbound SMS received but not linked to patient
- Message saved in `SMSInbound` but `patient` is `null`

**Cause:**
Phone number doesn't match any patient's communication data.

**Solution:**
1. **Check patient phone numbers:**
   - Verify patient has phone in `contact_json.mobile` or `contact_json.phone`
   - Check emergency contacts in `emergency_json`

2. **Phone number normalization:**
   - Strips spaces, +, leading 0
   - Adds country code: `0412345678` → `61412345678`
   - Format sent should be: `+61412345678`

3. **Webhook searches:**
   - `contact_json.mobile` (both string and nested dict formats)
   - `contact_json.phone` (both string and nested dict formats)
   - `emergency_json.mother.mobile`
   - `emergency_json.father.mobile`
   - `emergency_json.emergency.mobile`
   - `emergency_json.guardian.mobile`

**Files to check:**
- `backend/sms_integration/webhook_views.py` - `find_patient_by_phone()`
- `backend/sms_integration/webhook_views.py` - `normalize_phone()`

---

## 📱 **SMS Issues**

### **403 Forbidden on Patient SMS**

**Symptoms:**
- Can't send SMS from patient page
- Error: "Failed to load resource: 403 (Forbidden)"
- Works in SMS test page but not patient dialog

**Cause:**
Patient SMS endpoints require authentication with CSRF tokens.

**Solution:**
1. **Backend:** Ensure CSRF token endpoint exists
   ```bash
   # Check endpoint exists
   curl -X GET https://localhost:8000/api/auth/csrf-token/ \
     -H "Accept: application/json" -k
   ```

2. **Frontend:** Include CSRF token in requests
   - Must include `credentials: 'include'` in fetch calls
   - Must include `X-CSRFToken` header in POST requests
   - Token fetched from cookies or `/api/auth/csrf-token/` endpoint

3. **Verify user is authenticated:**
   ```bash
   curl -X GET https://localhost:8000/api/auth/user/ \
     -H "Accept: application/json" -k --cookie-jar cookies.txt
   ```

**Files to check:**
- `backend/ncc_api/auth_views.py` - `csrf_token` view
- `backend/ncc_api/urls.py` - `/api/auth/csrf-token/` route
- `frontend/app/components/dialogs/SMSDialog.tsx` - `getCsrfToken()` function

---

### **"'SMSMessage' object has no attribute 'get'" Error**

**Symptoms:**
- SMS sends successfully but error notification appears
- Error: `'SMSMessage' object has no attribute 'get'`
- Message appears in database but frontend shows error

**Cause:**
Django REST Framework serializers return `ReturnDict` objects (not regular Python dicts). Also, `SMSService.send_sms()` might return model instances instead of dicts.

**Solution:**

1. **Convert serializer.data to regular dict:**
   ```python
   # In patient_views.py
   serializer = SMSMessageSerializer(sms_message)
   response_data = dict(serializer.data.items())  # Convert ReturnDict
   ```

2. **Check result type from SMSService:**
   ```python
   result = sms_service.send_sms(phone_number, message)
   
   # Ensure result is a dict
   if isinstance(result, SMSMessage):
       result = {
           'success': result.status == 'sent',
           'message_id': result.external_message_id,
           'sms_count': result.sms_count or 1,
           'cost': result.cost,
           'error': result.error_message
       }
   
   # Now safe to use .get()
   if isinstance(result, dict) and result.get('success'):
       # ...
   ```

**Files affected:**
- `backend/sms_integration/patient_views.py` - `patient_send_sms()`
- `backend/sms_integration/patient_views.py` - `patient_conversation()`

**Prevention:**
- Always convert `serializer.data` to regular dict before modifying
- Always check instance type before calling `.get()` on results
- Use `isinstance()` to verify dict vs model instance

---

### **Patient Not Found When Replying to SMS**

**Symptoms:**
- Inbound SMS received but not linked to patient
- Message saved in `SMSInbound` but `patient` is `null`

**Cause:**
Phone number doesn't match any patient's communication data.

**Solution:**
1. **Check patient phone numbers:**
   - Verify patient has phone in `contact_json.mobile` or `contact_json.phone`
   - Check emergency contacts in `emergency_json`

2. **Phone number normalization:**
   - Strips spaces, +, leading 0
   - Adds country code: `0412345678` → `61412345678`
   - Format sent should be: `+61412345678`

3. **Webhook searches:**
   - `contact_json.mobile` (both string and nested dict formats)
   - `contact_json.phone` (both string and nested dict formats)
   - `emergency_json.mother.mobile`
   - `emergency_json.father.mobile`
   - `emergency_json.emergency.mobile`
   - `emergency_json.guardian.mobile`

**Files to check:**
- `backend/sms_integration/webhook_views.py` - `find_patient_by_phone()`
- `backend/sms_integration/webhook_views.py` - `normalize_phone()`

---

## 🌐 **Development Environment Issues**

### **Frontend Not Loading - "Could not connect to the server"**

**Symptoms:**
- Frontend loads but shows multiple "TypeError: Load failed" errors
- Cannot load patients, clinics, funding sources, user data
- Auth check failing
- Console shows: `Failed to load resource: Could not connect to the server`

**Root Cause:**
Django backend is not running on port 8000.

**Solution:**

1. **Check if Django is running:**
   ```bash
   ./status-dev.sh
   # or
   lsof -i :8000
   ```

2. **Start Django backend:**
   ```bash
   # Option 1: Use startup script (recommended)
   ./start-dev.sh
   
   # Option 2: Manual start
   cd backend
   venv/bin/python manage.py runserver 8000
   ```

3. **Verify backend is responding:**
   ```bash
   curl http://localhost:8000/api/patients/
   # Should return JSON data or 401 (auth required)
   ```

**Prevention:**
- Always use `./start-dev.sh` to start all services together
- Check `./status-dev.sh` before starting work
- Keep Django and Next.js running in the same session

---

### **Django ModuleNotFoundError: No module named 'django'**

**Symptoms:**
- Django won't start
- Error: `ModuleNotFoundError: No module named 'django'`
- Error: `Couldn't import Django. Are you sure it's installed?`
- Error: `Did you forget to activate a virtual environment?`

**Root Cause:**
Python virtual environment is not being used, so Django packages aren't available.

**Solution:**

1. **Check if venv exists:**
   ```bash
   ls -la backend/venv
   ```

2. **If venv exists, use it directly:**
   ```bash
   # Start Django with venv Python
   cd backend
   venv/bin/python manage.py runserver 8000
   ```

3. **If no venv, create one:**
   ```bash
   cd backend
   python3 -m venv venv
   venv/bin/pip install -r requirements.txt
   venv/bin/python manage.py runserver 8000
   ```

**Automatic Fix:**
The `start-dev.sh` script automatically uses `backend/venv/bin/python` if it exists:
```bash
./start-dev.sh
# Will automatically use venv/bin/python
```

**Verification:**
```bash
# Check which Python is being used
backend/venv/bin/python --version

# Check if Django is installed
backend/venv/bin/python -c "import django; print(django.get_version())"
```

**Files affected:**
- `start-dev.sh` (lines 74-86) - Auto-detects and uses venv

---

### **ngrok Authentication Failed - "authtoken does not look like a proper ngrok authtoken"**

**Symptoms:**
- ngrok won't start
- Error: `authentication failed: The authtoken you specified does not look like a proper ngrok authtoken`
- Error: `ERR_NGROK_105`
- Tunnel not appearing in `./status-dev.sh`

**Root Cause:**
- ngrok authtoken is invalid, expired, or corrupted
- Token may have been truncated when copied
- Token format changed (newer tokens are ~40+ characters)

**Solution:**

1. **Get fresh token from ngrok dashboard:**
   - Visit: https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy the ENTIRE token (make sure it's not truncated)

2. **Reconfigure ngrok:**
   ```bash
   ngrok config add-authtoken YOUR_FULL_TOKEN_HERE
   ```

3. **Verify configuration:**
   ```bash
   ngrok config check
   # Should show: Valid configuration file
   ```

4. **Test tunnel:**
   ```bash
   ngrok http 8000
   # Should start successfully
   # Press Ctrl+C to stop
   ```

5. **Start with permanent domain:**
   ```bash
   ngrok http --domain=ignacio-interposable-uniformly.ngrok-free.dev 8000
   ```

**Configuration Location:**
- Config file: `~/Library/Application Support/ngrok/ngrok.yml` (macOS)
- Config file: `~/.config/ngrok/ngrok.yml` (Linux)

**Common Mistakes:**
- ❌ Token truncated when copying (ensure full 40+ character token)
- ❌ Using old token after regenerating in dashboard
- ❌ Spaces or newlines in token
- ❌ Putting token in `.env` file instead of using `ngrok config add-authtoken`

**Verification:**
```bash
# Check token is saved
cat ~/Library/Application\ Support/ngrok/ngrok.yml
# Should show: authtoken: YOUR_TOKEN

# Test tunnel
curl -s http://localhost:4040/api/tunnels
# Should return JSON with tunnel info (after starting ngrok)
```

**Note:** ngrok authtoken goes in ngrok's config file, NOT in your project's `.env` file.

---

## 🔐 **HTTPS / Certificate Issues**

### **Browser Shows "This Connection Is Not Private" or Certificate Warning**

**Symptoms:**
- Safari: "This Connection Is Not Private"
- Chrome: "Your connection is not private"
- Firefox: "Warning: Potential Security Risk Ahead"
- Accessing https://localhost:3000 or https://localhost:8000

**Root Cause:**
The app uses self-signed SSL certificates for local development. This is **normal and expected**.

**Why HTTPS is Required:**
- Google OAuth requires HTTPS callback URLs
- Xero OAuth requires HTTPS redirect URLs
- SMS webhooks via ngrok tunnel to HTTPS backend
- Browser security features require secure connections

**Solution:**

1. **Safari:**
   - Click **"Show Details"**
   - Click **"visit this website"**
   - Click **"Visit Website"** again to confirm

2. **Chrome:**
   - Click **"Advanced"**
   - Click **"Proceed to localhost (unsafe)"**

3. **Firefox:**
   - Click **"Advanced"**
   - Click **"Accept the Risk and Continue"**

**Note:** You only need to accept the certificate once per browser session.

**Verification:**
```bash
# Check services are running with HTTPS
./status-dev.sh

# Should show:
# ✅ Django Backend (Port 8000 HTTPS): Running
# ✅ Next.js Frontend (Port 3000 HTTPS): Running
```

**Certificate Locations:**
- Django: `backend/cert.pem` and `backend/key.pem`
- Next.js: `frontend/localhost+2.pem` and `frontend/localhost+2-key.pem`

---

### **"Cannot GET /" or Blank Page After Accepting Certificate**

**Symptoms:**
- Accepted certificate warning but page is blank
- Browser shows "Cannot GET /"
- No content loads

**Root Cause:**
Next.js or Django not running properly with HTTPS.

**Solution:**

1. **Check both services are running:**
   ```bash
   ./status-dev.sh
   ```

2. **Check logs for errors:**
   ```bash
   tail -50 logs/django.log
   tail -50 logs/nextjs.log
   tail -50 logs/nextjs-ssl.log
   ```

3. **Verify SSL proxy is running:**
   ```bash
   ps aux | grep local-ssl-proxy
   # Should see process on ports 3000 → 3001
   ```

4. **Restart services:**
   ```bash
   ./restart-dev.sh
   ```

---

### **SSL Proxy Not Starting (Next.js)**

**Symptoms:**
- Port 3000 not responding
- Error: "local-ssl-proxy" command not found
- Frontend accessible on http://localhost:3001 but not https://localhost:3000

**Root Cause:**
SSL proxy process not started or crashed.

**Solution:**

1. **Check if SSL proxy is running:**
   ```bash
   lsof -i :3000
   # Should show local-ssl-proxy process
   ```

2. **Check SSL proxy logs:**
   ```bash
   tail -f logs/nextjs-ssl.log
   ```

3. **Verify certificates exist:**
   ```bash
   ls -la frontend/localhost+2*.pem
   # Should show:
   # localhost+2.pem
   # localhost+2-key.pem
   ```

4. **Manually start SSL proxy:**
   ```bash
   cd frontend
   npx local-ssl-proxy --source 3000 --target 3001 \
     --cert localhost+2.pem --key localhost+2-key.pem
   ```

---

### **Django "runserver_plus: command not found"**

**Symptoms:**
- Django won't start with HTTPS
- Error: `Unknown command: 'runserver_plus'`
- Error: `django-extensions not installed`

**Root Cause:**
`django-extensions` package not installed in virtual environment.

**Solution:**

1. **Check if installed:**
   ```bash
   cd backend
   venv/bin/pip list | grep django-extensions
   ```

2. **Install if missing:**
   ```bash
   venv/bin/pip install django-extensions
   ```

3. **Verify in settings:**
   ```bash
   grep django_extensions backend/ncc_api/settings.py
   # Should see: 'django_extensions', in INSTALLED_APPS
   ```

4. **Restart Django:**
   ```bash
   ./restart-dev.sh
   ```

---

## 📱 MMS Issues

### **MMS Not Sending - 414 Request-URI Too Large Error**

**Symptoms:**
- MMS with image fails to send
- Error in Django logs: `414 Client Error: Request-URI Too Large`
- SMS works fine, but MMS fails
- System shows "sent" but message never arrives

**Root Cause:**
Base64-encoded image data was being sent as URL query parameters (GET request), exceeding maximum URL length supported by SMS Broadcast API.

**Solution:**
✅ **Fixed in latest version** - MMS now uses POST request with data in request body.

**Verify Fix:**
```bash
cd backend
grep "requests.post(self.api_url, data=params" sms_integration/services.py
# Should see: response = requests.post(self.api_url, data=params, timeout=30)
```

**If you see old code:**
```bash
# Update the API call to use POST instead of GET
# Change: requests.get(self.api_url, params=params, timeout=30)
# To:     requests.post(self.api_url, data=params, timeout=30)
```

**Test MMS:**
1. Upload image in SMS dialog (drag & drop or click photo icon)
2. Send MMS
3. Check Django logs: `tail -f logs/django.log`
4. Look for: `[SMS Service] Sending MMS with base64 encoded media`

---

### **Startup Scripts Hanging**

**Symptoms:**
- `./restart-dev.sh` never completes
- Terminal hangs after starting services
- Can't get control back after restart

**Root Cause:**
`restart-dev.sh` was calling `start-dev.sh` which has an infinite monitoring loop, causing the script to never return.

**Solution:**
✅ **Fixed in latest version** - Scripts now run in background.

**Use Quick Start (Recommended):**
```bash
./quick-start.sh
# Starts all services and returns immediately
# Services run in background
```

**Or Use Restart:**
```bash
./restart-dev.sh
# Now completes in ~8 seconds
# Starts services in background with nohup
```

**Check Status:**
```bash
./status-dev.sh
# Verify all services are running
```

**Scripts Available:**
- `./quick-start.sh` - Fast start, returns immediately (recommended for daily use)
- `./start-dev.sh` - Interactive monitoring (use for debugging)
- `./restart-dev.sh` - Stop and restart in background
- `./stop-dev.sh` - Stop all services
- `./status-dev.sh` - Check what's running

---

**Last Updated:** 2025-11-08

**IMPORTANT:** If this troubleshooting guide is updated, you MUST also update the project rules at `.cursor/rules/projectrules.mdc` to keep them synchronized.

