# 📚 WalkEasy Nexus - Documentation Index

**Last Updated:** November 2025  
**Project:** WalkEasy Nexus - Patient Management System

---

## 🚀 **Quick Start**

| Document | Description |
|----------|-------------|
| **[Quick Start Guide](QUICK_START.md)** | Start backend and frontend servers |
| **[Project README](README.md)** | Project overview and architecture |
| **[Troubleshooting](architecture/TROUBLESHOOTING.md)** | Common issues and solutions |

---

## 📁 **Documentation Structure**

```
docs/
├── INDEX.md                      # This file
├── README.md                     # Project overview
├── QUICK_START.md               # How to start the app
│
├── architecture/                 # ⭐ Current development work
│   ├── DATABASE_SCHEMA.md
│   ├── PAGES_INDEX.md
│   ├── TROUBLESHOOTING.md
│   ├── dialogs/                  # Dialog components
│   │   ├── CommunicationDialog.md
│   │   ├── CoordinatorDialogs.md
│   │   ├── DocumentsDialog.md
│   │   ├── NotesDialog.md
│   │   └── ReminderDialog.md
│   ├── pages/                    # Page components
│   │   └── PatientsPage.md
│   └── settings/
│       └── SETTINGS_REQUIREMENTS.md
│
├── features/                     # ⭐ Feature documentation
│   ├── CLINICS_CALENDAR_SYSTEM.md       # Clinics & calendar (in progress) ⭐ NEW
│   ├── CALENDAR_CLINICS_WORKFLOW_PLAN.md # Calendar workflow planning ⭐ NEW
│   ├── MARKETING_SECTION_UI_SUMMARY.md  # Marketing section (PinsV5 migration) ⭐ NEW
│   ├── PINSV5_TO_NEXUS_MIGRATION_PLAN.md # Email marketing migration plan ⭐ NEW
│   ├── SMS_NOTIFICATION_WIDGET_PLAN.md  # SMS notifications
│   └── MMS_SUPPORT_PLAN.md              # MMS research (deferred)
│
├── FileMaker/                    # ⭐ FileMaker data migration (2,845 patients imported ✅)
│   ├── README.md                        # FileMaker integration index
│   ├── API_TABLES_COMPLETE_OVERVIEW.md  # All 9 API tables documented ✅ NEW
│   ├── IMPORT_COMPLETE_GUIDE.md         # Complete import guide ✅
│   ├── PRODUCTION_IMPORT_SUCCESS.md     # Import success summary (2,845 patients) ✅
│   ├── ODATA_TABLE_ACCESS_SUCCESS.md    # OData troubleshooting & solution ✅
│   ├── SESSION_SUMMARY_2025-11-09.md    # Today's session summary ✅
│   ├── IMPORT_IMPROVEMENTS_TODO.md      # Next improvements checklist
│   ├── FILEMAKER_IMPORT_PLAN.md         # Planning document
│   ├── CONTACT_DETAILS_ANALYSIS.md      # Contact data structure
│   ├── CHATGPT_ODATA_SOLUTION.md        # OData best practices analysis
│   ├── CHATGPT_ODATA_ROOT_TABLE_ACCESS.md # OData research question
│   └── Test_FileMaker_Data_API.md       # API testing guide
│
├── research/                     # ⭐ Research & decisions
│   ├── README.md                         # Research index
│   ├── MMS_DECISION_DEFER.md            # MMS deferral decision
│   ├── MMS_BRANCH_SUMMARY.md            # Complete MMS investigation
│   ├── MMS_COMPARISON_FINAL.md          # Provider comparison
│   ├── MY_MMS_RESEARCH.md               # Detailed analysis
│   ├── MMS_RESEARCH_SUMMARY.md          # Initial findings
│   ├── MMS_IMPLEMENTATION_REVIEW.md     # Technical review
│   └── CHATGPT_QUESTION_*.md            # Research questions
│
├── integrations/                 # ⭐ Integration guides
│   ├── GMAIL.md                 # Gmail OAuth & email sending
│   ├── XERO.md                  # Xero OAuth & accounting
│   ├── SMS.md                   # SMS Broadcast messaging
│   ├── S3.md                    # AWS S3 document storage
│   └── OPENAI.md                # OpenAI GPT-4o-mini features
│
├── setup/                        # Setup & configuration
│   ├── CODE_ORGANIZATION_STRATEGY.md
│   ├── CURSOR_RULES.md
│   ├── CURSOR_RULES_QUICK_COPY.md
│   ├── CURSOR_SAFETY_GUIDE.md
│   ├── INFRASTRUCTURE_MIGRATION_GUIDE.md
│   ├── NEXT_STEPS.md
│   ├── TIMEZONE_CONFIGURATION.md
│   └── TROUBLESHOOTING_REPORT.md
│
└── archive/                      # Historical documentation
    ├── legacy-integrations/      # Old integration setup docs
    │   ├── Email/
    │   ├── SMS Integration/
    │   ├── Xero Integration/
    │   ├── S3 Integration/
    │   └── OpenAI Integration/
    ├── troubleshooting/          # Old troubleshooting docs
    ├── Letter/                   # Letter template development
    ├── AT Report/                # AT Report PDF generation
    ├── DOCUMENTATION_SUMMARY.md
    └── GIT_COMMIT_LOG.md
```

---

## 📖 **Documentation by Topic**

### **Getting Started**
- [Quick Start Guide](QUICK_START.md) - Start servers and access app
- [Google Authentication](features/GOOGLE_AUTHENTICATION.md) - OAuth login setup
- [Project README](README.md) - Project overview
- [Troubleshooting](architecture/TROUBLESHOOTING.md) - Common issues

### **Architecture & Database**
- [Database Schema](architecture/DATABASE_SCHEMA.md) - All tables and relationships
- [Pages Index](architecture/PAGES_INDEX.md) - All pages and dialogs
- [Patients Page](architecture/pages/PatientsPage.md) - Main patient management page

### **Feature Documentation**
- [Clinics & Calendar System](features/CLINICS_CALENDAR_SYSTEM.md) - Calendar, clinics, clinicians ⚠️ IN PROGRESS ⭐ NEW
- [Calendar Workflow Plan](features/CALENDAR_CLINICS_WORKFLOW_PLAN.md) - Calendar planning & requirements ⭐ NEW
- [Marketing Section](features/MARKETING_SECTION_UI_SUMMARY.md) - Email marketing for referrers ⭐ NEW
- [PinsV5 Migration Plan](features/PINSV5_TO_NEXUS_MIGRATION_PLAN.md) - Email campaigns migration strategy ⭐ NEW
- [SMS Notification Widget](features/SMS_NOTIFICATION_WIDGET_PLAN.md) - Real-time SMS notifications ✅ NEW
- [Communication Dialog](architecture/dialogs/CommunicationDialog.md) - Patient contact info
- [Coordinator Dialogs](architecture/dialogs/CoordinatorDialogs.md) - NDIS coordinators
- [Documents Dialog](architecture/dialogs/DocumentsDialog.md) - S3 document management
- [Notes Dialog](architecture/dialogs/NotesDialog.md) - Clinical notes with AI
- [Reminder Dialog](architecture/dialogs/ReminderDialog.md) - Patient reminders
- [Patient Letters](Letter/PATIENT_LETTERS_COMPLETE.md) - Letter management system ✅

### **Research & Decisions**
- [Research Index](research/README.md) - All research documentation
- [MMS Decision](research/MMS_DECISION_DEFER.md) - Why MMS was deferred
- [MMS Research](research/MMS_BRANCH_SUMMARY.md) - Complete MMS investigation

### **Integrations** (Production-Ready ✅)
- [Gmail Integration](integrations/GMAIL.md) - OAuth2 email sending
- [Xero Integration](integrations/XERO.md) - Accounting API
- [SMS Integration](integrations/SMS.md) - SMS Broadcast messaging
- [S3 Integration](integrations/S3.md) - AWS document storage
- [OpenAI Integration](integrations/OPENAI.md) - AI-powered features
- [FileMaker Migration](integrations/FILEMAKER.md) - OData data import (2,845 patients imported ✅)
  - [Contact Relationships Architecture](FileMaker/CONTACT_RELATIONSHIPS_ARCHITECTURE.md) - How we link contacts together ⭐ NEW

### **Setup & Configuration**
- [Code Organization Strategy](setup/CODE_ORGANIZATION_STRATEGY.md) - Protected files
- [Cursor Rules](setup/CURSOR_RULES.md) - AI assistant rules
- [Cursor Safety Guide](setup/CURSOR_SAFETY_GUIDE.md) - Prevent overwrites
- [Infrastructure Migration](setup/INFRASTRUCTURE_MIGRATION_GUIDE.md) - Naming changes
- [Timezone Configuration](setup/TIMEZONE_CONFIGURATION.md) - Australia/Sydney

---

## 🎯 **Key Features (Current State)**

### ✅ **Implemented**
- **Google OAuth Authentication** - Seamless login with Google Workspace accounts
- **Patient Letters System** - Full WYSIWYG editor with PDF generation and Safari-compatible printing ✅ NEW
- **Marketing Section** - Email campaigns for referrer outreach (Phase 1: Referrers, Phase 2: Patients) ⭐ NEW
- Patient management (list, search, filter, archive)
- Contact types (patients, referrers, coordinators, etc.)
- Multi-clinic calendar with drag-and-drop
- Settings management (funding sources, clinics)
- Notes system (with AI rewrite)
- Documents system (with Safari PDF support)
- Reminders system
- NDIS plan dates tracking
- Multiple coordinators per patient
- Communication management (phone, email, address)

### ⏳ **In Progress**
- Patient detail page
- Orders/invoices system
- Calendar enhancements
- Real-time updates

### 📅 **Planned**
- Patient portal
- Reports & analytics
- Mobile app
- Advanced scheduling

---

## 🛠 **Tech Stack**

### **Backend**
- Django 5.0+ with Django REST Framework
- SQLite (dev) / PostgreSQL (target production)
- Python 3.11+

### **Frontend**
- Next.js 15 (React)
- Mantine UI v7
- FullCalendar
- Luxon (dates)

### **Infrastructure**
- AWS S3 (documents)
- Google Cloud Platform (planned)
- IndexedDB (client-side caching)

### **APIs**
- Gmail API (email)
- Xero API (accounting)
- SMS Broadcast API (messaging)
- OpenAI API (AI features)
- FileMaker OData API (data migration) - 4 tables accessible ✅

---

## 📝 **Documentation Standards**

### **File Naming**
- Guides: `QUICK_START.md`, `TROUBLESHOOTING.md`
- Components: `PatientsPage.md`, `NotesDialog.md`
- Integrations: `GMAIL.md`, `XERO.md`

### **Structure**
- Start with title and last updated date
- Include table of contents for long docs
- Use code blocks with language tags
- Link to related documentation

### **Maintenance**
- Update docs with code changes
- Keep examples current
- Mark deprecated features
- Update "Last Updated" dates

---

## 🔗 **External Resources**

### **Frameworks**
- [Django](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Next.js](https://nextjs.org/docs)
- [Mantine UI](https://mantine.dev/)
- [FullCalendar](https://fullcalendar.io/docs)

### **Cloud & APIs**
- [Google Cloud Platform](https://cloud.google.com/docs)
- [AWS S3](https://docs.aws.amazon.com/s3/)
- [Gmail API](https://developers.google.com/gmail/api)
- [Xero API](https://developer.xero.com/)
- [SMS Broadcast API](https://www.smsbroadcast.com.au/api)
- [OpenAI API](https://platform.openai.com/docs)

---

## 🗂️ **Archive**

Historical documentation is preserved in `docs/archive/`:
- Legacy integration setup guides (detailed step-by-step)
- Old troubleshooting docs (superseded by consolidated guide)
- Letter template development history
- AT Report implementation history

---

## 📞 **Support**

- **Documentation Issues:** Check [Troubleshooting Guide](architecture/TROUBLESHOOTING.md)
- **Integration Help:** See `docs/integrations/` for specific guides
- **Contact:** craig@walkeasy.com.au

---

**Project Status:** Active Development  
**Infrastructure:** ✅ Migrated to WalkEasy Nexus (GCP: walkeasy-nexus-dev, S3: walkeasy-nexus-documents)
