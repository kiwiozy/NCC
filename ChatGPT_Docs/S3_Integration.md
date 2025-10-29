# 🗂️ AWS S3 Integration — Docs & Images (Secure, AU Region)

This guide adds **Amazon S3** as the media store for documents and images in your app (Next.js + Django/DRF + PostgreSQL). It covers **bucket setup, IAM, encryption, presigned uploads/downloads, lifecycle, CORS, and code samples**. Default region: **ap-southeast-2 (Sydney)**.

---

## 1) Why S3 for your stack
- **Durable (11x9s)**, scalable, low-ops storage for files from patients/clinicians.
- **Presigned URLs** for safe, direct client uploads (no API server bottlenecks).
- **Server-side encryption (SSE-S3 or SSE-KMS)** and **bucket policies** suitable for PHI/PII.
- Works alongside GCP compute (Cloud Run) just fine; traffic goes over public internet with TLS.

---

## 2) High-level architecture

```
Client (Next.js) ──(GET)──> Django/DRF: request presigned upload
Client ──(PUT file)──> S3 using presigned URL  (no secrets in browser)
Django/DRF ──(POST)──> save Document record (key, checksum, mime, size)
Client (view/download) ──(GET)──> Django/DRF: request presigned GET URL
Client ──(GET)──> S3 using presigned URL (time-limited)
Optional: CloudFront in front of S3 for faster downloads
```

---

## 3) S3 Bucket setup

### 3.1 Create bucket
- Name: `wep-docs-${ENV}` (e.g., `wep-docs-prod`)
- Region: **ap-southeast-2**
- Block **all public access**
- Enable **S3 Versioning**
- Default encryption: **SSE-S3** (or **SSE-KMS** if you need key rotation/audit)

### 3.2 Lifecycle rules (recommended)
- Transition **older versions** to Glacier after 90–180 days.
- Optional: delete **multipart uploads** after 7 days (abort-incomplete-mpu).

### 3.3 CORS
For browser uploads from `https://app.walkeasy.au`:
```json
[
  {
    "AllowedOrigins": ["https://app.walkeasy.au"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 4) IAM & credentials

### 4.1 IAM user/role
- Create **IAM user** `wep-s3-uploader` (or role if running on AWS).
- Policy (restrict by bucket and prefix per env/tenant as needed):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:AbortMultipartUpload",
        "s3:ListBucketMultipartUploads",
        "s3:ListBucket",
        "s3:GetObject",
        "s3:HeadObject"
      ],
      "Resource": [
        "arn:aws:s3:::wep-docs-prod",
        "arn:aws:s3:::wep-docs-prod/*"
      ]
    }
  ]
}
```
- Store access keys in your secret manager (GCP Secret Manager or AWS Secrets Manager).

### 4.2 Environment variables
```
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=wep-docs-prod
S3_FORCE_PATH_STYLE=false
S3_ENDPOINT= # leave empty for AWS
S3_USE_ACCELERATE=false
```

> If you later use **CloudFront**, you don’t change presigned PUTs (still target S3). You can optionally sign GET URLs via CloudFront for downloads; presigned S3 GETs are fine to start.

---

## 5) Database schema for documents

```sql
CREATE TABLE document_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,                -- nullable for general docs
  clinic_id UUID,
  owner_user_id UUID,            -- who uploaded
  storage_provider TEXT NOT NULL DEFAULT 's3',
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,      -- e.g., 'patients/<uuid>/2025/10/scan-123.pdf'
  content_type TEXT,
  byte_size BIGINT,
  sha256_hex TEXT,               -- optional integrity check
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bucket, object_key)
);
CREATE INDEX ON document_assets (patient_id);
CREATE INDEX ON document_assets (clinic_id);
```

Key conventions:
- **Do not** store PHI in filenames; use opaque keys.
- Folder strategy: `patients/<uuid>/YYYY/MM/<uuidv4>.<ext>`

---

## 6) Django/DRF backend (boto3)

### 6.1 Install
```bash
pip install boto3
```

### 6.2 Presigned URL service
```python
import os, boto3, mimetypes, time
from datetime import datetime, timedelta

AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-2")
S3_BUCKET = os.getenv("S3_BUCKET")

session = boto3.session.Session(
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=AWS_REGION,
)
s3 = session.client("s3")

def key_for_upload(patient_id: str, filename: str) -> str:
    ext = (filename.split(".")[-1] or "").lower()
    today = datetime.utcnow()
    return f"patients/{patient_id}/{today.year}/{today.month:02d}/{int(time.time())}.{ext}"

def create_presigned_put(object_key: str, content_type: str, expires=900):
    return s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": S3_BUCKET,
            "Key": object_key,
            "ContentType": content_type,
            "ACL": "private",
            "ServerSideEncryption": "AES256"
        },
        ExpiresIn=expires
    )

def create_presigned_get(object_key: str, expires=900):
    return s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": S3_BUCKET, "Key": object_key},
        ExpiresIn=expires
    )
```

### 6.3 DRF endpoints
- `POST /api/docs/presign-upload` → body: `{ "patientId": "...", "filename": "...", "contentType": "application/pdf", "size": 123456 }`  
  - Returns: `{ "key": "...", "url": "<presigned_put>", "headers": {"Content-Type":"..."} }`
- `POST /api/docs/confirm` → body: `{ "key": "...", "patientId": "...", "contentType": "...", "size": 12345, "sha256": "..." }`  
  - Creates `document_assets` row.
- `GET /api/docs/:id/download` → returns a **presigned GET** URL (time-limited).

### 6.4 Validation rules
- Enforce **max size** (e.g., 25 MB per file; larger via multipart).
- Allowlist **content types**: `application/pdf`, `image/jpeg`, `image/png`, `image/heic`.
- Reject executables; scan PDFs if required (ClamAV or a scanning service in a queue).
- Optionally compute SHA-256 in browser and send to server for integrity logging.

---

## 7) Next.js client flow

### 7.1 Request presigned URL
```ts
const r = await fetch('/api/docs/presign-upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ patientId, filename, contentType })
});
const { url, key, headers } = await r.json();
```

### 7.2 Upload directly to S3
```ts
await fetch(url, {
  method: 'PUT',
  headers,            // must include Content-Type
  body: file
});
```

### 7.3 Confirm & record
```ts
await fetch('/api/docs/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key, patientId, contentType, size: file.size })
});
```

### 7.4 Download viewer
- Call `/api/docs/:id/download` → redirect or return JSON with a presigned GET URL.
- Open in a new tab or embed in a document viewer component.

---

## 8) Multipart & large uploads

For files > 25–50 MB, use **Multipart Upload**:
- Create backend endpoint to request **CreateMultipartUpload** (SDK) and generate **presigned URLs** for each part (5–15 MB parts).
- Client uploads parts in parallel; backend calls **CompleteMultipartUpload**.
- Ensure abort-incomplete lifecycle rule is set (e.g., 7 days).

---

## 9) Optional: CloudFront for faster downloads

- Create **CloudFront** distribution with S3 origin (origin access control).
- Keep **uploads** via **S3 presigned PUT** (not CloudFront).  
- You may later sign CloudFront **GET** URLs for downloads at scale.

---

## 10) Security & compliance checklist

- [ ] Bucket **private**, block public access, **no public ACLs**  
- [ ] **SSE** default (SSE-S3 or SSE-KMS)  
- [ ] Least-privilege IAM; rotate keys; use short-lived creds if on AWS  
- [ ] **Presigned URLs** expire ≤ 15 mins  
- [ ] File type & size enforcement; virus scanning for PDFs/images if needed  
- [ ] Don’t put PHI in object keys; store metadata in DB only  
- [ ] Access logs enabled (S3 Server Access Logging) to a separate bucket if required  
- [ ] If using KMS, enable key rotation & restrict decrypt permissions  

---

## 11) Terraform (AWS) — optional snippets

```hcl
resource "aws_s3_bucket" "docs" {
  bucket = "wep-docs-prod"
  force_destroy = false
}

resource "aws_s3_bucket_versioning" "docs" {
  bucket = aws_s3_bucket.docs.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "docs" {
  bucket = aws_s3_bucket.docs.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_s3_bucket_public_access_block" "docs" {
  bucket = aws_s3_bucket.docs.id
  block_public_acls   = true
  block_public_policy = true
  ignore_public_acls  = true
  restrict_public_buckets = true
}
```

---

## 12) Testing plan

- Upload JPEG/PDF from browser → verify 200 OK from S3, record in DB.
- Attempt disallowed type/size → verify rejection client/server.
- Try expired presigned URL → upload must fail.
- Download via presigned GET; URL expires and becomes invalid.
- Rotate IAM keys; verify application still works after secret update.

---

## 13) Rollout

1. Create **dev** bucket `wep-docs-dev`; wire dev secrets.
2. Implement presigned flows; verify in dev with test patients.
3. Add lifecycle rules & CORS; test multipart for large files.
4. Promote to **staging**, then **prod**.
5. Optional: add CloudFront for global performance.

---

**Outcome:** You gain a secure, scalable, low‑ops file store with **time‑limited access** and strict IAM — suitable for clinical documents and images in Australia (ap-southeast-2).
