# Nexus Core Clinic

Patient management system migrating from FileMaker to a modern cloud-native architecture.

## 🏗️ Architecture

- **Backend**: Django REST Framework (Python)
- **Frontend**: Next.js with Mantine UI (React/TypeScript)
- **Database**: PostgreSQL (Cloud SQL on GCP)
- **Storage**: AWS S3 (documents/images)
- **Cloud**: Google Cloud Platform (Cloud Run, Cloud SQL, Secret Manager)
- **Authentication**: Firebase Auth
- **Integration**: Xero (accounting), SMS Broadcast (notifications)

## 📋 Project Structure

```
.
├── backend/          # Django REST Framework API
├── frontend/         # Next.js frontend with Mantine UI
├── terraform/        # Infrastructure as Code
├── etl/              # Data migration scripts (FileMaker → PostgreSQL)
├── scripts/          # Utility scripts
├── docs/             # Documentation
└── ChatGPT_Docs/     # Detailed setup and integration guides
```

## 🚀 Quick Start

See [Setup-Checklist.md](ChatGPT_Docs/Setup-Checklist.md) for step-by-step setup instructions.

## 📚 Documentation

- [Environment Setup Guide](ChatGPT_Docs/00-Environment-Setup-Guide.md) - Complete setup instructions
- [Setup Checklist](ChatGPT_Docs/Setup-Checklist.md) - Step-by-step checklist
- [Architecture Overview](ChatGPT_Docs/01-Architecture.md)
- [PostgreSQL Schema](ChatGPT_Docs/02-Target-Postgres-Schema.md)
- [Mantine UI Setup](ChatGPT_Docs/Mantine-UI-Setup-Guide.md)
- [Xero Integration](ChatGPT_Docs/Xero_Integration.md)
- [SMS Integration](ChatGPT_Docs/SMS_End_to_End_Integration.md)
- [Calendar Specification](ChatGPT_Docs/Calendar_Spec_FullCalendar.md)

## 🔐 Environment Variables

See [ENV-File-Guide.md](ChatGPT_Docs/ENV-File-Guide.md) for environment variable configuration.

**⚠️ Never commit `.env` files to the repository.**

## 🧪 Development

### Backend (Django)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py runserver
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

## 📝 License

Proprietary - Walk Easy Pty Ltd

