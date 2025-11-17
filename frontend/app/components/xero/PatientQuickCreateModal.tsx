'use client';

import { Modal, Stack, Group, Text, Button, Radio, Paper, Stepper } from '@mantine/core';
import { IconFileInvoice, IconFileText } from '@tabler/icons-react';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';

interface PatientQuickCreateModalProps {
  opened: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onCreateInvoice?: (patientId: string) => void;
  onCreateQuote?: (patientId: string) => void;
}

export function PatientQuickCreateModal({ 
  opened, 
  onClose, 
  patientId, 
  patientName,
  onCreateInvoice, 
  onCreateQuote 
}: PatientQuickCreateModalProps) {
  const [documentType, setDocumentType] = useState<'invoice' | 'quote'>('invoice');
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    if (documentType === 'invoice' && onCreateInvoice) {
      onCreateInvoice(patientId);
    } else if (documentType === 'quote' && onCreateQuote) {
      onCreateQuote(patientId);
    }
    handleClose();
  };

  const handleClose = () => {
    setDocumentType('invoice');
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Text fw={600}>Create Invoice or Quote</Text>}
      size="md"
      centered
    >
      <Stack gap="lg">
        {/* Patient Info */}
        <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
          <Group>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Patient</Text>
              <Text fw={600}>{patientName}</Text>
            </div>
          </Group>
        </Paper>

        {/* Document Type Selection */}
        <Stack gap="md">
          <Text size="sm" c="dimmed">What would you like to create?</Text>
          <Radio.Group value={documentType} onChange={(val) => setDocumentType(val as 'invoice' | 'quote')}>
            <Stack gap="sm">
              <Paper 
                p="md" 
                withBorder 
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: documentType === 'invoice' ? '#e7f5ff' : undefined,
                  borderColor: documentType === 'invoice' ? '#228be6' : undefined,
                }} 
                onClick={() => setDocumentType('invoice')}
              >
                <Radio
                  value="invoice"
                  label={
                    <Group gap="sm">
                      <IconFileInvoice size={24} />
                      <div>
                        <Text fw={500}>Invoice</Text>
                        <Text size="xs" c="dimmed">Create an invoice for services provided</Text>
                      </div>
                    </Group>
                  }
                />
              </Paper>
              
              <Paper 
                p="md" 
                withBorder 
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: documentType === 'quote' ? '#e7f5ff' : undefined,
                  borderColor: documentType === 'quote' ? '#228be6' : undefined,
                }} 
                onClick={() => setDocumentType('quote')}
              >
                <Radio
                  value="quote"
                  label={
                    <Group gap="sm">
                      <IconFileText size={24} />
                      <div>
                        <Text fw={500}>Quote</Text>
                        <Text size="xs" c="dimmed">Create a quote for upcoming services</Text>
                      </div>
                    </Group>
                  }
                />
              </Paper>
            </Stack>
          </Radio.Group>
        </Stack>

        {/* Action Buttons */}
        <Group justify="space-between" mt="xl">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={creating}>
            Create {documentType === 'invoice' ? 'Invoice' : 'Quote'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

