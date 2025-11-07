# 🎯 Approach: Building & Documenting Patients Page

**Strategy:** Build UI → Document needs → Identify gaps → Update database

---

## 📋 **Current Status**

### ✅ **What's Built**
- Patients page UI is complete (`/patients`)
- Left sidebar with patient list
- Right panel with patient detail form
- All fields are displayed and editable
- Search and filter functionality
- ContactHeader component

### ❌ **What's Missing**
- API connection (using mock data)
- Missing fields in Patient model
- Missing database fields

---

## 🔍 **Step 1: Document Current Page**

I've created `docs/architecture/pages/PatientsPage.md` which documents:
- All UI components
- All data fields displayed
- All API endpoints needed
- All database requirements

**Result:** Clear picture of what data is needed.

---

## 📊 **Step 2: Identify Missing Fields**

From the Patients page, these fields are missing from the Patient model:

### **High Priority (Visible in UI)**
1. `title` - Mr., Mrs., Ms., Dr.
2. `health_number` - Health number (separate from MRN)
3. `funding_type` - NDIS, Private, DVA, Workers Comp, Medicare
4. `clinic_id` - ForeignKey to Clinic (currently just a string)
5. `coordinator_name` - Coordinator name
6. `coordinator_date` - When coordinator assigned
7. `plan_start_date` - NDIS plan start date
8. `plan_end_date` - NDIS plan end date
9. `notes` - General notes field

### **Medium Priority (Could Use Existing)**
- Communication: Already in `contact_json` ✅
- Address: Already in `address_json` ✅
- Emergency: Already in `emergency_json` ✅

---

## 🎯 **Step 3: Recommended Approach**

### **Option A: Update Patient Model First (Recommended)**
1. Add missing fields to Patient model
2. Create migration
3. Update API serializers
4. Connect frontend to API
5. Test end-to-end

**Pros:**
- Database ready before connecting
- Clear data structure
- Easier to test

**Cons:**
- Need to update model before seeing it work

### **Option B: Connect API First, Then Add Fields**
1. Connect frontend to existing Patient API
2. See what's missing
3. Add fields incrementally

**Pros:**
- See working data immediately
- Add fields as needed

**Cons:**
- Multiple iterations
- Potential data inconsistencies

---

## 🛠️ **Recommended Workflow**

### **Phase 1: Database Updates (Today)**
1. ✅ Document current page (done)
2. Update Patient model with missing fields
3. Create Django migration
4. Run migration
5. Update API serializers

### **Phase 2: API Connection (Today)**
1. Update PatientViewSet to handle new fields
2. Test API endpoints
3. Update frontend to call real API
4. Replace mock data

### **Phase 3: Testing (Today)**
1. Test patient creation
2. Test patient editing
3. Test search/filter
4. Verify all fields save correctly

---

## 📝 **Implementation Plan**

### **Step 1: Update Patient Model**

Add these fields to `backend/patients/models.py`:

```python
# Add to Patient model:
title = models.CharField(max_length=10, choices=[...], blank=True)
health_number = models.CharField(max_length=50, blank=True, null=True)
funding_type = models.CharField(max_length=50, choices=[...], blank=True)
clinic = models.ForeignKey('clinicians.Clinic', on_delete=models.SET_NULL, null=True, blank=True)
coordinator_name = models.CharField(max_length=200, blank=True, null=True)
coordinator_date = models.DateField(blank=True, null=True)
plan_start_date = models.DateField(blank=True, null=True)
plan_end_date = models.DateField(blank=True, null=True)
notes = models.TextField(blank=True)
```

### **Step 2: Create Migration**
```bash
python manage.py makemigrations patients
python manage.py migrate
```

### **Step 3: Update Serializer**
Update `backend/patients/serializers.py` to include new fields

### **Step 4: Update Frontend**
Replace mock data with API calls in `frontend/app/patients/page.tsx`

---

## ✅ **Decision Points**

1. **Coordinator Storage:** Simple fields in Patient (recommended)
2. **Plan Dates:** Two separate DateFields (recommended)
3. **Funding Type:** CharField with choices (recommended)
4. **Clinic:** ForeignKey to Clinic model (required)

---

## 🚀 **Ready to Start?**

**Next Action:** Update Patient model with missing fields

Would you like me to:
1. **Update the Patient model** with all missing fields?
2. **Create the migration** for the new fields?
3. **Update the API serializers** to include new fields?
4. **Connect the frontend** to the real API?

Let's start with updating the model! 🎯

