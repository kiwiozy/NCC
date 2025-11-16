# 🔷 Xero Branch - Overview

**Branch:** `xero`  
**Created:** November 2025  
**Purpose:** Xero Accounting API integration enhancements and improvements

---

## 📋 Current Status

### ✅ **What's Already Working**

Your Xero integration is **production-ready** with these features:

#### **Backend (`backend/xero_integration/`)**
- ✅ OAuth2 authentication flow
- ✅ Auto-refreshing access tokens (proactive 5-minute buffer)
- ✅ Contact sync (Patient → Xero Contact)
- ✅ Invoice creation (Appointment → Xero Invoice)
- ✅ Payment status sync
- ✅ Multi-tenant support (multiple Xero organizations)
- ✅ Comprehensive logging (`XeroSyncLog`)
- ✅ Robust error handling

#### **Frontend**
**Settings Page (`frontend/app/components/settings/XeroIntegration.tsx`)**
- ✅ Connect to Xero (OAuth flow)
- ✅ Connection status dashboard
- ✅ Token expiry tracking & auto-refresh
- ✅ Manual token refresh button
- ✅ Disconnect functionality
- ✅ Sync logs viewer
- ✅ Real-time connection health monitoring
- ✅ Organization switcher (Demo Company / Production)

**Xero Dashboard (`frontend/app/xero/page.tsx`)**
- ✅ Connection overview
- ✅ Quick stats (contacts, invoices)
- ✅ Quick action cards
- ✅ Navigation to all Xero pages

**Contacts Page (`frontend/app/xero/contacts/page.tsx`)**
- ✅ List all synced contacts (Patients & Companies)
- ✅ Search and filter by type
- ✅ Stats dashboard (Total, Patients, Companies)
- ✅ External links to Xero
- ✅ Sync status tracking

**Invoices Page (`frontend/app/xero/invoices/page.tsx`)**
- ✅ List all invoices with full details
- ✅ Search and filter by status
- ✅ Financial stats (Total, Paid, Due)
- ✅ Status badges (Draft, Submitted, Paid)
- ✅ External links to Xero
- ✅ Create invoice button (ready for implementation)

**Quotes Page (`frontend/app/xero/quotes/page.tsx`)**
- ✅ List all quotes/estimates
- ✅ Search and filter by status
- ✅ Stats dashboard
- ✅ Convert quote to invoice (working!)
- ✅ External links to Xero
- ✅ Create quote button (ready for implementation)

#### **Database Models**
- ✅ `XeroConnection` - Stores OAuth tokens, tenant info, multi-tenant support
- ✅ `XeroContactLink` - Links Patients AND Companies to Xero Contacts
- ✅ `XeroInvoiceLink` - Links Appointments to Xero Invoices (with subtotal/tax)
- ✅ `XeroQuoteLink` - Links Appointments to Xero Quotes (with conversion tracking)
- ✅ `XeroSyncLog` - Tracks all API operations
- ✅ `XeroItemMapping` - Maps local service codes to Xero items
- ✅ `XeroTrackingCategory` - Clinic/department tracking

#### **API Endpoints**
**OAuth & Connection:**
- `GET /xero/oauth/authorize/` - Start OAuth flow
- `GET /xero/oauth/callback/` - OAuth callback handler
- `POST /xero/oauth/refresh/` - Manually refresh token
- `POST /xero/oauth/disconnect/` - Disconnect from Xero
- `GET /xero/connections/status/` - Get connection status
- `GET /api/xero/tenants/available/` - List all accessible organizations
- `POST /api/xero/tenants/switch/` - Switch active organization

**Contact Management:**
- `GET /api/xero-contact-links/` - List all contact links
- `POST /api/xero-contact-links/sync_patient/` - Sync single patient
- `POST /api/xero-contact-links/sync_company/` - Sync single company (new!)

**Invoice Management:**
- `GET /api/xero-invoice-links/` - List all invoices
- `POST /api/xero/invoice/create/` - Create invoice (flexible contact selection)
- `GET /api/xero-invoice-links/{id}/` - Get invoice details
- `PATCH /api/xero-invoice-links/{id}/` - Update invoice

**Quote Management:**
- `GET /api/xero-quote-links/` - List all quotes
- `POST /api/xero/quote/create/` - Create quote
- `POST /api/xero-quote-links/{id}/convert_to_invoice/` - Convert to invoice
- `GET /api/xero-quote-links/{id}/` - Get quote details

**Logging:**
- `GET /api/xero-sync-logs/` - Get sync logs

---

## 🎯 Top Enhancement Suggestions

1. **Company & Referrer Sync** ⭐⭐⭐ - Sync your new models to Xero
2. **Invoice Templates** ⭐⭐⭐ - Save common NDIS item codes/services
3. **Account Codes Dropdown** ⭐⭐ - Fetch chart of accounts from Xero
4. **Enhanced Sync Logs** ⭐⭐ - Better filtering, export, retry
5. **Payment Webhooks** ⭐ - Real-time payment notifications

---

## 🎯 Potential Enhancements for This Branch

Here are improvements you could make on the `xero` branch:

### 1. **Company & Referrer Sync**
Now that you have Companies and Referrers in your system, you could sync them to Xero:
- Sync `Company` → Xero Contact (Supplier)
- Sync `Referrer` → Xero Contact (Professional service provider)
- Add company/referrer filtering in Xero sync UI

### 2. **Bulk Operations**
- Batch sync all patients at once
- Bulk invoice creation for multiple appointments
- Progress tracking for large sync operations

### 3. **Advanced Invoicing**
- **Invoice Templates** - Save common line items
- **Recurring Invoices** - For regular patients
- **Payment Plans** - Split invoices into installments
- **NDIS Claim Codes** - Pre-populate NDIS item codes
- **Tax Configuration** - Support for different tax types

### 4. **Reporting & Analytics**
- Revenue dashboard (sync from Xero)
- Outstanding invoices report
- Payment trends
- Patient payment history
- Xero vs Local data reconciliation

### 5. **Payment Integration**
- Record payments in Nexus when marked as paid in Xero
- Webhook listener for Xero payment notifications
- Payment reminders for overdue invoices

### 6. **Enhanced Sync Options**
- Selective field sync (choose what data to sync)
- Two-way sync (Xero → Nexus updates)
- Conflict resolution for data mismatches
- Scheduled auto-sync (daily/weekly)

### 7. **Xero Chart of Accounts**
- Fetch and cache account codes from Xero
- Dropdown selection for account codes
- Per-service account code mapping
- Tracking categories for clinics/departments

### 8. **Invoice Management UI**
- View Xero invoices directly in Nexus
- Mark as sent/paid from Nexus
- Download PDF invoices
- Email invoices to patients
- Edit draft invoices

### 9. **Multi-Currency Support**
- Support for international patients
- Currency conversion tracking
- Exchange rate display

### 10. **Xero Projects Integration**
- Link appointments to Xero Projects
- Time tracking sync
- Project-based billing

---

## 🔑 Environment Variables

```bash
# Required
XERO_CLIENT_ID=your_xero_oauth_client_id
XERO_CLIENT_SECRET=your_xero_oauth_client_secret
XERO_REDIRECT_URI=https://localhost:8000/xero/oauth/callback/

# Optional (defaults shown)
XERO_SCOPES=offline_access accounting.transactions accounting.contacts accounting.settings.read
```

---

## 📚 API Documentation

### **Xero Python SDK**
- **Package:** `xero-python`
- **Docs:** https://github.com/XeroAPI/xero-python
- **API Reference:** https://developer.xero.com/documentation/api/accounting/overview

### **OAuth 2.0 Flow**
1. User clicks "Connect to Xero"
2. Redirected to Xero login
3. User authorizes app
4. Xero redirects back with code
5. Backend exchanges code for access token
6. Token stored in `XeroConnection`
7. Auto-refresh before expiry

### **Contact Sync Flow**
1. Patient record created/updated in Nexus
2. API call: `POST /xero/sync/contact/{patient_id}/`
3. Backend creates/updates Xero Contact
4. Link stored in `XeroContactLink`
5. Returns Xero Contact ID

### **Invoice Creation Flow**
1. Appointment completed
2. API call: `POST /xero/invoice/create/` with line items
3. Backend ensures patient has Xero Contact
4. Creates DRAFT invoice in Xero
5. Link stored in `XeroInvoiceLink`
6. Returns Xero Invoice ID and number

---

## 🛠 Technical Architecture

### **Service Layer Pattern**
```python
# Singleton service instance
from xero_integration.services import xero_service

# Get active connection (auto-refreshes if needed)
connection = xero_service.get_active_connection()

# Sync a patient to Xero
contact_link = xero_service.sync_contact(patient)

# Create invoice
invoice_link = xero_service.create_invoice(
    appointment=appointment,
    line_items=[
        {
            'description': 'Initial Assessment',
            'quantity': 1,
            'unit_amount': 150.00,
            'account_code': '200',
            'tax_type': 'OUTPUT2'
        }
    ]
)

# Sync payment status
updated_link = xero_service.sync_invoice_status(invoice_link)
```

### **Token Auto-Refresh**
- Backend checks token expiry on every API call
- Proactively refreshes if expires within 5 minutes
- Frontend also monitors and triggers refresh
- Refresh happens silently in the background

### **Error Handling**
- All operations logged to `XeroSyncLog`
- HTTP 4xx errors logged with validation details
- Token errors trigger auto-refresh
- UI shows clear error messages

---

## 🎨 UI Components

### **Settings Page: Xero Integration**
Location: `frontend/app/components/settings/XeroIntegration.tsx`

**Features:**
- Connection status badge (Connected/Disconnected)
- Tenant/Organization name display
- Token expiry countdown
- "Connect to Xero" button (opens OAuth flow)
- "Refresh Token" button (manual refresh)
- "Disconnect" button (revokes connection)
- Sync logs table (last 20 operations)
- Auto-refresh status indicator

**Visual States:**
- ✅ **Connected** - Green badge, shows tenant name
- ⏰ **Token Expiring** - Orange badge, shows countdown
- ❌ **Token Expired** - Red badge, refresh button
- 🔄 **Refreshing** - Spinner, disable buttons
- 🔌 **Disconnected** - Gray badge, connect button

---

## 🐛 Known Issues & Limitations

### **Current Limitations**
1. **Single Active Connection** - Only one Xero org at a time
2. **Draft Invoices Only** - Invoices created as DRAFT (not SUBMITTED)
3. **No Webhook Support** - Must manually sync payment status
4. **No Credit Notes** - Can't create credit notes/refunds yet
5. **No Purchase Orders** - Only supports sales (ACCREC) invoices

### **Rate Limits**
- Xero API: 60 calls/minute, 5,000 calls/day
- Token refresh: Once per 30 minutes (not enforced, but recommended)

### **Token Expiry**
- Access tokens expire in 30 minutes
- Refresh tokens expire in 60 days
- Must re-authenticate after 60 days of inactivity

---

## 📖 Documentation Files

- **Main docs:** `docs/integrations/XERO.md`
- **Archived docs:** `docs/archive/legacy-integrations/Xero Integration/`
- **Frontend component:** `frontend/app/components/settings/XeroIntegration.tsx`
- **Backend service:** `backend/xero_integration/services.py`
- **Models:** `backend/xero_integration/models.py`
- **Views:** `backend/xero_integration/views.py`

---

## 🚀 Quick Start (For Development)

### **1. Set Up Xero Developer App**
1. Go to https://developer.xero.com/app/manage
2. Create new OAuth 2.0 app
3. Add redirect URI: `https://localhost:8000/xero/oauth/callback/`
4. Copy Client ID and Client Secret

### **2. Configure Environment**
```bash
# Add to backend/.env
XERO_CLIENT_ID=your_client_id_here
XERO_CLIENT_SECRET=your_client_secret_here
XERO_REDIRECT_URI=https://localhost:8000/xero/oauth/callback/
```

### **3. Test Connection**
1. Start dev servers: `./start-dev.sh`
2. Navigate to: https://localhost:3000/settings
3. Click "Settings" → "Integrations" → "Xero"
4. Click "Connect to Xero"
5. Authorize in Xero
6. Should see "Connected" status

### **4. Test Contact Sync**
```python
# Django shell
python manage.py shell

from patients.models import Patient
from xero_integration.services import xero_service

patient = Patient.objects.first()
contact_link = xero_service.sync_contact(patient)
print(f"Synced to Xero Contact ID: {contact_link.xero_contact_id}")
```

### **5. Test Invoice Creation**
```python
# Django shell
from appointments.models import Appointment
from xero_integration.services import xero_service

appointment = Appointment.objects.first()
invoice_link = xero_service.create_invoice(
    appointment=appointment,
    line_items=[
        {
            'description': 'Test Service',
            'quantity': 1,
            'unit_amount': 100.00,
            'account_code': '200',
            'tax_type': 'OUTPUT2'
        }
    ]
)
print(f"Created Xero Invoice: {invoice_link.xero_invoice_number}")
```

---

## 🎯 Suggested Focus for This Branch

Since your Xero integration is already **production-ready**, here are the most valuable enhancements:

### **Priority 1: Company & Referrer Sync** ⭐⭐⭐
- Sync your new `Company` and `Referrer` models to Xero
- Useful for tracking referral fees, professional payments
- Leverages your recent Companies/Referrers work

### **Priority 2: Invoice Templates** ⭐⭐⭐
- Save common line items (services) for quick invoice creation
- Pre-configure NDIS item codes and prices
- Reduces data entry, improves consistency

### **Priority 3: Xero Account Codes Dropdown** ⭐⭐
- Fetch chart of accounts from Xero
- Dropdown selection instead of manual entry
- Prevents typos and invalid account codes

### **Priority 4: Enhanced Sync Logs UI** ⭐⭐
- Better filtering (by type, status, date range)
- Export logs to CSV
- Retry failed operations

### **Priority 5: Payment Webhooks** ⭐
- Listen for Xero payment notifications
- Auto-update invoice status in Nexus
- Real-time payment tracking

---

## 📝 Next Steps

**What would you like to work on?**

1. **Company/Referrer Sync** - Extend Xero integration to sync companies and referrers
2. **Invoice Templates** - Build a UI for saving/reusing common line items
3. **Account Codes UI** - Fetch and cache Xero account codes for dropdowns
4. **Payment Sync** - Implement webhook listener for payment notifications
5. **Bulk Sync** - Add batch operations for syncing multiple patients at once
6. **Something else?** - Let me know what you need!

---

**Ready to start? Just let me know what you'd like to build!** 🚀

