# Staging Schema & Field Mapping

## Staging schema
Mirror FileMaker tables **lightly** (mostly TEXT/NUMERIC/TIMESTAMP), one table per FM table/layout. Example:

```sql
CREATE SCHEMA IF NOT EXISTS staging;

CREATE TABLE staging.fm_patients_raw (
  legacy_id        TEXT PRIMARY KEY,
  name_first       TEXT,
  name_last        TEXT,
  dob              TEXT,          -- keep as text initially; cast in transforms
  phone_home       TEXT,
  phone_mobile     TEXT,
  email            TEXT,
  address_raw      TEXT,
  updated_at       TIMESTAMPTZ DEFAULT now(),
  _ingested_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE staging.fm_documents_raw (
  legacy_id        TEXT PRIMARY KEY,
  patient_legacy_id TEXT,
  container_url    TEXT,          -- FM Data API streaming URL captured at ingest time (optional, or separate export table)
  filename         TEXT,
  mime_type        TEXT,
  bytes            BIGINT,
  updated_at       TIMESTAMPTZ DEFAULT now(),
  _ingested_at     TIMESTAMPTZ DEFAULT now()
);
```

## Mapping workbook (structure)
Create a CSV/Excel with these columns:

| Legacy table | Legacy field | Type | Notes | Target table | Target column | Transform |
|---|---|---|---|---|---|---|
| fm_patients_raw | name_first | TEXT | may include honorifics | patients | first_name | `trim()` |
| fm_patients_raw | name_last  | TEXT |  | patients | last_name  | `trim()` |
| fm_patients_raw | dob        | TEXT | various formats | patients | dob | `to_date(dob, 'YYYY-MM-DD')` or parse |
| fm_documents_raw | patient_legacy_id | TEXT | FK → fm_patients_raw | documents | patient_id | via `id_map_patients` |

## Transforms with dbt (examples)
- Cast types, split names, normalize enums, validate referential integrity.
- Populate `id_map_*` tables upon first successful insert to target.
- Create **exception tables** for rows that fail validation.

```sql
-- Example: models/stg_patients.sql
SELECT
  legacy_id,
  trim(name_first) AS first_name,
  trim(name_last)  AS last_name,
  NULLIF(email, '') AS email,
  CASE
    WHEN dob ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN dob::date
    ELSE NULL
  END AS dob,
  now() AS _staged_at
FROM {{ ref('fm_patients_raw') }};
```

## Validation tests
- **NOT NULL** checks on required target columns.
- **Accepted values** for enums (appointment status, document type).
- **FK existence** (every `patient_id` in documents exists in patients).
- **Row count reconciliation** between staging and target.
