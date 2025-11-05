# Django CORS Configuration Fix

## Problem

Frontend requests to Django backend are being blocked with CORS errors:
```
Fetch API cannot load http://localhost:8000/api/notes/?patient_id=... due to access control checks.
Fetch API cannot load http://localhost:8000/api/documents/?patient_id=... due to access control checks.
```

## Current Configuration

The Django `settings.py` already has CORS configured correctly:

```python
# CORS settings - allow frontend to access API
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
    "https://localhost:8000",
    "https://127.0.0.1:8000",
]

CORS_ALLOW_CREDENTIALS = True
```

And the middleware is correctly positioned:
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # Must be before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    # ... rest of middleware
]
```

## Solution

### 1. Restart Django Server

**Critical:** Django CORS settings require a server restart to take effect.

```bash
# Stop the current Django server (Ctrl+C)
# Then restart it:
cd backend
python manage.py runserver
```

### 2. Verify CORS Middleware is Installed

Ensure `django-cors-headers` is installed:

```bash
cd backend
pip list | grep django-cors-headers
```

If not installed:
```bash
pip install django-cors-headers
```

### 3. Verify Settings are Loaded

Check that Django is reading the correct settings:

```bash
cd backend
python manage.py shell
>>> from django.conf import settings
>>> settings.CORS_ALLOWED_ORIGINS
['http://localhost:3000', 'http://127.0.0.1:3000', ...]
```

### 4. Test CORS Headers

After restarting, test that CORS headers are being sent:

```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:8000/api/notes/ \
     -v
```

You should see:
```
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: http://localhost:3000
< Access-Control-Allow-Methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT
< Access-Control-Allow-Credentials: true
```

## Common Issues

### Issue 1: Server Not Restarted
**Symptom:** CORS errors persist after configuration
**Solution:** Restart Django server

### Issue 2: Middleware Order Wrong
**Symptom:** CORS headers not sent
**Solution:** Ensure `CorsMiddleware` is **before** `CommonMiddleware`

### Issue 3: Missing Package
**Symptom:** `ModuleNotFoundError: No module named 'corsheaders'`
**Solution:** `pip install django-cors-headers`

### Issue 4: Port Mismatch
**Symptom:** Frontend on different port than configured
**Solution:** Add the correct port to `CORS_ALLOWED_ORIGINS`

## Verification Steps

1. ✅ Restart Django server
2. ✅ Check browser console - CORS errors should be gone
3. ✅ Test API calls from frontend - should work
4. ✅ Check Network tab - should see `Access-Control-Allow-Origin` header

## Notes

- CORS settings are in `backend/ncc_api/settings.py`
- Changes require server restart
- Configuration is correct - issue is likely server restart needed
- For production, replace `localhost` origins with actual domain

