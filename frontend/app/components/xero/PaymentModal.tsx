'use client';

import { Modal, Stack, Group, Button, NumberInput, TextInput, Select, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { IconCurrencyDollar } from '@tabler/icons-react';
import { getCsrfToken } from '../../utils/csrf';

interface PaymentModalProps {
  opened: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    xero_invoice_number: string;
    amount_due: string;
    currency: string;
  };
  onSuccess: () => void;
}

interface BankAccount {
  code: string;
  name: string;
}

export function PaymentModal({ opened, onClose, invoice, onSuccess }: PaymentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Initialize payment amount to amount due
  useEffect(() => {
    if (opened && invoice) {
      const amountDue = parseFloat(invoice.amount_due);
      setPaymentAmount(amountDue);
      setReference(`Payment for ${invoice.xero_invoice_number}`);
    }
  }, [opened, invoice]);

  // Fetch bank accounts from Xero
  useEffect(() => {
    if (opened) {
      fetchBankAccounts();
    }
  }, [opened]);

  const fetchBankAccounts = async () => {
    setLoadingAccounts(true);
    try {
      // For now, use common bank account codes
      // In a full implementation, you would fetch these from Xero API
      const defaultAccounts: BankAccount[] = [
        { code: '090', name: 'Business Bank Account' },
        { code: '091', name: 'Business Savings Account' },
        { code: '092', name: 'Credit Card' },
      ];
      setBankAccounts(defaultAccounts);
      if (defaultAccounts.length > 0) {
        setSelectedAccount(defaultAccounts[0].code);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      notifications.show({
        title: 'Warning',
        message: 'Using default bank accounts',
        color: 'yellow',
      });
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleCreatePayment = async () => {
    // Validation
    if (!paymentAmount || paymentAmount <= 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Payment amount must be greater than 0',
        color: 'red',
      });
      return;
    }

    const amountDue = parseFloat(invoice.amount_due);
    if (paymentAmount > amountDue) {
      notifications.show({
        title: 'Validation Error',
        message: `Payment amount cannot exceed amount due ($${amountDue.toFixed(2)})`,
        color: 'red',
      });
      return;
    }

    if (!selectedAccount) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a bank account',
        color: 'red',
      });
      return;
    }

    if (!paymentDate) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a payment date',
        color: 'red',
      });
      return;
    }

    setCreating(true);
    try {
      // Format date as YYYY-MM-DD
      const formattedDate = paymentDate.toISOString().split('T')[0];

      const csrfToken = await getCsrfToken();
      const response = await fetch('https://localhost:8000/api/xero/payments/create_single_payment/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          invoice_link_id: invoice.id,
          amount: paymentAmount.toString(),
          payment_date: formattedDate,
          account_code: selectedAccount,
          reference: reference || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Failed to create payment');
      }

      const data = await response.json();
      console.log('Payment created:', data);

      notifications.show({
        title: 'Success',
        message: `Payment of $${paymentAmount.toFixed(2)} recorded successfully`,
        color: 'green',
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating payment:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create payment',
        color: 'red',
      });
    } finally {
      setCreating(false);
    }
  };

  const amountDue = parseFloat(invoice.amount_due);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Record Payment - ${invoice.xero_invoice_number}`}
      size="md"
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Amount Due:</Text>
          <Text size="lg" fw={700} c="blue">
            ${amountDue.toFixed(2)} {invoice.currency}
          </Text>
        </Group>

        <NumberInput
          label="Payment Amount"
          placeholder="0.00"
          value={paymentAmount}
          onChange={(val) => setPaymentAmount(typeof val === 'number' ? val : 0)}
          min={0}
          max={amountDue}
          decimalScale={2}
          fixedDecimalScale
          prefix="$"
          required
          leftSection={<IconCurrencyDollar size={16} />}
        />

        <DateInput
          label="Payment Date"
          placeholder="Select date"
          value={paymentDate}
          onChange={(val) => setPaymentDate(val || new Date())}
          required
          maxDate={new Date()}
        />

        <Select
          label="Bank Account"
          placeholder="Select bank account"
          value={selectedAccount}
          onChange={(val) => setSelectedAccount(val || '')}
          data={bankAccounts.map(acc => ({
            value: acc.code,
            label: `${acc.name} (${acc.code})`
          }))}
          required
          disabled={loadingAccounts}
        />

        <TextInput
          label="Reference (Optional)"
          placeholder="Payment reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={onClose}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreatePayment}
            loading={creating}
            leftSection={<IconCurrencyDollar size={16} />}
          >
            Record Payment
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

