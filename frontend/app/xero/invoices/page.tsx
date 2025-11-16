'use client';

import { useState, useEffect } from 'react';
import { Container, Title, Text, Paper, Table, Badge, Button, Group, Stack, TextInput, Select, Loader, Center, ActionIcon, Tooltip, rem } from '@mantine/core';
import { IconSearch, IconRefresh, IconCheck, IconX, IconFileInvoice, IconPlus, IconClock, IconCurrencyDollar, IconEye } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Navigation from '../../components/Navigation';
import { CreateInvoiceModal } from '../../components/xero/CreateInvoiceModal';
import { InvoiceDetailModal } from '../../components/xero/InvoiceDetailModal';
import { formatDateTimeAU, formatDateOnlyAU } from '../../utils/dateFormatting';

interface XeroInvoiceLink {
  id: string;
  appointment: string | null;
  appointment_details: {
    id: string;
    patient_name: string;
    start_time: string;
  } | null;
  xero_invoice_id: string;
  xero_invoice_number: string;
  xero_invoice_type: string;
  status: string;
  total: string;
  subtotal: string;
  total_tax: string;
  amount_due: string;
  amount_paid: string;
  currency: string;
  invoice_date: string | null;
  due_date: string | null;
  fully_paid_on_date: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  'DRAFT': 'gray',
  'SUBMITTED': 'blue',
  'AUTHORISED': 'cyan',
  'PAID': 'green',
  'VOIDED': 'red',
  'DELETED': 'red',
};

export default function XeroInvoicesPage() {
  const [invoices, setInvoices] = useState<XeroInvoiceLink[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<XeroInvoiceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  
  // Create invoice modal
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  
  // Invoice detail modal
  const [detailModalOpened, setDetailModalOpened] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    paid: 0,
    totalAmount: 0,
    amountPaid: 0,
    amountDue: 0,
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://localhost:8000/api/xero-invoice-links/');
      if (!response.ok) throw new Error('Failed to fetch invoices');
      
      const data = await response.json();
      const invoicesList = data.results || data;
      setInvoices(invoicesList);
      setFilteredInvoices(invoicesList);

      // Calculate stats
      const newStats = {
        total: invoicesList.length,
        draft: invoicesList.filter((i: XeroInvoiceLink) => i.status === 'DRAFT').length,
        submitted: invoicesList.filter((i: XeroInvoiceLink) => i.status === 'SUBMITTED' || i.status === 'AUTHORISED').length,
        paid: invoicesList.filter((i: XeroInvoiceLink) => i.status === 'PAID').length,
        totalAmount: invoicesList.reduce((sum: number, i: XeroInvoiceLink) => sum + parseFloat(i.total || '0'), 0),
        amountPaid: invoicesList.reduce((sum: number, i: XeroInvoiceLink) => sum + parseFloat(i.amount_paid || '0'), 0),
        amountDue: invoicesList.reduce((sum: number, i: XeroInvoiceLink) => sum + parseFloat(i.amount_due || '0'), 0),
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching Xero invoices:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load Xero invoices',
        color: 'red',
        icon: <IconX />,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchPatientsAndCompanies();
  }, []);

  const fetchPatientsAndCompanies = async () => {
    try {
      // Fetch patients
      const patientsRes = await fetch('https://localhost:8000/api/patients/');
      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        setPatients(patientsData.results || patientsData);
      }

      // Fetch companies
      const companiesRes = await fetch('https://localhost:8000/api/companies/');
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData.results || companiesData);
      }
    } catch (error) {
      console.error('Error fetching patients/companies:', error);
    }
  };

  // Filter invoices based on search and status
  useEffect(() => {
    let filtered = invoices;

    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.xero_invoice_number.toLowerCase().includes(query) ||
        i.appointment_details?.patient_name.toLowerCase().includes(query)
      );
    }

    setFilteredInvoices(filtered);
  }, [invoices, searchQuery, statusFilter]);

  const getXeroInvoiceUrl = (invoiceId: string) => {
    return `https://go.xero.com/AccountsReceivable/Edit.aspx?InvoiceID=${invoiceId}`;
  };

  const formatCurrency = (amount: string | number) => {
    return `$${parseFloat(amount.toString()).toFixed(2)}`;
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
              <Title order={2}>Xero Invoices</Title>
              <Text c="dimmed" size="sm" mt="xs">
                Manage invoices synced to Xero
              </Text>
            </div>
            <Group>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={fetchInvoices}
                variant="light"
              >
                Refresh
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setCreateModalOpened(true)}
              >
                Create Invoice
              </Button>
            </Group>
          </Group>

          {/* Create Invoice Modal */}
          <CreateInvoiceModal
            opened={createModalOpened}
            onClose={() => setCreateModalOpened(false)}
            onSuccess={() => {
              fetchInvoices();
            }}
            patients={patients}
            companies={companies}
          />

          {/* Stats */}
          <Group gap="md" grow>
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Invoices</Text>
                  <Text size="xl" fw={700}>{stats.total}</Text>
                </div>
                <IconFileInvoice size={32} style={{ opacity: 0.3 }} />
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
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Submitted</Text>
                  <Text size="xl" fw={700}>{stats.submitted}</Text>
                </div>
                <IconClock size={32} style={{ opacity: 0.3 }} />
              </Group>
            </Paper>
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Paid</Text>
                  <Text size="xl" fw={700}>{stats.paid}</Text>
                </div>
                <IconCheck size={32} style={{ opacity: 0.3 }} />
              </Group>
            </Paper>
          </Group>

          {/* Financial Stats */}
          <Group gap="md" grow>
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Amount</Text>
                  <Text size="xl" fw={700}>{formatCurrency(stats.totalAmount)}</Text>
                </div>
                <IconCurrencyDollar size={32} style={{ opacity: 0.3 }} />
              </Group>
            </Paper>
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Amount Paid</Text>
                  <Text size="xl" fw={700} c="green">{formatCurrency(stats.amountPaid)}</Text>
                </div>
                <IconCheck size={32} style={{ opacity: 0.3, color: 'green' }} />
              </Group>
            </Paper>
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Amount Due</Text>
                  <Text size="xl" fw={700} c="orange">{formatCurrency(stats.amountDue)}</Text>
                </div>
                <IconClock size={32} style={{ opacity: 0.3, color: 'orange' }} />
              </Group>
            </Paper>
          </Group>

          {/* Filters */}
          <Paper p="md" withBorder>
            <Group>
              <TextInput
                placeholder="Search invoices..."
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
                  { value: 'SUBMITTED', label: 'Submitted' },
                  { value: 'AUTHORISED', label: 'Authorised' },
                  { value: 'PAID', label: 'Paid' },
                  { value: 'VOIDED', label: 'Voided' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 200 }}
              />
            </Group>
          </Paper>

          {/* Invoices Table */}
          <Paper shadow="sm" p="0" withBorder>
            {filteredInvoices.length === 0 ? (
              <Center p="xl">
                <Stack align="center" gap="xs">
                  <IconFileInvoice size={48} style={{ opacity: 0.3 }} />
                  <Text c="dimmed">
                    {searchQuery || statusFilter !== 'all' ? 'No invoices match your filters' : 'No invoices created yet'}
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Table.ScrollContainer minWidth={1000}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Invoice Number</Table.Th>
                      <Table.Th>Patient</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Invoice Date</Table.Th>
                      <Table.Th>Due Date</Table.Th>
                      <Table.Th>Total</Table.Th>
                      <Table.Th>Amount Paid</Table.Th>
                      <Table.Th>Amount Due</Table.Th>
                      <Table.Th style={{ width: '80px' }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredInvoices.map((invoice) => (
                      <Table.Tr key={invoice.id}>
                        <Table.Td>
                          <Text fw={600}>{invoice.xero_invoice_number}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{invoice.appointment_details?.patient_name || '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={STATUS_COLORS[invoice.status] || 'gray'} variant="light">
                            {invoice.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {invoice.invoice_date ? formatDateOnlyAU(invoice.invoice_date) : '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {invoice.due_date ? formatDateOnlyAU(invoice.due_date) : '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>{formatCurrency(invoice.total)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="green">{formatCurrency(invoice.amount_paid)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="orange">{formatCurrency(invoice.amount_due)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label="View Details">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={() => {
                                setSelectedInvoiceId(invoice.id);
                                setDetailModalOpened(true);
                              }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
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
      
      {/* Invoice Detail Modal */}
      {selectedInvoiceId && (
        <InvoiceDetailModal
          opened={detailModalOpened}
          onClose={() => {
            setDetailModalOpened(false);
            setSelectedInvoiceId(null);
          }}
          invoiceId={selectedInvoiceId}
        />
      )}
    </Navigation>
  );
}
