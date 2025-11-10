# Google Cloud Platform (GCP) Setup Guide

**Date:** November 10, 2025  
**Goal:** Set up GCP for Nexus Core Clinic production deployment  
**Architecture:** Hybrid AWS S3 + GCP Compute

---

## 📋 **What We're Setting Up:**

1. ✅ **GCP Account** (if you don't have one)
2. ✅ **GCP Project** for Nexus
3. ✅ **Enable Required APIs**
4. ✅ **Cloud Run** (Django API)
5. ✅ **Cloud SQL** (PostgreSQL)
6. ✅ **Memorystore** (Redis)
7. ✅ **Secret Manager** (API keys)
8. ✅ **Service Accounts** (permissions)
9. ✅ **Billing** (set up and verify)

---

## 🚀 **Step 1: Create/Access GCP Account**

### **If You Already Have Google Account for OAuth:**

1. **Go to:** https://console.cloud.google.com
2. **Sign in** with your Google account (the same one you use for Gmail OAuth)
3. **You'll see:** Google Cloud Console dashboard

### **If You Need New Account:**

1. **Go to:** https://cloud.google.com
2. **Click:** "Get started for free"
3. **Sign in** with Google account
4. **Fill out:** Country, organization type, payment info
   - ✅ You get **$300 free credits** for 90 days!
5. **Accept:** Terms of service

---

## 🎯 **Step 2: Create a New Project**

### **Why a New Project?**
- Keeps Nexus separate from other Google services
- Easier billing tracking
- Cleaner permissions management

### **How to Create:**

1. **Go to:** https://console.cloud.google.com
2. **Click:** Project dropdown at top (says "My Project" or similar)
3. **Click:** "New Project"
4. **Fill in:**
   - **Project name:** `Nexus Core Clinic` (or `nexus-walkeasy`)
   - **Project ID:** `nexus-walkeasy-prod` (must be unique globally)
   - **Location:** No organization (unless you have Google Workspace)
5. **Click:** "Create"
6. **Wait:** 30 seconds for project creation
7. **Select:** Your new project from dropdown

**✅ IMPORTANT:** Copy your **Project ID** - you'll need it!

**Your Project ID:** `___________________________` (write it down!)

---

## 🔌 **Step 3: Enable Required APIs**

GCP requires you to explicitly enable APIs before using them.

### **Enable All Required APIs:**

1. **Go to:** https://console.cloud.google.com/apis/library
2. **Make sure** your Nexus project is selected (top dropdown)
3. **Search and enable** each of these (click "Enable"):

#### **Core APIs:**
- [ ] **Cloud Run API** - For Django backend
- [ ] **Cloud SQL Admin API** - For PostgreSQL database
- [ ] **Cloud Redis API** - For Memorystore (cache)
- [ ] **Secret Manager API** - For storing API keys
- [ ] **Cloud Logging API** - For logs
- [ ] **Cloud Build API** - For building Docker images

#### **Supporting APIs:**
- [ ] **Compute Engine API** - Backend for Cloud SQL
- [ ] **Service Networking API** - For VPC connections
- [ ] **Cloud Resource Manager API** - For project management

### **Quick Enable All (Command Line):**

If you prefer, you can enable all at once using Cloud Shell:

1. **Click:** Cloud Shell icon (>_) at top right of Console
2. **Run this command:**

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  logging.googleapis.com \
  cloudbuild.googleapis.com \
  compute.googleapis.com \
  servicenetworking.googleapis.com \
  cloudresourcemanager.googleapis.com
```

3. **Wait:** 1-2 minutes for all APIs to enable
4. **You'll see:** "Operation finished successfully" messages

---

## 💳 **Step 4: Set Up Billing**

### **Link Billing Account:**

1. **Go to:** https://console.cloud.google.com/billing
2. **If you have free credits:** You'll see "$300 credit, X days remaining"
3. **If prompted:** Link a billing account
   - **Click:** "Link a billing account"
   - **Select:** Your billing account (or create new)
   - **Add:** Credit card (required even with free credits)

### **Set Up Budget Alerts:**

1. **Go to:** https://console.cloud.google.com/billing/budgets
2. **Click:** "Create Budget"
3. **Fill in:**
   - **Name:** "Nexus Monthly Budget"
   - **Budget amount:** $250 AUD (safe buffer above $166 estimate)
   - **Alert thresholds:** 50%, 90%, 100%
   - **Email alerts:** Your email address
4. **Click:** "Finish"

**✅ You'll get email alerts if costs exceed thresholds!**

---

## 🗄️ **Step 5: Create Cloud SQL Instance (PostgreSQL)**

### **What We're Creating:**
- **Instance:** PostgreSQL 14
- **Machine type:** db-f1-micro (1 vCPU, 0.6 GB RAM)
- **Storage:** 10 GB SSD (auto-scaling enabled)
- **Region:** australia-southeast1 (Sydney)
- **Backups:** Daily automated backups

### **How to Create:**

1. **Go to:** https://console.cloud.google.com/sql/instances
2. **Click:** "Create Instance"
3. **Choose:** "PostgreSQL"
4. **Fill in:**

#### **Instance Info:**
- **Instance ID:** `nexus-postgres-prod`
- **Password:** Generate strong password (save it!)
- **Database version:** PostgreSQL 14
- **Region:** `australia-southeast1` (Sydney)
- **Zonal availability:** Single zone (cheaper, sufficient for start)

#### **Machine Configuration:**
- **Preset:** "Lightweight" or "Development"
- **Machine type:** Click "Show configuration options" → "Shared core" → "db-f1-micro"
- **Storage:** 10 GB SSD
- **Enable automatic storage increases:** ✅ YES

#### **Connections:**
- **Public IP:** ✅ YES (we'll restrict later)
- **Private IP:** ❌ NO (for now - can add later)
- **Authorized networks:** Leave empty (we'll configure with Cloud Run)

#### **Backups:**
- **Automated backups:** ✅ YES
- **Backup window:** Choose off-peak time (e.g., 3:00 AM AEST)
- **Point-in-time recovery:** ✅ YES (7 days)
- **Location:** Same as instance (australia-southeast1)

#### **Maintenance:**
- **Maintenance window:** Choose off-peak time (e.g., Sunday 2:00 AM AEST)

5. **Click:** "Create Instance"
6. **Wait:** 5-10 minutes for instance creation

**✅ SAVE THESE:**
- **Instance connection name:** `your-project-id:australia-southeast1:nexus-postgres-prod`
- **Root password:** `___________________________` (SECURE THIS!)

---

## 🔴 **Step 6: Create Memorystore Redis Instance**

### **What We're Creating:**
- **Instance:** Redis 7.x
- **Tier:** Basic (single node)
- **Size:** 1 GB
- **Region:** australia-southeast1 (Sydney)

### **How to Create:**

1. **Go to:** https://console.cloud.google.com/memorystore/redis/instances
2. **Click:** "Create Instance"
3. **Fill in:**

#### **Instance Info:**
- **Instance ID:** `nexus-redis-cache`
- **Display name:** `Nexus Redis Cache`
- **Tier:** Basic (1 GB capacity)
- **Region:** `australia-southeast1`
- **Zone:** `australia-southeast1-a` (or any)
- **Redis version:** 7.0

#### **Capacity:**
- **Memory:** 1 GB (can scale up later)

#### **Network:**
- **Network:** default
- **Connection mode:** Direct peering (default)

4. **Click:** "Create"
5. **Wait:** 3-5 minutes for instance creation

**✅ SAVE THIS:**
- **Redis host:** `10.x.x.x` (you'll see this after creation)
- **Redis port:** `6379` (default)

---

## 🔐 **Step 7: Set Up Secret Manager**

We'll store all sensitive credentials here (database passwords, API keys, etc.).

### **Enable Secret Manager:**
Already done in Step 3! ✅

### **Create Secrets:**

1. **Go to:** https://console.cloud.google.com/security/secret-manager
2. **For EACH secret below, click "Create Secret":**

#### **Secret 1: Django Secret Key**
- **Name:** `django-secret-key`
- **Secret value:** Run this to generate:
  ```bash
  python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
  ```
- **Click:** "Create Secret"

#### **Secret 2: Database Password**
- **Name:** `postgres-password`
- **Secret value:** (your PostgreSQL root password from Step 5)
- **Click:** "Create Secret"

#### **Secret 3: Database URL**
- **Name:** `database-url`
- **Secret value:** 
  ```
  postgresql://postgres:YOUR_PASSWORD@/nexus_db?host=/cloudsql/YOUR_PROJECT_ID:australia-southeast1:nexus-postgres-prod
  ```
  (Replace YOUR_PASSWORD and YOUR_PROJECT_ID)
- **Click:** "Create Secret"

#### **Secret 4: Redis URL**
- **Name:** `redis-url`
- **Secret value:** `redis://YOUR_REDIS_IP:6379/0` (get IP from Step 6)
- **Click:** "Create Secret"

#### **Secret 5: AWS S3 Credentials**
- **Name:** `aws-access-key-id`
- **Secret value:** Your AWS access key (from local .env)
- **Click:** "Create Secret"

- **Name:** `aws-secret-access-key`
- **Secret value:** Your AWS secret key (from local .env)
- **Click:** "Create Secret"

#### **Secret 6: Gmail OAuth**
- **Name:** `gmail-client-id`
- **Secret value:** Your Gmail client ID
- **Click:** "Create Secret"

- **Name:** `gmail-client-secret`
- **Secret value:** Your Gmail client secret
- **Click:** "Create Secret"

#### **Secret 7: Xero OAuth**
- **Name:** `xero-client-id`
- **Secret value:** Your Xero client ID
- **Click:** "Create Secret"

- **Name:** `xero-client-secret`
- **Secret value:** Your Xero client secret
- **Click:** "Create Secret"

#### **Secret 8: SMS Broadcast**
- **Name:** `sms-broadcast-username`
- **Secret value:** Your SMS Broadcast username
- **Click:** "Create Secret"

- **Name:** `sms-broadcast-password`
- **Secret value:** Your SMS Broadcast password
- **Click:** "Create Secret"

#### **Secret 9: OpenAI**
- **Name:** `openai-api-key`
- **Secret value:** Your OpenAI API key
- **Click:** "Create Secret"

**✅ All secrets stored securely!**

---

## 👤 **Step 8: Create Service Account**

Service accounts allow Cloud Run to access other GCP services.

### **Create Service Account:**

1. **Go to:** https://console.cloud.google.com/iam-admin/serviceaccounts
2. **Click:** "Create Service Account"
3. **Fill in:**
   - **Name:** `nexus-cloud-run`
   - **Description:** `Service account for Nexus Cloud Run backend`
4. **Click:** "Create and Continue"

### **Grant Roles:**

**Click "Select a role" and add each:**
- [ ] **Cloud SQL Client** - Access PostgreSQL
- [ ] **Redis Reader** - Access Redis
- [ ] **Secret Manager Secret Accessor** - Read secrets
- [ ] **Cloud Run Invoker** - Deploy and run containers
- [ ] **Logs Writer** - Write application logs

5. **Click:** "Continue"
6. **Click:** "Done"

**✅ Service account created with necessary permissions!**

---

## 📊 **Step 9: Verify Setup**

Let's make sure everything is ready:

### **Checklist:**

- [ ] **GCP Project created** - Project ID: `_____________`
- [ ] **All APIs enabled** - 9 APIs enabled
- [ ] **Billing linked** - Credit card added, budget alert set
- [ ] **Cloud SQL instance running** - PostgreSQL 14, australia-southeast1
- [ ] **Memorystore instance running** - Redis 7.x, 1 GB
- [ ] **Secrets created** - 13+ secrets in Secret Manager
- [ ] **Service account created** - `nexus-cloud-run` with 5 roles

### **Quick Verification Commands:**

Open Cloud Shell (>_ icon) and run:

```bash
# Verify project
gcloud config get-value project

# Verify Cloud SQL
gcloud sql instances list

# Verify Redis
gcloud redis instances list --region=australia-southeast1

# Verify secrets
gcloud secrets list

# Verify service account
gcloud iam service-accounts list
```

**You should see all your resources listed!** ✅

---

## 💰 **Estimated Monthly Costs (So Far):**

| Service | Cost (AUD) |
|:--------|----------:|
| Cloud SQL (db-f1-micro, 10 GB) | $60-80 |
| Memorystore Redis (1 GB) | $20 |
| Secret Manager (13 secrets) | $0.12 |
| **Subtotal** | **$80-100** |

**Still to add:**
- Cloud Run (serverless compute): $15-25/month
- Cloud Logging: $10/month
- Backups: $20-25/month

**Total estimated:** $125-160/month ✅ (under $166 budget!)

---

## 🎯 **What's Next?**

Now that GCP is set up, we can:

1. ✅ **Set up DNS** (Crazy Domains → Route 53 → Cloud Run)
2. ✅ **Build Docker image** for Django
3. ✅ **Deploy to Cloud Run**
4. ✅ **Create production database**
5. ✅ **Migrate data**

**Do you want to proceed with DNS setup next?** 📧

---

## 📝 **Important Information to Save:**

### **GCP Project:**
- **Project ID:** `_________________________`
- **Project Number:** `_________________________`

### **Cloud SQL:**
- **Instance name:** `nexus-postgres-prod`
- **Connection name:** `_________________________`
- **Root password:** `_________________________` (SECURE!)

### **Memorystore Redis:**
- **Instance name:** `nexus-redis-cache`
- **IP address:** `_________________________`
- **Port:** `6379`

### **Service Account:**
- **Email:** `nexus-cloud-run@YOUR-PROJECT-ID.iam.gserviceaccount.com`

**🔒 SECURITY NOTE:** Keep all passwords and connection strings secure! Never commit to Git!

---

## 🆘 **Troubleshooting:**

### **"API not enabled" errors:**
- Go back to Step 3 and enable the required API

### **"Permission denied" errors:**
- Make sure billing is set up (Step 4)
- Make sure service account has correct roles (Step 8)

### **"Quota exceeded" errors:**
- You may need to request quota increases for new GCP accounts
- Usually resolved within 24 hours automatically

### **Can't create Cloud SQL instance:**
- Make sure Compute Engine API is enabled
- Make sure billing is set up

---

## ✅ **Ready for DNS Setup!**

Once you've completed all steps above, we can proceed to DNS setup with Crazy Domains.

**Current Status:**
- ✅ GCP infrastructure: READY
- ⏸️ DNS configuration: NEXT
- ⏸️ Application deployment: AFTER DNS

Let me know when you're ready to proceed! 🚀

---

**Last Updated:** November 10, 2025  
**Next Doc:** `DNS_SETUP_GUIDE.md`

