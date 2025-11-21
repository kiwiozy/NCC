'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Modal,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Textarea,
  Select,
  ActionIcon,
  Divider,
  Paper,
  LoadingOverlay,
  rem,
} from '@mantine/core';
import {
  IconUser,
  IconBuildingHospital,
  IconStethoscope,
  IconCalendar,
  IconClock,
  IconEdit,
  IconTrash,
  IconX,
  IconCheck,
  IconNotes,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

interface AppointmentDetailsDialogProps {
  opened: boolean;
  onClose: () => void;
  appointmentId: string | null;
  onUpdate?: () => void; // Callback after edit/delete to refresh calendar
}

interface AppointmentDetails {
  id: string;
  patient: string; // UUID
  patient_name: string;
  clinic: string; // UUID
  clinic_name: string;
  clinician: string | null; // UUID
  clinician_name: string | null;
  appointment_type: string | null; // UUID
  appointment_type_name: string | null;
  start_time: string;
  end_time: string;
  status: string;
  reason: string;
  notes: string;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'scheduled':
      return 'blue';
    case 'checked_in':
      return 'cyan';
    case 'completed':
      return 'green';
    case 'cancelled':
      return 'red';
    case 'no_show':
      return 'orange';
    default:
      return 'gray';
  }
};

export default function AppointmentDetailsDialog({
  opened,
  onClose,
  appointmentId,
  onUpdate,
}: AppointmentDetailsDialogProps) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editStatus, setEditStatus] = useState('');
  const [editAppointmentType, setEditAppointmentType] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  // Appointment types for dropdown
  const [appointmentTypes, setAppointmentTypes] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (opened && appointmentId) {
      loadAppointment();
      loadAppointmentTypes();
    }
  }, [opened, appointmentId]);

  const loadAppointmentTypes = async () => {
    try {
      let allTypes: Array<{ id: string; name: string }> = [];
      let nextUrl: string | null = 'https://localhost:8000/api/appointment-types/?page_size=100';

      while (nextUrl) {
        const response = await fetch(nextUrl, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load appointment types');
        const data = await response.json();
        
        if (Array.isArray(data.results)) {
          allTypes = [...allTypes, ...data.results];
        }
        
        nextUrl = data.next;
      }

      setAppointmentTypes(allTypes);
    } catch (err: any) {
      console.error('Error loading appointment types:', err);
    }
  };

  const loadAppointment = async () => {
    if (!appointmentId) return;

    setLoading(true);
    try {
      const response = await fetch(`https://localhost:8000/api/appointments/${appointmentId}/`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAppointment(data);
        // Initialize edit form with current values
        setEditStatus(data.status);
        setEditAppointmentType(data.appointment_type);
        setEditNotes(data.notes || '');
      } else {
        notifications.show({
          title: 'Error',
          message: 'Failed to load appointment details',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load appointment details',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!appointment) return;

    setSaving(true);
    try {
      // Get CSRF token
      const csrfResponse = await fetch('https://localhost:8000/api/auth/csrf-token/', {
        credentials: 'include',
      });
      const csrfData = await csrfResponse.json();

      const response = await fetch(`https://localhost:8000/api/appointments/${appointment.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfData.csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          status: editStatus,
          appointment_type: editAppointmentType,
          notes: editNotes,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setAppointment(updated);
        setEditMode(false);
        notifications.show({
          title: 'Success',
          message: 'Appointment updated successfully',
          color: 'green',
        });
        if (onUpdate) onUpdate();
      } else {
        throw new Error('Failed to update appointment');
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update appointment',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: 'Delete Appointment',
      children: (
        <Text size="sm">
          Are you sure you want to delete this appointment? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
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
            },
            credentials: 'include',
          });

          if (response.ok) {
            notifications.show({
              title: 'Success',
              message: 'Appointment deleted successfully',
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
      },
    });
  };

  const handleViewPatient = () => {
    if (appointment?.patient) {
      router.push(`/patients/${appointment.patient}`);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (appointment) {
      setEditStatus(appointment.status);
      setEditAppointmentType(appointment.appointment_type);
      setEditNotes(appointment.notes || '');
    }
    setEditMode(false);
  };

  const formatDateTime = (dateString: string) => {
    return dayjs(dateString).tz('Australia/Sydney').format('ddd, D MMM YYYY [at] h:mm A');
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  if (!appointment && !loading) {
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
            Appointment Details
          </Text>
        </Group>
      }
      size="lg"
    >
      <div style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading || saving} />

        {appointment && (
          <Stack gap="md">
            {/* Action Buttons */}
            <Group justify="flex-end" gap="xs">
              {!editMode && (
                <>
                  <ActionIcon variant="subtle" color="blue" onClick={() => setEditMode(true)} title="Edit">
                    <IconEdit size={18} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={handleDelete} title="Delete">
                    <IconTrash size={18} />
                  </ActionIcon>
                </>
              )}
            </Group>

            <Divider />

            {/* Patient */}
            <Paper p="md" withBorder>
              <Group gap="sm" mb="xs">
                <IconUser size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Text fw={600} size="sm" c="dimmed">
                  Patient
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="lg" fw={500}>
                  {appointment.patient_name}
                </Text>
                <Button variant="light" size="xs" onClick={handleViewPatient}>
                  View Patient
                </Button>
              </Group>
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
                <Text size="sm">{appointment.clinic_name}</Text>
              </Paper>

              <Paper p="md" withBorder>
                <Group gap="sm" mb="xs">
                  <IconStethoscope size={20} style={{ color: 'var(--mantine-color-teal-6)' }} />
                  <Text fw={600} size="sm" c="dimmed">
                    Clinician
                  </Text>
                </Group>
                <Text size="sm">{appointment.clinician_name || 'Not assigned'}</Text>
              </Paper>
            </Group>

            {/* Date & Time */}
            <Paper p="md" withBorder>
              <Group gap="sm" mb="xs">
                <IconClock size={20} style={{ color: 'var(--mantine-color-orange-6)' }} />
                <Text fw={600} size="sm" c="dimmed">
                  Date & Time
                </Text>
              </Group>
              <Stack gap={4}>
                <Text size="sm">{formatDateTime(appointment.start_time)}</Text>
                <Text size="xs" c="dimmed">
                  Duration: {formatDuration(appointment.duration_minutes)}
                </Text>
              </Stack>
            </Paper>

            {/* Appointment Type */}
            <Paper p="md" withBorder>
              <Group gap="sm" mb="xs">
                <IconCalendar size={20} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Text fw={600} size="sm" c="dimmed">
                  Appointment Type
                </Text>
              </Group>
              {editMode ? (
                <Select
                  data={appointmentTypes.map(t => ({ value: t.id, label: t.name }))}
                  value={editAppointmentType}
                  onChange={setEditAppointmentType}
                  placeholder="Select appointment type (optional)"
                  searchable
                  clearable
                />
              ) : (
                <Text size="sm">
                  {appointment.appointment_type_name || <Text component="span" c="dimmed">No appointment type</Text>}
                </Text>
              )}
            </Paper>

            {/* Notes */}
            <div>
              <Group gap="sm" mb="xs">
                <IconNotes size={20} style={{ color: 'var(--mantine-color-violet-6)' }} />
                <Text fw={600} size="sm" c="dimmed">
                  Notes
                </Text>
              </Group>
              {editMode ? (
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.currentTarget.value)}
                  placeholder="Add notes about this appointment..."
                  rows={3}
                />
              ) : (
                <Text size="sm">{appointment.notes || <Text component="span" c="dimmed">No notes</Text>}</Text>
              )}
            </div>

            {/* Status */}
            <Paper p="md" withBorder>
              <Group gap="sm" mb="xs">
                <IconCheck size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Text fw={600} size="sm" c="dimmed">
                  Status
                </Text>
              </Group>
              {editMode ? (
                <Select
                  data={STATUS_OPTIONS}
                  value={editStatus}
                  onChange={(value) => setEditStatus(value || 'scheduled')}
                  placeholder="Select status"
                />
              ) : (
                <Badge color={getStatusColor(appointment.status)} variant="light" size="lg">
                  {STATUS_OPTIONS.find((s) => s.value === appointment.status)?.label || appointment.status}
                </Badge>
              )}
            </Paper>

            <Divider />

            {/* Action Buttons */}
            {editMode ? (
              <Group justify="flex-end" gap="sm">
                <Button variant="default" leftSection={<IconX size={16} />} onClick={handleCancel}>
                  Cancel
                </Button>
                <Button leftSection={<IconCheck size={16} />} onClick={handleSave} loading={saving}>
                  Save Changes
                </Button>
              </Group>
            ) : (
              <Group justify="flex-end">
                <Button variant="default" onClick={onClose}>
                  Close
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </div>
    </Modal>
  );
}

