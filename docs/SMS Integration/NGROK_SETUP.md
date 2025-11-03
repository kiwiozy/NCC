# ngrok Setup - Get Your Authtoken

## Why You Need This
ngrok now requires a free account to create public URLs. This only takes 2 minutes.

## Quick Setup (2 minutes)

### Step 1: Sign Up for Free ngrok Account
1. Go to: **https://dashboard.ngrok.com/signup**
2. Sign up (free account works fine)
3. You can use Google/GitHub to sign up quickly

### Step 2: Get Your Authtoken
1. After signing up, go to: **https://dashboard.ngrok.com/get-started/your-authtoken**
2. Copy your authtoken (looks like: `2abc123def456ghi789...`)

### Step 3: Install Authtoken
In your terminal, run:
```bash
ngrok authtoken YOUR_AUTHTOKEN_HERE
```

Replace `YOUR_AUTHTOKEN_HERE` with the token you copied.

### Step 4: Start ngrok
```bash
ngrok http 8000
```

You should now see:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:8000
```

✅ **Done!** Copy that HTTPS URL and use it in SMS Broadcast.

---

## Alternative: Cloudflare Tunnel (No Account Needed)

If you don't want to sign up for ngrok:

### Install Cloudflare Tunnel:
```bash
brew install cloudflared
```

### Start Tunnel:
```bash
cloudflared tunnel --url http://localhost:8000
```

You'll get a URL like: `https://abc123.trycloudflare.com`

Use this URL in SMS Broadcast instead!

---

## Which Should You Use?

**ngrok:** 
- ✅ More reliable
- ✅ Better dashboard
- ⚠️ Requires free account signup

**Cloudflare Tunnel:**
- ✅ No account needed
- ✅ Works immediately
- ⚠️ URLs change on restart

Both work fine for testing!

