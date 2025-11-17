# Xero Patient-Company Billing Relationship

## Business Concept

### Overview
In WalkEasy Nexus, billing can involve both a **Patient** (recipient of service) and a **Company** (payer). This creates a triangular relationship that Xero's native structure doesn't directly support.

```
┌─────────────┐
│   Patient   │  (Receives Service)
└──────┬──────┘
       │
       │ Service Provided
       │
       ▼
┌─────────────┐         ┌─────────────┐
│  Company    │ ◄─────► │    Xero     │
│   (Payer)   │  Pays   │  Invoice/   │
└─────────────┘         │   Quote     │
                        └─────────────┘
```

## Real-World Scenarios

### Scenario 1: Company-Funded Patient Service
**Example: NDIS/EnableNSW Funding**

1. **Patient**: John Smith needs orthotic devices
2. **Company**: HealthShare (EnableNSW) - will pay for the service
3. **Workflow**:
   - Service is provided to **John Smith**
   - Quote is sent to **HealthShare** for approval
   - Once approved, Invoice is sent to **HealthShare** for payment
   - **Xero Contact**: HealthShare (company)
   - **Patient Record**: John Smith

### Scenario 2: Direct Patient Billing
**Example: Private Pay Patient**

1. **Patient**: Jane Doe wants custom orthotics
2. **Company**: None (patient pays directly)
3. **Workflow**:
   - Service is provided to **Jane Doe**
   - Invoice is sent to **Jane Doe** for payment
   - **Xero Contact**: Jane Doe (patient)
   - **Patient Record**: Jane Doe

### Scenario 3: Multiple Patients Under One Company
**Example: Aged Care Facility**

1. **Company**: Sunset Retirement Village
2. **Patients**: Multiple residents (Mr. Brown, Mrs. White, etc.)
3. **Workflow**:
   - Services provided to individual residents
   - All invoices consolidated and sent to **Sunset Retirement Village**
   - **Xero Contact**: Sunset Retirement Village (company)
   - **Patient Records**: Multiple individual patient files

## Current Xero Limitation

### Xero's Constraint
Xero invoices and quotes can only be linked to **ONE** contact:
- Either a Patient (individual)
- OR a Company (organization)
- **NOT BOTH**

### Our Data Model
Our backend allows storing **BOTH** relationships:

```python
# backend/xero_integration/models.py
class XeroInvoiceLink(models.Model):
    patient = models.ForeignKey(Patient, null=True, blank=True)
    company = models.ForeignKey(Company, null=True, blank=True)
    # ... other fields
```

**Decision Logic:**
- If `company` is set → Invoice in Xero shows Company as contact
- If `patient` is set (and no company) → Invoice in Xero shows Patient as contact
- **Database stores BOTH** → We always know which patient the service was for

## Required Solution: Patient Account Dialogue

### Problem
When viewing a **Patient's** Accounts | Quotes dialogue, we need to show:
1. ✅ Invoices/Quotes where **Patient** is the Xero contact (direct billing)
2. ✅ Invoices/Quotes where **Company** is the Xero contact, BUT the service was for this **Patient**

### Current Behavior
The Patient Account dialogue (`PatientInvoicesQuotes.tsx`) currently filters by:
```typescript
const invoicePatientId = typeof inv.patient === 'string' 
  ? inv.patient 
  : (inv.patient && typeof inv.patient === 'object' ? inv.patient.id : null);

return invoicePatientId === patientId;
```

This **ONLY** shows invoices where the patient is the Xero contact. It **MISSES** company-billed invoices for this patient.

### Required Fix

#### Display Rules
When viewing **Patient: John Smith's** account dialogue, show:

| Invoice/Quote | Xero Contact | Patient Field | Company Field | Show? | Display As |
|---------------|--------------|---------------|---------------|-------|------------|
| INV-001       | John Smith   | John Smith    | NULL          | ✅ Yes | John Smith |
| INV-002       | HealthShare  | John Smith    | HealthShare   | ✅ Yes | HealthShare (for John Smith) |
| INV-003       | HealthShare  | Jane Doe      | HealthShare   | ❌ No  | - |
| INV-004       | Sunset Village | Mr. Brown   | Sunset Village | ❌ No | - |

#### Updated Filter Logic (Proposed)
```typescript
// Show invoices/quotes where:
// 1. Patient is the Xero contact (direct billing)
// 2. OR Patient field matches this patient (company billing)

allInvoices = allInvoices.filter((inv: XeroInvoiceLink) => {
  const invoicePatientId = typeof inv.patient === 'string' 
    ? inv.patient 
    : (inv.patient && typeof inv.patient === 'object' ? inv.patient.id : null);
  
  return invoicePatientId === patientId; // This covers BOTH cases
});
```

**Note:** The current logic is actually correct! The `patient` field in our database stores the actual patient who received the service, regardless of whether the Xero contact is the patient or a company.

#### Display Enhancement (Recommended)
Add a column or indicator to show the **billing contact** vs **patient**:

```typescript
// In the Contact column
const getContactDisplay = (item: XeroInvoiceLink | XeroQuoteLink) => {
  // If company exists, the company is the Xero contact (payer)
  if (item.company) {
    const companyName = typeof item.company === 'string' 
      ? item.company_name 
      : item.company.name;
    return (
      <div>
        <Text fw={600}>{companyName}</Text>
        <Text size="xs" c="dimmed">(Billed to company)</Text>
      </div>
    );
  }
  
  // Otherwise patient is the Xero contact (direct billing)
  return getContactName(item);
};
```

## Wizard Enhancement

### Current Wizard Flow
1. Choose: Invoice or Quote
2. Contact Type: Patient or Company ✅
3. Search: Find patient or company ✅

### Proposed Enhancement for Company Selection
When user selects **Company** as contact type, add an additional step:

```
Step 1: Type (Invoice/Quote)
Step 2: Contact Type (Patient/Company)
Step 3A: [IF PATIENT] Search Patient
Step 3B: [IF COMPANY] Search Company
Step 4:  [IF COMPANY] Link to Patient (optional but recommended)
         - "Is this for a specific patient?"
         - [Search Patient] or [Skip - Company only]
```

### Updated Wizard (`PatientQuickCreateModal`)
For the patient-specific wizard, add a step to optionally include a company:

```
Step 1: Type (Invoice/Quote)
Step 2: Billing Method
        ○ Bill Patient Directly
        ○ Bill Company (for this patient)
Step 3: [IF COMPANY] Search Company
```

## Implementation Checklist

### Backend (Already Complete) ✅
- [x] `XeroInvoiceLink` model has both `patient` and `company` fields
- [x] `XeroQuoteLink` model has both `patient` and `company` fields
- [x] API returns both `patient_name` and `company_name`
- [x] Invoice/Quote creation accepts both `patient_id` and `company_id`

### Frontend (To Do)
- [ ] Update `PatientInvoicesQuotes.tsx` to show company-billed invoices
- [ ] Add visual indicator for "Billed to Company" vs "Billed to Patient"
- [ ] Update `PatientQuickCreateModal` to support company billing
- [ ] Add company search step to patient wizard
- [ ] Update general `QuickCreateModal` to link patient when company is selected

### Display Changes
- [ ] Contact column should show both company name AND patient indicator
- [ ] Add filter/tab to separate "Direct" vs "Company-Billed" invoices
- [ ] Add badge/icon to distinguish billing types

## Quote to Invoice Conversion

### Important: Patient/Company Preservation
When converting a **Quote** to an **Invoice**, the system **MUST** preserve the patient and company relationships:

```python
# backend/xero_integration/services.py - Line 1593-1596
invoice_link = XeroInvoiceLink.objects.create(
    appointment=quote_link.appointment,  # Link to same appointment if any
    patient=quote_link.patient,          # ✅ Copy patient from quote
    company=quote_link.company,          # ✅ Copy company from quote
    # ... other fields
)
```

### Conversion Workflow
```
Quote (QU-0006)                     Invoice (ORC1058)
├─ Patient: John Smith       →      ├─ Patient: John Smith
├─ Company: HealthShare      →      ├─ Company: HealthShare
├─ Xero Contact: HealthShare →      ├─ Xero Contact: HealthShare
└─ Status: ACCEPTED          →      └─ Status: DRAFT
```

### UI Implications
- When viewing converted invoices, the patient relationship is maintained
- Patient dialogue should show BOTH the original quote AND the converted invoice
- Both should display the company billing indicator

---

## Appointment Relationship (Optional)

### Three-Way Relationship
Invoices and Quotes can optionally be linked to an **Appointment**:

```
┌─────────────┐
│ Appointment │
│  (Service)  │
└──────┬──────┘
       │
       ├──────────┐
       │          │
       ▼          ▼
┌──────────┐  ┌──────────┐
│  Quote   │  │ Invoice  │
│ (Before) │  │  (After) │
└──────────┘  └──────────┘
       │          │
       └────┬─────┘
            │
            ▼
      ┌──────────┐
      │ Patient  │
      │ Company  │
      └──────────┘
```

### Appointment + Patient + Company
When **all three** are present:

| Field | Source | Purpose |
|-------|--------|---------|
| `appointment` | Service record | Links to the actual service delivery |
| `patient` | From appointment OR direct | Who received the service |
| `company` | Direct selection | Who is paying for the service |

**Example:**
- Appointment for **John Smith** on Dec 15, 2025
- Service: Custom orthotics fitting
- Patient: John Smith (from appointment)
- Company: HealthShare (selected during quote creation)
- Xero Contact: HealthShare

### Standalone (No Appointment)
Quotes and Invoices can exist **without** an appointment:
- Useful for products, consultations, or pre-service quotes
- `patient` and `company` fields are set directly
- No service date or clinician information

---

## Edge Cases and Validation

### Case 1: Quote with Company, Convert to Patient Invoice
**Scenario:** Quote was sent to company, but company requests patient pay directly

**Current Behavior:** System copies company from quote to invoice

**Desired Behavior:** Allow user to change billing contact during conversion

**Implementation Needed:**
- Add "Change Billing Contact" option in conversion flow
- Warn user about changing from company to patient
- Update Xero contact when changing billing method

### Case 2: Patient Has Multiple Companies
**Scenario:** Patient receives services funded by different companies

**Example:**
- John Smith receives NDIS services (HealthShare)
- John Smith also receives EnableNSW services (icare)

**Solution:** Each invoice/quote specifies which company

**Display:** 
```
Patient: John Smith
Invoices:
- INV-001: HealthShare (NDIS Orthotics)
- INV-002: icare (EnableNSW Wheelchair)
- INV-003: John Smith (Private Pay - Shoe Inserts)
```

### Case 3: Company with No Patient Link
**Scenario:** Invoice to company for general services (not patient-specific)

**Example:**
- Company: Acme Corporation
- Service: Bulk order of orthotics for workplace
- Patient: NULL

**Display:** Should NOT appear in any patient's dialogue

**Filter Logic:**
```typescript
// This is correct - only show if patient field is set
const invoicePatientId = inv.patient ? extractPatientId(inv.patient) : null;
if (!invoicePatientId) return false; // Skip company-only invoices
return invoicePatientId === patientId;
```

### Case 4: Patient Changed During Appointment
**Scenario:** Appointment booked for Patient A, but service delivered to Patient B

**Risk:** Invoice/Quote might link to wrong patient via appointment

**Mitigation:**
- Always validate patient field matches intended recipient
- Warn user if appointment patient differs from selected patient
- Allow override of appointment patient link

---

## Data Integrity Rules

### Validation Rules
1. **At least one entity required**: `patient` OR `company` OR `appointment` must be set
2. **Patient identification**: If `company` is set, `patient` SHOULD also be set (for service tracking)
3. **Xero contact**: Determined by priority: `company` (if set) > `patient` (fallback)
4. **Conversion preservation**: Quote → Invoice must copy ALL relationships

### Database Constraints
```python
# Validation in model or serializer
if not (patient or company or appointment):
    raise ValidationError("Invoice must be linked to a patient, company, or appointment")

# Recommended: Warn if company set but patient not set
if company and not patient:
    logger.warning(f"Invoice {invoice_number} has company but no patient - may be corporate invoice")
```

---

## Reporting and Analytics

### Questions to Answer
1. **Patient Revenue**: How much has this patient generated? (sum ALL invoices where patient = X)
2. **Company Revenue**: How much has this company paid? (sum invoices where company = X)
3. **NDIS Revenue**: How much from HealthShare/EnableNSW? (filter by company)
4. **Private Pay vs Funded**: Compare patient-only vs company-billed invoices

### SQL Examples
```sql
-- All revenue for patient (includes company-billed)
SELECT SUM(total) FROM xero_invoice_links WHERE patient_id = 'patient-uuid';

-- Company-billed only for patient
SELECT SUM(total) FROM xero_invoice_links 
WHERE patient_id = 'patient-uuid' AND company_id IS NOT NULL;

-- Private pay only for patient
SELECT SUM(total) FROM xero_invoice_links 
WHERE patient_id = 'patient-uuid' AND company_id IS NULL;
```

---

## Testing Scenarios

### Test Case 1: Direct Patient Billing
1. Create invoice for Patient: John Smith
2. Set Xero contact to: John Smith
3. Verify shows in John Smith's account dialogue
4. Verify displays as "John Smith" (no company indicator)

### Test Case 2: Company Billing for Patient
1. Create invoice with Patient: John Smith, Company: HealthShare
2. Set Xero contact to: HealthShare
3. Verify shows in John Smith's account dialogue
4. Verify displays as "HealthShare (for John Smith)" or similar
5. Verify shows company badge/indicator

### Test Case 3: Multiple Patients, One Company
1. Create invoice for Patient: Jane Doe, Company: HealthShare
2. Create invoice for Patient: John Smith, Company: HealthShare
3. Verify John Smith's dialogue shows only his invoice (not Jane's)
4. Verify both show company billing indicator

### Test Case 4: Company Search in Patient Wizard
1. Open Patient: John Smith's account dialogue
2. Click "Create Invoice/Quote"
3. Select "Bill Company"
4. Search for and select HealthShare
5. Verify invoice created with patient=John Smith, company=HealthShare
6. Verify Xero contact is set to HealthShare

## Database Schema Reference

### XeroInvoiceLink Fields
```python
patient = ForeignKey(Patient, null=True, blank=True)  # WHO received service
company = ForeignKey(Company, null=True, blank=True)  # WHO is paying (if not patient)
xero_invoice_id = CharField()  # Xero's invoice ID
# ... other fields
```

**Decision Tree:**
```
if company is set:
    xero_contact = company  # Company pays
    patient_field = patient  # Track who received service
else:
    xero_contact = patient  # Patient pays directly
    patient_field = patient  # Same person
```

## Related Documentation
- **Xero Integration Overview**: `docs/integrations/XERO.md`
- **Database Schema**: `docs/architecture/DATABASE_SCHEMA.md`
- **Invoice Workflow**: `docs/features/XERO_INVOICE_WORKFLOW.md`
- **Companies Feature**: `docs/features/COMPANIES.md` (if exists)

## Notes
- This pattern is common in healthcare/NDIS billing
- Xero limitation requires workaround in our UI layer
- Backend data model correctly supports this relationship
- Frontend filtering needs enhancement to show all relevant invoices
- Visual indicators critical for user understanding of billing relationships

---

**Last Updated**: November 17, 2025  
**Status**: Design Document - Implementation Required  
**Related Branch**: `xero`

