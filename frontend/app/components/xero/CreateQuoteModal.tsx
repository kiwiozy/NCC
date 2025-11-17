'use client';

import { useState, useEffect } from 'react';
import { Modal, Stack, Group, Button, Select, TextInput, NumberInput, Textarea, Table, ActionIcon, Text, Badge, Divider, Paper, Radio, Checkbox } from '@mantine/core';
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
  discount: number;
  account_code: string;
  tax_type: string;
}

interface CreateQuoteModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patients: Patient[];
  companies: Company[];
  preSelectedPatientId?: string;
  preSelectedCompanyId?: string;
}

const TAX_TYPES = [
  { value: 'EXEMPTOUTPUT', label: 'GST Free' },
  { value: 'OUTPUT2', label: 'GST on Income (10%)' },
  { value: 'INPUT2', label: 'GST on Expenses (10%)' },
  { value: 'EXEMPTINPUT', label: 'GST Free Purchases' },
  { value: 'BASEXCLUDED', label: 'Tax Exclusive' },
  { value: 'NONE', label: 'No GST' },
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

export function CreateQuoteModal({ opened, onClose, onSuccess, patients, companies, preSelectedPatientId, preSelectedCompanyId }: CreateQuoteModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Contact selection
  const [contactType, setContactType] = useState<'patient' | 'company'>(
    preSelectedCompanyId ? 'company' : 'patient'
  );
  const [selectedPatient, setSelectedPatient] = useState<string | null>(preSelectedPatientId || null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(preSelectedCompanyId || null);
  
  // Check if contact is pre-selected
  const isPreSelected = !!(preSelectedPatientId || preSelectedCompanyId);
  
  // Sync state with props when they change
  useEffect(() => {
    if (preSelectedPatientId) {
      setSelectedPatient(preSelectedPatientId);
      setContactType('patient');
    }
    if (preSelectedCompanyId) {
      setSelectedCompany(preSelectedCompanyId);
      setContactType('company');
    }
  }, [preSelectedPatientId, preSelectedCompanyId]);
  
  // Quote details
  const [quoteDate, setQuoteDate] = useState<Date>(new Date());
  const [expiryDate, setExpiryDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days from now
  const [reference, setReference] = useState('');
  const [terms, setTerms] = useState('');
  
  // Confirmation dialog
  const [confirmDialogOpened, setConfirmDialogOpened] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  
  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      unit_amount: 0,
      discount: 0,
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
      discount: 0,
      account_code: '200',
      tax_type: 'EXEMPTOUTPUT',
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) {
      notifications.show({
        title: 'Cannot Remove',
        message: 'At least one line item is required',
        color: 'red',
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
    return lineItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_amount;
      const discountAmount = lineTotal * (item.discount / 100);
      return sum + (lineTotal - discountAmount);
    }, 0);
  };

  const calculateTax = () => {
    return lineItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_amount;
      const discountAmount = lineTotal * (item.discount / 100);
      const discountedTotal = lineTotal - discountAmount;
      if (item.tax_type === 'OUTPUT2' || item.tax_type === 'INPUT2') {
        return sum + (discountedTotal * 0.1); // 10% GST
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

  const handleSubmit = async () => {
    // Validation
    if (contactType === 'patient' && !selectedPatient) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a patient',
        color: 'red',
      });
      return;
    }

    if (contactType === 'company' && !selectedCompany) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a company',
        color: 'red',
      });
      return;
    }

    if (!lineItems.length) {
      notifications.show({
        title: 'Validation Error',
        message: 'At least one line item is required',
        color: 'red',
      });
      return;
    }

    // Validate line items
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

    // Show confirmation dialog instead of submitting immediately
    setConfirmDialogOpened(true);
  };

  const handleConfirmedSubmit = async (sendImmediately: boolean) => {
    setConfirmDialogOpened(false);
    setPendingSubmit(true);
    setLoading(true);
    try {
      // When pre-selected patient (from patient dialog), always include patient_id
      // This ensures the quote is linked to the patient even when billing a company
      const patientId = preSelectedPatientId || (contactType === 'patient' ? selectedPatient : undefined);
      const companyId = contactType === 'company' ? selectedCompany : undefined;
      
      console.log('Creating quote with payload:', {
        patient_id: patientId,
        company_id: companyId,
        contact_type: contactType,
        preSelectedPatientId: preSelectedPatientId,
        line_items: lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_amount: item.unit_amount,
          discount: item.discount,
          account_code: item.account_code,
          tax_type: item.tax_type,
        })),
        quote_date: quoteDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        billing_notes: terms,
      });

      const response = await fetch('https://localhost:8000/api/xero/quote/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patientId,
          company_id: companyId,
          contact_type: contactType,
          line_items: lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_amount: item.unit_amount,
            discount: item.discount,
            account_code: item.account_code,
            tax_type: item.tax_type,
          })),
          quote_date: quoteDate.toISOString(),
          expiry_date: expiryDate.toISOString(),
          billing_notes: terms,
          send_immediately: sendImmediately,
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error response:', error);
        throw new Error(error.error || error.detail || 'Failed to create quote');
      }

      const data = await response.json();
      console.log('Success response:', data);

      notifications.show({
        title: 'Success',
        message: `Quote ${data.xero_quote_number} created successfully`,
        color: 'green',
        icon: <IconCheck />,
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating quote:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create quote',
        color: 'red',
        icon: <IconX />,
      });
    } finally {
      setLoading(false);
      setPendingSubmit(false);
    }
  };

  const handleClose = () => {
    if (!isPreSelected) {
      setContactType('patient');
      setSelectedPatient(null);
      setSelectedCompany(null);
    }
    setQuoteDate(new Date());
    setExpiryDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setReference('');
    setTerms('');
    setLineItems([{
      id: '1',
      description: '',
      quantity: 1,
      unit_amount: 0,
      discount: 0,
      account_code: '200',
      tax_type: 'EXEMPTOUTPUT',
    }]);
    onClose();
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title="Create Xero Quote"
        size="1600px"
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        {/* Primary Contact - only show if not pre-selected */}
        {!isPreSelected && (
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
        )}

        {/* Quote Details */}
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Text fw={600} size="sm">Quote Details</Text>
            <Group grow>
              <DateInput
                label="Quote Date"
                value={quoteDate}
                onChange={(date) => date && setQuoteDate(date)}
                required
              />
              <DateInput
                label="Expiry Date"
                value={expiryDate}
                onChange={(date) => date && setExpiryDate(date)}
                required
              />
            </Group>
            <TextInput
              label="Reference (Optional)"
              placeholder="Quote reference..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
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
                  <Table.Th style={{ width: '100px' }}>Discount %</Table.Th>
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
                      <Textarea
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        required
                        size="xs"
                        autosize
                        minRows={1}
                        maxRows={4}
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
                      <NumberInput
                        value={item.discount}
                        onChange={(val) => updateLineItem(item.id, 'discount', val ?? 0)}
                        min={0}
                        max={100}
                        step={1}
                        suffix="%"
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
                        {formatCurrency(item.quantity * item.unit_amount * (1 - item.discount / 100))}
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
            {lineItems.some(item => item.discount > 0) && (
              <Group justify="space-between">
                <Text size="sm" c="red">Total Discount:</Text>
                <Text size="sm" fw={500} c="red">
                  -{formatCurrency(lineItems.reduce((sum, item) => {
                    const lineTotal = item.quantity * item.unit_amount;
                    return sum + (lineTotal * (item.discount / 100));
                  }, 0))}
                </Text>
              </Group>
            )}
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

        {/* Terms & Conditions */}
        <Paper p="md" withBorder>
          <Textarea
            label="Terms & Conditions (Optional)"
            placeholder="Quote terms and conditions..."
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={3}
          />
        </Paper>

        {/* Actions */}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading} leftSection={<IconCheck size={16} />}>
            Create Quote
          </Button>
        </Group>
      </Stack>
    </Modal>

    {/* Confirmation Dialog */}
    <Modal
      opened={confirmDialogOpened}
      onClose={() => setConfirmDialogOpened(false)}
      title="Send Quote or Save as Draft?"
      size="md"
      centered
    >
      <Stack gap="md">
        <Text size="sm">
          Choose how you want to create this quote:
        </Text>
        
        <Paper p="md" withBorder style={{ cursor: 'pointer' }} onClick={() => handleConfirmedSubmit(true)}>
          <Stack gap="xs">
            <Group>
              <Badge color="blue" size="lg">SENT</Badge>
              <Text fw={600}>Send Immediately</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Quote will be marked as SENT in Xero and sent to the customer.
            </Text>
          </Stack>
        </Paper>

        <Paper p="md" withBorder style={{ cursor: 'pointer' }} onClick={() => handleConfirmedSubmit(false)}>
          <Stack gap="xs">
            <Group>
              <Badge color="gray" size="lg">DRAFT</Badge>
              <Text fw={600}>Save as Draft</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Quote will be saved as DRAFT for review. You can edit it before sending.
            </Text>
          </Stack>
        </Paper>

        <Button variant="subtle" onClick={() => setConfirmDialogOpened(false)} fullWidth>
          Cancel
        </Button>
      </Stack>
    </Modal>
    </>
  );
}
