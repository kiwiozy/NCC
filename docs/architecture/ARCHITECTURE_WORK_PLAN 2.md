# 🏗️ Architecture & Database Work Plan

**Branch:** `architecture`  
**Purpose:** Define and implement the complete database architecture for WalkEasy Nexus

---

## 📋 **Current State Analysis**

### **What We Have (Django Models - SQLite)**
- ✅ **Core Models:**
  - `Patient` - UUID, MRN, name, DOB, contact/address JSON, flags
  - `Clinic` - UUID, name, ABN, contact, address JSON
  - `Clinician` - UUID, clinic FK, name, credentials, contact
  - `Appointment` - UUID, clinic/patient/clinician FKs, times, status, notes
  - `Encounter` - UUID, patient/clinician/appointment FKs, type, summary
  - `Document` - UUID, generic FK, S3 storage, category

- ✅ **Integration Models:**
  - Gmail connections, email logs
  - SMS templates, messages, inbound
  - Xero contacts, invoices
  - S3 document storage

### **What's Missing (from Target Schema)**
- ❌ **Orders** table (footwear, orthoses orders)
- ❌ **Invoices** table (proper invoice tracking)
- ❌ **Document Assets** table (separate storage from metadata)
- ❌ **ID Mapping** tables (FileMaker → PostgreSQL migration)
- ❌ **Materialized Views** (read models for performance)
- ❌ **Proper Indexes** (optimized queries)
- ❌ **Audit Trail** (created_by, updated_by fields)

---

## 🎯 **Architecture Decisions Needed**

### **1. Database Strategy**
- [ ] **Decision:** Keep SQLite for development or move to PostgreSQL now?
- [ ] **Recommendation:** Start with PostgreSQL (Cloud SQL) for consistency
- [ ] **Action:** Create Cloud SQL instance and migrate

### **2. Model Enhancements**
- [ ] **Orders System:** Design order workflow (draft → confirmed → in_progress → completed)
- [ ] **Invoice System:** Design invoice structure (line items, payments, status)
- [ ] **Document System:** Separate asset storage from document metadata
- [ ] **Audit Trail:** Add `created_by` and `updated_by` to all models

### **3. Relationship Design**
- [ ] **Patient → Orders:** One-to-many relationship
- [ ] **Order → Invoice:** One-to-one or one-to-many?
- [ ] **Document → Encounter:** Should documents link to encounters?
- [ ] **Clinician → Orders:** Who creates/manages orders?

### **4. Data Migration**
- [ ] **FileMaker Mapping:** Design ID mapping tables
- [ ] **Migration Strategy:** Full load vs incremental
- [ ] **Data Validation:** How to verify migrated data

### **5. Performance Optimization**
- [ ] **Materialized Views:** Which read models do we need?
- [ ] **Indexes:** Identify query patterns and add indexes
- [ ] **Caching:** Redis for frequently accessed data?

---

## 📊 **Recommended Work Approach**

### **Phase 1: Analysis & Design (Week 1)**

#### **Step 1.1: Current State Documentation**
- [ ] Document all existing Django models
- [ ] Map current models to target schema
- [ ] Identify gaps and inconsistencies
- [ ] Create data dictionary

**Deliverable:** `docs/architecture/CURRENT_STATE_ANALYSIS.md`

#### **Step 1.2: Requirements Gathering**
- [ ] Business requirements for Orders system
- [ ] Invoice workflow requirements
- [ ] Document management requirements
- [ ] Audit/logging requirements

**Deliverable:** `docs/architecture/REQUIREMENTS.md`

#### **Step 1.3: Data Model Design**
- [ ] Design Orders model
- [ ] Design Invoice model
- [ ] Design Document Assets model
- [ ] Design ID mapping tables
- [ ] Design audit trail fields

**Deliverable:** `docs/architecture/DATA_MODEL_DESIGN.md`

#### **Step 1.4: ERD (Entity Relationship Diagram)**
- [ ] Create complete ERD
- [ ] Show all relationships
- [ ] Document cardinalities

**Deliverable:** `docs/architecture/ERD.md` or visual diagram

---

### **Phase 2: Schema Design (Week 2)**

#### **Step 2.1: PostgreSQL Schema Design**
- [ ] Create complete SQL schema
- [ ] Define all tables, columns, types
- [ ] Define foreign keys and constraints
- [ ] Define indexes
- [ ] Define materialized views

**Deliverable:** `docs/architecture/POSTGRES_SCHEMA.sql`

#### **Step 2.2: Django Models Update**
- [ ] Update existing models to match schema
- [ ] Add new models (Orders, Invoices, etc.)
- [ ] Add audit trail fields
- [ ] Update relationships

**Deliverable:** Updated Django models

#### **Step 2.3: Migration Strategy**
- [ ] Plan SQLite → PostgreSQL migration
- [ ] Plan FileMaker → PostgreSQL migration
- [ ] Design data validation checks
- [ ] Design rollback strategy

**Deliverable:** `docs/architecture/MIGRATION_STRATEGY.md`

---

### **Phase 3: Implementation (Week 3-4)**

#### **Step 3.1: Database Setup**
- [ ] Create Cloud SQL PostgreSQL instance
- [ ] Run schema migrations
- [ ] Create indexes
- [ ] Create materialized views

#### **Step 3.2: Django Model Updates**
- [ ] Update models in code
- [ ] Create migrations
- [ ] Test migrations
- [ ] Update serializers

#### **Step 3.3: API Updates**
- [ ] Update serializers for new models
- [ ] Update views/endpoints
- [ ] Add new endpoints (Orders, Invoices)
- [ ] Update documentation

---

## 🛠️ **Tools & Resources**

### **Documentation Files**
- `ChatGPT_Docs/01-Architecture.md` - High-level architecture
- `ChatGPT_Docs/02-Target-Postgres-Schema.md` - Target schema reference
- `ChatGPT_Docs/03-Staging-and-Mapping.md` - Data migration approach

### **Useful Tools**
- **ERD Tools:** Draw.io, dbdiagram.io, pgAdmin
- **Schema Tools:** Django migrations, pg_dump
- **Migration Tools:** Django management commands, custom ETL scripts

---

## ✅ **Success Criteria**

1. **Complete Schema:** All tables designed and documented
2. **Django Models:** All models match target schema
3. **Relationships:** All foreign keys and relationships defined
4. **Indexes:** Performance indexes created
5. **Migrations:** Clean migration path from SQLite to PostgreSQL
6. **Documentation:** Complete architecture documentation

---

## 🚀 **Next Steps (Start Here)**

1. **Review this plan** and adjust priorities
2. **Start with Phase 1, Step 1.1:** Document current state
3. **Create analysis document** comparing current vs target
4. **Identify immediate gaps** to address

---

**Last Updated:** November 4, 2025  
**Status:** Planning Phase  
**Next Action:** Begin Phase 1 - Current State Analysis

