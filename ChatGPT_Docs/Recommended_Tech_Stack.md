# 🧱 Recommended Tech Stack for FileMaker Migration

This document outlines the **proposed technology stack** for replacing the legacy FileMaker-based patient management system with a scalable, secure, and modern cloud architecture.

---

## 🧩 Core Architecture Overview

| Layer | Technology | Purpose |
|-------|-------------|----------|
| **Frontend (UI)** | Next.js (React) + Mantine UI | Web interface for clinicians, admin staff, and external referrers |
| **API Layer** | Django REST Framework (Python) or NestJS (TypeScript) | Business logic, validation, and integration with databases |
| **Primary Database** | PostgreSQL (Cloud SQL or RDS) | Normalized relational data store for patients, appointments, clinicians, and documents |
| **File/Media Storage** | Google Cloud Storage (GCS) or AWS S3 | Store documents, images, scans (formerly FileMaker containers) |
| **Read Cache / Realtime Sync (optional)** | Firestore (Google) | Real-time feed of appointments or patient dashboards |
| **ETL / Data Transformation** | dbt + Python | Staging-to-production transforms, schema enforcement, data tests |
| **Job/Task Queue** | Celery (Python) or Cloud Tasks / SQS | Background jobs for heavy or async tasks |
| **Authentication** | Firebase Auth, Auth0, or AWS Cognito | Centralized user management and access control |
| **Search (optional)** | PostgreSQL FTS or OpenSearch | Full-text search on notes, patient names, or clinical terms |
| **Analytics** | Metabase / Grafana / Google Data Studio | Clinical & operational dashboards |
| **Infrastructure** | Google Cloud Run (or AWS Fargate) | Serverless app deployment |
| **Version Control** | GitHub / GitLab | Source code repository and CI/CD |
| **CI/CD Pipeline** | GitHub Actions / Cloud Build | Continuous integration and automated deployments |
| **Monitoring** | Sentry / Prometheus / Cloud Logging | Application & error monitoring |

---

## 🗄️ Database Structure & Access

### 1. **PostgreSQL (System of Record)**
- Stores normalized entities: patients, clinicians, appointments, encounters, invoices, documents.
- Strong referential integrity with foreign keys and constraints.
- Extensions used:
  - `pgcrypto` for UUID generation.
  - `pg_trgm` for fuzzy text search.
  - `btree_gin` for multi-index performance.

### 2. **Materialized Views (Read Models)**
Used for fast UI performance without heavy joins.
- `mv_patient_summary` – aggregated view of patient details, next/last appointments, and document counts.
- `mv_todays_appointments` – filtered view of current day schedules for each clinic.

### 3. **Firestore (Optional Layer)**
Used for real-time UI updates:
- Mirrors of `mv_todays_appointments` and `mv_patient_summary`.
- Synced automatically via Cloud Function or Cloud Task after dbt runs.

---

## 📦 File & Document Management

- All binary files (formerly FileMaker containers) stored in **GCS or S3**.
- Naming convention: `patients/{patient_uuid}/{sha256}.{ext}`
- Metadata stored in `document_assets` table:
  ```sql
  CREATE TABLE document_assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      storage_url TEXT NOT NULL,
      mime_type TEXT,
      byte_size BIGINT,
      sha256 TEXT UNIQUE,
      original_name TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- Files served through **time-limited signed URLs** (secure, temporary access).

---

## 🔁 Data Integration & Migration

### Data flow from FileMaker → PostgreSQL:
```
FileMaker Data API / ODBC
        ↓
    Staging Schema (raw)
        ↓
    dbt Transforms (clean, validated)
        ↓
  Target Schema (patients, appointments, documents)
        ↓
  Firestore / Read Models (optional)
```

### ETL Components
- **Extract:** FileMaker Data API via Python `requests` or Airbyte connector.
- **Transform:** dbt SQL models (casting, normalizing, validation).
- **Load:** PostgreSQL via SQLAlchemy / psycopg2.

### dbt Benefits
- Automated schema testing.
- Repeatable, versioned data transformations.
- Built-in documentation for lineage.

---

## 🧠 DevOps & Deployment

### Google Cloud (Recommended)
- **Compute:** Cloud Run (auto-scaled containers).
- **Database:** Cloud SQL (Postgres).
- **Storage:** Cloud Storage (buckets).
- **Secrets:** Secret Manager.
- **Monitoring:** Cloud Logging + Sentry.
- **CI/CD:** GitHub Actions → Cloud Run deploys.

### AWS Alternative
- **Compute:** ECS + Fargate.
- **Database:** Aurora PostgreSQL.
- **Storage:** S3 + CloudFront.
- **Secrets:** Secrets Manager.
- **Queue:** SQS + Lambda.
- **CI/CD:** CodeBuild + CodePipeline.

---

## 🔐 Security and Compliance (NDIS & Clinical Context)

| Area | Control |
|------|----------|
| **PII/PHI Encryption** | KMS-encrypted at rest, TLS in transit |
| **Access Control** | Role-based (clinician, admin, support coordinator) |
| **Audit Logging** | Insert-only logs for data access events |
| **Backups** | Daily Cloud SQL automated backups |
| **Incident Response** | Sentry + Cloud Monitoring alerts |
| **Data Residency** | Australia (Sydney region) |
| **Compliance Targets** | NDIS, HIPAA principles, ISO27001 alignment |

---

## 🧩 Summary Recommendations

✅ Use **PostgreSQL** as the core database.  
✅ Use **GCS/S3** for all documents and images.  
✅ Optionally use **Firestore** for real-time views.  
✅ Deploy **API services** with Django REST Framework or NestJS.  
✅ Manage transformations with **dbt + Python scripts**.  
✅ Use **Cloud Run (GCP)** or **Fargate (AWS)** for serverless compute.  
✅ Build the UI in **Next.js (React)** with **Mantine UI** components and **Firebase Auth** for security.

---

**Next Step:** Once the stack is finalized, we’ll map migration pipelines, container export jobs, and API endpoints to complete the full transition from FileMaker.
