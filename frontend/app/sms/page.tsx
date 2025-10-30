'use client';

import { useState, useEffect } from 'react';
import { Container, Title, Text, Stack, Paper, List, Badge, Button, Group, Alert, TextInput, Textarea, Table, Tabs, Select, Loader, Code } from '@mantine/core';
import { IconAlertCircle, IconSend, IconCheck, IconX, IconMessage, IconTemplate, IconHistory, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Navigation from '../components/Navigation';

interface SMSTemplate {
  id: string;
  name: string;
  description: string;
  message_template: string;
  is_active: boolean;
}

interface SMSMessage {
  id: string;
  phone_number: string;
  message: string;
  status: string;
  patient_name?: string;
  sent_at?: string;
  created_at: string;
  error_message?: string;
  sms_count: number;
}

interface BalanceInfo {
  success: boolean;
  balance?: number;
  currency?: string;
  error?: string;
}

export default function SMSPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchMessages();
    fetchBalance();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/sms/templates/');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const response = await fetch('https://localhost:8000/api/sms/messages/?ordering=-created_at');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const response = await fetch('https://localhost:8000/api/sms/balance/');
      if (response.ok) {
        const data = await response.json();
        setBalance(data);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleSend = async () => {
    if (!phoneNumber || !message) {
      notifications.show({
        title: 'Validation Error',
        message: 'Phone number and message are required',
        color: 'red',
        icon: <IconX />,
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch('https://localhost:8000/api/sms/messages/send/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          message: message
        })
      });

      if (response.ok) {
        const data = await response.json();
        notifications.show({
          title: 'SMS Sent!',
          message: `Message sent to ${phoneNumber}`,
          color: 'green',
          icon: <IconCheck />,
        });
        
        // Clear form
        setPhoneNumber('');
        setMessage('');
        
        // Refresh messages and balance
        fetchMessages();
        fetchBalance();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send SMS');
      }
    } catch (error: any) {
      notifications.show({
        title: 'Send Failed',
        message: error.message || 'Failed to send SMS',
        color: 'red',
        icon: <IconX />,
      });
    } finally {
      setSending(false);
    }
  };

  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setMessage(template.message_template);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: {[key: string]: string} = {
      'pending': 'yellow',
      'sent': 'blue',
      'delivered': 'green',
      'failed': 'red',
      'cancelled': 'gray',
    };
    return <Badge color={colors[status] || 'gray'}>{status.toUpperCase()}</Badge>;
  };

  return (
    <Navigation activeTab="sms">
      <Container size="lg" mt="xl">
        <Stack gap="xl">
          <div>
            <Title order={1}>SMS Integration</Title>
            <Text c="dimmed" size="lg" mt="xs">
              Send appointment reminders and notifications via SMS
            </Text>
          </div>

          {balance && (
            balance.success ? (
              <Alert icon={<IconCheck size={20} />} title="SMS Broadcast Connected" color="green">
                <Group>
                  <Text size="sm">Account Balance: <strong>${balance.balance?.toFixed(2)} {balance.currency}</strong></Text>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={fetchBalance}
                    loading={loadingBalance}
                  >
                    Refresh
                  </Button>
                </Group>
              </Alert>
            ) : (
              <Alert icon={<IconAlertCircle size={20} />} title="Configuration Required" color="yellow">
                <Text size="sm">
                  SMS Broadcast credentials not configured. Add SMSB_USERNAME and SMSB_PASSWORD to your .env file.
                </Text>
                {balance.error && (
                  <Text size="xs" c="dimmed" mt="xs">
                    Error: {balance.error}
                  </Text>
                )}
              </Alert>
            )
          )}

          <Tabs defaultValue="send">
            <Tabs.List>
              <Tabs.Tab value="send" leftSection={<IconSend size={16} />}>
                Send SMS
              </Tabs.Tab>
              <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
                Message History
              </Tabs.Tab>
              <Tabs.Tab value="templates" leftSection={<IconTemplate size={16} />}>
                Templates
              </Tabs.Tab>
              <Tabs.Tab value="setup" leftSection={<IconInfoCircle size={16} />}>
                Setup
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="send" pt="md">
              <Paper shadow="sm" p="xl" withBorder>
                <Title order={2} size="h3" mb="md">Send SMS Message</Title>
                
                <Stack gap="md">
                  <Select
                    label="Template (Optional)"
                    placeholder="Choose a template"
                    data={templates.map(t => ({ value: t.id, label: t.name }))}
                    value={selectedTemplate}
                    onChange={handleTemplateSelect}
                    clearable
                  />
                  
                  <TextInput
                    label="Phone Number"
                    placeholder="+61 400 000 000"
                    description="Include country code (e.g., +61 for Australia)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  
                  <Textarea
                    label="Message"
                    placeholder="Your message here..."
                    rows={4}
                    maxLength={480}
                    description={`${message.length} characters (${Math.ceil(message.length / 160)} SMS)`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                  
                  <Group>
                    <Button
                      leftSection={<IconSend size={16} />}
                      onClick={handleSend}
                      loading={sending}
                      disabled={!balance?.success}
                    >
                      Send SMS
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="history" pt="md">
              <Paper shadow="sm" p="xl" withBorder>
                <Group mb="md" justify="space-between">
                  <Title order={2} size="h3">Message History</Title>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={fetchMessages}
                    loading={loadingMessages}
                  >
                    Refresh
                  </Button>
                </Group>

                {loadingMessages ? (
                  <Group justify="center" py="xl">
                    <Loader />
                  </Group>
                ) : messages.length === 0 ? (
                  <Alert icon={<IconInfoCircle size={20} />} color="blue">
                    No messages sent yet. Send your first SMS above!
                  </Alert>
                ) : (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Phone</Table.Th>
                        <Table.Th>Message</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Sent</Table.Th>
                        <Table.Th>SMS Count</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {messages.slice(0, 20).map((msg) => (
                        <Table.Tr key={msg.id}>
                          <Table.Td>{msg.phone_number}</Table.Td>
                          <Table.Td style={{ maxWidth: '300px' }}>
                            <Text size="sm" truncate="end">
                              {msg.message}
                            </Text>
                            {msg.error_message && (
                              <Text size="xs" c="red">{msg.error_message}</Text>
                            )}
                          </Table.Td>
                          <Table.Td>{getStatusBadge(msg.status)}</Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {msg.sent_at
                                ? new Date(msg.sent_at).toLocaleString()
                                : new Date(msg.created_at).toLocaleString()}
                            </Text>
                          </Table.Td>
                          <Table.Td>{msg.sms_count}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="templates" pt="md">
              <Paper shadow="sm" p="xl" withBorder>
                <Title order={2} size="h3" mb="md">SMS Templates</Title>
                
                <Stack gap="md">
                  {templates.map((template) => (
                    <Paper key={template.id} p="md" withBorder>
                      <Group justify="space-between" mb="xs">
                        <div>
                          <Text fw={600}>{template.name}</Text>
                          <Text size="sm" c="dimmed">{template.description}</Text>
                        </div>
                        <Badge color={template.is_active ? 'green' : 'gray'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </Group>
                      <Code block mt="xs">
                        {template.message_template}
                      </Code>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="setup" pt="md">
              <Stack gap="md">
                <Paper shadow="sm" p="xl" withBorder>
                  <Title order={2} size="h3" mb="md">Setup Instructions</Title>
                  <List spacing="md" size="sm">
                    <List.Item>Sign up at <strong>https://www.smsbroadcast.com.au/</strong></List.Item>
                    <List.Item>Get your API credentials (username & password)</List.Item>
                    <List.Item>Add to backend/.env file:
                      <Code block mt="xs">
                        SMSB_USERNAME=your_username{'\n'}
                        SMSB_PASSWORD=your_password{'\n'}
                        SMSB_SENDER_ID=Walk Easy
                      </Code>
                    </List.Item>
                    <List.Item>Restart Django server: <Code>./start-https.sh</Code></List.Item>
                    <List.Item>Test sending SMS from the "Send SMS" tab</List.Item>
                  </List>
                </Paper>

                <Paper shadow="sm" p="xl" withBorder>
                  <Title order={2} size="h3" mb="md">Available Features</Title>
                  <Stack gap="md">
                    <Group>
                      <Badge color="green" variant="filled">✓ READY</Badge>
                      <Text size="sm"><strong>Send SMS</strong> - Send custom messages to any phone number</Text>
                    </Group>
                    <Group>
                      <Badge color="green" variant="filled">✓ READY</Badge>
                      <Text size="sm"><strong>Templates</strong> - Use predefined message templates</Text>
                    </Group>
                    <Group>
                      <Badge color="green" variant="filled">✓ READY</Badge>
                      <Text size="sm"><strong>Message History</strong> - Track all sent messages</Text>
                    </Group>
                    <Group>
                      <Badge color="green" variant="filled">✓ READY</Badge>
                      <Text size="sm"><strong>Balance Check</strong> - Monitor SMS credit balance</Text>
                    </Group>
                    <Group>
                      <Badge color="yellow" variant="filled">PENDING</Badge>
                      <Text size="sm"><strong>Appointment Reminders</strong> - Automated reminders (needs scheduling)</Text>
                    </Group>
                    <Group>
                      <Badge color="yellow" variant="filled">PENDING</Badge>
                      <Text size="sm"><strong>Inbound Messages</strong> - Receive patient replies (needs webhook)</Text>
                    </Group>
                  </Stack>
                </Paper>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Container>
    </Navigation>
  );
}
