'use client';

import { useState, useEffect } from 'react';
import { Container, Title, Text, Paper, Table, Badge, Button, Group, Stack, TextInput, Select, Loader, Center, ActionIcon, Tooltip, Tabs, rem, Modal } from '@mantine/core';
import { IconSearch, IconRefresh, IconFileInvoice, IconFileText, IconPlus, IconEye, IconTrash, IconDownload, IconPencil, IconSend, IconFileArrowRight } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Navigation from '../../components/Navigation';
import { InvoiceDetailModal } from '../../components/xero/InvoiceDetailModal';
import { QuoteDetailModal } from '../../components/xero/QuoteDetailModal';
import { QuickCreateModal } from '../../components/xero/QuickCreateModal';
import { CreateInvoiceModal } from '../../components/xero/CreateInvoiceModal';
import { CreateQuoteModal } from '../../components/xero/CreateQuoteModal';
import { EditInvoiceModal } from '../../components/xero/EditInvoiceModal';
import { formatDateOnlyAU } from '../../utils/dateFormatting';

interface XeroInvoiceLink {
  id: string;
  xero_invoice_id: string;
  xero_invoice_number: string;
  status: string;
  total: string;
  amount_paid: string;
  amount_due: string;
  invoice_date: string | null;
  due_date: string | null;
  patient?: { id: string; first_name: string; last_name: string; } | null;
  company?: { id: string; name: string; } | null;
}

interface XeroQuoteLink {
  id: string;
  xero_quote_id: string;
  xero_quote_number: string;
  status: string;
  total: string;
  quote_date: string | null;
  expiry_date: string | null;
  patient?: { id: string; first_name: string; last_name: string; } | null;
  company?: { id: string; name: string; } | null;
}

export default function XeroInvoicesQuotesPage() {
  const [activeTab, setActiveTab] = useState<string | null>('all');
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
  const [preSelectedPatientId, setPreSelectedPatientId] = useState<string | undefined>();
  const [preSelectedCompanyId, setPreSelectedCompanyId] = useState<string | undefined>();
  const [patients, setPatients] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  
  // Delete modals
  const [deleteInvoiceModalOpened, setDeleteInvoiceModalOpened] = useState(false);
  const [deleteQuoteModalOpened, setDeleteQuoteModalOpened] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
    fetchPatientsAndCompanies();
  }, []);

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
      const [invoicesRes, quotesRes] = await Promise.all([
        fetch('https://localhost:8000/api/xero-invoice-links/'),
        fetch('https://localhost:8000/api/xero-quote-links/')
      ]);
      
      if (!invoicesRes.ok || !quotesRes.ok) throw new Error('Failed to fetch data');
      
      const [invoicesData, quotesData] = await Promise.all([
        invoicesRes.json(),
        quotesRes.json()
      ]);
      
      setInvoices(invoicesData.results || invoicesData);
      setQuotes(quotesData.results || quotesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch invoices and quotes',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!itemToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`https://localhost:8000/api/xero-invoice-links/${itemToDelete.id}/`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete invoice');
      
      notifications.show({
        title: 'Success',
        message: 'Invoice deleted successfully',
        color: 'green',
      });
      
      fetchData();
      setDeleteInvoiceModalOpened(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete invoice',
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
      const response = await fetch(`https://localhost:8000/api/xero-quote-links/${itemToDelete.id}/`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete quote');
      
      notifications.show({
        title: 'Success',
        message: 'Quote deleted successfully',
        color: 'green',
      });
      
      fetchData();
      setDeleteQuoteModalOpened(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting quote:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete quote',
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleAuthorizeInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`https://localhost:8000/api/xero-invoice-links/${invoiceId}/authorize/`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to authorize invoice');
      }

      notifications.show({
        title: 'Success',
        message: 'Invoice authorized and sent to Xero',
        color: 'green',
      });

      // Refresh the list
      fetchInvoices();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to authorize invoice',
        color: 'red',
      });
    }
  };

  const handleConvertQuoteToInvoice = async (quoteId: string) => {
    try {
      const response = await fetch(`https://localhost:8000/api/xero-quote-links/${quoteId}/convert_to_invoice/`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to convert quote');
      }

      const result = await response.json();

      notifications.show({
        title: 'Success',
        message: 'Quote converted to invoice successfully',
        color: 'green',
      });

      // Refresh both lists
      fetchInvoices();
      fetchQuotes();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to convert quote',
        color: 'red',
      });
    }
  };

  const getStatusBadge = (status: string, type: 'invoice' | 'quote') => {
    const normalizeStatus = (s: string) => s.startsWith('QuoteStatusCodes.') ? s.replace('QuoteStatusCodes.', '') : s;
    const normalized = normalizeStatus(status);
    
    const invoiceColors: Record<string, string> = {
      DRAFT: 'gray',
      SUBMITTED: 'blue',
      AUTHORISED: 'cyan',
      PAID: 'green',
      VOIDED: 'red',
      DELETED: 'red',
    };
    
    const quoteColors: Record<string, string> = {
      DRAFT: 'gray',
      SENT: 'blue',
      ACCEPTED: 'green',
      DECLINED: 'red',
      INVOICED: 'teal',
      DELETED: 'red',
    };
    
    const colors = type === 'invoice' ? invoiceColors : quoteColors;
    const color = colors[normalized] || 'gray';
    
    return <Badge color={color} variant="light">{normalized}</Badge>;
  };

  const getContactName = (item: XeroInvoiceLink | XeroQuoteLink) => {
    // Check for patient_name/company_name first (new serializer format)
    if ('patient_name' in item && item.patient_name) {
      return item.patient_name;
    }
    if ('company_name' in item && item.company_name) {
      return item.company_name;
    }
    // Fallback to nested objects (legacy format)
    if (item.patient && typeof item.patient === 'object') {
      return `${(item.patient as any).first_name} ${(item.patient as any).last_name}`;
    }
    if (item.company && typeof item.company === 'object') {
      return (item.company as any).name;
    }
    return '—';
  };

  // Filter data based on search and status
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.xero_invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getContactName(invoice).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.xero_quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getContactName(quote).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status.replace('QuoteStatusCodes.', '') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Combine and sort by date
  const combinedData = [
    ...filteredInvoices.map(inv => ({ ...inv, type: 'invoice' as const, date: inv.invoice_date })),
    ...filteredQuotes.map(quote => ({ ...quote, type: 'quote' as const, date: quote.quote_date }))
  ].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const renderTable = (data: typeof combinedData, showType: boolean) => (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          {showType && <Table.Th>Type</Table.Th>}
          <Table.Th>Number</Table.Th>
          <Table.Th>Contact</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Date</Table.Th>
          <Table.Th>Due/Expiry</Table.Th>
          <Table.Th>Total</Table.Th>
          <Table.Th>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data.map((item) => (
          <Table.Tr key={`${item.type}-${item.id}`}>
            {showType && (
              <Table.Td>
                <Badge color={item.type === 'invoice' ? 'blue' : 'violet'} variant="light">
                  {item.type === 'invoice' ? 'Invoice' : 'Quote'}
                </Badge>
              </Table.Td>
            )}
            <Table.Td>
              <Text fw={600}>
                {item.type === 'invoice' 
                  ? (item as any).xero_invoice_number 
                  : (item as any).xero_quote_number}
              </Text>
            </Table.Td>
            <Table.Td>{getContactName(item)}</Table.Td>
            <Table.Td>{getStatusBadge(item.status, item.type)}</Table.Td>
            <Table.Td>{item.date ? formatDateOnlyAU(item.date) : '—'}</Table.Td>
            <Table.Td>
              {item.type === 'invoice' 
                ? ((item as any).due_date ? formatDateOnlyAU((item as any).due_date) : '—')
                : ((item as any).expiry_date ? formatDateOnlyAU((item as any).expiry_date) : '—')}
            </Table.Td>
            <Table.Td>
              <Text fw={600}>${parseFloat(item.total).toFixed(2)}</Text>
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                <Tooltip label="View Details">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => {
                      if (item.type === 'invoice') {
                        setSelectedInvoiceId(item.id);
                        setInvoiceDetailModalOpened(true);
                      } else {
                        setSelectedQuoteId(item.id);
                        setQuoteDetailModalOpened(true);
                      }
                    }}
                  >
                    <IconEye size={16} />
                  </ActionIcon>
                </Tooltip>
                
                {/* Send to Xero button for DRAFT invoices */}
                {item.type === 'invoice' && item.status === 'DRAFT' && (
                  <Tooltip label="Send to Xero">
                    <ActionIcon
                      variant="subtle"
                      color="teal"
                      onClick={() => handleAuthorizeInvoice(item.id)}
                    >
                      <IconSend size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
                
                {/* Convert to Invoice button for quotes */}
                {item.type === 'quote' && (item.status === 'DRAFT' || item.status === 'SENT' || item.status === 'ACCEPTED' || item.status === 'QuoteStatusCodes.DRAFT' || item.status === 'QuoteStatusCodes.SENT' || item.status === 'QuoteStatusCodes.ACCEPTED') && (
                  <Tooltip label="Convert to Invoice">
                    <ActionIcon
                      variant="subtle"
                      color="violet"
                      onClick={() => handleConvertQuoteToInvoice(item.id)}
                    >
                      <IconFileArrowRight size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
                
                {item.type === 'invoice' && item.status === 'DRAFT' && (
                  <Tooltip label="Edit Invoice">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => {
                        setSelectedInvoiceId(item.id);
                        setEditInvoiceModalOpened(true);
                      }}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
                
                {item.type === 'invoice' && (
                  <>
                    <Tooltip label="Download PDF">
                      <ActionIcon
                        variant="subtle"
                        color="green"
                        onClick={async () => {
                          try {
                            const response = await fetch(`https://localhost:8000/api/invoices/xero/${item.id}/pdf/`);
                            if (!response.ok) throw new Error('Failed to generate PDF');
                            
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Invoice_${(item as any).xero_invoice_number}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            
                            notifications.show({
                              title: 'Success',
                              message: 'PDF downloaded',
                              color: 'green',
                            });
                          } catch (error) {
                            notifications.show({
                              title: 'Error',
                              message: 'Failed to generate PDF',
                              color: 'red',
                            });
                          }
                        }}
                      >
                        <IconDownload size={16} />
                      </ActionIcon>
                    </Tooltip>
                    
                    <Tooltip label="Download Debug PDF">
                      <ActionIcon
                        variant="subtle"
                        color="orange"
                        onClick={async () => {
                          try {
                            const response = await fetch(`https://localhost:8000/api/invoices/xero/${item.id}/pdf/?debug=true`);
                            if (!response.ok) throw new Error('Failed to generate PDF');
                            
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Invoice_${(item as any).xero_invoice_number}_DEBUG.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            
                            notifications.show({
                              title: 'Success',
                              message: 'Debug PDF downloaded',
                              color: 'green',
                            });
                          } catch (error) {
                            notifications.show({
                              title: 'Error',
                              message: 'Failed to generate PDF',
                              color: 'red',
                            });
                          }
                        }}
                      >
                        <IconDownload size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </>
                )}
                
                {item.type === 'quote' && (
                  <>
                    <Tooltip label="Download PDF">
                      <ActionIcon
                        variant="subtle"
                        color="green"
                        onClick={async () => {
                          try {
                            const response = await fetch(`https://localhost:8000/api/invoices/xero/quotes/${item.id}/pdf/`);
                            if (!response.ok) throw new Error('Failed to generate PDF');
                            
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Quote_${(item as any).xero_quote_number}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            
                            notifications.show({
                              title: 'Success',
                              message: 'Quote PDF downloaded',
                              color: 'green',
                            });
                          } catch (error) {
                            notifications.show({
                              title: 'Error',
                              message: 'Failed to generate quote PDF',
                              color: 'red',
                            });
                          }
                        }}
                      >
                        <IconDownload size={16} />
                      </ActionIcon>
                    </Tooltip>
                    
                    <Tooltip label="Download Debug PDF">
                      <ActionIcon
                        variant="subtle"
                        color="orange"
                        onClick={async () => {
                          try {
                            const response = await fetch(`https://localhost:8000/api/invoices/xero/quotes/${item.id}/pdf/?debug=true`);
                            if (!response.ok) throw new Error('Failed to generate PDF');
                            
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Quote_${(item as any).xero_quote_number}_DEBUG.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            
                            notifications.show({
                              title: 'Success',
                              message: 'Debug quote PDF downloaded',
                              color: 'green',
                            });
                          } catch (error) {
                            notifications.show({
                              title: 'Error',
                              message: 'Failed to generate quote PDF',
                              color: 'red',
                            });
                          }
                        }}
                      >
                        <IconDownload size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </>
                )}
                
                <Tooltip label={`Delete ${item.type === 'invoice' ? 'Invoice' : 'Quote'}`}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => {
                      setItemToDelete(item);
                      if (item.type === 'invoice') {
                        setDeleteInvoiceModalOpened(true);
                      } else {
                        setDeleteQuoteModalOpened(true);
                      }
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Stack gap="lg">
          {/* Header */}
          <Group justify="space-between">
            <div>
              <Title order={2}>Xero Invoices & Quotes</Title>
              <Text c="dimmed" size="sm">Manage invoices and quotes synced to Xero</Text>
            </div>
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

          {/* Filters */}
          <Paper p="md" withBorder>
            <Group>
              <TextInput
                placeholder="Search by number or contact..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Select
                placeholder="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                data={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'SUBMITTED', label: 'Submitted' },
                  { value: 'AUTHORISED', label: 'Authorised' },
                  { value: 'SENT', label: 'Sent' },
                  { value: 'ACCEPTED', label: 'Accepted' },
                  { value: 'PAID', label: 'Paid' },
                ]}
                style={{ width: 200 }}
              />
            </Group>
          </Paper>

          {/* Tabs */}
          <Paper withBorder>
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="all" leftSection={<IconFileInvoice size={16} />}>
                  All ({combinedData.length})
                </Tabs.Tab>
                <Tabs.Tab value="invoices" leftSection={<IconFileInvoice size={16} />}>
                  Invoices ({filteredInvoices.length})
                </Tabs.Tab>
                <Tabs.Tab value="quotes" leftSection={<IconFileText size={16} />}>
                  Quotes ({filteredQuotes.length})
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="all" p="md">
                {loading ? (
                  <Center p="xl">
                    <Loader />
                  </Center>
                ) : combinedData.length === 0 ? (
                  <Center p="xl">
                    <Text c="dimmed">No invoices or quotes found</Text>
                  </Center>
                ) : (
                  renderTable(combinedData, true)
                )}
              </Tabs.Panel>

              <Tabs.Panel value="invoices" p="md">
                {loading ? (
                  <Center p="xl">
                    <Loader />
                  </Center>
                ) : filteredInvoices.length === 0 ? (
                  <Center p="xl">
                    <Text c="dimmed">No invoices found</Text>
                  </Center>
                ) : (
                  renderTable(
                    filteredInvoices.map(inv => ({ ...inv, type: 'invoice' as const, date: inv.invoice_date })),
                    false
                  )
                )}
              </Tabs.Panel>

              <Tabs.Panel value="quotes" p="md">
                {loading ? (
                  <Center p="xl">
                    <Loader />
                  </Center>
                ) : filteredQuotes.length === 0 ? (
                  <Center p="xl">
                    <Text c="dimmed">No quotes found</Text>
                  </Center>
                ) : (
                  renderTable(
                    filteredQuotes.map(quote => ({ ...quote, type: 'quote' as const, date: quote.quote_date })),
                    false
                  )
                )}
              </Tabs.Panel>
            </Tabs>
          </Paper>
        </Stack>
      </Container>

      {/* Quick Create Modal */}
      <QuickCreateModal
        opened={quickCreateOpened}
        onClose={() => setQuickCreateOpened(false)}
        onCreateInvoice={(patientId, companyId) => {
          setPreSelectedPatientId(patientId);
          setPreSelectedCompanyId(companyId);
          setCreateInvoiceModalOpened(true);
        }}
        onCreateQuote={(patientId, companyId) => {
          setPreSelectedPatientId(patientId);
          setPreSelectedCompanyId(companyId);
          setCreateQuoteModalOpened(true);
        }}
      />

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        opened={createInvoiceModalOpened}
        onClose={() => {
          setCreateInvoiceModalOpened(false);
          setPreSelectedPatientId(undefined);
          setPreSelectedCompanyId(undefined);
        }}
        onSuccess={() => {
          setCreateInvoiceModalOpened(false);
          setPreSelectedPatientId(undefined);
          setPreSelectedCompanyId(undefined);
          fetchData();
        }}
        patients={patients}
        companies={companies}
        preSelectedPatientId={preSelectedPatientId}
        preSelectedCompanyId={preSelectedCompanyId}
      />

      {/* Create Quote Modal */}
      <CreateQuoteModal
        opened={createQuoteModalOpened}
        onClose={() => {
          setCreateQuoteModalOpened(false);
          setPreSelectedPatientId(undefined);
          setPreSelectedCompanyId(undefined);
        }}
        onSuccess={() => {
          setCreateQuoteModalOpened(false);
          setPreSelectedPatientId(undefined);
          setPreSelectedCompanyId(undefined);
          fetchData();
        }}
        patients={patients}
        companies={companies}
        preSelectedPatientId={preSelectedPatientId}
        preSelectedCompanyId={preSelectedCompanyId}
      />

      {/* Invoice Detail Modal */}
      {selectedInvoiceId && (
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
            console.log('Delete invoice:', selectedInvoiceId);
          }}
        />
      )}

      {/* Edit Invoice Modal */}
      {selectedInvoiceId && (
        <EditInvoiceModal
          opened={editInvoiceModalOpened}
          onClose={() => {
            setEditInvoiceModalOpened(false);
          }}
          invoiceId={selectedInvoiceId}
          onSuccess={() => {
            setEditInvoiceModalOpened(false);
            setInvoiceDetailModalOpened(false);
            setSelectedInvoiceId(null);
            fetchData();
          }}
        />
      )}

      {/* Quote Detail Modal */}
      {selectedQuoteId && (
        <QuoteDetailModal
          opened={quoteDetailModalOpened}
          onClose={() => {
            setQuoteDetailModalOpened(false);
            setSelectedQuoteId(null);
          }}
          quoteId={selectedQuoteId}
          onEdit={() => {
            console.log('Edit quote:', selectedQuoteId);
          }}
          onDelete={() => {
            console.log('Delete quote:', selectedQuoteId);
          }}
        />
      )}

      {/* Delete Invoice Confirmation Modal */}
      <Modal
        opened={deleteInvoiceModalOpened}
        onClose={() => !deleting && setDeleteInvoiceModalOpened(false)}
        title="Delete Invoice"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete invoice{' '}
            <Text component="span" fw={600}>
              {itemToDelete?.xero_invoice_number}
            </Text>
            ?
          </Text>
          <Text size="sm" c="dimmed">
            Note: This will only delete the invoice from Nexus. The invoice will still exist in Xero until manually deleted there.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => setDeleteInvoiceModalOpened(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteInvoice} loading={deleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Quote Confirmation Modal */}
      <Modal
        opened={deleteQuoteModalOpened}
        onClose={() => !deleting && setDeleteQuoteModalOpened(false)}
        title="Delete Quote"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete quote{' '}
            <Text component="span" fw={600}>
              {itemToDelete?.xero_quote_number}
            </Text>
            ?
          </Text>
          <Text size="sm" c="dimmed">
            Note: This will only delete the quote from Nexus. The quote will still exist in Xero until manually deleted there.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => setDeleteQuoteModalOpened(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteQuote} loading={deleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Navigation>
  );
}

