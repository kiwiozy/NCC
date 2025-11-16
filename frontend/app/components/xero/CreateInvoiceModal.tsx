'use client';

import { useState } from 'react';
import { Modal, Stack, Group, Button, Select, TextInput, NumberInput, Textarea, Table, ActionIcon, Text, Badge, Divider, Paper, Radio } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconPlus, IconTrash, IconX, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface Patient {
  id: string;
  full_name: string;
  mrn: string;
}

interface Company {
  id: string;
  name: string;
  abn?: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_amount: number;
  account_code: string;
  tax_type: string;
}

interface CreateInvoiceModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patients: Patient[];
  companies: Company[];
}

const TAX_TYPES = [
  { value: 'EXEMPTINPUT', label: 'GST Free' },
  { value: 'OUTPUT2', label: 'GST on Income (10%)' },
  { value: 'NONE', label: 'No GST' },
  { value: 'EXEMPTOUTPUT', label: 'GST Free Expenses' },
  { value: 'INPUT2', label: 'GST on Expenses (10%)' },
  { value: 'BASEXCLUDED', label: 'Tax Exclusive' },
  { value: 'RRINPUT', label: 'Reduced Rate Input' },
  { value: 'RROUTPUT', label: 'Reduced Rate Output' },
];

const DEFAULT_ACCOUNT_CODES = [
  { value: '200', label: '200 - Sales' },
  { value: '260', label: '260 - Other Revenue' },
  { value: '400', label: '400 - Advertising' },
  { value: '404', label: '404 - Bank Fees' },
  { value: '408', label: '408 - Cleaning' },
];

export function CreateInvoiceModal({ opened, onClose, onSuccess, patients, companies }: CreateInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Contact selection
  const [contactType, setContactType] = useState<'patient' | 'company'>('patient');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  
  // Invoice details
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)); // 14 days from now
  const [reference, setReference] = useState('');
  const [billingNotes, setBillingNotes] = useState('');
  
  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      unit_amount: 0,
      account_code: '200',
      tax_type: 'EXEMPTOUTPUT',
    },
  ]);

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_amount: 0,
      account_code: '200',
      tax_type: 'EXEMPTOUTPUT',
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) {
      notifications.show({
        title: 'Cannot Remove',
        message: 'Invoice must have at least one line item',
        color: 'orange',
      });
      return;
    }
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_amount), 0);
  };

  const calculateTax = () => {
    return lineItems.reduce((sum, item) => {
      if (item.tax_type === 'OUTPUT2' || item.tax_type === 'INPUT2') {
        return sum + (item.quantity * item.unit_amount * 0.10);
      }
      return sum;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const validateForm = () => {
    if (contactType === 'patient' && !selectedPatient) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a patient',
        color: 'red',
        icon: <IconX />,
      });
      return false;
    }

    if (contactType === 'company' && !selectedCompany) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a company',
        color: 'red',
        icon: <IconX />,
      });
      return false;
    }

    if (lineItems.some(item => !item.description.trim())) {
      notifications.show({
        title: 'Validation Error',
        message: 'All line items must have a description',
        color: 'red',
        icon: <IconX />,
      });
      return false;
    }

    if (lineItems.some(item => item.unit_amount <= 0)) {
      notifications.show({
        title: 'Validation Error',
        message: 'All line items must have a positive amount',
        color: 'red',
        icon: <IconX />,
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        patient_id: contactType === 'patient' ? selectedPatient : null,
        company_id: contactType === 'company' ? selectedCompany : null,
        invoice_contact_type: contactType,
        line_items: lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_amount: item.unit_amount,
          account_code: item.account_code,
          tax_type: item.tax_type,
        })),
        invoice_date: invoiceDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        reference: reference || undefined,
        billing_notes: billingNotes || undefined,
      };

      const response = await fetch('https://localhost:8000/api/xero/invoice/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || 'Failed to create invoice');
      }

      notifications.show({
        title: 'Invoice Created',
        message: 'Invoice created successfully in Xero',
        color: 'green',
        icon: <IconCheck />,
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create invoice',
        color: 'red',
        icon: <IconX />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setContactType('patient');
    setSelectedPatient(null);
    setSelectedCompany(null);
    setInvoiceDate(new Date());
    setDueDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
    setReference('');
    setBillingNotes('');
    setLineItems([
      {
        id: '1',
        description: '',
        quantity: 1,
        unit_amount: 0,
        account_code: '200',
        tax_type: 'OUTPUT2',
      },
    ]);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Create Xero Invoice"
      size="1480px"
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        {/* Contact Selection */}
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Text fw={600} size="sm">Primary Contact</Text>
            <Radio.Group value={contactType} onChange={(value) => setContactType(value as 'patient' | 'company')}>
              <Group>
                <Radio value="patient" label="Patient" />
                <Radio value="company" label="Company" />
              </Group>
            </Radio.Group>

            {contactType === 'patient' ? (
              <Select
                label="Select Patient"
                placeholder="Search patients..."
                data={patients.map(p => ({ 
                  value: p.id, 
                  label: p.mrn ? `${p.full_name} (${p.mrn})` : p.full_name 
                }))}
                value={selectedPatient}
                onChange={setSelectedPatient}
                searchable
                required
              />
            ) : (
              <Select
                label="Select Company"
                placeholder="Search companies..."
                data={companies.map(c => ({ value: c.id, label: c.abn ? `${c.name} (${c.abn})` : c.name }))}
                value={selectedCompany}
                onChange={setSelectedCompany}
                searchable
                required
              />
            )}
          </Stack>
        </Paper>

        {/* Invoice Details */}
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Text fw={600} size="sm">Invoice Details</Text>
            <Group grow>
              <DateInput
                label="Invoice Date"
                value={invoiceDate}
                onChange={(date) => date && setInvoiceDate(date)}
                required
              />
              <DateInput
                label="Due Date"
                value={dueDate}
                onChange={(date) => date && setDueDate(date)}
                required
              />
            </Group>
            <TextInput
              label="Reference"
              placeholder="Optional reference (e.g., PO number)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <Textarea
              label="Billing Notes"
              placeholder="Optional notes to appear on the invoice"
              value={billingNotes}
              onChange={(e) => setBillingNotes(e.target.value)}
              rows={2}
            />
          </Stack>
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
                {lineItems.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <TextInput
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        required
                        size="xs"
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        value={item.quantity}
                        onChange={(val) => updateLineItem(item.id, 'quantity', val || 1)}
                        min={1}
                        required
                        size="xs"
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        value={item.unit_amount}
                        onChange={(val) => updateLineItem(item.id, 'unit_amount', val || 0)}
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
                        onChange={(val) => val && updateLineItem(item.id, 'account_code', val)}
                        required
                        size="xs"
                      />
                    </Table.Td>
                    <Table.Td>
                      <Select
                        data={TAX_TYPES}
                        value={item.tax_type}
                        onChange={(val) => val && updateLineItem(item.id, 'tax_type', val)}
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
                        onClick={() => removeLineItem(item.id)}
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

        {/* Actions */}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading} leftSection={<IconCheck size={16} />}>
            Create Invoice
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

