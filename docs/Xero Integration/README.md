# 💼 Xero Integration Documentation

Complete documentation for Xero accounting integration in Nexus Core Clinic.

---

## 📚 Documentation Files

### 1. **[XERO_INTEGRATION_SUMMARY.md](./XERO_INTEGRATION_SUMMARY.md)** ⭐ **START HERE**
   - **Status:** ✅ Complete Implementation
   - Complete Xero integration overview
   - Backend models and API endpoints
   - Frontend UI overview
   - OAuth2 authentication flow
   - Testing instructions

### 2. **[SESSION_SUMMARY_XERO_COMPLETE.md](./SESSION_SUMMARY_XERO_COMPLETE.md)** 📋 **SESSION NOTES**
   - Implementation session summary
   - Step-by-step build log
   - Features implemented
   - Testing performed

### 3. **[Xero_Integration.md](./Xero_Integration.md)** 📖 **TECHNICAL SPEC**
   - Technical architecture
   - OAuth2 flow details
   - API integration patterns
   - Data synchronization strategy
   - Error handling and logging

---

## 🎯 Quick Start

### **Access Xero Integration**

1. Navigate to: `http://localhost:3000/settings`
2. Click the **"Xero Integration"** tab
3. Follow the setup wizard to connect your Xero account

### **Backend API Endpoints**

```python
# OAuth2 Authentication
GET  /xero/oauth/connect/              # Start OAuth flow
GET  /xero/oauth/callback/             # Handle OAuth callback
POST /xero/oauth/disconnect/           # Disconnect Xero
POST /xero/oauth/refresh/              # Refresh access token

# Connection Management
GET  /xero/connections/                # List connections
GET  /xero/connections/status/         # Connection status

# Contact Synchronization
GET  /xero/contacts/                   # List contact links
POST /xero/contacts/sync_patient/      # Sync patient to Xero

# Invoice Operations
GET  /xero/invoices/                   # List invoice links
POST /xero/invoices/create_invoice/    # Create draft invoice
POST /xero/invoices/{id}/sync_status/  # Sync payment status

# Item Mappings
GET  /xero/items/                      # List item mappings
POST /xero/items/                      # Create item mapping

# Tracking Categories
GET  /xero/tracking/                   # List tracking categories

# Audit Logs
GET  /xero/logs/                       # View sync logs
```

---

## 💼 Xero Configuration

### **Prerequisites**

1. **Xero Account** - Active Xero subscription
2. **Xero App** - Create app at https://developer.xero.com/
3. **OAuth2 Credentials** - Client ID and Client Secret

### **Setup Steps**

#### **1. Create Xero App**

1. Go to [Xero Developer Portal](https://developer.xero.com/app/manage)
2. Click **"New App"**
3. Fill in details:
   - **App Name:** Nexus Core Clinic
   - **Company/App URL:** Your website
   - **OAuth 2.0 redirect URI:** `https://localhost:8000/xero/oauth/callback/`
4. Copy **Client ID** and **Client Secret**

#### **2. Configure Backend**

Create/edit `.env` file in `backend/`:

```bash
# Xero OAuth2 Configuration
XERO_CLIENT_ID=your_client_id_here
XERO_CLIENT_SECRET=your_client_secret_here
XERO_REDIRECT_URI=https://localhost:8000/xero/oauth/callback/
XERO_SCOPES=accounting.transactions accounting.contacts accounting.settings
```

#### **3. Run Migrations**

```bash
cd backend
source venv/bin/activate
python manage.py migrate
```

#### **4. Restart Server**

```bash
python manage.py runserver 8000
```

---

## 🗄️ Database Models

### **1. XeroConnection**
```python
class XeroConnection(models.Model):
    tenant_id = models.CharField(max_length=100)
    tenant_name = models.CharField(max_length=255)
    access_token = models.TextField()
    refresh_token = models.TextField()
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
```

Stores OAuth2 tokens and tenant information.

### **2. XeroContactLink**
```python
class XeroContactLink(models.Model):
    patient = models.OneToOneField(Patient)
    xero_contact_id = models.CharField(max_length=100)
    last_synced_at = models.DateTimeField()
```

Maps patients to Xero contacts.

### **3. XeroInvoiceLink**
```python
class XeroInvoiceLink(models.Model):
    appointment = models.ForeignKey(Appointment)
    xero_invoice_id = models.CharField(max_length=100)
    xero_invoice_number = models.CharField(max_length=50)
    status = models.CharField(max_length=50)  # DRAFT, SUBMITTED, PAID
    last_synced_at = models.DateTimeField()
```

Maps appointments to Xero invoices.

### **4. XeroItemMapping**
```python
class XeroItemMapping(models.Model):
    internal_code = models.CharField(max_length=50)
    internal_name = models.CharField(max_length=255)
    xero_item_code = models.CharField(max_length=50)
    xero_account_code = models.CharField(max_length=20)
```

Maps service codes to Xero items.

### **5. XeroTrackingCategory**
```python
class XeroTrackingCategory(models.Model):
    xero_tracking_category_id = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    status = models.CharField(max_length=20)
    options = models.JSONField(default=list)
```

Stores Xero tracking categories (e.g., clinic locations).

### **6. XeroSyncLog**
```python
class XeroSyncLog(models.Model):
    operation = models.CharField(max_length=50)
    status = models.CharField(max_length=20)  # success, error
    details = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
```

Audit log for all Xero operations.

---

## ✅ Features Implemented

### **Backend (Django)**
- ✅ **6 Database Models** - Complete data structure
- ✅ **OAuth2 Flow** - Secure authentication
- ✅ **Token Management** - Automatic refresh
- ✅ **Contact Sync** - Patient → Xero Contact
- ✅ **Invoice Creation** - Draft invoices with line items
- ✅ **Payment Sync** - Status synchronization
- ✅ **Item Mappings** - Service code mappings
- ✅ **Tracking Categories** - Multi-clinic support
- ✅ **Audit Logging** - Complete operation history
- ✅ **Error Handling** - Robust error recovery
- ✅ **Admin Interface** - Full Django admin integration

### **Frontend (Next.js + Mantine)**
- ✅ **Connection Status** - Real-time status display
- ✅ **OAuth2 Buttons** - Connect/disconnect
- ✅ **Token Refresh** - Manual refresh capability
- ✅ **Sync Logs** - Real-time log viewer
- ✅ **Setup Instructions** - Step-by-step guide
- ✅ **API Documentation** - Endpoint reference
- ✅ **Features Overview** - What's integrated
- ✅ **Beautiful UI** - Tabbed interface with icons

---

## 🔄 OAuth2 Flow

### **Authentication Process**

```
1. User clicks "Connect to Xero"
   ↓
2. Redirect to Xero login
   ↓
3. User authorizes app
   ↓
4. Xero redirects to callback URL
   ↓
5. Exchange code for tokens
   ↓
6. Store tokens in database
   ↓
7. Ready to sync!
```

### **Token Refresh**

- **Access Token:** Expires in 30 minutes
- **Refresh Token:** Expires in 60 days
- **Auto-refresh:** Automatic before expiry
- **Manual Refresh:** Available in UI

---

## 💳 Typical Workflows

### **Workflow 1: New Patient Invoice**

```
1. Patient appointment completed
   ↓
2. Create patient in Django
   ↓
3. Sync patient to Xero (creates contact)
   POST /xero/contacts/sync_patient/
   ↓
4. Create appointment in Django
   ↓
5. Create draft invoice in Xero
   POST /xero/invoices/create_invoice/
   ↓
6. Clinician reviews/approves invoice in Xero
   ↓
7. Invoice sent to patient from Xero
   ↓
8. Patient pays
   ↓
9. Sync payment status back to Django
   POST /xero/invoices/{id}/sync_status/
```

### **Workflow 2: Existing Patient**

```
1. Check if patient already synced
   GET /xero/contacts/
   ↓
2. If not synced, sync to Xero
   POST /xero/contacts/sync_patient/
   ↓
3. Create invoice
   POST /xero/invoices/create_invoice/
```

---

## 🧪 Testing

### **1. Check Connection Status**

```bash
curl https://localhost:8000/xero/connections/status/ \
  -H "Authorization: Bearer your-token" \
  -k
```

Expected response:
```json
{
  "connected": true,
  "tenant_name": "Your Clinic",
  "tenant_id": "xxx-xxx-xxx",
  "expires_at": "2025-11-01T12:00:00Z"
}
```

### **2. Sync Patient to Xero**

```bash
curl -X POST https://localhost:8000/xero/contacts/sync_patient/ \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1
  }' \
  -k
```

### **3. Create Invoice**

```bash
curl -X POST https://localhost:8000/xero/invoices/create_invoice/ \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": 1,
    "due_date": "2025-12-01",
    "line_items": [
      {
        "description": "Initial Consultation",
        "quantity": 1,
        "unit_amount": 150.00,
        "account_code": "200"
      }
    ]
  }' \
  -k
```

---

## 📊 Item Mapping Examples

### **Service Code Mappings**

| Internal Code | Internal Name | Xero Item Code | Xero Account Code |
|---------------|---------------|----------------|-------------------|
| `CONSULT-INIT` | Initial Consultation | `INIT-CONS` | `200` (Income) |
| `ORTHO-CUSTOM` | Custom Orthotics | `ORTHOTICS` | `200` (Income) |
| `FOLLOW-UP` | Follow-up Appointment | `FOLLOWUP` | `200` (Income) |
| `SCAN-3D` | 3D Foot Scan | `3D-SCAN` | `200` (Income) |

### **Xero Chart of Accounts**

Common account codes:
- **200** - Sales/Income
- **300** - Cost of Goods Sold
- **400** - Expenses
- **610** - Accounts Receivable

---

## 🏢 Multi-Clinic Support

### **Tracking Categories**

Use Xero tracking categories to separate revenue by clinic:

```python
{
  "tracking_category_id": "xxx-xxx-xxx",
  "name": "Clinic Location",
  "options": [
    {"option_id": "aaa-aaa", "name": "Sydney Clinic"},
    {"option_id": "bbb-bbb", "name": "Melbourne Clinic"},
    {"option_id": "ccc-ccc", "name": "Brisbane Clinic"}
  ]
}
```

Each invoice can be tagged with a clinic location for reporting.

---

## 🔒 Security

### **Authentication**
- ✅ **OAuth2** - Industry standard authentication
- ✅ **HTTPS Only** - All communications encrypted
- ✅ **Token Encryption** - Tokens stored securely
- ✅ **Automatic Refresh** - Tokens refreshed before expiry
- ✅ **Audit Logs** - All operations logged

### **Permissions**
- ✅ **Scoped Access** - Only requested permissions granted
- ✅ **Revocable** - Can disconnect anytime
- ✅ **Tenant Isolation** - Multi-tenant support

---

## 🐛 Troubleshooting

### **Common Issues**

#### **"Invalid OAuth2 credentials"**
```
Error: Client authentication failed
```
**Solution:** Check `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` in `.env`

#### **"Redirect URI mismatch"**
```
Error: Redirect URI mismatch
```
**Solution:** Ensure redirect URI in Xero app matches `XERO_REDIRECT_URI`

#### **"Token expired"**
```
Error: Token expired
```
**Solution:** Click "Refresh Token" button in UI or use refresh endpoint

#### **"Tenant not found"**
```
Error: Tenant ID not found
```
**Solution:** Reconnect to Xero to get fresh tenant information

#### **"Invoice creation failed"**
```
Error: Required field missing
```
**Solution:** Ensure all required fields (contact_id, line_items, etc.) are provided

---

## 📈 Reporting

### **Available Reports in Xero**

Once synced, you can use Xero's built-in reports:
- **Profit & Loss** - Revenue by service type
- **Aged Receivables** - Outstanding invoices
- **Sales by Tracking** - Revenue by clinic
- **Contact Summary** - Patient payment history

---

## 📞 Support

For Xero integration issues:
1. Check `XERO_INTEGRATION_SUMMARY.md` for complete setup
2. Review `Xero_Integration.md` for technical details
3. Verify OAuth2 credentials in `.env`
4. Check connection status in UI
5. Review sync logs for errors
6. Check Django admin for connection status

---

## 🔗 External Resources

### **Xero Documentation**
- [Xero API Documentation](https://developer.xero.com/documentation/)
- [OAuth 2.0 Guide](https://developer.xero.com/documentation/guides/oauth2/overview/)
- [Accounting API](https://developer.xero.com/documentation/api/accounting/overview)

### **Xero Developer Portal**
- [Manage Apps](https://developer.xero.com/app/manage)
- [API Reference](https://developer.xero.com/documentation/api/api-overview)

---

## 🚀 Future Enhancements

### **Planned Features** (TODO)
- ⏳ Automatic invoice creation on appointment completion
- ⏳ Payment tracking webhook integration
- ⏳ Batch invoice creation
- ⏳ Credit note support
- ⏳ Expense tracking integration
- ⏳ Custom report generation
- ⏳ Multi-currency support

---

**Last Updated:** November 1, 2025  
**Version:** 1.0  
**Status:** ✅ Complete & Production Ready  
**API Version:** Xero Accounting API 2.0

