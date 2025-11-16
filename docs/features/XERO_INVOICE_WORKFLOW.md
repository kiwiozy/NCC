# 🧾 Xero Invoice & Quote Workflow - Company & Patient Linking Strategy

**Branch:** `xero`  
**Created:** November 2025  
**Status:** Research & Planning

---

## 🎯 Business Requirement

**Goal:** When creating an invoice or quote in Xero, we need to link **BOTH**:
1. **Patient** - The person receiving the service
2. **Company** - The organization paying for the service (if applicable)

**Example Scenarios:**
- **Scenario A:** Patient John Smith sees a clinician. His employer (ABC Company) pays the invoice.
- **Scenario B:** Patient Sarah Jones sees a clinician. Her NDIS plan manager (XYZ Services) pays the invoice.
- **Scenario C:** Patient Tom Brown sees a clinician. He pays directly (no company).

**Quote vs Invoice:**
- **Quote** - Estimate/proposal sent before service (e.g., initial assessment cost)
- **Invoice** - Bill sent after service completed
- **Workflow:** Quote → Accept → Convert to Invoice → Send → Payment

---

## 🔍 Research Findings: Xero API Limitations

### **Key Question:** Can you change the Xero Contact on an invoice after it's created?

### **Answer:** ⚠️ **LIMITED - Depends on Invoice Status**

#### **DRAFT Invoices:**
✅ **YES** - You can update the contact
- Status: `DRAFT`
- Method: `PUT /Invoices/{InvoiceID}` or `POST /Invoices/{InvoiceID}`
- You can change: Contact, Line Items, Amounts, Due Date, etc.
- **Limitation:** Invoice must remain in DRAFT status

#### **SUBMITTED/AUTHORISED Invoices:**
❌ **NO** - Contact is LOCKED
- Status: `SUBMITTED`, `AUTHORISED`, `PAID`
- Once approved/sent, the contact **cannot be changed**
- You would need to:
  1. Void the invoice
  2. Create a new invoice with the correct contact
  3. This creates accounting complexity and audit trail issues

#### **Xero API Documentation:**
- **Create Invoice:** `POST /api.xro/2.0/Invoices`
- **Update Invoice:** `POST /api.xro/2.0/Invoices/{InvoiceID}` (for DRAFT only)
- **Invoice Statuses:**
  - `DRAFT` - Editable, not sent, not approved
  - `SUBMITTED` - Sent for approval (locked)
  - `AUTHORISED` - Approved (locked)
  - `PAID` - Payment received (locked)
  - `VOIDED` - Cancelled (locked)

---

## 📋 Xero Quotes API - Key Features

### **What are Xero Quotes?**

Xero Quotes (also called "Sales Quotes" or "Estimates") allow you to:
- ✅ Send price estimates to patients/companies before providing service
- ✅ Get approval before treatment
- ✅ Convert accepted quotes directly to invoices (one click!)
- ✅ Track quote status (DRAFT, SENT, ACCEPTED, DECLINED, INVOICED)
- ✅ Include expiry dates
- ✅ Include terms and conditions

### **Xero Quotes API Endpoints:**

```python
# Create Quote
POST /api.xro/2.0/Quotes

# Get Quote
GET /api.xro/2.0/Quotes/{QuoteID}

# Update Quote (DRAFT only)
POST /api.xro/2.0/Quotes/{QuoteID}

# Convert Quote to Invoice
# (No direct API - must create invoice with quote reference)
```

### **Quote Statuses:**

| Status | Description | Editable? | Can Convert to Invoice? |
|--------|-------------|-----------|------------------------|
| `DRAFT` | Not sent yet | ✅ Yes | ❌ No |
| `SENT` | Sent to customer | ❌ No | ✅ Yes |
| `ACCEPTED` | Customer accepted | ❌ No | ✅ Yes |
| `DECLINED` | Customer declined | ❌ No | ❌ No |
| `INVOICED` | Converted to invoice | ❌ No | ❌ Already done |
| `DELETED` | Deleted/voided | ❌ No | ❌ No |

### **Key Differences: Quote vs Invoice**

| Feature | Quote | Invoice |
|---------|-------|---------|
| **Purpose** | Estimate/Proposal | Bill for payment |
| **Payment** | No payment | Payment required |
| **Status Flow** | DRAFT → SENT → ACCEPTED → INVOICED | DRAFT → SUBMITTED → AUTHORISED → PAID |
| **Expiry Date** | ✅ Has expiry | ❌ Has due date |
| **Convert** | → Converts to Invoice | N/A |
| **Edit After Send** | ❌ No | ❌ No (if AUTHORISED) |

---

## 🔄 Quote to Invoice Workflow

### **Typical Clinic Workflow:**

```
1. QUOTE CREATION (Before Service)
   ↓
   Patient calls: "How much for an initial assessment?"
   ↓
   Create DRAFT quote in Xero
   ↓
   Send quote to patient/company
   ↓
   Status: SENT

2. QUOTE ACCEPTANCE (Patient Approves)
   ↓
   Patient calls: "I'd like to book"
   ↓
   Mark quote as ACCEPTED in Xero
   ↓
   Create appointment in Nexus
   ↓
   Status: ACCEPTED

3. SERVICE DELIVERY (Appointment Happens)
   ↓
   Patient attends appointment
   ↓
   Clinician provides service
   ↓
   Status: Still ACCEPTED

4. INVOICE CREATION (After Service)
   ↓
   Convert quote to invoice
   ↓
   Invoice matches quote (same line items, amounts)
   ↓
   Status: Quote = INVOICED, Invoice = DRAFT

5. INVOICE FINALIZATION (Send Bill)
   ↓
   Review invoice
   ↓
   Send to patient/company
   ↓
   Status: Invoice = AUTHORISED

6. PAYMENT (Customer Pays)
   ↓
   Payment received
   ↓
   Mark as paid in Xero
   ↓
   Status: Invoice = PAID
```

### **Code Example: Create Quote**

```python
from xero_python.accounting import AccountingApi, Quote, LineItem, Contact, Quotes

def create_quote(self, patient, company, line_items, expiry_date):
    """
    Create a quote in Xero
    """
    api_client = self.get_api_client()
    connection = XeroConnection.objects.filter(is_active=True).first()
    accounting_api = AccountingApi(api_client)
    
    # Sync patient to Xero
    patient_contact = self.sync_contact(patient)
    
    # Build reference (include company if applicable)
    if company:
        reference = f"Quote for: {patient.full_name} (Bill to: {company.name})"
    else:
        reference = f"Quote for: {patient.full_name}"
    
    # Build line items
    xero_line_items = []
    for item in line_items:
        xero_line_items.append(LineItem(
            description=item['description'],
            quantity=item['quantity'],
            unit_amount=item['unit_amount'],
            account_code=item.get('account_code', '200'),
            tax_type=item.get('tax_type', 'OUTPUT2')
        ))
    
    # Create quote
    quote = Quote(
        contact=Contact(contact_id=patient_contact.xero_contact_id),
        date=timezone.now().date(),
        expiry_date=expiry_date,  # E.g., 30 days from now
        reference=reference,
        line_items=xero_line_items,
        status='DRAFT',  # or 'SENT' to send immediately
        terms="Quote valid for 30 days. Services subject to availability.",
        title="Service Quote"
    )
    
    # Send to Xero
    quotes = Quotes(quotes=[quote])
    response = accounting_api.create_quotes(
        xero_tenant_id=connection.tenant_id,
        quotes=quotes
    )
    
    return response.quotes[0]
```

### **Code Example: Convert Quote to Invoice**

```python
def convert_quote_to_invoice(self, quote_link):
    """
    Convert an accepted quote to an invoice
    """
    api_client = self.get_api_client()
    connection = XeroConnection.objects.filter(is_active=True).first()
    accounting_api = AccountingApi(api_client)
    
    # 1. Get the original quote from Xero
    quote_response = accounting_api.get_quote(
        xero_tenant_id=connection.tenant_id,
        quote_id=quote_link.xero_quote_id
    )
    original_quote = quote_response.quotes[0]
    
    # 2. Create invoice with same details
    invoice = Invoice(
        type='ACCREC',
        contact=original_quote.contact,  # Same contact
        line_items=original_quote.line_items,  # Same line items
        reference=f"Quote #{original_quote.quote_number}",
        date=timezone.now().date(),
        status='DRAFT'
    )
    
    # 3. Create invoice in Xero
    invoices = Invoices(invoices=[invoice])
    response = accounting_api.create_invoices(
        xero_tenant_id=connection.tenant_id,
        invoices=invoices
    )
    
    # 4. Update quote status to INVOICED (if needed)
    # Note: Xero may auto-update this
    
    return response.invoices[0]
```

---

## 🏗️ Current Implementation (Nexus)

### **How It Works Now:**

```python
# backend/xero_integration/services.py - create_invoice()

def create_invoice(self, appointment, line_items):
    # 1. Sync patient to Xero as a Contact
    contact_link = self.sync_contact(appointment.patient)
    
    # 2. Create invoice with patient as the Contact
    invoice = Invoice(
        type='ACCREC',
        contact=XeroContact(contact_id=contact_link.xero_contact_id),
        line_items=xero_line_items,
        status='DRAFT',  # Created as DRAFT
        ...
    )
    
    # 3. Store link in database
    XeroInvoiceLink.objects.create(
        appointment=appointment,
        xero_invoice_id=xero_invoice.invoice_id,
        ...
    )
```

### **Current Data Flow:**

```
Appointment → Patient → Xero Contact → Xero Invoice (DRAFT)
                ↓
         (Patient only)
```

### **What's Missing:**

❌ **Company is not linked to the invoice**
❌ **No way to specify who's paying (patient vs company)**
❌ **No tracking of patient-company relationships for billing**

---

## 🎨 Proposed Solution: Xero Contact Strategy

### **Option A: Patient as Primary Contact, Company in Reference** ⭐ RECOMMENDED

**How It Works:**
1. **Xero Contact** = Patient (e.g., "Smith, John")
2. **Invoice Reference** = Company name (e.g., "Bill to: ABC Company")
3. **Invoice Notes** = Company details and billing instructions

**Pros:**
- ✅ Maintains patient as the service recipient (clinically accurate)
- ✅ Company info visible on invoice for manual processing
- ✅ Simple to implement - no major code changes
- ✅ Works with current Xero integration
- ✅ Flexible - can add/change company reference before sending

**Cons:**
- ⚠️ Company is not a "real" Xero contact (can't use for reporting)
- ⚠️ Manual tracking required for company billing
- ⚠️ Xero reports will show patient, not company

**Implementation:**
```python
invoice = Invoice(
    contact=XeroContact(contact_id=patient_contact_id),  # Patient
    reference=f"Bill to: {company.name}",                # Company in reference
    line_amount_types='Inclusive',
    line_items=[...],
    status='DRAFT'
)
```

---

### **Option B: Company as Primary Contact, Patient in Line Items** 

**How It Works:**
1. **Xero Contact** = Company (e.g., "ABC Company Pty Ltd")
2. **Line Item Description** = Patient name + service (e.g., "Podiatry - John Smith")
3. **Invoice Reference** = Patient details

**Pros:**
- ✅ Company is the "real" payer (financially accurate)
- ✅ Xero reports show company revenue
- ✅ Better for B2B billing (NDIS plan managers, corporate accounts)
- ✅ Can track company payment history in Xero

**Cons:**
- ⚠️ Patient is "hidden" in line items (not ideal for patient-centric clinic)
- ⚠️ Requires syncing companies to Xero as contacts
- ⚠️ More complex to implement
- ⚠️ If company changes, must update contact (only works if DRAFT)

**Implementation:**
```python
# 1. Sync company to Xero
company_contact_link = self.sync_contact(company)

# 2. Create invoice with company as contact
invoice = Invoice(
    contact=XeroContact(contact_id=company_contact_id),  # Company
    reference=f"Patient: {patient.full_name}",           # Patient in reference
    line_items=[
        LineItem(
            description=f"Podiatry - {patient.full_name}",  # Patient in description
            quantity=1,
            unit_amount=150.00,
            account_code='200'
        )
    ],
    status='DRAFT'
)
```

---

### **Option C: Dual Contact System (Advanced)**

**How It Works:**
1. **Xero Contact** = Company (primary, for billing)
2. **Xero "Attention" Field** = Patient name
3. **Invoice Reference** = Appointment details
4. **Custom Fields** = Patient ID, Appointment ID (if Xero plan supports)

**Pros:**
- ✅ Both patient and company are clearly identified
- ✅ Best for reporting and compliance
- ✅ Xero's "Attention" field shows on invoice

**Cons:**
- ⚠️ Most complex to implement
- ⚠️ Requires Xero plan with custom fields (not all plans support this)
- ⚠️ Still locks contact once invoice is sent

**Implementation:**
```python
invoice = Invoice(
    contact=XeroContact(
        contact_id=company_contact_id,
        attention=patient.full_name  # Patient in "Attention" field
    ),
    reference=f"Apt #{appointment.id}",
    line_items=[...],
    status='DRAFT'
)
```

---

## 📊 Comparison Matrix

| Feature | Option A (Patient Primary) | Option B (Company Primary) | Option C (Dual System) |
|---------|---------------------------|----------------------------|------------------------|
| **Patient Visibility** | ✅ Primary Contact | ⚠️ In Description | ✅ Attention Field |
| **Company Visibility** | ⚠️ Reference Only | ✅ Primary Contact | ✅ Primary Contact |
| **Xero Reporting** | Patient-based | Company-based | Company-based |
| **Implementation** | ⭐ Simple | Moderate | Complex |
| **Flexibility** | ✅ High | ⚠️ Medium | ⚠️ Medium |
| **B2B Billing** | ⚠️ Manual | ✅ Automated | ✅ Automated |
| **NDIS Compliance** | ⚠️ Manual | ✅ Good | ✅ Excellent |
| **Change Contact?** | N/A (no company sync) | ❌ Only if DRAFT | ❌ Only if DRAFT |

---

## 💡 Recommended Approach

### **Hybrid Strategy: Option A + Database Tracking**

**Why:**
- Most clinics bill the patient directly, even if a company reimburses them later
- Keeps Xero simple and patient-centric
- Company billing can be handled internally via Nexus

**How:**

1. **In Nexus Database:**
   ```python
   # Store who's responsible for payment
   appointment.billing_entity = 'patient'  # or 'company'
   appointment.billing_company = company  # FK to Company model (optional)
   ```

2. **In Xero Invoice:**
   ```python
   # Always use patient as Xero contact
   contact = patient
   
   # If company is paying, add to reference
   if appointment.billing_company:
       reference = f"Bill to: {appointment.billing_company.name}"
   else:
       reference = f"Appointment {appointment.id}"
   ```

3. **Workflow:**
   - **Step 1:** Create appointment in Nexus
   - **Step 2:** Select billing entity (patient or company)
   - **Step 3:** Create DRAFT invoice in Xero (patient as contact)
   - **Step 4:** Review in Nexus UI (shows company if applicable)
   - **Step 5:** Send/Approve invoice in Xero (contact is now locked)

4. **Benefits:**
   - ✅ Simple Xero integration
   - ✅ Company tracking in Nexus
   - ✅ Flexible billing workflows
   - ✅ Can change company before sending (while DRAFT)
   - ✅ Xero invoices are patient-centric (clinical best practice)

---

## 🛠️ Implementation Plan

### **Phase 1: Database Schema** (Backend)
```python
# backend/appointments/models.py
class Appointment(models.Model):
    # ... existing fields ...
    
    # NEW FIELDS:
    billing_entity = models.CharField(
        max_length=20,
        choices=[
            ('patient', 'Patient (Direct)'),
            ('company', 'Company/Organization'),
            ('ndis', 'NDIS Plan Manager'),
        ],
        default='patient',
        help_text="Who is responsible for payment?"
    )
    
    billing_company = models.ForeignKey(
        'companies.Company',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='billed_appointments',
        help_text="Company to bill (if billing_entity is 'company')"
    )
    
    billing_notes = models.TextField(
        blank=True,
        help_text="Special billing instructions"
    )
```

### **Phase 2: Xero Service Update** (Backend)
```python
# backend/xero_integration/services.py
def create_invoice(self, appointment, line_items):
    # Sync patient to Xero
    patient_contact = self.sync_contact(appointment.patient)
    
    # Build invoice reference based on billing entity
    if appointment.billing_entity == 'company' and appointment.billing_company:
        reference = f"Bill to: {appointment.billing_company.name}"
        # Optionally add company details to line item descriptions
        for item in line_items:
            item['description'] = f"{item['description']} (Bill to: {appointment.billing_company.name})"
    else:
        reference = f"Appointment {appointment.id}"
    
    # Create invoice (patient is always the Xero contact)
    invoice = Invoice(
        contact=XeroContact(contact_id=patient_contact.xero_contact_id),
        reference=reference,
        line_items=xero_line_items,
        status='DRAFT',
        ...
    )
    
    return invoice
```

### **Phase 3: Frontend UI** (React)
```typescript
// Invoice Creation Dialog
<Select
  label="Bill To"
  value={billingEntity}
  onChange={setBillingEntity}
  data={[
    { value: 'patient', label: 'Patient (Direct)' },
    { value: 'company', label: 'Company/Organization' },
    { value: 'ndis', label: 'NDIS Plan Manager' },
  ]}
/>

{billingEntity === 'company' && (
  <Select
    label="Select Company"
    value={billingCompany}
    onChange={setBillingCompany}
    data={companies.map(c => ({ value: c.id, label: c.name }))}
    searchable
  />
)}
```

### **Phase 4: Xero Invoices Page** (React)
- Display invoice list
- Show patient AND company (if applicable)
- Filter by billing entity
- Sync status from Xero
- Link to Xero invoice in new tab

---

## ⚠️ Important Considerations

### **1. Invoice Status Matters**
- **DRAFT** = Editable (can change reference, line items, even contact)
- **AUTHORISED** = Locked (contact cannot be changed)
- **Strategy:** Keep invoices as DRAFT in Xero until final review

### **2. Xero Contact Sync Strategy**
- **Current:** Only patients are synced to Xero
- **Future:** May need to sync companies if Option B is chosen
- **Decision Point:** Depends on reporting requirements

### **3. NDIS Billing Specifics**
- NDIS plan managers are typically companies
- May need to sync plan managers as Xero contacts
- Consider using Option B for NDIS invoices specifically

### **4. Reporting Requirements**
- **Patient-centric:** Option A is better
- **Company-centric:** Option B is better
- **Both:** Use Nexus for company reports, Xero for patient invoices

---

## 📝 Next Steps

1. ✅ **Document current state** (this file)
2. ⬜ **Decide on approach** (Option A, B, C, or Hybrid - **RECOMMENDED: Hybrid**)
3. ⬜ **Add billing fields to Appointment model**
4. ⬜ **Update Xero service to include company in reference**
5. ⬜ **Add Quotes support to Xero service** ⭐ NEW
6. ⬜ **Build invoice creation UI**
7. ⬜ **Build quotes creation UI** ⭐ NEW
8. ⬜ **Build Xero invoices page**
9. ⬜ **Build Xero quotes page** ⭐ NEW
10. ⬜ **Implement quote-to-invoice conversion** ⭐ NEW
11. ⬜ **Test with real Xero data**
12. ⬜ **Create user documentation**

---

## ✅ Quotes Implementation Summary

### **Database Model Needed: `XeroQuoteLink`**

```python
# backend/xero_integration/models.py
class XeroQuoteLink(models.Model):
    """Link between Nexus appointment and Xero quote"""
    
    # Local reference
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.CASCADE,
        related_name='xero_quotes',
        null=True,
        blank=True,
        help_text="Appointment this quote is for (if any)"
    )
    
    # Xero quote details
    xero_quote_id = models.CharField(max_length=100, unique=True)
    xero_quote_number = models.CharField(max_length=50, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('DRAFT', 'Draft'),
            ('SENT', 'Sent'),
            ('ACCEPTED', 'Accepted'),
            ('DECLINED', 'Declined'),
            ('INVOICED', 'Invoiced'),
            ('DELETED', 'Deleted'),
        ]
    )
    
    # Financial details
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Dates
    quote_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    
    # Sync tracking
    last_synced_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Invoice link (when converted)
    converted_invoice = models.ForeignKey(
        'XeroInvoiceLink',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_quote',
        help_text="Invoice created from this quote"
    )
    
    class Meta:
        verbose_name = "Xero Quote Link"
        verbose_name_plural = "Xero Quote Links"
        ordering = ['-created_at']
```

### **Xero Service Methods Needed:**

```python
# backend/xero_integration/services.py

def create_quote(self, patient, company, line_items, expiry_date, appointment=None):
    """Create quote in Xero"""
    # See code example above (lines 176-223)
    
def get_quote(self, quote_link):
    """Fetch quote status from Xero"""
    
def update_quote_status(self, quote_link):
    """Sync quote status from Xero"""
    
def convert_quote_to_invoice(self, quote_link):
    """Convert accepted quote to invoice"""
    # See code example above (lines 229-264)
```

### **UI Pages Needed:**

1. **`/xero/quotes`** - List all quotes
   - Filter by status (DRAFT, SENT, ACCEPTED, etc.)
   - Show patient, company, amount, expiry date
   - Actions: View, Edit (if DRAFT), Convert to Invoice
   
2. **Quote Creation Dialog** - Create new quote
   - Select patient
   - Select company (optional)
   - Add line items (services)
   - Set expiry date
   - Preview quote
   - Send to Xero

3. **Quote Details Page** - View single quote
   - Show all details
   - Convert to invoice button (if ACCEPTED)
   - Link to Xero quote (open in new tab)
   - History/timeline

### **Workflow Integration:**

```
Patient Call → Create Quote → Send → Patient Accepts 
    ↓                                        ↓
Book Appointment ← ────────────────────────┘
    ↓
Service Delivery
    ↓
Convert Quote to Invoice → Send Invoice → Payment
```

---

## 🔗 Related Documentation

- `backend/xero_integration/services.py` - Current Xero service
- `backend/xero_integration/models.py` - Database models
- `docs/integrations/XERO.md` - Xero integration overview
- `XERO_BRANCH_OVERVIEW.md` - Branch planning document

---

**Status:** 📋 Research Complete - Awaiting Decision on Approach

