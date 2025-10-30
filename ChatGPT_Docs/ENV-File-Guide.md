# 🔐 .env File Configuration Guide

## ⚠️ Security Warning

**AWS credentials MUST NOT be in frontend `.env` files!**

If your `.env` contains `VITE_AWS_ACCESS_KEY` or `VITE_AWS_SECRET_KEY`, these are **exposed in the browser bundle** and anyone can see them. Remove them immediately from any frontend `.env` files.

---

## 📁 Recommended Structure

### For This Project:

You'll need **separate .env files** for backend and frontend:

```
walkeasy-platform/
  backend/
    .env              # Server-side only (secure)
  frontend/
    .env.local        # Frontend config (safe to expose)
```

---

## 🔒 Backend .env (Django/DRF)

**Location:** `backend/.env`  
**Security:** Keep secret, never commit to git

```bash
# Database (will be added after Cloud SQL setup)
DATABASE_URL=postgresql://wep_app_user:PASSWORD@localhost:5432/wep_db
# Production: postgresql://user:pass@/wep_db?host=/cloudsql/referrer-map:australia-southeast1:INSTANCE

# AWS S3 (Server-side only!)
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=AKIA3W6HPEM2H5XE4I4G
AWS_SECRET_ACCESS_KEY=BABipZhQdqRvgjTOkpyWfgQprA1s7+bL2Q3hZBBVNz54
S3_BUCKET=wep-docs-dev

# FileMaker API
FM_BASE_URL=https://walkeasy.fmcloud.fm
FM_DB_NAME=WEP-DatabaseV2
FM_USERNAME=Craig
FM_PASSWORD=Marknet//2

# Django Settings
SECRET_KEY=YOUR_DJANGO_SECRET_KEY_GENERATE_NEW_ONE
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# GCP Project
GCP_PROJECT_ID=referrer-map
```

---

## 🌐 Frontend .env.local (Next.js)

**Location:** `frontend/.env.local`  
**Security:** Can be exposed (only public config here)

```bash
# Environment
NODE_ENV=development
NEXT_PUBLIC_ENV=development

# Frontend URL
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# Firebase Configuration (Same for SSO)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAC7KANdcxgcOcduw5zvQ-qViFIAczm1dc
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=referrer-map.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=referrer-map
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=referrer-map.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=474832619442
NEXT_PUBLIC_FIREBASE_APP_ID=1:474832619442:web:54cfeb71ac28579b1386ab

# API URLs (Backend endpoints)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
# Production: NEXT_PUBLIC_API_BASE_URL=https://api-v2-474832619442.australia-southeast1.run.app

# Google Maps (if needed)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAbvJRfviJRf7cMD-BhpzmMFZ2HfoqSPhMBd668

# Development Features
NEXT_PUBLIC_DEV_MODE=true
```

---

## ✅ Action Items

1. **Remove AWS credentials** from any frontend `.env` files
2. **Keep AWS credentials** only in backend `.env` (server-side)
3. **Add DATABASE_URL** after we set up PostgreSQL
4. **Create separate files** when we set up the project structure:
   - `backend/.env` (with secrets)
   - `frontend/.env.local` (public config only)

---

## 🔄 Current .env File

Your current `.env` file in `/Users/craig/Documents/1.Filemaker_Test/.env` is a **mixed file** that contains:
- ✅ FileMaker credentials (good)
- ✅ Firebase config (good for SSO)
- ⚠️ AWS credentials in `VITE_` variables (remove for security)
- ❌ Missing: `DATABASE_URL` (we'll add after DB setup)

**Recommendation:** Keep this file for now as a reference. When we create the project structure, we'll create the proper separated `.env` files.

---

## 📝 Notes

- **Frontend .env:** Only variables prefixed with `NEXT_PUBLIC_` or `VITE_` can be used in the browser
- **Backend .env:** All variables are server-side only and secure
- **Never commit:** Add `.env` and `.env.local` to `.gitignore`
- **Production:** Use GCP Secret Manager for production secrets (we'll set this up later)

