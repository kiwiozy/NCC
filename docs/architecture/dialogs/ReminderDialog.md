# Reminder Dialog

## Overview
Dialog for creating reminders from patient profile that appear in the calendar as a "waiting list" for scheduling.

**Last Updated:** 2025-01-15

---

## Purpose
Allows clinicians to create reminders from a patient's profile that:
1. Appear in the calendar as a "waiting list" or "reminders" section
2. Help track patients that need to be scheduled for appointments
3. Can be converted to actual appointments when scheduling

---

## UI Components

### Dialog Structure
- **Title**: "Add Reminder for [Patient Name]"
- **Size**: Medium (`md`) or Large (`lg`)
- **Close Button**: X icon in top right

### Input Fields

#### Patient Information (Read-only)
- **NAME** - Patient name (display only, pre-filled from selected patient)
- **HEALTH NUMBER** - Patient health number (display only, if available)

#### Reminder Details

**CLINIC** (Required)
- Dropdown to select clinic
- Options loaded from `/api/clinics/`
- Falls back to hardcoded list if API fails
- Used to assign reminder to specific clinic location

**SELECT NOTE** (Optional)
- Dropdown with predefined note templates
- Options: (To be defined - e.g., "Follow-up needed", "Review required", "Appointment pending")
- Or custom notes can be entered

**NOTE** (Optional)
- Large textarea for free-form reminder notes
- Placeholder: "Enter Note"
- Allows custom reminder details

### Action Buttons
- **Cancel** (left): Closes dialog without saving
- **Save** (right): Creates reminder and closes dialog

---

## Data Structure

### Backend Storage

**New Table: `reminders`** (to be created)

```python
class Reminder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='reminders')
    clinic = models.ForeignKey('clinicians.Clinic', on_delete=models.SET_NULL, null=True, blank=True)
    note_template = models.CharField(max_length=100, null=True, blank=True)  # Predefined note type
    note = models.TextField(null=True, blank=True)  # Custom note
    reminder_date = models.DateField(null=True, blank=True)  # Optional: specific date reminder
    status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),  # Converted to appointment
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ])
    created_by = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)  # When converted to appointment
    appointment_id = models.UUIDField(null=True, blank=True)  # Link to appointment if converted
```

**OR** (Simpler initial version):

```python
class Reminder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='reminders')
    clinic = models.ForeignKey('clinicians.Clinic', on_delete=models.SET_NULL, null=True, blank=True)
    note = models.TextField()  # Reminder note
    reminder_date = models.DateField(null=True, blank=True)  # Optional: specific date
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Frontend Interface

```typescript
interface Reminder {
  id: string;
  patient_id: string;
  patient_name: string;
  clinic_id?: string;
  clinic_name?: string;
  note?: string;
  note_template?: string;
  reminder_date?: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}
```

---

## Functionality

### Creating Reminder
1. User clicks "+" button next to "Reminder" label in patient profile
2. Dialog opens with patient name pre-filled
3. User selects clinic (required)
4. User optionally selects note template or enters custom note
5. User clicks "Save"
6. Reminder is created and appears in calendar "Reminders/Waiting List" section

### Calendar Integration
- Reminders appear in a dedicated "Reminders" or "Waiting List" section in calendar
- Can be filtered by clinic
- Shows patient name, clinic, and note
- Clicking reminder can convert to appointment or open patient profile

### Converting to Appointment
- When scheduling from calendar, reminders for that clinic/patient are visible
- User can convert reminder directly to appointment
- Reminder status changes to "scheduled" and links to appointment

---

## API Integration

### Create Reminder
```
POST /api/reminders/
```

**Request Body:**
```json
{
  "patient_id": "uuid",
  "clinic_id": "uuid",
  "note": "Follow-up needed",
  "reminder_date": "2025-01-20"  // optional
}
```

**Response:**
```json
{
  "id": "uuid",
  "patient": {
    "id": "uuid",
    "name": "Mr. Craig Laird"
  },
  "clinic": {
    "id": "uuid",
    "name": "Newcastle"
  },
  "note": "Follow-up needed",
  "status": "pending",
  "created_at": "2025-01-15T10:00:00Z"
}
```

### Get Reminders
```
GET /api/reminders/
GET /api/reminders/?clinic_id={uuid}
GET /api/reminders/?status=pending
GET /api/reminders/?patient_id={uuid}
```

### Update Reminder
```
PATCH /api/reminders/{id}/
```

### Delete Reminder
```
DELETE /api/reminders/{id}/
```

---

## Calendar Integration

### Waiting List/Reminders Section
- Separate section in calendar view
- Shows pending reminders (status = 'pending')
- Can be filtered by clinic
- Displays:
  - Patient name
  - Clinic name
  - Note preview
  - Reminder date (if set)
  - Actions: Convert to appointment, View patient, Delete

### Converting Reminder to Appointment
- Click "Schedule" button on reminder
- Opens appointment creation dialog
- Pre-fills patient and clinic
- After appointment created:
  - Reminder status → 'scheduled'
  - `appointment_id` set
  - Reminder removed from pending list (or shown as scheduled)

---

## Database Requirements

### New Table: `reminders`

**Fields:**
- `id` - UUID (primary key)
- `patient_id` - ForeignKey → `patients.Patient` (CASCADE)
- `clinic_id` - ForeignKey → `clinicians.Clinic` (SET_NULL, nullable)
- `note` - TextField - Reminder note
- `reminder_date` - DateField (optional) - Specific date reminder
- `status` - CharField - Choices: pending, scheduled, completed, cancelled
- `created_at` - DateTimeField
- `updated_at` - DateTimeField
- `appointment_id` - UUIDField (nullable) - Link to appointment if converted

**Relationships:**
- `patient` → `patients.Patient` (One-to-Many)
- `clinic` → `clinicians.Clinic` (Many-to-One, nullable)

**Indexes:**
- `['status']`
- `['clinic_id', 'status']`
- `['patient_id']`
- `['reminder_date']`

---

## Status

- [ ] Backend model created
- [ ] Backend API endpoints created
- [x] Frontend dialog component created ✅
- [ ] Calendar integration (waiting list section)
- [ ] Convert reminder to appointment functionality
- [x] Patient profile integration (add reminder button) ✅

---

## Next Steps

1. **Create Backend Model** - Add `Reminder` model to new or existing app
2. **Create API Endpoints** - CRUD operations for reminders
3. **Create Dialog Component** - ReminderDialog component
4. **Integrate with Patient Profile** - Add "+" button and dialog trigger
5. **Calendar Integration** - Add reminders/waiting list section to calendar
6. **Convert to Appointment** - Link reminder to appointment creation

---

## Related Files
- `frontend/app/patients/page.tsx` - Patient profile (where dialog is triggered)
- `frontend/app/components/ClinicCalendar.tsx` - Calendar component (where reminders appear)
- `backend/reminders/models.py` - Reminder model (to be created)
- `backend/reminders/views.py` - Reminder API endpoints (to be created)

