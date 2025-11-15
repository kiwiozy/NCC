# 🔐 Credentials & API Keys Required - PinsV5 to Nexus Migration

**Date:** November 16, 2025  
**Purpose:** Complete list of all credentials, API keys, and services needed for the full migration  
**Status:** Planning document

---

## 📋 **Executive Summary**

To migrate PinsV5 features to Nexus, you'll need credentials for **8 services**:

| Service | Purpose | Already in Nexus? | Migration Priority |
|---------|---------|-------------------|-------------------|
| **1. Firebase** | Data export (PinsV5 → Nexus) | ❌ No | 🔥 **CRITICAL** |
| **2. Google Maps** | Provider mapping, territories | ❌ No | 🔥 **HIGH** |
| **3. OpenAI** | AI enrichment | ✅ Yes | ✅ **READY** |
| **4. AWS S3** | Asset storage | ✅ Yes | ✅ **READY** |
| **5. Gmail API** | Email campaigns | ✅ Yes | ✅ **READY** |
| **6. Listmonk** | Email marketing platform | ❌ No | 🔥 **HIGH** |
| **7. PostgreSQL** | Listmonk database | ❌ No | 🔥 **HIGH** |
| **8. Playwright** | Web scraping | ❌ No | 🟡 **MEDIUM** |

---

## ✅ **Already Configured in Nexus**

### **1. OpenAI API** ✅
**Status:** Already working in Nexus  
**Used for:** Clinical notes, PDF extraction, AI-powered features

**Current Usage:**
- PDF text extraction
- Clinical note rewriting
- AT Report generation

**PinsV5 Additional Usage:**
- Provider data enrichment
- Website scraping & summarization
- Business card OCR
- Postcode extraction from map screenshots

**Action:** ✅ No new credentials needed - reuse existing OpenAI key

---

### **2. AWS S3** ✅
**Status:** Already working in Nexus  
**Used for:** Document storage, file uploads

**Current Usage:**
- Patient documents
- Images, x-rays
- Presigned URLs for secure access

**PinsV5 Usage:**
- Email asset storage (replace Firebase Storage)
- Logo/image library
- Marketing materials
- Email templates

**Action:** ✅ No new credentials needed - reuse existing S3 bucket (may need new folder structure)

---

### **3. Gmail API (Google OAuth)** ✅
**Status:** Already working in Nexus  
**Used for:** Email sending, OAuth authentication

**Current Usage:**
- Send emails from multiple Gmail accounts
- OAuth2 authentication
- Multi-account support

**PinsV5 Usage:**
- Campaign emails (via Listmonk)
- Gmail integration for campaigns
- OAuth authentication

**Action:** ✅ No new credentials needed - reuse existing Gmail OAuth setup

---

### **4. AWS SES** ✅
**Status:** Unknown if configured (PinsV5 uses it)  
**Used for:** Bulk email sending

**PinsV5 Usage:**
- Email campaign delivery (alternative to Gmail)
- Bounce handling
- High-volume sending

**Nexus Current:** Uses Gmail API (not SES)

**Action:** 🤔 **Decision needed:** Continue with Gmail API or add SES for bulk campaigns?

---

## 🆕 **New Services Needed**

### **1. Firebase / Firestore** 🔥 **CRITICAL**
**Purpose:** Export PinsV5 data to migrate to Nexus

**What you need:**
```bash
# Firebase Admin SDK (for data export)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**How to get:**
1. Go to Firebase Console: https://console.firebase.google.com
2. Select PinsV5 project
3. Project Settings → Service Accounts
4. Generate new private key
5. Download JSON file

**Alternative (simpler):**
```bash
# Download service account JSON
# Save as: backend/pinsv5-firebase-adminsdk.json
```

**Usage:**
- Export 341 providers from Firestore
- Export contact records
- Export callback data
- Export map areas
- Export company profile

**Cost:** ✅ Free (existing Firebase project)

**Action:** 🔥 **Required immediately for data migration**

---

### **2. Google Maps JavaScript API** 🔥 **HIGH PRIORITY**
**Purpose:** Provider mapping, geographic territories, map drawing

**What you need:**
```bash
# Google Maps API Key
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**How to get:**
1. Go to Google Cloud Console: https://console.cloud.google.com
2. Enable APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API (optional)
3. Create API key
4. Restrict to your domains (security)
5. Set daily quota limits

**Usage:**
- Display providers on map
- Draw geographic territories
- Geocode addresses to coordinates
- Calculate distances
- Area-based campaign targeting

**Cost:** 
- $200/month free credit (Google Cloud)
- ~$7 per 1,000 map loads
- ~$5 per 1,000 geocoding requests
- **Estimated:** $20-50/month for typical usage

**Action:** 🔥 **Required for Provider Discovery UI**

---

### **3. Listmonk** 🔥 **HIGH PRIORITY**
**Purpose:** Professional email marketing platform (self-hosted)

**What you need:**
```bash
# Listmonk Configuration
LISTMONK_URL=http://localhost:9000
LISTMONK_USERNAME=admin
LISTMONK_PASSWORD=your_secure_password
LISTMONK_API_KEY=your_api_key  # Generated in Listmonk UI
```

**How to set up:**
1. Install via Docker Compose:
```yaml
# docker-compose.yml
version: '3.7'
services:
  listmonk:
    image: listmonk/listmonk:latest
    ports:
      - "9000:9000"
    environment:
      - TZ=Australia/Sydney
    volumes:
      - ./listmonk-config.toml:/listmonk/config.toml
      - ./listmonk-data:/listmonk/data
    depends_on:
      - postgres

  postgres:
    image: postgres:13
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=listmonk
      - POSTGRES_PASSWORD=listmonk
      - POSTGRES_DB=listmonk
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

2. Initialize:
```bash
docker-compose up -d
docker exec -it listmonk_listmonk_1 ./listmonk --install
```

3. Access: http://localhost:9000
4. Create admin account
5. Generate API key in Settings

**Usage:**
- Send email campaigns
- Manage subscriber lists
- Track opens/clicks
- Handle bounces/unsubscribes
- Campaign analytics

**Cost:** ✅ Free (self-hosted open source)

**Action:** 🔥 **Required for Email Marketing features**

---

### **4. PostgreSQL** 🔥 **HIGH PRIORITY**
**Purpose:** Database for Listmonk

**What you need:**
```bash
# PostgreSQL for Listmonk
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=listmonk
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=listmonk
```

**How to set up:**
- Included in Docker Compose above
- Or use managed PostgreSQL (AWS RDS, Google Cloud SQL)

**Usage:**
- Store Listmonk data (subscribers, campaigns)
- Campaign analytics
- Email templates

**Cost:** 
- ✅ Free (Docker)
- Or $15-50/month (managed service)

**Action:** 🔥 **Required for Listmonk**

---

### **5. Playwright** 🟡 **MEDIUM PRIORITY**
**Purpose:** Headless browser for web scraping

**What you need:**
```bash
# No API keys required!
# Just install the package
npm install playwright
npx playwright install chromium
```

**Usage:**
- Scrape provider directories
- Automated form filling
- Screenshot capture
- Map interaction

**Cost:** ✅ Free (open source)

**Action:** 🟡 **Required for Web Scraping features**

---

## 📝 **Environment Variables - Complete List**

### **For Nexus Backend (Django)**

Create/update: `backend/.env`

```bash
# ============================================
# EXISTING NEXUS CREDENTIALS (Keep as-is)
# ============================================

# Django
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=*

# Database (SQLite - no config needed for dev)
# DATABASE_URL=sqlite:///db.sqlite3

# OpenAI (Already configured)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AWS S3 (Already configured)
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_STORAGE_BUCKET_NAME=walkeasy-nexus-documents
AWS_S3_REGION_NAME=ap-southeast-2

# Gmail API (Already configured)
GMAIL_CLIENT_ID=xxxxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxx
GMAIL_REDIRECT_URI=https://localhost:8000/accounts/google/login/callback/

# SMS Broadcast (Already configured)
SMS_BROADCAST_API_KEY=your-sms-broadcast-api-key
SMS_BROADCAST_API_SECRET=your-sms-broadcast-api-secret

# Xero (Already configured)
XERO_CLIENT_ID=your-xero-client-id
XERO_CLIENT_SECRET=your-xero-client-secret

# ============================================
# NEW CREDENTIALS FOR PINSV5 MIGRATION
# ============================================

# Firebase Admin SDK (for data export)
FIREBASE_PROJECT_ID=pinsv5-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@pinsv5.iam.gserviceaccount.com

# Google Maps
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Listmonk
LISTMONK_URL=http://localhost:9000
LISTMONK_USERNAME=admin
LISTMONK_PASSWORD=your_listmonk_password
LISTMONK_API_KEY=your_listmonk_api_key

# PostgreSQL (Listmonk)
LISTMONK_POSTGRES_HOST=localhost
LISTMONK_POSTGRES_PORT=5432
LISTMONK_POSTGRES_USER=listmonk
LISTMONK_POSTGRES_PASSWORD=your_postgres_password
LISTMONK_POSTGRES_DB=listmonk

# Playwright (no API key needed, just install)
# PLAYWRIGHT_BROWSERS_PATH=/path/to/browsers (optional)
```

---

### **For Nexus Frontend (Next.js)**

Create/update: `frontend/.env.local`

```bash
# ============================================
# NEW CREDENTIALS FOR PINSV5 FEATURES
# ============================================

# Google Maps (Public API Key - restricted to domain)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Backend API URL
NEXT_PUBLIC_API_URL=https://localhost:8000
```

---

## 💰 **Cost Summary**

| Service | Setup Cost | Monthly Cost | Notes |
|---------|-----------|--------------|-------|
| **Firebase** | ✅ Free | ✅ Free | Existing project, read-only access for export |
| **Google Maps** | ✅ Free | 💵 $20-50 | $200 free credit/month, pay for overage |
| **OpenAI** | ✅ Free | 💵 $10-30 | Already paying (existing Nexus usage) |
| **AWS S3** | ✅ Free | 💵 $5-10 | Already paying (existing Nexus usage) |
| **Gmail API** | ✅ Free | ✅ Free | Already configured |
| **Listmonk** | ✅ Free | ✅ Free | Self-hosted open source |
| **PostgreSQL** | ✅ Free | ✅ Free | Docker (or $15-50 managed) |
| **Playwright** | ✅ Free | ✅ Free | Open source |
| **TOTAL** | **✅ $0** | **💵 $35-90** | Most costs already covered by existing services |

**Key Points:**
- Most expensive is Google Maps (~$20-50/month)
- Can reduce Maps cost with caching and optimization
- Listmonk is free (self-hosted)
- Most services already paid for in existing Nexus

---

## 🚀 **Setup Priority Order**

### **Phase 1: Data Migration (Week 1)**
1. 🔥 **Firebase Admin SDK** - Export PinsV5 data
2. 🔥 **Listmonk + PostgreSQL** - Set up email platform

### **Phase 2: Provider Discovery (Week 2-3)**
3. 🔥 **Google Maps API** - Provider mapping
4. 🟡 **Playwright** - Web scraping (optional, can defer)

### **Phase 3: Integration (Week 3-4)**
5. ✅ **Verify OpenAI** - Test AI enrichment
6. ✅ **Verify S3** - Test asset storage
7. ✅ **Verify Gmail** - Test campaign sending

---

## 📋 **Quick Setup Checklist**

### **Step 1: Firebase (Data Export)**
- [ ] Access PinsV5 Firebase Console
- [ ] Generate service account JSON
- [ ] Save as `backend/pinsv5-firebase-adminsdk.json`
- [ ] Test connection with export script

### **Step 2: Google Maps**
- [ ] Enable Maps JavaScript API in Google Cloud
- [ ] Enable Geocoding API
- [ ] Create API key
- [ ] Restrict to Nexus domain
- [ ] Add to frontend `.env.local`
- [ ] Test map display

### **Step 3: Listmonk**
- [ ] Create `docker-compose.yml`
- [ ] Run `docker-compose up -d`
- [ ] Initialize Listmonk: `./listmonk --install`
- [ ] Access http://localhost:9000
- [ ] Create admin account
- [ ] Generate API key
- [ ] Add credentials to backend `.env`
- [ ] Test API connection

### **Step 4: Playwright (Web Scraping)**
- [ ] Run `npm install playwright`
- [ ] Run `npx playwright install chromium`
- [ ] Test with sample scraping script

### **Step 5: Verify Existing Services**
- [ ] Test OpenAI API (already configured)
- [ ] Test S3 upload (already configured)
- [ ] Test Gmail sending (already configured)

---

## 🔒 **Security Best Practices**

### **1. Never Commit Credentials**
```bash
# Add to .gitignore (should already be there)
.env
.env.local
.env.production
*-firebase-adminsdk.json
*.pem
*.key
```

### **2. Use Environment Variables**
- Store all credentials in `.env` files
- Never hardcode API keys
- Use different keys for dev/staging/production

### **3. Restrict API Keys**
- Google Maps: Restrict to specific domains
- Firebase: Use read-only service account for export
- Listmonk: Use strong password + API key

### **4. Rotate Keys Regularly**
- Change passwords every 90 days
- Regenerate API keys quarterly
- Monitor for unauthorized usage

---

## 🎯 **Next Steps**

1. **Review this document** - Confirm all services needed
2. **Gather credentials** - Firebase and Google Maps are priorities
3. **Set up Listmonk** - Docker Compose (30 minutes)
4. **Test connections** - Verify all APIs work
5. **Begin migration** - Start with data export

**Most services are already configured in Nexus! Only Firebase, Google Maps, and Listmonk are new.** ✅

---

## 📞 **Support & Documentation**

### **Firebase**
- Console: https://console.firebase.google.com
- Docs: https://firebase.google.com/docs/admin/setup

### **Google Maps**
- Console: https://console.cloud.google.com
- Docs: https://developers.google.com/maps/documentation

### **Listmonk**
- Website: https://listmonk.app
- Docs: https://listmonk.app/docs
- GitHub: https://github.com/knadh/listmonk

### **Playwright**
- Website: https://playwright.dev
- Docs: https://playwright.dev/docs/intro

---

**Ready to gather credentials and begin setup!** 🚀

