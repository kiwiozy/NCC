# Containers (Documents/Images) Migration Plan

## Strategy
- Extract binaries from FileMaker container fields via **Data API** (preferred) or **Export Field Contents** scripts.
- Store in **GCS/S3** with deterministic keys and private ACLs.
- Insert a row in `document_assets`, then link via `documents` to the owning patient/encounter.

## Deterministic storage key
```
gs://<bucket>/patients/{patient_uuid}/{sha256}.{ext}
```
Keep `original_name` separately in metadata.

## Minimal workflow
1. **List records** on layouts exposing container fields (paginate).
2. For each container URL, **download** the binary with the Bearer token.
3. Compute **sha256**, detect **MIME** server-side.
4. **Upload** to bucket with the deterministic key.
5. **INSERT** into `document_assets` and **documents` (link to patient/encounter).
6. Record progress (checkpoint table) for resumability.

## Verification
- Byte-size match and SHA256 compare if available.
- Open random samples.
- Reconcile counts per patient and overall.

## Security
- Private buckets only; serve via **time-limited signed URLs**.
- Consider antivirus scanning (Cloud Functions/Lambda + ClamAV) before making assets available to users.
