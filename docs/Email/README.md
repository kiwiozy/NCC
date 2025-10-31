# 📧 Email System Documentation

Complete documentation for the Nexus Core Clinic email system, including Gmail API integration, AT Report emailing, and email management.

---

## 📑 Documentation Index

### 🚀 Quick Start

- **[Gmail Integration Complete](GMAIL_INTEGRATION_COMPLETE.md)** - Complete implementation overview and usage guide
- **[Gmail Setup Checklist](GMAIL_SETUP_CHECKLIST.md)** - Quick setup checklist for new installations
- **[Email Signature](EMAIL_SIGNATURE.md)** - Email signature documentation and customization
- **[Sending from Different Accounts](SENDING_FROM_DIFFERENT_ACCOUNTS.md)** - How to configure multiple accounts
- **[Multi-Account Support Guide](MULTI_ACCOUNT_SUPPORT.md)** - **NEW**: Complete guide to using multiple Gmail accounts

### 🔧 Setup Guides

- **[Gmail API Setup Walkthrough](GMAIL_API_SETUP_WALKTHROUGH.md)** - Step-by-step guide for Google Cloud Console setup

---

## 📊 System Overview

### Email Capabilities

1. **Gmail API Integration**
   - OAuth2 authentication
   - Professional email sending
   - Token management
   - **Multi-account support** - Connect and send from multiple Gmail accounts
   - **Correct Sent folder tracking** - Emails appear in selected account's Sent folder

2. **AT Report Emailing**
   - PDF generation and attachment
   - Custom recipient lists
   - Personalized messages
   - Automatic naming: `Participant Name_NDIS Number.pdf`

3. **Email Management**
   - Send history tracking
   - Template support
   - Connection status monitoring
   - Error handling and retry

---

## 🔧 Configuration

### Environment Variables

Required in `backend/.env`:

```bash
# Gmail API OAuth2 Configuration
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REDIRECT_URI=http://localhost:8000/gmail/oauth/callback/

# Optional: SMTP Fallback
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=your_email@gmail.com
```

### Google Cloud Console Setup

1. Create project
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Configure authorized redirect URIs
5. Add test users (for testing mode)
6. Copy credentials to `.env`

📖 **Full Guide**: [Gmail API Setup Walkthrough](GMAIL_API_SETUP_WALKTHROUGH.md)

---

## 🎯 Quick Start

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Activate virtual environment
source venv/bin/activate

# Install dependencies (if not already installed)
pip install django djangorestframework django-filter requests

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver 8000
```

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
```

### 3. Connect Gmail

1. Navigate to http://localhost:3000
2. Go to **Settings** → **Gmail** tab
3. Click **"Connect to Gmail"**
4. Sign in with your first Google account (e.g., craig@walkeasy.com.au)
5. Grant permissions
6. ✅ Connected!

**To connect additional accounts:**
1. Click **"Connect Another Account"**
2. Sign in with another account (e.g., info@walkeasy.com.au)
3. Grant permissions
4. ✅ Now you can choose which account to send from!

---

## 🚀 Usage Examples

### Send AT Report Email

```typescript
// From ATReport.tsx
const handleEmailReport = async () => {
  const response = await fetch('http://localhost:8000/api/ai/email-at-report/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: reportData,
      to_emails: [recipientEmail],
      cc_emails: [ccEmail],
      custom_message: customMessage,
      connection_email: 'info@walkeasy.com.au'  // NEW: Select which account to send from
    })
  });
};
```

### Send Custom Email

```typescript
// From GmailIntegration.tsx
const sendEmail = async () => {
  const response = await fetch('http://localhost:8000/gmail/send/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to_emails: ['recipient@example.com'],
      subject: 'Email Subject',
      body_html: '<p>Email content</p>',
      connection_email: 'craig@walkeasy.com.au'  // NEW: Select which account to send from
    })
  });
};
```

### Check Connection Status

```bash
curl http://localhost:8000/gmail/connections/status/
```

---

## 📁 File Structure

```
backend/
├── gmail_integration/
│   ├── models.py          # GmailConnection, EmailTemplate, SentEmail
│   ├── services.py        # OAuth & email sending logic
│   ├── views.py           # API endpoints
│   ├── serializers.py     # DRF serializers
│   ├── urls.py            # URL routing
│   └── admin.py           # Django admin interface
├── ai_services/
│   ├── at_report_email.py # AT Report email integration
│   └── email_service.py   # SMTP fallback service
└── ncc_api/
    ├── settings.py        # Django settings (includes gmail_integration app)
    └── urls.py            # Main URL config

frontend/
└── app/
    └── components/
        └── settings/
            ├── GmailIntegration.tsx  # Gmail management UI
            └── ATReport.tsx          # AT Report with email feature

docs/
└── Email/
    ├── README.md                           # This file
    ├── GMAIL_INTEGRATION_COMPLETE.md       # Complete implementation
    ├── GMAIL_API_SETUP_WALKTHROUGH.md      # Setup guide
    └── GMAIL_SETUP_CHECKLIST.md            # Quick checklist
```

---

## 🔐 Security

### OAuth2 Authentication

- ✅ No password storage
- ✅ Secure token exchange
- ✅ Encrypted token storage
- ✅ Automatic token refresh
- ✅ Minimal required scopes

### Email Security

- ✅ Gmail API (more secure than SMTP)
- ✅ SMTP fallback with app passwords
- ✅ TLS encryption
- ✅ Audit logging of all sent emails

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "redirect_uri_mismatch" Error

**Cause**: Redirect URI mismatch between code and Google Cloud Console

**Solution**: 
- Verify in Google Cloud Console: `http://localhost:8000/gmail/oauth/callback/`
- Include trailing slash!
- Wait 5-10 minutes for changes to propagate

#### 2. Connection Succeeds but Shows "Not Connected"

**Cause**: Django server not reloaded after adding credentials

**Solution**:
```bash
pkill -f "python manage.py runserver"
cd backend && source venv/bin/activate && python manage.py runserver 8000
```

#### 3. "Token Expired" Error

**Solution**: Click "Refresh Token" or it will auto-refresh on next email send

#### 4. "Invalid Grant" Error

**Solution**: Disconnect and reconnect your Gmail account

#### 5. Emails Not in Gmail Sent Folder

**Cause (v2.0+)**: Email sent from wrong account

**Solution**: 
- With multi-account support, emails appear in the Sent folder of the account you **selected when sending**
- Use the "Send Using Account" dropdown to choose which account's Sent folder the email should appear in
- To send from info@walkeasy.com.au and have it in that account's Sent folder, select info@walkeasy.com.au in the dropdown

**Old behavior (v1.x)**: Emails appeared in the primary connected account's Sent folder regardless of "From" address

#### 6. PDF Attachment Not Included

**Cause**: Incorrect MIME structure (fixed in v1.0.1)

**Solution**: Update to latest version with proper MIMEMultipart('mixed') structure

---

## 📊 Features

### ✅ Implemented

- [x] Gmail OAuth2 authentication
- [x] Email sending via Gmail API
- [x] AT Report PDF email integration
- [x] Email history and tracking
- [x] Connection management UI
- [x] Token auto-refresh
- [x] Multiple account support
- [x] SMTP fallback
- [x] Attachment support
- [x] HTML email support
- [x] Error handling

### 🔮 Future Enhancements

- [ ] Email template management UI
- [ ] Rich text email editor
- [ ] Scheduled email sending
- [ ] Email analytics
- [ ] Bulk email campaigns
- [ ] Email signatures
- [ ] Contact groups
- [ ] Draft saving
- [ ] Email tracking (opens/clicks)

---

## 🎉 Success Metrics

- ✅ Gmail API integration fully functional
- ✅ OAuth2 flow working smoothly
- ✅ **Multi-account support** - Connect and send from multiple Gmail accounts
- ✅ **Sent folder tracking** - Emails appear in the correct account's Sent folder
- ✅ AT Reports can be emailed with PDF attachments
- ✅ Email history tracked in database
- ✅ Token management automated
- ✅ Professional email UI implemented
- ✅ Production ready

---

## 📚 Additional Resources

### Documentation Files

1. **[GMAIL_INTEGRATION_COMPLETE.md](GMAIL_INTEGRATION_COMPLETE.md)**
   - Complete system overview
   - Implementation details
   - API reference
   - Usage examples

2. **[MULTI_ACCOUNT_SUPPORT.md](MULTI_ACCOUNT_SUPPORT.md)** (NEW)
   - Multi-account setup guide
   - Account selector usage
   - Sent folder tracking explained
   - Best practices

3. **[GMAIL_API_SETUP_WALKTHROUGH.md](GMAIL_API_SETUP_WALKTHROUGH.md)**
   - Google Cloud Console setup
   - OAuth credential creation
   - Detailed screenshots and steps

4. **[GMAIL_SETUP_CHECKLIST.md](GMAIL_SETUP_CHECKLIST.md)**
   - Quick setup checklist
   - Environment variable template
   - Testing checklist

### External Links

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google OAuth2 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Django REST Framework](https://www.django-rest-framework.org/)

---

## 🤝 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the detailed documentation files
3. Check Django server logs: `tail -f /tmp/django_server.log`
4. Check browser console for frontend errors

---

**Last Updated**: November 1, 2025  
**Status**: ✅ Production Ready  
**Version**: 2.0.0 (Multi-Account Support)  
**Connected Accounts**: craig@walkeasy.com.au (Primary), info@walkeasy.com.au
