'use client';

import { Modal, Stack, Group, Text, Badge, Button, Loader, Center } from '@mantine/core';
import { IconDownload, IconCurrencyDollar } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
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
  amount_due: string;
  amount_paid: string;
  currency: string;
}

const STATUS_COLORS: Record<string, string> = {
  'DRAFT': 'gray',
  'SUBMITTED': 'blue',
  'AUTHORISED': 'cyan',
  'PAID': 'green',
  'VOIDED': 'red',
  'DELETED': 'red',
};

export function InvoiceDetailModal({ opened, onClose, invoiceId }: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    if (opened && invoiceId) {
      fetchInvoiceDetails();
      generatePdfPreview();
    } else {
      // Clean up PDF URL when modal closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }
  }, [opened, invoiceId]);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://localhost:8000/api/xero-invoice-links/${invoiceId}/`, {
        credentials: 'include',
      });
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

  const generatePdfPreview = async () => {
    setLoadingPdf(true);
    try {
      const response = await fetch(`https://localhost:8000/api/invoices/xero/${invoiceId}/pdf/`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load PDF preview',
        color: 'red',
      });
    } finally {
      setLoadingPdf(false);
    }
  };

  const handlePaymentSuccess = () => {
    // Refresh invoice details and PDF
    fetchInvoiceDetails();
    generatePdfPreview();
  };

  const handleDownloadPDF = async () => {
    if (!invoice || !pdfUrl) return;
    
    try {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `Invoice_${invoice.xero_invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
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
        message: 'Failed to download PDF',
        color: 'red',
      });
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
        size="xl"
        styles={{
          body: { height: '85vh', overflow: 'hidden' },
          content: { height: '90vh' },
        }}
      >
        {loading || loadingPdf ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : invoice ? (
          <Stack gap="md" style={{ height: '100%' }}>
            {/* Action Buttons at Top */}
            <Group justify="space-between">
              <Group>
                {/* Record Payment Button - Show for AUTHORISED or SUBMITTED invoices with amount due */}
                {['AUTHORISED', 'SUBMITTED'].includes(invoice.status) && parseFloat(invoice.amount_due) > 0 && (
                  <Button
                    size="sm"
                    variant="filled"
                    color="teal"
                    leftSection={<IconCurrencyDollar size={16} />}
                    onClick={() => setPaymentModalOpened(true)}
                  >
                    Record Payment
                  </Button>
                )}
              </Group>
              
              <Group>
                <Button
                  size="sm"
                  variant="light"
                  leftSection={<IconDownload size={16} />}
                  onClick={handleDownloadPDF}
                >
                  Download PDF
                </Button>
                
                <Button size="sm" onClick={onClose}>
                  Close
                </Button>
              </Group>
            </Group>

            {/* PDF Preview */}
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                style={{
                  width: '100%',
                  height: 'calc(100% - 60px)',
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: '4px',
                }}
                title="Invoice PDF Preview"
              />
            ) : (
              <Center style={{ flex: 1 }}>
                <Text c="dimmed">PDF preview not available</Text>
              </Center>
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
    </>
  );
}
