'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Container, Title, Text, Paper, Table, Badge, Button, Group, Stack, TextInput, Select, Loader, Center, ActionIcon, Tooltip, Tabs, rem, Modal } from '@mantine/core';
import { IconSearch, IconRefresh, IconFileInvoice, IconFileText, IconPlus, IconEye, IconTrash, IconDownload, IconPencil, IconSend, IconFileArrowRight, IconArrowLeft } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Navigation from '../../../components/Navigation';
import { InvoiceDetailModal } from '../../../components/xero/InvoiceDetailModal';
import { QuoteDetailModal } from '../../../components/xero/QuoteDetailModal';
import { QuickCreateModal } from '../../../components/xero/QuickCreateModal';
import { CreateInvoiceModal } from '../../../components/xero/CreateInvoiceModal';
import { CreateQuoteModal } from '../../../components/xero/CreateQuoteModal';
import { EditInvoiceModal } from '../../../components/xero/EditInvoiceModal';
import { formatDateOnlyAU } from '../../../utils/dateFormatting';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  mrn: string;
}

interface XeroInvoiceLink {
  id: string;
  xero_invoice_id: string;
  xero_invoice_number: string;
  status: string;
  total: string;
  subtotal: string;
  total_tax: string;
  amount_paid: string;
  amount_due: string;
  invoice_date: string | null;
  due_date: string | null;
  patient: string | null;
  patient_name: string | null;
  company: string | null;
  company_name: string | null;
}

interface XeroQuoteLink {
  id: string;
  xero_quote_id: string;
  xero_quote_number: string;
  status: string;
  total: string;
  subtotal: string;
  total_tax: string;
  quote_date: string | null;
  expiry_date: string | null;
  patient: string | null;
  patient_name: string | null;
  company: string | null;
  company_name: string | null;
}

type CombinedItem = (XeroInvoiceLink | XeroQuoteLink) & {
  type: 'invoice' | 'quote';
  number: string;
  date: string | null;
  dueOrExpiry: string | null;
};

export default function PatientAccountsQuotesPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params?.id as string;
  
  const [activeTab, setActiveTab] = useState<string | null>('all');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [invoices, setInvoices] = useState<XeroInvoiceLink[]>([]);
  const [quotes, setQuotes] = useState<XeroQuoteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  
  // Modals
  const [quickCreateOpened, setQuickCreateOpened] = useState(false);
  const [createInvoiceModalOpened, setCreateInvoiceModalOpened] = useState(false);
  const [createQuoteModalOpened, setCreateQuoteModalOpened] = useState(false);
  const [editInvoiceModalOpened, setEditInvoiceModalOpened] = useState(false);
  const [invoiceDetailModalOpened, setInvoiceDetailModalOpened] = useState(false);
  const [quoteDetailModalOpened, setQuoteDetailModalOpened] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  
  // Delete modals
  const [deleteInvoiceModalOpened, setDeleteInvoiceModalOpened] = useState(false);
  const [deleteQuoteModalOpened, setDeleteQuoteModalOpened] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (patientId) {
      fetchPatient();
      fetchData();
      fetchPatientsAndCompanies();
    }
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      const response = await fetch(`https://localhost:8000/api/patients/${patientId}/`);
      if (!response.ok) throw new Error('Failed to fetch patient');
      const data = await response.json();
      setPatient(data);
    } catch (error) {
      console.error('Error fetching patient:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load patient details',
        color: 'red',
      });
    }
  };

  const fetchPatientsAndCompanies = async () => {
    try {
      const [patientsRes, companiesRes] = await Promise.all([
        fetch('https://localhost:8000/api/patients/'),
        fetch('https://localhost:8000/api/companies/')
      ]);
      
      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        setPatients(patientsData.results || patientsData);
      }
      
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData.results || companiesData);
      }
    } catch (error) {
      console.error('Error fetching patients/companies:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch invoices and quotes filtered by patient
      const [invoicesRes, quotesRes] = await Promise.all([
        fetch(`https://localhost:8000/api/xero-invoice-links/?patient=${patientId}`),
        fetch(`https://localhost:8000/api/xero-quote-links/?patient=${patientId}`)
      ]);

      if (!invoicesRes.ok || !quotesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const invoicesData = await invoicesRes.json();
      const quotesData = await quotesRes.json();

      setInvoices(invoicesData.results || invoicesData);
      setQuotes(quotesData.results || quotesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load invoices and quotes',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getContactName = (item: XeroInvoiceLink | XeroQuoteLink): string => {
    // Check for patient_name/company_name first (serializer fields)
    if ('patient_name' in item && item.patient_name) return item.patient_name;
    if ('company_name' in item && item.company_name) return item.company_name;
    
    // Fallback to nested objects if serializer fields don't exist
    if ('patient' in item && item.patient && typeof item.patient === 'object' && 'full_name' in item.patient) {
      return (item.patient as any).full_name;
    }
    if ('company' in item && item.company && typeof item.company === 'object' && 'name' in item.company) {
      return (item.company as any).name;
    }
    
    return '—';
  };

  const getCombinedItems = (): CombinedItem[] => {
    const invoiceItems: CombinedItem[] = invoices.map(inv => ({
      ...inv,
      type: 'invoice' as const,
      number: inv.xero_invoice_number,
      date: inv.invoice_date,
      dueOrExpiry: inv.due_date,
    }));

    const quoteItems: CombinedItem[] = quotes.map(quote => ({
      ...quote,
      type: 'quote' as const,
      number: quote.xero_quote_number,
      date: quote.quote_date,
      dueOrExpiry: quote.expiry_date,
    }));

    const combined = [...invoiceItems, ...quoteItems];
    
    // Sort by date (most recent first)
    combined.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    return combined;
  };

  const filterItems = (items: CombinedItem[]): CombinedItem[] => {
    return items.filter(item => {
      // Filter by tab
      if (activeTab === 'invoices' && item.type !== 'invoice') return false;
      if (activeTab === 'quotes' && item.type !== 'quote') return false;

      // Filter by status
      if (statusFilter && statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNumber = item.number.toLowerCase().includes(query);
        const matchesContact = getContactName(item).toLowerCase().includes(query);
        if (!matchesNumber && !matchesContact) return false;
      }

      return true;
    });
  };

  const getStatusColor = (status: string): string => {
    const normalizedStatus = status.replace('QuoteStatusCodes.', '');
    switch (normalizedStatus) {
      case 'DRAFT': return 'gray';
      case 'SUBMITTED':
      case 'AUTHORISED':
      case 'SENT': return 'blue';
      case 'PAID': return 'green';
      case 'VOIDED': return 'red';
      case 'ACCEPTED': return 'green';
      case 'DECLINED': return 'red';
      case 'INVOICED': return 'cyan';
      default: return 'gray';
    }
  };

  const handleViewDetails = (item: CombinedItem) => {
    if (item.type === 'invoice') {
      setSelectedInvoiceId(item.id);
      setInvoiceDetailModalOpened(true);
    } else {
      setSelectedQuoteId(item.id);
      setQuoteDetailModalOpened(true);
    }
  };

  const handleEdit = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setEditInvoiceModalOpened(true);
  };

  const handleDelete = (item: CombinedItem) => {
    setItemToDelete(item);
    if (item.type === 'invoice') {
      setDeleteInvoiceModalOpened(true);
    } else {
      setDeleteQuoteModalOpened(true);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      console.log('🗑️ [Delete Invoice] Starting deletion for invoice:', itemToDelete.id);
      const response = await fetch(`https://localhost:8000/api/xero-invoice-links/${itemToDelete.id}/`, {
        method: 'DELETE',
      });
      console.log('📥 [Delete Invoice] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [Delete Invoice] Error response:', errorData);
        throw new Error(errorData.detail || 'Failed to delete invoice');
      }

      const contentType = response.headers.get('content-type');
      let result = null;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
        console.log('✅ [Delete Invoice] Success response:', result);
      }

      if (result && result.quote_reset) {
        notifications.show({
          title: 'Success',
          message: result.message || `Invoice deleted. Quote ${result.quote_number} has been reset to DRAFT and can be converted again.`,
          color: 'green',
          autoClose: 8000,
        });
      } else {
        notifications.show({
          title: 'Success',
          message: 'Invoice deleted successfully',
          color: 'green',
        });
      }

      console.log('🔄 [Delete Invoice] Refreshing invoice list...');
      fetchData();
      setDeleteInvoiceModalOpened(false);
      setItemToDelete(null);
      console.log('✅ [Delete Invoice] Complete');
    } catch (error: any) {
      console.error('❌ [Delete Invoice] Error:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete invoice',
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteQuote = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      console.log('🗑️ [Delete Quote] Starting deletion for quote:', itemToDelete.id);
      const response = await fetch(`https://localhost:8000/api/xero-quote-links/${itemToDelete.id}/`, {
        method: 'DELETE',
      });
      console.log('📥 [Delete Quote] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [Delete Quote] Error response:', errorData);
        throw new Error(errorData.detail || 'Failed to delete quote');
      }

      console.log('✅ [Delete Quote] Success');
      notifications.show({
        title: 'Success',
        message: 'Quote deleted successfully',
        color: 'green',
      });

      console.log('🔄 [Delete Quote] Refreshing quote list...');
      fetchData();
      setDeleteQuoteModalOpened(false);
      setItemToDelete(null);
      console.log('✅ [Delete Quote] Complete');
    } catch (error: any) {
      console.error('❌ [Delete Quote] Error:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete quote',
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadPDF = async (item: CombinedItem) => {
    try {
      const endpoint = item.type === 'invoice' 
        ? `https://localhost:8000/api/invoices/xero/${item.id}/pdf/`
        : `https://localhost:8000/api/invoices/xero/quotes/${item.id}/pdf/`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) throw new Error('Failed to download PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      notifications.show({
        title: 'Success',
        message: 'PDF downloaded successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to download PDF',
        color: 'red',
      });
    }
  };

  const handleDownloadDebugPDF = async (item: CombinedItem) => {
    try {
      const endpoint = item.type === 'invoice' 
        ? `https://localhost:8000/api/invoices/xero/${item.id}/pdf/?debug=true`
        : `https://localhost:8000/api/invoices/xero/quotes/${item.id}/pdf/?debug=true`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) throw new Error('Failed to download debug PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.number}_debug.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      notifications.show({
        title: 'Success',
        message: 'Debug PDF downloaded successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Error downloading debug PDF:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to download debug PDF',
        color: 'red',
      });
    }
  };

  const handleAuthorizeInvoice = async (invoiceId: string) => {
    console.log('🚀 [Send to Xero] Starting authorization for invoice:', invoiceId);
    try {
      console.log('📤 [Send to Xero] Sending POST request to authorize endpoint...');
      const response = await fetch(`https://localhost:8000/api/xero-invoice-links/${invoiceId}/authorize/`, {
        method: 'POST',
      });
      console.log('📥 [Send to Xero] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [Send to Xero] Error response:', error);
        throw new Error(error.detail || error.error || 'Failed to authorize invoice');
      }

      const result = await response.json();
      console.log('✅ [Send to Xero] Success response:', result);

      notifications.show({
        title: 'Success',
        message: `Invoice ${result.xero_invoice_number} has been sent to Xero and is now AUTHORISED`,
        color: 'green',
      });

      console.log('🔄 [Send to Xero] Refreshing invoice list...');
      await fetchData();
      console.log('✅ [Send to Xero] Complete');
    } catch (error: any) {
      console.error('❌ [Send to Xero] Error:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to authorize invoice',
        color: 'red',
      });
    }
  };

  const handleConvertQuoteToInvoice = async (quoteId: string) => {
    console.log('🚀 [Convert to Invoice] Starting conversion for quote:', quoteId);
    try {
      console.log('📤 [Convert to Invoice] Sending POST request to convert endpoint...');
      const response = await fetch(`https://localhost:8000/api/xero-quote-links/${quoteId}/convert_to_invoice/`, {
        method: 'POST',
      });
      console.log('📥 [Convert to Invoice] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [Convert to Invoice] Error response:', error);
        throw new Error(error.detail || error.error || 'Failed to convert quote');
      }

      const result = await response.json();
      console.log('✅ [Convert to Invoice] Success response:', result);

      notifications.show({
        title: 'Success',
        message: `Quote converted to invoice ${result.invoice.xero_invoice_number}`,
        color: 'green',
      });

      console.log('🔄 [Convert to Invoice] Refreshing invoice and quote lists...');
      await fetchData();
      console.log('✅ [Convert to Invoice] Lists refreshed');
    } catch (error: any) {
      console.error('❌ [Convert to Invoice] Error:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to convert quote to invoice',
        color: 'red',
      });
    }
  };

  const filteredItems = filterItems(getCombinedItems());
  const invoiceCount = invoices.length;
  const quoteCount = quotes.length;
  const totalCount = invoiceCount + quoteCount;

  const renderTable = () => {
    if (loading) {
      return (
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <Center h={400}>
          <Stack align="center" gap="md">
            <Text c="dimmed" size="lg">No invoices or quotes found</Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setQuickCreateOpened(true)}
            >
              Create First Invoice/Quote
            </Button>
          </Stack>
        </Center>
      );
    }

    return (
      <Table.ScrollContainer minWidth={1400}>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: '100px' }}>Type</Table.Th>
              <Table.Th style={{ width: '140px' }}>Number</Table.Th>
              <Table.Th style={{ width: '250px' }}>Contact</Table.Th>
              <Table.Th style={{ width: '140px' }}>Status</Table.Th>
              <Table.Th style={{ width: '120px' }}>Date</Table.Th>
              <Table.Th style={{ width: '120px' }}>Due/Expiry</Table.Th>
              <Table.Th style={{ width: '120px' }}>Total</Table.Th>
              <Table.Th style={{ width: '300px' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredItems.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <Badge
                    variant="light"
                    color={item.type === 'invoice' ? 'blue' : 'violet'}
                    leftSection={item.type === 'invoice' ? <IconFileInvoice size={14} /> : <IconFileText size={14} />}
                  >
                    {item.type.toUpperCase()}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text fw={600}>{item.number}</Text>
                </Table.Td>
                <Table.Td>
                  <Text>{getContactName(item)}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(item.status)}>
                    {item.status.replace('QuoteStatusCodes.', '')}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{item.date ? formatDateOnlyAU(item.date) : '—'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{item.dueOrExpiry ? formatDateOnlyAU(item.dueOrExpiry) : '—'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text fw={600}>${parseFloat(item.total).toFixed(2)}</Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="View Details">
                      <ActionIcon variant="subtle" color="blue" onClick={() => handleViewDetails(item)}>
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>

                    {/* Send to Xero button for DRAFT invoices */}
                    {item.type === 'invoice' && item.status === 'DRAFT' && (
                      <Tooltip label="Send to Xero">
                        <ActionIcon variant="subtle" color="teal" onClick={() => handleAuthorizeInvoice(item.id)}>
                          <IconSend size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}

                    {/* Convert to Invoice button for quotes */}
                    {item.type === 'quote' && (item.status === 'DRAFT' || item.status === 'SENT' || item.status === 'ACCEPTED' || item.status === 'QuoteStatusCodes.DRAFT' || item.status === 'QuoteStatusCodes.SENT' || item.status === 'QuoteStatusCodes.ACCEPTED') && (
                      <Tooltip label="Convert to Invoice">
                        <ActionIcon variant="subtle" color="violet" onClick={() => handleConvertQuoteToInvoice(item.id)}>
                          <IconFileArrowRight size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}

                    {item.type === 'invoice' && item.status === 'DRAFT' && (
                      <Tooltip label="Edit Invoice">
                        <ActionIcon variant="subtle" color="gray" onClick={() => handleEdit(item.id)}>
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <Tooltip label="Download PDF">
                      <ActionIcon variant="subtle" color="green" onClick={() => handleDownloadPDF(item)}>
                        <IconDownload size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Download Debug PDF">
                      <ActionIcon variant="subtle" color="orange" onClick={() => handleDownloadDebugPDF(item)}>
                        <IconDownload size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete">
                      <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(item)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    );
  };

  if (!patient && !loading) {
    return (
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Navigation />
        <Container size="xl" py="xl">
          <Center h={400}>
            <Stack align="center">
              <Text size="lg" c="dimmed">Patient not found</Text>
              <Button leftSection={<IconArrowLeft size={16} />} onClick={() => router.back()}>
                Go Back
              </Button>
            </Stack>
          </Center>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Navigation />
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Group justify="space-between" align="flex-start">
            <Stack gap="xs">
              <Group>
                <ActionIcon variant="subtle" onClick={() => router.back()}>
                  <IconArrowLeft size={20} />
                </ActionIcon>
                <div>
                  <Title order={1}>Accounts | Quotes</Title>
                  {patient && (
                    <Text c="dimmed" size="sm">
                      {patient.first_name} {patient.last_name} {patient.mrn ? `(MRN: ${patient.mrn})` : ''}
                    </Text>
                  )}
                </div>
              </Group>
            </Stack>
            <Group>
              <Button
                leftSection={<IconRefresh size={16} />}
                variant="light"
                onClick={fetchData}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setQuickCreateOpened(true)}
              >
                Create Invoice/Quote
              </Button>
            </Group>
          </Group>

          {/* Search and Filters */}
          <Paper p="md" withBorder>
            <Group>
              <TextInput
                placeholder="Search by number or contact..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <Select
                placeholder="All Statuses"
                data={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'AUTHORISED', label: 'Authorised' },
                  { value: 'PAID', label: 'Paid' },
                  { value: 'VOIDED', label: 'Voided' },
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

          {/* Tabs */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab
                value="all"
                leftSection={<IconFileInvoice style={{ width: rem(16), height: rem(16) }} />}
              >
                All ({totalCount})
              </Tabs.Tab>
              <Tabs.Tab
                value="invoices"
                leftSection={<IconFileInvoice style={{ width: rem(16), height: rem(16) }} />}
              >
                Invoices ({invoiceCount})
              </Tabs.Tab>
              <Tabs.Tab
                value="quotes"
                leftSection={<IconFileText style={{ width: rem(16), height: rem(16) }} />}
              >
                Quotes ({quoteCount})
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="all" pt="md">
              <Paper withBorder>
                {renderTable()}
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="invoices" pt="md">
              <Paper withBorder>
                {renderTable()}
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="quotes" pt="md">
              <Paper withBorder>
                {renderTable()}
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Container>

      {/* Modals */}
      <QuickCreateModal
        opened={quickCreateOpened}
        onClose={() => setQuickCreateOpened(false)}
        onCreateInvoice={() => {
          setQuickCreateOpened(false);
          setCreateInvoiceModalOpened(true);
        }}
        onCreateQuote={() => {
          setQuickCreateOpened(false);
          setCreateQuoteModalOpened(true);
        }}
        preSelectedPatientId={patientId}
      />

      <CreateInvoiceModal
        opened={createInvoiceModalOpened}
        onClose={() => setCreateInvoiceModalOpened(false)}
        onSuccess={() => {
          setCreateInvoiceModalOpened(false);
          fetchData();
        }}
        patients={patients}
        companies={companies}
        preSelectedPatientId={patientId}
      />

      <CreateQuoteModal
        opened={createQuoteModalOpened}
        onClose={() => setCreateQuoteModalOpened(false)}
        onSuccess={() => {
          setCreateQuoteModalOpened(false);
          fetchData();
        }}
        patients={patients}
        companies={companies}
        preSelectedPatientId={patientId}
      />

      {selectedInvoiceId && (
        <>
          <InvoiceDetailModal
            opened={invoiceDetailModalOpened}
            onClose={() => {
              setInvoiceDetailModalOpened(false);
              setSelectedInvoiceId(null);
            }}
            invoiceId={selectedInvoiceId}
            onEdit={() => {
              setInvoiceDetailModalOpened(false);
              setEditInvoiceModalOpened(true);
            }}
            onDelete={() => {
              setInvoiceDetailModalOpened(false);
              const item = filteredItems.find(i => i.id === selectedInvoiceId);
              if (item) handleDelete(item);
            }}
          />

          <EditInvoiceModal
            opened={editInvoiceModalOpened}
            onClose={() => {
              setEditInvoiceModalOpened(false);
              setSelectedInvoiceId(null);
            }}
            onSuccess={() => {
              setEditInvoiceModalOpened(false);
              setSelectedInvoiceId(null);
              fetchData();
            }}
            invoiceId={selectedInvoiceId}
            patients={patients}
            companies={companies}
          />
        </>
      )}

      {selectedQuoteId && (
        <QuoteDetailModal
          opened={quoteDetailModalOpened}
          onClose={() => {
            setQuoteDetailModalOpened(false);
            setSelectedQuoteId(null);
          }}
          quoteId={selectedQuoteId}
          onDelete={() => {
            setQuoteDetailModalOpened(false);
            const item = filteredItems.find(i => i.id === selectedQuoteId);
            if (item) handleDelete(item);
          }}
        />
      )}

      {/* Delete Confirmation Modals */}
      <Modal
        opened={deleteInvoiceModalOpened}
        onClose={() => setDeleteInvoiceModalOpened(false)}
        title="Delete Invoice"
        centered
      >
        <Stack>
          <Text>Are you sure you want to delete this invoice?</Text>
          {itemToDelete && (
            <Text size="sm" c="dimmed">
              Invoice: {itemToDelete.number}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteInvoiceModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteInvoice} loading={deleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteQuoteModalOpened}
        onClose={() => setDeleteQuoteModalOpened(false)}
        title="Delete Quote"
        centered
      >
        <Stack>
          <Text>Are you sure you want to delete this quote?</Text>
          {itemToDelete && (
            <Text size="sm" c="dimmed">
              Quote: {itemToDelete.number}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteQuoteModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteQuote} loading={deleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

