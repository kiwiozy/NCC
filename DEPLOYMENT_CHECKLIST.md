# 🚀 Nexus Core Clinic + PinsV5 Marketing - Production Deployment Checklist

**Date:** November 15, 2025
**Goal:** Deploy complete all-in-one healthcare platform (clinical + marketing)
**Timeline:** 12 weeks (4 phases) | **Quick Demo:** 3-5 days
**Architecture:** Hybrid AWS S3 + Google Cloud Run + Firebase
**Scope:** 9 major systems, ~205 files (~31,500 LOC), 555 companies

---

## 🚀 **PRODUCTION DEPLOYMENT: Enterprise Healthcare Platform**

**Production Environment Setup** - Full-scale deployment using your existing Google Cloud + AWS infrastructure for enterprise-grade healthcare management.

**🎉 STATUS: Backend Deployed Successfully!**

## 🎯 **Production Goals**
- ✅ **Enterprise healthcare platform** (patients + providers + marketing)
- ✅ **44K+ patient records** ready for migration
- ✅ **555 healthcare providers** from PinsV5 ready for integration
- ✅ **Unified authentication** across all systems
- ✅ **Production-grade security** and monitoring
- ✅ **Scalable architecture** for healthcare operations

## 📋 **Production Stack (Your Existing Enterprise Infrastructure)**
- ✅ **Google Cloud Run** (Auto-scaling, managed containers) - **DEPLOYED**
- ✅ **Google Cloud SQL** (PostgreSQL, HA, backups) - **RUNNING**
- ✅ **Google Cloud Storage** (Alternative to S3, unified billing)
- ✅ **AWS S3** (Existing file storage, 11K+ documents)
- ✅ **Firebase Auth** (Enterprise authentication)
- ✅ **Firebase Hosting** (CDN, SSL, global distribution)
- ✅ **Google Cloud Monitoring** (Logs, alerts, dashboards)

## ✅ **COMPLETED: Infrastructure Setup**

### **Phase 1: Google Cloud Project** ✅
```bash
# Project created successfully
gcloud config set project nexus-walkeasy-prod
```

**Result:** Project `nexus-walkeasy-prod` created and active

### **Phase 2: Production Database** ✅
```bash
# Cloud SQL instance created
Instance: nexus-production-db
Database: nexus_production
Connection: nexus-walkeasy-prod:australia-southeast1:nexus-production-db
IP: 34.87.221.134
```

**Result:** Production PostgreSQL database running with HA and backups

### **Phase 3: Secrets Management** ✅
All 10 production secrets stored in Google Cloud Secret Manager:
- ✅ django-secret-key
- ✅ aws-access-key-id
- ✅ aws-secret-access-key
- ✅ xero-client-id
- ✅ xero-client-secret
- ✅ gmail-client-id
- ✅ gmail-client-secret
- ✅ smsb-username
- ✅ smsb-password
- ✅ openai-api-key

### **Phase 4: Backend Deployment** ✅
```bash
# Backend deployed to Cloud Run
Service: nexus-production-backend
Region: australia-southeast1
URL: https://nexus-production-backend-892000689828.australia-southeast1.run.app
```

**Result:** Django backend live and responding

**Configuration:**
- Memory: 2 GB
- CPU: 2 vCPU
- Max instances: 10
- Min instances: 0 (scales to zero)
- Cloud SQL: Connected
- All secrets: Mounted

---

## 🔄 **NEXT STEPS: Complete Deployment**

### **PRODUCTION DEPLOYMENT PHASES**

#### **PHASE 1: Infrastructure & Database (Week 1)**
**Enterprise-grade production setup**

1. **Create Dedicated Nexus Google Cloud Project**
   ```bash
   # Create new project for Nexus (separate from PinsV5)
   gcloud projects create nexus-walkeasy-prod \
     --name="Nexus Core Clinic Production" \
     --set-as-default

   # Enable production APIs for Nexus
   gcloud services enable run.googleapis.com \
     sqladmin.googleapis.com \
     cloudbuild.googleapis.com \
     secretmanager.googleapis.com \
     logging.googleapis.com \
     monitoring.googleapis.com \
     containerregistry.googleapis.com
   ```

2. **Production Cloud SQL Database**
   ```bash
   # Production-grade PostgreSQL for Nexus (not demo sizing)
   gcloud sql instances create nexus-production-db \
     --database-version=POSTGRES_14 \
     --tier=db-g1-small \
     --region=australia-southeast1 \
     --storage-size=50GB \
     --storage-type=SSD \
     --backup-start-time=02:00 \
     --maintenance-window-day=SUN \
     --maintenance-window-hour=3 \
     --availability-type=REGIONAL \
     --enable-point-in-time-recovery

   # Create production database for Nexus
   gcloud sql databases create nexus_production --instance=nexus-production-db
   ```

3. **Production Secrets Management**
   ```bash
   # Store production secrets securely
   echo "your-production-secret-key" | gcloud secrets create django-secret-key --data-file=-
   echo "your-production-db-password" | gcloud secrets create db-password --data-file=-
   ```

#### **PHASE 2: Backend Deployment (Week 2)**
**Production Django deployment with monitoring**

1. **Production Django Configuration**
   ```python
   # backend/ncc_api/settings.py - Production settings
   import os
   from pathlib import Path

   # Production environment
   DEBUG = False
   SECRET_KEY = os.getenv('SECRET_KEY')  # From secrets
   ALLOWED_HOSTS = ['nexus.walkeasy.com.au', 'nexus-production-backend-xxxx.run.app']

   # Production database
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'nexus_production',
           'USER': 'postgres',
           'PASSWORD': os.getenv('DB_PASSWORD'),
           'HOST': '/cloudsql/referrer-map:australia-southeast1:nexus-production-db',
           'PORT': '5432',
       }
   }

   # Production security
   SECURE_SSL_REDIRECT = True
   SESSION_COOKIE_SECURE = True
   CSRF_COOKIE_SECURE = True
   SECURE_HSTS_SECONDS = 31536000
   ```

2. **Deploy to Cloud Run (Production)**
   ```bash
   cd /Users/craig/Documents/nexus-core-clinic/backend

   # Production deployment with monitoring
   gcloud run deploy nexus-production-backend \
     --source . \
     --platform managed \
     --region australia-southeast1 \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 2 \
     --max-instances 10 \
     --min-instances 1 \
     --timeout 300 \
     --concurrency 80 \
     --set-env-vars="DEBUG=False,ENVIRONMENT=production" \
     --set-secrets="SECRET_KEY=django-secret-key:latest,DB_PASSWORD=db-password:latest" \
     --set-cloudsql-instances=nexus-walkeasy-prod:australia-southeast1:nexus-production-db
   ```

#### **PHASE 3: Data Migration (Week 3)**
**Full production data migration**

1. **Export Production-Quality Data**
   ```bash
   cd /Users/craig/Documents/nexus-core-clinic/backend

   # Export all data with proper relationships
   python manage.py dumpdata \
     --exclude=admin.logentry \
     --exclude=sessions.session \
     --exclude=auth.permission \
     --natural-foreign \
     --natural-primary \
     -o production_data.json
   ```

2. **Migrate to Production Database**
   ```bash
   # Run migrations on production
   gcloud run services exec nexus-production-backend \
     --region australia-southeast1 \
     -- python manage.py migrate

   # Import production data
   gcloud run services exec nexus-production-backend \
     --region australia-southeast1 \
     -- python manage.py loaddata production_data.json
   ```

#### **PHASE 4: Frontend Production Deployment (Week 4)**
**Production Next.js with CDN**

1. **Production Build Configuration**
   ```javascript
   // frontend/next.config.js
   module.exports = {
     output: 'export', // Static export for Firebase Hosting
     trailingSlash: true,
     images: {
       unoptimized: true, // Firebase Hosting doesn't support Next.js Image Optimization
     },
     env: {
       API_URL: 'https://nexus-production-backend-xxxx.run.app',
     },
   };
   ```

2. **Deploy to Firebase Hosting**
   ```bash
   cd /Users/craig/Documents/nexus-core-clinic/frontend

   # Production build
   npm run build

   # Deploy to production site
   firebase use --add  # Add production project
   firebase deploy --only hosting
   ```

3. **Custom Domain Setup**
   ```bash
   # Point nexus.walkeasy.com.au to Firebase
   # Firebase automatically provisions SSL
   ```

#### **PHASE 5: PinsV5 Integration (Weeks 5-6)**
**Full production integration**

1. **Export PinsV5 Production Data**
   ```bash
   # Use Firebase service account to export live data
   cd /Users/craig/Documents/nexus-core-clinic/backend
   python export_pinsv5_production_data.py
   ```

2. **Create Production Provider Database**
   ```bash
   python manage.py startapp providers
   # Copy production-ready models
   python manage.py makemigrations providers
   python manage.py migrate providers
   python manage.py import_pinsv5_production_data
   ```

#### **PHASE 6: Monitoring & Security (Week 7)**
**Production monitoring and security**

1. **Google Cloud Monitoring Setup**
   ```bash
   # Set up production monitoring
   gcloud monitoring dashboards create nexus-production-dashboard \
     --config-from-file=monitoring/dashboard.json

   # Set up alerts
   gcloud monitoring alert-policies create nexus-backend-alerts \
     --config-from-file=monitoring/alerts.json
   ```

2. **Security Hardening**
   - Configure VPC for Cloud SQL
   - Set up Cloud Armor for DDoS protection
   - Enable Cloud Identity-Aware Proxy
   - Configure audit logging

#### **PHASE 7: Testing & Go-Live (Week 8)**
**Production validation and launch**

1. **Load Testing**
   ```bash
   # Load test the production environment
   # Simulate 50 concurrent users
   ```

2. **Go-Live Checklist**
   - [ ] DNS propagation complete
   - [ ] SSL certificates active
   - [ ] Monitoring alerts configured
   - [ ] Backup procedures tested
   - [ ] Rollback plan documented

**Production URLs:**
- **Frontend:** `https://nexus.walkeasy.com.au`
- **Backend:** `https://nexus-production-backend-xxxx.run.app`
- **PinsV5:** `https://referrer-map.web.app` (existing)

**Production Cost:** ~$150-250/month | **Timeline:** 8 weeks

---

## 📅 **FULL 12-Week Migration Timeline**

---

## 🎯 **MAJOR SCOPE UPDATE: PinsV5 → Nexus Migration Project**

### **What You Already Have in PinsV5:**
- ✅ **Fully deployed production system** (`https://referrer-map.web.app`)
- ✅ **Google Cloud Run services** (API V2, Email Server, Bounce Processor)
- ✅ **Firebase infrastructure** (Auth, Firestore, Storage, Hosting)
- ✅ **AWS SES integration** for email campaigns
- ✅ **Healthcare provider scraping** and management system
- ✅ **Working deployment pipeline** (source-based, no Docker needed)

### **What We're Migrating INTO Nexus:**
- **9 Major Systems** (~205 files, ~31,500 LOC):
  1. ✅ Email Builder (61 files) - Drag & drop campaign builder
  2. ✅ Web Scraping (100+ files) - Automated provider discovery
  3. ✅ CallV3 Callbacks (15 files) - Relationship management
  4. ✅ Asset Library (10 files) - Image/logo management
  5. ✅ Map Areas (8 files) - Geographic territories
  6. ✅ Campaign Analytics (5 files) - ROI tracking
  7. ✅ AI Enrichment (6 files) - Data validation
  8. ✅ Material Tracking - Physical marketing materials
  9. ✅ Multi-User Tasks - Staff coordination
- **555 Companies** + **1,265 Practitioners** to import
- **Complete contact history** and relationship tracking

### **Integration Strategy:**
**Transform Nexus into complete all-in-one platform:**
1. **Clinical Management** (Nexus existing) + **Marketing Automation** (PinsV5)
2. **Patient Care** + **Provider Discovery** + **Email Campaigns**
3. **Appointment Scheduling** + **Callback Tracking** + **ROI Analytics**

---

## 📅 **12-Week Migration Timeline**

### **PHASE 1: Core Marketing (Weeks 1-4)**
**Goal:** Send email campaigns to referrers

#### ✅ **Week 1: Credentials & Setup**
- [ ] Get Firebase Admin SDK JSON (for data export)
- [ ] Get Google Maps API key ($20-50/month)
- [ ] Set up Listmonk + PostgreSQL (Docker)
- [ ] Export 555 companies from PinsV5 Firestore

#### ✅ **Week 2: Database Migration**
- [ ] Create Django `providers` app with 5 models
- [ ] Run migrations for Provider, ContactRecord, etc.
- [ ] Import 555 companies + contact history
- [ ] Verify data integrity

#### ✅ **Week 3: Email Builder Integration**
- [ ] Copy 61 Email Builder files to Nexus
- [ ] Adapt Firebase Storage → AWS S3
- [ ] Adapt Firebase Auth → Django Allauth
- [ ] Test Email Builder components

#### ✅ **Week 4: Asset Library & Testing**
- [ ] Copy 10 Asset Library files
- [ ] Set up S3 asset storage integration
- [ ] Test end-to-end campaign creation
- [ ] Test email sending via Listmonk

**Deliverable:** ✅ Send professional email campaigns to referrers

---

### **PHASE 2: Provider Discovery (Weeks 5-7)**
**Goal:** Discover and map healthcare providers

#### ✅ **Week 5: Web Scraping Backend**
- [ ] Copy 100+ scraper files to Django backend
- [ ] Set up Playwright for headless browsing
- [ ] Create Django API endpoints for scraping
- [ ] Test scraping locally (Podiatrists, Physios, OTs)

#### ✅ **Week 6: Map Areas Integration**
- [ ] Copy 8 Map Areas files
- [ ] Integrate Google Maps JavaScript API
- [ ] Test polygon drawing for territories
- [ ] Test geographic filtering

#### ✅ **Week 7: Provider Discovery UI**
- [ ] Build Provider Discovery page in Nexus
- [ ] Build interactive map view
- [ ] Build import workflow (provider → referrer)
- [ ] Test end-to-end discovery process

**Deliverable:** ✅ Discover and map 341+ new providers in 26 minutes

---

### **PHASE 3: Relationship Management (Weeks 8-10)**
**Goal:** Track referrer relationships & ROI

#### ✅ **Week 8: CallV3 Backend**
- [ ] Copy 15 CallV3 callback files
- [ ] Create UnifiedCallback Django model
- [ ] Create API endpoints for callbacks
- [ ] Test callback creation and scheduling

#### ✅ **Week 9: CallV3 UI Integration**
- [ ] Build Callback Dashboard in Nexus
- [ ] Build Schedule Follow-up Modal
- [ ] Build Contact History components
- [ ] Test complete callback workflow

#### ✅ **Week 10: AI & Analytics**
- [ ] Copy 6 AI Enrichment files
- [ ] Copy 5 Campaign Analytics files
- [ ] Test AI data enrichment (OpenAI)
- [ ] Test campaign analytics and ROI tracking

**Deliverable:** ✅ Measure campaign → referral → patient revenue

---

### **PHASE 4: Polish & Deployment (Weeks 11-12)**
**Goal:** Production-ready all-in-one platform

#### ✅ **Week 11: Integration Testing**
- [ ] End-to-end workflow testing
- [ ] Performance optimization
- [ ] Bug fixes and refinements
- [ ] Security review

#### ✅ **Week 12: Documentation & Launch**
- [ ] Complete user documentation
- [ ] Staff training materials
- [ ] Production deployment
- [ ] Go-live procedures

**Deliverable:** ✅ Complete all-in-one healthcare platform

---

## 🔑 **Critical Prerequisites**

### **Credentials Needed:**
| Service | Status | Cost | Priority |
|---------|--------|------|----------|
| **Firebase Admin SDK** | ❌ Need | Free | 🔥 **CRITICAL** |
| **Google Maps API** | ❌ Need | $20-50/mo | 🔥 **HIGH** |
| **Listmonk + PostgreSQL** | ❌ Need | Free | 🔥 **HIGH** |
| **Playwright** | ❌ Need | Free | 🟡 **MEDIUM** |
| **OpenAI** | ✅ Have | $10-30/mo | ✅ **READY** |
| **AWS S3** | ✅ Have | $5-10/mo | ✅ **READY** |
| **Gmail API** | ✅ Have | Free | ✅ **READY** |

### **Total Additional Cost:** ~$20-50/month

---

## 🗄️ **Database Architecture**

### **Parallel Provider System:**
```
PinsV5 Data (Firestore) → Nexus Providers (PostgreSQL)
├── Company-centric organization
├── Individual practitioners linked
├── Contact history preserved
├── Geographic data maintained
└── Link to existing referrers table
```

### **Django Models to Create:**
```python
# backend/providers/models.py
class Provider(models.Model):          # 555 companies
class ContactRecord(models.Model):     # Call history
class ProviderContactSummary(models.Model):  # Contact stats
class UnifiedCallback(models.Model):   # Follow-ups
class MapArea(models.Model):          # Territories
```

---

## 📋 **File Migration Checklist**

### **Phase 1 Files (Weeks 1-4):**
- [ ] **Email Builder:** 61 files → `frontend/app/components/marketing/email-builder/`
- [ ] **Asset Library:** 10 files → `frontend/app/components/marketing/assets/`

### **Phase 2 Files (Weeks 5-7):**
- [ ] **Web Scraping:** 100+ files → `backend/provider_discovery/scrapers/`
- [ ] **Map Areas:** 8 files → `frontend/app/components/marketing/map-areas/`

### **Phase 3 Files (Weeks 8-10):**
- [ ] **CallV3:** 15 files → `frontend/app/components/callbacks/`
- [ ] **AI Enrichment:** 6 files → `backend/ai_services/`
- [ ] **Analytics:** 5 files → `frontend/app/components/analytics/`

---

## 🚀 **Quick Start Commands**

### **Export PinsV5 Data:**
```bash
cd /Users/craig/Documents/1.PinsV5
node scripts/export-pinsv5-data.js
# Creates: exports/providers.json (555 companies)
```

### **Create Django Provider App:**
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
python manage.py startapp providers
# Copy models from docs/features/PinsV5/DATABASE_MIGRATION_STRATEGY.md
python manage.py makemigrations providers
python manage.py migrate providers
```

### **Import Provider Data:**
```bash
python manage.py import_pinsv5_data
# Imports 555 companies + contact history
```

### **Set Up Listmonk:**
```bash
# Create docker-compose.yml (see docs/features/PinsV5/CREDENTIALS_REQUIREMENTS.md)
docker-compose up -d
docker exec -it listmonk_listmonk_1 ./listmonk --install
open http://localhost:9000
```

---

## 🗄️ **PinsV5 → Nexus Database Migration**

### **Overview:**
- **Source:** Firebase Firestore (NoSQL, 6 collections)
- **Target:** SQLite3 (SQL, Django models)
- **Data:** 555 companies, 1,265 practitioners, contact history
- **Goal:** Migrate all provider data into Nexus for unified healthcare platform

### **Step 1: Set Up Firebase Export (Prerequisites)**
```bash
# 1. Get Firebase Admin SDK
# Go to: https://console.firebase.google.com/project/referrer-map/settings/serviceaccounts/adminsdk
# Generate new private key → Download JSON file
# Save as: backend/firebase-service-account.json

# 2. Install Firebase Admin SDK
cd /Users/craig/Documents/nexus-core-clinic/backend
pip install firebase-admin

# 3. Create Firebase service
# backend/firebase_service.py
import firebase_admin
from firebase_admin import credentials, firestore
import os

def get_firestore_client():
    """Initialize and return Firestore client"""
    if not firebase_admin._apps:
        cred_path = os.path.join(os.path.dirname(__file__), 'firebase-service-account.json')
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    return firestore.client()
```

### **Step 2: Export PinsV5 Data**
```python
# backend/export_pinsv5_data.py
import json
from firebase_service import get_firestore_client

def export_pinsv5_data():
    """Export all PinsV5 data to JSON files"""
    db = get_firestore_client()

    # Export all collections
    collections = [
        'providers',           # 555 companies
        'emailSubscribers',    # Email campaign subscribers
        'emailCampaigns',      # Email campaigns
        'contactRecords',      # Call/contact history
        'followUpQueue',       # Scheduled callbacks
        'mapAreas',           # Geographic territories
        'postcodes',          # Postcode boundaries
    ]

    for collection_name in collections:
        print(f"Exporting {collection_name}...")

        docs = db.collection(collection_name).stream()
        data = []

        for doc in docs:
            doc_data = doc.to_dict()
            doc_data['id'] = doc.id  # Include document ID
            data.append(doc_data)

        # Save to JSON file
        filename = f'exports/{collection_name}.json'
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2, default=str)

        print(f"✅ Exported {len(data)} {collection_name} records")

if __name__ == '__main__':
    export_pinsv5_data()
```

### **Step 3: Create Django Models**
```python
# backend/providers/models.py
from django.db import models
from django.contrib.auth.models import User
import uuid

class Provider(models.Model):
    """PinsV5 Provider - Discovered through web scraping"""

    PROVIDER_STRUCTURE_CHOICES = [
        ('individual', 'Individual Practitioner'),
        ('company', 'Company/Practice'),
    ]

    # Identity
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    provider_id = models.CharField(max_length=100, blank=True, db_index=True)
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=100)  # Podiatrist, Physio, OT, GP
    provider_structure = models.CharField(max_length=20, choices=PROVIDER_STRUCTURE_CHOICES)

    # Contact
    address = models.TextField()
    suburb = models.CharField(max_length=100, blank=True, db_index=True)
    state = models.CharField(max_length=50, blank=True)
    postcode = models.CharField(max_length=10, blank=True)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)

    # Location (for mapping)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True)

    # Individual practitioner details (JSON)
    individual_practitioner = models.JSONField(null=True, blank=True)

    # Company details (JSON)
    company_info = models.JSONField(null=True, blank=True)
    practitioners = models.JSONField(null=True, blank=True)
    practitioner_count = models.IntegerField(default=0)

    # Services & Specialties
    specialties = models.JSONField(default=list)
    services = models.JSONField(default=list)
    languages = models.JSONField(default=list)

    # Contact tracking
    has_been_contacted = models.BooleanField(default=False, db_index=True)
    is_referring = models.BooleanField(default=False, db_index=True)

    # Web scraping metadata
    extraction_source = models.CharField(max_length=200, blank=True)
    extraction_date = models.DateField(null=True, blank=True)
    extracted_at = models.DateTimeField(null=True, blank=True)

    # Link to Nexus referrer (when converted)
    referrer = models.OneToOneField(
        'referrers.Referrer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='provider_source'
    )

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'providers'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.type})"


class ContactRecord(models.Model):
    """Contact history - calls, visits, emails"""

    CONTACT_TYPES = [
        ('phone', 'Phone Call'),
        ('visit', 'In-Person Visit'),
        ('email', 'Email'),
        ('sms', 'SMS'),
    ]

    OUTCOMES = [
        ('successful', 'Successful Contact'),
        ('no_answer', 'No Answer'),
        ('wrong_number', 'Wrong Number'),
        ('callback_requested', 'Callback Requested'),
        ('not_interested', 'Not Interested'),
        ('referral', 'Made Referral'),
    ]

    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name='contacts')
    contact_date = models.DateTimeField()
    contact_type = models.CharField(max_length=20, choices=CONTACT_TYPES)
    duration = models.IntegerField(null=True, blank=True)  # seconds
    outcome = models.CharField(max_length=50, choices=OUTCOMES)
    notes = models.TextField(blank=True)
    follow_up_required = models.BooleanField(default=False)
    follow_up_date = models.DateTimeField(null=True, blank=True)
    practitioner_contacted = models.CharField(max_length=200, blank=True)
    materials_left = models.JSONField(default=list)
    provider_snapshot = models.JSONField(null=True, blank=True)  # Snapshot at time of contact

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'provider_contacts'
        ordering = ['-contact_date']


class ProviderContactSummary(models.Model):
    """Aggregated contact statistics"""

    provider = models.OneToOneField(Provider, on_delete=models.CASCADE, related_name='contact_summary')

    # Contact counts
    total_contacts = models.IntegerField(default=0)
    total_calls = models.IntegerField(default=0)
    total_visits = models.IntegerField(default=0)

    # Last contact info
    last_contact_date = models.DateTimeField(null=True, blank=True)
    last_contact_type = models.CharField(max_length=20, blank=True)
    last_contact_outcome = models.CharField(max_length=50, blank=True)

    # Status
    contact_status = models.CharField(max_length=50, default='never_contacted')
    next_follow_up_date = models.DateTimeField(null=True, blank=True)
    next_follow_up_type = models.CharField(max_length=50, blank=True)

    # Materials tracking
    materials_delivered = models.JSONField(default=list)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'provider_contact_summaries'


class UnifiedCallback(models.Model):
    """Scheduled follow-ups and tasks"""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    TYPES = [
        ('follow_up', 'Follow Up'),
        ('callback', 'Callback'),
        ('meeting', 'Meeting'),
        ('material_delivery', 'Material Delivery'),
        ('presentation', 'Presentation'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    type = models.CharField(max_length=50, choices=TYPES, default='follow_up')
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, null=True, blank=True, related_name='callbacks')
    completed_at = models.DateTimeField(null=True, blank=True)
    outcome = models.TextField(blank=True)
    tags = models.JSONField(default=list)

    # Assignment (can be expanded to multi-user)
    assigned_to = models.CharField(max_length=100, blank=True)  # User name/email

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'unified_callbacks'
        ordering = ['-due_date']


class MapArea(models.Model):
    """Geographic territories for targeting"""

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Geographic boundaries (GeoJSON)
    boundaries = models.JSONField(null=True, blank=True)  # GeoJSON Polygon

    # Color for map display
    color = models.CharField(max_length=7, default='#3388ff')  # Hex color

    # Associated postcodes
    postcodes = models.JSONField(default=list)

    # Statistics
    provider_count = models.IntegerField(default=0)
    contacted_providers = models.IntegerField(default=0)
    referring_providers = models.IntegerField(default=0)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'map_areas'

    def __str__(self):
        return self.name
```

### **Step 4: Import Management Command**
```python
# backend/providers/management/commands/import_pinsv5_data.py
import json
from datetime import datetime
from django.core.management.base import BaseCommand
from providers.models import Provider, ContactRecord, ProviderContactSummary, UnifiedCallback, MapArea

class Command(BaseCommand):
    help = 'Import PinsV5 data from Firebase exports'

    def handle(self, *args, **options):
        self.stdout.write('🚀 Starting PinsV5 data import...\n')

        # Import providers
        self.import_providers()

        # Import contacts
        self.import_contacts()

        # Import contact summaries
        self.import_contact_summaries()

        # Import callbacks
        self.import_callbacks()

        # Import map areas
        self.import_map_areas()

        self.stdout.write(self.style.SUCCESS('\n✅ Import complete!'))

    def import_providers(self):
        self.stdout.write('📦 Importing providers...')

        with open('exports/providers.json', 'r') as f:
            data = json.load(f)

        created = 0
        for item in data:
            Provider.objects.create(
                provider_id=item.get('id'),
                name=item['name'],
                type=item['type'],
                provider_structure=item.get('providerStructure', 'company'),
                address=item.get('address', ''),
                suburb=item.get('suburb', ''),
                state=item.get('state', ''),
                postcode=item.get('postcode', ''),
                phone=item.get('phone', ''),
                email=item.get('email', ''),
                website=item.get('website', ''),
                latitude=item.get('coordinates', {}).get('lat'),
                longitude=item.get('coordinates', {}).get('lng'),
                individual_practitioner=item.get('individualPractitioner'),
                company_info=item.get('companyInfo'),
                practitioners=item.get('practitioners', []),
                practitioner_count=item.get('practitionerCount', 0),
                specialties=item.get('specialties', []),
                services=item.get('services', []),
                languages=item.get('languages', []),
                has_been_contacted=item.get('hasBeenContacted', False),
                is_referring=item.get('isReferring', False),
                extraction_source=item.get('extractionSource', ''),
                extracted_at=self.parse_datetime(item.get('extractedAt')),
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Imported {created} providers'))

    def import_contacts(self):
        self.stdout.write('📦 Importing contact records...')

        with open('exports/contactRecords.json', 'r') as f:
            data = json.load(f)

        created = 0
        for item in data:
            provider = Provider.objects.filter(provider_id=item['providerId']).first()
            if not provider:
                continue

            ContactRecord.objects.create(
                provider=provider,
                contact_date=self.parse_datetime(item['contactDate']),
                contact_type=item['contactType'],
                duration=item.get('duration'),
                outcome=item['outcome'],
                notes=item.get('notes', ''),
                follow_up_required=item.get('followUpRequired', False),
                follow_up_date=self.parse_datetime(item.get('followUpDate')),
                practitioner_contacted=item.get('practitionerContacted', ''),
                materials_left=item.get('materialsLeft', []),
                provider_snapshot=item.get('providerSnapshot', {}),
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Imported {created} contact records'))

    def import_contact_summaries(self):
        self.stdout.write('📦 Importing contact summaries...')

        with open('exports/provider_contact_summary.json', 'r') as f:
            data = json.load(f)

        created = 0
        for item in data:
            provider = Provider.objects.filter(provider_id=item['providerId']).first()
            if not provider:
                continue

            ProviderContactSummary.objects.create(
                provider=provider,
                total_contacts=item.get('totalContacts', 0),
                total_calls=item.get('totalCalls', 0),
                total_visits=item.get('totalVisits', 0),
                last_contact_date=self.parse_datetime(item.get('lastContactDate')),
                last_contact_type=item.get('lastContactType', ''),
                last_contact_outcome=item.get('lastContactOutcome', ''),
                contact_status=item.get('contactStatus', 'never_contacted'),
                next_follow_up_date=self.parse_datetime(item.get('nextFollowUpDate')),
                next_follow_up_type=item.get('nextFollowUpType', ''),
                materials_delivered=item.get('materialsDelivered', []),
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Imported {created} contact summaries'))

    def import_callbacks(self):
        self.stdout.write('📦 Importing callbacks...')

        with open('exports/followUpQueue.json', 'r') as f:
            data = json.load(f)

        created = 0
        for item in data:
            provider = None
            if item.get('providerId'):
                provider = Provider.objects.filter(provider_id=item['providerId']).first()

            UnifiedCallback.objects.create(
                title=item['title'],
                description=item.get('description', ''),
                notes=item.get('notes', ''),
                due_date=self.parse_datetime(item.get('dueDate')),
                status=item.get('status', 'pending'),
                priority=item.get('priority', 'medium'),
                type=item.get('type', 'follow_up'),
                provider=provider,
                completed_at=self.parse_datetime(item.get('completedAt')),
                outcome=item.get('outcome', ''),
                tags=item.get('tags', []),
                assigned_to=item.get('assignedTo', ''),
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Imported {created} callbacks'))

    def import_map_areas(self):
        self.stdout.write('📦 Importing map areas...')

        with open('exports/mapAreas.json', 'r') as f:
            data = json.load(f)

        created = 0
        for item in data:
            MapArea.objects.create(
                name=item['name'],
                description=item.get('description', ''),
                boundaries=item.get('boundaries'),
                color=item.get('color', '#3388ff'),
                postcodes=item.get('postcodes', []),
                provider_count=item.get('providerCount', 0),
                contacted_providers=item.get('contactedProviders', 0),
                referring_providers=item.get('referringProviders', 0),
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Imported {created} map areas'))

    def parse_datetime(self, value):
        if not value:
            return None
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace('Z', '+00:00'))
            except:
                return None
        return None
```

### **Step 5: Run the Migration**
```bash
# 1. Create exports directory
cd /Users/craig/Documents/nexus-core-clinic/backend
mkdir -p exports

# 2. Export from PinsV5
python export_pinsv5_data.py

# 3. Create providers app
cd /Users/craig/Documents/nexus-core-clinic/backend
python manage.py startapp providers

# 4. Copy models (from above) to providers/models.py

# 5. Run migrations
python manage.py makemigrations providers
python manage.py migrate providers

# 6. Import data
python manage.py import_pinsv5_data

# 7. Verify import
python manage.py shell -c "
from providers.models import Provider, ContactRecord, UnifiedCallback
print(f'Providers: {Provider.objects.count()}')
print(f'Contacts: {ContactRecord.objects.count()}') 
print(f'Callbacks: {UnifiedCallback.objects.count()}')
"
```

### **Expected Results:**
- ✅ **555 providers** imported
- ✅ **Complete contact history** preserved
- ✅ **All callback schedules** maintained
- ✅ **Geographic territories** mapped
- ✅ **Data integrity** verified

### **Data Verification:**
```python
# Check imports worked
from providers.models import Provider

# Most contacted providers
Provider.objects.filter(has_been_contacted=True).count()

# Referring providers  
Provider.objects.filter(is_referring=True).count()

# Providers by type
Provider.objects.filter(type='podiatrist').count()
Provider.objects.filter(type='physiotherapist').count()
```

**This migration transforms your SQLite database into a comprehensive healthcare provider management system!** 🚀

---

## 📚 **Related Documentation**

### **Complete Migration Guide:**
- 📖 **[`COMPLETE_MIGRATION_GUIDE.md`](./docs/features/PinsV5/COMPLETE_MIGRATION_GUIDE.md)** - Master guide (50 KB, everything!)
- 📇 **[`MIGRATION_DOCUMENTATION_INDEX.md`](./docs/features/PinsV5/MIGRATION_DOCUMENTATION_INDEX.md)** - Index & navigation

### **Key Resources:**
- 🗄️ **[`DATABASE_MIGRATION_STRATEGY.md`](./docs/features/PinsV5/DATABASE_MIGRATION_STRATEGY.md)** - Django models (ready to copy)
- 🔐 **[`CREDENTIALS_REQUIREMENTS.md`](./docs/features/PinsV5/CREDENTIALS_REQUIREMENTS.md)** - Setup instructions
- 📋 **[`FILE_MIGRATION_CHECKLIST.md`](./docs/features/PinsV5/FILE_MIGRATION_CHECKLIST.md)** - File copying guide

### **PinsV5 Source Code:**
- **Location:** `/Users/craig/Documents/1.PinsV5`
- **Production URL:** https://referrer-map.web.app
- **Firebase Project:** `referrer-map`

---

## 🎯 **Success Outcome**

**When migration is complete, you'll have:**

✅ **Complete All-in-One Healthcare Platform:**
- Clinical management (Nexus existing)
- Provider discovery (web scraping)
- Email marketing (campaigns, builder)
- Relationship tracking (callbacks, contacts)
- Analytics & ROI measurement

✅ **555 Companies + 1,265 Practitioners** in searchable database
✅ **Automated provider discovery** (341 providers in 26 minutes)
✅ **Professional email campaigns** with drag-and-drop builder
✅ **Complete callback tracking** with ROI analytics
✅ **Geographic targeting** with interactive maps

---

## 📞 **Getting Started**

1. **Read the master guide:** [`COMPLETE_MIGRATION_GUIDE.md`](./docs/features/PinsV5/COMPLETE_MIGRATION_GUIDE.md)
2. **Get credentials:** Firebase Admin SDK, Google Maps API, Listmonk setup
3. **Start Phase 1:** Export PinsV5 data, create Django models
4. **Follow the 12-week timeline** above

**Ready to begin the PinsV5 → Nexus migration?** 🚀

**Total effort:** 12 weeks | **Total cost:** ~$20-50/month additional | **Result:** Complete all-in-one healthcare platform

**Last Updated:** November 15, 2025
