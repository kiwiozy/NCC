'use client';

import { Modal, Stack, Group, Text, Button, Loader, Center, TextInput, Select, NumberInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';

interface EditInvoiceModalProps {
  opened: boolean;
  onClose: () => void;
  invoiceId: string;
  onSuccess: () => void;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_amount: number;
  account_code: string;
  tax_type: string;
}

interface InvoiceData {
  id: string;
  xero_invoice_id: string;
  xero_invoice_number: string;
  status: string;
  patient?: string;
  company?: string;
  contact_type: string;
  invoice_date: string | null;
  due_date: string | null;
  line_items?: LineItem[];
  billing_notes?: string;
}

const TAX_TYPES = [
  { value: 'EXEMPTINPUT', label: 'GST Free' },
  { value: 'OUTPUT2', label: 'GST on Income (10%)' },
  { value: 'NONE', label: 'No GST' },
  { value: 'EXEMPTOUTPUT', label: 'GST Free Expenses' },
];

export function EditInvoiceModal({ opened, onClose, invoiceId, onSuccess }: EditInvoiceModalProps) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [billingNotes, setBillingNotes] = useState('');

  useEffect(() => {
    if (opened && invoiceId) {
      fetchInvoiceDetails();
    }
  }, [opened, invoiceId]);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://localhost:8000/api/xero-invoice-links/${invoiceId}/`);
      if (!response.ok) throw new Error('Failed to fetch invoice details');
      
      const data = await response.json();
      setInvoice(data);
      
      // Set form values
      setInvoiceDate(data.invoice_date ? new Date(data.invoice_date) : null);
      setDueDate(data.due_date ? new Date(data.due_date) : null);
      setLineItems(data.line_items || [
        {
          id: '1',
          description: '',
          quantity: 1,
          unit_amount: 0,
          account_code: '200',
          tax_type: 'EXEMPTINPUT',
        },
      ]);
      setBillingNotes(data.billing_notes || '');
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

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: String(lineItems.length + 1),
      description: '',
      quantity: 1,
      unit_amount: 0,
      account_code: '200',
      tax_type: 'EXEMPTINPUT',
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!invoice) return;

    // Validation
    if (!lineItems.length) {
      notifications.show({
        title: 'Validation Error',
        message: 'At least one line item is required',
        color: 'red',
      });
      return;
    }

    for (const item of lineItems) {
      if (!item.description || item.quantity <= 0 || item.unit_amount < 0) {
        notifications.show({
          title: 'Validation Error',
          message: 'All line items must have a description, quantity > 0, and amount ≥ 0',
          color: 'red',
        });
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch(`https://localhost:8000/api/xero/invoices/${invoice.xero_invoice_id}/update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_date: invoiceDate?.toISOString(),
          due_date: dueDate?.toISOString(),
          line_items: lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_amount: item.unit_amount,
            account_code: item.account_code,
            tax_type: item.tax_type,
          })),
          billing_notes: billingNotes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update invoice');
      }

      notifications.show({
        title: 'Success',
        message: 'Invoice updated successfully in Xero',
        color: 'green',
        icon: <IconDeviceFloppy />,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update invoice',
        color: 'red',
        icon: <IconX />,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>Edit Invoice</Text>}
      size="xl"
    >
      {loading ? (
        <Center p="xl">
          <Loader />
        </Center>
      ) : invoice ? (
        <Stack gap="md">
          {/* Invoice Info */}
          <Group grow>
            <TextInput
              label="Invoice Number"
              value={invoice.xero_invoice_number}
              disabled
            />
            <TextInput
              label="Status"
              value={invoice.status}
              disabled
            />
          </Group>

          {/* Dates */}
          <Group grow>
            <DateInput
              label="Invoice Date"
              value={invoiceDate}
              onChange={setInvoiceDate}
              placeholder="Select date"
            />
            <DateInput
              label="Due Date"
              value={dueDate}
              onChange={setDueDate}
              placeholder="Select date"
            />
          </Group>

          {/* Line Items */}
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600}>Line Items</Text>
              <Button size="xs" onClick={addLineItem}>
                + Add Item
              </Button>
            </Group>

            {lineItems.map((item, index) => (
              <Stack key={item.id} gap="xs" p="md" style={{ border: '1px solid #dee2e6', borderRadius: '8px' }}>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>Item {index + 1}</Text>
                  {lineItems.length > 1 && (
                    <Button
                      size="xs"
                      color="red"
                      variant="subtle"
                      onClick={() => removeLineItem(index)}
                    >
                      Remove
                    </Button>
                  )}
                </Group>

                <TextInput
                  label="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Service description"
                />

                <Group grow>
                  <NumberInput
                    label="Quantity"
                    value={item.quantity}
                    onChange={(val) => updateLineItem(index, 'quantity', val)}
                    min={1}
                  />
                  <NumberInput
                    label="Unit Amount ($)"
                    value={item.unit_amount}
                    onChange={(val) => updateLineItem(index, 'unit_amount', val)}
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                  />
                </Group>

                <Group grow>
                  <TextInput
                    label="Account Code"
                    value={item.account_code}
                    onChange={(e) => updateLineItem(index, 'account_code', e.target.value)}
                  />
                  <Select
                    label="Tax Type"
                    value={item.tax_type}
                    onChange={(val) => updateLineItem(index, 'tax_type', val || 'EXEMPTINPUT')}
                    data={TAX_TYPES}
                  />
                </Group>

                <Text size="sm" c="dimmed">
                  Total: ${(item.quantity * item.unit_amount).toFixed(2)}
                </Text>
              </Stack>
            ))}
          </Stack>

          {/* Billing Notes */}
          <TextInput
            label="Billing Notes"
            value={billingNotes}
            onChange={(e) => setBillingNotes(e.target.value)}
            placeholder="Optional notes"
          />

          {/* Actions */}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              leftSection={<IconDeviceFloppy size={16} />}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      ) : (
        <Text c="dimmed">No invoice data available</Text>
      )}
    </Modal>
  );
}

