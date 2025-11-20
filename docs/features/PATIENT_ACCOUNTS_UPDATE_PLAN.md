# Patient Accounts Page Update Plan

## 🔍 Deep Dive Analysis

### **Current State Comparison**

#### **Main Accounts | Quotes Page** (`/xero/invoices-quotes`)
**Location:** `frontend/app/xero/invoices-quotes/page.tsx`

**Features:**
✅ View all invoices and quotes (system-wide)
✅ Search by invoice/quote number, patient, company
✅ Filter by status (All, Draft, Awaiting Payment, Paid, Overdue, etc.)
✅ Tabs: All, Invoices, Quotes
✅ **Email functionality** (📧 Send Invoice/Receipt/Quote via email) ⭐
✅ Send to Xero (authorize draft invoices)
✅ Convert Quote to Invoice
✅ Edit draft invoices
✅ Download PDF (invoice, quote, receipt)
✅ Download Debug PDF
✅ Delete invoices/quotes
✅ View details (modal)
✅ Create new invoice/quote (Quick Create, Detailed Create)
✅ Patient/Company selection in modals

**Action Buttons:**
- 👁️ View Details
- 📧 **Email Invoice/Receipt/Quote** ⭐ **MISSING FROM PATIENT PAGE**
- 📤 Send to Xero (draft invoices)
- 🔄 Convert Quote to Invoice
- ✏️ Edit (draft invoices)
- 📥 Download PDF
- 📥 Download Debug PDF
- 🧾 Download Receipt (paid invoices)
- 🗑️ Delete

---

#### **Patient Accounts | Quotes Page** (`/patients/[id]/accounts-quotes`)
**Location:** `frontend/app/patients/[id]/accounts-quotes/page.tsx`

**Features:**
✅ View invoices and quotes for **specific patient only**
✅ Search by invoice/quote number
✅ Filter by status
✅ Tabs: All, Invoices, Quotes
❌ **NO Email functionality** ⚠️ **THIS IS THE GAP**
✅ Send to Xero
✅ Convert Quote to Invoice
✅ Edit draft invoices
✅ Download PDF
✅ Download Debug PDF
✅ Download Receipt (paid invoices)
✅ Delete
✅ View details
✅ Create new invoice/quote (pre-filled with patient)
✅ Back button to patient profile

**Action Buttons:**
- 👁️ View Details
- ❌ **Email Invoice/Receipt/Quote** ⚠️ **MISSING**
- 📤 Send to Xero
- 🔄 Convert Quote to Invoice
- ✏️ Edit (draft invoices)
- 📥 Download PDF
- 📥 Download Debug PDF
- 🧾 Download Receipt
- 🗑️ Delete

---

## 🎯 **What's Missing from Patient Accounts Page?**

### **Critical Missing Feature: EMAIL FUNCTIONALITY** 📧

The patient accounts page is **missing the entire email system** that exists on the main Accounts | Quotes page.

#### **What needs to be added:**

1. **Email Button** 📧
   - Icon: `IconMail` (envelope icon)
   - Position: Between "View Details" and "Send to Xero"
   - Functionality: Opens `EmailInvoiceModal`
   - Should appear for: ALL invoices and quotes (not just paid ones)

2. **Email Modal Integration**
   - Import: `EmailInvoiceModal` from `'../../../components/xero/EmailInvoiceModal'`
   - State: `emailModalOpened`, `selectedEmailItem`, `selectedEmailType`
   - Modal should handle:
     - **Invoices:** Send invoice email
     - **Receipts:** Send receipt email (for paid invoices)
     - **Quotes:** Send quote email

3. **Email Logic**
   - For **invoices:**
     - If `amount_due === 0` (fully paid): Option to send as "Invoice" or "Receipt"
     - If `amount_due > 0` (unpaid/partial): Send as "Invoice"
   - For **quotes:**
     - Send as "Quote"

---

## 📋 **Implementation Plan**

### **Phase 1: Add Email Button to Action Column** ✅
**File:** `frontend/app/patients/[id]/accounts-quotes/page.tsx`

1. Import `IconMail` from `@tabler/icons-react`
2. Import `EmailInvoiceModal` component
3. Add state for email modal:
   ```typescript
   const [emailModalOpened, setEmailModalOpened] = useState(false);
   const [selectedEmailItem, setSelectedEmailItem] = useState<any>(null);
   const [selectedEmailType, setSelectedEmailType] = useState<'invoice' | 'receipt' | 'quote'>('invoice');
   ```

4. Add `handleEmailClick` function:
   ```typescript
   const handleEmailClick = (item: CombinedItem) => {
     setSelectedEmailItem(item);
     
     if (item.type === 'quote') {
       setSelectedEmailType('quote');
     } else if (item.type === 'invoice') {
       // Check if fully paid
       const amountDue = parseFloat((item as any).amount_due || '0');
       setSelectedEmailType(amountDue === 0 ? 'receipt' : 'invoice');
     }
     
     setEmailModalOpened(true);
   };
   ```

5. Add Email button in the action buttons section (line ~658):
   ```tsx
   <Tooltip label="Email Invoice/Quote">
     <ActionIcon
       variant="subtle"
       color="blue"
       onClick={() => handleEmailClick(item)}
     >
       <IconMail size={16} />
     </ActionIcon>
   </Tooltip>
   ```

6. Add Email Modal at the bottom (before closing `</Navigation>`):
   ```tsx
   <EmailInvoiceModal
     opened={emailModalOpened}
     onClose={() => {
       setEmailModalOpened(false);
       setSelectedEmailItem(null);
     }}
     invoice={selectedEmailItem}
     type={selectedEmailType}
   />
   ```

---

### **Phase 2: Test Email Functionality** ✅

1. **Test Scenarios:**
   - ✅ Send draft invoice email
   - ✅ Send authorized invoice email
   - ✅ Send paid invoice as receipt
   - ✅ Send quote email
   - ✅ Verify email modal shows correct recipient (patient email)
   - ✅ Verify email modal shows correct from address
   - ✅ Verify PDF attachment works
   - ✅ Verify email sends successfully

2. **Edge Cases:**
   - Patient without email address (should show error)
   - Invoice without patient (company-only) - should still work
   - Partially paid invoice (should send as invoice, not receipt)

---

### **Phase 3: Ensure Feature Parity** ✅

**Compare both pages to ensure patient accounts page has ALL features:**

| Feature | Main Page | Patient Page | Status |
|---------|-----------|--------------|--------|
| View Details | ✅ | ✅ | ✅ Match |
| **Email** | ✅ | ❌ | ⚠️ **TO ADD** |
| Send to Xero | ✅ | ✅ | ✅ Match |
| Convert Quote | ✅ | ✅ | ✅ Match |
| Edit Draft | ✅ | ✅ | ✅ Match |
| Download PDF | ✅ | ✅ | ✅ Match |
| Debug PDF | ✅ | ✅ | ✅ Match |
| Download Receipt | ✅ | ✅ | ✅ Match |
| Delete | ✅ | ✅ | ✅ Match |
| Create Quick | ✅ | ✅ | ✅ Match |
| Create Detailed | ✅ | ✅ | ✅ Match |
| Search | ✅ | ✅ | ✅ Match |
| Filter | ✅ | ✅ | ✅ Match |
| Tabs | ✅ | ✅ | ✅ Match |

---

## 🎨 **UI/UX Considerations**

### **Button Order (Recommended):**
```
[View] [Email] [Send to Xero] [Convert] [Edit] [PDF] [Debug] [Receipt] [Delete]
  👁️     📧        📤           🔄      ✏️     📥     📥      🧾       🗑️
```

### **Color Coding:**
- **Email:** Blue (`color="blue"`)
- **Send to Xero:** Teal (`color="teal"`)
- **Convert:** Violet (`color="violet"`)
- **Edit:** Gray (`color="gray"`)
- **Download:** Green (`color="green"`)
- **Receipt:** Violet (`color="violet"`)
- **Delete:** Red (`color="red"`)

---

## 🔒 **Security & Permissions**

- Email functionality should respect existing authentication
- User must have valid Gmail connection
- If Gmail connection fails, show reconnect modal (already implemented in `EmailInvoiceModal`)

---

## 📝 **Code Quality Standards**

1. ✅ Use existing `EmailInvoiceModal` component (don't reinvent)
2. ✅ Follow existing patterns from main Accounts | Quotes page
3. ✅ Maintain consistent button styling and tooltips
4. ✅ Add proper TypeScript types
5. ✅ Include error handling
6. ✅ Add loading states if needed
7. ✅ Commit with clear message

---

## 🚀 **Estimated Effort**

- **Time:** ~30 minutes
- **Complexity:** Low (reusing existing components)
- **Risk:** Very low (well-tested component)
- **Files to modify:** 1 file (`frontend/app/patients/[id]/accounts-quotes/page.tsx`)

---

## ✅ **Success Criteria**

1. ✅ Email button appears in action column for all invoices/quotes
2. ✅ Email modal opens with correct pre-filled data
3. ✅ Emails send successfully
4. ✅ PDF attachments work
5. ✅ Receipt emails work for paid invoices
6. ✅ Quote emails work
7. ✅ No regressions to existing functionality
8. ✅ Code follows existing patterns
9. ✅ Proper error handling

---

## 🎯 **Summary**

**Problem:** Patient accounts page is missing email functionality that exists on main Accounts | Quotes page.

**Solution:** Add email button and integrate existing `EmailInvoiceModal` component.

**Benefit:** Users can email invoices/receipts/quotes directly from patient profile without navigating to main Accounts | Quotes page.

**Approach:** Reuse 100% of existing email infrastructure - just wire it up to the patient accounts page.

---

**Ready to implement? Let me know and I'll add the email functionality!** 🚀

