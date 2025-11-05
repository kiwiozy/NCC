# SMS Webhooks Setup Guide

## ✅ Implementation Complete

Both delivery receipts (DLR) and inbound message webhooks have been implemented.

## Webhook Endpoints

### 1. Delivery Receipt (DLR)
**URL:** `http://your-domain.com/api/sms/webhook/dlr/`

**Called by SMS Broadcast when:** Message delivery status changes (Delivered, Failed, etc.)

**Parameters (GET):**
- `smsref` - SMS Broadcast message ID
- `ref` - Our internal message UUID (from `SMSMessage.id`)
- `status` - Delivery status (Delivered, Failed, Rejected, etc.)
- `to` - Recipient phone number

**What it does:**
- Updates `SMSMessage.status` from "sent" → "delivered" or "failed"
- Records `delivered_at` timestamp
- Logs delivery status

**Example:**
```
GET /api/sms/webhook/dlr?smsref=1228270573&ref=4a829655-f995-46b5-a073-72a1f35f63f3&status=Delivered&to=61487000872
```

### 2. Inbound Messages
**URL:** `http://your-domain.com/api/sms/webhook/inbound/`

**Called by SMS Broadcast when:** We receive a reply from a patient

**Parameters (GET):**
- `from` - Sender phone number
- `to` - Our number that received the message
- `message` - Message content
- `ref` - Optional reference from original outbound message
- `smsref` - SMS Broadcast message ID

**What it does:**
- Creates `SMSInbound` record
- Attempts to match sender to `Patient` by phone number
- Auto-detects simple replies (YES/NO/STOP)
- Links to original outbound message if `ref` provided

**Example:**
```
GET /api/sms/webhook/inbound?from=61487000872&to=61488868772&message=YES&ref=4a829655-f995-46b5-a073-72a1f35f63f3
```

## SMS Broadcast Configuration

### Step 1: Get Your Public URL
For development:
- Use ngrok or similar: `ngrok http 8000`
- Or deploy to a public server

For production:
- Use your production domain (e.g., `https://nexus-core-clinic.com`)

### Step 2: Configure in SMS Broadcast Dashboard

1. Log into https://www.smsbroadcast.com.au/
2. Go to **Settings** → **Webhooks** or **API Settings**
3. Configure webhook URLs:

   **Delivery Receipt URL:**
   ```
   http://your-domain.com/api/sms/webhook/dlr/
   ```
   
   **Inbound Message URL:**
   ```
   http://your-domain.com/api/sms/webhook/inbound/
   ```

4. Save settings

### Step 3: Test Webhooks

**Test Delivery Receipt:**
1. Send an SMS from the app
2. Wait for delivery (usually within seconds)
3. Check Django console for: `[SMS Webhook] DLR received...`
4. Check `SMSMessage.status` - should update to "delivered"

**Test Inbound Message:**
1. Send a reply SMS to `61488868772` (your verified number)
2. Check Django console for: `[SMS Webhook] Inbound message...`
3. Check database - new `SMSInbound` record should be created
4. If sender is a patient, it should be automatically matched

## Features

### ✅ Automatic Status Updates
- Messages automatically update from "sent" → "delivered" when delivered
- Failed messages update to "failed" status with error message

### ✅ Patient Matching
- Inbound messages automatically matched to patients by phone number
- Searches in `Patient.contact_json.mobile` field
- Handles multiple phone number formats (614..., 0412..., etc.)

### ✅ Smart Reply Detection
- Auto-detects: YES, NO, STOP replies
- Adds notes to inbound messages
- Ready for appointment confirmation/cancellation logic

### ✅ Error Handling
- Webhooks always return "OK" to prevent retries
- Errors logged but don't break webhook flow
- Graceful handling of missing messages/patients

## Monitoring

### Check Django Console Logs
Look for:
```
[SMS Webhook] DLR received - smsref=..., ref=..., status=...
[SMS Webhook] ✓ Message {id} delivered to {phone}
[SMS Webhook] Inbound message - from=..., to=..., message=...
[SMS Webhook] ✓ Matched to patient: {name}
```

### Check Database

**Delivery Receipts:**
```python
from sms_integration.models import SMSMessage
# Should see delivered messages
SMSMessage.objects.filter(status='delivered')
```

**Inbound Messages:**
```python
from sms_integration.models import SMSInbound
# View received messages
SMSInbound.objects.order_by('-received_at')
```

## Next Steps

1. **Configure SMS Broadcast webhooks** (see Step 2 above)
2. **Test with real SMS** - Send message and verify status updates
3. **Set up ngrok** (for local testing) or deploy to production
4. **Add frontend UI** - Display inbound messages in settings
5. **Implement auto-actions** - Appointment confirmations, etc.

## Troubleshooting

### Webhooks Not Being Called
- Check SMS Broadcast webhook configuration
- Verify URL is publicly accessible
- Check server logs for incoming requests
- Test webhook URL manually: `curl http://your-domain.com/api/sms/webhook/dlr/`

### Messages Not Updating
- Check Django console for webhook logs
- Verify `smsref` matches `SMSMessage.external_message_id`
- Check that messages exist in database before delivery receipt arrives

### Patient Not Matching
- Verify phone number format in `Patient.contact_json.mobile`
- Check webhook logs for phone number normalization
- Patient matching is best-effort, may need manual review

