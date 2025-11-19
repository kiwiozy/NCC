# Invoice System - Current State & User Profile Integration Plan

## 📋 Current Invoice System

### **Database Models**

**XeroInvoiceLink** (`backend/xero_integration/models.py`)
- Links to Xero invoices (not local invoice generation)
- Fields:
  - `id` (UUID)
  - `appointment` (FK, optional)
  - `patient` (FK, optional)
  - `company` (FK, optional)
  - `xero_invoice_id` (str)
  - `xero_invoice_number` (str)
  - `status` (DRAFT, AUTHORISED, PAID, etc.)
  - `total`, `subtotal`, `total_tax`, `amount_due`, `amount_paid`
  - `invoice_date`, `due_date`
  - No line items stored locally - fetched from Xero API

### **Email Generation System**

**EmailGenerator** (`backend/invoices/email_generator.py`)
- Centralized system for generating professional emails
- Supports: invoice, receipt, quote, at_report, letter
- Uses type-safe dataclasses for data validation
- Generates HTML with consistent branding
- Features:
  - Dynamic content based on email type
  - Professional styling (#5b95cf blue brand color)
  - Responsive tables and formatting
  - Auto-generates email subject/preview

**Current Invoice Email Flow:**
1. Invoice created in Xero via `XeroService.create_invoice()`
2. `XeroInvoiceLink` record created in local DB
3. Email sent using `EmailGenerator`:
   ```python
   generator = EmailGenerator('invoice')
   html = generator.generate(invoice_data_dict)
   ```
4. Email includes:
   - Contact info (patient/company name, email)
   - Invoice number, dates
   - Line items (description, qty, amount)
   - Payment details
   - **NO clinician signature or professional details currently**

### **What's Missing:**

1. ❌ **No clinician/user info in invoices**
   - No "From" clinician details
   - No professional registration numbers
   - No email signature
   
2. ❌ **No PDF generation for invoices**
   - AT Reports have PDF generator
   - Invoices only exist in Xero (can be fetched via API)
   
3. ❌ **No line items stored locally**
   - Must fetch from Xero API each time
   - Can't generate invoice without Xero connection

---

## 🎯 Goal: Add User Profile Info to Invoices

### **What We Want:**

When sending an invoice email, include:
- ✅ **Clinician name** (from user profile)
- ✅ **Professional credentials** (e.g., "C.Ped(C), B.App.Sc")
- ✅ **Registration number** (e.g., "Pedorthic Registration # 3454")
- ✅ **Email signature** (HTML signature with logo, contact info)
- ✅ **Professional body URL** (e.g., "www.pedorthics.org.au")

### **How This Would Look:**

**Current Invoice Email:**
```
From: WalkEasy Team
Subject: Invoice INV-12345

Hi John,

Please find your invoice attached...

[Invoice details table]

Thank you for your business!

Best regards,
WalkEasy Team
```

**Enhanced Invoice Email with User Profile:**
```
From: Craig Laird <craig@walkeasy.com.au>
Subject: Invoice INV-12345

Hi John,

Please find your invoice for today's consultation...

[Invoice details table]

If you have any questions, please don't hesitate to contact me.

Best regards,

[HTML Email Signature:]
━━━━━━━━━━━━━━━━━━━
Walk Easy Pedorthics
Craig Laird
Principal Pedorthist
Pedorthic Registration # 3454

📞 02 6766 3153
✉ craig@walkeasy.com.au
🌐 www.walkeasy.com.au
📍 43 Harrison St, Cardiff, NSW 2285
📍 21 Dowe St, Tamworth, NSW 2340

[PAA Member Logo]

IMPORTANT: The contents of this email...
━━━━━━━━━━━━━━━━━━━
```

---

## 🔧 Implementation Plan

### **Step 1: Add Clinician FK to XeroInvoiceLink**

Add a foreign key to track which clinician created/sent the invoice:

```python
# backend/xero_integration/models.py
class XeroInvoiceLink(models.Model):
    # ... existing fields ...
    
    # Add this field
    clinician = models.ForeignKey(
        'clinicians.Clinician',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='xero_invoices',
        help_text="Clinician who created/sent this invoice"
    )
```

### **Step 2: Update EmailGenerator to Include Clinician Signature**

Modify `backend/invoices/email_wrapper.py` to append signature:

```python
def wrap_email_html(
    body_html: str,
    header_color: str,
    email_type: str,
    title: Optional[str] = None,
    clinician=None  # Add this parameter
) -> str:
    # ... existing code ...
    
    # Add signature if clinician provided
    signature_html = ''
    if clinician and clinician.signature_html:
        signature_html = f'''
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td style="border-top: 2px solid #e5e7eb; padding-top: 30px;">
                    {clinician.signature_html}
                </td>
            </tr>
        </table>
        '''
    
    # Insert signature before closing </body>
    html = html.replace('</body>', f'{signature_html}</body>')
    return html
```

### **Step 3: Update Invoice Creation to Pass Clinician**

```python
# backend/xero_integration/services.py
def create_invoice(
    self,
    appointment=None,
    patient=None,
    company=None,
    clinician=None,  # Add this
    # ... other params ...
) -> XeroInvoiceLink:
    # ... create invoice in Xero ...
    
    link = XeroInvoiceLink.objects.create(
        appointment=appointment,
        patient=patient,
        company=company,
        clinician=clinician,  # Save clinician
        # ... other fields ...
    )
    
    return link
```

### **Step 4: Update Email Sending to Include Signature**

```python
# When sending invoice email
from invoices.email_generator import EmailGenerator

# Get clinician from invoice link
clinician = invoice_link.clinician

# Generate email with signature
generator = EmailGenerator('invoice', clinician=clinician)
html = generator.generate(invoice_data)

# Email now includes clinician signature automatically
```

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Send Invoice" from Patient Account page            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Get current logged-in user's Clinician profile                   │
│    - Fetch clinician record: Clinician.objects.get(user=request.user)
│    - Has signature_html, registration_number, credentials           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Create invoice in Xero (XeroService.create_invoice)             │
│    - Pass clinician parameter                                       │
│    - Save clinician FK in XeroInvoiceLink                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Generate email HTML (EmailGenerator)                             │
│    - Pass clinician to generator                                    │
│    - Generator fetches signature_html from clinician                │
│    - Appends signature to email body                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Send email via Gmail (GmailService)                              │
│    - Use clinician's email as "from" address (if configured)       │
│    - Subject includes clinician name                                │
│    - Body includes full HTML signature                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Changes Required

### **Migration: Add clinician FK to XeroInvoiceLink**

```bash
cd backend
python manage.py makemigrations xero_integration -n add_clinician_to_invoice
python manage.py migrate
```

This will add:
- `clinician_id` (UUID, nullable FK to clinicians table)
- Index on `clinician_id` for performance

---

## 🎨 UI Changes Required

### **Frontend: Pass Clinician When Creating Invoice**

In `PatientInvoicesQuotes.tsx` or invoice creation dialogs:

```typescript
// Get current user's clinician profile
const currentClinician = await fetch('/api/auth/current-clinician/');

// When creating invoice
const invoiceData = {
  patient_id: patient.id,
  line_items: [...],
  clinician_id: currentClinician.id,  // Add this
  // ... other fields
};

await fetch('/api/xero/invoices/', {
  method: 'POST',
  body: JSON.stringify(invoiceData),
});
```

---

## ✅ Benefits

1. **Professional Branding** - Each clinician's signature on their invoices
2. **Accountability** - Track which clinician sent each invoice
3. **Personalization** - Patients see their clinician's contact info
4. **Compliance** - Professional registration numbers included
5. **Consistency** - Same signature used across all emails

---

## 🚧 Considerations

1. **User must have clinician profile**
   - What if admin user doesn't have clinician profile?
   - Fall back to default "WalkEasy Team" signature?

2. **Signature must be set**
   - What if clinician hasn't configured signature yet?
   - Use global default signature from EmailGlobalSettings?

3. **Multiple clinicians per appointment**
   - Which clinician's signature to use?
   - Use appointment.clinician or current logged-in user?

4. **Email "From" address**
   - Send from clinician's email or clinic email?
   - Requires Gmail OAuth for each clinician?

---

## 📝 Files to Modify

1. ✅ **Backend Models**
   - `backend/xero_integration/models.py` - Add clinician FK
   - `backend/xero_integration/migrations/000X_add_clinician_to_invoice.py`

2. ✅ **Backend Services**
   - `backend/xero_integration/services.py` - Update create_invoice()
   - `backend/invoices/email_generator.py` - Accept clinician parameter
   - `backend/invoices/email_wrapper.py` - Append signature

3. ✅ **Backend Views**
   - `backend/xero_integration/views.py` - Pass clinician when creating invoice
   - Add endpoint to get current user's clinician profile

4. ✅ **Frontend Components**
   - `frontend/app/components/xero/CreateInvoiceModal.tsx`
   - `frontend/app/components/xero/EmailInvoiceModal.tsx`
   - `frontend/app/components/xero/PatientInvoicesQuotes.tsx`

---

## 🎯 Next Steps

1. **Create new branch**: `git checkout -b invoice-clinician-signature`
2. **Add clinician FK to model**
3. **Create and run migration**
4. **Update XeroService.create_invoice()**
5. **Update EmailGenerator to append signature**
6. **Update frontend to pass clinician_id**
7. **Test end-to-end flow**
8. **Push and merge**

Ready to start? 🚀

