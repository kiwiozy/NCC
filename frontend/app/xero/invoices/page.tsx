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
  IconFileInvoice
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import { formatDateAU, formatCurrency } from '../../utils/formatting';

interface XeroInvoice {
  id: string;
  xero_invoice_id: string;
  xero_invoice_number: string;
  status: string;
  total: string;
  subtotal: string;
  total_tax: string;
  amount_due: string;
  amount_paid: string;
  invoice_date: string;
  due_date: string;
  appointment?: {
    id: string;
    patient: {
      full_name: string;
      mrn: string;
    };
  };
  last_synced_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  'DRAFT': 'gray',
  'SUBMITTED': 'blue',
  'AUTHORISED': 'cyan',
  'PAID': 'green',
  'VOIDED': 'red',
  'DELETED': 'dark',
};

export default function XeroInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<XeroInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<XeroInvoice | null>(null);
  const [detailsOpened, setDetailsOpened] = useState(false);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      let url = 'https://localhost:8000/api/xero-invoice-links/';
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
        setInvoices(data.results || data);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  const handleSearch = () => {
    loadInvoices();
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.xero_invoice_number?.toLowerCase().includes(query) ||
      invoice.appointment?.patient?.full_name?.toLowerCase().includes(query) ||
      invoice.appointment?.patient?.mrn?.toLowerCase().includes(query)
    );
  });

  const openInXero = (invoice: XeroInvoice) => {
    // Open Xero invoice in new tab
    const xeroUrl = `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${invoice.xero_invoice_id}`;
    window.open(xeroUrl, '_blank');
  };

  const viewDetails = (invoice: XeroInvoice) => {
    setSelectedInvoice(invoice);
    setDetailsOpened(true);
  };

  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Group justify="space-between" mb="xl">
          <Title order={2}>Xero Invoices</Title>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={loadInvoices}
            variant="light"
          >
            Refresh
          </Button>
        </Group>

        {/* Filters */}
        <Paper p="md" mb="xl" withBorder>
          <Group>
            <TextInput
              placeholder="Search invoices, patients, MRN..."
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
                { value: 'SUBMITTED', label: 'Submitted' },
                { value: 'AUTHORISED', label: 'Authorised' },
                { value: 'PAID', label: 'Paid' },
                { value: 'VOIDED', label: 'Voided' },
              ]}
              clearable
              style={{ width: 200 }}
            />
            <Button onClick={handleSearch}>Search</Button>
          </Group>
        </Paper>

        {/* Invoices Table */}
        <Paper withBorder>
          {loading ? (
            <Center p="xl">
              <Loader />
            </Center>
          ) : filteredInvoices.length === 0 ? (
            <Center p="xl">
              <Stack align="center" gap="sm">
                <IconFileInvoice size={48} opacity={0.3} />
                <Text c="dimmed">No invoices found</Text>
              </Stack>
            </Center>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Invoice #</Table.Th>
                  <Table.Th>Patient</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Due Date</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th>Paid</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredInvoices.map((invoice) => (
                  <Table.Tr key={invoice.id}>
                    <Table.Td>
                      <Text fw={600}>{invoice.xero_invoice_number || 'Draft'}</Text>
                    </Table.Td>
                    <Table.Td>
                      {invoice.appointment ? (
                        <Stack gap={0}>
                          <Text size="sm">{invoice.appointment.patient.full_name}</Text>
                          <Text size="xs" c="dimmed">MRN: {invoice.appointment.patient.mrn}</Text>
                        </Stack>
                      ) : (
                        <Text size="sm" c="dimmed">No appointment</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLORS[invoice.status] || 'gray'}>
                        {invoice.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{invoice.invoice_date ? formatDateAU(invoice.invoice_date) : '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{invoice.due_date ? formatDateAU(invoice.due_date) : '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>{formatCurrency(parseFloat(invoice.total))}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={parseFloat(invoice.amount_paid) > 0 ? 'green' : 'dimmed'}>
                        {formatCurrency(parseFloat(invoice.amount_paid))}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="View details">
                          <ActionIcon 
                            variant="subtle" 
                            color="blue"
                            onClick={() => viewDetails(invoice)}
                          >
                            <IconEye size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Open in Xero">
                          <ActionIcon 
                            variant="subtle" 
                            color="cyan"
                            onClick={() => openInXero(invoice)}
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

        {/* Invoice Details Modal */}
        <Modal
          opened={detailsOpened}
          onClose={() => setDetailsOpened(false)}
          title="Invoice Details"
          size="lg"
        >
          {selectedInvoice && (
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600}>Invoice #{selectedInvoice.xero_invoice_number || 'Draft'}</Text>
                <Badge color={STATUS_COLORS[selectedInvoice.status] || 'gray'} size="lg">
                  {selectedInvoice.status}
                </Badge>
              </Group>

              {selectedInvoice.appointment && (
                <Paper p="md" withBorder>
                  <Text size="sm" fw={600} mb="xs">Patient</Text>
                  <Text>{selectedInvoice.appointment.patient.full_name}</Text>
                  <Text size="sm" c="dimmed">MRN: {selectedInvoice.appointment.patient.mrn}</Text>
                </Paper>
              )}

              <Paper p="md" withBorder>
                <Text size="sm" fw={600} mb="xs">Financial Details</Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">Subtotal:</Text>
                    <Text size="sm">{formatCurrency(parseFloat(selectedInvoice.subtotal))}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Tax (GST):</Text>
                    <Text size="sm">{formatCurrency(parseFloat(selectedInvoice.total_tax))}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text fw={600}>Total:</Text>
                    <Text fw={600}>{formatCurrency(parseFloat(selectedInvoice.total))}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="green">Amount Paid:</Text>
                    <Text size="sm" c="green">{formatCurrency(parseFloat(selectedInvoice.amount_paid))}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="red">Amount Due:</Text>
                    <Text size="sm" c="red">{formatCurrency(parseFloat(selectedInvoice.amount_due))}</Text>
                  </Group>
                </Stack>
              </Paper>

              <Paper p="md" withBorder>
                <Text size="sm" fw={600} mb="xs">Dates</Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">Invoice Date:</Text>
                    <Text size="sm">{selectedInvoice.invoice_date ? formatDateAU(selectedInvoice.invoice_date) : '-'}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Due Date:</Text>
                    <Text size="sm">{selectedInvoice.due_date ? formatDateAU(selectedInvoice.due_date) : '-'}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Last Synced:</Text>
                    <Text size="sm">{selectedInvoice.last_synced_at ? formatDateAU(selectedInvoice.last_synced_at) : '-'}</Text>
                  </Group>
                </Stack>
              </Paper>

              <Button
                fullWidth
                leftSection={<IconExternalLink size={16} />}
                onClick={() => openInXero(selectedInvoice)}
              >
                Open in Xero
              </Button>
            </Stack>
          )}
        </Modal>
      </Container>
    </Navigation>
  );
}

