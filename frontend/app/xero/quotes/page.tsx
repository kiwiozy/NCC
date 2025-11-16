'use client';

import { useState, useEffect } from 'react';
import { Container, Title, Text, Paper, Table, Badge, Button, Group, Stack, TextInput, Select, Loader, Center, ActionIcon, Tooltip, rem } from '@mantine/core';
import { IconSearch, IconRefresh, IconCheck, IconX, IconExternalLink, IconFileDescription, IconPlus, IconClock, IconArrowRight } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Navigation from '../../components/Navigation';
import { formatDateTimeAU, formatDateOnlyAU } from '../../utils/dateFormatting';

interface XeroQuoteLink {
  id: string;
  appointment: string | null;
  appointment_details: {
    id: string;
    patient_name: string;
    start_time: string;
  } | null;
  xero_quote_id: string;
  xero_quote_number: string;
  status: string;
  total: string;
  subtotal: string;
  total_tax: string;
  currency: string;
  quote_date: string | null;
  expiry_date: string | null;
  converted_invoice: string | null;
  converted_invoice_details: {
    id: string;
    xero_invoice_number: string;
    status: string;
    total: string;
  } | null;
  converted_at: string | null;
  can_convert: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  'DRAFT': 'gray',
  'SENT': 'blue',
  'ACCEPTED': 'green',
  'DECLINED': 'red',
  'INVOICED': 'cyan',
  'DELETED': 'red',
};

export default function XeroQuotesPage() {
  const [quotes, setQuotes] = useState<XeroQuoteLink[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<XeroQuoteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    invoiced: 0,
    totalAmount: 0,
  });

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://localhost:8000/api/xero-quote-links/');
      if (!response.ok) throw new Error('Failed to fetch quotes');
      
      const data = await response.json();
      const quotesList = data.results || data;
      setQuotes(quotesList);
      setFilteredQuotes(quotesList);

      // Calculate stats
      const newStats = {
        total: quotesList.length,
        draft: quotesList.filter((q: XeroQuoteLink) => q.status === 'DRAFT').length,
        sent: quotesList.filter((q: XeroQuoteLink) => q.status === 'SENT').length,
        accepted: quotesList.filter((q: XeroQuoteLink) => q.status === 'ACCEPTED').length,
        invoiced: quotesList.filter((q: XeroQuoteLink) => q.status === 'INVOICED').length,
        totalAmount: quotesList.reduce((sum: number, q: XeroQuoteLink) => sum + parseFloat(q.total || '0'), 0),
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching Xero quotes:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load Xero quotes',
        color: 'red',
        icon: <IconX />,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  // Filter quotes based on search and status
  useEffect(() => {
    let filtered = quotes;

    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q =>
        q.xero_quote_number.toLowerCase().includes(query) ||
        q.appointment_details?.patient_name.toLowerCase().includes(query)
      );
    }

    setFilteredQuotes(filtered);
  }, [quotes, searchQuery, statusFilter]);

  const getXeroQuoteUrl = (quoteId: string) => {
    return `https://go.xero.com/Quote/View.aspx?quoteID=${quoteId}`;
  };

  const formatCurrency = (amount: string | number) => {
    return `$${parseFloat(amount.toString()).toFixed(2)}`;
  };

  const handleConvertToInvoice = async (quoteId: string) => {
    if (!confirm('Convert this quote to an invoice?')) return;

    try {
      const response = await fetch(`https://localhost:8000/api/xero-quote-links/${quoteId}/convert_to_invoice/`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to convert quote');

      notifications.show({
        title: 'Success',
        message: 'Quote converted to invoice successfully',
        color: 'green',
        icon: <IconCheck />,
      });

      // Refresh quotes list
      fetchQuotes();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to convert quote to invoice',
        color: 'red',
        icon: <IconX />,
      });
    }
  };

  if (loading) {
    return (
      <Navigation>
        <Container size="xl" py="xl">
          <Center h={400}>
            <Loader size="lg" />
          </Center>
        </Container>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2}>Xero Quotes</Title>
              <Text c="dimmed" size="sm" mt="xs">
                Manage quotes (estimates) synced to Xero
              </Text>
            </div>
            <Group>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={fetchQuotes}
                variant="light"
              >
                Refresh
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  notifications.show({
                    title: 'Coming Soon',
                    message: 'Quote creation will be available soon',
                    color: 'blue',
                  });
                }}
              >
                Create Quote
              </Button>
            </Group>
          </Group>

          {/* Stats */}
          <Group gap="md" grow>
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Quotes</Text>
                  <Text size="xl" fw={700}>{stats.total}</Text>
                </div>
                <IconFileDescription size={32} style={{ opacity: 0.3 }} />
              </Group>
            </Paper>
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Draft</Text>
                  <Text size="xl" fw={700}>{stats.draft}</Text>
                </div>
                <IconClock size={32} style={{ opacity: 0.3 }} />
              </Group>
            </Paper>
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Sent</Text>
                  <Text size="xl" fw={700}>{stats.sent}</Text>
                </div>
                <IconClock size={32} style={{ opacity: 0.3 }} />
              </Group>
            </Paper>
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Accepted</Text>
                  <Text size="xl" fw={700}>{stats.accepted}</Text>
                </div>
                <IconCheck size={32} style={{ opacity: 0.3, color: 'green' }} />
              </Group>
            </Paper>
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Invoiced</Text>
                  <Text size="xl" fw={700}>{stats.invoiced}</Text>
                </div>
                <IconArrowRight size={32} style={{ opacity: 0.3 }} />
              </Group>
            </Paper>
          </Group>

          {/* Filters */}
          <Paper p="md" withBorder>
            <Group>
              <TextInput
                placeholder="Search quotes..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <Select
                placeholder="Filter by status"
                data={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'SENT', label: 'Sent' },
                  { value: 'ACCEPTED', label: 'Accepted' },
                  { value: 'DECLINED', label: 'Declined' },
                  { value: 'INVOICED', label: 'Invoiced' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 200 }}
              />
            </Group>
          </Paper>

          {/* Quotes Table */}
          <Paper shadow="sm" p="0" withBorder>
            {filteredQuotes.length === 0 ? (
              <Center p="xl">
                <Stack align="center" gap="xs">
                  <IconFileDescription size={48} style={{ opacity: 0.3 }} />
                  <Text c="dimmed">
                    {searchQuery || statusFilter !== 'all' ? 'No quotes match your filters' : 'No quotes created yet'}
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Table.ScrollContainer minWidth={1000}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Quote Number</Table.Th>
                      <Table.Th>Patient</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Quote Date</Table.Th>
                      <Table.Th>Expiry Date</Table.Th>
                      <Table.Th>Total</Table.Th>
                      <Table.Th>Converted Invoice</Table.Th>
                      <Table.Th style={{ width: '120px' }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredQuotes.map((quote) => (
                      <Table.Tr key={quote.id}>
                        <Table.Td>
                          <Text fw={600}>{quote.xero_quote_number}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{quote.appointment_details?.patient_name || '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={STATUS_COLORS[quote.status] || 'gray'} variant="light">
                            {quote.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {quote.quote_date ? formatDateOnlyAU(quote.quote_date) : '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {quote.expiry_date ? formatDateOnlyAU(quote.expiry_date) : '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>{formatCurrency(quote.total)}</Text>
                        </Table.Td>
                        <Table.Td>
                          {quote.converted_invoice_details ? (
                            <Badge color="cyan" variant="light">
                              {quote.converted_invoice_details.xero_invoice_number}
                            </Badge>
                          ) : (
                            <Text size="sm" c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Tooltip label="View in Xero">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                component="a"
                                href={getXeroQuoteUrl(quote.xero_quote_id)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <IconExternalLink size={16} />
                              </ActionIcon>
                            </Tooltip>
                            {quote.can_convert && (
                              <Tooltip label="Convert to Invoice">
                                <ActionIcon
                                  variant="subtle"
                                  color="green"
                                  onClick={() => handleConvertToInvoice(quote.id)}
                                >
                                  <IconArrowRight size={16} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Paper>
        </Stack>
      </Container>
    </Navigation>
  );
}
