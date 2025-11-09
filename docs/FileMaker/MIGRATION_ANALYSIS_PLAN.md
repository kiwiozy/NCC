# FileMaker to Nexus Migration Analysis Plan

**Date:** November 9, 2025  
**Status:** 📋 Planning Phase  
**Objective:** Analyze FileMaker structure and plan complete migration to modern Nexus database

---

## 🎯 Goal

Transform a legacy FileMaker solution into a modern PostgreSQL/Django database structure by:
1. Understanding the complete FileMaker data model
2. Comparing it with our existing Nexus schema
3. Identifying gaps and opportunities for improvement
4. Creating a detailed migration roadmap

---

## 📊 What We Know So Far

### FileMaker Tables Available (9 total)
- ✅ `API_Contacts` (75 fields) - **2,845 patients imported**
- ✅ `API_Contact_Details` (30 fields) - **Communication data imported**
- 🔵 `API_Clinic_Name` (16 fields) - Clinic locations
- 🔵 `API_Clinics_Details` (26 fields) - Clinic sessions/appointments
- 🔵 `API_Referrer` (27 fields) - Referrers/doctors
- 🔵 `API_ContactToReferrer` (11 fields) - Patient-referrer links
- 🔵 `API_Company` (32 fields) - Organizations
- 🔵 `API_Docs` (15 fields) - Document metadata
- 🔵 `API_Images` (21 fields) - Image metadata

### Nexus Current State
- 2,845 patients imported
- Communication details working
- Existing models: Patient, Appointment, Clinician, etc.
- See: `docs/architecture/DATABASE_SCHEMA.md`

---

## 📋 Step-by-Step Migration Analysis Plan

### ✅ Step 0: Planning
**Status:** ✅ COMPLETE

**Tasks:**
- [x] Create this plan document
- [x] Review with Craig
- [x] Get approval to proceed

**Deliverable:** This document

**Completed:** November 9, 2025

---

### ✅ Step 1: Complete Metadata Collection
**Status:** ✅ COMPLETE

**Tasks:**
1. [x] Query each table for complete field list
2. [x] Get data types for each field
3. [x] Pull 5 sample records per table
4. [x] Get actual record counts
5. [x] Identify foreign key fields (id, id_*, _kf_*, etc.)
6. [x] Document nullable vs required fields
7. [x] Analyze data patterns

**Output Files:**
- ✅ `data/discovery/api_tables_metadata_FULL.json` (raw data)
- ✅ `docs/FileMaker/STEP1_METADATA_ANALYSIS.md` (human-readable)

**Key Findings:**
- **9 tables, 235 fields, 34,345 total records**
- **46 foreign key fields, 189 data fields**
- **2,845 patients, 10,688 contact details** (already imported ✅)
- **Largest tables:** API_Docs (11,269), API_Images (6,664)

**Completed:** November 9, 2025, 05:49:43

---

### ✅ Step 2: Relationship Mapping
**Status:** ✅ COMPLETE

**Tasks:**
1. [x] Map all foreign key relationships
2. [x] Identify parent-child relationships
3. [x] Identify many-to-many linking tables
4. [x] Document orphaned records (broken links)
5. [x] Create visual relationship diagram (ASCII art)
6. [x] Document data flow patterns

**Output Files:**
- ✅ `data/discovery/relationship_map.json` (raw data)
- ✅ `docs/FileMaker/STEP2_RELATIONSHIP_MAPPING.md` (complete analysis)

**Key Findings:**
- **16 foreign key relationships** identified
- **2 hub tables:** API_Contacts (6 incoming), API_Clinic_Name (3 incoming)
- **3 missing/external tables:** Xero (external), Funding (missing), Orders (missing)
- **Moderate complexity** - clean structure, some investigation needed

**Issues to Resolve:**
- ⚠️ Funding table missing (referenced by API_Clinics_Details)
- ⚠️ Orders table missing (referenced by API_Docs)
- ⚠️ API_Company.id.key relationship unclear
- ⚠️ API_Images.ID.KEY parent reference unclear

**Completed:** November 9, 2025, 05:51:16

---

### 🟢 CHECKPOINT: Review Steps 1 & 2
**Status:** ✅ COMPLETE

**We have completed:**
- ✅ Complete FileMaker metadata (all fields, all tables)
- ✅ Relationship mapping (18 relationships identified)
- ✅ All 4 clarification questions answered

**What we learned:**
1. **Database size:** 34K records, 235 fields, moderate complexity
2. **Already imported:** 39% of data (patients + contact details)
3. **Remaining:** 61% of data, includes important clinic sessions
4. **Discovered:** 10th table `API_ReferrerToCompany_Join`

**Issues Resolved:**
1. ✅ **Funding** - Create lookup table in Nexus
2. ⏸️ **Orders** - Deferred to Phase 2
3. ✅ **Companies** - Relationship clarified (via referrers, found missing join table)
4. ✅ **Images** - ID.KEY not used, ignore it
5. ⏸️ **Docs & Images Files** - Deferred to Phase 2 (17,933 files - see `DOCS_IMAGES_MIGRATION_ANALYSIS.md`)

**Updated Database Stats:**
- **10 tables** (discovered `API_ReferrerToCompany_Join`)
- **18 relationships** (2 new relationships added)
- **34,416 records total**
- **Docs/Images deferred:** 17,933 file records (will import metadata only initially)

**Completed:** November 9, 2025

**Ready to proceed with Step 3!** ✅

---

### 🔵 Step 3: Nexus Schema Review

---

### ✅ Step 3: Nexus Schema Review
**Status:** ✅ COMPLETE

**Tasks:**
1. [x] Read `DATABASE_SCHEMA.md`
2. [x] List all current Django models (14 tables)
3. [x] Document all fields in each model
4. [x] Identify existing relationships
5. [x] Document JSON field structures
6. [x] Identify what's already working well
7. [x] Compare with FileMaker structure

**Output Files:**
- ✅ `docs/FileMaker/STEP3_NEXUS_SCHEMA_REVIEW.md` (complete analysis)

**Key Findings:**
- **14 Nexus tables** (excluding django-allauth)
- **5 new models needed:** referrers, patient_referrers, companies, referrer_companies, + appointment enhancements
- **Strong foundation:** Patient data imported, S3, SMS, Letters all working
- **Critical gap:** No referrer system (234 referrers in FileMaker)
- **Complexity:** MODERATE - clear path forward

**Schema Gaps Identified:**
1. ❌ **`referrers` table** - Need to create (234 FM records)
2. ❌ **`patient_referrers` junction** - Need to create (1,720 FM records)
3. ❌ **`companies` table** - Need to create (92 FM records)
4. ❌ **`referrer_companies` junction** - Need to create (71 FM records)
5. 🔄 **`appointments` enhancement** - Add referrer, funding fields (for 822 FM sessions)

**Completed:** November 9, 2025

---

### ✅ Step 4: Gap Analysis & Mapping

**Status:** ✅ COMPLETE  
**Objective:** Create detailed field-by-field mapping and design new tables

**Tasks:**
1. [x] Analyze contact type architecture (polymorphic vs separate tables)
2. [x] Design referrers table (98 records from API_Referrer)
3. [x] Design coordinators table (extract from patients.coordinator_name)
4. [x] Design companies table (44 records from API_Company)
5. [x] Design general_contacts table (standalone directory)
6. [x] Design specialties lookup table (extract from API_Referrer.Specialty)
7. [x] Design patient_referrers join table (255 records from API_ContactToReferrer)
8. [x] Design patient_coordinators join table (historical tracking)
9. [x] Design referrer_companies join table (73 records from API_ReferrerToCompany_Join)
10. [x] Document modifications needed to patients table
11. [x] Create complete relationship diagram
12. [x] Document FileMaker → Nexus mapping

**Output Files:**
- ✅ `docs/FileMaker/STEP4_GAP_ANALYSIS.md` (complete architecture)

**Key Decisions:**
- ✅ **Architecture:** Use separate tables per contact type (not polymorphic)
- ✅ **9 new tables needed:** referrers, coordinators, companies, general_contacts, specialties, patient_referrers, patient_coordinators, referrer_companies, **contact_relationships**
- ✅ **Contact Relationships:** New `contact_relationships` table links ANY contact to ANY other contact (patient→carer, patient→referrer, etc.)
- ✅ **Relationship Types:** carer, parent, spouse, child, sibling, emergency_contact, also_patient, also_referrer, also_coordinator
- ✅ **Edge Case Solved:** Person can be patient AND referrer AND coordinator (tracked via relationships)
- ✅ **Carer Tracking:** Link patients to carers (mother, father) via contact_relationships
- ✅ **Historical tracking:** patient_coordinators tracks all coordinators over time (assignment_date, end_date, is_current)
- ✅ **NDIS notes:** Stored in patient_coordinators.ndis_notes (not on patient record)
- ✅ **Coordinator migration:** Parse patients.coordinator_name field (e.g., "Warda - Ability Connect")
- ✅ **Total tables:** 23 (14 existing + 9 new)

**Completed:** November 9, 2025

**Questions to Answer Before Starting:**
1. Should I also look at actual Django model files?
2. Any specific models you want deep-dive analysis on?
3. Are there planned changes to Nexus schema I should know about?

**Status:** ⏸️ PENDING (after Step 2)

---

### 🔵 Step 4: Gap Analysis & Mapping

**Objective:** Compare FileMaker vs Nexus and identify gaps

**Tasks:**
1. [ ] Create field-by-field mapping (FileMaker → Nexus)
2. [ ] Identify direct mappings (easy imports)
3. [ ] Identify data transformations needed
4. [ ] Identify missing Nexus models/fields
5. [ ] Identify FileMaker data we don't need
6. [ ] Identify data quality issues
7. [ ] Recommend Nexus schema enhancements
8. [ ] Identify modernization opportunities

**Analysis Categories:**
- ✅ **Direct mapping** - FileMaker field → Nexus field (1:1)
- 🔄 **Transform needed** - Data conversion required
- 🆕 **New model needed** - No Nexus equivalent exists
- 🗑️ **Skip** - Legacy data not needed
- ⚠️ **Quality issue** - Data cleanup required

**Output Files:**
- `docs/FileMaker/GAP_ANALYSIS.md` (main report)
- `docs/FileMaker/FIELD_MAPPING_COMPLETE.md` (detailed field map)

**Estimated Time:** 30-45 minutes

**Questions to Answer Before Starting:**
1. Are there FileMaker tables/fields you know are obsolete?
2. Any Nexus features you want to enhance during migration?
3. Should we preserve all FileMaker data or be selective?
4. How important is maintaining FileMaker IDs for rollback?

**Status:** ⏸️ PENDING (after Step 3)

---

### 🔵 Step 5: Data Quality Assessment

**Objective:** Identify data quality issues before migration

**Tasks:**
1. [ ] Check for duplicate records
2. [ ] Check for orphaned records (broken FKs)
3. [ ] Check for invalid dates (future dates, year 1900, etc.)
4. [ ] Check for invalid phone numbers
5. [ ] Check for invalid emails
6. [ ] Check for missing required data
7. [ ] Check for data consistency issues
8. [ ] Estimate data cleanup effort

**Output Files:**
- `docs/FileMaker/DATA_QUALITY_REPORT.md`

**Estimated Time:** 20-30 minutes

**Questions to Answer Before Starting:**
1. What's your tolerance for data quality issues?
2. Should we fix issues during import or flag for manual review?
3. Any known data quality problems in FileMaker?

**Status:** ⏸️ PENDING (after Step 4)

---

### 🔵 Step 6: Migration Strategy & Roadmap

**Objective:** Create detailed, actionable migration plan

**Tasks:**
1. [ ] Define import phases and order
2. [ ] Identify dependencies between tables
3. [ ] Create Django model changes needed
4. [ ] Create migration scripts outline
5. [ ] Define data transformation logic
6. [ ] Create validation strategy
7. [ ] Define rollback procedures
8. [ ] Estimate effort and timeline
9. [ ] Identify risks and mitigation
10. [ ] Create testing strategy

**Output Files:**
- `docs/FileMaker/MIGRATION_ROADMAP.md` (main plan)
- `docs/FileMaker/SCHEMA_CHANGES_NEEDED.md` (Nexus updates)
- `docs/FileMaker/RISK_ASSESSMENT.md`

**Estimated Time:** 45-60 minutes

**Questions to Answer Before Starting:**
1. Timeline constraints - when do you need this complete?
2. Can we do incremental migration or need big-bang?
3. Will FileMaker run in parallel during migration?
4. What's the rollback requirement?

**Status:** ⏸️ PENDING (after Step 5)

---

### 🔵 Step 7: Implementation Plan

**Objective:** Break down implementation into manageable tasks

**Tasks:**
1. [ ] Create Django migration files list
2. [ ] Create import script specifications
3. [ ] Define test cases
4. [ ] Create validation queries
5. [ ] Define acceptance criteria
6. [ ] Create deployment checklist
7. [ ] Create user communication plan

**Output Files:**
- `docs/FileMaker/IMPLEMENTATION_PLAN.md`
- `docs/FileMaker/TEST_PLAN.md`

**Estimated Time:** 30-45 minutes

**Status:** ⏸️ PENDING (after Step 6)

---

## 📅 Estimated Timeline

| Step | Estimated Time | Cumulative |
|------|---------------|------------|
| 0. Planning | 10 min | 10 min |
| 1. Metadata Collection | 10 min | 20 min |
| 2. Relationship Mapping | 20 min | 40 min |
| 3. Nexus Schema Review | 15 min | 55 min |
| 4. Gap Analysis | 45 min | 1h 40m |
| 5. Data Quality Assessment | 30 min | 2h 10m |
| 6. Migration Strategy | 60 min | 3h 10m |
| 7. Implementation Plan | 45 min | 3h 55m |

**Total Analysis Time: ~4 hours** (can be done across multiple sessions)

---

## 🎯 Success Criteria

By the end of this analysis, we will have:

1. ✅ Complete understanding of FileMaker data structure
2. ✅ Complete understanding of Nexus schema
3. ✅ Detailed field-by-field mapping
4. ✅ List of required Nexus schema changes
5. ✅ Data quality assessment and remediation plan
6. ✅ Phase-by-phase migration roadmap
7. ✅ Risk assessment and mitigation strategies
8. ✅ Testing and validation strategy
9. ✅ Implementation task list

---

## 🚦 Current Status

**We are at Step 0 - Planning**

### Completed:
- ✅ Discovered all 9 FileMaker API tables
- ✅ Tested OData access (all accessible)
- ✅ Got basic field counts and structure
- ✅ Explored sample data from each table
- ✅ Created this plan document

### Next Action:
**WAITING FOR YOUR APPROVAL TO PROCEED WITH STEP 1**

---

## ❓ Questions for Craig

Before we start Step 1 (Metadata Collection), please answer:

### 1. Scope Questions
- [ ] Should we analyze all 9 tables equally, or prioritize some?
- [ ] Are there any FileMaker tables/fields you know are obsolete?
- [ ] Are there tables besides the 9 API_* tables we should consider?

### 2. Data Quality Questions
- [ ] What's your tolerance for data quality issues (nulls, duplicates, etc.)?
- [ ] Are there known data problems in FileMaker?
- [ ] Should we be strict or lenient during validation?

### 3. Timeline Questions
- [ ] When do you need the complete migration done?
- [ ] Can we do this incrementally or need it all at once?
- [ ] How urgent is this analysis?

### 4. Technical Questions
- [ ] Will FileMaker continue running during/after migration?
- [ ] Do we need to maintain FileMaker IDs for reference?
- [ ] Any Nexus features you want to add during migration?

### 5. Approach Questions
- [ ] Should I proceed step-by-step waiting for approval at each step?
- [ ] Or can I complete multiple steps and report back?
- [ ] Prefer detailed reports or concise summaries?

---

## 📝 Notes & Observations

### What's Going Well
- All 9 API tables are accessible via OData
- Already imported 2,845 patients successfully
- Clean API naming convention in FileMaker
- Good documentation system in place

### Potential Challenges
- Large data volumes (50,000+ clinic sessions estimated)
- Complex relationships between tables
- Data quality unknowns
- FileMaker "legacy" structure may not match modern patterns

### Opportunities
- Chance to modernize data structure
- Opportunity to clean up data during migration
- Can improve on FileMaker limitations
- Fresh start with proper normalization

---

## 🔗 Related Documentation

- **Current Import Guide:** `docs/FileMaker/IMPORT_COMPLETE_GUIDE.md`
- **API Tables Overview:** `docs/FileMaker/API_TABLES_COMPLETE_OVERVIEW.md`
- **Nexus Schema:** `docs/architecture/DATABASE_SCHEMA.md`
- **OData Success Story:** `docs/FileMaker/ODATA_TABLE_ACCESS_SUCCESS.md`

---

## ✅ Approval Checklist

Before proceeding to Step 1, confirm:

- [ ] Plan reviewed and understood
- [ ] Questions answered
- [ ] Timeline acceptable
- [ ] Approach agreed upon
- [ ] Ready to proceed with Step 1 (Metadata Collection)

---

**Status:** 🛑 WAITING FOR APPROVAL TO PROCEED  
**Next Step:** Step 1 - Complete Metadata Collection  
**Updated:** November 9, 2025

