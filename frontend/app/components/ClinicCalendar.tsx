'use client';

/**
 * Clinic Calendar Component
 * Multi-clinic appointment scheduler with sidebar toggle
 * Based on: Calendar_Spec_FullCalendar.md
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Paper, Title, Group, Button, Badge, Checkbox, Stack, Box, Drawer, ActionIcon, useMantineColorScheme } from '@mantine/core';
import { IconMenu2 } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import AppointmentDetailsDialog from './dialogs/AppointmentDetailsDialog';
import CreateAppointmentDialog from './dialogs/CreateAppointmentDialog';
import CreateAllDayAppointmentDialog from './dialogs/CreateAllDayAppointmentDialog';
import EditAllDayEventDialog from './dialogs/EditAllDayEventDialog';

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
  const searchParams = useSearchParams();
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { colorScheme } = useMantineColorScheme();

  // Appointment details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  
  // Edit all-day event dialog
  const [editAllDayDialogOpen, setEditAllDayDialogOpen] = useState(false);
  const [selectedAllDayEventId, setSelectedAllDayEventId] = useState<string | null>(null);

  // Create appointment dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createAllDayDialogOpen, setCreateAllDayDialogOpen] = useState(false);
  const [createInitialDate, setCreateInitialDate] = useState<Date | string | null>(null);
  const [followupData, setFollowupData] = useState<any>(null);

  // Double-click detection for creating appointments
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickInfo, setLastClickInfo] = useState<any>(null);

  // Check for pending follow-up on mount
  useEffect(() => {
    const pendingFollowup = sessionStorage.getItem('pendingFollowup');
    if (pendingFollowup) {
      try {
        const data = JSON.parse(pendingFollowup);
        setFollowupData(data);
        setCreateInitialDate(data.startTime || data.targetDate);
        // Wait a moment for calendar to load, then open dialog
        setTimeout(() => {
          setCreateDialogOpen(true);
        }, 1000);
        sessionStorage.removeItem('pendingFollowup'); // Clear after reading
      } catch (error) {
        console.error('Error parsing pending follow-up:', error);
        sessionStorage.removeItem('pendingFollowup');
      }
    }
  }, []);

  // Handle URL parameters for date and view navigation
  useEffect(() => {
    const date = searchParams.get('date');
    const view = searchParams.get('view');
    
    // Only navigate if we have events loaded and a date parameter
    if (calendarRef.current && date && events.length > 0) {
      // Wait a bit for calendar to fully render
      setTimeout(() => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
          calendarApi.gotoDate(date);
          
          if (view === 'week') {
            calendarApi.changeView('timeGridWeek');
          } else if (view === 'day') {
            calendarApi.changeView('timeGridDay');
          } else if (view === 'month') {
            calendarApi.changeView('dayGridMonth');
          }
        }
      }, 300); // Give calendar time to initialize
    }
  }, [searchParams, events]); // Also trigger when events change

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

  // Add click handlers to date headers in week view to switch to day view
  useEffect(() => {
    const handleDateHeaderClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const dateCell = target.closest('.fc-col-header-cell');
      
      if (dateCell && calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        const currentView = calendarApi.view.type;
        
        // Only handle clicks in week view
        if (currentView === 'timeGridWeek') {
          // Get the date from the data-date attribute
          const dateAttr = dateCell.getAttribute('data-date');
          
          if (dateAttr) {
            // Navigate to day view for this date
            calendarApi.changeView('timeGridDay', dateAttr);
          }
        }
      }
    };

    // Attach event listener
    const calendarEl = document.querySelector('.fc');
    if (calendarEl) {
      calendarEl.addEventListener('click', handleDateHeaderClick);
    }

    // Cleanup
    return () => {
      if (calendarEl) {
        calendarEl.removeEventListener('click', handleDateHeaderClick);
      }
    };
  }, []);

  // Move all-day events to the day-top section in month view
  useEffect(() => {
    const moveAllDayEvents = () => {
      if (!calendarRef.current) return;
      
      const calendarApi = calendarRef.current.getApi();
      const currentView = calendarApi.view.type;
      
      // Only apply in month view
      if (currentView !== 'dayGridMonth') return;
      
      console.log('[MONTH VIEW] Moving all-day events to top...');
      
      // Find all day cells
      const dayCells = document.querySelectorAll('.fc-daygrid-day');
      
      dayCells.forEach((dayCell) => {
        const dayTop = dayCell.querySelector('.fc-daygrid-day-top');
        const dayEvents = dayCell.querySelector('.fc-daygrid-day-events');
        
        if (!dayTop || !dayEvents) return;
        
        // Find ALL block events (all-day events) in this cell
        const allBlockEvents = dayCell.querySelectorAll('.fc-daygrid-block-event');
        
        console.log(`[DAY CELL] Found ${allBlockEvents.length} block events total`);
        
        allBlockEvents.forEach((blockEvent, index) => {
          const harness = blockEvent.closest('.fc-daygrid-event-harness');
          
          if (!harness) return;
          
          // Check if already in day-top
          if (dayTop.contains(harness)) {
            console.log(`[BLOCK EVENT ${index}] Already in day-top`);
            return;
          }
          
          console.log(`[BLOCK EVENT ${index}] Moving to day-top`);
          
          // Move before the date number
          const dateNumber = dayTop.querySelector('.fc-daygrid-day-number');
          if (dateNumber) {
            dayTop.insertBefore(harness, dateNumber);
          } else {
            dayTop.appendChild(harness);
          }
        });
      });
    };
    
    // Run multiple times to catch all events
    const timer1 = setTimeout(moveAllDayEvents, 100);
    const timer2 = setTimeout(moveAllDayEvents, 300);
    const timer3 = setTimeout(moveAllDayEvents, 500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [events]);


  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // Fetch data from Django API with credentials
      const response = await fetch(`https://localhost:8000/api/appointments/calendar_data/`, {
        credentials: 'include',
      });
      
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
      // Get CSRF token
      const csrfResponse = await fetch('https://localhost:8000/api/auth/csrf-token/', {
        credentials: 'include',
      });
      const csrfData = await csrfResponse.json();

      const response = await fetch(`https://localhost:8000/api/appointments/${info.event.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfData.csrfToken,
        },
        credentials: 'include',
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
      // Get CSRF token
      const csrfResponse = await fetch('https://localhost:8000/api/auth/csrf-token/', {
        credentials: 'include',
      });
      const csrfData = await csrfResponse.json();

      const response = await fetch(`https://localhost:8000/api/appointments/${info.event.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfData.csrfToken,
        },
        credentials: 'include',
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

  // Handle event click - open details dialog
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

  // Handle date click - detect double-click for creating appointments
  const handleDateClick = (info: any) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;

    // Check if this is an all-day click
    const isAllDay = info.allDay || false;
    
    // Get current view
    const currentView = calendarRef.current?.getApi().view.type;

    // If in month view, navigate to week view for that date (single click)
    if (currentView === 'dayGridMonth') {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi.changeView('timeGridWeek', info.date);
      }
      return; // Don't process double-click in month view
    }

    // If clicked within 300ms, it's a double-click (for day/week views only)
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
      
      setLastClickTime(0); // Reset
    } else {
      // Single click - just remember it
      setLastClickTime(now);
      setLastClickInfo(info);
    }
  };

  // Handle date select (create new appointment) - only on double-click
  const handleDateSelect = (selectInfo: any) => {
    // Disabled - using dateClick for double-click detection instead
    selectInfo.view.calendar.unselect();
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

        <style dangerouslySetInnerHTML={{__html: `
          /* Add vertical lines between days in week view */
          .fc-timeGridWeek-view .fc-col-header-cell {
            border-right: 1px solid #3A4048 !important;
          }
          
          .fc-timeGridWeek-view .fc-timegrid-col {
            border-right: 1px solid #3A4048 !important;
          }
          
          .fc-timeGridWeek-view .fc-timegrid-slot {
            border-top-color: #2D3748 !important;
          }
          
          /* Make vertical lines show on top of horizontal slot lines */
          .fc-timeGridWeek-view .fc-timegrid-col.fc-day {
            position: relative;
          }
          
          .fc-timeGridWeek-view .fc-timegrid-col.fc-day::after {
            content: '';
            position: absolute;
            right: -0.5px;
            top: 0;
            bottom: 0;
            width: 1px;
            background-color: #3A4048;
            z-index: 2;
            pointer-events: none;
          }
          
          /* Remove double border on last column */
          .fc-timeGridWeek-view .fc-timegrid-col.fc-day:last-child::after {
            display: none;
          }
          
          /* Style the day headers */
          .fc-col-header-cell {
            background-color: #25262B !important;
            font-weight: 600;
            border-right: 1px solid #3A4048 !important;
          }
          
          /* Make day headers clickable in week view */
          .fc-timeGridWeek-view .fc-col-header-cell {
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .fc-timeGridWeek-view .fc-col-header-cell:hover {
            background-color: #2D3748 !important;
          }
          
          /* Today column highlight */
          .fc-day-today {
            background-color: rgba(51, 154, 240, 0.08) !important;
          }
          
          /* Make date cells clickable in month view */
          .fc-dayGridMonth-view .fc-daygrid-day {
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .fc-dayGridMonth-view .fc-daygrid-day:hover {
            background-color: rgba(255, 255, 255, 0.05) !important;
          }
          
          /* Month view: day-top should contain block events horizontally with date on right */
          .fc-dayGridMonth-view .fc-daygrid-day-top {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            position: relative !important;
            min-height: 30px !important;
            padding: 4px !important;
            gap: 4px !important;
          }
          
          /* Date number on the right in day-top */
          .fc-dayGridMonth-view .fc-daygrid-day-number {
            margin-left: auto !important;
            order: 999 !important;
            padding: 4px 8px !important;
            font-size: 18px !important;
            font-weight: 600 !important;
            flex-shrink: 0 !important;
          }
          
          /* All-day block events in day-top share space equally */
          .fc-dayGridMonth-view .fc-daygrid-day-top .fc-daygrid-event-harness {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            margin: 0 !important;
          }
          
          .fc-dayGridMonth-view .fc-daygrid-day-top .fc-daygrid-block-event {
            width: 100% !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          
          /* Regular appointments stay in day-events section (below day-top) */
          .fc-dayGridMonth-view .fc-daygrid-day-events {
            display: block !important;
            position: relative !important;
            margin-top: 0 !important;
          }
        `}} />
        <div style={{ height: 'calc(100vh - 200px)' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridDay,timeGridWeek,dayGridMonth'
            }}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
            events={events}
            editable={true}
            selectable={false}
            selectMirror={false}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            slotMinTime="07:00:00"
            slotMaxTime="18:00:00"
            slotDuration="00:15:00"
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            select={handleDateSelect}
            allDaySlot={true}
            height="100%"
            nowIndicator={true}
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5],
              startTime: '08:00',
              endTime: '17:00',
            }}
            eventOverlap={true}
            slotEventOverlap={false}
            eventContent={(eventInfo) => {
              const isSmsConfirmed = eventInfo.event.extendedProps?.smsConfirmed;
              
              return (
                <div style={{ 
                  overflow: 'hidden', 
                  fontSize: '12px', 
                  padding: '2px 4px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  position: 'relative',
                  zIndex: 10,
                  width: '100%',
                  height: '100%'
                }}>
                  <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    flexGrow: 1
                  }}>{eventInfo.event.title}</span>
                  {isSmsConfirmed && (
                    <span style={{ 
                      color: '#ffffff', 
                      fontSize: '16px', 
                      fontWeight: 'bold',
                      lineHeight: '1',
                      display: 'inline-block',
                      flexShrink: 0,
                      zIndex: 20,
                      textShadow: '0 0 3px rgba(0,0,0,0.8)',
                      marginLeft: 'auto'
                    }} title="Patient confirmed via SMS">✓</span>
                  )}
                </div>
              );
            }}
          />
        </div>
      </Paper>

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
    </>
  );
}

