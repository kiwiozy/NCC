# 💼 Xero Integration — Technical Spec (PostgreSQL + Django/DRF + Next.js on Cloud Run)

This document describes the **best-fit Xero integration** for your stack (PostgreSQL + Django/DRF + Next.js, running on Cloud Run with Secret Manager). It covers **OAuth2 setup, data mapping, sync flows, APIs, webhooks, and testing** for invoices, payments, and contacts — with multi‑clinic support using **Xero Tracking Categories**.

---

## ✅ Why this approach fits your stack

- **OAuth2 private app** (Xero “Connected App”) with **refresh-token rotation** → secure cloud-native integration.
- **PostgreSQL mapping tables** for contacts/invoices/items → auditable, idempotent syncs.
- **DRF service layer** with tasks (Cloud Tasks / Celery) → reliable background jobs.
- **Tracking Categories** to segment **clinics** (Tamworth, Newcastle, etc.).
- **Webhooks** to reflect **payments** and **invoice status** back into your app.
- Deploy as a container on **Cloud Run**; store secrets in **Secret Manager**.

---

## 1) Scoping & Data Model

### Primary flows
1. **Create/Update Contacts** (Patients, referrers) → Xero.
2. **Create Draft Invoices** for appointments, footwear, orthoses → Xero.
3. **Sync Payments** from Xero → mark invoices paid in your system.
4. **Track by Clinic** using Xero **Tracking Categories**.
5. Optional: **Items** for services/products; **Tax Rates** (GST/Non-GST).

### Mapping tables (PostgreSQL)
```sql
-- Link your patients/clinicians to Xero contact IDs
CREATE TABLE IF NOT EXISTS xero_contact_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_type TEXT NOT NULL,                 -- 'patient' | 'clinician' | 'referrer'
  local_id UUID NOT NULL,                   -- FK to your table
  xero_contact_id TEXT NOT NULL,            -- Xero GUID
  xero_contact_number TEXT,                 -- Optional human-readable number
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (local_type, local_id),
  UNIQUE (xero_contact_id)
);

-- Track invoice linkage & status
CREATE TABLE IF NOT EXISTS xero_invoice_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID,                      -- nullable if product-only invoice
  order_id UUID,                            -- if you invoice footwear/orthoses orders
  xero_invoice_id TEXT NOT NULL,            -- Xero GUID
  xero_invoice_number TEXT,                 -- human-readable number
  status TEXT,                              -- DRAFT|SUBMITTED|AUTHORISED|PAID|VOIDED
  total NUMERIC(12,2),
  amount_due NUMERIC(12,2),
  amount_paid NUMERIC(12,2),
  currency TEXT DEFAULT 'AUD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (xero_invoice_id)
);

-- Optional: item & tax mapping
CREATE TABLE IF NOT EXISTS xero_item_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_code TEXT NOT NULL,                 -- e.g., 'INITIAL_ASSESS'
  description TEXT,
  xero_item_code TEXT NOT NULL,             -- must exist in Xero
  unit_price NUMERIC(12,2),
  tax_rate_name TEXT,                       -- e.g., 'GST on Income'
  UNIQUE (local_code)
);

CREATE TABLE IF NOT EXISTS xero_tracking_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_clinic_id UUID NOT NULL,            -- FK to clinics
  tracking_category_id TEXT NOT NULL,       -- Xero GUID (Category)
  tracking_option_id TEXT NOT NULL,         -- Xero GUID (Option)
  category_name TEXT NOT NULL,              -- e.g., 'Clinic'
  option_name TEXT NOT NULL,                -- e.g., 'Tamworth'
  UNIQUE (local_clinic_id)
);
```

---

## 2) Xero Setup

- Create a **Xero App** (Connected App). Save:
  - `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`
  - `XERO_REDIRECT_URI` → `https://<your-domain>/xero/oauth/callback`
- Scopes (minimum): `offline_access accounting.transactions accounting.contacts accounting.settings`
- One **Xero Organisation** recommended for all clinics; split by **Tracking Categories**.

### Secret storage
Store credentials in **Secret Manager** and load at runtime:
```
XERO_CLIENT_ID=...
XERO_CLIENT_SECRET=...
XERO_REDIRECT_URI=https://<domain>/xero/oauth/callback
XERO_TENANT_ID=<filled after connection>
```

---

## 3) OAuth2 Flow (Django/DRF)

**Endpoints**
- `GET /xero/oauth/start` → redirect user to Xero for consent
- `GET /xero/oauth/callback` → exchange code; store `access_token`, `refresh_token`, `tenant_id`
- `POST /xero/token/refresh` → rotate refresh token (daily or on 401)

**Storage**
Create table `xero_connections` (single row unless multi‑org):
```sql
CREATE TABLE IF NOT EXISTS xero_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,                     -- from xero tenant selection
  access_token TEXT,                  -- encrypted at rest
  refresh_token TEXT,                 -- encrypted, rotated
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4) API Service Layer (Django)

Use either **xero-python** SDK or **requests**. Example (pseudo‑Python, requests):

```python
import os, time, requests
from django.utils import timezone
from .models import XeroConnection

BASE = "https://api.xero.com/api.xro/2.0"

def auth_headers(conn: XeroConnection):
    return {
        "Authorization": f"Bearer {conn.access_token}",
        "Xero-tenant-id": conn.tenant_id,
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

def ensure_token():
    # if expires_at < now + 5min -> refresh
    ...

def upsert_contact(patient) -> str:
    conn = ensure_token()
    payload = {
        "Contacts": [{
            "Name": f"{patient.last_name}, {patient.first_name}",
            "FirstName": patient.first_name,
            "LastName": patient.last_name,
            "EmailAddress": patient.email or None,
            "Phones": [{"PhoneType": "MOBILE", "PhoneNumber": patient.mobile_e164}],
            "ContactNumber": str(patient.id)[:12]
        }]
    }
    r = requests.post(f"{BASE}/Contacts", json=payload, headers=auth_headers(conn), timeout=20)
    r.raise_for_status()
    contact = r.json()["Contacts"][0]
    return contact["ContactID"]
```

### Create Draft Invoice
```python
def create_draft_invoice(patient, line_items, clinic_tracking):
    conn = ensure_token()
    payload = {
      "Invoices": [{
        "Type": "ACCREC",
        "Contact": {"ContactID": patient.xero_contact_id},
        "LineItems": [
            {
              "Description": li["description"],
              "Quantity": li.get("quantity", 1),
              "UnitAmount": float(li["unit_amount"]),
              "AccountCode": li["account_code"],   # from your mapping
              "TaxType": li.get("tax_type", "OUTPUT2"),  # GST on Income example
              "ItemCode": li.get("item_code")
            } for li in line_items
        ],
        "Status": "DRAFT",
        "CurrencyCode": "AUD",
        "DueDate": None,
        "Reference": li.get("reference", ""),
        "Tracking": [{
          "TrackingCategoryID": clinic_tracking.tracking_category_id,
          "TrackingOptionID": clinic_tracking.tracking_option_id
        }]
      }]
    }
    r = requests.post(f"{BASE}/Invoices", json=payload, headers=auth_headers(conn), timeout=20)
    r.raise_for_status()
    inv = r.json()["Invoices"][0]
    return inv["InvoiceID"], inv["InvoiceNumber"], inv["AmountDue"], inv["AmountPaid"]
```

### Update invoice status after payment pull
- On webhook or scheduled sync, fetch updated invoices and update `xero_invoice_links.status`, `amount_due`, `amount_paid`.
- When **AmountDue = 0** → mark appointment/order paid on your side.

---

## 5) Webhooks & Sync

### Webhooks (recommended)
- `POST /xero/webhooks` (Xero sends change notifications for Contacts/Invoices). Verify signature; then queue fetch tasks.

### Scheduled Sync
- **Contacts**: reconcile nightly.
- **Invoices**: poll every 5–10 minutes for recent changes (or only on webhook events).
- **Payments**: fetch invoices with **UpdatedDateUTC** within last N hours and update statuses.

---

## 6) Frontend (Next.js)

- Admin page for **Xero connection status** (tenant, token expiry).
- **Invoice pane** on appointment/order page: show Xero invoice number, status, due, link to Xero.
- Button: **“Create Xero Draft Invoice”**, **“Open in Xero”**.
- Badge: **Paid / Part Paid / Draft / Voided**.

---

## 7) Error Handling & Audit

- Wrap all Xero calls in try/catch; log HTTP status, body, correlation IDs.
- Store last successful sync time; retry with exponential backoff.
- Keep a **request/response audit** table (JSONB) for 30–90 days if needed.
- Validate **GST** and **AccountCode** mappings (fail fast on missing mapping).

---

## 8) Multi‑Clinic via Tracking Categories

- Create Xero Tracking Category **“Clinic”** with options **Tamworth, Newcastle, …**.
- Map your clinic IDs → Tracking Option IDs in `xero_tracking_categories`.  
- Each invoice includes the clinic tracking object (see example payload).  
- Reporting in Xero will then break down revenue by clinic automatically.

---

## 9) Security & Compliance

- Store tokens **encrypted at rest**; never log secrets.
- Use **least privilege** scopes.
- Respect **Australian data residency** in your infra; Xero is compliant for AU businesses.
- Align invoice data with your **NDIS/clinical** privacy rules; avoid clinical notes in invoice line descriptions.

---

## 10) Testing Plan

| Area | Test | Expected |
|------|------|----------|
| OAuth | Connect app & token refresh | Tenant ID stored, tokens rotate |
| Contact sync | Create patient → Contact in Xero | `xero_contact_links` row created |
| Invoice draft | Create appointment → Draft invoice | Link created; invoice visible in Xero |
| Payment sync | Pay invoice in Xero | App shows `Paid` within sync window |
| Tracking | Invoice per clinic | Xero report shows revenue by clinic |
| Errors | Bad mapping | Graceful error, log + alert |
| Load | 1,000 invoices/day | Batches succeed under rate limits |

---

## 11) Rollout

1. **Sandbox**: Connect to a test Xero org; trial contacts + draft invoices.
2. **Mappings**: Finalize `xero_item_mappings`, tax rates, accounts, tracking category options.
3. **Pilot**: One clinic for 1–2 weeks; verify payments flow back correctly.
4. **All clinics**: Enable tracking for each; monitor error logs and reconciliation reports.

---

## 12) Environment Variables

```bash
XERO_CLIENT_ID=...
XERO_CLIENT_SECRET=...
XERO_REDIRECT_URI=https://<domain>/xero/oauth/callback
XERO_TENANT_ID=...         # populated after initial connect
XERO_WEBHOOK_SECRET=...    # if verifying webhook signature
```

---

### TL;DR Recommendation

- Use **one Xero organisation** and split clinics via **Tracking Categories**.  
- Implement an **OAuth2 app** with **token refresh** stored in Postgres.  
- Sync **contacts** and create **draft invoices** from your app; **pull payments** back from Xero.  
- Deploy on **Cloud Run**, secrets in **Secret Manager**, jobs via **Cloud Tasks/Celery**.  
- This keeps finance in Xero, and clinical logic in your app — clean boundaries, full audit, minimal coupling.
