# 🗓️ Custom Calendar Module — Technical Spec (FullCalendar React Edition)

This spec defines a **custom clinic scheduling system** for multi‑clinic, multi‑clinician calendars with **custom appointment types**, implemented using:

- **Frontend:** Next.js (React) + **FullCalendar React** with **Resource TimeGrid**
- **Backend:** Django REST Framework (or NestJS) with **PostgreSQL**
- **Storage:** GCS/S3 for documents (outside the calendar)
- **Optional:** Firestore mirror for real‑time reads and Google Calendar sync for external clinician calendars

---

## 1️⃣ Core Requirements

- Multiple **clinics** and **clinicians**, filterable and color‑coded
- **Appointment types** (custom name, color, duration) per clinic
- **Working hours** and **exceptions** (leave, closures)
- **Recurrence rules (RRULE)** with exceptions and conflict detection
- **Drag & drop** rescheduling
- **Time zone:** store UTC, display in **Australia/Sydney**

---

## 2️⃣ Database Schema (PostgreSQL)

> Requires extensions: `pgcrypto`, `btree_gin`, `pg_trgm`

```sql
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT, email TEXT, address_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clinicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  credential TEXT, email TEXT, phone TEXT,
  role TEXT, active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT, default_minutes INT NOT NULL DEFAULT 30,
  color_hex TEXT, active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (clinic_id, name)
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  clinician_id UUID NOT NULL REFERENCES clinicians(id),
  patient_id UUID,
  type_id UUID REFERENCES appointment_types(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  reason TEXT, notes TEXT,
  external_uid TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON appointments (clinician_id, start_time);
CREATE INDEX ON appointments (clinic_id, start_time);
```
---

## 3️⃣ API Endpoints (Django REST Framework)

- `GET /api/clinics` → list/filter clinics
- `GET /api/clinicians?clinicId=` → list clinicians per clinic
- `GET /api/appointment-types?clinicId=` → appointment types
- `GET /api/appointments?clinicId=&clinicianId=&from=&to=` → event feed
- `POST /api/appointments` → create new appointment
- `PATCH /api/appointments/{id}` → update via drag/drop or edit modal
- `DELETE /api/appointments/{id}` → cancel appointment

### Example Response for FullCalendar
```json
{
  "resources": [
    { "id": "c1", "title": "Dr. Smith", "clinicId": "tamworth" },
    { "id": "c2", "title": "Dr. Jones", "clinicId": "newcastle" }
  ],
  "events": [
    {
      "id": "a1",
      "resourceId": "c1",
      "title": "Initial Assessment - John Doe",
      "start": "2025-10-30T00:30:00Z",
      "end": "2025-10-30T01:00:00Z",
      "color": "#0ea5e9"
    }
  ]
}
```

---

## 4️⃣ Frontend: FullCalendar (React)

### Installation
```bash
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/resource-timegrid luxon rrule
```

### Example Component (Next.js / React)
```jsx
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useState, useEffect } from 'react';

export default function ClinicCalendar() {
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);

  useEffect(() => {
    fetch('/api/appointments?from=2025-10-01&to=2025-10-31')
      .then(res => res.json())
      .then(data => {
        setEvents(data.events);
        setResources(data.resources);
      });
  }, []);

  return (
    <FullCalendar
      plugins={[resourceTimeGridPlugin, interactionPlugin]}
      initialView="resourceTimeGridDay"
      resources={resources}
      events={events}
      editable={true}
      selectable={true}
      eventDrop={(info) => {
        fetch(`/api/appointments/${info.event.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start_time: info.event.start, end_time: info.event.end })
        });
      }}
      eventResize={(info) => {
        fetch(`/api/appointments/${info.event.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start_time: info.event.start, end_time: info.event.end })
        });
      }}
      eventClick={(info) => alert(info.event.title)}
      resourceAreaHeaderContent="Clinicians"
      slotMinTime="07:00:00"
      slotMaxTime="18:00:00"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'resourceTimeGridDay,resourceTimeGridWeek,dayGridMonth'
      }}
    />
  );
}
```

---

## 5️⃣ Realtime & Notifications

- **Realtime:** Mirror active window to Firestore or poll backend.
- **Reminders:** Cloud Tasks worker sends email/SMS reminders.
- **ICS Export:** `GET /api/calendar/export.ics` per clinician.

---

## 6️⃣ Permissions & Audit

| Role | Permissions |
|------|--------------|
| `admin` | Create/update/delete any appointment across all clinics |
| `clinic_manager` | Manage appointments for their clinic |
| `clinician` | Edit only own appointments |
| `front_desk` | Create/edit within assigned clinic |
| `viewer` | Read-only access |

---

## 7️⃣ Rollout Milestones

1. **MVP:** Single clinic/clinician + day view.
2. **Multi-clinic/clinician:** resourceTimeGrid + filters.
3. **Recurrence + exceptions:** RRULE integration.
4. **Reminders + ICS:** notifications and calendar export.
5. **(Optional)** Realtime Firestore + Google sync.

---

✅ **Outcome:**  
You’ll have a **FullCalendar React–based scheduler** fully integrated with your custom Django/Postgres backend — supporting multiple clinics, clinicians, appointment types, conflict detection, and custom business rules while maintaining clinical compliance.
