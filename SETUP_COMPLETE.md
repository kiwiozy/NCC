# 🎉 Development Scripts Setup Complete!

## ✅ What's Been Created

### 🚀 Main Scripts

1. **`start-dev.sh`** - Start all services (Django + Next.js + ngrok)
   - Automatically kills existing processes
   - Starts services in correct order
   - Waits for each to be ready
   - Monitors all processes
   - Pretty colored output
   - Press Ctrl+C to stop everything

2. **`stop-dev.sh`** - Stop all services
   - Emergency stop button
   - Cleans up all processes
   - Kills by PID and by port

3. **`restart-dev.sh`** - Restart everything
   - Stop → Wait → Start
   - Quick recovery from issues

4. **`status-dev.sh`** - Check what's running
   - Shows all service status
   - Displays PIDs and URLs
   - Shows log file sizes

### 📄 Documentation

1. **`DEV_SCRIPTS_README.md`** - Complete guide
   - How each script works
   - Daily workflow tips
   - Troubleshooting guide
   - Log file locations

2. **`QUICK_COMMANDS.md`** - Copy-paste reference
   - Quick command list
   - Common tasks
   - Troubleshooting commands

3. **`README.md`** - Updated with new startup section
   - Points to one-command startup
   - Shows manual startup too

### 📋 Other Files

1. **`start-ngrok-tunnel.sh`** - ngrok only (if needed)
2. **`start-sms-webhook.sh`** - Django + ngrok (legacy)
3. **`logs/`** - Log directory (auto-created)
4. **`.dev-pids`** - Process tracking (auto-managed)

---

## 🌐 Your Permanent SMS Webhook URL

```
https://ignacio-interposable-uniformly.ngrok-free.dev/api/sms/webhook/inbound/
```

**This URL will NEVER change!** ✅

Configure this in SMS Broadcast:
1. Go to SMS Broadcast dashboard
2. Settings → Webhooks
3. Set URL to the above
4. Enable for: Inbound messages + Delivery reports

---

## 🎯 How to Use (Daily Workflow)

### Morning - Start Work
```bash
./start-dev.sh
```
Wait 30 seconds, then open http://localhost:3000

### During Day - Check Status
```bash
./status-dev.sh
```

### If Something Breaks - Restart
```bash
./restart-dev.sh
```

### Evening - Stop Work
Just press **Ctrl+C** in the start-dev.sh terminal

---

## 📊 What You'll See When Starting

```
========================================
🚀 WalkEasy Nexus Development Startup
========================================

[1/3] Starting Django Backend...
Waiting for Django to start...
✅ Django Backend started (PID: 12345)
   → http://localhost:8000

[2/3] Starting Next.js Frontend...
Waiting for Next.js to start...
✅ Next.js Frontend started (PID: 12346)
   → http://localhost:3000

[3/3] Starting ngrok Tunnel for SMS Webhooks...
Waiting for ngrok tunnel to start...
✅ ngrok Tunnel started (PID: 12347)

========================================
✨ All Services Running!
========================================
📱 Frontend (HTTPS):   https://localhost:3000
🔧 Backend API (HTTPS): https://localhost:8000
🌐 ngrok Dashboard:     http://localhost:4040

🔔 SMS Webhook URL:
   → https://ignacio-interposable-uniformly.ngrok-free.dev/api/sms/webhook/inbound/

========================================
📋 Logs Location: ./logs/
   • django.log      - Django backend logs
   • nextjs.log      - Next.js frontend logs
   • nextjs-ssl.log  - SSL proxy logs
   • ngrok.log       - ngrok tunnel logs
========================================

⚠️  Certificate Warnings:
   First time accessing https://localhost:8000 or https://localhost:3000:
   1. Browser will show certificate warning
   2. Click 'Advanced' or 'Show Details'
   3. Click 'Proceed to localhost' or 'visit this website'
   This is normal for local development with self-signed certificates

Press Ctrl+C to stop all services
```

---

## ✨ Key Features

### 1. One Command Startup ⭐
No more opening 3 terminals and starting services manually!
```bash
./start-dev.sh
```

### 2. Auto-Recovery 🔄
If any service crashes, everything stops (prevents confusion)

### 3. Permanent URL 🌐
Your webhook URL never changes - configure once, use forever

### 4. Smart Monitoring 📊
Checks if services are actually responding (not just running)

### 5. Clean Logs 📋
All output saved to separate log files for easy debugging

### 6. Status Checker ✅
Always know what's running with `./status-dev.sh`

### 7. Pretty Output 🎨
Colored terminal output makes it easy to see what's happening

---

## 🔍 Example Status Check

```bash
$ ./status-dev.sh

========================================
📊 WalkEasy Nexus Status Check
========================================
🔧 Django Backend (Port 8000):
   ✅ Running (PID: 12345)
   ✅ API responding
   → http://localhost:8000

📱 Next.js Frontend (Port 3000):
   ✅ Running (PID: 12346)
   ✅ Frontend responding
   → http://localhost:3000

🌐 ngrok Tunnel:
   ✅ Running (PID: 12347)
   ✅ Tunnel active
   → https://ignacio-interposable-uniformly.ngrok-free.dev
   📱 SMS Webhook:
   → https://ignacio-interposable-uniformly.ngrok-free.dev/api/sms/webhook/inbound/
   → ngrok dashboard: http://localhost:4040

========================================
📋 Recent Logs:
   • django.log: 245 lines
   • nextjs.log: 89 lines
   • ngrok.log: 12 lines

View logs: tail -f logs/django.log
========================================
```

---

## 🎓 Pro Tips

### Tip 1: Check Status First
Before starting, check if something is already running:
```bash
./status-dev.sh
./start-dev.sh  # Only if nothing is running
```

### Tip 2: View Live Logs
Keep a separate terminal open with logs:
```bash
tail -f logs/django.log
```

### Tip 3: Quick Restart
Something acting weird? Just restart:
```bash
./restart-dev.sh
```

### Tip 4: Background Mode (Optional)
If you want to run in background:
```bash
nohup ./start-dev.sh > /dev/null 2>&1 &
./status-dev.sh  # Check it started
./stop-dev.sh    # Stop when done
```

---

## 🆘 Troubleshooting

### "Port already in use"
The script handles this automatically, but if you see errors:
```bash
./stop-dev.sh
./start-dev.sh
```

### "ngrok not configured"
```bash
ngrok config add-authtoken YOUR_TOKEN
```

### "Service not responding"
Check the logs:
```bash
tail -50 logs/django.log
tail -50 logs/nextjs.log
```

### Complete reset
```bash
./stop-dev.sh
pkill -f "manage.py"
pkill -f "next dev"
pkill -f "ngrok"
./start-dev.sh
```

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| `QUICK_COMMANDS.md` | Copy-paste command reference |
| `DEV_SCRIPTS_README.md` | Complete detailed guide |
| `README.md` | Project overview (updated) |
| `docs/architecture/TROUBLESHOOTING.md` | General troubleshooting |

---

## 🎯 Next Steps

1. **Test the setup:**
   ```bash
   ./start-dev.sh
   ```

2. **Configure SMS Broadcast webhook:**
   - Use: `https://ignacio-interposable-uniformly.ngrok-free.dev/api/sms/webhook/inbound/`

3. **Test SMS webhook:**
   - Send test SMS from SMS Broadcast dashboard
   - Check logs: `tail -f logs/django.log`
   - Verify webhook received

4. **Use daily:**
   - Morning: `./start-dev.sh`
   - Evening: Press `Ctrl+C`

---

## 🎉 You're All Set!

**Your development workflow is now:**
1. ✅ One command to start everything
2. ✅ Automatic monitoring
3. ✅ Permanent webhook URL
4. ✅ Easy troubleshooting
5. ✅ Clean shutdown

**No more:**
- ❌ Opening multiple terminals
- ❌ Starting services in wrong order
- ❌ Forgetting to start something
- ❌ Changing webhook URLs
- ❌ Wondering if services are running

---

**Happy coding! 🚀**

