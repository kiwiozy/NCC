# 💳 Xero Payment Processing - Implementation Guide

**Date:** November 17, 2025  
**Branch:** XeroV2  
**Status:** 📋 Planning Document

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Payment Scenarios](#payment-scenarios)
3. [Xero API Payment Endpoints](#xero-api-payment-endpoints)
4. [Single Invoice Payments](#single-invoice-payments)
5. [Batch Payments (Remittance Advice)](#batch-payments-remittance-advice)
6. [Database Schema](#database-schema)
7. [Implementation Plan](#implementation-plan)
8. [UI/UX Design](#uiux-design)
9. [API Integration](#api-integration)
10. [Testing Strategy](#testing-strategy)

---

## 📖 Overview

This document outlines the implementation strategy for payment processing in the Nexus Core Clinic system, integrated with Xero. The system must handle two primary payment scenarios:

1. **Single Invoice Payment** - Applying a payment to one invoice
2. **Batch Payment (Remittance Advice)** - Applying a single payment across multiple invoices

### Business Requirements

**Scenario 1: Single Invoice Payment**
- Patient/company makes a payment for a specific invoice
- Payment is recorded in Xero and synced to Nexus
- Invoice status updates from AUTHORISED → PAID (if fully paid)
- Amount due reflects remaining balance

**Scenario 2: Batch Payment (Remittance Advice)**
- Company sends a Remittance Advice covering 2+ invoices
- Single bank transaction covers multiple invoice payments
- Each invoice receives a portion of the total payment
- All invoices update status and amounts accordingly
- Remittance reference links all payments together

---

## 🎯 Payment Scenarios

### Scenario 1: Single Invoice Payment

**Example:**
```
Invoice: INV-001
Amount Due: $250.00
Payment Received: $250.00
Result: Invoice status → PAID
```

**Workflow:**
1. User views invoice details
2. Clicks "Record Payment" button
3. Enters payment details (amount, date, reference, account)
4. System creates payment in Xero
5. System syncs updated invoice status
6. Invoice shows as PAID in Nexus

---

### Scenario 2: Batch Payment (Remittance Advice)

**Example:**
```
Remittance Advice: REM-2025-11-17
Bank Payment: $750.00
Covers:
  - INV-001: $250.00
  - INV-002: $300.00
  - INV-003: $200.00

Result: 
  - All 3 invoices → PAID
  - Single bank transaction
  - Linked by remittance reference
```

**Workflow:**
1. User creates new batch payment
2. Selects multiple invoices (filtered by company)
3. System displays total amount due
4. User enters total payment amount and allocations
5. System creates individual payments in Xero for each invoice
6. All payments share same reference and date
7. System syncs all updated invoice statuses
8. Batch payment record stored in Nexus

---

## 🔌 Xero API Payment Endpoints

### 1. Create Payment (Single or Multiple)

**Endpoint:** `PUT /Payments`  
**Purpose:** Create one or more payments  
**Rate Limit:** Counts as 1 API call per request (can include multiple payments)

**Request Structure (Single Payment):**

```json
{
  "Payments": [
    {
      "Invoice": {
        "InvoiceID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      },
      "Account": {
        "Code": "090"  // Bank account code
      },
      "Date": "2025-11-18",
      "Amount": 250.00,
      "Reference": "Payment for INV-001"
    }
  ]
}
```

**Request Structure (Batch Payment - Multiple Invoices):**

```json
{
  "Payments": [
    {
      "Invoice": {
        "InvoiceID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      },
      "Account": {
        "Code": "090"
      },
      "Date": "2025-11-18",
      "Amount": 250.00,
      "Reference": "REM-2025-11-17"
    },
    {
      "Invoice": {
        "InvoiceID": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
      },
      "Account": {
        "Code": "090"
      },
      "Date": "2025-11-18",
      "Amount": 300.00,
      "Reference": "REM-2025-11-17"
    },
    {
      "Invoice": {
        "InvoiceID": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz"
      },
      "Account": {
        "Code": "090"
      },
      "Date": "2025-11-18",
      "Amount": 200.00,
      "Reference": "REM-2025-11-17"
    }
  ]
}
```

**Response:**

```json
{
  "Id": "...",
  "Status": "OK",
  "ProviderName": "...",
  "DateTimeUTC": "2025-11-18T12:00:00",
  "Payments": [
    {
      "PaymentID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "Date": "2025-11-18",
      "Amount": 250.00,
      "Reference": "REM-2025-11-17",
      "Invoice": {
        "InvoiceID": "...",
        "InvoiceNumber": "INV-001"
      },
      "Status": "AUTHORISED"
    }
    // ... more payments
  ]
}
```

### 2. Get Payments

**Endpoint:** `GET /Payments`  
**Purpose:** Retrieve existing payments  
**Filters:** By InvoiceID, Date, Status

**Query Parameters:**
```
GET /Payments?where=Invoice.InvoiceID=guid"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 3. Get Payment by ID

**Endpoint:** `GET /Payments/{PaymentID}`  
**Purpose:** Retrieve a specific payment

---

## 💰 Single Invoice Payments

### Backend Implementation

#### 1. Service Layer (`backend/xero_integration/services.py`)

```python
def create_payment(
    self,
    invoice_id: str,
    amount: Decimal,
    payment_date: date,
    account_code: str,
    reference: str = None
) -> dict:
    """
    Create a payment for a single invoice in Xero.
    
    Args:
        invoice_id: UUID of the invoice in Xero
        amount: Payment amount
        payment_date: Date of payment
        account_code: Bank account code in Xero
        reference: Optional payment reference
        
    Returns:
        Payment data from Xero
    """
    try:
        # Prepare payment data
        payment = Payment(
            invoice=Invoice(invoice_id=invoice_id),
            account=Account(code=account_code),
            date=payment_date,
            amount=float(amount)
        )
        
        if reference:
            payment.reference = reference
        
        # Create payment in Xero
        payments = Payments(payments=[payment])
        api_response = self.accounting_api.create_payments(
            xero_tenant_id=self.tenant_id,
            payments=payments
        )
        
        return api_response.payments[0]
        
    except AccountingBadRequestException as e:
        logger.error(f"Failed to create payment: {e}")
        raise
```

#### 2. View Layer (`backend/xero_integration/views.py`)

```python
class XeroPaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Xero payments"""
    queryset = XeroPayment.objects.all()
    serializer_class = XeroPaymentSerializer
    
    @action(detail=False, methods=['post'])
    def create_single_payment(self, request):
        """
        Create a payment for a single invoice.
        
        POST /api/xero-payments/create_single_payment/
        {
            "invoice_link_id": "uuid",
            "amount": "250.00",
            "payment_date": "2025-11-18",
            "account_code": "090",
            "reference": "Payment via bank transfer"
        }
        """
        # Get invoice link
        invoice_link = get_object_or_404(
            XeroInvoiceLink,
            id=request.data['invoice_link_id']
        )
        
        # Get Xero connection
        connection = get_object_or_404(
            XeroConnection,
            organization=invoice_link.organization,
            is_active=True
        )
        
        # Create payment in Xero
        xero_service = XeroService()
        payment_data = xero_service.create_payment(
            invoice_id=invoice_link.xero_invoice_id,
            amount=Decimal(request.data['amount']),
            payment_date=request.data['payment_date'],
            account_code=request.data['account_code'],
            reference=request.data.get('reference')
        )
        
        # Store payment in database
        payment = XeroPayment.objects.create(
            organization=invoice_link.organization,
            xero_payment_id=payment_data.payment_id,
            invoice_link=invoice_link,
            amount=payment_data.amount,
            payment_date=payment_data.date,
            reference=payment_data.reference,
            account_code=request.data['account_code']
        )
        
        # Update invoice amounts
        invoice_link.amount_paid += Decimal(str(payment_data.amount))
        invoice_link.amount_due -= Decimal(str(payment_data.amount))
        
        # Update status if fully paid
        if invoice_link.amount_due <= 0:
            invoice_link.status = 'PAID'
        
        invoice_link.save()
        
        return Response({
            'success': True,
            'payment': XeroPaymentSerializer(payment).data,
            'invoice': XeroInvoiceLinkSerializer(invoice_link).data
        })
```

---

## 📦 Batch Payments (Remittance Advice)

### Backend Implementation

#### 1. Service Layer - Batch Payment

```python
def create_batch_payment(
    self,
    payments_data: List[dict],
    batch_reference: str
) -> List[dict]:
    """
    Create a batch payment for multiple invoices in Xero.
    
    Args:
        payments_data: List of payment dictionaries containing:
            - invoice_id: UUID of invoice
            - amount: Payment amount
            - payment_date: Date of payment
            - account_code: Bank account code
        batch_reference: Common reference for all payments
        
    Returns:
        List of created payment data from Xero
    """
    try:
        # Prepare all payments
        payment_objects = []
        for payment_info in payments_data:
            payment = Payment(
                invoice=Invoice(invoice_id=payment_info['invoice_id']),
                account=Account(code=payment_info['account_code']),
                date=payment_info['payment_date'],
                amount=float(payment_info['amount']),
                reference=batch_reference
            )
            payment_objects.append(payment)
        
        # Create all payments in a single API call
        payments = Payments(payments=payment_objects)
        api_response = self.accounting_api.create_payments(
            xero_tenant_id=self.tenant_id,
            payments=payments
        )
        
        logger.info(f"Created batch payment with {len(api_response.payments)} payments")
        
        return api_response.payments
        
    except AccountingBadRequestException as e:
        logger.error(f"Failed to create batch payment: {e}")
        raise
```

#### 2. View Layer - Batch Payment

```python
@action(detail=False, methods=['post'])
def create_batch_payment(self, request):
    """
    Create a batch payment for multiple invoices (Remittance Advice).
    
    POST /api/xero-payments/create_batch_payment/
    {
        "batch_reference": "REM-2025-11-17",
        "payment_date": "2025-11-18",
        "account_code": "090",
        "payments": [
            {
                "invoice_link_id": "uuid-1",
                "amount": "250.00"
            },
            {
                "invoice_link_id": "uuid-2",
                "amount": "300.00"
            },
            {
                "invoice_link_id": "uuid-3",
                "amount": "200.00"
            }
        ]
    }
    """
    batch_reference = request.data['batch_reference']
    payment_date = request.data['payment_date']
    account_code = request.data['account_code']
    
    # Get all invoice links
    invoice_link_ids = [p['invoice_link_id'] for p in request.data['payments']]
    invoice_links = XeroInvoiceLink.objects.filter(id__in=invoice_link_ids)
    
    # Verify all invoices belong to same organization
    organizations = set(il.organization for il in invoice_links)
    if len(organizations) > 1:
        return Response(
            {'error': 'All invoices must belong to the same organization'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    organization = invoice_links.first().organization
    
    # Get Xero connection
    connection = get_object_or_404(
        XeroConnection,
        organization=organization,
        is_active=True
    )
    
    # Prepare payments data for Xero
    payments_data = []
    invoice_lookup = {str(il.id): il for il in invoice_links}
    
    for payment_info in request.data['payments']:
        invoice_link = invoice_lookup[payment_info['invoice_link_id']]
        payments_data.append({
            'invoice_id': invoice_link.xero_invoice_id,
            'amount': Decimal(payment_info['amount']),
            'payment_date': payment_date,
            'account_code': account_code
        })
    
    # Create batch payment in Xero
    xero_service = XeroService()
    try:
        xero_payments = xero_service.create_batch_payment(
            payments_data=payments_data,
            batch_reference=batch_reference
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to create batch payment in Xero: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create batch payment record
    batch_payment = XeroBatchPayment.objects.create(
        organization=organization,
        batch_reference=batch_reference,
        payment_date=payment_date,
        total_amount=sum(p['amount'] for p in payments_data),
        payment_count=len(payments_data),
        account_code=account_code
    )
    
    # Store individual payments and update invoices
    created_payments = []
    for xero_payment, payment_info in zip(xero_payments, request.data['payments']):
        invoice_link = invoice_lookup[payment_info['invoice_link_id']]
        
        # Create payment record
        payment = XeroPayment.objects.create(
            organization=organization,
            xero_payment_id=xero_payment.payment_id,
            invoice_link=invoice_link,
            batch_payment=batch_payment,
            amount=xero_payment.amount,
            payment_date=xero_payment.date,
            reference=batch_reference,
            account_code=account_code
        )
        
        # Update invoice amounts
        payment_amount = Decimal(str(xero_payment.amount))
        invoice_link.amount_paid += payment_amount
        invoice_link.amount_due -= payment_amount
        
        # Update status if fully paid
        if invoice_link.amount_due <= 0:
            invoice_link.status = 'PAID'
        
        invoice_link.save()
        created_payments.append(payment)
    
    return Response({
        'success': True,
        'batch_payment': XeroBatchPaymentSerializer(batch_payment).data,
        'payments': XeroPaymentSerializer(created_payments, many=True).data,
        'updated_invoices': XeroInvoiceLinkSerializer(invoice_links, many=True).data
    })
```

---

## 🗄️ Database Schema

### New Models Required

#### 1. XeroPayment

```python
class XeroPayment(models.Model):
    """Individual payment record synced with Xero"""
    
    # Identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('XeroOrganization', on_delete=models.CASCADE)
    xero_payment_id = models.CharField(max_length=255, unique=True)
    
    # Relationships
    invoice_link = models.ForeignKey(
        'XeroInvoiceLink',
        on_delete=models.CASCADE,
        related_name='payments'
    )
    batch_payment = models.ForeignKey(
        'XeroBatchPayment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments'
    )
    
    # Payment Details
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    reference = models.CharField(max_length=255, blank=True)
    account_code = models.CharField(max_length=50)  # Bank account code in Xero
    
    # Status
    status = models.CharField(
        max_length=50,
        default='AUTHORISED',
        choices=[
            ('AUTHORISED', 'Authorised'),
            ('DELETED', 'Deleted'),
        ]
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    synced_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'xero_payments'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['organization', 'payment_date']),
            models.Index(fields=['invoice_link']),
            models.Index(fields=['batch_payment']),
            models.Index(fields=['xero_payment_id']),
        ]
    
    def __str__(self):
        return f"Payment {self.xero_payment_id}: ${self.amount}"
```

#### 2. XeroBatchPayment

```python
class XeroBatchPayment(models.Model):
    """Batch payment record for remittance advice processing"""
    
    # Identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('XeroOrganization', on_delete=models.CASCADE)
    
    # Batch Details
    batch_reference = models.CharField(max_length=255)  # e.g., "REM-2025-11-17"
    payment_date = models.DateField()
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_count = models.IntegerField()  # Number of invoices paid
    account_code = models.CharField(max_length=50)  # Bank account code
    
    # Optional Remittance Details
    remittance_file = models.FileField(
        upload_to='remittance_advice/',
        null=True,
        blank=True
    )
    notes = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'xero_batch_payments'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['organization', 'payment_date']),
            models.Index(fields=['batch_reference']),
        ]
    
    def __str__(self):
        return f"Batch {self.batch_reference}: {self.payment_count} payments, ${self.total_amount}"
```

### Update Existing Model

#### XeroInvoiceLink

Already has required fields:
```python
amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
amount_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
```

---

## 🎨 UI/UX Design

### 1. Single Invoice Payment

**Location:** Invoice Detail Modal

**Components:**

```tsx
// Add "Record Payment" button to InvoiceDetailModal
<Button
  leftSection={<IconCurrencyDollar size={16} />}
  onClick={() => setPaymentModalOpened(true)}
  disabled={invoice.status === 'PAID' || invoice.amount_due <= 0}
>
  Record Payment
</Button>

// Payment Modal
<Modal
  opened={paymentModalOpened}
  onClose={() => setPaymentModalOpened(false)}
  title="Record Payment"
  size="md"
>
  <Stack gap="md">
    <Group>
      <Text size="sm" fw={500}>Invoice Number:</Text>
      <Text size="sm">{invoice.number}</Text>
    </Group>
    
    <Group>
      <Text size="sm" fw={500}>Amount Due:</Text>
      <Text size="lg" fw={700} c="blue">
        ${parseFloat(invoice.amount_due).toFixed(2)}
      </Text>
    </Group>
    
    <Divider />
    
    <NumberInput
      label="Payment Amount"
      placeholder="0.00"
      prefix="$"
      decimalScale={2}
      required
      max={parseFloat(invoice.amount_due)}
      value={paymentAmount}
      onChange={setPaymentAmount}
    />
    
    <DateInput
      label="Payment Date"
      placeholder="Select date"
      value={paymentDate}
      onChange={setPaymentDate}
      required
    />
    
    <Select
      label="Bank Account"
      placeholder="Select account"
      data={bankAccounts}
      value={selectedAccount}
      onChange={setSelectedAccount}
      required
    />
    
    <TextInput
      label="Payment Reference"
      placeholder="e.g., Bank transfer ref#"
      value={reference}
      onChange={(e) => setReference(e.currentTarget.value)}
    />
    
    <Group justify="flex-end">
      <Button variant="subtle" onClick={() => setPaymentModalOpened(false)}>
        Cancel
      </Button>
      <Button
        onClick={handleCreatePayment}
        loading={creating}
        leftSection={<IconCheck size={16} />}
      >
        Record Payment
      </Button>
    </Group>
  </Stack>
</Modal>
```

### 2. Batch Payment (Remittance Advice)

**Location:** New page `/xero/payments/batch`

**Components:**

```tsx
export default function BatchPaymentPage() {
  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Group justify="space-between">
            <div>
              <Title order={1}>Create Batch Payment</Title>
              <Text size="sm" c="dimmed">
                Process remittance advice for multiple invoices
              </Text>
            </div>
          </Group>
          
          {/* Step 1: Batch Details */}
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Title order={3}>Batch Details</Title>
              
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Remittance Reference"
                    placeholder="e.g., REM-2025-11-17"
                    required
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <DateInput
                    label="Payment Date"
                    required
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="Bank Account"
                    data={bankAccounts}
                    required
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="Company/Payer"
                    data={companies}
                    required
                    onChange={handleCompanySelect}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Paper>
          
          {/* Step 2: Select Invoices */}
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Title order={3}>Select Invoices to Pay</Title>
              
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>
                      <Checkbox
                        checked={allSelected}
                        onChange={handleSelectAll}
                      />
                    </Table.Th>
                    <Table.Th>Invoice Number</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Amount Due</Table.Th>
                    <Table.Th>Payment Amount</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {unpaidInvoices.map((invoice) => (
                    <Table.Tr key={invoice.id}>
                      <Table.Td>
                        <Checkbox
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={() => handleToggleInvoice(invoice.id)}
                        />
                      </Table.Td>
                      <Table.Td>{invoice.number}</Table.Td>
                      <Table.Td>{formatDate(invoice.date)}</Table.Td>
                      <Table.Td>${invoice.amount_due}</Table.Td>
                      <Table.Td>
                        <NumberInput
                          prefix="$"
                          decimalScale={2}
                          max={parseFloat(invoice.amount_due)}
                          value={paymentAmounts[invoice.id]}
                          onChange={(val) => handleAmountChange(invoice.id, val)}
                          disabled={!selectedInvoices.has(invoice.id)}
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Paper>
          
          {/* Step 3: Summary and Submit */}
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Title order={3}>Payment Summary</Title>
              
              <Group justify="space-between">
                <Text size="sm">Number of Invoices:</Text>
                <Text size="sm" fw={700}>{selectedInvoices.size}</Text>
              </Group>
              
              <Group justify="space-between">
                <Text size="lg" fw={500}>Total Payment Amount:</Text>
                <Text size="xl" fw={700} c="blue">
                  ${totalAmount.toFixed(2)}
                </Text>
              </Group>
              
              <Divider />
              
              <Group justify="flex-end">
                <Button variant="subtle" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmitBatchPayment}
                  loading={creating}
                  leftSection={<IconCheck size={20} />}
                  disabled={selectedInvoices.size === 0}
                >
                  Create Batch Payment
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Navigation>
  );
}
```

---

## 🔧 API Integration

### Frontend API Calls

#### 1. Create Single Payment

```typescript
async function createPayment(paymentData: {
  invoice_link_id: string;
  amount: string;
  payment_date: string;
  account_code: string;
  reference?: string;
}) {
  const response = await fetch(
    'https://localhost:8000/api/xero-payments/create_single_payment/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create payment');
  }
  
  return await response.json();
}
```

#### 2. Create Batch Payment

```typescript
async function createBatchPayment(batchData: {
  batch_reference: string;
  payment_date: string;
  account_code: string;
  payments: Array<{
    invoice_link_id: string;
    amount: string;
  }>;
}) {
  const response = await fetch(
    'https://localhost:8000/api/xero-payments/create_batch_payment/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchData),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create batch payment');
  }
  
  return await response.json();
}
```

#### 3. Get Invoice Payments

```typescript
async function getInvoicePayments(invoiceLinkId: string) {
  const response = await fetch(
    `https://localhost:8000/api/xero-payments/?invoice_link=${invoiceLinkId}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch payments');
  }
  
  return await response.json();
}
```

---

## 🧪 Testing Strategy

### Unit Tests

#### Backend Tests (`backend/xero_integration/tests/test_payments.py`)

```python
class PaymentServiceTests(TestCase):
    """Test XeroService payment methods"""
    
    def test_create_single_payment(self):
        """Test creating a single payment"""
        # Setup
        service = XeroService()
        
        # Execute
        payment = service.create_payment(
            invoice_id='test-invoice-id',
            amount=Decimal('250.00'),
            payment_date=date.today(),
            account_code='090',
            reference='Test payment'
        )
        
        # Assert
        self.assertIsNotNone(payment)
        self.assertEqual(payment.amount, 250.00)
    
    def test_create_batch_payment(self):
        """Test creating a batch payment"""
        # Setup
        service = XeroService()
        payments_data = [
            {
                'invoice_id': 'inv-1',
                'amount': Decimal('250.00'),
                'payment_date': date.today(),
                'account_code': '090'
            },
            {
                'invoice_id': 'inv-2',
                'amount': Decimal('300.00'),
                'payment_date': date.today(),
                'account_code': '090'
            }
        ]
        
        # Execute
        payments = service.create_batch_payment(
            payments_data=payments_data,
            batch_reference='TEST-BATCH-001'
        )
        
        # Assert
        self.assertEqual(len(payments), 2)
        self.assertEqual(sum(p.amount for p in payments), 550.00)
    
    def test_payment_updates_invoice_amounts(self):
        """Test that payment updates invoice amounts correctly"""
        # Setup
        invoice = XeroInvoiceLink.objects.create(
            amount_due=250.00,
            amount_paid=0.00,
            status='AUTHORISED'
        )
        
        # Execute
        # ... create payment ...
        
        # Assert
        invoice.refresh_from_db()
        self.assertEqual(invoice.amount_paid, 250.00)
        self.assertEqual(invoice.amount_due, 0.00)
        self.assertEqual(invoice.status, 'PAID')
```

### Integration Tests

1. **Test Single Payment Flow:**
   - Create AUTHORISED invoice
   - Record payment via API
   - Verify invoice updated in Xero
   - Verify invoice synced to Nexus
   - Verify status changed to PAID

2. **Test Batch Payment Flow:**
   - Create 3 AUTHORISED invoices
   - Create batch payment via API
   - Verify all 3 payments created in Xero
   - Verify all invoices updated
   - Verify batch payment record created

3. **Test Partial Payment:**
   - Create invoice for $500
   - Record payment of $250
   - Verify invoice remains AUTHORISED
   - Verify amount_due = $250

### Manual Testing Checklist

- [ ] Create single payment for invoice
- [ ] Verify payment appears in Xero
- [ ] Verify invoice status updates
- [ ] Create batch payment for 3 invoices
- [ ] Verify all payments in Xero with same reference
- [ ] Verify all invoices update correctly
- [ ] Test partial payment
- [ ] Test overpayment handling
- [ ] Test payment to already-paid invoice (should fail)
- [ ] Test payment with invalid account code
- [ ] Test payment with invalid invoice ID

---

## 📋 Implementation Checklist

### Phase 1: Database & Models (Week 1)

- [ ] Create `XeroPayment` model
- [ ] Create `XeroBatchPayment` model
- [ ] Create migrations
- [ ] Add admin interfaces
- [ ] Create serializers

### Phase 2: Backend API (Week 1-2)

- [ ] Implement `create_payment()` in XeroService
- [ ] Implement `create_batch_payment()` in XeroService
- [ ] Create `XeroPaymentViewSet`
- [ ] Add `create_single_payment` action
- [ ] Add `create_batch_payment` action
- [ ] Add URL routing
- [ ] Write unit tests
- [ ] Write integration tests

### Phase 3: Frontend - Single Payment (Week 2)

- [ ] Create `PaymentModal` component
- [ ] Add "Record Payment" button to `InvoiceDetailModal`
- [ ] Implement payment form
- [ ] Add bank account selection
- [ ] Handle form submission
- [ ] Update invoice display after payment
- [ ] Add success/error notifications

### Phase 4: Frontend - Batch Payment (Week 3)

- [ ] Create `/xero/payments/batch` page
- [ ] Add company/payer selection
- [ ] Load unpaid invoices for selected company
- [ ] Implement invoice selection (checkboxes)
- [ ] Add payment amount inputs
- [ ] Calculate total payment amount
- [ ] Implement batch payment submission
- [ ] Add navigation link

### Phase 5: Payment History (Week 3)

- [ ] Add "Payment History" section to invoice detail
- [ ] Display list of payments for invoice
- [ ] Show payment date, amount, reference
- [ ] Add payment filtering/sorting
- [ ] Create batch payment detail view

### Phase 6: Testing & Documentation (Week 4)

- [ ] Run all unit tests
- [ ] Run integration tests
- [ ] Perform manual testing
- [ ] Test with real Xero account
- [ ] Update documentation
- [ ] Create user guide
- [ ] Add troubleshooting guide

---

## 🚨 Edge Cases & Error Handling

### Payment Validation

1. **Amount Validation:**
   - Payment amount must be > 0
   - Payment amount should not exceed amount_due (warn if overpayment)
   - Allow overpayments but log as separate transaction

2. **Invoice Status:**
   - Can only pay AUTHORISED or SUBMITTED invoices
   - Cannot pay DRAFT invoices (must authorize first)
   - Cannot pay VOIDED or DELETED invoices

3. **Date Validation:**
   - Payment date cannot be in future
   - Payment date should not be before invoice date (warn if so)

4. **Bank Account:**
   - Must be valid account code in Xero
   - Account must be active

### Batch Payment Validation

1. **Invoice Selection:**
   - At least 1 invoice must be selected
   - All invoices must belong to same organization
   - All invoices must have same currency

2. **Amount Allocation:**
   - Sum of payments should match remittance total
   - Each payment amount should not exceed invoice amount_due

3. **Reference:**
   - Batch reference must be unique (or warn if duplicate)

### Error Messages

```typescript
// Payment amount exceeds due amount
"Payment amount ($300.00) exceeds amount due ($250.00). 
This will create an overpayment of $50.00."

// Invoice not payable
"Invoice INV-001 cannot be paid. Status: DRAFT. 
Please authorize the invoice first."

// Bank account invalid
"Bank account code '999' not found in Xero. 
Please select a valid bank account."

// Batch payment currency mismatch
"All invoices in a batch payment must use the same currency. 
Found: AUD, USD."
```

---

## 📊 Reporting & Analytics

### Payment Reports

1. **Payment Summary Report:**
   - Total payments by date range
   - Payments by bank account
   - Payments by contact (patient/company)

2. **Batch Payment Report:**
   - List of all batch payments
   - Remittance references
   - Payment counts and totals

3. **Outstanding Invoices Report:**
   - Invoices with partial payments
   - Overdue unpaid invoices
   - Expected payment dates

---

## 🔗 Related Documentation

- [XERO_INVOICE_WORKFLOW.md](XERO_INVOICE_WORKFLOW.md) - Invoice creation and management
- [XERO_ACTION_BUTTONS_IMPLEMENTATION.md](../XERO_ACTION_BUTTONS_IMPLEMENTATION.md) - Invoice actions
- [docs/architecture/DATABASE_SCHEMA.md](../docs/architecture/DATABASE_SCHEMA.md) - Database design
- [docs/integrations/XERO.md](../docs/integrations/XERO.md) - Xero integration overview

---

## 📝 Notes

### Xero API Considerations

1. **Rate Limits:**
   - Batch payments count as 1 API call for all payments
   - More efficient than individual payment calls
   - Maximum 5,000 API calls per day

2. **Payment Processing:**
   - Payments are immediate in Xero
   - No async processing required
   - Status updates sync back to Nexus

3. **Bank Reconciliation:**
   - Payments created via API still need bank reconciliation in Xero
   - Mark as reconciled when matched to bank statement
   - Consider future webhook integration for reconciliation status

### Future Enhancements

1. **Auto-Reconciliation:**
   - Parse bank statement files
   - Match transactions to payments
   - Auto-reconcile in Xero

2. **Payment Plans:**
   - Set up recurring payment schedules
   - Automatic payment reminders
   - Track payment plan progress

3. **Payment Portal:**
   - Online payment portal for patients/companies
   - Credit card integration (Stripe/PayPal)
   - Automatic payment recording

4. **Remittance Advice Parsing:**
   - Upload remittance advice PDF/CSV
   - Auto-extract invoice numbers and amounts
   - Pre-fill batch payment form

---

## ✅ Complete Implementation Checklist

### 📦 Phase 1: Database & Models

#### Backend Models
- [ ] **Create `XeroPayment` model** (`backend/xero_integration/models.py`)
  - [ ] Add all fields (id, organization, xero_payment_id, invoice_link, batch_payment, amount, payment_date, reference, account_code, status)
  - [ ] Add Meta class with db_table, ordering, and indexes
  - [ ] Add `__str__` method
  - [ ] Test model creation in Django shell

- [ ] **Create `XeroBatchPayment` model** (`backend/xero_integration/models.py`)
  - [ ] Add all fields (id, organization, batch_reference, payment_date, total_amount, payment_count, account_code, remittance_file, notes, created_by)
  - [ ] Add Meta class with db_table, ordering, and indexes
  - [ ] Add `__str__` method
  - [ ] Test model creation in Django shell

#### Migrations
- [ ] **Create migration files**
  - [ ] Run `python manage.py makemigrations xero_integration`
  - [ ] Review migration file
  - [ ] Run `python manage.py migrate`
  - [ ] Verify tables created in database

#### Admin
- [ ] **Register `XeroPayment` in admin** (`backend/xero_integration/admin.py`)
  - [ ] Add list_display fields
  - [ ] Add list_filter options
  - [ ] Add search_fields
  - [ ] Add readonly_fields
  - [ ] Test in Django admin

- [ ] **Register `XeroBatchPayment` in admin** (`backend/xero_integration/admin.py`)
  - [ ] Add list_display fields
  - [ ] Add list_filter options
  - [ ] Add search_fields
  - [ ] Add readonly_fields
  - [ ] Add inline for related payments
  - [ ] Test in Django admin

#### Serializers
- [ ] **Create `XeroPaymentSerializer`** (`backend/xero_integration/serializers.py`)
  - [ ] Add all model fields
  - [ ] Add nested invoice_link data
  - [ ] Add nested batch_payment data (if exists)
  - [ ] Test serialization

- [ ] **Create `XeroBatchPaymentSerializer`** (`backend/xero_integration/serializers.py`)
  - [ ] Add all model fields
  - [ ] Add nested payments list
  - [ ] Add created_by user data
  - [ ] Test serialization

---

### 🔧 Phase 2: Backend API - XeroService

#### Payment Methods in XeroService
- [ ] **Implement `create_payment()` method** (`backend/xero_integration/services.py`)
  - [ ] Accept parameters (invoice_id, amount, payment_date, account_code, reference)
  - [ ] Create Payment object from xero-python SDK
  - [ ] Call `accounting_api.create_payments()`
  - [ ] Handle AccountingBadRequestException
  - [ ] Add logging
  - [ ] Test with real Xero account

- [ ] **Implement `create_batch_payment()` method** (`backend/xero_integration/services.py`)
  - [ ] Accept list of payment data and batch_reference
  - [ ] Create multiple Payment objects
  - [ ] Call `accounting_api.create_payments()` once
  - [ ] Handle exceptions
  - [ ] Add logging
  - [ ] Test with real Xero account

- [ ] **Implement `get_payment()` method** (`backend/xero_integration/services.py`)
  - [ ] Accept payment_id parameter
  - [ ] Call `accounting_api.get_payment()`
  - [ ] Return payment data
  - [ ] Handle exceptions

- [ ] **Implement `get_payments_for_invoice()` method** (`backend/xero_integration/services.py`)
  - [ ] Accept invoice_id parameter
  - [ ] Call `accounting_api.get_payments()` with filter
  - [ ] Return list of payments
  - [ ] Handle exceptions

---

### 🌐 Phase 3: Backend API - Views

#### XeroPaymentViewSet
- [ ] **Create `XeroPaymentViewSet`** (`backend/xero_integration/views.py`)
  - [ ] Inherit from `viewsets.ModelViewSet`
  - [ ] Set queryset and serializer_class
  - [ ] Add authentication and permissions

- [ ] **Implement `create_single_payment` action**
  - [ ] Add `@action(detail=False, methods=['post'])` decorator
  - [ ] Validate request data (invoice_link_id, amount, payment_date, account_code, reference)
  - [ ] Get XeroInvoiceLink object
  - [ ] Get active XeroConnection
  - [ ] Call `XeroService.create_payment()`
  - [ ] Create XeroPayment record in database
  - [ ] Update invoice amounts (amount_paid, amount_due)
  - [ ] Update invoice status if fully paid
  - [ ] Return success response with payment and invoice data
  - [ ] Add error handling
  - [ ] Add logging

- [ ] **Implement `create_batch_payment` action**
  - [ ] Add `@action(detail=False, methods=['post'])` decorator
  - [ ] Validate request data (batch_reference, payment_date, account_code, payments array)
  - [ ] Get all XeroInvoiceLink objects
  - [ ] Verify all invoices belong to same organization
  - [ ] Get active XeroConnection
  - [ ] Call `XeroService.create_batch_payment()`
  - [ ] Create XeroBatchPayment record
  - [ ] Create XeroPayment records for each invoice
  - [ ] Update all invoice amounts and statuses
  - [ ] Return success response with batch_payment, payments, and invoices
  - [ ] Add error handling
  - [ ] Add logging

- [ ] **Implement `list` action (get payments)**
  - [ ] Support filtering by invoice_link
  - [ ] Support filtering by batch_payment
  - [ ] Support filtering by date range
  - [ ] Add pagination
  - [ ] Return serialized data

#### URL Routing
- [ ] **Add URL patterns** (`backend/xero_integration/urls.py`)
  - [ ] Register XeroPaymentViewSet with router
  - [ ] Verify routes: `/api/xero-payments/`, `/api/xero-payments/create_single_payment/`, `/api/xero-payments/create_batch_payment/`
  - [ ] Test endpoints with curl or Postman

---

### 🎨 Phase 4: Frontend - Single Invoice Payment

#### PaymentModal Component
- [ ] **Create `PaymentModal.tsx`** (`frontend/app/components/xero/PaymentModal.tsx`)
  - [ ] Accept props (opened, onClose, invoice, onSuccess)
  - [ ] Add state for form fields (paymentAmount, paymentDate, selectedAccount, reference, creating)
  - [ ] Fetch bank accounts from Xero API
  - [ ] Render Modal with form fields
  - [ ] Add NumberInput for payment amount (max = invoice.amount_due)
  - [ ] Add DateInput for payment date
  - [ ] Add Select for bank account
  - [ ] Add TextInput for reference (optional)
  - [ ] Implement `handleCreatePayment` function
  - [ ] Call API endpoint `/api/xero-payments/create_single_payment/`
  - [ ] Show success notification
  - [ ] Call onSuccess callback
  - [ ] Add error handling
  - [ ] Add form validation

#### Update InvoiceDetailModal
- [ ] **Add "Record Payment" button** (`frontend/app/components/xero/InvoiceDetailModal.tsx`)
  - [ ] Import PaymentModal component
  - [ ] Add state for `paymentModalOpened`
  - [ ] Add button with IconCurrencyDollar icon
  - [ ] Disable button if invoice.status === 'PAID' or invoice.amount_due <= 0
  - [ ] Open PaymentModal on click
  - [ ] Refresh invoice data after payment success

#### Payment History Section
- [ ] **Add Payment History to InvoiceDetailModal**
  - [ ] Fetch payments for invoice on load
  - [ ] Display list of payments (date, amount, reference)
  - [ ] Show total amount paid
  - [ ] Format dates with formatDateOnlyAU
  - [ ] Format amounts with currency

---

### 📦 Phase 5: Frontend - Batch Payment Page

#### Create Batch Payment Page
- [ ] **Create `page.tsx`** (`frontend/app/xero/payments/batch/page.tsx`)
  - [ ] Set up page structure with Navigation wrapper
  - [ ] Add page title and description

#### Step 1: Batch Details Section
- [ ] **Implement batch details form**
  - [ ] Add state for batchReference, paymentDate, selectedAccount, selectedCompany
  - [ ] Add TextInput for remittance reference
  - [ ] Add DateInput for payment date
  - [ ] Add Select for bank account (fetch from Xero)
  - [ ] Add Select for company/payer (fetch from companies API)
  - [ ] Fetch unpaid invoices when company selected

#### Step 2: Invoice Selection Section
- [ ] **Implement invoice selection table**
  - [ ] Add state for selectedInvoices (Set), paymentAmounts (object)
  - [ ] Display table with checkboxes
  - [ ] Show invoice number, date, amount due
  - [ ] Add NumberInput for payment amount per invoice
  - [ ] Implement handleToggleInvoice (add/remove from selection)
  - [ ] Implement handleSelectAll checkbox
  - [ ] Implement handleAmountChange (update payment amounts)
  - [ ] Disable amount input if invoice not selected
  - [ ] Pre-fill payment amount with amount_due

#### Step 3: Summary Section
- [ ] **Implement payment summary**
  - [ ] Calculate total selected invoices count
  - [ ] Calculate total payment amount
  - [ ] Display summary stats
  - [ ] Add Submit button
  - [ ] Disable if no invoices selected

#### Batch Payment Submission
- [ ] **Implement `handleSubmitBatchPayment` function**
  - [ ] Validate all fields
  - [ ] Validate that amounts don't exceed invoice amounts_due
  - [ ] Build request payload
  - [ ] Call API endpoint `/api/xero-payments/create_batch_payment/`
  - [ ] Show success notification with summary
  - [ ] Navigate to invoices page or show success page
  - [ ] Add error handling
  - [ ] Add confirmation dialog before submit

#### Navigation Link
- [ ] **Add link to Navigation** (`frontend/app/components/Navigation.tsx`)
  - [ ] Add "Batch Payments" menu item under Accounts section
  - [ ] Add icon (IconReceipt or IconCashBanknote)
  - [ ] Link to `/xero/payments/batch`

---

### 🧪 Phase 6: Testing

#### Backend Unit Tests
- [ ] **Create `test_payments.py`** (`backend/xero_integration/tests/test_payments.py`)
  - [ ] Test `create_payment()` method
  - [ ] Test `create_batch_payment()` method
  - [ ] Test `get_payment()` method
  - [ ] Test `get_payments_for_invoice()` method
  - [ ] Test payment updates invoice amounts
  - [ ] Test payment updates invoice status
  - [ ] Test batch payment creates multiple payments
  - [ ] Test error handling
  - [ ] Run tests: `python manage.py test xero_integration.tests.test_payments`

#### Backend Integration Tests
- [ ] **Test API endpoints**
  - [ ] Test create_single_payment endpoint with valid data
  - [ ] Test create_single_payment endpoint with invalid invoice_id
  - [ ] Test create_single_payment endpoint with invalid amount
  - [ ] Test create_batch_payment endpoint with valid data
  - [ ] Test create_batch_payment endpoint with mixed organizations (should fail)
  - [ ] Test list payments endpoint
  - [ ] Test filtering payments by invoice

#### Frontend Testing
- [ ] **Test PaymentModal**
  - [ ] Open modal from invoice detail
  - [ ] Fill in payment form
  - [ ] Submit payment
  - [ ] Verify success notification
  - [ ] Verify invoice updates
  - [ ] Test validation errors

- [ ] **Test Batch Payment Page**
  - [ ] Navigate to page
  - [ ] Select company
  - [ ] Select invoices
  - [ ] Enter payment amounts
  - [ ] Submit batch payment
  - [ ] Verify success notification
  - [ ] Verify all invoices updated

#### Manual Testing with Real Xero Account
- [ ] **Single Invoice Payment**
  - [ ] Create AUTHORISED invoice in Xero
  - [ ] Record payment via Nexus
  - [ ] Verify payment appears in Xero
  - [ ] Verify invoice status updates to PAID in Xero
  - [ ] Verify invoice syncs back to Nexus as PAID

- [ ] **Batch Payment**
  - [ ] Create 3 AUTHORISED invoices in Xero for same company
  - [ ] Create batch payment via Nexus
  - [ ] Verify 3 payments appear in Xero with same reference
  - [ ] Verify all invoices update to PAID in Xero
  - [ ] Verify all invoices sync back to Nexus

- [ ] **Partial Payment**
  - [ ] Create invoice for $500
  - [ ] Record payment of $250
  - [ ] Verify invoice stays AUTHORISED
  - [ ] Verify amount_due = $250
  - [ ] Record second payment of $250
  - [ ] Verify invoice becomes PAID

- [ ] **Edge Cases**
  - [ ] Test payment to already-paid invoice (should fail)
  - [ ] Test payment to DRAFT invoice (should fail)
  - [ ] Test overpayment (amount > amount_due)
  - [ ] Test payment with invalid bank account code
  - [ ] Test payment with future date
  - [ ] Test batch payment with 10+ invoices

---

### 📊 Phase 7: Reporting & Analytics (Optional)

- [ ] **Payment Summary Report**
  - [ ] Create report page
  - [ ] Add date range filter
  - [ ] Add bank account filter
  - [ ] Display total payments
  - [ ] Display payments by contact
  - [ ] Add export to CSV

- [ ] **Batch Payment Report**
  - [ ] Create report page
  - [ ] List all batch payments
  - [ ] Show remittance references
  - [ ] Show payment counts and totals
  - [ ] Add drill-down to individual payments

- [ ] **Outstanding Invoices Report**
  - [ ] List invoices with partial payments
  - [ ] List overdue unpaid invoices
  - [ ] Show aging buckets (30/60/90 days)
  - [ ] Add export functionality

---

### 📚 Phase 8: Documentation

- [ ] **Update Database Schema Documentation**
  - [ ] Add XeroPayment table to `docs/architecture/DATABASE_SCHEMA.md`
  - [ ] Add XeroBatchPayment table to documentation
  - [ ] Document relationships

- [ ] **Create User Guide**
  - [ ] Write "How to Record a Payment" guide
  - [ ] Write "How to Process Remittance Advice" guide
  - [ ] Add screenshots
  - [ ] Create video tutorial (optional)

- [ ] **Update API Documentation**
  - [ ] Document payment endpoints
  - [ ] Add request/response examples
  - [ ] Document error codes

- [ ] **Update Troubleshooting Guide**
  - [ ] Add common payment errors
  - [ ] Add solutions for Xero API errors
  - [ ] Add bank account code issues

---

### 🚀 Phase 9: Deployment Preparation

- [ ] **Code Review**
  - [ ] Review all new code
  - [ ] Check for security issues
  - [ ] Verify error handling
  - [ ] Check logging

- [ ] **Performance Testing**
  - [ ] Test with large batch payments (50+ invoices)
  - [ ] Check API response times
  - [ ] Monitor database queries

- [ ] **Security Review**
  - [ ] Verify authentication on all endpoints
  - [ ] Check permission requirements
  - [ ] Validate all user inputs
  - [ ] Check for SQL injection vulnerabilities

- [ ] **Git & Version Control**
  - [ ] Commit all changes with clear messages
  - [ ] Push to XeroV2 branch
  - [ ] Create pull request
  - [ ] Get code review approval

- [ ] **Deployment**
  - [ ] Run migrations on staging
  - [ ] Test on staging environment
  - [ ] Deploy to production
  - [ ] Monitor for errors
  - [ ] Verify payments work in production

---

### 🔍 Post-Deployment Monitoring

- [ ] **Monitor for 48 Hours**
  - [ ] Check error logs
  - [ ] Monitor payment creation
  - [ ] Check Xero sync status
  - [ ] Monitor API performance

- [ ] **User Feedback**
  - [ ] Collect user feedback
  - [ ] Document issues
  - [ ] Prioritize fixes
  - [ ] Plan improvements

---

## 🎯 Quick Start Checklist (Minimum Viable Product)

If you want to implement the most critical features first, follow this abbreviated checklist:

### MVP Phase 1: Single Payment Only
- [ ] Create XeroPayment model
- [ ] Create migration
- [ ] Implement create_payment() in XeroService
- [ ] Create create_single_payment API endpoint
- [ ] Create PaymentModal component
- [ ] Add "Record Payment" button to invoice detail
- [ ] Test with real Xero account

### MVP Phase 2: Batch Payment
- [ ] Create XeroBatchPayment model
- [ ] Create migration
- [ ] Implement create_batch_payment() in XeroService
- [ ] Create create_batch_payment API endpoint
- [ ] Create batch payment page
- [ ] Test with real Xero account

---

**Status:** 📋 Ready for Implementation  
**Next Steps:** Begin Phase 1 - Database & Models


