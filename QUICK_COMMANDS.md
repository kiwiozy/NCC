# 🎯 Quick Command Reference

**Copy-paste these commands for daily development:**

---

## 🚀 Starting Work

### Option 1: Quick Start (Recommended)
```bash
./quick-start.sh
```
**Starts everything:** Django + Next.js + ngrok tunnel (all with HTTPS)  
**Time:** ~30 seconds  
**Output:** Colored status updates + all URLs  
**Returns immediately:** Doesn't hang - services run in background  
**Note:** Accept certificate warnings in browser on first access

### Option 2: Interactive Start
```bash
./start-dev.sh
```
**Same as quick-start** but keeps running to monitor processes  
**Use:** For debugging or when you want real-time monitoring  
**Stop:** Press `Ctrl+C` to stop all services

---

## 📊 Check Status

```bash
./status-dev.sh
```
**Shows:** What's running, PIDs, URLs, log sizes  
**Time:** Instant

---

## 🔄 Restart Everything

```bash
./restart-dev.sh
```
**Does:** Stop → Wait → Start in background  
**Time:** ~8 seconds (no longer hangs!)  
**Note:** Services start in background, use `./status-dev.sh` to verify

---

## 🛑 Stop Everything

```bash
./stop-dev.sh
```
**Or:** Press `Ctrl+C` if using `./start-dev.sh`  
**Stops:** All services cleanly

---

## 📋 View Logs

```bash
# Live Django logs
tail -f logs/django.log

# Live Next.js logs
tail -f logs/nextjs.log

# Live ngrok logs
tail -f logs/ngrok.log

# All logs at once
tail -f logs/*.log

# Last 50 lines of Django
tail -50 logs/django.log
```

---

## 🌐 URLs (After Starting)

| Service | URL |
|---------|-----|
| **Frontend** | https://localhost:3000 |
| **Backend API** | https://localhost:8000 |
| **Admin Panel** | https://localhost:8000/admin |
| **ngrok Dashboard** | http://localhost:4040 |
| **SMS Webhook** | https://ignacio-interposable-uniformly.ngrok-free.dev/api/sms/webhook/inbound/ |

**⚠️ Important:** The app requires HTTPS for local development (OAuth, SMS webhooks).

**First time accessing https://localhost:3000 or https://localhost:8000:**
1. Browser will show certificate warning ("This Connection Is Not Private")
2. Click **"Show Details"** or **"Advanced"**
3. Click **"visit this website"** or **"Proceed to localhost"**
4. This is normal for local development with self-signed certificates

---

## 🎉 New Features

### 📱 SMS Notification Widget (November 2025)
**Real-time SMS notifications everywhere in the app!**

**What it does:**
- 🔵 Blue badge on Dashboard shows unread SMS count
- 🔔 Browser + in-app notifications when SMS arrives
- 📱 iPhone-like widget with message previews
- 🎯 Click message → Navigate to patient + open SMS dialog
- ✅ Mark-as-read confirmation when closing dialog
- 🌐 Works globally (get notified on any page)

**How to use:**
1. Send SMS to clinic number
2. Watch for notification (toast + desktop + badge)
3. Click notification or widget message
4. SMS dialog opens automatically
5. When closing, choose to mark as read

**Endpoints:**
- `GET /api/sms/unread-count/` - Global unread count
- `GET /api/sms/inbound/<uuid>/` - Message details

---

## 🔧 Troubleshooting

### Console Errors (Grammarly, Source Maps)
**Console showing Grammarly errors or missing .map files?**

✅ **These are automatically suppressed!** The console filter is active.

You'll see: `🔇 Console Filter Active` in your console.

**What's suppressed:**
- Grammarly extension errors (grm ERROR)
- Missing source maps (404 .map files)
- Safari extension style errors

**Your app errors still show normally!**

### Services won't start
```bash
./stop-dev.sh    # Force stop everything
./start-dev.sh   # Start fresh
```

### Django shows "ModuleNotFoundError: No module named 'django'"
**This means the virtual environment isn't being used.**

The `start-dev.sh` script automatically uses `backend/venv/bin/python` if it exists.

**Manual fix:**
```bash
# Check if venv exists
ls -la backend/venv

# If venv exists, start Django manually:
cd backend
venv/bin/python manage.py runserver 8000

# If no venv, create one:
cd backend
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

### Check what's running
```bash
./status-dev.sh
```

### Port conflicts
```bash
# Kill process on port 8000
lsof -t -i:8000 | xargs kill

# Kill process on port 3000
lsof -t -i:3000 | xargs kill
```

### ngrok issues
```bash
# Check if authenticated
ngrok config check

# Re-authenticate (get token from dashboard)
# Visit: https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken YOUR_FULL_TOKEN

# Test tunnel manually
ngrok http --domain=ignacio-interposable-uniformly.ngrok-free.dev 8000

# If you see "authtoken does not look like a proper ngrok authtoken":
# - The token may have been truncated or corrupted
# - Get a fresh token from the dashboard above
# - Make sure to copy the ENTIRE token (usually 40+ characters)
```

---

## 📖 Full Documentation

See **[DEV_SCRIPTS_README.md](DEV_SCRIPTS_README.md)** for:
- Detailed explanations
- Advanced usage
- Log file locations
- Daily workflow tips

---

## ⚡ Most Common Commands

**99% of the time, you'll use these three:**

```bash
# Morning
./start-dev.sh

# During development (if something breaks)
./restart-dev.sh

# Evening
# Just press Ctrl+C
```

**That's it!** 🎉

