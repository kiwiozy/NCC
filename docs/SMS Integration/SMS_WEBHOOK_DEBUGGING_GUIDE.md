# SMS Webhook Implementation – Debugging Guide for Developers

## Context

Walk Easy's practice management system uses **SMS Broadcast** for patient messaging. Outbound SMS and delivery receipts work correctly, but **inbound (reply) messages** are not appearing in the database. This guide documents the technical setup, known issues, and how to resolve them.

---

## 1. Current Setup

- **Provider:** SMS Broadcast  
- **Backend:** Django REST Framework  
- **Frontend:** Next.js / React  
- **Dev Environment:** Cloudflare Tunnel (for public webhook access)  

### Message Flow

1. App sends SMS (works ✅)  
2. SMS Broadcast confirms delivery (works ✅)  
3. Patient replies to SMS ("Reply test seven")  
4. SMS Broadcast shows reply in dashboard (works ✅)  
5. Webhook not triggered → no record in Django logs or database (❌)

---

## 2. Likely Causes of Webhook Failure

1. **Wrong event selected in SMS Broadcast**
   - Must be **"SMS – Receive an SMS"** event, not "Message delivered."

2. **No parameters configured in webhook content**
   - SMS Broadcast doesn't auto-include `from`, `to`, `message`.  
   - You must add them manually under "Content."

3. **Method mismatch**
   - If webhook uses POST (JSON body) but Django only checks `request.GET`, you'll see no logs.

4. **Webhook bound to wrong account or shared number**
   - Ensure it's active for the correct sender ID / virtual number.

5. **Cloudflare tunnel not accepted**
   - Some providers block long subdomains or temporary URLs.  
   - Test with `https://webhook.site` to confirm reachability.

6. **Inbound webhooks disabled for the account**
   - SMS Broadcast sometimes must enable inbound (MO) webhooks manually.

---

## 3. Expected Webhook Formats

### A. URL-Encoded (GET)

```
https://your-domain.com/api/sms/webhook/inbound/?secret=SECRET_TOKEN
  &from=%2B614...
  &to=614...
  &message=Reply%20test%20seven
  &ref=(1234)
  &msgref=(9876543)
```

**Content configuration required:**

```
from = $esc.url($!sourceAddress)
to = $!esc.url($destinationAddress)
message = $esc.url($moContent)
ref = $!esc.url($!metadata.apiClientRef)
msgref = $!esc.url($!metadata.apiSmsRef)
```

### B. JSON (POST)

```json
{
  "from": "+61400000000",
  "to": "",
  "message": "Reply 8",
  "ref": "12145",
  "msgref": "971235068"
}
```

Secret token stays in URL: `?secret=SECRET_TOKEN`

### C. Legacy Format

```
to=614...&from=614...&message=Hello%20World&ref=abc123
```

---

## 4. Debugging Steps

1. **Test with webhook.site**
   - Replace your Django URL with a webhook.site URL and check incoming data.

2. **Verify event selection**
   - Confirm "Event: SMS – Receive an SMS" in the SMS Broadcast dashboard.

3. **Switch to GET (URL-encoded) for easier debugging.**

4. **Add dummy header**
   - e.g. `X-SMSB-Origin: inbound`

5. **Check all logs**
   - Log both `request.GET` and `request.body` in Django.

6. **Contact SMS Broadcast Support**
   - Provide timestamps and your URL to confirm delivery attempts.

---

## 5. Django Webhook Example (Handles Both GET & POST)

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.timezone import now

SECRET = "SECRET_TOKEN"

@csrf_exempt
@api_view(["GET", "POST"])
def sms_inbound(request):
    if request.GET.get("secret") != SECRET:
        return Response({"detail": "forbidden"}, status=403)

    data = request.GET if request.method == "GET" else request.data
    
    from_number = data.get("from")
    to_number = data.get("to")
    message_text = data.get("message")
    client_ref = data.get("ref")
    provider_ref = data.get("msgref") or data.get("smsref")

    # Save message
    # SMSInbound.objects.create(...)
    
    return Response({"status": "ok", "received_at": now().isoformat()})
```

---

## 6. Polling Alternative (If Webhook Fails)

Use SMS Broadcast's "Inbox" API endpoint to poll replies every 30–60 seconds:

1. Call `action=inbox` on their API.
2. Save new replies to DB.
3. Mark processed messages.

---

## 7. Developer Checklist

1. ✅ Verify "Receive an SMS" event type.  
2. ✅ Include all 5 content parameters.  
3. ✅ Use a reachable, HTTPS URL.  
4. ✅ Test via webhook.site first.  
5. ✅ Confirm with SMS Broadcast support if webhook not firing.  

---

## 8. References

- [SMS Broadcast Webhook Docs](https://help.smsbroadcast.com.au/hc/en-au/articles/211861763-Webhook-Examples)  
- [Inbound SMS Setup Guide](https://help.smsbroadcast.com.au/hc/en-au/articles/211861763-Webhook-Examples)  
- [SMS Broadcast Support - Webhooks](https://support.smsbroadcast.com.au/hc/en-us/articles/4412009239183-Webhooks)
- [Webhook.site (testing tool)](https://webhook.site/)  

---

**Author:** Walk Easy Technical Team  
**Date:** 2025-11-03  
**Purpose:** Debug and implement inbound SMS webhooks with SMS Broadcast

