# [Dialog Name]

**Component:** `ComponentName`  
**Status:** ❌ Not Built | 🚧 In Progress | ✅ Built  
**Last Updated:** [Date]

---

## 📋 **Purpose**

Brief description of what this dialog does and when it's used.

---

## 🎨 **UI Components**

### **Dialog Structure**
- [ ] Header/Title
- [ ] Form fields
- [ ] Action buttons (Save, Cancel, etc.)
- [ ] Validation messages

### **Fields**
1. **Field Name**
   - Type: [input type]
   - Required: Yes/No
   - Validation: [rules]
   - Default: [value]

2. **Field Name**
   - Type: [input type]
   - Required: Yes/No
   - Validation: [rules]
   - Default: [value]

---

## 📊 **Data Requirements**

### **Input Data**
- **Field** - Description, source (if editing existing)

### **Output Data**
- **Field** - What gets saved, where it goes

### **Data Validation**
- **Field** - Validation rules
- **Field** - Validation rules

---

## 🔌 **API Endpoints Needed**

### **GET Endpoint** (if editing)
- `GET /api/resource/:id` - Load existing data

### **POST Endpoint** (if creating)
- `POST /api/resource` - Create new record

### **PUT/PATCH Endpoint** (if editing)
- `PUT /api/resource/:id` - Update existing record

---

## 🗄️ **Database Requirements**

### **Tables Needed**
- **`table_name`** - Purpose

### **Fields Needed**
- **`table.field`** - Purpose, type, constraints

### **Missing Tables/Fields**
- ❌ **`missing_field`** - Needed for [feature]

---

## 🎯 **User Flow**

1. User action triggers dialog
2. Dialog opens with [initial state]
3. User fills in [fields]
4. Validation checks [rules]
5. User clicks [Save/Submit]
6. API call to [endpoint]
7. Dialog closes on success
8. Parent page refreshes/updates

---

## ✅ **Status Checklist**

- [ ] **Design** - UI mockup created
- [ ] **Component Built** - Dialog component created
- [ ] **Form Fields** - All fields implemented
- [ ] **Validation** - Validation rules implemented
- [ ] **API Endpoint** - Backend endpoint created
- [ ] **Database Field** - Database field created (if needed)
- [ ] **Connected** - Frontend connected to backend
- [ ] **Tested** - Functionality verified
- [ ] **Documented** - This doc completed

---

## 📝 **Notes**

- Decision: [what was decided]
- Requirement: [specific requirement]

---

## 🔗 **Related Pages/Dialogs**

- Used by: [page that opens this dialog]
- Related to: [other dialogs/pages]

---

**Template Version:** 1.0  
**Use this template for all new dialogs/modals**

