# Production Deployment Plan - WalkEasy Nexus

**Date:** November 9, 2025  
**Status:** 🚧 Planning Phase  
**Current Environment:** Local Development (macOS with HTTPS, ngrok webhooks)

---

## 📋 Table of Contents

1. [Current Architecture](#current-architecture)
2. [Hosting Options Analysis](#hosting-options-analysis)
3. [Recommended Stack](#recommended-stack)
4. [Infrastructure Requirements](#infrastructure-requirements)
5. [Migration Strategy](#migration-strategy)
6. [Security & Compliance](#security--compliance)
7. [Cost Estimates](#cost-estimates)
8. [Deployment Checklist](#deployment-checklist)
9. [Open Questions](#open-questions)

---

## 🏗️ Current Architecture

### Technology Stack
- **Backend:** Django 4.2 (Python 3.9+)
- **Frontend:** Next.js 14 (React 18, TypeScript)
- **Database:** PostgreSQL 14+
- **Storage:** AWS S3 (walkeasy-nexus-documents)
- **Cache/Sessions:** Django default (database-backed)
- **Local HTTPS:** mkcert self-signed certificates

### Integrations (Production-Ready)
- ✅ **Google OAuth** - User authentication (django-allauth)
- ✅ **Gmail** - OAuth2, multi-account email sending
- ✅ **Xero** - OAuth2, contact sync, invoicing
- ✅ **SMS Broadcast** - SMS sending, webhook receiver
- ✅ **AWS S3** - Document/image storage
- ✅ **OpenAI** - GPT-4o-mini, clinical notes, AT reports
- ✅ **FileMaker** - Data migration (via OData + Data API)

### Development URLs
- Frontend: https://localhost:3000
- Backend API: https://localhost:8000
- Webhooks (ngrok): https://ignacio-interposable-uniformly.ngrok-free.dev

---

## ☁️ Hosting Options Analysis

### Option 1: AWS (Full Stack) ⭐ **RECOMMENDED**

**Pros:**
- ✅ Already using S3 (documents storage)
- ✅ Excellent ecosystem integration
- ✅ Proven reliability for healthcare apps
- ✅ Strong security/compliance features (HIPAA eligible)
- ✅ Mature PostgreSQL service (RDS)
- ✅ Easy to scale vertically and horizontally
- ✅ Great monitoring/logging (CloudWatch)
- ✅ Can host static Next.js on CloudFront + S3

**Cons:**
- ❌ Can be complex to configure initially
- ❌ Costs can escalate if not monitored
- ❌ Requires AWS expertise

**Services Needed:**
- **Elastic Beanstalk** or **ECS (Fargate)** - Django backend
- **Amplify** or **CloudFront + S3** - Next.js frontend
- **RDS PostgreSQL** - Database
- **S3** - Already using for documents
- **CloudWatch** - Logging and monitoring
- **Route 53** - DNS management
- **ACM** - SSL certificates
- **Application Load Balancer** - Traffic distribution
- **Secrets Manager** - API keys, credentials
- **ElastiCache (Redis)** - Optional: Session/cache store

**Estimated Monthly Cost:** $150-300 AUD (small to medium scale)

---

### Option 2: Heroku + AWS S3

**Pros:**
- ✅ Easiest to deploy (git push)
- ✅ Built-in PostgreSQL (Heroku Postgres)
- ✅ Simple scaling
- ✅ Great for Django apps
- ✅ Automatic SSL
- ✅ Low ops overhead

**Cons:**
- ❌ More expensive for same resources
- ❌ Less control over infrastructure
- ❌ Vendor lock-in
- ❌ Limited customization
- ❌ Australia doesn't have Heroku region (latency)

**Services Needed:**
- **Heroku Dynos** - Django backend (Web + Worker)
- **Heroku Postgres** - Database
- **AWS S3** - Documents (already set up)
- **Heroku Add-ons** - Redis, monitoring, logging

**Estimated Monthly Cost:** $250-400 AUD

---

### Option 3: DigitalOcean (App Platform + Managed Services)

**Pros:**
- ✅ Simpler than AWS, more control than Heroku
- ✅ Competitive pricing
- ✅ Great documentation
- ✅ Managed PostgreSQL and Redis
- ✅ App Platform supports Django + Next.js
- ✅ Sydney datacenter (low latency)

**Cons:**
- ❌ Less mature than AWS
- ❌ Fewer compliance certifications
- ❌ Would need to migrate S3 bucket or configure cross-provider
- ❌ Smaller ecosystem

**Services Needed:**
- **App Platform** - Django + Next.js
- **Managed PostgreSQL** - Database
- **Managed Redis** - Cache/sessions
- **Spaces (Object Storage)** - Alternative to S3
- **Load Balancer** - Traffic distribution

**Estimated Monthly Cost:** $120-250 AUD

---

### Option 4: Azure (Microsoft Cloud)

**Pros:**
- ✅ Strong presence in Australia
- ✅ Good for healthcare (compliance)
- ✅ Excellent PostgreSQL service
- ✅ Well-integrated with Microsoft ecosystem

**Cons:**
- ❌ More complex than DigitalOcean
- ❌ Pricing can be confusing
- ❌ Less Django-specific resources

**Estimated Monthly Cost:** $180-350 AUD

---

### Option 5: Google Cloud Platform (GCP) ⭐ **WORTH CONSIDERING**

**Pros:**
- ✅ **Already using Google OAuth** - seamless integration
- ✅ Sydney region available (`australia-southeast1`)
- ✅ Cloud Run (serverless) for Django - simple, auto-scaling
- ✅ Cloud SQL for PostgreSQL - managed database
- ✅ Cloud Storage - alternative to S3 (but would need migration)
- ✅ Unified billing with other Google services
- ✅ Good performance and reliability
- ✅ Generous free tier (might reduce costs)

**Cons:**
- ❌ **Need to migrate S3 bucket** from AWS to Google Cloud Storage
- ❌ Less Django-specific documentation than AWS
- ❌ Pricing can be complex (but often cheaper than AWS)
- ❌ Smaller ecosystem than AWS

**Estimated Monthly Cost:** $150-220 AUD (potentially cheaper than AWS)

**Services Needed:**
- **Cloud Run** - Django backend (serverless containers)
- **Cloud SQL** - PostgreSQL database
- **Cloud Storage** - Documents/images (need to migrate from S3)
- **Cloud CDN** - Frontend delivery
- **Cloud Load Balancing** - Traffic distribution
- **Cloud Logging** - Monitoring
- **Secret Manager** - API keys, credentials

---

## 🤔 AWS vs Google Cloud: Which Should You Choose?

Since you're already using Google OAuth, let me give you a detailed comparison:

### **Option A: AWS (Original Recommendation)**

**Why AWS:**
- ✅ **Already using S3** - no migration needed (11,259+ documents already there!)
- ✅ Most mature ecosystem
- ✅ More Django tutorials and documentation
- ✅ Proven for healthcare (HIPAA compliance easier)
- ✅ I'm recommending services I'm familiar with

**Setup Complexity:** Medium (ECS, RDS, CloudFront, etc.)

**Monthly Cost:** ~$206 AUD

**Migration Effort:**
- Low (S3 already set up)
- Just add Google OAuth redirect URIs

---

### **Option B: Google Cloud Platform (New Option)**

**Why Google Cloud:**
- ✅ **Unified Google ecosystem** - OAuth, Gmail, all in one place
- ✅ **Simpler serverless deployment** - Cloud Run is easier than ECS
- ✅ **Potentially cheaper** - better pricing, generous free tier
- ✅ **Auto-scaling built-in** - no need to configure
- ✅ **Unified billing** - all Google services in one invoice

**Setup Complexity:** Lower (Cloud Run is simpler than ECS)

**Monthly Cost:** ~$150-190 AUD (potentially $16-56/month cheaper)

**Migration Effort:**
- **High:** Need to migrate 11,259+ documents from S3 to Cloud Storage
- Update all S3 code to use Cloud Storage API
- Re-configure document storage integration

---

### **Detailed Cost Comparison:**

| Service | AWS | Google Cloud |
|---------|-----|--------------|
| **Compute** | ECS Fargate: $35 | Cloud Run: $15-25 (serverless, pay per use) |
| **Database** | RDS PostgreSQL: $80 | Cloud SQL: $60-80 |
| **Cache** | ElastiCache Redis: $20 | Memorystore Redis: $20 |
| **Storage** | S3: $3 | Cloud Storage: $3 |
| **CDN** | CloudFront: $10 | Cloud CDN: $8-10 |
| **Monitoring** | CloudWatch: $15 | Cloud Logging: $10 |
| **Backups** | $25 | $20-25 |
| **Other** | $18 | $15 |
| **TOTAL** | **~$206/month** | **~$151-193/month** |

**Potential Savings:** $13-55 AUD/month with Google Cloud

---

### **The S3 Migration Challenge:**

If you choose Google Cloud, you'll need to:

1. **Migrate existing S3 files to Cloud Storage:**
   - 11,269 documents (currently being imported)
   - Estimated size: 15-25 GB
   - Migration tool: `gsutil rsync` (Google provides free migration)
   - Time: 2-4 hours (one-time)

2. **Update backend code:**
   - Replace `boto3` (AWS SDK) with `google-cloud-storage`
   - Update `backend/documents/services.py` (S3Service → CloudStorageService)
   - Update environment variables
   - Test upload/download functionality

3. **Migration cost:**
   - Data transfer out of AWS S3: ~$2-5 (one-time)
   - Developer time: 4-6 hours

---

### **My Recommendation:**

Given your situation, here are two paths:

#### **Path 1: Stick with AWS (Easier, Faster)** ⭐ **RECOMMENDED FOR NOW**

**Reasons:**
- ✅ S3 already set up with 11,259+ documents
- ✅ No migration effort needed
- ✅ Can go live in 3 weeks as planned
- ✅ Google OAuth works perfectly with AWS (just add redirect URIs)
- ✅ Proven, stable, well-documented

**Trade-off:** Pay ~$206/month (still saves $24/month vs FileMaker)

**Timeline:** 3 weeks to production ✅

---

#### **Path 2: Switch to Google Cloud (Cheaper, More Work)**

**Reasons:**
- ✅ Unified Google ecosystem (OAuth, Gmail, hosting)
- ✅ Potentially $13-55/month cheaper
- ✅ Simpler serverless architecture (Cloud Run)
- ✅ Better long-term cost savings

**Trade-off:** 
- ❌ Need to migrate S3 bucket (4-6 hours work)
- ❌ Update backend storage code
- ❌ Additional 1 week for migration/testing

**Timeline:** 4 weeks to production (1 extra week for S3 migration)

**Cost Savings Over 1 Year:**
- Google Cloud: ~$180/month × 12 = $2,160/year
- AWS: ~$206/month × 12 = $2,472/year
- **Savings: $312 AUD/year**

---

### **Hybrid Option (Future):**

You could also:
1. **Start with AWS** (fastest path to production)
2. **Evaluate after 3-6 months** (see actual usage/costs)
3. **Migrate to Google Cloud later** if cost savings justify the effort

This gives you:
- ✅ Fastest time to production
- ✅ Option to optimize later
- ✅ Real usage data to make informed decision

---

---

### Option 6: VPS (Self-Managed) - Vultr, Linode, Hetzner

**Pros:**
- ✅ Full control
- ✅ Cheapest option
- ✅ Good performance

**Cons:**
- ❌ **High operational overhead** (you manage everything)
- ❌ No managed services
- ❌ Security updates on you
- ❌ No built-in scaling
- ❌ Risky for healthcare data

**Estimated Monthly Cost:** $50-150 AUD (plus DevOps time)

---

## 🎯 FINAL DECISION: **Hybrid AWS + GCP (Option B)** ✅

### Why Hybrid?

**Selected:** November 9, 2025 (After independent ChatGPT review)

1. **Keep AWS S3:** No migration of 11,269 documents (already there!)
2. **Use GCP Cloud Run:** Simpler serverless Django deployment (easier than ECS)
3. **Use GCP Cloud SQL:** Cheaper managed PostgreSQL than RDS
4. **Best cost:** ~$128-163/month (saves $43-78/month vs pure AWS)
5. **Best of both worlds:** AWS storage reliability + GCP compute simplicity
6. **Google integration:** Unified with OAuth + Gmail APIs
7. **Timeline:** 3-4 weeks to production (only 1 week extra vs pure AWS)

### Hybrid Architecture: AWS S3 + GCP Compute

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet (Users)                        │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   Route 53 (DNS)        │
                    │   nexus.walkeasy.com.au │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
       ┌────────▼─────────┐            ┌─────────▼──────────┐
       │  AWS CloudFront  │            │  Google Cloud      │
       │  (CDN)           │            │  Load Balancer     │
       │  + S3 (Next.js)  │            │  (HTTPS)           │
       └──────────────────┘            └─────────┬──────────┘
                                                 │
                                    ┌────────────┴────────────┐
                                    │                         │
                          ┌─────────▼────────┐   ┌───────────▼────────┐
                          │  Cloud Run       │   │  Cloud Run         │
                          │  (Django API)    │   │  (Django API)      │
                          │  Container 1     │   │  Container 2       │
                          │  Auto-scaling    │   │  Auto-scaling      │
                          └─────────┬────────┘   └───────────┬────────┘
                                    │                        │
                                    └────────────┬───────────┘
                                                 │
                            ┌────────────────────┴───────────────────┐
                            │                                        │
                  ┌─────────▼──────────┐              ┌─────────────▼─────────┐
                  │  GCP Cloud SQL     │              │  GCP Memorystore      │
                  │  PostgreSQL        │              │  Redis (Cache)        │
                  │  (Primary)         │              │                       │
                  └────────────────────┘              └───────────────────────┘

                  ┌────────────────────────────────────────────────────┐
                  │  AWS S3 Bucket (walkeasy-nexus-documents)         │
                  │  Patient documents, images, AT reports            │
                  │  **NO MIGRATION NEEDED** ✅                        │
                  │  Access via signed URLs from Cloud Run            │
                  └────────────────────────────────────────────────────┘

                  ┌────────────────────────────────────────────────────┐
                  │  External Services (via HTTPS)                     │
                  │  - Gmail API, Xero API, SMS Broadcast API          │
                  │  - OpenAI API, FileMaker Cloud                     │
                  └────────────────────────────────────────────────────┘
```

### Key Differences from Pure AWS:

**Google Cloud Platform (Compute):**
- ✅ **Cloud Run** replaces ECS Fargate - serverless, simpler, auto-scaling
- ✅ **Cloud SQL** replaces RDS - slightly cheaper, same features
- ✅ **Memorystore** replaces ElastiCache - same Redis, similar cost
- ✅ **Cloud Logging** replaces CloudWatch - unified monitoring

**AWS (Storage Only):**
- ✅ **S3 bucket stays** - no migration, no downtime
- ✅ **CloudFront** - keeps frontend CDN on AWS (fast, familiar)
- ✅ **Route 53** - DNS stays on AWS (already configured)

**Cross-Cloud Communication:**
- Django on Cloud Run accesses S3 via **AWS SDK (boto3)**
- Uses **IAM service account** for secure S3 access
- **Presigned URLs** for document downloads (same as current)
- No performance impact (both in Sydney region)

---

---

## 🔧 Infrastructure Requirements

### Compute (Django Backend)

**Option A: ECS Fargate (Recommended)**
- **Type:** Serverless containers
- **Size:** 0.5 vCPU, 1 GB RAM per task (start with 2 tasks)
- **Scaling:** Auto-scale 2-10 tasks based on CPU/memory
- **Cost:** ~$30-50/month

**Option B: Elastic Beanstalk**
- **Type:** Managed PaaS
- **Size:** t3.small (2 vCPU, 2 GB RAM)
- **Scaling:** Auto-scale 1-3 instances
- **Cost:** ~$25-75/month

### Frontend (Next.js)

**Option A: CloudFront + S3 (Recommended for Static Export)**
- **S3:** Host static files
- **CloudFront:** CDN for fast global delivery
- **Cost:** ~$5-15/month

**Option B: Amplify Hosting**
- **Type:** Managed Next.js hosting
- **Features:** Built-in CI/CD, previews
- **Cost:** ~$15-30/month

### Database (PostgreSQL)

**RDS PostgreSQL**
- **Instance:** db.t3.small (2 vCPU, 2 GB RAM)
- **Storage:** 100 GB SSD (auto-scaling enabled)
- **Backups:** 7-day automated backups
- **Multi-AZ:** Yes (high availability)
- **Cost:** ~$60-100/month

### Cache/Sessions (Optional but Recommended)

**ElastiCache Redis**
- **Instance:** cache.t3.micro (2 vCPU, 0.5 GB RAM)
- **Use case:** Django sessions, API response caching
- **Cost:** ~$15-25/month

### Storage (Documents/Images)

**S3 (Already Using)**
- **Current bucket:** walkeasy-nexus-documents
- **Region:** ap-southeast-2 (Sydney)
- **Estimated size:** 25 GB (after FileMaker import)
- **Cost:** ~$1-3/month (storage + requests)

### SSL Certificates

**AWS Certificate Manager (ACM)**
- **Cost:** FREE
- **Features:** Auto-renewal, wildcard support

### DNS

**Route 53**
- **Hosted zone:** walkeasy.com.au
- **Cost:** ~$1/month + $0.50 per million queries

### Monitoring & Logging

**CloudWatch**
- **Logs:** Application logs, access logs, error logs
- **Metrics:** CPU, memory, disk, network
- **Alarms:** Email/SMS alerts for issues
- **Cost:** ~$10-30/month

### Secrets Management

**AWS Secrets Manager**
- **Store:** Django SECRET_KEY, DB password, API keys (Gmail, Xero, SMS, OpenAI)
- **Cost:** ~$1-2/month

---

## 🚀 Migration Strategy

### Phase 1: Pre-Deployment (Week 1)

**Tasks:**
- [ ] Purchase domain (if not owned): nexus.walkeasy.com.au
- [ ] Create AWS account (if not existing)
- [ ] Set up AWS CLI and credentials
- [ ] Create RDS PostgreSQL instance (test data)
- [ ] Create ECR (Elastic Container Registry) for Docker images
- [ ] Prepare production environment variables
- [ ] Review and update Django settings for production
- [ ] Configure CORS for production domain
- [ ] Test backup/restore procedures

### Phase 2: Infrastructure Setup (Week 1-2)

**Tasks:**
- [ ] Create VPC and security groups
- [ ] Set up RDS PostgreSQL (production)
- [ ] Set up ElastiCache Redis (optional)
- [ ] Configure S3 bucket policies for production
- [ ] Set up CloudFront distribution
- [ ] Create ECS cluster and task definitions
- [ ] Configure Application Load Balancer
- [ ] Set up Route 53 DNS records
- [ ] Request ACM SSL certificate
- [ ] Configure CloudWatch logging and alarms
- [ ] **Update Google OAuth redirect URIs** (see below)

### Phase 3: Application Deployment (Week 2)

**Backend (Django):**
- [ ] Create Dockerfile for Django
- [ ] Build and push Docker image to ECR
- [ ] Deploy to ECS Fargate
- [ ] Run database migrations
- [ ] Create superuser account
- [ ] **Create SocialApp in database** (Google OAuth credentials)
- [ ] Test API endpoints
- [ ] Configure webhook URLs (SMS Broadcast)
- [ ] Test all integrations (Google OAuth, Gmail, Xero, SMS, S3, OpenAI)

**Frontend (Next.js):**
- [ ] Configure production API endpoints
- [ ] Build Next.js for production (`npm run build`)
- [ ] Deploy to S3 + CloudFront OR Amplify
- [ ] Test frontend access
- [ ] Verify all pages load correctly

### Phase 4: Data Migration (Week 2-3)

**Tasks:**
- [ ] Export production data from local PostgreSQL
- [ ] Import to RDS PostgreSQL
- [ ] Verify data integrity
- [ ] Run FileMaker import scripts (patients, clinics, appointments, notes, referrers, coordinators, documents)
- [ ] Verify all FileMaker data imported correctly
- [ ] Test all API endpoints with production data
- [ ] Verify S3 documents accessible

### Phase 5: Integration Testing (Week 3)

**Tasks:**
- [ ] Test Gmail integration (send email)
- [ ] Test Xero integration (sync contact, create invoice)
- [ ] Test SMS integration (send SMS, receive webhook)
- [ ] Test S3 integration (upload document, download, generate presigned URL)
- [ ] Test OpenAI integration (generate clinical note, AT report)
- [ ] Test FileMaker integration (verify data accessible)
- [ ] **Test Google OAuth login** (authentication flow)
- [ ] End-to-end testing (create patient, book appointment, send email/SMS)

---

## 🔑 Google OAuth Production Configuration

Since you're using Google OAuth for authentication, you'll need to update your Google Cloud Console settings for production.

### **What Needs to Change:**

**Current (Development):**
```
Authorized JavaScript origins:
  https://localhost:8000

Authorized redirect URIs:
  https://localhost:8000/accounts/google/login/callback/  (for user login)
  https://localhost:8000/gmail/oauth/callback/            (for Gmail integration)
```

**Production (Add these):**
```
Authorized JavaScript origins:
  https://nexus.walkeasy.com.au

Authorized redirect URIs:
  https://nexus.walkeasy.com.au/accounts/google/login/callback/  (for user login)
  https://nexus.walkeasy.com.au/gmail/oauth/callback/            (for Gmail integration)
```

### **Step-by-Step Update Process:**

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Select your project (the one with your current OAuth client)

2. **Edit OAuth 2.0 Client ID:**
   - Click on your existing OAuth 2.0 Client ID
   - You'll see the current localhost URLs

3. **Add Production URLs** (DON'T remove localhost, just add):
   - Under "Authorized JavaScript origins", click **"+ ADD URI"**:
     - Add: `https://nexus.walkeasy.com.au`
   
   - Under "Authorized redirect URIs", click **"+ ADD URI"** (twice):
     - Add: `https://nexus.walkeasy.com.au/accounts/google/login/callback/`
     - Add: `https://nexus.walkeasy.com.au/gmail/oauth/callback/`

4. **Save Changes:**
   - Click **"SAVE"** at the bottom
   - Wait 1-2 minutes for changes to propagate

5. **Keep Development URLs:**
   - ✅ Keep all `localhost:8000` URLs active
   - This allows you to test locally AND use production

### **No Code Changes Needed:**

The backend automatically uses the correct redirect URL based on the request domain:
- Development: `https://localhost:8000/accounts/google/login/callback/`
- Production: `https://nexus.walkeasy.com.au/accounts/google/login/callback/`

### **Environment Variables (Same for Production):**

Your current `.env` credentials work for both dev and prod:
```bash
GMAIL_CLIENT_ID=your_client_id_here          # Same for dev & prod
GMAIL_CLIENT_SECRET=your_client_secret_here  # Same for dev & prod
```

### **Database Setup (Production):**

After deploying to production, run this once to create the SocialApp:
```bash
# SSH into production container or use ECS Exec
python manage.py shell -c "
from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site
import os

site = Site.objects.get(pk=1)
client_id = os.getenv('GMAIL_CLIENT_ID')
client_secret = os.getenv('GMAIL_CLIENT_SECRET')

app, created = SocialApp.objects.get_or_create(
    provider='google',
    defaults={
        'name': 'Google OAuth',
        'client_id': client_id,
        'secret': client_secret,
    }
)
app.sites.add(site)
print(f'✅ {\"Created\" if created else \"Updated\"} SocialApp')
"
```

### **Testing Production Login:**

1. Deploy application to production
2. Visit: `https://nexus.walkeasy.com.au/login`
3. Click "Sign in with Google"
4. Should redirect to Google account selection
5. After selecting account, should redirect back to `https://nexus.walkeasy.com.au/`
6. User should be logged in ✅

---

### Phase 6: Go-Live (Week 4)

**Tasks:**
- [ ] Update DNS to point to production
- [ ] Monitor logs for errors
- [ ] Test from multiple devices/browsers
- [ ] Train users on production system
- [ ] Set up monitoring dashboards
- [ ] Document rollback procedure
- [ ] Celebrate! 🎉

---

## 🔒 Security & Compliance

### Data Protection (Healthcare)

**HIPAA Considerations (if applicable):**
- ✅ AWS is HIPAA eligible (sign BAA)
- ✅ Encrypt data at rest (RDS encryption, S3 encryption)
- ✅ Encrypt data in transit (HTTPS/TLS everywhere)
- ✅ Audit logging (CloudWatch, S3 access logs)
- ✅ Access controls (IAM policies, security groups)

**Australian Privacy Principles (APP):**
- ✅ Store data in Australia (Sydney region)
- ✅ Implement access controls and audit trails
- ✅ Document data handling procedures
- ✅ Implement data breach response plan

### Security Checklist

- [ ] Enable RDS encryption at rest
- [ ] Enable S3 bucket encryption
- [ ] Use HTTPS everywhere (no HTTP fallback)
- [ ] Configure security groups (least privilege)
- [ ] Use AWS Secrets Manager (no hardcoded credentials)
- [ ] Enable MFA for AWS root account
- [ ] Enable CloudTrail (audit all AWS API calls)
- [ ] Set up CloudWatch alarms for suspicious activity
- [ ] Implement rate limiting on API endpoints
- [ ] Regular security updates (Django, dependencies)
- [ ] Configure CORS properly (whitelist production domains only)
- [ ] Implement Django security best practices:
  - `SECURE_SSL_REDIRECT = True`
  - `SESSION_COOKIE_SECURE = True`
  - `CSRF_COOKIE_SECURE = True`
  - `SECURE_HSTS_SECONDS = 31536000`
  - `SECURE_CONTENT_TYPE_NOSNIFF = True`
  - `SECURE_BROWSER_XSS_FILTER = True`

---

## 💰 Cost Estimates (AWS - Monthly)

### Hybrid Setup (1-5 users) ✅ **YOUR CONFIRMED SETUP**

| Service | Platform | Specification | Cost (AUD) |
|---------|----------|---------------|------------|
| **Cloud Run** | GCP | Django API (serverless, auto-scaling) | $15-25 |
| **Cloud SQL** | GCP | PostgreSQL (db-f1-micro, 100 GB) | $60-80 |
| **Memorystore** | GCP | Redis (M1, 1 GB) | $20 |
| **Cloud Logging** | GCP | Logs + metrics | $10 |
| **Secret Manager** | GCP | 10 secrets | $2 |
| **S3 Storage** | AWS | 25 GB + requests (EXISTING) | $3 |
| **CloudFront** | AWS | CDN + data transfer | $10 |
| **Route 53** | AWS | DNS hosting | $1 |
| **Backups** | GCP | Multi-tier (Daily + Archives + DR) | $20-25 |
| **Data Transfer** | Cross-cloud | GCP ↔ AWS S3 (Sydney region) | $5-10 |
| **Total** | | | **~$146-186/month** |

**Cost Comparison:**
| Setup | Monthly Cost | Yearly Cost |
|-------|-------------|-------------|
| **Pure AWS** | $206 | $2,472 |
| **Hybrid (Your Choice)** | $166 | $1,992 | 
| **Savings** | **$40/month** | **$480/year** ✅ |

**During Transition (2-3 months):**
- Hybrid (AWS + GCP): $166/month
- FileMaker (read-only): $230/month
- **Total: $396/month**

**After FileMaker Retirement:**
- Hybrid: $166/month only
- **Savings vs FileMaker: $64/month ($768/year)** ✅
- **Savings vs Pure AWS: $40/month ($480/year)** ✅

### Medium Scale (50-200 users)

| Service | Specification | Cost (AUD) |
|---------|--------------|------------|
| **ECS Fargate** | 4 tasks (1 vCPU, 2 GB) | $120 |
| **RDS PostgreSQL** | db.t3.medium (200 GB) | $180 |
| **ElastiCache Redis** | cache.t3.small | $45 |
| **S3** | 50 GB storage + requests | $5 |
| **CloudFront** | CDN + data transfer | $25 |
| **Route 53** | DNS hosting | $2 |
| **CloudWatch** | Logs + metrics | $30 |
| **Secrets Manager** | 10 secrets | $2 |
| **Data Transfer** | Outbound (estimated) | $35 |
| **Total** | | **~$444/month** |

**Note:** Costs are estimates in AUD (1 USD ≈ 1.5 AUD). Actual costs may vary based on usage.

---

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] Domain purchased and DNS accessible
- [ ] AWS account created and billing set up
- [ ] Production environment variables documented
- [ ] All integrations tested locally
- [ ] Database backup strategy defined
- [ ] Rollback plan documented

### Infrastructure

- [ ] VPC and subnets created
- [ ] Security groups configured
- [ ] RDS PostgreSQL instance running
- [ ] ElastiCache Redis instance running (optional)
- [ ] S3 bucket configured for production
- [ ] ECS cluster and task definitions created
- [ ] Application Load Balancer configured
- [ ] CloudFront distribution created
- [ ] Route 53 DNS records configured
- [ ] ACM SSL certificate issued and validated

### Application

- [ ] Django production settings configured
- [ ] Docker image built and pushed to ECR
- [ ] ECS service running (Django)
- [ ] Database migrations applied
- [ ] Superuser account created
- [ ] Static files uploaded to S3
- [ ] Next.js built and deployed
- [ ] Frontend connects to backend API

### Integrations

- [ ] Gmail OAuth redirect URIs updated
- [ ] Xero OAuth redirect URIs updated
- [ ] SMS Broadcast webhook URL updated
- [ ] OpenAI API key added to Secrets Manager
- [ ] FileMaker access confirmed from AWS

### Monitoring

- [ ] CloudWatch dashboards created
- [ ] Alarms configured (CPU, memory, errors)
- [ ] Log groups set up
- [ ] Backup schedules configured
- [ ] Monitoring email/SMS alerts tested

### Security

- [ ] HTTPS enforced (no HTTP)
- [ ] Security groups locked down (least privilege)
- [ ] Secrets stored in Secrets Manager
- [ ] MFA enabled on AWS root account
- [ ] CloudTrail enabled (audit logs)
- [ ] S3 bucket policies reviewed
- [ ] Django security settings enabled

### Testing

- [ ] End-to-end user flows tested
- [ ] All integrations tested in production
- [ ] Load testing completed (optional)
- [ ] Mobile responsiveness verified
- [ ] Cross-browser testing completed

### Go-Live

- [ ] DNS updated to point to production
- [ ] Old system (if any) redirected or shut down
- [ ] Users notified of new system
- [ ] Training materials provided
- [ ] Support process established
- [ ] Monitoring active and reviewed

---

## ❓ Open Questions

### ✅ **ANSWERED** (November 9, 2025)

1. **Domain:** ✅ `nexus.walkeasy.com.au` (you own `walkeasy.com.au`)
2. **Timeline:** ✅ ASAP (target: 2-3 weeks)
3. **Budget:** ✅ AUD $230/month (current FileMaker hosting cost)
   - AWS estimate: $181-250/month (fits budget!)
4. **AWS Account:** ✅ Yes, already have AWS account
   - Bucket: `walkeasy-nexus-documents` (ap-southeast-2)
   - IAM user: `AKIA3W6HPEM2LPSHDZ53` (already configured)
5. **Compliance:** ✅ Australian Privacy Principles (APP) now, HIPAA-ready for future
   - Security is critical (healthcare data)

### ✅ **ALL QUESTIONS ANSWERED!** (November 9, 2025)

**Business Requirements:**
1. ✅ **User count:** 1-5 staff → Small setup (cost-effective)
2. ✅ **Business hours:** Monday-Friday 9am-5pm AEST → Weekend/evening deployments
3. ✅ **Support:** Craig (internal) → AWS alerts to craig@walkeasy.com.au + 0412 345 678
4. ✅ **Monitoring:** Email + SMS alerts for critical issues

**Backup Strategy (Comprehensive):**
1. ✅ **Tier 1:** Daily automated backups, 30-day retention (~$5-10/month)
2. ✅ **Tier 2:** Point-in-time recovery (every 5 min), 7-day retention (included)
3. ✅ **Tier 3:** Weekly long-term archives, 1-year retention (~$2-5/month)
4. ✅ **Tier 4:** Optional cross-region DR copy, 30-day retention (~$10-15/month)
5. ✅ **Total backup cost:** ~$17-30/month

**Migration Strategy:**
1. ✅ **Approach:** Big Bang cutover (Saturday night 8pm-12am AEST maintenance window)
2. ✅ **FileMaker:** Keep running in parallel for 2-3 months (read-only backup)
3. ✅ **Cost during transition:** $230 (FileMaker) + $225 (AWS) = $455/month for 2-3 months
4. ✅ **Cost after FileMaker retirement:** $225/month (saves $230/month ongoing)
5. ✅ **Historical data:** All data being imported from FileMaker ✅

**Technical Decisions:**
1. ✅ **Frontend:** Next.js Static Site Generation (SSG) - cheaper, faster
2. ✅ **Caching:** Redis (ElastiCache) - YES - better performance ($20/month)
3. ✅ **Multi-region:** NO initially - Single Sydney region (can add later if needed)
4. ✅ **Database:** RDS PostgreSQL db.t3.small (sufficient for 1-5 users)
5. ✅ **Compute:** ECS Fargate 2 tasks (0.5 vCPU, 1 GB each)

---

## 📚 Next Steps

### 🎯 **IMMEDIATE ACTIONS** (Based on Your Answers)

**Week 1: Setup & Configuration**
- [ ] Set up Route 53 hosted zone for `walkeasy.com.au` (if not already)
- [ ] Create subdomain DNS record for `nexus.walkeasy.com.au`
- [ ] Request ACM SSL certificate for `*.walkeasy.com.au`
- [ ] Set up RDS PostgreSQL instance (db.t3.small, 100 GB)
- [ ] Set up ElastiCache Redis (cache.t3.micro) - **Recommended**
- [ ] Create ECS cluster and task definitions
- [ ] Configure Application Load Balancer
- [ ] Set up CloudWatch logging and alarms

**Week 2: Application Deployment**
- [ ] Build Django Docker image
- [ ] Deploy to ECS Fargate
- [ ] Configure production environment variables
- [ ] Run database migrations
- [ ] Build and deploy Next.js static site to CloudFront + S3
- [ ] Test all integrations (Gmail, Xero, SMS, S3, OpenAI)
- [ ] Update SMS Broadcast webhook URL to production

**Week 3: Data Migration & Testing**
- [ ] Export local PostgreSQL database
- [ ] Import to RDS PostgreSQL
- [ ] Verify all 55,758+ records migrated correctly
- [ ] Upload all FileMaker documents to S3 (11,259 documents - **IN PROGRESS NOW!** 🚀)
- [ ] End-to-end testing with production data
- [ ] User acceptance testing

**Week 4: Go-Live**
- [ ] Schedule maintenance window (e.g., Saturday 8pm-12am)
- [ ] Update DNS to point to production
- [ ] Monitor for 24-48 hours
- [ ] Keep FileMaker as read-only backup for 1-2 weeks
- [ ] Train users on production system

### 💰 **Confirmed Budget Fit**

Your current spend: **$230 AUD/month** (FileMaker + hosting)  
Estimated AWS cost: **$181-250 AUD/month** (depending on usage)

✅ **AWS fits within your existing budget!**

**Cost Breakdown (Monthly):**
- ECS Fargate: $35-50
- RDS PostgreSQL: $80
- ElastiCache Redis: $20
- S3 Storage: $3-5
- CloudFront CDN: $10-15
- Monitoring/Logs: $15-20
- Data Transfer: $15-25
- **Total:** ~$178-225/month

### 🎯 **Target Timeline: 3 Weeks to Production**

Based on "ASAP" timeline, we can realistically go live in **3 weeks** (early December 2025):
- Week of Nov 11: Infrastructure setup
- Week of Nov 18: Application deployment + integration testing
- Week of Nov 25: Data migration + user testing
- Week of Dec 2: Go-live! 🎉

### 📋 **To Do This Week**

1. **Answer remaining questions** (user count, business hours, monitoring contacts)
2. **Review and approve** this deployment plan
3. **Verify AWS IAM permissions** (check if current user can create RDS, ECS, etc.)
4. **Create deployment branch** in Git
5. **Start Phase 1** infrastructure setup

### 🔐 **Security Note**

Since you mentioned "we do need to be secure" - the plan includes:
- ✅ All data encrypted at rest (RDS, S3)
- ✅ All data encrypted in transit (HTTPS/TLS)
- ✅ AWS Secrets Manager for credentials
- ✅ Security groups (firewall rules)
- ✅ CloudTrail audit logging
- ✅ Regular automated backups
- ✅ HIPAA-ready architecture (can enable later if needed)

This meets Australian Privacy Principles (APP) and can be upgraded to HIPAA compliance when needed.

---

## 📖 Related Documentation

- [QUICK_COMMANDS.md](../../QUICK_COMMANDS.md) - Development commands
- [DATABASE_SCHEMA.md](../architecture/DATABASE_SCHEMA.md) - Database structure
- [S3.md](../integrations/S3.md) - S3 storage integration
- [GMAIL.md](../integrations/GMAIL.md) - Gmail integration
- [XERO.md](../integrations/XERO.md) - Xero integration
- [SMS.md](../integrations/SMS.md) - SMS Broadcast integration

---

**Last Updated:** November 9, 2025  
**Document Owner:** Development Team  
**Review Frequency:** Update as deployment progresses

