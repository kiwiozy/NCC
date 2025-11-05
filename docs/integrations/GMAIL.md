# Gmail Integration

**Status:** ✅ Production Ready  
**Last Updated:** November 2025

---

## 📋 **Overview**

Gmail integration provides OAuth2-authenticated email sending with multi-account support. Users can connect multiple Gmail accounts and send emails from any connected account.

---

## 🎯 **Features**

- ✅ OAuth2 authentication (secure, no passwords stored)
- ✅ Multi-account support (unlimited accounts)
- ✅ Send emails from any connected account
- ✅ Email templates with rich text editor
- ✅ Attachment support
- ✅ Email history and tracking

---

## 🛠 **Implementation**

### **Backend**
- **App:** `backend/gmail_integration/`
- **Models:** `GmailAccount` (stores OAuth tokens)
- **Service:** `GmailService` (singleton, handles API calls)
- **Views:** OAuth callback, send email, list accounts

### **Frontend**
- **Component:** `frontend/app/components/settings/GmailIntegration.tsx`
- **Features:** Connect accounts, send test emails, manage accounts

### **API Endpoints**
- `GET /api/gmail/authorize/` - Start OAuth flow
- `GET /api/gmail/oauth2callback/` - OAuth callback
- `POST /api/gmail/send/` - Send email
- `GET /api/gmail/accounts/` - List connected accounts
- `DELETE /api/gmail/accounts/{id}/` - Disconnect account

---

## 🔑 **Setup Requirements**

1. **Google Cloud Console:**
   - Create OAuth2 credentials
   - Enable Gmail API
   - Set authorized redirect URI: `https://localhost:8000/api/gmail/oauth2callback/`

2. **Environment Variables:**
   ```bash
   GMAIL_CLIENT_ID=your_client_id
   GMAIL_CLIENT_SECRET=your_client_secret
   ```

3. **Scopes:**
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`

---

## 📚 **Full Documentation**

Detailed setup guides and implementation docs are archived in:
`docs/archive/legacy-integrations/Email/`

**Key Files:**
- `GMAIL_INTEGRATION_COMPLETE.md` - Full implementation summary
- `GMAIL_QUICK_REFERENCE.md` - API reference
- `GMAIL_SETUP_CHECKLIST.md` - Setup steps

---

## 🐛 **Troubleshooting**

### **"Invalid credentials" error**
- Check environment variables are set correctly
- Verify OAuth redirect URI matches exactly
- Ensure Gmail API is enabled in Google Cloud Console

### **"Refresh token expired"**
- User needs to reconnect their account
- Delete old account and reconnect

### **"Insufficient permissions"**
- Verify OAuth scopes include `gmail.send`
- User may need to re-authorize with correct scopes

---

**Status:** ✅ Working in production, no known issues

