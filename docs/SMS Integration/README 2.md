# 📱 SMS Integration Documentation

Complete documentation for SMS Broadcast integration in WalkEasy Nexus.

---

## 📚 Documentation Files

### 1. **[SMS_INTEGRATION_COMPLETE.md](./SMS_INTEGRATION_COMPLETE.md)** ⭐ **START HERE**
   - **Status:** ✅ Complete & Ready for Testing
   - Complete SMS integration guide
   - Backend API endpoints
   - Frontend UI overview
   - 3 default SMS templates
   - Testing instructions
   - SMS Broadcast API setup

### 2. **[SMS_End_to_End_Integration.md](./SMS_End_to_End_Integration.md)** 📋 **TECHNICAL SPEC**
   - End-to-end architecture
   - SMS Broadcast API integration
   - Database models (SMSTemplate, SMSMessage, SMSInbound)
   - Message flow diagrams
   - Webhook integration for inbound SMS
   - Error handling and retry logic

---

## 🎯 Quick Start

### **Access SMS Features**

1. Navigate to: `http://localhost:3000/settings`
2. Click the **"SMS"** tab
3. Browse tabs:
   - 📱 **Send SMS** - Send custom messages
   - 📜 **History** - View sent messages
   - 📝 **Templates** - Browse templates
   - ⚙️ **Setup** - Configuration

### **Backend API Endpoints**

```python
# SMS Operations
GET  /api/sms/templates/                      # List SMS templates
GET  /api/sms/messages/                       # List sent messages
POST /api/sms/messages/send/                  # Send custom SMS
POST /api/sms/messages/send_from_template/    # Send from template
GET  /api/sms/balance/                        # Check credit balance

# Appointment Integration
POST /api/sms/appointment/<id>/reminder/      # Send appointment reminder
```

---

## 📱 SMS Provider: SMS Broadcast

### **Configuration**

Create `.env` file in backend:
```bash
# SMS Broadcast API Configuration
SMS_BROADCAST_USERNAME=your_username
SMS_BROADCAST_PASSWORD=your_password
SMS_BROADCAST_FROM=WalkEasy  # Sender ID (11 chars max)
SMS_BROADCAST_SANDBOX=True   # Set False for production
```

### **API Details**
- **Provider:** SMS Broadcast (smsbroadcast.com.au)
- **Base URL:** `https://api.smsbroadcast.com.au/api.php`
- **Sandbox Mode:** Available for testing
- **Supported Features:**
  - Send SMS
  - Check balance
  - Delivery reports
  - Inbound SMS webhooks

---

## 🗄️ Database Models

### **1. SMSTemplate**
```python
class SMSTemplate(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    message_template = models.TextField()
    variables = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
```

**Default Templates:**
- **Appointment Reminder** - Variables: `{patient_name}`, `{appointment_date}`, `{appointment_time}`, `{clinician_name}`
- **Appointment Confirmation** - Variables: `{patient_name}`, `{appointment_date}`, `{appointment_time}`
- **Test Message** - Variables: `{name}`

### **2. SMSMessage**
```python
class SMSMessage(models.Model):
    phone_number = models.CharField(max_length=15)
    message = models.TextField()
    status = models.CharField(max_length=20)  # sent, failed, pending
    sent_at = models.DateTimeField()
    delivered_at = models.DateTimeField(null=True)
    cost = models.DecimalField()
    sms_broadcast_id = models.CharField(max_length=100)
```

### **3. SMSInbound**
```python
class SMSInbound(models.Model):
    from_number = models.CharField(max_length=15)
    message = models.TextField()
    received_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)
```

---

## ✅ Features Implemented

### **Backend (Django)**
- ✅ **3 Database Models** - Templates, Messages, Inbound
- ✅ **SMS Service** - Full SMS Broadcast API integration
- ✅ **8 API Endpoints** - Send, templates, history, balance
- ✅ **Admin Interface** - Manage messages and templates
- ✅ **Default Templates** - 3 pre-configured templates
- ✅ **Appointment Integration** - Send reminders automatically
- ✅ **Error Handling** - Retry logic and status tracking

### **Frontend (Next.js)**
- ✅ **SMS UI** - Beautiful tabbed interface
- ✅ **Send SMS Tab** - Send custom messages
- ✅ **History Tab** - View sent messages with status
- ✅ **Templates Tab** - Browse and use templates
- ✅ **Setup Tab** - Configuration instructions
- ✅ **Real-time Updates** - Refresh message status

---

## 🧪 Testing

### **1. Check Balance**
```bash
curl https://localhost:8000/api/sms/balance/ -k
```

Expected response:
```json
{
  "balance": 100.50,
  "currency": "AUD"
}
```

### **2. Send Test SMS**
```bash
curl -X POST https://localhost:8000/api/sms/messages/send/ \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+61400000000",
    "message": "Test message from WalkEasy Nexus"
  }' \
  -k
```

### **3. Send from Template**
```bash
curl -X POST https://localhost:8000/api/sms/messages/send_from_template/ \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": 1,
    "phone_number": "+61400000000",
    "variables": {
      "patient_name": "John Doe",
      "appointment_date": "Nov 15, 2025",
      "appointment_time": "2:00 PM",
      "clinician_name": "Dr. Smith"
    }
  }' \
  -k
```

---

## 📋 SMS Templates

### **Template Variables**

Templates use `{variable_name}` syntax:

```
Hi {patient_name}! Reminder: You have an appointment on {appointment_date} at {appointment_time} with {clinician_name}. Reply CONFIRM to confirm.
```

**Available Variables:**
- `{patient_name}` - Patient's full name
- `{appointment_date}` - Appointment date
- `{appointment_time}` - Appointment time
- `{clinician_name}` - Clinician's name
- `{clinic_name}` - Clinic name
- `{clinic_phone}` - Clinic phone number

---

## 🔔 Appointment Reminders

### **Automatic Reminders**

Send appointment reminders:
```python
POST /api/sms/appointment/{appointment_id}/reminder/
```

**Reminder Schedule:**
- 24 hours before appointment
- 2 hours before appointment (optional)

---

## 💰 Costs

### **SMS Broadcast Pricing** (Australia)
- **Local SMS:** ~$0.07 per message
- **Mobile SMS:** ~$0.10 per message
- **International:** Varies by country

### **Character Limits**
- **Single SMS:** 160 characters
- **Concatenated SMS:** 153 characters per part
- **Maximum:** 5 parts (765 characters)

---

## 🔒 Security

- ✅ **API Credentials** - Stored securely in environment variables
- ✅ **Phone Validation** - E.164 format validation
- ✅ **Rate Limiting** - Prevent abuse
- ✅ **Sandbox Mode** - Test without sending real SMS
- ✅ **Audit Logging** - Track all SMS sent
- ✅ **GDPR Compliance** - Store minimal data

---

## 🐛 Troubleshooting

### **Common Issues**

1. **"Invalid credentials"**
   - Check `SMS_BROADCAST_USERNAME` and `SMS_BROADCAST_PASSWORD` in `.env`

2. **"Insufficient balance"**
   - Top up your SMS Broadcast account
   - Check balance: `GET /api/sms/balance/`

3. **"Invalid phone number"**
   - Use E.164 format: `+61400000000`
   - Include country code (+61 for Australia)

4. **"Message not sent"**
   - Check Django logs for errors
   - Verify SMS_BROADCAST_SANDBOX setting
   - Check API credentials

---

## 📞 Support

For SMS integration issues:
1. Check `SMS_INTEGRATION_COMPLETE.md` for setup details
2. Review `SMS_End_to_End_Integration.md` for technical architecture
3. Verify SMS Broadcast credentials
4. Check Django admin for message status
5. Review Django logs for errors

---

**Last Updated:** October 30, 2025  
**Version:** 1.0  
**Status:** ✅ Complete & Ready for Testing

