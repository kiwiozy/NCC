# Invoice/Quote Clinician Credentials Integration Plan

## 📸 FileMaker Reference

Based on your FileMaker screenshot, the system displays:

### Practitioner Section (Top Right)
```
Reference / PO#
Craig Laird
NDIS # 3333222
Provider Registration # 4050009706

Practitioner:
Craig Laird
CPed CM au
Pedorthic Registration # 3454
www.pedorthics.org.au
```

### User Selection (Dropdown)
- Craig
- Jonathan

### Additional Context Options
- **BUPA, Medibank, AHM, DVA** (Account types)
- **Enable, NDIS, Blank** (Tax types/billing contexts)

---

## 🎯 Goals

1. **Display practitioner credentials on invoices/quotes** (PDF + Xero metadata)
2. **Easy clinician selection** during invoice/quote creation
3. **Smart defaults** (current logged-in user)
4. **Flexible reference/PO handling** (NDIS # for NDIS patients, custom PO for others)
5. **Support for provider numbers** (multiple if needed)
6. **Beautiful, intuitive UI/UX**

---

## 🗄️ Current Database Schema

### Clinician Model (Already Exists!)
```python
# backend/clinicians/models.py
class Clinician:
    id (UUID)
    full_name (str) - e.g., "Craig Laird"
    credential (str) - e.g., "CPed CM au"
    registration_number (str) - e.g., "Pedorthic Registration # 3454"
    professional_body_url (str) - e.g., "www.pedorthics.org.au"
    user (FK to User) - Links to Django User account
    email (str)
    phone (str)
    role (str) - PEDORTHIST, ADMIN, etc.
    active (bool)
    signature_image (str) - S3 key
    signature_html (text) - HTML email signature
```

### XeroInvoiceLink (Already Has Clinician FK!)
```python
# backend/xero_integration/models.py
class XeroInvoiceLink:
    clinician (FK to Clinician) - ✅ Already exists!
    patient (FK to Patient)
    company (FK to Company)
    xero_invoice_number (str)
    reference (str) - Currently unused for PO/NDIS #
    # ... other invoice fields
```

### Patient Model
```python
# backend/patients/models.py
class Patient:
    health_number (str) - NDIS number
    mrn (str) - Medical record number
    # ... other fields
```

---

## 🤔 Key Design Questions

### 1. **Provider Registration Numbers**

**Question:** How do we handle provider registration numbers?

**Options:**

#### Option A: Single Provider Number (Current - ✅ RECOMMENDED)
- Store `provider_registration_number` on `Clinician` model
- Example: `"4050009706"`
- **Pros:** Simple, covers most use cases
- **Cons:** What if a clinician has multiple provider numbers for different schemes?

#### Option B: Multiple Provider Numbers (Complex)
- Create a new model: `ProviderNumber`
  - Fields: `clinician (FK)`, `scheme (str)` (e.g., "NDIS", "DVA", "Medicare"), `number (str)`
- **Pros:** Flexible for clinicians registered with multiple schemes
- **Cons:** More complex UI, may be overkill

**RECOMMENDATION:** Start with **Option A**. Add `provider_registration_number` field to `Clinician` model. If we need multiple numbers later, we can create a `ProviderNumber` model and migrate.

---

### 2. **Reference / PO Number Handling**

**Question:** How do we automatically populate the Reference/PO# field?

**Current State:**
- `XeroInvoiceLink.reference` field exists but is underutilized
- In FileMaker, you show: "Craig Laird" + "NDIS # 3333222"

**Options:**

#### Option A: Smart Auto-Generation (✅ RECOMMENDED)
When creating an invoice:
1. **If patient has NDIS number** (`patient.health_number`):
   - Set `reference = f"NDIS # {patient.health_number}"`
   - Example: `"NDIS # 3333222"`

2. **If company is billed** (DVA, insurance):
   - Set `reference = f"{company.name} - {invoice_number}"`
   - Example: `"DVA - INV-1234"`

3. **Manual override:**
   - User can type custom PO# if needed
   - Example: `"PO-BUPA-5678"`

**Display on PDF:**
```
Reference / PO#
Craig Laird
NDIS # 3333222
Provider Registration # 4050009706
```

#### Option B: Always Manual (Not Recommended)
- User types everything manually
- **Cons:** Tedious, error-prone

**RECOMMENDATION:** **Option A** - Smart auto-generation with manual override.

---

### 3. **Clinician Selection UI/UX**

**Question:** Where and how does the user select the clinician?

**Options:**

#### Option A: Top of Invoice Form (✅ RECOMMENDED - FileMaker Style)
```
┌─────────────────────────────────────────────────────────┐
│ Create Invoice                                     [X]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 👤 Practitioner                                         │
│ ┌──────────────────────────────────────────────┐       │
│ │ Craig Laird, CPed CM au               ▼      │       │
│ └──────────────────────────────────────────────┘       │
│                                                          │
│ 📋 Billing To                                           │
│ ┌──────────────────────────────────────────────┐       │
│ │ ○ Patient    ● Company                       │       │
│ └──────────────────────────────────────────────┘       │
│                                                          │
│ 🏥 Patient                                              │
│ ┌──────────────────────────────────────────────┐       │
│ │ Search patient...                            │       │
│ └──────────────────────────────────────────────┘       │
│                                                          │
│ 📦 Line Items                                           │
│ ...                                                      │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- **Dropdown** showing: `"Full Name, Credential"` (e.g., "Craig Laird, CPed CM au")
- **Smart Default:** Automatically selects the logged-in user's clinician profile
- **Sticky Selection:** Remembers last selected clinician in session
- **Full Credentials Preview:** Show registration # and professional body URL below dropdown

**Pros:**
- Matches FileMaker workflow
- Clear, upfront selection
- Users see credentials before creating invoice

#### Option B: Hidden/Automatic (Not Recommended for Compliance)
- Always use logged-in user
- No explicit selection
- **Cons:** What if admin creates invoice on behalf of another clinician?

**RECOMMENDATION:** **Option A** - Explicit clinician selector at top of form.

---

### 4. **PDF Invoice Display**

**Question:** How do we display clinician credentials on the PDF invoice?

**Proposed Layout (Top Right Corner):**

```
┌─────────────────────────────────────────────────────────────┐
│ Walk Easy Pedorthics                    Reference / PO#     │
│ 21 Dowe St, Tamworth                    Craig Laird          │
│ ABN: 63 612 528 971                     NDIS # 3333222       │
│                                         Provider Registration│
│ INVOICE # INV-1234                      # 4050009706         │
│ Date: 20 Nov 2025                                            │
│                                         Practitioner:        │
│ Bill To:                                Craig Laird          │
│ John Smith                              CPed CM au           │
│ 123 Main St                             Pedorthic Registration│
│ Sydney NSW 2000                         # 3454               │
│ NDIS # 3333222                          www.pedorthics.org.au│
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Use `XeroInvoiceLink.clinician` FK to get credentials
- Fall back to company settings if no clinician assigned
- Include in PDF generation function

---

## 💡 Proposed Solution Architecture

### Phase 1: Database Updates ✅ (Minimal - mostly done!)

#### 1.1 Add `provider_registration_number` to Clinician
```python
# backend/clinicians/models.py
class Clinician:
    # ... existing fields ...
    
    provider_registration_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Provider registration number for NDIS/DVA/Medicare (e.g., '4050009706')"
    )
```

#### 1.2 Migration
```bash
python manage.py makemigrations clinicians
python manage.py migrate
```

**Status:** ✅ `XeroInvoiceLink.clinician` FK already exists (added in previous feature)

---

### Phase 2: Backend Updates

#### 2.1 Smart Reference Generation

**File:** `backend/xero_integration/services.py`

```python
def generate_smart_reference(patient, company, custom_reference=None):
    """
    Generate smart reference/PO# for invoice
    
    Priority:
    1. Custom reference (if provided)
    2. NDIS number (if patient has health_number)
    3. Company name + invoice number
    4. Default: Patient name
    """
    if custom_reference:
        return custom_reference
    
    if patient and patient.health_number:
        return f"NDIS # {patient.health_number}"
    
    if company:
        return f"{company.name} - Invoice"
    
    if patient:
        return f"Invoice for {patient.full_name}"
    
    return "Invoice"
```

#### 2.2 Update Create Invoice Endpoint

**File:** `backend/xero_integration/views.py`

```python
@api_view(['POST'])
def create_xero_invoice(request):
    # ... existing code ...
    
    # NEW: Get clinician_id from request
    clinician_id = request.data.get('clinician_id')
    if not clinician_id:
        # Default to logged-in user's clinician profile
        try:
            clinician = request.user.clinician_profile
            clinician_id = clinician.id
        except:
            clinician_id = None
    
    # NEW: Generate smart reference
    custom_reference = request.data.get('reference')
    reference = generate_smart_reference(patient, company, custom_reference)
    
    # Create invoice with clinician
    invoice_link = xero_service.create_invoice(
        # ... existing params ...
        clinician_id=clinician_id,
        reference=reference,
    )
```

#### 2.3 Update PDF Generator

**File:** `backend/invoices/document_pdf_generator.py` (or similar)

Add clinician credentials section to PDF:

```python
def add_practitioner_box(canvas, x, y, clinician, reference):
    """Draw practitioner credentials box on PDF"""
    if not clinician:
        return
    
    # Title
    canvas.drawString(x, y, "Reference / PO#")
    y -= 15
    
    # Clinician name
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(x, y, clinician.full_name)
    y -= 12
    
    # Reference (NDIS # or PO#)
    canvas.setFont("Helvetica", 9)
    if reference:
        canvas.drawString(x, y, reference)
        y -= 12
    
    # Provider Registration Number
    if clinician.provider_registration_number:
        canvas.drawString(x, y, f"Provider Registration # {clinician.provider_registration_number}")
        y -= 15
    
    # Section: Practitioner
    canvas.setFont("Helvetica-BoldOblique", 10)
    canvas.drawString(x, y, "Practitioner:")
    y -= 12
    
    # Full name + credential
    canvas.setFont("Helvetica-Bold", 10)
    if clinician.credential:
        canvas.drawString(x, y, f"{clinician.full_name}, {clinician.credential}")
    else:
        canvas.drawString(x, y, clinician.full_name)
    y -= 12
    
    # Professional registration
    canvas.setFont("Helvetica", 9)
    if clinician.registration_number:
        canvas.drawString(x, y, clinician.registration_number)
        y -= 12
    
    # Professional body URL
    if clinician.professional_body_url:
        canvas.setFill(colors.blue)
        canvas.drawString(x, y, clinician.professional_body_url)
        canvas.setFill(colors.black)
```

---

### Phase 3: Frontend Updates (UI/UX)

#### 3.1 Add Clinician Selector to CreateInvoiceDialog

**File:** `frontend/app/components/xero/CreateInvoiceDialog.tsx`

**New Section (after modal title, before contact selection):**

```tsx
// State
const [selectedClinician, setSelectedClinician] = useState<string | null>(null);
const [clinicians, setClinicians] = useState<Clinician[]>([]);
const [currentUserClinician, setCurrentUserClinician] = useState<Clinician | null>(null);

// Fetch clinicians on mount
useEffect(() => {
  fetchClinicians();
  fetchCurrentUserClinician();
}, []);

const fetchClinicians = async () => {
  const response = await fetch('https://localhost:8000/api/clinicians/', {
    credentials: 'include',
  });
  const data = await response.json();
  const activeClinicians = data.results.filter(c => c.active);
  setClinicians(activeClinicians);
};

const fetchCurrentUserClinician = async () => {
  // Get logged-in user's clinician profile
  const response = await fetch('https://localhost:8000/api/clinicians/me/', {
    credentials: 'include',
  });
  if (response.ok) {
    const clinician = await response.json();
    setCurrentUserClinician(clinician);
    setSelectedClinician(clinician.id); // Auto-select
  }
};

// UI Component
<Paper p="md" withBorder mb="md">
  <Group align="center" mb="xs">
    <IconUser size={20} />
    <Text fw={600}>Practitioner</Text>
  </Group>
  
  <Select
    label="Select Practitioner"
    placeholder="Choose practitioner for this invoice"
    data={clinicians.map(c => ({
      value: c.id,
      label: c.credential 
        ? `${c.full_name}, ${c.credential}` 
        : c.full_name
    }))}
    value={selectedClinician}
    onChange={setSelectedClinician}
    required
    searchable
  />
  
  {/* Show credentials preview when selected */}
  {selectedClinician && (() => {
    const clinician = clinicians.find(c => c.id === selectedClinician);
    return clinician ? (
      <Alert icon={<IconInfoCircle size={16} />} color="blue" mt="sm">
        <Text size="sm" fw={500}>{clinician.full_name}</Text>
        {clinician.credential && (
          <Text size="xs" c="dimmed">{clinician.credential}</Text>
        )}
        {clinician.registration_number && (
          <Text size="xs" c="dimmed">{clinician.registration_number}</Text>
        )}
        {clinician.professional_body_url && (
          <Text size="xs" c="dimmed">{clinician.professional_body_url}</Text>
        )}
        {clinician.provider_registration_number && (
          <Text size="xs" c="dimmed">
            Provider Registration # {clinician.provider_registration_number}
          </Text>
        )}
      </Alert>
    ) : null;
  })()}
</Paper>
```

#### 3.2 Add Custom Reference Field (Optional Override)

**After Patient/Company Selection:**

```tsx
<TextInput
  label="Reference / PO Number"
  placeholder="Auto-generated (NDIS # or custom PO)"
  description="Leave blank to auto-generate from NDIS # or patient name"
  value={customReference}
  onChange={(e) => setCustomReference(e.currentTarget.value)}
  icon={<IconFileText size={16} />}
/>

{/* Show preview of what reference will be */}
{selectedPatient && (
  <Alert color="gray" mt="xs">
    <Text size="xs">
      Reference will be: <strong>{
        customReference || 
        (selectedPatient.health_number 
          ? `NDIS # ${selectedPatient.health_number}` 
          : `Invoice for ${selectedPatient.full_name}`)
      }</strong>
    </Text>
  </Alert>
)}
```

#### 3.3 Update Submit Payload

```tsx
const payload = {
  // ... existing fields ...
  clinician_id: selectedClinician,
  reference: customReference || null, // Backend will auto-generate if null
};
```

---

## 📐 UI/UX Wireframe

### Create Invoice Modal (Enhanced)

```
┌────────────────────────────────────────────────────────────────┐
│ Create Invoice                                          [X]    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 👤 Practitioner                                          │  │
│ │                                                           │  │
│ │ Select Practitioner *                                     │  │
│ │ ┌────────────────────────────────────────────────────┐   │  │
│ │ │ Craig Laird, CPed CM au                     ▼      │   │  │
│ │ └────────────────────────────────────────────────────┘   │  │
│ │                                                           │  │
│ │ ℹ️  Craig Laird                                           │  │
│ │    CPed CM au                                             │  │
│ │    Pedorthic Registration # 3454                          │  │
│ │    Provider Registration # 4050009706                     │  │
│ │    www.pedorthics.org.au                                  │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 📋 Billing Information                                    │  │
│ │                                                           │  │
│ │ Contact Type                                              │  │
│ │ ○ Patient    ● Company                                    │  │
│ │                                                           │  │
│ │ 🏥 Patient *                                              │  │
│ │ ┌────────────────────────────────────────────────────┐   │  │
│ │ │ Search patient...                                  │   │  │
│ │ └────────────────────────────────────────────────────┘   │  │
│ │                                                           │  │
│ │ 🏢 Company                                                │  │
│ │ ┌────────────────────────────────────────────────────┐   │  │
│ │ │ Search company (DVA, NDIS, etc.)               │   │  │
│ │ └────────────────────────────────────────────────────┘   │  │
│ │                                                           │  │
│ │ 📄 Reference / PO Number                                  │  │
│ │ ┌────────────────────────────────────────────────────┐   │  │
│ │ │                                                    │   │  │
│ │ └────────────────────────────────────────────────────┘   │  │
│ │ Leave blank to auto-generate from NDIS # or patient name │  │
│ │                                                           │  │
│ │ Reference will be: NDIS # 3333222                         │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 📦 Line Items                                             │  │
│ │ ...                                                        │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│                      [Cancel]  [Create Invoice]                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Checklist

### Phase 1: Database ✅
- [ ] Add `provider_registration_number` field to `Clinician` model
- [ ] Create and run migration
- [ ] Update User Profiles UI to include provider registration field
- [ ] Test with sample data (Craig's credentials)

### Phase 2: Backend Logic
- [ ] Create `generate_smart_reference()` helper function
- [ ] Update `create_xero_invoice()` to accept `clinician_id`
- [ ] Update `create_xero_invoice()` to auto-select logged-in user's clinician
- [ ] Update `create_xero_invoice()` to generate smart reference
- [ ] Add `GET /api/clinicians/me/` endpoint for current user's clinician
- [ ] Update PDF generator to include practitioner credentials box

### Phase 3: Frontend UI/UX
- [ ] Add clinician selector to `CreateInvoiceDialog.tsx`
- [ ] Add clinician selector to `CreateInvoiceModal.tsx`
- [ ] Add custom reference field with auto-generation preview
- [ ] Fetch clinicians on modal open
- [ ] Auto-select current user's clinician profile
- [ ] Show credentials preview when clinician selected
- [ ] Update submit payload to include `clinician_id` and `reference`

### Phase 4: Testing
- [ ] Test invoice creation with different clinicians
- [ ] Test auto-generation of NDIS reference
- [ ] Test custom PO number override
- [ ] Test PDF display of practitioner credentials
- [ ] Test with company billing (DVA, insurance)
- [ ] Test quotes (same logic should apply)

### Phase 5: Documentation
- [ ] Update `docs/architecture/DATABASE_SCHEMA.md` with new field
- [ ] Create user guide for practitioner selection
- [ ] Document smart reference generation logic

---

## 🔄 Alternative Approaches Considered

### 1. **Global Default Practitioner Setting**
**Idea:** Set a default practitioner in Company Settings, auto-apply to all invoices.

**Pros:**
- Simplest for single-practitioner clinics

**Cons:**
- Doesn't work for multi-practitioner clinics
- No flexibility for admin creating invoices on behalf of others
- Compliance issues (invoices should reflect who actually provided service)

**Decision:** ❌ Rejected - Explicit selection is better for compliance and flexibility.

---

### 2. **Practitioner Tied to Appointment**
**Idea:** If invoice is linked to an appointment, automatically use the appointment's clinician.

**Pros:**
- Accurate for appointment-based invoices
- No extra input required

**Cons:**
- Many invoices are standalone (not tied to appointments)
- What if appointment clinician changes after invoice is created?
- Still need manual selection for standalone invoices

**Decision:** 🤔 **Hybrid Approach** - Use appointment clinician as default, but allow override in invoice form.

---

## 📊 User Flow Examples

### Example 1: NDIS Patient Invoice
1. User clicks "Create Invoice" for patient "John Smith"
2. System auto-selects Craig Laird (logged-in user's clinician profile)
3. Credentials preview shows:
   - Craig Laird, CPed CM au
   - Provider Registration # 4050009706
4. Patient: John Smith (NDIS # 3333222)
5. Reference auto-generates: "NDIS # 3333222"
6. User adds line items, submits
7. PDF shows practitioner box with all credentials

### Example 2: DVA Invoice (Company Billing)
1. User creates invoice for patient "Jane Doe"
2. Selects Company: "DVA"
3. Reference auto-generates: "DVA - Invoice"
4. User can override to: "PO-DVA-2025-001"
5. PDF shows practitioner credentials + DVA billing info

### Example 3: Admin Creating Invoice for Jonathan
1. Admin user logs in
2. Creates invoice, sees clinician dropdown
3. Changes from "Craig Laird" to "Jonathan Smith"
4. Invoice and PDF will show Jonathan's credentials
5. Email signature will use Jonathan's signature (if available)

---

## 🎨 Design Principles

1. **Smart Defaults:** Auto-select logged-in user's clinician
2. **Transparency:** Show full credentials preview before creating invoice
3. **Flexibility:** Allow manual override for edge cases
4. **Consistency:** Same UI pattern for invoices and quotes
5. **Compliance-First:** Always track who created the invoice
6. **Error Prevention:** Validate clinician is selected before submit

---

## 🔐 Security Considerations

1. **Authorization:**
   - Regular users can only see their own clinician profile by default
   - Staff/Admin can see all clinicians (already implemented)

2. **Audit Trail:**
   - `XeroInvoiceLink.clinician` tracks who created the invoice
   - `XeroInvoiceLink.created_at` tracks when
   - Future: Add `created_by` User FK for full audit trail

3. **Data Validation:**
   - Ensure clinician is active before allowing selection
   - Validate provider registration number format (if required)

---

## 📈 Future Enhancements

1. **Provider Number Management:**
   - If multiple schemes are needed, create `ProviderNumber` model
   - Link to different billing schemes (NDIS, DVA, Medicare, Private)

2. **Practitioner Groups:**
   - Group clinicians by role or location
   - Filter dropdown by user's clinic

3. **Invoice Templates per Practitioner:**
   - Custom PDF templates for different practitioners
   - Different headers, footers, or branding

4. **Automatic Assignment Rules:**
   - "Always use X for NDIS invoices"
   - "Use Y for DVA invoices"

---

## ❓ Questions for Review

1. **Provider Registration Number:**
   - Do you need to store multiple provider numbers per clinician? (e.g., one for NDIS, one for DVA)
   - Or is a single provider number sufficient?

2. **Reference Format:**
   - Is `"NDIS # 3333222"` the correct format?
   - Should we support other formats (e.g., `"NDIS-3333222"`, `"3333222"`)?

3. **Clinician Selection:**
   - Should admin users be able to override the clinician after invoice creation?
   - Or should it be locked once created?

4. **PDF Layout:**
   - Is the proposed "top right corner" layout correct?
   - Do you want the practitioner info in a box/border, or plain text?

5. **Account/Tax Type Buttons:**
   - In FileMaker, you have BUPA, Medibank, AHM, DVA buttons
   - Should these be quick-select buttons for company selection?
   - Or are they related to tax types/account codes?

---

## 📝 Next Steps

**Recommend we proceed with:**

1. **Phase 1:** Add `provider_registration_number` field to database (15 min)
2. **Phase 2:** Update backend to support clinician selection + smart reference (1 hour)
3. **Phase 3:** Build frontend UI with clinician selector + credentials preview (2 hours)
4. **Phase 4:** Update PDF generator to display practitioner box (1 hour)
5. **Phase 5:** Test with real data and iterate on UI/UX (1 hour)

**Total Estimate:** ~5 hours for full implementation

---

**Ready to proceed? Let's review this plan together and adjust based on your feedback!** 🚀

