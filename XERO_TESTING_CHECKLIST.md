# 🧪 Xero Integration - Testing Checklist

**Branch:** `xero`  
**Test Environment:** Demo Company (AU)  
**Date:** November 16, 2025

---

## ✅ **Pre-Test Setup**

- [x] Connected to Demo Company (AU)
- [x] Verified organization switcher works
- [x] All 3 core pages accessible (Contacts, Invoices, Quotes)
- [x] Creation dialogs integrated

---

## 🧪 **Test Scenarios**

### **1. Organization Switching** ⏳
- [ ] Navigate to `/xero/settings`
- [ ] Verify dropdown shows all 4 organizations
- [ ] Switch to "Demo Company (AU)"
- [ ] Verify success notification appears
- [ ] Verify page shows "Connected to Demo Company (AU)"
- [ ] Switch back to production org
- [ ] Verify switch works both ways

**Expected Result:** Seamless switching between organizations without re-authentication

---

### **2. Contacts Page** ⏳
- [ ] Navigate to `/xero/contacts`
- [ ] Verify page loads without errors
- [ ] Check stats cards show counts (Total, Patients, Companies)
- [ ] Search for a contact by name
- [ ] Filter by type (Patient/Company)
- [ ] Click "View in Xero" button - opens correct contact
- [ ] Verify table shows all columns correctly

**Expected Result:** All synced contacts displayed with accurate data and working filters

---

### **3. Invoices Page** ⏳
- [ ] Navigate to `/xero/invoices`
- [ ] Verify page loads without errors
- [ ] Check 8 stats cards (counts + financial totals)
- [ ] Search for an invoice by number or patient name
- [ ] Filter by status (Draft/Submitted/Paid)
- [ ] Click "View in Xero" button - opens correct invoice
- [ ] Verify financial calculations (Total, Paid, Due)

**Expected Result:** All invoices displayed with correct status and amounts

---

### **4. Invoice Creation** ⏳
- [ ] Click "Create Invoice" button
- [ ] Modal opens successfully
- [ ] Select "Patient" contact type
- [ ] Search and select a patient (verify MRN shows)
- [ ] Set invoice date (today) and due date (14 days)
- [ ] Add line item: "Test Service - $100"
- [ ] Verify subtotal shows $100
- [ ] Verify tax shows $10 (10% GST)
- [ ] Verify total shows $110
- [ ] Add 2nd line item: "Consultation - $150"
- [ ] Verify totals update ($250 subtotal, $25 tax, $275 total)
- [ ] Remove 2nd line item
- [ ] Verify totals update back to $110
- [ ] Click "Create Invoice"
- [ ] Verify success notification
- [ ] Verify modal closes
- [ ] Verify invoice appears in list
- [ ] Open invoice in Xero - verify all details correct

**Expected Result:** Invoice created successfully with correct contact, line items, and totals

---

### **5. Invoice Creation (Company Contact)** ⏳
- [ ] Click "Create Invoice" button
- [ ] Select "Company" contact type
- [ ] Search and select a company (verify ABN shows)
- [ ] Add line item: "Corporate Service - $500"
- [ ] Verify total shows $550 (with GST)
- [ ] Add reference: "PO-12345"
- [ ] Add billing notes: "Net 30 payment terms"
- [ ] Click "Create Invoice"
- [ ] Verify success notification
- [ ] Open invoice in Xero
- [ ] Verify company is primary contact
- [ ] Verify reference and notes appear

**Expected Result:** Invoice with company as primary contact created successfully

---

### **6. Quotes Page** ⏳
- [ ] Navigate to `/xero/quotes`
- [ ] Verify page loads without errors
- [ ] Check 5 stats cards
- [ ] Search for a quote
- [ ] Filter by status (Draft/Sent/Accepted)
- [ ] Click "View in Xero" button - opens correct quote
- [ ] Find a quote with status "SENT" or "ACCEPTED"
- [ ] Click "Convert to Invoice" button
- [ ] Confirm conversion
- [ ] Verify success notification
- [ ] Verify quote status changes to "INVOICED"
- [ ] Verify converted invoice number appears in table
- [ ] Click invoice number - navigate to invoice in Xero

**Expected Result:** Quote-to-invoice conversion works seamlessly

---

### **7. Quote Creation** ⏳
- [ ] Click "Create Quote" button
- [ ] Modal opens successfully
- [ ] Select "Patient" contact type
- [ ] Select a patient
- [ ] Set quote date (today)
- [ ] Set expiry date (30 days from now)
- [ ] Add line item: "Assessment - $200"
- [ ] Add line item: "Treatment Plan - $300"
- [ ] Verify total shows $550 (with GST)
- [ ] Add notes: "Quote valid for 30 days"
- [ ] Click "Create Quote"
- [ ] Verify success notification
- [ ] Verify quote appears in list with status "DRAFT"
- [ ] Open quote in Xero
- [ ] Verify all details correct
- [ ] Verify expiry date is 30 days from today

**Expected Result:** Quote created successfully with correct details and expiry

---

### **8. Quote Creation (Company Contact)** ⏳
- [ ] Create quote with company as primary contact
- [ ] Add line items totaling $1000+
- [ ] Verify totals calculate correctly
- [ ] Create quote
- [ ] Verify company appears as primary contact in Xero

**Expected Result:** Quote with company contact created successfully

---

### **9. Error Handling** ⏳
**Invoice Creation Errors:**
- [ ] Try to create invoice without selecting contact - verify error
- [ ] Try to create invoice with empty description - verify error
- [ ] Try to create invoice with $0 amount - verify error
- [ ] Try to remove last line item - verify disabled/error

**Quote Creation Errors:**
- [ ] Same validation tests as invoices
- [ ] Verify all errors show clear notifications

**Expected Result:** All validation errors caught and displayed clearly

---

### **10. Multi-tenant Safety** ⏳
- [ ] Switch to Demo Company
- [ ] Create a test invoice
- [ ] Verify it appears in Demo Company in Xero (not production)
- [ ] Switch back to production org
- [ ] Verify Demo Company invoice does NOT appear in production list
- [ ] Create invoice in production
- [ ] Verify it only appears in production org

**Expected Result:** Complete separation between Demo Company and production data

---

## 🐛 **Known Issues to Watch For**

- Token expiry (should auto-refresh)
- Large patient/company lists (pagination)
- Network errors (should show clear messages)
- Concurrent invoice creation (race conditions)

---

## 📊 **Test Results**

**Overall Status:** ⏳ NOT STARTED

**Issues Found:**
_Record any bugs or issues here_

**Performance Notes:**
_Record any performance concerns_

---

## ✅ **Sign-Off**

- [ ] All test scenarios passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Ready for production deployment

**Tested by:** _____________  
**Date:** _____________

---

## 🚀 **Next Steps After Testing**

1. **If tests pass:**
   - Merge `xero` branch to `main`
   - Update deployment documentation
   - Deploy to production
   - Monitor for errors

2. **If tests fail:**
   - Document issues
   - Fix critical bugs
   - Re-test
   - Repeat until all tests pass

---

**Ready to start testing!** 🧪

