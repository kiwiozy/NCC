'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Text,
  Stack,
  Paper,
  List,
  Badge,
  Button,
  Group,
  Alert,
  Table,
  Code,
  Loader,
  Center,
  Tabs,
  TextInput,
  Textarea,
  Modal,
  Select,
  Checkbox,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconRefresh,
  IconPlugConnected,
  IconX,
  IconMail,
  IconSend,
  IconTemplate,
  IconHistory,
  IconSettings,
  IconClock,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { formatDateTimeAU } from '../../utils/dateFormatting';

interface GmailConnection {
  id: string;
  email_address: string;
  display_name: string;
  is_active: boolean;
  is_primary: boolean;
  expires_at: string;
  connected_at: string;
  last_refresh_at: string | null;
  last_used_at: string | null;
  emails_sent: number;
  is_token_expired: boolean;
  scopes: string;
}

interface ConnectionStatus {
  connected: boolean;
  connection: GmailConnection | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  subject: string;
  body_html: string;
  body_text: string;
  is_active: boolean;
  attach_pdf: boolean;
}

interface SentEmail {
  id: string;
  connection_email: string;
  to_addresses: string;
  cc_addresses: string;
  subject: string;
  status: string;
  has_attachments: boolean;
  attachment_names: string;
  sent_at: string;
  template_name: string | null;
}

interface SendAsAddress {
  email: string;
  display_name: string;
  is_default: boolean;
  is_primary: boolean;
  verification_status: string;
  reply_to: string;
  signature: string;
}

export default function GmailIntegration() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<Array<{email: string, display_name: string, is_primary: boolean, connected_at: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [sendAsAddresses, setSendAsAddresses] = useState<SendAsAddress[]>([]);
  const [defaultFromAddress, setDefaultFromAddress] = useState<string>('');
  const [defaultConnectionEmail, setDefaultConnectionEmail] = useState<string>('');
  
  // Send email form
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [toEmails, setToEmails] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [bccEmails, setBccEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [fromAddress, setFromAddress] = useState<string>('');
  const [connectionEmail, setConnectionEmail] = useState<string>('');
  const [sending, setSending] = useState(false);
  
  // Test email
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingSending] = useState(false);

  useEffect(() => {
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const oauthStatus = urlParams.get('status');
    const email = urlParams.get('email');
    const errorMessage = urlParams.get('message');
    
    if (oauthStatus === 'connected' && email) {
      notifications.show({
        title: 'Gmail Connected!',
        message: `Successfully connected ${email}`,
        color: 'green',
        icon: <IconCheck />,
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=gmail');
    } else if (oauthStatus === 'error') {
      notifications.show({
        title: 'Connection Failed',
        message: errorMessage || 'Failed to connect Gmail account',
        color: 'red',
        icon: <IconX />,
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=gmail');
    }
    
    fetchStatus();
    fetchTemplates();
    fetchConnectedAccounts();
  }, []);

  useEffect(() => {
    // Fetch Send As addresses when connected accounts change
    if (connectedAccounts.length > 0) {
      fetchSendAsAddresses();
    }
  }, [connectedAccounts.length]);

  const fetchConnectedAccounts = async () => {
    try {
      const response = await fetch('https://localhost:8000/gmail/connected-accounts/');
      if (!response.ok) throw new Error('Failed to fetch connected accounts');
      
      const data = await response.json();
      const accounts = data.accounts || [];
      setConnectedAccounts(accounts);
      
      // Set default connection from localStorage or primary account
      const savedConnection = localStorage.getItem('gmail_default_connection');
      if (savedConnection && accounts.find((a: any) => a.email === savedConnection)) {
        setDefaultConnectionEmail(savedConnection);
        setConnectionEmail(savedConnection);
      } else {
        const primaryAccount = accounts.find((a: any) => a.is_primary);
        if (primaryAccount) {
          setDefaultConnectionEmail(primaryAccount.email);
          setConnectionEmail(primaryAccount.email);
        } else if (accounts.length > 0) {
          setDefaultConnectionEmail(accounts[0].email);
          setConnectionEmail(accounts[0].email);
        }
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('https://localhost:8000/gmail/connections/status/');
      if (!response.ok) throw new Error('Failed to fetch status');
      
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching Gmail status:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch Gmail connection status',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('https://localhost:8000/gmail/templates/');
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setTemplates(data.results || data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchSendAsAddresses = async () => {
    try {
      const response = await fetch('https://localhost:8000/gmail/send-as-addresses/');
      if (!response.ok) throw new Error('Failed to fetch Send As addresses');
      
      const data = await response.json();
      const addresses = data.send_as_addresses || [];
      setSendAsAddresses(addresses);
      
      // Set default from address to the first verified address, or primary, or first in list
      const defaultAddr = addresses.find((addr: SendAsAddress) => addr.is_default) 
        || addresses.find((addr: SendAsAddress) => addr.is_primary)
        || addresses[0];
      
      if (defaultAddr) {
        setDefaultFromAddress(defaultAddr.email);
        setFromAddress(defaultAddr.email);
        // Save to localStorage
        localStorage.setItem('gmail_default_from', defaultAddr.email);
      }
      
      // Or load from localStorage if exists
      const savedDefault = localStorage.getItem('gmail_default_from');
      if (savedDefault && addresses.some((addr: SendAsAddress) => addr.email === savedDefault)) {
        setDefaultFromAddress(savedDefault);
        setFromAddress(savedDefault);
      }
      
    } catch (error) {
      console.error('Error fetching Send As addresses:', error);
    }
  };

  const fetchSentEmails = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch('https://localhost:8000/gmail/sent/?page_size=20');
      if (!response.ok) throw new Error('Failed to fetch sent emails');
      
      const data = await response.json();
      setSentEmails(data.results || []);
    } catch (error) {
      console.error('Error fetching sent emails:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch sent emails',
        color: 'red',
      });
    } finally {
      setLogsLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = 'https://localhost:8000/gmail/oauth/connect/';
  };

  const handleRefreshToken = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('https://localhost:8000/gmail/oauth/refresh/', {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to refresh token');
      
      notifications.show({
        title: 'Token Refreshed',
        message: 'OAuth token refreshed successfully',
        color: 'green',
        icon: <IconCheck />,
      });
      
      fetchStatus();
    } catch (error) {
      notifications.show({
        title: 'Refresh Failed',
        message: 'Failed to refresh OAuth token',
        color: 'red',
        icon: <IconX />,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = async (email?: string) => {
    const accountEmail = email || connectedAccounts.find(a => a.is_primary)?.email || connectedAccounts[0]?.email;
    const accountName = connectedAccounts.find(a => a.email === accountEmail)?.display_name || accountEmail;
    
    if (!confirm(`Are you sure you want to disconnect ${accountName || accountEmail}?`)) return;
    
    try {
      const response = await fetch('https://localhost:8000/gmail/oauth/disconnect/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: accountEmail }),
      });
      
      if (!response.ok) throw new Error('Failed to disconnect');
      
      notifications.show({
        title: 'Disconnected',
        message: `Successfully disconnected ${accountName || accountEmail}`,
        color: 'blue',
      });
      
      // Refresh connected accounts list
      await fetchConnectedAccounts();
      fetchStatus();
      
      // Clear default connection if it was disconnected
      const savedConnection = localStorage.getItem('gmail_default_connection');
      if (savedConnection === accountEmail) {
        localStorage.removeItem('gmail_default_connection');
        // Set new default from remaining accounts
        const updatedAccounts = connectedAccounts.filter(a => a.email !== accountEmail);
        if (updatedAccounts.length > 0) {
          const primary = updatedAccounts.find(a => a.is_primary);
          setDefaultConnectionEmail(primary?.email || updatedAccounts[0].email);
          setConnectionEmail(primary?.email || updatedAccounts[0].email);
        } else {
          setDefaultConnectionEmail('');
          setConnectionEmail('');
        }
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to disconnect Gmail account',
        color: 'red',
      });
    }
  };

  const handleSendEmail = async () => {
    if (!toEmails || !subject || !bodyHtml) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        color: 'red',
      });
      return;
    }

    setSending(true);
    try {
      const toEmailList = toEmails.split(/[,;]/).map(e => e.trim()).filter(e => e);
      const ccEmailList = ccEmails ? ccEmails.split(/[,;]/).map(e => e.trim()).filter(e => e) : [];
      const bccEmailList = bccEmails ? bccEmails.split(/[,;]/).map(e => e.trim()).filter(e => e) : [];

      const response = await fetch('https://localhost:8000/gmail/send/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_emails: toEmailList,
          cc_emails: ccEmailList,
          bcc_emails: bccEmailList,
          subject,
          body_html: bodyHtml,
          body_text: bodyHtml.replace(/<[^>]*>/g, ''), // Simple HTML strip
          template_id: selectedTemplate || undefined,
          from_address: fromAddress || undefined,
          connection_email: connectionEmail || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send email');
      }

      notifications.show({
        title: 'Email Sent!',
        message: `Email sent successfully to ${toEmailList.length} recipient(s)${connectionEmail ? ` from ${connectedAccounts.find(a => a.email === connectionEmail)?.display_name || connectionEmail}` : ''}`,
        color: 'green',
        icon: <IconCheck />,
      });

      // Reset form
      setComposeModalOpen(false);
      setToEmails('');
      setCcEmails('');
      setBccEmails('');
      setSubject('');
      setBodyHtml('');
      setSelectedTemplate(null);
      
      // Refresh sent emails and connected accounts (to update last_used_at)
      fetchSentEmails();
      fetchConnectedAccounts();
    } catch (error: any) {
      notifications.show({
        title: 'Send Failed',
        message: error.message || 'Failed to send email',
        color: 'red',
        icon: <IconX />,
      });
    } finally {
      setSending(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testEmail) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please enter an email address',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetch('https://localhost:8000/gmail/test/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_email: testEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Test failed');
      }

      notifications.show({
        title: 'Test Email Sent!',
        message: `Test email sent successfully to ${testEmail}`,
        color: 'green',
        icon: <IconCheck />,
      });

      setTestModalOpen(false);
      setTestEmail('');
    } catch (error: any) {
      notifications.show({
        title: 'Test Failed',
        message: error.message || 'Failed to send test email',
        color: 'red',
        icon: <IconX />,
      });
    }
  };

  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setSubject(template.subject);
        setBodyHtml(template.body_html);
      }
    }
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  // Use connectedAccounts array for multi-account support
  const isConnected = connectedAccounts.length > 0;

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Gmail Integration</Title>
        <Text c="dimmed" size="sm" mt="xs">
          Professional email sending via Gmail API with OAuth2
        </Text>
      </div>

      {/* Connection Status */}
      {connectedAccounts.length > 0 ? (
        <Alert 
          icon={<IconCheck size={20} />} 
          title={`Connected to Gmail (${connectedAccounts.length} account${connectedAccounts.length > 1 ? 's' : ''})`}
          color="green"
          variant="light"
        >
          <Stack gap="xs">
            {connectedAccounts.map((account, idx) => (
              <div key={account.email}>
                <strong>{account.display_name || account.email}</strong>
                {account.is_primary && <Badge ml="xs" color="blue" size="sm">Primary</Badge>}
              </div>
            ))}
          </Stack>
          <Group mt="md">
            <Button
              size="sm"
              variant="light"
              leftSection={<IconPlugConnected size={16} />}
              onClick={() => window.location.href = 'https://localhost:8000/gmail/oauth/connect/'}
            >
              Connect Another Account
            </Button>
          </Group>
        </Alert>
      ) : (
        <Alert 
          icon={<IconAlertCircle size={20} />} 
          title="Not Connected" 
          color="yellow"
          variant="light"
        >
          Connect to Gmail to enable email sending via Gmail API
        </Alert>
      )}

      {/* Connection Details */}
      {connectedAccounts.length > 0 && (
        <Paper shadow="sm" p="xl" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3} size="h4">Connected Accounts</Title>
            {connectedAccounts.length > 1 && (
              <Button
                size="sm"
                variant="light"
                leftSection={<IconPlugConnected size={16} />}
                onClick={() => window.location.href = 'https://localhost:8000/gmail/oauth/connect/'}
              >
                Add Account
              </Button>
            )}
          </Group>
          
          <Stack gap="lg">
            {connectedAccounts.map((account) => (
              <Paper key={account.email} p="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Group>
                      <Text fw={500} size="sm" w={150}>Email Address:</Text>
                      <Text size="sm">{account.email}</Text>
                      {account.is_primary && (
                        <Badge color="blue" size="sm">Primary</Badge>
                      )}
                    </Group>
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      onClick={() => handleDisconnect(account.email)}
                    >
                      Disconnect
                    </Button>
                  </Group>
                  <Group>
                    <Text fw={500} size="sm" w={150}>Display Name:</Text>
                    <Text size="sm">{account.display_name || 'Not set'}</Text>
                  </Group>
                  <Group>
                    <Text fw={500} size="sm" w={150}>Connected At:</Text>
                    <Text size="sm">{formatDateTimeAU(account.connected_at)}</Text>
                  </Group>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Old Connection Details - Keep for compatibility */}
      {isConnected && status.connection && false && (
        <Paper shadow="sm" p="xl" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3} size="h4">Connection Details</Title>
            <Group gap="xs">
              <Button 
                size="sm" 
                variant="light" 
                leftSection={<IconRefresh size={16} />}
                onClick={handleRefreshToken}
                loading={refreshing}
              >
                Refresh Token
              </Button>
              <Button 
                size="sm" 
                variant="light" 
                color="red"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </Group>
          </Group>
          
          <Stack gap="sm">
            <Group>
              <Text fw={500} size="sm" w={150}>Email Address:</Text>
              <Text size="sm">{status.connection?.email_address}</Text>
              {status.connection?.is_primary && (
                <Badge color="blue" size="sm">Primary</Badge>
              )}
            </Group>
            <Group>
              <Text fw={500} size="sm" w={150}>Display Name:</Text>
              <Text size="sm">{status.connection?.display_name}</Text>
            </Group>
            <Group>
              <Text fw={500} size="sm" w={150}>Emails Sent:</Text>
              <Text size="sm">{status.connection?.emails_sent || 0}</Text>
            </Group>
            <Group>
              <Text fw={500} size="sm" w={150}>Connected:</Text>
              <Text size="sm">{formatDateTimeAU(status.connection?.connected_at)}</Text>
            </Group>
            <Group>
              <Text fw={500} size="sm" w={150}>Token Expires:</Text>
              <Text size="sm">{formatDateTimeAU(status.connection?.expires_at)}</Text>
              {status.connection?.is_token_expired && (
                <Badge color="red" size="sm">Expired</Badge>
              )}
            </Group>
            <Group>
              <Text fw={500} size="sm" w={150}>Last Used:</Text>
              <Text size="sm">
                {status.connection?.last_used_at 
                  ? formatDateTimeAU(status.connection.last_used_at)
                  : 'Never'}
              </Text>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Setup Instructions (if not connected) */}
      {!isConnected && (
        <Paper shadow="sm" p="xl" withBorder>
          <Title order={3} size="h4" mb="md">Setup Instructions</Title>
          <List spacing="md" size="sm" mb="xl">
            <List.Item>
              Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>
            </List.Item>
            <List.Item>Create a new project or select an existing one</List.Item>
            <List.Item>Enable the "Gmail API"</List.Item>
            <List.Item>
              Create OAuth 2.0 credentials (OAuth Client ID) for "Web Application"
            </List.Item>
            <List.Item>
              Add authorized redirect URI: <Code>https://localhost:8000/gmail/oauth/callback/</Code>
            </List.Item>
            <List.Item>Copy your Client ID and Client Secret</List.Item>
            <List.Item>Add them to your <Code>backend/.env</Code> file:
              <Code block mt="sm">
                GMAIL_CLIENT_ID=your_client_id{'\n'}
                GMAIL_CLIENT_SECRET=your_client_secret{'\n'}
                GMAIL_REDIRECT_URI=https://localhost:8000/gmail/oauth/callback/
              </Code>
            </List.Item>
            <List.Item>Restart your Django server</List.Item>
            <List.Item>Click "Connect to Gmail" below</List.Item>
          </List>

          <Button 
            variant="filled" 
            leftSection={<IconPlugConnected size={18} />}
            onClick={handleConnect}
          >
            Connect to Gmail
          </Button>
        </Paper>
      )}

      {/* Action Buttons */}
      {isConnected && (
        <Group>
          <Button
            leftSection={<IconSend size={18} />}
            onClick={() => setComposeModalOpen(true)}
            variant="gradient"
            gradient={{ from: 'blue', to: 'cyan' }}
          >
            Compose Email
          </Button>
          <Button
            leftSection={<IconMail size={18} />}
            onClick={() => setTestModalOpen(true)}
            variant="light"
          >
            Test Connection
          </Button>
        </Group>
      )}

      {/* Features Tabs */}
      <Tabs defaultValue="features">
        <Tabs.List>
          <Tabs.Tab value="features" leftSection={<IconSettings size={16} />}>
            Features
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
            Sent Emails
          </Tabs.Tab>
          <Tabs.Tab value="templates" leftSection={<IconTemplate size={16} />}>
            Templates
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="features" pt="md">
          <Paper shadow="sm" p="xl" withBorder>
            <Stack gap="lg">
              <div>
                <Group gap="xs" mb="xs">
                  <Badge color="blue" variant="light">Gmail API Sending</Badge>
                  {isConnected && <Badge color="green" size="sm">Available</Badge>}
                </Group>
                <Text size="sm" c="dimmed">
                  Send emails directly through your Gmail account via Gmail API. Better deliverability than SMTP.
                </Text>
              </div>

              <div>
                <Group gap="xs" mb="xs">
                  <Badge color="blue" variant="light">HTML Email Templates</Badge>
                  {isConnected && <Badge color="green" size="sm">Available</Badge>}
                </Group>
                <Text size="sm" c="dimmed">
                  Create and manage reusable email templates with HTML formatting for professional communications.
                </Text>
              </div>

              <div>
                <Group gap="xs" mb="xs">
                  <Badge color="blue" variant="light">PDF Attachments</Badge>
                  {isConnected && <Badge color="green" size="sm">Available</Badge>}
                </Group>
                <Text size="sm" c="dimmed">
                  Automatically attach PDF reports (like AT Reports) to emails with proper formatting and naming.
                </Text>
              </div>

              <div>
                <Group gap="xs" mb="xs">
                  <Badge color="blue" variant="light">Email Logging</Badge>
                  {isConnected && <Badge color="green" size="sm">Available</Badge>}
                </Group>
                <Text size="sm" c="dimmed">
                  Comprehensive logging of all sent emails with status tracking, recipients, and timestamps.
                </Text>
              </div>

              <div>
                <Group gap="xs" mb="xs">
                  <Badge color="blue" variant="light">OAuth2 Security</Badge>
                  <Badge color="green" size="sm">Always Active</Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Secure authentication via Google OAuth2. No passwords stored, automatic token refresh.
                </Text>
              </div>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="md">
          <Paper shadow="sm" p="xl" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4} size="h5">Recently Sent Emails</Title>
              <Button 
                size="sm" 
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={fetchSentEmails}
                loading={logsLoading}
              >
                Refresh
              </Button>
            </Group>

            {sentEmails.length === 0 && !logsLoading ? (
              <Text c="dimmed" ta="center" py="xl">
                No sent emails yet. Emails will appear here after sending.
              </Text>
            ) : logsLoading ? (
              <Center py="xl">
                <Loader size="sm" />
              </Center>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Subject</Table.Th>
                    <Table.Th>To</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Time</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sentEmails.map((email) => (
                    <Table.Tr key={email.id}>
                      <Table.Td>
                        <Text size="sm">{email.subject}</Text>
                        {email.has_attachments && (
                          <Badge size="xs" variant="light" color="blue" mt="xs">
                            📎 {email.attachment_names}
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{email.to_addresses}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge 
                          color={email.status === 'sent' ? 'green' : 'red'}
                          variant="light"
                          size="sm"
                        >
                          {email.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {formatDateTimeAU(email.sent_at)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="templates" pt="md">
          <Paper shadow="sm" p="xl" withBorder>
            <Title order={4} size="h5" mb="md">Email Templates</Title>
            {templates.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                No templates available. Templates can be created in the Django admin panel.
              </Text>
            ) : (
              <Stack gap="md">
                {templates.map((template) => (
                  <Paper key={template.id} p="md" withBorder>
                    <Group justify="space-between">
                      <div>
                        <Group gap="xs">
                          <Text fw={500}>{template.name}</Text>
                          {template.category && (
                            <Badge size="sm" variant="light">{template.category}</Badge>
                          )}
                          {!template.is_active && (
                            <Badge size="sm" color="gray">Inactive</Badge>
                          )}
                        </Group>
                        <Text size="sm" c="dimmed" mt="xs">
                          {template.description || template.subject}
                        </Text>
                      </div>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => {
                          handleTemplateSelect(template.id);
                          setComposeModalOpen(true);
                        }}
                      >
                        Use Template
                      </Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Compose Email Modal */}
      <Modal
        opened={composeModalOpen}
        onClose={() => !sending && setComposeModalOpen(false)}
        title={<Text fw={600} size="lg">Compose Email</Text>}
        size="xl"
      >
        <Stack gap="md">
          {connectedAccounts.length > 1 && (
            <Select
              label="Send Using Account"
              description="Select which Gmail account to send from (emails will appear in this account's Sent folder)"
              placeholder="Choose connected account"
              data={connectedAccounts.map(account => ({
                value: account.email,
                label: `${account.display_name || account.email}${account.is_primary ? ' (Primary)' : ''}`,
              }))}
              value={connectionEmail}
              onChange={(value) => {
                setConnectionEmail(value || '');
                // Save as default
                if (value) {
                  localStorage.setItem('gmail_default_connection', value);
                  setDefaultConnectionEmail(value);
                }
              }}
              required
              disabled={sending}
            />
          )}
          
          <Select
            label="Template (Optional)"
            placeholder="Choose a template"
            data={templates.filter(t => t.is_active).map(t => ({ value: t.id, label: t.name }))}
            value={selectedTemplate}
            onChange={handleTemplateSelect}
            clearable
          />

          <TextInput
            label="To (Recipients)"
            placeholder="recipient@example.com, another@example.com"
            description="Enter one or more email addresses (comma or semicolon separated)"
            required
            value={toEmails}
            onChange={(e) => setToEmails(e.currentTarget.value)}
            disabled={sending}
          />

          <TextInput
            label="CC (Optional)"
            placeholder="cc@example.com"
            value={ccEmails}
            onChange={(e) => setCcEmails(e.currentTarget.value)}
            disabled={sending}
          />

          <TextInput
            label="BCC (Optional)"
            placeholder="bcc@example.com"
            value={bccEmails}
            onChange={(e) => setBccEmails(e.currentTarget.value)}
            disabled={sending}
          />

          <TextInput
            label="Subject"
            placeholder="Email subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.currentTarget.value)}
            disabled={sending}
          />

          <Textarea
            label="Message (HTML supported)"
            placeholder="Your message here..."
            rows={8}
            required
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.currentTarget.value)}
            disabled={sending}
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => setComposeModalOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              leftSection={<IconSend size={18} />}
              onClick={handleSendEmail}
              loading={sending}
              gradient={{ from: 'blue', to: 'cyan' }}
              variant="gradient"
            >
              Send Email
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Test Email Modal */}
      <Modal
        opened={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title={<Text fw={600} size="lg">Test Gmail Connection</Text>}
        size="md"
      >
        <Stack gap="md">
          <Alert icon={<IconMail size={16} />} color="blue">
            Send a test email to verify your Gmail connection is working correctly.
          </Alert>

          <TextInput
            label="Recipient Email"
            placeholder="your-email@example.com"
            required
            value={testEmail}
            onChange={(e) => setTestEmail(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => setTestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              leftSection={<IconMail size={18} />}
              onClick={handleTestConnection}
              loading={testingSending}
            >
              Send Test Email
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

