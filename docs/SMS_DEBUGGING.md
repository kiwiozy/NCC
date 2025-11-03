# SMS Debugging Guide

## Current Status
- ✅ SMS Broadcast credentials configured
- ✅ Account balance: $1553.00 AUD (sufficient credits)
- ✅ Messages showing as "sent" in database
- ⚠️ Delivery receipts (DLR) not implemented

## Issue: Messages Not Received

### Possible Causes

1. **Phone Number Format Issues**
   - SMS Broadcast requires: `614XXXXXXXX` (no +, no spaces)
   - Our system formats: `+61412345678` → `61412345678`
   - Check the formatted number in logs

2. **Sender ID Not Approved**
   - Default sender ID: "Walk Easy" (max 11 chars)
   - SMS Broadcast may require approval for custom sender IDs
   - Try using a verified number instead

3. **Message Content Issues**
   - Certain keywords may be blocked
   - Special characters may cause issues
   - Message too long (should be < 480 chars with maxsplit=10)

4. **Delivery Receipts Not Tracked**
   - Current status: "sent" means SMS Broadcast accepted it
   - Actual delivery status requires DLR webhook
   - Messages may be delivered but status not updated

5. **Network/Carrier Issues**
   - Phone number may be on a blocked network
   - Carrier may be filtering messages
   - Phone may have DND (Do Not Disturb) enabled

## Debugging Steps

### 1. Check Backend Logs
Look for `[SMS Service]` entries in Django console:
```bash
# Should see:
[SMS Service] API Response: OK: 61487000872: 1228270006
[SMS Service] Phone: 61487000872, Message: Hi...
[SMS Service] ✓ Message accepted. External ID: 1228270006
```

### 2. Verify Phone Number Format
```python
# In Django shell
from sms_integration.services import sms_service
formatted = sms_service._format_phone_number("+61487000872")
print(formatted)  # Should be: 61487000872
```

### 3. Check SMS Broadcast Dashboard
- Log into https://www.smsbroadcast.com.au/
- Check "Sent Messages" section
- Look for message status (Accepted, Delivered, Failed)
- Check if sender ID is approved

### 4. Test with Simple Message
Try sending a very simple message:
```
Test 123
```
To verify it's not a content issue.

### 5. Check Sender ID
The sender ID "Walk Easy" may need approval. In SMS Broadcast:
- Settings → Sender IDs
- Verify "Walk Easy" is approved
- Or use a verified phone number format

## Next Steps

### Immediate
1. ✅ Added enhanced logging to see exact API responses
2. ✅ Improved phone number formatting with logging
3. ⏳ Check Django server logs when sending SMS
4. ⏳ Verify sender ID in SMS Broadcast dashboard

### Future Improvements
1. **Add Delivery Receipt Webhook**
   - SMS Broadcast can call our endpoint on delivery
   - Update message status from "sent" → "delivered"
   - Track delivery failures

2. **Message Status Query**
   - Periodic check of message status via API
   - Update status in database

3. **Better Error Messages**
   - Show specific error codes from SMS Broadcast
   - Guide users on how to fix issues

4. **Sender ID Management**
   - UI to manage/verify sender IDs
   - Fallback to verified number if custom ID fails

## Common Error Codes

From SMS Broadcast API:
- `BAD: 1: Invalid username or password`
- `ERROR: 2: Insufficient credits`
- `ERROR: 3: Invalid phone number`
- `ERROR: 4: Invalid message content`
- `ERROR: 5: Sender ID not approved`

## Testing Checklist

- [ ] Check Django logs for `[SMS Service]` entries
- [ ] Verify phone number format in logs
- [ ] Confirm message appears in SMS Broadcast dashboard
- [ ] Check sender ID approval status
- [ ] Try sending to different phone number
- [ ] Try sending simple test message
- [ ] Check SMS Broadcast message status (if dashboard available)

