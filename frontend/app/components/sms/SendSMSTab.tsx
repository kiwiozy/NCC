'use client';

import { useState, useEffect } from 'react';
import {
  Stack,
  Radio,
  Group,
  TextInput,
  Select,
  Button,
  Text,
  Paper,
  Badge,
  Divider,
  Textarea,
  Alert,
  Loader,
  Box,
  ScrollArea,
  ActionIcon,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconSearch,
  IconSend,
  IconAlertCircle,
  IconCheck,
  IconUsers,
  IconEye,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  clinic?: string;
}

interface SMSTemplate {
  id: string;
  name: string;
  category_display: string;
  message_template: string;
  character_count: number;
  sms_segment_count: number;
}

interface Clinic {
  id: string;
  name: string;
}

export default function SendSMSTab() {
  const [recipientType, setRecipientType] = useState<string>('individual');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(dayjs().add(1, 'day').toDate());
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [recipientList, setRecipientList] = useState<Patient[]>([]);

  // Fetch data on mount
  useEffect(() => {
    fetchPatients();
    fetchClinics();
    fetchTemplates();
  }, []);

  // Update message when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setMessage(template.message_template);
      }
    }
  }, [selectedTemplate, templates]);

  // Update recipient count when filters change
  useEffect(() => {
    updateRecipientCount();
  }, [recipientType, selectedPatient, appointmentDate, selectedClinic]);

  const fetchPatients = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/patients/', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPatients(data.results || data);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const fetchClinics = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/clinics/', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setClinics(data.results || data);
      }
    } catch (error) {
      console.error('Error loading clinics:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/sms/templates/?is_active=true', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // Handle both paginated and non-paginated responses
        setTemplates(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const updateRecipientCount = () => {
    if (recipientType === 'individual') {
      setRecipientCount(selectedPatient ? 1 : 0);
    } else if (recipientType === 'appointments') {
      // TODO: Call API to count patients with appointments on selected date
      setRecipientCount(0); // Placeholder
    } else if (recipientType === 'clinic') {
      // TODO: Call API to count patients at selected clinic
      setRecipientCount(0); // Placeholder
    } else if (recipientType === 'all') {
      setRecipientCount(patients.length);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Message cannot be empty',
        color: 'red',
        icon: <IconAlertCircle />,
      });
      return;
    }

    if (recipientCount === 0) {
      notifications.show({
        title: 'Error',
        message: 'Please select at least one recipient',
        color: 'red',
        icon: <IconAlertCircle />,
      });
      return;
    }

    // TODO: Implement actual sending logic
    notifications.show({
      title: 'Coming Soon',
      message: 'Bulk SMS sending will be implemented next!',
      color: 'blue',
    });
  };

  const charCount = message.length;
  const smsSegments = charCount === 0 ? 1 : Math.ceil(charCount / 160);

  return (
    <Stack gap="xl">
      {/* Recipient Selection */}
      <Paper p="md" withBorder>
        <Text fw={600} size="lg" mb="md">1. Select Recipients</Text>
        
        <Radio.Group value={recipientType} onChange={setRecipientType}>
          <Stack gap="md">
            <Radio value="individual" label="Individual Patient" />
            {recipientType === 'individual' && (
              <Select
                placeholder="Search for a patient..."
                data={patients.map(p => ({
                  value: p.id,
                  label: p.full_name || `${p.first_name} ${p.last_name}`,
                }))}
                value={selectedPatient}
                onChange={setSelectedPatient}
                searchable
                leftSection={<IconSearch size={16} />}
                ml="xl"
              />
            )}

            <Radio value="appointments" label="Patients with appointments" />
            {recipientType === 'appointments' && (
              <Group ml="xl">
                <DatePickerInput
                  label="Appointment Date"
                  placeholder="Select date"
                  value={appointmentDate}
                  onChange={setAppointmentDate}
                  leftSection={<IconSearch size={16} />}
                />
              </Group>
            )}

            <Radio value="clinic" label="Patients at specific clinic" />
            {recipientType === 'clinic' && (
              <Select
                placeholder="Select clinic"
                data={clinics.map(c => ({
                  value: c.id,
                  label: c.name,
                }))}
                value={selectedClinic}
                onChange={setSelectedClinic}
                searchable
                ml="xl"
              />
            )}

            <Radio value="all" label="All active patients" />
          </Stack>
        </Radio.Group>

        <Divider my="md" />

        <Group justify="space-between">
          <Group gap="xs">
            <IconUsers size={20} />
            <Text fw={600}>
              {recipientCount} recipient{recipientCount !== 1 ? 's' : ''} selected
            </Text>
          </Group>
          
          {recipientCount > 0 && recipientType !== 'individual' && (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconEye size={14} />}
              onClick={() => setShowRecipientList(true)}
            >
              Show List
            </Button>
          )}
        </Group>
      </Paper>

      {/* Template Selection */}
      <Paper p="md" withBorder>
        <Text fw={600} size="lg" mb="md">2. Select Template (Optional)</Text>
        
        <Select
          placeholder="Select a template or write custom message"
          data={templates.map(t => ({
            value: t.id,
            label: `${t.name} - ${t.category_display}`,
          }))}
          value={selectedTemplate}
          onChange={setSelectedTemplate}
          clearable
          searchable
        />
      </Paper>

      {/* Message Editor */}
      <Paper p="md" withBorder>
        <Text fw={600} size="lg" mb="md">3. Compose Message</Text>
        
        <Textarea
          placeholder="Your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minRows={6}
          maxRows={12}
          autosize
        />

        <Group justify="space-between" mt="xs">
          <Text size="xs" c="dimmed">
            {charCount} characters ({smsSegments} SMS segment{smsSegments > 1 ? 's' : ''})
          </Text>
          {smsSegments > 1 && (
            <Badge color="yellow" size="sm">
              Multi-part message
            </Badge>
          )}
        </Group>

        {/* Preview */}
        {message && (
          <Box mt="md">
            <Text size="sm" fw={500} mb="xs">Preview</Text>
            <Paper p="md" withBorder bg="gray.0" style={{ whiteSpace: 'pre-wrap' }}>
              <Text size="sm">{message}</Text>
            </Paper>
            {recipientType !== 'individual' && (
              <Alert icon={<IconAlertCircle size={16} />} color="blue" mt="xs">
                Variables like {'{patient_name}'} will be replaced with actual data for each recipient
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* Send Button */}
      <Group justify="flex-end">
        <Button
          size="lg"
          leftSection={<IconSend size={20} />}
          onClick={handleSend}
          loading={sending}
          disabled={recipientCount === 0 || !message.trim()}
        >
          Send to {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
        </Button>
      </Group>

      {/* Recipient List Modal - TODO */}
    </Stack>
  );
}

