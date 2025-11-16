'use client';

import { Modal, Stack, Group, Text, Button, Loader, Center, TextInput, Select, NumberInput, Table, Paper, ActionIcon, Divider } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconDeviceFloppy, IconX, IconPlus, IconTrash } from '@tabler/icons-react';
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
  { value: 'OUTPUT2', label: 'GST on Income (10%)' },
  { value: 'EXEMPTOUTPUT', label: 'GST Free Expenses' },
  { value: 'NONE', label: 'No GST' },
  { value: 'EXEMPTINPUT', label: 'GST Free' },
  { value: 'INPUT2', label: 'GST on Expenses (10%)' },
];

const DEFAULT_ACCOUNT_CODES = [
  { value: '200', label: '200 - Sales' },
  { value: '260', label: '260 - Other Revenue' },
  { value: '400', label: '400 - Advertising' },
  { value: '404', label: '404 - Bank Fees' },
  { value: '408', label: '408 - Cleaning' },
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

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_amount), 0);
  };

  const calculateTax = () => {
    return lineItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_amount;
      if (item.tax_type === 'OUTPUT2' || item.tax_type === 'INPUT2') {
        return sum + (itemTotal * 0.1); // 10% GST
      }
      return sum;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
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
      size="1480px"
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
          <Paper p="md" withBorder>
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
          </Paper>

          {/* Line Items */}
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={600} size="sm">Line Items</Text>
                <Button size="xs" leftSection={<IconPlus size={14} />} onClick={addLineItem} variant="light">
                  Add Line
                </Button>
              </Group>

              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Description</Table.Th>
                    <Table.Th style={{ width: '100px' }}>Qty</Table.Th>
                    <Table.Th style={{ width: '120px' }}>Unit Price</Table.Th>
                    <Table.Th style={{ width: '120px' }}>Account</Table.Th>
                    <Table.Th style={{ width: '120px' }}>Tax</Table.Th>
                    <Table.Th style={{ width: '100px' }}>Subtotal</Table.Th>
                    <Table.Th style={{ width: '40px' }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {lineItems.map((item, index) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <TextInput
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          required
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={item.quantity}
                          onChange={(val) => updateLineItem(index, 'quantity', val || 1)}
                          min={1}
                          required
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={item.unit_amount}
                          onChange={(val) => updateLineItem(index, 'unit_amount', val || 0)}
                          min={0}
                          prefix="$"
                          decimalScale={2}
                          fixedDecimalScale
                          required
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td>
                        <Select
                          data={DEFAULT_ACCOUNT_CODES}
                          value={item.account_code}
                          onChange={(val) => val && updateLineItem(index, 'account_code', val)}
                          required
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td>
                        <Select
                          data={TAX_TYPES}
                          value={item.tax_type}
                          onChange={(val) => val && updateLineItem(index, 'tax_type', val)}
                          required
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {formatCurrency(item.quantity * item.unit_amount)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length === 1}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Paper>

          {/* Totals */}
          <Paper p="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">Subtotal:</Text>
                <Text size="sm" fw={500}>{formatCurrency(calculateSubtotal())}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Tax:</Text>
                <Text size="sm" fw={500}>{formatCurrency(calculateTax())}</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="lg" fw={700}>Total:</Text>
                <Text size="lg" fw={700} c="blue">{formatCurrency(calculateTotal())}</Text>
              </Group>
            </Stack>
          </Paper>

          {/* Billing Notes */}
          <Paper p="md" withBorder>
            <TextInput
              label="Billing Notes"
              value={billingNotes}
              onChange={(e) => setBillingNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </Paper>

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

