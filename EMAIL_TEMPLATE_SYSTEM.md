# 🎨 Professional Email Template System - COMPLETE GUIDE

**Date:** November 19, 2025  
**Status:** ✅ Implemented

---

## 📊 OVERVIEW

The WalkEasy Nexus email system now uses **professional, branded HTML email templates** with:

- ✅ Beautiful gradient headers (customizable color)
- ✅ Professional typography and spacing  
- ✅ Responsive design (works on mobile)
- ✅ Branded footer with contact info
- ✅ Automatic email signature integration
- ✅ Token replacement for dynamic content

---

## 🔧 HOW IT WORKS

### **1. Template Storage (Database)**

Each `EmailTemplate` has:
- `body_html` - Simple HTML content (just paragraphs, lists, etc.)
- `header_color` - Hex color for the header gradient (e.g., `#10b981`)
- `category` - Type of email (invoice, receipt, quote, at_report, letter)
- `name` - Template name (e.g., "Standard Invoice")

### **2. Email Wrapping (New!)**

When an email is sent, the system:

1. Takes the simple `body_html` from template
2. Wraps it in professional email structure with:
   - Gradient header using `header_color`
   - Professional content area
   - Branded footer with contact info
3. Appends email signature (company or personal)
4. Sends via Gmail API

**File:** `backend/invoices/email_wrapper.py`

---

## 🎨 EMAIL STRUCTURE

```
┌─────────────────────────────────────┐
│                                     │
│  [Gradient Header]                  │  ← Uses header_color
│  Icon + Email Type                  │
│  (e.g., "📄 Invoice")              │
│  Invoice Number                     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [Content Area]                     │
│                                     │
│  Dear {contact_name},               │  ← Template body_html
│                                     │
│  Thank you for your payment...      │
│                                     │
│  • Invoice Number: INV-001          │
│  • Amount: $150.00                  │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [Email Signature]                  │  ← Auto-appended
│  (Company or Personal)              │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [Footer]                           │
│  WalkEasy Nexus                     │
│  Website | Phone | Email            │
│  Address Info                       │
│  Confidentiality Notice             │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎨 HEADER COLORS BY TYPE

| Template Type | Header Color | Gradient |
|---------------|--------------|----------|
| **Receipts** | `#10b981` (Green) | Green → Lighter Green |
| **Invoices** | `#3b82f6` (Blue) | Blue → Lighter Blue |
| **Quotes** | `#8b5cf6` (Purple) | Purple → Lighter Purple |
| **Overdue** | `#f59e0b` (Orange) | Orange → Lighter Orange |
| **AT Reports** | `#667eea` (Indigo) | Indigo → Purple |
| **Letters** | `#3b82f6` (Blue) | Blue → Lighter Blue |

---

## 📝 TEMPLATE EXAMPLES

### **Example 1: Simple Template Body**

**What you store in `body_html`:**
```html
<p>Dear {contact_name},</p>

<p>Thank you for your payment. Please find attached your receipt for invoice {invoice_number}.</p>

<p><strong>Payment Details:</strong></p>
<ul>
<li>Invoice Number: {invoice_number}</li>
<li>Amount Paid: ${amount_paid}</li>
<li>Payment Date: {payment_date}</li>
<li>Payment Method: {payment_method}</li>
</ul>

<p>This invoice is now marked as PAID in our system.</p>

<p>Thank you for your business!</p>

<p>Best regards,<br>{clinic_name}</p>
```

**What the user receives:**

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        /* Professional styling */
    </style>
</head>
<body>
    <div class="email-wrapper">
        <!-- HEADER: Green gradient, "✓ Payment Received" -->
        <div class="header">...</div>
        
        <!-- YOUR CONTENT HERE (wrapped professionally) -->
        <div class="content">
            <p>Dear John Smith,</p>
            <p>Thank you for your payment...</p>
            ...
        </div>
        
        <!-- EMAIL SIGNATURE (auto-appended) -->
        <div class="signature">...</div>
        
        <!-- FOOTER: Contact info, confidentiality notice -->
        <div class="footer">...</div>
    </div>
</body>
</html>
```

---

## 🚀 IMPLEMENTATION FILES

### **Backend Files**

| File | Purpose |
|------|---------|
| `invoices/email_wrapper.py` | **NEW** - Wraps simple HTML in professional structure |
| `invoices/email_views.py` | **UPDATED** - Uses wrapper when sending emails |
| `invoices/models.py` | Stores `body_html` and `header_color` |
| `invoices/email_signature_helper.py` | Appends signatures |
| `create_default_email_templates.py` | Creates default templates |

### **Frontend Files**

| File | Purpose |
|------|---------|
| `components/xero/EmailInvoiceModal.tsx` | **UPDATED** - Sends `template_id` to backend |
| `components/settings/EmailTemplateManager.tsx` | Edit templates, set header colors |

---

## 💡 KEY FUNCTIONS

### **`wrap_email_html()`** 
*Location: `backend/invoices/email_wrapper.py`*

```python
def wrap_email_html(
    body_html: str,           # Simple HTML from template
    header_color: str,        # Hex color (e.g., '#10b981')
    email_type: str,          # Email type for header (e.g., 'Invoice')
    title: str = None         # Optional subtitle (e.g., 'INV-001')
) -> str:
    """Wraps simple HTML in professional email structure"""
```

**What it does:**
1. Takes simple `body_html` (just paragraphs, lists)
2. Calculates lighter color for gradient
3. Adds icon based on email type (📄, ✓, 💼, etc.)
4. Wraps in complete HTML structure with styling
5. Adds branded footer
6. Returns complete professional HTML

---

## 🔄 EMAIL FLOW

```
User clicks "Send Email" in frontend
            ↓
EmailInvoiceModal selects template
            ↓
Frontend sends to backend:
  - invoice_id
  - to, cc, bcc
  - subject
  - body_html (simple HTML from template)
  - template_id (for header_color)
  - from_email
  - document_type
            ↓
Backend (email_views.py):
  1. Get template by template_id
  2. Extract header_color from template
  3. Extract invoice number for title
  4. Call wrap_email_html():
     - Wrap body_html in professional structure
     - Use header_color for gradient
     - Add icon and title
  5. Call append_signature_to_email():
     - Add company or personal signature
  6. Generate PDF attachment (if requested)
  7. Send via Gmail API
            ↓
Gmail sends professional email!
```

---

## 📋 CURRENT TEMPLATES

### **1. Receipt - Standard**
- **Category:** receipt
- **Header Color:** `#10b981` (Green)
- **Icon:** ✓
- **Header Title:** "Payment Received"

### **2. Invoice - Standard**
- **Category:** invoice
- **Header Color:** `#3b82f6` (Blue)
- **Icon:** 📄
- **Header Title:** "Invoice"

### **3. Invoice - Overdue Notice**
- **Category:** invoice
- **Header Color:** `#f59e0b` (Orange)
- **Icon:** ⚠️
- **Header Title:** "Payment Reminder"

### **4. Quote - Standard**
- **Category:** quote
- **Header Color:** `#8b5cf6` (Purple)
- **Icon:** 💼
- **Header Title:** "Quote"

### **5. AT Report - Standard**
- **Category:** at_report
- **Header Color:** `#667eea` (Indigo)
- **Icon:** 📋
- **Header Title:** "AT Report"

### **6. Letter - Referral**
- **Category:** letter
- **Header Color:** `#3b82f6` (Blue)
- **Icon:** ✉️
- **Header Title:** "Letter"

---

## 🎨 HOW TO CUSTOMIZE

### **Change Header Color**

1. Go to **Settings** → **Email Templates**
2. Edit a template
3. Click the **Header Color** picker
4. Choose new color (e.g., `#ef4444` for red)
5. Save

**Result:** Emails using that template will have the new header color!

### **Create New Template**

1. Go to **Settings** → **Email Templates**
2. Click **"Create New Template"**
3. Fill in:
   - **Name:** "NDIS Invoice"
   - **Category:** Invoice
   - **Header Color:** `#667eea` (Purple for NDIS)
   - **Subject:** `NDIS Invoice {invoice_number}`
   - **Body HTML:** (Use simple HTML - it will be wrapped)
4. Save

### **Edit Template Content**

**Keep it simple!** You only need to write:
- `<p>` tags for paragraphs
- `<ul>` and `<li>` for lists
- `<strong>` for bold text
- Tokens like `{invoice_number}`, `{contact_name}`

**DON'T include:**
- `<html>`, `<head>`, `<body>` tags
- `<style>` tags
- Header or footer HTML
- Signature HTML

**The system automatically adds:**
- Complete HTML structure
- Professional styling
- Header with gradient
- Footer with contact info
- Email signature

---

## 🎯 SUPPORTED TOKENS

| Token | Description | Example |
|-------|-------------|---------|
| `{invoice_number}` | Invoice number | INV-001 |
| `{quote_number}` | Quote number | QU-001 |
| `{contact_name}` | Patient/Company name | John Smith |
| `{patient_name}` | Patient name | John Smith |
| `{clinic_name}` | Clinic name | WalkEasy Nexus |
| `{invoice_date}` | Invoice date | 2025-01-15 |
| `{due_date}` | Due date | 2025-01-29 |
| `{amount_due}` | Amount due | $150.00 |
| `{amount_paid}` | Amount paid | $150.00 |
| `{payment_date}` | Payment date | 2025-01-15 |
| `{payment_method}` | Payment method | Bank Transfer |
| `{quote_total}` | Quote total | $200.00 |
| `{quote_date}` | Quote date | 2025-01-15 |
| `{expiry_date}` | Quote expiry | 2025-02-15 |

---

## ✅ FEATURES

- ✅ Professional HTML email structure
- ✅ Customizable header colors per template
- ✅ Automatic gradient generation
- ✅ Icons based on email type
- ✅ Responsive design (mobile-friendly)
- ✅ Branded footer with contact info
- ✅ Email signature integration
- ✅ Token replacement
- ✅ PDF attachments
- ✅ Multiple templates per category
- ✅ Default template selection

---

## 🐛 TROUBLESHOOTING

### **Email looks plain/unstyled**

**Problem:** Email doesn't have header or styling  
**Cause:** Old code path not using wrapper  
**Solution:** Ensure `email_views.py` imports and uses `wrap_email_html()`

### **Header color not working**

**Problem:** All emails have same header color  
**Cause:** `template_id` not being sent from frontend  
**Solution:** Check `EmailInvoiceModal.tsx` sends `template_id` in request

### **Signature appearing twice**

**Problem:** Signature shows twice in email  
**Cause:** Signature in `body_html` AND auto-appended  
**Solution:** Remove signature from template `body_html` - it's added automatically

---

## 📚 NEXT STEPS

### **Recommended Improvements:**

1. **Add logo to header** - Replace text with WalkEasy logo
2. **More color presets** - Add color picker with presets
3. **Email preview** - Show preview before sending
4. **A/B testing** - Test different templates
5. **Email analytics** - Track open rates
6. **Template variables** - Add more tokens
7. **Conditional sections** - Show/hide sections based on data

---

## 💻 CODE EXAMPLE

### **Using the Wrapper in Your Code**

```python
from invoices.email_wrapper import wrap_email_html
from invoices.email_signature_helper import append_signature_to_email
from gmail_integration.services import GmailService

# Your simple template HTML
body_html = """
<p>Dear {contact_name},</p>
<p>Your invoice is ready.</p>
"""

# Wrap in professional structure
wrapped = wrap_email_html(
    body_html=body_html,
    header_color='#10b981',  # Green
    email_type='Invoice',
    title='INV-001'
)

# Add signature
with_signature = append_signature_to_email(
    email_body_html=wrapped,
    sender_email='info@walkeasy.com.au',
    user=request.user
)

# Send
gmail_service = GmailService()
gmail_service.send_email(
    to_emails=['customer@example.com'],
    subject='Invoice INV-001',
    body_html=with_signature,
    attachments=[...]
)
```

---

## 🎉 SUMMARY

Your email templates are now **professional, branded, and beautiful!**

**What changed:**
- ✅ Created `email_wrapper.py` - Wraps simple HTML in professional structure
- ✅ Updated `email_views.py` - Uses wrapper when sending
- ✅ Updated `EmailInvoiceModal.tsx` - Sends template_id

**What stayed the same:**
- Templates still stored in database
- Token replacement still works
- Email signature system unchanged
- Gmail API sending unchanged

**Result:**
- Simple HTML templates → Beautiful branded emails
- Customizable header colors → Professional gradient headers
- Consistent footer → Branded contact info
- Works with existing code → No breaking changes

---

**🚀 You're all set! Your emails are now professional and beautiful!**

