# CSRF Token Fix - Comprehensive List

**Problem:** Many POST/PUT/DELETE requests are missing CSRF tokens, causing "CSRF Failed: CSRF token missing" errors.

**Solution:** Add `X-CSRFToken` header and `credentials: 'include'` to all mutation requests.

---

## ✅ Fixed Files

1. ✅ `PaymentModal.tsx` - Payment creation

---

## 🔴 Files Needing CSRF Fixes

### Xero Components (High Priority)

1. **EmailInvoiceModal.tsx**
   - POST `/api/invoices/send-email/` ✅ HAS credentials, NEEDS CSRF

2. **PatientInvoicesQuotes.tsx** (3 issues)
   - DELETE `/api/xero-invoice-links/{id}/`
   - DELETE `/api/xero-quote-links/{id}/`
   - POST `/api/xero-invoice-links/{id}/authorize/`
   - POST `/api/xero-quote-links/{id}/authorize/`
   - POST `/api/xero-quote-links/{id}/convert_to_invoice/`

3. **InvoiceDetailModal.tsx**
   - DELETE `/api/xero-invoice-links/{id}/`

4. **CreateQuoteModal.tsx**
   - POST `/api/xero/quotes/create/`

5. **CreateInvoiceModal.tsx**
   - POST `/api/xero/invoices/create/`

6. **QuoteDetailModal.tsx**
   - POST `/api/xero-quote-links/{id}/convert_to_invoice/`

7. **QuickCreateModal.tsx**
   - POST `/api/xero/invoices/create/` or `/api/xero/quotes/create/`

8. **EditInvoiceModal.tsx**
   - PUT `/api/xero-invoice-links/{id}/`

9. **CreateInvoiceDialog.tsx**
   - POST `/api/xero/invoices/create/`

### Settings Components

10. **GmailIntegration.tsx**
    - Check for POST/DELETE requests

11. **EmailTemplateManager.tsx**
    - Check for POST/PUT/DELETE requests

12. **XeroIntegration.tsx**
    - Check for POST requests

13. **SMSIntegration.tsx**
    - Check for POST requests

14. **NotesTest.tsx**
    - Check for POST/DELETE requests

15. **FundingSourcesSettings.tsx**
    - Check for POST/PUT/DELETE requests

16. **ATReport.tsx** + AT Report Parts
    - Check for POST requests

17. **DataManagementSettings.tsx**
    - Check for POST/DELETE requests

18. **ImageUploadTest.tsx**
    - Check for POST requests

19. **BatchUpload.tsx**
    - Check for POST requests

20. **S3Integration.tsx**
    - Check for POST requests

### Page Components

21. **xero/invoices-quotes/page.tsx** (Already has credentials, needs CSRF)
    - DELETE `/api/xero-invoice-links/{id}/` ✅ HAS credentials, NEEDS CSRF
    - DELETE `/api/xero-quote-links/{id}/` ✅ HAS credentials, NEEDS CSRF
    - POST `/api/xero-invoice-links/{id}/authorize/` ✅ HAS credentials, NEEDS CSRF
    - POST `/api/xero-quote-links/{id}/convert_to_invoice/` ✅ HAS credentials, NEEDS CSRF

22. **xero/payments/batch/page.tsx**
    - Check for POST requests

23. **patients/[id]/accounts-quotes/page.tsx**
    - Check for POST/DELETE requests

24. **xero/quotes/page.tsx**
    - Check for POST/DELETE requests

25. **patients/page.tsx**
    - Check for POST/DELETE requests

### Dialog Components

26. **ImagesDialog.tsx**
    - Check for POST/DELETE requests

27. **DocumentsDialog.tsx**
    - Check for POST/DELETE requests

28. **PatientLettersDialog.tsx**
    - Check for POST/DELETE requests

29. **NotesDialog.tsx**
    - Check for POST/DELETE requests

30. **SMSDialog.tsx**
    - Check for POST requests

### Other Components

31. **ClinicCalendar.tsx**
    - Check for POST/PUT/DELETE requests

32. **letters/LetterEditor.tsx**
    - Check for POST requests

---

## Implementation Pattern

For each file, follow this pattern:

### 1. Add Import
```typescript
import { getCsrfToken } from '../../utils/csrf';
// or adjust path as needed: '../utils/csrf', '../../utils/csrf', etc.
```

### 2. Update Fetch Call
```typescript
// BEFORE
const response = await fetch('https://localhost:8000/api/endpoint/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});

// AFTER
const csrfToken = await getCsrfToken();
const response = await fetch('https://localhost:8000/api/endpoint/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken,
  },
  credentials: 'include',
  body: JSON.stringify(data),
});
```

---

## Priority Order

1. **Critical (User-facing operations)**
   - EmailInvoiceModal (sending emails)
   - CreateInvoiceModal, CreateQuoteModal (creating docs)
   - PatientInvoicesQuotes (delete, authorize, convert)
   - PaymentModal ✅ DONE

2. **High (Common operations)**
   - EditInvoiceModal (updating)
   - InvoiceDetailModal, QuoteDetailModal (delete, convert)
   - xero/invoices-quotes/page (bulk operations)

3. **Medium (Settings)**
   - All Settings components

4. **Lower (Dialogs)**
   - All Dialog components

---

## Testing Checklist

After each fix, test:
- ✅ Operation completes successfully
- ✅ No CSRF errors in console
- ✅ Data is saved/deleted correctly
- ✅ Proper success/error notifications appear

---

## Estimated Files: 30+
## Estimated Fetch Calls: 50+

**Strategy:** Fix in batches of 5-10 files, commit, test, repeat.

