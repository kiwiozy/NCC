'use client';

import { Modal } from '@mantine/core';
import PatientInvoicesQuotes from '../xero/PatientInvoicesQuotes';

interface AccountsQuotesDialogProps {
  opened: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
}

export default function AccountsQuotesDialog({ opened, onClose, patientId, patientName }: AccountsQuotesDialogProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Accounts | Quotes"
      size="calc(100vw - 80px)"
      centered={false}
      styles={{
        body: {
          height: 'calc(98vh - 60px)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        },
        content: {
          height: '98vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <PatientInvoicesQuotes patientId={patientId} patientName={patientName} />
    </Modal>
  );
}

