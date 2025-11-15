# 📋 Nexus Marketing Migration Plan

**Date:** November 11, 2025  
**Status:** 🚧 Phase 1 UI Complete - Backend Pending  
**Purpose:** Migrate MailChimp replacement features into Nexus Marketing module

**📂 Source Code Location:** `/Users/craig/Documents/1.PinsV5`  
*(Original standalone application built over 6 years - reference for migration)*

**Note:** This module was previously called "PinsV5" - a standalone healthcare provider management and email marketing platform developed over 6 years. It is being integrated into Nexus as the "Marketing" module.

**Current Progress:**
- ✅ **Marketing Section UI:** Complete with navigation, dashboard, and placeholder pages
- ⏳ **Backend Integration:** Not started - Django models, Listmonk integration pending
- 🎯 **Phase 1 Focus:** Referrer email campaigns (healthcare providers)

---

## 🎯 **Executive Summary**

**Nexus Marketing** (formerly PinsV5) is a comprehensive healthcare provider management and email marketing platform with 6 years of development. This document outlines a strategy to migrate its core features into the main Nexus application, focusing on email marketing, contact management, and campaign tracking capabilities that would benefit the clinic management system.

### **What is Nexus Marketing?**
- **Purpose:** Healthcare provider discovery, management, and email marketing for Walk Easy Marketing
- **Original Name:** PinsV5 (standalone application)
- **Migration Goal:** Integrate as "Marketing" module in Nexus
- **Tech Stack:** React + TypeScript, Firebase, Node.js, Listmonk, PostgreSQL
- **Key Features:**
  - 🔍 Web scraping (Podiatrists, Physiotherapists, OTs)
  - 📧 Email marketing with drag-and-drop builder
  - 🗺️ Google Maps integration with geographic analysis
  - 📞 Contact tracking and follow-up management
  - 🤖 AI-powered data enrichment (OpenAI)
  - 📊 Analytics dashboard

### **Migration Goals:**
1. ✅ Bring email marketing capabilities to Nexus
2. ✅ Enhance contact management with campaign tracking
3. ✅ Add mass communication features for referrers (Phase 1) and patients (Phase 2)
4. ✅ Integrate analytics and reporting
5. ✅ **MIGRATING:** Web scraping for provider discovery (all-in-one solution)

**📝 Note:** See [Web Scraping Analysis](./WEB_SCRAPING_ANALYSIS.md) for detailed documentation of the sophisticated scraping system (100+ files, 2+ years development, ~17-25 days migration effort). This creates a complete all-in-one healthcare practice management + marketing platform.

### **Current Implementation Status:**
- ✅ **Marketing Section Navigation:** Top-level tab in main navigation with hover submenu
- ✅ **Marketing Dashboard:** `/marketing` - Wireframe complete
- ✅ **Campaigns Page:** `/marketing/campaigns` - Wireframe complete
- ✅ **Placeholder Pages:** Contacts, Templates, Analytics pages created
- ⏳ **Backend Models:** Not yet created (campaigns, templates, subscribers)
- ⏳ **Listmonk Integration:** Not yet implemented
- ⏳ **Email Builder:** Not yet ported from original system
- 🎯 **Next Step:** Build Django backend for campaign management

---

## 📊 **Feature Comparison Matrix**

| Feature | Source System | Nexus (Current) | Migration Priority | Complexity |
|---------|--------|-----------------|-------------------|------------|
| **Email Campaigns** | ✅ Full Listmonk integration | ❌ None | 🔥 **High** | Medium |
| **Drag & Drop Email Builder** | ✅ 18+ components | ❌ None | 🔥 **High** | High |
| **Web Scraping** | ✅ 3 professions, 341 providers | ❌ None | 🔥 **High** | Very High |
| **Provider Discovery UI** | ✅ Map view, import workflow | ❌ None | 🔥 **High** | High |
| **Contact Tracking** | ✅ Calls, visits, materials | ✅ Basic notes | 🟡 Medium | Low |
| **Follow-up System** | ✅ Unified queue | ❌ None | 🔥 **High** | Medium |
| **SMS Integration** | ❌ None | ✅ SMS Broadcast | ✅ Keep | N/A |
| **Analytics** | ✅ Campaign analytics | ❌ None | 🟡 Medium | Medium |
| **Asset Library** | ✅ Firebase Storage | ✅ AWS S3 | 🟢 Low | Low |
| **AI Enrichment** | ✅ OpenAI Vision | ✅ OpenAI GPT-4o-mini | 🟢 Low | Low |
| **Google Maps** | ✅ Advanced markers | ❌ Not yet | 🔥 **High** | Medium |

---

## 🏗️ **Architecture Analysis**

### **Source System Architecture (Legacy)**

```
┌─────────────────┐
│  React Frontend │
│  (TypeScript)   │
└────────┬────────┘
         │
         ├─> Vite Dev Server (Port 5173)
         ├─> API Server V2 (Port 5175)
         ├─> Email Server (Port 3001)
         └─> Firebase (Auth, Firestore, Storage)
                    │
                    └─> Listmonk (Docker)
                         └─> PostgreSQL
```

### **Nexus Architecture**

```
┌─────────────────┐
│  Next.js Frontend│
│  (TypeScript)    │
└────────┬─────────┘
         │
         ├─> Next.js Server (HTTPS)
         ├─> Django REST API (Port 8000)
         └─> PostgreSQL Database
                    │
                    ├─> AWS S3 (Documents/Images)
                    ├─> SMS Broadcast (SMS)
                    ├─> Gmail API (Email sending)
                    ├─> Xero API (Invoicing)
                    └─> OpenAI API (AI features)
```

### **Technology Stack Mapping**

| Component | Source System | Nexus | Migration Strategy |
|-----------|--------|-------|-------------------|
| **Frontend** | React 18 | Next.js 14 | ✅ Port components to Next.js |
| **UI Library** | Mantine v8 | Mantine v7 | ✅ Already compatible |
| **Backend** | Node.js Express | Django REST | 🔄 Rewrite in Django |
| **Database** | Firebase Firestore | PostgreSQL | 🔄 New schema design |
| **Auth** | Firebase Auth | Django Allauth | ✅ Already integrated |
| **Storage** | Firebase Storage | AWS S3 | ✅ Already integrated |
| **Email** | Listmonk + AWS SES | Gmail API | 🔄 Keep Gmail, add campaigns |
| **State Management** | React Context | React Context | ✅ Port directly |

---

## 📦 **Core Features to Migrate**

### **🎯 File Migration Reference** ⭐ **NEW**

This section details the **hard-to-code** components from PinsV5 that need to be copied to Nexus. These files represent hundreds of hours of development work and should be preserved.

---

#### **1️⃣ Email Builder** (Priority: 🔥 CRITICAL)

**Source Location:** `/Users/craig/Documents/1.PinsV5/web/src/components/email-builder/`  
**Target Location:** `frontend/app/components/marketing/email-builder/`

**Main Components (18 files):**
```
1. EmailBuilderV2Modular.tsx           # Main email builder interface
2. VisualFrameworkBuilderV2.tsx        # Visual framework builder
3. VisualFrameworkBuilder.tsx          # Legacy framework builder (backup)
4. CompanyProfileEmailBuilder.tsx      # Company profile integration
5. CanvasArea.tsx                      # Drag & drop canvas
6. ComponentPalette.tsx                # Component selection palette
7. PropertyPanel.tsx                   # Properties editor panel
8. ComponentCard.tsx                   # Individual component card
9. EmailComponent.tsx                  # Base component wrapper
10. EmailFrameworkConfig.tsx           # Framework configuration
11. AssetLibrary.tsx                   # Asset library main
12. AssetLibraryDialog.tsx             # Asset library modal
13. AssetLibraryButton.tsx             # Asset library trigger button
14. AssetPicker.tsx                    # Asset picker component
15. AssetSelector.tsx                  # Asset selector dropdown
16. SmartUploadDialog.tsx              # Smart asset upload
17. IconSelector.tsx                   # Icon selection tool
18. BulletPointSelector.tsx            # Bullet point styles
```

**Email Components (23 files in `components/` subfolder):**
```
components/
├── AssetPickerModal.tsx               # Asset picking modal
├── Button.tsx                         # Button component (simple)
├── ButtonComponent.tsx                # Button component (advanced)
├── Contact.tsx                        # Contact component (simple)
├── ContactComponent.tsx               # Contact component (advanced)
├── DividerComponent.tsx               # Divider/line component
├── Footer.tsx                         # Footer component (simple)
├── FooterComponent.tsx                # Footer component (advanced)
├── Header.tsx                         # Header component (simple)
├── HeaderComponent.tsx                # Header component (advanced)
├── iconData.ts                        # Icon data definitions
├── IconSelector.tsx                   # Icon selector UI
├── iconUtils.ts                       # Icon utilities
├── ImageComponent.tsx                 # Image component
├── ImageCropModal.tsx                 # Image cropping tool
├── index.ts                           # Component exports
├── MapsComponent.tsx                  # Google Maps component
├── RemoveButton.tsx                   # Component remove button
├── Social.tsx                         # Social links (simple)
├── SocialLinksComponent.tsx           # Social links (advanced)
├── SpacerComponent.tsx                # Spacer component
├── Text.tsx                           # Text component (simple)
└── TextComponent.tsx                  # Text component (advanced)
```

**Supporting Files:**
```
constants.ts                           # Email builder constants
types.ts                              # TypeScript interfaces
mjml-generators.ts                    # MJML generation logic
index.ts                              # Main exports

hooks/
├── useDragAndDrop.ts                 # Drag & drop hook
└── useEmailBuilder.ts                # Main builder hook

utils/
├── emailTracking.ts                  # Email tracking utilities
└── responsiveFonts.ts                # Responsive font system

styles/
└── (all style files if present)
```

**Total: ~45 files** | **Estimated LOC:** 8,000+ lines

---

#### **2️⃣ Email Framework** (Priority: 🔥 HIGH)

**Source Location:** `/Users/craig/Documents/1.PinsV5/web/src/services/`  
**Target Location:** `frontend/app/services/email/`

**Core Services (8 files):**
```
1. emailService.ts                     # Main email service
2. emailFrameworkTemplates.ts          # Email templates
3. emailHtmlGenerator.ts               # HTML generation
4. componentGeneration.ts              # Component generator
5. companyEmailTemplateService.ts      # Company templates
6. contactCardDefaultsService.ts       # Contact card defaults
7. emailAssetManager.ts                # Asset management
8. sesService.ts                       # AWS SES integration
```

**Type Definitions:**
```
types/emailTypes.ts                    # Email type definitions
```

**Total: 9 files** | **Estimated LOC:** 3,000+ lines

---

#### **3️⃣ Company Profile** (Priority: 🟡 MEDIUM)

**Source Location:** `/Users/craig/Documents/1.PinsV5/web/src/components/content/`  
**Target Location:** `frontend/app/components/marketing/company-profile/`

**Main Components (2 files):**
```
1. CompanyProfile.tsx                  # Main company profile UI
2. services/companyProfile.ts          # Company profile service
```

**Type Definitions:**
```
types/company.ts                       # Company type definitions
```

**Total: 3 files** | **Estimated LOC:** 1,500+ lines

---

#### **4️⃣ Asset Management System** (Priority: 🔥 HIGH)

**Source Location:** `/Users/craig/Documents/1.PinsV5/web/src/services/`  
**Target Location:** `frontend/app/services/assets/`

**Asset Services (4 files):**
```
1. assetService.ts                     # Main asset service
2. assetCacheService.ts                # Asset caching
3. firebaseAssetService.ts             # Firebase storage (adapt to S3)
4. imageOptimizationService.ts         # Image optimization
```

**Total: 4 files** | **Estimated LOC:** 1,200+ lines

---

### **📊 Migration Summary**

| Feature | Files | Lines of Code | Priority | Complexity |
|---------|-------|---------------|----------|------------|
| **Email Builder** | 45 | ~8,000 | 🔥 Critical | Very High |
| **Email Framework** | 9 | ~3,000 | 🔥 High | High |
| **Company Profile** | 3 | ~1,500 | 🟡 Medium | Medium |
| **Asset Management** | 4 | ~1,200 | 🔥 High | Medium |
| **TOTAL** | **61** | **~13,700** | **Very High Value** | **High** |

---

### **🗂️ Nexus Directory Structure** (After Migration)

```
frontend/app/
├── components/
│   └── marketing/
│       ├── email-builder/                    # 📧 Email Builder (45 files)
│       │   ├── EmailBuilderV2Modular.tsx
│       │   ├── VisualFrameworkBuilderV2.tsx
│       │   ├── CompanyProfileEmailBuilder.tsx
│       │   ├── CanvasArea.tsx
│       │   ├── ComponentPalette.tsx
│       │   ├── PropertyPanel.tsx
│       │   ├── components/                   # Email components (23 files)
│       │   ├── hooks/                        # Custom hooks (2 files)
│       │   ├── utils/                        # Utilities (2 files)
│       │   ├── types.ts
│       │   └── constants.ts
│       │
│       └── company-profile/                  # 🏢 Company Profile (2 files)
│           └── CompanyProfile.tsx
│
├── services/
│   ├── email/                               # 📬 Email Framework (9 files)
│   │   ├── emailService.ts
│   │   ├── emailFrameworkTemplates.ts
│   │   ├── emailHtmlGenerator.ts
│   │   ├── componentGeneration.ts
│   │   ├── companyEmailTemplateService.ts
│   │   └── sesService.ts                    # (Adapt to Gmail API)
│   │
│   └── assets/                              # 🖼️ Asset Management (4 files)
│       ├── assetService.ts
│       ├── assetCacheService.ts
│       ├── s3AssetService.ts                # (Adapted from firebaseAssetService)
│       └── imageOptimizationService.ts
│
└── types/
    ├── emailTypes.ts                        # Email type definitions
    └── company.ts                           # Company type definitions
```

---

### **🔄 Adaptation Requirements**

When copying these files, the following adaptations are needed:

1. **Firebase → S3 Migration**
   - Replace `firebaseAssetService.ts` with S3-based implementation
   - Update asset URLs to use S3 presigned URLs
   - Adapt `assetService.ts` to use Nexus S3 integration

2. **SES → Gmail API**
   - Replace `sesService.ts` with Gmail API integration
   - Update email sending logic
   - Maintain compatibility with Listmonk

3. **Mantine v8 → Mantine v7**
   - Check for any Mantine v8-specific features
   - Adjust imports if needed (mostly compatible)
   - Test all UI components

4. **Firebase Firestore → Django API**
   - Replace Firestore queries with Django REST API calls
   - Update service calls to use `/api/marketing/` endpoints
   - Implement Django models for email templates, campaigns, etc.

5. **Authentication**
   - Replace Firebase Auth with Django Allauth
   - Update auth checks in services
   - Use Nexus session management

---

### **⚠️ Critical Files - DO NOT MODIFY**

These files represent **years of development work** and should be **copied as-is**, then adapted:

**Email Builder Core:**
- `EmailBuilderV2Modular.tsx` - Main builder (400+ lines)
- `VisualFrameworkBuilderV2.tsx` - Framework builder (350+ lines)
- `mjml-generators.ts` - MJML generation (500+ lines)

**Component System:**
- All 23 email component files (150-300 lines each)
- `useDragAndDrop.ts` - Drag & drop logic (200+ lines)
- `useEmailBuilder.ts` - Builder state management (300+ lines)

**Email Framework:**
- `emailFrameworkTemplates.ts` - Template system (400+ lines)
- `emailHtmlGenerator.ts` - HTML generation (350+ lines)

---

### **1. Email Campaign System** 🔥 **HIGH PRIORITY**

#### **Current Nexus Marketing Features:**
- **Drag & Drop Builder:** 18+ email components (header, body, CTA, social links)
- **Campaign Management:** Create, schedule, track campaigns
- **Subscriber Management:** Import providers as subscribers
- **Analytics:** Open rates, click rates, bounce tracking
- **Templates:** Reusable email templates with variables
- **Listmonk Integration:** Professional email marketing platform

#### **Migration to Nexus:**

##### **Option A: Integrate Listmonk** (Recommended)
**Pros:**
- ✅ Professional email marketing platform
- ✅ Built-in analytics and tracking
- ✅ Proven technology (used in Nexus Marketing for 2+ years)
- ✅ Docker deployment (easy to set up)
- ✅ PostgreSQL-based (matches Nexus)

**Cons:**
- ⚠️ Requires Docker deployment
- ⚠️ Additional database (Listmonk PostgreSQL)
- ⚠️ API integration needed

**Implementation:**
```python
# backend/email_campaigns/
├── models.py              # Campaign, Template, Subscriber
├── listmonk_client.py     # Listmonk API integration
├── views.py               # Campaign CRUD endpoints
├── services.py            # Campaign logic
└── migrations/
```

```typescript
// frontend/app/components/email-campaigns/
├── CampaignDashboard.tsx  # Main campaigns page
├── EmailBuilder.tsx       # Drag-and-drop builder
├── CampaignAnalytics.tsx  # Reports and metrics
└── TemplateLibrary.tsx    # Reusable templates
```

##### **Option B: Build Custom Solution**
**Pros:**
- ✅ Full control over features
- ✅ Integrated with Nexus database
- ✅ No additional dependencies

**Cons:**
- ❌ Significant development time (4-6 weeks)
- ❌ Need to build analytics from scratch
- ❌ Email deliverability challenges
- ❌ No proven track record

**Recommendation:** **Option A (Listmonk Integration)**

---

### **2. Drag & Drop Email Builder** 🔥 **HIGH PRIORITY**

#### **Source System Implementation:**
```typescript
// 18 Email Components:
- BasicHeader
- ImageHeader  
- TextBlock
- ImageBlock
- CallToAction (Primary, Secondary)
- SocialLinks
- DividerLine
- Spacer (S, M, L, XL)
- ContactCard
- ThreeColumnCTA
- TwoColumnText
- FourItemGrid
- VideoEmbed
- FullWidthImage
```

#### **Component Architecture:**
```typescript
interface EmailComponent {
  id: string;
  type: string;
  config: ComponentConfig;
  content: ComponentContent;
}

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  components: EmailComponent[];
  metadata: {
    category: string;
    tags: string[];
    thumbnail: string;
  };
}
```

#### **Migration Strategy:**
1. **Phase 1:** Port basic components (Header, TextBlock, CTA) - 1 week
2. **Phase 2:** Port advanced components (Grid, Video, Social) - 1 week
3. **Phase 3:** Build template library - 3 days
4. **Phase 4:** Integrate with Listmonk API - 3 days

**Total Effort:** ~3 weeks

---

### **3. Contact Tracking & Follow-up System** 🔥 **HIGH PRIORITY**

#### **Source System Features:**
```typescript
// Unified Callback System
interface ContactRecord {
  id: string;
  providerId: string;
  type: 'call' | 'visit' | 'material_delivery';
  outcome: 'answered' | 'voicemail' | 'no_answer' | 'completed';
  notes: string;
  followUpDate?: Date;
  timestamp: Date;
  userId: string;
}

interface FollowUp {
  id: string;
  providerId: string;
  dueDate: Date;
  priority: 'high' | 'medium' | 'low';
  type: 'call' | 'visit' | 'email';
  notes: string;
  status: 'pending' | 'completed' | 'cancelled';
}
```

#### **Nexus Adaptation:**
```python
# backend/communications/models.py

class CommunicationRecord(models.Model):
    """Track all patient communications"""
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    type = models.CharField(max_length=50, choices=[
        ('call', 'Phone Call'),
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('visit', 'In-Person Visit'),
        ('letter', 'Letter'),
    ])
    direction = models.CharField(max_length=10, choices=[
        ('inbound', 'Inbound'),
        ('outbound', 'Outbound'),
    ])
    outcome = models.CharField(max_length=50, null=True, blank=True)
    notes = models.TextField()
    follow_up_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

class FollowUpTask(models.Model):
    """Follow-up queue"""
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    due_date = models.DateField()
    priority = models.CharField(max_length=10, choices=[
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ])
    task_type = models.CharField(max_length=50)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    completed_at = models.DateTimeField(null=True, blank=True)
```

#### **Frontend Components:**
```typescript
// frontend/app/components/communications/
├── CommunicationHistory.tsx      # Timeline view of all communications
├── QuickCallLog.tsx              # Quick logging modal
├── FollowUpQueue.tsx             # Dashboard widget
├── FollowUpCalendar.tsx          # Calendar view
└── DailyCommunicationDashboard.tsx  # Summary view
```

**Effort:** ~2 weeks

---

### **4. Campaign Analytics** 🟡 **MEDIUM PRIORITY**

#### **Source System Metrics:**
```typescript
interface CampaignAnalytics {
  campaignId: string;
  totalSent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  
  openRate: number;      // percentage
  clickRate: number;     // percentage
  bounceRate: number;    // percentage
  
  topLinks: {
    url: string;
    clicks: number;
  }[];
  
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  
  timelineData: {
    date: string;
    opens: number;
    clicks: number;
  }[];
}
```

#### **Migration Strategy:**
- **Listmonk provides this out-of-the-box** via API
- Create Django models to cache analytics locally
- Build React dashboard with Recharts (already used in Nexus)
- Real-time webhook integration for immediate updates

**Effort:** ~1 week

---

### **5. Asset Library** 🟢 **LOW PRIORITY**

#### **Current State:**
- **Source System:** Firebase Storage for email assets (images, PDFs)
- **Nexus:** AWS S3 for documents and images

#### **Migration:**
- ✅ **No migration needed** - Nexus already has S3 integration
- ✅ Create `email_assets` folder in S3 bucket
- ✅ Build file upload UI in email builder
- ✅ Integrate with existing `S3Service`

**Effort:** ~2 days

---

## 🗄️ **Database Schema Design**

### **New Nexus Tables:**

```sql
-- Email Campaigns
CREATE TABLE email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES email_templates(id),
    status VARCHAR(20) NOT NULL,  -- draft, scheduled, sent, completed
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    recipient_count INTEGER DEFAULT 0,
    listmonk_campaign_id INTEGER,  -- External ID
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth_user(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Email Templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    components JSONB NOT NULL,  -- Email builder components
    thumbnail VARCHAR(500),
    category VARCHAR(50),
    tags TEXT[],
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth_user(id)
);

-- Email Subscribers (Patients)
CREATE TABLE email_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients_patient(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL,  -- subscribed, unsubscribed, bounced
    listmonk_subscriber_id INTEGER,  -- External ID
    subscribed_at TIMESTAMP DEFAULT NOW(),
    unsubscribed_at TIMESTAMP,
    unsubscribe_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Campaign Analytics (Cached)
CREATE TABLE campaign_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    total_sent INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    bounced INTEGER DEFAULT 0,
    opened INTEGER DEFAULT 0,
    clicked INTEGER DEFAULT 0,
    unsubscribed INTEGER DEFAULT 0,
    analytics_data JSONB,  -- Full analytics object
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Communication Records
CREATE TABLE communication_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients_patient(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    outcome VARCHAR(50),
    notes TEXT,
    follow_up_date DATE,
    campaign_id UUID REFERENCES email_campaigns(id),  -- If from campaign
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth_user(id)
);

-- Follow-up Tasks
CREATE TABLE followup_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients_patient(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    priority VARCHAR(10) DEFAULT 'medium',
    task_type VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    assigned_to UUID REFERENCES auth_user(id),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth_user(id)
);

-- Indexes for performance
CREATE INDEX idx_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON email_campaigns(scheduled_at);
CREATE INDEX idx_subscribers_email ON email_subscribers(email);
CREATE INDEX idx_subscribers_status ON email_subscribers(status);
CREATE INDEX idx_comms_patient ON communication_records(patient_id);
CREATE INDEX idx_comms_date ON communication_records(created_at DESC);
CREATE INDEX idx_followups_due ON followup_tasks(due_date);
CREATE INDEX idx_followups_status ON followup_tasks(status);
CREATE INDEX idx_followups_assigned ON followup_tasks(assigned_to);
```

---

## 🔄 **Migration Phases**

### **Phase 0: UI Foundation (Week 0) ✅ COMPLETE**

#### **Frontend Setup:**
1. ✅ Create Marketing section in navigation with submenu
2. ✅ Build Marketing Dashboard page (`/marketing`)
3. ✅ Build Campaigns page (`/marketing/campaigns`)
4. ✅ Create placeholder pages (Contacts, Templates, Analytics)
5. ✅ Integrate with main Navigation component

**Deliverables:**
- ✅ Marketing section accessible from top navigation
- ✅ 5 pages created with basic wireframe structure
- ✅ Proper routing and navigation flow
- ✅ Documentation updated (INDEX.md, PAGES_INDEX.md, README.md)

**Status:** ✅ **COMPLETE** (November 11, 2025)

---

### **Phase 1: Foundation (Week 1-2) ⏳ NEXT**

#### **Backend Setup:**
1. ⏳ Install Listmonk via Docker Compose
2. ⏳ Configure PostgreSQL connection for Listmonk
3. ⏳ Create Django models for campaigns, templates, subscribers
4. ⏳ Build Listmonk API client in Django
5. ⏳ Create REST API endpoints for campaign management

#### **Frontend Setup:**
1. ✅ Port Mantine components from source system
2. ✅ Set up routing for `/marketing/campaigns` page
3. ⏳ Build campaign list view with real data
4. ⏳ Create campaign creation modal with form

**Deliverables:**
- ⏳ Listmonk running in Docker
- ⏳ Basic campaign CRUD operations
- ⏳ Campaign list view with data from backend

**Effort:** ~2 weeks

---

### **Phase 2: Email Builder (Week 3-5) ⏳ PENDING**

#### **Backend:**
1. ⏳ Template storage in PostgreSQL (JSONB)
2. ⏳ Template library API endpoints
3. ⏳ S3 integration for email assets
4. ⏳ Image upload/management API

#### **Frontend:**
1. ⏳ Port email builder from source system
2. ⏳ Drag-and-drop functionality
3. ⏳ 18 email components
4. ⏳ Preview mode
5. ⏳ Template library UI

**Deliverables:**
- ⏳ Full drag-and-drop email builder
- ⏳ Template library with 10+ starter templates
- ⏳ Asset management integration

**Effort:** ~3 weeks

---

### **Phase 3: Contact Management (Week 6-7) ⏳ PENDING**

#### **Backend:**
1. ⏳ Communication records models and API
2. ⏳ Follow-up tasks models and API
3. ⏳ Integration with existing patient records
4. ⏳ Calendar feed for follow-ups

#### **Frontend:**
1. ⏳ Communication history timeline
2. ⏳ Quick call/email logging modal
3. ⏳ Follow-up queue dashboard
4. ⏳ Calendar view for follow-ups
5. ⏳ Integration with patient detail page

**Deliverables:**
- ⏳ Complete communication tracking system
- ⏳ Follow-up queue dashboard
- ⏳ Calendar integration

**Effort:** ~2 weeks

---

### **Phase 4: Analytics & Reporting (Week 8) ⏳ PENDING**

#### **Backend:**
1. ⏳ Webhook receiver for Listmonk events
2. ⏳ Analytics cache in PostgreSQL
3. ⏳ Report generation API
4. ⏳ Export to CSV/PDF

#### **Frontend:**
1. ⏳ Campaign analytics dashboard
2. ⏳ Charts with Recharts
3. ⏳ Real-time updates
4. ⏳ Export functionality

**Deliverables:**
- ⏳ Complete analytics dashboard
- ⏳ Real-time campaign tracking
- ⏳ Exportable reports

**Effort:** ~1 week

---

## 🚀 **Deployment Strategy**

### **Listmonk Docker Deployment:**

```yaml
# docker-compose.listmonk.yml
version: '3.8'

services:
  listmonk-db:
    image: postgres:15
    container_name: listmonk_postgres
    environment:
      POSTGRES_DB: listmonk
      POSTGRES_USER: listmonk
      POSTGRES_PASSWORD: ${LISTMONK_DB_PASSWORD}
    volumes:
      - listmonk_data:/var/lib/postgresql/data
    restart: unless-stopped

  listmonk:
    image: listmonk/listmonk:latest
    container_name: listmonk
    depends_on:
      - listmonk-db
    environment:
      LISTMONK_DB_HOST: listmonk-db
      LISTMONK_DB_PORT: 5432
      LISTMONK_DB_USER: listmonk
      LISTMONK_DB_PASSWORD: ${LISTMONK_DB_PASSWORD}
      LISTMONK_DB_DATABASE: listmonk
      LISTMONK_ADMIN_USER: ${LISTMONK_ADMIN_USER}
      LISTMONK_ADMIN_PASSWORD: ${LISTMONK_ADMIN_PASSWORD}
    ports:
      - "9000:9000"
    volumes:
      - listmonk_uploads:/listmonk/uploads
      - ./listmonk-config.toml:/listmonk/config.toml
    restart: unless-stopped

volumes:
  listmonk_data:
  listmonk_uploads:
```

### **Environment Variables:**

```bash
# .env additions for Nexus
LISTMONK_URL=http://localhost:9000
LISTMONK_API_USER=your_api_user
LISTMONK_API_PASSWORD=your_api_password
LISTMONK_DB_PASSWORD=your_db_password
LISTMONK_ADMIN_USER=admin@walkeasy.com.au
LISTMONK_ADMIN_PASSWORD=your_admin_password
```

---

## 💰 **Cost Analysis**

### **Infrastructure Costs:**

| Service | Legacy System (Monthly) | Nexus (Current) | Nexus (After Migration) | Difference |
|---------|------------------|-----------------|-------------------------|------------|
| **Firebase** | $50 | $0 | $0 | -$50 |
| **Google Cloud** | $20 | $0 | $0 | -$20 |
| **AWS S3** | $5 | $5 | $10 | +$5 |
| **Gmail API** | $0 | $0 | $0 | $0 |
| **Listmonk Server** | $0 (self-hosted) | $0 | $20 (VPS) | +$20 |
| **SMS Broadcast** | $0 | $50 | $50 | $0 |
| **Total** | **$75** | **$55** | **$80** | **+$25** |

**Note:** Listmonk can run on the same server as Nexus (Docker), so VPS cost may not increase.

---

## ⚠️ **Risks & Mitigation**

### **Technical Risks:**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Listmonk Integration Issues** | High | Medium | Thorough testing, fallback to Gmail API |
| **Data Migration Complexity** | Medium | Low | Not migrating legacy data, fresh start |
| **Performance with Large Lists** | Medium | Low | Proper indexing, pagination, caching |
| **Email Deliverability** | High | Medium | Use Gmail API initially, monitor bounce rates |
| **UI/UX Consistency** | Low | Low | Both use Mantine, easy port |

### **Business Risks:**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **User Adoption** | Medium | Low | Training, documentation, gradual rollout |
| **Feature Parity** | Low | Low | Only migrating essential features |
| **Timeline Overrun** | Medium | Medium | Phased approach, clear milestones |

---

## 📝 **Decision Matrix**

### **Should We Migrate?**

**YES, if:**
- ✅ Nexus needs mass patient communication
- ✅ Email campaigns would improve patient engagement
- ✅ Team can dedicate 8-10 weeks to implementation
- ✅ Budget allows for Listmonk hosting (~$20/month)
- ✅ Want to consolidate tools (less systems to manage)

**NO, if:**
- ❌ Happy with current Gmail one-off emails
- ❌ Don't need bulk email campaigns
- ❌ No time for 8-10 week project
- ❌ Want to keep legacy marketing system separate

---

## 🎯 **Recommended Approach**

### **Option 1: Full Migration** (Recommended)
**Timeline:** 8-10 weeks  
**Effort:** High  
**Value:** High  

**Migrate:**
- ✅ Email campaign system (Listmonk)
- ✅ Drag-and-drop builder
- ✅ Contact tracking
- ✅ Follow-up queue
- ✅ Analytics dashboard

**Benefits:**
- All-in-one clinic management + marketing
- Single system for staff to learn
- Unified patient communication history
- Better reporting across all touchpoints

---

### **Option 2: Minimal Integration** (Quick Win)
**Timeline:** 2-3 weeks  
**Effort:** Low  
**Value:** Medium  

**Migrate:**
- ✅ Basic email campaign list (no builder)
- ✅ Use Gmail API for sending
- ✅ Simple analytics

**Benefits:**
- Quick implementation
- Minimal risk
- Test market fit before full commitment

---

### **Option 3: Keep Separate** (Status Quo)
**Timeline:** 0 weeks  
**Effort:** None  
**Value:** Low  

**Keep legacy marketing system running separately.**

**Benefits:**
- No development time
- No risk
- Proven system continues working

**Drawbacks:**
- Two systems to maintain
- Duplicate contacts
- No unified communication history

---

## 📋 **Implementation Checklist**

### **Pre-Migration:**
- [x] Review this document with team
- [x] Decide on migration option (Full, Minimal, or Skip) - **Decision: Full Migration**
- [ ] Allocate development time (8-10 weeks for full)
- [ ] Set up Listmonk testing environment
- [ ] Create backup of legacy marketing database

### **Phase 0: UI Foundation (Week 0) ✅ COMPLETE**
- [x] Create Marketing section in navigation
- [x] Build Marketing Dashboard page
- [x] Build Campaigns page
- [x] Create placeholder pages (Contacts, Templates, Analytics)
- [x] Integrate with main Navigation component
- [x] Update all documentation (INDEX.md, PAGES_INDEX.md, README.md)

### **Phase 1: Foundation (Week 1-2) ⏳ NEXT**
- [ ] Set up Listmonk Docker container
- [ ] Create Django models for campaigns
- [ ] Build Listmonk API client
- [ ] Create REST API endpoints
- [ ] Build campaign list UI with real data
- [ ] Test campaign creation flow

### **Phase 2: Email Builder (Week 3-5)**
- [ ] Port email components from source system
- [ ] Build drag-and-drop interface
- [ ] Create template library
- [ ] Integrate S3 for assets
- [ ] Build preview mode
- [ ] Test email rendering across clients

### **Phase 3: Contact Management (Week 6-7)**
- [ ] Create communication records models
- [ ] Build follow-up task system
- [ ] Integrate with patient records
- [ ] Build communication timeline UI
- [ ] Create follow-up queue dashboard
- [ ] Add calendar integration

### **Phase 4: Analytics (Week 8)**
- [ ] Set up Listmonk webhooks
- [ ] Cache analytics in PostgreSQL
- [ ] Build analytics dashboard
- [ ] Create charts with Recharts
- [ ] Add export functionality
- [ ] Test real-time updates

### **Phase 5: Testing & Launch (Week 9-10)**
- [ ] Comprehensive testing
- [ ] User acceptance testing
- [ ] Documentation
- [ ] Staff training
- [ ] Soft launch with small group
- [ ] Monitor and iterate

---

## 🔗 **Related Documentation**

### **Nexus Marketing Documentation:**
- `docs/features/FILE_MIGRATION_CHECKLIST.md` - Step-by-step file migration checklist ⭐ NEW
- `docs/features/DOCUMENTATION_STRATEGY.md` - How to handle PinsV5 documentation ⭐ NEW
- `docs/features/NEXUS_MARKETING_NAME_CHANGE.md` - PinsV5 → Nexus Marketing naming ⭐ NEW
- `docs/features/MARKETING_SECTION_UI_SUMMARY.md` - Marketing UI implementation
- `docs/architecture/PAGES_INDEX.md` - All pages including Marketing pages
- `docs/INDEX.md` - Main documentation index

### **Source System Documentation:**
- `/Users/craig/Documents/1.PinsV5/README.md` - Legacy system README
- `/Users/craig/Documents/1.PinsV5/docs/` - Legacy system documentation folder (60+ docs)
- **Note:** Original system codebase preserved in separate directory for reference

**Key PinsV5 Docs (Keep as Reference):**
- `docs/EMAIL_SYSTEM_QUICK_REFERENCE.md` - Email system troubleshooting (⭐ Copy & adapt)
- `docs/Email_Stack_Guide.md` - Complete email stack overview (⭐ Copy & adapt)
- `docs/EMAIL_SERVICE_TROUBLESHOOTING_GUIDE.md` - Troubleshooting guide (⭐ Copy & adapt)
- `docs/AWS_SES_EMAIL_SERVICE_GUIDE.md` - AWS SES integration (🔄 Adapt to Gmail)
- `web/src/components/email-builder/README_AssetLibraryDialog.md` - Asset library system (⭐ Copy)

**Documentation Strategy:**
- ✅ Keep all PinsV5 docs as reference (never delete)
- ✅ Copy critical technical docs to `docs/marketing/`
- ✅ Write new Nexus-specific user guides
- ✅ Link to PinsV5 docs in code comments for complex systems
- See: `docs/features/DOCUMENTATION_STRATEGY.md` for complete strategy

### **Nexus Integration Docs:**
- `docs/features/MARKETING_SECTION_UI_SUMMARY.md` - Marketing UI implementation ⭐ NEW
- `docs/architecture/PAGES_INDEX.md` - All pages including Marketing pages ⭐ UPDATED
- `docs/INDEX.md` - Main documentation index ⭐ UPDATED
- `README.md` - Project overview ⭐ UPDATED
- `docs/integrations/SMS.md` - SMS Broadcast integration
- `docs/integrations/GMAIL.md` - Gmail OAuth integration
- `docs/architecture/DATABASE_SCHEMA.md` - Database schema

---

## 💡 **Key Insights**

### **What Makes Nexus Marketing Valuable:**
1. **Battle-tested Email Builder:** 6 years of refinement, works great
2. **Listmonk Integration:** Proven reliable for bulk emails
3. **Contact Tracking System:** Well-designed follow-up queue
4. **Analytics Dashboard:** Clear metrics and reporting

### **What to Leave Behind:**
1. **Web Scraping:** Not needed for clinic management
2. **Google Maps:** Not relevant for patient communication
3. **Provider Discovery:** Specific to marketing business
4. **Firebase Architecture:** Nexus uses PostgreSQL

### **Quick Wins:**
1. Port email builder components (already Mantine-based)
2. Use existing S3 integration for assets
3. Leverage existing AI integration (OpenAI)
4. Reuse analytics charts (Recharts compatible)

---

## 📞 **Next Steps**

1. ✅ **Review this document** with Craig - COMPLETE
2. ✅ **Decide on approach** (Full, Minimal, or Skip) - **Decision: Full Migration**
3. ✅ **Phase 0 Complete:** Marketing UI built and documented
4. ⏳ **Phase 1 Starting:**
   - Set up test Listmonk environment
   - Create Django models for campaigns
   - Build basic campaign CRUD API
   - Connect frontend to backend
5. 📋 **Follow the phased approach** (10 weeks total)

**Current Status:** Phase 0 (UI Foundation) complete. Ready to begin Phase 1 (Backend Foundation).

---

## 📊 **Effort Summary**

| Phase | Duration | Complexity | Value | Status |
|-------|----------|------------|-------|--------|
| **Phase 0: UI Foundation** | 1 day | Low | High | ✅ **COMPLETE** |
| **Phase 1: Foundation** | 2 weeks | Medium | High | ⏳ **NEXT** |
| **Phase 2: Email Builder** | 3 weeks | High | High | ⏳ Pending |
| **Phase 3: Contact Management** | 2 weeks | Medium | High | ⏳ Pending |
| **Phase 4: Analytics** | 1 week | Low | Medium | ⏳ Pending |
| **Phase 5: Testing & Launch** | 2 weeks | Low | High | ⏳ Pending |
| **Total** | **10 weeks** | **Medium-High** | **High** | **10% Complete** |

---

**Prepared by:** AI Assistant  
**Date:** November 11, 2025  
**Last Updated:** November 11, 2025 (Phase 0 complete)  
**Status:** Phase 0 (UI) complete ✅ | Phase 1 (Backend) ready to start ⏳

---

*This document provides a comprehensive analysis of migrating Nexus Marketing features from the legacy standalone system into the main Nexus application. The recommendation is to proceed with full migration over 10 weeks for maximum value, but a minimal 2-3 week integration is also viable for quick wins.*

