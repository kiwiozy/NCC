'use client';

import { Modal, Stack, Group, Text, Badge, Divider, Table, Paper, Button, Loader, Center } from '@mantine/core';
import { IconExternalLink, IconRefresh, IconEdit, IconTrash, IconAlertTriangle, IconDownload, IconCurrencyDollar } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { formatDateOnlyAU } from '../../utils/dateFormatting';
import { PaymentModal } from './PaymentModal';

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
      const response = await fetch(`https://localhost:8000/api/xero/invoices/${invoice.xero_invoice_id}/delete/`, {
        method: 'DELETE',
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
            <Text fw={600}>Invoice Details</Text>
            {invoice && (
              <Badge color={STATUS_COLORS[invoice.status] || 'gray'}>
                {invoice.status}
              </Badge>
            )}
          </Group>
        }
        size="1480px"
      >
      {loading ? (
        <Center p="xl">
          <Loader />
        </Center>
      ) : invoice ? (
        <Stack gap="md">
          {/* Invoice Header */}
          <Paper p="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Invoice Number</Text>
                <Text fw={600} size="lg">{invoice.xero_invoice_number}</Text>
              </Group>
              
              <Divider />
              
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Invoice Date</Text>
                <Text>{invoice.invoice_date ? formatDateOnlyAU(invoice.invoice_date) : '—'}</Text>
              </Group>
              
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Due Date</Text>
                <Text>{invoice.due_date ? formatDateOnlyAU(invoice.due_date) : '—'}</Text>
              </Group>
              
              {invoice.patient_name && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Patient</Text>
                  <Text>{invoice.patient_name}</Text>
                </Group>
              )}
              
              {invoice.company_name && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Company</Text>
                  <Text>{invoice.company_name}</Text>
                </Group>
              )}
            </Stack>
          </Paper>

          {/* Financial Summary */}
          <Paper p="md" withBorder>
            <Stack gap="xs">
              <Text fw={600} mb="xs">Financial Summary</Text>
              
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Subtotal</Text>
                <Text>${parseFloat(invoice.subtotal || '0').toFixed(2)}</Text>
              </Group>
              
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Tax</Text>
                <Text>${parseFloat(invoice.total_tax || '0').toFixed(2)}</Text>
              </Group>
              
              <Divider />
              
              <Group justify="space-between">
                <Text fw={600}>Total</Text>
                <Text fw={600} size="lg">${parseFloat(invoice.total || '0').toFixed(2)} {invoice.currency}</Text>
              </Group>
              
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Amount Paid</Text>
                <Text c="green">${parseFloat(invoice.amount_paid || '0').toFixed(2)}</Text>
              </Group>
              
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Amount Due</Text>
                <Text c="orange" fw={600}>${parseFloat(invoice.amount_due || '0').toFixed(2)}</Text>
              </Group>
            </Stack>
          </Paper>

          {/* Actions */}
          <Group justify="space-between">
            <Group>
              {/* Record Payment Button - Show for AUTHORISED or SUBMITTED invoices with amount due */}
              {['AUTHORISED', 'SUBMITTED'].includes(invoice.status) && parseFloat(invoice.amount_due) > 0 && (
                <Button
                  variant="filled"
                  color="teal"
                  leftSection={<IconCurrencyDollar size={16} />}
                  onClick={() => setPaymentModalOpened(true)}
                >
                  Record Payment
                </Button>
              )}
              
              <Button
                variant="light"
                leftSection={<IconDownload size={16} />}
                onClick={handleDownloadPDF}
                loading={downloadingPDF}
              >
                Download PDF
              </Button>
              
              <Button
                variant="light"
                color="orange"
                leftSection={<IconDownload size={16} />}
                onClick={handleDownloadDebugPDF}
                loading={downloadingPDF}
              >
                Debug Layout
              </Button>
              
              <Button
                variant="light"
                leftSection={<IconExternalLink size={16} />}
                component="a"
                href={getXeroInvoiceUrl(invoice.xero_invoice_id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Xero
              </Button>
              
              {onEdit && invoice.status === 'DRAFT' && (
                <Button
                  variant="light"
                  color="blue"
                  leftSection={<IconEdit size={16} />}
                  onClick={onEdit}
                >
                  Edit Invoice
                </Button>
              )}
              
              {invoice.status === 'DRAFT' && (
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => setDeleteConfirmOpened(true)}
                >
                  Delete Invoice
                </Button>
              )}
            </Group>
            
            <Group>
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={fetchInvoiceDetails}
              >
                Refresh
              </Button>
              <Button onClick={onClose}>
                Close
              </Button>
            </Group>
          </Group>

          {/* Payment History */}
          {payments.length > 0 && (
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Text fw={600}>Payment History</Text>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Amount</Table.Th>
                      <Table.Th>Reference</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {payments.map((payment) => (
                      <Table.Tr key={payment.id}>
                        <Table.Td>{formatDateOnlyAU(payment.payment_date)}</Table.Td>
                        <Table.Td>
                          <Text c="green" fw={500}>
                            ${parseFloat(payment.amount).toFixed(2)}
                          </Text>
                        </Table.Td>
                        <Table.Td>{payment.reference || '—'}</Table.Td>
                        <Table.Td>
                          <Badge color={payment.status === 'AUTHORISED' ? 'green' : 'gray'}>
                            {payment.status}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>Total Paid:</Text>
                  <Text size="lg" fw={700} c="green">
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

