'use client';

import { useState, useEffect } from 'react';
import {
  Stack,
  Group,
  Button,
  Text,
  Paper,
  Modal,
  TextInput,
  Textarea,
  Select,
  ColorInput,
  Switch,
  Loader,
  Center,
  Badge,
  ActionIcon,
  Tooltip,
  Tabs,
  Divider,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconCopy, IconTrash, IconStar, IconStarFilled, IconArchive, IconArchiveOff, IconInfoCircle } from '@tabler/icons-react';

interface EmailTemplate {
  id: number;
  name: string;
  category: string;
  category_display: string;
  description: string;
  subject: string;
  body_html: string;
  body_text: string;
  header_color: string;
  is_default: boolean;
  is_active: boolean;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

interface EmailGlobalSettings {
  id: number;
  default_gmail_account: string;
  reply_to_email: string;
  bcc_all_to: string;
  clinic_name: string;
  clinic_phone: string;
  clinic_email: string;
  clinic_website: string;
  clinic_address: string;
  clinic_abn: string;
  clinic_acn: string;
  bank_account_name: string;
  bank_bsb: string;
  bank_account_number: string;
  payment_instructions_text: string;
  payment_reference_format: string;
  confidentiality_notice: string;
  company_signature_html: string;
  company_signature_email: string;
  use_email_signatures: boolean;
  default_email_width: string;
  show_logo: boolean;
  show_contact_info: boolean;
  show_payment_instructions: boolean;
  show_bank_details: boolean;
  show_confidentiality: boolean;
  auto_send_invoices: boolean;
  auto_send_receipts: boolean;
  auto_send_quotes: boolean;
  send_payment_reminders: boolean;
  send_overdue_notices: boolean;
  reminder_days_before: number[];
  overdue_days_after: number[];
  require_confirmation: boolean;
  business_hours_only: boolean;
  updated_at: string;
}

const CATEGORY_OPTIONS = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'quote', label: 'Quote' },
  { value: 'at_report', label: 'AT Report' },
  { value: 'letter', label: 'Letter' },
];

export default function EmailTemplateManager() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8000';
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [globalSettings, setGlobalSettings] = useState<EmailGlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('templates');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Template Modal State
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'invoice',
    description: '',
    subject: '',
    body_html: '',
    body_text: '',
    header_color: '#10b981',
    is_default: false,
    is_active: true,
  });

  // Fetch data on mount
  useEffect(() => {
    fetchTemplates();
    fetchGlobalSettings();
  }, []);

  const fetchTemplates = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8000';
      console.log('Fetching templates from', `${apiUrl}/api/invoices/email-templates/`);
      const response = await fetch(`${apiUrl}/api/invoices/email-templates/`, {
        credentials: 'include',
      });
      console.log('Templates response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Templates data:', data);
        // DRF returns paginated data with 'results' array
        setTemplates(data.results || data);
      } else {
        const errorText = await response.text();
        console.error('Templates fetch failed:', response.status, errorText);
        notifications.show({
          title: 'Error',
          message: `Failed to load templates: ${response.status}`,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load email templates',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8000';
      const response = await fetch(`${apiUrl}/api/invoices/email-global-settings/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setGlobalSettings(data[0] || null);
      }
    } catch (error) {
      console.error('Error fetching global settings:', error);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      category: 'invoice',
      description: '',
      subject: '',
      body_html: '',
      body_text: '',
      header_color: '#10b981',
      is_default: false,
      is_active: true,
    });
    setTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      category: template.category,
      description: template.description,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text,
      header_color: template.header_color,
      is_default: template.is_default,
      is_active: template.is_active,
    });
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    try {
      const url = editingTemplate
        ? `${API_URL}/api/invoices/email-templates/${editingTemplate.id}/`
        : `${API_URL}/api/invoices/email-templates/`;
      
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(templateForm),
      });

      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: editingTemplate ? 'Template updated!' : 'Template created!',
          color: 'green',
        });
        setTemplateModalOpen(false);
        fetchTemplates();
      } else {
        const error = await response.json();
        notifications.show({
          title: 'Error',
          message: error.detail || 'Failed to save template',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save template',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`${API_URL}/api/invoices/email-templates/${template.id}/duplicate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
        }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: 'Template duplicated!',
          color: 'green',
        });
        fetchTemplates();
      } else {
        const error = await response.json();
        notifications.show({
          title: 'Error',
          message: error.error || 'Failed to duplicate template',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to duplicate template',
        color: 'red',
      });
    }
  };

  const handleSetDefault = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`${API_URL}/api/invoices/email-templates/${template.id}/set_default/`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: `"${template.name}" is now the default for ${template.category_display}`,
          color: 'green',
        });
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  const handleArchiveTemplate = async (template: EmailTemplate) => {
    const action = template.is_active ? 'archive' : 'restore';
    try {
      const response = await fetch(`${API_URL}/api/invoices/email-templates/${template.id}/${action}/`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: template.is_active ? 'Template archived' : 'Template restored',
          color: 'green',
        });
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error archiving/restoring template:', error);
    }
  };

  const handleDeleteTemplate = async (template: EmailTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/invoices/email-templates/${template.id}/`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: 'Template deleted',
          color: 'green',
        });
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete template',
        color: 'red',
      });
    }
  };

  const handleSaveGlobalSettings = async () => {
    if (!globalSettings) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/invoices/email-global-settings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(globalSettings),
      });

      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: 'Global settings saved!',
          color: 'green',
        });
        fetchGlobalSettings();
      }
    } catch (error) {
      console.error('Error saving global settings:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save global settings',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredTemplates = filterCategory === 'all'
    ? templates
    : templates.filter(t => t.category === filterCategory);

  const groupedTemplates = CATEGORY_OPTIONS.reduce((acc, cat) => {
    acc[cat.value] = filteredTemplates.filter(t => t.category === cat.value);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Text size="xl" fw={700}>Email Template Library</Text>
          <Text size="sm" c="dimmed">Create and manage email templates for all document types</Text>
        </div>
      </Group>

      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'templates')}>
        <Tabs.List>
          <Tabs.Tab value="templates">Templates ({templates.length})</Tabs.Tab>
          <Tabs.Tab value="global-settings">Global Settings</Tabs.Tab>
        </Tabs.List>

        {/* TEMPLATES TAB */}
        <Tabs.Panel value="templates" pt="md">
          <Stack gap="md" style={{ height: 'calc(100vh - 250px)', overflow: 'auto', paddingRight: '10px' }}>
            <Group justify="space-between">
              <Select
                placeholder="Filter by category"
                value={filterCategory}
                onChange={(value) => setFilterCategory(value || 'all')}
                data={[
                  { value: 'all', label: 'All Categories' },
                  ...CATEGORY_OPTIONS,
                ]}
                style={{ width: 200 }}
              />
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={handleCreateTemplate}
              >
                Create New Template
              </Button>
            </Group>

            <Alert icon={<IconInfoCircle size={16} />} color="blue">
              <Text size="sm">
                <strong>Tip:</strong> Create multiple templates for each type (e.g., "Standard Invoice", "Overdue Notice", "Payment Plan").
                Set one as default for each category.
              </Text>
            </Alert>

            {CATEGORY_OPTIONS.map((category) => {
              const categoryTemplates = groupedTemplates[category.value];
              if (filterCategory !== 'all' && filterCategory !== category.value) return null;
              if (categoryTemplates.length === 0 && filterCategory !== 'all') return null;

              return (
                <Paper key={category.value} p="md" withBorder>
                  <Group justify="space-between" mb="md">
                    <Text fw={600} size="lg">{category.label} Templates ({categoryTemplates.length})</Text>
                  </Group>

                  {categoryTemplates.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                      No templates yet. Create one to get started!
                    </Text>
                  ) : (
                    <Stack gap="xs">
                      {categoryTemplates.map((template) => (
                        <Paper key={template.id} p="sm" withBorder style={{ backgroundColor: template.is_active ? 'transparent' : 'var(--mantine-color-gray-0)' }}>
                          <Group justify="space-between">
                            <div style={{ flex: 1 }}>
                              <Group gap="xs">
                                <Text fw={500}>{template.name}</Text>
                                {template.is_default && (
                                  <Badge color="green" size="sm" leftSection={<IconStarFilled size={12} />}>
                                    DEFAULT
                                  </Badge>
                                )}
                                {!template.is_active && (
                                  <Badge color="gray" size="sm">ARCHIVED</Badge>
                                )}
                              </Group>
                              <Text size="sm" c="dimmed" mt={4}>
                                Subject: {template.subject}
                              </Text>
                              {template.description && (
                                <Text size="xs" c="dimmed" mt={2}>
                                  {template.description}
                                </Text>
                              )}
                            </div>

                            <Group gap="xs">
                              <Tooltip label="Edit">
                                <ActionIcon
                                  variant="subtle"
                                  color="blue"
                                  onClick={() => handleEditTemplate(template)}
                                >
                                  <IconEdit size={16} />
                                </ActionIcon>
                              </Tooltip>
                              
                              <Tooltip label="Duplicate">
                                <ActionIcon
                                  variant="subtle"
                                  color="violet"
                                  onClick={() => handleDuplicateTemplate(template)}
                                >
                                  <IconCopy size={16} />
                                </ActionIcon>
                              </Tooltip>
                              
                              <Tooltip label={template.is_default ? "Already default" : "Set as default"}>
                                <ActionIcon
                                  variant="subtle"
                                  color="yellow"
                                  onClick={() => handleSetDefault(template)}
                                  disabled={template.is_default}
                                >
                                  {template.is_default ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                                </ActionIcon>
                              </Tooltip>
                              
                              <Tooltip label={template.is_active ? "Archive" : "Restore"}>
                                <ActionIcon
                                  variant="subtle"
                                  color="orange"
                                  onClick={() => handleArchiveTemplate(template)}
                                >
                                  {template.is_active ? <IconArchive size={16} /> : <IconArchiveOff size={16} />}
                                </ActionIcon>
                              </Tooltip>
                              
                              <Tooltip label="Delete">
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={() => handleDeleteTemplate(template)}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Paper>
              );
            })}
          </Stack>
        </Tabs.Panel>

        {/* GLOBAL SETTINGS TAB */}
        <Tabs.Panel value="global-settings" pt="md">
          {globalSettings && (
            <Stack gap="lg" style={{ height: 'calc(100vh - 250px)', overflow: 'auto', paddingRight: '10px' }}>
              <Paper p="md" withBorder>
                <Text fw={600} size="lg" mb="md">Sender Settings</Text>
                <Stack gap="md">
                  <TextInput
                    label="Default Gmail Account"
                    placeholder="clinic@example.com"
                    value={globalSettings.default_gmail_account || ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, default_gmail_account: e.target.value })}
                  />
                  <TextInput
                    label="Reply-To Email"
                    placeholder="replies@example.com"
                    value={globalSettings.reply_to_email || ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, reply_to_email: e.target.value })}
                  />
                  <TextInput
                    label="BCC All Emails To"
                    placeholder="admin@example.com"
                    value={globalSettings.bcc_all_to || ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, bcc_all_to: e.target.value })}
                  />
                </Stack>
              </Paper>

              <Paper p="md" withBorder>
                <Text fw={600} size="lg" mb="md">Clinic Information</Text>
                <Stack gap="md">
                  <TextInput
                    label="Clinic Name"
                    value={globalSettings.clinic_name}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, clinic_name: e.target.value })}
                  />
                  <TextInput
                    label="Phone"
                    value={globalSettings.clinic_phone || ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, clinic_phone: e.target.value })}
                  />
                  <TextInput
                    label="Email"
                    value={globalSettings.clinic_email || ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, clinic_email: e.target.value })}
                  />
                  <TextInput
                    label="Website"
                    value={globalSettings.clinic_website || ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, clinic_website: e.target.value })}
                  />
                  <Textarea
                    label="Address"
                    rows={3}
                    value={globalSettings.clinic_address || ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, clinic_address: e.target.value })}
                  />
                  <Group grow>
                    <TextInput
                      label="ABN"
                      value={globalSettings.clinic_abn || ''}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, clinic_abn: e.target.value })}
                    />
                    <TextInput
                      label="ACN"
                      value={globalSettings.clinic_acn || ''}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, clinic_acn: e.target.value })}
                    />
                  </Group>
                </Stack>
              </Paper>

              <Paper p="md" withBorder>
                <Text fw={600} size="lg" mb="md">Payment Details</Text>
                <Stack gap="md">
                  <TextInput
                    label="Bank Account Name"
                    value={globalSettings.bank_account_name}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, bank_account_name: e.target.value })}
                  />
                  <Group grow>
                    <TextInput
                      label="BSB"
                      value={globalSettings.bank_bsb || ''}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, bank_bsb: e.target.value })}
                    />
                    <TextInput
                      label="Account Number"
                      value={globalSettings.bank_account_number || ''}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, bank_account_number: e.target.value })}
                    />
                  </Group>
                  <Textarea
                    label="Payment Instructions"
                    rows={3}
                    value={globalSettings.payment_instructions_text || ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, payment_instructions_text: e.target.value })}
                  />
                </Stack>
              </Paper>

              <Paper p="md" withBorder>
                <Text fw={600} size="lg" mb="md">Email Signatures</Text>
                <Stack gap="md">
                  <Alert icon={<IconInfoCircle size={16} />} color="blue">
                    <Text size="sm">
                      <strong>How it works:</strong> If sending from <strong>{globalSettings.company_signature_email}</strong>, use the company signature below.
                      Otherwise, use the clinician's personal signature from their User Profile.
                    </Text>
                  </Alert>
                  
                  <Switch
                    label="Automatically append email signatures"
                    description="Add signatures to all outgoing emails"
                    checked={globalSettings.use_email_signatures}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, use_email_signatures: e.target.checked })}
                  />
                  
                  <Divider label="Company Signature" labelPosition="center" />
                  
                  <TextInput
                    label="Company Email Address"
                    description="This email address will use the company signature"
                    value={globalSettings.company_signature_email}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, company_signature_email: e.target.value })}
                  />
                  
                  <Textarea
                    label="Company Signature (HTML)"
                    description="HTML signature for company emails (e.g., info@walkeasy.com.au)"
                    placeholder="<table>...</table>"
                    rows={12}
                    value={globalSettings.company_signature_html || ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, company_signature_html: e.target.value })}
                    styles={{
                      input: {
                        fontFamily: 'monospace',
                        fontSize: '12px',
                      },
                    }}
                  />
                  
                  <Text size="sm" c="dimmed">
                    💡 <strong>Tip:</strong> Clinicians can set their personal signatures in Settings → Users → Edit Profile
                  </Text>
                </Stack>
              </Paper>

              <Paper p="md" withBorder>
                <Text fw={600} size="lg" mb="md">Appearance</Text>
                <Stack gap="md">
                  <Switch
                    label="Show logo in emails"
                    checked={globalSettings.show_logo}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, show_logo: e.target.checked })}
                  />
                  <Switch
                    label="Show contact information in footer"
                    checked={globalSettings.show_contact_info}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, show_contact_info: e.target.checked })}
                  />
                  <Switch
                    label="Show payment instructions (invoice/receipt emails)"
                    checked={globalSettings.show_payment_instructions}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, show_payment_instructions: e.target.checked })}
                  />
                  <Switch
                    label="Show bank details (invoice/receipt emails)"
                    checked={globalSettings.show_bank_details}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, show_bank_details: e.target.checked })}
                  />
                  <Switch
                    label="Show confidentiality notice in footer"
                    checked={globalSettings.show_confidentiality}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, show_confidentiality: e.target.checked })}
                  />
                </Stack>
              </Paper>

              <Group justify="flex-end">
                <Button
                  onClick={handleSaveGlobalSettings}
                  loading={saving}
                  size="md"
                >
                  Save Global Settings
                </Button>
              </Group>
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* CREATE/EDIT TEMPLATE MODAL */}
      <Modal
        opened={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title={editingTemplate ? 'Edit Template' : 'Create New Template'}
        size="xl"
      >
        <Stack gap="md">
          <TextInput
            label="Template Name"
            placeholder="e.g., Referral Letter, Overdue Notice"
            required
            value={templateForm.name}
            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
          />

          <Select
            label="Category"
            required
            data={CATEGORY_OPTIONS}
            value={templateForm.category}
            onChange={(value) => setTemplateForm({ ...templateForm, category: value || 'invoice' })}
          />

          <Textarea
            label="Description"
            placeholder="When to use this template..."
            rows={2}
            value={templateForm.description}
            onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
          />

          <TextInput
            label="Subject Line"
            placeholder="Use tokens like {patient_name}, {invoice_number}"
            required
            value={templateForm.subject}
            onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
          />

          <Textarea
            label="Email Body (HTML)"
            placeholder="<p>Dear {contact_name},</p>"
            rows={10}
            required
            value={templateForm.body_html}
            onChange={(e) => setTemplateForm({ ...templateForm, body_html: e.target.value })}
          />

          <ColorInput
            label="Header Color"
            value={templateForm.header_color}
            onChange={(value) => setTemplateForm({ ...templateForm, header_color: value })}
          />

          <Switch
            label="Set as default template for this category"
            checked={templateForm.is_default}
            onChange={(e) => setTemplateForm({ ...templateForm, is_default: e.target.checked })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} loading={saving}>
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

