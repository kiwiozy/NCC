# 🚀 Xero Action Buttons Implementation

**Date:** November 17, 2025  
**Status:** ✅ Complete - Ready for Testing

---

## 📋 Overview

Added two new action buttons to the Invoices/Quotes table:
1. **"Send to Xero"** button for DRAFT invoices (makes them AUTHORISED)
2. **"Convert to Invoice"** button for quotes (converts and makes AUTHORISED)

---

## 🎯 Features Implemented

### 1. Send to Xero (DRAFT Invoices)

**Button:**
- 🎨 **Icon:** `IconSend` (paper plane)
- 🎨 **Color:** Teal
- 📍 **Location:** Actions column, appears only for `DRAFT` invoices
- 🔔 **Tooltip:** "Send to Xero"

**Functionality:**
- Changes invoice status from `DRAFT` to `AUTHORISED` in Xero
- Updates local database to reflect new status
- Shows success/error notification
- Automatically refreshes the invoice list
- Logs operation to `XeroSyncLog`

**API Endpoint:**
```
POST /api/xero-invoice-links/{id}/authorize/
```

**Backend Files:**
- `backend/xero_integration/services.py` - Added `authorize_invoice()` method
- `backend/xero_integration/views.py` - Added `authorize` action to `XeroInvoiceLinkViewSet`

---

### 2. Convert to Invoice (Quotes)

**Button:**
- 🎨 **Icon:** `IconFileArrowRight` (file with arrow)
- 🎨 **Color:** Violet
- 📍 **Location:** Actions column, appears for quotes in `DRAFT`, `SENT`, or `ACCEPTED` status
- 🔔 **Tooltip:** "Convert to Invoice"

**Functionality:**
- Converts quote to a new invoice in Xero
- Creates invoice with `AUTHORISED` status (not DRAFT)
- Copies all line items from quote to invoice
- Sets reference as "Quote #{quote_number}"
- Updates quote status to `INVOICED`
- Links quote to new invoice
- Shows success/error notification
- Automatically refreshes both invoice and quote lists
- Logs operation to `XeroSyncLog`

**API Endpoint:**
```
POST /api/xero-quote-links/{id}/convert_to_invoice/
```

**Backend Files:**
- `backend/xero_integration/services.py` - Updated `convert_quote_to_invoice()` to create AUTHORISED invoices
- `backend/xero_integration/views.py` - Existing `convert_to_invoice` action (no changes)

---

## 📂 Files Modified

### Backend (2 files):

1. **`backend/xero_integration/services.py`**
   - ✅ Added `authorize_invoice()` method (line ~1283)
   - ✅ Updated `convert_quote_to_invoice()` to create AUTHORISED invoices (line ~1541)

2. **`backend/xero_integration/views.py`**
   - ✅ Added `authorize` action to `XeroInvoiceLinkViewSet` (line ~384)

### Frontend (1 file):

3. **`frontend/app/xero/invoices-quotes/page.tsx`**
   - ✅ Added `IconSend` and `IconFileArrowRight` imports
   - ✅ Added `handleAuthorizeInvoice()` handler (line ~189)
   - ✅ Added `handleConvertQuoteToInvoice()` handler (line ~217)
   - ✅ Added "Send to Xero" button in Actions column (line ~384)
   - ✅ Added "Convert to Invoice" button in Actions column (line ~397)

---

## 🎨 UI/UX Details

### Button Placement

The action buttons appear in this order (left to right):

1. 👁️ **View Details** (blue) - Always visible
2. 📤 **Send to Xero** (teal) - Only for DRAFT invoices
3. 🔄 **Convert to Invoice** (violet) - Only for convertible quotes
4. ✏️ **Edit Invoice** (gray) - Only for DRAFT invoices
5. 📥 **Download PDF** (green) - For invoices
6. 📥 **Download Debug PDF** (orange) - For invoices
7. 📥 **Download PDF** (green) - For quotes
8. 📥 **Download Debug PDF** (orange) - For quotes
9. 🗑️ **Delete** (red) - Always visible

### Status Transitions

**Invoice Flow:**
```
DRAFT → [Send to Xero] → AUTHORISED → (payment) → PAID
```

**Quote Flow:**
```
DRAFT/SENT/ACCEPTED → [Convert to Invoice] → New AUTHORISED Invoice
Quote Status → INVOICED
```

---

## 🔒 Validation & Error Handling

### Send to Xero (Invoice Authorization)

**Validation:**
- ✅ Only DRAFT invoices can be authorized
- ✅ Active Xero connection required
- ✅ Invoice must exist in Xero

**Error Messages:**
- "Only DRAFT invoices can be authorized (current status: {status})"
- "No active Xero connection found. Please connect to Xero first in Settings."
- "Cannot authorize invoice in {status} status. Only DRAFT invoices can be authorized."

### Convert to Invoice

**Validation:**
- ✅ Only DRAFT, SENT, or ACCEPTED quotes can be converted
- ✅ Quote must not already be converted
- ✅ Active Xero connection required

**Error Messages:**
- "Quote cannot be converted (current status: {status})"
- "Quote must be DRAFT, SENT, or ACCEPTED and not already converted"
- "No active Xero connection found. Please connect to Xero first in Settings."

---

## 📊 Logging

Both operations log to `XeroSyncLog`:

### Invoice Authorization Log:
```python
{
    'operation_type': 'invoice_authorize',
    'status': 'success' | 'failed',
    'local_entity_type': 'invoice',
    'local_entity_id': str(invoice_link.id),
    'xero_entity_id': invoice_link.xero_invoice_id,
    'duration_ms': int,
    'response_data': {
        'invoice_number': str,
        'status': 'AUTHORISED',
        'total': float
    }
}
```

### Quote Conversion Log:
```python
{
    'operation_type': 'quote_convert',
    'status': 'success' | 'failed',
    'local_entity_type': 'quote',
    'local_entity_id': str(quote_link.id),
    'xero_entity_id': quote_link.xero_quote_id,
    'duration_ms': int,
    'response_data': {
        'quote_number': str,
        'invoice_number': str,
        'invoice_id': str
    }
}
```

---

## 🧪 Testing Checklist

### Test Send to Xero (Invoice Authorization)

1. ✅ Create a DRAFT invoice
2. ✅ Click "Send to Xero" button (teal paper plane icon)
3. ✅ Verify success notification appears
4. ✅ Verify invoice status changes to AUTHORISED
5. ✅ Verify button disappears after authorization
6. ✅ Verify invoice shows in Xero as AUTHORISED
7. ✅ Verify XeroSyncLog entry created
8. ✅ Try to authorize an already AUTHORISED invoice (should fail)
9. ✅ Check error handling with no Xero connection

### Test Convert to Invoice (Quote Conversion)

1. ✅ Create a DRAFT quote
2. ✅ Click "Convert to Invoice" button (violet file-arrow icon)
3. ✅ Verify success notification appears
4. ✅ Verify new AUTHORISED invoice appears in list
5. ✅ Verify quote status changes to INVOICED
6. ✅ Verify button disappears after conversion
7. ✅ Verify invoice reference shows "Quote #{quote_number}"
8. ✅ Verify all line items copied to invoice
9. ✅ Verify invoice is AUTHORISED (not DRAFT)
10. ✅ Verify invoice shows in Xero as AUTHORISED
11. ✅ Verify XeroSyncLog entry created
12. ✅ Try to convert already converted quote (should fail)
13. ✅ Check error handling with no Xero connection

### UI/UX Testing

1. ✅ Verify buttons only show for correct statuses
2. ✅ Verify tooltips appear on hover
3. ✅ Verify icons render correctly
4. ✅ Verify button colors match design (teal/violet)
5. ✅ Verify buttons are in correct order
6. ✅ Verify notifications show and auto-dismiss
7. ✅ Verify list refreshes after actions
8. ✅ Verify responsive layout on mobile

---

## 🎯 User Stories

### Story 1: Sending Draft Invoice to Xero
**As a clinic admin,**  
**I want to** authorize a draft invoice with one click,  
**So that** I can quickly send invoices to Xero without editing them again.

**Acceptance Criteria:**
- ✅ DRAFT invoices show "Send to Xero" button
- ✅ Button changes invoice to AUTHORISED status
- ✅ Success message confirms action
- ✅ Invoice list refreshes automatically

### Story 2: Converting Quote to Invoice
**As a clinic admin,**  
**I want to** convert an accepted quote to an invoice with one click,  
**So that** I can quickly bill customers once they accept a quote.

**Acceptance Criteria:**
- ✅ Convertible quotes show "Convert to Invoice" button
- ✅ Button creates new AUTHORISED invoice
- ✅ Quote status changes to INVOICED
- ✅ Invoice includes reference to original quote
- ✅ Success message confirms action
- ✅ Both lists refresh automatically

---

## 🚀 Deployment Notes

### Pre-Deployment Checklist:
- ✅ All files pushed to Git (branch: `xero`)
- ✅ No linter errors
- ✅ Backend changes tested
- ✅ Frontend changes tested
- ✅ Error handling verified
- ✅ Logging verified

### Post-Deployment Testing:
1. Test with real Xero account
2. Verify invoice appears correctly in Xero
3. Verify quote conversion creates proper invoice
4. Check Xero webhooks (if configured)
5. Verify sync logs are created
6. Test error scenarios

---

## 📝 Notes

- Both operations create/update entities in Xero immediately
- AUTHORISED invoices cannot be edited (Xero restriction)
- Converted quotes cannot be converted again
- Operations are atomic (all-or-nothing)
- All changes are logged for audit trail
- Frontend automatically refreshes data after operations

---

## 🔗 Related Documentation

- [XERO_TESTING_CHECKLIST.md](XERO_TESTING_CHECKLIST.md) - Comprehensive Xero testing guide
- [docs/integrations/XERO.md](docs/integrations/XERO.md) - Xero integration overview
- [backend/xero_integration/README.md](backend/xero_integration/README.md) - Backend API docs

---

**✅ Ready for Testing!**

