# Invoice Clinician Credentials - SIMPLIFIED PLAN

## 🎯 Goal
Display practitioner credentials on invoices/quotes (PDF + email) with smart reference generation based on patient's funding source.

---

## 📋 What We Need

### 1. Patient Funding Source Field
Add `funding_source` to Patient model to track:
- NDIS
- DVA  
- Enable
- BUPA
- Medibank
- AHM
- Private
- Other

### 2. Company Reference Numbers
Store in `EmailGlobalSettings`:
- `provider_registration_number` = `"4050009706"` (for NDIS/Medicare)
- `dva_number` = `"682730"`
- `enable_number` = `"508809"`

### 3. Smart Reference Generation
Based on patient's funding source:
- **NDIS** → `"NDIS # 3333222"` (patient's health_number)
- **DVA** → `"DVA # 682730"` (company's dva_number)
- **Enable** → `"Enable Vendor # 508809"` (company's enable_number)
- **BUPA/Medibank/AHM** → `"BUPA - John Smith"` (funding + patient name)
- **Private/Other** → `"Invoice for John Smith"` (patient name)

---

## 🚀 Implementation

### Phase 1: Database (10 mins)

#### Add to `EmailGlobalSettings`
```python
# backend/invoices/models.py
class EmailGlobalSettings:
    # ... existing fields ...
    
    # Provider numbers
    provider_registration_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        default="4050009706",
        help_text="NDIS/Medicare provider registration number"
    )
    
    dva_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        default="682730",
        help_text="DVA account number"
    )
    
    enable_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        default="508809",
        help_text="Enable vendor number"
    )
```

#### Add to `Patient` model
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
            ('DVA', 'DVA'),
            ('ENABLE', 'Enable'),
            ('BUPA', 'BUPA'),
            ('MEDIBANK', 'Medibank'),
            ('AHM', 'AHM'),
            ('PRIVATE', 'Private/Self-Funded'),
            ('OTHER', 'Other'),
        ],
        help_text="Patient's primary funding source"
    )
```

#### Run migrations
```bash
python manage.py makemigrations patients
python manage.py makemigrations invoices
python manage.py migrate
```

---

### Phase 2: Backend Logic (30 mins)

#### Smart Reference Generation
```python
# backend/xero_integration/services.py

def generate_smart_reference(patient, custom_reference=None):
    """
    Generate reference based on patient's funding source
    """
    from invoices.models import EmailGlobalSettings
    
    if custom_reference:
        return custom_reference
    
    if not patient:
        return "Invoice"
    
    settings = EmailGlobalSettings.get_settings()
    
    # Check patient's funding source
    if hasattr(patient, 'funding_source') and patient.funding_source:
        
        if patient.funding_source == 'NDIS' and patient.health_number:
            return f"NDIS # {patient.health_number}"
        
        elif patient.funding_source == 'DVA' and settings.dva_number:
            return f"DVA # {settings.dva_number}"
        
        elif patient.funding_source == 'ENABLE' and settings.enable_number:
            return f"Enable Vendor # {settings.enable_number}"
        
        elif patient.funding_source in ['BUPA', 'MEDIBANK', 'AHM']:
            return f"{patient.funding_source} - {patient.get_full_name()}"
    
    # Default
    return f"Invoice for {patient.get_full_name()}"
```

#### Update Create Invoice
```python
# backend/xero_integration/views.py

@api_view(['POST'])
def create_xero_invoice(request):
    # ... existing code ...
    
    # Generate reference from patient funding source
    custom_reference = request.data.get('reference')  # Allow manual override
    reference = generate_smart_reference(patient, custom_reference)
    
    # Create invoice
    invoice_link = xero_service.create_invoice(
        # ... existing params ...
        reference=reference,
    )
```

#### Update PDF Generator
```python
# backend/invoices/document_pdf_generator.py

def add_practitioner_box(canvas, x, y, clinician, reference):
    """Draw practitioner box on PDF (top right corner)"""
    from invoices.models import EmailGlobalSettings
    
    settings = EmailGlobalSettings.get_settings()
    
    # Title
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(x, y, "Reference / PO#")
    y -= 15
    
    # Clinician name
    canvas.setFont("Helvetica", 9)
    if clinician:
        canvas.drawString(x, y, clinician.full_name)
        y -= 12
    
    # Reference (DVA #, NDIS #, etc.)
    if reference:
        canvas.drawString(x, y, reference)
        y -= 12
    
    # Provider Registration
    if settings.provider_registration_number:
        canvas.drawString(x, y, f"Provider Registration # {settings.provider_registration_number}")
        y -= 15
    
    # Practitioner section
    canvas.setFont("Helvetica-BoldOblique", 10)
    canvas.drawString(x, y, "Practitioner:")
    y -= 12
    
    if clinician:
        canvas.setFont("Helvetica-Bold", 10)
        if clinician.credential:
            canvas.drawString(x, y, f"{clinician.full_name}, {clinician.credential}")
        else:
            canvas.drawString(x, y, clinician.full_name)
        y -= 12
        
        canvas.setFont("Helvetica", 9)
        if clinician.registration_number:
            canvas.drawString(x, y, clinician.registration_number)
            y -= 12
        
        if clinician.professional_body_url:
            canvas.setFill(colors.blue)
            canvas.drawString(x, y, clinician.professional_body_url)
            canvas.setFill(colors.black)
```

---

### Phase 3: Frontend (1 hour)

#### Add Funding Source to Patient Form
```tsx
// frontend/app/patients/[id]/page.tsx (or patient edit form)

<Select
  label="Funding Source"
  data={[
    { value: 'NDIS', label: 'NDIS' },
    { value: 'DVA', label: 'DVA' },
    { value: 'ENABLE', label: 'Enable' },
    { value: 'BUPA', label: 'BUPA' },
    { value: 'MEDIBANK', label: 'Medibank' },
    { value: 'AHM', label: 'AHM' },
    { value: 'PRIVATE', label: 'Private/Self-Funded' },
    { value: 'OTHER', label: 'Other' },
  ]}
  value={formData.funding_source}
  onChange={(value) => setFormData({...formData, funding_source: value})}
  clearable
/>
```

#### Reference Field with Preview (Invoice Form)
```tsx
// frontend/app/components/xero/CreateInvoiceModal.tsx

<TextInput
  label="Reference / PO Number"
  placeholder="Leave blank to auto-generate"
  description={
    selectedPatient?.funding_source === 'NDIS' && selectedPatient?.health_number
      ? `Auto: NDIS # ${selectedPatient.health_number}`
      : selectedPatient?.funding_source === 'DVA'
      ? `Auto: DVA # 682730`
      : selectedPatient?.funding_source === 'ENABLE'
      ? `Auto: Enable Vendor # 508809`
      : `Auto: Invoice for ${selectedPatient?.full_name || 'Patient'}`
  }
  value={customReference}
  onChange={(e) => setCustomReference(e.currentTarget.value)}
/>
```

---

## ✅ Checklist

### Database
- [ ] Add `provider_registration_number`, `dva_number`, `enable_number` to `EmailGlobalSettings`
- [ ] Add `funding_source` to `Patient` model
- [ ] Run migrations
- [ ] Update Company Settings UI to set provider numbers

### Backend
- [ ] Create `generate_smart_reference()` function
- [ ] Update `create_xero_invoice()` to use smart reference
- [ ] Update PDF generator to include practitioner box

### Frontend
- [ ] Add `funding_source` dropdown to Patient form
- [ ] Add reference preview to Invoice creation form
- [ ] Update Patient serializer to include `funding_source`

### Testing
- [ ] Test NDIS patient → shows `"NDIS # 3333222"`
- [ ] Test DVA patient → shows `"DVA # 682730"`
- [ ] Test Enable patient → shows `"Enable Vendor # 508809"`
- [ ] Test BUPA patient → shows `"BUPA - John Smith"`
- [ ] Test PDF displays practitioner credentials correctly

---

## 📊 Examples

### NDIS Patient
```
Reference / PO#
Craig Laird
NDIS # 3333222
Provider Registration # 4050009706

Practitioner:
Craig Laird, CPed CM au
Pedorthic Registration # 3454
www.pedorthics.org.au
```

### DVA Patient
```
Reference / PO#
Craig Laird
DVA # 682730
Provider Registration # 4050009706

Practitioner:
Craig Laird, CPed CM au
Pedorthic Registration # 3454
www.pedorthics.org.au
```

### BUPA Patient
```
Reference / PO#
Craig Laird
BUPA - John Smith
Provider Registration # 4050009706

Practitioner:
Craig Laird, CPed CM au
Pedorthic Registration # 3454
www.pedorthics.org.au
```

---

**That's it! Simple, clean, and effective.** 🚀

