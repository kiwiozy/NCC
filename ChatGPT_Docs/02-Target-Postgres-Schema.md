# Target PostgreSQL Schema (Starter)

This schema models common entities for a patient management system. Adjust names/columns to your clinic’s needs.

> **Note:** Uses UUIDs (requires `pgcrypto` or `uuid-ossp`); timestamps are `timestamptz` (UTC).

```sql
-- Enable extensions (run once per database)
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- === Core reference tables ===
CREATE TABLE clinics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  abn              TEXT,
  phone            TEXT,
  email            TEXT,
  address_json     JSONB,                      -- structured address
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clinicians (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID REFERENCES clinics(id) ON DELETE SET NULL,
  full_name        TEXT NOT NULL,
  credential       TEXT,                       -- e.g., C.Ped CM Au
  email            TEXT,
  phone            TEXT,
  role             TEXT,                       -- pedorthist, admin, etc.
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === Patients ===
CREATE TABLE patients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn              TEXT UNIQUE,                -- local medical record number (optional)
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  middle_names     TEXT,
  dob              DATE,
  sex              TEXT,                       -- or enum/lookup
  contact_json     JSONB,                      -- phones, emails
  address_json     JSONB,
  emergency_json   JSONB,
  flags_json       JSONB,                      -- risk, alerts
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === Appointments / Encounters ===
CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID NOT NULL REFERENCES clinics(id),
  patient_id       UUID NOT NULL REFERENCES patients(id),
  clinician_id     UUID REFERENCES clinicians(id),
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled|checked_in|completed|cancelled|no_show
  reason           TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON appointments (clinic_id, start_time DESC);
CREATE INDEX ON appointments (patient_id, start_time DESC);
CREATE INDEX ON appointments (status, start_time DESC);

CREATE TABLE encounters (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id),
  clinician_id     UUID REFERENCES clinicians(id),
  appointment_id   UUID UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ,
  type             TEXT,                        -- assessment, fitting, review, etc.
  reason           TEXT,
  summary          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON encounters (patient_id, start_time DESC);

-- === Orders / Invoices (optional starter) ===
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id),
  clinician_id     UUID REFERENCES clinicians(id),
  order_type       TEXT,                        -- footwear, orthoses, etc.
  status           TEXT NOT NULL DEFAULT 'draft',
  details_json     JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID REFERENCES orders(id) ON DELETE SET NULL,
  patient_id       UUID NOT NULL REFERENCES patients(id),
  total_cents      BIGINT NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'AUD',
  status           TEXT NOT NULL DEFAULT 'unpaid',    -- unpaid|part_paid|paid|void
  issued_at        TIMESTAMPTZ,
  due_at           TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === Documents & Assets ===
CREATE TABLE document_assets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_url      TEXT NOT NULL,               -- gs://... or s3://... (kept private; app issues signed URLs)
  mime_type        TEXT,
  byte_size        BIGINT,
  sha256           TEXT UNIQUE,                 -- dedupe/integrity
  original_name    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id),
  encounter_id     UUID REFERENCES encounters(id) ON DELETE SET NULL,
  clinician_id     UUID REFERENCES clinicians(id) ON DELETE SET NULL,
  doc_type         TEXT,                        -- referral, scan, script, photo, etc.
  asset_id         UUID NOT NULL REFERENCES document_assets(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON documents (patient_id, created_at DESC);
CREATE INDEX ON documents (doc_type, created_at DESC);

-- === ID maps (retain legacy FileMaker keys) ===
CREATE TABLE id_map_patients (
  legacy_id        TEXT PRIMARY KEY,
  target_id        UUID NOT NULL REFERENCES patients(id),
  source           TEXT NOT NULL DEFAULT 'filemaker',
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE id_map_documents (
  legacy_id        TEXT PRIMARY KEY,
  target_id        UUID NOT NULL REFERENCES documents(id),
  source           TEXT NOT NULL DEFAULT 'filemaker',
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === Read models / materialized views (examples) ===
-- Summary per patient for list views/dashboards
CREATE MATERIALIZED VIEW mv_patient_summary AS
SELECT
  p.id AS patient_id,
  p.first_name,
  p.last_name,
  p.dob,
  (SELECT a.start_time FROM appointments a WHERE a.patient_id = p.id AND a.status <> 'cancelled' ORDER BY a.start_time DESC LIMIT 1) AS last_appt,
  (SELECT a2.start_time FROM appointments a2 WHERE a2.patient_id = p.id AND a2.status = 'scheduled' ORDER BY a2.start_time ASC LIMIT 1) AS next_appt,
  (SELECT count(*) FROM documents d WHERE d.patient_id = p.id) AS document_count,
  p.updated_at
FROM patients p;

CREATE INDEX ON mv_patient_summary (last_appt DESC);
CREATE INDEX ON mv_patient_summary (next_appt ASC);

-- Today's appointments for a clinic
CREATE MATERIALIZED VIEW mv_todays_appointments AS
SELECT a.*
FROM appointments a
WHERE a.start_time::date = (now() AT TIME ZONE 'Australia/Sydney')::date;

CREATE INDEX ON mv_todays_appointments (clinic_id, start_time);
```

**Refresh strategy:** use scheduled jobs (e.g., every few minutes) or triggers to refresh materialized views affected by changes.
