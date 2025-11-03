# SMS Webhook Implementation Question for ChatGPT

## Context
We're building a medical practice management system with SMS integration via SMS Broadcast. We need to receive and display replies to sent SMS messages in real-time.

## Current Situation

### Setup
- **SMS Provider:** SMS Broadcast
- **Backend:** Django REST Framework
- **Frontend:** Next.js/React
- **Local Development:** Cloudflare Tunnel for public webhook access

### Message Flow
1. User sends SMS from our app → **TestV7** sent at **2:49 PM**
2. SMS Broadcast confirms delivery → Status shows **"Delivered"**
3. User replies from phone → **"Reply test seven"** received at **2:50 PM**
4. SMS Broadcast should call our webhook → **Not arriving in our database**

### What's Working
- ✅ SMS sending works perfectly
- ✅ Delivery receipts (DLR) are working
- ✅ Messages show as "Delivered" in SMS Broadcast dashboard
- ✅ Replies appear in SMS Broadcast dashboard ("Reply test seven" visible)

### What's NOT Working
- ❌ Inbound message webhooks are not being called
- ❌ Replies are not appearing in our database
- ❌ Frontend shows "0 replies" even though replies exist

## Technical Implementation

### Webhook Endpoint
```
POST/GET /api/sms/webhook/inbound/
```

### Webhook Configuration
- **URL:** `https://assets-speak-appreciate-schema.trycloudflare.com/api/sms/webhook/inbound/?secret=SECRET_TOKEN`
- **Method:** Both GET and POST supported
- **Security:** Secret token in query parameter
- **Status:** Webhook is configured in SMS Broadcast dashboard

### Code Structure

#### Backend (Django)
```python
@csrf_exempt
@api_view(['GET', 'POST'])
def sms_inbound(request):
    """
    Webhook endpoint for inbound SMS messages from SMS Broadcast
    
    Expected parameters:
    - GET /api/sms/webhook/inbound/?to=614...&from=614...&message=TEXT&secret=TOKEN
    """
    # Validates secret token
    # Extracts: to_number, from_number, message_text
    # Saves to SMSInbound model
    # Returns 'OK'
```

#### Frontend (React)
- Auto-refreshes replies every 5 seconds
- Filters replies by `received_at >= message.sent_at`
- Displays replies in modal when clicking message row

### Webhook Logging
We've added comprehensive logging:
```python
print(f"[SMS Webhook] Inbound webhook called")
print(f"  Method: {request.method}")
print(f"  Query Params: {dict(request.GET)}")
print(f"  POST Body: {request.body}")
```

**Result:** No webhook calls appearing in Django logs at all.

## Questions for ChatGPT

1. **Why might SMS Broadcast not be calling our webhook?**
   - The reply appears in SMS Broadcast dashboard
   - Webhook URL is configured correctly
   - Cloudflare Tunnel is running and accessible
   - Webhook endpoint responds correctly to manual tests

2. **What format does SMS Broadcast use for inbound webhooks?**
   - Do they use GET or POST?
   - What are the exact parameter names? (`from`, `to`, `message`?)
   - Do they include the secret token?
   - Do they send any special headers?

3. **Are there common configuration issues with SMS Broadcast webhooks?**
   - Should the webhook URL be in a specific format?
   - Does SMS Broadcast require HTTPS?
   - Are there delays in webhook delivery?
   - Do we need to whitelist our server IP?

4. **Best practices for debugging SMS webhook issues:**
   - How to verify SMS Broadcast is actually calling the webhook?
   - Should we check SMS Broadcast webhook logs/dashboard?
   - Are there webhook testing tools we should use?

5. **Alternative approaches:**
   - Should we poll SMS Broadcast API for replies instead?
   - Is there a webhook status endpoint we can check?
   - Can we manually trigger a webhook test from SMS Broadcast?

## Current Evidence

### From SMS Broadcast Dashboard
- **Outbound:** TestV7 sent 2:49 PM → Delivered ✅
- **Inbound:** "Reply test seven" received 2:50 PM → Visible in dashboard ✅
- **Webhook:** No indication of webhook call status

### From Our System
- **Database:** No SMSInbound records for replies after TestV7
- **Django Logs:** No `[SMS Webhook]` entries for inbound messages
- **Webhook Endpoint:** Responds correctly to manual curl tests
- **Auto-refresh:** Working (checks every 5 seconds, finds 0 replies correctly)

## What We've Tried

1. ✅ Verified webhook URL format
2. ✅ Confirmed Cloudflare Tunnel is accessible
3. ✅ Tested webhook endpoint manually (works)
4. ✅ Added comprehensive logging
5. ✅ Verified secret token is correct
6. ✅ Checked Django server is running
7. ❌ **NOT tried:** Check SMS Broadcast webhook logs/dashboard for errors

## Request for ChatGPT

Please provide:
1. Common reasons SMS Broadcast webhooks fail
2. How to verify SMS Broadcast is actually calling the webhook
3. The exact webhook format/parameters SMS Broadcast uses
4. Debugging steps specific to SMS Broadcast
5. Best practices for webhook reliability

## Environment
- **Django:** 4.2.25
- **Development:** Local with Cloudflare Tunnel
- **SMS Provider:** SMS Broadcast
- **Timezone:** Australia/Sydney (AEST/AEDT)

