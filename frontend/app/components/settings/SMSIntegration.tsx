'use client';

import { useState, useEffect } from 'react';
import { Title, Text, Stack, Paper, List, Badge, Button, Group, Alert, TextInput, Textarea, Table, Tabs, Select, Loader, Code, Modal, Divider } from '@mantine/core';
import { IconAlertCircle, IconSend, IconCheck, IconX, IconMessage, IconTemplate, IconHistory, IconInfoCircle, IconArrowBack, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { formatDateTimeAU } from '../../utils/dateFormatting';

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

interface SMSInbound {
  id: string;
  from_number: string;
  to_number: string;
  message: string;
  received_at: string;
  patient_name?: string;
  is_processed: boolean;
  notes?: string;
}

export default function SMSIntegration() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SMSMessage | null>(null);
  const [replies, setReplies] = useState<SMSInbound[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyCounts, setReplyCounts] = useState<{[key: string]: number}>({});
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  useEffect(() => {
    fetchTemplates();
    fetchMessages();
    fetchBalance();
  }, []);

  // Fetch reply counts for all messages
  useEffect(() => {
    if (messages.length > 0) {
      fetchReplyCounts();
    }
  }, [messages]);

  const fetchReplyCounts = async () => {
    try {
      // Fetch all inbound messages
      const response = await fetch('https://localhost:8000/api/sms/inbound/?ordering=-received_at');
      if (response.ok) {
        const data = await response.json();
        const allReplies = data.results || data || [];
        
        // Count replies per phone number (group by phone number)
        const counts: {[key: string]: number} = {};
        messages.forEach(msg => {
          const phoneNumber = msg.phone_number.replace(/[^\d]/g, '');
          const searchVariants = [
            phoneNumber,
            phoneNumber.startsWith('61') ? '0' + phoneNumber.slice(2) : phoneNumber,
            phoneNumber.startsWith('0') ? '61' + phoneNumber.slice(1) : phoneNumber,
          ];
          
          const messageTime = new Date(msg.sent_at || msg.created_at);
          const replyCount = allReplies.filter((reply: SMSInbound) => {
            const replyPhone = reply.from_number.replace(/[^\d]/g, '');
            const matches = searchVariants.some(variant => 
              replyPhone === variant || replyPhone === variant.replace(/^61/, '0') || replyPhone === variant.replace(/^0/, '61')
            );
            if (!matches) return false;
            
            const replyTime = new Date(reply.received_at);
            return replyTime >= messageTime;
          }).length;
          
          if (replyCount > 0) {
            counts[msg.id] = replyCount;
          }
        });
        
        setReplyCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching reply counts:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/sms/templates/');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.results || data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    }
  };

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const response = await fetch('https://localhost:8000/api/sms/messages/?ordering=-created_at');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.results || data);
        // Reply counts will be fetched automatically via useEffect
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
      console.error('SMS Send Error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Extract more detailed error message
      let errorMessage = 'Failed to send SMS';
      if (error.message) {
        errorMessage = error.message;
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error - check if backend is running and certificate is trusted';
      }
      
      notifications.show({
        title: 'Send Failed',
        message: errorMessage,
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

  const handleMessageClick = async (msg: SMSMessage) => {
    setSelectedMessage(msg);
    setReplyModalOpen(true);
    setLoadingReplies(true);
    
    try {
      // Normalize phone number for searching (remove +, try different formats)
      const phoneNumber = msg.phone_number.replace(/[^\d]/g, ''); // Remove non-digits
      let searchNumber = phoneNumber;
      
      // Try different formats - SMS Broadcast may store in different formats
      const searchVariants = [
        phoneNumber, // Original format
        phoneNumber.startsWith('61') ? '0' + phoneNumber.slice(2) : phoneNumber, // Remove 61, add 0
        phoneNumber.startsWith('0') ? '61' + phoneNumber.slice(1) : phoneNumber, // Add 61, remove 0
      ];
      
      // Try each variant
      let allReplies: SMSInbound[] = [];
      for (const variant of searchVariants) {
        try {
          const response = await fetch(
            `https://localhost:8000/api/sms/inbound/?from_number=${encodeURIComponent(variant)}&ordering=-received_at`
          );
          if (response.ok) {
            const data = await response.json();
            const replies = data.results || data || [];
            allReplies = [...allReplies, ...replies];
          }
        } catch (err) {
          // Continue to next variant
        }
      }
      
      // Remove duplicates and filter to replies received after message was sent
      const messageTime = new Date(msg.sent_at || msg.created_at);
      console.log('Message time:', messageTime);
      console.log('All replies fetched:', allReplies.length);
      
      const uniqueReplies = Array.from(
        new Map(allReplies.map(reply => [reply.id, reply])).values()
      ).filter((reply: SMSInbound) => {
        const replyTime = new Date(reply.received_at);
        const isAfter = replyTime >= messageTime;
        console.log(`Reply "${reply.message}" at ${reply.received_at} - ${isAfter ? 'INCLUDED' : 'FILTERED OUT'}`);
        return isAfter;
      }).sort((a, b) => {
        // Sort by received time, newest first
        return new Date(b.received_at).getTime() - new Date(a.received_at).getTime();
      });
      
      console.log('Filtered replies:', uniqueReplies.length);
      setReplies(uniqueReplies);
    } catch (error) {
      console.error('Error fetching replies:', error);
      setReplies([]);
    } finally {
      setLoadingReplies(false);
    }
  };

  // Auto-refresh replies when modal is open
  useEffect(() => {
    if (!replyModalOpen || !selectedMessage || !autoRefreshEnabled) {
      console.log('Auto-refresh disabled:', { replyModalOpen, selectedMessage: !!selectedMessage, autoRefreshEnabled });
      return;
    }

    console.log('Auto-refresh enabled - starting interval');

    // Fetch replies function (reusable) - captures selectedMessage from closure
    const fetchReplies = async () => {
      const currentMessage = selectedMessage; // Capture from closure
      if (!currentMessage) {
        console.log('No message selected for auto-refresh');
        return;
      }
      
      console.log('Auto-refreshing replies for:', currentMessage.phone_number);
      
      // Silent refresh - don't show loading indicator
      const phoneNumber = currentMessage.phone_number.replace(/[^\d]/g, '');
      const searchVariants = [
        phoneNumber,
        phoneNumber.startsWith('61') ? '0' + phoneNumber.slice(2) : phoneNumber,
        phoneNumber.startsWith('0') ? '61' + phoneNumber.slice(1) : phoneNumber,
      ];
      
      let allReplies: SMSInbound[] = [];
      for (const variant of searchVariants) {
        try {
          const response = await fetch(
            `https://localhost:8000/api/sms/inbound/?from_number=${encodeURIComponent(variant)}&ordering=-received_at`
          );
          if (response.ok) {
            const data = await response.json();
            const replies = data.results || data || [];
            allReplies = [...allReplies, ...replies];
          }
        } catch (err) {
          console.error('Error fetching replies variant:', variant, err);
        }
      }
      
      const messageTime = new Date(currentMessage.sent_at || currentMessage.created_at);
      console.log('Message time:', messageTime);
      console.log(`All replies fetched: ${allReplies.length}`);
      
      const uniqueReplies = Array.from(
        new Map(allReplies.map(reply => [reply.id, reply])).values()
      ).filter((reply: SMSInbound) => {
        if (!reply.received_at) {
          console.log('Reply missing received_at:', reply);
          return false;
        }
        const replyTime = new Date(reply.received_at);
        const isAfter = replyTime >= messageTime;
        if (!isAfter) {
          console.log(`Reply "${reply.message}" at ${reply.received_at} - FILTERED OUT (before message)`);
        }
        return isAfter;
      }).sort((a, b) => {
        return new Date(b.received_at).getTime() - new Date(a.received_at).getTime();
      });
      
      console.log(`Filtered replies: ${uniqueReplies.length}`);
      if (uniqueReplies.length > 0) {
        console.log('New replies found:', uniqueReplies.map(r => `"${r.message}" at ${r.received_at}`));
      }
      setReplies(uniqueReplies);
    };

    // Fetch immediately
    fetchReplies();

    // Set up interval to refresh every 5 seconds
    const interval = setInterval(() => {
      console.log('Auto-refresh tick');
      fetchReplies();
    }, 5000);

    return () => {
      console.log('Cleaning up auto-refresh interval');
      clearInterval(interval);
    };
    // Dependencies: only track modal state and auto-refresh toggle
    // selectedMessage is stable - we use it inside the closure
  }, [replyModalOpen, autoRefreshEnabled]);

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>SMS Integration</Title>
        <Text c="dimmed" size="sm" mt="xs">
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
            <Title order={3} size="h4" mb="md">Send SMS Message</Title>
            
            <Stack gap="md">
              <Select
                label="Template (Optional)"
                placeholder="Choose a template"
                data={(templates || []).map(t => ({ value: t.id, label: t.name }))}
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
              <Title order={3} size="h4">Message History</Title>
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
                    <Table.Tr 
                      key={msg.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleMessageClick(msg)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Table.Td>{msg.phone_number}</Table.Td>
                      <Table.Td style={{ maxWidth: '300px' }}>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="sm" truncate="end" style={{ flex: 1 }}>
                            {msg.message}
                          </Text>
                          {replyCounts[msg.id] > 0 && (
                            <Badge size="sm" color="green" variant="filled">
                              {replyCounts[msg.id]}
                            </Badge>
                          )}
                        </Group>
                        {msg.error_message && (
                          <Text size="xs" c="red">{msg.error_message}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>{getStatusBadge(msg.status)}</Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {msg.sent_at
                            ? formatDateTimeAU(msg.sent_at)
                            : formatDateTimeAU(msg.created_at)}
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
            <Title order={3} size="h4" mb="md">SMS Templates</Title>
            
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
              <Title order={3} size="h4" mb="md">Setup Instructions</Title>
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
              <Title order={3} size="h4" mb="md">Available Features</Title>
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

      {/* Reply Modal */}
      <Modal
        opened={replyModalOpen}
        onClose={() => {
          setReplyModalOpen(false);
          setSelectedMessage(null);
          setReplies([]);
        }}
        title={
          <Group gap="xs">
            <IconMessage size={20} />
            <Text fw={600}>Message Details & Replies</Text>
          </Group>
        }
        size="lg"
      >
        {selectedMessage && (
          <Stack gap="md">
            {/* Original Message */}
            <Paper p="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Text fw={600} size="sm">Sent Message</Text>
                {getStatusBadge(selectedMessage.status)}
              </Group>
              <Stack gap="xs">
                <Group gap="md">
                  <Text size="sm" c="dimmed">To:</Text>
                  <Text size="sm">{selectedMessage.phone_number}</Text>
                </Group>
                <Group gap="md">
                  <Text size="sm" c="dimmed">Sent:</Text>
                  <Text size="sm">
                    {selectedMessage.sent_at
                      ? formatDateTimeAU(selectedMessage.sent_at)
                      : formatDateTimeAU(selectedMessage.created_at)}
                  </Text>
                </Group>
                {selectedMessage.patient_name && (
                  <Group gap="md">
                    <Text size="sm" c="dimmed">Patient:</Text>
                    <Text size="sm">{selectedMessage.patient_name}</Text>
                  </Group>
                )}
                <Divider my="xs" />
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedMessage.message}
                </Text>
                {selectedMessage.error_message && (
                  <Alert color="red" size="sm" mt="xs">
                    <Text size="xs">{selectedMessage.error_message}</Text>
                  </Alert>
                )}
              </Stack>
            </Paper>

            {/* Replies Section */}
            <Paper p="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Group gap="xs">
                  <Text fw={600} size="sm">Replies ({replies.length})</Text>
                  {autoRefreshEnabled && (
                    <Badge size="xs" color="green" variant="light">
                      Auto-refreshing
                    </Badge>
                  )}
                </Group>
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant={autoRefreshEnabled ? "filled" : "light"}
                    color={autoRefreshEnabled ? "green" : "blue"}
                    onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  >
                    {autoRefreshEnabled ? 'Auto: ON' : 'Auto: OFF'}
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={async () => {
                      if (selectedMessage) {
                        setLoadingReplies(true);
                        await handleMessageClick(selectedMessage);
                      }
                    }}
                    loading={loadingReplies}
                    leftSection={<IconRefresh size={14} />}
                  >
                    Refresh
                  </Button>
                </Group>
              </Group>

              {loadingReplies ? (
                <Group justify="center" py="xl">
                  <Loader size="sm" />
                </Group>
              ) : replies.length === 0 ? (
                <Alert icon={<IconInfoCircle size={16} />} color="blue" size="sm">
                  <Text size="sm">No replies received yet</Text>
                </Alert>
              ) : (
                <Stack gap="sm">
                  {replies.map((reply) => (
                    <Paper key={reply.id} p="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                      <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                          <IconArrowBack size={16} />
                          <Text size="sm" fw={500}>
                            {reply.patient_name || reply.from_number}
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {formatDateTimeAU(reply.received_at)}
                        </Text>
                      </Group>
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                        {reply.message}
                      </Text>
                      {reply.notes && (
                        <Text size="xs" c="dimmed" mt="xs" style={{ fontStyle: 'italic' }}>
                          {reply.notes}
                        </Text>
                      )}
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

