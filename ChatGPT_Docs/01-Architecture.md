# Patient Management System Migration — Architecture Overview

**Goal:** Move from FileMaker (incl. containers) to a modern, cloud-native system of record with **PostgreSQL** at the core, optional **Firestore** read cache, and object storage (GCS/S3) for documents/images.

## Guiding principles
- **Relational first**: Many joins → use PostgreSQL as the system of record.
- **Separation of concerns**: Staging → Transforms → Target schema (CQRS-lite for read models).
- **Files in object storage**: Not in the DB; store metadata only.
- **Security & auditability**: Strong FKs, constraints, timestamps, user attribution.
- **Incremental migration**: One-time full load + deltas; keep FM read-only post-cutover.

## High-level architecture

```
[Next.js/React] ─ https ─> [API (Django/DRF or NestJS)] ─ VPC ─> [PostgreSQL (Cloud SQL/RDS)]
                                         │                        ├─> [Redis cache]
                                         │                        ├─> [Materialized views / read models]
                                         ├─> [GCS/S3 object storage] (documents via signed URLs)
                                         ├─> [Queues/Tasks] (Celery / Cloud Tasks / SQS)
                                         ├─> [AuthN/AuthZ] (Auth0 / Firebase Auth / Cognito)
                                         └─> [Observability] (Sentry, OpenTelemetry, Cloud Logging)
```

## Data flow (migration)

1. **Extract** from FileMaker:
   - Relational data: Data API or ODBC/CSV → **staging schema**.
   - Containers: Data API streaming or server-side Export Field Contents → **GCS/S3**.
2. **Transform** in **dbt** (or SQL/Python) from staging → **target schema**.
3. **Load** read models (materialized views / denormalized tables) for fast UI.
4. **Verify** with row counts, FKs, checksums, and spot checks.
5. **Cutover**: Freeze FM writes → final delta → switch app writes to Postgres.

## Optional Firestore read cache
- Mirror select read models to Firestore for reactive UI lists (e.g., today's appointments).
- Postgres remains the source of truth.
- Cloud Functions/Tasks update Firestore on relevant DB changes.

## Compliance & security (AU context)
- Store timestamps in **UTC**; render in **Australia/Sydney**.
- Private buckets + **time-limited signed URLs** for documents.
- PII encryption at rest (KMS) and in transit; role-based access in app + DB.
- Full audit trail: `created_at/by`, `updated_at/by`, and append-only logs for critical clinical events.
