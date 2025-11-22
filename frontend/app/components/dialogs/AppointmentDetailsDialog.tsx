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
  Checkbox,
  Menu,
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
  IconCalendarPlus,
  IconMessage,
  IconBell,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import SMSDialog from './SMSDialog';

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
  reason: string;
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

  // SMS Dialog state
  const [smsDialogOpened, setSmsDialogOpened] = useState(false);
  const [smsType, setSmsType] = useState<'reminder' | 'confirmation'>('reminder');
  const [sendingSMS, setSendingSMS] = useState(false);

  // Quick-send SMS function (auto-select template and send immediately)
  const handleQuickSendSMS = async (type: 'reminder' | 'confirmation') => {
    if (!appointment || !appointment.patient) return;

    setSendingSMS(true);
    try {
      // 1. Fetch active templates
      const templatesResponse = await fetch('https://localhost:8000/api/sms/templates/?is_active=true', {
        credentials: 'include',
      });
      
      if (!templatesResponse.ok) throw new Error('Failed to fetch templates');
      
      const templatesData = await templatesResponse.json();
      const templates = Array.isArray(templatesData) ? templatesData : (templatesData.results || []);
      
      console.log('📋 All templates:', templates);
      console.log('🔍 Looking for:', {
        category: type,
        clinic: appointment.clinic_name,
      });
      
      // 2. Find matching template (by category + clinic)
      // Note: category in DB is "appointment_reminder" not just "reminder"
      const categoryToMatch = type === 'reminder' ? 'appointment_reminder' : 'appointment_confirmation';
      
      let matchingTemplate = templates.find(
        (t: any) => {
          console.log('Checking template:', {
            name: t.name,
            category: t.category,
            clinic_name: t.clinic_name,
            matches_category: t.category === categoryToMatch,
            matches_clinic: t.clinic_name?.toLowerCase() === appointment.clinic_name?.toLowerCase(),
          });
          return t.category === categoryToMatch &&
                 t.clinic_name?.toLowerCase() === appointment.clinic_name?.toLowerCase();
        }
      );
      
      // Fallback: match by category only
      if (!matchingTemplate) {
        console.log('❌ No clinic-specific match, trying category only...');
        matchingTemplate = templates.find((t: any) => {
          console.log('Fallback check:', t.name, t.category);
          return t.category === categoryToMatch;
        });
      }
      
      if (!matchingTemplate) {
        console.error('❌ No template found!');
        notifications.show({
          title: 'No Template Found',
          message: `No ${type} template found for ${appointment.clinic_name} clinic.`,
          color: 'orange',
        });
        return;
      }

      console.log('✅ Selected template:', matchingTemplate.name);

      // 3. Get CSRF token
      const csrfResponse = await fetch('https://localhost:8000/api/auth/csrf-token/', {
        credentials: 'include',
      });
      const csrfData = await csrfResponse.json();

      // 4. Send SMS with template_id (backend will render template)
      const sendResponse = await fetch(`https://localhost:8000/api/sms/patient/${appointment.patient}/send/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfData.csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          template_id: matchingTemplate.id,
        }),
      });

      if (!sendResponse.ok) {
        const errorData = await sendResponse.json();
        throw new Error(errorData.error || 'Failed to send SMS');
      }

      // 5. Success!
      notifications.show({
        title: 'SMS Sent',
        message: `${type === 'reminder' ? 'Reminder' : 'Confirmation'} sent to ${appointment.patient_name}`,
        color: 'green',
        icon: '✓',
      });

    } catch (error) {
      console.error('Error sending quick SMS:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to send SMS',
        color: 'red',
      });
    } finally {
      setSendingSMS(false);
    }
  };

  // Edit form state
  const [editStatus, setEditStatus] = useState('');
  const [editAppointmentType, setEditAppointmentType] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editNeedsFollowup, setEditNeedsFollowup] = useState(false);

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
        setEditNeedsFollowup(data.needs_followup_reminder || false);
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
          needs_followup_reminder: editNeedsFollowup,
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

  const handleViewPatient = () => {
    if (appointment?.patient) {
      router.push(`/patients/${appointment.patient}`);
    }
  };

  const handleScheduleFollowup = async (interval: string) => {
    if (!appointment) return;

    // Calculate target date based on interval
    let targetDate = dayjs(appointment.start_time);
    
    switch (interval) {
      case '1w':
        targetDate = targetDate.add(1, 'week');
        break;
      case '2w':
        targetDate = targetDate.add(2, 'weeks');
        break;
      case '3w':
        targetDate = targetDate.add(3, 'weeks');
        break;
      case '4w':
        targetDate = targetDate.add(4, 'weeks');
        break;
      case '8w':
        targetDate = targetDate.add(8, 'weeks');
        break;
      case '3m':
        targetDate = targetDate.add(3, 'months');
        break;
      case '6m':
        targetDate = targetDate.add(6, 'months');
        break;
      default:
        return;
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

      // Store follow-up data in sessionStorage (not localStorage)
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

  const handleCancel = () => {
    // Reset form to original values
    if (appointment) {
      setEditStatus(appointment.status);
      setEditAppointmentType(appointment.appointment_type);
      setEditNotes(appointment.notes || '');
      setEditNeedsFollowup(appointment.needs_followup_reminder || false);
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
            <Group justify="space-between" gap="xs">
              {/* SMS Buttons - Only show for appointments with patients */}
              {!editMode && appointment.patient && (
                <Group gap="xs">
                  <Button
                    variant="light"
                    color="blue"
                    size="xs"
                    leftSection={<IconBell size={16} />}
                    onClick={() => handleQuickSendSMS('reminder')}
                    loading={sendingSMS}
                  >
                    Send Reminder
                  </Button>
                  <Button
                    variant="light"
                    color="green"
                    size="xs"
                    leftSection={<IconMessage size={16} />}
                    onClick={() => handleQuickSendSMS('confirmation')}
                    loading={sendingSMS}
                  >
                    Send Confirmation
                  </Button>
                </Group>
              )}

              {/* Edit/Delete Buttons */}
              <Group gap="xs" ml="auto">
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
            </Group>

            <Divider />

            {/* Patient - Only show for regular appointments */}
            {appointment.patient && (
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
            )}

            {/* All-Day Event Title - Only show for all-day events (no patient) */}
            {!appointment.patient && (
              <Paper p="md" withBorder>
                <Group gap="sm" mb="xs">
                  <IconCalendarPlus size={20} style={{ color: 'var(--mantine-color-violet-6)' }} />
                  <Text fw={600} size="sm" c="dimmed">
                    Event
                  </Text>
                </Group>
                <Text size="lg" fw={500}>
                  All-Day Event
                </Text>
                <Text size="sm" c="dimmed" mt="xs">
                  This is a clinic-wide event with no patient attached.
                </Text>
              </Paper>
            )}

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
              
              {/* Recurring Badge */}
              {appointment.is_recurring && (
                <Badge color="blue" variant="light" mt="sm" leftSection={<IconRepeat size={14} />}>
                  Recurring: {
                    appointment.recurrence_pattern === 'daily' ? 'Daily' :
                    appointment.recurrence_pattern === 'weekly' ? 'Weekly' :
                    appointment.recurrence_pattern === 'biweekly' ? 'Every 2 Weeks' :
                    appointment.recurrence_pattern === 'monthly' ? 'Monthly' :
                    'Unknown'
                  }
                </Badge>
              )}
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
              <Stack gap="sm">
                {editMode ? (
                  <>
                    <Select
                      data={STATUS_OPTIONS}
                      value={editStatus}
                      onChange={(value) => setEditStatus(value || 'scheduled')}
                      placeholder="Select status"
                    />
                    <Checkbox
                      label="Needs follow-up reminder"
                      checked={editNeedsFollowup}
                      onChange={(e) => setEditNeedsFollowup(e.currentTarget.checked)}
                      description="Mark this appointment for follow-up scheduling reminder"
                    />
                  </>
                ) : (
                  <>
                    <Badge color={getStatusColor(appointment.status)} variant="light" size="lg">
                      {STATUS_OPTIONS.find((s) => s.value === appointment.status)?.label || appointment.status}
                    </Badge>
                    {appointment.needs_followup_reminder && (
                      <Badge color="yellow" variant="light" size="sm">
                        ⏰ Needs Follow-up
                      </Badge>
                    )}
                    {appointment.followup_scheduled && (
                      <Badge color="green" variant="light" size="sm">
                        ✅ Follow-up Scheduled
                      </Badge>
                    )}
                  </>
                )}
              </Stack>
            </Paper>

            <Divider />

            {/* Schedule Follow-up Button - Only for patient appointments */}
            {!editMode && appointment.patient && (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button
                    leftSection={<IconCalendarPlus size={16} />}
                    variant="light"
                    fullWidth
                  >
                    Schedule Follow-up
                  </Button>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>Select follow-up interval</Menu.Label>
                  <Menu.Item onClick={() => handleScheduleFollowup('1w')}>1 week</Menu.Item>
                  <Menu.Item onClick={() => handleScheduleFollowup('2w')}>2 weeks</Menu.Item>
                  <Menu.Item onClick={() => handleScheduleFollowup('3w')}>3 weeks</Menu.Item>
                  <Menu.Item onClick={() => handleScheduleFollowup('4w')}>4 weeks</Menu.Item>
                  <Menu.Item onClick={() => handleScheduleFollowup('8w')}>8 weeks</Menu.Item>
                  <Menu.Divider />
                  <Menu.Item onClick={() => handleScheduleFollowup('3m')}>3 months</Menu.Item>
                  <Menu.Item onClick={() => handleScheduleFollowup('6m')}>6 months</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}

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

      {/* SMS Dialog - Only render if patient exists */}
      {appointment && appointment.patient && (
        <SMSDialog
          opened={smsDialogOpened}
          onClose={() => setSmsDialogOpened(false)}
          patientId={appointment.patient}
          patientName={appointment.patient_name || ''}
          suggestedTemplateCategory={smsType}
          appointmentContext={{
            appointmentId: appointment.id,
            date: dayjs(appointment.start_time).format('DD MMM YYYY'),
            time: dayjs(appointment.start_time).format('h:mm A'),
            clinicName: appointment.clinic_name,
            clinicianName: appointment.clinician_name,
          }}
        />
      )}
    </Modal>
  );
}

