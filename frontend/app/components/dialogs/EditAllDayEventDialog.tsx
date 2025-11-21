'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Button,
  Select,
  Textarea,
  Paper,
  LoadingOverlay,
  Alert,
  Badge,
  ActionIcon,
  Checkbox,
  Radio,
  NumberInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import {
  IconCalendar,
  IconBuildingHospital,
  IconStethoscope,
  IconNotes,
  IconAlertCircle,
  IconEdit,
  IconTrash,
  IconRepeat,
  IconCheck,
  IconInfoCircle,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

interface EditAllDayEventDialogProps {
  opened: boolean;
  onClose: () => void;
  eventId: string | null;
  onUpdate?: () => void;
}

interface AllDayEvent {
  id: string;
  clinic: string;
  clinic_name: string;
  clinician: string | null;
  clinician_name: string | null;
  appointment_type: string | null;
  appointment_type_name: string | null;
  start_time: string;
  end_time: string;
  notes: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurrence_group_id: string | null;
  recurrence_end_date: string | null;
  created_at: string;
  updated_at: string;
}

interface Clinician {
  id: string;
  full_name: string;
}

interface Clinic {
  id: string;
  name: string;
}

interface AppointmentType {
  id: string;
  name: string;
}

export default function EditAllDayEventDialog({
  opened,
  onClose,
  eventId,
  onUpdate,
}: EditAllDayEventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<AllDayEvent | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Edit state
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editClinicId, setEditClinicId] = useState<string | null>(null);
  const [editClinicianId, setEditClinicianId] = useState<string | null>(null);
  const [editAppointmentTypeId, setEditAppointmentTypeId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  // Recurring fields (edit state)
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editRecurrencePattern, setEditRecurrencePattern] = useState<string | null>(null);
  const [editRecurrenceEndType, setEditRecurrenceEndType] = useState<'occurrences' | 'date'>('occurrences');
  const [editNumberOfOccurrences, setEditNumberOfOccurrences] = useState<number>(4);
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState<Date | null>(null);

  // Dropdown options
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);

  useEffect(() => {
    if (opened && eventId) {
      loadEvent();
      loadDropdownOptions();
    }
  }, [opened, eventId]);

  const fetchAllPages = async (url: string) => {
    let results: any[] = [];
    let nextUrl: string | null = url;
    while (nextUrl) {
      const response = await fetch(nextUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load data');
      const data = await response.json();
      results = results.concat(data.results);
      nextUrl = data.next;
    }
    return results;
  };

  const loadEvent = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const response = await fetch(`https://localhost:8000/api/appointments/${eventId}/`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load event');
      const data = await response.json();
      setEvent(data);
      
      // Initialize edit state
      setEditDate(new Date(data.start_time));
      setEditClinicId(data.clinic);
      setEditClinicianId(data.clinician);
      setEditAppointmentTypeId(data.appointment_type);
      setEditNotes(data.notes || '');
      
      // Initialize recurring fields
      setEditIsRecurring(data.is_recurring || false);
      setEditRecurrencePattern(data.recurrence_pattern || null);
      if (data.recurrence_end_date) {
        setEditRecurrenceEndType('date');
        setEditRecurrenceEndDate(new Date(data.recurrence_end_date));
      } else {
        setEditRecurrenceEndType('occurrences');
        setEditNumberOfOccurrences(4);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load event details',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownOptions = async () => {
    try {
      const [cliniciansData, clinicsData, typesData] = await Promise.all([
        fetchAllPages('https://localhost:8000/api/clinicians/'),
        fetchAllPages('https://localhost:8000/api/clinics/'),
        fetchAllPages('https://localhost:8000/api/appointment-types/'),
      ]);
      setClinicians(cliniciansData);
      setClinics(clinicsData);
      setAppointmentTypes(typesData);
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const handleSave = async () => {
    if (!event || !editDate || !editClinicId || !editNotes.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please fill in all required fields',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const csrfResponse = await fetch('https://localhost:8000/api/auth/csrf-token/', {
        credentials: 'include',
      });
      const csrfData = await csrfResponse.json();

      const startOfDay = dayjs(editDate).startOf('day');
      const endOfDay = dayjs(editDate).endOf('day');

      const response = await fetch(`https://localhost:8000/api/appointments/${event.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfData.csrfToken,
        },
        body: JSON.stringify({
          start_time: startOfDay.toISOString(),
          end_time: endOfDay.toISOString(),
          clinic: editClinicId,
          clinician: editClinicianId,
          appointment_type: editAppointmentTypeId,
          notes: editNotes,
        }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to update event');

      notifications.show({
        title: 'Success',
        message: 'All-day event updated successfully',
        color: 'green',
      });

      setEditMode(false);
      loadEvent();
      onUpdate?.();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update event',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: 'Delete All-Day Event',
      children: (
        <Text size="sm">
          Are you sure you want to delete this all-day event? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        if (!event) return;
        try {
          const csrfResponse = await fetch('https://localhost:8000/api/auth/csrf-token/', {
            credentials: 'include',
          });
          const csrfData = await csrfResponse.json();

          const response = await fetch(`https://localhost:8000/api/appointments/${event.id}/`, {
            method: 'DELETE',
            headers: { 'X-CSRFToken': csrfData.csrfToken },
            credentials: 'include',
          });

          if (!response.ok) throw new Error('Failed to delete');

          notifications.show({
            title: 'Success',
            message: 'Event deleted successfully',
            color: 'green',
          });

          onUpdate?.();
          onClose();
        } catch (error) {
          notifications.show({
            title: 'Error',
            message: 'Failed to delete event',
            color: 'red',
          });
        }
      },
    });
  };

  const handleCancel = () => {
    if (!event) return;
    setEditDate(new Date(event.start_time));
    setEditClinicId(event.clinic);
    setEditClinicianId(event.clinician);
    setEditAppointmentTypeId(event.appointment_type);
    setEditNotes(event.notes || '');
    
    // Reset recurring fields
    setEditIsRecurring(event.is_recurring || false);
    setEditRecurrencePattern(event.recurrence_pattern || null);
    if (event.recurrence_end_date) {
      setEditRecurrenceEndType('date');
      setEditRecurrenceEndDate(new Date(event.recurrence_end_date));
    } else {
      setEditRecurrenceEndType('occurrences');
      setEditNumberOfOccurrences(4);
    }
    
    setEditMode(false);
  };

  if (!event) {
    return null;
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <IconCalendar size={24} />
          <Text size="lg" fw={600}>
            All-Day Event Details
          </Text>
        </Group>
      }
      size="lg"
      centered
    >
      <LoadingOverlay visible={loading} />

      <Stack gap="md">
        {/* Action Buttons */}
        {!editMode && (
          <Group justify="flex-end">
            <ActionIcon variant="light" color="blue" onClick={() => setEditMode(true)}>
              <IconEdit size={18} />
            </ActionIcon>
            <ActionIcon variant="light" color="red" onClick={handleDelete}>
              <IconTrash size={18} />
            </ActionIcon>
          </Group>
        )}

        {/* Event Title */}
        <Paper p="md" withBorder>
          <Group gap="sm" mb="xs">
            <IconCalendar size={20} style={{ color: 'var(--mantine-color-violet-6)' }} />
            <Text fw={600} size="sm" c="dimmed">
              Event
            </Text>
          </Group>
          {editMode ? (
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.currentTarget.value)}
              required
              autosize
              minRows={2}
            />
          ) : (
            <Text size="lg" fw={500}>{event.notes}</Text>
          )}
        </Paper>

        {/* Date */}
        <Paper p="md" withBorder>
          <Group gap="sm" mb="xs">
            <IconCalendar size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
            <Text fw={600} size="sm" c="dimmed">
              Date
            </Text>
          </Group>
          {editMode ? (
            <DatePickerInput
              value={editDate}
              onChange={setEditDate}
              required
            />
          ) : (
            <>
              <Text size="md">{dayjs(event.start_time).format('ddd, D MMM YYYY')}</Text>
              <Text size="xs" c="dimmed" mt="xs">All-day event (00:00 - 23:59)</Text>
              
              {event.is_recurring && (
                <Badge color="blue" variant="light" mt="sm" leftSection={<IconRepeat size={14} />}>
                  Recurring: {
                    event.recurrence_pattern === 'daily' ? 'Daily' :
                    event.recurrence_pattern === 'weekly' ? 'Weekly' :
                    event.recurrence_pattern === 'biweekly' ? 'Every 2 Weeks' :
                    event.recurrence_pattern === 'monthly' ? 'Monthly' :
                    'Unknown'
                  }
                </Badge>
              )}
            </>
          )}
        </Paper>

        {/* Clinic & Clinician */}
        <Group grow>
          <Paper p="md" withBorder>
            <Group gap="sm" mb="xs">
              <IconBuildingHospital size={20} style={{ color: 'var(--mantine-color-green-6)' }} />
              <Text fw={600} size="sm" c="dimmed">
                Clinic
              </Text>
            </Group>
            {editMode ? (
              <Select
                data={clinics.map(c => ({ value: c.id, label: c.name }))}
                value={editClinicId}
                onChange={setEditClinicId}
                required
              />
            ) : (
              <Text size="sm">{event.clinic_name}</Text>
            )}
          </Paper>

          <Paper p="md" withBorder>
            <Group gap="sm" mb="xs">
              <IconStethoscope size={20} style={{ color: 'var(--mantine-color-teal-6)' }} />
              <Text fw={600} size="sm" c="dimmed">
                Clinician
              </Text>
            </Group>
            {editMode ? (
              <Select
                data={clinicians.map(c => ({ value: c.id, label: c.full_name }))}
                value={editClinicianId}
                onChange={setEditClinicianId}
                clearable
                placeholder="None"
              />
            ) : (
              <Text size="sm">{event.clinician_name || 'None'}</Text>
            )}
          </Paper>
        </Group>

        {/* Appointment Type */}
        {appointmentTypes.length > 0 && (
          <Paper p="md" withBorder>
            <Group gap="sm" mb="xs">
              <IconCalendar size={20} style={{ color: 'var(--mantine-color-violet-6)' }} />
              <Text fw={600} size="sm" c="dimmed">
                Event Type
              </Text>
            </Group>
            {editMode ? (
              <Select
                data={appointmentTypes.map(t => ({ value: t.id, label: t.name }))}
                value={editAppointmentTypeId}
                onChange={setEditAppointmentTypeId}
                clearable
                placeholder="None"
              />
            ) : (
              <Text size="sm">{event.appointment_type_name || 'None'}</Text>
            )}
          </Paper>
        )}

        {/* Recurring Appointment */}
        {editMode && (
          <Paper p="md" withBorder>
            <Group gap="sm" mb="xs">
              <IconRepeat size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
              <Text fw={600} size="sm" c="dimmed">
                Recurring Event
              </Text>
            </Group>
            <Checkbox
              label="Make this a recurring event"
              checked={editIsRecurring}
              onChange={(e) => setEditIsRecurring(e.currentTarget.checked)}
              mb="sm"
            />

            {editIsRecurring && (
              <Stack gap="sm">
                <Select
                  label="Repeat"
                  placeholder="Select frequency"
                  data={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'biweekly', label: 'Every 2 Weeks' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                  value={editRecurrencePattern}
                  onChange={setEditRecurrencePattern}
                  required
                  withAsterisk
                />

                <Radio.Group
                  label="End after"
                  value={editRecurrenceEndType}
                  onChange={(value: 'occurrences' | 'date') => setEditRecurrenceEndType(value)}
                  required
                >
                  <Group mt="xs">
                    <Radio value="occurrences" label="Number of occurrences" />
                    <Radio value="date" label="Specific date" />
                  </Group>
                </Radio.Group>

                {editRecurrenceEndType === 'occurrences' && (
                  <NumberInput
                    label="Number of occurrences"
                    placeholder="e.g., 4"
                    value={editNumberOfOccurrences}
                    onChange={(val) => setEditNumberOfOccurrences(Number(val) || 1)}
                    min={1}
                    max={52}
                    required
                    withAsterisk
                  />
                )}

                {editRecurrenceEndType === 'date' && (
                  <DatePickerInput
                    label="End date"
                    placeholder="Select end date"
                    value={editRecurrenceEndDate}
                    onChange={setEditRecurrenceEndDate}
                    minDate={editDate || new Date()}
                    required
                    withAsterisk
                  />
                )}

                {/* Recurrence Summary */}
                {editIsRecurring && editRecurrencePattern && (
                  <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />} mt="sm">
                    <Text size="sm">
                      This will create multiple events repeating {editRecurrencePattern}
                      {editRecurrenceEndType === 'occurrences' && ` for ${editNumberOfOccurrences} times.`}
                      {editRecurrenceEndType === 'date' && editRecurrenceEndDate && ` until ${dayjs(editRecurrenceEndDate).format('MMM D, YYYY')}.`}
                    </Text>
                  </Alert>
                )}
              </Stack>
            )}
          </Paper>
        )}

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          {editMode ? (
            <>
              <Button variant="default" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} leftSection={<IconCheck size={16} />}>
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}

