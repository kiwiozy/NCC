# Quick Start Guide

**Last Updated:** November 2025

---

## 🚀 **Start the Application**

### **1. Start Backend (Django)**
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate
./start-https.sh
```

**Expected output:**
```
🚀 Starting Django with HTTPS...
Backend:  https://localhost:8000
```

### **2. Start Frontend (Next.js)**
```bash
cd /Users/craig/Documents/nexus-core-clinic/frontend
npm run dev
```

**Expected output:**
```
✓ Ready in X.Xs
 ✓ Local:    http://localhost:3000
```

---

## 🌐 **Access the Application**

### **Frontend**
- **Login:** `http://localhost:3000/login` - Google OAuth authentication
- **Home:** `http://localhost:3000` (requires login)
- **Patients:** `http://localhost:3000/patients` (requires login)
- **Calendar:** `http://localhost:3000/calendar` (requires login)
- **Settings:** `http://localhost:3000/settings` (requires login)
- **Testing:** `http://localhost:3000/testing` (requires login)

### **Backend**
- **API Root:** `https://localhost:8000/api/`
- **Admin:** `https://localhost:8000/admin/`
  - Username: `admin`
  - Password: `admin123`
- **Auth Endpoints:**
  - `GET /api/auth/user/` - Check authentication status
  - `GET /api/auth/google/login/` - Google OAuth login
  - `GET /api/auth/logout/` - Logout

---

## ✅ **Production-Ready Features**

### **Core Features**
- ✅ **Google OAuth Authentication** - Seamless login with Google Workspace accounts
- ✅ Patient management (list, search, filter, archive)
- ✅ Contact management (multiple types: patients, referrers, coordinators, etc.)
- ✅ Multi-clinic calendar (FullCalendar with drag-and-drop)
- ✅ Settings management (funding sources, clinics)
- ✅ Notes system (clinical notes with AI rewrite)
- ✅ Documents system (S3 storage with Safari PDF support)
- ✅ Reminders system

### **Integrations** (see `docs/integrations/` for details)
- ✅ **Gmail** - OAuth2 email sending, multi-account support
- ✅ **Xero** - OAuth2 accounting integration, contact sync, invoicing
- ✅ **SMS** - SMS Broadcast API for patient messaging
- ✅ **S3** - AWS S3 document storage with presigned URLs
- ✅ **OpenAI** - GPT-4o-mini for PDF extraction and note rewriting

---

## 🛠 **Common Commands**

### **Backend**
```bash
cd backend
source venv/bin/activate

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Django shell
python manage.py shell

# Generate mock data
python manage.py generate_mock_contacts --count=50
```

### **Frontend**
```bash
cd frontend

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

---

## 📚 **Documentation**

### **Quick Links**
- **Authentication:** `docs/features/GOOGLE_AUTHENTICATION.md` - Google OAuth login setup
- **Architecture:** `docs/architecture/PAGES_INDEX.md`
- **Database Schema:** `docs/architecture/DATABASE_SCHEMA.md`
- **Troubleshooting:** `docs/architecture/TROUBLESHOOTING.md`
- **Integrations:** `docs/integrations/`
- **Setup Guides:** `docs/setup/`

### **Documentation Structure**
```
docs/
├── INDEX.md                      # Main entry point
├── architecture/                 # Current development work
│   ├── DATABASE_SCHEMA.md
│   ├── PAGES_INDEX.md
│   ├── TROUBLESHOOTING.md
│   ├── dialogs/                  # Dialog components
│   └── pages/                    # Page components
├── integrations/                 # Integration guides
│   ├── GMAIL.md
│   ├── XERO.md
│   ├── SMS.md
│   ├── S3.md
│   └── OPENAI.md
├── setup/                        # Setup & configuration
└── archive/                      # Historical documentation
```

---

## 🐛 **Troubleshooting**

### **Common Issues**

**Problem:** Patients not loading  
**Solution:** Check backend server is running (`lsof -ti:8000`)

**Problem:** CORS errors  
**Solution:** Restart Django server (CORS settings require restart)

**Problem:** PDF not displaying in Safari  
**Solution:** Automatic - uses backend proxy + IndexedDB cache

**Problem:** Console warnings from Mantine  
**Solution:** Cosmetic only - suppressed by `ConsoleFilter` component

See `docs/architecture/TROUBLESHOOTING.md` for full guide.

---

## 🎯 **Tech Stack**

### **Backend**
- Django 5.0+ (Python web framework)
- Django REST Framework (API)
- SQLite (development) / PostgreSQL (target production)
- Python 3.11+

### **Frontend**
- Next.js 15 (React framework)
- Mantine UI v7 (component library)
- FullCalendar (calendar component)
- Luxon (date/time library)

### **Integrations**
- AWS S3 (document storage)
- Gmail API (email sending)
- Xero API (accounting)
- SMS Broadcast API (messaging)
- OpenAI API (AI features)

---

## 📝 **Environment Variables**

Required environment variables (in `backend/.env`):

```bash
# Django
SECRET_KEY=your_secret_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Google OAuth (for authentication and Gmail)
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
# Optional: Encryption key for tokens (auto-generated if not set)
ENCRYPTION_KEY=your_encryption_key

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_STORAGE_BUCKET_NAME=walkeasy-nexus-documents
AWS_S3_REGION_NAME=ap-southeast-2

# Xero
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret

# SMS Broadcast
SMS_BROADCAST_USERNAME=your_username
SMS_BROADCAST_PASSWORD=your_password

# OpenAI
OPENAI_API_KEY=your_api_key
```

**Note:** Google OAuth credentials (`GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`) are used for both user authentication and Gmail integration.

**Note:** Never commit `.env` to git (already in `.gitignore`)

---

## 🚀 **What's Next?**

### **Current Work**
- Building out patient detail page
- Implementing orders/invoices
- Enhancing calendar features

### **Planned Features**
- Real-time updates (WebSockets)
- Patient portal
- Reports & analytics
- Mobile app

See `docs/architecture/TODO_LIST.md` for detailed roadmap.

---

**Need help?** Check the full documentation in `docs/` or see `docs/architecture/TROUBLESHOOTING.md`.

