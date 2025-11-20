'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  TextInput,
  Textarea,
  Switch,
  Button,
  Stack,
  Group,
  Alert,
  Divider,
  Text,
  FileButton,
  Tabs,
  Table,
  ActionIcon,
  Modal,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconBuilding, IconMail, IconFileText, IconPlus, IconEdit, IconTrash, IconInfoCircle } from '@tabler/icons-react';
import { getCsrfToken } from '../../utils/csrf';

interface CompanySettings {
  id?: number;
  clinic_name: string;
  clinic_phone: string;
  clinic_email: string;
  clinic_address: string;
  clinic_abn: string;
  clinic_website: string;
  // Provider Registration Numbers
  provider_registration_number: string;
  dva_number: string;
  enable_number: string;
  // Email Signature
  use_email_signatures: boolean;
  company_signature_email: string;
  company_signature_html: string;
}

interface CustomFundingSource {
  id?: string;
  name: string;
  reference_number: string;
  display_format: string;
  is_active: boolean;
  notes: string;
}

export default function CompanySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('business');
  
  // Custom Funding Sources
  const [customFundingSources, setCustomFundingSources] = useState<CustomFundingSource[]>([]);
  const [fundingModalOpen, setFundingModalOpen] = useState(false);
  const [editingFunding, setEditingFunding] = useState<CustomFundingSource | null>(null);
  const [fundingForm, setFundingForm] = useState<CustomFundingSource>({
    name: '',
    reference_number: '',
    display_format: '',
    is_active: true,
    notes: '',
  });
  
  const [settings, setSettings] = useState<CompanySettings>({
    clinic_name: 'WalkEasy Pedorthics',
    clinic_phone: '02 6766 3153',
    clinic_email: 'info@walkeasy.com.au',
    clinic_address: '43 Harrison St, Cardiff, NSW 2285\n21 Dowe St, Tamworth, NSW 2340',
    clinic_abn: '',
    clinic_website: 'www.walkeasy.com.au',
    provider_registration_number: '4050009706',
    dva_number: '682730',
    enable_number: '508809',
    use_email_signatures: true,
    company_signature_email: 'info@walkeasy.com.au',
    company_signature_html: '',
  });

  useEffect(() => {
    fetchSettings();
    fetchCustomFundingSources();
  }, []);

  const fetchCustomFundingSources = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/invoices/custom-funding-sources/', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load custom funding sources');
      }

      const data = await response.json();
      setCustomFundingSources(data.results || data);
    } catch (err: any) {
      console.error('Error loading custom funding sources:', err);
    }
  };

  const handleAddFunding = () => {
    setEditingFunding(null);
    setFundingForm({
      name: '',
      reference_number: '',
      display_format: '',
      is_active: true,
      notes: '',
    });
    setFundingModalOpen(true);
  };

  const handleEditFunding = (funding: CustomFundingSource) => {
    setEditingFunding(funding);
    setFundingForm(funding);
    setFundingModalOpen(true);
  };

  const handleSaveFunding = async () => {
    try {
      const csrfToken = await getCsrfToken();
      const url = editingFunding
        ? `https://localhost:8000/api/invoices/custom-funding-sources/${editingFunding.id}/`
        : 'https://localhost:8000/api/invoices/custom-funding-sources/';
      
      const method = editingFunding ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(fundingForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save funding source');
      }

      setFundingModalOpen(false);
      await fetchCustomFundingSources();
      setSuccess(`✅ Funding source ${editingFunding ? 'updated' : 'created'} successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving funding source:', err);
      setError(err.message || 'Failed to save funding source');
    }
  };

  const handleDeleteFunding = async (id: string) => {
    if (!confirm('Are you sure you want to delete this funding source?')) return;

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/invoices/custom-funding-sources/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete funding source');
      }

      await fetchCustomFundingSources();
      setSuccess('✅ Funding source deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting funding source:', err);
      setError(err.message || 'Failed to delete funding source');
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://localhost:8000/api/invoices/email-global-settings/', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load company settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (err: any) {
      console.error('Error loading company settings:', err);
      setError(err.message || 'Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const csrfToken = await getCsrfToken();
      const response = await fetch('https://localhost:8000/api/invoices/email-global-settings/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save company settings');
      }

      setSuccess('✅ Company settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving company settings:', err);
      setError(err.message || 'Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSignatureFromFile = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const html = e.target?.result as string;
      // Clean up HTML - extract body content
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const cleanHtml = bodyMatch ? bodyMatch[1] : html;
      
      setSettings({ ...settings, company_signature_html: cleanHtml.trim() });
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <Paper p="xl" withBorder>
        <Text>Loading company settings...</Text>
      </Paper>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: '2rem' }}>
      <Stack gap="lg">
        <div>
          <Title order={2}>
            <IconBuilding size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Company Settings
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Manage your company information, provider numbers, and email signature
          </Text>
        </div>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert icon={<IconCheck size={16} />} title="Success" color="green" withCloseButton onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="business" leftSection={<IconBuilding size={16} />}>
              Business Info
            </Tabs.Tab>
            <Tabs.Tab value="funding" leftSection={<IconFileText size={16} />}>
              Funding Sources
            </Tabs.Tab>
            <Tabs.Tab value="signature" leftSection={<IconMail size={16} />}>
              Email Signature
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="business" pt="xl">
            <Paper p="xl" withBorder>
              <Stack gap="md">
                <Title order={4}>Business Information</Title>

                <TextInput
                  label="Company Name"
                  placeholder="WalkEasy Pedorthics"
                  value={settings.clinic_name}
                  onChange={(e) => setSettings({ ...settings, clinic_name: e.target.value })}
                  size="md"
                />

                <TextInput
                  label="Phone Number"
                  placeholder="02 6766 3153"
                  value={settings.clinic_phone}
                  onChange={(e) => setSettings({ ...settings, clinic_phone: e.target.value })}
                  size="md"
                />

                <TextInput
                  label="Email Address"
                  placeholder="info@walkeasy.com.au"
                  value={settings.clinic_email}
                  onChange={(e) => setSettings({ ...settings, clinic_email: e.target.value })}
                  size="md"
                />

                <Textarea
                  label="Address"
                  placeholder="43 Harrison St, Cardiff, NSW 2285"
                  value={settings.clinic_address}
                  onChange={(e) => setSettings({ ...settings, clinic_address: e.target.value })}
                  minRows={3}
                  size="md"
                />

                <TextInput
                  label="ABN"
                  placeholder="12 345 678 901"
                  value={settings.clinic_abn}
                  onChange={(e) => setSettings({ ...settings, clinic_abn: e.target.value })}
                  size="md"
                />

                <TextInput
                  label="Website"
                  placeholder="www.walkeasy.com.au"
                  value={settings.clinic_website}
                  onChange={(e) => setSettings({ ...settings, clinic_website: e.target.value })}
                  size="md"
                />
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="funding" pt="xl">
            <Paper p="xl" withBorder>
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <div>
                    <Title order={4}>Funding Sources & Provider Numbers</Title>
                    <Text size="sm" c="dimmed" mt={4}>
                      Manage all funding sources including provider registration numbers, insurance companies, and programs
                    </Text>
                  </div>
                  <Button leftSection={<IconPlus size={16} />} onClick={handleAddFunding}>
                    Add Funding Source
                  </Button>
                </Group>

                {customFundingSources.length > 0 ? (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Reference Number</Table.Th>
                        <Table.Th>Display Format</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {customFundingSources.map((source) => (
                        <Table.Tr key={source.id}>
                          <Table.Td>
                            <Text fw={500}>{source.name}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">{source.reference_number || '-'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">{source.display_format || '-'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c={source.is_active ? 'green' : 'red'}>
                              {source.is_active ? 'Active' : 'Inactive'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                onClick={() => handleEditFunding(source)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                              <ActionIcon
                                variant="light"
                                color="red"
                                onClick={() => handleDeleteFunding(source.id!)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Alert icon={<IconInfoCircle size={16} />} color="gray">
                    No custom funding sources added yet. Click "Add Funding Source" to create one.
                  </Alert>
                )}

                <Alert color="blue" title="How it works">
                  <Text size="sm" mb={8}>
                    Funding sources appear in the Patient form dropdown and control invoice reference generation:
                  </Text>
                  <ul style={{ marginTop: 0, fontSize: '0.875rem', marginBottom: 8 }}>
                    <li><strong>With Reference Number:</strong> Shows as "[Display Format] [Reference Number]" (e.g., "DVA # 682730")</li>
                    <li><strong>Without Reference Number:</strong> Shows as "[Name] - [Patient Name]" (e.g., "BUPA - John Smith")</li>
                    <li><strong>NDIS Special Case:</strong> Uses patient's health number (e.g., "NDIS # 3333222")</li>
                  </ul>
                  <Text size="sm" fw={500} c="blue">
                    💡 Tip: Edit NDIS, DVA, or Enable entries to update your provider registration numbers
                  </Text>
                </Alert>
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>

        {/* Modal for Add/Edit Custom Funding Source */}
        <Modal
          opened={fundingModalOpen}
          onClose={() => setFundingModalOpen(false)}
          title={editingFunding ? 'Edit Funding Source' : 'Add Funding Source'}
          size="lg"
        >
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="e.g., HCF, WorkCover, NIB"
              value={fundingForm.name}
              onChange={(e) => setFundingForm({ ...fundingForm, name: e.target.value })}
              required
            />

            <TextInput
              label="Reference Number (optional)"
              description="Account/vendor number for this funding source"
              placeholder="e.g., 123456"
              value={fundingForm.reference_number}
              onChange={(e) => setFundingForm({ ...fundingForm, reference_number: e.target.value })}
            />

            <Stack gap="xs">
              <Text size="sm" fw={500}>Display Format (optional)</Text>
              <Text size="xs" c="dimmed">Click tokens below to build your format, or type directly</Text>
              
              {/* Token Buttons */}
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  onClick={() => setFundingForm({ ...fundingForm, display_format: fundingForm.display_format + '{patient_name}' })}
                >
                  + Patient Name
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="green"
                  onClick={() => setFundingForm({ ...fundingForm, display_format: fundingForm.display_format + '{reference_number}' })}
                >
                  + Provider #
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="orange"
                  onClick={() => setFundingForm({ ...fundingForm, display_format: fundingForm.display_format + '{patient_health_number}' })}
                >
                  + Health #
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="cyan"
                  onClick={() => setFundingForm({ ...fundingForm, display_format: fundingForm.display_format + '{custom_po}' })}
                >
                  + Custom PO#
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="grape"
                  onClick={() => setFundingForm({ ...fundingForm, display_format: fundingForm.display_format + '{name}' })}
                >
                  + Funding Name
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="gray"
                  onClick={() => setFundingForm({ ...fundingForm, display_format: fundingForm.display_format + '\n' })}
                >
                  + New Line
                </Button>
              </Group>
              
              {/* Format Input */}
              <Textarea
                placeholder="e.g., {patient_name}\nDVA # {reference_number}"
                value={fundingForm.display_format}
                onChange={(e) => setFundingForm({ ...fundingForm, display_format: e.target.value })}
                minRows={6}
                autosize
                styles={{
                  input: {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  }
                }}
              />
              
              {/* Preview */}
              {fundingForm.display_format && (
                <Alert color="blue" title="Preview" icon={<IconInfoCircle size={16} />}>
                  <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                    {fundingForm.display_format
                      .replace(/{patient_name}/g, 'John Smith')
                      .replace(/{reference_number}/g, fundingForm.reference_number || '123456')
                      .replace(/{patient_health_number}/g, '3333222')
                      .replace(/{custom_po}/g, 'PO-789')
                      .replace(/{name}/g, fundingForm.name || 'Funding Source')}
                  </Text>
                </Alert>
              )}
              
              {/* Quick Templates */}
              <Text size="xs" fw={500} mt="xs">Quick Templates:</Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setFundingForm({ ...fundingForm, display_format: '{patient_name}\n{name} # {reference_number}' })}
                >
                  Standard Format
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setFundingForm({ ...fundingForm, display_format: '{patient_name}\n{name} # {patient_health_number}\n\n{name} Registration # {reference_number}' })}
                >
                  NDIS Format
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setFundingForm({ ...fundingForm, display_format: '{name} - {patient_name}' })}
                >
                  Simple Format
                </Button>
              </Group>
            </Stack>

            <Textarea
              label="Notes (optional)"
              description="Internal notes about this funding source"
              placeholder="e.g., 'Use for corporate health insurance claims'"
              value={fundingForm.notes}
              onChange={(e) => setFundingForm({ ...fundingForm, notes: e.target.value })}
              minRows={3}
            />

            <Switch
              label="Active"
              description="Only active funding sources appear in dropdowns"
              checked={fundingForm.is_active}
              onChange={(e) => setFundingForm({ ...fundingForm, is_active: e.currentTarget.checked })}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setFundingModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFunding} disabled={!fundingForm.name.trim()}>
                {editingFunding ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Save Button at Bottom */}
        <Group justify="flex-end" mt="xl">
          <Button onClick={handleSave} loading={saving} size="lg" leftSection={<IconCheck size={18} />}>
            Save Company Settings
          </Button>
        </Group>
      </Stack>
    </div>
  );
}
