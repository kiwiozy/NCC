'use client';

import { useState, useEffect } from 'react';
import { Container, Title, Text, Stack, Paper, List, Badge, Button, Group, Alert, Table, Code, Loader, Center, Box, Tabs } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconRefresh, IconPlugConnected, IconX, IconFileInvoice, IconUsers, IconClipboardList } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Navigation from '../components/Navigation';

interface XeroConnection {
  id: string;
  tenant_id: string;
  tenant_name: string;
  is_active: boolean;
  expires_at: string;
  connected_at: string;
  last_refresh_at: string | null;
  is_token_expired: boolean;
  scopes: string;
}

interface ConnectionStatus {
  connected: boolean;
  connection: XeroConnection | null;
}

interface SyncLog {
  id: string;
  operation_type: string;
  status: string;
  duration_ms: number;
  created_at: string;
  error_message?: string;
}

export default function XeroPage() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
    
    // Check URL for OAuth callback results
    const params = new URLSearchParams(window.location.search);
    const callbackStatus = params.get('status');
    
    if (callbackStatus === 'connected') {
      notifications.show({
        title: 'Successfully Connected!',
        message: `Connected to ${params.get('tenant') || 'Xero'}`,
        color: 'green',
        icon: <IconCheck />,
      });
      // Clean up URL
      window.history.replaceState({}, '', '/xero');
      fetchStatus();
    } else if (callbackStatus === 'error') {
      notifications.show({
        title: 'Connection Failed',
        message: params.get('message') || 'Failed to connect to Xero',
        color: 'red',
        icon: <IconX />,
      });
      window.history.replaceState({}, '', '/xero');
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('https://localhost:8000/xero/connections/status/');
      if (!response.ok) throw new Error('Failed to fetch status');
      
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching Xero status:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch Xero connection status',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch('https://localhost:8000/xero/logs/?page_size=20');
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      setLogs(data.results || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch sync logs',
        color: 'red',
      });
    } finally {
      setLogsLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = 'https://localhost:8000/xero/oauth/connect/';
  };

  const handleRefreshToken = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('https://localhost:8000/xero/oauth/refresh/', {
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

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Xero?')) return;
    
    try {
      const response = await fetch('https://localhost:8000/xero/oauth/disconnect/', {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to disconnect');
      
      notifications.show({
        title: 'Disconnected',
        message: 'Successfully disconnected from Xero',
        color: 'blue',
      });
      
      fetchStatus();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to disconnect from Xero',
        color: 'red',
      });
    }
  };

  if (loading) {
    return (
      <Navigation activeTab="xero">
        <Container size="lg" mt="xl">
          <Center h={400}>
            <Loader size="lg" />
          </Center>
        </Container>
      </Navigation>
    );
  }

  const isConnected = status?.connected && status?.connection;

  return (
    <Navigation activeTab="xero">
      <Container size="lg" mt="xl">
        <Stack gap="xl">
          <div>
            <Title order={1}>Xero Integration</Title>
            <Text c="dimmed" size="lg" mt="xs">
              Automated invoicing and accounting integration
            </Text>
          </div>

          {/* Connection Status */}
          {isConnected ? (
            <Alert 
              icon={<IconCheck size={20} />} 
              title="Connected to Xero" 
              color="green"
              variant="light"
            >
              Connected to <strong>{status.connection?.tenant_name}</strong>
              {status.connection?.is_token_expired && (
                <Text size="sm" c="orange" mt="xs">
                  ⚠️ Token expired - refresh required
                </Text>
              )}
            </Alert>
          ) : (
            <Alert 
              icon={<IconAlertCircle size={20} />} 
              title="Not Connected" 
              color="yellow"
              variant="light"
            >
              Connect to Xero to enable invoicing and contact synchronization
            </Alert>
          )}

          {/* Connection Details */}
          {isConnected && (
            <Paper shadow="sm" p="xl" withBorder>
              <Group justify="space-between" mb="md">
                <Title order={2} size="h3">Connection Details</Title>
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
                  <Text fw={500} size="sm" w={150}>Organisation:</Text>
                  <Text size="sm">{status.connection?.tenant_name}</Text>
                </Group>
                <Group>
                  <Text fw={500} size="sm" w={150}>Tenant ID:</Text>
                  <Code size="sm">{status.connection?.tenant_id}</Code>
                </Group>
                <Group>
                  <Text fw={500} size="sm" w={150}>Connected:</Text>
                  <Text size="sm">{new Date(status.connection?.connected_at || '').toLocaleString()}</Text>
                </Group>
                <Group>
                  <Text fw={500} size="sm" w={150}>Token Expires:</Text>
                  <Text size="sm">
                    {new Date(status.connection?.expires_at || '').toLocaleString()}
                    {status.connection?.is_token_expired && (
                      <Badge color="red" size="sm" ml="xs">Expired</Badge>
                    )}
                  </Text>
                </Group>
                <Group>
                  <Text fw={500} size="sm" w={150}>Last Refresh:</Text>
                  <Text size="sm">
                    {status.connection?.last_refresh_at 
                      ? new Date(status.connection.last_refresh_at).toLocaleString()
                      : 'Never'}
                  </Text>
                </Group>
              </Stack>
            </Paper>
          )}

          {/* Setup Instructions (if not connected) */}
          {!isConnected && (
            <Paper shadow="sm" p="xl" withBorder>
              <Title order={2} size="h3" mb="md">Setup Instructions</Title>
              <List spacing="md" size="sm" mb="xl">
                <List.Item>
                  Go to <a href="https://developer.xero.com/myapps" target="_blank" rel="noopener noreferrer">Xero Developer Portal</a>
                </List.Item>
                <List.Item>Create a new "Web App" or "Connected App"</List.Item>
                <List.Item>
                  Set redirect URI to: <Code>http://localhost:8000/xero/oauth/callback</Code>
                </List.Item>
                <List.Item>Copy your Client ID and Client Secret</List.Item>
                <List.Item>Add them to your <Code>backend/.env</Code> file:
                  <Box mt="sm">
                    <Code block>
                      XERO_CLIENT_ID=your_client_id{'\n'}
                      XERO_CLIENT_SECRET=your_client_secret{'\n'}
                      XERO_REDIRECT_URI=http://localhost:8000/xero/oauth/callback
                    </Code>
                  </Box>
                </List.Item>
                <List.Item>Restart your Django server</List.Item>
                <List.Item>Click "Connect to Xero" below</List.Item>
              </List>

              <Button 
                variant="filled" 
                leftSection={<IconPlugConnected size={18} />}
                onClick={handleConnect}
              >
                Connect to Xero
              </Button>
            </Paper>
          )}

          {/* Features Tabs */}
          <Tabs defaultValue="features">
            <Tabs.List>
              <Tabs.Tab value="features" leftSection={<IconClipboardList size={16} />}>
                Features
              </Tabs.Tab>
              <Tabs.Tab value="logs" leftSection={<IconFileInvoice size={16} />}>
                Sync Logs
              </Tabs.Tab>
              <Tabs.Tab value="docs" leftSection={<IconUsers size={16} />}>
                Documentation
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="features" pt="md">
              <Paper shadow="sm" p="xl" withBorder>
                <Stack gap="lg">
                  <div>
                    <Group gap="xs" mb="xs">
                      <Badge color="blue" variant="light">Sync Contacts</Badge>
                      {isConnected && <Badge color="green" size="sm">Available</Badge>}
                    </Group>
                    <Text size="sm" c="dimmed">
                      Automatically sync patient details as Xero contacts. Contact information is synced when creating invoices.
                    </Text>
                  </div>

                  <div>
                    <Group gap="xs" mb="xs">
                      <Badge color="blue" variant="light">Create Invoices</Badge>
                      {isConnected && <Badge color="green" size="sm">Available</Badge>}
                    </Group>
                    <Text size="sm" c="dimmed">
                      Generate draft invoices in Xero from appointments with customizable line items, tax rates, and account codes.
                    </Text>
                  </div>

                  <div>
                    <Group gap="xs" mb="xs">
                      <Badge color="blue" variant="light">Track Payments</Badge>
                      {isConnected && <Badge color="green" size="sm">Available</Badge>}
                    </Group>
                    <Text size="sm" c="dimmed">
                      Monitor payment status and reconciliation. Invoice status automatically syncs from Xero to show payment progress.
                    </Text>
                  </div>

                  <div>
                    <Group gap="xs" mb="xs">
                      <Badge color="blue" variant="light">Multi-Clinic Tracking</Badge>
                      {isConnected && <Badge color="green" size="sm">Available</Badge>}
                    </Group>
                    <Text size="sm" c="dimmed">
                      Use Xero Tracking Categories to segment revenue by clinic location for detailed financial reporting.
                    </Text>
                  </div>
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="logs" pt="md">
              <Paper shadow="sm" p="xl" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={3} size="h4">Recent Sync Operations</Title>
                  <Button 
                    size="sm" 
                    variant="light"
                    leftSection={<IconRefresh size={16} />}
                    onClick={fetchLogs}
                    loading={logsLoading}
                  >
                    Refresh
                  </Button>
                </Group>

                {logs.length === 0 && !logsLoading ? (
                  <Text c="dimmed" ta="center" py="xl">
                    No sync operations yet. Logs will appear here after syncing contacts or creating invoices.
                  </Text>
                ) : logsLoading ? (
                  <Center py="xl">
                    <Loader size="sm" />
                  </Center>
                ) : (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Operation</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Duration</Table.Th>
                        <Table.Th>Time</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {logs.map((log) => (
                        <Table.Tr key={log.id}>
                          <Table.Td>
                            <Text size="sm">{log.operation_type.replace('_', ' ')}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge 
                              color={log.status === 'success' ? 'green' : 'red'}
                              variant="light"
                              size="sm"
                            >
                              {log.status}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">{log.duration_ms}ms</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {new Date(log.created_at).toLocaleString()}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="docs" pt="md">
              <Paper shadow="sm" p="xl" withBorder>
                <Title order={3} size="h4" mb="md">API Endpoints</Title>
                <Stack gap="md">
                  <div>
                    <Code>POST /xero/contacts/sync_patient/</Code>
                    <Text size="sm" c="dimmed" mt="xs">Sync a patient to Xero as a contact</Text>
                  </div>
                  <div>
                    <Code>POST /xero/invoices/create_invoice/</Code>
                    <Text size="sm" c="dimmed" mt="xs">Create a draft invoice for an appointment</Text>
                  </div>
                  <div>
                    <Code>POST /xero/invoices/{'{id}'}/sync_status/</Code>
                    <Text size="sm" c="dimmed" mt="xs">Sync invoice payment status from Xero</Text>
                  </div>
                  <div>
                    <Code>GET /xero/connections/status/</Code>
                    <Text size="sm" c="dimmed" mt="xs">Check Xero connection status</Text>
                  </div>
                </Stack>

                <Title order={3} size="h4" mt="xl" mb="md">Documentation</Title>
                <Text size="sm" mb="sm">
                  For detailed technical specifications and implementation guide:
                </Text>
                <Code>ChatGPT_Docs/Xero_Integration.md</Code>
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Container>
    </Navigation>
  );
}

