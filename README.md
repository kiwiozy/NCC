# WalkEasy Nexus

Modern cloud-native patient management system for Walk Easy Pedorthics.

## 🚀 Quick Start

### ⭐ One-Command Startup (Recommended)

**Start all services (Django + Next.js + ngrok tunnel):**
```bash
./start-dev.sh
```

This starts:
- ✅ Django Backend (https://localhost:8000)
- ✅ Next.js Frontend (https://localhost:3000)
- ✅ ngrok Tunnel for SMS webhooks (permanent URL)

**⚠️ Note:** App requires HTTPS. Accept certificate warnings in browser on first access.

**Check status:**
```bash
./status-dev.sh
```

**Stop all services:**
```bash
./stop-dev.sh
# Or press Ctrl+C in the start-dev.sh terminal
```

📖 **[See DEV_SCRIPTS_README.md for full guide](DEV_SCRIPTS_README.md)**

---

### Manual Startup (Individual Services)

**Backend (Django):**
```bash
cd backend
venv/bin/python manage.py runserver_plus --cert-file cert.pem --key-file key.pem 0.0.0.0:8000
# Access: https://localhost:8000/admin
# Login: admin / admin123
```

**Frontend (Next.js):**
```bash
cd frontend
npm run dev -- -p 3001 &
npx local-ssl-proxy --source 3000 --target 3001 --cert localhost+2.pem --key localhost+2-key.pem
# Access: https://localhost:3000
```

**ngrok Tunnel (for SMS webhooks):**
```bash
./start-ngrok-tunnel.sh
# Permanent URL: https://ignacio-interposable-uniformly.ngrok-free.dev
```

**Note:** Manual startup requires accepting browser certificate warnings.

## 📁 Project Structure

```
nexus-core-clinic/
├── backend/              # Django REST Framework API
│   ├── patients/         # Patient models & admin
│   ├── appointments/     # Appointment & encounter models
│   ├── clinicians/       # Clinic & clinician models
│   ├── referrers/        # Referrer models (healthcare providers)
│   ├── coordinators/     # NDIS coordinators
│   ├── documents/        # S3 document storage
│   ├── sms_integration/  # SMS Broadcast integration
│   ├── gmail_integration/# Gmail OAuth & email
│   ├── xero_integration/ # Xero accounting API
│   ├── ai_services/      # OpenAI integration
│   └── ncc_api/          # Django settings
├── frontend/             # Next.js + TypeScript + Mantine UI
│   ├── app/              # Next.js App Router
│   │   ├── components/   # React components (Calendar, Navigation, etc.)
│   │   ├── marketing/    # Marketing section (email campaigns) ⭐ NEW
│   │   └── page.tsx      # Home page
│   └── node_modules/     # Dependencies
├── docs/                 # Project documentation
│   ├── INDEX.md          # Documentation index (start here!)
│   ├── features/         # Feature documentation
│   │   ├── MARKETING_SECTION_UI_SUMMARY.md   # Marketing section ⭐ NEW
│   │   └── PINSV5_TO_NEXUS_MIGRATION_PLAN.md # Email marketing plan ⭐ NEW
│   ├── integrations/     # Integration guides (Gmail, Xero, SMS, S3, OpenAI)
│   └── FileMaker/        # FileMaker migration (2,845 patients imported ✅)
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
- **[📧 Marketing Section](docs/features/MARKETING_SECTION_UI_SUMMARY.md)** - Email campaigns for referrers ⭐ NEW
- **[📊 PinsV5 Migration](docs/features/PINSV5_TO_NEXUS_MIGRATION_PLAN.md)** - Email marketing migration plan ⭐ NEW
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

- ✅ **Backend:** Django with 10+ models (Patient, Referrer, Coordinator, Clinic, Clinician, Appointment, etc.)
- ✅ **Frontend:** Next.js with Mantine UI, FullCalendar, and Marketing section
- ✅ **Calendar:** Multi-clinician scheduling with drag & drop
- ✅ **Integrations:** Gmail, Xero, SMS, S3, OpenAI (all production-ready)
- ✅ **Marketing:** Email campaigns UI (Phase 1: Referrers) ⭐ NEW
- ✅ **FileMaker Import:** 2,845 patients successfully imported
- ⏳ **Database:** SQLite (dev) → PostgreSQL (production pending)
- 📈 **Progress:** ~80%

## 🎯 What's Working

- ✅ Django admin interface (https://localhost:8000/admin)
- ✅ Patient, Referrer, Coordinator management
- ✅ Multi-clinician calendar (https://localhost:3000/calendar)
- ✅ Drag & drop appointment scheduling
- ✅ Marketing section for referrer campaigns (https://localhost:3000/marketing) ⭐ NEW
- ✅ Gmail, Xero, SMS, S3, OpenAI integrations
- ✅ SMS notification widget with real-time updates
- ✅ Document management with S3 storage
- ✅ Clinical notes with AI rewrite
- ✅ NDIS plan tracking
- ✅ Google OAuth authentication

## 🚀 Next Steps

1. **Marketing Backend** - Build Django models for campaigns, templates, analytics
2. **Listmonk Integration** - Connect email marketing platform
3. **Calendar Enhancements** - Add appointment creation/edit dialogs
4. **Patient Detail Pages** - Complete patient management UI
5. **Production Deployment** - Deploy to GCP with PostgreSQL

## 📝 License

Proprietary - Walk Easy Pty Ltd

---

**Everything you need is in this one folder!** 🎉
