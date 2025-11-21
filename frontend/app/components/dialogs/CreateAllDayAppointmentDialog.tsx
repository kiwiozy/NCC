'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  IconCalendar,
  IconUser,
  IconBuildingHospital,
  IconStethoscope,
  IconNotes,
  IconAlertCircle,
} from '@tabler/icons-react';

dayjs.extend(utc);
dayjs.extend(timezone);

interface CreateAllDayAppointmentDialogProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date | string;
}

interface Patient {
  id: string;
  full_name: string;
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
  default_duration_minutes: number;
}

export default function CreateAllDayAppointmentDialog({
  opened,
  onClose,
  onSuccess,
  initialDate,
}: CreateAllDayAppointmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [clinicianId, setClinicianId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [appointmentTypeId, setAppointmentTypeId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  // Dropdown options
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);

  const resetForm = useCallback(() => {
    setSelectedDate(null);
    setClinicianId(null);
    setClinicId(null);
    setAppointmentTypeId(null);
    setNotes('');
    setError(null);
  }, []);

  // Initialize date from initialDate
  useEffect(() => {
    if (opened) {
      if (initialDate) {
        const date = typeof initialDate === 'string' ? new Date(initialDate) : initialDate;
        setSelectedDate(date);
      } else {
        resetForm();
      }
    }
  }, [opened, initialDate, resetForm]);

  // Load dropdown options
  useEffect(() => {
    if (opened) {
      loadClinicians();
      loadClinics();
      loadAppointmentTypes();
    }
  }, [opened]);

  const fetchAllPages = async (url: string) => {
    let results: any[] = [];
    let nextUrl: string | null = url;

    while (nextUrl) {
      const response = await fetch(nextUrl, { credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to load data from ${url}`);
      const data = await response.json();
      results = results.concat(data.results);
      nextUrl = data.next;
    }
    return results;
  };

  const loadClinicians = async () => {
    try {
      const data = await fetchAllPages('https://localhost:8000/api/clinicians/');
      setClinicians(data);
    } catch (err: any) {
      console.error('Error loading clinicians:', err);
    }
  };

  const loadClinics = async () => {
    try {
      const data = await fetchAllPages('https://localhost:8000/api/clinics/');
      setClinics(data);
    } catch (err: any) {
      console.error('Error loading clinics:', err);
    }
  };

  const loadAppointmentTypes = async () => {
    try {
      const data = await fetchAllPages('https://localhost:8000/api/appointment-types/');
      setAppointmentTypes(data);
    } catch (err: any) {
      console.error('Error loading appointment types:', err);
    }
  };

  const getCsrfToken = async (): Promise<string | null> => {
    try {
      const response = await fetch('https://localhost:8000/api/auth/csrf-token/', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      const data = await response.json();
      return data.csrfToken || null;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to get CSRF token for authentication.',
        color: 'red',
      });
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!clinicId || !selectedDate || !notes) {
      setError('Please fill in all required fields (Date, Event Title, Clinic).');
      return;
    }

    setLoading(true);
    setError(null);

    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      setLoading(false);
      return;
    }

    try {
      // For all-day appointments, set start time to 00:00 and end time to 23:59 on the selected date
      const startOfDay = dayjs(selectedDate).startOf('day');
      const endOfDay = dayjs(selectedDate).endOf('day');

      const payload: any = {
        patient: null, // All-day events have no patient
        clinician: clinicianId,
        clinic: clinicId,
        appointment_type: appointmentTypeId,
        start_time: startOfDay.toISOString(),
        end_time: endOfDay.toISOString(),
        status: 'scheduled', // Default status for all-day events
        notes: notes,
      };

      const response = await fetch('https://localhost:8000/api/appointments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create all-day event');
      }

      notifications.show({
        title: 'Success',
        message: 'All-day event created successfully',
        color: 'green',
      });

      // Reset form
      resetForm();
      onSuccess(); // Notify parent to refresh calendar
      onClose(); // Close dialog
    } catch (err: any) {
      setError(err.message);
      notifications.show({
        title: 'Error',
        message: `Failed to create all-day event: ${err.message}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
        title={
          <Group gap="sm">
            <IconCalendar size={24} />
            <Text size="lg" fw={600}>
              Create All-Day Event
            </Text>
          </Group>
        }
      size="lg"
      centered
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
    >
      <LoadingOverlay visible={loading} />

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack gap="md">
        {/* Date */}
        <Paper p="md" withBorder>
          <Group gap="sm" mb="xs">
            <IconCalendar size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
            <Text fw={600} size="sm" c="dimmed">
              Date
            </Text>
          </Group>
          <DatePickerInput
            placeholder="Select date"
            value={selectedDate}
            onChange={setSelectedDate}
            required
            withAsterisk
            clearable
          />
          <Text size="xs" c="dimmed" mt="xs">
            This appointment will run for the entire day (00:00 - 23:59)
          </Text>
        </Paper>

        {/* Event Title/Purpose */}
        <Paper p="md" withBorder>
          <Group gap="sm" mb="xs">
            <IconNotes size={20} style={{ color: 'var(--mantine-color-violet-6)' }} />
            <Text fw={600} size="sm" c="dimmed">
              Event Title
            </Text>
          </Group>
          <Textarea
            placeholder="e.g., Public Holiday, Clinic Closed, Staff Meeting"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            required
            withAsterisk
            autosize
            minRows={2}
          />
          <Text size="xs" c="dimmed" mt="xs">
            Describe what this all-day event is for (holiday, closure, meeting, etc.)
          </Text>
        </Paper>

        {/* Clinic */}
        <Paper p="md" withBorder>
          <Group gap="sm" mb="xs">
            <IconBuildingHospital size={20} style={{ color: 'var(--mantine-color-green-6)' }} />
            <Text fw={600} size="sm" c="dimmed">
              Clinic
            </Text>
          </Group>
          <Select
            placeholder="Select clinic"
            data={clinics.map(c => ({ value: c.id, label: c.name }))}
            value={clinicId}
            onChange={setClinicId}
            searchable
            required
            withAsterisk
          />
          <Text size="xs" c="dimmed" mt="xs">
            Which clinic is this event for?
          </Text>
        </Paper>

        {/* Clinician (Optional) */}
        <Paper p="md" withBorder>
          <Group gap="sm" mb="xs">
            <IconStethoscope size={20} style={{ color: 'var(--mantine-color-teal-6)' }} />
            <Text fw={600} size="sm" c="dimmed">
              Clinician (Optional)
            </Text>
          </Group>
          <Select
            placeholder="Select clinician (optional)"
            data={clinicians.map(c => ({ value: c.id, label: c.full_name }))}
            value={clinicianId}
            onChange={setClinicianId}
            searchable
            clearable
          />
          <Text size="xs" c="dimmed" mt="xs">
            Leave empty for clinic-wide events
          </Text>
        </Paper>

        {/* Appointment Type */}
        {appointmentTypes.length > 0 && (
          <Paper p="md" withBorder>
            <Group gap="sm" mb="xs">
              <IconCalendar size={20} style={{ color: 'var(--mantine-color-violet-6)' }} />
              <Text fw={600} size="sm" c="dimmed">
                Event Type (Optional)
              </Text>
            </Group>
            <Select
              placeholder="Select event type (optional)"
              data={appointmentTypes.map(t => ({ value: t.id, label: t.name }))}
              value={appointmentTypeId}
              onChange={setAppointmentTypeId}
              searchable
              clearable
            />
          </Paper>
        )}

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Create All-Day Event
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

