'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Title,
  Paper,
  Stack,
  Text,
  Button,
  Group,
  Table,
  ActionIcon,
  Badge,
  Modal,
  TextInput,
  Textarea,
  Switch,
  Select,
  Menu,
  Alert,
  Loader,
  Box,
  Divider,
  Code,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconAlertCircle,
  IconVariable,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface SMSTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  category_display: string;
  clinic: string | null;
  clinic_name: string;
  message_template: string;
  is_active: boolean;
  character_count: number;
  sms_segment_count: number;
  variables: string[];
  created_at: string;
  updated_at: string;
}

interface Clinic {
  id: string;
  name: string;
}

interface TemplateVariable {
  group: string;
  variables: { name: string; description: string }[];
}

// Helper function to get CSRF token
const getCsrfToken = async (): Promise<string> => {
  const response = await fetch('https://localhost:8000/api/auth/csrf-token/', {
    credentials: 'include',
  });
  const data = await response.json();
  return data.csrfToken;
};

// Available variables organized by category
const TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    group: '👤 Patient',
    variables: [
      { name: '{patient_name}', description: 'Full name (e.g., "John Smith")' },
      { name: '{patient_first_name}', description: 'First name only' },
      { name: '{patient_last_name}', description: 'Last name only' },
      { name: '{patient_title}', description: 'Title (Mr., Mrs., Ms., Dr.)' },
      { name: '{patient_full_name}', description: 'Title + Full name' },
      { name: '{patient_mobile}', description: 'Mobile phone number' },
      { name: '{patient_health_number}', description: 'Health number' },
    ],
  },
  {
    group: '📅 Appointment',
    variables: [
      { name: '{appointment_date}', description: 'Date (e.g., "Monday, November 20")' },
      { name: '{appointment_time}', description: 'Time (e.g., "10:00 AM")' },
      { name: '{appointment_date_short}', description: 'Short date (e.g., "20 Nov 2025")' },
      { name: '{appointment_duration}', description: 'Duration (e.g., "30 minutes")' },
      { name: '{appointment_type}', description: 'Type (e.g., "Initial Assessment")' },
    ],
  },
  {
    group: '🏥 Clinic',
    variables: [
      { name: '{clinic_name}', description: 'Clinic name (e.g., "Tamworth")' },
      { name: '{clinic_phone}', description: 'Clinic phone number' },
      { name: '{clinic_address}', description: 'Clinic address' },
    ],
  },
  {
    group: '👨‍⚕️ Clinician',
    variables: [
      { name: '{clinician_name}', description: 'Clinician name' },
      { name: '{clinician_first_name}', description: 'Clinician first name' },
      { name: '{clinician_title}', description: 'Professional title' },
    ],
  },
  {
    group: '🏢 Company',
    variables: [
      { name: '{company_name}', description: 'Company name' },
      { name: '{company_phone}', description: 'Company phone' },
      { name: '{company_email}', description: 'Company email' },
    ],
  },
];

// Sample context for live preview
const SAMPLE_CONTEXT = {
  patient_name: 'John Smith',
  patient_first_name: 'John',
  patient_last_name: 'Smith',
  patient_title: 'Mr',
  patient_full_name: 'Mr John Smith',
  patient_mobile: '0412 345 678',
  patient_health_number: 'ABC123456',
  appointment_date: 'Monday, November 20',
  appointment_time: '10:00 AM',
  appointment_date_short: '20 Nov 2025',
  appointment_duration: '30 minutes',
  appointment_type: 'Initial Assessment',
  clinic_name: 'Tamworth',
  clinic_phone: '02 6766 3153',
  clinic_address: '43 Harrison St, Cardiff',
  clinician_name: 'Dr. Sarah Smith',
  clinician_first_name: 'Sarah',
  clinician_title: 'Podiatrist',
  company_name: 'WalkEasy Pedorthics',
  company_phone: '02 6766 3153',
  company_email: 'info@walkeasy.com.au',
};

const CATEGORY_OPTIONS = [
  { value: 'appointment_reminder', label: 'Appointment Reminder' },
  { value: 'appointment_confirmation', label: 'Appointment Confirmation' },
  { value: 'followup_reminder', label: 'Follow-up Reminder' },
  { value: 'cancellation', label: 'Cancellation Notice' },
  { value: 'rescheduling', label: 'Rescheduling' },
  { value: 'general', label: 'General Communication' },
  { value: 'special', label: 'Birthday/Special' },
];

export default function SMSTemplateManager() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formClinic, setFormClinic] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState('');
  const [formActive, setFormActive] = useState(true);
  
  // Preview state
  const [previewMessage, setPreviewMessage] = useState('');
  const [previewCharCount, setPreviewCharCount] = useState(0);
  const [previewSegments, setPreviewSegments] = useState(1);
  
  // Ref for textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchTemplates();
    fetchClinics();
  }, []);

  // Update preview when message changes
  useEffect(() => {
    updatePreview();
  }, [formMessage]);

  const fetchClinics = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/clinics/', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load clinics');
      }
      const data = await response.json();
      // Handle both paginated and non-paginated responses
      const clinicList = data.results || data;
      setClinics(clinicList);
    } catch (error) {
      console.error('Error loading clinics:', error);
      // Don't show error for clinics, just log it
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://localhost:8000/api/sms/templates/', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load templates');
      }
      const data = await response.json();
      const templateList = data.results || data;
      setTemplates(templateList);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePreview = () => {
    // Simple client-side rendering with sample data
    let rendered = formMessage;
    Object.entries(SAMPLE_CONTEXT).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    
    const charCount = rendered.length;
    const segments = charCount <= 160 ? 1 : Math.ceil((charCount - 160) / 153) + 1;
    
    setPreviewMessage(rendered);
    setPreviewCharCount(charCount);
    setPreviewSegments(segments);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormDescription('');
    setFormCategory('general');
    setFormClinic(null);
    setFormMessage('');
    setFormActive(true);
    setPreviewMessage('');
    setPreviewCharCount(0);
    setPreviewSegments(1);
    setModalOpen(true);
  };

  const handleEdit = (template: SMSTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormDescription(template.description);
    setFormCategory(template.category);
    setFormClinic(template.clinic);
    setFormMessage(template.message_template);
    setFormActive(template.is_active);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Template name is required',
        color: 'red',
      });
      return;
    }

    if (!formMessage.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Message template is required',
        color: 'red',
      });
      return;
    }

    try {
      const csrfToken = await getCsrfToken();
      const url = editingTemplate
        ? `https://localhost:8000/api/sms/templates/${editingTemplate.id}/`
        : 'https://localhost:8000/api/sms/templates/';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        category: formCategory,
        clinic: formClinic,
        message_template: formMessage.trim(),
        is_active: formActive,
      };

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Failed to save template');
      }

      notifications.show({
        title: 'Success',
        message: editingTemplate ? 'Template updated successfully' : 'Template created successfully',
        color: 'green',
        icon: <IconCheck />,
      });
      
      setModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      console.error('Error saving template:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to save template: ' + err.message,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    }
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpened(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setDeleteConfirmOpened(false);
    const id = itemToDelete;
    setItemToDelete(null);

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/sms/templates/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      notifications.show({
        title: 'Success',
        message: 'Template deleted successfully',
        color: 'green',
        icon: <IconCheck />,
      });
      
      fetchTemplates();
    } catch (err: any) {
      console.error('Error deleting template:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete template: ' + err.message,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    }
  };

  const insertVariable = (variable: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formMessage;
      const before = text.substring(0, start);
      const after = text.substring(end);
      setFormMessage(before + variable + after);
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      // Fallback: append to end
      setFormMessage(prev => prev + variable);
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: { [key: string]: string } = {
      appointment_reminder: 'blue',
      appointment_confirmation: 'green',
      followup_reminder: 'orange',
      cancellation: 'red',
      rescheduling: 'yellow',
      general: 'gray',
      special: 'pink',
    };
    return colors[category] || 'gray';
  };

  const rows = templates.map((template) => (
    <Table.Tr key={template.id}>
      <Table.Td style={{ width: '25%', verticalAlign: 'middle', padding: '16px' }}>
        <Stack gap={6}>
          <Text fw={500} size="sm">{template.name}</Text>
          <Group gap="xs">
            <Badge size="xs" variant="dot" color={getCategoryBadgeColor(template.category)}>
              {template.category_display}
            </Badge>
            {template.clinic_name && template.clinic_name !== 'All Clinics' && (
              <Badge size="xs" variant="outline" color="blue">
                {template.clinic_name}
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            {template.character_count} chars ({template.sms_segment_count} SMS)
          </Text>
        </Stack>
      </Table.Td>
      <Table.Td style={{ width: '50%', verticalAlign: 'middle', padding: '16px' }}>
        <Text size="sm" lineClamp={2} c="dimmed">
          {template.message_template}
        </Text>
      </Table.Td>
      <Table.Td style={{ width: '10%', whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '16px' }}>
        <Badge size="sm" color={template.is_active ? 'green' : 'gray'} variant="light">
          {template.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </Table.Td>
      <Table.Td style={{ width: '15%', whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '16px' }}>
        <Group gap="xs" wrap="nowrap">
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => handleEdit(template)}
            title="Edit template"
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => handleDelete(template.id)}
            title="Delete template"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={2} mb="md">SMS Templates</Title>
          <Text c="dimmed" size="sm">
            Create and manage reusable SMS message templates with dynamic variables
          </Text>
        </Box>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper p="xl" shadow="sm" radius="md">
          <Group justify="space-between" mb="md">
            <Title order={3}>Templates</Title>
            <Button leftSection={<IconPlus size={16} />} onClick={handleAdd}>
              Add Template
            </Button>
          </Group>

          {loading ? (
            <Loader />
          ) : templates.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No templates found. Click "Add Template" to create one.
            </Text>
          ) : (
            <Table style={{ tableLayout: 'fixed', width: '100%' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '25%' }}>Template</Table.Th>
                  <Table.Th style={{ width: '50%' }}>Message Preview</Table.Th>
                  <Table.Th style={{ width: '10%', whiteSpace: 'nowrap' }}>Status</Table.Th>
                  <Table.Th style={{ width: '15%', whiteSpace: 'nowrap' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          )}
        </Paper>

        {/* Add/Edit Modal */}
        <Modal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingTemplate ? 'Edit SMS Template' : 'Add SMS Template'}
          size="xl"
        >
          <Stack gap="md">
            <TextInput
              label="Template Name"
              placeholder="e.g., appointment_reminder"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            
            <Textarea
              label="Description"
              placeholder="Brief description of what this template is used for"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              minRows={2}
            />
            
            <Select
              label="Category"
              placeholder="Select category"
              data={CATEGORY_OPTIONS}
              value={formCategory}
              onChange={(value) => setFormCategory(value || 'general')}
              required
            />
            
            <Select
              label="Clinic"
              placeholder="All Clinics (available to everyone)"
              description="Leave blank to make this template available to all clinics"
              data={[
                { value: '', label: 'All Clinics' },
                ...clinics.map((clinic) => ({
                  value: clinic.id,
                  label: clinic.name,
                })),
              ]}
              value={formClinic || ''}
              onChange={(value) => setFormClinic(value || null)}
              clearable
              searchable
            />

            <Box>
              <Group justify="space-between" mb="xs">
                <Text fw={500} size="sm">Message Template</Text>
                <Menu shadow="md" width={250}>
                  <Menu.Target>
                    <Button size="xs" variant="light" leftSection={<IconVariable size={14} />}>
                      Insert Variable
                    </Button>
                  </Menu.Target>

                  <Menu.Dropdown>
                    {TEMPLATE_VARIABLES.map((group) => (
                      <div key={group.group}>
                        <Menu.Label>{group.group}</Menu.Label>
                        {group.variables.map((variable) => (
                          <Menu.Item
                            key={variable.name}
                            onClick={() => insertVariable(variable.name)}
                          >
                            <Stack gap={0}>
                              <Code>{variable.name}</Code>
                              <Text size="xs" c="dimmed">{variable.description}</Text>
                            </Stack>
                          </Menu.Item>
                        ))}
                        <Menu.Divider />
                      </div>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              </Group>
              
              <Textarea
                ref={textareaRef}
                placeholder="Your message here. Use {patient_name}, {appointment_date}, etc."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                minRows={5}
                maxRows={15}
                autosize
                required
              />
              
              <Text size="xs" c="dimmed" mt="xs">
                {formMessage.length} characters ({Math.ceil(formMessage.length / 160) || 1} SMS segments)
              </Text>
            </Box>

            {/* Live Preview */}
            {previewMessage && (
              <Box>
                <Text fw={500} size="sm" mb="xs">📋 Live Preview</Text>
                <Paper 
                  p="md" 
                  withBorder
                  bg={isDark ? 'dark.6' : 'gray.0'}
                >
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {previewMessage}
                  </Text>
                  <Divider my="xs" />
                  <Text size="xs" c="dimmed">
                    {previewCharCount} characters ({previewSegments} SMS segment{previewSegments > 1 ? 's' : ''})
                  </Text>
                </Paper>
              </Box>
            )}
            
            <Switch
              label="Active"
              description="Whether this template is active and available for use"
              checked={formActive}
              onChange={(e) => setFormActive(e.currentTarget.checked)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingTemplate ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteConfirmOpened}
          onClose={() => setDeleteConfirmOpened(false)}
          title="Delete Template?"
          size="sm"
        >
          <Stack gap="md">
            <Text size="sm">
              Are you sure you want to delete this template? This action cannot be undone.
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setDeleteConfirmOpened(false)}>
                Cancel
              </Button>
              <Button color="red" onClick={confirmDelete}>
                Delete
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}

