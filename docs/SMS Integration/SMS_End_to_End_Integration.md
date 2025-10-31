# 📲 End‑to‑End SMS Reminder & Communication System (AU Healthcare)

This document merges everything discussed so far into a single comprehensive implementation plan for **SMS reminders** and **two‑way communication** in Walk Easy Pedorthics’ patient management system.

---

## 🔹 Overview

Your new patient management platform (PostgreSQL + Django/Next.js) can integrate SMS for appointment confirmations, reminders, and cancellations. This spec unifies:

- **Reminder logic** (T‑24h / T‑2h jobs)
- **Opt‑in compliance & audit**
- **Provider integration layer**
- **Inbound and delivery webhooks**
- **AU regulatory compliance (Spam Act 2003)**

---

## 🧩 Providers Supported

| Provider | Pros | Notes |
|-----------|------|-------|
| **SMS Broadcast (Primary)** | Australian, simple API, DLR + inbound, supports short delays | Recommended for Walk Easy |
| **Twilio (Secondary)** | Global, flexible APIs, supports WhatsApp | Good for international expansion |
| **MessageMedia (Alternative)** | Strong AU presence, high deliverability | Similar to SMS Broadcast |

All providers can be abstracted behind a single **gateway interface**, so you can switch without rewriting business logic.

---

## 🧠 Architecture

### Flow summary
1. Appointment created/updated → enqueue T‑24h and T‑2h reminder jobs.
2. Job runner calls the **SMS gateway** (e.g., SMS Broadcast API).
3. Provider returns a **message reference (smsref)**.
4. Store send attempt → `sms_messages` table.
5. Provider sends **Delivery Report (DLR)** → updates status.
6. Patient replies (YES / NO / STOP) → **Inbound webhook** updates appointment status or consent.

---

## 🗄️ Database Schema (PostgreSQL)

```sql
ALTER TABLE patients
  ADD COLUMN mobile_e164 TEXT,
  ADD COLUMN sms_opt_in BOOLEAN DEFAULT TRUE,
  ADD COLUMN preferred_channel TEXT DEFAULT 'sms';

CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID,
  patient_id UUID,
  clinic_id UUID,
  type TEXT NOT NULL, -- confirm|t24|t2|followup|custom
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'smsbroadcast',
  provider_msg_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error_code TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sms_inbound (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  from_number TEXT NOT NULL,
  to_number TEXT,
  body TEXT NOT NULL,
  ref TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  raw JSONB
);
```

---

## 💬 Message Templates

### Confirmation (at booking)
> “Hi {{first_name}}, your {{type_name}} is booked for {{start_local}} at {{clinic_name}}. Reply YES to confirm or NO to cancel.”

### T‑24h reminder
> “Reminder: {{first_name}}, {{type_name}} at {{start_local}} ({{clinic_name}}). Reply YES to confirm or NO to cancel.”

### T‑2h reminder
> “Starting soon: {{first_name}}, your {{type_name}} at {{clinic_name}}. Reply NO if you can’t attend.”

### Follow‑up
> “We missed you today, {{first_name}}. Reply REBOOK or call {{clinic_phone}}.”

**Time zones:** Render `start_local` using Australia/Sydney.  
**Privacy:** Never include PHI or diagnosis.

---

## ⏰ Reminder Scheduling Logic

### Triggers
- Appointment created or updated → enqueue reminders.
- Daily scheduler (e.g., Cloud Run job) checks for T‑24h due messages.
- Frequent runner (every 5 min) checks for T‑2h reminders.

### Skip logic
- `status IN ('cancelled','completed','no_show')`
- `sms_opt_in = FALSE`
- No valid `mobile_e164`
- Flags `remind_24h = FALSE` or `remind_2h = FALSE`

### Idempotency
Use composite key `appointment_id + reminder_type` to prevent duplicates.

---

## 📡 SMS Broadcast Integration

### Endpoint
```
https://api.smsbroadcast.com.au/api-adv.php
```
Parameters: `username`, `password`, `to`, `message`, optional `from`, `ref`, `maxsplit`, `delay`

Example response:  
`OK: 61400111222:2942263`

### Webhooks

#### Delivery Receipt (DLR)
SMS Broadcast calls:
```
GET /webhooks/sms/smsbroadcast/dlr?to=614...&ref=appt_ABC123&smsref=2942263&status=Delivered
```

#### Inbound Message
SMS Broadcast calls:
```
GET /webhooks/sms/smsbroadcast/inbound?to=614...&from=614...&message=YES&ref=appt_ABC123
```

### Number formatting
Convert `+614XXXXXXXX` → `614XXXXXXXX` before sending.

---

## 🧱 Django Gateway Example

```python
# smsbroadcast_gateway/services.py
import os, requests
from .models import SMSMessage

API_URL = "https://api.smsbroadcast.com.au/api-adv.php"
USERNAME = os.environ["SMSB_USERNAME"]
PASSWORD = os.environ["SMSB_PASSWORD"]
SENDER = os.environ.get("SMSB_FROM", "WalkEasy")

def au_to_smsbroadcast(msisdn_e164):
    return msisdn_e164.lstrip('+')

def send_sms(to_e164, body, ref=None, msg_type='custom'):
    msg = SMSMessage.objects.create(to_number=to_e164, body=body, type=msg_type, status='queued')
    params = dict(username=USERNAME, password=PASSWORD, to=au_to_smsbroadcast(to_e164), message=body, from_=SENDER[:11])
    if ref: params['ref'] = ref[:20]
    r = requests.post(API_URL, data=params, timeout=15)
    line = r.text.strip().split(':')
    msg.status = 'sent' if line[0].startswith('OK') else 'failed'
    msg.provider_msg_id = line[2] if len(line) == 3 else None
    msg.save()
    return msg
```

### Webhooks
```python
# smsbroadcast_gateway/views.py
@require_GET
@csrf_exempt
def dlr(request):
    smsref = request.GET.get('smsref')
    status = request.GET.get('status','').lower()
    try:
        msg = SMSMessage.objects.get(provider_msg_id=smsref)
        msg.status = 'delivered' if status == 'delivered' else 'failed'
        msg.save(update_fields=['status'])
    except SMSMessage.DoesNotExist:
        pass
    return HttpResponse('OK')

@require_GET
@csrf_exempt
def inbound(request):
    body = (request.GET.get('message') or '').strip().lower()
    ref = request.GET.get('ref')
    # YES -> confirm, NO -> cancel, STOP -> opt-out
    if body in ('yes','y','confirm'): ...
    elif body in ('no','cancel','n'): ...
    elif body in ('stop','unsubscribe'): ...
    return HttpResponse('OK')
```

---

## ⚖️ Compliance (Australia)

- **Consent required:** Record patient opt‑in before first SMS.
- **Opt‑out mechanism:** Support STOP keyword → disable `sms_opt_in`.
- **Sender identification:** Set `from=WalkEasy` or approved long code.
- **No PHI**: Avoid medical conditions or diagnosis details.
- **Data retention:** Store message metadata 12 months minimum.

---

## 🔧 Environment Variables

```bash
SMSB_USERNAME=your_api_key
SMSB_PASSWORD=your_api_secret
SMSB_FROM=WalkEasy
WEBHOOK_SHARED_SECRET=optional
```

---

## 🧪 Testing Plan

| Test | Expected |
|------|-----------|
| Send SMS | Response OK and sms_messages.status=sent |
| Invalid credentials | Response ERROR, status=failed |
| DLR delivered | Updates status=delivered |
| DLR failed | Updates status=failed |
| Inbound YES | Appointment confirmed |
| Inbound NO | Appointment cancelled |
| Inbound STOP | sms_opt_in=False |

---

## 🚀 Rollout Steps

1. **Sandbox test**: Internal phones only.
2. **Enable webhooks** in SMS Broadcast portal (DLR + Inbound).
3. **Monitor logs** via Django admin or SQL console.
4. **Pilot launch** with 1–2 clinics for 1 week.
5. **Expand to all clinics** once stable.
6. **Optional:** add analytics dashboard (sent %, delivery %, opt-outs).

---

✅ **Outcome:**  
Walk Easy Pedorthics gains a reliable, compliant, and auditable SMS reminder system using **SMS Broadcast**, with flexible migration paths to Twilio or MessageMedia in the future.
