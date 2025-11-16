'use client';

import { useState, useEffect } from 'react';
import { 
  Container, 
  Title, 
  Paper, 
  Table, 
  Badge, 
  Group, 
  Text, 
  Button,
  TextInput,
  Select,
  Stack,
  ActionIcon,
  Loader,
  Center,
  Tooltip,
  Modal
} from '@mantine/core';
import { 
  IconSearch, 
  IconRefresh, 
  IconExternalLink,
  IconEye,
  IconFileInvoice,
  IconArrowRight
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import { formatDateAU, formatCurrency } from '../../utils/formatting';

interface XeroQuote {
  id: string;
  xero_quote_id: string;
  xero_quote_number: string;
  status: string;
  total: string;
  subtotal: string;
  total_tax: string;
  quote_date: string;
  expiry_date: string;
  converted_invoice?: {
    id: string;
    xero_invoice_number: string;
  };
  converted_at?: string;
  last_synced_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  'DRAFT': 'gray',
  'SENT': 'blue',
  'ACCEPTED': 'green',
  'DECLINED': 'red',
  'INVOICED': 'cyan',
  'DELETED': 'dark',
};

export default function XeroQuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<XeroQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<XeroQuote | null>(null);
  const [detailsOpened, setDetailsOpened] = useState(false);
  const [converting, setConverting] = useState(false);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      let url = 'https://localhost:8000/api/xero-quote-links/';
      const params = new URLSearchParams();
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.results || data);
      }
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, [statusFilter]);

  const handleSearch = () => {
    loadQuotes();
  };

  const filteredQuotes = quotes.filter(quote => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      quote.xero_quote_number?.toLowerCase().includes(query)
    );
  });

  const openInXero = (quote: XeroQuote) => {
    // Open Xero quote in new tab
    const xeroUrl = `https://go.xero.com/Quotes/View.aspx?QuoteID=${quote.xero_quote_id}`;
    window.open(xeroUrl, '_blank');
  };

  const viewDetails = (quote: XeroQuote) => {
    setSelectedQuote(quote);
    setDetailsOpened(true);
  };

  const convertToInvoice = async (quote: XeroQuote) => {
    if (!confirm(`Convert quote ${quote.xero_quote_number} to invoice?`)) {
      return;
    }

    setConverting(true);
    try {
      const response = await fetch(`https://localhost:8000/api/xero-quote-links/${quote.id}/convert-to-invoice/`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Quote converted to invoice successfully!');
        loadQuotes(); // Reload list
        setDetailsOpened(false);
      } else {
        const error = await response.json();
        alert(`Failed to convert quote: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error converting quote:', error);
      alert('Failed to convert quote. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  const canConvert = (quote: XeroQuote) => {
    return ['SENT', 'ACCEPTED'].includes(quote.status) && !quote.converted_invoice;
  };

  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Group justify="space-between" mb="xl">
          <Title order={2}>Xero Quotes</Title>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={loadQuotes}
            variant="light"
          >
            Refresh
          </Button>
        </Group>

        {/* Filters */}
        <Paper p="md" mb="xl" withBorder>
          <Group>
            <TextInput
              placeholder="Search quotes..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              data={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'SENT', label: 'Sent' },
                { value: 'ACCEPTED', label: 'Accepted' },
                { value: 'DECLINED', label: 'Declined' },
                { value: 'INVOICED', label: 'Invoiced' },
              ]}
              clearable
              style={{ width: 200 }}
            />
            <Button onClick={handleSearch}>Search</Button>
          </Group>
        </Paper>

        {/* Quotes Table */}
        <Paper withBorder>
          {loading ? (
            <Center p="xl">
              <Loader />
            </Center>
          ) : filteredQuotes.length === 0 ? (
            <Center p="xl">
              <Stack align="center" gap="sm">
                <IconFileInvoice size={48} opacity={0.3} />
                <Text c="dimmed">No quotes found</Text>
              </Stack>
            </Center>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Quote #</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Quote Date</Table.Th>
                  <Table.Th>Expiry Date</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th>Converted</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredQuotes.map((quote) => (
                  <Table.Tr key={quote.id}>
                    <Table.Td>
                      <Text fw={600}>{quote.xero_quote_number || 'Draft'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLORS[quote.status] || 'gray'}>
                        {quote.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{quote.quote_date ? formatDateAU(quote.quote_date) : '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{quote.expiry_date ? formatDateAU(quote.expiry_date) : '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>{formatCurrency(parseFloat(quote.total))}</Text>
                    </Table.Td>
                    <Table.Td>
                      {quote.converted_invoice ? (
                        <Tooltip label={`Invoice #${quote.converted_invoice.xero_invoice_number}`}>
                          <Badge color="cyan" variant="light">
                            Invoiced
                          </Badge>
                        </Tooltip>
                      ) : (
                        <Text size="sm" c="dimmed">-</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="View details">
                          <ActionIcon 
                            variant="subtle" 
                            color="blue"
                            onClick={() => viewDetails(quote)}
                          >
                            <IconEye size={18} />
                          </ActionIcon>
                        </Tooltip>
                        {canConvert(quote) && (
                          <Tooltip label="Convert to Invoice">
                            <ActionIcon 
                              variant="subtle" 
                              color="green"
                              onClick={() => convertToInvoice(quote)}
                            >
                              <IconArrowRight size={18} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="Open in Xero">
                          <ActionIcon 
                            variant="subtle" 
                            color="cyan"
                            onClick={() => openInXero(quote)}
                          >
                            <IconExternalLink size={18} />
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

        {/* Quote Details Modal */}
        <Modal
          opened={detailsOpened}
          onClose={() => setDetailsOpened(false)}
          title="Quote Details"
          size="lg"
        >
          {selectedQuote && (
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600}>Quote #{selectedQuote.xero_quote_number || 'Draft'}</Text>
                <Badge color={STATUS_COLORS[selectedQuote.status] || 'gray'} size="lg">
                  {selectedQuote.status}
                </Badge>
              </Group>

              <Paper p="md" withBorder>
                <Text size="sm" fw={600} mb="xs">Financial Details</Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">Subtotal:</Text>
                    <Text size="sm">{formatCurrency(parseFloat(selectedQuote.subtotal))}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Tax (GST):</Text>
                    <Text size="sm">{formatCurrency(parseFloat(selectedQuote.total_tax))}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text fw={600}>Total:</Text>
                    <Text fw={600}>{formatCurrency(parseFloat(selectedQuote.total))}</Text>
                  </Group>
                </Stack>
              </Paper>

              <Paper p="md" withBorder>
                <Text size="sm" fw={600} mb="xs">Dates</Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">Quote Date:</Text>
                    <Text size="sm">{selectedQuote.quote_date ? formatDateAU(selectedQuote.quote_date) : '-'}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Expiry Date:</Text>
                    <Text size="sm">{selectedQuote.expiry_date ? formatDateAU(selectedQuote.expiry_date) : '-'}</Text>
                  </Group>
                  {selectedQuote.converted_at && (
                    <Group justify="space-between">
                      <Text size="sm">Converted:</Text>
                      <Text size="sm">{formatDateAU(selectedQuote.converted_at)}</Text>
                    </Group>
                  )}
                  <Group justify="space-between">
                    <Text size="sm">Last Synced:</Text>
                    <Text size="sm">{selectedQuote.last_synced_at ? formatDateAU(selectedQuote.last_synced_at) : '-'}</Text>
                  </Group>
                </Stack>
              </Paper>

              {selectedQuote.converted_invoice && (
                <Paper p="md" withBorder bg="cyan.0">
                  <Text size="sm" fw={600} mb="xs">Converted to Invoice</Text>
                  <Text size="sm">Invoice #{selectedQuote.converted_invoice.xero_invoice_number}</Text>
                </Paper>
              )}

              <Group>
                {canConvert(selectedQuote) && (
                  <Button
                    flex={1}
                    color="green"
                    leftSection={<IconArrowRight size={16} />}
                    onClick={() => convertToInvoice(selectedQuote)}
                    loading={converting}
                  >
                    Convert to Invoice
                  </Button>
                )}
                <Button
                  flex={1}
                  variant="light"
                  leftSection={<IconExternalLink size={16} />}
                  onClick={() => openInXero(selectedQuote)}
                >
                  Open in Xero
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>
      </Container>
    </Navigation>
  );
}

