# SMS Troubleshooting - Message Sent But Not Received

## Current Status
✅ **Message accepted by SMS Broadcast**
- External Message ID: `1228270573`
- Status: `sent`
- No errors in our system
- Phone: `61487000872`
- Message: "Testing..."

## Why "Sent" Doesn't Mean "Delivered"

The status "sent" means SMS Broadcast **accepted** the message, not that it was delivered. Common reasons messages aren't received:

### 1. **Sender ID Not Approved** (Most Likely)
- **Current Sender ID:** "Walk Easy"
- **Issue:** Custom sender IDs require approval in SMS Broadcast
- **Solution:** 
  1. Log into https://www.smsbroadcast.com.au/
  2. Go to Settings → Sender IDs
  3. Verify "Walk Easy" is approved
  4. If not approved, use a verified phone number instead

### 2. **Phone Number Format**
- **Current Format:** `61487000872` ✓ (Correct format)
- **Verified:** Number is formatted correctly

### 3. **Carrier/Network Issues**
- Phone carrier may be filtering messages
- Network congestion
- Phone might have DND (Do Not Disturb) enabled
- **Solution:** Try sending to a different phone number

### 4. **Message Content Filtering**
- Certain keywords might be filtered
- "Testing..." is simple, unlikely to be filtered
- **Solution:** Try an even simpler message like "Hello"

## How to Check Actual Delivery Status

### Option 1: SMS Broadcast Dashboard (BEST)
1. Log into https://www.smsbroadcast.com.au/
2. Go to "Messages" or "Sent Messages"
3. Find message ID: `1228270573`
4. Check delivery status:
   - ✅ **Delivered** - Message reached recipient
   - ⚠️ **Pending** - Still in transit
   - ❌ **Failed** - Delivery failed (check reason)

### Option 2: Check Logs
The Django console should show:
```
[SMS Service] API Response: OK: 61487000872: 1228270573
[SMS Service] Phone: 61487000872, Message: Testing...
[SMS Service] ✓ Message accepted. External ID: 1228270573
```

## Quick Fixes to Try

### Fix 1: Use Verified Number Instead of Custom Sender ID
Edit `backend/.env`:
```env
# Try using a verified phone number instead
SMSB_SENDER_ID=61400123456  # Use your verified number
# OR remove 'from' parameter to use default
```

### Fix 2: Test with Different Phone Number
Send to another phone number to rule out carrier issues.

### Fix 3: Check SMS Broadcast Account
1. Verify account is active
2. Check for any account restrictions
3. Verify sender ID approval status

## Next Steps

1. **Check SMS Broadcast Dashboard** - Most important step
   - See actual delivery status
   - Check if sender ID is approved
   
2. **Try Verified Number** - If sender ID not approved
   - Use your verified phone number as sender ID
   
3. **Test Another Number** - Rule out carrier issues
   - Send to a different phone number
   
4. **Implement Delivery Receipts** - Future improvement
   - Add webhook for delivery confirmations
   - Update status from "sent" → "delivered"

## Understanding SMS Broadcast Response

When we send, SMS Broadcast responds with:
```
OK: {phone_number}: {message_id}
```

This means:
- ✅ **OK** - Message accepted by SMS Broadcast
- ❓ **Not Confirmed** - We don't know if it was delivered

To get delivery confirmation, we need:
1. Delivery receipt webhook (DLR)
2. Or query API for status

## Immediate Actions

1. **Log into SMS Broadcast dashboard** ← Do this first!
2. Check message status for ID: `1228270573`
3. Check sender ID approval status
4. If not delivered, check the error reason shown in dashboard

