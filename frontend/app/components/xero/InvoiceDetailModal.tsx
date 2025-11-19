'use client';

import { Modal, Stack, Group, Text, Badge, Divider, Table, Paper, Button, Loader, Center } from '@mantine/core';
import { IconExternalLink, IconRefresh, IconEdit, IconTrash, IconAlertTriangle, IconDownload, IconCurrencyDollar } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { formatDateOnlyAU } from '../../utils/dateFormatting';
import { PaymentModal } from './PaymentModal';
import { getCsrfToken } from '../../utils/csrf';

interface InvoiceDetailModalProps {
  opened: boolean;
  onClose: () => void;
  invoiceId: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

interface InvoiceDetail {
  id: string;
  xero_invoice_id: string;
  xero_invoice_number: string;
  status: string;
  total: string;
  subtotal: string;
  total_tax: string;
  amount_due: string;
  amount_paid: string;
  currency: string;
  invoice_date: string | null;
  due_date: string | null;
  patient_name?: string;
  company_name?: string;
  line_items?: any[];
}

interface Payment {
  id: string;
  xero_payment_id: string;
  amount: string;
  payment_date: string;
  reference: string;
  account_code: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  'DRAFT': 'gray',
  'SUBMITTED': 'blue',
  'AUTHORISED': 'cyan',
  'PAID': 'green',
  'VOIDED': 'red',
  'DELETED': 'red',
};

export function InvoiceDetailModal({ opened, onClose, invoiceId, onEdit, onDelete }: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (opened && invoiceId) {
      fetchInvoiceDetails();
      fetchPayments();
    }
  }, [opened, invoiceId]);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://localhost:8000/api/xero-invoice-links/${invoiceId}/`);
      if (!response.ok) throw new Error('Failed to fetch invoice details');
      
      const data = await response.json();
      setInvoice(data);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load invoice details',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const response = await fetch(`https://localhost:8000/api/xero/payments/?invoice_link=${invoiceId}`);
      if (!response.ok) throw new Error('Failed to fetch payments');
      
      const data = await response.json();
      setPayments(data.results || data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      // Don't show error notification for payments, just log it
    } finally {
      setLoadingPayments(false);
    }
  };

  const handlePaymentSuccess = () => {
    // Refresh invoice details and payments
    fetchInvoiceDetails();
    fetchPayments();
  };

  const getXeroInvoiceUrl = (xeroInvoiceId: string) => {
    return `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${xeroInvoiceId}`;
  };

  const handleDelete = async () => {
    if (!invoice) return;
    
    setDeleting(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/xero/invoices/${invoice.xero_invoice_id}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete invoice');
      }
      
      notifications.show({
        title: 'Success',
        message: 'Invoice deleted successfully',
        color: 'green',
      });
      
      setDeleteConfirmOpened(false);
      if (onDelete) {
        onDelete();
      }
      onClose();
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

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    
    setDownloadingPDF(true);
    try {
      const response = await fetch(`https://localhost:8000/api/invoices/xero/${invoiceId}/pdf/`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      // Get the PDF blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.xero_invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      notifications.show({
        title: 'Success',
        message: 'Invoice PDF downloaded successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to generate PDF',
        color: 'red',
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadDebugPDF = async () => {
    if (!invoice) return;
    
    setDownloadingPDF(true);
    try {
      const response = await fetch(`https://localhost:8000/api/invoices/xero/${invoiceId}/pdf/?debug=true`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      // Get the PDF blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.xero_invoice_number}_DEBUG.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      notifications.show({
        title: 'Success',
        message: 'Debug PDF downloaded successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to generate PDF',
        color: 'red',
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Group gap="xs">
            <Text fw={700} size="xl">INVOICE</Text>
            {invoice && (
              <Badge size="lg" color={STATUS_COLORS[invoice.status] || 'gray'}>
                {invoice.status}
              </Badge>
            )}
          </Group>
        }
        size="1200px"
        padding="xl"
      >
      {loading ? (
        <Center p="xl">
          <Loader />
        </Center>
      ) : invoice ? (
        <Stack gap="xl">
          {/* Action Buttons at Top */}
          <Group justify="space-between">
            <Group>
              {/* Record Payment Button - Show for AUTHORISED or SUBMITTED invoices with amount due */}
              {['AUTHORISED', 'SUBMITTED'].includes(invoice.status) && parseFloat(invoice.amount_due) > 0 && (
                <Button
                  size="md"
                  variant="filled"
                  color="teal"
                  leftSection={<IconCurrencyDollar size={18} />}
                  onClick={() => setPaymentModalOpened(true)}
                >
                  Record Payment
                </Button>
              )}
              
              {onEdit && invoice.status === 'DRAFT' && (
                <Button
                  size="md"
                  variant="light"
                  color="blue"
                  leftSection={<IconEdit size={18} />}
                  onClick={onEdit}
                >
                  Edit Invoice
                </Button>
              )}
              
              {invoice.status === 'DRAFT' && (
                <Button
                  size="md"
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={18} />}
                  onClick={() => setDeleteConfirmOpened(true)}
                >
                  Delete Invoice
                </Button>
              )}
            </Group>
            
            <Group>
              <Button
                size="md"
                variant="light"
                leftSection={<IconDownload size={18} />}
                onClick={handleDownloadPDF}
                loading={downloadingPDF}
              >
                Download PDF
              </Button>
              
              <Button
                size="md"
                variant="light"
                leftSection={<IconExternalLink size={18} />}
                component="a"
                href={getXeroInvoiceUrl(invoice.xero_invoice_id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Xero
              </Button>
              
              <Button
                size="md"
                variant="light"
                leftSection={<IconRefresh size={18} />}
                onClick={fetchInvoiceDetails}
              >
                Refresh
              </Button>
              
              <Button size="md" onClick={onClose}>
                Close
              </Button>
            </Group>
          </Group>

          {/* Invoice Header - Like a real invoice */}
          <Paper p="xl" withBorder radius="md" style={{ borderTop: '4px solid #228be6' }}>
            <Group justify="space-between" align="flex-start">
              {/* Left: Bill To */}
              <Stack gap="xs" style={{ flex: 1 }}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Bill To</Text>
                {invoice.patient_name && (
                  <Text fw={600} size="lg">{invoice.patient_name}</Text>
                )}
                {invoice.company_name && (
                  <Text fw={500} size="sm" c="dimmed">{invoice.company_name}</Text>
                )}
              </Stack>

              {/* Right: Invoice Details */}
              <Stack gap="xs" style={{ flex: 1 }} align="flex-end">
                <Group gap="xs" justify="flex-end">
                  <Text size="sm" c="dimmed">Invoice #</Text>
                  <Text fw={700} size="xl">{invoice.xero_invoice_number}</Text>
                </Group>
                <Group gap="xs" justify="flex-end">
                  <Text size="sm" c="dimmed">Invoice Date:</Text>
                  <Text fw={500}>{invoice.invoice_date ? formatDateOnlyAU(invoice.invoice_date) : '—'}</Text>
                </Group>
                <Group gap="xs" justify="flex-end">
                  <Text size="sm" c="dimmed">Due Date:</Text>
                  <Text fw={500} c={new Date(invoice.due_date || '') < new Date() ? 'red' : undefined}>
                    {invoice.due_date ? formatDateOnlyAU(invoice.due_date) : '—'}
                  </Text>
                </Group>
              </Stack>
            </Group>
          </Paper>

          {/* Line Items Table */}
          {invoice.line_items && invoice.line_items.length > 0 && (
            <Paper p="md" withBorder radius="md">
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr style={{ 
                    backgroundColor: 'var(--mantine-color-dark-6)',
                  }}>
                    <Table.Th style={{ 
                      width: '50%',
                      color: 'var(--mantine-color-gray-3)',
                      fontWeight: 400,
                      fontSize: '14px'
                    }}>Description</Table.Th>
                    <Table.Th ta="center" style={{ 
                      color: 'var(--mantine-color-gray-3)',
                      fontWeight: 400,
                      fontSize: '14px'
                    }}>Quantity</Table.Th>
                    <Table.Th ta="right" style={{ 
                      color: 'var(--mantine-color-gray-3)',
                      fontWeight: 400,
                      fontSize: '14px'
                    }}>Unit Price</Table.Th>
                    <Table.Th ta="right" style={{ 
                      color: 'var(--mantine-color-gray-3)',
                      fontWeight: 400,
                      fontSize: '14px'
                    }}>Tax</Table.Th>
                    {invoice.line_items.some((item: any) => item.discount && item.discount > 0) && (
                      <Table.Th ta="right" style={{ 
                        color: 'var(--mantine-color-gray-3)',
                        fontWeight: 400,
                        fontSize: '14px'
                      }}>Discount</Table.Th>
                    )}
                    <Table.Th ta="right" style={{ 
                      color: 'var(--mantine-color-gray-3)',
                      fontWeight: 400,
                      fontSize: '14px'
                    }}>Amount</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {invoice.line_items.map((item: any, index: number) => {
                    const lineTotal = item.quantity * item.unit_amount;
                    const discount = item.discount ? (lineTotal * item.discount / 100) : 0;
                    const afterDiscount = lineTotal - discount;
                    
                    return (
                      <Table.Tr key={index}>
                        <Table.Td>
                          <div>
                            <Text fw={500}>{item.description}</Text>
                            {item.item_code && (
                              <Text size="xs" c="dimmed">Code: {item.item_code}</Text>
                            )}
                          </div>
                        </Table.Td>
                        <Table.Td ta="center">{item.quantity}</Table.Td>
                        <Table.Td ta="right">${parseFloat(item.unit_amount).toFixed(2)}</Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" c="dimmed">{item.tax_type || '—'}</Text>
                        </Table.Td>
                        {invoice.line_items.some((i: any) => i.discount && i.discount > 0) && (
                          <Table.Td ta="right">
                            {item.discount > 0 ? (
                              <Text c="red">{item.discount}%</Text>
                            ) : '—'}
                          </Table.Td>
                        )}
                        <Table.Td ta="right">
                          <Text fw={600}>${afterDiscount.toFixed(2)}</Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Paper>
          )}

          {/* Financial Summary - Right Aligned Like Invoice */}
          <Group justify="flex-end">
            <Paper p="lg" withBorder radius="md" style={{ minWidth: 350 }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text c="dimmed">Subtotal</Text>
                  <Text fw={500}>${parseFloat(invoice.subtotal || '0').toFixed(2)}</Text>
                </Group>
                
                <Group justify="space-between">
                  <Text c="dimmed">Tax</Text>
                  <Text fw={500}>${parseFloat(invoice.total_tax || '0').toFixed(2)}</Text>
                </Group>
                
                <Divider />
                
                <Group justify="space-between">
                  <Text fw={700} size="lg">TOTAL</Text>
                  <Text fw={700} size="xl">${parseFloat(invoice.total || '0').toFixed(2)} {invoice.currency}</Text>
                </Group>
                
                <Divider />
                
                <Group justify="space-between">
                  <Text c="dimmed">Amount Paid</Text>
                  <Text c="green" fw={600}>${parseFloat(invoice.amount_paid || '0').toFixed(2)}</Text>
                </Group>
                
                <Group justify="space-between">
                  <Text fw={700} size="lg" c="orange">Amount Due</Text>
                  <Text fw={700} size="xl" c="orange">${parseFloat(invoice.amount_due || '0').toFixed(2)}</Text>
                </Group>
              </Stack>
            </Paper>
          </Group>

          {/* Payment History */}
          {payments.length > 0 && (
            <Paper p="md" withBorder radius="md">
              <Stack gap="md">
                <Text fw={700} size="lg">Payment History</Text>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Date</Table.Th>
                      <Table.Th ta="right">Amount</Table.Th>
                      <Table.Th>Reference</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {payments.map((payment) => (
                      <Table.Tr key={payment.id}>
                        <Table.Td>{formatDateOnlyAU(payment.payment_date)}</Table.Td>
                        <Table.Td ta="right">
                          <Text c="green" fw={600}>
                            ${parseFloat(payment.amount).toFixed(2)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{payment.reference || '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={payment.status === 'AUTHORISED' ? 'green' : 'gray'} size="sm">
                            {payment.status}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                <Group justify="space-between" p="md" style={{ 
                  backgroundColor: 'var(--mantine-color-dark-6)', 
                  borderRadius: 4,
                  marginTop: 8
                }}>
                  <Text fw={600} c="dimmed">Total Paid:</Text>
                  <Text fw={700} size="lg" c="green">
                    ${payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                  </Text>
                </Group>
              </Stack>
            </Paper>
          )}
        </Stack>
      ) : (
        <Text c="dimmed">No invoice data available</Text>
      )}
    </Modal>

    {/* Payment Modal */}
    {invoice && (
      <PaymentModal
        opened={paymentModalOpened}
        onClose={() => setPaymentModalOpened(false)}
        invoice={{
          id: invoice.id,
          xero_invoice_number: invoice.xero_invoice_number,
          amount_due: invoice.amount_due,
          currency: invoice.currency
        }}
        onSuccess={handlePaymentSuccess}
      />
    )}
    
    {/* Delete Confirmation Modal */}
    <Modal
      opened={deleteConfirmOpened}
      onClose={() => setDeleteConfirmOpened(false)}
      title={
        <Group gap="xs">
          <IconAlertTriangle size={24} color="red" />
          <Text fw={600}>Delete Invoice</Text>
        </Group>
      }
      centered
    >
      <Stack gap="md">
        <Text>
          Are you sure you want to delete invoice <Text component="span" fw={600}>{invoice?.xero_invoice_number}</Text>? 
          This will void the invoice in Xero.
        </Text>
        
        <Group justify="flex-end" gap="sm">
          <Button
            variant="subtle"
            onClick={() => setDeleteConfirmOpened(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleDelete}
            loading={deleting}
            leftSection={<IconTrash size={16} />}
          >
            Delete Invoice
          </Button>
        </Group>
      </Stack>
    </Modal>
  </>
  );
}

