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
  useMantineColorScheme,
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
import { getCsrfToken } from '../../utils/csrf';

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
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
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
      let allPatients: Patient[] = [];
      let url = 'https://localhost:8000/api/patients/';
      
      // Fetch all pages
      while (url) {
        const response = await fetch(url, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const patients = data.results || data;
          if (Array.isArray(patients)) {
            allPatients = [...allPatients, ...patients];
          }
          url = data.next || null; // Get next page URL
        } else {
          break;
        }
      }
      
      setPatients(allPatients);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const fetchClinics = async () => {
    try {
      let allClinics: Clinic[] = [];
      let url = 'https://localhost:8000/api/clinics/';
      
      // Fetch all pages
      while (url) {
        const response = await fetch(url, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const clinics = data.results || data;
          if (Array.isArray(clinics)) {
            allClinics = [...allClinics, ...clinics];
          }
          url = data.next || null; // Get next page URL
        } else {
          break;
        }
      }
      
      setClinics(allClinics);
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
    console.log('🚀 [SMS SEND] Starting send process...');
    console.log('📝 Message:', message);
    console.log('👤 Recipient Type:', recipientType);
    console.log('🎯 Selected Patient ID:', selectedPatient);
    console.log('📊 Recipient Count:', recipientCount);

    if (!message.trim()) {
      console.log('❌ [SMS SEND] Message is empty');
      notifications.show({
        title: 'Error',
        message: 'Message cannot be empty',
        color: 'red',
        icon: <IconAlertCircle />,
      });
      return;
    }

    if (recipientCount === 0) {
      console.log('❌ [SMS SEND] No recipients selected');
      notifications.show({
        title: 'Error',
        message: 'Please select at least one recipient',
        color: 'red',
        icon: <IconAlertCircle />,
      });
      return;
    }

    setSending(true);

    try {
      // For now, only handle individual patient sending
      if (recipientType === 'individual' && selectedPatient) {
        console.log('✅ [SMS SEND] Individual patient mode');
        
        const patient = patients.find(p => p.id === selectedPatient);
        console.log('👤 [SMS SEND] Patient found:', patient);
        
        if (!patient) {
          throw new Error('Patient not found');
        }

        // Fetch patient's phone numbers
        console.log('📞 [SMS SEND] Fetching patient phone numbers...');
        const phoneResponse = await fetch(`https://localhost:8000/api/sms/patient/${selectedPatient}/phones/`, {
          credentials: 'include',
        });

        if (!phoneResponse.ok) {
          throw new Error('Failed to fetch patient phone numbers');
        }

        const phoneData = await phoneResponse.json();
        console.log('📞 [SMS SEND] Phone data:', phoneData);

        const availablePhones = phoneData.available_phones || [];
        
        if (availablePhones.length === 0) {
          throw new Error('Patient has no phone number on file');
        }

        // Get the default phone or first available
        const defaultPhone = availablePhones.find((p: any) => p.is_default) || availablePhones[0];
        console.log('📞 [SMS SEND] Using phone:', defaultPhone);

        // Use the existing patient-specific SMS endpoint
        console.log('🔑 [SMS SEND] Fetching CSRF token...');
        const csrfToken = await getCsrfToken();
        console.log('🔑 [SMS SEND] CSRF token:', csrfToken ? 'Retrieved' : 'MISSING');

        const url = `https://localhost:8000/api/sms/patient/${selectedPatient}/send/`;
        const payload = {
          phone_number: defaultPhone.value,
          message: message.trim(),
          phone_label: defaultPhone.label,
        };
        
        console.log('📡 [SMS SEND] Making API call...');
        console.log('URL:', url);
        console.log('Payload:', payload);

        const response = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          body: JSON.stringify(payload),
        });

        console.log('📡 [SMS SEND] Response status:', response.status);
        console.log('📡 [SMS SEND] Response ok:', response.ok);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ [SMS SEND] API Error:', errorData);
          throw new Error(errorData.error || errorData.detail || errorData.message || 'Failed to send SMS');
        }

        const responseData = await response.json();
        console.log('✅ [SMS SEND] API Response:', responseData);

        notifications.show({
          title: 'Success',
          message: `SMS sent to ${patient.full_name || patient.first_name + ' ' + patient.last_name} (${defaultPhone.label})`,
          color: 'green',
          icon: <IconCheck />,
        });

        console.log('✅ [SMS SEND] Success! Clearing form...');
        // Clear the message
        setMessage('');
        setSelectedTemplate(null);
      } else {
        console.log('ℹ️ [SMS SEND] Bulk sending not implemented yet');
        // Bulk sending not implemented yet
        notifications.show({
          title: 'Coming Soon',
          message: 'Bulk SMS sending will be implemented next!',
          color: 'blue',
        });
      }
    } catch (error: any) {
      console.error('❌ [SMS SEND] Error:', error);
      console.error('Stack:', error.stack);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to send SMS',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setSending(false);
      console.log('🏁 [SMS SEND] Process complete');
    }
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
          minRows={8}
          maxRows={20}
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
            <Paper p="md" withBorder bg={isDark ? 'dark.6' : 'gray.0'} style={{ whiteSpace: 'pre-wrap' }}>
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

