# Xero Integration

**Status:** ✅ Production Ready  
**Last Updated:** November 2025

---

## 📋 **Overview**

Xero integration provides OAuth2-authenticated access to Xero accounting features. Sync contacts, create invoices, and manage financial data directly from the application.

---

## 🎯 **Features**

- ✅ OAuth2 authentication (secure)
- ✅ Contact sync (bidirectional)
- ✅ Invoice creation
- ✅ Payment tracking
- ✅ Organization selection (for users with multiple Xero orgs)

---

## 🛠 **Implementation**

### **Backend**
- **App:** `backend/xero_integration/`
- **Models:** `XeroConnection` (stores OAuth tokens and tenant ID)
- **Service:** `XeroService` (singleton, handles API calls)
- **Views:** OAuth callback, sync contacts, create invoices

### **Frontend**
- **Component:** `frontend/app/components/settings/XeroIntegration.tsx`
- **Features:** Connect to Xero, sync contacts, view sync status

### **API Endpoints**
- `GET /api/xero/authorize/` - Start OAuth flow
- `GET /api/xero/callback/` - OAuth callback
- `POST /api/xero/sync-contacts/` - Sync contacts
- `POST /api/xero/create-invoice/` - Create invoice
- `GET /api/xero/status/` - Get connection status

---

## 🔑 **Setup Requirements**

1. **Xero Developer Portal:**
   - Create OAuth2 app
   - Set redirect URI: `https://localhost:8000/api/xero/callback/`
   - Note Client ID and Client Secret

2. **Environment Variables:**
   ```bash
   XERO_CLIENT_ID=your_client_id
   XERO_CLIENT_SECRET=your_client_secret
   ```

3. **Scopes:**
   - `accounting.contacts`
   - `accounting.transactions`
   - `offline_access` (for refresh tokens)

---

## 📚 **Full Documentation**

Detailed setup guides and implementation docs are archived in:
`docs/archive/legacy-integrations/Xero Integration/`

**Key Files:**
- `XERO_INTEGRATION_SUMMARY.md` - Full implementation summary
- `Xero_Integration.md` - API reference

---

## 🐛 **Troubleshooting**

### **"Invalid client" error**
- Check Client ID and Secret are correct
- Verify redirect URI matches exactly

### **"Tenant not selected" error**
- User needs to select a Xero organization
- Ensure `tenantId` is stored in `XeroConnection`

### **Contact sync fails**
- Check Xero API rate limits (60 calls/minute)
- Verify contact data format matches Xero schema

---

**Status:** ✅ Working in production, no known issues

