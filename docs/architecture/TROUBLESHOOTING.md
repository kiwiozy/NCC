# 🔧 Troubleshooting Guide

**Common issues and solutions for WalkEasy Nexus development**

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

**Last Updated:** November 4, 2025

