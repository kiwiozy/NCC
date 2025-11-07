# SMS Webhooks Quick Start - Get Replies Working

## Current Status
✅ **Webhooks Implemented** - Code is ready  
❌ **Webhooks Not Configured** - SMS Broadcast needs to know where to send replies

## What You Need to Do

### Step 1: Make Your Server Publicly Accessible

**For Testing (Development):**
```bash
# Install ngrok
brew install ngrok

# Start ngrok (creates public URL to localhost:8000)
ngrok http 8000
```

You'll get a URL like: `https://abc123.ngrok.io`

**For Production:**
- Deploy to your production server
- Use your domain (e.g., `https://nexus-core-clinic.com`)

### Step 2: Configure Webhooks in SMS Broadcast

1. **Log into SMS Broadcast:** https://www.smsbroadcast.com.au/
2. **Go to Settings → Webhooks** (or API Settings)
3. **Set these URLs:**

   **Delivery Receipt URL:**
   ```
   https://your-ngrok-url.ngrok.io/api/sms/webhook/dlr/
   ```
   OR for production:
   ```
   https://your-domain.com/api/sms/webhook/dlr/
   ```

   **Inbound Message URL:**
   ```
   https://your-ngrok-url.ngrok.io/api/sms/webhook/inbound/
   ```
   OR for production:
   ```
   https://your-domain.com/api/sms/webhook/inbound/
   ```

4. **Save** the settings

### Step 3: Test It

1. **Send an SMS** from your app
2. **Reply to that SMS** from the phone (`61488868772`)
3. **Check Django console** - you should see:
   ```
   [SMS Webhook] Inbound message - from=..., to=..., message=...
   ```
4. **Check the app** - click on the message row, you should see the reply

## How It Works

1. **You send SMS** → Message saved in database
2. **Patient replies** → SMS Broadcast receives reply
3. **SMS Broadcast calls your webhook** → `/api/sms/webhook/inbound/`
4. **Webhook saves reply** → Creates `SMSInbound` record
5. **Frontend shows reply** → When you click message row

## Troubleshooting

### "No replies received yet"
- **Check:** Are webhooks configured in SMS Broadcast?
- **Check:** Is your server publicly accessible?
- **Check:** Django console for webhook logs

### Webhook Not Being Called
1. **Test webhook manually:**
   ```bash
   curl "https://your-url/api/sms/webhook/inbound/?from=61487000872&to=61488868772&message=Test"
   ```
2. **Check SMS Broadcast logs** - See if webhook calls are failing
3. **Check Django server logs** - Look for `[SMS Webhook]` entries

### Replies Not Showing in Modal
1. **Check browser console** - Any errors?
2. **Check Django console** - Are replies being saved?
3. **Try refresh button** in modal
4. **Check phone number format** - May need to match formats

## Quick Test Without Webhooks

To test the UI without waiting for webhooks:

1. **Manually create a test reply:**
   ```python
   # In Django shell
   from sms_integration.models import SMSInbound, SMSMessage
   from django.utils import timezone
   
   # Get a sent message
   msg = SMSMessage.objects.order_by('-created_at').first()
   
   # Create a test reply
   SMSInbound.objects.create(
       from_number='61487000872',  # Replace with your test number
       to_number='61488868772',
       message='Test reply - YES',
       received_at=timezone.now()
   )
   ```

2. **Then click the message row** - You should see the reply

## Next Steps After Webhooks Work

1. ✅ Replies will appear automatically when received
2. ✅ Message status updates automatically (sent → delivered)
3. ✅ Patient matching happens automatically
4. ✅ All replies stored in database

