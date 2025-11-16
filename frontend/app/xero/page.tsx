'use client';

import { useState, useEffect } from 'react';
import { Container, Grid, Paper, Title, Text, Stack, Group, Badge, Button, SimpleGrid, Card, rem, Loader, Center, Alert } from '@mantine/core';
import { IconBrandXing, IconPlugConnected, IconUsers, IconFileInvoice, IconRefresh, IconArrowRight, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import { formatDateTimeAU } from '../utils/dateFormatting';

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

interface XeroStats {
  synced_contacts: number;
  total_invoices: number;
  draft_invoices: number;
  submitted_invoices: number;
  paid_invoices: number;
  last_sync_at: string | null;
}

export default function XeroDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [stats, setStats] = useState<XeroStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    fetchStats();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('https://localhost:8000/xero/connections/status/');
      if (!response.ok) throw new Error('Failed to fetch status');
      
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching Xero status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('https://localhost:8000/xero/stats/');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleConnect = () => {
    window.location.href = 'https://localhost:8000/xero/oauth/authorize/';
  };

  const getConnectionBadge = () => {
    if (!status?.connected || !status.connection) {
      return <Badge size="lg" color="gray">Disconnected</Badge>;
    }
    
    if (status.connection.is_token_expired) {
      return <Badge size="lg" color="red">Token Expired</Badge>;
    }
    
    return <Badge size="lg" color="green" leftSection={<IconCheck size={14} />}>Connected</Badge>;
  };

  if (loading) {
    return (
      <Navigation>
        <Container size="xl" py="xl">
          <Center style={{ minHeight: '50vh' }}>
            <Loader size="lg" />
          </Center>
        </Container>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <Container size="xl" py="xl">
        {/* Header */}
        <Group justify="space-between" mb="xl">
          <Group>
            <IconBrandXing size={32} />
            <Title order={2}>Xero Accounting</Title>
          </Group>
          {getConnectionBadge()}
        </Group>

        {/* Connection Alert */}
        {!status?.connected && (
          <Alert icon={<IconAlertCircle />} color="blue" mb="xl" title="Connect to Xero">
            <Stack gap="sm">
              <Text size="sm">
                Connect your Xero account to sync contacts, create invoices, and manage accounting data.
              </Text>
              <Button
                leftSection={<IconPlugConnected size={16} />}
                onClick={handleConnect}
                size="sm"
                style={{ alignSelf: 'flex-start' }}
              >
                Connect to Xero
              </Button>
            </Stack>
          </Alert>
        )}

        {/* Connection Details */}
        {status?.connected && status.connection && (
          <Paper p="lg" mb="xl" withBorder>
            <Group justify="space-between">
              <Stack gap="xs">
                <Text size="sm" c="dimmed" tt="uppercase" fw={700}>Connected Organization</Text>
                <Text size="lg" fw={600}>{status.connection.tenant_name}</Text>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    Connected: {formatDateTimeAU(status.connection.connected_at)}
                  </Text>
                  {status.connection.last_refresh_at && (
                    <Text size="xs" c="dimmed">
                      • Last Refresh: {formatDateTimeAU(status.connection.last_refresh_at)}
                    </Text>
                  )}
                </Group>
              </Stack>
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={() => router.push('/testing?tab=xero')}
              >
                Manage Connection
              </Button>
            </Group>
          </Paper>
        )}

        {/* Stats Cards */}
        {status?.connected && stats && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="xl">
            <Card withBorder padding="lg">
              <Stack gap="xs" align="center">
                <IconUsers size={32} stroke={1.5} />
                <Text size="xl" fw={700}>{stats.synced_contacts}</Text>
                <Text size="sm" c="dimmed">Synced Contacts</Text>
              </Stack>
            </Card>

            <Card withBorder padding="lg">
              <Stack gap="xs" align="center">
                <IconFileInvoice size={32} stroke={1.5} />
                <Text size="xl" fw={700}>{stats.total_invoices}</Text>
                <Text size="sm" c="dimmed">Total Invoices</Text>
              </Stack>
            </Card>

            <Card withBorder padding="lg">
              <Stack gap="xs" align="center">
                <IconFileInvoice size={32} stroke={1.5} color="orange" />
                <Text size="xl" fw={700}>{stats.draft_invoices}</Text>
                <Text size="sm" c="dimmed">Draft Invoices</Text>
              </Stack>
            </Card>

            <Card withBorder padding="lg">
              <Stack gap="xs" align="center">
                <IconFileInvoice size={32} stroke={1.5} color="green" />
                <Text size="xl" fw={700}>{stats.paid_invoices}</Text>
                <Text size="sm" c="dimmed">Paid Invoices</Text>
              </Stack>
            </Card>
          </SimpleGrid>
        )}

        {/* Quick Actions */}
        {status?.connected && (
          <Grid mb="xl">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper
                p="xl"
                withBorder
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => router.push('/xero/contacts')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Group justify="space-between">
                  <Stack gap="xs">
                    <Group>
                      <IconUsers size={24} />
                      <Title order={3}>Contact Management</Title>
                    </Group>
                    <Text size="sm" c="dimmed">
                      Sync patients to Xero contacts, manage contact details, and view sync status.
                    </Text>
                  </Stack>
                  <IconArrowRight size={24} />
                </Group>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper
                p="xl"
                withBorder
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => router.push('/xero/invoices')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Group justify="space-between">
                  <Stack gap="xs">
                    <Group>
                      <IconFileInvoice size={24} />
                      <Title order={3}>Invoice Management</Title>
                    </Group>
                    <Text size="sm" c="dimmed">
                      Create invoices, track payment status, and manage billing for appointments.
                    </Text>
                  </Stack>
                  <IconArrowRight size={24} />
                </Group>
              </Paper>
            </Grid.Col>
          </Grid>
        )}

        {/* Help Section */}
        <Paper p="lg" withBorder>
          <Stack gap="sm">
            <Title order={4}>Need Help?</Title>
            <Text size="sm" c="dimmed">
              View the <Text component="span" fw={600} c="blue" style={{ cursor: 'pointer' }} onClick={() => router.push('/testing?tab=xero')}>
                connection settings
              </Text> to manage your Xero integration, view sync logs, or troubleshoot connection issues.
            </Text>
          </Stack>
        </Paper>
      </Container>
    </Navigation>
  );
}
