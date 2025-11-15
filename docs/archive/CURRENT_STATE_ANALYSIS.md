# 📊 Current State Analysis

**Purpose:** Document existing Django models and compare with target PostgreSQL schema

---

## 🔍 **Current Django Models**

### **1. Patient Model**
**Location:** `backend/patients/models.py`

**Fields:**
- `id` - UUID (primary key)
- `mrn` - Medical Record Number (unique, optional)
- `first_name` - CharField(100)
- `last_name` - CharField(100)
- `middle_names` - CharField(100, optional)
- `dob` - DateField (optional)
- `sex` - CharField with choices (M/F/O/U)
- `contact_json` - JSONField (phones, emails)
- `address_json` - JSONField (address details)
- `emergency_json` - JSONField (emergency contact)
- `flags_json` - JSONField (risk flags, alerts)
- `created_at` - DateTimeField (auto)
- `updated_at` - DateTimeField (auto)

**Status:** ✅ Matches target schema

---

### **2. Clinic Model**
**Location:** `backend/clinicians/models.py`

**Fields:**
- `id` - UUID (primary key)
- `name` - CharField(200)
- `abn` - CharField(20, optional)
- `phone` - CharField(20, optional)
- `email` - EmailField (optional)
- `address_json` - JSONField (address details)
- `created_at` - DateTimeField (auto)
- `updated_at` - DateTimeField (auto)

**Status:** ✅ Matches target schema

---

### **3. Clinician Model**
**Location:** `backend/clinicians/models.py`

**Fields:**
- `id` - UUID (primary key)
- `clinic` - ForeignKey to Clinic
- `full_name` - CharField
- `credential` - CharField (optional)
- `email` - EmailField (optional)
- `phone` - CharField (optional)
- `role` - CharField (optional)
- `active` - BooleanField (default True)
- `created_at` - DateTimeField (auto)
- `updated_at` - DateTimeField (auto)

**Status:** ✅ Matches target schema

---

### **4. Appointment Model**
**Location:** `backend/appointments/models.py`

**Fields:**
- `id` - UUID (primary key)
- `clinic` - ForeignKey to Clinic (PROTECT)
- `patient` - ForeignKey to Patient (PROTECT)
- `clinician` - ForeignKey to Clinician (SET_NULL, optional)
- `start_time` - DateTimeField
- `end_time` - DateTimeField (optional)
- `status` - CharField with choices (scheduled/checked_in/completed/cancelled/no_show)
- `reason` - TextField (optional)
- `notes` - TextField (optional)
- `created_at` - DateTimeField (auto)
- `updated_at` - DateTimeField (auto)

**Status:** ✅ Matches target schema

---

### **5. Encounter Model**
**Location:** `backend/appointments/models.py`

**Fields:**
- `id` - UUID (primary key)
- `patient` - ForeignKey to Patient
- `clinician` - ForeignKey to Clinician (optional)
- `appointment` - ForeignKey to Appointment (UNIQUE, optional)
- `start_time` - DateTimeField
- `end_time` - DateTimeField (optional)
- `type` - CharField (optional)
- `reason` - TextField (optional)
- `summary` - TextField (optional)
- `created_at` - DateTimeField (auto)
- `updated_at` - DateTimeField (auto)

**Status:** ✅ Matches target schema

---

### **6. Document Model**
**Location:** `backend/documents/models.py`

**Fields:**
- `id` - UUID (primary key)
- `content_type` - GenericForeignKey (ContentType)
- `object_id` - UUID (generic FK)
- `file_name` - CharField(255)
- `original_name` - CharField(255)
- `file_size` - IntegerField (bytes)
- `mime_type` - CharField(100)
- `s3_bucket` - CharField(255)
- `s3_key` - CharField(512)
- `s3_url` - URLField (optional)
- `category` - CharField with choices
- `description` - TextField (optional)
- `tags` - JSONField (list)
- `uploaded_by` - CharField(100, optional)
- `uploaded_at` - DateTimeField (auto)
- `updated_at` - DateTimeField (auto)
- `is_active` - BooleanField (default True)

**Status:** ⚠️ **DIFFERS from target schema**

**Target Schema Has:**
- Separate `document_assets` table for storage
- Direct FK to `patient_id` and `encounter_id` (not generic FK)
- `doc_type` instead of `category`
- Links to `asset_id` instead of direct S3 fields

---

## ❌ **Missing Models (from Target Schema)**

### **1. Orders Table**
**Purpose:** Track patient orders (footwear, orthoses, etc.)

**Required Fields:**
- `id` - UUID
- `patient_id` - FK to Patient
- `clinician_id` - FK to Clinician (optional)
- `order_type` - Text (footwear, orthoses, etc.)
- `status` - Text (draft, confirmed, in_progress, completed, cancelled)
- `details_json` - JSONB (order details, items, specifications)
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Status:** ❌ **NOT IMPLEMENTED**

---

### **2. Invoices Table**
**Purpose:** Track invoices and payments

**Required Fields:**
- `id` - UUID
- `order_id` - FK to Order (optional)
- `patient_id` - FK to Patient
- `total_cents` - BigInt (amount in cents)
- `currency` - Text (default 'AUD')
- `status` - Text (unpaid, part_paid, paid, void)
- `issued_at` - Timestamp (optional)
- `due_at` - Timestamp (optional)
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Status:** ❌ **NOT IMPLEMENTED**

---

### **3. Document Assets Table**
**Purpose:** Separate file storage metadata from document records

**Required Fields:**
- `id` - UUID
- `storage_url` - Text (S3/GS URL)
- `mime_type` - Text
- `byte_size` - BigInt
- `sha256` - Text (unique, for deduplication)
- `original_name` - Text
- `created_at` - Timestamp

**Status:** ❌ **NOT IMPLEMENTED**

---

### **4. ID Mapping Tables**
**Purpose:** Map FileMaker IDs to PostgreSQL UUIDs during migration

**Required Tables:**
- `id_map_patients` - legacy_id (Text), target_id (UUID FK)
- `id_map_documents` - legacy_id (Text), target_id (UUID FK)

**Status:** ❌ **NOT IMPLEMENTED**

---

## 📊 **Gap Analysis Summary**

### **✅ Complete Models (Match Target)**
- Patient
- Clinic
- Clinician
- Appointment
- Encounter

### **⚠️ Models Needing Updates**
- **Document:** Needs refactoring to use document_assets table

### **❌ Missing Models**
- Orders
- Invoices
- Document Assets
- ID Mapping tables

### **❌ Missing Features**
- Materialized views (read models)
- Audit trail fields (created_by, updated_by)
- Optimized indexes
- FileMaker migration mapping

---

## 🎯 **Priority Actions**

### **High Priority**
1. Design Orders model (core business function)
2. Design Invoice model (billing essential)
3. Refactor Document model to use document_assets

### **Medium Priority**
4. Add audit trail fields to all models
5. Create ID mapping tables for migration
6. Design materialized views for performance

### **Low Priority**
7. Add missing indexes
8. Optimize JSON field structures

---

**Last Updated:** November 4, 2025  
**Next Step:** Design Orders and Invoice models

