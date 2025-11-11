# 📋 Marketing Section - Navigation & UI Summary

**Last Updated:** November 11, 2025

---

## 🎯 **Overview**

The Marketing section has been added as a **top-level navigation tab** in Nexus, positioned between Calendar and Accounts. This section will house all email campaign management features, starting with referrer marketing (Phase 1) and expanding to patient campaigns later (Phase 2).

---

## 🗂️ **Navigation Structure**

### **Top Navigation Bar:**

```
[Dashboard] [Contacts] [Calendar] [Marketing] [Accounts] [Orders] [Inventory] [Testing] [Settings]
                                      ↑
                                  NEW TAB
```

### **Marketing Sub-pages:**

```
/marketing/                   # Marketing Dashboard (overview)
/marketing/campaigns          # Campaign list (referrer-focused in Phase 1)
/marketing/campaigns/new      # Campaign builder (drag & drop)
/marketing/campaigns/[id]     # View campaign details
/marketing/campaigns/[id]/analytics  # Campaign analytics
/marketing/contacts           # Marketing contacts (referrers + patients)
/marketing/contacts/segments  # Custom audience segments
/marketing/templates          # Email template library
/marketing/analytics          # Overall marketing analytics
```

---

## 📊 **Implemented Pages**

### ✅ **1. Marketing Dashboard** (`/marketing/page.tsx`)

**Status:** Fully implemented UI wireframe

**Features:**
- **Quick Action Cards:**
  - View All Campaigns
  - Manage Contacts
  - Email Templates
  - View Analytics
  
- **Stats Grid:**
  - Active Campaigns (12) +3 this month
  - Referrer Contacts (245) +18 this month
  - Emails Sent (30d) (1,234) +15% vs last month
  - Avg Open Rate (85%) +5% vs last month
  
- **Top Performing Campaigns:**
  - Campaign name
  - Open rate & click rate (with progress bars)
  - Recipient count
  - Badge showing open rate percentage
  
- **Recent Activity Timeline:**
  - Campaign sent events
  - High engagement notifications
  - Draft creation
  - New contact additions
  
- **Phase 1 Info Banner:**
  - Clearly states "Phase 1: Referrer Marketing"
  - Explains patient campaigns coming in Phase 2

---

### ✅ **2. Referrer Campaigns List** (`/campaigns/page.tsx`)

**Status:** Fully implemented UI wireframe (referrer-focused)

**Component Name:** `MarketingCampaignsPage`

**Features:**
- **Stats Grid:**
  - Active Campaigns
  - Total Sent
  - Avg Open Rate
  - **Referrer Contacts** (changed from "Total Subscribers")
  
- **Filters:**
  - Search campaigns by name
  - Filter by status (All, Draft, Scheduled, Active, Sent)
  
- **Campaign Cards:**
  - Campaign name with icon
  - Status badge (SENT, ACTIVE, DRAFT)
  - Email subject line
  - **Recipient Type Badge** (e.g., "Podiatrists - Newcastle area", "All active referrers")
  - Performance metrics:
    - Sent to X referrers
    - Open rate (with progress bar)
    - Click rate (with progress bar)
    - Sent date
  - Action menu (⋮):
    - View Analytics
    - Edit Campaign
    - Duplicate
    - Send Test Email (drafts only)
    - Delete
  
- **Empty State:**
  - "No referrer campaigns yet"
  - "Create your first email campaign to start engaging with healthcare providers"
  - [Create Campaign] button
  
- **Phase 1 Info Banner:**
  - "Phase 1: Referrer Marketing"
  - "Currently focused on healthcare provider campaigns. Patient campaigns coming in Phase 2."

---

### ⏳ **3. Campaign Builder** (`/campaigns/new/page.tsx`)

**Status:** Basic UI wireframe created, drag-and-drop functionality pending

**Next Steps:**
- Implement drag-and-drop email builder
- Add component palette (18+ email components)
- Build live preview panel
- Add properties panel for component customization

---

### ⏳ **4. Patient Communications Tab** (Component)

**Status:** Basic wireframe created (deprecated - now using Marketing section)

**Note:** This component was initially created for patient detail pages but has been superseded by the Marketing section. It may be revisited in Phase 2 when patient campaigns are added.

---

## 🎨 **Design Patterns**

### **Icon Usage:**
- **Marketing Tab:** `IconSpeakerphone` (megaphone icon)
- **Campaigns:** `IconMail`
- **Contacts:** `IconUsers`
- **Templates:** `IconTemplate`
- **Analytics:** `IconChartBar`

### **Color Coding:**
- **Active Campaigns:** Blue badges
- **Sent Campaigns:** Green badges
- **Scheduled Campaigns:** Orange badges
- **Draft Campaigns:** Gray badges
- **Open Rate Progress:** Teal
- **Click Rate Progress:** Blue

### **Recipient Type Badges:**
Used to show the target audience for each campaign:
- "Podiatrists - Newcastle area" (Grape color)
- "All active referrers" (Grape color)
- "Recent clinic visits" (Grape color)

---

## 📐 **Phase Strategy**

### **Phase 1: Referrer Marketing** (CURRENT) ✅

**Scope:**
- Email campaigns to healthcare providers (referrers)
- Uses existing referrer data from Nexus
- Feature parity with PinsV5 referrer marketing
- Marketing dashboard focused on referrer engagement

**Target Audience:**
- Podiatrists
- Physiotherapists
- General Practitioners
- Specialists
- Other healthcare providers

**Use Cases:**
- Product launch announcements
- Quarterly newsletters
- Clinic visit follow-ups
- Referral relationship building
- Educational content for providers

**Why Start Here:**
- Matches PinsV5's existing purpose (provider marketing)
- Simpler audience (fewer contacts than patients)
- Clear ROI (referral relationships drive revenue)
- Easier compliance (B2B, not B2C)

---

### **Phase 2: Patient Marketing** (FUTURE)

**Scope:**
- Email campaigns to patients
- Appointment reminders
- Health tips newsletters
- Post-appointment follow-ups
- Educational content for patients

**Target Audience:**
- Active patients
- Past patients (re-engagement)
- Patient segments (by condition, clinic, etc.)

**Use Cases:**
- Appointment reminders
- Health tips and education
- New service announcements
- Seasonal health campaigns
- Patient satisfaction surveys

**Requirements:**
- Privacy compliance (Australian Privacy Principles)
- Consent management (opt-in/opt-out)
- HIPAA considerations (if expanding internationally)
- More complex segmentation
- Integration with patient records

**Why Later:**
- More complex compliance requirements
- Larger audience (2,845+ patients)
- Requires more sophisticated consent management
- Benefits from refining UI/UX with referrers first

---

## 🔗 **Integration Points**

### **Existing Nexus Data:**
- **Referrer Model** (`backend/referrers/models.py`)
  - Email addresses for campaigns
  - Specialty for segmentation
  - Company relationships
  - Historical interactions
  
- **Patient Model** (`backend/patients/models.py`)
  - Future use in Phase 2
  - Email addresses
  - Communication preferences
  
- **Communication Records:**
  - Track all marketing interactions
  - Link campaigns to referrer/patient records
  
- **Analytics:**
  - Open rates
  - Click-through rates
  - Conversion tracking

---

## 🛠️ **Technical Implementation**

### **Frontend Stack:**
- **Framework:** Next.js 14 (App Router)
- **UI Library:** Mantine UI v7
- **Icons:** Tabler Icons
- **State Management:** React hooks (useState, useEffect)
- **Navigation:** next/navigation (useRouter, usePathname)

### **Backend Requirements (Pending):**
- **New Django App:** `backend/marketing/`
- **Models Needed:**
  - Campaign
  - EmailTemplate
  - CampaignContact (link to referrers/patients)
  - CampaignAnalytics
  - CommunicationRecord
  - FollowupTask

### **External Integrations:**
- **Listmonk:** Self-hosted email marketing platform
  - Campaign management
  - Email delivery
  - Analytics tracking
  - Subscriber management
  
- **SMTP/Email Gateway:**
  - Existing Gmail integration can be used
  - Listmonk handles email delivery

---

## 📋 **Mock Data (Current Wireframes)**

### **Campaigns:**
1. **New Insoles Product Launch**
   - Status: Sent
   - Recipients: 245 (Podiatrists - Newcastle area)
   - Open Rate: 85%
   - Click Rate: 23%
   - Sent: Nov 1, 2025

2. **Quarterly Referrer Newsletter**
   - Status: Active (automated)
   - Recipients: 412 (All active referrers)
   - Open Rate: 92%
   - Click Rate: 15%

3. **Clinic Visit Follow-ups**
   - Status: Draft
   - Recipients: 23 (Recent clinic visits)
   - Not scheduled yet

### **Stats:**
- **Active Campaigns:** 12 (+3 this month)
- **Referrer Contacts:** 245 (+18 this month)
- **Emails Sent (30d):** 1,234 (+15% vs last month)
- **Avg Open Rate:** 85% (+5% vs last month)

---

## ✅ **Completed Work**

1. ✅ Added Marketing tab to top navigation
2. ✅ Created Marketing Dashboard (`/marketing`)
3. ✅ Updated Campaigns page to referrer-focused (`/marketing/campaigns`)
4. ✅ Added Phase 1/Phase 2 info banners
5. ✅ Created referrer-specific mock data
6. ✅ Added recipient type badges
7. ✅ Updated stats labels (Referrer Contacts vs Subscribers)
8. ✅ Implemented pathname matching for active state
9. ✅ Committed changes to Git

---

## 🚧 **Next Steps**

### **Immediate (Backend Foundation):**
1. Create `backend/marketing/` Django app
2. Define Campaign, EmailTemplate, CampaignContact models
3. Set up Listmonk Docker container
4. Build Listmonk API client in Django
5. Create REST API endpoints for campaigns

### **Short-term (Campaign Builder):**
1. Implement drag-and-drop email builder
2. Create component palette (buttons, images, text, etc.)
3. Build live preview panel
4. Add template saving/loading
5. Integrate with backend APIs

### **Medium-term (Analytics & Contacts):**
1. Create `/marketing/contacts` page
2. Build contact segmentation UI
3. Implement analytics dashboard
4. Add campaign scheduling
5. Build email template library

### **Long-term (Phase 2):**
1. Add patient email campaigns
2. Implement consent management
3. Build automated appointment reminders
4. Create patient segments
5. Integrate with patient records

---

## 📝 **Design Decisions**

### **Why Top-Level Nav Tab?**
- **Visibility:** Marketing is a core business function, deserves top-level visibility
- **Scalability:** Room for multiple sub-pages (campaigns, contacts, templates, analytics)
- **User Flow:** Direct access from anywhere in the app
- **Future-proof:** Can expand to include SMS, social media, etc.

### **Why Referrers First?**
- **Known Audience:** Existing referrer data in Nexus
- **B2B Simplicity:** Fewer compliance requirements than patient marketing
- **PinsV5 Parity:** Matches what PinsV5 already does
- **Clear ROI:** Referrer relationships directly impact revenue

### **Why Mantine UI?**
- **Consistency:** Matches existing Nexus design system
- **Components:** Rich component library (Cards, Badges, Progress, Timeline)
- **Dark Mode:** Built-in dark mode support
- **Performance:** Good performance with large lists

### **Why Phase-based Banners?**
- **Transparency:** Users know what to expect
- **Expectation Setting:** Clear roadmap for future features
- **Feedback Collection:** Easier to gather Phase 1 feedback before Phase 2
- **Scope Control:** Prevents feature creep

---

## 🔍 **User Experience Notes**

### **Campaign List:**
- **Search:** Real-time search by campaign name or subject
- **Filters:** Multi-select status filter (All, Draft, Scheduled, Active, Sent)
- **Sorting:** Default sort by most recent first
- **Empty State:** Clear call-to-action when no campaigns exist
- **Action Menu:** Consistent ⋮ menu for all campaign actions

### **Dashboard:**
- **Quick Actions:** Large, clickable cards for common tasks
- **Stats:** Visual hierarchy with large numbers and small context
- **Performance:** Progress bars for easy visual scanning
- **Activity:** Reverse chronological timeline of recent events
- **Navigation:** All links functional, easy to explore

### **Mobile Responsiveness:**
- **Grid Layouts:** Responsive grid columns (base: 12, sm: 6, md: 3)
- **Card Stacking:** Cards stack vertically on mobile
- **Button Sizing:** Touch-friendly button sizes (size="md", size="lg")
- **Text Wrapping:** Proper text wrapping and truncation

---

## 📚 **Related Documentation**

- **Main Migration Plan:** `docs/features/PINSV5_TO_NEXUS_MIGRATION_PLAN.md`
- **Database Schema:** `docs/architecture/DATABASE_SCHEMA.md`
- **Navigation Component:** `frontend/app/components/Navigation.tsx`
- **Project Rules:** `.cursorrules`

---

## 🤝 **Collaboration Notes**

### **For Backend Developers:**
- Marketing section is ready for API integration
- Mock data structure matches expected API responses
- Frontend components expect standard REST API patterns

### **For Frontend Developers:**
- All pages use Mantine UI v7 components
- State management via React hooks (no Redux yet)
- TypeScript strict mode enabled
- ESLint configured for code quality

### **For Product Managers:**
- UI mockups ready for review
- Phase 1 scope clearly defined
- Phase 2 roadmap documented
- User flows designed for feedback

---

**End of Document**

