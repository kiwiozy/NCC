# SMS Broadcast Webhook Setup - Exact Steps

## Quick Summary
1. Start ngrok → Get public URL
2. Configure SMS Broadcast → Enter webhook URLs
3. Test → Send SMS and reply

---

## STEP 1: Start ngrok

**Open a new terminal window** and run:
```bash
ngrok http 8000
```

**Copy the HTTPS URL** you see, it will look like:
```
https://abc123.ngrok-free.app
```

⚠️ **Keep this terminal open** - ngrok must stay running!

---

## STEP 2: Configure SMS Broadcast

### A. Log into SMS Broadcast
1. Go to: **https://www.smsbroadcast.com.au/**
2. Log in with your credentials

### B. Find Webhook Settings

The webhook settings might be in different places. Look for:

**Option 1:** Settings → Webhooks  
**Option 2:** Settings → API Settings  
**Option 3:** Settings → Callbacks  
**Option 4:** Account → Webhooks  
**Option 5:** Advanced → Webhooks

If you can't find it:
- Check the left sidebar menu
- Look for "API", "Settings", "Advanced"
- Check SMS Broadcast documentation
- Contact their support

### C. Enter Webhook URLs

Replace `YOUR-NGROK-URL` with your actual ngrok URL from Step 1:

**Field 1 - Delivery Receipt / DLR URL:**
```
https://YOUR-NGROK-URL.ngrok-free.app/api/sms/webhook/dlr/
```

**Field 2 - Inbound Message / Callback URL:**
```
https://YOUR-NGROK-URL.ngrok-free.app/api/sms/webhook/inbound/
```

**Example (if ngrok URL is `https://abc123.ngrok-free.app`):**
- Delivery Receipt: `https://abc123.ngrok-free.app/api/sms/webhook/dlr/`
- Inbound Message: `https://abc123.ngrok-free.app/api/sms/webhook/inbound/`

### D. Save Settings
Click **Save** or **Update** button

---

## STEP 3: Test It Works

### Test 1: Send Test SMS
1. Go to your app → Settings → SMS
2. Send a test SMS to your phone

### Test 2: Reply to SMS
1. Reply to that SMS from your phone
2. Check Django console - you should see:
   ```
   [SMS Webhook] Inbound message - from=..., to=..., message=...
   ```

### Test 3: View Reply in App
1. Go back to SMS History tab
2. Click on the message row you sent
3. **You should see your reply in the modal!**

---

## Verification

✅ **Webhooks Working If:**
- Django console shows `[SMS Webhook]` logs when you reply
- Replies appear when clicking message rows
- Message status updates from "sent" to "delivered"

❌ **Not Working If:**
- No logs in Django console
- Replies don't appear
- Check: Is ngrok still running?
- Check: Did you save URLs in SMS Broadcast?
- Check: Are URLs exactly correct (no typos)?

---

## Common Issues

### "Can't find webhook settings in SMS Broadcast"
- Some accounts may not have webhooks enabled
- Contact SMS Broadcast support to enable webhooks
- Or check if you need a different account type

### "ngrok URL keeps changing"
- Free ngrok URLs change on restart
- Solution: Use paid ngrok for static URL, or update SMS Broadcast each time
- For production: Use your actual domain instead of ngrok

### "Webhook works but replies don't show"
- Check phone number format matching
- Check Django console for errors
- Try clicking refresh button in modal

---

## Once Working

✅ Replies appear automatically  
✅ Message status updates automatically  
✅ Patient matching happens automatically  
✅ All stored in database

You're all set! 🎉

