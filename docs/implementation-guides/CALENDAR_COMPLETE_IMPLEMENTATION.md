# Complete Calendar Implementation Guide

**Branch:** CalV5  
**Created:** November 22, 2025  
**Purpose:** Comprehensive guide to re-implement all calendar features from CalV5 branch onto main branch without breaking styling

---

## 🚀 Quick Start (TL;DR)

**Problem:** CalV5 branch has all calendar features working but styling is broken across the app.

**Solution:** This document contains EVERY piece of code needed to rebuild the calendar features on main branch (which has correct styling).

**What's Included:**
- ✅ All backend changes (models, serializers, views, migrations)
- ✅ All frontend dialog components (4 complete dialogs)
- ✅ ClinicCalendar.tsx integration code
- ✅ Step-by-step implementation instructions

**Files to Copy Directly from CalV5:**
1. All 4 dialog files (new files, safe to copy)
2. Backend models, serializers, views, migrations
3. Appointment types settings component

**Files to Manually Update:**
1. `ClinicCalendar.tsx` - Add imports, state, handlers (documented below)

**Files to NEVER Touch:**
- ❌ `frontend/app/layout.tsx` - Keep main version
- ❌ `frontend/app/globals.css` - Keep main version

---

## 📋 Overview

This document contains EVERY change made to implement the complete calendar system including:
- ✅ Appointment Types (Settings)
- ✅ All-Day Events
- ✅ Regular Time-Slot Appointments
- ✅ Follow-up Appointment Scheduling
- ✅ Recurring Appointments (Daily/Weekly/Biweekly/Monthly)
- ✅ Apple Calendar-Style Deletion Options
- ✅ Vertical Day Separators in Week View
- ✅ Multiple Dialog Components

---

## 🗂️ Files Changed

### Backend Files
1. `backend/appointments/models.py` - Added follow-up and recurring fields
2. `backend/appointments/serializers.py` - Added serializer fields
3. `backend/appointments/views.py` - Added create() and destroy() overrides
4. `backend/appointments/migrations/0007_add_followup_fields.py` - Follow-up migration
5. `backend/appointments/migrations/0008_make_patient_optional.py` - Patient optional migration
6. `backend/appointments/migrations/0009_add_recurring_fields.py` - Recurring migration
7. `backend/ncc_api/urls.py` - Added appointment types route

### Frontend Files
1. `frontend/app/components/ClinicCalendar.tsx` - Main calendar with dialogs
2. `frontend/app/components/dialogs/AppointmentDetailsDialog.tsx` - View/edit appointments
3. `frontend/app/components/dialogs/CreateAppointmentDialog.tsx` - Create appointments
4. `frontend/app/components/dialogs/CreateAllDayAppointmentDialog.tsx` - Create all-day events
5. `frontend/app/components/dialogs/EditAllDayEventDialog.tsx` - Edit all-day events
6. `frontend/app/components/settings/AppointmentTypesSettings.tsx` - Appointment types management
7. `frontend/app/components/Navigation.tsx` - Added settings link
8. `frontend/app/components/SettingsHeader.tsx` - Settings tabs
9. `frontend/app/settings/page.tsx` - Settings page

### Documentation Files
1. `docs/features/APPOINTMENT_TYPES.md` - Appointment types feature doc
2. `docs/features/CALENDAR_COMPLETE_TODO.md` - Calendar TODO tracking

---

## 🔧 Backend Implementation

### 1. Update Appointment Model

**File:** `backend/appointments/models.py`

Add these fields to the `Appointment` model (around line 150):

```python
# ═══════════════════════════════════════════════════════════════════
# FOLLOW-UP TRACKING FIELDS (Added Nov 2025)
# ═══════════════════════════════════════════════════════════════════

parent_appointment = models.ForeignKey(
    'self',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='followup_appointments',
    help_text="If this is a follow-up, link to the original appointment"
)

needs_followup_reminder = models.BooleanField(
    default=False,
    help_text="Flag to indicate this appointment needs a follow-up scheduled"
)

followup_scheduled = models.BooleanField(
    default=False,
    help_text="Flag to indicate a follow-up has been scheduled for this appointment"
)

# ═══════════════════════════════════════════════════════════════════
# RECURRING APPOINTMENT FIELDS (Added Nov 2025)
# ═══════════════════════════════════════════════════════════════════

recurrence_group_id = models.UUIDField(
    null=True,
    blank=True,
    db_index=True,
    help_text="Links recurring appointments together (same ID for all in series)"
)

is_recurring = models.BooleanField(
    default=False,
    db_index=True,
    help_text="Is this appointment part of a recurring series?"
)

recurrence_pattern = models.CharField(
    max_length=20,
    null=True,
    blank=True,
    choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('biweekly', 'Every 2 Weeks'),
        ('monthly', 'Monthly'),
    ],
    help_text="How often does this appointment repeat?"
)

recurrence_end_date = models.DateField(
    null=True,
    blank=True,
    help_text="Last date for recurring appointments (inclusive)"
)
```

Also update the `patient` field to be optional (around line 94):

```python
patient = models.ForeignKey(
    Patient,
    on_delete=models.PROTECT,
    related_name='appointments',
    null=True,
    blank=True,
    help_text="Patient for this appointment (optional for all-day clinic events)"
)
```

---

### 2. Update Appointment Serializer

**File:** `backend/appointments/serializers.py`

Update `AppointmentSerializer` fields list:

```python
fields = [
    'id', 'clinic', 'clinic_name', 'patient', 'patient_name',
    'clinician', 'clinician_name', 'appointment_type', 'appointment_type_name',
    'start_time', 'end_time', 'status', 'reason', 'notes', 'duration_minutes',
    'parent_appointment', 'needs_followup_reminder', 'followup_scheduled',
    # Recurring fields (added Nov 2025)
    'is_recurring', 'recurrence_pattern', 'recurrence_group_id', 'recurrence_end_date',
    'created_at', 'updated_at',
    # Xero billing fields (added Nov 2025)
    'invoice_contact_type', 'billing_company', 'billing_notes',
]
```

Update `AppointmentCalendarSerializer` to add `allDay` field:

```python
class AppointmentCalendarSerializer(serializers.ModelSerializer):
    """Simplified serializer for calendar display"""
    
    title = serializers.SerializerMethodField()
    start = serializers.DateTimeField(source='start_time')
    end = serializers.DateTimeField(source='end_time')
    resourceId = serializers.CharField(source='clinic.id')
    allDay = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = ['id', 'title', 'start', 'end', 'status', 'resourceId', 'allDay']
    
    def get_allDay(self, obj):
        """Determine if the event is an all-day event."""
        # An event is considered all-day if it has no patient or if its duration is 24 hours or more
        if not obj.patient:
            return True
        duration_hours = (obj.end_time - obj.start_time).total_seconds() / 3600
        return duration_hours >= 24
    
    def get_title(self, obj):
        """Generate event title - patient name and clinician, or clinic name and notes for all-day events"""
        if self.get_allDay(obj):
            # For all-day events, show clinic name and notes (event title)
            clinic_name = obj.clinic.name if obj.clinic else "Clinic Event"
            event_title = obj.notes if obj.notes else "All-Day Event"
            return f"{clinic_name} - {event_title}"
        else:
            # For regular appointments, show patient name and clinician
            patient_name = obj.patient.get_full_name() if obj.patient else "Unknown"
            clinician_name = obj.clinician.full_name if obj.clinician else ""
            if clinician_name:
                return f"{patient_name} - {clinician_name}"
            return f"{patient_name}"
```

---

### 3. Update Appointment Views

**File:** `backend/appointments/views.py`

Add imports at the top:

```python
from datetime import timedelta
import uuid
```

Add `create()` method to `AppointmentViewSet`:

```python
def create(self, request, *args, **kwargs):
    """
    Override create to handle recurring appointments.
    If is_recurring is True, generate multiple appointments.
    """
    data = request.data
    is_recurring = data.get('is_recurring', False)
    
    if not is_recurring:
        # Normal single appointment creation
        return super().create(request, *args, **kwargs)
    
    # Recurring appointment logic
    recurrence_pattern = data.get('recurrence_pattern')
    recurrence_end_date = data.get('recurrence_end_date')
    number_of_occurrences = data.get('number_of_occurrences', 4)
    
    if not recurrence_pattern:
        return Response(
            {'error': 'recurrence_pattern is required for recurring appointments'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate recurrence group ID
    recurrence_group_id = uuid.uuid4()
    
    # Parse start time
    start_time = parse_datetime(data['start_time'])
    end_time = parse_datetime(data['end_time'])
    
    if not start_time or not end_time:
        return Response(
            {'error': 'Invalid start_time or end_time format'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Calculate duration
    duration = end_time - start_time
    
    # Determine increment based on pattern
    if recurrence_pattern == 'daily':
        increment = timedelta(days=1)
    elif recurrence_pattern == 'weekly':
        increment = timedelta(weeks=1)
    elif recurrence_pattern == 'biweekly':
        increment = timedelta(weeks=2)
    elif recurrence_pattern == 'monthly':
        increment = timedelta(days=30)  # Approximate month
    else:
        return Response(
            {'error': f'Invalid recurrence_pattern: {recurrence_pattern}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create appointments
    created_appointments = []
    current_start = start_time
    
    # Fetch related objects once
    from clinicians.models import Clinic, Clinician
    
    clinic = Clinic.objects.get(id=data['clinic'])
    clinician = Clinician.objects.get(id=data['clinician']) if data.get('clinician') else None
    patient_obj = None
    if data.get('patient'):
        from patients.models import Patient
        patient_obj = Patient.objects.get(id=data['patient'])
    appointment_type_obj = None
    if data.get('appointment_type'):
        appointment_type_obj = AppointmentType.objects.get(id=data['appointment_type'])
    
    # Determine when to stop
    if recurrence_end_date:
        end_date = parse_datetime(recurrence_end_date)
        max_occurrences = 365  # Safety limit
    else:
        end_date = None
        max_occurrences = int(number_of_occurrences)
    
    occurrence_count = 0
    while occurrence_count < max_occurrences:
        # Check if we've passed the end date
        if end_date and current_start > end_date:
            break
        
        current_end = current_start + duration
        
        # Create appointment data with object instances
        appointment_data = {
            'clinic': clinic,
            'patient': patient_obj,
            'clinician': clinician,
            'appointment_type': appointment_type_obj,
            'start_time': current_start,
            'end_time': current_end,
            'status': data.get('status', 'scheduled'),
            'notes': data.get('notes', ''),
            'is_recurring': True,
            'recurrence_pattern': recurrence_pattern,
            'recurrence_group_id': recurrence_group_id,
            'recurrence_end_date': recurrence_end_date,
        }
        
        # Create appointment
        appointment = Appointment.objects.create(**appointment_data)
        created_appointments.append(appointment)
        
        # Move to next occurrence
        current_start += increment
        occurrence_count += 1
    
    # Serialize and return all created appointments
    serializer = self.get_serializer(created_appointments, many=True)
    return Response(
        {
            'message': f'Created {len(created_appointments)} recurring appointments',
            'appointments': serializer.data
        },
        status=status.HTTP_201_CREATED
    )
```

Add `destroy()` method to `AppointmentViewSet`:

```python
def destroy(self, request, *args, **kwargs):
    """
    Override destroy to handle recurring appointment deletion.
    Supports deleting 'this', 'future', or 'all' events in a series.
    """
    appointment = self.get_object()
    delete_type = request.data.get('delete_type', 'this')
    
    if not appointment.is_recurring or delete_type == 'this':
        # Normal single appointment deletion
        appointment.delete()
        return Response(
            {'message': 'Appointment deleted successfully'},
            status=status.HTTP_200_OK
        )
    
    # Recurring appointment deletion
    recurrence_group_id = appointment.recurrence_group_id
    start_time = parse_datetime(request.data.get('start_time', appointment.start_time.isoformat()))
    
    if delete_type == 'all':
        # Delete all appointments in the series
        deleted_count = Appointment.objects.filter(
            recurrence_group_id=recurrence_group_id
        ).delete()[0]
        return Response(
            {'message': f'Deleted {deleted_count} recurring appointments'},
            status=status.HTTP_200_OK
        )
    
    elif delete_type == 'future':
        # Delete this and all future appointments in the series
        deleted_count = Appointment.objects.filter(
            recurrence_group_id=recurrence_group_id,
            start_time__gte=start_time
        ).delete()[0]
        return Response(
            {'message': f'Deleted {deleted_count} future appointments'},
            status=status.HTTP_200_OK
        )
    
    # Default to single deletion
    appointment.delete()
    return Response(
        {'message': 'Appointment deleted successfully'},
        status=status.HTTP_200_OK
    )
```

---

### 4. Create Migrations

Run these Django migrations in order:

```bash
python manage.py makemigrations appointments
python manage.py migrate appointments
```

Or use the migration files from CalV5 branch:
- `backend/appointments/migrations/0007_add_followup_fields.py`
- `backend/appointments/migrations/0008_make_patient_optional.py`
- `backend/appointments/migrations/0009_add_recurring_fields.py`

---

## 🎨 Frontend Implementation

### 5. Update ClinicCalendar Component

**File:** `frontend/app/components/ClinicCalendar.tsx`

This is a LARGE file. Key changes:

**Add imports:**
```typescript
import AppointmentDetailsDialog from './dialogs/AppointmentDetailsDialog';
import CreateAppointmentDialog from './dialogs/CreateAppointmentDialog';
import CreateAllDayAppointmentDialog from './dialogs/CreateAllDayAppointmentDialog';
import EditAllDayEventDialog from './dialogs/EditAllDayEventDialog';
import { useSearchParams, useRouter } from 'next/navigation';
```

**Add state for dialogs:**
```typescript
// Appointment details dialog
const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

// Edit all-day event dialog
const [editAllDayDialogOpen, setEditAllDayDialogOpen] = useState(false);
const [selectedAllDayEventId, setSelectedAllDayEventId] = useState<string | null>(null);

// Create appointment dialog
const [createDialogOpen, setCreateDialogOpen] = useState(false);
const [createAllDayDialogOpen, setCreateAllDayDialogOpen] = useState(false);
const [createInitialDate, setCreateInitialDate] = useState<Date | null>(null);

// Follow-up data
const [followupData, setFollowupData] = useState<any>(null);

// Double-click detection
const [lastClickTime, setLastClickTime] = useState(0);
const [lastClickInfo, setLastClickInfo] = useState<any>(null);

// Calendar ref for navigation
const calendarRef = useRef<FullCalendar>(null);
const searchParams = useSearchParams();
const router = useRouter();
```

**Add useEffect for follow-up navigation:**
```typescript
useEffect(() => {
  const followupDate = searchParams.get('followupDate');
  const followupView = searchParams.get('followupView');
  
  if (followupDate && calendarRef.current) {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.gotoDate(followupDate);
    if (followupView) {
      calendarApi.changeView(followupView);
    }
    
    // Check sessionStorage for followup data
    const storedData = sessionStorage.getItem('followupData');
    if (storedData) {
      const data = JSON.parse(storedData);
      setFollowupData(data);
      sessionStorage.removeItem('followupData');
      
      // Open create dialog after a short delay
      setTimeout(() => {
        setCreateInitialDate(new Date(followupDate));
        setCreateDialogOpen(true);
      }, 500);
    }
  }
}, [searchParams]);
```

**Update eventClick handler:**
```typescript
const handleEventClick = (info: any) => {
  const isAllDay = info.event.allDay || false;
  
  if (isAllDay) {
    // Open the all-day event edit dialog
    setSelectedAllDayEventId(info.event.id);
    setEditAllDayDialogOpen(true);
  } else {
    // Open the regular appointment details dialog
    setSelectedAppointmentId(info.event.id);
    setDetailsDialogOpen(true);
  }
};
```

**Add double-click detection:**
```typescript
const handleDateClick = (info: any) => {
  const now = Date.now();
  const timeSinceLastClick = now - lastClickTime;

  // Check if this is an all-day click
  const isAllDay = info.allDay || false;

  // If clicked within 300ms, it's a double-click
  if (timeSinceLastClick < 300 && lastClickInfo?.dateStr === info.dateStr) {
    // Double-click detected
    
    if (isAllDay) {
      // All-day appointment - open dedicated all-day dialog
      setCreateInitialDate(info.date);
      setCreateAllDayDialogOpen(true);
    } else {
      // Regular time slot appointment
      setCreateInitialDate(info.date);
      setCreateDialogOpen(true);
    }

    // Reset click tracking
    setLastClickTime(0);
    setLastClickInfo(null);
  } else {
    // First click - record timestamp
    setLastClickTime(now);
    setLastClickInfo(info);
  }
};
```

**Add custom CSS for vertical day separators:**
```typescript
<style jsx global>{`
  /* Vertical lines between days in week view */
  .fc-timegrid-col::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: #4A5568;
    z-index: 3;
    pointer-events: none;
  }

  /* Style for today's column */
  .fc-day-today {
    background-color: rgba(34, 139, 230, 0.05) !important;
  }

  .fc-day-today::after {
    background-color: #228BE6 !important;
    width: 2px;
  }
`}</style>
```

**Add dialog components at the end:**
```typescript
{/* Appointment Details Dialog */}
<AppointmentDetailsDialog
  opened={detailsDialogOpen}
  onClose={() => {
    setDetailsDialogOpen(false);
    setSelectedAppointmentId(null);
  }}
  appointmentId={selectedAppointmentId}
  onUpdate={fetchAppointments} // Refresh calendar after edit/delete
/>

{/* Create Appointment Dialog */}
<CreateAppointmentDialog
  opened={createDialogOpen}
  onClose={() => {
    setCreateDialogOpen(false);
    setCreateInitialDate(null);
    setFollowupData(null);
  }}
  onSuccess={fetchAppointments} // Refresh calendar after create
  initialDate={createInitialDate || undefined}
  followupData={followupData}
/>

{/* Create All-Day Appointment Dialog */}
<CreateAllDayAppointmentDialog
  opened={createAllDayDialogOpen}
  onClose={() => {
    setCreateAllDayDialogOpen(false);
    setCreateInitialDate(null);
  }}
  onSuccess={fetchAppointments} // Refresh calendar after create
  initialDate={createInitialDate || undefined}
/>

{/* Edit All-Day Event Dialog */}
<EditAllDayEventDialog
  opened={editAllDayDialogOpen}
  onClose={() => {
    setEditAllDayDialogOpen(false);
    setSelectedAllDayEventId(null);
  }}
  eventId={selectedAllDayEventId}
  onUpdate={fetchAppointments} // Refresh calendar after edit/delete
/>
```

**Update FullCalendar props:**
```typescript
<FullCalendar
  ref={calendarRef}
  // ... other props
  allDaySlot={true}
  eventClick={handleEventClick}
  dateClick={handleDateClick}
  // ... other props
/>
```

---

## ⚠️ IMPORTANT: DO NOT COPY STYLING CHANGES

**DO NOT copy these files/changes from CalV5:**
- ❌ `frontend/app/globals.css` - Contains broken styling
- ❌ `frontend/app/layout.tsx` - Contains aggressive CSS that breaks styling
- ❌ Any `!important` CSS rules

**The styling on main branch is correct. Only copy calendar functionality!**

---

## 📝 Dialog Components

### 6. AppointmentDetailsDialog.tsx

**File:** `frontend/app/components/dialogs/AppointmentDetailsDialog.tsx`

**Purpose:** View, edit, and delete appointment details. Supports recurring event deletion options.

**Key Features:**
- Display all appointment details (patient, clinic, clinician, date/time, notes, status)
- Edit mode for updating appointment
- Follow-up scheduling with dropdown intervals (1w, 2w, 3w, 4w, 8w, 3m, 6m)
- Apple Calendar-style deletion for recurring events (this/future/all)
- Recurring appointment badge display
- "Needs follow-up reminder" checkbox
- Patient navigation button

**Important Code Sections:**

1. **Interface with recurring fields:**
```typescript
interface AppointmentDetails {
  id: string;
  patient: string | null; // UUID (null for all-day events)
  patient_name: string | null;
  clinic: string; // UUID
  clinic_name: string;
  clinician: string | null; // UUID
  clinician_name: string | null;
  appointment_type: string | null; // UUID
  appointment_type_name: string | null;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
  duration_minutes: number;
  parent_appointment: string | null; // UUID
  needs_followup_reminder: boolean;
  followup_scheduled: boolean;
  // Recurring fields
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurrence_group_id: string | null;
  recurrence_end_date: string | null;
  created_at: string;
  updated_at: string;
}
```

2. **Recurring Delete Logic:**
```typescript
const handleDelete = () => {
  if (!appointment) return;

  // If it's a recurring event, show options
  if (appointment.is_recurring && appointment.recurrence_group_id) {
    modals.open({
      title: 'Delete Recurring Event',
      children: (
        <Stack gap="md">
          <Text size="sm">
            This is a recurring event. How would you like to delete it?
          </Text>
          <Button
            variant="light"
            color="red"
            fullWidth
            onClick={() => {
              modals.closeAll();
              deleteAppointment('this');
            }}
          >
            Delete This Event Only
          </Button>
          <Button
            variant="filled"
            color="red"
            fullWidth
            onClick={() => {
              modals.closeAll();
              deleteAppointment('future');
            }}
          >
            Delete This and Future Events
          </Button>
          <Button
            variant="light"
            color="red"
            fullWidth
            onClick={() => {
              modals.closeAll();
              deleteAppointment('all');
            }}
          >
            Delete All Events in Series
          </Button>
          <Button variant="default" fullWidth onClick={() => modals.closeAll()}>
            Cancel
          </Button>
        </Stack>
      ),
    });
  } else {
    // Non-recurring event - show simple confirmation
    modals.openConfirmModal({
      title: 'Delete Appointment',
      children: (
        <Text size="sm">
          Are you sure you want to delete this appointment? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteAppointment('this'),
    });
  }
};

const deleteAppointment = async (deleteType: 'this' | 'future' | 'all') => {
  if (!appointment) return;

  try {
    // Get CSRF token
    const csrfResponse = await fetch('https://localhost:8000/api/auth/csrf-token/', {
      credentials: 'include',
    });
    const csrfData = await csrfResponse.json();

    const response = await fetch(`https://localhost:8000/api/appointments/${appointment.id}/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': csrfData.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delete_type: deleteType,
        recurrence_group_id: appointment.recurrence_group_id,
        start_time: appointment.start_time,
      }),
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      notifications.show({
        title: 'Success',
        message: data.message || 'Appointment deleted successfully',
        color: 'green',
      });
      if (onUpdate) onUpdate();
      onClose();
    } else {
      throw new Error('Failed to delete appointment');
    }
  } catch (error) {
    console.error('Error deleting appointment:', error);
    notifications.show({
      title: 'Error',
      message: 'Failed to delete appointment',
      color: 'red',
    });
  }
};
```

3. **Follow-up Scheduling:**
```typescript
const handleScheduleFollowup = async (interval: string) => {
  if (!appointment) return;

  // Calculate target date based on interval
  let targetDate = dayjs(appointment.start_time);
  
  switch (interval) {
    case '1w': targetDate = targetDate.add(1, 'week'); break;
    case '2w': targetDate = targetDate.add(2, 'weeks'); break;
    case '3w': targetDate = targetDate.add(3, 'weeks'); break;
    case '4w': targetDate = targetDate.add(4, 'weeks'); break;
    case '8w': targetDate = targetDate.add(8, 'weeks'); break;
    case '3m': targetDate = targetDate.add(3, 'months'); break;
    case '6m': targetDate = targetDate.add(6, 'months'); break;
    default: return;
  }

  try {
    // Mark current appointment as having follow-up scheduled
    const csrfResponse = await fetch('https://localhost:8000/api/auth/csrf-token/', {
      credentials: 'include',
    });
    const csrfData = await csrfResponse.json();

    await fetch(`https://localhost:8000/api/appointments/${appointment.id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfData.csrfToken,
      },
      body: JSON.stringify({
        followup_scheduled: true,
        needs_followup_reminder: false, // Clear reminder flag
      }),
      credentials: 'include',
    });

    // Store follow-up data in sessionStorage
    const followupData = {
      patientId: appointment.patient,
      patientName: appointment.patient_name,
      clinicId: appointment.clinic,
      clinicianId: appointment.clinician,
      appointmentTypeId: appointment.appointment_type,
      parentAppointmentId: appointment.id,
      parentAppointmentDate: formatDateTime(appointment.start_time),
      targetDate: targetDate.format('YYYY-MM-DD'),
      startTime: targetDate.format('YYYY-MM-DDTHH:mm:ss'),
      notes: `Follow-up from: ${formatDateTime(appointment.start_time)} (${appointment.patient_name})`,
    };
    
    sessionStorage.setItem('pendingFollowup', JSON.stringify(followupData));

    // Close this dialog first
    onClose();

    // Reload the current page with a flag to trigger follow-up dialog
    window.location.href = `/calendar?followup=true&date=${targetDate.format('YYYY-MM-DD')}&view=week`;

  } catch (error) {
    console.error('Error scheduling follow-up:', error);
    notifications.show({
      title: 'Error',
      message: 'Failed to prepare follow-up appointment',
      color: 'red',
    });
  }
};
```

**📄 Full file available in CalV5 branch:** `frontend/app/components/dialogs/AppointmentDetailsDialog.tsx` (742 lines)

---

### 7. CreateAppointmentDialog.tsx

**File:** `frontend/app/components/dialogs/CreateAppointmentDialog.tsx`

**Purpose:** Create new time-slot appointments with optional recurring options.

**Key Features:**
- Patient selection (paginated search)
- Clinic and clinician selection
- Date/time picker
- Appointment type selection
- Duration input (auto-calculated from appointment type)
- Status selection
- Notes field
- Recurring options (daily/weekly/biweekly/monthly)
- End by occurrences or date
- Follow-up data pre-filling

**Important Code Sections:**

1. **Recurring Options UI:**
```typescript
{/* Recurring Appointment Options */}
<Paper p="md" withBorder>
  <Stack gap="md">
    <Group gap="sm">
      <IconRepeat size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
      <Text fw={600} size="sm" c="dimmed">
        Recurring Appointment
      </Text>
    </Group>

    <Checkbox
      label="Create recurring appointment"
      checked={isRecurring}
      onChange={(e) => setIsRecurring(e.currentTarget.checked)}
      description="Create multiple appointments at regular intervals"
    />

    {isRecurring && (
      <>
        <Select
          label="Repeat"
          placeholder="Select frequency"
          data={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'biweekly', label: 'Every 2 Weeks' },
            { value: 'monthly', label: 'Monthly' },
          ]}
          value={recurrencePattern}
          onChange={setRecurrencePattern}
          required
        />

        <Radio.Group
          label="End"
          value={recurrenceEndType}
          onChange={(value) => setRecurrenceEndType(value as 'occurrences' | 'date')}
        >
          <Group mt="xs">
            <Radio value="occurrences" label="After" />
            <Radio value="date" label="On date" />
          </Group>
        </Radio.Group>

        {recurrenceEndType === 'occurrences' && (
          <NumberInput
            label="Number of occurrences"
            value={numberOfOccurrences}
            onChange={(value) => setNumberOfOccurrences(Number(value))}
            min={1}
            max={365}
          />
        )}

        {recurrenceEndType === 'date' && (
          <DatePickerInput
            label="End date"
            placeholder="Select end date"
            value={recurrenceEndDate}
            onChange={setRecurrenceEndDate}
            minDate={startTime || undefined}
          />
        )}

        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          {recurrenceEndType === 'occurrences' 
            ? `${numberOfOccurrences} appointments will be created`
            : recurrenceEndDate
              ? `Appointments will be created until ${dayjs(recurrenceEndDate).format('DD MMM YYYY')}`
              : 'Please select an end date'}
        </Alert>
      </>
    )}
  </Stack>
</Paper>
```

2. **Submit with Recurring Data:**
```typescript
const response = await fetch('https://localhost:8000/api/appointments/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken,
  },
  body: JSON.stringify({
    patient: patientId,
    clinician: clinicianId,
    clinic: clinicId,
    appointment_type: appointmentTypeId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status,
    notes,
    parent_appointment: followupData?.parentAppointmentId || null,
    // Recurring fields
    is_recurring: isRecurring,
    recurrence_pattern: isRecurring ? recurrencePattern : null,
    number_of_occurrences: isRecurring && recurrenceEndType === 'occurrences' ? numberOfOccurrences : null,
    recurrence_end_date: isRecurring && recurrenceEndType === 'date' && recurrenceEndDate ? dayjs(recurrenceEndDate).endOf('day').toISOString() : null,
  }),
  credentials: 'include',
});
```

**📄 Full file available in CalV5 branch:** `frontend/app/components/dialogs/CreateAppointmentDialog.tsx` (669 lines)

---

### 8. CreateAllDayAppointmentDialog.tsx

**File:** `frontend/app/components/dialogs/CreateAllDayAppointmentDialog.tsx`

**Purpose:** Create all-day clinic events (no patient required).

**Key Features:**
- No patient field (clinic-wide events only)
- Clinic and clinician selection
- Date picker (full day)
- Event title/notes
- Recurring options (same as regular appointments)
- Simpler layout than regular appointment dialog

**Important Notes:**
- Sets `patient: null` in API call
- Sets `allDay: true` based on backend logic
- Event title is stored in `notes` field
- Uses same recurring logic as regular appointments

**📄 Full file available in CalV5 branch:** `frontend/app/components/dialogs/CreateAllDayAppointmentDialog.tsx` (509 lines)

---

### 9. EditAllDayEventDialog.tsx

**File:** `frontend/app/components/dialogs/EditAllDayEventDialog.tsx`

**Purpose:** View and edit all-day events.

**Key Features:**
- Similar to AppointmentDetailsDialog but for all-day events
- No patient field
- Event title editing
- Recurring event deletion options (same as AppointmentDetailsDialog)
- Display recurring pattern badge

**Important Code:**
- Uses same `handleDelete` and `deleteAppointment` logic as `AppointmentDetailsDialog.tsx`
- Loads event data using appointment ID
- Shows clinic, clinician, date, notes (event title)

**📄 Full file available in CalV5 branch:** `frontend/app/components/dialogs/EditAllDayEventDialog.tsx` (638 lines)

---

## 🎨 ClinicCalendar.tsx - Complete Implementation

**File:** `frontend/app/components/ClinicCalendar.tsx`

This is the MAIN calendar component. Below is the complete implementation with all changes:

### Key Changes Summary:
1. ✅ Added 4 dialog components (AppointmentDetails, CreateAppointment, CreateAllDay, EditAllDay)
2. ✅ Added double-click detection for creating appointments
3. ✅ Added event click handler to open appropriate dialog (all-day vs regular)
4. ✅ Added follow-up appointment navigation with sessionStorage
5. ✅ Added vertical day separators in week view (custom CSS)
6. ✅ Added pagination support for fetching all patients/clinicians/clinics

### State Variables to Add:

```typescript
// Dialog state
const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
const [editAllDayDialogOpen, setEditAllDayDialogOpen] = useState(false);
const [selectedAllDayEventId, setSelectedAllDayEventId] = useState<string | null>(null);
const [createDialogOpen, setCreateDialogOpen] = useState(false);
const [createAllDayDialogOpen, setCreateAllDayDialogOpen] = useState(false);
const [createInitialDate, setCreateInitialDate] = useState<Date | null>(null);
const [followupData, setFollowupData] = useState<any>(null);

// Double-click detection
const [lastClickTime, setLastClickTime] = useState(0);
const [lastClickInfo, setLastClickInfo] = useState<any>(null);

// Calendar ref and navigation
const calendarRef = useRef<FullCalendar>(null);
const searchParams = useSearchParams();
const router = useRouter();
```

### Imports to Add:

```typescript
import AppointmentDetailsDialog from './dialogs/AppointmentDetailsDialog';
import CreateAppointmentDialog from './dialogs/CreateAppointmentDialog';
import CreateAllDayAppointmentDialog from './dialogs/CreateAllDayAppointmentDialog';
import EditAllDayEventDialog from './dialogs/EditAllDayEventDialog';
import { useSearchParams, useRouter } from 'next/navigation';
```

### Event Handlers:

```typescript
// Handle event click - open appropriate dialog
const handleEventClick = (info: any) => {
  const isAllDay = info.event.allDay || false;
  
  if (isAllDay) {
    setSelectedAllDayEventId(info.event.id);
    setEditAllDayDialogOpen(true);
  } else {
    setSelectedAppointmentId(info.event.id);
    setDetailsDialogOpen(true);
  }
};

// Handle date click - detect double-click
const handleDateClick = (info: any) => {
  const now = Date.now();
  const timeSinceLastClick = now - lastClickTime;
  const isAllDay = info.allDay || false;

  if (timeSinceLastClick < 300 && lastClickInfo?.dateStr === info.dateStr) {
    // Double-click detected
    if (isAllDay) {
      setCreateInitialDate(info.date);
      setCreateAllDayDialogOpen(true);
    } else {
      setCreateInitialDate(info.date);
      setCreateDialogOpen(true);
    }
    setLastClickTime(0);
    setLastClickInfo(null);
  } else {
    // First click
    setLastClickTime(now);
    setLastClickInfo(info);
  }
};
```

### Follow-up Navigation Effect:

```typescript
useEffect(() => {
  const followupDate = searchParams.get('followupDate');
  const followupView = searchParams.get('followupView');
  
  if (followupDate && calendarRef.current) {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.gotoDate(followupDate);
    if (followupView) {
      calendarApi.changeView(followupView);
    }
    
    // Check sessionStorage for followup data
    const storedData = sessionStorage.getItem('followupData');
    if (storedData) {
      const data = JSON.parse(storedData);
      setFollowupData(data);
      sessionStorage.removeItem('followupData');
      
      // Open create dialog after a short delay
      setTimeout(() => {
        setCreateInitialDate(new Date(followupDate));
        setCreateDialogOpen(true);
      }, 500);
    }
  }
}, [searchParams]);
```

### Custom CSS for Day Separators:

```typescript
<style jsx global>{`
  /* Vertical lines between days in week view */
  .fc-timegrid-col::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: #4A5568;
    z-index: 3;
    pointer-events: none;
  }

  /* Style for today's column */
  .fc-day-today {
    background-color: rgba(34, 139, 230, 0.05) !important;
  }

  .fc-day-today::after {
    background-color: #228BE6 !important;
    width: 2px;
  }
`}</style>
```

### Dialog Components (at end of component):

```typescript
{/* Appointment Details Dialog */}
<AppointmentDetailsDialog
  opened={detailsDialogOpen}
  onClose={() => {
    setDetailsDialogOpen(false);
    setSelectedAppointmentId(null);
  }}
  appointmentId={selectedAppointmentId}
  onUpdate={fetchAppointments}
/>

{/* Create Appointment Dialog */}
<CreateAppointmentDialog
  opened={createDialogOpen}
  onClose={() => {
    setCreateDialogOpen(false);
    setCreateInitialDate(null);
    setFollowupData(null);
  }}
  onSuccess={fetchAppointments}
  initialDate={createInitialDate || undefined}
  followupData={followupData}
/>

{/* Create All-Day Appointment Dialog */}
<CreateAllDayAppointmentDialog
  opened={createAllDayDialogOpen}
  onClose={() => {
    setCreateAllDayDialogOpen(false);
    setCreateInitialDate(null);
  }}
  onSuccess={fetchAppointments}
  initialDate={createInitialDate || undefined}
/>

{/* Edit All-Day Event Dialog */}
<EditAllDayEventDialog
  opened={editAllDayDialogOpen}
  onClose={() => {
    setEditAllDayDialogOpen(false);
    setSelectedAllDayEventId(null);
  }}
  eventId={selectedAllDayEventId}
  onUpdate={fetchAppointments}
/>
```

### FullCalendar Props to Update:

```typescript
<FullCalendar
  ref={calendarRef}
  // ... existing props
  allDaySlot={true}
  eventClick={handleEventClick}
  dateClick={handleDateClick}
  // ... other props
/>
```

---

## 🚫 Files to EXCLUDE (Styling Issues)

**DO NOT COPY THESE CHANGES:**

### ❌ frontend/app/layout.tsx
- Contains aggressive CSS that breaks all styling
- Inline `style={{ backgroundColor: '#1A1B1E' }}` on html/body
- Blocking script and inline styles
- **Solution:** Keep main branch version unchanged

### ❌ frontend/app/globals.css
- Contains broken default colors
- Aggressive `!important` rules
- **Solution:** Keep main branch version unchanged

---

## 🎯 Implementation Steps (When Moving to Main)

1. **Backup Current Branch:**
```bash
# Ensure CalV5 is committed
git add .
git commit -m "Complete calendar implementation with all features"
git push origin CalV5
```

2. **Switch to Main:**
```bash
git checkout main
git pull origin main
```

3. **Copy Dialog Files (New Files):**
```bash
# Copy all 4 dialog files from CalV5
git checkout CalV5 -- frontend/app/components/dialogs/AppointmentDetailsDialog.tsx
git checkout CalV5 -- frontend/app/components/dialogs/CreateAppointmentDialog.tsx
git checkout CalV5 -- frontend/app/components/dialogs/CreateAllDayAppointmentDialog.tsx
git checkout CalV5 -- frontend/app/components/dialogs/EditAllDayEventDialog.tsx
```

4. **Copy Backend Files:**
```bash
# Copy models
git checkout CalV5 -- backend/appointments/models.py

# Copy serializers
git checkout CalV5 -- backend/appointments/serializers.py

# Copy views
git checkout CalV5 -- backend/appointments/views.py

# Copy migrations
git checkout CalV5 -- backend/appointments/migrations/0007_add_followup_fields.py
git checkout CalV5 -- backend/appointments/migrations/0008_make_patient_optional.py
git checkout CalV5 -- backend/appointments/migrations/0009_add_recurring_fields.py
```

5. **Manually Update ClinicCalendar.tsx:**
- Open `frontend/app/components/ClinicCalendar.tsx` on main
- Add the imports, state, handlers, and dialog components as documented above
- **DO NOT** copy the entire file - manually add the changes

6. **Run Migrations:**
```bash
cd backend
python manage.py migrate appointments
```

7. **Test Everything:**
```bash
# Start dev environment
./start-dev.sh

# Test:
# - Create regular appointment
# - Create all-day event
# - Create recurring appointment
# - Edit appointment
# - Delete recurring appointment (all 3 options)
# - Schedule follow-up
# - Verify styling is intact
```

8. **Commit and Push:**
```bash
git add .
git commit -m "feat: Complete calendar implementation with all features

- Add appointment types management
- Add recurring appointments (daily/weekly/biweekly/monthly)
- Add all-day events support
- Add follow-up appointment scheduling
- Add Apple Calendar-style deletion for recurring events
- Add 4 dialog components for appointment management
- Add vertical day separators in week view
- Backend: Add follow-up and recurring fields to Appointment model
- Backend: Override create() and destroy() for recurring logic"

git push origin main
```

---

## ✅ Features Checklist

- ✅ Appointment Types (Settings page)
- ✅ Create regular appointments
- ✅ Create all-day events
- ✅ Edit appointments
- ✅ Delete appointments
- ✅ Recurring appointments (daily/weekly/biweekly/monthly)
- ✅ Apple Calendar-style delete options (this/future/all)
- ✅ Follow-up scheduling with preset intervals
- ✅ Follow-up appointment linking (parent_appointment)
- ✅ Follow-up reminder checkbox
- ✅ Vertical day separators in week view
- ✅ Double-click to create appointment
- ✅ Patient selection with pagination
- ✅ Appointment type selection with default duration
- ✅ Status management
- ✅ Notes field
- ✅ All-day event dialog
- ✅ Regular appointment dialog

---

## 📞 Support

If you encounter issues during implementation:

1. Check that all 4 dialog files are present in `frontend/app/components/dialogs/`
2. Verify backend migrations ran successfully
3. Check browser console for errors
4. Verify `credentials: 'include'` is in all fetch calls
5. Check CSRF token is being fetched correctly
6. Verify `allDaySlot={true}` is set in FullCalendar component

---

**End of Implementation Guide**

This document contains everything needed to re-implement the calendar features from CalV5 onto main without breaking the styling.


