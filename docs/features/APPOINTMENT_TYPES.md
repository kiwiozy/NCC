# 📅 Appointment Types Feature

**Date:** November 13, 2025  
**Status:** ✅ COMPLETE & WORKING

---

## 🎯 **Overview**

The Appointment Types system allows clinics to define standard appointment types (e.g., "Assessment", "Fitting", "Follow-up") with default durations. When creating appointments, users can select a type which automatically sets the duration, improving consistency and speed.

---

## ✨ **Features**

### **Settings Management**
- ✅ View all appointment types in a clean table
- ✅ Add new appointment types
- ✅ Edit existing types (name, duration, active status)
- ✅ Delete appointment types
- ✅ Toggle active/inactive status
- ✅ Search and sort

### **Calendar Integration**
- ✅ Dropdown selection in "Create Appointment" dialog
- ✅ Auto-fills duration when type is selected
- ✅ User can still override duration manually
- ✅ Optional field (appointments can be created without a type)
- ✅ Shows duration hint in dropdown (e.g., "Assessment (30 min)")

---

## 📂 **Files Created/Modified**

### **Backend**
- ✅ `backend/appointments/models.py` - AppointmentType model (already existed)
- ✅ `backend/appointments/serializers.py` - Added AppointmentTypeSerializer
- ✅ `backend/appointments/views.py` - Added AppointmentTypeViewSet
- ✅ `backend/ncc_api/urls.py` - Added `/api/appointment-types/` route
- ✅ Migration `0004_appointmenttype_appointment_appointment_type.py` (already applied)

### **Frontend**
- ✅ `frontend/app/components/settings/AppointmentTypesSettings.tsx` - Settings UI (NEW)
- ✅ `frontend/app/components/SettingsHeader.tsx` - Added "Appointment Types" tab
- ✅ `frontend/app/settings/page.tsx` - Integrated new tab
- ✅ `frontend/app/components/dialogs/CreateAppointmentDialog.tsx` - Added type selection

---

## 🗄️ **Database Schema**

### **AppointmentType Model**

```python
class AppointmentType(models.Model):
    id = UUIDField (primary key)
    name = CharField (max 100, unique)
    default_duration_minutes = IntegerField (default 30)
    is_active = BooleanField (default True)
    created_at = DateTimeField (auto)
    updated_at = DateTimeField (auto)
```

### **Appointment Model Update**

```python
appointment_type = ForeignKey(
    AppointmentType,
    on_delete=SET_NULL,
    null=True,
    blank=True
)
```

---

## 🔌 **API Endpoints**

### **List Appointment Types**
```
GET /api/appointment-types/
```

**Query Parameters:**
- `include_inactive=true` - Include inactive types (default: false, only active)

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Assessment",
    "default_duration_minutes": 30,
    "is_active": true,
    "created_at": "2025-11-13T...",
    "updated_at": "2025-11-13T..."
  }
]
```

### **Create Appointment Type**
```
POST /api/appointment-types/
Content-Type: application/json
X-CSRFToken: <token>

{
  "name": "New Fitting",
  "default_duration_minutes": 15,
  "is_active": true
}
```

### **Update Appointment Type**
```
PUT /api/appointment-types/{id}/
Content-Type: application/json
X-CSRFToken: <token>

{
  "name": "Updated Name",
  "default_duration_minutes": 45,
  "is_active": false
}
```

### **Delete Appointment Type**
```
DELETE /api/appointment-types/{id}/
X-CSRFToken: <token>
```

**Note:** Deleting a type doesn't affect existing appointments using it (FK is SET_NULL).

---

## 🎨 **User Interface**

### **Settings Page**
**Location:** `Settings → Appointment Types`

**Features:**
- Clean table showing: Name, Duration, Status
- "Add Type" button
- Edit/Delete actions for each type
- Search and sort functionality

**Add/Edit Modal Fields:**
- Name (required, text)
- Default Duration (required, number, 5-240 minutes)
- Active (toggle switch)

### **Create Appointment Dialog**
**Location:** Calendar → "New Appointment"

**New Field:**
- **Appointment Type** dropdown
- Shows: "Name (Duration min)" format
- Description: "Selecting a type will auto-fill the duration"
- Clearable (optional field)
- Auto-fills duration when selected

---

## 📊 **Default Appointment Types**

The system comes pre-populated with:

| Name | Duration | Active |
|------|----------|--------|
| Assessment | 30 min | ✅ |
| Fitting | 15 min | ✅ |
| Follow-up | 15 min | ✅ |
| Consultation | 30 min | ✅ |
| Review | 20 min | ✅ |

*You can modify or delete these as needed.*

---

## 🔄 **Workflow Example**

### **Setup (One-time)**
1. Go to **Settings → Appointment Types**
2. Review pre-populated types
3. Add custom types (e.g., "Initial Assessment - 60 min")
4. Edit durations as needed for your clinic

### **Daily Use**
1. Click **"New Appointment"** on calendar
2. Select patient and clinic
3. **Select appointment type** (e.g., "Assessment")
4. ✨ **Duration automatically fills to 30 min**
5. Adjust time if needed (can override)
6. Save appointment

---

## ✅ **Benefits**

1. **Consistency:** Ensures standard appointment durations across the clinic
2. **Speed:** No need to manually enter duration each time
3. **Flexibility:** Can still override duration if needed
4. **Organization:** Clear appointment categories
5. **Reporting:** Can filter/report by appointment type (future feature)

---

## 🧪 **Testing Checklist**

### **Settings Page**
- ✅ Can view all appointment types
- ✅ Can add new type
- ✅ Can edit existing type
- ✅ Can delete type
- ✅ Can toggle active/inactive
- ✅ CSRF token included in requests
- ✅ Success/error notifications work

### **Calendar Integration**
- ✅ Dropdown shows all active types
- ✅ Selecting type auto-fills duration
- ✅ Can create appointment without type (optional)
- ✅ Can override duration after selecting type
- ✅ Appointment saves with selected type
- ✅ Duration shown in dropdown label

---

## 🚀 **Future Enhancements**

**Possible additions (not implemented yet):**
- 📊 Reporting by appointment type
- 🎨 Color coding by type (optional, since clinics already have colors)
- 📝 Appointment type templates (include default notes)
- 📈 Analytics (most common types, average duration)
- 🔔 Type-specific reminders

---

## 📝 **Notes**

- **Color Coding:** Deliberately not implemented to avoid confusion with clinic colors
- **Optional Field:** Appointments can be created without a type
- **Backwards Compatible:** Existing appointments without types continue to work
- **Soft Delete:** Consider marking as inactive rather than deleting
- **Performance:** Active types are cached and fetched only when needed

---

## 🎓 **For Developers**

### **Adding New Fields**
If you want to add fields to `AppointmentType`:

1. Update `backend/appointments/models.py`
2. Create migration: `python manage.py makemigrations`
3. Apply migration: `python manage.py migrate`
4. Update serializer in `serializers.py`
5. Update frontend form in `AppointmentTypesSettings.tsx`

### **API Testing**
```bash
# List types
curl https://localhost:8000/api/appointment-types/ -H "Cookie: sessionid=..."

# Create type
curl -X POST https://localhost:8000/api/appointment-types/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: ..." \
  -d '{"name":"Test Type","default_duration_minutes":45}'
```

---

**Status:** ✅ Production Ready  
**Last Updated:** November 13, 2025  
**Tested By:** System  
**Approved:** Ready for use

