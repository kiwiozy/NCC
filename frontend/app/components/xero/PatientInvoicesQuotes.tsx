'use client';

import { useState, useEffect } from 'react';
import { Title, Text, Paper, Table, Badge, Button, Group, Stack, TextInput, Select, Loader, Center, ActionIcon, Tooltip, Tabs, rem, Modal } from '@mantine/core';
import { IconSearch, IconRefresh, IconFileInvoice, IconFileText, IconPlus, IconEye, IconTrash, IconDownload, IconPencil, IconSend, IconFileArrowRight, IconMail, IconPrinter } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { QuoteDetailModal } from './QuoteDetailModal';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { CreateQuoteModal } from './CreateQuoteModal';
import { EditInvoiceModal } from './EditInvoiceModal';
import EmailInvoiceModal from './EmailInvoiceModal';
import PrintInvoiceModal from './PrintInvoiceModal';
import { PatientBillingWizard } from './PatientBillingWizard';
import { formatDateOnlyAU } from '../../utils/dateFormatting';
import { getCsrfToken } from '../../utils/csrf';

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

interface PatientInvoicesQuotesProps {
  patientId?: string;
  patientName?: string;
}

export default function PatientInvoicesQuotes({ patientId, patientName }: PatientInvoicesQuotesProps) {
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
  const [emailModalOpened, setEmailModalOpened] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedEmailItem, setSelectedEmailItem] = useState<any>(null);
  const [selectedEmailType, setSelectedEmailType] = useState<'invoice' | 'receipt' | 'quote'>('invoice');
  
  // Print modal
  const [printModalOpened, setPrintModalOpened] = useState(false);
  const [printPdfUrl, setPrintPdfUrl] = useState<string | null>(null);
  const [printTitle, setPrintTitle] = useState('');
  const [printType, setPrintType] = useState<'invoice' | 'quote'>('invoice');
  
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
  }, [patientId]);

  const fetchPatientsAndCompanies = async () => {
    try {
      const [patientsRes, companiesRes] = await Promise.all([
        fetch('https://localhost:8000/api/patients/', {
          credentials: 'include',
        }),
        fetch('https://localhost:8000/api/companies/', {
          credentials: 'include',
        })
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
        fetch('https://localhost:8000/api/xero-invoice-links/', {
          credentials: 'include',
        }),
        fetch('https://localhost:8000/api/xero-quote-links/', {
          credentials: 'include',
        })
      ]);
      
      if (!invoicesRes.ok || !quotesRes.ok) throw new Error('Failed to fetch data');
      
      const [invoicesData, quotesData] = await Promise.all([
        invoicesRes.json(),
        quotesRes.json()
      ]);
      
      let allInvoices = invoicesData.results || invoicesData;
      let allQuotes = quotesData.results || quotesData;
      
      // Filter by patient ID if provided
      if (patientId) {
        console.log('Filtering for patient ID:', patientId);
        console.log('All invoices before filter:', allInvoices);
        console.log('All quotes before filter:', allQuotes);
        
        allInvoices = allInvoices.filter((inv: XeroInvoiceLink) => {
          // Check if patient is a UUID string or an object with id
          const invoicePatientId = typeof inv.patient === 'string' 
            ? inv.patient 
            : (inv.patient && typeof inv.patient === 'object' ? (inv.patient as any).id : null);
          
          const matches = invoicePatientId === patientId;
          console.log('Invoice:', inv.xero_invoice_number, 'Patient ID:', invoicePatientId, 'Matches:', matches);
          return matches;
        });
        
        allQuotes = allQuotes.filter((quote: XeroQuoteLink) => {
          // Check if patient is a UUID string or an object with id
          const quotePatientId = typeof quote.patient === 'string' 
            ? quote.patient 
            : (quote.patient && typeof quote.patient === 'object' ? (quote.patient as any).id : null);
          
          const matches = quotePatientId === patientId;
          console.log('Quote:', quote.xero_quote_number, 'Patient ID:', quotePatientId, 'Matches:', matches);
          return matches;
        });
        
        console.log('Filtered invoices:', allInvoices);
        console.log('Filtered quotes:', allQuotes);
      }
      
      setInvoices(allInvoices);
      setQuotes(allQuotes);
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
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/xero-invoice-links/${itemToDelete.id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete invoice');
      }
      
      const contentType = response.headers.get('content-type');
      let result = null;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
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
      
      fetchData();
      setDeleteInvoiceModalOpened(false);
      setItemToDelete(null);
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
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
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/xero-quote-links/${itemToDelete.id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
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

  const handleEmailClick = (item: any) => {
    setSelectedEmailItem(item);
    
    if (item.type === 'quote') {
      setSelectedEmailType('quote');
    } else if (item.type === 'invoice') {
      // Check if fully paid
      const amountDue = parseFloat(item.amount_due || '0');
      setSelectedEmailType(amountDue === 0 ? 'receipt' : 'invoice');
    }
    
    setEmailModalOpened(true);
  };
  
  const handlePrintClick = async (item: any) => {
    try {
      const isInvoice = item.type === 'invoice';
      const itemNumber = isInvoice ? item.xero_invoice_number : item.xero_quote_number;
      
      console.log('Print clicked:', {
        type: item.type,
        id: item.id,
        number: itemNumber,
        isInvoice
      });
      
      const endpoint = isInvoice 
        ? `https://localhost:8000/api/invoices/xero/${item.id}/pdf/`
        : `https://localhost:8000/api/invoices/xero/quotes/${item.id}/pdf/`;
      
      console.log('Fetching PDF from:', endpoint);
      
      const response = await fetch(endpoint, {
        credentials: 'include',
      });
      
      console.log('PDF response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF error response:', errorText);
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      console.log('PDF blob created, URL:', url);
      
      setPrintPdfUrl(url);
      setPrintTitle(`${isInvoice ? 'Invoice' : 'Quote'} #${itemNumber}`);
      setPrintType(isInvoice ? 'invoice' : 'quote');
      setPrintModalOpened(true);
    } catch (error) {
      console.error('Error generating PDF for print:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to generate PDF for printing',
        color: 'red',
      });
    }
  };

  const handleAuthorizeInvoice = async (invoiceId: string) => {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/xero-invoice-links/${invoiceId}/authorize/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
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

      await fetchData();
    } catch (error: any) {
      console.error('Error authorizing invoice:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to authorize invoice',
        color: 'red',
      });
    }
  };

  const handleAuthorizeQuote = async (quoteId: string) => {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/xero-quote-links/${quoteId}/authorize/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to authorize quote');
      }

      notifications.show({
        title: 'Success',
        message: 'Quote authorized and sent to Xero',
        color: 'green',
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error authorizing quote:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to authorize quote',
        color: 'red',
      });
    }
  };

  const handleConvertQuoteToInvoice = async (quoteId: string) => {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/xero-quote-links/${quoteId}/convert_to_invoice/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to convert quote');
      }

      notifications.show({
        title: 'Success',
        message: 'Quote converted to invoice successfully',
        color: 'green',
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error converting quote:', error);
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
    if ('patient_name' in item && item.patient_name) {
      return item.patient_name;
    }
    if ('company_name' in item && item.company_name) {
      return item.company_name;
    }
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
                  {item.type === 'invoice' ? 'INVOICE' : 'QUOTE'}
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
                
                {/* Email button */}
                <Tooltip label="Email Invoice/Quote">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => handleEmailClick(item)}
                  >
                    <IconMail size={16} />
                  </ActionIcon>
                </Tooltip>
                
                {/* Print button */}
                <Tooltip label={`Print ${item.type === 'invoice' ? 'Invoice' : 'Quote'}`}>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={() => handlePrintClick(item)}
                  >
                    <IconPrinter size={16} />
                  </ActionIcon>
                </Tooltip>
                
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
                
                {item.type === 'quote' && (item.status === 'DRAFT' || item.status === 'QuoteStatusCodes.DRAFT') && (
                  <Tooltip label="Send to Xero">
                    <ActionIcon
                      variant="subtle"
                      color="teal"
                      onClick={() => handleAuthorizeQuote(item.id)}
                    >
                      <IconSend size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
                
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
                            const response = await fetch(`https://localhost:8000/api/invoices/xero/${item.id}/pdf/`, {
                              credentials: 'include',
                            });
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
                    
                    {/* Receipt button - Only show when invoice is fully paid (amount_due = 0) */}
                    {parseFloat((item as any).amount_due || '0') === 0 && (
                      <Tooltip label="Download Receipt (PAID)">
                        <ActionIcon
                          variant="subtle"
                          color="violet"
                          onClick={async () => {
                            try {
                              const response = await fetch(`https://localhost:8000/api/invoices/xero/${item.id}/pdf/?receipt=true`, {
                                credentials: 'include',
                              });
                              if (!response.ok) throw new Error('Failed to generate receipt');
                              
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Receipt_${(item as any).xero_invoice_number}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                              
                              notifications.show({
                                title: 'Success',
                                message: 'Receipt downloaded! 🧾',
                                color: 'violet',
                              });
                            } catch (error) {
                              console.error('Receipt Error:', error);
                              notifications.show({
                                title: 'Error',
                                message: 'Failed to generate receipt',
                                color: 'red',
                              });
                            }
                          }}
                        >
                          <IconDownload size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
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
                            const response = await fetch(`https://localhost:8000/api/invoices/xero/quotes/${item.id}/pdf/`, {
                              credentials: 'include',
                            });
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
    <Stack gap="lg">
      {/* Action Buttons */}
      <Group justify="flex-end">
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

      {/* Patient Billing Wizard */}
      {patientId && patientName && (
        <PatientBillingWizard
          opened={quickCreateOpened}
          onClose={() => setQuickCreateOpened(false)}
          patientId={patientId}
          patientName={patientName}
          onCreateInvoice={(pId, cId) => {
            setQuickCreateOpened(false);
            setPreSelectedCompanyId(cId);
            setCreateInvoiceModalOpened(true);
          }}
          onCreateQuote={(pId, cId) => {
            setQuickCreateOpened(false);
            setPreSelectedCompanyId(cId);
            setCreateQuoteModalOpened(true);
          }}
        />
      )}

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        opened={createInvoiceModalOpened}
        onClose={() => {
          setCreateInvoiceModalOpened(false);
          setPreSelectedCompanyId(undefined);
        }}
        onSuccess={() => {
          setCreateInvoiceModalOpened(false);
          setPreSelectedCompanyId(undefined);
          fetchData();
        }}
        patients={patients}
        companies={companies}
        preSelectedPatientId={patientId}
        preSelectedCompanyId={preSelectedCompanyId}
      />

      {/* Create Quote Modal */}
      <CreateQuoteModal
        opened={createQuoteModalOpened}
        onClose={() => {
          setCreateQuoteModalOpened(false);
          setPreSelectedCompanyId(undefined);
        }}
        onSuccess={() => {
          setCreateQuoteModalOpened(false);
          setPreSelectedCompanyId(undefined);
          fetchData();
        }}
        patients={patients}
        companies={companies}
        preSelectedPatientId={patientId}
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

      {/* Email Invoice/Quote Modal */}
      <EmailInvoiceModal
        opened={emailModalOpened}
        onClose={() => {
          setEmailModalOpened(false);
          setSelectedEmailItem(null);
        }}
        invoice={selectedEmailItem}
        type={selectedEmailType}
      />
      
      {/* Print Invoice/Quote Modal */}
      <PrintInvoiceModal
        opened={printModalOpened}
        onClose={() => {
          setPrintModalOpened(false);
          if (printPdfUrl) {
            URL.revokeObjectURL(printPdfUrl);
            setPrintPdfUrl(null);
          }
        }}
        pdfUrl={printPdfUrl}
        title={printTitle}
        type={printType}
      />
    </Stack>
  );
}

