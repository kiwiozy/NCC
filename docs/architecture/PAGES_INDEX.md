# 📄 Pages & Dialogs Documentation Index

**Purpose:** Track all pages and dialogs as they're built, documenting data requirements and database needs

**Approach:** Build → Document → Identify data needs → Design tables

---

## 📋 **Documentation Structure**

Each page/dialog gets its own markdown file documenting:
- Purpose and functionality
- UI components needed
- Data requirements
- API endpoints needed
- Database tables/fields required
- Status and progress

---

## ✅ **Built Pages**

### **Core Pages**

| Page | Route | Status | Doc | Data Needs |
|------|-------|--------|-----|------------|
| Dashboard | `/` | ✅ Built | [Dashboard.md](pages/Dashboard.md) | Appointments, Patients, Orders ❌ |
| Patients List | `/patients` | ✅ Built (UI) | [PatientsPage.md](pages/PatientsPage.md) | Patients ⚠️ (needs fields) |
| Calendar | `/calendar` | ✅ Built | [Calendar.md](pages/Calendar.md) | Appointments ✅ |
| Testing | `/testing` | ✅ Built | - | Integrations ✅ |
| Settings | `/settings` | ✅ Built | [Settings.md](pages/Settings.md) | Configuration ✅ |

### **Patient Pages**

| Page | Route | Status | Doc | Data Needs |
|------|-------|--------|-----|------------|
| Patient Detail | `/patients/[id]` | ❌ Not Built | [PatientDetail.md](pages/PatientDetail.md) | Patient, Appointments, Orders, Invoices, Documents |
| Patient Documents | `/patients/[id]/documents` | ❌ Not Built | [PatientDocuments.md](pages/PatientDocuments.md) | Documents ⚠️ |
| Patient Orders | `/patients/[id]/orders` | ❌ Not Built | [PatientOrders.md](pages/PatientOrders.md) | Orders ❌ |
| Patient Invoices | `/patients/[id]/invoices` | ❌ Not Built | [PatientInvoices.md](pages/PatientInvoices.md) | Invoices ❌ |

### **Orders Pages**

| Page | Route | Status | Doc | Data Needs |
|------|-------|--------|-----|------------|
| Orders List | `/orders` | ❌ Not Built | [OrdersList.md](pages/OrdersList.md) | Orders ❌ |
| Order Detail | `/orders/[id]` | ❌ Not Built | [OrderDetail.md](pages/OrderDetail.md) | Orders, Order Items, Invoices ❌ |
| Create Order | `/orders/new` | ❌ Not Built | [CreateOrder.md](pages/CreateOrder.md) | Orders ❌ |

### **Invoice Pages**

| Page | Route | Status | Doc | Data Needs |
|------|-------|--------|-----|------------|
| Invoices List | `/invoices` | ❌ Not Built | [InvoicesList.md](pages/InvoicesList.md) | Invoices ❌ |
| Invoice Detail | `/invoices/[id]` | ❌ Not Built | [InvoiceDetail.md](pages/InvoiceDetail.md) | Invoices, Line Items, Payments ❌ |
| Create Invoice | `/invoices/new` | ❌ Not Built | [CreateInvoice.md](pages/CreateInvoice.md) | Invoices, Orders ❌ |

### **Documents Pages**

| Page | Route | Status | Doc | Data Needs |
|------|-------|--------|-----|------------|
| Documents List | `/documents` | ⚠️ Partial | [DocumentsList.md](pages/DocumentsList.md) | Documents ⚠️ |
| Document Upload | Dialog | ⚠️ Partial | [DocumentUpload.md](dialogs/DocumentUpload.md) | Documents ⚠️ |

---

## 🎨 **Dialogs & Modals**

### **Patient Dialogs**

| Dialog | Component | Status | Doc | Data Needs |
|--------|-----------|--------|-----|------------|
| Create Patient | `CreatePatientDialog` | ❌ Not Built | [CreatePatientDialog.md](dialogs/CreatePatientDialog.md) | Patients ✅ |
| Edit Patient | `EditPatientDialog` | ❌ Not Built | [EditPatientDialog.md](dialogs/EditPatientDialog.md) | Patients ✅ |
| Patient Notes | `PatientNotesDialog` | ❌ Not Built | [PatientNotesDialog.md](dialogs/PatientNotesDialog.md) | Patient Notes? |
| Communication Dialog | `CommunicationDialog` | ✅ Built | [CommunicationDialog.md](dialogs/CommunicationDialog.md) | Patients ✅ |
| Coordinator Dialogs | `CoordinatorDialogs` | ✅ Built | [CoordinatorDialogs.md](dialogs/CoordinatorDialogs.md) | Patients ✅ |
| Reminder Dialog | `ReminderDialog` | ❌ Not Built | [ReminderDialog.md](dialogs/ReminderDialog.md) | Reminders ❌ |

### **Order Dialogs**

| Dialog | Component | Status | Doc | Data Needs |
|--------|-----------|--------|-----|------------|
| Create Order | `CreateOrderDialog` | ❌ Not Built | [CreateOrderDialog.md](dialogs/CreateOrderDialog.md) | Orders ❌ |
| Edit Order | `EditOrderDialog` | ❌ Not Built | [EditOrderDialog.md](dialogs/EditOrderDialog.md) | Orders ❌ |
| Order Status | `OrderStatusDialog` | ❌ Not Built | [OrderStatusDialog.md](dialogs/OrderStatusDialog.md) | Orders ❌ |

### **Invoice Dialogs**

| Dialog | Component | Status | Doc | Data Needs |
|--------|-----------|--------|-----|------------|
| Create Invoice | `CreateInvoiceDialog` | ❌ Not Built | [CreateInvoiceDialog.md](dialogs/CreateInvoiceDialog.md) | Invoices, Orders ❌ |
| Record Payment | `RecordPaymentDialog` | ❌ Not Built | [RecordPaymentDialog.md](dialogs/RecordPaymentDialog.md) | Payments ❌ |

### **Appointment Dialogs**

| Dialog | Component | Status | Doc | Data Needs |
|--------|-----------|--------|-----|------------|
| Create Appointment | `CreateAppointmentDialog` | ❌ Not Built | [CreateAppointmentDialog.md](dialogs/CreateAppointmentDialog.md) | Appointments ✅ |
| Edit Appointment | `EditAppointmentDialog` | ❌ Not Built | [EditAppointmentDialog.md](dialogs/EditAppointmentDialog.md) | Appointments ✅ |

---

## 📊 **Data Requirements Summary**

### **Tables Needed (from pages)**

- **`orders`** ❌ - Needed by: Orders pages, Patient Detail, Dashboard
- **`invoices`** ❌ - Needed by: Invoice pages, Patient Detail, Order Detail
- **`document_assets`** ❌ - Needed by: Documents pages, Patient Documents
- **`order_items`** ❌ (or JSON) - Needed by: Order Detail
- **`invoice_line_items`** ❌ (or JSON) - Needed by: Invoice Detail
- **`payments`** ❌ (or JSON) - Needed by: Invoice Detail, Payment dialog

### **Model Updates Needed**

- **`documents`** ⚠️ - Add `patient_id` FK, `encounter_id` FK

---

## 🎯 **Build Priority**

Based on page dependencies:

1. **Patient Detail** → Shows all patient data, reveals gaps
2. **Orders List & Detail** → Core business function
3. **Invoices List & Detail** → Depends on Orders
4. **Document pages** → Needs refactoring

---

## 📝 **Documentation Template**

Each page/dialog doc should include:

```markdown
# [Page/Dialog Name]

## Purpose
What this page/dialog does

## UI Components
- List of components/sections

## Data Requirements
- What data is displayed
- What data can be edited
- What data is needed from other pages

## API Endpoints Needed
- GET /api/...
- POST /api/...
- etc.

## Database Tables/Fields
- Tables needed
- Fields needed
- Relationships

## Status
- [ ] Designed
- [ ] Built
- [ ] Connected to API
- [ ] Tested

## Notes
Any specific requirements or decisions
```

---

**Last Updated:** November 4, 2025  
**Approach:** Build → Document → Design Database

