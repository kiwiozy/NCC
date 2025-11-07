# 🏗️ Development Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Your Development Machine                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    start-dev.sh                             │ │
│  │            (Orchestrates Everything)                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐      ┌─────────────┐     ┌─────────────┐      │
│  │   Django    │      │   Next.js   │     │   ngrok     │      │
│  │  Backend    │      │  Frontend   │     │   Tunnel    │      │
│  │             │      │             │     │             │      │
│  │ Port 8000   │◄─────┤ Port 3000   │     │             │      │
│  │             │ API  │             │     │ Forwards to │      │
│  │ /api/*      │      │ UI/Pages    │     │  Port 8000  │      │
│  │             │      │             │     │             │      │
│  │ SQLite DB   │      │ React       │     │ Dashboard   │      │
│  │             │      │ Components  │     │ Port 4040   │      │
│  └─────────────┘      └─────────────┘     └─────────────┘      │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐      ┌─────────────┐     ┌─────────────┐      │
│  │django.log   │      │nextjs.log   │     │ngrok.log    │      │
│  └─────────────┘      └─────────────┘     └─────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS Tunnel
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ngrok Cloud                                 │
│                                                                  │
│   Permanent URL (never changes):                                │
│   https://ignacio-interposable-uniformly.ngrok-free.dev         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SMS Broadcast API                             │
│                                                                  │
│  Sends webhooks to:                                              │
│  https://ignacio-interposable-uniformly.ngrok-free.dev          │
│        /api/sms/webhook/inbound/                                 │
│                                                                  │
│  Webhook Types:                                                  │
│  • Inbound SMS (from patients)                                   │
│  • Delivery Reports (message status)                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Request Flow

### 1. User Opens Frontend
```
Browser (http://localhost:3000)
   │
   ▼
Next.js Frontend (Port 3000)
   │
   ├─► Renders UI (React/Mantine)
   ├─► Makes API calls to Django
   │   http://localhost:8000/api/patients/
   │   http://localhost:8000/api/sms/...
   │
   ▼
Django Backend (Port 8000)
   │
   ├─► Processes request
   ├─► Queries SQLite database
   ├─► Returns JSON response
   │
   ▼
Frontend displays data
```

### 2. SMS Webhook Received
```
SMS Broadcast API
   │
   │ POST request with SMS data
   ▼
ngrok Cloud
   │
   │ Routes to tunnel
   ▼
ngrok on localhost
   │
   │ Forwards to port 8000
   ▼
Django Backend
   │
   ├─► /api/sms/webhook/inbound/
   ├─► Creates SMSInbound record
   ├─► Matches to patient by phone
   ├─► Saves to database
   │
   ▼
Returns 200 OK to SMS Broadcast
```

### 3. User Sends SMS from Frontend
```
Frontend UI
   │ User clicks "Send SMS"
   ▼
POST http://localhost:8000/api/sms/patients/{id}/send/
   │
   ▼
Django Backend
   │
   ├─► Validates patient/phone
   ├─► Calls SMS Broadcast API
   ├─► Creates SMSMessage record
   ├─► Saves to database
   │
   ▼
Returns success to Frontend
   │
   ▼
Frontend shows "Message sent!"
   │
   ▼
(Later) SMS Broadcast sends delivery webhook
   │
   ▼
ngrok → Django → Updates message status
```

---

## File Structure

```
nexus-core-clinic/
│
├── 🚀 Startup Scripts
│   ├── start-dev.sh          ⭐ Main startup (use this!)
│   ├── stop-dev.sh           🛑 Stop all services
│   ├── restart-dev.sh        🔄 Restart everything
│   ├── status-dev.sh         📊 Check what's running
│   ├── start-ngrok-tunnel.sh   (ngrok only)
│   └── start-sms-webhook.sh    (legacy)
│
├── 📖 Documentation
│   ├── SETUP_COMPLETE.md       ✅ This setup summary
│   ├── QUICK_COMMANDS.md       ⚡ Copy-paste reference
│   ├── DEV_SCRIPTS_README.md   📚 Complete guide
│   └── README.md               📄 Project overview
│
├── 📋 Logs (auto-created)
│   ├── django.log
│   ├── nextjs.log
│   └── ngrok.log
│
├── 🔧 Backend (Django)
│   ├── manage.py
│   ├── ncc_api/              (settings)
│   ├── patients/             (models, views)
│   ├── sms_integration/      (SMS logic)
│   └── db.sqlite3            (database)
│
└── 🎨 Frontend (Next.js)
    ├── app/
    │   ├── page.tsx          (dashboard)
    │   ├── components/       (UI components)
    │   └── utils/            (helpers)
    └── package.json
```

---

## Port Map

| Port | Service | URL | Purpose |
|------|---------|-----|---------|
| 3000 | Next.js (HTTPS) | https://localhost:3000 | Frontend UI (SSL proxy) |
| 3001 | Next.js (HTTP) | http://localhost:3001 | Frontend internal (proxied) |
| 8000 | Django (HTTPS) | https://localhost:8000 | Backend API |
| 4040 | ngrok | http://localhost:4040 | Tunnel dashboard |

**Note:** App requires HTTPS for OAuth and webhooks. Self-signed certificates used for local development.

---

## URL Map

| URL | Purpose | Access |
|-----|---------|--------|
| `https://localhost:3000` | Frontend (Dashboard) | Browser (accept cert warning) |
| `https://localhost:8000` | Backend API | Frontend/Curl |
| `https://localhost:8000/admin` | Django Admin | Browser (accept cert warning) |
| `http://localhost:4040` | ngrok Dashboard | Browser |
| `https://ignacio-interposable-uniformly.ngrok-free.dev` | Public webhook endpoint | SMS Broadcast |

---

## Environment Variables

### Backend (.env in backend/)
```bash
# Django settings
SECRET_KEY=django-insecure-...
DEBUG=True

# SMS Broadcast
SMS_BROADCAST_API_KEY=your_key
SMS_BROADCAST_USERNAME=your_username
SMS_BROADCAST_PASSWORD=your_password

# AWS S3 (for documents)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET_NAME=your_bucket

# OpenAI (for AI features)
OPENAI_API_KEY=your_key

# Xero (for accounting)
XERO_CLIENT_ID=your_id
XERO_CLIENT_SECRET=your_secret

# Google OAuth (for auth)
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
```

### Frontend (.env.local in frontend/)
```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_id
```

---

## Process Management

### start-dev.sh Creates These Processes:

```
start-dev.sh (PID: 12340)
   │
   ├─► python manage.py runserver 8000
   │   └─► PID: 12341 → logs/django.log
   │
   ├─► npm run dev (Next.js)
   │   └─► PID: 12342 → logs/nextjs.log
   │
   └─► ngrok http --domain=... 8000
       └─► PID: 12343 → logs/ngrok.log
```

**All PIDs tracked in:** `.dev-pids`

**Monitoring:** start-dev.sh checks every 5 seconds that all processes are alive

**Shutdown:** Ctrl+C or stop-dev.sh kills all processes cleanly

---

## Database Schema (Simplified)

```
patients
  ├── id (UUID)
  ├── mrn (Medical Record Number)
  ├── first_name, last_name
  ├── dob, sex
  ├── contact_json (phone, email)
  └── address_json

sms_integration_smsmessage
  ├── id
  ├── patient_id → patients.id
  ├── phone_number
  ├── message_text
  ├── direction (inbound/outbound)
  ├── status (sent, delivered, failed)
  └── created_at

sms_integration_smsinbound
  ├── id
  ├── patient_id → patients.id
  ├── from_number
  ├── message_text
  ├── received_at
  └── is_read
```

---

## ngrok Configuration

### Config File: `~/.cloudflared/config.yml`
```yaml
version: "2"
authtoken: 3BAMZDm3JcfbzxONvZ8b23JlCy9S_4QftLLpbAp6nM9z1Pyk2
```

### Tunnel Command
```bash
ngrok http --domain=ignacio-interposable-uniformly.ngrok-free.dev 8000
```

### Features
- ✅ Permanent domain (never changes)
- ✅ HTTPS included
- ✅ Dashboard at http://localhost:4040
- ✅ Request inspection
- ✅ Replay requests
- ✅ Free tier (20K requests/month)

---

## Webhook Flow Detail

```
┌─────────────────────────────────────────────────────────┐
│ SMS Broadcast (Patient sends SMS to your number)        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ POST https://ignacio-interposable-uniformly.ngrok-free.dev
                        │      /api/sms/webhook/inbound/
                        │
                        │ Body: {
                        │   "from": "+61412345678",
                        │   "message": "Can I reschedule?",
                        │   "timestamp": "2025-11-07T20:00:00Z"
                        │ }
                        ▼
┌─────────────────────────────────────────────────────────┐
│ ngrok Cloud (Routes to your local machine)              │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ ngrok Local (Port 4040) forwards to localhost:8000      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Django Backend                                           │
│                                                          │
│ 1. Receives POST at /api/sms/webhook/inbound/           │
│ 2. Validates signature (if configured)                  │
│ 3. Normalizes phone number to E.164                     │
│ 4. Searches for patient by phone in contact_json        │
│ 5. Creates SMSInbound record                            │
│ 6. Auto-detects YES/NO/STOP replies                     │
│ 7. Returns HTTP 200 OK                                  │
│                                                          │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend (Auto-refreshes via polling)                   │
│                                                          │
│ • SMSDialog polls /api/sms/patients/{id}/conversation/  │
│ • SMSNotificationWidget shows unread count              │
│ • User sees new message appear in conversation          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Health Checks

### Django Health
```bash
curl http://localhost:8000/api/patients/
# Should return JSON list or 401 (auth required)
```

### Next.js Health
```bash
curl http://localhost:3000
# Should return HTML
```

### ngrok Health
```bash
curl http://localhost:4040/api/tunnels
# Should return JSON with tunnel info
```

### Full System Health
```bash
./status-dev.sh
# Shows status of all services
```

---

## Common Workflows

### 1. Morning Startup
```bash
cd /Users/craig/Documents/nexus-core-clinic
./start-dev.sh
# Wait 30 seconds
# Open http://localhost:3000
```

### 2. Check Webhook Logs
```bash
tail -f logs/django.log | grep webhook
```

### 3. Test SMS Webhook
```bash
# Send test SMS from SMS Broadcast dashboard
# Or use curl:
curl -X POST http://localhost:8000/api/sms/webhook/inbound/ \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+61412345678",
    "message": "Test message",
    "timestamp": "2025-11-07T20:00:00Z"
  }'
```

### 4. Restart if Something Breaks
```bash
./restart-dev.sh
```

### 5. Evening Shutdown
```bash
# Just press Ctrl+C in the start-dev.sh terminal
# Or:
./stop-dev.sh
```

---

**This architecture ensures:**
- ✅ All services start in correct order
- ✅ Dependencies are met before next service starts
- ✅ Webhooks work via permanent URL
- ✅ Easy monitoring and debugging
- ✅ Clean shutdown of all processes

---

**For more details, see:**
- `DEV_SCRIPTS_README.md` - Complete script documentation
- `QUICK_COMMANDS.md` - Command reference
- `docs/architecture/` - System architecture docs

