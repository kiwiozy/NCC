# 🔄 Multi-Account Gmail Support

## 📋 Overview

WalkEasy Nexus's Gmail integration now supports **full multi-account functionality**, allowing you to connect multiple Gmail accounts and choose which account to send each email from. Emails appear in the **correct account's Sent folder**, not just the primary account.

**Version**: 2.0.0+  
**Status**: ✅ Fully Implemented & Working

---

## 🎯 Key Features

### ✅ What Multi-Account Support Provides

1. **Connect Multiple Gmail Accounts**
   - Connect as many Gmail accounts as needed (e.g., craig@walkeasy.com.au, info@walkeasy.com.au)
   - Each account has its own OAuth tokens and permissions
   - Primary account designation for default sending

2. **Account Selector Dropdown**
   - Choose which account to send from for each email
   - Available in AT Report email modal
   - Available in Gmail Compose modal
   - User preference remembered in localStorage

3. **Correct Sent Folder Tracking**
   - **KEY BENEFIT**: Emails appear in the Sent folder of the account you **select when sending**
   - No more emails appearing in the wrong account's Sent folder
   - True multi-account functionality, not just "Send As" aliases

4. **Seamless User Experience**
   - Dropdown only appears when you have 2+ connected accounts
   - Single account = automatic selection (no dropdown clutter)
   - Clear labeling: "Craig Laird (Primary)", "Walk Easy"

---

## 🚀 Quick Start Guide

### Step 1: Connect Your First Account

1. Navigate to **Settings** → **Gmail** tab
2. Click **"Connect to Gmail"**
3. Sign in with your primary Google account (e.g., craig@walkeasy.com.au)
4. Grant permissions:
   - View your email messages and settings
   - Send email on your behalf
5. ✅ First account connected!

### Step 2: Connect Additional Accounts

1. In the **Gmail** tab, click **"Connect Another Account"**
2. Sign in with your second Google account (e.g., info@walkeasy.com.au)
3. Grant the same permissions
4. ✅ Second account connected!
5. Repeat for more accounts as needed

### Step 3: Send Email from Specific Account

#### Via AT Report:
1. Complete your AT Report form
2. Click **"Email Report"**
3. **Select account** from "Send Using Account" dropdown:
   - Craig Laird (craig@walkeasy.com.au) - PRIMARY
   - Walk Easy (info@walkeasy.com.au)
4. Enter recipient(s)
5. Click **"Send Email"**
6. ✅ Email sent from selected account and appears in that account's Sent folder!

#### Via Compose Email:
1. Go to **Settings** → **Gmail** tab
2. Click **"Compose Email"**
3. **Select account** from "Send Using Account" dropdown
4. Fill in recipients, subject, body
5. Click **"Send Email"**
6. ✅ Email sent from selected account!

---

## 🔧 Technical Implementation

### Backend Architecture

#### API Endpoints

```bash
# Get all connected accounts
GET /gmail/connected-accounts/

Response:
{
  "accounts": [
    {
      "email": "craig@walkeasy.com.au",
      "display_name": "Craig Laird",
      "is_primary": true,
      "connected_at": "2025-11-01T07:14:07Z"
    },
    {
      "email": "info@walkeasy.com.au",
      "display_name": "Walk Easy",
      "is_primary": false,
      "connected_at": "2025-11-01T07:47:34Z"
    }
  ],
  "count": 2
}
```

#### Send Email with Account Selection

```bash
# Send email using specific account
POST /gmail/send/

Payload:
{
  "to_emails": ["recipient@example.com"],
  "subject": "Test Email",
  "body_html": "<p>Hello World</p>",
  "connection_email": "info@walkeasy.com.au"  # <- Selects which account to use
}
```

```bash
# Send AT Report using specific account
POST /api/ai/email-at-report/

Payload:
{
  "data": { /* AT Report data */ },
  "to_emails": ["therapist@example.com"],
  "connection_email": "info@walkeasy.com.au"  # <- Selects which account to use
}
```

### Frontend Implementation

#### Account Selector Component

```typescript
// In ATReport.tsx or GmailIntegration.tsx

const [connectedAccounts, setConnectedAccounts] = useState<Array<{
  email: string, 
  display_name: string, 
  is_primary: boolean
}>>([]);
const [connectionEmail, setConnectionEmail] = useState('');

// Fetch connected accounts
useEffect(() => {
  fetch('http://localhost:8000/gmail/connected-accounts/')
    .then(res => res.json())
    .then(data => {
      setConnectedAccounts(data.accounts || []);
      // Set default based on localStorage or primary
      const savedConnection = localStorage.getItem('gmail_default_connection');
      if (savedConnection) {
        setConnectionEmail(savedConnection);
      } else {
        const primary = data.accounts.find(a => a.is_primary);
        setConnectionEmail(primary?.email || data.accounts[0]?.email);
      }
    });
}, []);

// Account selector (only shown if 2+ accounts)
{connectedAccounts.length > 1 && (
  <Select
    label="Send Using Account"
    description="Select which Gmail account to send from (emails will appear in this account's Sent folder)"
    data={connectedAccounts.map(account => ({
      value: account.email,
      label: `${account.display_name}${account.is_primary ? ' (Primary)' : ''}`
    }))}
    value={connectionEmail}
    onChange={(value) => {
      setConnectionEmail(value || '');
      localStorage.setItem('gmail_default_connection', value || '');
    }}
  />
)}
```

---

## 📊 How It Works

### The Key Difference from v1.x

**Version 1.x (Old Behavior):**
- Used "Send As" delegation
- Only one account connected (primary)
- Could change "From" header, but emails still appeared in primary account's Sent folder
- ❌ Emails sent from info@walkeasy.com.au appeared in craig@walkeasy.com.au Sent folder

**Version 2.0+ (New Behavior):**
- Uses multiple OAuth connections
- Each account has its own OAuth tokens
- Selecting an account uses **that account's Gmail API connection**
- ✅ Emails sent from info@walkeasy.com.au appear in info@walkeasy.com.au Sent folder
- ✅ Emails sent from craig@walkeasy.com.au appear in craig@walkeasy.com.au Sent folder

### Under the Hood

1. **Multiple Connections Stored in Database:**
   ```python
   # GmailConnection model stores each account separately
   GmailConnection:
     - email_address: "craig@walkeasy.com.au"
     - access_token: "..."
     - refresh_token: "..."
     - is_primary: True
   
   GmailConnection:
     - email_address: "info@walkeasy.com.au"
     - access_token: "..."
     - refresh_token: "..."
     - is_primary: False
   ```

2. **Account Selection Flow:**
   ```
   User selects account in dropdown
      ↓
   Frontend passes connection_email parameter
      ↓
   Backend looks up OAuth tokens for that email
      ↓
   Uses those tokens to send via Gmail API
      ↓
   Email appears in that account's Sent folder ✅
   ```

---

## 💡 Best Practices

### Primary Account Designation

- Set your main/personal account as **Primary** (e.g., craig@walkeasy.com.au)
- This account is used by default when no selection is made
- Primary badge appears in UI for easy identification

### Naming Convention

- Use descriptive display names for clarity:
  - "Craig Laird" for craig@walkeasy.com.au
  - "Walk Easy" for info@walkeasy.com.au
- Helps users quickly identify which account they're sending from

### When to Use Which Account

**craig@walkeasy.com.au (Personal):**
- Internal communications
- Personal correspondence
- Administrative emails

**info@walkeasy.com.au (Business):**
- Client communications
- AT Reports to therapists
- Professional business emails
- Customer support

### Remember Your Choice

- The system remembers your last selected account in `localStorage`
- Next time you send an email, it defaults to your previous choice
- Override anytime by selecting a different account

---

## 🔐 Security & Permissions

### OAuth Token Management

- Each account has its own OAuth tokens
- Tokens stored separately in database
- Automatic token refresh per account
- Revoke access independently per account

### Permissions Required

For each connected account:
- ✅ `https://www.googleapis.com/auth/gmail.send`
- ✅ `https://www.googleapis.com/auth/gmail.readonly`

### Account Isolation

- Each account's emails are completely isolated
- No cross-account access
- Separate OAuth flows for each account
- Independent token expiration and refresh

---

## 🐛 Troubleshooting

### Issue: Dropdown Not Appearing

**Cause**: Only one account connected

**Solution**: The dropdown only appears when you have 2+ connected accounts. Connect another account to see the selector.

### Issue: Emails Still in Wrong Sent Folder

**Cause**: Using old version (v1.x)

**Solution**: 
1. Check version in footer or docs
2. Update to v2.0+
3. Disconnect old accounts
4. Reconnect all accounts fresh

### Issue: Cannot Connect Second Account

**Cause**: Google OAuth consent screen issue

**Solution**:
1. Verify second account is listed as test user in Google Cloud Console
2. Check redirect URI is correct: `http://localhost:8000/gmail/oauth/callback/`
3. Wait 5-10 minutes after adding test user
4. Try connecting in incognito window

### Issue: Wrong Account Selected by Default

**Cause**: localStorage has outdated preference

**Solution**:
```javascript
// Clear in browser console
localStorage.removeItem('gmail_default_connection');
// Refresh page
```

---

## ✅ Testing Checklist

- [ ] Connect first Gmail account (craig@walkeasy.com.au)
- [ ] Verify account appears in Connected Accounts section
- [ ] Connect second Gmail account (info@walkeasy.com.au)
- [ ] Verify both accounts appear
- [ ] Verify "Send Using Account" dropdown appears in AT Report email modal
- [ ] Send test email from craig@walkeasy.com.au
- [ ] Verify email appears in craig@walkeasy.com.au Gmail Sent folder
- [ ] Send test email from info@walkeasy.com.au
- [ ] Verify email appears in info@walkeasy.com.au Gmail Sent folder
- [ ] Verify account preference is remembered (localStorage)
- [ ] Test with only 1 account (dropdown should not appear)

---

## 📈 Future Enhancements

- [ ] Account management UI (disconnect individual accounts)
- [ ] Set which account is primary from UI
- [ ] Account-specific email signatures
- [ ] Per-account email templates
- [ ] Usage statistics per account
- [ ] Account switching keyboard shortcut
- [ ] Email quotas per account

---

## 🎉 Success!

Multi-account support is fully operational! You can now:

1. ✅ Connect multiple Gmail accounts
2. ✅ Choose which account to send from per email
3. ✅ Emails appear in the correct account's Sent folder
4. ✅ User-friendly account selector
5. ✅ Account preference memory
6. ✅ Clean UI (dropdown only when needed)

**This is true multi-account support, not just "Send As" delegation!**

---

**Last Updated**: November 1, 2025  
**Status**: ✅ Production Ready  
**Version**: 2.0.0  
**Feature**: Multi-Account Gmail Support

