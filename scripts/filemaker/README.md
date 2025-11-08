# FileMaker Import Scripts

This directory contains scripts for migrating data from FileMaker to PostgreSQL/Nexus.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install requests python-dotenv
```

### 2. Configure FileMaker Access

```bash
# Copy the example config
cp .env.example .env

# Edit .env with your FileMaker Server details
nano .env
```

**Required `.env` values:**
- `FM_BASE_URL` - Your FileMaker Server URL (e.g., `https://fmserver.example.com`)
- `FM_DATABASE` - Database name without .fmp12 extension
- `FM_USERNAME` - FileMaker username (must have `fmrest` extended privilege)
- `FM_PASSWORD` - FileMaker password

### 3. Run Schema Discovery

```bash
python3 01_discover_schema.py
```

This will:
- ✅ Connect to FileMaker Server
- ✅ List all available layouts (tables)
- ✅ Discover all fields in each layout
- ✅ Count records in each layout
- ✅ Get sample data to understand data types
- ✅ Save complete schema to `data/discovery/filemaker_schema_YYYYMMDD_HHMMSS.json`

---

## 📋 Scripts Overview

### **Phase 1: Discovery**

#### `01_discover_schema.py` ✅ READY
**Purpose:** Discover FileMaker schema automatically via Data API

**What it does:**
- Queries FileMaker Data API for all layouts
- Gets field definitions (names, types, metadata)
- Counts records in each layout
- Retrieves sample data for analysis
- Saves complete schema to JSON

**Output:** `data/discovery/filemaker_schema_YYYYMMDD_HHMMSS.json`

**Run:** `python3 01_discover_schema.py`

---

### **Phase 2: Export** (Not yet built)

#### `02_export_data.py` ⚠️ TODO
**Purpose:** Export data from FileMaker to JSON/CSV

**What it will do:**
- Export records from each layout
- Handle pagination (large datasets)
- Download container fields (images, PDFs)
- Save to staging directory

---

### **Phase 3: Transform** (Not yet built)

#### `03_transform_data.py` ⚠️ TODO
**Purpose:** Transform FileMaker data to Nexus format (ETL)

**What it will do:**
- Map FileMaker fields → PostgreSQL fields
- Transform data types (dates, phone numbers, etc.)
- Build relationships (FKs)
- Create UUIDs for new records
- Validate data integrity

---

### **Phase 4: Load** (Not yet built)

#### `04_load_data.py` ⚠️ TODO
**Purpose:** Load transformed data into PostgreSQL

**What it will do:**
- Load to staging database first
- Run validation queries
- Load to production database
- Handle errors gracefully

---

### **Phase 5: Validate** (Not yet built)

#### `05_validate_data.py` ⚠️ TODO
**Purpose:** Validate migration success

**What it will do:**
- Compare record counts
- Verify relationships
- Check data integrity
- Generate validation report

---

### **Phase 6: Finalize** (Not yet built)

#### `06_finalize_migration.py` ⚠️ TODO
**Purpose:** Finalize migration and backup

**What it will do:**
- Create final backup
- Update sequences
- Generate migration report
- Mark migration as complete

---

## 📂 Directory Structure

```
scripts/filemaker/
├── 01_discover_schema.py     ✅ Schema discovery script
├── 02_export_data.py          ⚠️  Data export script (TODO)
├── 03_transform_data.py       ⚠️  Data transformation (TODO)
├── 04_load_data.py            ⚠️  Data loading (TODO)
├── 05_validate_data.py        ⚠️  Data validation (TODO)
├── 06_finalize_migration.py   ⚠️  Migration finalization (TODO)
├── .env.example               ✅ Config template
├── .env                       🔒 Your credentials (git-ignored)
├── README.md                  ✅ This file
└── data/
    ├── discovery/             📊 Schema discovery output
    ├── export/                📦 Exported FileMaker data
    ├── transformed/           🔄 Transformed data ready for import
    └── validation/            ✅ Validation reports
```

---

## 🔒 Security Notes

- **NEVER commit `.env` file** - It's already in `.gitignore`
- FileMaker credentials are sensitive - store securely
- Use read-only FileMaker account if possible for discovery/export
- Run scripts on secure network or VPN

---

## 🐛 Troubleshooting

### "Authentication failed"
- ✅ Check username/password in `.env`
- ✅ Verify user has `fmrest` extended privilege in FileMaker
- ✅ Check FileMaker Server is accessible
- ✅ Verify database name is correct (case-sensitive)

### "SSL Certificate Error"
- ✅ Script disables SSL verification for self-signed certificates
- ✅ For production, use proper SSL certificate

### "No layouts found"
- ✅ Check database name in `.env`
- ✅ Verify user has permissions to access layouts

---

## 📚 Documentation

- **Main Plan:** `docs/FileMaker/FILEMAKER_IMPORT_PLAN.md`
- **FileMaker API Guide:** `docs/FileMaker/README.md`
- **API Testing:** `docs/FileMaker/Test_FileMaker_Data_API.md`
- **Database Schema:** `docs/architecture/DATABASE_SCHEMA.md`

---

## 🎯 Current Status

**✅ PHASE 1: DISCOVERY - Ready to run!**

**Next Steps:**
1. Configure `.env` with FileMaker credentials
2. Run `python3 01_discover_schema.py`
3. Review schema output in `data/discovery/`
4. Create field mapping document
5. Build remaining scripts (Phase 2-6)

