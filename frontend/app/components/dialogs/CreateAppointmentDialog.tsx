'use client';

import { useState, useEffect } from 'react';
import {
  Modal, TextInput, Textarea, Select, Button, Stack, Group, NumberInput,
  LoadingOverlay, Alert, Paper, Text, Divider, Badge, Checkbox, Radio
} from '@mantine/core';
import { DateTimePicker, DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle, IconCalendar, IconUser, IconBuildingHospital,
  IconStethoscope, IconClock, IconNotes, IconCheck, IconX, IconRepeat
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

interface CreateAppointmentDialogProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date | string;
  followupData?: {
    patientId: string;
    patientName: string;
    clinicId: string;
    clinicianId: string | null;
    appointmentTypeId: string | null;
    parentAppointmentId: string;
    parentAppointmentDate: string;
    targetDate: string;
    notes: string;
  } | null;
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

export default function CreateAppointmentDialog({
  opened,
  onClose,
  onSuccess,
  initialDate,
  followupData,
}: CreateAppointmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string>(''); // For non-patient events
  const [isEvent, setIsEvent] = useState(false); // Toggle between patient appointment and event
  const [clinicianId, setClinicianId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [appointmentTypeId, setAppointmentTypeId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('scheduled');
  const [notes, setNotes] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);

  // Recurring appointment fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<string | null>(null);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'occurrences' | 'date'>('occurrences');
  const [numberOfOccurrences, setNumberOfOccurrences] = useState<number>(4);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);

  // Dropdown options
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);

  // Initialize start time from initialDate
  useEffect(() => {
    if (opened && initialDate) {
      const date = typeof initialDate === 'string' ? new Date(initialDate) : initialDate;
      setStartTime(date);
      
      // Auto-calculate end time based on default duration
      const end = new Date(date);
      end.setMinutes(end.getMinutes() + durationMinutes);
      setEndTime(end);
    }
  }, [opened, initialDate]);

  // Pre-populate fields when followupData is provided
  useEffect(() => {
    if (opened && followupData) {
      setPatientId(followupData.patientId);
      setClinicId(followupData.clinicId);
      setClinicianId(followupData.clinicianId);
      setAppointmentTypeId(followupData.appointmentTypeId);
      setNotes(followupData.notes);
      
      // Set parent appointment in the body (will be sent when creating)
      // This will link the appointments together
    }
  }, [opened, followupData]);

  // Auto-calculate end time when start time or duration changes
  useEffect(() => {
    if (startTime && durationMinutes > 0) {
      const end = new Date(startTime);
      end.setMinutes(end.getMinutes() + durationMinutes);
      setEndTime(end);
    }
  }, [startTime, durationMinutes]);

  // Load dropdown data when dialog opens
  useEffect(() => {
    if (opened) {
      loadPatients();
      loadClinicians();
      loadClinics();
      loadAppointmentTypes();
    }
  }, [opened]);

  // Update duration when appointment type changes
  useEffect(() => {
    if (appointmentTypeId) {
      const selectedType = appointmentTypes.find(t => t.id === appointmentTypeId);
      if (selectedType) {
        setDurationMinutes(selectedType.default_duration_minutes);
      }
    }
  }, [appointmentTypeId, appointmentTypes]);

  const loadPatients = async () => {
    try {
      let allPatients: Patient[] = [];
      let nextUrl: string | null = 'https://localhost:8000/api/patients/?page_size=100';

      // Fetch all pages
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load patients');
        const data = await response.json();
        
        if (Array.isArray(data.results)) {
          allPatients = [...allPatients, ...data.results];
        }
        
        nextUrl = data.next; // Get next page URL or null if no more pages
      }

      setPatients(allPatients);
    } catch (err: any) {
      console.error('Error loading patients:', err);
    }
  };

  const loadClinicians = async () => {
    try {
      let allClinicians: Clinician[] = [];
      let nextUrl: string | null = 'https://localhost:8000/api/clinicians/?page_size=100';

      // Fetch all pages
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load clinicians');
        const data = await response.json();
        
        if (Array.isArray(data.results)) {
          allClinicians = [...allClinicians, ...data.results];
        }
        
        nextUrl = data.next;
      }

      setClinicians(allClinicians);
    } catch (err: any) {
      console.error('Error loading clinicians:', err);
    }
  };

  const loadClinics = async () => {
    try {
      let allClinics: Clinic[] = [];
      let nextUrl: string | null = 'https://localhost:8000/api/clinics/?page_size=100';

      // Fetch all pages
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load clinics');
        const data = await response.json();
        
        if (Array.isArray(data.results)) {
          allClinics = [...allClinics, ...data.results];
        }
        
        nextUrl = data.next;
      }

      setClinics(allClinics);
    } catch (err: any) {
      console.error('Error loading clinics:', err);
    }
  };

  const loadAppointmentTypes = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/appointment-types/', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load appointment types');
      const data = await response.json();
      setAppointmentTypes(Array.isArray(data.results) ? data.results : []);
    } catch (err: any) {
      console.error('Error loading appointment types:', err);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (isEvent && !eventTitle.trim()) {
      setError('Please enter an event title');
      return;
    }
    if (!isEvent && !patientId) {
      setError('Please select a patient');
      return;
    }
    if (!clinicId) {
      setError('Please select a clinic');
      return;
    }
    if (!startTime || !endTime) {
      setError('Please select start and end times');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get CSRF token
      const csrfResponse = await fetch('https://localhost:8000/api/auth/csrf-token/', {
        credentials: 'include',
      });
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      if (!csrfToken) {
        throw new Error('CSRF token not available');
      }

      const response = await fetch('https://localhost:8000/api/appointments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          patient: isEvent ? null : patientId, // Null for events, patient ID for appointments
          clinician: clinicianId,
          clinic: clinicId,
          appointment_type: appointmentTypeId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status,
          notes: isEvent ? eventTitle : notes, // Use eventTitle as notes for events
          parent_appointment: followupData?.parentAppointmentId || null,
          // Recurring fields
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? recurrencePattern : null,
          number_of_occurrences: isRecurring && recurrenceEndType === 'occurrences' ? numberOfOccurrences : null,
          recurrence_end_date: isRecurring && recurrenceEndType === 'date' && recurrenceEndDate ? dayjs(recurrenceEndDate).endOf('day').toISOString() : null,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create appointment');
      }

      notifications.show({
        title: 'Success',
        message: 'Appointment created successfully',
        color: 'green',
      });

      // Reset form
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
      notifications.show({
        title: 'Error',
        message: `Failed to create appointment: ${err.message}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStartTime(null);
    setEndTime(null);
    setPatientId(null);
    setClinicianId(null);
    setClinicId(null);
    setAppointmentTypeId(null);
    setStatus('scheduled');
    setNotes('');
    setDurationMinutes(30);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const STATUS_CHOICES = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'checked_in', label: 'Checked In' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no_show', label: 'No Show' },
  ];

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <IconCalendar size={24} />
          <Text size="lg" fw={600}>
            Create New Appointment
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
      <div style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack gap="md">
          <Divider />

          {/* Patient or Event Toggle */}
          <Paper p="md" withBorder>
            <Checkbox
              label="This is an event (not a patient appointment)"
              checked={isEvent}
              onChange={(e) => {
                setIsEvent(e.currentTarget.checked);
                if (e.currentTarget.checked) {
                  setPatientId(null); // Clear patient when switching to event
                } else {
                  setEventTitle(''); // Clear event title when switching to patient
                }
              }}
            />
          </Paper>

          {/* Patient Search - Only show for patient appointments */}
          {!isEvent && (
            <Paper p="md" withBorder>
              <Group gap="sm" mb="xs">
                <IconUser size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Text fw={600} size="sm" c="dimmed">
                  Patient
                </Text>
              </Group>
              <Select
                placeholder="Search and select patient"
                data={patients.map(p => ({ value: p.id, label: p.full_name }))}
                value={patientId}
                onChange={setPatientId}
                searchable
                clearable
                required
                size="md"
              />
            </Paper>
          )}

          {/* Event Title - Only show for events */}
          {isEvent && (
            <Paper p="md" withBorder>
              <Group gap="sm" mb="xs">
                <IconCalendar size={20} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Text fw={600} size="sm" c="dimmed">
                  Event Title
                </Text>
              </Group>
              <TextInput
                placeholder="e.g., Staff Meeting, Training Session, Break"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.currentTarget.value)}
                required
                size="md"
              />
            </Paper>
          )}

          {/* Clinic & Clinician Side by Side */}
          <Group grow>
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
            </Paper>

            <Paper p="md" withBorder>
              <Group gap="sm" mb="xs">
                <IconStethoscope size={20} style={{ color: 'var(--mantine-color-teal-6)' }} />
                <Text fw={600} size="sm" c="dimmed">
                  Clinician
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
            </Paper>
          </Group>

          {/* Appointment Type */}
          {appointmentTypes.length > 0 && (
            <Paper p="md" withBorder>
              <Group gap="sm" mb="xs">
                <IconCalendar size={20} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Text fw={600} size="sm" c="dimmed">
                  Appointment Type
                </Text>
              </Group>
              <Select
                placeholder="Select appointment type (optional)"
                data={appointmentTypes.map(t => ({ value: t.id, label: `${t.name} (${t.default_duration_minutes} min)` }))}
                value={appointmentTypeId}
                onChange={setAppointmentTypeId}
                searchable
                clearable
              />
            </Paper>
          )}

          {/* Date & Time */}
          <Paper p="md" withBorder>
            <Group gap="sm" mb="xs">
              <IconClock size={20} style={{ color: 'var(--mantine-color-orange-6)' }} />
              <Text fw={600} size="sm" c="dimmed">
                Date & Time
              </Text>
            </Group>
            <Stack gap="sm">
              <Group grow>
                <DateTimePicker
                  label="Start Time"
                  placeholder="Select start time"
                  value={startTime}
                  onChange={setStartTime}
                  required
                  withAsterisk
                  clearable
                />
                <NumberInput
                  label="Duration (minutes)"
                  placeholder="30"
                  value={durationMinutes}
                  onChange={(val) => setDurationMinutes(Number(val) || 30)}
                  min={5}
                  max={480}
                  step={5}
                  required
                  withAsterisk
                />
              </Group>
              <DateTimePicker
                label="End Time"
                placeholder="Auto-calculated"
                value={endTime}
                onChange={setEndTime}
                required
                withAsterisk
                clearable
              />
            </Stack>
          </Paper>

          {/* Notes */}
          <div>
            <Group gap="sm" mb="xs">
              <IconNotes size={20} style={{ color: 'var(--mantine-color-violet-6)' }} />
              <Text fw={600} size="sm" c="dimmed">
                Notes
              </Text>
            </Group>
            <Textarea
              placeholder="Internal notes about this appointment"
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              autosize
              minRows={2}
            />
          </div>

          {/* Recurring Appointment */}
          <Paper p="md" withBorder>
            <Checkbox
              label={
                <Group gap="xs">
                  <IconRepeat size={16} />
                  <Text fw={600} size="sm">
                    Recurring Appointment
                  </Text>
                </Group>
              }
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.currentTarget.checked)}
              mb={isRecurring ? "md" : 0}
            />

            {isRecurring && (
              <Stack gap="sm" mt="md">
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
                  label="End after"
                  value={recurrenceEndType}
                  onChange={(value) => setRecurrenceEndType(value as 'occurrences' | 'date')}
                >
                  <Stack gap="xs" mt="xs">
                    <Radio value="occurrences" label="Number of occurrences" />
                    <Radio value="date" label="Specific end date" />
                  </Stack>
                </Radio.Group>

                {recurrenceEndType === 'occurrences' && (
                  <NumberInput
                    label="Number of occurrences"
                    placeholder="4"
                    value={numberOfOccurrences}
                    onChange={(val) => setNumberOfOccurrences(Number(val) || 1)}
                    min={1}
                    max={52}
                    required
                  />
                )}

                {recurrenceEndType === 'date' && (
                  <DatePickerInput
                    label="End date"
                    placeholder="Select end date"
                    value={recurrenceEndDate}
                    onChange={setRecurrenceEndDate}
                    minDate={startTime || undefined}
                    required
                    clearable
                  />
                )}

                <Alert color="blue" variant="light">
                  <Text size="xs">
                    This will create {recurrenceEndType === 'occurrences' ? numberOfOccurrences : 'multiple'} appointments with the same details.
                  </Text>
                </Alert>
              </Stack>
            )}
          </Paper>

          {/* Status */}
          <Paper p="md" withBorder>
            <Group gap="sm" mb="xs">
              <IconCheck size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
              <Text fw={600} size="sm" c="dimmed">
                Status
              </Text>
            </Group>
            <Select
              data={STATUS_CHOICES}
              value={status}
              onChange={(value) => setStatus(value || 'scheduled')}
              placeholder="Select status"
            />
          </Paper>

          <Divider />

          {/* Action Buttons */}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" leftSection={<IconX size={16} />} onClick={handleClose}>
              Cancel
            </Button>
            <Button leftSection={<IconCheck size={16} />} onClick={handleSubmit} loading={loading}>
              Create Appointment
            </Button>
          </Group>
        </Stack>
      </div>
    </Modal>
  );
}

