# 📚 WalkEasy Nexus - Documentation Index

**Complete documentation for all systems and integrations**

---

## 📁 Documentation Structure

```
docs/
├── README.md                      # This file - documentation index
│
├── 🔐 features/                   # Feature documentation
│   └── GOOGLE_AUTHENTICATION.md  # Google OAuth authentication system
│
├── ✉️ Letter/                     # Patient Letters system
│   ├── PATIENT_LETTERS_COMPLETE.md      # Complete letter system guide ⭐ NEW
│   ├── PATIENT_LETTERS_QUICK_REFERENCE.md # Quick reference
│   └── SAFARI_PRINT_IMPLEMENTATION.md   # Safari-compatible printing
│
├── 📧 Email/                      # Email system documentation
│   ├── README.md                  # Email system overview
│   ├── GMAIL_QUICK_REFERENCE.md   # Quick start guide (⭐ Start here!)
│   ├── GMAIL_INTEGRATION_GUIDE.md # Complete Gmail OAuth2 setup
│   ├── GMAIL_INTEGRATION_COMPLETE.md # Gmail deliverables overview
│   ├── EMAIL_SETUP_GUIDE.md       # SMTP fallback configuration
│   └── EMAIL_SYSTEM_COMPLETE.md   # Complete email features
│
├── 📋 AT Report/                  # NDIS AT Assessment Reports
│   ├── Images/                    # Template page screenshots
│   ├── PDF_GENERATION_GUIDE.md
│   ├── PDF_GENERATION_COMPLETE.md
│   ├── AT_REPORT_GUIDE.md
│   ├── AT_REPORT_MAPPING.md
│   ├── NDIS_Menu_Large.jpg        # NDIS logo for PDFs
│   └── PB AT general template DOCX-2.docx
│
├── 💾 backend/                    # Backend documentation
│   ├── QUICK_START.md             # Backend quick start guide
│   └── API_OVERVIEW.md
│
├── 🎨 frontend/                   # Frontend documentation
│   ├── COMPONENTS_GUIDE.md
│   └── SETUP.md
│
├── 🔷 Xero Integration/           # Accounting integration
│   ├── XERO_SETUP_GUIDE.md
│   └── XERO_OAUTH_FLOW.md
│
├── 📱 SMS Integration/            # SMS messaging
│   ├── SMS_SETUP_GUIDE.md
│   └── TWILIO_CONFIGURATION.md
│
├── ☁️ S3 Integration/             # AWS S3 document storage
│   ├── S3_SETUP_GUIDE.md
│   └── S3_BUCKET_CONFIGURATION.md
│
├── 🤖 OpenAI Integration/         # AI services
│   ├── OPENAI_SETUP_GUIDE.md
│   └── AI_SERVICES_OVERVIEW.md
│
├── 📊 FileMaker/                  # FileMaker integration
│   └── FILEMAKER_GUIDE.md
│
└── 🛠️ setup/                      # Initial setup guides
    └── INITIAL_SETUP.md
```

---

## 🚀 Quick Start Guides

### **Start Here (New Users)**

1. **[backend/QUICK_START.md](backend/QUICK_START.md)** - Backend setup and overview
2. **[features/GOOGLE_AUTHENTICATION.md](features/GOOGLE_AUTHENTICATION.md)** - Google OAuth login setup (5 minutes)
3. **[Email/GMAIL_QUICK_REFERENCE.md](Email/GMAIL_QUICK_REFERENCE.md)** - Email system (5 minutes)
4. **[AT Report/AT_REPORT_GUIDE.md](AT Report/AT_REPORT_GUIDE.md)** - AT Reports overview

### **By Feature**

| Feature | Quick Start Guide | Time |
|---------|-------------------|------|
| 🔐 **Authentication** | [features/GOOGLE_AUTHENTICATION.md](features/GOOGLE_AUTHENTICATION.md) | 5 min |
| ✉️ **Patient Letters** | [Letter/PATIENT_LETTERS_QUICK_REFERENCE.md](Letter/PATIENT_LETTERS_QUICK_REFERENCE.md) | 5 min |
| 📧 **Email (Gmail)** | [Email/GMAIL_QUICK_REFERENCE.md](Email/GMAIL_QUICK_REFERENCE.md) | 5 min |
| 📋 **AT Reports** | [AT Report/AT_REPORT_GUIDE.md](AT Report/AT_REPORT_GUIDE.md) | 10 min |
| 🔷 **Xero Invoicing** | [Xero Integration/XERO_SETUP_GUIDE.md](Xero Integration/XERO_SETUP_GUIDE.md) | 15 min |
| 📱 **SMS Messages** | [SMS Integration/SMS_SETUP_GUIDE.md](SMS Integration/SMS_SETUP_GUIDE.md) | 10 min |
| ☁️ **S3 Storage** | [S3 Integration/S3_SETUP_GUIDE.md](S3 Integration/S3_SETUP_GUIDE.md) | 15 min |
| 🤖 **AI Services** | [OpenAI Integration/OPENAI_SETUP_GUIDE.md](OpenAI Integration/OPENAI_SETUP_GUIDE.md) | 5 min |

---

## ✉️ Patient Letters System (NEW! ✨)

### **Complete Letter Management**

Full-featured WYSIWYG letter editor with PDF generation, multi-page support, and Safari-compatible printing.

### **Documentation**

- **Quick Start:** [Letter/PATIENT_LETTERS_QUICK_REFERENCE.md](Letter/PATIENT_LETTERS_QUICK_REFERENCE.md) ⚡
- **Complete Guide:** [Letter/PATIENT_LETTERS_COMPLETE.md](Letter/PATIENT_LETTERS_COMPLETE.md) 📖
- **Safari Printing:** [Letter/SAFARI_PRINT_IMPLEMENTATION.md](Letter/SAFARI_PRINT_IMPLEMENTATION.md) 🖨️

### **Features**
✅ Full TipTap WYSIWYG editor  
✅ Multi-page support (add/remove pages)  
✅ Rich text formatting (fonts, colors, lists, alignment)  
✅ PDF preview, download, and print  
✅ Safari-compatible printing (new tab + ⌘+P)  
✅ Chrome/Firefox auto-print dialog  
✅ Unsaved changes detection  
✅ Walk Easy letterhead (25% opacity)  
✅ Badge count on patient menu  
✅ Dynamic PDF filename: `PatientName_LetterName.pdf`  

### **Access**
- Patient Menu → Letters (hamburger icon)
- 20/80 split: Letter list (left) / Editor (right)
- Manual save with "Saved at HH:MM:SS" indicator

---

## 📧 Email System (NEW! ✨)

### **Two Email Systems Available**

1. **Gmail API (Primary)** - OAuth2, better deliverability ⭐ **RECOMMENDED**
2. **SMTP (Fallback)** - Traditional SMTP with app passwords

### **Documentation**

- **Quick Start:** [Email/GMAIL_QUICK_REFERENCE.md](Email/GMAIL_QUICK_REFERENCE.md) ⚡
- **Complete Guide:** [Email/GMAIL_INTEGRATION_GUIDE.md](Email/GMAIL_INTEGRATION_GUIDE.md) 📖
- **SMTP Setup:** [Email/EMAIL_SETUP_GUIDE.md](Email/EMAIL_SETUP_GUIDE.md) 🔧
- **Overview:** [Email/README.md](Email/README.md) 📚

### **Features**
✅ OAuth2 authentication (no passwords)  
✅ Email templates  
✅ Complete email logging  
✅ Beautiful UI in Settings → Gmail  
✅ Automatic SMTP fallback  
✅ AT Report integration  

---

## 📋 AT Report System

### **NDIS AT Assessment Reports**

Complete system for creating and managing NDIS Assistive Technology Assessment Reports.

### **Documentation**

- **Guide:** [AT Report/AT_REPORT_GUIDE.md](AT Report/AT_REPORT_GUIDE.md)
- **Mapping:** [AT Report/AT_REPORT_MAPPING.md](AT Report/AT_REPORT_MAPPING.md)
- **PDF Generation:** [AT Report/PDF_GENERATION_GUIDE.md](AT Report/PDF_GENERATION_GUIDE.md)
- **Complete:** [AT Report/PDF_GENERATION_COMPLETE.md](AT Report/PDF_GENERATION_COMPLETE.md)

### **Features**
✅ 5-step form with stepper navigation  
✅ PDF import with AI data extraction  
✅ Dynamic NDIS-branded PDF generation  
✅ Email sending with Gmail API  
✅ Local storage for drafts  
✅ AI-powered clinical note enhancement  

---

## 🔷 Xero Integration

### **Accounting & Invoicing**

Automated invoicing and contact synchronization with Xero.

### **Documentation**

- **Setup:** [Xero Integration/XERO_SETUP_GUIDE.md](Xero Integration/XERO_SETUP_GUIDE.md)
- **OAuth Flow:** [Xero Integration/XERO_OAUTH_FLOW.md](Xero Integration/XERO_OAUTH_FLOW.md)

### **Features**
✅ OAuth2 connection to Xero  
✅ Automatic contact sync  
✅ Invoice creation from appointments  
✅ Payment tracking  
✅ Multi-clinic tracking categories  

---

## 📱 SMS Integration

### **SMS Messaging via Twilio**

Send SMS messages to patients for appointments, reminders, and notifications.

### **Documentation**

- **Setup:** [SMS Integration/SMS_SETUP_GUIDE.md](SMS Integration/SMS_SETUP_GUIDE.md)
- **Twilio Config:** [SMS Integration/TWILIO_CONFIGURATION.md](SMS Integration/TWILIO_CONFIGURATION.md)

### **Features**
✅ Twilio integration  
✅ SMS templates  
✅ Message history  
✅ Delivery status tracking  
✅ Character counter (160 SMS limit)  

---

## ☁️ S3 Integration

### **AWS S3 Document Storage**

Secure cloud storage for patient documents, reports, and files.

### **Documentation**

- **Setup:** [S3 Integration/S3_SETUP_GUIDE.md](S3 Integration/S3_SETUP_GUIDE.md)
- **Bucket Config:** [S3 Integration/S3_BUCKET_CONFIGURATION.md](S3 Integration/S3_BUCKET_CONFIGURATION.md)

### **Features**
✅ AWS S3 bucket integration  
✅ Secure file upload  
✅ Patient-specific folders  
✅ Batch upload (up to 20 files)  
✅ Pre-signed URLs for security  

---

## 🤖 OpenAI Integration

### **AI-Powered Services**

AI services for clinical note enhancement, PDF data extraction, and more.

### **Documentation**

- **Setup:** [OpenAI Integration/OPENAI_SETUP_GUIDE.md](OpenAI Integration/OPENAI_SETUP_GUIDE.md)
- **Services:** [OpenAI Integration/AI_SERVICES_OVERVIEW.md](OpenAI Integration/AI_SERVICES_OVERVIEW.md)

### **Features**
✅ Clinical note rewriting (GPT-4o-mini)  
✅ PDF data extraction for AT Reports  
✅ NDIS-compliant formatting  
✅ Custom prompts for refinement  

---

## 💾 Backend

### **Django REST API**

Complete backend API with Django 4.2 and Django REST Framework.

### **Documentation**

- **Quick Start:** [backend/QUICK_START.md](backend/QUICK_START.md) ⚡
- **API Overview:** [backend/API_OVERVIEW.md](backend/API_OVERVIEW.md)

### **Tech Stack**
- Django 4.2
- Django REST Framework
- SQLite (development)
- Python 3.9+
- Virtual environment (venv)

---

## 🎨 Frontend

### **Next.js 15 + TypeScript + Mantine UI**

Modern React frontend with server components.

### **Documentation**

- **Setup:** [frontend/SETUP.md](frontend/SETUP.md)
- **Components:** [frontend/COMPONENTS_GUIDE.md](frontend/COMPONENTS_GUIDE.md)

### **Tech Stack**
- Next.js 15
- TypeScript
- Mantine UI v7
- React 18+
- TailwindCSS (optional)

---

## 📊 FileMaker Integration

### **FileMaker Database Integration**

Integration with existing FileMaker Pro databases.

### **Documentation**

- **Guide:** [FileMaker/FILEMAKER_GUIDE.md](FileMaker/FILEMAKER_GUIDE.md)

---

## 🛠️ System Architecture

### **Overview**

```
WalkEasy Nexus
│
├── Frontend (Next.js 15)
│   ├── Port: 3000
│   ├── Settings page with tabs
│   └── AT Report multi-step form
│
├── Backend (Django 4.2)
│   ├── Port: 8000
│   ├── REST API
│   └── Integrations:
│       ├── Gmail (OAuth2)
│       ├── Xero (OAuth2)
│       ├── Twilio (SMS)
│       ├── AWS S3
│       └── OpenAI
│
└── Database (SQLite)
    ├── Patients
    ├── Appointments
    ├── Clinicians
    ├── Gmail connections
    ├── Email logs
    └── Integration logs
```

---

## 🔗 Quick Links

### **Local Development**

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Django Admin:** http://localhost:8000/admin
- **API Docs:** http://localhost:8000/api/

### **Settings Page Tabs**

- **General** - General settings
- **Gmail** - Email integration ⭐ NEW!
- **Xero** - Accounting integration
- **SMS** - Messaging
- **S3** - Document storage
- **Notes** - AI note testing
- **AT Report** - Assessment reports

---

## 📞 Support & Resources

### **Documentation Folders**

- 📧 [Email/](Email/) - Email system (Gmail + SMTP)
- 📋 [AT Report/](AT%20Report/) - NDIS AT Reports
- 🔷 [Xero Integration/](Xero%20Integration/) - Accounting
- 📱 [SMS Integration/](SMS%20Integration/) - Messaging
- ☁️ [S3 Integration/](S3%20Integration/) - Storage
- 🤖 [OpenAI Integration/](OpenAI%20Integration/) - AI services
- 💾 [backend/](backend/) - Backend docs
- 🎨 [frontend/](frontend/) - Frontend docs

### **Common Tasks**

| Task | Documentation |
|------|---------------|
| Write patient letters | [Letter/PATIENT_LETTERS_QUICK_REFERENCE.md](Letter/PATIENT_LETTERS_QUICK_REFERENCE.md) |
| Send emails | [Email/GMAIL_QUICK_REFERENCE.md](Email/GMAIL_QUICK_REFERENCE.md) |
| Create AT Report | [AT Report/AT_REPORT_GUIDE.md](AT Report/AT_REPORT_GUIDE.md) |
| Connect Xero | [Xero Integration/XERO_SETUP_GUIDE.md](Xero Integration/XERO_SETUP_GUIDE.md) |
| Send SMS | [SMS Integration/SMS_SETUP_GUIDE.md](SMS Integration/SMS_SETUP_GUIDE.md) |
| Upload to S3 | [S3 Integration/S3_SETUP_GUIDE.md](S3 Integration/S3_SETUP_GUIDE.md) |
| Setup OpenAI | [OpenAI Integration/OPENAI_SETUP_GUIDE.md](OpenAI Integration/OPENAI_SETUP_GUIDE.md) |

---

## 🎉 Latest Updates

### **January 2025 - Patient Letters System** ✉️

✅ Full WYSIWYG letter editor with TipTap  
✅ Multi-page support (add/remove pages)  
✅ Rich text formatting (fonts, colors, lists, alignment)  
✅ PDF preview, download, and print  
✅ Safari-compatible printing (new tab method)  
✅ Chrome/Firefox auto-print dialog  
✅ Unsaved changes detection (metadata + content)  
✅ Badge count on patient menu  
✅ Dynamic PDF filenames: `PatientName_LetterName.pdf`  
✅ Walk Easy letterhead integration (25% opacity)  

**See:** [Letter/PATIENT_LETTERS_COMPLETE.md](Letter/PATIENT_LETTERS_COMPLETE.md)

### **January 2025 - Google OAuth Authentication** 🔐

✅ Seamless Google OAuth login (no intermediate page)  
✅ Automatic Gmail connection on login  
✅ Session-based authentication  
✅ Protected routes (redirects to login if not authenticated)  
✅ User menu with logout in Navigation  
✅ Single Sign-On (one login works across entire system)  

**See:** [features/GOOGLE_AUTHENTICATION.md](features/GOOGLE_AUTHENTICATION.md)

### **October 2025 - Navigation Improvements** 🧭

✅ Settings submenu with hover dropdown  
✅ Quick access to all 8 settings pages  
✅ Fixed SVG icon sizing issues  
✅ Improved hover effects on navigation  
✅ Consistent with Contacts submenu pattern  

**See:** [NAVIGATION_IMPROVEMENTS.md](NAVIGATION_IMPROVEMENTS.md)

### **October 2025 - Gmail Integration** ✨

✅ Full Gmail API integration with OAuth2  
✅ Multi-account support (connect multiple Gmail accounts)  
✅ Beautiful settings page UI  
✅ Email templates and logging  
✅ AT Report email integration  
✅ Professional HTML email signature  
✅ Automatic SMTP fallback  

**See:** [Email/GMAIL_INTEGRATION_COMPLETE.md](Email/GMAIL_INTEGRATION_COMPLETE.md)

---

## 🚀 Getting Started

### **New to WalkEasy Nexus?**

1. **Backend Setup:** [backend/QUICK_START.md](backend/QUICK_START.md)
2. **Frontend Setup:** [frontend/SETUP.md](frontend/SETUP.md)
3. **Authentication Setup:** [features/GOOGLE_AUTHENTICATION.md](features/GOOGLE_AUTHENTICATION.md) - Google OAuth login
4. **Email Setup:** [Email/GMAIL_QUICK_REFERENCE.md](Email/GMAIL_QUICK_REFERENCE.md)
5. **AT Reports:** [AT Report/AT_REPORT_GUIDE.md](AT Report/AT_REPORT_GUIDE.md)

### **Quick Commands**

```bash
# Start backend
cd backend && source venv/bin/activate && python manage.py runserver 8000

# Start frontend
cd frontend && npm run dev

# Access the app
open http://localhost:3000
# Login page: http://localhost:3000/login
```

---

**📚 All documentation is organized by feature in dedicated folders for easy navigation!** 🎉
