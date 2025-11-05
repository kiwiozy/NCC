# SMS Integration

**Status:** ✅ Production Ready  
**Last Updated:** November 2025

---

## 📋 **Overview**

SMS integration provides SMS sending via SMS Broadcast API. Send individual messages or bulk broadcasts with template support and delivery webhooks.

---

## 🎯 **Features**

- ✅ Send individual SMS
- ✅ Bulk SMS broadcasts
- ✅ Message templates
- ✅ Delivery status webhooks
- ✅ Sender ID customization
- ✅ Character count and message splitting

---

## 🛠 **Implementation**

### **Backend**
- **App:** `backend/sms_integration/`
- **Models:** `SMSMessage` (tracks sent messages and delivery status)
- **Service:** `SMSService` (singleton, handles API calls)
- **Views:** Send SMS, webhook handler, message history

### **Frontend**
- **Component:** `frontend/app/components/settings/SMSIntegration.tsx`
- **Features:** Send test SMS, configure settings, view message history

### **API Endpoints**
- `POST /api/sms/send/` - Send SMS
- `POST /api/sms/send-bulk/` - Send bulk SMS
- `POST /api/sms/webhook/` - Delivery status webhook
- `GET /api/sms/messages/` - Message history

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
   - Endpoint: `https://your-domain.com/api/sms/webhook/`

---

## 📚 **Full Documentation**

Detailed setup guides and implementation docs are archived in:
`docs/archive/legacy-integrations/SMS Integration/`

**Key Files:**
- `SMS_INTEGRATION_COMPLETE.md` - Full implementation summary
- `SMS_WEBHOOK_SETUP_GUIDE.md` - Webhook configuration
- `NGROK_SETUP.md` - Local webhook testing

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

---

**Status:** ✅ Working in production, no known issues

