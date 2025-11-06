# SMS Integration

**Status:** ✅ Production Ready  
**Last Updated:** November 2025

---

## 📋 **Overview**

SMS integration provides SMS sending via SMS Broadcast API. Send individual messages or bulk broadcasts with template support, delivery webhooks, and patient-specific SMS conversations.

---

## 🎯 **Features**

- ✅ Send individual SMS
- ✅ Bulk SMS broadcasts
- ✅ Message templates
- ✅ Delivery status webhooks
- ✅ Inbound message webhooks
- ✅ Sender ID customization
- ✅ Character count and message splitting
- ✅ **Patient SMS conversations** - View unified message threads for each patient
- ✅ **Multi-phone support** - Send to any phone number in patient's communication list
- ✅ **Auto-refresh** - Check for new messages without full dialog reload

---

## 🛠 **Implementation**

### **Backend**
- **App:** `backend/sms_integration/`
- **Models:** 
  - `SMSMessage` - Tracks sent messages and delivery status
  - `SMSInbound` - Tracks received messages from patients
  - `SMSTemplate` - Reusable message templates
- **Service:** `SMSService` (singleton, handles API calls)
- **Views:** 
  - `views.py` - Standard SMS endpoints
  - `patient_views.py` - Patient-specific SMS endpoints
  - `webhook_views.py` - Webhook handlers for inbound messages

### **Frontend**
- **Settings:** `frontend/app/components/settings/SMSIntegration.tsx`
- **Patient SMS:** `frontend/app/components/dialogs/SMSDialog.tsx`
- **Features:** 
  - Send test SMS
  - Configure settings
  - View message history
  - Patient conversation threads
  - Template selection
  - Character counter with SMS segment calculation

### **API Endpoints**

#### **Standard SMS**
- `POST /api/sms/send/` - Send SMS
- `POST /api/sms/send-bulk/` - Send bulk SMS
- `GET /api/sms/messages/` - Message history

#### **Patient SMS**
- `GET /api/sms/patient/{patient_id}/conversation/` - Get full conversation thread
- `GET /api/sms/patient/{patient_id}/phones/` - Get available phone numbers
- `POST /api/sms/patient/{patient_id}/send/` - Send SMS from patient context

#### **Webhooks**
- `POST /api/sms/webhook/dlr/` - Delivery status webhook
- `POST /api/sms/webhook/inbound/` - Inbound message webhook

---

## 🔑 **Setup Requirements**

1. **SMS Broadcast Account:**
   - Sign up at https://www.smsbroadcast.com.au/
   - Get API credentials
   - Configure webhook URL (optional, for delivery status)

2. **Environment Variables:**
   ```bash
   SMS_BROADCAST_USERNAME=your_username
   SMS_BROADCAST_PASSWORD=your_password
   SMS_SENDER_ID=YourSenderID  # Optional, default: "WalkEasy"
   ```

3. **Webhook Setup (Optional):**
   - Use ngrok for local development: `ngrok http 8000`
   - Set webhook URL in SMS Broadcast dashboard
   - DLR Endpoint: `https://your-domain.com/api/sms/webhook/dlr/`
   - Inbound Endpoint: `https://your-domain.com/api/sms/webhook/inbound/`

---

## 💬 **Patient SMS Feature**

### **How It Works**

1. **Unified Conversation Thread:**
   - All SMS messages to/from a patient are displayed in a single thread
   - Sent messages appear on the right (blue)
   - Received messages appear on the left (gray)
   - Timestamps and delivery status shown for each message

2. **Multi-Phone Support:**
   - Send to any phone number in patient's communication list
   - Dropdown shows all available numbers (Mobile, Phone, Emergency contacts)
   - Default mobile is pre-selected
   - Phone number label shown in message bubble if different from default

3. **Smart Refresh:**
   - Manual refresh button checks for new messages
   - Polls for new messages every 10 seconds (doesn't reload entire dialog)
   - Only appends new messages to avoid flickering
   - Auto-scrolls to bottom when new messages arrive

4. **Template Support:**
   - Select from pre-configured templates
   - Templates auto-populate with patient name
   - Character counter shows SMS segments

5. **Authentication Required:**
   - All patient SMS endpoints require user authentication
   - Uses session-based authentication (cookies + CSRF tokens)

---

## 🔒 **Security**

### **CSRF Protection**
Patient SMS endpoints use Django REST Framework's `SessionAuthentication`, which requires CSRF tokens:

```typescript
// Frontend gets CSRF token from cookies or API
const csrfToken = await getCsrfToken();

// Include in POST requests
headers: {
  'Content-Type': 'application/json',
  'X-CSRFToken': csrfToken
}
```

### **Session Credentials**
All patient SMS requests must include session cookies:

```typescript
fetch(url, {
  credentials: 'include',  // Send session cookies
  // ...
})
```

---

## 🐛 **Troubleshooting**

### **"Invalid credentials" error**
- Check username and password are correct
- Test credentials in SMS Broadcast dashboard

### **"Invalid sender ID" error**
- Sender ID must be 11 characters or less
- No special characters allowed
- Pre-approved sender IDs work immediately

### **Webhook not receiving events**
- Check ngrok is running (for local dev)
- Verify webhook URL is publicly accessible
- Check SMS Broadcast dashboard for webhook status

### **Messages not sending**
- Check account balance in SMS Broadcast
- Verify phone number format: `+61412345678` (international)
- Check message length (160 chars = 1 credit)

### **403 Forbidden on patient SMS**
- Ensure user is authenticated (check `/api/auth/user/`)
- Frontend must include `credentials: 'include'` in fetch calls
- CSRF token must be included in `X-CSRFToken` header for POST requests
- Backend CSRF token endpoint: `GET /api/auth/csrf-token/`

### **"'SMSMessage' object has no attribute 'get'" error**
- **Cause:** Django REST Framework serializers return `ReturnDict` objects, not regular Python dicts
- **Fix:** Convert to regular dict: `dict(serializer.data.items())`
- **Also affects:** Results from `SMSService.send_sms()` might return model instances instead of dicts
- **Solution:** Always check instance type and convert before calling `.get()`:

```python
# Convert ReturnDict to regular dict
response_data = dict(serializer.data.items())

# Check if result is model instance
if isinstance(result, SMSMessage):
    result = {
        'success': result.status == 'sent',
        'message_id': result.external_message_id,
        # ...
    }
```

### **Patient not found when replying to SMS**
- Inbound webhook searches for patient by phone number
- Checks: `contact_json.mobile`, `contact_json.phone`, `emergency_json` contacts
- Phone numbers normalized: strips spaces, +, leading 0, adds country code (61)
- If no match: message saved but not linked to patient
- Check patient has correct phone number in communication section

---

## 📚 **Full Documentation**

Detailed setup guides and implementation docs are in:
- `docs/SMS Integration/` - Current documentation
- `docs/archive/legacy-integrations/SMS Integration/` - Legacy docs

**Key Files:**
- `SMS_WEBHOOKS_SETUP.md` - Webhook configuration (DLR + Inbound)
- `SMS_INTEGRATION_COMPLETE.md` - Full implementation summary

---

**Status:** ✅ Working in production
**Recent Fixes:** 
- Fixed CSRF token handling for patient SMS (Nov 2025)
- Fixed ReturnDict serialization issue (Nov 2025)
- Added smart message refresh to avoid dialog reload (Nov 2025)

