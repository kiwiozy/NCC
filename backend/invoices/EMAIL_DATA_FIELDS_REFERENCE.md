# Email Data Fields Reference

## Required Fields by Email Type

### InvoiceEmailData
**Required (no defaults):**
- `contact: Contact` (dict with 'name', 'email')
- `invoice_number: str`
- `invoice_date: date`
- `due_date: date`
- `subtotal: Decimal`
- `tax_total: Decimal`
- `total: Decimal`

**Optional (with defaults):**
- `amount_paid: Decimal = 0.00`
- `amount_due: Decimal = 0.00`
- `line_items: List[LineItem] = []`
- `payment_methods: List[PaymentMethod] = []`
- `reference: Optional[str] = None`
- `notes: Optional[str] = None`
- `status: str = "DRAFT"`
- `clinic_name: str = "WalkEasy Nexus"`

---

### ReceiptEmailData
**Required (no defaults):**
- `contact: Contact` (dict with 'name', 'email')
- `invoice_number: str`
- `amount_paid: Decimal`

**Optional (with defaults):**
- `payment_method: str = "Bank Transfer"`
- `receipt_number: Optional[str] = None`
- `invoice_date: Optional[date] = None`
- `payment_date: Optional[date] = None`
- `payment_reference: Optional[str] = None`
- `line_items: List[LineItem] = []`
- `subtotal: Decimal = 0.00`
- `tax_total: Decimal = 0.00`
- `total: Decimal = 0.00`
- `clinic_name: str = "WalkEasy Nexus"`

**❌ NOT ALLOWED:**
- `due_date` (invoices have this, receipts don't)
- `amount_due` (invoices have this, receipts don't)
- `payment_methods` (invoices have this, receipts don't)
- `status` (invoices have this, receipts don't)

---

### QuoteEmailData
**Required (no defaults):**
- `contact: Contact` (dict with 'name', 'email')
- `quote_number: str`
- `quote_date: date`
- `expiry_date: date`
- `subtotal: Decimal`
- `tax_total: Decimal`
- `total: Decimal`

**Optional (with defaults):**
- `line_items: List[LineItem] = []`
- `reference: Optional[str] = None`
- `notes: Optional[str] = None`
- `status: str = "DRAFT"`
- `valid_days: int = 30`
- `clinic_name: str = "WalkEasy Nexus"`

**❌ NOT ALLOWED:**
- `invoice_number` (use `quote_number` instead)
- `invoice_date` (use `quote_date` instead)
- `due_date` (use `expiry_date` instead)

---

### ATReportEmailData
**Required (no defaults):**
- `contact: Contact` (dict with 'name', 'email')
- `participant_name: str`

**Optional (with defaults):**
- `assessor_name: str = "WalkEasy Nexus"`
- `report_type: str = "AT Assessment"`
- `ndis_number: Optional[str] = None`
- `assessment_date: Optional[date] = None`
- `report_date: Optional[date] = None`
- `custom_message: Optional[str] = None`
- `clinic_name: str = "WalkEasy Nexus"`

---

### LetterEmailData
**Required (no defaults):**
- `contact: Contact` (dict with 'name', 'email')
- `subject: str`

**Optional (with defaults):**
- `letter_type: str = "general"`
- `body_paragraphs: List[str] = []`
- `recipient_name: Optional[str] = None`
- `recipient_title: Optional[str] = None`
- `sender_name: Optional[str] = None`
- `sender_title: Optional[str] = None`
- `sender_qualifications: Optional[str] = None`
- `patient_name: Optional[str] = None`
- `patient_dob: Optional[date] = None`
- `clinic_name: str = "WalkEasy Nexus"`

---

## Contact Object

```python
contact: {
    'name': str,       # Required
    'email': str,      # Optional
    'phone': str,      # Optional
    'address': str     # Optional
}
```

## LineItem Object

```python
line_item: {
    'description': str,
    'quantity': Decimal,
    'unit_amount': Decimal,
    'tax_amount': Decimal,
    'total': Decimal
}
```

## PaymentMethod Object

```python
payment_method: {
    'method_type': str,          # 'bank', 'card', 'cash'
    'account_name': str,         # Optional
    'bsb': str,                  # Optional
    'account_number': str,       # Optional
    'reference': str             # Optional
}
```

---

## Common Mistakes

### ❌ WRONG: Passing invoice fields to receipt
```python
# This will fail!
data = {
    'contact': {...},
    'invoice_number': 'INV-001',
    'amount_paid': Decimal('100'),
    'due_date': date(...),          # ❌ Receipt doesn't have this!
    'amount_due': Decimal('0'),     # ❌ Receipt doesn't have this!
}
```

### ✅ CORRECT: Receipt-specific fields only
```python
data = {
    'contact': {...},
    'invoice_number': 'INV-001',
    'amount_paid': Decimal('100'),
    'payment_method': 'Bank Transfer',
    'payment_date': date(...),
    'receipt_number': 'REC-001',
    'line_items': [...],
}
```

---

## XeroInvoiceLink → Email Data Mapping

### For Invoice:
```python
data = {
    'contact': {'name': invoice.patient.get_full_name()},  # ✅ get_full_name() NOT full_name
    'invoice_number': invoice.xero_invoice_number,
    'invoice_date': invoice.invoice_date,
    'due_date': invoice.due_date,
    'subtotal': invoice.subtotal,
    'tax_total': invoice.total_tax,                        # ✅ total_tax NOT tax_total
    'total': invoice.total,
    'amount_paid': invoice.amount_paid,
    'amount_due': invoice.amount_due,
    'status': invoice.status,
}
```

### For Receipt:
```python
data = {
    'contact': {'name': invoice.patient.get_full_name()},
    'invoice_number': invoice.xero_invoice_number,
    'amount_paid': invoice.amount_paid or invoice.total,
    'payment_method': 'Bank Transfer',
    'receipt_number': invoice.xero_invoice_number,
    'invoice_date': invoice.invoice_date,
    'payment_date': datetime.now().date(),
    'subtotal': invoice.subtotal,
    'tax_total': invoice.total_tax,
    'total': invoice.total,
}
```

---

## Validation Errors

### Error: "unexpected keyword argument 'due_date'"
**Cause:** Passing invoice fields to receipt  
**Fix:** Remove `due_date`, `amount_due`, `payment_methods`, `status` from receipt data

### Error: "'Patient' object has no attribute 'full_name'"
**Cause:** Using `patient.full_name` instead of method  
**Fix:** Use `patient.get_full_name()` (it's a method, not a property)

### Error: "'XeroInvoiceLink' object has no attribute 'line_items'"
**Cause:** `XeroInvoiceLink` doesn't store line items  
**Fix:** Check with `hasattr()` and create fallback line item

### Error: "Contact name is required"
**Cause:** Missing or empty `contact.name`  
**Fix:** Always provide contact dict with name: `{'name': 'Customer Name'}`

