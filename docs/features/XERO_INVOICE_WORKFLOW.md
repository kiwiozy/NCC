# 🧾 Xero Invoice Workflow - Company & Patient Linking Strategy

**Branch:** `xero`  
**Created:** November 2025  
**Status:** Research & Planning

---

## 🎯 Business Requirement

**Goal:** When creating an invoice in Xero, we need to link **BOTH**:
1. **Patient** - The person receiving the service
2. **Company** - The organization paying for the service (if applicable)

**Example Scenarios:**
- **Scenario A:** Patient John Smith sees a clinician. His employer (ABC Company) pays the invoice.
- **Scenario B:** Patient Sarah Jones sees a clinician. Her NDIS plan manager (XYZ Services) pays the invoice.
- **Scenario C:** Patient Tom Brown sees a clinician. He pays directly (no company).

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
2. ⬜ **Decide on approach** (Option A, B, C, or Hybrid)
3. ⬜ **Add billing fields to Appointment model**
4. ⬜ **Update Xero service to include company in reference**
5. ⬜ **Build invoice creation UI**
6. ⬜ **Build Xero invoices page**
7. ⬜ **Test with real Xero data**
8. ⬜ **Create user documentation**

---

## 🔗 Related Documentation

- `backend/xero_integration/services.py` - Current Xero service
- `backend/xero_integration/models.py` - Database models
- `docs/integrations/XERO.md` - Xero integration overview
- `XERO_BRANCH_OVERVIEW.md` - Branch planning document

---

**Status:** 📋 Research Complete - Awaiting Decision on Approach

