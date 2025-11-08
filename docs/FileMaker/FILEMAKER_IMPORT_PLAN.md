# 📊 FileMaker Import - Implementation Plan

**Status:** 🎯 **PLANNING PHASE** - No code until plan is complete  
**Branch:** `filemaker-import`  
**Last Updated:** November 8, 2025

---

## 📋 **Executive Summary**

**Goal:** Import all data from FileMaker Server 20.3.2 into WalkEasy Nexus PostgreSQL database.

**Current State:**
- ✅ FileMaker Data API connectivity tested and verified
- ✅ Authentication flow documented
- ✅ API endpoints documented
- ⏳ Field mapping needed
- ⏳ ETL pipeline needed
- ⏳ Validation strategy needed

**Approach:** Multi-phase migration with validation at each step, keeping FileMaker as read-only backup.

---

## 🎯 **Goals & Non-Goals**

### **Goals:**
- ✅ Import all patient records from FileMaker to PostgreSQL
- ✅ Preserve all data integrity and relationships
- ✅ Maintain data history and audit trail
- ✅ Handle container fields (documents/images) properly
- ✅ Validate 100% data accuracy before cutover
- ✅ Keep FileMaker as read-only backup post-migration

### **Non-Goals:**
- ❌ Real-time bi-directional sync (one-time migration)
- ❌ FileMaker schema changes (import as-is)
- ❌ Data transformation beyond format conversion
- ❌ FileMaker Pro custom functions migration

---

## 🔍 **Discovery Phase - Questions to Answer**

Before we write any code, we need to know:

### **1. FileMaker Database Schema**
- [ ] What layouts exist in the FileMaker database?
- [ ] What fields are in each layout?
- [ ] What are the field types (text, number, date, container)?
- [ ] What are the primary/foreign key relationships?
- [ ] Are there any calculated fields we need to handle?
- [ ] Which fields are required vs optional?

### **2. Data Volume**
- [ ] How many patient records exist?
- [ ] How many total records across all tables?
- [ ] How much storage do container fields use?
- [ ] What's the average record size?
- [ ] Are there any very large text fields (notes)?

### **3. Data Quality**
- [ ] Are there any duplicate records?
- [ ] Are there any missing required fields?
- [ ] What's the date range of data (oldest/newest)?
- [ ] Are phone numbers formatted consistently?
- [ ] Are email addresses validated?

### **4. Container Fields (Files/Images)**
- [ ] What types of files are stored (PDF, images, etc.)?
- [ ] How many container fields per record?
- [ ] Total size of all container files?
- [ ] Should we migrate to S3 or keep in PostgreSQL?

### **5. Existing Nexus Schema**
- ✅ **PostgreSQL schema documented** - See `docs/architecture/DATABASE_SCHEMA.md`
- [ ] Which FileMaker tables map to which PostgreSQL tables?
- [ ] Are there fields in Nexus that don't exist in FileMaker?
- [ ] Are there fields in FileMaker that don't exist in Nexus?
- [ ] How do we handle mismatched data types?

**Known Nexus Tables:**
- ✅ `patients` - Complete with UUID, demographics, NDIS, JSON fields
- ✅ `appointments` - With patient/clinician/clinic relationships
- ✅ `funding_sources` - NDIS, Private, DVA, etc.
- ✅ `clinics` - Clinic management
- ✅ `documents` - Generic FK to any model, S3 storage
- ✅ `reminders` - Patient reminders/waiting list
- ✅ `sms_integration_smsmessage` - Outbound SMS
- ✅ `sms_integration_smsinbound` - Inbound SMS
- ✅ `letters_patientletter` - Patient letters with TipTap content

---

## 📊 **Phase 1: Schema Discovery & Mapping**

### **Step 1.1: Export FileMaker Schema**

**✅ AUTOMATED SCHEMA DISCOVERY SCRIPT AVAILABLE!**

**Run the automated discovery script:**

```bash
cd scripts/filemaker
cp .env.example .env
# Edit .env with your FileMaker credentials
python3 01_discover_schema.py
```

**What the script does:**
- 🔍 Connects to FileMaker Data API
- 📋 Lists all available layouts (tables)
- 📊 Gets field definitions (names, types, metadata)
- 📝 Counts records in each layout
- 💾 Retrieves sample data for analysis
- 📄 Saves complete schema to `data/discovery/filemaker_schema_YYYYMMDD_HHMMSS.json`

**Output includes:**
- Layout names and record counts
- Field names, types, and properties
- Sample values for type inference
- Relationships and field metadata
- Formatted summary report

**Deliverable:** `data/discovery/filemaker_schema_*.json`

**Script:** `scripts/filemaker/01_discover_schema.py` ✅ READY TO RUN

**After running, answer:**
- Which layouts are "real tables" vs "calculated layouts"?
- Can Data API provide relationship information?
- Should we export to JSON or directly to database table?

---

### **Step 1.2: Create Field Mapping**

**Map FileMaker → PostgreSQL:**

#### **Known Nexus Schema Reference:**

| Nexus Table | Key Fields | Notes |
|-------------|-----------|-------|
| **`patients`** | `id` (UUID), `first_name`, `last_name`, `dob`, `sex`, `contact_json`, `address_json`, `plan_dates_json`, `funding_type` (FK), `clinic` (FK) | Main patient table with JSON fields |
| **`appointments`** | `id` (UUID), `patient` (FK), `clinician` (FK), `clinic` (FK), `start_time`, `end_time`, `status`, `reason` | Appointments with relationships |
| **`funding_sources`** | `id` (UUID), `name`, `code`, `active`, `order` | NDIS, Private, DVA, etc. |
| **`clinics`** | `id` (UUID), `name`, ... | Clinic locations |
| **`documents`** | `id` (UUID), `object_id`, `content_type`, `s3_key`, `s3_url`, `category` | Generic FK to any model, S3 storage |
| **`reminders`** | `id` (UUID), `patient` (FK), `note`, `reminder_date`, `status` | Patient waiting list |
| **`letters_patientletter`** | `id` (UUID), `patient` (FK), `letter_type`, `recipient_name`, `pages` (JSON) | Patient letters |
| **`sms_*`** | SMS messages (inbound/outbound) | SMS integration tables |

#### **FileMaker → Nexus Mapping (To Be Filled):**

| FileMaker Table | FileMaker Fields | Nexus Table | Nexus Fields | Transform Notes |
|-----------------|------------------|-------------|--------------|-----------------|
| **Patients** (?) | ? | `patients` | `first_name`, `last_name`, `dob`, etc. | ? |
| **Appointments** (?) | ? | `appointments` | `start_time`, `end_time`, `patient_id` | ? |
| **Contacts** (?) | ? | ??? | ??? | How are contacts stored? |
| **Documents** (?) | Container fields? | `documents` | `s3_key`, `category` | Upload to S3 |
| **Notes** (?) | ? | ??? | ??? | Where are clinical notes? |
| ... | ... | ... | ... | ... |

**Deliverable:** `FIELD_MAPPING.md` with complete mapping

**Questions:**
- What's the exact name of the main patient table in FileMaker?
- Are there junction tables for many-to-many relationships?
- How are NDIS coordinators stored in FileMaker? (Nexus has `coordinator_name` + `coordinator_date` fields)
- Where are referrer contacts stored?
- How are appointments stored? (Nexus expects `start_time`, `end_time`, `status`)
- Where are patient documents stored? (Container fields?)
- Are phone/email/address stored separately or in one field?

---

### **Step 1.3: Identify Data Gaps**

**Compare schemas:**
- Fields in FileMaker but not in Nexus → Decide: import or skip?
- Fields in Nexus but not in FileMaker → Decide: leave null or set defaults?
- Different data types → Decide: how to transform?

**Deliverable:** `DATA_GAPS_ANALYSIS.md`

---

## 📊 **Phase 2: Data Export from FileMaker**

### **Step 2.1: Export All Records**

**Actions:**
1. Authenticate with FileMaker API
2. For each layout/table:
   - Fetch all records (paginated if needed)
   - Save to JSON files (backup)
   - Log record counts
3. Export container field URLs (don't download yet)

**Deliverable:** 
- `data/raw/filemaker_backup_YYYYMMDD/`
  - `patients.json`
  - `appointments.json`
  - `contacts.json`
  - etc.

**Script:** `scripts/02_export_all_data.py`

**Questions:**
- What's the FileMaker API record limit per request?
- Do we need pagination?
- How do we handle API rate limits?
- Should we export in batches or all at once?

---

### **Step 2.2: Download Container Fields**

**Actions:**
1. For each container field URL in exported data:
   - Download file
   - Save to local storage or S3
   - Log file metadata (name, size, type)
2. Update JSON with local file paths

**Deliverable:** `data/raw/filemaker_containers/`

**Questions:**
- Upload to S3 immediately or stage locally first?
- How to handle missing/corrupted files?
- What if container URL is empty/null?
- Do we need to preserve original filenames?

---

### **Step 2.3: Validate Export**

**Actions:**
1. Count records in each JSON file
2. Verify no records were skipped
3. Check for null/empty required fields
4. Verify container file downloads

**Deliverable:** `EXPORT_VALIDATION_REPORT.md`

**Questions:**
- What's our acceptable error rate?
- Do we retry failed downloads?
- How do we handle records with missing data?

---

## 📊 **Phase 3: Data Transformation (ETL)**

### **Step 3.1: Transform Data Types**

**Actions:**
1. Convert FileMaker dates to PostgreSQL dates
2. Format phone numbers to E.164 (+61...)
3. Convert FileMaker UUIDs to PostgreSQL UUIDs
4. Transform text encodings if needed

**Deliverable:** `data/transformed/`

**Script:** `scripts/03_transform_data.py`

**Questions:**
- Are FileMaker dates in ISO format or custom?
- Do we validate/clean phone numbers or import as-is?
- How do we handle invalid data during transform?

---

### **Step 3.2: Map Relationships**

**Actions:**
1. Map FileMaker foreign keys to PostgreSQL foreign keys
2. Handle many-to-many relationships
3. Preserve parent-child relationships

**Questions:**
- How are relationships defined in FileMaker?
- Do we need to generate new UUIDs for PostgreSQL?
- How do we maintain referential integrity?

---

### **Step 3.3: Handle Special Cases**

**Special data types:**
- NDIS plan dates
- Coordinator relationships (multiple per patient)
- Referrer relationships
- Appointment recurring events?
- Document categories/tags

**Questions:**
- Are there custom FileMaker value lists we need to map?
- How are multi-value fields stored in FileMaker?
- Do we need to split any fields (e.g., full name → first/last)?

---

## 📊 **Phase 4: Data Loading into PostgreSQL**

### **Step 4.1: Create Staging Tables**

**Actions:**
1. Create temporary staging tables with `_import` suffix
2. Load transformed data into staging
3. Run validation queries
4. Don't touch production tables yet

**Deliverable:** Django migration for staging tables

**Script:** `scripts/04_load_staging.py`

**Questions:**
- Should staging tables mirror production schema exactly?
- Do we use Django ORM or raw SQL for bulk insert?
- How do we handle duplicate records if import is re-run?

---

### **Step 4.2: Validate Staging Data**

**Actions:**
1. Count records (should match FileMaker)
2. Verify all foreign keys resolve
3. Check for null values in required fields
4. Verify data types and formats
5. Test a few records manually

**Deliverable:** `STAGING_VALIDATION_REPORT.md`

**Questions:**
- What validation queries should we run?
- Do we need a QA checklist?
- Who reviews the validation report?

---

### **Step 4.3: Load into Production Tables**

**Actions:**
1. Backup current PostgreSQL database
2. Begin transaction
3. Copy data from staging → production
4. Verify counts match
5. Commit transaction (or rollback if errors)

**Script:** `scripts/05_load_production.py`

**Questions:**
- Do we drop existing data or merge?
- How do we handle conflicts with existing records?
- Should this be done during maintenance window?
- Do we keep staging tables after import?

---

## 📊 **Phase 5: Post-Migration Validation**

### **Step 5.1: Data Integrity Checks**

**Actions:**
1. Compare record counts (FileMaker vs PostgreSQL)
2. Spot-check random records for accuracy
3. Verify all relationships are intact
4. Test app functionality with imported data

**Deliverable:** `POST_MIGRATION_VALIDATION.md`

---

### **Step 5.2: Container Field Verification**

**Actions:**
1. Verify all documents uploaded to S3
2. Test document downloads in app
3. Verify file permissions

---

### **Step 5.3: User Acceptance Testing**

**Actions:**
1. Clinic staff review imported patient data
2. Verify appointments imported correctly
3. Check for any missing/incorrect data
4. Document any issues found

**Deliverable:** `UAT_RESULTS.md`

---

## 📊 **Phase 6: Cutover & Backup**

### **Step 6.1: Final Sync (If Needed)**

**Actions:**
If FileMaker was still in use during import:
1. Export incremental changes since initial export
2. Apply updates to PostgreSQL
3. Re-validate

**Questions:**
- Will FileMaker still be used during migration?
- How do we track which records changed?
- Do we need a "last modified" timestamp?

---

### **Step 6.2: Switch to PostgreSQL**

**Actions:**
1. Announce maintenance window
2. Final validation
3. Make PostgreSQL the primary database
4. Set FileMaker to read-only
5. Update all app connections

---

### **Step 6.3: Keep FileMaker as Backup**

**Actions:**
1. Document how to access FileMaker if needed
2. Create "rollback plan" (how to revert if issues)
3. Schedule FileMaker decommission date (e.g., 30 days)

---

## 🛠️ **Technical Implementation**

### **Scripts to Create:**

```
scripts/
├── 01_discover_schema.py          # Export FileMaker schema
├── 02_export_all_data.py          # Export all records to JSON
├── 03_transform_data.py           # Transform data types/formats
├── 04_load_staging.py             # Load into staging tables
├── 05_load_production.py          # Copy staging → production
├── 06_validate_import.py          # Post-import validation
└── utils/
    ├── filemaker_client.py        # FileMaker API wrapper
    ├── s3_uploader.py             # Container field → S3
    ├── data_validator.py          # Validation functions
    └── field_mapper.py            # Field mapping logic
```

### **Configuration:**

```
config/
├── filemaker.env                  # FileMaker credentials
├── field_mapping.json             # Complete field mapping
└── import_config.json             # Import settings
```

### **Documentation:**

```
docs/FileMaker/
├── README.md                      # Already exists
├── Test_FileMaker_Data_API.md    # Already exists
├── FILEMAKER_IMPORT_PLAN.md      # This file
├── FIELD_MAPPING.md              # To be created
├── DATA_GAPS_ANALYSIS.md         # To be created
├── EXPORT_VALIDATION_REPORT.md   # Generated during import
├── STAGING_VALIDATION_REPORT.md  # Generated during import
└── POST_MIGRATION_VALIDATION.md  # Generated after import
```

---

## ⚠️ **Risk Assessment**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during import | **CRITICAL** | Multiple backups, staging tables, rollback plan |
| Incorrect field mapping | **HIGH** | Manual review, spot-checking, UAT |
| API rate limits | **MEDIUM** | Implement retry logic, pagination, throttling |
| Container download failures | **MEDIUM** | Retry logic, log failures, manual review |
| Foreign key conflicts | **MEDIUM** | Staging validation, test with small dataset first |
| Import takes too long | **LOW** | Run during maintenance window, optimize queries |
| FileMaker API authentication expires | **LOW** | Token refresh logic |

---

## 📋 **Pre-Flight Checklist**

Before starting the import:

- [ ] PostgreSQL database backed up
- [ ] FileMaker credentials verified
- [ ] FileMaker Data API tested (connectivity confirmed)
- [ ] S3 bucket configured for container fields
- [ ] All scripts tested on development environment
- [ ] Field mapping reviewed and approved
- [ ] Maintenance window scheduled
- [ ] Stakeholders notified
- [ ] Rollback plan documented
- [ ] UAT plan prepared

---

## 🚦 **Go/No-Go Decision Points**

**After Schema Discovery (Phase 1):**
- Can we map all FileMaker fields to Nexus schema?
- Are there any deal-breaker data gaps?

**After Data Export (Phase 2):**
- Did we successfully export all records?
- Are record counts as expected?

**After Staging Load (Phase 4.1):**
- Did all records load into staging?
- Are validation checks passing?

**Before Production Load (Phase 4.3):**
- Is staging data 100% validated?
- Is PostgreSQL backup complete?
- Are stakeholders ready?

---

## 🎯 **Success Criteria**

**Import is successful if:**
- ✅ 100% of FileMaker records imported to PostgreSQL
- ✅ All relationships preserved and validated
- ✅ No data loss or corruption
- ✅ All container fields accessible in Nexus
- ✅ App functions normally with imported data
- ✅ UAT passed by clinic staff
- ✅ Rollback plan tested and documented

---

## 🤔 **Open Questions (Need Answers Before Coding)**

### **Critical Questions:**
1. **What is the exact name of the main patient table in FileMaker?**
2. **How many total records are we importing?**
3. **Will FileMaker still be used during the import process?**
4. **Do we have a test FileMaker database for development?**
5. **What's the maintenance window for final cutover?**

### **Field Mapping Questions:**
6. How are NDIS coordinators stored? (Separate table? Multi-value field?)
7. How are referrers stored?
8. Where are appointment notes stored?
9. How are documents categorized in FileMaker?
10. Are there custom value lists we need to map?

### **Technical Questions:**
11. What's the FileMaker API pagination limit?
12. Do we need to worry about API rate limits?
13. Can we get a schema export from FileMaker Pro?
14. Are there any calculated fields we need to handle?
15. How do we handle FileMaker scripts/automations (do they need replication)?

### **Data Quality Questions:**
16. Are there known data quality issues in FileMaker?
17. Should we clean/deduplicate data during import?
18. What's the oldest date in the database?
19. Are there any test/demo records that should be excluded?
20. Do we validate/clean phone numbers or import as-is?

---

## 📅 **Estimated Timeline**

**Total: 2-4 weeks** (depends on data volume and complexity)

| Phase | Estimated Duration | Dependencies |
|-------|-------------------|--------------|
| Phase 1: Discovery & Mapping | 3-5 days | Access to FileMaker |
| Phase 2: Data Export | 2-3 days | API credentials |
| Phase 3: Transformation | 3-5 days | Field mapping complete |
| Phase 4: Loading | 2-3 days | Dev environment testing |
| Phase 5: Validation | 3-5 days | UAT participants |
| Phase 6: Cutover | 1 day | Maintenance window |

**Note:** Timeline assumes no major blockers. Add buffer time for unexpected issues.

---

## 🎬 **Next Steps**

**Immediate Actions:**
1. Answer all critical questions in "Open Questions" section
2. Get access to FileMaker Server
3. Run schema discovery script
4. Create detailed field mapping document
5. Review and approve this plan

**Once Plan is Approved:**
1. Create all script files (no code yet, just structure)
2. Set up development environment
3. Test import with 10-20 test records
4. Iterate on field mapping
5. Full import once validated

---

## 📝 **Notes & Decisions**

### **Decision Log:**
- **[Date]** Decision made: [Description]
- **[Date]** Field mapping approved by: [Name]
- **[Date]** UAT plan approved by: [Name]

### **Blockers:**
- None yet

### **Assumptions:**
- FileMaker Data API is accessible from development environment
- We have admin access to FileMaker Server if needed
- PostgreSQL has enough storage for all imported data
- Container fields will be migrated to S3 (not PostgreSQL BYTEA)

---

**Status:** 🎯 **AWAITING ANSWERS** - Need to fill in open questions before proceeding

**Next Review:** After answering critical questions above

---

**Remember:** NO CODE until this plan is 100% complete and approved! 🚫💻

