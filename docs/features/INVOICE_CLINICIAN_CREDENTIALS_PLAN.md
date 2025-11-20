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

#### 1.2 Add `funding_source` to Patient Model

**Critical:** Patients have funding sources (NDIS, BUPA, etc.) - these are NOT companies!

```python
# backend/patients/models.py
class Patient:
    # ... existing fields ...
    
    funding_source = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=[
            ('NDIS', 'NDIS'),
            ('BUPA', 'BUPA'),
            ('MEDIBANK', 'Medibank'),
            ('AHM', 'AHM'),
            ('DVA', 'DVA'),
            ('ENABLE', 'Enable'),
            ('PRIVATE', 'Private/Self-Funded'),
            ('OTHER', 'Other'),
        ],
        help_text="Patient's primary funding source/insurance type"
    )
```

**Usage:**
- When patient has NDIS funding → show `NDIS # {health_number}` on invoice
- When patient has BUPA insurance → show `BUPA - {patient_name}` on invoice
- This is **NOT** the same as the Company field (which is who you're billing)

---

#### 1.3 Create `VendorNumber` Model (Link Vendor Numbers to Companies)

**For DVA and Enable companies only!**

```python
# backend/companies/models.py
class VendorNumber(models.Model):
    """
    Vendor/account numbers for companies (DVA, Enable)
    These are PAYERS (companies you bill), not patient insurance types.
    
    Examples:
    - Company: Enable → Vendor Type: "Enable" → Number: "508809"
    - Company: DVA → Vendor Type: "DVA" → Number: "682730"
    
    NOTE: BUPA, Medibank, AHM are NOT companies - they are patient funding sources!
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to company
    company = models.ForeignKey(
        'Company',
        on_delete=models.CASCADE,
        related_name='vendor_numbers',
        help_text="Company this vendor number belongs to"
    )
    
    # Vendor details
    vendor_type = models.CharField(
        max_length=100,
        help_text="Vendor type/scheme (e.g., 'Enable', 'DVA', 'BUPA', 'Medibank')"
    )
    
    vendor_number = models.CharField(
        max_length=100,
        help_text="Vendor/account number (e.g., '508809')"
    )
    
    # Display on invoice
    display_format = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text="How to display on invoice (e.g., 'Enable Vendor #', 'DVA #'). Leave blank for default: '{vendor_type} Vendor #'"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this vendor number is currently active"
    )
    
    # Metadata
    notes = models.TextField(
        blank=True,
        help_text="Internal notes about this vendor number"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'company_vendor_numbers'
        ordering = ['company', 'vendor_type']
        unique_together = ['company', 'vendor_type']  # Each company can only have one number per vendor type
        indexes = [
            models.Index(fields=['company', 'is_active']),
            models.Index(fields=['vendor_type']),
        ]
    
    def __str__(self):
        return f"{self.company.name} - {self.vendor_type}: {self.vendor_number}"
    
    def get_display_format(self):
        """Get the display format for invoices"""
        if self.display_format:
            return self.display_format
        return f"{self.vendor_type} Vendor #"
    
    def get_formatted_reference(self):
        """Get the full formatted reference for invoices"""
        return f"{self.get_display_format()} {self.vendor_number}"
```

**Example data:**
```python
# Enable company (actual payer)
VendorNumber.objects.create(
    company=enable_company,
    vendor_type="Enable",
    vendor_number="508809",
    display_format="Enable Vendor #"
)

# DVA company (actual payer)
VendorNumber.objects.create(
    company=dva_company,
    vendor_type="DVA",
    vendor_number="682730",
    display_format="DVA #"
)

# ❌ DO NOT create VendorNumbers for BUPA, Medibank, AHM
# These are patient funding sources, not companies!
```

#### 1.4 Migrations
```bash
python manage.py makemigrations patients  # For funding_source
python manage.py makemigrations companies  # For VendorNumber
python manage.py makemigrations invoices   # For CompanySettings (if created)
python manage.py migrate
```

#### 1.5 Create Sample Data Script

**File:** `backend/companies/management/commands/setup_vendor_numbers.py`

```python
from django.core.management.base import BaseCommand
from companies.models import Company, VendorNumber

class Command(BaseCommand):
    help = 'Setup initial vendor numbers for companies'

    def handle(self, *args, **options):
        # Get or create DVA and Enable companies
        enable, _ = Company.objects.get_or_create(
            name="Enable",
            defaults={'abn': ''}
        )
        
        dva, _ = Company.objects.get_or_create(
            name="DVA",
            defaults={'abn': ''}
        )
        
        # Create vendor numbers
        VendorNumber.objects.get_or_create(
            company=enable,
            vendor_type="Enable",
            defaults={
                'vendor_number': '508809',
                'display_format': 'Enable Vendor #'
            }
        )
        
        VendorNumber.objects.get_or_create(
            company=dva,
            vendor_type="DVA",
            defaults={
                'vendor_number': '682730',
                'display_format': 'DVA #'
            }
        )
        
        self.stdout.write(self.style.SUCCESS('✅ Vendor numbers setup complete!'))
        self.stdout.write(self.style.WARNING('Note: BUPA, Medibank, AHM are patient funding sources, not companies!'))
```

**Run:**
```bash
python manage.py setup_vendor_numbers
```

---

### Phase 2: Backend Updates

#### 2.1 Smart Reference Generation (UPDATED LOGIC)

**File:** `backend/xero_integration/services.py`

```python
def generate_smart_reference(patient, company, selected_vendor_number_id=None, custom_reference=None):
    """
    Generate smart reference/PO# for invoice
    
    CRITICAL UNDERSTANDING:
    - DVA and Enable are COMPANIES (payers) with vendor numbers
    - BUPA, Medibank, AHM are PATIENT FUNDING SOURCES (not companies!)
    - NDIS can be both a funding source AND a reference on patient invoices
    
    Priority:
    1. Custom reference (user typed something)
    2. Company vendor number (if billing DVA/Enable company)
    3. NDIS patient (if patient.funding_source == 'NDIS')
    4. Insurance patient (if patient has BUPA/Medibank/AHM)
    5. Default (patient name or company name)
    """
    if custom_reference:
        return custom_reference
    
    # SCENARIO 1: Billing a company (DVA, Enable)
    # Use the company's vendor number
    if selected_vendor_number_id and company:
        from companies.models import VendorNumber
        try:
            vendor_num = VendorNumber.objects.get(id=selected_vendor_number_id, is_active=True)
            return vendor_num.get_formatted_reference()
            # Returns: "Enable Vendor # 508809" or "DVA # 682730"
        except VendorNumber.DoesNotExist:
            pass
    
    # SCENARIO 2: Billing a patient with NDIS funding
    # Show patient's NDIS number
    if patient and hasattr(patient, 'funding_source') and patient.funding_source == 'NDIS':
        if patient.health_number:
            return f"NDIS # {patient.health_number}"
    
    # SCENARIO 3: Billing a patient with private insurance (BUPA, Medibank, AHM)
    # Show insurance type + patient name
    if patient and hasattr(patient, 'funding_source') and patient.funding_source in ['BUPA', 'MEDIBANK', 'AHM']:
        return f"{patient.funding_source} - {patient.get_full_name()}"
    
    # SCENARIO 4: Fallback to company name (if billing a company)
    if company:
        return f"Invoice for {company.name}"
    
    # SCENARIO 5: Last resort - patient name
    if patient:
        return f"Invoice for {patient.get_full_name()}"
    
    return "Invoice"
```

**Examples:**

| Scenario | patient | company | selected_vendor | Result |
|----------|---------|---------|-----------------|--------|
| Billing Enable company | John Smith | Enable | Enable vendor # | `"Enable Vendor # 508809"` |
| Billing DVA company | Jane Doe | DVA | DVA vendor # | `"DVA # 682730"` |
| NDIS patient (self-funded) | John Smith (NDIS) | None | None | `"NDIS # 3333222"` |
| BUPA patient | Jane Doe (BUPA) | None | None | `"BUPA - Jane Doe"` |
| Private patient | Bob Smith (Private) | None | None | `"Invoice for Bob Smith"` |

#### 2.2 Add Vendor Numbers API Endpoints

**File:** `backend/companies/views.py`

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from companies.models import Company, VendorNumber
from companies.serializers import VendorNumberSerializer

@api_view(['GET'])
def get_company_vendor_numbers(request, company_id):
    """Get all vendor numbers for a company"""
    try:
        vendor_numbers = VendorNumber.objects.filter(
            company_id=company_id, 
            is_active=True
        )
        serializer = VendorNumberSerializer(vendor_numbers, many=True)
        return Response({
            'vendor_numbers': serializer.data
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def add_company_vendor_number(request, company_id):
    """Add a new vendor number to a company"""
    try:
        company = Company.objects.get(id=company_id)
        
        vendor_type = request.data.get('vendor_type')
        vendor_number = request.data.get('vendor_number')
        display_format = request.data.get('display_format', '')
        
        if not vendor_type or not vendor_number:
            return Response(
                {'error': 'vendor_type and vendor_number required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create vendor number
        vendor_num = VendorNumber.objects.create(
            company=company,
            vendor_type=vendor_type,
            vendor_number=vendor_number,
            display_format=display_format if display_format else f"{vendor_type} Vendor #"
        )
        
        serializer = VendorNumberSerializer(vendor_num)
        return Response({
            'success': True,
            'vendor_number': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
def update_company_vendor_number(request, vendor_number_id):
    """Update a vendor number"""
    try:
        vendor_num = VendorNumber.objects.get(id=vendor_number_id)
        
        if 'vendor_type' in request.data:
            vendor_num.vendor_type = request.data['vendor_type']
        if 'vendor_number' in request.data:
            vendor_num.vendor_number = request.data['vendor_number']
        if 'display_format' in request.data:
            vendor_num.display_format = request.data['display_format']
        if 'is_active' in request.data:
            vendor_num.is_active = request.data['is_active']
        
        vendor_num.save()
        
        serializer = VendorNumberSerializer(vendor_num)
        return Response({
            'success': True,
            'vendor_number': serializer.data
        })
        
    except VendorNumber.DoesNotExist:
        return Response({'error': 'Vendor number not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
def delete_company_vendor_number(request, vendor_number_id):
    """Remove a vendor number from a company"""
    try:
        vendor_num = VendorNumber.objects.get(id=vendor_number_id)
        vendor_num.delete()
        
        return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)
        
    except VendorNumber.DoesNotExist:
        return Response({'error': 'Vendor number not found'}, status=status.HTTP_404_NOT_FOUND)
```

**File:** `backend/companies/serializers.py`

```python
from rest_framework import serializers
from .models import Company, VendorNumber

class VendorNumberSerializer(serializers.ModelSerializer):
    formatted_reference = serializers.CharField(source='get_formatted_reference', read_only=True)
    
    class Meta:
        model = VendorNumber
        fields = [
            'id', 'company', 'vendor_type', 'vendor_number', 
            'display_format', 'is_active', 'notes', 
            'formatted_reference', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'formatted_reference', 'created_at', 'updated_at']

class CompanySerializer(serializers.ModelSerializer):
    vendor_numbers = VendorNumberSerializer(many=True, read_only=True)
    
    class Meta:
        model = Company
        fields = '__all__'
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
    
    # NEW: Get vendor number ID (from quick-select button)
    selected_vendor_number_id = request.data.get('vendor_number_id')  # UUID of selected VendorNumber
    
    # NEW: Generate smart reference
    custom_reference = request.data.get('reference')
    reference = generate_smart_reference(
        patient=patient, 
        company=company, 
        selected_vendor_number_id=selected_vendor_number_id,
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
const [vendorNumbers, setVendorNumbers] = useState<VendorNumber[]>([]);
const [selectedVendorNumber, setSelectedVendorNumber] = useState<VendorNumber | null>(null);
const [customReference, setCustomReference] = useState('');

// TypeScript interface
interface VendorNumber {
  id: string;
  vendor_type: string;
  vendor_number: string;
  display_format: string;
  formatted_reference: string; // e.g., "Enable Vendor # 508809"
}

// Fetch vendor numbers when company changes
useEffect(() => {
  if (selectedCompany) {
    fetchVendorNumbers(selectedCompany.id);
  } else {
    setVendorNumbers([]);
    setSelectedVendorNumber(null);
  }
}, [selectedCompany]);

const fetchVendorNumbers = async (companyId: string) => {
  const response = await fetch(`https://localhost:8000/api/companies/${companyId}/vendor-numbers/`, {
    credentials: 'include',
  });
  const data = await response.json();
  setVendorNumbers(data.vendor_numbers || []);
};

const handleVendorButtonClick = (vendorNum: VendorNumber) => {
  setSelectedVendorNumber(vendorNum);
  setCustomReference(vendorNum.formatted_reference);
};

// UI Component
<Paper p="md" withBorder mb="md">
  <Group align="center" mb="xs">
    <IconFileText size={20} />
    <Text fw={600}>Reference / PO Number</Text>
  </Group>
  
  {/* Show vendor number quick-select buttons if company selected */}
  {selectedCompany && vendorNumbers.length > 0 && (
    <>
      <Text size="sm" c="dimmed" mb="xs">Quick Select Vendor Number:</Text>
      <Group mb="md">
        {vendorNumbers.map((vendorNum) => (
          <Button
            key={vendorNum.id}
            variant={selectedVendorNumber?.id === vendorNum.id ? 'filled' : 'outline'}
            size="sm"
            onClick={() => handleVendorButtonClick(vendorNum)}
          >
            <Stack gap={2} align="center">
              <Text size="xs" fw={600}>{vendorNum.vendor_type}</Text>
              <Text size="xs">{vendorNum.vendor_number}</Text>
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
      setSelectedVendorNumber(null); // Clear button selection if manually typing
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

#### 3.3 Add Vendor Number Management to Company Profile Page

**File:** `frontend/app/companies/[id]/page.tsx` (or within Company edit modal)

```tsx
const [vendorNumbers, setVendorNumbers] = useState<VendorNumber[]>([]);
const [newVendorType, setNewVendorType] = useState('');
const [newVendorNumber, setNewVendorNumber] = useState('');
const [newDisplayFormat, setNewDisplayFormat] = useState('');

const fetchVendorNumbers = async () => {
  const response = await fetch(`https://localhost:8000/api/companies/${companyId}/vendor-numbers/`, {
    credentials: 'include',
  });
  const data = await response.json();
  setVendorNumbers(data.vendor_numbers || []);
};

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
      display_format: newDisplayFormat || `${newVendorType} Vendor #`,
    }),
  });
  
  if (response.ok) {
    await fetchVendorNumbers();
    setNewVendorType('');
    setNewVendorNumber('');
    setNewDisplayFormat('');
    notifications.show({
      title: 'Success',
      message: 'Vendor number added',
      color: 'green',
    });
  }
};

const handleDeleteVendorNumber = async (vendorNumberId: string) => {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`https://localhost:8000/api/vendor-numbers/${vendorNumberId}/`, {
    method: 'DELETE',
    headers: {
      'X-CSRFToken': csrfToken,
    },
    credentials: 'include',
  });
  
  if (response.ok) {
    await fetchVendorNumbers();
    notifications.show({
      title: 'Success',
      message: 'Vendor number deleted',
      color: 'green',
    });
  }
};

// UI Component
<Paper p="xl" shadow="sm" radius="md" mt="md">
  <Title order={3} mb="md">
    <Group>
      <IconFileText size={24} />
      Vendor/Account Numbers
    </Group>
  </Title>
  
  <Text size="sm" c="dimmed" mb="md">
    Manage vendor/account numbers for this company. These will appear as quick-select buttons when creating invoices.
  </Text>
  
  {/* Existing vendor numbers */}
  {vendorNumbers.length > 0 ? (
    <Table striped highlightOnHover mb="xl">
      <thead>
        <tr>
          <th>Vendor Type</th>
          <th>Number</th>
          <th>Display Format</th>
          <th>Preview</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {vendorNumbers.map((vendorNum) => (
          <tr key={vendorNum.id}>
            <td><Badge>{vendorNum.vendor_type}</Badge></td>
            <td><Text fw={500}>{vendorNum.vendor_number}</Text></td>
            <td><Text size="sm" c="dimmed">{vendorNum.display_format}</Text></td>
            <td><Text size="sm">{vendorNum.formatted_reference}</Text></td>
            <td>
              <ActionIcon 
                color="red" 
                variant="subtle"
                onClick={() => handleDeleteVendorNumber(vendorNum.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  ) : (
    <Alert icon={<IconInfoCircle size={16} />} mb="xl">
      No vendor numbers configured for this company yet.
    </Alert>
  )}
  
  {/* Add new vendor number */}
  <Divider my="md" label="Add New Vendor Number" />
  
  <Grid>
    <Grid.Col span={4}>
      <TextInput
        label="Vendor Type"
        placeholder="e.g., Enable, DVA, BUPA"
        value={newVendorType}
        onChange={(e) => setNewVendorType(e.currentTarget.value)}
        required
      />
    </Grid.Col>
    <Grid.Col span={4}>
      <TextInput
        label="Vendor Number"
        placeholder="e.g., 508809"
        value={newVendorNumber}
        onChange={(e) => setNewVendorNumber(e.currentTarget.value)}
        required
      />
    </Grid.Col>
    <Grid.Col span={4}>
      <TextInput
        label="Display Format (optional)"
        placeholder="e.g., Enable Vendor #"
        description="Leave blank for default format"
        value={newDisplayFormat}
        onChange={(e) => setNewDisplayFormat(e.currentTarget.value)}
      />
    </Grid.Col>
  </Grid>
  
  {newVendorType && newVendorNumber && (
    <Alert color="blue" mt="md" icon={<IconEye size={16} />}>
      <Text size="sm" fw={500}>Preview:</Text>
      <Text size="sm">
        {newDisplayFormat || `${newVendorType} Vendor #`} {newVendorNumber}
      </Text>
    </Alert>
  )}
  
  <Button 
    onClick={handleAddVendorNumber} 
    mt="md" 
    leftSection={<IconPlus size={16} />}
    disabled={!newVendorType || !newVendorNumber}
  >
    Add Vendor Number
  </Button>
</Paper>
```

#### 3.4 Update Submit Payload

```tsx
const payload = {
  // ... existing fields ...
  clinician_id: selectedClinician,
  vendor_number_id: selectedVendorNumber?.id || null, // UUID of selected VendorNumber object
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
- [ ] **Add `funding_source` field to `Patient` model** (NDIS, BUPA, Medibank, AHM, etc.)
- [ ] Create `VendorNumber` model (linked to Company - for DVA and Enable only)
- [ ] Create and run migrations
- [ ] Create setup script for sample data (DVA: 682730, Enable: 508809)
- [ ] Run setup script
- [ ] Update Company Settings UI to include provider registration field

### Phase 2: Backend Logic
- [ ] Create `VendorNumberSerializer`
- [ ] **Update smart reference logic** (handle patient funding_source vs company vendor numbers)
- [ ] Create `generate_smart_reference()` helper function (with patient funding awareness)
- [ ] Add vendor number API endpoints:
  - [ ] `GET /api/companies/{id}/vendor-numbers/`
  - [ ] `POST /api/companies/{id}/vendor-numbers/`
  - [ ] `PUT /api/vendor-numbers/{id}/`
  - [ ] `DELETE /api/vendor-numbers/{id}/`
- [ ] Add URL routes for vendor number endpoints
- [ ] Update `create_xero_invoice()` to accept `clinician_id` and `vendor_number_id`
- [ ] Update `create_xero_invoice()` to auto-select logged-in user's clinician
- [ ] Update `create_xero_invoice()` to generate smart reference (with funding_source logic)
- [ ] Add `GET /api/clinicians/me/` endpoint for current user's clinician
- [ ] Update PDF generator to include practitioner credentials box (with company provider #)

### Phase 3: Frontend UI/UX
- [ ] **Add `funding_source` field to Patient edit form** (dropdown with NDIS, BUPA, etc.)
- [ ] Add clinician selector to `CreateInvoiceDialog.tsx`
- [ ] Add clinician selector to `CreateInvoiceModal.tsx`
- [ ] **Update reference field logic** (show patient funding vs company vendor buttons)
- [ ] Add vendor number quick-select buttons (only when billing DVA/Enable companies)
- [ ] Add custom reference field with auto-generation preview
- [ ] Add vendor number management to Company Profile page
- [ ] Fetch clinicians on modal open
- [ ] Fetch vendor numbers when company is selected (DVA/Enable only)
- [ ] Auto-select current user's clinician profile
- [ ] Show credentials preview when clinician selected
- [ ] Update submit payload to include `clinician_id`, `vendor_number_id`, and `reference`

### Phase 4: Testing
- [ ] Test invoice creation with different clinicians
- [ ] **Test patient funding_source field (NDIS, BUPA, Medibank, AHM)**
- [ ] **Test NDIS patient: auto-generates "NDIS # {health_number}"**
- [ ] **Test BUPA patient: auto-generates "BUPA - {patient_name}"**
- [ ] **Test DVA company billing: shows vendor number "DVA # 682730"**
- [ ] **Test Enable company billing: shows vendor number "Enable Vendor # 508809"**
- [ ] Test custom PO number override
- [ ] Test PDF display of practitioner credentials (with company provider #)
- [ ] Test quotes (same logic should apply)
- [ ] Test vendor number management (add/edit/delete for DVA and Enable)
- [ ] Test unique constraint (company can't have duplicate vendor types)

### Phase 5: Documentation
- [ ] Update `docs/architecture/DATABASE_SCHEMA.md` with new models
- [ ] Document patient `funding_source` field
- [ ] Document difference between company vendor numbers vs patient funding
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
- Add `provider_registration_number` to `CompanySettings` model
- Display company's provider # on all invoices

---

### 2. **DVA and Enable are COMPANIES** ✅
**Critical Understanding:**
- **DVA** and **Enable** are actual **companies** in the system
- They are **payers** (who you bill)
- They have **vendor numbers** that appear on invoices:
  - DVA → Vendor # `682730`
  - Enable → Vendor # `508809`

**Implementation:**
- Use existing `VendorNumber` model linked to `Company`
- When billing DVA or Enable, select them as the **Company** on the invoice
- Their vendor number auto-fills in Reference field

---

### 3. **BUPA, Medibank, AHM are INSURANCE (Not Companies)** ✅
**Critical Understanding:**
- BUPA, Medibank, AHM are **NOT companies** you select on invoices
- They are **patient funding sources/insurance types**
- The **patient** is the primary contact, but they have insurance coverage

**Implementation:**
- Add `funding_source` field to `Patient` model
- Choices: NDIS, BUPA, Medibank, AHM, DVA, Private, Other
- Used for reference generation and reporting
- **Not** used as the "Company" field on invoices

---

### 4. **NDIS Patients - Special Handling** ✅
**Critical Understanding:**
- If patient has `funding_source = 'NDIS'`:
  - Show patient's NDIS # (`patient.health_number`)
  - Show company's NDIS provider # (`company_settings.provider_registration_number`)

**PDF Display:**
```
Reference / PO#
Mr. Craig Laird
NDIS # 3333222                      ← Patient's NDIS number
Provider Registration # 4050009706  ← Company's NDIS provider #
```

---

### 5. **Reference Generation Logic** ✅

**Priority (Updated):**

1. **Custom reference** (user typed something)
2. **Company vendor number** (if billing DVA/Enable company)
3. **NDIS patient** (if `patient.funding_source == 'NDIS'`)
4. **Insurance patient** (if patient has BUPA/Medibank/AHM)
5. **Default** (patient name or company name)

**Examples:**

| Scenario | Reference |
|----------|-----------|
| Billing Enable company | `"Enable Vendor # 508809"` |
| Billing DVA company | `"DVA # 682730"` |
| Patient with NDIS funding | `"NDIS # 3333222"` |
| Patient with BUPA insurance | `"BUPA - John Smith"` |
| Private patient | `"Invoice for John Smith"` |

---

### 6. **PDF Layout** ✅
**Confirmed:** Top right corner with practitioner credentials

**When billing Enable (company):**
```
Reference / PO#
Craig Laird
Enable Vendor # 508809
Provider Registration # 4050009706

Practitioner:
Craig Laird
C.Ped CM AU
Pedorthic Registration # 3454
www.pedorthics.org.au
```

**When billing NDIS patient:**
```
Reference / PO#
Craig Laird
NDIS # 3333222
Provider Registration # 4050009706

Practitioner:
Craig Laird
C.Ped CM AU
Pedorthic Registration # 3454
www.pedorthics.org.au
```

---

### 7. **Clinician Selection** ✅
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

