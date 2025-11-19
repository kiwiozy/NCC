# 🚀 Email Generator - Quick Start Guide

**Get up and running in 5 minutes!**

---

## ✨ What You Get

Professional, consistent emails automatically generated from your data - just like the PDF generator!

**Features:**
- 📧 Invoice, Receipt, Quote, AT Report emails
- 🎨 Custom branding colors
- 📱 Mobile responsive
- ✅ Status badges (PAID, OVERDUE)
- 💳 Payment methods
- 📊 Line items table
- 🔐 Type-safe validation

---

## 🎯 How to Use

### **Option 1: Frontend (Easiest)**

1. Go to **Xero → Invoices & Quotes**
2. Click **Email** button on any invoice/quote
3. Toggle **ON** "Use Professional Email Generator"
4. Select template (for header color)
5. Enter recipient email
6. Click **Send Email**

**Done!** Email is automatically generated and sent.

---

### **Option 2: API Call**

```bash
POST /api/invoices/send-email/
Content-Type: application/json

{
  "invoice_id": "your-invoice-uuid",
  "to": "customer@example.com",
  "from_email": "info@walkeasy.com.au",
  "document_type": "invoice",
  "use_generator": true,
  "attach_pdf": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice email sent successfully",
  "email_id": "sent-email-uuid"
}
```

---

### **Option 3: Python Code**

```python
from invoices.email_generator import EmailGenerator, generate_invoice_email
from decimal import Decimal
from datetime import date

# Quick way (convenience function)
email_html = generate_invoice_email({
    'contact': {'name': 'John Smith', 'email': 'john@example.com'},
    'invoice_number': 'INV-001',
    'invoice_date': date(2025, 1, 15),
    'due_date': date(2025, 1, 29),
    'subtotal': Decimal('100.00'),
    'tax_total': Decimal('10.00'),
    'total': Decimal('110.00'),
    'amount_due': Decimal('110.00'),
    'line_items': [
        {
            'description': 'Consultation',
            'quantity': Decimal('1'),
            'unit_amount': Decimal('100.00'),
            'tax_amount': Decimal('10.00'),
            'total': Decimal('110.00')
        }
    ],
    'payment_methods': [
        {
            'method_type': 'bank',
            'account_name': 'WalkEasy Nexus Pty Ltd',
            'bsb': '062-692',
            'account_number': '1060 3588'
        }
    ],
    'clinic_name': 'WalkEasy Nexus'
})

# Advanced way (full control)
generator = EmailGenerator('invoice', header_color='#3b82f6')
email_html = generator.generate(invoice_data)
preview = generator.generate_preview(invoice_data)

print(preview['subject'])  # Auto-generated subject
print(preview['preview'])  # Email snippet
```

---

## 🎨 Customization

### **Change Header Color:**

```python
# Use template's color (recommended)
generator = EmailGenerator('invoice')
email = generator.generate(data)

# Or override with custom color
generator = EmailGenerator('invoice', header_color='#ff6b6b')
```

### **Email Types & Colors:**

| Type | Color | Icon | Use For |
|------|-------|------|---------|
| `invoice` | Blue `#3b82f6` | 📄 | Unpaid invoices |
| `receipt` | Green `#10b981` | ✓ | Paid invoices |
| `quote` | Purple `#8b5cf6` | 💼 | Quotes/estimates |
| `at_report` | Indigo `#667eea` | 📋 | AT assessment reports |
| `letter` | Gray `#6b7280` | ✉️ | Professional letters |

---

## 🔧 Required Data Fields

### **Invoice:**
```python
{
    'contact': {'name': str, 'email': str},  # Required
    'invoice_number': str,                    # Required
    'invoice_date': date,                     # Required
    'due_date': date,                         # Required
    'subtotal': Decimal,                      # Required
    'tax_total': Decimal,                     # Required
    'total': Decimal,                         # Required
    'amount_due': Decimal,                    # Required
    'line_items': [],                         # Optional
    'payment_methods': [],                    # Optional
    'status': str,                            # Optional
    'clinic_name': str                        # Optional
}
```

### **Quote:**
```python
{
    'contact': {'name': str},
    'quote_number': str,
    'quote_date': date,
    'expiry_date': date,
    'subtotal': Decimal,
    'tax_total': Decimal,
    'total': Decimal,
    'line_items': [],
    'clinic_name': str
}
```

### **AT Report:**
```python
{
    'contact': {'name': str},
    'participant_name': str,
    'ndis_number': str,           # Optional
    'assessor_name': str,
    'assessment_date': date,       # Optional
    'report_date': date,
    'custom_message': str          # Optional
}
```

---

## 🧪 Testing

### **Test in Development:**

```bash
# 1. Start Django
cd backend
python manage.py runserver

# 2. Open frontend
cd frontend
npm run dev

# 3. Test email
# Go to Xero → Invoices → Click Email on any invoice
# Toggle generator ON
# Send to your test email
```

### **Test via API:**

```bash
curl -X POST https://localhost:8000/api/invoices/send-email/ \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "your-uuid",
    "to": "test@example.com",
    "use_generator": true,
    "document_type": "invoice"
  }'
```

---

## 🐛 Common Issues

### **Problem: "Missing required fields" error**

**Solution:** Check that all required fields are present in your data dict. Use the data models for validation:

```python
from invoices.email_data_models import create_email_data

try:
    email_data = create_email_data('invoice', your_data)
    email_data.validate()  # Raises ValueError if invalid
except ValueError as e:
    print(f"Validation error: {e}")
```

### **Problem: Email looks plain (no styling)**

**Solution:** Make sure `use_generator: true` is set. If using legacy mode, emails use basic template HTML.

### **Problem: Header color not applying**

**Solution:** Pass `template_id` with your API call, or set `header_color` directly in code.

---

## 📚 Learn More

- **Full Documentation:** `docs/integrations/EMAIL_GENERATOR.md`
- **API Reference:** `backend/invoices/email_views.py`
- **Data Models:** `backend/invoices/email_data_models.py`
- **Components:** `backend/invoices/email_components.py`
- **Layouts:** `backend/invoices/email_layouts.py`

---

## 💡 Tips & Tricks

### **1. Preview Before Sending:**

```python
generator = EmailGenerator('invoice')
preview = generator.generate_preview(invoice_data)

print(f"Subject: {preview['subject']}")
print(f"Preview: {preview['preview']}")
```

### **2. Generate Without Wrapper:**

```python
# Get just the content (no HTML wrapper)
content_only = generator.generate(data, include_wrapper=False)
```

### **3. Custom Subtitle:**

```python
# Override auto-generated subtitle
html = generator.generate(data, subtitle="URGENT: Payment Required")
```

### **4. Get Available Types:**

```python
types = EmailGenerator.get_available_types()
for type_name, info in types.items():
    print(f"{type_name}: {info['name']} - {info['color']}")
```

---

## ✅ Quick Checklist

Before going live:

- [ ] Test all email types (invoice, receipt, quote)
- [ ] Check emails on mobile device
- [ ] Test with real invoice data
- [ ] Verify PDF attachments work
- [ ] Test signature appending
- [ ] Check Gmail sending works
- [ ] Test with different header colors
- [ ] Verify payment methods display correctly
- [ ] Test PAID/OVERDUE badges
- [ ] Check responsive design

---

## 🚀 You're Ready!

The Email Generator is **production-ready** and fully integrated.

**Default behavior:** Generator is **ON** by default (recommended).  
**Legacy mode:** Turn generator **OFF** to use old template system.

**Questions?** Check the full documentation at `docs/integrations/EMAIL_GENERATOR.md`

---

**Happy emailing! 📧✨**

