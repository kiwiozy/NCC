'use client';

import { Modal, Stack, Group, Text, Badge, Divider, Table, Paper, Button, Loader, Center, Alert } from '@mantine/core';
import { IconExternalLink, IconRefresh, IconEdit, IconTrash, IconFileInvoice } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { formatDateOnlyAU } from '../../utils/dateFormatting';

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
      const response = await fetch(`https://localhost:8000/api/xero-quote-links/${quoteId}/`);
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
      const response = await fetch(`https://localhost:8000/api/xero-quote-links/${quoteId}/convert_to_invoice/`, {
        method: 'POST',
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
        <Group>
          <Text size="lg" fw={600}>Quote Details</Text>
          <Badge color={STATUS_COLORS[normalizedStatus] || 'gray'}>
            {normalizedStatus}
          </Badge>
        </Group>
      }
      size="lg"
    >
      <Stack gap="md">
        {/* Header Info */}
        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Quote Number</Text>
                <Text size="lg" fw={600}>{quote.xero_quote_number}</Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Amount</Text>
                <Text size="lg" fw={600} c="blue">${parseFloat(quote.total).toFixed(2)}</Text>
              </div>
            </Group>

            <Divider my="xs" />

            <Group grow>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Contact</Text>
                <Text>{quote.patient_name || quote.company_name || '—'}</Text>
                {quote.patient_name && quote.company_name && (
                  <Text size="sm" c="dimmed">via {quote.company_name}</Text>
                )}
              </div>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Quote Date</Text>
                <Text>{quote.quote_date ? formatDateOnlyAU(quote.quote_date) : '—'}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Expiry Date</Text>
                <Text>{quote.expiry_date ? formatDateOnlyAU(quote.expiry_date) : '—'}</Text>
              </div>
            </Group>

            {quote.reference && (
              <>
                <Divider my="xs" />
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Reference</Text>
                  <Text>{quote.reference}</Text>
                </div>
              </>
            )}

            {quote.terms && (
              <>
                <Divider my="xs" />
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Terms / Notes</Text>
                  <Text>{quote.terms}</Text>
                </div>
              </>
            )}
          </Stack>
        </Paper>

        {/* Line Items */}
        {quote.line_items && quote.line_items.length > 0 && (
          <Paper p="md" withBorder>
            <Text size="sm" fw={600} mb="md">Line Items</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Description</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Quantity</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Unit Price</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Tax</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {quote.line_items.map((item: any, index: number) => (
                  <Table.Tr key={index}>
                    <Table.Td>{item.description}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{item.quantity}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>${parseFloat(item.unit_amount || 0).toFixed(2)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{item.tax_type || '—'}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      ${(parseFloat(item.unit_amount || 0) * parseFloat(item.quantity || 0)).toFixed(2)}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Divider my="md" />

            <Stack gap="xs" align="flex-end">
              <Group gap="xl">
                <Text size="sm" c="dimmed">Subtotal:</Text>
                <Text size="sm" fw={500}>${parseFloat(quote.subtotal).toFixed(2)}</Text>
              </Group>
              <Group gap="xl">
                <Text size="sm" c="dimmed">Tax:</Text>
                <Text size="sm" fw={500}>${parseFloat(quote.total_tax).toFixed(2)}</Text>
              </Group>
              <Group gap="xl">
                <Text size="lg" fw={700}>Total:</Text>
                <Text size="lg" fw={700} c="blue">${parseFloat(quote.total).toFixed(2)}</Text>
              </Group>
            </Stack>
          </Paper>
        )}

        {/* Actions */}
        <Group justify="space-between">
          <Group>
            <Button
              leftSection={<IconExternalLink size={16} />}
              variant="light"
              onClick={handleOpenInXero}
            >
              Open in Xero
            </Button>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              onClick={fetchQuoteDetails}
            >
              Refresh
            </Button>
            {canConvertToInvoice() && (
              <Button
                leftSection={<IconFileInvoice size={16} />}
                color="green"
                onClick={handleConvertToInvoice}
                loading={converting}
              >
                Convert to Invoice
              </Button>
            )}
          </Group>
          <Group>
            {onEdit && (
              <Button
                leftSection={<IconEdit size={16} />}
                variant="light"
                onClick={handleEdit}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                leftSection={<IconTrash size={16} />}
                color="red"
                variant="light"
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

