'use client';

/**
 * Clinic Calendar Component
 * Multi-clinic appointment scheduler with sidebar toggle
 * Based on: Calendar_Spec_FullCalendar.md
 */

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Paper, Title, Group, Button, Badge, Checkbox, Stack, Box, Drawer, ActionIcon, useMantineColorScheme } from '@mantine/core';
import { IconMenu2 } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

// Type definitions
interface Clinic {
  id: string;
  title: string;
  color: string;
  enabled: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps?: {
    clinicId?: string;
    clinicName?: string;
    patientName?: string;
    clinicianName?: string;
    status?: string;
  };
}

export default function ClinicCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { colorScheme } = useMantineColorScheme();

  // Fetch appointments from backend
  useEffect(() => {
    fetchAppointments();
  }, []);

  // Filter events when clinic toggles change
  useEffect(() => {
    const enabledClinicIds = clinics.filter(c => c.enabled).map(c => c.id);
    const filtered = allEvents.filter(event => 
      enabledClinicIds.includes(event.extendedProps?.clinicId || '')
    );
    setEvents(filtered);
  }, [clinics, allEvents]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // Fetch data from Django API
      const response = await fetch(`https://localhost:8000/api/appointments/calendar_data/`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      
      const data = await response.json();
      
      // Set up clinics with toggle state
      const clinicsData = (data.resources || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        color: r.color,
        enabled: true  // All enabled by default
      }));
      setClinics(clinicsData);
      
      // Process events with clinic colors
      const eventsData = (data.events || []).map((event: any) => {
        const clinic = clinicsData.find((c: Clinic) => c.id === event.extendedProps?.clinicId);
        return {
          ...event,
          backgroundColor: clinic?.color || event.color,
          borderColor: clinic?.color || event.color,
        };
      });
      
      setAllEvents(eventsData);
      setEvents(eventsData);
      
      notifications.show({
        title: 'Success',
        message: 'Calendar data loaded successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Error fetching appointments:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load appointments. Make sure the backend is running.',
        color: 'red',
      });
      
      setClinics([]);
      setAllEvents([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleClinic = (clinicId: string) => {
    setClinics(prev => prev.map(c => 
      c.id === clinicId ? { ...c, enabled: !c.enabled } : c
    ));
  };

  // Handle event drop (drag & reschedule)
  const handleEventDrop = async (info: any) => {
    try {
      const response = await fetch(`https://localhost:8000/api/appointments/${info.event.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: info.event.start?.toISOString(),
          end_time: info.event.end?.toISOString(),
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment');
      }

      notifications.show({
        title: 'Appointment Updated',
        message: 'Appointment rescheduled successfully',
        color: 'green',
      });
    } catch (error) {
      info.revert();
      notifications.show({
        title: 'Error',
        message: 'Failed to reschedule appointment',
        color: 'red',
      });
    }
  };

  // Handle event resize
  const handleEventResize = async (info: any) => {
    try {
      const response = await fetch(`https://localhost:8000/api/appointments/${info.event.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: info.event.start?.toISOString(),
          end_time: info.event.end?.toISOString(),
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment');
      }

      notifications.show({
        title: 'Duration Updated',
        message: 'Appointment duration changed',
        color: 'green',
      });
    } catch (error) {
      info.revert();
      notifications.show({
        title: 'Error',
        message: 'Failed to update duration',
        color: 'red',
      });
    }
  };

  // Handle event click
  const handleEventClick = (info: any) => {
    const event = info.event;
    const props = event.extendedProps;
    
    alert(`
      Patient: ${props.patientName}
      Clinician: ${props.clinicianName}
      Clinic: ${props.clinicName}
      Status: ${props.status}
      Time: ${event.start?.toLocaleTimeString()} - ${event.end?.toLocaleTimeString()}
    `);
    
    // TODO: Open modal with appointment details
  };

  // Handle date select (create new appointment)
  const handleDateSelect = (selectInfo: any) => {
    alert(`
      Create new appointment:
      Start: ${selectInfo.startStr}
      End: ${selectInfo.endStr}
    `);
    
    // TODO: Open modal to create appointment
  };

  return (
    <>
      {/* Drawer for clinic toggles */}
      <Drawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Clinics"
        padding="md"
        size="sm"
        position="left"
      >
        <Stack gap="md">
          {clinics.map((clinic) => (
            <Group key={clinic.id} gap="xs" wrap="nowrap">
              <Box
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: clinic.color,
                  flexShrink: 0
                }}
              />
              <Checkbox
                checked={clinic.enabled}
                onChange={() => toggleClinic(clinic.id)}
                label={clinic.title}
                styles={{
                  label: { fontSize: '1rem', cursor: 'pointer' }
                }}
              />
            </Group>
          ))}
        </Stack>
      </Drawer>

      {/* Main Calendar */}
      <Paper p="md" shadow="sm" style={{ height: 'calc(100vh - 100px)' }}>
        <Group justify="space-between" mb="md">
          <Group>
            <ActionIcon
              size="lg"
              variant="default"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open clinic filter"
            >
              <IconMenu2 size={20} />
            </ActionIcon>
            <Title order={2}>Clinic Schedule</Title>
          </Group>
          <Group>
            <Button variant="light" onClick={fetchAppointments}>
              Refresh
            </Button>
          </Group>
        </Group>

        <div style={{ height: 'calc(100vh - 200px)' }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridDay,timeGridWeek,dayGridMonth'
            }}
            events={events}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            slotMinTime="07:00:00"
            slotMaxTime="18:00:00"
            slotDuration="00:15:00"
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventClick={handleEventClick}
            select={handleDateSelect}
            height="100%"
            nowIndicator={true}
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5],
              startTime: '08:00',
              endTime: '17:00',
            }}
            eventOverlap={true}
            slotEventOverlap={false}
          />
        </div>
      </Paper>
    </>
  );
}

