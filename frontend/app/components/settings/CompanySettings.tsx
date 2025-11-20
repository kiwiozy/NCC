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
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconBuilding, IconMail, IconFileText } from '@tabler/icons-react';
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

export default function CompanySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('business');
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
  }, []);

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
        </Tabs>
      </Stack>
    </div>
  );
}
