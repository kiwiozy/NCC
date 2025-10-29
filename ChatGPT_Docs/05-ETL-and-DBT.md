# ETL Orchestration & dbt

## Ingestion
- **Relational data**: FileMaker Data API (JSON) or ODBC → `staging.*` tables.
- **Containers**: Separate job (see Containers plan).

## Orchestration
- **Cloud Run Jobs / Cloud Tasks** (GCP) or **ECS/Fargate + EventBridge** (AWS).
- Queue per table; backoff on 429/5xx; idempotent upserts in staging.

## dbt structure (suggested)
```
/dbt_project
  /models
    /staging      -- raw → typed staging
    /core         -- patients, appointments, etc. (INSERT/UPSERT into target)
    /readmodels   -- materialized views / denormalized tables
  /tests
    not_null_*.yml
    relationships_*.yml
    accepted_values_*.yml
```

## Job sequence
1. Ingest FM → `staging.*`
2. Run dbt transforms + tests
3. Refresh materialized views
4. Mirror select read models to Firestore (optional)

## Deltas
- Pull **modified since T** using FM timestamps (if available) or compare hashes in staging.
- Maintain a high-water mark per table.
