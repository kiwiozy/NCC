# WalkEasy Nexus

Modern cloud-native patient management system for Walk Easy Pedorthics.

## 🎉 **PRODUCTION DEPLOYED & OPERATIONAL!** (Nov 15-16, 2025)

✅ **Backend Fully Operational:** https://nexus-production-backend-892000689828.australia-southeast1.run.app  
✅ **Status:** All endpoints working (root, API, admin)  
✅ **Database:** Cloud SQL PostgreSQL (50GB, HA)  
✅ **Project:** `nexus-walkeasy-prod` (Google Cloud)  
✅ **Region:** australia-southeast1 (Sydney)  
✅ **Revision:** `nexus-production-backend-00007-zz9`

**📋 Next:** [Production Quick Start →](./PRODUCTION_QUICK_START.md)

---

## 📊 FileMaker Import Complete! (Nov 16, 2025)

✅ **Successfully imported 44,000+ records from FileMaker:**
- 2,842 Patients (100%)
- 9,837 Appointments (65%)
- 7,147 Communications (phones, emails, addresses) (100%)
- 11,210 Clinical Notes (98%)
- 10,148 Documents with clean S3 paths (99.6%)
- 6,489 Images (99.98%)
- 93 Companies (100%)
- 228 Referrers (97.4%)
- 1,705 Patient-Referrer relationships (99.2%)
- 63 Referrer-Company relationships (87.5%)

⚡ **Import Time: ~82 seconds** (down from 1 hour 20 minutes with API)

📚 **[See Full Import Report →](scripts/reimport/README.md)**

---

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
- ✅ GCP infrastructure (project: walkeasy-nexus-dev)

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
