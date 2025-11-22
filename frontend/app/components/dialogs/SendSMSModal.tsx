'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Select,
  Textarea,
  Button,
  Group,
  Text,
  Alert,
  Badge,
  Box,
  Divider,
  Paper,
  Loader,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconPhone,
  IconSend,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface SendSMSModalProps {
  opened: boolean;
  onClose: () => void;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    title: string;
    contact_json?: any;
  };
}

interface SMSTemplate {
  id: string;
  name: string;
  category_display: string;
  message_template: string;
  character_count: number;
  sms_segment_count: number;
}

interface MobileNumber {
  number: string;
  type: string;
  is_primary?: boolean;
}

// Helper function to get CSRF token
const getCsrfToken = async (): Promise<string> => {
  const response = await fetch('https://localhost:8000/api/auth/csrf-token/', {
    credentials: 'include',
  });
  const data = await response.json();
  return data.csrfToken;
};

export default function SendSMSModal({ opened, onClose, patient }: SendSMSModalProps) {
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [mobileNumbers, setMobileNumbers] = useState<MobileNumber[]>([]);
  const [selectedMobile, setSelectedMobile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract mobile numbers from patient contact_json
  useEffect(() => {
    if (opened && patient.contact_json?.phone) {
      const phones = patient.contact_json.phone || [];
      const mobiles = phones.filter((p: any) => 
        p.type === 'Mobile' || p.number?.startsWith('04')
      );
      
      setMobileNumbers(mobiles);
      
      // Auto-select primary mobile or first mobile
      const primary = mobiles.find((m: any) => m.is_primary);
      if (primary) {
        setSelectedMobile(primary.number);
      } else if (mobiles.length > 0) {
        setSelectedMobile(mobiles[0].number);
      }
    }
  }, [opened, patient]);

  // Fetch templates when modal opens
  useEffect(() => {
    if (opened) {
      fetchTemplates();
    }
  }, [opened]);

  // Render template preview when template is selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        // Render template with patient data
        const rendered = renderTemplate(template.message_template);
        setMessage(rendered);
      }
    } else {
      setMessage('');
    }
  }, [selectedTemplateId, templates, patient]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://localhost:8000/api/sms/templates/?is_active=true', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load templates');
      const data = await response.json();
      setTemplates(data);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const renderTemplate = (template: string): string => {
    // Replace template variables with actual patient data
    let rendered = template;
    
    // Patient variables
    rendered = rendered.replace(/{patient_name}/g, `${patient.first_name} ${patient.last_name}`);
    rendered = rendered.replace(/{patient_first_name}/g, patient.first_name);
    rendered = rendered.replace(/{patient_last_name}/g, patient.last_name);
    rendered = rendered.replace(/{patient_title}/g, patient.title || '');
    rendered = rendered.replace(/{patient_full_name}/g, `${patient.title || ''} ${patient.first_name} ${patient.last_name}`.trim());
    rendered = rendered.replace(/{patient_mobile}/g, selectedMobile || '');
    
    // Company variables (hardcoded for now - will be from settings later)
    rendered = rendered.replace(/{company_name}/g, 'Walk Easy Pedorthics');
    rendered = rendered.replace(/{company_phone}/g, '02 6766 3153');
    
    return rendered;
  };

  const handleSend = async () => {
    if (!selectedMobile) {
      notifications.show({
        title: 'Error',
        message: 'Please select a mobile number',
        color: 'red',
        icon: <IconAlertCircle />,
      });
      return;
    }

    if (!message.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Message cannot be empty',
        color: 'red',
        icon: <IconAlertCircle />,
      });
      return;
    }

    setSending(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/sms/patient/${patient.id}/send/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          phone_number: selectedMobile,
          message: message,
          template_id: selectedTemplateId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Failed to send SMS');
      }

      notifications.show({
        title: 'SMS Sent',
        message: `Message sent successfully to ${patient.first_name} ${patient.last_name}`,
        color: 'green',
        icon: <IconCheck />,
      });

      // Reset and close
      setSelectedTemplateId(null);
      setMessage('');
      onClose();
    } catch (err: any) {
      console.error('Error sending SMS:', err);
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to send SMS',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSelectedTemplateId(null);
    setMessage('');
    setError(null);
    onClose();
  };

  const charCount = message.length;
  const smsSegments = charCount === 0 ? 1 : Math.ceil(charCount / 160);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={`Send SMS to ${patient.first_name} ${patient.last_name}`}
      size="lg"
    >
      <Stack gap="md">
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Mobile Number Selection */}
        {mobileNumbers.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            No mobile numbers available. Please add a phone number in patient communication details.
          </Alert>
        ) : (
          <Select
            label="Mobile Number"
            placeholder="Select mobile number"
            data={mobileNumbers.map(m => ({
              value: m.number,
              label: `${m.number}${m.is_primary ? ' (Primary)' : ''} - ${m.type}`,
            }))}
            value={selectedMobile}
            onChange={setSelectedMobile}
            required
            leftSection={<IconPhone size={16} />}
          />
        )}

        {/* Template Selection */}
        {loading ? (
          <Loader size="sm" />
        ) : (
          <Select
            label="Template"
            placeholder="Select a template or write custom message"
            data={templates.map(t => ({
              value: t.id,
              label: `${t.name} - ${t.category_display}`,
            }))}
            value={selectedTemplateId}
            onChange={setSelectedTemplateId}
            clearable
            searchable
          />
        )}

        {/* Message Editor */}
        <Textarea
          label="Message"
          placeholder="Your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minRows={6}
          maxRows={12}
          autosize
          required
        />

        {/* Character Count */}
        <Group justify="space-between">
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
          <Box>
            <Text size="sm" fw={500} mb="xs">Preview</Text>
            <Paper p="md" withBorder bg="gray.0" style={{ whiteSpace: 'pre-wrap' }}>
              <Text size="sm">{message}</Text>
            </Paper>
          </Box>
        )}

        <Divider />

        {/* Actions */}
        <Group justify="flex-end">
          <Button
            variant="subtle"
            onClick={handleClose}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            leftSection={<IconSend size={16} />}
            onClick={handleSend}
            loading={sending}
            disabled={!selectedMobile || !message.trim() || mobileNumbers.length === 0}
          >
            Send SMS
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

