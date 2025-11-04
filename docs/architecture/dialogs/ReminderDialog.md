# Reminder Dialog

## Overview
Dialog for creating reminders from patient profile that appear in the calendar as a "waiting list" for scheduling.

**Status:** ✅ Built and Integrated  
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
- **Title**: "Add Reminder for [Patient Name]" (dynamic based on selected patient)
- **Size**: Medium (`md`)
- **Close Button**: X icon in top right (resets all fields on close)

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
- Options: "Follow-up needed", "Review required", "Appointment pending", "Assessment due", "Other"
- Auto-fills NOTE field when template is selected
- Or custom notes can be entered

**NOTE** (Required if no template selected)
- Large textarea for free-form reminder notes
- Placeholder: "Enter Note"
- Allows custom reminder details
- Auto-filled when note template is selected
- Minimum 4 rows for better visibility

**REMINDER DATE** (Optional)
- Date picker for specific reminder date
- Clearable
- If not set, reminder is general (not date-specific)

### Action Buttons
- **Cancel** (left): Closes dialog without saving, resets all fields
- **Save** (right): Creates reminder via API and closes dialog
  - Disabled until clinic is selected (required field)
  - Shows error alert if API call fails
  - Resets all fields after successful save

---

## Data Structure

### Backend Storage

**Table: `reminders`** ✅ **BUILT**

See `backend/reminders/models.py` for full implementation. Model includes:
- `id` - UUID (primary key)
- `patient` - ForeignKey to Patient (CASCADE)
- `clinic` - ForeignKey to Clinic (SET_NULL, nullable)
- `note` - TextField (reminder note)
- `reminder_date` - DateField (optional)
- `status` - CharField with choices: pending, scheduled, completed, cancelled
- `appointment_id` - UUIDField (nullable, links to appointment when converted)
- `created_at`, `updated_at` - DateTimeFields
- `scheduled_at` - DateTimeField (when converted to appointment)
- `created_by` - CharField (optional, user who created reminder)

**Indexes:**
- `['status']`
- `['clinic', 'status']`
- `['patient']`
- `['reminder_date']`

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
  "patient": "uuid",
  "clinic": "uuid",
  "note": "Follow-up needed",
  "reminder_date": "2025-01-20"  // optional, ISO format (YYYY-MM-DD)
}
```

**Note:** Field names use `patient` and `clinic` (not `patient_id` and `clinic_id`) as Django REST Framework serializes ForeignKey fields this way.

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
GET /api/reminders/?clinic={uuid}
GET /api/reminders/?status=pending
GET /api/reminders/?patient={uuid}
GET /api/reminders/pending/  # Custom endpoint for pending reminders (waiting list)
```

### Update Reminder
```
PATCH /api/reminders/{id}/
```

### Delete Reminder
```
DELETE /api/reminders/{id}/
```

### Convert Reminder to Appointment
```
PATCH /api/reminders/{id}/convert_to_appointment/
```
**Request Body:**
```json
{
  "appointment_id": "uuid"
}
```
**Response:** Updated reminder with status='scheduled' and appointment_id set

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

- [x] Backend model created ✅
- [x] Backend API endpoints created ✅
- [x] Frontend dialog component created ✅
- [x] Frontend-backend integration ✅
- [ ] Calendar integration (waiting list section)
- [ ] Convert reminder to appointment functionality
- [x] Patient profile integration (add reminder button) ✅

---

## UI Styling

### Patient Profile Integration
- **Section Label**: "REMINDER" (uppercase, dimmed, small size)
- **Layout**: Matches COORDINATOR section styling
  - Label on left with `flex: 1` for spacing
  - Blue plus icon on right
  - Group alignment: `flex-end`
  - Icon size: 20px
- **Button**: Blue plus icon opens dialog
- **Position**: Located in right column of patient detail grid

## Next Steps

1. ~~**Create Backend Model**~~ ✅ Done
2. ~~**Create API Endpoints**~~ ✅ Done
3. ~~**Create Dialog Component**~~ ✅ Done
4. ~~**Integrate with Patient Profile**~~ ✅ Done
5. **Calendar Integration** - Add reminders/waiting list section to calendar
6. **Convert to Appointment** - Link reminder to appointment creation

---

## Related Files
- `frontend/app/patients/page.tsx` - Patient profile (where dialog is triggered) ✅
- `frontend/app/components/ClinicCalendar.tsx` - Calendar component (where reminders will appear) ⚠️ Pending
- `backend/reminders/models.py` - Reminder model ✅
- `backend/reminders/views.py` - Reminder API endpoints ✅
- `backend/reminders/serializers.py` - Reminder serializers ✅
- `backend/reminders/admin.py` - Django admin configuration ✅
- `docs/architecture/DATABASE_SCHEMA.md` - Database schema documentation ✅

