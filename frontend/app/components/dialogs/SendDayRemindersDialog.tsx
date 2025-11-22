'use client';

/**
 * SendDayRemindersDialog Component
 * 
 * Dialog for sending SMS reminders to all patients scheduled for a specific day.
 * Features:
 * - Shows list of all appointments for the selected day
 * - Allows selection/deselection of individual patients
 * - Auto-excludes cancelled appointments
 * - Highlights patients without phone numbers
 * - Template selection with preview
 * - Bulk SMS sending with progress tracking
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  Checkbox,
  Select,
  Paper,
  Badge,
  Divider,
  Alert,
  Progress,
  ScrollArea,
  LoadingOverlay,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconX,
  IconMailFilled,
  IconPhone,
  IconCalendar,
  IconClock,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

interface SendDayRemindersDialogProps {
  opened: boolean;
  onClose: () => void;
  date: string | null; // Format: YYYY-MM-DD
  onSuccess?: () => void;
}

interface PatientAppointment {
  id: string;
  patient_id: string | null;
  patient_name: string | null;
  clinic_id: string;
  clinic_name: string;
  clinician_name: string | null;
  appointment_type_name: string | null;
  start_time: string;
  end_time: string;
  status: string;
  has_phone: boolean;
  phone_number: string | null;
}

interface SMSTemplate {
  id: string;
  name: string;
  message: string;
  category: string;
  category_display: string;
  clinic: string | null;
  clinic_name: string | null;
}

export default function SendDayRemindersDialog({
  opened,
  onClose,
  date,
  onSuccess,
}: SendDayRemindersDialogProps) {
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedAppointments, setSelectedAppointments] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendTotal, setSendTotal] = useState(0);

  // Fetch appointments for the selected date
  useEffect(() => {
    if (opened && date) {
      fetchAppointments();
      fetchTemplates();
    }
  }, [opened, date]);

  const fetchAppointments = async () => {
    if (!date) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://localhost:8000/api/appointments/day/${date}/`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const data = await response.json();
      setAppointments(data);
      
      // Auto-select all appointments with patients and phone numbers (exclude cancelled)
      const autoSelected = new Set(
        data
          .filter((apt: PatientAppointment) => 
            apt.patient_id && 
            apt.has_phone && 
            apt.status === 'scheduled'
          )
          .map((apt: PatientAppointment) => apt.id)
      );
      setSelectedAppointments(autoSelected);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load appointments for this day',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/sms/templates/', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      const templateList = data.results || data;
      
      // Filter to only appointment reminder templates
      const reminderTemplates = templateList.filter(
        (t: SMSTemplate) => t.category === 'appointment_reminder'
      );
      
      setTemplates(reminderTemplates);
      
      // Auto-select first template
      if (reminderTemplates.length > 0) {
        setSelectedTemplate(reminderTemplates[0].id);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleToggleAppointment = (appointmentId: string) => {
    setSelectedAppointments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(appointmentId)) {
        newSet.delete(appointmentId);
      } else {
        newSet.add(appointmentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const selectableAppointments = appointments
      .filter((apt) => apt.patient_id && apt.has_phone && apt.status === 'scheduled')
      .map((apt) => apt.id);
    setSelectedAppointments(new Set(selectableAppointments));
  };

  const handleDeselectAll = () => {
    setSelectedAppointments(new Set());
  };

  const handleSend = async () => {
    if (selectedAppointments.size === 0) {
      notifications.show({
        title: 'No Patients Selected',
        message: 'Please select at least one patient to send reminders to',
        color: 'yellow',
      });
      return;
    }

    if (!selectedTemplate) {
      notifications.show({
        title: 'No Template Selected',
        message: 'Please select an SMS template',
        color: 'yellow',
      });
      return;
    }

    setSending(true);
    setSendProgress(0);
    setSendTotal(selectedAppointments.size);

    let successCount = 0;
    let failCount = 0;

    try {
      // Get CSRF token
      const csrfResponse = await fetch('https://localhost:8000/api/auth/csrf-token/', {
        credentials: 'include',
      });
      const csrfData = await csrfResponse.json();

      // Send SMS to each selected appointment
      for (const appointmentId of Array.from(selectedAppointments)) {
        const appointment = appointments.find((apt) => apt.id === appointmentId);
        if (!appointment || !appointment.patient_id) continue;

        try {
          const response = await fetch(
            `https://localhost:8000/api/sms/patient/${appointment.patient_id}/send/`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfData.csrfToken,
              },
              credentials: 'include',
              body: JSON.stringify({
                template_id: selectedTemplate,
                phone_number: appointment.phone_number,
                appointment_id: appointmentId,
              }),
            }
          );

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error sending SMS to ${appointment.patient_name}:`, error);
          failCount++;
        }

        setSendProgress(successCount + failCount);
      }

      // Show final result
      if (successCount > 0) {
        notifications.show({
          title: 'SMS Sent',
          message: `✓ ${successCount} sent${failCount > 0 ? `, ✗ ${failCount} failed` : ''}`,
          color: failCount > 0 ? 'yellow' : 'green',
        });
      } else {
        notifications.show({
          title: 'Failed',
          message: 'All SMS messages failed to send',
          color: 'red',
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error sending SMS:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to send SMS reminders',
        color: 'red',
      });
    } finally {
      setSending(false);
      setSendProgress(0);
      setSendTotal(0);
    }
  };

  const selectedCount = selectedAppointments.size;
  const totalAppointments = appointments.filter((apt) => apt.patient_id).length;
  const noPhoneCount = appointments.filter((apt) => apt.patient_id && !apt.has_phone).length;
  const cancelledCount = appointments.filter((apt) => apt.status !== 'scheduled').length;

  const selectedTemplateObj = templates.find((t) => t.id === selectedTemplate);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconMailFilled size={20} />
          <Text fw={600}>Send Reminders - {date && dayjs(date).format('dddd DD MMM YYYY')}</Text>
        </Group>
      }
      size="xl"
      closeOnClickOutside={!sending}
      closeOnEscape={!sending}
    >
      <LoadingOverlay visible={loading} />

      <Stack gap="md">
        {/* Summary */}
        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Total Appointments</Text>
              <Badge size="lg" variant="light">{totalAppointments}</Badge>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Ready to Send</Text>
              <Badge size="lg" variant="filled" color="blue">{selectedCount}</Badge>
            </Group>
            {noPhoneCount > 0 && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">No Phone Number</Text>
                <Badge size="lg" variant="light" color="orange">{noPhoneCount}</Badge>
              </Group>
            )}
            {cancelledCount > 0 && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Cancelled/No-Show</Text>
                <Badge size="lg" variant="light" color="gray">{cancelledCount}</Badge>
              </Group>
            )}
          </Stack>
        </Paper>

        {/* Template Selection */}
        <Stack gap="xs">
          <Text size="sm" fw={600}>SMS Template</Text>
          <Select
            placeholder="Select template"
            data={templates.map((t) => ({
              value: t.id,
              label: `${t.name}${t.clinic_name ? ` (${t.clinic_name})` : ''}`,
            }))}
            value={selectedTemplate}
            onChange={setSelectedTemplate}
            searchable
          />
          {selectedTemplateObj && (
            <Paper p="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-dark-6)' }}>
              <Text size="xs" c="dimmed" mb={4}>Preview:</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {selectedTemplateObj.message}
              </Text>
            </Paper>
          )}
        </Stack>

        <Divider />

        {/* Patient List */}
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={600}>Patients</Text>
            <Group gap="xs">
              <Button size="xs" variant="subtle" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button size="xs" variant="subtle" onClick={handleDeselectAll}>
                Deselect All
              </Button>
            </Group>
          </Group>

          <ScrollArea h={300}>
            <Stack gap="xs">
              {appointments.length === 0 && !loading && (
                <Alert icon={<IconAlertCircle size={16} />} color="gray">
                  No appointments scheduled for this day
                </Alert>
              )}

              {appointments.map((apt) => {
                const isSelected = selectedAppointments.has(apt.id);
                const canSelect = apt.patient_id && apt.has_phone && apt.status === 'scheduled';

                return (
                  <Paper
                    key={apt.id}
                    p="sm"
                    withBorder
                    style={{
                      opacity: canSelect ? 1 : 0.6,
                      cursor: canSelect ? 'pointer' : 'not-allowed',
                    }}
                    onClick={() => canSelect && handleToggleAppointment(apt.id)}
                  >
                    <Group wrap="nowrap" align="flex-start">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleToggleAppointment(apt.id)}
                        disabled={!canSelect}
                      />
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Group justify="space-between" wrap="nowrap">
                          <Text fw={600}>{apt.patient_name || 'Unknown Patient'}</Text>
                          <Group gap="xs">
                            <Text size="sm" c="dimmed">
                              <IconClock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                              {dayjs(apt.start_time).format('h:mm A')}
                            </Text>
                          </Group>
                        </Group>
                        
                        <Group gap="xs">
                          {apt.appointment_type_name && (
                            <Badge size="sm" variant="light">{apt.appointment_type_name}</Badge>
                          )}
                          <Badge size="sm" variant="light" color="gray">{apt.clinic_name}</Badge>
                          {apt.status !== 'scheduled' && (
                            <Badge size="sm" variant="light" color="orange">{apt.status.toUpperCase()}</Badge>
                          )}
                        </Group>
                        
                        {!apt.has_phone && apt.patient_id && (
                          <Alert icon={<IconX size={14} />} color="orange" p={8}>
                            <Text size="xs">No phone number on file</Text>
                          </Alert>
                        )}
                      </Stack>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          </ScrollArea>
        </Stack>

        {/* Sending Progress */}
        {sending && (
          <Paper p="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" fw={600}>Sending SMS...</Text>
              <Progress value={(sendProgress / sendTotal) * 100} animated />
              <Text size="xs" c="dimmed" ta="center">
                {sendProgress} of {sendTotal} sent
              </Text>
            </Stack>
          </Paper>
        )}

        {/* Actions */}
        <Group justify="space-between">
          <Button variant="default" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            leftSection={<IconMailFilled size={16} />}
            onClick={handleSend}
            disabled={selectedCount === 0 || !selectedTemplate || sending}
            loading={sending}
          >
            Send to {selectedCount} {selectedCount === 1 ? 'patient' : 'patients'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

