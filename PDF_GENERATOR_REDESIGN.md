# PDF Generator Redesign Plan

## Current Problem

The spacing in the financial summary is **inconsistent** between invoices with payments and invoices without payments, despite using supposedly identical code.

### Current Behavior:
- **Invoice WITHOUT payments (ORC1062):** ✅ Tight, consistent row spacing
- **Invoice WITH payments (ORC1060):** ❌ Wider row spacing (still has gaps)

### What We've Tried:
1. ❌ Removed spacer rows from data structure
2. ❌ Matched padding (TOPPADDING/BOTTOMPADDING = 4)
3. ❌ Removed LINEABOVE from certain rows
4. ❌ Matched payment table padding to totals table padding
5. ❌ Removed wrapper table padding
6. ❌ Complete rewrite with vertical stacking
7. ❌ Various wrapper table approaches for alignment

**Result:** Nothing has worked. The spacing is STILL different.

---

## Root Cause Analysis

### Hypothesis 1: Different Code Paths
**Possibility:** The two methods (`_build_payments_and_totals_section` vs `_build_totals_section`) might have subtle differences we're not seeing.

**Check:**
- Line-by-line comparison of the totals table creation
- Verify both use EXACT same TableStyle settings
- Verify both use EXACT same data structure

### Hypothesis 2: ReportLab Rendering Bug
**Possibility:** ReportLab might render stacked elements differently than standalone elements.

**Evidence:** 
- Payment table appears ABOVE the totals table
- Even though they're separate elements, ReportLab might be affecting the totals table rendering

### Hypothesis 3: Column Width Issue
**Possibility:** The totals table in payment layout has different column widths.

**Current:**
- Payment layout: `colWidths=[12*cm, 5*cm]` (17cm total)
- Regular layout: `colWidths=[12*cm, 5*cm]` (17cm total)

Should be the same, but maybe the available width is different?

### Hypothesis 4: Hidden Style Inheritance
**Possibility:** Some style from the payment table is bleeding into the totals table.

---

## New Approach: Clean Slate PDF Generator

Instead of trying to fix the existing code, let's create a **brand new PDF generator** from scratch with:

### Design Principles:
1. **Single Table for Everything** - No nested tables, no wrappers
2. **Unified Layout** - One method handles both payment and non-payment cases
3. **Explicit Styling** - Every row explicitly styled, no inheritance
4. **Consistent Structure** - Same code path for all invoices

---

## Proposed New Structure

### New File: `document_pdf_generator_v2.py`

```python
class UnifiedInvoicePDFGenerator:
    """
    Redesigned PDF generator with consistent layout
    
    Key Differences:
    - Single unified method for financial summary (no separate methods)
    - Optional payment section parameter
    - All tables use same base styling
    - Explicit row heights to prevent variation
    """
```

### Layout Options:

#### Option A: Single Mega-Table
**Concept:** Everything in ONE table (line items + payments + totals)
- **Pro:** Guaranteed consistent styling
- **Pro:** No wrapper issues
- **Con:** Complex to build
- **Con:** Harder to maintain

#### Option B: Modular with Strict Contracts
**Concept:** Separate tables but with strict style contracts
- **Pro:** Easier to maintain
- **Pro:** Modular design
- **Con:** Need to ensure no style bleeding

#### Option C: Side-by-Side Done Right
**Concept:** Keep side-by-side layout for payments + totals
- **Pro:** Better use of space (matches original vision)
- **Pro:** Payment history visible alongside totals
- **Con:** ReportLab side-by-side is complex
- **Strategy:** Use flowable groups or KeepTogether

---

## Recommended Approach: **Option C - Side-by-Side Done Right**

### Why?
Looking at your original images, the side-by-side layout (payment table on left, totals on right) is actually a **better design**. We just need to implement it correctly.

### Implementation Strategy:

#### 1. Create Fixed-Height Rows
```python
# Explicitly set row heights to prevent variation
row_height = 0.6*cm  # Fixed height for all rows

# Payment table
payment_table = Table(payment_data, colWidths=[2.5*cm, 5*cm, 3*cm], rowHeights=[row_height] * len(payment_data))

# Totals table
totals_table = Table(totals_data, colWidths=[4*cm, 2.5*cm], rowHeights=[row_height] * len(totals_data))
```

#### 2. Use Explicit Cell Styling (Not Table Styling)
Instead of applying TOPPADDING/BOTTOMPADDING to the entire table, style each cell individually:

```python
# Bad (what we've been doing)
('TOPPADDING', (0, 0), (-1, -1), 4)

# Good (explicit per-cell)
for row_idx in range(len(totals_data)):
    style_list.append(('TOPPADDING', (0, row_idx), (-1, row_idx), 4))
    style_list.append(('BOTTOMPADDING', (0, row_idx), (-1, row_idx), 4))
```

#### 3. Side-by-Side with Proper Alignment
```python
# Create wrapper with VALIGN=TOP and explicit heights
combined = Table(
    [[payment_table, totals_table]],
    colWidths=[10.5*cm, 6.5*cm],
    rowHeights=[None]  # Let it auto-size, but tables inside have fixed heights
)
combined.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('ALIGN', (0, 0), (0, 0), 'LEFT'),   # Payment table left
    ('ALIGN', (1, 0), (1, 0), 'RIGHT'),  # Totals table right
    # NO PADDING on wrapper
]))
```

---

## Testing Plan

### Test Cases:
1. ✅ Invoice without payments (baseline)
2. ✅ Invoice with 1 payment
3. ✅ Invoice with multiple payments
4. ✅ Invoice with discount + payments
5. ✅ Quote (no payments ever)

### Success Criteria:
- ✅ All financial summaries have IDENTICAL row spacing
- ✅ Payment table and totals table align properly
- ✅ No visual artifacts or spacing issues
- ✅ PDF looks professional and consistent

---

## Next Steps

1. **Create `document_pdf_generator_v2.py`**
2. **Implement fixed-height row approach**
3. **Test with ORC1060 (with payments)**
4. **Compare with ORC1062 (without payments)**
5. **If successful, replace old generator**

---

## Questions to Answer

1. **Should we use fixed row heights?** (My recommendation: YES)
2. **Should we keep side-by-side layout?** (My recommendation: YES, but done correctly)
3. **Should we use a single mega-table?** (My recommendation: NO, too complex)
4. **Should we create a new file or modify existing?** (My recommendation: NEW file, keep old as reference)

---

---

## A4 Page Design Specifications

### Page Dimensions
- **Page Size:** A4 (210mm × 297mm or 21cm × 29.7cm or 8.27" × 11.69")
- **Usable Width:** 17cm (170mm) after 2cm margins on each side
- **Usable Height:** ~25cm (250mm) after margins and header/footer

### Unit Standards for Design
**Primary Unit: Centimeters (cm)** ✅
- ReportLab uses: `from reportlab.lib.units import cm, mm`
- All measurements in this document use **cm** for consistency
- Example: `width = 17*cm` (not 170*mm or 6.7*inch)

**Why cm?**
- ✅ Natural for A4 (21cm × 29.7cm)
- ✅ Easy mental math (17cm = page width - 4cm margins)
- ✅ Readable code: `12*cm` vs `120*mm` vs `4.72*inch`
- ✅ Industry standard for print design in metric countries

**Conversion Reference:**
```python
1 cm = 10 mm
1 inch = 2.54 cm
17 cm = 170 mm = 6.69 inches
```

### Current Margins
```python
from reportlab.lib.units import cm

pagesize=A4,
rightMargin=2*cm,   # 2cm = 20mm
leftMargin=2*cm,    # 2cm = 20mm
topMargin=2*cm,     # 2cm = 20mm
bottomMargin=2*cm   # 2cm = 20mm (adjusted dynamically for footer)
```

### Available Space
- **Total width:** 21cm (A4 width)
- **Content width:** 17cm (21cm - 2cm - 2cm)
- **Full-width table:** 17cm
- **Two-column layout:** 
  - Left column: ~10.5cm
  - Right column: ~6.5cm
  - Total: 17cm ✓

---

## Layout Options Visualized (A4)

### Option A: Side-by-Side Layout (Current Broken Design)

```
┌─────────────────────────────────────────────────────────┐
│ [HEADER - Logo, Company Info, Invoice Details]         │
│                                                         │
│ [PATIENT/COMPANY DETAILS]                              │
│                                                         │
│ [LINE ITEMS TABLE - Full Width 17cm]                   │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Description | Qty | Price | Discount | GST | $  │   │
│ │ Item 1      |  1  | $100  |   0%     | 10% |$110│   │
│ └──────────────────────────────────────────────────┘   │
│                                                         │
│ ┌──────────────┐  ┌───────────────────────────────┐   │
│ │ PAYMENTS     │  │ FINANCIAL SUMMARY             │   │
│ │ 10.5cm       │  │ 6.5cm                         │   │
│ ├──────────────┤  │                               │   │
│ │ Date | Ref   │  │ Subtotal        $ 3,595.00    │   │
│ │ 18/11| Pay1  │  │ TOTAL GST       $     0.00    │   │
│ │ 18/11| Dep   │  │ TOTAL           $ 3,595.00    │   │
│ │ Total: $3.00 │  │ Total Paid      $    -3.00    │   │
│ └──────────────┘  │ Amount Owing    $ 3,592.00    │   │
│                   └───────────────────────────────┘   │
│                                                         │
│ [FOOTER - Payment Terms, Bank Details]                 │
└─────────────────────────────────────────────────────────┘
```

**Issues:**
- ❌ Complex wrapper table causing spacing problems
- ❌ Totals table affected by payment table height
- ❌ ReportLab side-by-side alignment issues

---

### Option B: Stacked Layout (RECOMMENDED)

```
┌─────────────────────────────────────────────────────────┐
│ [HEADER - Logo, Company Info, Invoice Details]         │
│                                                         │
│ [PATIENT/COMPANY DETAILS]                              │
│                                                         │
│ [LINE ITEMS TABLE - Full Width 17cm]                   │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Description | Qty | Price | Discount | GST | $  │   │
│ │ Item 1      |  1  | $100  |   0%     | 10% |$110│   │
│ └──────────────────────────────────────────────────┘   │
│                                                         │
│ [PAYMENT HISTORY - Left-aligned 10.5cm]                │
│ ┌────────────────────────────────────┐                 │
│ │ Date     │ Reference      │ Amount │                 │
│ │ 18/11/25 │ Payment 1      │ $ 2.00 │                 │
│ │ 18/11/25 │ Deposit        │ $ 1.00 │                 │
│ │          │ Total Paid:    │ $ 3.00 │                 │
│ └────────────────────────────────────┘                 │
│                                                         │
│ [FINANCIAL SUMMARY - Right-aligned, Full Width 17cm]   │
│                          ┌───────────────────────────┐ │
│                          │ Subtotal      $ 3,595.00  │ │
│                          │ TOTAL GST     $     0.00  │ │
│                          │ TOTAL         $ 3,595.00  │ │
│                          │ Total Paid    $    -3.00  │ │
│                          │ Amount Owing  $ 3,592.00  │ │
│                          └───────────────────────────┘ │
│                                                         │
│ [FOOTER - Payment Terms, Bank Details]                 │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Financial summary IDENTICAL to non-payment invoice
- ✅ No wrapper table complexity
- ✅ Clean separation between payment history and totals
- ✅ Payment table can have different row heights without affecting totals
- ✅ Guaranteed consistent spacing

---

### Option C: Hybrid Layout (Payment History in Financial Summary)

```
┌─────────────────────────────────────────────────────────┐
│ [HEADER - Logo, Company Info, Invoice Details]         │
│                                                         │
│ [PATIENT/COMPANY DETAILS]                              │
│                                                         │
│ [LINE ITEMS TABLE - Full Width 17cm]                   │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Description | Qty | Price | Discount | GST | $  │   │
│ │ Item 1      |  1  | $100  |   0%     | 10% |$110│   │
│ └──────────────────────────────────────────────────┘   │
│                                                         │
│ [FINANCIAL SUMMARY - Right-aligned, Full Width 17cm]   │
│                          ┌───────────────────────────┐ │
│                          │ Subtotal      $ 3,595.00  │ │
│                          │ TOTAL GST     $     0.00  │ │
│                          │ TOTAL         $ 3,595.00  │ │
│                          │                           │ │
│                          │ PAYMENTS RECEIVED:        │ │
│                          │ 18/11/25 - Payment  $2.00 │ │
│                          │ 18/11/25 - Deposit  $1.00 │ │
│                          │ Total Paid    $    -3.00  │ │
│                          │                           │ │
│                          │ Amount Owing  $ 3,592.00  │ │
│                          └───────────────────────────┘ │
│                                                         │
│ [FOOTER - Payment Terms, Bank Details]                 │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Everything in one financial summary table
- ✅ No separate payment table
- ✅ Payment details integrated inline
- ✅ Consistent spacing guaranteed

**Drawbacks:**
- ⚠️ Less detail in payment history (no reference numbers?)
- ⚠️ Might be cluttered with many payments

---

## Table Width Specifications (A4)

### Full-Width Tables (17cm total):
```python
# Financial Summary (used in all documents)
totals_table = Table(totals_data, colWidths=[12*cm, 5*cm])  # = 17cm

# Line Items Table
line_table = Table(line_data, colWidths=[
    7*cm,    # Description
    1.5*cm,  # Qty
    2*cm,    # Unit Price
    1.5*cm,  # Discount
    1.5*cm,  # GST
    2.5*cm   # Amount
])  # = 17cm (adjusted to fit)
```

### Payment History Table:
```python
# Option 1: Compact (for side-by-side)
payment_table = Table(payment_data, colWidths=[2.5*cm, 5*cm, 3*cm])  # = 10.5cm

# Option 2: Full-width (for stacked)
payment_table = Table(payment_data, colWidths=[3*cm, 10*cm, 4*cm])  # = 17cm
```

---

## Fixed-Height Row Implementation

To ensure **consistent spacing**, we'll use fixed row heights:

```python
# Standard row height for all tables
ROW_HEIGHT = 0.6*cm

# Financial summary with fixed heights
totals_data = [
    ['Subtotal', f"$ {subtotal:,.2f}"],
    ['TOTAL GST', f"$ {total_gst:,.2f}"],
    ['TOTAL', f"$ {total:,.2f}"],
    ['Total Paid', f"$ -{total_paid:,.2f}"],
    ['Amount Owing', f"$ {amount_owing:,.2f}"],
]

totals_table = Table(
    totals_data, 
    colWidths=[12*cm, 5*cm],
    rowHeights=[ROW_HEIGHT] * len(totals_data)  # Fixed heights!
)

# Style with minimal padding (row height controls spacing)
totals_table.setStyle(TableStyle([
    ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
    ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 0), (-1, -1), 11),
    ('TOPPADDING', (0, 0), (-1, -1), 2),      # Minimal
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),   # Minimal
    ('LINEABOVE', (1, 2), (1, 2), 1, colors.black),  # Line above TOTAL
    ('LINEABOVE', (1, 4), (1, 4), 1, colors.black),  # Line above Amount Owing
]))
```

**Key Points:**
- ✅ Fixed `rowHeights=[ROW_HEIGHT] * len(data)` ensures consistent height
- ✅ Minimal padding (2) since row height controls spacing
- ✅ Same approach for ALL tables (payment, totals, line items)
- ✅ No variation possible - guaranteed consistency

---

## Recommended Approach for A4

### **Option B: Stacked Layout** ✅

**Reasoning:**
1. **Simplicity:** No complex wrapper tables
2. **Consistency:** Financial summary identical to non-payment invoices
3. **Reliability:** Fixed row heights guarantee spacing
4. **Maintainability:** Easy to debug and modify
5. **Space Efficient:** Payment table can be compact (10.5cm), totals full-width (17cm)

**Implementation:**
```python
def _build_payments_and_totals_section(self):
    elements = []
    
    # 1. Payment history table (left-aligned, compact)
    payment_table = self._build_payment_history_table()  # 10.5cm wide
    elements.append(payment_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # 2. Financial summary (IDENTICAL to non-payment version)
    totals_table = self._build_financial_summary_table(include_payments=True)  # 17cm wide
    elements.append(totals_table)
    
    return elements
```

---

## Document Types & Requirements

The PDF generator needs to handle **4 different document types**, each with unique characteristics:

---

### 1. 📄 **Invoice (No Payments)**

**Use Case:** Newly created invoice, no payments received yet

**Financial Summary:**
```
Subtotal         $ 3,595.00
TOTAL GST        $     0.00
─────────────────────────────
TOTAL            $ 3,595.00

Amount Owing     $ 3,595.00
```

**Layout:**
- Header (logo, contact, invoice details)
- Patient/Company details
- Line items table
- **Financial summary (right-aligned)**
- Footer (payment terms, bank details)

**Key Features:**
- No payment section
- Amount Owing = TOTAL
- Simple, clean layout

**Current Status:** ✅ **WORKING** - Spacing is perfect

---

### 2. 💰 **Invoice with Payments**

**Use Case:** Invoice with one or more payments applied

**Financial Summary:**
```
[Payment History Table]
Date       | Reference           | Amount
───────────┼─────────────────────┼────────
18/11/2025 | Payment for ORC1060 | $ 2.00
18/11/2025 | Deposit             | $ 1.00
───────────┴─────────────────────┴────────
           Total Paid:          | $ 3.00

Subtotal         $ 5.00
TOTAL GST        $ 0.00
─────────────────────────────
TOTAL            $ 5.00
Total Paid       $ -3.00
─────────────────────────────
Amount Owing     $ 2.00
```

**Layout:**
- Header (logo, contact, invoice details)
- Patient/Company details
- Line items table
- **Payment history table**
- **Financial summary (with Total Paid row)**
- Footer (payment terms, bank details)

**Key Features:**
- Payment history table shows all payments
- Total Paid row in payment table (summary)
- Financial summary includes "Total Paid" deduction
- Amount Owing = TOTAL - Total Paid

**Current Status:** ❌ **BROKEN** - Spacing inconsistent with non-payment invoice

**Questions:**
1. **Layout:** Should payment history be **side-by-side** with totals or **stacked above** totals?
2. **Payment Table:** Should it be full-width or left-aligned?
3. **Totals Table:** Should it match the width/position of non-payment invoices?

---

### 3. 📋 **Quote**

**Use Case:** Proposal/estimate for services, not yet approved

**Financial Summary:**
```
Subtotal         $ 3,595.00
TOTAL GST        $     0.00
─────────────────────────────
TOTAL            $ 3,595.00

Amount Owing     $ 3,595.00
```

**Layout:**
- Header (logo, contact, **QUOTE** details - not invoice)
- Patient/Company details
- Line items table
- **Financial summary (right-aligned)**
- Footer (payment terms optional, quote validity)

**Key Features:**
- Similar to invoice but labeled "Quote"
- No payments (quotes don't have payments)
- Amount Owing = TOTAL (but it's a quote, not owing yet)
- May have quote-specific footer (validity period, terms)

**Current Status:** ✅ **WORKING** - Uses same code as invoice (no payments)

**Questions:**
1. **Footer:** Should quotes have different footer text (no bank details, just validity)?
2. **Terminology:** "Amount Owing" vs "Quote Total" or "Estimated Cost"?
3. **Status:** Should quote status (DRAFT, SENT, ACCEPTED) appear on PDF?

---

### 4. 🧾 **Receipt (NEW)**

**Use Case:** Proof of payment, issued when payment is received

**Payment Summary:**
```
[Payment Details]
Payment Date:     18/11/2025
Payment Method:   Credit Card / Bank Transfer / Cash
Reference:        Payment for ORC1060
Amount Received:  $ 3.00

[Original Invoice Details]
Invoice Number:   ORC1060
Invoice Date:     17/11/2025
Original Amount:  $ 5.00
Previously Paid:  $ 0.00
This Payment:     $ 3.00
─────────────────────────────
Balance Owing:    $ 2.00
```

**Layout:**
- Header (logo, contact, **RECEIPT** details)
- Patient/Company details
- **Payment details section** (date, method, reference, amount)
- **Original invoice summary** (what this payment is for)
- **Payment allocation** (if multiple invoices)
- **"PAID" watermark stamp overlaid at 13% opacity** ✅
- Footer (thank you message, contact info)

**Visual Identity:**
- **"PAID" watermark:** Blue stamp graphic (`Paid.png`)
- **Opacity:** 13% (subtle, professional)
- **Position:** Centered over the document content
- **Size:** ~8-10cm diameter (visible but not overwhelming)
- **Image:** `backend/invoices/assets/Paid.png`

**Key Features:**
- Focus on the **payment**, not the invoice
- Shows what invoice(s) this payment applies to
- Receipt number (separate from invoice number)
- Payment method (credit card, bank transfer, cash, etc.)
- Running balance after this payment
- **Professional "PAID" watermark stamp for authenticity**

**Current Status:** 🆕 **NOT YET IMPLEMENTED**

**Questions:**
1. **Receipt Number:** Generate separate receipt numbers (REC-0001) or use payment ID?
2. **Payment Method:** Add payment method field to XeroPayment model?
3. **Multiple Invoices:** Can one receipt cover multiple invoices (batch payment)?
4. **Line Items:** Show original invoice line items or just summary?
5. **Tax/GST:** Show GST breakdown or just total payment amount?
6. **Historical Payments:** Show all payments on this invoice or just this payment?

---

## Unified Generator Strategy

### Common Elements (All Documents):
- Header (logo, company details, dates)
- Patient/Company details
- Line items table (except Receipt - optional)
- Footer

### Variable Elements:
| Element | Invoice | Invoice+Payments | Quote | Receipt |
|---------|---------|------------------|-------|---------|
| **Payment History** | ❌ No | ✅ Yes | ❌ No | ✅ Yes (focus) |
| **Total Paid Row** | ❌ No | ✅ Yes | ❌ No | ✅ Yes |
| **Line Items** | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Optional |
| **Financial Summary** | ✅ Full | ✅ Full | ✅ Full | ⚠️ Simplified |
| **Footer Type** | Bank details | Bank details | Validity | Thank you |

---

## Design Decisions Needed

### 1. **Layout for Invoice with Payments**
**Option A:** Side-by-side (payment history left, totals right)
- **Pro:** Compact, uses space efficiently
- **Con:** Complex layout, alignment issues

**Option B:** Stacked (payment history on top, totals below, full-width)
- **Pro:** Simple, consistent with other documents
- **Con:** Uses more vertical space

**Your preference?** 🤔

---

### 2. **Receipt Design**
**Option A:** Receipt as standalone document (no line items)
```
RECEIPT #REC-0001

Payment received: $3.00
For invoice: ORC1060
Balance remaining: $2.00
```

**Option B:** Receipt as mini-invoice (includes line items)
```
RECEIPT #REC-0001

[Original line items from invoice]
TOTAL: $5.00
Payment received: $3.00
Balance remaining: $2.00
```

**Your preference?** 🤔

---

### 3. **Quote Footer**
Should quotes have:
- **Same footer as invoices** (bank details, payment terms)
- **Different footer** (quote validity, acceptance terms)

**Your preference?** 🤔

---

### 4. **Terminology Consistency**
- Invoice: "Amount Owing"
- Quote: "Amount Owing" or "Quote Total" or "Estimated Cost"?
- Receipt: "Balance Owing" or "Remaining Balance"?

**Your preference?** 🤔

---

## Next Steps

Once we decide on the above questions, I'll:
1. **Design the unified generator architecture**
2. **Implement fixed-height rows for consistent spacing**
3. **Add Receipt document type**
4. **Test all 4 document types**
5. **Replace old generator**

**Let's discuss each document type and make these decisions!** 💬

---

## Current Invoice Layout (Reference Image)

Based on the current working invoice (ORC1062), here are the exact layout specifications:

### Header Section
```
┌─────────────────────────────────────────────────────────┐
│ [LOGO]              Walk Easy Pedorthics Australia      │
│ (left-aligned)      Pty LTD                             │
│                                                          │
│                     43 Harrison St, Cardiff, NSW 2285   │ [Invoice Date]
│                     21 Dowe St, Tamworth, NSW 2285      │ [Invoice Number]
│                     02 6766 3153                         │ [Due Date]
│                     info@walkeasy.com.au                │
│                                                          │
│                     Tax Invoice                          │
└─────────────────────────────────────────────────────────┘
```

**Layout Details:**
- Logo: Left-aligned, ~4cm × 4cm
- Company details: Center column with icons
- Invoice details: Right-aligned column
- "Tax Invoice" heading: Centered, below company details

### Patient/Company Details Section
```
┌─────────────────────────────────────────────────────────┐
│ [LEFT COLUMN]                          [RIGHT COLUMN]   │
│ HealthShare Accounts Payable          Reference / PO#   │
│ Enable NSW Via email                  [Reference text]  │
│ Level 5, 1 Reserve Road                                 │
│ St Leonards NSW 2065                  Provider Reg #    │
│                                        [Number]          │
│                                                          │
│                                        Practitioner:     │
│                                        [Name]            │
│                                        [Qualification]   │
│                                        Registration #    │
│                                        [Website]         │
└─────────────────────────────────────────────────────────┘
```

**Layout Details:**
- Patient/Company name: Left, bold, larger font
- Address: Left, below name
- Reference info: Right-aligned
- Practitioner info: Right-aligned, italicized "Practitioner:"

### Line Items Table
```
┌─────────────────────────────────────────────────────────┐
│ [BLUE HEADER BAR - Color: #4897d2]                     │
│ Description | Qty | Unit Price | Discount | GST | Amount│
├─────────────────────────────────────────────────────────┤
│ Custom      |  1  | $ 2,500.00 |   0.00%  |     |$2,500 │
│ CMO         |  1  | $ 1,095.00 |   0.00%  |     |$1,095 │
└─────────────────────────────────────────────────────────┘
```

**Column Widths (approximate for 17cm total):**
- Description: ~7cm (flexible, can wrap)
- Qty: ~1.5cm
- Unit Price: ~2.5cm
- Discount: ~1.5cm
- GST: ~1.5cm (shows %, empty if 0%)
- Amount: ~2.5cm (right-aligned)

**Styling:**
- Header: Blue background (#4897d2), white text, bold
- Data rows: Black text, normal weight
- Row separators: Light grey lines
- Last row: Thicker bottom border

### Financial Summary (Right-aligned)
```
                                    Subtotal        $ 3,595.00
                                    TOTAL GST       $     0.00
                                    ─────────────────────────
                                    TOTAL           $ 3,595.00

                                    Amount Owing    $ 3,595.00
```

**Layout Details:**
- Right-aligned on page
- Column widths: [12cm, 5cm] = 17cm total
- Labels: Right-aligned in left column
- Values: Right-aligned in right column
- Line above TOTAL: Full width of values column
- Line above Amount Owing: Full width of values column
- Font: Helvetica, 11pt
- Spacing: Tight rows (current working version)

**Key Measurements:**
- Position: Starts ~1-2cm from right margin
- Label column: Right-aligned text
- Value column: Right-aligned currency

### Footer Section
```
┌─────────────────────────────────────────────────────────┐
│ Please note this is a 7 Day Account. Due on the [DATE] │
│                                                         │
│ EFT | Walk Easy... | BSB: 013287 ACC: 222796921 |...  │
│ [BLUE BAR - Color: #4897d2]                            │
│ www.walkeasy.com.au | info@... | A.B.N 63 612 528 971  │
└─────────────────────────────────────────────────────────┘
```

**Layout Details:**
- Payment terms: Centered, above footer bar
- Bank details: Single line, pipe-separated
- Contact bar: Blue background (#4897d2), white text
- Website, email, ABN: Centered in blue bar

---

## Design Constants (Code Implementation)

```python
from reportlab.lib.units import cm, mm
from reportlab.lib import colors

# ============================================
# UNITS: Use cm (centimeters) for all measurements
# ============================================

# Colors
COLOR_PRIMARY_BLUE = '#4897d2'  # Table headers, footer bar
COLOR_GREY_LIGHT = '#f5f5f5'    # Alternate row backgrounds (if used)
COLOR_GREY_BORDER = '#cccccc'   # Table borders
COLOR_BLACK = '#000000'          # Text

# Fonts
FONT_FAMILY = 'Helvetica'
FONT_SIZE_NORMAL = 11
FONT_SIZE_HEADER = 12
FONT_SIZE_TITLE = 16
FONT_SIZE_SMALL = 9

# Spacing (in cm)
ROW_HEIGHT = 0.6*cm  # CRITICAL for consistent spacing!
PADDING_MINIMAL = 2  # Minimal padding when row height is fixed (points, not cm)
PADDING_STANDARD = 4  # Standard padding (points)
PADDING_TABLE_HEADER = 8  # Table header padding (points)

# Margins (in cm)
MARGIN_LEFT = 2*cm
MARGIN_RIGHT = 2*cm
MARGIN_TOP = 2*cm
MARGIN_BOTTOM = 2*cm

# Table Widths (in cm - 17cm total usable width)
WIDTH_FULL = 17*cm
WIDTH_PAYMENT_TABLE = 10.5*cm  # For compact payment history
WIDTH_TOTALS_TABLE = 17*cm     # Full width for financial summary

# Column widths for line items (in cm - must sum to ~17cm)
COL_DESCRIPTION = 7.0*cm
COL_QTY = 1.5*cm
COL_UNIT_PRICE = 2.5*cm
COL_DISCOUNT = 1.5*cm
COL_GST = 1.5*cm
COL_AMOUNT = 2.5*cm
# Total: 16.5cm (leaves 0.5cm for borders/padding)

# Column widths for financial summary (in cm)
COL_TOTALS_LABEL = 12*cm
COL_TOTALS_VALUE = 5*cm
# Total: 17cm ✓

# Column widths for payment history (in cm)
COL_PAYMENT_DATE = 2.5*cm
COL_PAYMENT_REF = 5.0*cm
COL_PAYMENT_AMOUNT = 3.0*cm
# Total: 10.5cm ✓

# Spacers (in cm)
SPACER_SMALL = 0.3*cm   # Between elements
SPACER_MEDIUM = 0.5*cm  # Between sections
SPACER_LARGE = 1.0*cm   # Between major sections
```

**Note on Units:**
- **Widths, Heights, Margins, Spacers:** Use `*cm` (e.g., `12*cm`)
- **Padding:** Use points (integers) without `*cm` (e.g., `4`)
- **Font Sizes:** Use points (integers) without `*cm` (e.g., `11`)

**Why padding uses points:**
ReportLab's `TOPPADDING` and `BOTTOMPADDING` expect values in points (1/72 inch), not cm.
- `2` points = ~0.07cm (minimal)
- `4` points = ~0.14cm (standard)
- `8` points = ~0.28cm (spacious)

---

## Implementation Priority

### Phase 1: Fix Existing Invoice with Payments ✅
1. Implement fixed-height rows (`rowHeights=[ROW_HEIGHT] * len(data)`)
2. Use Option B: Stacked layout (payment table on top, totals below)
3. Ensure financial summary uses IDENTICAL code to non-payment invoices
4. Test and verify spacing consistency

### Phase 2: Receipt Document 🆕
1. Create receipt template
2. Add payment method field to database model
3. Generate receipt number sequence
4. Test receipt generation

### Phase 3: Quote Enhancements ⚡
1. Review footer text (validity vs bank details)
2. Adjust terminology if needed ("Quote Total" vs "Amount Owing")
3. Optional: Add quote status to PDF

### Phase 4: Documentation & Testing 📋
1. Update all documentation
2. Test all 4 document types
3. Verify consistency across all layouts
4. Performance testing with multiple line items/payments

---

## Critical Success Factors

1. ✅ **Fixed Row Heights** - This is the KEY to consistent spacing
2. ✅ **Identical Code Paths** - Financial summary must use same code
3. ✅ **No Wrapper Complexity** - Keep layouts simple and independent
4. ✅ **Explicit Styling** - No style inheritance or bleeding
5. ✅ **Comprehensive Testing** - All document types, all scenarios

---

## Outstanding Problems to Solve

### Problem 11: Number Alignment & Typography in Financial Summary 🔢
**Status:** IDENTIFIED  
**Description:** Decimal points don't align vertically, and font sizes/line lengths are inconsistent  
**Impact:** Unprofessional appearance, hard to read financial information  

**Specific Issues:**

1. **Number Alignment:**
   - Decimal points don't align vertically in amount column
   - Negative sign in "$ -3.00" breaks alignment
   - All numbers should align on the decimal point

2. **Font Size Inconsistency:**
   - **Image 2 (Incorrect):** 8pt font ❌ - Too small
   - **Image 3 (Correct):** 11pt font ✅ - Should be standard

3. **Line Length:**
   - **Image 4:** Lines should be **30mm (3cm) long** ✅
   - Lines above TOTAL GST, TOTAL, Total Paid, Amount Owing

**Correct Specification:**
```
Financial Summary Table:
- Font size: 11pt (not 8pt!)
- Font family: Helvetica
- Number alignment: Right-aligned with decimal points aligned
- Line length: 30mm (3cm) above values
- Line position: Above TOTAL GST, TOTAL, Total Paid, Amount Owing

Example (correct):
Subtotal          $  5.00   ← 11pt, right-aligned
TOTAL GST         $  0.00   ← 11pt, decimal aligns
                  ─────────  ← 30mm line
TOTAL             $  5.00   ← 11pt, decimal aligns
                  ─────────  ← 30mm line
Total Paid        $ -3.00   ← 11pt, decimal aligns (negative doesn't break alignment)
                  ─────────  ← 30mm line
Amount Owing      $  2.00   ← 11pt, decimal aligns
```

**Solution Required:**
1. Use fixed-width formatting for numbers
2. Ensure font size is 11pt consistently
3. Set line length to exactly 3cm (30mm)
4. Use proper right-alignment with decimal point alignment
5. Format negative numbers consistently: `$ -3.00` with proper spacing

**Code Implementation:**
```python
from reportlab.lib.units import cm, mm

# Font size
FONT_SIZE_TOTALS = 11  # Must be 11pt, not 8pt!

# Line length
LINE_LENGTH_TOTALS = 30*mm  # 3cm exactly

# Number formatting
def format_currency(amount):
    """Format currency with proper alignment"""
    if amount < 0:
        return f"$ -{abs(amount):,.2f}"  # $ -3.00
    else:
        return f"$  {amount:,.2f}"       # $  5.00 (extra space for alignment)

# Table styling
totals_table.setStyle(TableStyle([
    ('FONTSIZE', (0, 0), (-1, -1), 11),  # 11pt font!
    ('ALIGN', (1, 0), (1, -1), 'RIGHT'),  # Right-align numbers
    # Lines exactly 30mm (3cm) long
    ('LINEABOVE', (1, total_gst_row), (1, total_gst_row), 1, colors.black),  # 3cm line
    ('LINEABOVE', (1, total_row), (1, total_row), 1, colors.black),          # 3cm line
    ('LINEABOVE', (1, total_paid_row), (1, total_paid_row), 1, colors.black), # 3cm line
    ('LINEABOVE', (1, amount_owing_row), (1, amount_owing_row), 1, colors.black), # 3cm line
]))
```

**Priority:** 🟡 MEDIUM (Visual quality and professional appearance)

---

### Problem 12: Payment History Table Specifications 💳
**Status:** IDENTIFIED  
**Description:** Payment history table needs exact width and alignment specifications  
**Impact:** Consistency with overall layout  

**Exact Specifications:**

**Table Width:**
- **Total width: 90mm (9cm)** ✅
- Table position: Left-aligned on page

**Column Layout (Image 2 shows correct alignment):**
```
┌─────────────────────────────────────────────────────────┐
│ Date       │ Reference              │ Amount            │
│ (left)     │ (left)                 │ (right-aligned)   │
├────────────┼────────────────────────┼───────────────────┤
│ 18/11/2025 │ Payment for ORC1060    │ $ 2.00            │
│ 18/11/2025 │ Deposit                │ $ 1.00            │
│            │ Total Paid:            │ $ 3.00            │ ← Bold row
└─────────────────────────────────────────────────────────┘
```

**Column Widths (must total 90mm):**
```python
# Payment table columns (90mm total)
COL_PAYMENT_DATE = 25*mm      # Date column
COL_PAYMENT_REF = 45*mm       # Reference column  
COL_PAYMENT_AMOUNT = 20*mm    # Amount column
# Total: 90mm ✓

# Alternative breakdown:
payment_table = Table(payment_data, colWidths=[2.5*cm, 4.5*cm, 2*cm])  # = 9cm
```

**Styling Requirements:**
1. **Header row:** Blue background (#4897d2), white text, bold
2. **Date column:** Left-aligned, format: DD/MM/YYYY
3. **Reference column:** Left-aligned, text wraps if needed
4. **Amount column:** Right-aligned, decimal points align
5. **Total Paid row:** 
   - Bold text
   - Light grey background (#f5f5f5)
   - Blue line above (1.5pt, color #4897d2)

**Number Alignment in Payment Table:**
- Same rules as financial summary
- All decimal points align vertically
- Format: `$ 2.00` (with proper spacing)

**Code Implementation:**
```python
from reportlab.lib.units import cm, mm

# Payment table width (EXACT)
WIDTH_PAYMENT_TABLE = 90*mm  # 9cm exactly

# Column widths (must total 90mm)
COL_PAYMENT_DATE = 25*mm      # 2.5cm
COL_PAYMENT_REF = 45*mm       # 4.5cm  
COL_PAYMENT_AMOUNT = 20*mm    # 2cm
# Total: 90mm ✓

# Create payment table
payment_table = Table(
    payment_data, 
    colWidths=[COL_PAYMENT_DATE, COL_PAYMENT_REF, COL_PAYMENT_AMOUNT]
)

# Styling
payment_table.setStyle(TableStyle([
    # Header row
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4897d2')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 11),
    
    # Data rows
    ('FONTSIZE', (0, 1), (-1, -1), 10),
    ('ALIGN', (0, 1), (0, -1), 'LEFT'),    # Date: left
    ('ALIGN', (1, 1), (1, -1), 'LEFT'),    # Reference: left
    ('ALIGN', (2, 1), (2, -1), 'RIGHT'),   # Amount: right
    
    # Total Paid row
    ('FONTNAME', (1, total_paid_row), (2, total_paid_row), 'Helvetica-Bold'),
    ('BACKGROUND', (0, total_paid_row), (-1, total_paid_row), colors.HexColor('#f5f5f5')),
    ('LINEABOVE', (0, total_paid_row), (-1, total_paid_row), 1.5, colors.HexColor('#4897d2')),
    
    # Grid
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
]))
```

**Priority:** 🟡 MEDIUM (Layout consistency)

---

### Problem 1: Spacing Inconsistency ❌ **CRITICAL**
**Status:** UNRESOLVED  
**Description:** Financial summary row spacing differs between invoices with payments vs without payments  
**Impact:** Invoices look unprofessional and inconsistent  
**Root Cause:** Unknown - tried 7+ different fixes without success  
**Proposed Solution:** Implement fixed row heights (`rowHeights` parameter)  
**Priority:** 🔴 HIGHEST

---

### Problem 2: Receipt Document Missing 🧾
**Status:** NOT IMPLEMENTED  
**Description:** No receipt generation functionality exists  
**Impact:** Cannot provide payment receipts to patients/companies  

**Visual Identity - "PAID" Watermark:** ✅
- **Image:** `Paid.png` (blue stamp graphic with "THANK YOU" and "PAID" text)
- **Opacity:** 13% (subtle, professional)
- **Position:** Centered over the document content
- **Size:** ~8-10cm diameter (visible but not overwhelming)
- **File Location:** `backend/invoices/assets/Paid.png`

**Code Implementation - Watermark:**
```python
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

def add_paid_watermark(canvas_obj, doc):
    """Add PAID watermark stamp at 13% opacity"""
    watermark_path = 'backend/invoices/assets/Paid.png'
    
    # Calculate center position
    page_width = doc.pagesize[0]
    page_height = doc.pagesize[1]
    
    # Watermark size
    watermark_width = 8*cm
    watermark_height = 8*cm
    
    # Center position
    x = (page_width - watermark_width) / 2
    y = (page_height - watermark_height) / 2
    
    # Save state, set opacity, draw watermark
    canvas_obj.saveState()
    canvas_obj.setFillAlpha(0.13)  # 13% opacity
    canvas_obj.drawImage(
        watermark_path, x, y,
        width=watermark_width,
        height=watermark_height,
        mask='auto',
        preserveAspectRatio=True
    )
    canvas_obj.restoreState()

# Use in canvasmaker
class ReceiptCanvasMaker(canvas.Canvas):
    def showPage(self):
        add_paid_watermark(self, self.doc)
        canvas.Canvas.showPage(self)
```

**Requirements:**
- ✅ "PAID" watermark at 13% opacity
- ❓ Receipt number generation (separate from invoice numbers)
- ❓ Payment details display (date, method, reference, amount)
- ❓ Original invoice information
- ❓ Running balance calculation
- ❓ Thank you message footer

**Design Decisions Needed:**
1. ✅ **Watermark:** 13% opacity "PAID" stamp - DECIDED
2. ❓ **Receipt numbering:** Separate sequence (REC-0001) or use payment ID?
3. ❓ **Payment method:** Add field to XeroPayment model?
4. ❓ **Layout:** Standalone or include line items?
5. ❓ **Batch payments:** One receipt for multiple invoices?

**Implementation Steps:**
1. ✅ Save `Paid.png` to `backend/invoices/assets/`
2. Create `receipt_pdf_generator.py` based on invoice generator
3. Add watermark function with 13% opacity
4. Add receipt number generation logic
5. Create receipt API endpoint (`/api/receipts/xero/<payment_id>/pdf/`)
6. Add "Generate Receipt" button to payment UI
7. Test watermark positioning and opacity

**Priority:** 🟡 MEDIUM

---

### Problem 3: Quote Terminology & Footer 📋
**Status:** WORKING BUT NEEDS REVIEW  
**Description:** Quotes currently use invoice terminology and footer  
**Impact:** Minor - quotes work but might need refinement  
**Questions:**
1. Should quotes say "Quote Total" instead of "Amount Owing"?
2. Should footer show bank details or just validity period?
3. Should quote status (DRAFT/SENT/ACCEPTED) appear on PDF?
4. Should footer be different for quotes vs invoices?

**Priority:** 🟢 LOW

---

### Problem 4: Payment Method Tracking 💳
**Status:** MISSING FROM DATABASE  
**Description:** No field to store payment method (Credit Card, Bank Transfer, Cash, etc.)  
**Impact:** Cannot show payment method on receipts or payment history  
**Solution Required:**
- Add `payment_method` field to `XeroPayment` model
- Add payment method to payment recording UI
- Display payment method in payment history and receipts

**Priority:** 🟡 MEDIUM (Required for receipts)

---

### Problem 5: Receipt Numbering System 🔢
**Status:** NOT DESIGNED  
**Description:** Need to decide on receipt numbering approach  
**Options:**
1. **Separate sequence:** REC-0001, REC-0002, etc.
   - Pro: Clear, professional
   - Con: Need to track separate counter
   
2. **Use payment ID:** Receipt #1234 (Xero payment ID)
   - Pro: Simple, no extra tracking
   - Con: Numbers don't start at 1, might have gaps

3. **Invoice-based:** ORC1060-R1, ORC1060-R2 (receipt 1, receipt 2 for invoice)
   - Pro: Links to invoice clearly
   - Con: Complex if payment covers multiple invoices

**Decision Needed:** Which approach?  
**Priority:** 🟡 MEDIUM (Required for receipts)

---

### Problem 6: Batch Payment Receipts 📊
**Status:** NOT DESIGNED  
**Description:** How to handle receipts for batch payments (one payment covering multiple invoices)?  
**Scenarios:**
1. Patient pays $500 covering 3 invoices
2. Need to show breakdown of payment allocation
3. Each invoice needs to show payment received

**Questions:**
1. One receipt showing all invoices?
2. Multiple receipts (one per invoice)?
3. How to display payment allocation?

**Priority:** 🟢 LOW (Edge case, can implement later)

---

### Problem 7: PDF Generation Performance ⚡
**Status:** NOT TESTED AT SCALE  
**Description:** Unknown performance with large datasets  
**Concerns:**
- Invoices with 50+ line items
- Invoices with 20+ payments
- Multi-page invoices
- Concurrent PDF generation

**Testing Needed:**
- Performance benchmarks
- Memory usage
- Page break handling
- Footer placement on multi-page documents

**Priority:** 🟢 LOW (Optimize after working)

---

### Problem 8: Error Handling & Validation 🛡️
**Status:** NEEDS REVIEW  
**Description:** Need robust error handling for PDF generation  
**Scenarios:**
- Missing patient/company data
- Invalid line item data
- Missing payment information
- Xero API failures
- File system errors

**Required:**
- Graceful error messages
- Logging for debugging
- Fallback options
- User-friendly error display

**Priority:** 🟡 MEDIUM

---

### Problem 9: Email Integration 📧
**Status:** UNKNOWN  
**Description:** How do PDFs get sent to patients/companies?  
**Questions:**
1. Is there email integration?
2. Can invoices/quotes/receipts be emailed directly?
3. Are PDFs attached or linked?
4. Who triggers the email (manual or automatic)?

**Requirements if needed:**
- Email templates for each document type
- Attachment handling
- Email logging
- Send confirmation

**Priority:** 🟢 LOW (Not part of PDF generator, but related)

---

### Problem 10: Document Versioning 📝
**Status:** NOT DESIGNED  
**Description:** What happens if invoice/quote is regenerated?  
**Questions:**
1. Do we keep old PDF versions?
2. Can patients see history of invoices?
3. What if line items change after sending?
4. How to handle corrections/amendments?

**Concerns:**
- Audit trail requirements
- Legal compliance
- Patient confusion if details change

**Priority:** 🟢 LOW (Business logic, not PDF generation)

---

## Decision Log

Document all decisions made during implementation:

### Decision 1: Layout for Invoice with Payments
**Date:** [PENDING]  
**Decision:** [Option B: Stacked Layout - RECOMMENDED]  
**Rationale:** Simple, consistent, no wrapper complexity  
**Status:** ⏳ AWAITING APPROVAL

### Decision 2: Fixed Row Heights
**Date:** [PENDING]  
**Decision:** Use `rowHeights=[0.6*cm] * len(data)` for all tables  
**Rationale:** Guarantees consistent spacing  
**Status:** ⏳ AWAITING IMPLEMENTATION

### Decision 3: Receipt Design
**Date:** [PENDING]  
**Decision:** [PENDING]  
**Options:** Standalone vs Mini-invoice  
**Status:** ⏳ AWAITING DECISION

### Decision 4: Receipt Numbering
**Date:** [PENDING]  
**Decision:** [PENDING]  
**Options:** Separate sequence, Payment ID, or Invoice-based  
**Status:** ⏳ AWAITING DECISION

### Decision 5: Payment Method Storage
**Date:** [PENDING]  
**Decision:** Add `payment_method` CharField to XeroPayment model  
**Options:** Dropdown (Credit Card/Bank Transfer/Cash/Other)  
**Status:** ⏳ AWAITING APPROVAL

---

## Questions for User

Before we can proceed with implementation, we need answers to:

### Critical Questions (Block Implementation):
1. ❓ **Invoice with Payments Layout:** Confirm Option B (Stacked) is acceptable?
2. ❓ **Receipt Design:** Standalone (just payment info) or include line items?
3. ❓ **Receipt Numbering:** Which approach do you prefer?
4. ❓ **Payment Method:** Should we add this to database? What options?

### Important Questions (Can Defer):
5. ❓ **Quote Footer:** Keep same as invoice or make different?
6. ❓ **Quote Terminology:** "Amount Owing" or "Quote Total"?
7. ❓ **Batch Payments:** How should receipts work for batch payments?

### Nice to Have Questions (Future):
8. ❓ **Email Integration:** Is this planned/needed?
9. ❓ **Document Versioning:** Keep history of PDF versions?
10. ❓ **Multi-page Support:** Any special requirements for long invoices?

---

## Complete Implementation Specifications ✅

### 1. Header Section Specifications
**Status:** FINALIZED FOR IMPLEMENTATION

**Layout Structure:**
```
┌──────────┬─────────────────────┬──────────────┐
│  LOGO    │  ADDRESS GRAPHIC    │ INVOICE INFO │
│  4×4cm   │     9.03×4cm        │   ~4cm       │
└──────────┴─────────────────────┴──────────────┘
```

**Code Constants:**
```python
from reportlab.lib.units import cm
from reportlab.lib import colors

# Header dimensions
LOGO_WIDTH = 4*cm
LOGO_HEIGHT = 4*cm
ADDRESS_GRAPHIC_WIDTH = 9.03*cm
ADDRESS_GRAPHIC_HEIGHT = 4*cm

# Header column widths (must total 17cm)
COL_HEADER_LOGO = 4*cm
COL_HEADER_ADDRESS = 9.03*cm
COL_HEADER_INFO = 3.97*cm
# Total: 17cm ✓

# Header paths
LOGO_PATH = '../frontend/public/images/Logo_Nexus.png'
ADDRESS_PATH = '../frontend/public/images/Address.png'

# Header styling
FONT_SIZE_INVOICE_DATE = 12
FONT_SIZE_TAX_INVOICE = 16  # "Tax Invoice" heading
FONT_INVOICE_DATE = 'Helvetica-Bold'
FONT_TAX_INVOICE = 'Helvetica-Bold'

# Header table styling
header_table.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('ALIGN', (0, 0), (0, 0), 'LEFT'),   # Logo left
    ('ALIGN', (1, 0), (1, 0), 'RIGHT'),  # Address graphic right
    ('ALIGN', (2, 0), (2, 0), 'RIGHT'),  # Invoice info right
    ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ('TOPPADDING', (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
]))
```

---

### 2. Patient/Company Details Section
**Status:** FINALIZED FOR IMPLEMENTATION

**Layout Structure:**
```
┌─────────────────────────┬─────────────────────┐
│  PATIENT/COMPANY NAME   │  REFERENCE / PO#    │
│  Address Line 1         │  Provider Reg #     │
│  Address Line 2         │  Practitioner:      │
│  City State Postcode    │  Name & Details     │
└─────────────────────────┴─────────────────────┘
```

**Code Constants:**
```python
# Patient/Company section dimensions
COL_PATIENT_LEFT = 10*cm    # Name and address
COL_PATIENT_RIGHT = 7*cm    # Reference and practitioner
# Total: 17cm ✓

# Font sizes
FONT_SIZE_PATIENT_NAME = 14          # Bold, larger
FONT_SIZE_PATIENT_ADDRESS = 10       # Normal
FONT_SIZE_REFERENCE_LABEL = 10       # Normal
FONT_SIZE_REFERENCE_VALUE = 10       # Normal
FONT_SIZE_PRACTITIONER_LABEL = 10    # Italic "Practitioner:"
FONT_SIZE_PRACTITIONER_VALUE = 10    # Normal

# Font styles
FONT_PATIENT_NAME = 'Helvetica-Bold'
FONT_PATIENT_ADDRESS = 'Helvetica'
FONT_REFERENCE = 'Helvetica'
FONT_PRACTITIONER_LABEL = 'Helvetica-Oblique'  # Italic
FONT_PRACTITIONER_VALUE = 'Helvetica'

# Patient section table styling
patient_table.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('ALIGN', (0, 0), (0, 0), 'LEFT'),   # Patient info left
    ('ALIGN', (1, 0), (1, 0), 'LEFT'),   # Reference info left
    ('LEFTPADDING', (0, 0), (0, 0), 2.5*cm),  # 2.5cm left padding for patient address
    ('LEFTPADDING', (1, 0), (1, 0), 0),
    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ('TOPPADDING', (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
]))
```

---

### 3. Spacer/Gap Specifications
**Status:** FINALIZED FOR IMPLEMENTATION

**All Gaps Between Sections:**
```python
from reportlab.platypus import Spacer

# Base spacer constants (already defined)
SPACER_SMALL = 0.3*cm
SPACER_MEDIUM = 0.5*cm
SPACER_LARGE = 1.0*cm

# Specific usage throughout document
GAP_HEADER_TO_PATIENT = SPACER_MEDIUM        # 0.5cm - After header
GAP_PATIENT_TO_TITLE = SPACER_SMALL          # 0.3cm - Before "Tax Invoice"
GAP_TITLE_TO_LINEITEMS = SPACER_MEDIUM       # 0.5cm - After title
GAP_LINEITEMS_TO_PAYMENTS = SPACER_MEDIUM    # 0.5cm - After line items
GAP_PAYMENTS_TO_TOTALS = SPACER_MEDIUM       # 0.5cm - Between payment & totals
GAP_TOTALS_TO_FOOTER = 1.5*cm                # 1.5cm - Before footer (as mentioned)

# Usage in buildDocument():
elements = []
elements.append(header_table)
elements.append(Spacer(1, GAP_HEADER_TO_PATIENT))      # 0.5cm
elements.append(patient_table)
elements.append(Spacer(1, GAP_PATIENT_TO_TITLE))       # 0.3cm
elements.append(tax_invoice_heading)
elements.append(Spacer(1, GAP_TITLE_TO_LINEITEMS))     # 0.5cm
elements.append(line_items_table)
elements.append(Spacer(1, GAP_LINEITEMS_TO_PAYMENTS))  # 0.5cm
if has_payments:
    elements.append(payment_table)
    elements.append(Spacer(1, GAP_PAYMENTS_TO_TOTALS)) # 0.5cm
elements.append(totals_table)
elements.append(Spacer(1, GAP_TOTALS_TO_FOOTER))       # 1.5cm
# Footer handled by dynamic bottom margin
```

---

### 4. Font Weight/Style Complete Specification
**Status:** FINALIZED FOR IMPLEMENTATION

**Complete Font Style Mapping:**
```python
# ============================================
# FONT STYLES - Complete Specification
# ============================================

# Header section
FONT_INVOICE_DATE = 'Helvetica-Bold'
FONT_INVOICE_NUMBER = 'Helvetica-Bold'
FONT_DUE_DATE = 'Helvetica-Bold'
FONT_TAX_INVOICE = 'Helvetica-Bold'  # "Tax Invoice" heading

# Patient/Company section
FONT_PATIENT_NAME = 'Helvetica-Bold'         # Name is bold
FONT_PATIENT_ADDRESS = 'Helvetica'           # Address normal
FONT_REFERENCE_LABEL = 'Helvetica'           # "Reference / PO#" normal
FONT_REFERENCE_VALUE = 'Helvetica'           # Reference value normal
FONT_PRACTITIONER_LABEL = 'Helvetica-Oblique'  # "Practitioner:" italic
FONT_PRACTITIONER_VALUE = 'Helvetica'        # Practitioner name normal

# Line items table
FONT_LINE_HEADER = 'Helvetica-Bold'          # Blue header row
FONT_LINE_DATA = 'Helvetica'                 # Data rows normal

# Payment table
FONT_PAYMENT_HEADER = 'Helvetica-Bold'       # Blue header row
FONT_PAYMENT_DATA = 'Helvetica'              # Data rows normal
FONT_PAYMENT_TOTAL = 'Helvetica-Bold'        # "Total Paid:" row

# Financial summary (IMPORTANT: We removed bold earlier!)
FONT_TOTALS_LABEL = 'Helvetica'              # Labels normal (not bold)
FONT_TOTALS_VALUE = 'Helvetica'              # Values normal (not bold)
FONT_TOTALS_TOTAL_ROW = 'Helvetica'          # TOTAL row normal
FONT_TOTALS_AMOUNT_OWING = 'Helvetica'       # Amount Owing normal

# Footer section
FONT_PAYMENT_TERMS = 'Helvetica'             # Payment terms normal
FONT_BANK_DETAILS = 'Helvetica'              # Bank details normal
FONT_CONTACT_BAR = 'Helvetica'               # Blue bar text normal

# Rule: If you need bold, use 'Helvetica-Bold'
# Rule: If you need italic, use 'Helvetica-Oblique'
# Rule: If you need bold+italic, use 'Helvetica-BoldOblique'
```

---

### 5. Number Formatting Complete Rules
**Status:** FINALIZED FOR IMPLEMENTATION

**All Number Formatting Functions:**
```python
# ============================================
# NUMBER FORMATTING - Complete Rules
# ============================================

def format_currency(amount):
    """
    Format currency with proper alignment for decimal points.
    
    Rules:
    - Thousand separators: YES (1,000.00)
    - Zero values: Show as $ 0.00 (not blank, not dash)
    - Negative values: $ -3.00 (space after $, then minus)
    - Positive values: $  5.00 (two spaces after $ for alignment)
    - Always 2 decimal places
    """
    if amount == 0:
        return "$  0.00"  # Two spaces for alignment
    elif amount < 0:
        return f"$ -{abs(amount):,.2f}"  # One space, then minus
    else:
        return f"$  {amount:,.2f}"  # Two spaces for alignment

def format_quantity(qty):
    """
    Format quantity field.
    
    Rules:
    - Whole numbers: Show as integer (1, not 1.0)
    - Decimals: Show one decimal place (1.5)
    """
    if qty == int(qty):
        return f"{int(qty)}"  # 1
    else:
        return f"{qty:.1f}"   # 1.5

def format_discount(pct):
    """
    Format discount percentage.
    
    Rules:
    - Zero values: Show as empty string (not 0.00%)
    - Non-zero: Show with 2 decimals (5.00%, 10.50%)
    """
    if pct == 0 or pct is None:
        return ""  # Blank if no discount
    else:
        return f"{pct:.2f}%"  # 5.00%

def format_gst(rate):
    """
    Format GST rate.
    
    Rules:
    - Zero values: Show as empty string
    - Non-zero: Show as percentage without decimals (10%, not 10.0%)
    - Input is decimal (0.1 = 10%)
    """
    if rate == 0 or rate is None:
        return ""  # Blank if GST-free
    else:
        return f"{rate*100:.0f}%"  # 10%

# Example usage in tables:
line_item_data = [
    ['Description', 'Qty', 'Unit Price', 'Discount', 'GST', 'Amount'],
    [
        'Custom Orthotics',
        format_quantity(1),         # "1"
        format_currency(2500.00),   # "$  2,500.00"
        format_discount(0),         # "" (blank)
        format_gst(0),              # "" (blank)
        format_currency(2500.00)    # "$  2,500.00"
    ],
]

totals_data = [
    ['Subtotal', format_currency(5.00)],      # "$  5.00"
    ['TOTAL GST', format_currency(0.00)],     # "$  0.00"
    ['TOTAL', format_currency(5.00)],         # "$  5.00"
    ['Total Paid', format_currency(-3.00)],   # "$ -3.00"
    ['Amount Owing', format_currency(2.00)],  # "$  2.00"
]
```

---

### 2. Patient/Company Details Section ⚠️
**Current Status:** Layout described, but no exact measurements

**What's Missing:**
- Section height or row specifications
- Font sizes (name bold/larger - what size exactly?)
- Left column width vs right column width
- Spacing between name and address
- Practitioner info formatting (italics for "Practitioner:")
- Background color (if any)

**Should we add:**
```python
# Patient/Company section specifications
FONT_SIZE_PATIENT_NAME = 14  # Bold, larger
FONT_SIZE_PATIENT_ADDRESS = 10  # Normal
FONT_SIZE_REFERENCE = 10  # Normal
FONT_SIZE_PRACTITIONER = 10  # "Practitioner:" in italics
COL_PATIENT_LEFT = 10*cm
COL_PATIENT_RIGHT = 7*cm
# Total: 17cm ✓
```

---

### 3. Line Items Table Styling Details ⚠️
**Current Status:** Column widths defined, but styling incomplete

**What's Missing:**
- Row height for line items (is it fixed or auto?)
- Padding for header row vs data rows
- Font size for data rows (header is mentioned, data isn't)
- Border thickness specifications
- Alternate row background colors?
- Text wrapping behavior for long descriptions
- Vertical alignment (top, middle, bottom?)

**Should we add:**
```python
# Line items table styling
FONT_SIZE_LINE_HEADER = 11  # Blue header row
FONT_SIZE_LINE_DATA = 10    # Data rows
PADDING_LINE_HEADER = 8     # Header padding (points)
PADDING_LINE_DATA = 4       # Data padding (points)
BORDER_THICKNESS = 0.5      # Table borders (points)
ROW_HEIGHT_LINE_ITEMS = 0.7*cm  # Fixed or None for auto?
```

---

### 4. Footer Section Specifications ⚠️
**Current Status:** Layout described, but no exact measurements

**What's Missing:**
- Footer bar height
- Font sizes for different footer elements
- Payment terms text alignment and size
- Bank details text size (needs to fit - mentioned earlier)
- Contact bar padding/height
- Spacing between footer elements
- Footer position (fixed distance from bottom?)

**Should we add:**
```python
# Footer specifications
FOOTER_BAR_HEIGHT = 1*cm     # Blue contact bar height
FOOTER_MARGIN_TOP = 1.5*cm   # Space before footer
FONT_SIZE_PAYMENT_TERMS = 10 # "Please note..." text
FONT_SIZE_BANK_DETAILS = 9   # Smaller to fit
FONT_SIZE_CONTACT_BAR = 10   # White text in blue bar
FOOTER_PADDING = 6           # Padding inside footer bar (points)
```

---

### 5. Spacer/Gap Specifications ⚠️
**Current Status:** Some spacers defined (SMALL/MEDIUM/LARGE), but not all gaps specified

**What's Missing:**
- Gap between header and patient section
- Gap between patient section and line items
- Gap between line items and payment table
- Gap between payment table and financial summary
- Gap between financial summary and footer
- Gap between "Tax Invoice" title and patient section

**Current Spacers:**
```python
SPACER_SMALL = 0.3*cm
SPACER_MEDIUM = 0.5*cm
SPACER_LARGE = 1.0*cm
```

**Should we add specific usage:**
```python
# Specific spacer usage
GAP_HEADER_TO_PATIENT = SPACER_MEDIUM       # 0.5cm
GAP_PATIENT_TO_TITLE = SPACER_SMALL         # 0.3cm
GAP_TITLE_TO_LINEITEMS = SPACER_MEDIUM      # 0.5cm
GAP_LINEITEMS_TO_PAYMENTS = SPACER_MEDIUM   # 0.5cm
GAP_PAYMENTS_TO_TOTALS = SPACER_MEDIUM      # 0.5cm
GAP_TOTALS_TO_FOOTER = SPACER_LARGE         # 1.0cm (or 1.5cm as mentioned?)
```

---

### 6. Multi-page Handling ⚠️
**Current Status:** Not documented

**What's Missing:**
- How do page breaks work?
- Does header repeat on page 2+?
- Does footer appear on every page?
- How are long line item tables split?
- Payment table page break behavior
- Watermark on all pages or just page 1?

**Should we add:**
```python
# Multi-page specifications
HEADER_ON_CONTINUATION_PAGES = True  # or False?
FOOTER_ON_ALL_PAGES = True           # or False?
WATERMARK_ON_ALL_PAGES = True        # For receipts
MAX_LINE_ITEMS_PER_PAGE = None       # Auto or fixed?
```

---

### 7. Font Weight/Style Specifications ⚠️
**Current Status:** Some mentions of bold/italics, but not comprehensive

**What's Missing:**
- Exactly which fields are bold?
- Exactly which fields are italic?
- Are labels bold and values normal (or vice versa)?
- Financial summary labels vs values
- Patient name vs address formatting
- Invoice number formatting

**Should we add:**
```python
# Font styles
# Patient section
FONT_PATIENT_NAME = 'Helvetica-Bold'        # Bold
FONT_PATIENT_ADDRESS = 'Helvetica'          # Normal
FONT_REFERENCE_LABEL = 'Helvetica'          # Normal
FONT_PRACTITIONER_LABEL = 'Helvetica-Oblique'  # Italic "Practitioner:"

# Financial summary
FONT_TOTALS_LABEL = 'Helvetica'             # Normal (removed bold earlier)
FONT_TOTALS_VALUE = 'Helvetica'             # Normal (removed bold earlier)
FONT_TOTALS_TOTAL_ROW = 'Helvetica-Bold'    # TOTAL row bold?
FONT_TOTALS_AMOUNT_OWING = 'Helvetica-Bold' # Amount Owing bold?
```

---

### 8. Color Usage Comprehensive List ⚠️
**Current Status:** Some colors defined, but not all usages documented

**Current Colors:**
```python
COLOR_PRIMARY_BLUE = '#4897d2'
COLOR_GREY_LIGHT = '#f5f5f5'
COLOR_GREY_BORDER = '#cccccc'
COLOR_BLACK = '#000000'
```

**Missing Usage Details:**
- What gets the blue background? (just headers and footer bar?)
- What gets the light grey? (Total Paid row, alternate rows?)
- Border colors for different tables
- Text colors (all black or some grey?)

---

### 9. Number Formatting Comprehensive Rules ⚠️
**Current Status:** Problem 11 documents currency alignment, but not all number rules

**What's Missing:**
- Thousand separators: `1,000.00` or `1000.00`?
- Zero values: `$ 0.00` or `$     —` or blank?
- Quantity formatting: `1` or `1.0`?
- Discount formatting: `0.00%` or `0%` or blank if zero?
- GST percentage: Show `10%` in GST column or just checkmark/blank?

**Should we add:**
```python
# Number formatting rules
def format_currency(amount):
    """Format currency with proper alignment"""
    if amount == 0:
        return "$  0.00"  # or "$     —" or ""?
    elif amount < 0:
        return f"$ -{abs(amount):,.2f}"
    else:
        return f"$  {amount:,.2f}"

def format_quantity(qty):
    """Format quantity"""
    return f"{qty:.0f}" if qty == int(qty) else f"{qty:.1f}"

def format_discount(pct):
    """Format discount percentage"""
    return f"{pct:.2f}%" if pct > 0 else ""  # or "0.00%"?

def format_gst(rate):
    """Format GST rate"""
    return f"{rate*100:.0f}%" if rate > 0 else ""
```

---

### 10. Border/Line Specifications ⚠️
**Current Status:** Mentions of lines, but not comprehensive

**What's Missing:**
- Line thickness (0.5pt, 1pt, 1.5pt - where exactly?)
- Line colors (all black or some blue?)
- Which tables have borders vs which don't?
- Grid vs outer borders only?
- Top/bottom lines vs full grid?

**Should we add:**
```python
# Border/Line specifications
BORDER_THIN = 0.5      # Table grid lines (points)
BORDER_MEDIUM = 1      # Section separators (points)
BORDER_THICK = 1.5     # Emphasis lines (points)

# Line usage
LINE_COLOR_BLACK = colors.black
LINE_COLOR_BLUE = colors.HexColor('#4897d2')

# Which tables have what borders?
LINE_ITEMS_TABLE_BORDERS = 'GRID'  # Full grid
PAYMENT_TABLE_BORDERS = 'GRID'     # Full grid
TOTALS_TABLE_BORDERS = 'LINES'     # Just horizontal lines above certain rows
```

---

## Summary of Gaps

### 🔴 **High Priority Missing Items:**
1. **Header section** - Exact column widths and measurements
2. **Spacer usage** - Specific gaps between all sections
3. **Font styles** - Complete bold/italic specifications
4. **Number formatting** - Comprehensive rules for all number types

### 🟡 **Medium Priority Missing Items:**
5. **Patient/Company section** - Exact measurements and fonts
6. **Line items styling** - Complete styling details
7. **Footer specifications** - Exact measurements
8. **Multi-page handling** - How page breaks work

### 🟢 **Low Priority Missing Items:**
9. **Border specifications** - Complete border rules
10. **Color usage** - Comprehensive list of what gets what color

---

## Recommendation

**Should we add sections for these missing items to make the document truly complete for implementation?**

Your choice:
1. ✅ **Add all missing specifications** - Make document 100% complete
2. ⏸️ **Add only critical items** (Header, Spacers, Fonts, Numbers)
3. 🚫 **Document is good enough** - We can figure out details during implementation

What would you like to do? 🤔

---

## Next Actions

**Cannot proceed with implementation until we:**
1. ✋ Answer Critical Questions 1-4
2. ✋ Confirm layout approach
3. ✋ Design receipt structure
4. ✋ Define receipt numbering

**Once decisions are made, we can:**
1. ✅ Implement fixed row heights (Phase 1)
2. ✅ Fix invoice with payments spacing
3. ✅ Test and verify consistency
4. ✅ Implement receipt generation (Phase 2)
5. ✅ Test all 4 document types

---

## Summary of Blockers

**🔴 BLOCKING IMPLEMENTATION:**
- Spacing inconsistency (technical problem - needs fixed row heights)
- Receipt design decisions (business decision needed)
- Receipt numbering approach (business decision needed)

**🟡 BLOCKING RECEIPT FEATURE:**
- Payment method field (database change needed)
- Receipt layout approval (design decision needed)

**🟢 NON-BLOCKING:**
- Quote terminology (minor refinement)
- Batch payments (edge case)
- Email integration (separate feature)

---

**What problems should we tackle first?** Let's prioritize and solve them systematically! 💪


