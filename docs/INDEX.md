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
- [Project README](README.md) - Project overview
- [Troubleshooting](architecture/TROUBLESHOOTING.md) - Common issues

### **Architecture & Database**
- [Database Schema](architecture/DATABASE_SCHEMA.md) - All tables and relationships
- [Pages Index](architecture/PAGES_INDEX.md) - All pages and dialogs
- [Patients Page](architecture/pages/PatientsPage.md) - Main patient management page

### **Feature Documentation**
- [Communication Dialog](architecture/dialogs/CommunicationDialog.md) - Patient contact info
- [Coordinator Dialogs](architecture/dialogs/CoordinatorDialogs.md) - NDIS coordinators
- [Documents Dialog](architecture/dialogs/DocumentsDialog.md) - S3 document management
- [Notes Dialog](architecture/dialogs/NotesDialog.md) - Clinical notes with AI
- [Reminder Dialog](architecture/dialogs/ReminderDialog.md) - Patient reminders

### **Integrations** (Production-Ready ✅)
- [Gmail Integration](integrations/GMAIL.md) - OAuth2 email sending
- [Xero Integration](integrations/XERO.md) - Accounting API
- [SMS Integration](integrations/SMS.md) - SMS Broadcast messaging
- [S3 Integration](integrations/S3.md) - AWS document storage
- [OpenAI Integration](integrations/OPENAI.md) - AI-powered features

### **Setup & Configuration**
- [Code Organization Strategy](setup/CODE_ORGANIZATION_STRATEGY.md) - Protected files
- [Cursor Rules](setup/CURSOR_RULES.md) - AI assistant rules
- [Cursor Safety Guide](setup/CURSOR_SAFETY_GUIDE.md) - Prevent overwrites
- [Infrastructure Migration](setup/INFRASTRUCTURE_MIGRATION_GUIDE.md) - Naming changes
- [Timezone Configuration](setup/TIMEZONE_CONFIGURATION.md) - Australia/Sydney

---

## 🎯 **Key Features (Current State)**

### ✅ **Implemented**
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
