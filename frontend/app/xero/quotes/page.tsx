'use client';

import { useState, useEffect, useMemo } from 'react';
import { Container, Title, Text, Paper, Table, Badge, Button, Group, Stack, TextInput, Select, Loader, Center, ActionIcon, Tooltip, rem } from '@mantine/core';
import { IconSearch, IconRefresh, IconCheck, IconX, IconFileText, IconPlus, IconClock, IconCurrencyDollar, IconEye } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Navigation from '../../components/Navigation';
import { QuoteDetailModal } from '../../components/xero/QuoteDetailModal';
import { formatDateTimeAU, formatDateOnlyAU } from '../../utils/dateFormatting';

interface XeroQuoteLink {
  id: string;
  appointment: string | null;
  appointment_details: {
    start_time: string;
    patient_name: string;
  } | null;
  patient: string | null;
  patient_name: string | null;
  company: string | null;
  company_name: string | null;
  xero_quote_id: string;
  xero_quote_number: string;
  status: string;
  total: string;
  subtotal: string;
  total_tax: string;
  quote_date: string;
  expiry_date: string;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export default function XeroQuotesPage() {
  const [quotes, setQuotes] = useState<XeroQuoteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  
  // Detail modal
  const [detailModalOpened, setDetailModalOpened] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  // Helper function to normalize status (handle legacy "QuoteStatusCodes.DRAFT" format)
  const normalizeStatus = (status: string): string => {
    if (status.startsWith('QuoteStatusCodes.')) {
      return status.replace('QuoteStatusCodes.', '');
    }
    return status;
  };

  // Compute filtered quotes using useMemo for better performance
  const filteredQuotes = useMemo(() => {
    console.log('🔍 Filtering quotes...');
    console.log('📋 Total quotes:', quotes.length);
    console.log('🔎 Search query:', searchQuery);
    console.log('🏷️ Status filter:', statusFilter);
    
    let filtered = [...quotes];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(quote => 
        quote.xero_quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.appointment_details?.patient_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log('📋 After search filter:', filtered.length);
    }

    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(quote => normalizeStatus(quote.status) === statusFilter);
      console.log('📋 After status filter:', filtered.length);
    }

    console.log('✅ Final filtered quotes:', filtered.length);
    console.log('📊 Filtered quotes data:', filtered);
    return filtered;
  }, [quotes, searchQuery, statusFilter]);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    console.log('📥 Fetching quotes from API...');
    setLoading(true);
    try {
      const response = await fetch('https://localhost:8000/api/xero/quotes/');
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch quotes');
      }
      
      const data = await response.json();
      console.log('📦 Raw API data:', data);
      console.log('📋 Quotes array:', data.results || data);
      console.log('🔢 Number of quotes:', (data.results || data).length);
      
      const quotesData = data.results || data;
      setQuotes(quotesData);
      console.log('✅ Quotes set in state:', quotesData);
    } catch (error) {
      console.error('💥 Error fetching quotes:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch quotes',
        color: 'red',
      });
    } finally {
      setLoading(false);
      console.log('🏁 Fetch complete, loading:', false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      DRAFT: { color: 'gray', label: 'Draft' },
      SENT: { color: 'blue', label: 'Sent' },
      ACCEPTED: { color: 'green', label: 'Accepted' },
      DECLINED: { color: 'red', label: 'Declined' },
      INVOICED: { color: 'teal', label: 'Invoiced' },
      DELETED: { color: 'dark', label: 'Deleted' },
    };

    const config = statusConfig[status] || { color: 'gray', label: status };
    return <Badge color={config.color} variant="light">{config.label}</Badge>;
  };

  const calculateStats = () => {
    console.log('📊 Calculating stats...');
    console.log('📋 Filtered quotes for stats:', filteredQuotes.length);
    
    const total = filteredQuotes.reduce((sum, quote) => sum + parseFloat(quote.total || '0'), 0);
    const draftCount = filteredQuotes.filter(q => normalizeStatus(q.status) === 'DRAFT').length;
    const sentCount = filteredQuotes.filter(q => normalizeStatus(q.status) === 'SENT').length;
    const acceptedCount = filteredQuotes.filter(q => normalizeStatus(q.status) === 'ACCEPTED').length;

    const stats = { total, draftCount, sentCount, acceptedCount, totalCount: filteredQuotes.length };
    console.log('📈 Stats:', stats);
    return stats;
  };

  const stats = calculateStats();
  
  console.log('🎨 Render - Loading:', loading);
  console.log('🎨 Render - Quotes:', quotes.length);
  console.log('🎨 Render - Filtered Quotes:', filteredQuotes.length);

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
        <Stack gap="lg">
          <Group justify="space-between">
            <div>
              <Title order={2}>Xero Quotes</Title>
              <Text size="sm" c="dimmed">Manage quotes synced to Xero</Text>
            </div>
            <Group>
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={fetchQuotes}
              >
                Refresh
              </Button>
            </Group>
          </Group>

          {/* Stats */}
          <Group gap="md" grow>
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Quotes</Text>
                  <Text size="xl" fw={700}>{stats.totalCount}</Text>
                </div>
                <IconFileText size={32} style={{ color: 'var(--mantine-color-blue-6)' }} />
              </Group>
            </Paper>

            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Draft</Text>
                  <Text size="xl" fw={700}>{stats.draftCount}</Text>
                </div>
                <IconClock size={32} style={{ color: 'var(--mantine-color-gray-6)' }} />
              </Group>
            </Paper>

            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Sent</Text>
                  <Text size="xl" fw={700}>{stats.sentCount}</Text>
                </div>
                <IconClock size={32} style={{ color: 'var(--mantine-color-blue-6)' }} />
              </Group>
            </Paper>

            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Accepted</Text>
                  <Text size="xl" fw={700}>{stats.acceptedCount}</Text>
                </div>
                <IconCheck size={32} style={{ color: 'var(--mantine-color-green-6)' }} />
              </Group>
            </Paper>
          </Group>

          {/* Total Amount */}
          <Group gap="md" grow>
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Amount</Text>
                  <Text size="xl" fw={700} c="blue">${stats.total.toFixed(2)}</Text>
                </div>
                <IconCurrencyDollar size={32} style={{ color: 'var(--mantine-color-blue-6)' }} />
              </Group>
            </Paper>
          </Group>

          {/* Filters */}
          <Paper p="md" withBorder>
            <Group gap="md">
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
          <Paper p="md" withBorder>
            {filteredQuotes.length === 0 ? (
              <Center h={200}>
                <Stack align="center" gap="sm">
                  <IconFileText size={48} style={{ color: 'var(--mantine-color-gray-5)' }} />
                  <Text c="dimmed">No quotes found</Text>
                </Stack>
              </Center>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Quote Number</Table.Th>
                    <Table.Th>Contact</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Quote Date</Table.Th>
                    <Table.Th>Expiry Date</Table.Th>
                    <Table.Th>Total</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredQuotes.map((quote) => (
                    <Table.Tr key={quote.id}>
                      <Table.Td>
                        <Text fw={600}>{quote.xero_quote_number}</Text>
                      </Table.Td>
                      <Table.Td>
                        {quote.patient_name && (
                          <div>
                            <Text size="sm">{quote.patient_name}</Text>
                            {quote.company_name && (
                              <Text size="xs" c="dimmed">via {quote.company_name}</Text>
                            )}
                          </div>
                        )}
                        {!quote.patient_name && quote.company_name && (
                          <Text size="sm">{quote.company_name}</Text>
                        )}
                        {!quote.patient_name && !quote.company_name && quote.appointment_details?.patient_name && (
                          <Text size="sm">{quote.appointment_details.patient_name}</Text>
                        )}
                        {!quote.patient_name && !quote.company_name && !quote.appointment_details?.patient_name && (
                          <Text size="sm" c="dimmed">—</Text>
                        )}
                      </Table.Td>
                      <Table.Td>{getStatusBadge(normalizeStatus(quote.status))}</Table.Td>
                      <Table.Td>{quote.quote_date ? formatDateOnlyAU(quote.quote_date) : '—'}</Table.Td>
                      <Table.Td>{quote.expiry_date ? formatDateOnlyAU(quote.expiry_date) : '—'}</Table.Td>
                      <Table.Td>
                        <Text fw={600}>${parseFloat(quote.total).toFixed(2)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="View Details">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={() => {
                                setSelectedQuoteId(quote.id);
                                setDetailModalOpened(true);
                              }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Stack>
      </Container>

      {/* Quote Detail Modal */}
      {selectedQuoteId && (
        <QuoteDetailModal
          opened={detailModalOpened}
          onClose={() => {
            setDetailModalOpened(false);
            setSelectedQuoteId(null);
          }}
          quoteId={selectedQuoteId}
          onEdit={() => {
            // TODO: Implement edit functionality
            console.log('Edit quote:', selectedQuoteId);
          }}
          onDelete={() => {
            // TODO: Implement delete functionality
            console.log('Delete quote:', selectedQuoteId);
          }}
        />
      )}
    </Navigation>
  );
}
