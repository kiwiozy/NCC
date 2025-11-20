'use client';

import { Modal, Stack, Group, Text, Badge, Divider, Table, Paper, Button, Loader, Center, Alert } from '@mantine/core';
import { IconExternalLink, IconRefresh, IconEdit, IconTrash, IconFileInvoice } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { formatDateOnlyAU } from '../../utils/dateFormatting';
import { getCsrfToken } from '../../utils/csrf';

interface QuoteDetailModalProps {
  opened: boolean;
  onClose: () => void;
  quoteId: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

interface QuoteDetail {
  id: string;
  xero_quote_id: string;
  xero_quote_number: string;
  status: string;
  total: string;
  subtotal: string;
  total_tax: string;
  quote_date: string | null;
  expiry_date: string | null;
  patient_name?: string;
  company_name?: string;
  line_items?: any[];
  reference?: string;
  terms?: string;
}

const STATUS_COLORS: Record<string, string> = {
  'DRAFT': 'gray',
  'SENT': 'blue',
  'ACCEPTED': 'green',
  'DECLINED': 'red',
  'INVOICED': 'cyan',
};

// Helper function to normalize status (handle legacy "QuoteStatusCodes.DRAFT" format)
const normalizeStatus = (status: string): string => {
  if (status && status.startsWith('QuoteStatusCodes.')) {
    return status.replace('QuoteStatusCodes.', '');
  }
  return status;
};

export function QuoteDetailModal({ opened, onClose, quoteId, onEdit, onDelete }: QuoteDetailModalProps) {
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (opened && quoteId) {
      fetchQuoteDetails();
    }
  }, [opened, quoteId]);

  const fetchQuoteDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://localhost:8000/api/xero-quote-links/${quoteId}/`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch quote details');
      
      const data = await response.json();
      setQuote(data);
    } catch (error) {
      console.error('Error fetching quote details:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load quote details',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getXeroQuoteUrl = (xeroQuoteId: string) => {
    return `https://go.xero.com/Quotes/View.aspx?QuoteID=${xeroQuoteId}`;
  };

  const handleOpenInXero = () => {
    if (quote) {
      window.open(getXeroQuoteUrl(quote.xero_quote_id), '_blank');
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onClose();
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quote) return;
    
    setConverting(true);
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
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Failed to convert quote');
      }
      
      const data = await response.json();
      
      notifications.show({
        title: 'Success',
        message: `Quote converted to invoice ${data.invoice.xero_invoice_number}`,
        color: 'green',
      });
      
      // Refresh quote details to show updated status
      await fetchQuoteDetails();
      
    } catch (error: any) {
      console.error('Error converting quote:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to convert quote to invoice',
        color: 'red',
      });
    } finally {
      setConverting(false);
    }
  };

  const canConvertToInvoice = () => {
    if (!quote) return false;
    const status = normalizeStatus(quote.status);
    return (status === 'SENT' || status === 'ACCEPTED') && status !== 'INVOICED';
  };

  if (loading || !quote) {
    return (
      <Modal opened={opened} onClose={onClose} title="Quote Details" size="lg">
        <Center h={200}>
          <Loader />
        </Center>
      </Modal>
    );
  }

  const normalizedStatus = normalizeStatus(quote.status);

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={
        <Group gap="xs">
          <Text fw={700} size="xl">QUOTE</Text>
          {quote && (
            <Badge size="lg" color={STATUS_COLORS[normalizeStatus(quote.status)] || 'gray'}>
              {normalizeStatus(quote.status)}
            </Badge>
          )}
        </Group>
      }
      size="1200px"
      padding="xl"
    >
      <Stack gap="xl">
        {/* Action Buttons at Top */}
        <Group justify="space-between">
          <Group>
            {canConvertToInvoice() && (
              <Button
                size="md"
                variant="filled"
                color="green"
                leftSection={<IconFileInvoice size={18} />}
                onClick={handleConvertToInvoice}
                loading={converting}
              >
                Convert to Invoice
              </Button>
            )}
          </Group>
          
          <Group>
            <Button
              size="md"
              variant="light"
              leftSection={<IconExternalLink size={18} />}
              component="a"
              href={getXeroQuoteUrl(quote.xero_quote_id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Xero
            </Button>
            
            <Button
              size="md"
              variant="light"
              leftSection={<IconRefresh size={18} />}
              onClick={fetchQuoteDetails}
            >
              Refresh
            </Button>
            
            <Button size="md" onClick={onClose}>
              Close
            </Button>
          </Group>
        </Group>

        {/* Quote Header - Like a real quote */}
        <Paper p="xl" withBorder radius="md" style={{ borderTop: '4px solid #9775fa' }}>
          <Group justify="space-between" align="flex-start">
            {/* Left: Contact */}
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Contact</Text>
              {quote.patient_name && (
                <Text fw={600} size="lg">{quote.patient_name}</Text>
              )}
              {quote.company_name && (
                <Text fw={500} size="sm" c="dimmed">via {quote.company_name}</Text>
              )}
            </Stack>

            {/* Right: Quote Details */}
            <Stack gap="xs" style={{ flex: 1 }} align="flex-end">
              <Group gap="xs" justify="flex-end">
                <Text size="sm" c="dimmed">Quote #</Text>
                <Text fw={700} size="xl">{quote.xero_quote_number}</Text>
              </Group>
              <Group gap="xs" justify="flex-end">
                <Text size="sm" c="dimmed">Quote Date:</Text>
                <Text fw={500}>{quote.quote_date ? formatDateOnlyAU(quote.quote_date) : '—'}</Text>
              </Group>
              <Group gap="xs" justify="flex-end">
                <Text size="sm" c="dimmed">Expiry Date:</Text>
                <Text fw={500}>{quote.expiry_date ? formatDateOnlyAU(quote.expiry_date) : '—'}</Text>
              </Group>
            </Stack>
          </Group>
        </Paper>

        {/* Line Items */}
        {quote.line_items && quote.line_items.length > 0 && (
          <Paper p="md" withBorder radius="md">
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr style={{ 
                  backgroundColor: 'var(--mantine-color-dark-6)',
                }}>
                  <Table.Th style={{ color: 'white' }}>Description</Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: 'white' }}>Quantity</Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: 'white' }}>Unit Price</Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: 'white' }}>Tax</Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: 'white' }}>Amount</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {quote.line_items.map((item: any, index: number) => (
                  <Table.Tr key={index}>
                    <Table.Td>{item.description}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{item.quantity}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>${parseFloat(item.unit_amount || 0).toFixed(2)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {item.tax_type === 'EXEMPTOUTPUT' && 'EXEMPT'}
                      {item.tax_type === 'OUTPUT' && 'GST'}
                      {!item.tax_type && '—'}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ${(parseFloat(item.unit_amount || 0) * parseFloat(item.quantity || 0)).toFixed(2)}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Divider my="lg" />

            <Group justify="flex-end" mb="md">
              <Stack gap="sm" style={{ minWidth: '300px' }}>
                <Group justify="space-between">
                  <Text size="md">Subtotal</Text>
                  <Text size="md" fw={500}>${parseFloat(quote.subtotal).toFixed(2)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="md">Tax</Text>
                  <Text size="md" fw={500}>${parseFloat(quote.total_tax).toFixed(2)}</Text>
                </Group>
                <Divider />
                <Group justify="space-between">
                  <Text size="xl" fw={700}>TOTAL</Text>
                  <Text size="xl" fw={700} c="violet">${parseFloat(quote.total).toFixed(2)} AUD</Text>
                </Group>
              </Stack>
            </Group>
          </Paper>
        )}
      </Stack>
    </Modal>
  );
}

