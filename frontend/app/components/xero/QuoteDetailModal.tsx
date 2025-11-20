'use client';

import { Modal, Stack, Group, Text, Badge, Button, Loader, Center } from '@mantine/core';
import { IconFileInvoice } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
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

export function QuoteDetailModal({ opened, onClose, quoteId }: QuoteDetailModalProps) {
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    if (opened && quoteId) {
      fetchQuoteDetails();
      generatePdfPreview();
    } else {
      // Clean up PDF URL when modal closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
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

  const generatePdfPreview = async () => {
    setLoadingPdf(true);
    try {
      const response = await fetch(`https://localhost:8000/api/invoices/xero/quotes/${quoteId}/pdf/`, {
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
      await generatePdfPreview();
      
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
      ) : quote ? (
        <Stack gap="md" style={{ height: '100%' }}>
          {/* Action Buttons at Top */}
          <Group justify="flex-start">
            {canConvertToInvoice() && (
              <Button
                size="sm"
                variant="filled"
                color="green"
                leftSection={<IconFileInvoice size={16} />}
                onClick={handleConvertToInvoice}
                loading={converting}
              >
                Convert to Invoice
              </Button>
            )}
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
              title="Quote PDF Preview"
            />
          ) : (
            <Center style={{ flex: 1 }}>
              <Text c="dimmed">PDF preview not available</Text>
            </Center>
          )}
        </Stack>
      ) : (
        <Text c="dimmed">No quote data available</Text>
      )}
    </Modal>
  );
}
