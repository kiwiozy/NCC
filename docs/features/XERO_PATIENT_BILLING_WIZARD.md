# Patient Invoice/Quote Creation Wizard - Implementation Guide

## Overview
A multi-step wizard for creating invoices and quotes from a patient's account dialogue, with support for both direct patient billing and company-funded billing.

## Wizard Flow

### Current Context
- **Starting Point**: Patient Account Dialogue (e.g., John Smith's account)
- **Known Information**: 
  - Patient ID
  - Patient Name
  - Patient's existing invoices/quotes

### Step-by-Step Wizard

```
┌─────────────────────────────────────────────────────────┐
│  Step 1: Document Type                                  │
│  ○ Invoice  ○ Quote                                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Step 2: Who Pays? (Billing Method)                    │
│  ○ Patient Pays Directly                                │
│  ○ Company Pays (Funded Service)                        │
└─────────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│  [Patient Path]  │          │  [Company Path]  │
│  Skip to Step 4  │          │  Go to Step 3    │
└──────────────────┘          └──────────────────┘
                                       ↓
                        ┌──────────────────────────┐
                        │  Step 3: Select Company  │
                        │  [Search & Select]       │
                        └──────────────────────────┘
                                       ↓
┌─────────────────────────────────────────────────────────┐
│  Step 4: Review & Confirm                               │
│  Patient: John Smith ✓                                  │
│  Company: HealthShare (if selected)                     │
│  Type: Invoice/Quote                                    │
│  Next: Open line items editor                           │
└─────────────────────────────────────────────────────────┘
```

---

## Detailed Step Specifications

### Step 1: Document Type
**Purpose**: Choose between Invoice or Quote

**UI Design**:
```typescript
┌──────────────────────────────────────────────────┐
│  Create Invoice or Quote for John Smith         │
├──────────────────────────────────────────────────┤
│                                                  │
│  What would you like to create?                 │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  ○  Invoice                               │  │
│  │     Create an invoice for services        │  │
│  │     provided or products delivered        │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  ○  Quote                                 │  │
│  │     Create a quote for upcoming           │  │
│  │     services (requires approval)          │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  [Cancel]                           [Next →]     │
└──────────────────────────────────────────────────┘
```

**State**:
```typescript
const [documentType, setDocumentType] = useState<'invoice' | 'quote'>('invoice');
```

---

### Step 2: Who Pays? (Billing Method)
**Purpose**: Determine if patient pays directly or company pays

**UI Design**:
```typescript
┌──────────────────────────────────────────────────┐
│  Create Invoice for John Smith                   │
├──────────────────────────────────────────────────┤
│                                                  │
│  Who will pay for this service?                 │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  ○  Patient Pays Directly                 │  │
│  │     💰 John Smith                         │  │
│  │                                            │  │
│  │     Bill the patient directly              │  │
│  │     • Patient is Xero contact              │  │
│  │     • Payment from patient                 │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  ○  Company Pays (Funded Service)         │  │
│  │     🏢 NDIS, EnableNSW, Insurance, etc.   │  │
│  │                                            │  │
│  │     Bill a funding company                 │  │
│  │     • Company is Xero contact              │  │
│  │     • Service still for John Smith         │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  [← Back]                           [Next →]     │
└──────────────────────────────────────────────────┘
```

**State**:
```typescript
const [billingMethod, setBillingMethod] = useState<'patient' | 'company'>('patient');
```

**Visual Indicators**:
- Patient icon: 💰 or IconUser
- Company icon: 🏢 or IconBuilding
- Subtle examples: "NDIS, EnableNSW, Insurance, etc."

---

### Step 3: Select Company (Conditional - Only if Company Pays)
**Purpose**: Search for and select the funding company

**UI Design**:
```typescript
┌──────────────────────────────────────────────────┐
│  Create Invoice for John Smith                   │
├──────────────────────────────────────────────────┤
│                                                  │
│  Which company will pay?                        │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ 🔍 Search company...                      │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Common Funding Sources:                        │
│  ┌───────────────────────────────────────────┐  │
│  │  HealthShare (NDIS NSW)                   │  │
│  │  EnableNSW                                │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  icare                                    │  │
│  │  Department of Veterans' Affairs          │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Search Results:                                │
│  ┌───────────────────────────────────────────┐  │
│  │  ✓ HealthShare Accounts Payable Enable   │  │
│  │    NDIS • ABN: 12345678                   │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  [← Back]                           [Next →]     │
└──────────────────────────────────────────────────┘
```

**Features**:
- Real-time search with debounce (300ms)
- Show common/recent companies first
- Display company details (ABN, type)
- Highlight selected company with checkmark
- Allow creating new company if not found

**State**:
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [companies, setCompanies] = useState<Company[]>([]);
const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
const [searching, setSearching] = useState(false);
```

**API Call**:
```typescript
const searchCompanies = async (query: string) => {
  setSearching(true);
  try {
    const response = await fetch(
      `https://localhost:8000/api/companies/?search=${query}&limit=10`
    );
    const data = await response.json();
    setCompanies(data.results || data);
  } finally {
    setSearching(false);
  }
};
```

---

### Step 4: Review & Confirm
**Purpose**: Show final summary before creating the invoice/quote

**UI Design - Patient Pays**:
```typescript
┌──────────────────────────────────────────────────┐
│  Create Invoice - Review                         │
├──────────────────────────────────────────────────┤
│                                                  │
│  📋 Summary                                      │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  Type:     Invoice                        │  │
│  │  Patient:  John Smith ✓                   │  │
│  │  Billing:  Direct to Patient              │  │
│  │                                            │  │
│  │  Xero Contact: John Smith                 │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ℹ️  Next: Add line items and details          │
│                                                  │
│  [← Back]              [Create Invoice →]        │
└──────────────────────────────────────────────────┘
```

**UI Design - Company Pays**:
```typescript
┌──────────────────────────────────────────────────┐
│  Create Quote - Review                           │
├──────────────────────────────────────────────────┤
│                                                  │
│  📋 Summary                                      │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  Type:         Quote                      │  │
│  │  Patient:      John Smith ✓               │  │
│  │  Company:      HealthShare ✓              │  │
│  │  Billing:      Company Funded             │  │
│  │                                            │  │
│  │  Service For:  John Smith                 │  │
│  │  Xero Contact: HealthShare                │  │
│  │  Quote Sent To: HealthShare               │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ℹ️  The quote will be sent to HealthShare     │
│     for approval. John Smith will receive       │
│     the service once approved.                  │
│                                                  │
│  [← Back]                [Create Quote →]        │
└──────────────────────────────────────────────────┘
```

**Confirmation Action**:
- Creates the invoice/quote in DRAFT status
- Opens the full line items editor modal
- Pre-fills patient and company fields

---

## Component Structure

### Main Wizard Component

```typescript
// frontend/app/components/xero/PatientBillingWizard.tsx

'use client';

import { useState, useEffect } from 'react';
import { Modal, Stack, Group, Text, Button, Radio, Paper, Stepper, TextInput, Badge, Alert } from '@mantine/core';
import { IconFileInvoice, IconFileText, IconUser, IconBuilding, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface Company {
  id: string;
  name: string;
  abn?: string;
  company_type?: string;
}

interface PatientBillingWizardProps {
  opened: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onCreateInvoice?: (patientId: string, companyId?: string) => void;
  onCreateQuote?: (patientId: string, companyId?: string) => void;
}

export function PatientBillingWizard({
  opened,
  onClose,
  patientId,
  patientName,
  onCreateInvoice,
  onCreateQuote
}: PatientBillingWizardProps) {
  // Wizard state
  const [activeStep, setActiveStep] = useState(0);
  
  // Step 1: Document type
  const [documentType, setDocumentType] = useState<'invoice' | 'quote'>('invoice');
  
  // Step 2: Billing method
  const [billingMethod, setBillingMethod] = useState<'patient' | 'company'>('patient');
  
  // Step 3: Company selection
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  
  // Common companies (cached)
  const [commonCompanies, setCommonCompanies] = useState<Company[]>([]);

  // Load common companies on mount
  useEffect(() => {
    if (opened) {
      loadCommonCompanies();
    }
  }, [opened]);

  // Search companies when query changes
  useEffect(() => {
    if (activeStep === 2 && searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchCompanies();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeStep]);

  const loadCommonCompanies = async () => {
    try {
      // Load frequently used funding companies
      const response = await fetch(
        'https://localhost:8000/api/companies/?funding=true&limit=5'
      );
      const data = await response.json();
      setCommonCompanies(data.results || data);
    } catch (error) {
      console.error('Error loading common companies:', error);
    }
  };

  const searchCompanies = async () => {
    if (searchQuery.length < 2) return;
    
    setSearching(true);
    try {
      const response = await fetch(
        `https://localhost:8000/api/companies/?search=${searchQuery}&limit=10`
      );
      const data = await response.json();
      setCompanies(data.results || data);
    } catch (error) {
      console.error('Error searching companies:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleNext = () => {
    // Validation for each step
    if (activeStep === 2 && billingMethod === 'company' && !selectedCompanyId) {
      notifications.show({
        title: 'Company Required',
        message: 'Please select a company to continue',
        color: 'red',
      });
      return;
    }

    // If patient pays, skip company selection
    if (activeStep === 1 && billingMethod === 'patient') {
      setActiveStep(3); // Skip to review
    } else {
      setActiveStep((current) => current + 1);
    }
  };

  const handleBack = () => {
    // If on review and patient pays, skip back over company selection
    if (activeStep === 3 && billingMethod === 'patient') {
      setActiveStep(1);
    } else {
      setActiveStep((current) => current - 1);
    }
  };

  const handleCreate = () => {
    // Create invoice/quote based on selections
    const companyId = billingMethod === 'company' ? selectedCompanyId : undefined;
    
    if (documentType === 'invoice' && onCreateInvoice) {
      onCreateInvoice(patientId, companyId || undefined);
    } else if (documentType === 'quote' && onCreateQuote) {
      onCreateQuote(patientId, companyId || undefined);
    }
    
    handleClose();
  };

  const handleClose = () => {
    // Reset wizard state
    setActiveStep(0);
    setDocumentType('invoice');
    setBillingMethod('patient');
    setSearchQuery('');
    setSelectedCompanyId(null);
    setCompanies([]);
    onClose();
  };

  const getSelectedCompanyName = () => {
    if (!selectedCompanyId) return '';
    const company = [...companies, ...commonCompanies].find(c => c.id === selectedCompanyId);
    return company?.name || '';
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Text fw={600}>Create {documentType === 'invoice' ? 'Invoice' : 'Quote'} for {patientName}</Text>}
      size="lg"
      centered
    >
      <Stack gap="lg">
        <Stepper active={activeStep} size="sm">
          <Stepper.Step label="Type" description="Invoice or Quote" />
          <Stepper.Step label="Billing" description="Who pays?" />
          <Stepper.Step label="Company" description="Select payer" />
          <Stepper.Step label="Review" description="Confirm details" />
        </Stepper>

        {/* Step 1: Document Type */}
        {activeStep === 0 && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">What would you like to create?</Text>
            <Radio.Group value={documentType} onChange={(val) => setDocumentType(val as 'invoice' | 'quote')}>
              <Stack gap="sm">
                <Paper
                  p="md"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    backgroundColor: documentType === 'invoice' ? '#e7f5ff' : undefined,
                    borderColor: documentType === 'invoice' ? '#228be6' : undefined,
                  }}
                  onClick={() => setDocumentType('invoice')}
                >
                  <Radio
                    value="invoice"
                    label={
                      <Group gap="sm">
                        <IconFileInvoice size={24} />
                        <div>
                          <Text fw={500}>Invoice</Text>
                          <Text size="xs" c="dimmed">
                            Create an invoice for services provided or products delivered
                          </Text>
                        </div>
                      </Group>
                    }
                  />
                </Paper>

                <Paper
                  p="md"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    backgroundColor: documentType === 'quote' ? '#e7f5ff' : undefined,
                    borderColor: documentType === 'quote' ? '#228be6' : undefined,
                  }}
                  onClick={() => setDocumentType('quote')}
                >
                  <Radio
                    value="quote"
                    label={
                      <Group gap="sm">
                        <IconFileText size={24} />
                        <div>
                          <Text fw={500}>Quote</Text>
                          <Text size="xs" c="dimmed">
                            Create a quote for upcoming services (requires approval)
                          </Text>
                        </div>
                      </Group>
                    }
                  />
                </Paper>
              </Stack>
            </Radio.Group>
          </Stack>
        )}

        {/* Step 2: Billing Method */}
        {activeStep === 1 && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">Who will pay for this service?</Text>
            <Radio.Group value={billingMethod} onChange={(val) => setBillingMethod(val as 'patient' | 'company')}>
              <Stack gap="sm">
                <Paper
                  p="md"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    backgroundColor: billingMethod === 'patient' ? '#e7f5ff' : undefined,
                    borderColor: billingMethod === 'patient' ? '#228be6' : undefined,
                  }}
                  onClick={() => setBillingMethod('patient')}
                >
                  <Radio
                    value="patient"
                    label={
                      <Group gap="sm">
                        <IconUser size={24} />
                        <div>
                          <Text fw={500}>Patient Pays Directly</Text>
                          <Text size="sm" fw={600} c="blue">{patientName}</Text>
                          <Text size="xs" c="dimmed" mt={4}>
                            Bill the patient directly • Patient is Xero contact
                          </Text>
                        </div>
                      </Group>
                    }
                  />
                </Paper>

                <Paper
                  p="md"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    backgroundColor: billingMethod === 'company' ? '#e7f5ff' : undefined,
                    borderColor: billingMethod === 'company' ? '#228be6' : undefined,
                  }}
                  onClick={() => setBillingMethod('company')}
                >
                  <Radio
                    value="company"
                    label={
                      <Group gap="sm">
                        <IconBuilding size={24} />
                        <div>
                          <Text fw={500}>Company Pays (Funded Service)</Text>
                          <Text size="xs" c="dimmed" mt={4}>
                            NDIS, EnableNSW, Insurance, etc.
                          </Text>
                          <Text size="xs" c="dimmed">
                            Bill a funding company • Service still for {patientName}
                          </Text>
                        </div>
                      </Group>
                    }
                  />
                </Paper>
              </Stack>
            </Radio.Group>
          </Stack>
        )}

        {/* Step 3: Company Selection */}
        {activeStep === 2 && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">Which company will pay?</Text>
            
            <TextInput
              placeholder="Search company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<IconSearch size={16} />}
            />

            {commonCompanies.length > 0 && searchQuery.length < 2 && (
              <Stack gap="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Common Funding Sources
                </Text>
                {commonCompanies.map((company) => (
                  <Paper
                    key={company.id}
                    p="sm"
                    withBorder
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedCompanyId === company.id ? '#e7f5ff' : undefined,
                      borderColor: selectedCompanyId === company.id ? '#228be6' : undefined,
                    }}
                    onClick={() => setSelectedCompanyId(company.id)}
                  >
                    <Group justify="space-between">
                      <div>
                        <Text fw={500}>{company.name}</Text>
                        {company.abn && (
                          <Text size="xs" c="dimmed">ABN: {company.abn}</Text>
                        )}
                      </div>
                      {selectedCompanyId === company.id && (
                        <Badge color="blue" variant="light">Selected</Badge>
                      )}
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}

            {searchQuery.length >= 2 && (
              <Stack gap="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Search Results
                </Text>
                {searching ? (
                  <Text size="sm" c="dimmed">Searching...</Text>
                ) : companies.length > 0 ? (
                  companies.map((company) => (
                    <Paper
                      key={company.id}
                      p="sm"
                      withBorder
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedCompanyId === company.id ? '#e7f5ff' : undefined,
                        borderColor: selectedCompanyId === company.id ? '#228be6' : undefined,
                      }}
                      onClick={() => setSelectedCompanyId(company.id)}
                    >
                      <Group justify="space-between">
                        <div>
                          <Text fw={500}>{company.name}</Text>
                          {company.abn && (
                            <Text size="xs" c="dimmed">ABN: {company.abn}</Text>
                          )}
                        </div>
                        {selectedCompanyId === company.id && (
                          <Badge color="blue" variant="light">Selected</Badge>
                        )}
                      </Group>
                    </Paper>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">No companies found</Text>
                )}
              </Stack>
            )}

            {searchQuery.length < 2 && commonCompanies.length === 0 && (
              <Text size="sm" c="dimmed">Type at least 2 characters to search</Text>
            )}
          </Stack>
        )}

        {/* Step 4: Review */}
        {activeStep === 3 && (
          <Stack gap="md">
            <Text size="sm" fw={600}>📋 Summary</Text>
            
            <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Type:</Text>
                  <Badge color="blue" variant="light">
                    {documentType === 'invoice' ? 'Invoice' : 'Quote'}
                  </Badge>
                </Group>
                
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Patient:</Text>
                  <Text size="sm" fw={600}>{patientName} ✓</Text>
                </Group>
                
                {billingMethod === 'company' && (
                  <>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Company:</Text>
                      <Text size="sm" fw={600}>{getSelectedCompanyName()} ✓</Text>
                    </Group>
                    
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Billing:</Text>
                      <Text size="sm">Company Funded</Text>
                    </Group>
                  </>
                )}
                
                {billingMethod === 'patient' && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Billing:</Text>
                    <Text size="sm">Direct to Patient</Text>
                  </Group>
                )}
                
                <Group justify="space-between" mt="xs" pt="xs" style={{ borderTop: '1px solid #dee2e6' }}>
                  <Text size="sm" c="dimmed">Xero Contact:</Text>
                  <Text size="sm" fw={600}>
                    {billingMethod === 'company' ? getSelectedCompanyName() : patientName}
                  </Text>
                </Group>
              </Stack>
            </Paper>

            {billingMethod === 'company' && (
              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                The {documentType} will be sent to <strong>{getSelectedCompanyName()}</strong> for approval. 
                <strong> {patientName}</strong> will receive the service once approved.
              </Alert>
            )}

            <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light">
              Next: Add line items and details to complete the {documentType}
            </Alert>
          </Stack>
        )}

        {/* Navigation Buttons */}
        <Group justify="space-between" mt="xl">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Group>
            {activeStep > 0 && (
              <Button variant="light" onClick={handleBack}>
                ← Back
              </Button>
            )}
            {activeStep < 3 ? (
              <Button onClick={handleNext}>
                Next →
              </Button>
            ) : (
              <Button onClick={handleCreate}>
                Create {documentType === 'invoice' ? 'Invoice' : 'Quote'} →
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
```

---

## Integration with PatientInvoicesQuotes Component

Update `frontend/app/components/xero/PatientInvoicesQuotes.tsx`:

```typescript
import { PatientBillingWizard } from './PatientBillingWizard';

// Replace PatientQuickCreateModal with PatientBillingWizard

{/* Patient Billing Wizard */}
{patientId && patientName && (
  <PatientBillingWizard
    opened={quickCreateOpened}
    onClose={() => setQuickCreateOpened(false)}
    patientId={patientId}
    patientName={patientName}
    onCreateInvoice={(pId, cId) => {
      setQuickCreateOpened(false);
      // Open CreateInvoiceModal with pre-filled patient and optional company
      setCreateInvoiceModalOpened(true);
      // TODO: Pass company ID to CreateInvoiceModal
    }}
    onCreateQuote={(pId, cId) => {
      setQuickCreateOpened(false);
      // Open CreateQuoteModal with pre-filled patient and optional company
      setCreateQuoteModalOpened(true);
      // TODO: Pass company ID to CreateQuoteModal
    }}
  />
)}
```

---

## Key Features

### 1. **Smart Step Navigation**
- Automatically skips company selection if patient pays directly
- Back button navigates intelligently (skips over skipped steps)

### 2. **Common Companies**
- Pre-loads frequently used funding sources (NDIS, EnableNSW, etc.)
- Displayed first for quick selection
- Searchable for other companies

### 3. **Visual Indicators**
- Patient/Company icons for clarity
- Blue highlighting for selected options
- Checkmarks and badges for confirmation
- Color-coded borders for active selections

### 4. **Validation**
- Prevents advancing without required selections
- Shows friendly error messages
- Validates at each step

### 5. **Review Step**
- Clear summary of all selections
- Shows Xero contact (who gets the invoice/quote)
- Explains the workflow for company-funded services
- Info alerts for next steps

---

## Testing Checklist

- [ ] Test patient pays directly flow (3 steps)
- [ ] Test company pays flow (4 steps)
- [ ] Test company search functionality
- [ ] Test back button navigation
- [ ] Test cancel and close
- [ ] Test with long patient/company names
- [ ] Test validation errors
- [ ] Test creating invoice after wizard
- [ ] Test creating quote after wizard
- [ ] Test switching between invoice/quote mid-flow

---

## Future Enhancements

1. **Recent Companies**: Show companies recently used for this patient
2. **Company Create**: Add "+ New Company" button in search results
3. **Appointment Link**: Optional step to link to an existing appointment
4. **Service Type**: Optional tags (NDIS, EnableNSW, Private, etc.)
5. **Favorites**: Star frequently used companies for quick access
6. **Company Info**: Preview company details before selection
7. **Invoice Templates**: Pre-fill common service line items

---

**Last Updated**: November 17, 2025  
**Status**: Design Complete - Ready for Implementation  
**Component**: `PatientBillingWizard.tsx`

