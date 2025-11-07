# 📧 Gmail Integration - Quick Reference

## 🚀 Setup (5 Minutes)

### 1. Google Cloud Console
```
1. Go to: https://console.cloud.google.com/
2. Enable: Gmail API
3. Create: OAuth 2.0 Client ID (Web application)
4. Add redirect URI: http://localhost:8000/gmail/oauth/callback/
5. Copy: Client ID & Client Secret
```

### 2. Backend Configuration
```env
# Add to backend/.env
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:8000/gmail/oauth/callback/
```

### 3. Connect Account
```
1. Go to Settings → Gmail
2. Click "Connect to Gmail"
3. Authorize with Google
4. ✅ Done!
```

---

## 📡 API Endpoints

### OAuth
- `GET /gmail/oauth/connect/` - Start OAuth flow
- `GET /gmail/oauth/callback/` - OAuth callback (auto)
- `POST /gmail/oauth/disconnect/` - Disconnect account
- `POST /gmail/oauth/refresh/` - Refresh token

### Email
- `POST /gmail/send/` - Send email
- `POST /gmail/test/` - Test connection
- `GET /gmail/connections/status/` - Get status
- `GET /gmail/sent/` - Email history

---

## 💻 Usage Examples

### Send Email (curl)
```bash
curl -X POST http://localhost:8000/gmail/send/ \
  -H "Content-Type: application/json" \
  -d '{
    "to_emails": ["recipient@example.com"],
    "subject": "Test Email",
    "body_html": "<h1>Hello!</h1>",
    "cc_emails": ["cc@example.com"]
  }'
```

### Send Email (Python)
```python
from gmail_integration.services import gmail_service

gmail_service.send_email(
    to_emails=['recipient@example.com'],
    subject='Test Email',
    body_html='<h1>Hello!</h1>',
    body_text='Hello!',
    cc_emails=['cc@example.com']
)
```

### Test Connection
```bash
curl -X POST http://localhost:8000/gmail/test/ \
  -H "Content-Type: application/json" \
  -d '{"to_email": "your-email@example.com"}'
```

---

## 🎨 Frontend Features

### Settings Page (Settings → Gmail)
- ✅ **Connect Gmail** - OAuth2 flow
- ✅ **Connection Status** - Email, token expiry, stats
- ✅ **Compose Email** - Send with templates
- ✅ **Email History** - View sent emails
- ✅ **Test Connection** - Send test email
- ✅ **Manage Templates** - Use saved templates

### AT Report Integration
```typescript
// Email automatically uses Gmail API
handleEmailReport() → Gmail API → ✅ Sent!
// Falls back to SMTP if Gmail unavailable
```

---

## 🗂️ File Structure

```
backend/gmail_integration/
├── models.py          # GmailConnection, EmailTemplate, SentEmail
├── services.py        # GmailService (OAuth, sending)
├── views.py           # API endpoints
├── serializers.py     # REST serializers
├── urls.py            # URL routing
└── admin.py           # Django admin

backend/ai_services/
└── at_report_email.py # AT Report Gmail integration

frontend/app/components/settings/
└── GmailIntegration.tsx # Gmail settings UI
```

---

## 🔐 Security

- **OAuth2** - Secure Google authentication
- **No Passwords** - Tokens only, auto-refresh
- **Encrypted Storage** - Tokens in database
- **Scopes:**
  - `gmail.send` - Send emails
  - `gmail.readonly` - Read metadata
  - `userinfo.email` - Get email
  - `userinfo.profile` - Get profile

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "OAuth not configured" | Add credentials to `.env`, restart server |
| "Failed to connect" | Check Gmail API enabled, verify redirect URI |
| "Token expired" | Click "Refresh Token" or reconnect |
| "No connection" | Connect Gmail account first |
| Emails not sending | Test connection, check logs, verify emails |

---

## 📊 Database Quick Reference

### GmailConnection
- Stores: OAuth tokens, email, stats
- Primary key: UUID
- Fields: `email_address`, `access_token`, `refresh_token`, `is_primary`

### EmailTemplate
- Stores: Reusable email templates
- Primary key: UUID
- Fields: `name`, `category`, `subject`, `body_html`, `is_active`

### SentEmail
- Stores: Email sending logs
- Primary key: UUID
- Fields: `to_addresses`, `subject`, `status`, `gmail_message_id`

---

## ✅ Testing Checklist

- [ ] Google Cloud project created
- [ ] Gmail API enabled
- [ ] OAuth credentials created
- [ ] Credentials added to `.env`
- [ ] Django server restarted
- [ ] Gmail account connected
- [ ] Test email sent successfully
- [ ] Test email received (not spam)
- [ ] AT Report email works
- [ ] Email history shows logs
- [ ] Token refresh works

---

## 🎉 Features Summary

✅ Gmail API sending (better than SMTP)  
✅ OAuth2 security (no passwords)  
✅ Apple Mail compatible  
✅ Email templates  
✅ Email logging  
✅ Multiple accounts  
✅ Auto token refresh  
✅ AT Report integration  
✅ SMTP fallback  
✅ Frontend UI  
✅ Test endpoints  

**Production Ready!** 🚀

---

## 📞 Support

- **Full Guide:** `docs/GMAIL_INTEGRATION_GUIDE.md`
- **Email Setup:** `docs/EMAIL_SETUP_GUIDE.md`
- **Django Admin:** http://localhost:8000/admin/
- **API Docs:** http://localhost:8000/gmail/

---

**Quick Start in 3 Commands:**

```bash
# 1. Add credentials to .env (use your values)
echo "GMAIL_CLIENT_ID=your-id" >> backend/.env
echo "GMAIL_CLIENT_SECRET=your-secret" >> backend/.env

# 2. Restart server
pkill -f "python manage.py runserver"
cd backend && python manage.py runserver 8000 &

# 3. Connect: Go to Settings → Gmail → "Connect to Gmail"
```

✨ **That's it! Start sending emails!** ✨

