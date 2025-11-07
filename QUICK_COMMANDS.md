# 🎯 Quick Command Reference

**Copy-paste these commands for daily development:**

---

## 🚀 Starting Work

```bash
./start-dev.sh
```
**Starts everything:** Django + Next.js + ngrok tunnel (all with HTTPS)  
**Time:** ~30 seconds  
**Output:** Colored status updates + all URLs  
**Note:** Accept certificate warnings in browser on first access

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
**Does:** Stop → Wait → Start  
**Time:** ~35 seconds

---

## 🛑 Stop Everything

```bash
./stop-dev.sh
```
**Or just:** Press `Ctrl+C` in the start-dev.sh terminal  
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

## 🔧 Troubleshooting

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

