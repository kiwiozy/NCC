'use client';

import { Modal, Button, Group, Text } from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';
import { isSafari } from '../../utils/isSafari';
import { useEffect } from 'react';

interface PrintInvoiceModalProps {
  opened: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  title: string;
  type: 'invoice' | 'quote';
}

export default function PrintInvoiceModal({ opened, onClose, pdfUrl, title, type }: PrintInvoiceModalProps) {
  
  // Auto-trigger print on non-Safari browsers
  useEffect(() => {
    if (opened && pdfUrl && !isSafari()) {
      // Wait for iframe to load
      const timer = setTimeout(() => {
        const iframe = document.querySelector('iframe[title="PDF Print Preview"]') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.print();
          } catch (error) {
            console.error('Error triggering print:', error);
          }
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [opened, pdfUrl]);
  
  const handlePrint = () => {
    if (isSafari()) {
      // Safari: Open in new tab (more reliable)
      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
      }
    } else {
      // Chrome/Firefox/Edge: Print from iframe
      const iframe = document.querySelector('iframe[title="PDF Print Preview"]') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.print();
        } catch (error) {
          console.error('Error printing from iframe:', error);
          // Fallback to window.print()
          window.print();
        }
      } else {
        window.print();
      }
    }
  };
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Print ${title}`}
      size="xl"
      styles={{
        content: { height: '90vh' },
      }}
    >
      {pdfUrl && (
        <>
          <Group justify="space-between" mb="md">
            {isSafari() ? (
              <Text size="sm" c="dimmed">
                Press <strong>⌘+P</strong> (or <strong>Ctrl+P</strong>) to print the PDF, or use the button below.
              </Text>
            ) : (
              <Text size="sm" c="dimmed">
                The print dialog should open automatically. If it doesn't, click the Print button below.
              </Text>
            )}
            <Button 
              leftSection={<IconPrinter size={16} />}
              onClick={handlePrint}
            >
              Print
            </Button>
          </Group>
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: 'calc(100% - 60px)',
              border: 'none',
            }}
            title="PDF Print Preview"
          />
        </>
      )}
    </Modal>
  );
}

