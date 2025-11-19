'use client';

import { useState, useEffect } from 'react';
import { 
  Title, 
  Text, 
  Paper, 
  Stack, 
  Tabs, 
  Group, 
  Button,
  TextInput,
  Textarea,
  Select,
  Switch,
  ColorInput,
  Alert,
  Badge,
  Divider,
  rem
} from '@mantine/core';
import { 
  IconMail, 
  IconPalette, 
  IconUser, 
  IconRobot, 
  IconFileText,
  IconChartBar,
  IconFlask,
  IconCheck,
  IconAlertCircle,
  IconInfoCircle
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function EmailTemplatesSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Template Settings State
  const [invoiceSubject, setInvoiceSubject] = useState('Invoice {invoice_number} - {contact_name}');
  const [invoiceBody, setInvoiceBody] = useState('');
  const [receiptSubject, setReceiptSubject] = useState('Receipt - Invoice {invoice_number} - PAID');
  const [receiptBody, setReceiptBody] = useState('');
  const [quoteSubject, setQuoteSubject] = useState('Quote {quote_number} - {contact_name}');
  const [quoteBody, setQuoteBody] = useState('');

  // Appearance Settings
  const [invoiceHeaderColor, setInvoiceHeaderColor] = useState('#10b981');
  const [receiptHeaderColor, setReceiptHeaderColor] = useState('#10b981');
  const [quoteHeaderColor, setQuoteHeaderColor] = useState('#667eea');
  const [emailWidth, setEmailWidth] = useState('600px');
  const [showLogo, setShowLogo] = useState(true);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(true);

  // Sender Settings
  const [defaultGmailAccount, setDefaultGmailAccount] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [bccAllTo, setBccAllTo] = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState<Array<{email: string, display_name: string}>>([]);

  // Payment Details
  const [bankAccountName, setBankAccountName] = useState('WalkEasy Nexus Pty Ltd');
  const [bankBsb, setBankBsb] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [paymentInstructionsText, setPaymentInstructionsText] = useState('');

  // Contact Info
  const [clinicName, setClinicName] = useState('WalkEasy Nexus');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');

  // Auto-Send Rules
  const [autoSendInvoices, setAutoSendInvoices] = useState(false);
  const [autoSendReceipts, setAutoSendReceipts] = useState(false);
  const [sendPaymentReminders, setSendPaymentReminders] = useState(false);

  useEffect(() => {
    loadSettings();
    fetchConnectedAccounts();
  }, []);

  const fetchConnectedAccounts = async () => {
    try {
      const response = await fetch('https://localhost:8000/gmail/connected-accounts/');
      const data = await response.json();
      const accounts = data.accounts || [];
      setConnectedAccounts(accounts);
      
      // Set default if available
      if (accounts.length > 0 && !defaultGmailAccount) {
        const primaryAccount = accounts.find((a: any) => a.is_primary);
        if (primaryAccount) {
          setDefaultGmailAccount(primaryAccount.email);
        } else {
          setDefaultGmailAccount(accounts[0].email);
        }
      }
    } catch (error) {
      console.error('Error fetching Gmail accounts:', error);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      // TODO: Fetch settings from backend API
      // const response = await fetch('https://localhost:8000/api/email-settings/');
      // const data = await response.json();
      // Populate state with loaded data
      
      // For now, using defaults
      notifications.show({
        title: 'Settings Loaded',
        message: 'Email template settings loaded successfully',
        color: 'blue',
        icon: <IconInfoCircle size={16} />,
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load settings',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // TODO: Save settings to backend API
      // const response = await fetch('https://localhost:8000/api/email-settings/', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ ...all settings... }),
      // });
      
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      notifications.show({
        title: 'Settings Saved',
        message: 'Email template settings saved successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save settings',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    // Reset all settings to defaults
    setInvoiceSubject('Invoice {invoice_number} - {contact_name}');
    setReceiptSubject('Receipt - Invoice {invoice_number} - PAID');
    setQuoteSubject('Quote {quote_number} - {contact_name}');
    setInvoiceHeaderColor('#10b981');
    setReceiptHeaderColor('#10b981');
    setQuoteHeaderColor('#667eea');
    setBankAccountName('WalkEasy Nexus Pty Ltd');
    setClinicName('WalkEasy Nexus');
    
    notifications.show({
      title: 'Reset Complete',
      message: 'All settings reset to defaults',
      color: 'blue',
      icon: <IconInfoCircle size={16} />,
    });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Email Templates & Settings</Title>
          <Text size="sm" c="dimmed" mt="xs">
            Configure email templates, appearance, and automation for invoices, receipts, and quotes
          </Text>
        </div>
        <Group>
          <Button 
            variant="light" 
            onClick={handleResetToDefaults}
            disabled={saving}
          >
            Reset to Defaults
          </Button>
          <Button 
            onClick={handleSaveSettings}
            loading={saving}
            leftSection={<IconCheck size={18} />}
          >
            Save Changes
          </Button>
        </Group>
      </Group>

      <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Coming Soon">
        <Text size="sm">
          This feature is currently under development. Email template configuration, branding customization, 
          and automation rules will be available soon.
        </Text>
      </Alert>

      <Tabs defaultValue="templates">
        <Tabs.List>
          <Tabs.Tab value="templates" leftSection={<IconMail size={16} />}>
            Templates
          </Tabs.Tab>
          <Tabs.Tab value="appearance" leftSection={<IconPalette size={16} />}>
            Appearance
          </Tabs.Tab>
          <Tabs.Tab value="sender" leftSection={<IconUser size={16} />}>
            Sender Settings
          </Tabs.Tab>
          <Tabs.Tab value="rules" leftSection={<IconRobot size={16} />}>
            Auto-Send Rules
          </Tabs.Tab>
          <Tabs.Tab value="content" leftSection={<IconFileText size={16} />}>
            Content
          </Tabs.Tab>
        </Tabs.List>

        {/* Templates Tab */}
        <Tabs.Panel value="templates" pt="md">
          <Paper shadow="sm" p="xl" withBorder>
            <Stack gap="xl">
              {/* Invoice Template */}
              <div>
                <Group mb="md">
                  <Badge color="blue" variant="light">Invoice Email Template</Badge>
                </Group>
                
                <Stack gap="md">
                  <TextInput
                    label="Subject Line"
                    description="Available tokens: {invoice_number}, {contact_name}, {amount}, {due_date}"
                    placeholder="Invoice {invoice_number} - {contact_name}"
                    value={invoiceSubject}
                    onChange={(e) => setInvoiceSubject(e.currentTarget.value)}
                  />
                  
                  <Textarea
                    label="Email Body (HTML)"
                    description="Customize the email content"
                    placeholder="<p>Dear {contact_name},</p><p>Please find attached invoice...</p>"
                    value={invoiceBody}
                    onChange={(e) => setInvoiceBody(e.currentTarget.value)}
                    rows={6}
                  />
                </Stack>
              </div>

              <Divider />

              {/* Receipt Template */}
              <div>
                <Group mb="md">
                  <Badge color="green" variant="light">Receipt Email Template</Badge>
                </Group>
                
                <Stack gap="md">
                  <TextInput
                    label="Subject Line"
                    description="For paid invoices"
                    placeholder="Receipt - Invoice {invoice_number} - PAID"
                    value={receiptSubject}
                    onChange={(e) => setReceiptSubject(e.currentTarget.value)}
                  />
                  
                  <Textarea
                    label="Email Body (HTML)"
                    placeholder="<p>Dear {contact_name},</p><p>Thank you for your payment...</p>"
                    value={receiptBody}
                    onChange={(e) => setReceiptBody(e.currentTarget.value)}
                    rows={6}
                  />
                </Stack>
              </div>

              <Divider />

              {/* Quote Template */}
              <div>
                <Group mb="md">
                  <Badge color="violet" variant="light">Quote Email Template</Badge>
                </Group>
                
                <Stack gap="md">
                  <TextInput
                    label="Subject Line"
                    description="Available tokens: {quote_number}, {contact_name}, {amount}, {expiry_date}"
                    placeholder="Quote {quote_number} - {contact_name}"
                    value={quoteSubject}
                    onChange={(e) => setQuoteSubject(e.currentTarget.value)}
                  />
                  
                  <Textarea
                    label="Email Body (HTML)"
                    placeholder="<p>Dear {contact_name},</p><p>Please find attached quote...</p>"
                    value={quoteBody}
                    onChange={(e) => setQuoteBody(e.currentTarget.value)}
                    rows={6}
                  />
                </Stack>
              </div>
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* Appearance Tab */}
        <Tabs.Panel value="appearance" pt="md">
          <Paper shadow="sm" p="xl" withBorder>
            <Stack gap="xl">
              <div>
                <Title order={4} mb="md">Header Colors</Title>
                <Stack gap="md">
                  <ColorInput
                    label="Invoice Header Color"
                    description="Default: Green"
                    value={invoiceHeaderColor}
                    onChange={setInvoiceHeaderColor}
                  />
                  <ColorInput
                    label="Receipt Header Color"
                    description="Default: Green"
                    value={receiptHeaderColor}
                    onChange={setReceiptHeaderColor}
                  />
                  <ColorInput
                    label="Quote Header Color"
                    description="Default: Purple"
                    value={quoteHeaderColor}
                    onChange={setQuoteHeaderColor}
                  />
                </Stack>
              </div>

              <Divider />

              <div>
                <Title order={4} mb="md">Layout Options</Title>
                <Stack gap="md">
                  <Select
                    label="Email Width"
                    description="Maximum width of email content"
                    data={[
                      { value: '500px', label: 'Narrow (500px)' },
                      { value: '600px', label: 'Standard (600px)' },
                      { value: '700px', label: 'Wide (700px)' },
                    ]}
                    value={emailWidth}
                    onChange={(value) => setEmailWidth(value || '600px')}
                  />
                  
                  <Switch
                    label="Show Logo in Header"
                    description="Display clinic logo at top of email"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.currentTarget.checked)}
                  />
                  
                  <Switch
                    label="Show Payment Instructions"
                    description="Include payment details in invoice emails"
                    checked={showPaymentInstructions}
                    onChange={(e) => setShowPaymentInstructions(e.currentTarget.checked)}
                  />
                </Stack>
              </div>
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* Sender Settings Tab */}
        <Tabs.Panel value="sender" pt="md">
          <Paper shadow="sm" p="xl" withBorder>
            <Stack gap="xl">
              <div>
                <Title order={4} mb="md">Default Gmail Account</Title>
                <Select
                  label="Send Using Account"
                  description="This account will be pre-selected when sending emails"
                  placeholder="Select Gmail account"
                  data={connectedAccounts.map(account => ({
                    value: account.email,
                    label: `${account.display_name || account.email}`,
                  }))}
                  value={defaultGmailAccount}
                  onChange={(value) => setDefaultGmailAccount(value || '')}
                />
              </div>

              <Divider />

              <div>
                <Title order={4} mb="md">Reply & BCC Settings</Title>
                <Stack gap="md">
                  <TextInput
                    label="Reply-To Email (Optional)"
                    description="If set, replies will go to this address instead of sender"
                    placeholder="accounts@walkeasy.com.au"
                    value={replyToEmail}
                    onChange={(e) => setReplyToEmail(e.currentTarget.value)}
                  />
                  
                  <TextInput
                    label="BCC All Emails To (Optional)"
                    description="Automatically BCC this address on all invoice emails"
                    placeholder="admin@walkeasy.com.au"
                    value={bccAllTo}
                    onChange={(e) => setBccAllTo(e.currentTarget.value)}
                  />
                </Stack>
              </div>
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* Auto-Send Rules Tab */}
        <Tabs.Panel value="rules" pt="md">
          <Paper shadow="sm" p="xl" withBorder>
            <Stack gap="xl">
              <Alert icon={<IconRobot size={16} />} color="blue" title="Automation Coming Soon">
                <Text size="sm">
                  Auto-send rules for invoices, receipts, payment reminders, and overdue notices 
                  will be available in a future update.
                </Text>
              </Alert>

              <div>
                <Title order={4} mb="md">Automatic Email Triggers</Title>
                <Stack gap="md">
                  <Switch
                    label="Email invoices when created"
                    description="Automatically send invoice email when status is AUTHORISED"
                    checked={autoSendInvoices}
                    onChange={(e) => setAutoSendInvoices(e.currentTarget.checked)}
                    disabled
                  />
                  
                  <Switch
                    label="Email receipts when paid"
                    description="Automatically send receipt when invoice is fully paid"
                    checked={autoSendReceipts}
                    onChange={(e) => setAutoSendReceipts(e.currentTarget.checked)}
                    disabled
                  />
                  
                  <Switch
                    label="Send payment reminders"
                    description="Send reminders before invoice due date"
                    checked={sendPaymentReminders}
                    onChange={(e) => setSendPaymentReminders(e.currentTarget.checked)}
                    disabled
                  />
                </Stack>
              </div>
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* Content Tab */}
        <Tabs.Panel value="content" pt="md">
          <Paper shadow="sm" p="xl" withBorder>
            <Stack gap="xl">
              <div>
                <Title order={4} mb="md">Bank Details (For EFT Payments)</Title>
                <Stack gap="md">
                  <TextInput
                    label="Account Name"
                    placeholder="WalkEasy Nexus Pty Ltd"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.currentTarget.value)}
                  />
                  <Group grow>
                    <TextInput
                      label="BSB"
                      placeholder="123-456"
                      value={bankBsb}
                      onChange={(e) => setBankBsb(e.currentTarget.value)}
                    />
                    <TextInput
                      label="Account Number"
                      placeholder="12345678"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.currentTarget.value)}
                    />
                  </Group>
                  <Textarea
                    label="Payment Instructions"
                    description="Instructions shown in invoice emails"
                    placeholder="Please transfer payment to the account details below..."
                    value={paymentInstructionsText}
                    onChange={(e) => setPaymentInstructionsText(e.currentTarget.value)}
                    rows={3}
                  />
                </Stack>
              </div>

              <Divider />

              <div>
                <Title order={4} mb="md">Contact Information (Footer)</Title>
                <Stack gap="md">
                  <TextInput
                    label="Clinic Name"
                    placeholder="WalkEasy Nexus"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.currentTarget.value)}
                  />
                  <Group grow>
                    <TextInput
                      label="Phone"
                      placeholder="(02) 1234 5678"
                      value={clinicPhone}
                      onChange={(e) => setClinicPhone(e.currentTarget.value)}
                    />
                    <TextInput
                      label="Email"
                      placeholder="info@walkeasy.com.au"
                      value={clinicEmail}
                      onChange={(e) => setClinicEmail(e.currentTarget.value)}
                    />
                  </Group>
                  <Textarea
                    label="Address"
                    placeholder="123 Main St, Newcastle NSW 2300"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.currentTarget.value)}
                    rows={2}
                  />
                </Stack>
              </div>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

