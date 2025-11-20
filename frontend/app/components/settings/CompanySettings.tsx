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
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>
              <IconBuilding size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />
              Company Settings
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              Manage your company information, provider numbers, and email signature
            </Text>
          </div>
          <Button onClick={handleSave} loading={saving} size="md">
            Save Settings
          </Button>
        </Group>

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
            <Tabs.Tab value="provider" leftSection={<IconFileText size={16} />}>
              Provider Numbers
            </Tabs.Tab>
            <Tabs.Tab value="signature" leftSection={<IconMail size={16} />}>
              Email Signature
            </Tabs.Tab>
            <Tabs.Tab value="funding" leftSection={<IconPlus size={16} />}>
              Custom Funding Sources
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

          <Tabs.Panel value="provider" pt="xl">
            <Paper p="xl" withBorder>
              <Stack gap="md">
                <div>
                  <Title order={4}>Provider Registration Numbers</Title>
                  <Text size="sm" c="dimmed" mt={4}>
                    These numbers are used for invoice reference generation based on patient funding source
                  </Text>
                </div>

                <TextInput
                  label="Provider Registration Number"
                  description="NDIS/Medicare provider registration number (e.g., 4050009706)"
                  placeholder="4050009706"
                  value={settings.provider_registration_number}
                  onChange={(e) => setSettings({ ...settings, provider_registration_number: e.target.value })}
                  size="md"
                />

                <TextInput
                  label="DVA Account Number"
                  description="Department of Veterans' Affairs account number (e.g., 682730)"
                  placeholder="682730"
                  value={settings.dva_number}
                  onChange={(e) => setSettings({ ...settings, dva_number: e.target.value })}
                  size="md"
                />

                <TextInput
                  label="Enable Vendor Number"
                  description="Enable vendor/account number (e.g., 508809)"
                  placeholder="508809"
                  value={settings.enable_number}
                  onChange={(e) => setSettings({ ...settings, enable_number: e.target.value })}
                  size="md"
                />

                <Alert color="blue" title="How it works">
                  <Text size="sm">
                    When creating invoices, the system automatically generates references based on the patient's funding source:
                  </Text>
                  <ul style={{ marginTop: 8, fontSize: '0.875rem' }}>
                    <li><strong>NDIS patients:</strong> "NDIS # [patient's health number]"</li>
                    <li><strong>DVA patients:</strong> "DVA # {settings.dva_number}"</li>
                    <li><strong>Enable patients:</strong> "Enable Vendor # {settings.enable_number}"</li>
                    <li><strong>BUPA/Medibank/AHM:</strong> "[Funding Source] - [Patient Name]"</li>
                    <li><strong>Private patients:</strong> "Invoice for [Patient Name]"</li>
                  </ul>
                </Alert>
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="signature" pt="xl">
            <Paper p="xl" withBorder>
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <div>
                    <Title order={4}>
                      <IconMail size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                      Email Signature Settings
                    </Title>
                    <Text size="sm" c="dimmed" mt={4}>
                      Configure company email signature for {settings.company_signature_email}
                    </Text>
                  </div>
                  <Switch
                    label="Enable Email Signatures"
                    checked={settings.use_email_signatures}
                    onChange={(e) => setSettings({ ...settings, use_email_signatures: e.currentTarget.checked })}
                    size="md"
                  />
                </Group>

                <Divider my="sm" />

                <TextInput
                  label="Company Signature Email"
                  description="Email address that will use this signature"
                  placeholder="info@walkeasy.com.au"
                  value={settings.company_signature_email}
                  onChange={(e) => setSettings({ ...settings, company_signature_email: e.target.value })}
                  size="md"
                />

                <div>
                  <Text size="sm" fw={500} mb={8}>
                    Company Signature HTML
                  </Text>
                  <Text size="xs" c="dimmed" mb={8}>
                    Paste your HTML signature code below. This will be used for all emails sent from {settings.company_signature_email}.
                  </Text>
                  
                  <Alert color="blue" mb="md">
                    <Text size="sm" fw={500} mb={4}>Instructions:</Text>
                    <ul style={{ marginTop: 0, marginBottom: 0, paddingLeft: 20, fontSize: '0.875rem' }}>
                      <li>Paste raw HTML code (tables, divs, images, etc.)</li>
                      <li>The system will clean up DOCTYPE and wrapper tags automatically</li>
                      <li>Use "Load from File" to import an .html file</li>
                      <li>Images should use full URLs (https://...)</li>
                    </ul>
                  </Alert>

                  <Group mb="xs">
                    <FileButton onChange={handleLoadSignatureFromFile} accept=".html,.htm">
                      {(props) => <Button {...props} variant="light" size="sm">Load from File</Button>}
                    </FileButton>
                    <Button 
                      variant="light" 
                      color="red" 
                      size="sm"
                      onClick={() => setSettings({ ...settings, company_signature_html: '' })}
                    >
                      Clear
                    </Button>
                  </Group>

                  <Textarea
                    placeholder="Paste your HTML signature code here..."
                    value={settings.company_signature_html}
                    onChange={(e) => setSettings({ ...settings, company_signature_html: e.target.value })}
                    minRows={15}
                    styles={{
                      input: {
                        fontFamily: 'monospace',
                        fontSize: 11,
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData('text/plain');
                      setSettings({ ...settings, company_signature_html: text });
                    }}
                  />
                </div>

                {settings.company_signature_html && (
                  <div>
                    <Text size="sm" fw={500} mb={8}>
                      Preview
                    </Text>
                    <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                      <div
                        dangerouslySetInnerHTML={{ __html: settings.company_signature_html }}
                        style={{
                          fontFamily: 'Arial, sans-serif',
                          fontSize: '14px',
                          color: '#000',
                        }}
                      />
                    </Paper>
                  </div>
                )}
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="funding" pt="xl">
            <Paper p="xl" withBorder>
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <div>
                    <Title order={4}>Custom Funding Sources</Title>
                    <Text size="sm" c="dimmed" mt={4}>
                      Add insurance companies, programs, or partners beyond the default options
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
                  <Text size="sm">
                    Custom funding sources appear in the Patient form dropdown alongside the default options (NDIS, DVA, Enable, etc.).
                  </Text>
                  <ul style={{ marginTop: 8, fontSize: '0.875rem' }}>
                    <li><strong>With Reference Number:</strong> "HCF # 123456"</li>
                    <li><strong>Without Reference Number:</strong> "HCF - [Patient Name]"</li>
                    <li><strong>Custom Display Format:</strong> Define how it appears on invoices</li>
                  </ul>
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

            <TextInput
              label="Display Format (optional)"
              description="How to display on invoice. Leave blank for default format."
              placeholder="e.g., 'HCF Member #' or 'WorkCover Claim #'"
              value={fundingForm.display_format}
              onChange={(e) => setFundingForm({ ...fundingForm, display_format: e.target.value })}
            />

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
      </Stack>
    </div>
  );
}
