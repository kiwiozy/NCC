# 📧 Sending Emails from Different Gmail Accounts

## Overview

This guide explains how to send emails from different Gmail accounts (e.g., info@walkeasy.com.au vs craig@walkeasy.com.au) in the Nexus Core Clinic application.

---

## 🎯 Understanding Gmail Account Connection

### How It Works

- **One Active Connection**: The app connects to **one Gmail account at a time**
- **Sent From**: All emails are sent **from** the connected account
- **Sent Folder**: Emails appear in the **Sent folder** of the connected account
- **Tracking**: The app tracks which account sent each email in the database

### Current Implementation

**Connected Account**: info@walkeasy.com.au  
**All emails sent from**: info@walkeasy.com.au  
**Emails tracked in**: info@walkeasy.com.au Gmail Sent folder

---

## 🔄 Switching Between Accounts

### Method 1: Disconnect and Reconnect (Current)

To switch from one account to another:

1. **Go to**: Settings → Gmail tab
2. **Click**: "Disconnect" button
3. **Click**: "Connect to Gmail" button
4. **Sign in with**: The account you want to use
   - For production emails: **info@walkeasy.com.au**
   - For admin/testing: **craig@walkeasy.com.au**
5. **Grant permissions**
6. ✅ **Done!** All future emails will be sent from the new account

### Time Required

- Disconnect: ~5 seconds
- Reconnect: ~30 seconds
- Total: **~35 seconds** to switch accounts

---

## 📋 Best Practices

### Recommended Setup for Walk Easy Pedorthics

#### **Production Environment**
- **Connect with**: `info@walkeasy.com.au`
- **Use for**:
  - AT Report emails to clients
  - Professional correspondence
  - NDIS submissions
  - Client communications

**Benefits**:
- ✅ Professional sender address
- ✅ All emails tracked in main business account
- ✅ Consistent branding
- ✅ Team can access sent emails

#### **Testing/Development Environment**
- **Connect with**: `craig@walkeasy.com.au`
- **Use for**:
  - Testing email features
  - Internal testing
  - Development work

---

## 🔐 Account Requirements

### Google Cloud Console Setup

Both accounts must be added as **Test Users** in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **Nexus Core Clinic Email System**
3. **APIs & Services** → **OAuth consent screen**
4. Scroll to **Test users**
5. Verify both accounts are listed:
   - ✅ `info@walkeasy.com.au`
   - ✅ `craig@walkeasy.com.au`

### Publishing the OAuth Consent Screen (Optional)

For production use without test user restrictions:

1. Complete all required OAuth consent screen fields
2. Add privacy policy and terms of service URLs
3. Submit for verification (can take several days)
4. Once approved, any Gmail account can connect (no test user requirement)

---

## 🔮 Future Enhancement: Multiple Account Support

### What This Would Add

- Connect **multiple Gmail accounts** simultaneously
- **Select sender** when composing emails
- **Default account** per user/clinic
- **Account switching** without disconnecting

### Implementation

This feature is not currently implemented but could be added if needed. It would require:

1. Database schema update to support multiple connections
2. UI for account selection when composing
3. Account priority/default settings
4. Token refresh for multiple accounts

**Estimated effort**: 2-3 hours of development

---

## 📊 Current Account Status

| Account | Status | Use Case | Emails in Sent Folder |
|---------|--------|----------|----------------------|
| info@walkeasy.com.au | ✅ Connected | Production emails | ✅ Yes |
| craig@walkeasy.com.au | ⚪ Available | Testing/Admin | Only when connected |

---

## 🎯 Common Scenarios

### Scenario 1: Sending AT Reports to Clients

**Recommended**: info@walkeasy.com.au

**Steps**:
1. Ensure connected to info@walkeasy.com.au
2. Complete AT Report
3. Click "Email Report"
4. Enter recipient details
5. Send

**Result**:
- ✅ Email from: info@walkeasy.com.au
- ✅ In Sent folder: info@walkeasy.com.au
- ✅ Professional appearance

### Scenario 2: Testing Email Features

**Recommended**: craig@walkeasy.com.au

**Steps**:
1. Disconnect info@walkeasy.com.au
2. Connect craig@walkeasy.com.au
3. Test email features
4. When done, reconnect info@walkeasy.com.au

**Result**:
- ✅ Test emails from: craig@walkeasy.com.au
- ✅ Production account unchanged
- ✅ No test emails in production Sent folder

### Scenario 3: Different Staff Members

**Current**: All staff use the same connected account (info@)

**Future**: Could implement per-user accounts if needed

---

## 🔧 Technical Details

### How the "From" Address is Set

```python
# In gmail_integration/services.py
message['From'] = connection.email_address
```

The `connection.email_address` is determined by whichever Google account completed the OAuth flow.

### Email Database Tracking

```python
# Each sent email is logged with:
- connection_email: Which account sent it
- to_addresses: Recipients
- subject: Email subject
- gmail_message_id: Gmail's message ID
- sent_at: Timestamp
```

### Gmail API Behavior

- Emails are sent via the Gmail API as the authenticated user
- They appear in that user's Sent folder automatically
- Gmail handles threading, labels, and storage
- Full search/archive capabilities in Gmail

---

## 📝 Recommendations

### For Walk Easy Pedorthics

1. ✅ **Use info@walkeasy.com.au for production**
   - More professional
   - Centralized email tracking
   - Team visibility

2. ✅ **Keep craig@walkeasy.com.au for admin**
   - Testing new features
   - Development work
   - Admin notifications

3. ✅ **Document which account is active**
   - Note in internal wiki
   - Remind staff during training

4. 🔮 **Consider multiple accounts** if:
   - Different staff need different sender addresses
   - Different clinics need different emails
   - Want to separate test from production

---

## ❓ FAQ

### Can I send from both accounts without disconnecting?

**Current**: No, you need to disconnect and reconnect.  
**Future**: This could be implemented with multiple account support.

### Will recipients see which account sent the email?

**Yes**, recipients will see the "From" address as whichever account is connected.

### Can I reply to emails from the app?

**Current**: No, the app only sends emails.  
**Future**: Reply functionality could be added using the Gmail API.

### Do both accounts need to be test users?

**Yes**, while the OAuth consent screen is in "Testing" mode.  
**No**, once published and verified, any Gmail account can connect.

---

## 🎉 Summary

**Current Setup**:
- Connected: info@walkeasy.com.au
- All emails sent from: info@walkeasy.com.au
- Switching: Takes ~35 seconds
- Multiple accounts: Not yet supported

**Recommendation**:
- ✅ Keep info@walkeasy.com.au connected for production
- ✅ Use craig@walkeasy.com.au for testing only
- ✅ Consider multiple account support if needed

---

**Last Updated**: November 1, 2025  
**Status**: ✅ Working as designed  
**Version**: 1.0.1

