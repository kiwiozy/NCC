# 📚 WalkEasy Nexus - Documentation

Welcome to the WalkEasy Nexus documentation. This directory contains all project documentation.

---

## 📖 **Quick Links**

| Document | Description | Location |
|----------|-------------|----------|
| **[Project README](README.md)** | Project overview and quick start | `docs/` |
| **[Backend Guide](backend/QUICK_START.md)** | Django backend setup and usage | `docs/backend/` |
| **[Calendar Guide](frontend/CALENDAR_GUIDE.md)** | Calendar component documentation | `docs/frontend/` |
| **[Setup Checklist](../ChatGPT_Docs/Setup-Checklist.md)** | Complete setup progress tracker | `ChatGPT_Docs/` |

---

## 🗂️ **Documentation Structure**

```
nexus-core-clinic/
├── docs/                           # Project documentation (you are here)
│   ├── README.md                   # Main project README
│   ├── INDEX.md                    # This file
│   ├── backend/                    # Backend documentation
│   │   ├── QUICK_START.md          # Django quick start guide
│   │   ├── API.md                  # API documentation (to be created)
│   │   └── MODELS.md               # Database models reference (to be created)
│   ├── frontend/                   # Frontend documentation
│   │   ├── CALENDAR_GUIDE.md       # Calendar component guide
│   │   ├── COMPONENTS.md           # Component library (to be created)
│   │   └── STYLING.md              # Mantine/Tailwind guide (to be created)
│   └── setup/                      # Setup & deployment docs
│       ├── CODE_ORGANIZATION_STRATEGY.md  # ⭐ Protect code from overwrites
│       ├── CURSOR_SAFETY_GUIDE.md         # ⭐ Cursor AI safety tips
│       ├── TIMEZONE_CONFIGURATION.md      # Timezone setup
│       ├── INFRASTRUCTURE_MIGRATION_GUIDE.md  # ✅ Infrastructure migration (completed)
│       ├── NEXT_STEPS.md           # Next steps for deployment
│       ├── DEVELOPMENT.md          # Local development setup (to be created)
│       ├── DEPLOYMENT.md           # Production deployment (to be created)
│       └── CLOUD_SQL.md            # Cloud SQL connection guide (to be created)
│
└── ChatGPT_Docs/                   # Detailed technical specifications
    ├── Setup-Checklist.md          # Complete setup progress
    ├── 00-Environment-Setup-Guide.md
    ├── 01-Architecture.md
    ├── 02-Target-Postgres-Schema.md
    ├── 03-Staging-and-Mapping.md
    ├── 04-Containers-Migration.md
    ├── 05-ETL-and-DBT.md
    ├── 07-Firestore-Read-Cache.md
    ├── Calendar_Spec_FullCalendar.md
    ├── ENV-File-Guide.md
    ├── Hosting_Decision_Guide.md
    ├── Mantine-UI-Setup-Guide.md
    ├── Recommended_Tech_Stack.md
    ├── S3_Integration.md
    ├── SMS_End_to_End_Integration.md
    └── Xero_Integration.md
```

---

## 🚀 **Getting Started**

### **For Development:**
1. Read **[Project README](README.md)** for overview
2. Follow **[Backend Quick Start](backend/QUICK_START.md)** to set up Django
3. Follow **[Calendar Guide](frontend/CALENDAR_GUIDE.md)** to understand the frontend

### **For Deployment:**
1. Review **[Infrastructure Migration Guide](setup/INFRASTRUCTURE_MIGRATION_GUIDE.md)** ✅ **Completed**
2. Check **[Setup Checklist](../ChatGPT_Docs/Setup-Checklist.md)** for infrastructure
3. Review **[Next Steps](setup/NEXT_STEPS.md)** for deployment
4. Check **[Architecture](../ChatGPT_Docs/01-Architecture.md)** for system design
5. Follow **[Hosting Decision Guide](../ChatGPT_Docs/Hosting_Decision_Guide.md)**

### **For Integrations:**
- **Xero:** See [Xero_Integration.md](../ChatGPT_Docs/Xero_Integration.md)
- **SMS:** See [SMS_End_to_End_Integration.md](../ChatGPT_Docs/SMS_End_to_End_Integration.md)
- **S3:** See [S3_Integration.md](../ChatGPT_Docs/S3_Integration.md)

---

## 📊 **Documentation Types**

### **1. Project Documentation** (`docs/`)
- User-facing documentation
- Quick start guides
- API references
- Component documentation
- Deployment guides

### **2. Technical Specifications** (`ChatGPT_Docs/`)
- Architecture decisions
- Database schema design
- Integration specifications
- Infrastructure setup
- Complete technical details

---

## 🎯 **Documentation Standards**

### **File Naming:**
- Use UPPERCASE for guide names: `QUICK_START.md`, `API.md`
- Use Title Case for spec names: `Calendar_Spec_FullCalendar.md`
- Use kebab-case for numbered guides: `01-Architecture.md`

### **Structure:**
- Start with emoji + title
- Include table of contents for long docs
- Use code blocks with language tags
- Include examples and screenshots where helpful
- Link to related documentation

### **Maintenance:**
- Update documentation with code changes
- Keep examples current
- Mark deprecated features
- Date significant updates

---

## 🔄 **Document Updates**

| Document | Last Updated | Status |
|----------|--------------|--------|
| Project README | Oct 30, 2025 | ✅ Current |
| Backend Quick Start | Oct 30, 2025 | ✅ Current |
| Calendar Guide | Oct 30, 2025 | ✅ Current |
| Setup Checklist | Oct 30, 2025 | ✅ Current |

---

## 📝 **Contributing to Documentation**

### **Adding New Documentation:**
1. Place in appropriate directory (`backend/`, `frontend/`, `setup/`)
2. Follow naming conventions
3. Update this INDEX.md
4. Link from relevant documents

### **Updating Existing Documentation:**
1. Make changes inline
2. Update "Last Updated" date
3. Note changes in git commit message

---

## 🔗 **External Resources**

### **Frameworks & Libraries:**
- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Mantine UI](https://mantine.dev/)
- [FullCalendar](https://fullcalendar.io/docs)

### **Cloud Services:**
- [Google Cloud Platform](https://cloud.google.com/docs)
- [Cloud SQL](https://cloud.google.com/sql/docs)
- [Cloud Run](https://cloud.google.com/run/docs)
- [AWS S3](https://docs.aws.amazon.com/s3/)

### **Integrations:**
- [Xero API](https://developer.xero.com/)
- [FileMaker Data API](https://help.claris.com/en/data-api-guide/)
- [SMS Broadcast API](https://www.smsbroadcast.com.au/api)

---

## 📞 **Support**

- **Technical Issues:** Check relevant documentation first
- **Questions:** craig@walkeasy.com.au
- **Updates:** Monitor Setup-Checklist.md for progress

---

**Last Updated:** November 4, 2025  
**Project:** WalkEasy Nexus - Patient Management System  
**Version:** 0.1.0 (Development)  
**Infrastructure:** ✅ Migrated to WalkEasy Nexus naming (GCP: walkeasy-nexus-dev, S3: walkeasy-nexus-documents)

