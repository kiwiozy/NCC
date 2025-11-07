# 🚀 WalkEasy Nexus Development Scripts

Comprehensive startup scripts to run all development services in sync.

## 📋 Available Scripts

### `./start-dev.sh` - Start All Services ⭐
**The main script you'll use every day**

Starts all three services in the correct order:
1. ✅ Django Backend (port 8000)
2. ✅ Next.js Frontend (port 3000)
3. ✅ ngrok Tunnel (permanent webhook URL)

**Usage:**
```bash
./start-dev.sh
```

**Features:**
- ✅ Automatically kills any existing processes on ports 8000/3000
- ✅ Waits for each service to be ready before starting the next
- ✅ Monitors all processes - if one crashes, stops everything
- ✅ Saves logs to `logs/` directory
- ✅ Pretty colored output to see what's happening
- ✅ Press `Ctrl+C` to stop all services cleanly

**After starting, you'll see:**
```
✨ All Services Running!
========================================
📱 Frontend:        http://localhost:3000
🔧 Backend API:     http://localhost:8000
🌐 ngrok Dashboard: http://localhost:4040

🔔 SMS Webhook URL:
   → https://ignacio-interposable-uniformly.ngrok-free.dev/api/sms/webhook/inbound/
```

---

### `./status-dev.sh` - Check Service Status 📊
**See what's running at any time**

**Usage:**
```bash
./status-dev.sh
```

**Shows:**
- ✅ Django Backend status + PID
- ✅ Next.js Frontend status + PID
- ✅ ngrok Tunnel status + active URL
- ✅ Log file sizes
- ✅ Direct links to all services

---

### `./stop-dev.sh` - Stop All Services 🛑
**Emergency stop button**

Stops all running services:
- Django backend
- Next.js frontend
- ngrok tunnel

**Usage:**
```bash
./stop-dev.sh
```

**Note:** You shouldn't need this often - just press `Ctrl+C` in the `start-dev.sh` terminal.

---

## 📁 Log Files

All logs are saved to `logs/` directory:
- `logs/django.log` - Django backend output
- `logs/nextjs.log` - Next.js frontend output
- `logs/ngrok.log` - ngrok tunnel output

**View logs in real-time:**
```bash
# Django logs
tail -f logs/django.log

# Next.js logs
tail -f logs/nextjs.log

# ngrok logs
tail -f logs/ngrok.log

# All logs at once
tail -f logs/*.log
```

---

## 🌐 Permanent SMS Webhook URL

Your **permanent webhook URL** (never changes):
```
https://ignacio-interposable-uniformly.ngrok-free.dev/api/sms/webhook/inbound/
```

**Configure this in SMS Broadcast dashboard:**
1. Go to SMS Broadcast Settings
2. Set webhook URL to the above
3. Enable webhooks for:
   - Inbound messages (new SMS from patients)
   - Delivery reports (message status updates)

---

## 🔍 Quick Troubleshooting

### Port Already in Use
The script automatically kills existing processes on ports 8000 and 3000.

If you see errors:
```bash
./stop-dev.sh  # Force stop everything
./start-dev.sh # Start fresh
```

### ngrok Not Starting
Check if you're authenticated:
```bash
ngrok config check
```

If not configured:
```bash
ngrok config add-authtoken YOUR_TOKEN
```

### Django/Next.js Not Starting
Check the logs:
```bash
tail -50 logs/django.log
tail -50 logs/nextjs.log
```

Common issues:
- **Python dependencies:** `cd backend && pip install -r requirements.txt`
- **Node dependencies:** `cd frontend && npm install`
- **Database migrations:** `cd backend && python manage.py migrate`

---

## 🎯 Daily Workflow

### Morning (Starting Work)
```bash
./start-dev.sh
# Wait 15-30 seconds for everything to start
# Open http://localhost:3000 in browser
```

### During Development
```bash
# Check if everything is still running
./status-dev.sh

# View live logs if debugging
tail -f logs/django.log
```

### Evening (Stopping Work)
```bash
# Press Ctrl+C in the start-dev.sh terminal
# Or run:
./stop-dev.sh
```

---

## 🔧 Advanced Usage

### Start Only Specific Services

**Django only:**
```bash
cd backend
python manage.py runserver 8000
```

**Next.js only:**
```bash
cd frontend
npm run dev
```

**ngrok only:**
```bash
./start-ngrok-tunnel.sh
```

### Background Mode (Not Recommended)
If you want to run in background (use at your own risk):
```bash
nohup ./start-dev.sh > /dev/null 2>&1 &
```

To stop:
```bash
./stop-dev.sh
```

---

## 📝 Notes

- ✅ All scripts use colored output for easy reading
- ✅ Scripts track process PIDs in `.dev-pids` file
- ✅ Clean shutdown with `Ctrl+C` stops all services properly
- ✅ ngrok URL is permanent and will never change
- ✅ Logs are rotated automatically (old logs stay in `logs/` directory)

---

## 🆘 Need Help?

If services aren't starting:
1. Run `./status-dev.sh` to see what's running
2. Check logs in `logs/` directory
3. Try `./stop-dev.sh` then `./start-dev.sh`
4. Check `docs/architecture/TROUBLESHOOTING.md`

**Common commands:**
```bash
# See all running services
./status-dev.sh

# Stop everything
./stop-dev.sh

# Start everything
./start-dev.sh

# View Django logs
tail -f logs/django.log
```

---

## ✨ What's Great About This Setup

1. **One Command** - `./start-dev.sh` starts everything
2. **Permanent URL** - Never update SMS webhook config again
3. **Auto-Recovery** - If one service crashes, everything stops (prevents confusion)
4. **Detailed Logs** - All output saved for debugging
5. **Status Checker** - Always know what's running
6. **Clean Shutdown** - `Ctrl+C` stops everything properly
7. **Pretty Output** - Colored terminal output is easy to read

---

**🎉 Enjoy your streamlined development workflow!**

