# 🔧 Troubleshooting Guide

**Common issues and solutions for WalkEasy Nexus development**

> ⚠️ **IMPORTANT:** If this troubleshooting guide is updated, you **MUST** also update the "Troubleshooting Reference" section in `.cursor/rules/projectrules.mdc` to keep them synchronized. The project rules file is used by Cursor AI to provide context-aware assistance, so both files must stay in sync.

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

**Last Updated:** 2025-11-06

**IMPORTANT:** If this troubleshooting guide is updated, you MUST also update the project rules at `.cursor/rules/projectrules.mdc` to keep them synchronized.

