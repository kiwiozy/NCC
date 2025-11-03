# 📧 Email System Setup Guide

Complete guide for configuring the WalkEasy Nexus email system with Gmail and Apple Mail.

---

## 🎯 **Overview**

The email system allows you to:
- ✉️ **Email AT Reports** directly to recipients
- 📎 **Attach PDF** with professional NDIS branding
- 👥 **Multiple recipients** (To, CC, BCC)
- 💬 **Custom messages** for each email
- ✅ **Test configuration** before sending

**Works with:** Gmail accounts via Apple Mail client

---

## 🔧 **Setup Instructions**

### **Step 1: Enable Gmail App Passwords**

Since you use Apple Mail with Gmail, you need to create an App Password:

1. **Go to Google Account Security:**
   - Visit: https://myaccount.google.com/security
   - Sign in with your clinic Gmail account

2. **Enable 2-Factor Authentication** (if not already enabled):
   - Click "2-Step Verification"
   - Follow the setup wizard

3. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Mac" (or "Other")
   - Click "Generate"
   - **Copy the 16-character password** (you'll need this)

### **Step 2: Configure Backend**

1. **Copy the example environment file:**
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
cp .env.example .env
```

2. **Edit `.env` file:**
```bash
# Email Configuration
EMAIL_HOST_USER=your-clinic-email@gmail.com
EMAIL_HOST_PASSWORD=abcd efgh ijkl mnop  # Your 16-char App Password
EMAIL_FROM=your-clinic-email@gmail.com
EMAIL_FROM_NAME=WalkEasy Nexus

# Gmail SMTP (already configured)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
```

3. **Restart Django server:**
```bash
cd backend
source venv/bin/activate
python manage.py runserver 8000
```

### **Step 3: Test Email Configuration**

Test that emails work before using in production:

```bash
curl -X POST http://localhost:8000/api/ai/test-email/ \
  -H "Content-Type: application/json" \
  -d '{"to_email": "your-email@example.com"}'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Email sent successfully to 1 recipient(s)"
}
```

---

## 📱 **Using the Email Feature**

### **From the Frontend:**

1. **Complete AT Report** (all 5 steps)
2. **Click "Email Report"** button (next to "Generate PDF")
3. **Email Dialog opens:**
   - To: Enter recipient email(s)
   - CC: Optional additional recipients
   - Message: Optional custom message
4. **Click "Send Email"**
5. **Success notification** confirms delivery

### **Recipient Receives:**

- **Professional HTML email** with NDIS branding
- **AT Report PDF attached** (ParticipantName_NDISNumber.pdf)
- **All assessment details** in the attached PDF
- **Clean, professional presentation**

---

## 🎨 **Email Template**

The email includes:

**Header:**
- Purple gradient header (NDIS colors)
- "NDIS AT Assessment Report" title
- WalkEasy Nexus branding

**Body:**
- Participant name and NDIS number
- Your custom message (if provided)
- Checklist of report contents:
  - Participant and plan management details
  - Comprehensive assessment of needs
  - AT recommendations with evidence
  - Implementation and monitoring plan
  - Risk assessment
  - Declarations and consent

**Footer:**
- Contact information
- Confidentiality notice

---

## 🔒 **Security & Privacy**

### **Email Security:**
- ✅ TLS encryption (STARTTLS)
- ✅ App passwords (not your main Gmail password)
- ✅ Secure SMTP connection
- ✅ No passwords stored in code

### **Data Privacy:**
- ✅ Confidential participant information
- ✅ NDIS compliance
- ✅ Professional disclaimers included
- ✅ Only authorized recipients

---

## 🧪 **Testing Guide**

### **1. Test Email Configuration**

```bash
# Test that Gmail SMTP works
curl -X POST http://localhost:8000/api/ai/test-email/ \
  -H "Content-Type: application/json" \
  -d '{"to_email": "your-test-email@example.com"}'
```

### **2. Test AT Report Email**

```bash
# Send a test AT Report email
curl -X POST http://localhost:8000/api/ai/email-at-report/ \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "participant": {
        "name": "Test Participant",
        "ndisNumber": "123456789"
      },
      ... complete form data ...
    },
    "to_emails": ["recipient@example.com"],
    "cc_emails": ["cc@example.com"],
    "custom_message": "Test email from WalkEasy Nexus"
  }'
```

### **3. Check Email Receipt**

- ✅ Email arrives in inbox (not spam)
- ✅ PDF attachment opens correctly
- ✅ HTML formatting displays properly
- ✅ All branding looks professional

---

## 🐛 **Troubleshooting**

### **Error: "Gmail authentication failed"**

**Cause:** Wrong email/password or App Password not set up

**Fix:**
1. Verify EMAIL_HOST_USER is correct
2. Ensure you're using App Password (not regular password)
3. Check 2-Factor Authentication is enabled
4. Generate new App Password if needed

### **Error: "SMTP error: Connection refused"**

**Cause:** Gmail SMTP port blocked or incorrect settings

**Fix:**
1. Check EMAIL_HOST=smtp.gmail.com
2. Check EMAIL_PORT=587
3. Verify firewall not blocking port 587
4. Try EMAIL_PORT=465 with SSL

### **Emails Going to Spam**

**Cause:** Gmail's spam filters or email not authenticated

**Fix:**
1. Ask recipients to mark as "Not Spam"
2. Add your domain to Gmail's SPF record
3. Use a custom domain (not @gmail.com) for FROM address
4. Ensure FROM address matches EMAIL_HOST_USER

### **Error: "Module not found: smtplib"**

**Cause:** Python standard library issue (rare)

**Fix:**
```bash
# smtplib is built-in, check Python version
python --version  # Should be 3.9+
```

---

## 📊 **API Endpoints**

### **1. Send AT Report Email**

**Endpoint:** `POST /api/ai/email-at-report/`

**Request:**
```json
{
  "data": {
    "participant": { "name": "...", "ndisNumber": "..." },
    "assessor": { ... },
    ... complete AT Report data ...
  },
  "to_emails": ["recipient@example.com"],
  "cc_emails": ["cc@example.com"],  // optional
  "custom_message": "Optional custom message"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully to 2 recipient(s)",
  "recipients": 2
}
```

### **2. Test Email Configuration**

**Endpoint:** `POST /api/ai/test-email/`

**Request:**
```json
{
  "to_email": "test@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully to 1 recipient(s)"
}
```

---

## 🚀 **Advanced Configuration**

### **Custom SMTP Server**

If you want to use a different email provider:

```bash
# .env
EMAIL_HOST=smtp.office365.com  # For Office 365
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@yourdomain.com
EMAIL_HOST_PASSWORD=your-password
```

### **Reply-To Address**

Set a different reply-to address:

```python
# In email_service.py
reply_to = "assessments@walkeasy.com.au"
```

### **Email Tracking**

Add tracking to know when emails are opened:

```python
# Add tracking pixel to HTML template
<img src="https://yourserver.com/track?email_id={email_id}" width="1" height="1">
```

---

## ✅ **Checklist**

Before going live:

- [ ] Gmail App Password generated
- [ ] .env file configured
- [ ] Test email sent successfully
- [ ] Test AT Report email received
- [ ] PDF attachment opens correctly
- [ ] Email not going to spam
- [ ] HTML formatting looks professional
- [ ] All team members' emails work
- [ ] Confidentiality notice included
- [ ] FROM name shows "WalkEasy Nexus"

---

## 📞 **Support**

**Gmail Help:**
- App Passwords: https://support.google.com/accounts/answer/185833
- 2-Factor Auth: https://support.google.com/accounts/answer/185839
- Gmail SMTP: https://support.google.com/mail/answer/7126229

**Common Issues:**
- "Less secure apps" error → Use App Passwords
- Emails to spam → Add SPF/DKIM records
- Connection timeout → Check firewall/port 587

---

## 🎉 **Summary**

**Email System Features:**
✅ Gmail SMTP integration  
✅ Apple Mail compatible  
✅ Professional HTML templates  
✅ PDF attachments  
✅ Multiple recipients (To, CC, BCC)  
✅ Custom messages  
✅ Secure TLS encryption  
✅ Test endpoints  
✅ Error handling  
✅ NDIS branding  

**Ready to email AT Reports professionally!** 📧✨

