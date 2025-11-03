# 🚀 Environment Setup Guide — WalkEasy Nexus

**Purpose:** Step-by-step guide to set up all cloud environments, accounts, and services needed to begin testing and development of the new patient management system.

---

## 📋 Table of Contents

1. [Prerequisites & Accounts](#1-prerequisites--accounts)
2. [Credential Reuse Strategy](#2-credential-reuse-strategy)
3. [Google Cloud Platform (GCP) Setup](#3-google-cloud-platform-gcp-setup)
4. [AWS Setup (S3)](#4-aws-setup-s3)
5. [Database Setup](#5-database-setup)
6. [Secret Management](#6-secret-management)
7. [FileMaker Connection](#7-filemaker-connection)
8. [Local Development Environment](#8-local-development-environment)
9. [Testing & Validation](#9-testing--validation)
10. [Cost Estimation](#10-cost-estimation)

---

## 1. Prerequisites & Accounts

### Required Accounts

- [ ] **Google Cloud Platform (GCP)** account
  - Sign up: https://cloud.google.com/
  - Enable billing (free tier available)
  
- [ ] **AWS Account** (for S3 storage)
  - Sign up: https://aws.amazon.com/
  - Enable billing
  
- [ ] **FileMaker Cloud** access ✅ (already configured)
  - Server: `walkeasy.fmcloud.fm`
  - Database: `WEP-DatabaseV2`
  - API access confirmed working

### Required Tools

- [ ] **Terraform** (>= 1.5.0)
  ```bash
  # macOS
  brew install terraform
  
  # Verify
  terraform version
  ```

- [ ] **Google Cloud SDK (gcloud)**
  ```bash
  # macOS
  brew install google-cloud-sdk
  
  # Verify
  gcloud --version
  ```

- [ ] **AWS CLI**
  ```bash
  # macOS
  brew install awscli
  
  # Verify
  aws --version
  ```

- [ ] **Docker** (for local development)
  ```bash
  # macOS
  brew install docker
  # Or download Docker Desktop from docker.com
  ```

- [ ] **Python 3.9+** (for ETL scripts, testing)
  ```bash
  python3 --version
  pip3 install requests python-dotenv boto3
  ```

- [ ] **PostgreSQL client** (optional, for DB inspection)
  ```bash
  brew install postgresql
  ```

---

## 2. Credential Reuse Strategy

If you have **existing applications** using Google Cloud and AWS, you can choose between **reusing credentials** or creating **separate credentials** for this project. Here's guidance on both approaches:

### Option A: Reuse Existing Credentials (Quick Start) ⚡

**When to use:**
- ✅ Rapid prototyping or development
- ✅ Small team with trusted access
- ✅ Both apps in same project/organization
- ✅ Simple setup requirements

**Benefits:**
- Faster setup (no new credentials needed)
- Single point of management
- Shared billing and monitoring

**Drawbacks:**
- ❌ Less security isolation
- ❌ Harder to audit per-app access
- ❌ Risk: One compromised credential affects both apps
- ❌ Can't apply different IAM policies per app

### Option B: Separate Credentials (Recommended) 🔒

**When to use:**
- ✅ Production applications
- ✅ Healthcare/PHI data (regulatory requirements)
- ✅ Different teams managing apps
- ✅ Compliance/audit requirements
- ✅ Different security policies needed

**Benefits:**
- ✅ Better security isolation
- ✅ Per-app access control and auditing
- ✅ Easy to rotate credentials independently
- ✅ Compliance-friendly (NDIS, HIPAA)
- ✅ Blast radius limited if credentials leak

**Drawbacks:**
- ⚠️ More initial setup time
- ⚠️ More credentials to manage

---

### Implementation Guide

#### **Scenario: Reusing Existing AWS Credentials**

If you already have AWS credentials from another app:

1. **Find your existing credentials:**
   ```bash
   # Check if you have AWS credentials configured
   aws sts get-caller-identity
   
   # List existing IAM users
   aws iam list-users
   ```

2. **Option A: Use existing IAM user for both apps**
   - Skip section 4.1 (Create IAM User)
   - Use existing Access Key ID and Secret
   - Add bucket permissions to existing IAM policy
   - ⚠️ Consider creating app-specific buckets with different prefixes

3. **Option B: Create new IAM user, reuse AWS account**
   - Follow section 4.1 to create `wep-s3-uploader` user
   - Keep existing credentials for other app
   - Both can exist in same AWS account

#### **Scenario: Reusing Existing GCP Credentials**

If you already have a GCP project and credentials:

1. **Use existing GCP project:**
   ```bash
   # List your existing projects
   gcloud projects list
   
   # Use existing project instead of creating new one
   gcloud config set project YOUR_EXISTING_PROJECT_ID
   ```

2. **Option A: Same project, separate service accounts** (Recommended)
   - Create new service accounts: `wep-api-sa`, `wep-web-sa`, etc.
   - Grant minimal permissions to new service accounts
   - Keep existing service accounts for other app
   - Both apps can share same GCP project

3. **Option B: Same project, reuse service accounts**
   - Use existing service accounts
   - Grant additional IAM roles needed for this app
   - ⚠️ Less isolation but simpler

4. **Option C: Separate GCP project**
   - Create new project (follow section 3.1)
   - Complete isolation
   - Separate billing

---

### Recommended Approach for WalkEasy Nexus

**Important Distinction:**
- **User Authentication (SSO):** Users logging into both apps → Shared auth provider ✅
- **Service Credentials:** Backend services accessing AWS/GCP resources → Can share or separate

#### Scenario: Same Company, SSO Required

If both applications are for **the same company** and you want **single sign-on (SSO)** for end users:

**For User Authentication:**
- ✅ **Same Auth Provider:** Use the same Firebase Auth / Auth0 / Cognito user pool for both apps
- ✅ **Single Login:** Users authenticate once and access both applications
- ✅ **Shared User Management:** One place to manage users, roles, and permissions

**For Service-Level Credentials (Backend Access):**

**Option 1: Reuse IAM User (Simpler, Acceptable for Same Company)** ⭐
- ✅ Reuse existing AWS IAM user for both applications
- ✅ Same Access Key ID / Secret Access Key
- ✅ One set of credentials to manage
- ⚠️ Both apps have same level of AWS access
- **When to use:** Same company, same team, same security posture, simpler management

**Option 2: Separate IAM User (More Secure, Better Audit)**
- ✅ Separate IAM user `ncc-s3-uploader` for WalkEasy Nexus
- ✅ Different credentials per app
- ✅ Better audit trail (know which app accessed what)
- ✅ Can apply different IAM policies per app
- **When to use:** Different security requirements, compliance audit needs, or different teams

#### ✅ **GCP: Your Choice Based on Preference**

**For Same Company with SSO - Using Same Credentials:**

**Approach: Reuse Existing GCP Project** ⭐
- ✅ Use your existing GCP project (same as other app)
- ✅ Create separate service accounts (`wep-api-sa`, `wep-web-sa`) in same project
- ✅ Share project resources, billing, and monitoring
- ✅ Same auth provider (Firebase Auth) across both apps for SSO
- ⚠️ Less isolation between apps
- **Suitable when:** Same team, similar security needs, simpler management, shared resources OK

**More Secure Approach (Option 2): Separate GCP Project**
- ✅ Create new project `walkeasy-nexus-dev`
- ✅ Complete isolation for compliance/audit
- ✅ Separate billing and resource quotas
- ✅ Better audit trails (know which app accessed what)
- ⚠️ More setup, separate billing account needed
- **Note:** Can still share same Firebase Auth project for user login SSO
- **Suitable when:** Healthcare/PHI data, compliance requirements, audit needs, or separate teams

#### ✅ **AWS: Reuse Existing IAM User**

**Using Same Credentials:**

**Approach: Reuse Existing IAM User** ⭐
- ✅ Reuse existing AWS IAM user credentials
- ✅ Both apps use same AWS access keys
- ✅ One set of credentials to manage
- ✅ Manage via separate S3 buckets (app-specific naming: `app1-docs`, `wep-docs-dev`)
- ✅ Simpler credential management
- ✅ Unified access control

#### 📝 **Credential Storage**

Since we're using the same credentials, you can reference the same secrets:

```bash
# If secrets already exist from other app, you can reference them
# OR create new secrets (they'll be shared)
gcloud secrets create AWS_ACCESS_KEY_ID --data-file=-  # If doesn't exist
gcloud secrets create AWS_SECRET_ACCESS_KEY --data-file=-  # If doesn't exist

# Both apps can reference the same secret names
```

---

### Quick Reference

| Resource | Strategy | Details |
|----------|----------|---------|
| **GCP Project** | ✅ **Reuse Existing** | Same project for both apps |
| **GCP Service Accounts** | Create New | Separate accounts (`wep-api-sa`, etc.) for audit |
| **AWS IAM User** | ✅ **Reuse Existing** | Same credentials for both apps |
| **S3 Buckets** | Create New | Separate buckets per app |
| **Authentication** | ✅ **Shared** | Same Firebase Auth for SSO |
| **Billing** | ✅ **Shared** | Unified billing and monitoring |

---

### Next Steps

**Follow these instructions to set up with shared credentials:**

1. ✅ **GCP:** Use existing project (Section 3.1, Option A)
2. ✅ **GCP:** Create new service accounts in existing project (Section 3.3)
3. ✅ **AWS:** Use existing IAM user (Section 4.1, Option B)
4. ✅ **AWS:** Create new S3 buckets for this app (Section 4.2)
5. ✅ **Auth:** Configure SSO with same Firebase Auth project

**Setup is simpler since you're reusing infrastructure!** 🎉

---

## 3. Google Cloud Platform (GCP) Setup

### 3.1 Create GCP Project

#### Option A: Use Existing GCP Project (Same Company, SSO) ⭐

If reusing your existing GCP project:

1. **List your existing projects:**
   ```bash
   gcloud projects list
   ```

2. **Set existing project as default:**
   ```bash
   gcloud config set project YOUR_EXISTING_PROJECT_ID
   ```

3. **Verify billing is enabled:**
   - Go to: **Billing** → Check billing account is linked
   - ⚠️ Enable budget alerts to avoid surprises

4. **Skip to section 3.3** (Create Service Accounts) - you'll create new service accounts in the existing project

#### Option B: Create New GCP Project (Isolation/Compliance)

If creating a separate project:

1. **Go to Cloud Console:** https://console.cloud.google.com/

2. **Create New Project:**
   ```bash
  gcloud projects create walkeasy-nexus-dev \
    --name="WalkEasy Nexus - Dev" \
     --set-as-default
   ```

3. **Enable Billing:**
   - Go to: **Billing** → Link billing account
   - Select your billing account
   - ⚠️ Enable budget alerts to avoid surprises

4. **Set Project ID:**
   ```bash
   gcloud config set project walkeasy-nexus-dev
   ```

### 3.2 Enable Required APIs

```bash
# Enable all required services
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  sql-component.googleapis.com \
  storage-component.googleapis.com \
  storage-api.googleapis.com \
  secretmanager.googleapis.com \
  cloudtasks.googleapis.com \
  cloudscheduler.googleapis.com \
  compute.googleapis.com \
  vpcaccess.googleapis.com \
  servicenetworking.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# Verify
gcloud services list --enabled
```

### 3.3 Create Service Accounts

**Note:** Even if reusing an existing GCP project, it's recommended to create separate service accounts for each app for better isolation and audit trails.

```bash
# API Service Account
gcloud iam service-accounts create wep-api-sa \
  --display-name="WalkEasy Nexus API Service Account"

# Web Service Account
gcloud iam service-accounts create wep-web-sa \
  --display-name="WalkEasy Nexus Web Service Account"

# Worker Service Account (for background jobs)
gcloud iam service-accounts create wep-worker-sa \
  --display-name="WalkEasy Nexus Worker Service Account"

# Grant roles to API service account
# Use PROJECT_ID variable (works with existing or new project)
PROJECT_ID=$(gcloud config get-value project)

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:wep-api-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:wep-api-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:wep-api-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Grant Cloud Tasks access to Worker SA
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:wep-worker-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudtasks.enqueuer"
```

### 3.4 Authentication Setup

```bash
# Authenticate for application-default credentials
gcloud auth application-default login

# Verify
 near gcloud auth list
```

---

## 4. AWS Setup (S3)

### 4.1 Create AWS Account & Configure CLI

#### Option A: Create New IAM User (Recommended)

1. **Sign in to AWS Console:** https://console.aws.amazon.com/

2. **Create IAM User for S3 Access:**
   - Go to **IAM** → **Users** → **Create user**
   - Username: `wep-s3-uploader`
   - Select: **Programmatic access**

3. **Attach Policy:**
   - Go to **Permissions** → **Attach policies directly**
   - Create custom policy (see section 4.4) or use `AmazonS3FullAccess` (for dev only)

4. **Save Credentials:**
   - Download Access Key ID and Secret Access Key
   - ⚠️ Store securely - we'll add to Secret Manager later

#### Option B: Reuse Existing IAM User

If you already have AWS credentials from another app:

1. **Verify existing credentials:**
   ```bash
   # Check current AWS identity
   aws sts get-caller-identity
   
   # List existing users
   aws iam list-users
   ```

2. **Option 1: Add bucket permissions to existing user**
   - Add S3 bucket permissions to your existing IAM user's policy
   - Use existing Access Key ID and Secret
   - ⚠️ Ensure policy only grants access to WalkEasy Nexus buckets

3. **Option 2: Create app-specific policy attached to existing user**
   - Create new policy `wep-s3-policy` (see section 4.4)
   - Attach to existing IAM user
   - Both apps can use same user with different policies

4. **Configure AWS CLI:**
   ```bash
   aws configure
   # Enter:
   # - AWS Access Key ID: [existing or new]
   # - AWS Secret Access Key: [existing or new]
   # - Default region: ap-southeast-2
   # - Default output: json
   ```

#### Option C: Use AWS Profiles (Multiple Apps)

If managing multiple apps, use AWS profiles:

```bash
# Configure profile for WalkEasy Nexus
aws configure --profile wep-dev
# Enter credentials for wep-s3-uploader

# Configure profile for other app
aws configure --profile other-app
# Enter credentials for other app's user

# Use specific profile
aws s3 ls --profile wep-dev
aws s3 ls --profile other-app

# Set as default
export AWS_PROFILE=wep-dev
```

### 4.2 Create S3 Bucket

```bash
# Create bucket for dev environment
aws s3 mb s3://wep-docs-dev --region ap-southeast-2

# Create bucket for staging (optional)
aws s3 mb s3://wep-docs-staging --region ap-southeast-2

# Verify
aws s3 ls
```

### 4.3 Configure Bucket Settings

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket wep-docs-dev \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket wep-docs-dev \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket wep-docs-dev \
  --server-side-encryption-configuration \
  '{"Rules":[{"name":"default","ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Configure CORS (for browser uploads)
cat > cors.json <<EOF
{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["PUT", "GET", "POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }]
}
EOF

aws s3api put-bucket-cors \
  --bucket wep-docs-dev \
  --cors-configuration file://cors.json
```

### 4.4 Create IAM Policy (More Secure)

**Note:** If reusing existing IAM user, you can add this policy to that user or create a new policy specifically for Walk Easy buckets.

Create a policy file `s3-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:HeadObject",
        "s3:AbortMultipartUpload",
        "s3:ListBucketMultipartUploads"
      ],
      "Resource": [
        "arn:aws:s3:::wep-docs-dev",
        "arn:aws:s3:::wep-docs-dev/*"
      ]
    }
  ]
}
```

```bash
# Create policy
aws iam create-policy \
  --policy-name wep-s3-policy \
  --policy-document file://s3-policy.json

# Attach to user (replace ACCOUNT_ID)
aws iam attach-user-policy \
  --user-name wep-s3-uploader \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/wep-s3-policy
```

---

## 5. Database Setup

### 5.1 Create Cloud SQL Instance (Using Terraform - Recommended)

The Terraform starter includes database setup. Alternatively, create manually:

```bash
# Create Cloud SQL PostgreSQL instance
gcloud sql instances create wep-postgres-dev \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=australia-southeast1 \
  --root-password=CHANGE_ME_PASSWORD \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --database-flags=shared_preload_libraries=pg_stat_statements

# Create database
gcloud sql databases create wep_db --instance=wep-postgres-dev

# Create app user
gcloud sql users create wep_app_user \
  --instance=wep-postgres-dev \
  --password=CHANGE_ME_PASSWORD
```

### 5.2 Or Use Terraform (Recommended)

```bash
cd ChatGPT_Docs/terraform-starter

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# Edit these values:
# - project_id = "walkeasy-patients-dev"
# - db_password = "YOUR_STRONG_PASSWORD"
# - region = "australia-southeast1"

# Initialize and apply
terraform init
terraform plan
terraform apply
```

### 5.3 Connect to Database

```bash
# Get connection name
gcloud sql instances describe wep-postgres-dev \
  --format="value(connectionName)"

# Connect via Cloud SQL Proxy (local development)
# Download proxy: https://cloud.google.com/sql/docs/postgres/connect-instance-cloud-sql-proxy

cloud-sql-proxy INSTANCE_CONNECTION_NAME

# In another terminal, connect with psql
psql -h 127.0.0.1 -U wep_app_user -d wep_db
```

### 5.4 Apply Initial Schema

```bash
# Apply the target PostgreSQL schema
psql -h HOST -U wep_app_user -d wep_db -f 02-Target-Postgres-Schema.md

# Or create migrations directory and use Alembic (Django/DRF)
# See migration strategy in 03-Staging-and-Mapping.md
```

---

## 6. Secret Management

### 6.1 Store Secrets in GCP Secret Manager

**Important:** If you're reusing existing credentials, you can either:
- Store new app-specific secrets separately (recommended)
- Reference existing secrets if they're in the same GCP project

```bash
# Database connection string
echo "postgresql://wep_app_user:PASSWORD@/wep_db?host=/cloudsql/PROJECT:REGION:INSTANCE" | \
  gcloud secrets create DATABASE_URL --data-file=-

# AWS S3 Credentials
echo "YOUR_AWS_ACCESS_KEY_ID" | \
  gcloud secrets create AWS_ACCESS_KEY_ID --data-file=-

echo "YOUR_AWS_SECRET_ACCESS_KEY" | \
  gcloud secrets create AWS_SECRET_ACCESS_KEY --data-file=-

# FileMaker API Credentials
echo "https://walkeasy.fmcloud.fm" | \
  gcloud secrets create FM_BASE_URL --data-file=-

echo "WEP-DatabaseV2" | \
  gcloud secrets create FM_DB_NAME --data-file=-

echo "Craig" | \
  gcloud secrets create FM_USERNAME --data-file=-

echo "Marknet//2" | \
  gcloud secrets create FM_PASSWORD --data-file=-

# Xero (add when setting up integration)
# gcloud secrets create XERO_CLIENT_ID --data-file=-
# gcloud secrets create XERO_CLIENT_SECRET --data-file=-

# SMS Broadcast (add when setting up integration)
# gcloud secrets create SMSB_USERNAME --data-file=-
# gcloud secrets create SMSB_PASSWORD --data-file=-

# Verify secrets
gcloud secrets list
```

### 6.2 Grant Access to Service Accounts

```bash
# Grant API service account access to secrets
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:wep-api-sa@walkeasy-patients-dev.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for other secrets...
```

---

## 7. FileMaker Connection

✅ **Already configured and tested!**

Your FileMaker connection is working:
- **Server:** `https://walkeasy.fmcloud.fm`
- **Database:** `WEP-DatabaseV2`
- **Credentials:** Stored in `.env` file (local) and Secret Manager (cloud)

**Test connectivity:**
```bash
cd /Users/craig/Documents/1.Filemaker_Test
python3 test_fm_api.py
```

---

## 8. Local Development Environment

### 8.1 Clone/Create Project Structure

```bash
# Create project directory
mkdir -p ~/walkeasy-platform
cd ~/walkeasy-platform

# Initialize git
git init
git remote add origin YOUR_GIT_REPO_URL

# Create directory structure
mkdir -p {backend,frontend,terraform,etl,scripts,docs}
```

### 8.2 Backend Setup (Django/DRF)

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install django djangorestframework \
  psycopg2-binary python-dotenv \
  requests boto3 \
  celery redis \
  gunicorn

# Create Django project
django-admin startproject wep_api .
python manage.py startapp patients
python manage.py startapp appointments

# Create .env file
cat > .env <<EOF
DATABASE_URL=postgresql://wep_app_user:PASSWORD@localhost:5432/wep_db
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=YOUR_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET
S3_BUCKET=wep-docs-dev
FM_BASE_URL=https://walkeasy.fmcloud.fm
FM_DB_NAME=WEP-DatabaseV2
FM_USERNAME=Craig
FM_PASSWORD=Marknet//2
SECRET_KEY=YOUR_DJANGO_SECRET_KEY
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
EOF
```

### 8.3 Frontend Setup (Next.js + Mantine)

```bash
cd ../frontend

# Option 1: Use Mantine Next.js template (Recommended)
# Go to: https://github.com/mantinedev/next-app-template
# Click "Use this template" button to create your repo

# Option 2: Create Next.js app and add Mantine manually
npx create-next-app@latest . --typescript --tailwind --app

# Install Mantine core packages
npm install @mantine/core @mantine/hooks

# Install Mantine form (for patient/appointment forms)
npm install @mantine/form

# Install Mantine dates (for date pickers, calendar)
npm install @mantine/dates dayjs

# Install Mantine notifications (for toast messages)
npm install @mantine/notifications

# Install Mantine modals (optional, for modal management)
npm install @mantine/modals

# Install PostCSS dependencies (required for Mantine)
npm install --save-dev postcss postcss-preset-mantine postcss-simple-vars

# Install calendar dependencies (FullCalendar for scheduling)
npm install @fullcalendar/react \
  @fullcalendar/daygrid \
  @fullcalendar/timegrid \
  @fullcalendar/resource-timegrid \
  @fullcalendar/interaction \
  luxon rrule

# Create postcss.config.cjs
cat > postcss.config.cjs <<EOF
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
EOF

# Create .env.local
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENV=development
EOF
```

**Next.js App Router Setup:**

Create or update `app/layout.tsx` to include Mantine:

```tsx
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';

export const metadata = {
  title: 'Walk Easy Patient Platform',
  description: 'Patient management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>
          <ModalsProvider>
            <Notifications />
            {children}
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
```

**VS Code Setup (Optional but Recommended):**

Install VS Code extensions:
- PostCSS Intellisense and Highlighting
- CSS Variable Autocomplete

Create `.vscode/settings.json`:
```json
{
  "cssVariables.lookupFiles": [
    "**/*.css",
    "**/*.scss",
    "**/*.sass",
    "**/*.less",
    "node_modules/@mantine/core/styles.css"
  ]
}
```

### 8.4 ETL Scripts Setup

```bash
cd ../etl

# Copy your test script
cp /Users/craig/Documents/1.Filemaker_Test/test_fm_api.py .

# Create requirements.txt
cat > requirements.txt <<EOF
requests>=2.31.0 principython-dotenv>=1.0.0
psycopg2-binary>=2.9.0
boto3>=1.28.0
EOF

pip install -r requirements.txt
```

---

## 9. Testing & Validation

### 9.1 Test Cloud SQL Connection

```bash
# Using Cloud SQL Proxy
cloud-sql-proxy walkeasy-patients-dev:australia-southeast1:wep-postgres-dev

# In another terminal
psql -h 127.0.0.1 -U wep_app_user -d wep_db -c "SELECT version();"
```

### 9.2 Test S3 Access

```bash
# Test upload
echo "test file" > test.txt
aws s3 cp test.txt s3://wep-docs-dev/test/test.txt

# Test download
aws s3 cp s3://wep-docs-dev/test/test.txt test-download.txt

# List bucket
aws s3 ls s3://wep-docs-dev/
```

### 9.3 Test FileMaker API

```bash
cd /Users/craig/Documents/1.Filemaker_Test
python3 test_fm_api.py
```

### 9.4 Test Secret Manager Access

```bash
# List secrets
gcloud secrets list

# Access a secret
gcloud secrets versions access latest --secret="DATABASE_URL"

# Test from application
python3 -c "
from google.cloud import secretmanager
client = secretmanager.SecretManagerServiceClient()
name = 'projects/walkeasy-patients-dev/secrets/DATABASE_URL/versions/latest'
response = client.access_secret_version(request={'name': name})
print(response.payload.data.decode('UTF-8'))
"
```

---

## 10. Cost Estimation

### Development Environment (Monthly Estimate)

| Service | Resource | Estimated Cost (AUD) |
|---------|----------|---------------------|
| **Cloud SQL** | db-f1-micro (dev) | $10-15 |
| **Cloud Run** | Minimal usage (dev) | $0-5 |
| **Cloud Storage** | 10GB storage | $0.30 |
| **Secret Manager** | < 10 secrets | $0 |
| **Cloud Tasks** | < 1M operations | $0 |
| **S3** | 10GB storage + requests | $0.50 |
| **Data Transfer** | Minimal (dev) | $0-5 |
| **Total** | | **$15-25/month** |

### Production Environment (Monthly Estimate)

| Service | Resource | Estimated Cost (AUD) |
|---------|----------|---------------------|
| **Cloud SQL** | db-custom-2-8192 | $150-200 |
| **Cloud Run** | 24/7 with min instances | $50-100 |
| **Cloud Storage** | 100GB storage | $3 |
| **Cloud Tasks/Scheduler** | 1M+ operations | $5 |
| **S3** | 100GB + CDN | $3 |
| **Data Transfer** | Moderate usage | $20-50 |
| **Total** | | **$250-400/month** |

⚠️ **Enable Budget Alerts:**
```bash
# Set budget alert at $50/month for dev
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Walk Easy Dev Budget" \
  --budget-amount=50AUD \
  --threshold-percent=50,75,90,100
```

---

## ✅ Checklist Summary

### Accounts & Tools
- [ ] GCP account created and billing enabled
- [ ] AWS account created and billing enabled
- [ ] Terraform installed
- [ ] gcloud CLI installed and authenticated
- [ ] AWS CLI installed and configured
- [ ] Docker installed (optional)

### GCP Setup
- [ ] Project created
- [ ] Required APIs enabled
- [ ] Service accounts created
- [ ] IAM roles configured

### AWS Setup
- [ ] IAM user created
- [ ] S3 buckets created (dev, staging)
- [ ] Bucket policies and encryption configured
- [ ] CORS configured

### Database
- [ ] Cloud SQL instance created
- [ ] Database and user created
- [ ] Connection tested
- [ ] Initial schema applied

### Secrets
- [ ] All secrets stored in Secret Manager
- [ ] Service account access granted
- [ ] DM Secrets can be accessed

### Local Environment
- [ ] Backend project initialized
- [ ] Frontend project initialized
- [ ] .env files configured
- [ ] Dependencies installed

### Testing
- [ ] Cloud SQL connection works
- [ ] S3 upload/download works
- [ ] FileMaker API works
- [ bez ] Secret Manager access works

---

## 🚀 Next Steps

Once environment setup is complete:

1. **Apply Database Schema** — Run migrations from `02-Target-Postgres-Schema.md`
2. **Set up Staging Tables** — Create staging schema per `03-Staging-and-Mapping.md`
3. **Build ETL Pipeline** — Extract data from FileMaker
4. **Deploy API** — Deploy Django/DRF to Cloud Run
5. **Deploy Frontend** — Deploy Next.js to Cloud Run
6. **Test Integrations** — Xero, SMS Broadcast (when ready)

---

## 📚 Additional Resources

- **GCP Documentation:** https://cloud.google.com/docs
- **AWS S3 Documentation:** https://docs.aws.amazon.com/s3/
- **Terraform GCP Provider:** https://registry.terraform.io/providers/hashicorp/google/latest/docs
- **FileMaker Data API:** https://help.claris.com/en/data-api-guide/

---

**Questions or Issues?** Refer to the troubleshooting sections in:
- `Hosting_Decision_Guide.md` — Infrastructure decisions
- `TROUBLESHOOTING_REPORT.md` — FileMaker connectivity issues

