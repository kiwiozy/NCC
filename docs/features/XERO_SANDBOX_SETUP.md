# 🧪 Xero Sandbox Setup Guide

**Purpose:** Connect Nexus to a Xero Demo Organization for testing  
**Updated:** November 2025  
**Status:** Ready for Implementation

---

## 🎯 Overview

Xero doesn't provide a traditional "sandbox" environment. Instead, you use a **Demo Company** - a fully functional Xero organization pre-populated with sample data.

### **Why Use Demo Company:**
- ✅ Test invoices/quotes without affecting real financial data
- ✅ Free to use
- ✅ Can be reset at any time
- ✅ Full API access (same as production)
- ✅ Pre-populated with sample customers, products, accounts

---

## 📋 Step-by-Step Setup

### **Step 1: Create Xero Account (if needed)**

1. Go to https://www.xero.com/signup/
2. Sign up for a free account
3. Choose "Demo Company" when prompted

**OR**

If you already have a Xero account:
1. Login to Xero
2. Click organization switcher (top-right)
3. Click "Add Organization"
4. Select "Demo Company"

---

### **Step 2: Create Xero Developer App**

1. **Go to Developer Portal:**
   - Visit: https://developer.xero.com/
   - Login with your Xero account

2. **Create New App:**
   - Click "My Apps" → "New App"
   - Fill in details:
     ```
     App Name: Nexus Clinic (Development)
     Company URL: https://localhost:3000
     App Type: Web App
     ```

3. **Configure OAuth2 Settings:**
   - **Redirect URI (Local Development):**
     ```
     https://localhost:8000/xero/oauth/callback/
     ```
   
   - **Redirect URI (Production):**
     ```
     https://nexus-production-backend-892000689828.australia-southeast1.run.app/xero/oauth/callback/
     ```
   
   - **Note:** You can add multiple redirect URIs (one for local, one for production)

4. **Select Scopes:**
   - ✅ `accounting.transactions` - Create invoices, quotes, payments
   - ✅ `accounting.contacts` - Sync patients and companies as contacts
   - ✅ `accounting.settings` - Read chart of accounts, tracking categories
   - ✅ `offline_access` - Get refresh token (stay connected)

5. **Get Credentials:**
   - After creating the app, copy:
     - **Client ID** (looks like: `ABCD1234...`)
     - **Client Secret** (looks like: `XYZ789...`)
   - ⚠️ **Keep these secret!** Never commit to Git.

---

### **Step 3: Configure Nexus Backend**

#### **Local Development:**

1. **Update `.env` file:**
   ```bash
   # Xero Integration (Demo/Sandbox)
   XERO_CLIENT_ID=your_demo_client_id_here
   XERO_CLIENT_SECRET=your_demo_client_secret_here
   XERO_REDIRECT_URI=https://localhost:8000/xero/oauth/callback/
   ```

2. **Add to `backend/ncc_api/settings.py`:**
   ```python
   # Xero Integration Settings
   XERO_CLIENT_ID = os.getenv('XERO_CLIENT_ID')
   XERO_CLIENT_SECRET = os.getenv('XERO_CLIENT_SECRET')
   XERO_REDIRECT_URI = os.getenv('XERO_REDIRECT_URI', 'https://localhost:8000/xero/oauth/callback/')
   ```

3. **Restart Django server:**
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart
   python manage.py runserver
   ```

#### **Production Deployment:**

1. **Add to Google Cloud Secret Manager:**
   ```bash
   # Create secrets
   echo -n "your_production_client_id" | gcloud secrets create xero-client-id --data-file=-
   echo -n "your_production_client_secret" | gcloud secrets create xero-client-secret --data-file=-
   ```

2. **Grant Cloud Run access:**
   ```bash
   gcloud secrets add-iam-policy-binding xero-client-id \
     --member=serviceAccount:892000689828-compute@developer.gserviceaccount.com \
     --role=roles/secretmanager.secretAccessor
   
   gcloud secrets add-iam-policy-binding xero-client-secret \
     --member=serviceAccount:892000689828-compute@developer.gserviceaccount.com \
     --role=roles/secretmanager.secretAccessor
   ```

3. **Update Cloud Run environment variables:**
   ```bash
   gcloud run services update nexus-production-backend \
     --region=australia-southeast1 \
     --set-secrets=XERO_CLIENT_ID=xero-client-id:latest,XERO_CLIENT_SECRET=xero-client-secret:latest
   ```

---

### **Step 4: Connect Nexus to Xero**

1. **Start Nexus (Local):**
   ```bash
   # Terminal 1: Django backend
   cd backend
   python manage.py runserver
   
   # Terminal 2: Next.js frontend
   cd frontend
   npm run dev
   ```

2. **Open Nexus in Browser:**
   - Go to: https://localhost:3000
   - Accept self-signed certificate warning

3. **Navigate to Xero Settings:**
   - Click "Accounts" (top navigation)
   - Click "Connection Settings"
   - **OR** go directly to: https://localhost:3000/xero/settings

4. **Click "Connect to Xero":**
   - Button redirects to Xero OAuth2 flow
   - Login with your Xero account (if not already logged in)
   - **Select your Demo Organization** from the dropdown
   - Click "Allow Access"

5. **Verify Connection:**
   - You'll be redirected back to Nexus
   - Status should show "✅ Connected"
   - Organization name should display (e.g., "Demo Company (AUS)")

---

## 🧪 Testing the Integration

### **Test 1: Create an Invoice**

1. **Go to Patients page**
2. **Select a test patient**
3. **Click "Create Invoice"** (when button is added)
4. **Fill in the form:**
   - Select "Patient" as primary contact
   - Add line items (e.g., "Initial Assessment - $150")
   - Add billing notes (optional)
5. **Click "Create Invoice in Xero"**
6. **Verify:**
   - Success message appears
   - Invoice appears in `/xero/invoices`
   - **Open in Xero** - Check it's created correctly

### **Test 2: Create a Quote**

1. **Open CreateInvoiceDialog**
2. **Switch to "Quote"**
3. **Fill in:**
   - Patient
   - Line items
   - Expiry date (e.g., 30 days)
4. **Submit**
5. **Verify:**
   - Quote appears in `/xero/quotes`
   - Status is "DRAFT"
   - **Open in Xero** - Check quote details

### **Test 3: Convert Quote to Invoice**

1. **Go to `/xero/quotes`**
2. **Find your test quote**
3. **In Xero:** Change status to "SENT" or "ACCEPTED"
4. **In Nexus:** Click "Convert to Invoice"
5. **Verify:**
   - Invoice created automatically
   - Quote status changes to "INVOICED"
   - Invoice appears in `/xero/invoices`

### **Test 4: Company Billing**

1. **Create a test company** (e.g., "ABC Insurance")
2. **Create invoice with company as primary:**
   - Select "Company" radio button
   - Patient details appear in reference
3. **Submit**
4. **Verify in Xero:**
   - Company is the "TO:" contact
   - Patient name in reference field
   - Patient name in line item descriptions

---

## 🔄 Using Multiple Environments

### **Scenario:** You want separate Demo orgs for dev, staging, production testing.

**Solution:** Create multiple Xero Demo Companies

1. **Login to Xero**
2. **Add Demo Company:**
   - Click organization switcher
   - Click "Add Organization"
   - Select "Demo Company"
   - Repeat 3 times for: Dev Demo, Staging Demo, Production Demo

3. **When connecting Nexus:**
   - The OAuth flow will show **all your organizations**
   - Select the appropriate demo org for that environment

**Example:**
- `localhost:3000` → Connect to "Demo Company (Dev)"
- `staging.nexus.com` → Connect to "Demo Company (Staging)"
- `nexus.walkeasy.com.au` → Connect to "Demo Company (Production Test)"

---

## 🔄 Resetting Demo Company

**When to reset:**
- You've created lots of test data and want to start fresh
- You want to test the initial sync flow
- Data becomes messy/confusing

**How to reset:**

1. **Login to Xero**
2. **Select your Demo Company**
3. **Go to:** Settings → General Settings
4. **Click "Reset Demo Company"**
5. **Confirm**

**⚠️ Warning:** This deletes ALL data in the demo company! Invoices, contacts, transactions, everything.

**After reset:**
- Nexus connection remains active
- Next sync will create fresh contacts
- Test data is gone

---

## 🆚 Demo vs Production Differences

| Feature | Demo Company | Production Company |
|---------|--------------|-------------------|
| **Cost** | ✅ Free forever | 💰 Paid subscription |
| **API Access** | ✅ Full API (same as production) | ✅ Full API |
| **Data** | 🎭 Sample data (fake customers) | 📊 Real financial data |
| **Reset** | ✅ Can reset anytime | ❌ No reset (permanent data) |
| **Multiple Users** | ⚠️ Only you | ✅ Team collaboration |
| **Reporting** | ✅ Same reports | ✅ Same reports |
| **Xero Branding** | "DEMO COMPANY" watermark | Normal branding |

---

## 🎓 Best Practices

### **DO:**
- ✅ Use Demo Company for all development and testing
- ✅ Create realistic test data (patients, companies, services)
- ✅ Test error scenarios (invalid data, network issues)
- ✅ Test all contact type combinations (patient/company)
- ✅ Test quote-to-invoice conversion flow
- ✅ Test with multiple users (if team testing)

### **DON'T:**
- ❌ Use production Xero org for testing
- ❌ Put real patient data in Demo Company
- ❌ Commit Xero credentials to Git
- ❌ Share Client Secret publicly
- ❌ Test payment processing with real cards (even in demo)

---

## 🐛 Troubleshooting

### **"Invalid client" error**

**Cause:** Client ID or Secret is incorrect

**Fix:**
1. Check `.env` file for typos
2. Verify credentials in Xero Developer Portal
3. Ensure no extra spaces/newlines
4. Restart Django server

---

### **"Redirect URI mismatch" error**

**Cause:** Redirect URI in Nexus doesn't match Xero app config

**Fix:**
1. Check Xero Developer Portal → Your App → OAuth 2.0
2. Ensure redirect URI is **exactly**: `https://localhost:8000/xero/oauth/callback/`
3. Check for trailing slashes
4. If using ngrok/cloudflare tunnel, add that URL too

---

### **"Organization not found" error**

**Cause:** User selected wrong Xero org during OAuth flow

**Fix:**
1. Disconnect Xero in Nexus (`/xero/settings`)
2. Reconnect
3. **Carefully select Demo Company** from dropdown
4. Don't select your production org!

---

### **"Tenant ID missing" error**

**Cause:** OAuth callback didn't save tenant ID

**Fix:**
1. Check Django logs for errors
2. Verify `XeroConnection` model has `tenant_id` field
3. Check database: `python manage.py dbshell` → `SELECT * FROM xero_connection;`
4. If missing, reconnect to Xero

---

### **Invoices not appearing in Xero**

**Cause:** API call failed, check logs

**Fix:**
1. Check Django logs: `tail -f logs/django.log`
2. Check `XeroSyncLog` model in Django admin
3. Look for error messages (rate limit, invalid data, etc.)
4. Verify contact was synced before invoice creation

---

### **Contact sync fails**

**Cause:** Patient/Company data doesn't match Xero schema

**Fix:**
1. Check required fields: name, email (optional), phone (optional)
2. Verify contact data in Nexus database
3. Check Xero API rate limits (60 calls/minute)
4. Try syncing individual contact first

---

## 📚 Additional Resources

### **Xero Documentation:**
- **Developer Portal:** https://developer.xero.com/
- **API Reference:** https://developer.xero.com/documentation/api/api-overview
- **OAuth 2.0 Guide:** https://developer.xero.com/documentation/guides/oauth2/overview
- **Accounting API:** https://developer.xero.com/documentation/api/accounting/overview

### **Python SDK:**
- **GitHub:** https://github.com/XeroAPI/xero-python
- **PyPI:** https://pypi.org/project/xero-python/
- **Examples:** https://github.com/XeroAPI/xero-python/tree/master/examples

### **Nexus Documentation:**
- **Main Integration Doc:** `docs/integrations/XERO.md`
- **Workflow Doc:** `docs/features/XERO_INVOICE_WORKFLOW.md`
- **Implementation Summary:** `docs/features/XERO_IMPLEMENTATION_COMPLETE.md`

---

## 🚀 Ready to Test!

Your Xero Demo Company is now connected and ready for testing. You can:

1. ✅ Create invoices and quotes
2. ✅ Test patient/company billing
3. ✅ Convert quotes to invoices
4. ✅ View sync logs
5. ✅ Test error scenarios

**Next Steps:**
1. Create some test patients and companies in Nexus
2. Follow the testing checklist above
3. Report any issues you find
4. Move to production when ready!

---

**Questions?** Check the troubleshooting section or review the full documentation.

🎉 **Happy Testing!**

