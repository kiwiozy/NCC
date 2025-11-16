# 🚀 PinsV5 → Nexus Marketing - Complete Migration Guide

**Date:** November 16, 2025  
**Author:** Migration Planning Team  
**Status:** Ready for Execution  
**Estimated Timeline:** 12 weeks

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [What We're Migrating](#what-were-migrating)
3. [Credentials & Setup](#credentials--setup)
4. [Database Strategy](#database-strategy)
5. [File Migration](#file-migration)
6. [Web Scraping System](#web-scraping-system)
7. [Additional Systems](#additional-systems)
8. [Export & Import Scripts](#export--import-scripts)
9. [12-Week Timeline](#12-week-timeline)
10. [Quick Reference Commands](#quick-reference-commands)

---

## 🎯 Executive Summary

### **What is This?**
Complete guide to migrate **PinsV5** (6-year-old healthcare provider management and email marketing platform) into **Nexus** as the "Marketing" module.

### **The Goal**
Create an **all-in-one platform** combining:
- ✅ Clinical management (Nexus existing)
- ✅ Provider discovery (web scraping)
- ✅ Email marketing (campaigns, builder)
- ✅ Relationship tracking (callbacks, contacts)
- ✅ Analytics & ROI tracking

### **The Scope**
- **~205 files** to migrate (~31,500 LOC)
- **9 major systems**
- **555 companies** to import (1,265 practitioners)
- **12 weeks** estimated timeline
- **~$20-50/month** additional cost (mostly Google Maps)

### **Key Systems**
1. ✅ Email Builder (61 files) - Drag & drop, 18+ components
2. ✅ Web Scraping (100+ files) - Provider discovery
3. ✅ CallV3 Callbacks (15 files) - Relationship management **← CRITICAL**
4. ✅ Asset Library (10 files) - Image/logo management
5. ✅ Map Areas (8 files) - Geographic territories
6. ✅ Campaign Analytics (5 files) - ROI tracking
7. ✅ AI Enrichment (6 files) - Data validation
8. ✅ Material Tracking (in CallV3) - Physical marketing
9. ✅ Multi-User Tasks (in CallV3) - Staff coordination

---

## 📊 What We're Migrating

### **1. Email Builder System** 🔥 **CRITICAL**
**Complexity:** Very High | **Files:** 61 | **LOC:** ~8,000

**What it is:**
- Professional drag & drop email builder
- 18+ email components (header, text, button, image, etc.)
- Multi-column layouts
- Visual framework builder
- Asset library integration
- Company profile integration

**Files to migrate:**
```
From: /Users/craig/Documents/1.PinsV5/web/src/components/email-builder/
To:   /Users/craig/Documents/nexus-core-clinic/frontend/app/components/marketing/email-builder/

Key files:
├── EmailBuilderV2Modular.tsx           (Main builder, 800 LOC)
├── VisualFrameworkBuilderV2.tsx        (Framework, 600 LOC)
├── CompanyProfileEmailBuilder.tsx      (Company integration, 400 LOC)
├── CanvasArea.tsx                      (Canvas, 500 LOC)
├── ComponentPalette.tsx                (Palette, 300 LOC)
├── PropertyPanel.tsx                   (Properties, 400 LOC)
├── components/ (23 files)              (Email components)
├── AssetLibrary.tsx                    (Assets, 600 LOC)
└── ... (38 more files)
```

**Adaptations needed:**
- Firebase Storage → AWS S3 (already in Nexus)
- AWS SES → Gmail API (already in Nexus)
- Firestore → Django REST API
- Firebase Auth → Django Allauth

---

### **2. Web Scraping System** 🔥 **HIGH**
**Complexity:** Very High | **Files:** 100+ | **LOC:** ~15,000

**What it is:**
- Automated healthcare provider discovery
- 4-phase pipeline (discovery → extraction → organization → import)
- 3 profession-specific scrapers (Podiatrists, Physios, OTs)
- 341 providers in ~26 minutes
- 98%+ geocoding accuracy
- Geographic boundary validation

**Files to migrate:**
```
From: /Users/craig/Documents/1.PinsV5/web/scripts/api-server-v2/scrapers/
To:   /Users/craig/Documents/nexus-core-clinic/backend/provider_discovery/scrapers/

Key files:
├── BaseScraper.js                      (Base class, 500 LOC)
├── PodiatristScraper.js                (Podiatrist logic, 800 LOC)
├── PhysiotherapistScraper.js           (Physio logic, 900 LOC)
├── OTScraper.js                        (OT logic, 700 LOC)
├── run-complete-phase1-to-phase4.js    (Automation)
└── ... (95+ more files)
```

**How it works:**
```
Phase 1: Discovery
├── Scrape professional directories
├── Collect URLs to provider pages
└── Store hrefs for batch processing
    ↓
Phase 2: Extraction
├── Visit each provider page
├── Extract contact info, specialties
├── Capture embedded Google Maps
└── Geocode addresses
    ↓
Phase 3: Organization
├── Group by company
├── Deduplicate
├── Create company profiles
└── AI enrichment
    ↓
Phase 4: Import
├── Import to database
├── Create searchable records
└── Enable campaign targeting
```

**Production results:**
- 555 companies imported
- 1,265 practitioners
- Newcastle & Tamworth regions
- 100% success rate

---

### **3. CallV3 - Unified Callback System** 🔥 **CRITICAL**
**Complexity:** High | **Files:** 15 | **LOC:** ~3,000

**What it is:**
The **game changer** for Nexus! Complete referrer relationship management:
- Schedule callbacks with dates/times
- Track all contact history (calls, visits, emails)
- "Need to call" lists with priorities
- Auto-generate follow-up tasks
- Assign tasks to staff members
- Track outcomes (successful, no answer, etc.)
- Link to patient referrals (measure ROI!)

**Why it's PERFECT for Nexus:**
```
Workflow:
1. Web scraping discovers Dr. Smith (podiatrist)
2. Import to providers table
3. Schedule callback to Dr. Smith (Tuesday 2pm)
4. Call Dr. Smith → Log outcome: "Interested, send info"
5. Schedule follow-up (Friday 10am)
6. Dr. Smith refers patient → Link callback to patient record
7. Analytics: Measure callback → referral → revenue
```

**Files to migrate:**
```
From: /Users/craig/Documents/1.PinsV5/web/src/components/callv3/
To:   /Users/craig/Documents/nexus-core-clinic/frontend/app/components/callbacks/

Key files:
├── DailyCallbackDashboard.tsx          (Main dashboard, 600 LOC)
├── SimpleCallbackCard.tsx              (Card UI, 300 LOC)
├── ScheduleFollowUpModal.tsx           (Schedule dialog, 400 LOC)
├── PendingFollowUps.tsx                (Follow-up list, 300 LOC)
├── ContactHistory.tsx                  (History view, 400 LOC)
├── MarketingMaterialTracker.tsx        (Material tracking, 300 LOC)
└── ... (9 more files)
```

**Data Model:**
- Multi-user assignment
- Priority levels (low, medium, high, urgent)
- Status tracking (pending, in_progress, completed)
- Follow-up chains (parent → child callbacks)
- Completion tracking with outcomes

---

### **4. Asset Library System** 🔥 **HIGH**
**Complexity:** High | **Files:** 10 | **LOC:** ~2,000

**What it is:**
- Centralized image/logo management for Email Builder
- **Required dependency** for Email Builder to function
- Firebase Storage → AWS S3 migration
- Caching layer for performance
- Image optimization

**Files to migrate:**
```
From: /Users/craig/Documents/1.PinsV5/web/src/components/email-builder/
To:   /Users/craig/Documents/nexus-core-clinic/frontend/app/components/marketing/email-builder/

Key files:
├── AssetLibrary.tsx                    (Main library, 600 LOC)
├── AssetLibraryDialog.tsx              (Picker dialog, 400 LOC)
├── AssetPicker.tsx                     (Picker component, 300 LOC)
└── SmartUploadDialog.tsx               (Upload UI, 300 LOC)

Services:
├── assetService.ts                     (Operations, 400 LOC)
├── assetCacheService.ts                (Caching, 200 LOC)
├── firebaseAssetService.ts             (→ Replace with S3)
└── imageOptimizationService.ts         (Optimization, 300 LOC)
```

---

### **5. Map Areas - Geographic Territories** 🟡 **MEDIUM**
**Complexity:** Medium | **Files:** 8 | **LOC:** ~1,500

**What it is:**
- Draw polygons on Google Maps
- Define service areas (Newcastle, Tamworth, etc.)
- Target campaigns by geography
- Filter providers by location

**Files to migrate:**
```
From: /Users/craig/Documents/1.PinsV5/web/src/components/
To:   /Users/craig/Documents/nexus-core-clinic/frontend/app/components/marketing/map-areas/

Files:
├── MapDrawingModal.tsx                 (Drawing interface, 400 LOC)
├── AreaManagementHub.tsx               (Management UI, 300 LOC)
├── AreaListModal.tsx                   (List view, 200 LOC)
└── ... (5 more files)
```

---

### **6. Campaign Analytics** 🟡 **MEDIUM**
**Complexity:** Medium | **Files:** 5 | **LOC:** ~800

**What it is:**
- Track email campaign performance
- Open rates, click rates
- Conversion tracking (email → referral → patient)
- ROI measurement

---

### **7. AI Provider Enrichment** 🟢 **LOW**
**Complexity:** Medium | **Files:** 6 | **LOC:** ~1,200

**What it is:**
- Auto-complete referrer data using OpenAI
- Extract info from websites
- Validate contact details
- Generate summaries

**Good news:** OpenAI already integrated in Nexus! Just reuse existing API key.

---

## 🔐 Credentials & Setup

### **What You Need**

| Service | Purpose | Already Have? | Cost | Priority |
|---------|---------|---------------|------|----------|
| **Firebase** | Export PinsV5 data | ❌ Need | Free | 🔥 **CRITICAL** |
| **Google Maps** | Provider mapping | ❌ Need | $20-50/mo | 🔥 **HIGH** |
| **Listmonk** | Email campaigns | ❌ Need | Free | 🔥 **HIGH** |
| **PostgreSQL** | Listmonk DB | ❌ Need | Free | 🔥 **HIGH** |
| **Playwright** | Web scraping | ❌ Need | Free | 🟡 **MEDIUM** |
| **OpenAI** | AI enrichment | ✅ Yes | $10-30/mo | ✅ **READY** |
| **AWS S3** | Asset storage | ✅ Yes | $5-10/mo | ✅ **READY** |
| **Gmail API** | Email sending | ✅ Yes | Free | ✅ **READY** |

**Total new cost:** ~$20-50/month (mostly Google Maps)

---

### **Setup Instructions**

#### **1. Firebase Admin SDK** 🔥 **CRITICAL**

**Purpose:** Export 555 companies from PinsV5

**How to get:**
1. Go to https://console.firebase.google.com
2. Select project: **`referrer-map`**
3. Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download JSON file
6. Save as: `backend/pinsv5-firebase-adminsdk.json`

**Add to backend/.env:**
```bash
FIREBASE_PROJECT_ID=referrer-map
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@referrer-map.iam.gserviceaccount.com
```

---

#### **2. Google Maps API** 🔥 **HIGH**

**Purpose:** Provider mapping, territories, geocoding

**How to get:**
1. Go to https://console.cloud.google.com
2. Enable APIs:
   - Maps JavaScript API
   - Geocoding API
3. Create API key
4. Restrict to your domain (security)

**Add to frontend/.env.local:**
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

#### **3. Listmonk + PostgreSQL** 🔥 **HIGH**

**Purpose:** Professional email marketing platform (self-hosted, free)

**Create: docker-compose.yml**
```yaml
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

**Setup:**
```bash
# Start services
docker-compose up -d

# Initialize Listmonk
docker exec -it listmonk_listmonk_1 ./listmonk --install

# Access: http://localhost:9000
# Create admin account
# Generate API key in Settings
```

**Add to backend/.env:**
```bash
LISTMONK_URL=http://localhost:9000
LISTMONK_USERNAME=admin
LISTMONK_PASSWORD=your_secure_password
LISTMONK_API_KEY=your_api_key
```

---

#### **4. Playwright** 🟡 **MEDIUM**

**Purpose:** Web scraping (headless browser)

**Install:**
```bash
npm install playwright
npx playwright install chromium
```

No API key needed!

---

## 🗄️ Database Strategy

### **The Challenge**
- **PinsV5:** Firebase Firestore (NoSQL) - 6 collections
- **Nexus:** Django SQLite (SQL) - Simple `referrers` table
- **Need:** Keep PinsV5 providers separate but linkable

### **The Solution: Parallel Provider System**

**Strategy:**
1. Create new `providers` app in Django (PinsV5 data)
2. Keep existing `referrers` table (FileMaker data)
3. Add optional link between them
4. Convert provider → referrer when they start referring patients

---

### **Django Models** (Ready to Use!)

**Create: backend/providers/models.py**

```python
from django.db import models
from django.contrib.auth.models import User
import uuid

class Provider(models.Model):
    """
    PinsV5 Provider - Discovered through web scraping
    """
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
    
    def __str__(self):
        return f"{self.name} ({self.type})"
    
    def convert_to_referrer(self):
        """Convert provider to referrer when they start referring"""
        from referrers.models import Referrer
        
        if self.referrer:
            return self.referrer
        
        referrer = Referrer.objects.create(
            name=self.name,
            type=self.type,
            phone=self.phone,
            email=self.email,
            address=self.address,
            notes=f"Converted from provider discovery. ID: {self.id}"
        )
        
        self.referrer = referrer
        self.is_referring = True
        self.save()
        
        return referrer


class ContactRecord(models.Model):
    """Contact history with providers"""
    CONTACT_TYPES = [
        ('call', 'Phone Call'),
        ('visit', 'In-Person Visit'),
        ('email', 'Email'),
        ('marketing_drop', 'Marketing Material Drop'),
    ]
    
    OUTCOMES = [
        ('successful', 'Successful Contact'),
        ('no_answer', 'No Answer'),
        ('busy', 'Busy'),
        ('left_message', 'Left Message'),
        ('completed_delivery', 'Completed Delivery'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name='contacts')
    
    contact_date = models.DateTimeField()
    contact_type = models.CharField(max_length=20, choices=CONTACT_TYPES)
    duration = models.IntegerField(null=True, blank=True)
    outcome = models.CharField(max_length=50, choices=OUTCOMES)
    notes = models.TextField()
    
    follow_up_required = models.BooleanField(default=False)
    follow_up_date = models.DateTimeField(null=True, blank=True)
    
    contacted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    practitioner_contacted = models.CharField(max_length=200, blank=True)
    materials_left = models.JSONField(default=list)
    
    provider_snapshot = models.JSONField()  # Provider data at time of contact
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'provider_contacts'
        ordering = ['-contact_date']


class ProviderContactSummary(models.Model):
    """Aggregated contact summary (for performance)"""
    CONTACT_STATUS_CHOICES = [
        ('never_contacted', 'Never Contacted'),
        ('attempted', 'Attempted Contact'),
        ('contacted', 'Successfully Contacted'),
        ('follow_up_needed', 'Follow-up Needed'),
        ('do_not_contact', 'Do Not Contact'),
    ]
    
    provider = models.OneToOneField(Provider, on_delete=models.CASCADE, primary_key=True)
    
    total_contacts = models.IntegerField(default=0)
    total_calls = models.IntegerField(default=0)
    total_visits = models.IntegerField(default=0)
    
    last_contact_date = models.DateTimeField(null=True, blank=True)
    last_contact_type = models.CharField(max_length=20, blank=True)
    last_contact_outcome = models.CharField(max_length=50, blank=True)
    
    contact_status = models.CharField(max_length=30, choices=CONTACT_STATUS_CHOICES)
    
    next_follow_up_date = models.DateTimeField(null=True, blank=True)
    next_follow_up_type = models.CharField(max_length=20, blank=True)
    
    materials_delivered = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'provider_contact_summaries'


class UnifiedCallback(models.Model):
    """CallV3 - Unified callback/task system"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('overdue', 'Overdue'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    TYPE_CHOICES = [
        ('call', 'Phone Call'),
        ('visit', 'Visit'),
        ('email', 'Email'),
        ('task', 'Task'),
        ('material_drop', 'Material Drop'),
        ('follow_up', 'Follow-up'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    assigned_to = models.ManyToManyField(User, related_name='assigned_callbacks')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    due_date = models.DateTimeField(null=True, blank=True)
    scheduled_time = models.TimeField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, null=True, blank=True)
    
    completed_at = models.DateTimeField(null=True, blank=True)
    outcome = models.CharField(max_length=50, blank=True)
    
    tags = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'unified_callbacks'
        ordering = ['due_date', '-priority']


class MapArea(models.Model):
    """Geographic territories"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    coordinates = models.JSONField()  # Array of lat/lng points
    center = models.JSONField()       # {lat, lng}
    bounds = models.JSONField()       # {north, south, east, west}
    
    color = models.CharField(max_length=7, default="#3B82F6")
    opacity = models.DecimalField(max_digits=3, decimal_places=2, default=0.35)
    
    tags = models.JSONField(default=list)
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'map_areas'
```

**Run migrations:**
```bash
python manage.py makemigrations providers
python manage.py migrate providers
```

---

## 📦 Export & Import Scripts

### **Export from PinsV5 (Firebase)**

**Create: scripts/export-pinsv5-data.js**

```javascript
const admin = require('firebase-admin');
const fs = require('fs/promises');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./pinsv5-firebase-adminsdk.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'referrer-map'
});

const db = admin.firestore();

async function exportCollection(collectionName) {
  console.log(`📦 Exporting ${collectionName}...`);
  
  const snapshot = await db.collection(collectionName).get();
  const data = [];
  
  snapshot.forEach(doc => {
    const docData = doc.data();
    
    // Convert Firestore Timestamps to ISO strings
    Object.keys(docData).forEach(key => {
      if (docData[key] && docData[key].toDate) {
        docData[key] = docData[key].toDate().toISOString();
      }
    });
    
    data.push({
      id: doc.id,
      ...docData
    });
  });
  
  // Create exports directory if it doesn't exist
  await fs.mkdir('./exports', { recursive: true });
  
  // Write to JSON file
  await fs.writeFile(
    `./exports/${collectionName}.json`,
    JSON.stringify(data, null, 2)
  );
  
  console.log(`✅ Exported ${data.length} documents from ${collectionName}`);
  return data.length;
}

async function exportAllData() {
  console.log('🚀 Starting PinsV5 data export...\n');
  
  const collections = [
    'providers',
    'contacts',
    'provider_contact_summary',
    'unified_callbacks',
    'companyProfiles',
    'mapAreas'
  ];
  
  let totalDocs = 0;
  
  for (const collection of collections) {
    const count = await exportCollection(collection);
    totalDocs += count;
  }
  
  console.log(`\n✅ Export complete!`);
  console.log(`📊 Total documents exported: ${totalDocs}`);
  console.log(`📁 Files saved to: ./exports/`);
}

exportAllData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Export failed:', error);
    process.exit(1);
  });
```

**Run:**
```bash
node scripts/export-pinsv5-data.js
```

**Output:**
```
exports/
├── providers.json                 (555 documents)
├── contacts.json
├── provider_contact_summary.json
├── unified_callbacks.json
├── companyProfiles.json
└── mapAreas.json
```

---

### **Import to Nexus (Django)**

**Create: backend/providers/management/commands/import_pinsv5_data.py**

```python
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
        
        with open('exports/contacts.json', 'r') as f:
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
        
        with open('exports/unified_callbacks.json', 'r') as f:
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
                type=item['type'],
                provider=provider,
                completed_at=self.parse_datetime(item.get('completedAt')),
                outcome=item.get('outcome', ''),
                tags=item.get('tags', []),
            )
            created += 1
        
        self.stdout.write(self.style.SUCCESS(f'✅ Imported {created} callbacks'))
    
    def import_map_areas(self):
        self.stdout.write('📦 Importing map areas...')
        
        with open('exports/mapAreas.json', 'r') as f:
            data = json.load(f)
        
        created = 0
        for item in data:
            # Note: Would need User ID - skip for now or assign to admin
            # MapArea.objects.create(...)
            pass
        
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

**Run:**
```bash
python manage.py import_pinsv5_data
```

---

## 📅 12-Week Timeline

### **Phase 1: Core Marketing (Weeks 1-4)**
**Goal:** Send email campaigns to referrers

**Week 1: Setup**
- [ ] Get Firebase service account JSON
- [ ] Get Google Maps API key
- [ ] Set up Listmonk + PostgreSQL (Docker)
- [ ] Export PinsV5 data (555 companies)

**Week 2: Database**
- [ ] Create Django `providers` app
- [ ] Create 5 models (Provider, ContactRecord, etc.)
- [ ] Run migrations
- [ ] Import 555 companies

**Week 3: Email Builder**
- [ ] Copy 61 Email Builder files
- [ ] Adapt Firebase → S3
- [ ] Adapt SES → Gmail API
- [ ] Test Email Builder

**Week 4: Asset Library & Testing**
- [ ] Copy 10 Asset Library files
- [ ] Set up S3 asset storage
- [ ] Test end-to-end campaign creation
- [ ] Test email sending via Listmonk

**Deliverable:** ✅ Send email campaigns to referrers

---

### **Phase 2: Provider Discovery (Weeks 5-7)**
**Goal:** Discover and map providers

**Week 5: Web Scraping Backend**
- [ ] Copy 100+ scraper files
- [ ] Set up Playwright
- [ ] Create Django API endpoints
- [ ] Test scraping locally

**Week 6: Map Areas**
- [ ] Copy 8 Map Areas files
- [ ] Integrate Google Maps
- [ ] Test polygon drawing
- [ ] Test geographic filtering

**Week 7: Provider Discovery UI**
- [ ] Build Provider Discovery page
- [ ] Build map view with providers
- [ ] Build import workflow (provider → referrer)
- [ ] Test end-to-end discovery

**Deliverable:** ✅ Discover and map providers

---

### **Phase 3: Relationship Management (Weeks 8-10)**
**Goal:** Track referrer relationships

**Week 8: CallV3 Backend**
- [ ] Copy 15 CallV3 files
- [ ] Create UnifiedCallback model (already done!)
- [ ] Create API endpoints
- [ ] Test callback creation

**Week 9: CallV3 UI**
- [ ] Build Callback Dashboard
- [ ] Build Schedule Follow-up Modal
- [ ] Build Contact History
- [ ] Test callback workflow

**Week 10: AI Enrichment & Analytics**
- [ ] Copy 6 AI Enrichment files
- [ ] Copy 5 Analytics files
- [ ] Test AI data enrichment
- [ ] Test campaign analytics

**Deliverable:** ✅ Track referrer relationships

---

### **Phase 4: Polish & Integration (Weeks 11-12)**
**Goal:** Production-ready all-in-one platform

**Week 11: Integration Testing**
- [ ] End-to-end workflow testing
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Security review

**Week 12: Documentation & Deployment**
- [ ] User documentation
- [ ] Training materials
- [ ] Production deployment
- [ ] Staff training

**Deliverable:** ✅ Production-ready Nexus Marketing

---

## 🚀 Quick Reference Commands

### **Initial Setup**
```bash
# 1. Export PinsV5 data
cd /Users/craig/Documents/1.PinsV5
node scripts/export-pinsv5-data.js

# 2. Create Django app
cd /Users/craig/Documents/nexus-core-clinic/backend
python manage.py startapp providers

# 3. Copy models (from this doc) to:
# backend/providers/models.py

# 4. Run migrations
python manage.py makemigrations providers
python manage.py migrate providers

# 5. Import data
python manage.py import_pinsv5_data
```

### **Start Listmonk**
```bash
# Create docker-compose.yml (see Credentials section)
docker-compose up -d

# Initialize
docker exec -it listmonk_listmonk_1 ./listmonk --install

# Access
open http://localhost:9000
```

### **File Migration**
```bash
# Create directories
cd /Users/craig/Documents/nexus-core-clinic
mkdir -p frontend/app/components/marketing/email-builder
mkdir -p frontend/app/services/email
mkdir -p backend/provider_discovery/scrapers

# Copy Email Builder (example)
cp -r /Users/craig/Documents/1.PinsV5/web/src/components/email-builder/*.tsx \
     frontend/app/components/marketing/email-builder/

# Copy Scrapers
cp -r /Users/craig/Documents/1.PinsV5/web/scripts/api-server-v2/scrapers/*.js \
     backend/provider_discovery/scrapers/
```

### **Verify Data**
```bash
# Check imported providers
python manage.py shell
>>> from providers.models import Provider
>>> Provider.objects.count()  # Should be 555
>>> Provider.objects.filter(type='podiatrist').count()
>>> Provider.objects.filter(has_been_contacted=True).count()
```

---

## 📊 Success Metrics

**After Phase 1 (Week 4):**
- ✅ Can create email campaigns
- ✅ Can send emails to referrers
- ✅ Email Builder fully functional
- ✅ Listmonk integrated

**After Phase 2 (Week 7):**
- ✅ Can discover new providers (web scraping)
- ✅ 555 companies imported and viewable on map
- ✅ Can draw geographic territories
- ✅ Can import discovered providers to referrers

**After Phase 3 (Week 10):**
- ✅ Can schedule callbacks to referrers
- ✅ Can track all contact history
- ✅ Can measure campaign → referral → patient ROI
- ✅ AI enrichment working

**After Phase 4 (Week 12):**
- ✅ Complete all-in-one platform
- ✅ Staff trained
- ✅ Production deployed
- ✅ Documentation complete

---

## 🎯 Key Contacts & Resources

**PinsV5 Firebase Project:**
- Project ID: `referrer-map`
- Production URL: https://referrer-map.web.app
- Data: 555 companies, 1,265 practitioners

**Documentation Location:**
- `/Users/craig/Documents/nexus-core-clinic/docs/features/`
- 10 comprehensive documents
- ~178 KB total

**Source Code:**
- PinsV5: `/Users/craig/Documents/1.PinsV5`
- Nexus: `/Users/craig/Documents/nexus-core-clinic`

---

## ✅ Final Checklist

**Before Starting:**
- [ ] Read this complete guide
- [ ] Get Firebase service account JSON
- [ ] Get Google Maps API key
- [ ] Set up Listmonk (30 minutes)
- [ ] Review Django models

**Phase 1 Checklist:**
- [ ] Export 555 companies from PinsV5
- [ ] Create Django providers app
- [ ] Import companies to Nexus
- [ ] Copy Email Builder (61 files)
- [ ] Copy Asset Library (10 files)
- [ ] Test email campaign creation

**Phase 2 Checklist:**
- [ ] Copy web scraping code (100+ files)
- [ ] Copy Map Areas (8 files)
- [ ] Build Provider Discovery UI
- [ ] Test provider discovery end-to-end

**Phase 3 Checklist:**
- [ ] Copy CallV3 system (15 files)
- [ ] Copy AI Enrichment (6 files)
- [ ] Copy Analytics (5 files)
- [ ] Test callback workflow

**Phase 4 Checklist:**
- [ ] Integration testing
- [ ] User documentation
- [ ] Production deployment
- [ ] Staff training

---

**🎉 Ready to begin the migration!**

**This document contains everything you need to migrate PinsV5 to Nexus Marketing.**

**Total effort: ~12 weeks | Total cost: ~$20-50/month additional | Result: Complete all-in-one platform**

---

**Next Step:** Review this guide, gather credentials, and begin Phase 1! 🚀

