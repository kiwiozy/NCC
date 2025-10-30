# Nexus Core Clinic - Patient Management System

Modern cloud-native patient management system for Walk Easy Pedorthics, migrating from FileMaker to PostgreSQL.

## 🏗️ Architecture

- **Backend**: Django REST Framework (Python)
- **Frontend**: Next.js with Mantine UI (React/TypeScript)
- **Database**: PostgreSQL (Cloud SQL on GCP)
- **Storage**: AWS S3 (documents/images)
- **Cloud**: Google Cloud Platform
- **Region**: Australia (Sydney)

## 📁 Project Structure

```
nexus-core-clinic/
├── backend/          # Django REST Framework API
│   ├── ncc_api/      # Django project settings
│   ├── patients/     # Patient management app
│   ├── appointments/ # Appointment scheduling app
│   ├── clinicians/   # Clinician management app
│   └── venv/         # Python virtual environment
├── frontend/         # Next.js frontend (to be created)
├── etl/              # Data migration scripts (FileMaker → PostgreSQL)
├── scripts/          # Utility scripts
├── docs/             # Project documentation
└── terraform/        # Infrastructure as Code
```

## 🚀 Quick Start

### Backend (Django)

```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

### Database Connection

Cloud SQL instance: `ncc-postgres-dev`
- Region: australia-southeast1
- Version: PostgreSQL 15
- Connection via Cloud SQL Proxy for local development

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:
- Database credentials
- GCP project settings
- AWS S3 credentials (when available)
- FileMaker API credentials
- Integration API keys (Xero, SMS)

**⚠️ Never commit `.env` files to git**

## 📊 GCP Infrastructure

- **Project**: `nexus-core-clinic-dev`
- **Project Number**: `491969955535`
- **Service Accounts**:
  - `ncc-api-sa` - API backend service
  - `ncc-web-sa` - Frontend web service
  - `ncc-worker-sa` - Background jobs

## 📚 Documentation

All detailed documentation is in `/Users/craig/Documents/1.NCC/ChatGPT_Docs/`:

- **Setup**: `Setup-Checklist.md` - Complete setup guide
- **Architecture**: `01-Architecture.md` - System design
- **Database**: `02-Target-Postgres-Schema.md` - Complete schema
- **ETL**: `03-Staging-and-Mapping.md`, `04-Containers-Migration.md`, `05-ETL-and-DBT.md`
- **Integrations**: `Xero_Integration.md`, `SMS_End_to_End_Integration.md`, `S3_Integration.md`
- **Frontend**: `Mantine-UI-Setup-Guide.md`, `Calendar_Spec_FullCalendar.md`

## 🔄 Development Workflow

1. **Backend Development**:
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py makemigrations
   python manage.py migrate
   python manage.py runserver
   ```

2. **Frontend Development** (when created):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Database Schema Changes**:
   - Update models in Django apps
   - Create migrations
   - Apply to database
   - Update documentation

## 🧪 Testing

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests (when created)
cd frontend
npm test
```

## 📝 License

Proprietary - Walk Easy Pty Ltd

## 🤝 Support

For questions or issues, contact: craig@walkeasy.com.au

---

**Created**: October 30, 2025  
**Status**: Development - Infrastructure setup complete, ready for component development

