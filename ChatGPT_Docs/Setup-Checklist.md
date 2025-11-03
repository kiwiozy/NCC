# ✅ WalkEasy Nexus - Setup Checklist

**Simple step-by-step checklist** for setting up your complete environment. Check off items as you complete them.

---

## 📊 **Current Status Overview**

**Last Updated:** October 29, 2025

| Phase | Status | Progress | Notes |
|-------|--------|----------|-------|
| **📚 Documentation** | ✅ Complete | 100% | All specs and guides written |
| **🔧 Prerequisites** | ✅ Complete | 100% | All tools installed and verified |
| **🔗 FileMaker API** | 🚨 Blocked | 0% | 502 errors - WPE needs enabling |
| **☁️ Infrastructure** | ⚠️ In Progress | 60% | GCP project created, AWS S3 pending |
| **💾 Database** | ⚠️ In Progress | 75% | Cloud SQL provisioning (10-15 min) |
| **🔐 Secrets** | ❌ Not Started | 0% | Secret Manager not configured |
| **💻 Backend Code** | ⚠️ In Progress | 60% | Django initialized, apps created |
| **🎨 Frontend Code** | ❌ Not Started | 0% | Next.js not created |
| **🔌 Integrations** | ❌ Not Started | 0% | Xero/SMS not configured |

**Overall Progress:** ~45% (Infrastructure setup complete, database provisioning, development environment ready)

### 🚨 **Critical Blockers**
1. **FileMaker Data API (502 Bad Gateway)** - Must enable WPE and Data API in FileMaker Server Admin Console before data migration can proceed
2. ~~**Infrastructure Decision**~~ ✅ **COMPLETE** - Using new isolated project `nexus-core-clinic-dev`

### ✅ **Recent Accomplishments**
- ✅ Complete architecture documentation written
- ✅ Database schema designed (PostgreSQL)
- ✅ All integration specs completed (Xero, SMS, S3, Calendar)
- ✅ FileMaker test script created (`test_fm_api.py`)
- ✅ Troubleshooting report generated
- ✅ All prerequisites verified and installed
- ✅ GCP project `nexus-core-clinic-dev` created
- ✅ All required APIs enabled (Cloud Run, Cloud SQL, Secret Manager, etc.)
- ✅ Service accounts created and configured (`ncc-api-sa`, `ncc-web-sa`, `ncc-worker-sa`)
- ✅ IAM roles granted (CloudSQL client, Secret Manager, Storage, Cloud Tasks)
- ✅ **NEW:** Django backend with 5 models (Patient, Clinic, Clinician, Appointment, Encounter)
- ✅ **NEW:** Next.js frontend with Mantine UI + FullCalendar
- ✅ **NEW:** Multi-clinician calendar component with drag & drop
- ✅ **NEW:** Project documentation organized in `docs/` directory

### 🎯 **Immediate Next Steps**
1. ~~**Fix FileMaker API**~~ - ⚠️ Waiting (Enable Data API in FileMaker Cloud admin console)
2. ~~**Verify Prerequisites**~~ - ✅ **COMPLETE** (All tools installed)
3. ~~**Choose GCP Strategy**~~ - ✅ **COMPLETE** (New project `nexus-core-clinic-dev`)
4. ~~**Set Up GCP Infrastructure**~~ - ✅ **COMPLETE** (Project, APIs, service accounts ready)
5. **Create Cloud SQL Database** - ⬅️ **NEXT STEP**
6. **Set up AWS S3 buckets** - After database
7. **Store secrets in Secret Manager** - After S3

---

## 📋 Prerequisites

**📖 Reference:** See `00-Environment-Setup-Guide.md` section 1 for detailed requirements.

**Status:** ✅ COMPLETE (100%) - All tools installed and configured!

- [x] Google Cloud Platform (GCP) account with billing enabled *(project: `referrer-map`)*
- [x] AWS account with billing enabled (for S3) *(region: `ap-southeast-2`)*
- [x] Terraform installed *(v1.5.7)*
- [x] Google Cloud SDK installed *(v544.0.0)*
- [x] AWS CLI installed *(v2.31.22)*
- [x] Python 3.9+ installed *(Python 3.9.6)*
- [x] Docker installed *(v28.4.0)*

**✅ Verified:** October 29, 2025 - All prerequisites complete!

---

## ☁️ Google Cloud Platform (GCP) Setup

**📖 Reference:** See `00-Environment-Setup-Guide.md` section 2 (Credential Strategy) and section 3 (GCP Setup) for detailed instructions.

**Status:** ✅ COMPLETE (100%) - New isolated project created for healthcare data

**✅ DECISION MADE:** Using new project `nexus-core-clinic-dev` for complete isolation and compliance

### 1. Project Setup
- [x] **DECIDED:** Option B - New project for better isolation
- [x] List existing GCP projects
- [x] Create new project: `nexus-core-clinic-dev`
- [x] Enable billing
- [x] Project Number: `491969955535`
- [x] Lifecycle State: ACTIVE

**Status:** ✅ COMPLETE (100%)

### 2. Enable APIs
- [x] Cloud Run API (`run.googleapis.com`)
- [x] Cloud SQL Admin API (`sqladmin.googleapis.com`)
- [x] Cloud Storage API (`storage-api.googleapis.com`)
- [x] Secret Manager API (`secretmanager.googleapis.com`)
- [x] Cloud Tasks API (`cloudtasks.googleapis.com`)
- [x] Cloud Scheduler API (`cloudscheduler.googleapis.com`)
- [x] Compute Engine API (`compute.googleapis.com`)
- [x] VPC Access API (`vpcaccess.googleapis.com`)
- [x] Service Networking API (`servicenetworking.googleapis.com`)
- [x] Cloud Build API (`cloudbuild.googleapis.com`)
- [x] Artifact Registry API (`artifactregistry.googleapis.com`)

**Status:** ✅ COMPLETE (100%)

### 3. Service Accounts
- [x] Create `ncc-api-sa` service account *(ncc-api-sa@nexus-core-clinic-dev.iam.gserviceaccount.com)*
- [x] Create `ncc-web-sa` service account *(ncc-web-sa@nexus-core-clinic-dev.iam.gserviceaccount.com)*
- [x] Create `ncc-worker-sa` service account *(ncc-worker-sa@nexus-core-clinic-dev.iam.gserviceaccount.com)*
- [x] Grant IAM roles to API service account (CloudSQL client, Secret Manager accessor, Storage admin)
- [x] Grant IAM roles to Worker service account (Cloud Tasks enqueuer)

**Status:** ✅ COMPLETE (100%)

### 4. Authentication
- [x] Authenticate: `gcloud auth application-default login`
- [x] Project set as default: `nexus-core-clinic-dev`

**Status:** ✅ COMPLETE (100%)

---

## ☁️ AWS Setup (S3)

**📖 Reference:** See `00-Environment-Setup-Guide.md` section 4 (AWS Setup) and `S3_Integration.md` for detailed S3 configuration.

**Status:** ❌ Not Started (0%) - Have existing AWS credentials

### 1. Credentials
- [x] AWS account exists *(confirmed - credentials in .env file)*
- [ ] Verify existing AWS credentials: `aws sts get-caller-identity`
- [ ] Decide: Reuse existing IAM user OR create new `wep-s3-uploader`
- [ ] Configure AWS CLI: `aws configure`
- [ ] Set region to `ap-southeast-2`

**Status:** ⚠️ Partial (20%) - Have credentials, need to verify and configure CLI

### 2. S3 Buckets
- [ ] Create bucket: `aws s3 mb s3://wep-docs-dev --region ap-southeast-2`
- [ ] Enable versioning on bucket
- [ ] Block public access on bucket
- [ ] Enable server-side encryption
- [ ] Configure CORS for browser uploads

**Status:** ❌ Not Started (0%)

---

## 🗄️ PostgreSQL Database Setup

**📖 Reference:** 
- See `00-Environment-Setup-Guide.md` section 5 (Database Setup) for creation steps
- See `02-Target-Postgres-Schema.md` for complete database schema
- See `Hosting_Decision_Guide.md` section 4 for sizing guidance

**Status:** ❌ Not Started (0%) - Requires GCP project setup first

### 1. Create Database Instance
- [ ] Choose method: Terraform (recommended) OR manual
- [ ] If Terraform: Configure `terraform.tfvars` with project ID and password
- [ ] Run: `terraform init && terraform plan && terraform apply`
- [ ] OR manually create Cloud SQL instance via `gcloud` commands

**Status:** ❌ Not Started (0%)

### 2. Database Configuration
- [ ] Instance name: `wep-postgres-dev`
- [ ] Version: PostgreSQL 15
- [ ] Region: `australia-southeast1`
- [ ] Tier: `db-f1-micro` (dev) or `db-custom-2-8192` (production)
- [ ] Enable automated backups
- [ ] Enable Point-in-Time Recovery (PITR)

**Status:** ❌ Not Started (0%)

### 3. Database & User
- [ ] Create database: `wep_db`
- [ ] Create user: `wep_app_user`
- [ ] Save database password securely

**Status:** ❌ Not Started (0%)

### 4. Connect & Test
- [ ] Test connection via Cloud SQL Proxy
- [ ] Connect with `psql` and verify: `SELECT version();`

**Status:** ❌ Not Started (0%)

### 5. Apply Schema
- [ ] Apply initial schema from `02-Target-Postgres-Schema.md`
- [ ] Verify tables were created
- [ ] Enable required extensions (`pgcrypto`, `pg_trgm`, `btree_gin`)

**Status:** ❌ Not Started (0%)

---

## 🔐 Secret Management

**📖 Reference:** See `00-Environment-Setup-Guide.md` section 6 (Secret Management) for detailed secret creation commands.

**Status:** ❌ Not Started (0%) - Requires GCP project setup first

### 1. Store Secrets in GCP Secret Manager
- [ ] Store `DATABASE_URL`
- [ ] Store `AWS_ACCESS_KEY_ID`
- [ ] Store `AWS_SECRET_ACCESS_KEY`
- [ ] Store `FM_BASE_URL` (FileMaker server URL)
- [ ] Store `FM_DB_NAME` (FileMaker database name)
- [ ] Store `FM_USERNAME` (FileMaker username)
- [ ] Store `FM_PASSWORD` (FileMaker password)

**Status:** ❌ Not Started (0%)

### 2. Grant Access
- [ ] Grant API service account access to all secrets
- [ ] Test secret access: `gcloud secrets versions access latest --secret="DATABASE_URL"`

**Status:** ❌ Not Started (0%)

---

## 📁 Local Development Environment

**📖 Reference:**
- See `00-Environment-Setup-Guide.md` section 8 (Local Development) for detailed setup
- See `Mantine-UI-Setup-Guide.md` for frontend/Mantine configuration
- See `Recommended_Tech_Stack.md` for technology choices

**Status:** ❌ Not Started (0%) - Ready to begin once infrastructure decisions made

### 1. Project Structure
- [ ] Create project directory: `~/nexus-core-clinic`
- [ ] Initialize git repository
- [ ] Create directory structure: `backend`, `frontend`, `terraform`, `etl`, `scripts`, `docs`

**Status:** ❌ Not Started (0%)

### 2. Backend Setup (Django/DRF)
- [ ] Create virtual environment: `python3 -m venv venv`
- [ ] Activate virtual environment
- [ ] Install dependencies: Django, DRF, psycopg2, boto3, python-dotenv
- [ ] Create Django project
- [ ] Create Django apps: `patients`, `appointments`
- [ ] Create `.env` file with local configuration

**Status:** ❌ Not Started (0%)

### 3. Frontend Setup (Next.js + Mantine)
- [ ] Create Next.js app: `npx create-next-app@latest . --typescript --tailwind --app`
- [ ] Install Mantine packages: `@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/dates`
- [ ] Install FullCalendar packages
- [ ] Install PostCSS dependencies
- [ ] Configure `postcss.config.cjs`
- [ ] Set up MantineProvider in `app/layout.tsx`
- [ ] Create `.env.local` file

**Status:** ❌ Not Started (0%)

### 4. ETL Scripts
- [x] FileMaker test script exists (`test_fm_api.py`)
- [ ] Copy test script to project ETL directory
- [ ] Create `requirements.txt` for ETL
- [ ] Install ETL dependencies

**Status:** ⚠️ Partial (25%) - Test script created, needs to be integrated into project

---

## 🔗 FileMaker Connection

**📖 Reference:** See `Test_FileMaker_Data_API.md` (in parent directory) for full testing guide.

**Status:** 🚨 BLOCKED (0%) - Data API returning 502 errors

- [x] FileMaker test script created (`test_fm_api.py`)
- [x] FileMaker credentials available
- [x] Test script executed
- [x] Troubleshooting report generated (`TROUBLESHOOTING_REPORT.md`)
- [ ] **🚨 BLOCKER:** Enable Data API in FileMaker Server Admin Console
- [ ] **🚨 BLOCKER:** Start Web Publishing Engine (WPE)
- [ ] **🚨 BLOCKER:** Enable `fmrest` extended privilege for user account
- [ ] Verify connection works: `python3 test_fm_api.py`

**Critical Actions Required:**
1. Log into FileMaker Server Admin Console at `https://walkeasy.fmcloud.fm:16000`
2. Navigate to **Configuration → Data API Settings**
3. Enable **"Enable Data API"** checkbox
4. Restart **Web Publishing Engine** service
5. Verify `fmrest` privilege enabled in FileMaker Pro for account "Craig"
6. Re-test connection

**Expected Result:** Authentication should return token, not 502 Bad Gateway

**Details:** 
- Server: `https://walkeasy.fmcloud.fm`
- Database: `WEP-DatabaseV2`
- User: Craig
- Current Error: 502 Bad Gateway (WPE not responding)

---

## 🧪 Testing & Validation

**📖 Reference:** See `00-Environment-Setup-Guide.md` section 9 (Testing & Validation) for detailed test commands.

**Status:** ❌ Not Started (0%) - Requires infrastructure setup first

### Cloud SQL
- [ ] Test database connection via Cloud SQL Proxy
- [ ] Verify can run queries
- [ ] Check schema was applied correctly

**Status:** ❌ Not Started (0%)

### S3
- [ ] Test upload: `aws s3 cp test.txt s3://wep-docs-dev/test/`
- [ ] Test download: `aws s3 cp s3://wep-docs-dev/test/test.txt .`
- [ ] Verify bucket settings (versioning, encryption, CORS)

**Status:** ❌ Not Started (0%)

### FileMaker API
- [ ] Test authentication
- [ ] List layouts
- [ ] Fetch sample records
- [ ] Test container field download (if available)

**Status:** 🚨 BLOCKED - See FileMaker Connection section

### Secret Manager
- [ ] Verify can access secrets from application code
- [ ] Test credential rotation workflow

**Status:** ❌ Not Started (0%)

---

## 🚀 Deployment Setup

**📖 Reference:**
- See `00-Environment-Setup-Guide.md` section 8 for service configuration
- See `Hosting_Decision_Guide.md` section 3 for architecture details
- See `terraform-starter/` directory for Infrastructure as Code

**Status:** ❌ Not Started (0%) - Requires infrastructure and code to be complete first

### 1. Cloud Run Services
- [ ] Create Cloud Run service for API
- [ ] Create Cloud Run service for Web
- [ ] Configure service accounts for each service
- [ ] Set environment variables (reference Secret Manager)
- [ ] Configure VPC connector for Cloud SQL access
- [ ] Deploy test containers

**Status:** ❌ Not Started (0%)

### 2. Networking
- [ ] Set up Serverless VPC Connector
- [ ] Configure private IP for Cloud SQL
- [ ] Test Cloud Run → Cloud SQL connection

**Status:** ❌ Not Started (0%)

### 3. Monitoring
- [ ] Enable Cloud Logging
- [ ] Set up Cloud Monitoring dashboards
- [ ] Configure Sentry (if using)
- [ ] Set up budget alerts
- [ ] Create uptime checks

**Status:** ❌ Not Started (0%)

---

## 📊 Database Schema & Data

**📖 Reference:**
- See `02-Target-Postgres-Schema.md` for complete schema definition
- See `03-Staging-and-Mapping.md` for staging tables and field mapping
- See `04-Containers-Migration.md` for container field migration strategy
- See `05-ETL-and-DBT.md` for ETL orchestration

**Status:** ✅ DESIGNED (100%) - Schema documented, ready to implement when DB is available

### 1. Schema Application
- [x] Schema designed *(complete in documentation)*
- [ ] Apply core tables: `clinics`, `clinicians`, `patients`, `appointments`
- [ ] Apply document tables: `document_assets`, `documents`
- [ ] Apply mapping tables: `id_map_patients`, `id_map_documents`
- [ ] Create materialized views: `mv_patient_summary`, `mv_todays_appointments`
- [ ] Verify all tables created successfully

**Status:** ⚠️ Design Complete (100%), Implementation Pending (0%)

### 2. ETL Setup (Migration)
- [x] ETL strategy documented *(complete in documentation)*
- [ ] Create staging schema
- [ ] Set up staging tables for FileMaker data
- [ ] Create dbt project structure (if using)
- [ ] Write transformation scripts
- [ ] Test ETL pipeline with sample data

**Status:** ⚠️ Design Complete (100%), Implementation Pending (0%)

---

## 🔧 Integrations (Optional - Setup When Ready)

**📖 Reference:**
- See `Xero_Integration.md` for complete Xero setup guide
- See `SMS_End_to_End_Integration.md` for SMS/Broadcast setup
- See `Calendar_Spec_FullCalendar.md` for calendar implementation

**Status:** ✅ DESIGNED (100%) - All integration specs complete, implementation pending

### Xero Integration
- [x] Integration strategy documented
- [ ] Create Xero Connected App
- [ ] Store `XERO_CLIENT_ID` in Secret Manager
- [ ] Store `XERO_CLIENT_SECRET` in Secret Manager
- [ ] Implement OAuth2 flow
- [ ] Create database tables: `xero_contact_links`, `xero_invoice_links`
- [ ] Test contact sync
- [ ] Test invoice creation

**Status:** ⚠️ Design Complete (100%), Implementation Pending (0%)

### SMS Integration
- [x] Integration strategy documented
- [ ] Sign up for SMS Broadcast account
- [ ] Store `SMSB_USERNAME` in Secret Manager
- [ ] Store `SMSB_PASSWORD` in Secret Manager
- [ ] Create database tables: `sms_messages`, `sms_inbound`
- [ ] Configure webhooks for delivery reports
- [ ] Test sending SMS
- [ ] Test receiving replies

**Status:** ⚠️ Design Complete (100%), Implementation Pending (0%)

### Calendar/Scheduling
- [x] Calendar specification documented (FullCalendar)
- [ ] Implement FullCalendar React component
- [ ] Set up appointment types and clinician resources
- [ ] Configure drag-and-drop functionality
- [ ] Implement recurrence rules (RRULE)
- [ ] Add conflict detection

**Status:** ⚠️ Design Complete (100%), Implementation Pending (0%)

---

## ✅ Final Verification

**Status:** ❌ Not Started (0%) - Will be performed once all setup is complete

### Environment
- [ ] All services running
- [ ] All secrets accessible
- [ ] All databases connected
- [ ] FileMaker API working

**Status:** ❌ Not Started (0%)

### Security
- [ ] Private IP for Cloud SQL configured
- [ ] IAM roles follow least privilege
- [ ] Secrets not in code (all in Secret Manager)
- [ ] CORS configured correctly for S3

**Status:** ❌ Not Started (0%)

### Documentation
- [x] Configuration documented *(all specs written)*
- [ ] Passwords stored securely
- [ ] Team members have access documentation
- [ ] Deployment process documented

**Status:** ⚠️ Partial (25%) - Documentation complete, operational docs pending

---

## 🎯 Next Steps After Setup

**Status:** ❌ Not Started (0%) - Waiting for infrastructure and FileMaker API

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
- **GCP Project:** Existing `referrer-map` OR create new `nexus-core-clinic-dev` *(DECISION NEEDED)*
- **AWS IAM:** Existing credentials available *(confirmed)*
- **Database:** Cloud SQL PostgreSQL 15 in `australia-southeast1` *(not yet created)*
- **Storage:** S3 buckets in `ap-southeast-2` *(not yet created)*
- **Region:** All services in Sydney, Australia

**Estimated Time:**
- Setup: 2-4 hours *(not started)*
- Schema & Testing: 1-2 hours *(design complete, implementation pending)*
- Integration Setup: 2-3 hours when ready *(design complete, implementation pending)*

---

## 🚀 **Priority Action Items (This Week)**

### Critical (Must Do)
1. **🚨 Fix FileMaker Data API (BLOCKER)**
   - Access FileMaker Server Admin Console
   - Enable Web Publishing Engine
   - Enable Data API
   - Verify `fmrest` privilege enabled
   - Re-test connection

2. **✅ Verify Prerequisites**
   ```bash
   terraform --version
   gcloud --version
   aws --version
   docker --version
   python3 --version
   ```

3. **🤔 Make Infrastructure Decision**
   - Review credential reuse strategy in `00-Environment-Setup-Guide.md` section 2
   - Choose: Reuse `referrer-map` OR create new project
   - Document decision

### High Priority (Next)
4. **☁️ Set Up GCP Infrastructure**
   - Create/configure GCP project
   - Enable required APIs
   - Create service accounts
   - Set up IAM roles

5. **💾 Create Cloud SQL Database**
   - Provision PostgreSQL instance
   - Configure networking
   - Apply schema

### Can Wait
6. Create project directory structure
7. Initialize backend (Django)
8. Initialize frontend (Next.js)

---

## 📊 **Completion Summary**

| Category | Items Completed | Total Items | Percentage |
|----------|----------------|-------------|------------|
| **Documentation** | 19/19 | 19 | 100% ✅ |
| **Prerequisites** | 3/7 | 7 | 43% ⚠️ |
| **Infrastructure** | 0/35 | 35 | 0% ❌ |
| **Code** | 0/25 | 25 | 0% ❌ |
| **Testing** | 0/15 | 15 | 0% ❌ |
| **Overall** | **22/101** | **101** | **~22%** |

**Note:** Documentation represents significant progress - all technical specifications, schemas, and integration guides are complete and production-ready.

---

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

---

## 🎬 **Getting Started - Quick Start Guide**

### Today (First 30 Minutes)
1. Run prerequisite verification script:
   ```bash
   echo "=== Checking Prerequisites ===" && \
   echo "Terraform: $(terraform --version 2>/dev/null || echo 'NOT INSTALLED')" && \
   echo "gcloud: $(gcloud --version 2>/dev/null | head -1 || echo 'NOT INSTALLED')" && \
   echo "AWS CLI: $(aws --version 2>/dev/null || echo 'NOT INSTALLED')" && \
   echo "Docker: $(docker --version 2>/dev/null || echo 'NOT INSTALLED')" && \
   echo "Python: $(python3 --version 2>/dev/null || echo 'NOT INSTALLED')"
   ```

2. Install any missing prerequisites:
   ```bash
   # macOS only
   brew install terraform google-cloud-sdk awscli docker
   ```

### This Week (Priority Tasks)
1. **Fix FileMaker API** - Contact FileMaker Cloud support or access admin console
2. **Choose GCP Strategy** - Decide on project reuse vs. new project  
3. **Verify Tools** - Complete prerequisite installation
4. **Plan Infrastructure** - Review architecture docs

### Next Week (Once Blockers Cleared)
1. Set up GCP project and APIs
2. Create Cloud SQL database
3. Configure AWS S3 buckets
4. Initialize project code structure

---

**📅 Last Updated:** October 29, 2025  
**👤 Project:** WalkEasy Nexus (NCC) - FileMaker Migration  
**🎯 Current Phase:** Planning & Design Complete → Infrastructure Setup Next  
**🚨 Blockers:** FileMaker Data API (502 errors), Infrastructure decision needed

