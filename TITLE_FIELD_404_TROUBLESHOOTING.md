# 🔧 TITLE FIELD 404 ERROR - TROUBLESHOOTING GUIDE

**Error:** `404 (Not Found)` when saving title field  
**Date:** November 20, 2025  
**Status:** 🔍 **DEBUGGING**

---

## 🔴 The Error

```
Error: Failed to save title
PATCH https://localhost:8000/api/patients/{id}/
Status: 404 Not Found
```

---

## 🔍 POSSIBLE CAUSES

### 1. **Django Server Not Running** ⭐ MOST LIKELY
**Check:**
```bash
# Check if Django is running
ps aux | grep python | grep runserver

# Or check the status script
./status-dev.sh
```

**Fix:**
```bash
# Start Django
cd backend
source venv/bin/activate
python manage.py runserver_plus --cert-file ../cert.pem --key-file ../key.pem 0.0.0.0:8000
```

---

### 2. **Invalid Patient ID (UUID)**
**Check:** The patient ID might not be a valid UUID or might not exist in the database.

**Debug:** I've added logging - check browser console for:
```
🔄 Saving title: { value, url, patientId }
```

**Verify patient exists:**
```bash
cd backend
source venv/bin/activate
python manage.py shell

from patients.models import Patient
# Replace with actual ID from error
patient = Patient.objects.get(id='YOUR-UUID-HERE')
print(patient)
```

---

### 3. **URL Routing Issue**
**Check:** The API endpoint might not be registered correctly.

**Verify:**
```bash
cd backend
source venv/bin/activate
python manage.py show_urls | grep patients
```

**Expected output:**
```
/api/patients/                              GET,HEAD,POST
/api/patients/<uuid:pk>/                    GET,HEAD,PUT,PATCH,DELETE
/api/patients/<uuid:pk>/archive/            PATCH
/api/patients/<uuid:pk>/restore/            PATCH
```

---

### 4. **HTTPS Certificate Issue**
**Check:** Browser might be blocking the request due to self-signed certificate.

**Debug:**
- Open browser console (F12)
- Look for certificate warnings
- Check if you've accepted the certificate for https://localhost:8000

**Fix:**
1. Navigate directly to https://localhost:8000/api/patients/
2. Accept the certificate warning
3. Try the frontend again

---

### 5. **CORS or Authentication Issue**
**Check:** The request might be blocked by CORS or auth middleware.

**Debug:** Check browser Network tab for:
- CORS errors
- 403 Forbidden (auth issue)
- 404 Not Found (routing issue)

**Verify Django settings:**
```python
# backend/ncc_api/settings.py
CORS_ALLOWED_ORIGINS = [
    "https://localhost:3000",
    "https://localhost:8000",
]
CORS_ALLOW_CREDENTIALS = True
```

---

## 🐛 DEBUGGING STEPS

### Step 1: Check Django Server
```bash
./status-dev.sh
```

**Expected:** Django should be running on port 8000

### Step 2: Test API Directly
```bash
# Get a patient ID from the database
cd backend
source venv/bin/activate
python manage.py shell

from patients.models import Patient
patient = Patient.objects.first()
print(f"Patient ID: {patient.id}")
print(f"Patient Name: {patient.get_full_name()}")
exit()
```

**Test with curl:**
```bash
# Replace YOUR-PATIENT-UUID with actual UUID
curl -X GET \
  "https://localhost:8000/api/patients/YOUR-PATIENT-UUID/" \
  -H "Content-Type: application/json" \
  --insecure

# Should return patient JSON
```

### Step 3: Test PATCH Request
```bash
# Get CSRF token first (via browser or script)
# Then test PATCH
curl -X PATCH \
  "https://localhost:8000/api/patients/YOUR-PATIENT-UUID/" \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: YOUR-CSRF-TOKEN" \
  -H "Cookie: csrftoken=YOUR-CSRF-TOKEN; sessionid=YOUR-SESSION-ID" \
  -d '{"title": "Dr."}' \
  --insecure

# Should return updated patient JSON
```

### Step 4: Check Browser Console
With the improved logging, you should now see:
```
🔄 Saving title: { value: "Dr.", url: "https://localhost:8000/api/patients/...", patientId: "..." }
📥 Response: { status: 404, statusText: "Not Found" }
❌ Save failed: { status: 404, error: "..." }
```

This will tell us:
1. The exact URL being called
2. The patient ID being used
3. The response status and error message

---

## ✅ QUICK FIX (Most Common Issue)

**If Django is not running:**

```bash
# Terminal 1 - Start Django
cd /Users/craig/Documents/nexus-core-clinic
./start-dev.sh

# Wait for message: "Django development server is running at https://localhost:8000"
```

**Then try again in the browser.**

---

## 📝 WHAT I CHANGED

I added better logging to the Title field save handler:

```typescript
// Before
const response = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/`, ...);

// After
const url = `https://localhost:8000/api/patients/${selectedContact.id}/`;
console.log('🔄 Saving title:', { value, url, patientId: selectedContact.id });
const response = await fetch(url, ...);
console.log('📥 Response:', { status: response.status, statusText: response.statusText });
```

Now when you try to save the title, check the browser console for detailed debugging info.

---

## 🎯 NEXT STEPS

1. **Check if Django is running** (most likely issue)
2. **Look at browser console** for new debug logs
3. **Check the exact URL and patient ID** from logs
4. **Test the API directly** with curl to isolate frontend vs backend
5. **Report back** with the console output

---

## 📞 WHAT TO CHECK

When you try to change the title, open browser console (F12) and look for:

```
🔄 Saving title: { ... }   ← This shows what's being sent
📥 Response: { ... }        ← This shows what came back
```

Share this output and I can help further!

---

**Most Likely Solution:** Start the Django server with `./start-dev.sh` and try again.

