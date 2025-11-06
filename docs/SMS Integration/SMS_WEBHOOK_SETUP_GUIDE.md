# SMS Webhook Setup Guide - Step by Step

## Overview
We need to make your Django server (localhost:8000) publicly accessible so SMS Broadcast can call your webhooks when replies arrive.

## Method 1: Using ngrok (Easiest - Recommended for Testing)

### Step 1: Install ngrok

**On macOS (using Homebrew):**
```bash
brew install ngrok
```

**Or download directly:**
1. Go to https://ngrok.com/download
2. Download for macOS
3. Extract and move to `/usr/local/bin/` or add to PATH

### Step 2: Start ngrok

Open a **new terminal window** and run:
```bash
ngrok http 8000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:8000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 3: Keep ngrok Running
⚠️ **Important:** Keep this terminal window open - ngrok must stay running for webhooks to work.

## Method 2: Using Cloudflare Tunnel (Alternative)

If ngrok doesn't work, you can use Cloudflare Tunnel:
```bash
# Install
brew install cloudflared

# Start tunnel
cloudflared tunnel --url http://localhost:8000
```

## Step 4: Configure SMS Broadcast Webhooks

### 4.1 Log into SMS Broadcast
1. Go to https://www.smsbroadcast.com.au/
2. Log in with your credentials

### 4.2 Find Webhook Settings
Look for one of these in the menu:
- **Settings** → **Webhooks**
- **Settings** → **API Settings**
- **Settings** → **Callbacks**
- **Settings** → **Notifications**

### 4.3 Set Webhook URLs

**If you're using ngrok:**
Replace `https://abc123.ngrok.io` with your actual ngrok URL:

**Delivery Receipt (DLR) URL:**
```
https://abc123.ngrok.io/api/sms/webhook/dlr/
```

**Inbound Message URL:**
```
https://abc123.ngrok.io/api/sms/webhook/inbound/
```

**Important:** 
- Use **HTTPS** (not HTTP)
- Include the trailing `/`
- No spaces

### 4.4 Save Settings
Click **Save** or **Update**

## Step 5: Test the Setup

### 5.1 Test Webhook Endpoints
Open browser or use curl:
```bash
# Test delivery receipt endpoint
curl "https://your-ngrok-url.ngrok.io/api/sms/webhook/dlr/?smsref=123&status=Delivered&to=61487000872"

# Test inbound endpoint  
curl "https://your-ngrok-url.ngrok.io/api/sms/webhook/inbound/?from=61487000872&to=61488868772&message=Test"
```

Both should return: `OK`

### 5.2 Send Test SMS
1. Send an SMS from your app
2. Reply to that SMS from your phone
3. Check Django console for: `[SMS Webhook] Inbound message...`
4. Click the message row in your app - reply should appear!

## Troubleshooting

### "ngrok: command not found"
- Install ngrok: `brew install ngrok`
- Or download from https://ngrok.com/download

### "Webhook returns error"
- Check Django server is running on port 8000
- Check ngrok is running
- Verify URL format (must be HTTPS, include trailing /)

### "SMS Broadcast shows webhook failed"
- Check Django server logs for errors
- Verify webhook URLs in SMS Broadcast match ngrok URL
- Make sure ngrok is still running

### "Replies still not showing"
- Check Django console for webhook logs
- Manually test webhook URL in browser
- Verify SMS Broadcast is calling the correct URL
- Check SMS Broadcast dashboard for webhook delivery status

## Verification Checklist

- [ ] ngrok installed and running
- [ ] Have public HTTPS URL from ngrok
- [ ] Django server running on port 8000
- [ ] Webhook URLs configured in SMS Broadcast
- [ ] Test webhook endpoint returns "OK"
- [ ] Sent test SMS and replied
- [ ] Reply appears in Django console
- [ ] Reply shows in app when clicking message row

## Important Notes

1. **ngrok URLs change** - If you restart ngrok, you get a new URL and must update SMS Broadcast
2. **Keep ngrok running** - Webhooks won't work if ngrok stops
3. **For production** - Use your production domain instead of ngrok

## Next Steps After Setup

Once webhooks are working:
- ✅ Replies appear automatically
- ✅ Message status updates automatically  
- ✅ Patient matching happens automatically
- ✅ All replies stored in database

