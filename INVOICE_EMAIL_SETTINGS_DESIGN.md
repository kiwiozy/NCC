# 📧 Invoice/Receipt Email Settings - Configuration Design

**Location:** **Settings → Email Templates** ✅ **(IMPLEMENTED)**

---

## ✅ **IMPLEMENTATION STATUS**

**Phase 1: Navigation & UI Structure - COMPLETE!**
- ✅ Added "Email Templates" tab to Settings navigation
- ✅ Created EmailTemplatesSettings component
- ✅ Integrated into settings page router
- ✅ Built multi-tab interface (5 tabs)

**Next Steps:**
- Backend API endpoints for saving/loading settings
- Database models for email template storage
- Integration with invoice email sending

---

## 🎯 **Configurable Settings Overview**

### **Tab Structure** (in Navigation) ✅ **IMPLEMENTED**
```
Settings (Main Menu)
├── General
├── Funding Sources
├── Clinics
├── User Profiles
├── Data Management
└── 📧 Email Templates ← NEW TAB (LIVE!)
```

---

## ⚙️ **What Can Be Configured?**

### **1. Email Templates** 📝

**A. Invoice Email Template (Unpaid/Due)**
- **Subject Line Template**
  - Default: `Invoice {invoice_number} - {contact_name}`
  - Tokens: `{invoice_number}`, `{contact_name}`, `{amount}`, `{due_date}`, `{clinic_name}`
  - Example: `Invoice ORC1061 from WalkEasy Nexus - Due 01/12/2025`

- **Email Body Template (HTML)**
  - Greeting
  - Main message
  - Invoice details section
  - Payment instructions
  - Footer

- **Quick Message Presets** (dropdown in send modal)
  - "Payment Reminder" → Pre-fills: "This is a friendly reminder that invoice {invoice_number} is now due. Please process payment at your earliest convenience."
  - "Overdue Notice" → Pre-fills: "We notice that invoice {invoice_number} is now overdue. Please contact us if you have any questions."
  - "Payment Plan" → Pre-fills: "As discussed, please find attached invoice {invoice_number}. Payment arrangements have been noted."
  - "Thank You" → Pre-fills: "Thank you for your business. Please find attached invoice {invoice_number}."
  - Custom (blank)

**B. Receipt Email Template (Paid)**
- **Subject Line Template**
  - Default: `Receipt - Invoice {invoice_number} - PAID`
  - Tokens: same as above
  - Example: `Receipt - Invoice ORC1061 from WalkEasy Nexus`

- **Email Body Template (HTML)**
  - Greeting
  - Payment confirmation message
  - Receipt details
  - Thank you message
  - Footer

- **Quick Message Presets**
  - "Payment Received" → "Thank you for your payment. Please find your receipt attached."
  - "Payment Confirmation" → "This confirms we have received your payment for invoice {invoice_number}."
  - Custom (blank)

**C. Quote Email Template**
- **Subject Line Template**
  - Default: `Quote {quote_number} - {contact_name}`
  - Tokens: `{quote_number}`, `{contact_name}`, `{amount}`, `{expiry_date}`, `{clinic_name}`

- **Email Body Template (HTML)**
  - Greeting
  - Quote details
  - Validity period
  - Acceptance instructions
  - Footer

- **Quick Message Presets**
  - "Standard Quote" → "Please find attached quote {quote_number} for your consideration."
  - "Follow Up" → "Following our discussion, please find the requested quote attached."
  - Custom (blank)

---

### **2. Email Appearance** 🎨

**A. Branding**
- **Clinic Logo** (upload image, max 200KB)
  - Used in email header
  - Dimensions: 200x60px recommended
  - Formats: PNG, JPG, GIF

- **Header Color Scheme**
  - Invoice: Default green gradient `#10b981 → #059669`
  - Receipt: Default green gradient (same)
  - Quote: Default purple gradient `#667eea → #764ba2`
  - Custom hex color picker for each

- **Font Family** (dropdown)
  - System Default (Apple/Google fonts)
  - Arial
  - Helvetica
  - Georgia
  - Custom (enter font name)

**B. Layout Options**
- **Email Width** (dropdown)
  - Narrow (500px)
  - Standard (600px) ← Default
  - Wide (700px)

- **Show/Hide Sections** (checkboxes)
  - ☑ Logo in header
  - ☑ Contact information in header
  - ☑ Payment instructions (invoices only)
  - ☑ Bank details (invoices only)
  - ☑ Confidentiality notice in footer
  - ☑ Clinic contact details in footer

---

### **3. Default Sender Settings** 📨

**A. Default Gmail Account**
- **Select Primary Account** (dropdown)
  - Lists all connected Gmail accounts
  - Auto-selects this account when sending
  - Can be overridden in send modal

- **Display Name**
  - How sender name appears in recipient inbox
  - Default: Connected account display name
  - Example: "WalkEasy Nexus Accounts" or "Craig Laird"

**B. Reply-To Settings**
- **Reply-To Email** (optional)
  - If set, replies go to this address instead of sender
  - Example: `accounts@walkeasy.com.au`
  - Leave blank to use sender's email

- **BCC All Emails To** (optional)
  - Automatically BCC this address on all invoice emails
  - Useful for keeping admin/accounts in the loop
  - Example: `admin@walkeasy.com.au`

---

### **4. Auto-Send Rules** 🤖

**A. Automatic Email Triggers** (toggles + options)

- **☐ Email invoices when created**
  - Only for: DRAFT / AUTHORISED (dropdown)
  - Send to: Contact email (if available)
  - Message preset: (dropdown)

- **☐ Email receipts when paid**
  - Auto-detect full payment (amount_due = 0)
  - Send to: Contact email (if available)
  - Message preset: "Payment Received"
  - Delay: Immediate / 1 hour / 24 hours (dropdown)

- **☐ Email quotes when created**
  - Only for: DRAFT / SENT (dropdown)
  - Send to: Contact email (if available)
  - Message preset: "Standard Quote"

- **☐ Send payment reminders**
  - Days before due date: 7 / 3 / 1 (multi-select)
  - Only for: AUTHORISED invoices with amount_due > 0
  - Message preset: "Payment Reminder"

- **☐ Send overdue notices**
  - Days after due date: 7 / 14 / 30 (multi-select)
  - Only for: AUTHORISED invoices with amount_due > 0
  - Message preset: "Overdue Notice"

**B. Auto-Send Restrictions** (safety)
- **☐ Require confirmation before sending** (always show preview)
- **☐ Never auto-send to patients with "No Email" flag**
- **☐ Only send during business hours** (9am-5pm AEST)

---

### **5. Email Content Rules** 📋

**A. Payment Instructions** (for invoices)
- **Show Payment Methods** (checkboxes)
  - ☑ Bank Transfer (EFT)
  - ☐ Credit Card
  - ☐ BPAY
  - ☐ PayPal
  - ☐ Other

- **Bank Details** (for EFT)
  - Account Name: (text input) → Default: "WalkEasy Nexus Pty Ltd"
  - BSB: (text input) → Default: "123-456"
  - Account Number: (text input) → Default: "12345678"
  - Reference Format: (dropdown)
    - Invoice Number → "ORC1061"
    - Patient Name + Invoice → "Craig_Laird_ORC1061"
    - Custom

- **Payment Instructions Text**
  - Editable textarea
  - Default: "Please transfer payment to the account details below and use the invoice number as reference."

**B. Contact Information** (in footer)
- **Clinic Name**: (text input)
- **Phone**: (text input)
- **Email**: (text input)
- **Website**: (text input)
- **Address**: (textarea)

**C. Legal/Compliance**
- **Confidentiality Notice**
  - Editable textarea
  - Default: "This email and any attachments may contain confidential information. If you are not the intended recipient, please delete this email and notify the sender immediately."

- **ABN/ACN** (optional, shown in footer)
  - ABN: (text input)
  - ACN: (text input)

---

### **6. Email Tracking & Logging** 📊

**A. Email History** (read-only, for information)
- **Show Email Log** (button → opens modal)
  - Last 100 emails sent
  - Columns: Date, Invoice#, Recipient, Status (Sent/Failed), Sender Account
  - Filter by: Date range, Status, Sender
  - Export to CSV

**B. Tracking Settings** (toggles)
- **☑ Log all sent emails to database** (always on, can't disable)
- **☐ Enable read receipts** (if supported by Gmail API)
- **☐ Track link clicks** (future: if we add payment links)

---

### **7. Recipient Management** 👥

**A. Contact Email Preferences**
- **Auto-detect email from:**
  1. Patient communication_json.email
  2. Company contact details
  3. Manual entry

**B. Multiple Recipients**
- **Allow multiple recipients** (always enabled)
  - Comma/semicolon separated
  - Validate email format

**C. Email Blocklist** (optional, for future)
  - List of emails to never send to
  - Useful for spam protection

---

### **8. Testing & Preview** 🧪

**A. Test Email**
- **Send Test Email** (button)
  - Opens modal with sample invoice data
  - Sends to specified test email address
  - Shows actual HTML rendering

**B. Template Preview**
- **Preview** button for each template
  - Shows live preview of email with sample data
  - Desktop/Mobile view toggle

---

## 🎨 **UI Layout Design**

### **Page Structure**

```
┌─────────────────────────────────────────────────────────────┐
│  Email Templates & Settings                                  │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Tabs:                                            │       │
│  │  • Templates  • Appearance  • Sender  • Rules    │       │
│  │  • Content    • Tracking    • Testing            │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │  [TAB CONTENT AREA]                              │        │
│  │                                                   │        │
│  │  Settings form with sections...                  │        │
│  │                                                   │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
│  [Save Changes]  [Reset to Defaults]  [Preview]            │
└─────────────────────────────────────────────────────────────┘
```

### **Tab 1: Templates** 📝
```
┌─────────────────────────────────────────────────────────────┐
│  Invoice Email Template                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Subject Line Template                               │   │
│  │  [Invoice {invoice_number} - {contact_name}      ]  │   │
│  │  Available tokens: {invoice_number}, {contact_name}, │   │
│  │  {amount}, {due_date}, {clinic_name}                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Email Body Template (HTML)                          │   │
│  │  [Rich text editor / Code editor toggle]            │   │
│  │                                                       │   │
│  │  <p>Dear {contact_name},</p>                        │   │
│  │  <p>Please find attached invoice...</p>             │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Quick Message Presets                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Payment Reminder                                  │   │
│  │    [Edit] [Delete] [Set as Default]                 │   │
│  │  • Overdue Notice                                    │   │
│  │    [Edit] [Delete] [Set as Default]                 │   │
│  │  + Add New Preset                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  [Save Changes]  [Preview]  [Reset to Default]             │
└─────────────────────────────────────────────────────────────┘
```

### **Tab 2: Appearance** 🎨
```
┌─────────────────────────────────────────────────────────────┐
│  Branding                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Clinic Logo                                         │   │
│  │  [Upload Image] [Remove]                            │   │
│  │  Current: [WalkEasy_Logo.png]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Header Color Scheme                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Invoice:  [#10b981] [Preview ██████]              │   │
│  │  Receipt:  [#10b981] [Preview ██████]              │   │
│  │  Quote:    [#667eea] [Preview ██████]              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Layout Options                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Email Width: [Standard (600px) ▼]                  │   │
│  │                                                       │   │
│  │  Show/Hide Sections:                                 │   │
│  │  ☑ Logo in header                                    │   │
│  │  ☑ Contact information                               │   │
│  │  ☑ Payment instructions                              │   │
│  │  ☑ Bank details                                      │   │
│  │  ☑ Confidentiality notice                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  [Save Changes]  [Preview All]  [Reset to Default]         │
└─────────────────────────────────────────────────────────────┘
```

### **Tab 3: Sender Settings** 📨
```
┌─────────────────────────────────────────────────────────────┐
│  Default Gmail Account                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Craig Laird (craig@walkeasy.com.au) ▼]           │   │
│  │  This account will be pre-selected when sending     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Reply-To Settings                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Reply-To Email (optional)                           │   │
│  │  [accounts@walkeasy.com.au                      ]   │   │
│  │  If set, replies will go to this address            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Auto-BCC Settings                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  BCC All Emails To (optional)                        │   │
│  │  [admin@walkeasy.com.au                         ]   │   │
│  │  This address will be BCC'd on all invoice emails   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  [Save Changes]  [Send Test Email]                          │
└─────────────────────────────────────────────────────────────┘
```

### **Tab 4: Auto-Send Rules** 🤖
```
┌─────────────────────────────────────────────────────────────┐
│  Automatic Email Triggers                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ☐ Email invoices when created                       │   │
│  │     Status: [AUTHORISED ▼]                           │   │
│  │     Preset: [Thank You ▼]                            │   │
│  │                                                       │   │
│  │  ☑ Email receipts when paid                          │   │
│  │     Delay: [Immediate ▼]                             │   │
│  │     Preset: [Payment Received ▼]                     │   │
│  │                                                       │   │
│  │  ☐ Send payment reminders                            │   │
│  │     Days before due: [☑ 7  ☑ 3  ☑ 1]                │   │
│  │     Preset: [Payment Reminder ▼]                     │   │
│  │                                                       │   │
│  │  ☐ Send overdue notices                              │   │
│  │     Days after due: [☑ 7  ☑ 14  ☐ 30]               │   │
│  │     Preset: [Overdue Notice ▼]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Safety Settings                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ☑ Require confirmation before sending               │   │
│  │  ☑ Never auto-send to patients with "No Email" flag │   │
│  │  ☐ Only send during business hours (9am-5pm)        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  [Save Changes]                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 💾 **Database Schema**

### **New Model: `EmailTemplateSettings`**
```python
class EmailTemplateSettings(models.Model):
    # Singleton model (only one instance)
    
    # Invoice Template
    invoice_subject = models.CharField(max_length=255, default='Invoice {invoice_number} - {contact_name}')
    invoice_body_html = models.TextField(default='...')
    invoice_body_text = models.TextField(default='...')
    invoice_header_color = models.CharField(max_length=7, default='#10b981')
    
    # Receipt Template
    receipt_subject = models.CharField(max_length=255, default='Receipt - Invoice {invoice_number} - PAID')
    receipt_body_html = models.TextField(default='...')
    receipt_body_text = models.TextField(default='...')
    receipt_header_color = models.CharField(max_length=7, default='#10b981')
    
    # Quote Template
    quote_subject = models.CharField(max_length=255, default='Quote {quote_number} - {contact_name}')
    quote_body_html = models.TextField(default='...')
    quote_body_text = models.TextField(default='...')
    quote_header_color = models.CharField(max_length=7, default='#667eea')
    
    # Sender Settings
    default_gmail_account = models.EmailField(blank=True, null=True)
    reply_to_email = models.EmailField(blank=True, null=True)
    bcc_all_to = models.EmailField(blank=True, null=True)
    
    # Branding
    logo_image = models.ImageField(upload_to='email_templates/', blank=True, null=True)
    email_width = models.CharField(max_length=10, default='600px')
    show_logo = models.BooleanField(default=True)
    show_contact_info = models.BooleanField(default=True)
    show_payment_instructions = models.BooleanField(default=True)
    show_bank_details = models.BooleanField(default=True)
    show_confidentiality = models.BooleanField(default=True)
    
    # Payment Details
    bank_account_name = models.CharField(max_length=255, default='WalkEasy Nexus Pty Ltd')
    bank_bsb = models.CharField(max_length=10, default='123-456')
    bank_account_number = models.CharField(max_length=20, default='12345678')
    payment_reference_format = models.CharField(max_length=50, default='invoice_number')
    payment_instructions_text = models.TextField(default='Please transfer payment...')
    
    # Contact Info
    clinic_name = models.CharField(max_length=255, default='WalkEasy Nexus')
    clinic_phone = models.CharField(max_length=50, blank=True)
    clinic_email = models.EmailField(blank=True)
    clinic_website = models.URLField(blank=True)
    clinic_address = models.TextField(blank=True)
    clinic_abn = models.CharField(max_length=20, blank=True)
    clinic_acn = models.CharField(max_length=20, blank=True)
    
    # Legal
    confidentiality_notice = models.TextField(default='This email and any attachments...')
    
    # Auto-Send Rules
    auto_send_invoices = models.BooleanField(default=False)
    auto_send_receipts = models.BooleanField(default=False)
    auto_send_quotes = models.BooleanField(default=False)
    send_payment_reminders = models.BooleanField(default=False)
    send_overdue_notices = models.BooleanField(default=False)
    
    reminder_days_before = models.JSONField(default=list)  # [7, 3, 1]
    overdue_days_after = models.JSONField(default=list)  # [7, 14, 30]
    
    require_confirmation = models.BooleanField(default=True)
    business_hours_only = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Email Template Settings'
        verbose_name_plural = 'Email Template Settings'
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton)
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        settings, created = cls.objects.get_or_create(pk=1)
        return settings
```

### **New Model: `EmailPreset`**
```python
class EmailPreset(models.Model):
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=[
        ('invoice', 'Invoice'),
        ('receipt', 'Receipt'),
        ('quote', 'Quote'),
    ])
    message_text = models.TextField()
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('category', 'name')
```

---

## 🚀 **Implementation Priority**

### **Phase 1: Core Settings (MVP)** ⭐⭐⭐
- [ ] Create EmailTemplateSettings model
- [ ] Create email settings page (new tab in navigation)
- [ ] Basic template editing (subject + body)
- [ ] Default Gmail account selector
- [ ] Payment details (bank info)
- [ ] Save/Load settings

### **Phase 2: Templates & Presets** ⭐⭐
- [ ] Quick message presets
- [ ] Template token replacement
- [ ] Preview functionality
- [ ] Reset to defaults

### **Phase 3: Appearance** ⭐⭐
- [ ] Logo upload
- [ ] Color pickers
- [ ] Layout options
- [ ] Show/hide sections

### **Phase 4: Advanced Features** ⭐
- [ ] Auto-send rules
- [ ] Email tracking/logging
- [ ] Test email functionality
- [ ] Email history viewer

---

## 📋 **Settings Access Control**

- **Who can access:** Admin users only (for now)
- **Future:** Role-based permissions
  - Admin: Full access
  - Accounts: Can modify templates and sender settings
  - Clinician: View only (can't modify)

---

## 🎯 **Benefits of Configurable Email Settings**

1. **Consistency:** All invoices use same professional template
2. **Branding:** Customize colors, logo, footer
3. **Efficiency:** Quick message presets save time
4. **Compliance:** Standard legal notices, ABN/ACN
5. **Flexibility:** Override settings per email if needed
6. **Automation:** Set-and-forget for routine emails
7. **Tracking:** Know what was sent, when, and to whom

---

**Ready to implement when you are!** 🚀

