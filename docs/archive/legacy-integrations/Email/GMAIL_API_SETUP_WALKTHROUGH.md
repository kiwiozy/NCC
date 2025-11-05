# 🔐 Gmail API Setup - Step-by-Step Guide

**Get your Gmail OAuth2 credentials in 10 minutes**

---

## 📋 Prerequisites

- ✅ Google account (your clinic Gmail account)
- ✅ Access to Google Cloud Console
- ✅ Backend server running locally

---

## 🚀 Step-by-Step Instructions

### **Step 1: Go to Google Cloud Console**

1. Open your web browser
2. Go to: **https://console.cloud.google.com/**
3. Sign in with your Google account (use your clinic email if possible)

---

### **Step 2: Create a New Project**

1. **Click** the project dropdown at the top of the page (says "Select a project" or shows current project name)
2. **Click** "NEW PROJECT" button (top right of the dialog)
3. **Enter project details:**
   ```
   Project name: WalkEasy Nexus
   Organization: (leave default or select your organization)
   Location: (leave default)
   ```
4. **Click** "CREATE"
5. **Wait** ~10 seconds for the project to be created
6. **Select** your new project from the dropdown

✅ **Checkpoint:** You should see "WalkEasy Nexus" in the top bar

---

### **Step 3: Enable Gmail API**

1. In the left sidebar, click **"APIs & Services"** → **"Library"**
   - Or go directly to: https://console.cloud.google.com/apis/library

2. In the search box, type: **"Gmail API"**

3. **Click** on **"Gmail API"** (it should be the first result with a mail icon)

4. **Click** the blue **"ENABLE"** button

5. **Wait** ~5 seconds for it to enable

6. You'll see "API enabled" confirmation

✅ **Checkpoint:** Gmail API is now enabled for your project

---

### **Step 4: Configure OAuth Consent Screen**

**Before creating credentials, you need to configure the consent screen.**

1. In the left sidebar, go to **"APIs & Services"** → **"OAuth consent screen"**
   - Or: https://console.cloud.google.com/apis/credentials/consent

2. **Select user type:**
   - Choose **"External"** (unless you have a Google Workspace organization)
   - **Click** "CREATE"

3. **Fill in App Information:**
   ```
   App name: WalkEasy Nexus Email System
   User support email: [Your clinic email]
   Developer contact email: [Your clinic email]
   ```

4. **App domain** (optional, leave blank for now):
   - Application home page: (leave blank)
   - Application privacy policy: (leave blank)
   - Application terms of service: (leave blank)

5. **Click** "SAVE AND CONTINUE"

6. **Scopes page:**
   - **Click** "ADD OR REMOVE SCOPES"
   - In the filter box, search for: **"gmail"**
   - **Select** these scopes:
     - ✅ `https://www.googleapis.com/auth/gmail.send` (Send email on your behalf)
     - ✅ `https://www.googleapis.com/auth/gmail.readonly` (View your email messages and settings)
   - In the filter box, search for: **"userinfo"**
   - **Select**:
     - ✅ `https://www.googleapis.com/auth/userinfo.email` (See your primary Google Account email address)
     - ✅ `https://www.googleapis.com/auth/userinfo.profile` (See your personal info)
   - **Click** "UPDATE"
   - **Click** "SAVE AND CONTINUE"

7. **Test users page:**
   - **Click** "ADD USERS"
   - **Enter** your clinic Gmail address (the one you'll use to send emails)
   - **Click** "ADD"
   - **Click** "SAVE AND CONTINUE"

8. **Summary page:**
   - Review your settings
   - **Click** "BACK TO DASHBOARD"

✅ **Checkpoint:** OAuth consent screen is configured

---

### **Step 5: Create OAuth 2.0 Credentials**

**Now create the actual credentials for your app.**

1. In the left sidebar, go to **"APIs & Services"** → **"Credentials"**
   - Or: https://console.cloud.google.com/apis/credentials

2. **Click** the blue **"+ CREATE CREDENTIALS"** button at the top

3. **Select** "OAuth client ID" from the dropdown

4. **Configure OAuth client:**
   ```
   Application type: Web application
   
   Name: WalkEasy Nexus - Gmail Integration
   ```

5. **Authorized JavaScript origins:**
   - **Click** "+ ADD URI"
   - **Enter:** `http://localhost:8000`
   - **Click** "+ ADD URI" again
   - **Enter:** `http://localhost:3000`

6. **Authorized redirect URIs:**
   - **Click** "+ ADD URI"
   - **Enter:** `http://localhost:8000/gmail/oauth/callback/`
   - ⚠️ **Important:** Make sure to include the trailing slash `/`

7. **Click** "CREATE"

8. **Credentials Created!** You'll see a popup with:
   ```
   Your Client ID
   Your Client Secret
   ```

9. **📋 COPY BOTH VALUES** - You'll need these for your `.env` file

✅ **Checkpoint:** You have your Client ID and Client Secret!

---

### **Step 6: Add Credentials to `.env` File**

1. **Open your terminal**

2. **Navigate to backend folder:**
   ```bash
   cd /Users/craig/Documents/nexus-core-clinic/backend
   ```

3. **Edit the `.env` file:**
   ```bash
   nano .env
   ```
   
   Or open it in your code editor.

4. **Add these lines** (replace with your actual values):
   ```env
   # Gmail API OAuth2 Configuration
   GMAIL_CLIENT_ID=123456789-abcdefghijk.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=GOCSPX-YourSecretHere
   GMAIL_REDIRECT_URI=http://localhost:8000/gmail/oauth/callback/
   ```

5. **Save the file:**
   - If using nano: Press `Ctrl + X`, then `Y`, then `Enter`
   - If using code editor: Save normally

✅ **Checkpoint:** Credentials are in your `.env` file

---

### **Step 7: Restart Django Server**

**The server needs to restart to load the new environment variables.**

1. **Stop the Django server** (if it's running):
   ```bash
   # Press Ctrl + C in the terminal running Django
   ```

2. **Start it again:**
   ```bash
   cd /Users/craig/Documents/nexus-core-clinic/backend
   source venv/bin/activate
   python manage.py runserver 8000
   ```

3. **You should see:**
   ```
   Starting development server at http://localhost:8000/
   ```

✅ **Checkpoint:** Django is running with new credentials

---

### **Step 8: Connect Your Gmail Account**

1. **Open your browser** and go to: **http://localhost:3000**

2. **Click** "Settings" in the navigation menu

3. **Click** the **"Gmail"** tab (second tab with mail icon)

4. **You should see:**
   - ⚠️ "Not Connected" alert
   - Setup instructions
   - Blue "Connect to Gmail" button

5. **Click** "Connect to Gmail"

6. **You'll be redirected to Google:**
   - Select your Gmail account
   - Review permissions (send emails, read metadata)
   - Click "Continue" or "Allow"

7. **You'll be redirected back** to the settings page with:
   - ✅ "Connected to Gmail" green alert
   - Your email address displayed
   - Connection details (emails sent, token expiry, etc.)

✅ **Success!** Your Gmail account is connected!

---

### **Step 9: Test the Connection**

1. **In the Gmail settings page**, click **"Test Connection"**

2. **Enter your email address** in the modal

3. **Click** "Send Test Email"

4. **Check your inbox** for the test email:
   ```
   Subject: Gmail Integration Test - WalkEasy Nexus
   ```

5. **If you received it:** ✅ Everything is working perfectly!

---

## 📋 Your `.env` File Should Look Like This

```env
# Django Secret Key
SECRET_KEY=your-existing-django-secret-key

# Gmail API OAuth2 Configuration
GMAIL_CLIENT_ID=123456789-abcdefghijk.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-YourActualSecretHere
GMAIL_REDIRECT_URI=http://localhost:8000/gmail/oauth/callback/

# Optional: SMTP Fallback (if you want backup email method)
EMAIL_HOST_USER=your-clinic-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password-here
EMAIL_FROM=your-clinic-email@gmail.com
EMAIL_FROM_NAME=WalkEasy Nexus

# OpenAI (if configured)
OPENAI_API_KEY=sk-...

# Other existing configuration...
```

---

## 🐛 Troubleshooting

### **Problem: "OAuth credentials not configured"**

**Solution:**
- Check that `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` are in `.env`
- Make sure there are no extra spaces or quotes
- Restart Django server

---

### **Problem: "redirect_uri_mismatch" error**

**Solution:**
- Go back to Google Cloud Console → Credentials
- Edit your OAuth 2.0 Client ID
- Make sure **Authorized redirect URIs** includes: `http://localhost:8000/gmail/oauth/callback/`
- Note the trailing slash `/` is required!

---

### **Problem: "Access blocked: This app's request is invalid"**

**Solution:**
- Go to OAuth consent screen in Google Cloud Console
- Make sure your email is added to "Test users"
- Make sure all required scopes are added

---

### **Problem: "Gmail API has not been used..."**

**Solution:**
- Go to APIs & Services → Library
- Search for "Gmail API"
- Make sure it's enabled (green checkmark)

---

### **Problem: Connection works but emails not sending**

**Solution:**
- Check you've granted all permissions during OAuth
- Test with "Test Connection" button first
- Check Django logs for error messages

---

## 📸 Visual Reference

### **What You'll See in Google Cloud Console:**

1. **Project Dashboard:**
   ```
   Project: WalkEasy Nexus
   APIs enabled: Gmail API
   ```

2. **Credentials Page:**
   ```
   OAuth 2.0 Client IDs
   Name: WalkEasy Nexus - Gmail Integration
   Type: Web application
   Client ID: 123456789-...apps.googleusercontent.com
   ```

3. **OAuth Consent Screen:**
   ```
   Publishing status: Testing
   User type: External
   ```

### **What You'll See in Your App:**

1. **Before Connection:**
   ```
   ⚠️ Not Connected
   [ Connect to Gmail ] button
   ```

2. **After Connection:**
   ```
   ✅ Connected to Gmail
   Connected as: your-email@gmail.com
   Emails sent: 0
   [ Refresh Token ] [ Disconnect ] buttons
   ```

---

## 🎉 Success!

If you've completed all steps, you should now have:

✅ Google Cloud project created  
✅ Gmail API enabled  
✅ OAuth consent screen configured  
✅ OAuth 2.0 credentials created  
✅ Credentials added to `.env` file  
✅ Django server restarted  
✅ Gmail account connected in the app  
✅ Test email sent and received  

**You're ready to send emails via Gmail API!** 🚀

---

## 🔗 Quick Links

- **Google Cloud Console:** https://console.cloud.google.com/
- **Gmail API Library:** https://console.cloud.google.com/apis/library/gmail.googleapis.com
- **Credentials Page:** https://console.cloud.google.com/apis/credentials
- **OAuth Consent:** https://console.cloud.google.com/apis/credentials/consent
- **Your App Settings:** http://localhost:3000/settings?tab=gmail

---

## 📞 Need Help?

If you get stuck:

1. Check the troubleshooting section above
2. Review the [full guide](GMAIL_INTEGRATION_GUIDE.md)
3. Check Django logs: Look at terminal where Django is running
4. Check browser console: F12 → Console tab

---

**🎊 That's it! You're all set to use Gmail API for professional email sending!** 🎊

