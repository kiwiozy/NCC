# SMS Sender ID Fix - Messages Being Rejected

## Problem Identified

All SMS messages are showing **"Rejected"** status in SMS Broadcast dashboard, even though:
- ✅ API returns "OK" (message accepted for processing)
- ✅ We save status as "sent" in database
- ❌ SMS Broadcast rejects before delivery

## Root Cause

**Sender ID "WalkEasy" / "Walk Easy" is NOT APPROVED** in SMS Broadcast.

When using an unapproved sender ID:
1. API accepts the request (returns OK)
2. SMS Broadcast checks sender ID approval
3. **Rejects message** if sender ID not approved
4. Message never reaches recipient

## Solution

### Option 1: Use Verified Phone Number (RECOMMENDED - IMMEDIATE FIX)

Update `backend/.env`:
```env
# Use your verified SMS Broadcast phone number
SMSB_SENDER_ID=61400123456  # Replace with your verified number from SMS Broadcast
```

**Steps:**
1. Log into SMS Broadcast dashboard
2. Go to Settings → Numbers or Verified Senders
3. Find your verified phone number (format: 614XXXXXXXX)
4. Use that number as `SMSB_SENDER_ID`
5. Restart Django server

### Option 2: Remove Sender ID (Use Account Default)

Update `backend/.env`:
```env
# Comment out or remove sender ID to use account default
# SMSB_SENDER_ID=
```

**OR** leave it empty:
```env
SMSB_SENDER_ID=
```

This will use SMS Broadcast's default sender (usually your account number).

### Option 3: Request Approval for "Walk Easy" (FUTURE)

1. Log into SMS Broadcast dashboard
2. Go to Settings → Sender IDs
3. Request approval for "Walk Easy" or "WalkEasy"
4. Wait for approval (can take 1-3 business days)
5. Once approved, you can use the custom sender ID

## Code Changes Made

✅ **Updated `backend/sms_integration/services.py`:**
- Sender ID is now optional
- If not set, SMS Broadcast uses account default
- Added warning logs when sender ID not configured
- Only sends `from` parameter if sender ID is provided

## Testing After Fix

1. **Set verified sender ID in `.env`**
2. **Restart Django server:**
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py runserver 8000
   ```
3. **Send test SMS** from the frontend
4. **Check SMS Broadcast dashboard:**
   - Status should change from "Rejected" to "Delivered" or "Pending"
   - Message should reach recipient

## Quick Fix Commands

```bash
# Option 1: Use verified number (replace with your number)
echo 'SMSB_SENDER_ID=61400123456' >> backend/.env

# Option 2: Remove sender ID (use default)
sed -i '' '/^SMSB_SENDER_ID=/d' backend/.env

# Then restart Django
# (Find the process and restart it)
```

## Verification

After applying the fix, check:
1. ✅ Messages show "Pending" or "Delivered" instead of "Rejected"
2. ✅ Recipient actually receives the message
3. ✅ Django logs show sender ID being used correctly

## Why This Happens

SMS providers (including SMS Broadcast) require:
- **Custom alphanumeric sender IDs** (like "Walk Easy") to be pre-approved
- **Phone number sender IDs** (like "61400123456") must be verified on your account

Unapproved sender IDs are automatically rejected for security and compliance reasons (to prevent spoofing and spam).

