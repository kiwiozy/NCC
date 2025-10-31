# ✅ Gmail API Setup Checklist

Quick checklist for setting up Gmail API integration for Nexus Core Clinic.

---

## 📋 Prerequisites

- [ ] Google account with admin access
- [ ] Django backend running
- [ ] Next.js frontend running
- [ ] Access to Google Cloud Console

---

## 🔧 Setup Steps

### 1. Google Cloud Console Setup

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create new project: **"Nexus Core Clinic Email System"**
- [ ] Enable **Gmail API**
- [ ] Navigate to **APIs & Services** → **Credentials**
- [ ] Create **OAuth 2.0 Client ID**
  - [ ] Application type: **Web application**
  - [ ] Name: **Nexus Core Clinic Email System**
  - [ ] Authorized redirect URIs: `http://localhost:8000/gmail/oauth/callback/`
  - [ ] **Important**: Include trailing slash `/`
- [ ] Download or copy credentials:
  - [ ] Client ID
  - [ ] Client Secret
- [ ] Configure **OAuth Consent Screen**
  - [ ] User type: **External** (for testing) or **Internal** (for organization)
  - [ ] App name: **Nexus Core Clinic Email System**
  - [ ] User support email: your email
  - [ ] Developer contact email: your email
  - [ ] Scopes: 
    - [ ] `gmail.send` (Send emails)
    - [ ] `gmail.readonly` (Read email metadata)
    - [ ] `userinfo.email` (Get user email)
    - [ ] `userinfo.profile` (Get user profile)
- [ ] Add **Test Users** (if in testing mode):
  - [ ] info@walkeasy.com.au (recommended for production emails)
  - [ ] craig@walkeasy.com.au (for testing/admin)
  - [ ] Any other users who need access

### 2. Backend Configuration

- [ ] Navigate to `backend/` directory
- [ ] Open or create `.env` file
- [ ] Add Gmail credentials:

```bash
# Gmail API OAuth2 Configuration
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:8000/gmail/oauth/callback/
```

- [ ] Verify `gmail_integration` app is in `INSTALLED_APPS` (`ncc_api/settings.py`)
- [ ] Run migrations:

```bash
cd backend
source venv/bin/activate
python manage.py migrate
```

- [ ] Restart Django server:

```bash
pkill -f "python manage.py runserver"
python manage.py runserver 8000
```

### 3. Frontend Verification

- [ ] Verify frontend is running on `http://localhost:3000`
- [ ] Check that `GmailIntegration.tsx` component exists
- [ ] Verify Gmail tab appears in Settings page

### 4. Test Connection

- [ ] Open browser: `http://localhost:3000`
- [ ] Navigate to **Settings** → **Gmail** tab
- [ ] Click **"Connect to Gmail"** button
- [ ] Should redirect to Google OAuth page
- [ ] Sign in with test user email (info@walkeasy.com.au recommended, or craig@walkeasy.com.au)
- [ ] **Important**: Emails will be sent from and appear in the Sent folder of whichever account you connect
- [ ] Grant permissions:
  - [ ] View your email messages and settings
  - [ ] Send email on your behalf
- [ ] Should redirect back to app
- [ ] Verify connection status shows **"Connected to Gmail"**
- [ ] Verify email address displayed: **info@walkeasy.com.au** (or your chosen account)
- [ ] Verify display name shown correctly

### 5. Test Email Sending

- [ ] Click **"Compose Email"** button
- [ ] Fill in test email:
  - [ ] To: your-test-email@example.com
  - [ ] Subject: Test Email
  - [ ] Body: This is a test
- [ ] Click **"Send Email"**
- [ ] Verify success notification
- [ ] Check recipient inbox for email
- [ ] Verify **"Emails Sent"** counter incremented

### 6. Test AT Report Email

- [ ] Navigate to **Settings** → **AT Report** tab
- [ ] Fill in AT Report form (or load draft)
- [ ] Click **"Email Report"** button
- [ ] Enter recipient email
- [ ] Click **"Send Email"**
- [ ] Verify success notification
- [ ] Check recipient inbox for:
  - [ ] Email received
  - [ ] PDF attachment present
  - [ ] Filename format: `Participant Name_NDIS Number.pdf`
  - [ ] PDF opens correctly

---

## ✅ Success Criteria

All of the following should be true:

- [x] ✅ Gmail OAuth flow completes successfully
- [x] ✅ Connection status shows connected account
- [x] ✅ Token expiry time displayed correctly
- [x] ✅ Test emails send successfully
- [x] ✅ AT Report emails send with PDF attachment
- [x] ✅ Email history logs all sent emails
- [x] ✅ Refresh token works
- [x] ✅ Disconnect/reconnect works

---

## 🐛 Troubleshooting Checklist

If something isn't working, check:

### OAuth Connection Issues

- [ ] Redirect URI matches exactly (including trailing `/`)
- [ ] Test users added in Google Cloud Console
- [ ] OAuth consent screen configured completely
- [ ] Gmail API is enabled
- [ ] Credentials copied correctly to `.env`
- [ ] Django server restarted after adding `.env` credentials
- [ ] Wait 5-10 minutes for Google settings to propagate

### Email Sending Issues

- [ ] Connection status shows "Connected"
- [ ] Token not expired (or refresh token works)
- [ ] Recipient email address valid
- [ ] Check Django logs: `tail -f /tmp/django_server.log`
- [ ] Check browser console for errors
- [ ] Verify Gmail API quota not exceeded

### Database Issues

- [ ] Migrations applied: `python manage.py migrate`
- [ ] Check for connection in database:
  ```bash
  python manage.py shell -c "from gmail_integration.models import GmailConnection; print(GmailConnection.objects.count())"
  ```
- [ ] If count is 0, reconnect Gmail account

---

## 📞 Common Error Messages

| Error | Solution |
|-------|----------|
| `redirect_uri_mismatch` | Check redirect URI in Google Cloud Console matches exactly with trailing `/` |
| `invalid_grant` | Token expired, disconnect and reconnect |
| `credentials not configured` | Add `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` to `.env` and restart Django |
| `access_denied` | User denied permissions, try again and click "Allow" |
| `Token expired` | Click "Refresh Token" button or will auto-refresh on next send |

---

## 📚 Environment Variables Template

Copy this to your `backend/.env` file:

```bash
# ============================================
# Gmail API OAuth2 Configuration
# ============================================
# Get these from: https://console.cloud.google.com/
# Navigation: APIs & Services → Credentials → OAuth 2.0 Client IDs

GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:8000/gmail/oauth/callback/

# ============================================
# SMTP Fallback (Optional)
# ============================================
# Used if Gmail API fails or is unavailable

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_specific_password
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=your_email@gmail.com
```

---

## 🎯 Production Deployment Checklist

When deploying to production:

- [ ] Update `GMAIL_REDIRECT_URI` to production URL
- [ ] Add production redirect URI to Google Cloud Console
- [ ] Set OAuth consent screen to "Published" (if external users)
- [ ] Remove test mode restrictions
- [ ] Update all test user emails to production users
- [ ] Use environment variables for all secrets
- [ ] Enable Django security settings
- [ ] Set up SSL/TLS certificates
- [ ] Configure proper CORS settings
- [ ] Set up monitoring and logging
- [ ] Test email sending from production
- [ ] Verify tokens refresh automatically
- [ ] Test error handling and fallbacks

---

## ✅ Current Status

**As of November 1, 2025:**

- [x] ✅ Gmail API fully configured
- [x] ✅ OAuth2 flow working
- [x] ✅ Email sending operational
- [x] ✅ AT Report integration complete with PDF attachments
- [x] ✅ Token management automated
- [x] ✅ Email history tracking
- [x] ✅ Frontend UI complete
- [x] ✅ Professional email signature
- [x] ✅ All tests passing
- [x] ✅ MIME structure fixed for proper attachments

**Status**: 🎉 **PRODUCTION READY**

---

**Last Updated**: November 1, 2025  
**Version**: 1.0.1  
**Recommended Account**: info@walkeasy.com.au
