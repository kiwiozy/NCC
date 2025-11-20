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

## 💡 Proposed Solution Architecture (UPDATED)

### Phase 1: Database Updates

#### 1.1 Add `provider_registration_number` to Company Settings
**NOT to individual Clinician!** The company has the provider number.

**Option A: Add to EmailGlobalSettings (Quick)**
```python
# backend/invoices/models.py
class EmailGlobalSettings:
    # ... existing fields ...
    
    provider_registration_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Company's provider registration number for NDIS/DVA/Medicare (e.g., '4050009706')"
    )
```

**Option B: Create dedicated CompanySettings model (Better long-term)**
```python
# backend/clinicians/models.py or new backend/company/models.py
class CompanySettings(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    # Company Info
    company_name = models.CharField(max_length=200, default="Walk Easy Pedorthics Australia Pty LTD")
    abn = models.CharField(max_length=20, default="63 612 528 971")
    phone = models.CharField(max_length=20, default="02 6766-3153")
    email = models.EmailField(default="info@walkeasy.com.au")
    website = models.CharField(max_length=200, default="www.walkeasy.com.au")
    
    # Provider Registration (for NDIS/DVA billing)
    provider_registration_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Company's provider registration number for NDIS/DVA/Medicare (e.g., '4050009706')"
    )
    
    # Address
    street_address = models.CharField(max_length=200, default="21 Dowe St, Tamworth, NSW 2340")
    postal_address = models.CharField(max_length=200, default="PO Box 210, Tamworth, NSW 2340")
    
    # Banking (for invoices)
    bank_bsb = models.CharField(max_length=10, default="013287")
    bank_account = models.CharField(max_length=20, default="222796921")
    
    # Singleton pattern
    class Meta:
        db_table = 'company_settings'
    
    @classmethod
    def get_settings(cls):
        settings, created = cls.objects.get_or_create(id=1)
        return settings
```

**RECOMMENDATION:** Use Option B (CompanySettings model) - more organized and scalable.

#### 1.2 Add `vendor_numbers` to Company Model
```python
# backend/companies/models.py
class Company:
    # ... existing fields ...
    
    vendor_numbers = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Vendor/account numbers by type (e.g., {'Enable': '508809', 'DVA': '682730'})"
    )
```

**Example data for Enable:**
```json
{
  "Enable": "508809",
  "Enable Alt": "999999"
}
```

**Example data for DVA:**
```json
{
  "DVA": "682730"
}
```

#### 1.3 Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

---

### Phase 2: Backend Updates

#### 2.1 Smart Reference Generation

**File:** `backend/xero_integration/services.py`

```python
def generate_smart_reference(patient, company, selected_vendor_type=None, custom_reference=None):
    """
    Generate smart reference/PO# for invoice
    
    Priority:
    1. Custom reference (if user typed something)
    2. Selected vendor number (if quick-select button clicked)
    3. NDIS number (if patient has health_number)
    4. Company name
    5. Default: Patient name
    """
    if custom_reference:
        return custom_reference
    
    # Check if vendor number was selected
    if selected_vendor_type and company and company.vendor_numbers:
        vendor_num = company.vendor_numbers.get(selected_vendor_type)
        if vendor_num:
            return f"{selected_vendor_type} Vendor # {vendor_num}"
    
    # Check for NDIS number
    if patient and patient.health_number:
        return f"NDIS # {patient.health_number}"
    
    # Fallback to company name
    if company:
        return f"Invoice for {company.name}"
    
    # Last resort: patient name
    if patient:
        return f"Invoice for {patient.get_full_name()}"
    
    return "Invoice"
```

#### 2.2 Add Vendor Numbers API Endpoints

**File:** `backend/companies/views.py`

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def get_company_vendor_numbers(request, company_id):
    """Get all vendor numbers for a company"""
    try:
        company = Company.objects.get(id=company_id)
        return Response({
            'vendor_numbers': company.vendor_numbers or {}
        })
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=404)

@api_view(['POST'])
def add_company_vendor_number(request, company_id):
    """Add a new vendor number to a company"""
    try:
        company = Company.objects.get(id=company_id)
        vendor_type = request.data.get('vendor_type')
        vendor_number = request.data.get('vendor_number')
        
        if not vendor_type or not vendor_number:
            return Response({'error': 'vendor_type and vendor_number required'}, status=400)
        
        if not company.vendor_numbers:
            company.vendor_numbers = {}
        
        company.vendor_numbers[vendor_type] = vendor_number
        company.save()
        
        return Response({
            'success': True,
            'vendor_numbers': company.vendor_numbers
        })
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=404)

@api_view(['DELETE'])
def delete_company_vendor_number(request, company_id, vendor_type):
    """Remove a vendor number from a company"""
    try:
        company = Company.objects.get(id=company_id)
        
        if company.vendor_numbers and vendor_type in company.vendor_numbers:
            del company.vendor_numbers[vendor_type]
            company.save()
        
        return Response({'success': True})
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=404)
```

#### 2.3 Update Create Invoice Endpoint

**File:** `backend/xero_integration/views.py`

```python
@api_view(['POST'])
def create_xero_invoice(request):
    # ... existing code ...
    
    # Get clinician_id from request (already implemented)
    clinician_id = request.data.get('clinician_id')
    if not clinician_id:
        try:
            clinician = request.user.clinician_profile
            clinician_id = clinician.id
        except:
            clinician_id = None
    
    # NEW: Get vendor type selection (from quick-select button)
    selected_vendor_type = request.data.get('vendor_type')  # e.g., "Enable", "DVA"
    
    # NEW: Generate smart reference
    custom_reference = request.data.get('reference')
    reference = generate_smart_reference(
        patient=patient, 
        company=company, 
        selected_vendor_type=selected_vendor_type,
        custom_reference=custom_reference
    )
    
    # Create invoice with clinician and reference
    invoice_link = xero_service.create_invoice(
        # ... existing params ...
        clinician_id=clinician_id,
        reference=reference,
    )
```

#### 2.4 Update PDF Generator

**File:** `backend/invoices/document_pdf_generator.py`

Add practitioner credentials section to PDF:

```python
def add_practitioner_box(canvas, x, y, clinician, reference, company_settings):
    """Draw practitioner credentials box on PDF (top right corner)"""
    from invoices.models import CompanySettings  # or EmailGlobalSettings
    
    # Get company settings for provider registration number
    if not company_settings:
        company_settings = CompanySettings.get_settings()
    
    # Title
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(x, y, "Reference / PO#")
    y -= 15
    
    # Clinician name
    canvas.setFont("Helvetica", 9)
    if clinician:
        canvas.drawString(x, y, clinician.full_name)
        y -= 12
    
    # Invoice/Order number (if available in reference)
    # Extract from reference if it contains order/invoice number
    if reference:
        canvas.drawString(x, y, reference)
        y -= 12
    
    # Provider Registration Number (COMPANY level, not clinician)
    if company_settings.provider_registration_number:
        canvas.drawString(x, y, f"Provider Registration # {company_settings.provider_registration_number}")
        y -= 15
    
    # Section: Practitioner
    canvas.setFont("Helvetica-BoldOblique", 10)
    canvas.drawString(x, y, "Practitioner:")
    y -= 12
    
    if clinician:
        # Full name + credential
        canvas.setFont("Helvetica-Bold", 10)
        if clinician.credential:
            canvas.drawString(x, y, f"{clinician.full_name}, {clinician.credential}")
        else:
            canvas.drawString(x, y, clinician.full_name)
        y -= 12
        
        # Pedorthic registration (clinician's personal registration)
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

#### 3.2 Add Vendor Number Quick-Select Buttons

**After Company Selection, dynamically load vendor numbers:**

```tsx
// State
const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
const [vendorNumbers, setVendorNumbers] = useState<Record<string, string>>({});
const [selectedVendorType, setSelectedVendorType] = useState<string | null>(null);
const [customReference, setCustomReference] = useState('');

// Fetch vendor numbers when company changes
useEffect(() => {
  if (selectedCompany) {
    fetchVendorNumbers(selectedCompany.id);
  } else {
    setVendorNumbers({});
    setSelectedVendorType(null);
  }
}, [selectedCompany]);

const fetchVendorNumbers = async (companyId: string) => {
  const response = await fetch(`https://localhost:8000/api/companies/${companyId}/vendor-numbers/`, {
    credentials: 'include',
  });
  const data = await response.json();
  setVendorNumbers(data.vendor_numbers || {});
};

const handleVendorButtonClick = (vendorType: string, vendorNumber: string) => {
  setSelectedVendorType(vendorType);
  setCustomReference(`${vendorType} Vendor # ${vendorNumber}`);
};

// UI Component
<Paper p="md" withBorder mb="md">
  <Group align="center" mb="xs">
    <IconFileText size={20} />
    <Text fw={600}>Reference / PO Number</Text>
  </Group>
  
  {/* Show vendor number quick-select buttons if company selected */}
  {selectedCompany && Object.keys(vendorNumbers).length > 0 && (
    <>
      <Text size="sm" c="dimmed" mb="xs">Quick Select Vendor Number:</Text>
      <Group mb="md">
        {Object.entries(vendorNumbers).map(([type, number]) => (
          <Button
            key={type}
            variant={selectedVendorType === type ? 'filled' : 'outline'}
            size="sm"
            onClick={() => handleVendorButtonClick(type, number)}
          >
            <Stack gap={2} align="center">
              <Text size="xs" fw={600}>{type}</Text>
              <Text size="xs">{number}</Text>
            </Stack>
          </Button>
        ))}
      </Group>
    </>
  )}
  
  {/* Manual reference input */}
  <TextInput
    label="Reference / PO Number"
    placeholder={
      selectedPatient?.health_number 
        ? `Auto: NDIS # ${selectedPatient.health_number}` 
        : "Leave blank to auto-generate"
    }
    description="Click a button above or type custom reference"
    value={customReference}
    onChange={(e) => {
      setCustomReference(e.currentTarget.value);
      setSelectedVendorType(null); // Clear button selection if manually typing
    }}
    icon={<IconFileText size={16} />}
  />
  
  {/* Preview what will be used */}
  <Alert color="gray" mt="xs">
    <Text size="xs">
      Reference will be: <strong>{
        customReference || 
        (selectedPatient?.health_number 
          ? `NDIS # ${selectedPatient.health_number}` 
          : `Invoice for ${selectedPatient?.full_name || selectedCompany?.name || 'Patient'}`)
      }</strong>
    </Text>
  </Alert>
</Paper>
```

#### 3.3 Add Vendor Number Management to Company Settings

**File:** `frontend/app/components/settings/CompanySettings.tsx` (or create new component)

```tsx
const [vendorNumbers, setVendorNumbers] = useState<Record<string, string>>({});
const [newVendorType, setNewVendorType] = useState('');
const [newVendorNumber, setNewVendorNumber] = useState('');

const handleAddVendorNumber = async () => {
  if (!newVendorType || !newVendorNumber) {
    notifications.show({
      title: 'Validation Error',
      message: 'Please enter both vendor type and number',
      color: 'red',
    });
    return;
  }
  
  const csrfToken = await getCsrfToken();
  const response = await fetch(`https://localhost:8000/api/companies/${companyId}/vendor-numbers/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify({
      vendor_type: newVendorType,
      vendor_number: newVendorNumber,
    }),
  });
  
  if (response.ok) {
    const data = await response.json();
    setVendorNumbers(data.vendor_numbers);
    setNewVendorType('');
    setNewVendorNumber('');
    notifications.show({
      title: 'Success',
      message: 'Vendor number added',
      color: 'green',
    });
  }
};

// UI Component
<Paper p="xl" shadow="sm" radius="md">
  <Title order={3} mb="md">Vendor/Account Numbers</Title>
  
  {/* Existing vendor numbers */}
  <Table>
    <thead>
      <tr>
        <th>Type</th>
        <th>Number</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {Object.entries(vendorNumbers).map(([type, number]) => (
        <tr key={type}>
          <td>{type}</td>
          <td>{number}</td>
          <td>
            <ActionIcon color="red" onClick={() => handleDeleteVendorNumber(type)}>
              <IconTrash size={16} />
            </ActionIcon>
          </td>
        </tr>
      ))}
    </tbody>
  </Table>
  
  {/* Add new vendor number */}
  <Divider my="md" />
  <Title order={4} mb="md">Add New Vendor Number</Title>
  <Group>
    <TextInput
      label="Vendor Type"
      placeholder="e.g., Enable, DVA, BUPA"
      value={newVendorType}
      onChange={(e) => setNewVendorType(e.currentTarget.value)}
    />
    <TextInput
      label="Vendor Number"
      placeholder="e.g., 508809"
      value={newVendorNumber}
      onChange={(e) => setNewVendorNumber(e.currentTarget.value)}
    />
    <Button onClick={handleAddVendorNumber} mt="md">
      <IconPlus size={16} /> Add
    </Button>
  </Group>
</Paper>
```

#### 3.4 Update Submit Payload

```tsx
const payload = {
  // ... existing fields ...
  clinician_id: selectedClinician,
  vendor_type: selectedVendorType, // Which button was clicked (e.g., "Enable", "DVA")
  reference: customReference || null, // Manual override or null for auto-generation
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

## 🚀 Implementation Checklist (UPDATED)

### Phase 1: Database ✅
- [ ] Create `CompanySettings` model (or add to `EmailGlobalSettings`)
- [ ] Add `provider_registration_number` field to company settings
- [ ] Add `vendor_numbers` JSON field to `Company` model
- [ ] Create and run migrations
- [ ] Add sample data (Enable: 508809, DVA: 682730, etc.)
- [ ] Update Company Settings UI to include provider registration field

### Phase 2: Backend Logic
- [ ] Create `generate_smart_reference()` helper function (with vendor_type support)
- [ ] Add vendor number API endpoints:
  - [ ] `GET /api/companies/{id}/vendor-numbers/`
  - [ ] `POST /api/companies/{id}/vendor-numbers/`
  - [ ] `DELETE /api/companies/{id}/vendor-numbers/{type}/`
- [ ] Update `create_xero_invoice()` to accept `clinician_id` and `vendor_type`
- [ ] Update `create_xero_invoice()` to auto-select logged-in user's clinician
- [ ] Update `create_xero_invoice()` to generate smart reference
- [ ] Add `GET /api/clinicians/me/` endpoint for current user's clinician
- [ ] Update PDF generator to include practitioner credentials box (with company provider #)

### Phase 3: Frontend UI/UX
- [ ] Add clinician selector to `CreateInvoiceDialog.tsx`
- [ ] Add clinician selector to `CreateInvoiceModal.tsx`
- [ ] Add vendor number quick-select buttons (dynamic per company)
- [ ] Add custom reference field with auto-generation preview
- [ ] Add vendor number management to Company Settings
- [ ] Fetch clinicians on modal open
- [ ] Fetch vendor numbers when company is selected
- [ ] Auto-select current user's clinician profile
- [ ] Show credentials preview when clinician selected
- [ ] Update submit payload to include `clinician_id`, `vendor_type`, and `reference`

### Phase 4: Testing
- [ ] Test invoice creation with different clinicians
- [ ] Test auto-generation of NDIS reference (patient with health_number)
- [ ] Test vendor number quick-select buttons (Enable, DVA, BUPA)
- [ ] Test custom PO number override
- [ ] Test PDF display of practitioner credentials (with company provider #)
- [ ] Test with company billing (DVA, insurance)
- [ ] Test quotes (same logic should apply)
- [ ] Test vendor number management (add/delete in Company Settings)

### Phase 5: Documentation
- [ ] Update `docs/architecture/DATABASE_SCHEMA.md` with new fields
- [ ] Create user guide for practitioner selection
- [ ] Document smart reference generation logic
- [ ] Document vendor number management

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

## ✅ Decisions Made (Q&A with User)

### 1. **Provider Registration Number** ✅
**Decision:** Store at **Company Level** (not individual clinician level)
- The clinic (Walk Easy Pedorthics) has the provider registration # (e.g., `4050009706`)
- This is used for NDIS/DVA/Medicare billing
- Individual clinicians have their own **Pedorthic Registration #** (already stored in `Clinician.registration_number`)

**Implementation:**
- Add `provider_registration_number` to `EmailGlobalSettings` or create dedicated `CompanySettings` model
- Display company's provider # on all invoices

### 2. **Vendor Number Buttons (BUPA, Enable, DVA)** ✅
**Decision:** Dynamic vendor numbers per company with quick-select buttons

**How it works:**
- Each company (Enable, DVA, BUPA, etc.) can have multiple vendor/account numbers
- Store in `Company.vendor_numbers` JSON field
- Examples:
  - Enable → `{"Enable": "508809"}`
  - DVA → `{"DVA": "682730"}`
  - BUPA → `{"BUPA": "123456"}`

**UI Flow:**
1. User selects company (e.g., "Enable")
2. System shows quick-select buttons for that company's vendor numbers
3. Clicking button auto-fills reference: `"Enable Vendor # 508809"`
4. User can override manually if needed

**Reference Display on Invoice:**
```
Reference / PO#
Mr. Craig Laird
883t0
Enable Vendor # 508809
```

### 3. **Reference Format** ✅
**Confirmed formats:**
- NDIS patients: `"NDIS # {health_number}"` (e.g., `"NDIS # 3333222"`)
- Company vendor: `"{Type} Vendor # {number}"` (e.g., `"Enable Vendor # 508809"`)
- DVA: `"DVA # {number}"` (e.g., `"DVA # 682730"`)
- Custom: User can type anything

### 4. **PDF Layout** ✅
**Confirmed:** Top right corner with practitioner credentials
```
Reference / PO#
Craig Laird
883t0
Enable Vendor # 508809
Provider Registration # 4050009706  ← Company's provider #

Practitioner:
Craig Laird
C.Ped CM AU
Pedorthic Registration # 3454       ← Clinician's personal registration
www.pedorthics.org.au
```

### 5. **Clinician Selection** ✅
**Decision:** Allow override for admin users
- Smart default: Auto-select logged-in user's clinician profile
- Admin can change if creating invoice on behalf of another clinician
- Once invoice is created, clinician is locked (for audit trail)

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

