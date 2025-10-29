# ✅ Nexus Core Clinic - Setup Checklist

**Simple step-by-step checklist** for setting up your complete environment. Check off items as you complete them.

---

## 📋 Prerequisites

**📖 Reference:** See `00-Environment-Setup-Guide.md` section 1 for detailed requirements.

- [ ] Google Cloud Platform (GCP) account with billing enabled
- [ ] AWS account with billing enabled (for S3)
- [ ] Terraform installed (`brew install terraform`)
- [ ] Google Cloud SDK installed (`brew install google-cloud-sdk`)
- [ ] AWS CLI installed (`brew install awscli`)
- [ ] Python 3.9+ installed
- [ ] Docker installed (optional, for local dev)

---

## ☁️ Google Cloud Platform (GCP) Setup

**📖 Reference:** See `00-Environment-Setup-Guide.md` section 2 (Credential Strategy) and section 3 (GCP Setup) for detailed instructions.

### 1. Project Setup
- [ ] List existing GCP projects: `gcloud projects list`
- [ ] Set existing project as default: `gcloud config set project YOUR_PROJECT_ID`
- [ ] OR create new project: `gcloud projects create nexus-core-clinic-dev`
- [ ] Verify billing is enabled

### 2. Enable APIs
- [ ] Run API enablement command (see `00-Environment-Setup-Guide.md` section 3.2)
- [ ] Verify APIs are enabled: `gcloud services list --enabled`

### 3. Service Accounts
- [ ] Create `wep-api-sa` service account
- [ ] Create `wep-web-sa` service account
- [ ] Create `wep-worker-sa` service account
- [ ] Grant IAM roles to service accounts (CloudSQL client, Secret Manager, Storage)

### 4. Authentication
- [ ] Authenticate: `gcloud auth application-default login`

---

## ☁️ AWS Setup (S3)

**📖 Reference:** See `00-Environment-Setup-Guide.md` section 4 (AWS Setup) and `S3_Integration.md` for detailed S3 configuration.

### 1. Credentials
- [ ] Verify existing AWS credentials: `aws sts get-caller-identity`
- [ ] OR create new IAM user `wep-s3-uploader`
- [ ] Configure AWS CLI: `aws configure`
- [ ] Set region to `ap-southeast-2`

### 2. S3 Buckets
- [ ] Create bucket: `aws s3 mb s3://wep-docs-dev --region ap-southeast-2`
- [ ] Enable versioning on bucket
- [ ] Block public access on bucket
- [ ] Enable server-side encryption
- [ ] Configure CORS for browser uploads

---

## 🗄️ PostgreSQL Database Setup

**📖 Reference:** 
- See `00-Environment-Setup-Guide.md` section 5 (Database Setup) for creation steps
- See `02-Target-Postgres-Schema.md` for complete database schema
- See `Hosting_Decision_Guide.md` section 4 for sizing guidance

### 1. Create Database Instance
- [ ] Choose method: Terraform (recommended) OR manual
- [ ] If Terraform: Configure `terraform.tfvars` with project ID and password
- [ ] Run: `terraform init && terraform plan && terraform apply`
- [ ] OR manually create Cloud SQL instance via `gcloud` commands

### 2. Database Configuration
- [ ] Instance name: `wep-postgres-dev`
- [ ] Version: PostgreSQL 15
- [ ] Region: `australia-southeast1`
- [ ] Tier: `db-f1-micro` (dev) or `db-custom-2-8192` (production)
- [ ] Enable automated backups
- [ ] Enable Point-in-Time Recovery (PITR)

### 3. Database & User
- [ ] Create database: `wep_db`
- [ ] Create user: `wep_app_user`
- [ ] Save database password securely

### 4. Connect & Test
- [ ] Test connection via Cloud SQL Proxy
- [ ] Connect with `psql` and verify: `SELECT version();`

### 5. Apply Schema
- [ ] Apply initial schema from `02-Target-Postgres-Schema.md`
- [ ] Verify tables were created
- [ ] Enable required extensions (`pgcrypto`, `pg_trgm`, `btree_gin`)

---

## 🔐 Secret Management

**📖 Reference:** See `00-Environment-Setup-Guide.md` section 6 (Secret Management) for detailed secret creation commands.

### 1. Store Secrets in GCP Secret Manager
- [ ] Store `DATABASE_URL`
- [ ] Store `AWS_ACCESS_KEY_ID`
- [ ] Store `AWS_SECRET_ACCESS_KEY`
- [ ] Store `FM_BASE_URL` (FileMaker server URL)
- [ ] Store `FM_DB_NAME` (FileMaker database name)
- [ ] Store `FM_USERNAME` (FileMaker username)
- [ ] Store `FM_PASSWORD` (FileMaker password)

### 2. Grant Access
- [ ] Grant API service account access to all secrets
- [ ] Test secret access: `gcloud secrets versions access latest --secret="DATABASE_URL"`

---

## 📁 Local Development Environment

**📖 Reference:**
- See `00-Environment-Setup-Guide.md` section 8 (Local Development) for detailed setup
- See `Mantine-UI-Setup-Guide.md` for frontend/Mantine configuration
- See `Recommended_Tech_Stack.md` for technology choices

### 1. Project Structure
- [ ] Create project directory: `~/nexus-core-clinic`
- [ ] Initialize git repository
- [ ] Create directory structure: `backend`, `frontend`, `terraform`, `etl`, `scripts`, `docs`

### 2. Backend Setup (Django/DRF)
- [ ] Create virtual environment: `python3 -m venv venv`
- [ ] Activate virtual environment
- [ ] Install dependencies: Django, DRF, psycopg2, boto3, python-dotenv
- [ ] Create Django project
- [ ] Create Django apps: `patients`, `appointments`
- [ ] Create `.env` file with local configuration

### 3. Frontend Setup (Next.js + Mantine)
- [ ] Create Next.js app: `npx create-next-app@latest . --typescript --tailwind --app`
- [ ] Install Mantine packages: `@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/dates`
- [ ] Install FullCalendar packages
- [ ] Install PostCSS dependencies
- [ ] Configure `postcss.config.cjs`
- [ ] Set up MantineProvider in `app/layout.tsx`
- [ ] Create `.env.local` file

### 4. ETL Scripts
- [ ] Copy FileMaker test script
- [ ] Create `requirements.txt` for ETL
- [ ] Install ETL dependencies

---

## 🔗 FileMaker Connection

**📖 Reference:** See `Test_FileMaker_Data_API.md` (in parent directory) for full testing guide.

- [ ] FileMaker Data API is accessible (already tested ✅)
- [ ] Server: `https://walkeasy.fmcloud.fm`
- [ ] Database: `WEP-DatabaseV2`
- [ ] Run test: `python3 test_fm_api.py`
- [ ] Verify connection works

---

## 🧪 Testing & Validation

**📖 Reference:** See `00-Environment-Setup-Guide.md` section 9 (Testing & Validation) for detailed test commands.

### Cloud SQL
- [ ] Test database connection via Cloud SQL Proxy
- [ ] Verify can run queries
- [ ] Check schema was applied correctly

### S3
- [ ] Test upload: `aws s3 cp test.txt s3://wep-docs-dev/test/`
- [ ] Test download: `aws s3 cp s3://wep-docs-dev/test/test.txt .`
- [ ] Verify bucket settings (versioning, encryption, CORS)

### FileMaker API
- [ ] Test authentication
- [ ] List layouts
- [ ] Fetch sample records
- [ ] Test container field download (if available)

### Secret Manager
- [ ] Verify can access secrets from application code
- [ ] Test credential rotation workflow

---

## 🚀 Deployment Setup

**📖 Reference:**
- See `00-Environment-Setup-Guide.md` section 8 for service configuration
- See `Hosting_Decision_Guide.md` section 3 for architecture details
- See `terraform-starter/` directory for Infrastructure as Code

### 1. Cloud Run Services
- [ ] Create Cloud Run service for API
- [ ] Create Cloud Run service for Web
- [ ] Configure service accounts for each service
- [ ] Set environment variables (reference Secret Manager)
- [ ] Configure VPC connector for Cloud SQL access
- [ ] Deploy test containers

### 2. Networking
- [ ] Set up Serverless VPC Connector
- [ ] Configure private IP for Cloud SQL
- [ ] Test Cloud Run → Cloud SQL connection

### 3. Monitoring
- [ ] Enable Cloud Logging
- [ ] Set up Cloud Monitoring dashboards
- [ ] Configure Sentry (if using)
- [ ] Set up budget alerts
- [ ] Create uptime checks

---

## 📊 Database Schema & Data

**📖 Reference:**
- See `02-Target-Postgres-Schema.md` for complete schema definition
- See `03-Staging-and-Mapping.md` for staging tables and field mapping
- See `04-Containers-Migration.md` for container field migration strategy
- See `05-ETL-and-DBT.md` for ETL orchestration

### 1. Schema Application
- [ ] Apply core tables: `clinics`, `clinicians`, `patients`, `appointments`
- [ ] Apply document tables: `document_assets`, `documents`
- [ ] Apply mapping tables: `id_map_patients`, `id_map_documents`
- [ ] Create materialized views: `mv_patient_summary`, `mv_todays_appointments`
- [ ] Verify all tables created successfully

### 2. ETL Setup (Migration)
- [ ] Create staging schema
- [ ] Set up staging tables for FileMaker data
- [ ] Create dbt project structure (if using)
- [ ] Write transformation scripts
- [ ] Test ETL pipeline with sample data

---

## 🔧 Integrations (Optional - Setup When Ready)

**📖 Reference:**
- See `Xero_Integration.md` for complete Xero setup guide
- See `SMS_End_to_End_Integration.md` for SMS/Broadcast setup
- See `Calendar_Spec_FullCalendar.md` for calendar implementation

### Xero Integration
- [ ] Create Xero Connected App
- [ ] Store `XERO_CLIENT_ID` in Secret Manager
- [ ] Store `XERO_CLIENT_SECRET` in Secret Manager
- [ ] Implement OAuth2 flow
- [ ] Create database tables: `xero_contact_links`, `xero_invoice_links`
- [ ] Test contact sync
- [ ] Test invoice creation

### SMS Integration
- [ ] Sign up for SMS Broadcast account
- [ ] Store `SMSB_USERNAME` in Secret Manager
- [ ] Store `SMSB_PASSWORD` in Secret Manager
- [ ] Create database tables: `sms_messages`, `sms_inbound`
- [ ] Configure webhooks for delivery reports
- [ ] Test sending SMS
- [ ] Test receiving replies

---

## ✅ Final Verification

### Environment
- [ ] All services running
- [ ] All secrets accessible
- [ ] All databases connected
- [ ] FileMaker API working

### Security
- [ ] Private IP for Cloud SQL configured
- [ ] IAM roles follow least privilege
- [ ] Secrets not in code (all in Secret Manager)
- [ ] CORS configured correctly for S3

### Documentation
- [ ] Configuration documented
- [ ] Passwords stored securely
- [ ] Team members have access documentation
- [ ] Deployment process documented

---

## 🎯 Next Steps After Setup

- [ ] Run FileMaker data export
- [ ] Apply data transformations
- [ ] Import data to PostgreSQL
- [ ] Verify data integrity
- [ ] Set up scheduled jobs (Cloud Tasks/Scheduler)
- [ ] Configure backups and monitoring
- [ ] Plan cutover strategy

---

## 📝 Notes

**Quick Reference:**
- **GCP Project:** Use existing OR create new
- **AWS IAM:** Use existing credentials
- **Database:** Cloud SQL PostgreSQL 15 in `australia-southeast1`
- **Storage:** S3 buckets in `ap-southeast-2`
- **Region:** All services in Sydney, Australia

**Estimated Time:**
- Setup: 2-4 hours
- Schema & Testing: 1-2 hours
- Integration Setup: 2-3 hours (when ready)

**📚 Complete Documentation Reference:**

**Setup & Infrastructure:**
- `00-Environment-Setup-Guide.md` - Complete environment setup (GCP, AWS, Database, Secrets)
- `Setup-Checklist.md` - This checklist (quick reference)
- `Hosting_Decision_Guide.md` - Infrastructure decisions and architecture
- `Recommended_Tech_Stack.md` - Technology stack overview

**Database & Data:**
- `01-Architecture.md` - System architecture overview
- `02-Target-Postgres-Schema.md` - Complete PostgreSQL schema
- `03-Staging-and-Mapping.md` - Staging tables and field mapping
- `04-Containers-Migration.md` - Container field migration strategy
- `05-ETL-and-DBT.md` - ETL orchestration and dbt setup

**Integrations:**
- `Xero_Integration.md` - Xero accounting integration
- `SMS_End_to_End_Integration.md` - SMS reminders and communication
- `S3_Integration.md` - AWS S3 file storage setup
- `Calendar_Spec_FullCalendar.md` - Calendar/scheduling implementation

**Frontend & Development:**
- `Mantine-UI-Setup-Guide.md` - Mantine UI component library setup
- `07-Firestore-Read-Cache.md` - Optional Firestore read cache

**Infrastructure as Code:**
- `terraform-starter/` - Terraform configuration for GCP resources

---

**✅ Check off items as you complete them!**

