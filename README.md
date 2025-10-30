# Nexus Core Clinic

Modern cloud-native patient management system for Walk Easy Pedorthics.

## 🚀 Quick Start

**Backend (Django):**
```bash
cd backend
source venv/bin/activate
python manage.py runserver
# Access: http://localhost:8000/admin
# Login: admin / admin123
```

**Frontend (Next.js):**
```bash
cd frontend
npm run dev
# Access: http://localhost:3000
```

## 📁 Project Structure

```
nexus-core-clinic/
├── backend/              # Django REST Framework API
│   ├── patients/         # Patient models & admin
│   ├── appointments/     # Appointment & encounter models
│   ├── clinicians/       # Clinic & clinician models
│   └── ncc_api/          # Django settings
├── frontend/             # Next.js + TypeScript + Mantine UI
│   ├── app/              # Next.js App Router
│   │   ├── components/   # React components (Calendar, etc.)
│   │   └── page.tsx      # Home page
│   └── node_modules/     # Dependencies
├── docs/                 # Project documentation
│   ├── INDEX.md          # Documentation index (start here!)
│   ├── backend/          # Backend guides
│   └── frontend/         # Frontend guides
├── ChatGPT_Docs/         # Technical specifications
│   ├── Setup-Checklist.md        # Complete setup progress ⭐
│   ├── 01-Architecture.md        # System architecture
│   ├── 02-Target-Postgres-Schema.md  # Database schema
│   └── [15+ specification files]
├── etl/                  # Data migration scripts
├── scripts/              # Utility scripts
└── terraform/            # Infrastructure as Code
```

## 📚 Documentation

### Quick Reference
- **[📖 Documentation Index](docs/INDEX.md)** - Complete documentation guide
- **[✅ Setup Checklist](ChatGPT_Docs/Setup-Checklist.md)** - Track setup progress
- **[💻 Backend Quick Start](docs/backend/QUICK_START.md)** - Django guide
- **[🎨 Calendar Guide](docs/frontend/CALENDAR_GUIDE.md)** - Calendar component

### Technical Specifications
All detailed specs are in **`ChatGPT_Docs/`**:
- Architecture & system design
- Database schemas & migrations
- Integration specs (Xero, SMS, S3)
- Infrastructure setup guides

## 🏗️ Tech Stack

- **Backend:** Django 4.2 + Django REST Framework + PostgreSQL
- **Frontend:** Next.js 15 + TypeScript + Mantine UI + FullCalendar
- **Cloud:** Google Cloud Platform (Cloud Run, Cloud SQL)
- **Storage:** AWS S3
- **Region:** Australia (Sydney)

## 📊 Current Status

- ✅ **Backend:** Django with 5 models (Patient, Clinic, Clinician, Appointment, Encounter)
- ✅ **Frontend:** Next.js with Mantine UI and FullCalendar
- ✅ **Calendar:** Multi-clinician scheduling with drag & drop
- ⏳ **Database:** Cloud SQL PostgreSQL provisioning
- 📈 **Progress:** ~65%

## 🎯 What's Working

- ✅ Django admin interface (http://localhost:8000/admin)
- ✅ Patient, Clinician, Appointment management
- ✅ Multi-clinician calendar (http://localhost:3000)
- ✅ Drag & drop appointment scheduling
- ✅ GCP infrastructure (project: nexus-core-clinic-dev)

## 🚀 Next Steps

1. **Connect Backend to Frontend** - Build REST API endpoints
2. **Connect to Cloud SQL** - Switch from SQLite to PostgreSQL
3. **Enable CORS** - Allow frontend to call backend
4. **Build Patient Management** - CRUD pages with Mantine UI
5. **Fix FileMaker API** - Enable Data API for migration

## 📝 License

Proprietary - Walk Easy Pty Ltd

---

**Everything you need is in this one folder!** 🎉
