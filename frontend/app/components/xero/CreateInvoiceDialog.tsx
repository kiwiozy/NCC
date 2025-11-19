'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Radio,
  Group,
  Button,
  NumberInput,
  Textarea,
  Paper,
  Text,
  Divider,
  ActionIcon,
  Select,
  Alert,
  Badge,
  Grid,
  Title,
  Box,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconAlertCircle,
  IconUsers,
  IconBuildingStore,
  IconFileInvoice,
  IconFileDescription,
} from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import { formatCurrency, formatDateAU } from '../../utils/formatting';
import { getCsrfToken } from '../../utils/csrf';

interface Patient {
  id: string;
  full_name: string;
  mrn: string;
  dob?: string;
  contact_json?: {
    emails?: Array<{ address: string }>;
  };
}

interface Company {
  id: string;
  name: string;
  abn?: string;
  contact_json?: {
    emails?: Array<{ address: string }>;
  };
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_amount: number;
  account_code?: string;
  tax_type: string;
}

interface CreateInvoiceDialogProps {
  opened: boolean;
  onClose: () => void;
  appointmentId?: string;
  preSelectedPatient?: Patient;
  preSelectedCompany?: Company;
  onSuccess: () => void;
  mode?: 'invoice' | 'quote';
}

export default function CreateInvoiceDialog({
  opened,
  onClose,
  appointmentId,
  preSelectedPatient,
  preSelectedCompany,
  onSuccess,
  mode = 'invoice',
}: CreateInvoiceDialogProps) {
  // State - Document Type
  const [documentType, setDocumentType] = useState<'invoice' | 'quote'>(mode);

  // State - Contact Selection
  const [contactType, setContactType] = useState<'patient' | 'company'>('patient');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(preSelectedPatient || null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(preSelectedCompany || null);

  // State - Search
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
  const [companySearchResults, setCompanySearchResults] = useState<Company[]>([]);

  // State - Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      unit_amount: 0,
      account_code: '',
      tax_type: 'OUTPUT',
    },
  ]);

  // State - Additional Fields
  const [billingNotes, setBillingNotes] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)); // 14 days
  const [expiryDate, setExpiryDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days

  // State - UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect - Smart default (suggest company if available)
  useEffect(() => {
    if (preSelectedCompany && !selectedCompany) {
      setSelectedCompany(preSelectedCompany);
      setContactType('company');
    }
    if (preSelectedPatient && !selectedPatient) {
      setSelectedPatient(preSelectedPatient);
    }
  }, [preSelectedCompany, preSelectedPatient]);

  // Search Patients
  const searchPatients = async (query: string) => {
    if (query.length < 2) {
      setPatientSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`https://localhost:8000/api/patients/?search=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setPatientSearchResults(data.results || data);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

  // Search Companies
  const searchCompanies = async (query: string) => {
    if (query.length < 2) {
      setCompanySearchResults([]);
      return;
    }

    try {
      const response = await fetch(`https://localhost:8000/api/companies/?search=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setCompanySearchResults(data.results || data);
      }
    } catch (error) {
      console.error('Error searching companies:', error);
    }
  };

  // Add Line Item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        unit_amount: 0,
        account_code: '',
        tax_type: 'OUTPUT',
      },
    ]);
  };

  // Remove Line Item
  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) return; // Keep at least one
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  // Update Line Item
  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // Calculate Totals
  const calculateTotals = () => {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_amount,
      0
    );
    const gst = subtotal * 0.1; // 10% GST
    const total = subtotal + gst;
    return { subtotal, gst, total };
  };

  // Get Primary Contact
  const getPrimaryContact = () => {
    return contactType === 'patient' ? selectedPatient : selectedCompany;
  };

  // Get Secondary Contact
  const getSecondaryContact = () => {
    return contactType === 'patient' ? selectedCompany : selectedPatient;
  };

  // Get Reference Text
  const getReferenceText = () => {
    let reference = '';

    if (contactType === 'company' && selectedPatient) {
      // Company is primary, patient in reference
      reference = `Service for: ${selectedPatient.full_name}\nMRN: ${selectedPatient.mrn}`;
      if (selectedPatient.dob) {
        reference += `\nDOB: ${formatDateAU(selectedPatient.dob)}`;
      }
    } else if (contactType === 'patient' && selectedCompany) {
      // Patient is primary, company in reference
      reference = `Bill to: ${selectedCompany.name}`;
      if (selectedCompany.abn) {
        reference += `\nABN: ${selectedCompany.abn}`;
      }
    }

    if (billingNotes) {
      reference += reference ? `\n${billingNotes}` : billingNotes;
    }

    return reference || 'N/A';
  };

  // Submit
  const handleSubmit = async () => {
    // Validation
    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    if (contactType === 'company' && !selectedCompany) {
      setError('Please select a company (or switch to patient as primary contact)');
      return;
    }

    if (lineItems.length === 0 || lineItems.some((item) => !item.description || item.unit_amount <= 0)) {
      setError('Please add at least one line item with description and amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = documentType === 'invoice'
        ? 'https://localhost:8000/api/xero/create-invoice/'
        : 'https://localhost:8000/api/xero/create-quote/';

      const payload: any = {
        appointment_id: appointmentId,
        contact_type: contactType,
        patient_id: selectedPatient.id,
        company_id: selectedCompany?.id || null,
        billing_notes: billingNotes,
        line_items: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_amount: item.unit_amount,
          account_code: item.account_code || '200', // Default account
          tax_type: item.tax_type,
        })),
      };

      if (documentType === 'invoice') {
        payload.invoice_date = invoiceDate.toISOString().split('T')[0];
        payload.due_date = dueDate.toISOString().split('T')[0];
      } else {
        payload.quote_date = invoiceDate.toISOString().split('T')[0];
        payload.expiry_date = expiryDate.toISOString().split('T')[0];
      }

      const csrfToken = await getCsrfToken();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || errorData.error || 'Failed to create document');
      }
    } catch (error) {
      console.error('Error creating document:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Close & Reset
  const handleClose = () => {
    // Reset all state
    setContactType('patient');
    setSelectedPatient(preSelectedPatient || null);
    setSelectedCompany(preSelectedCompany || null);
    setPatientSearchQuery('');
    setCompanySearchQuery('');
    setPatientSearchResults([]);
    setCompanySearchResults([]);
    setLineItems([
      {
        id: '1',
        description: '',
        quantity: 1,
        unit_amount: 0,
        account_code: '',
        tax_type: 'OUTPUT',
      },
    ]);
    setBillingNotes('');
    setInvoiceDate(new Date());
    setDueDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
    setExpiryDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setError(null);
    onClose();
  };

  const totals = calculateTotals();
  const primaryContact = getPrimaryContact();
  const secondaryContact = getSecondaryContact();

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group>
          {documentType === 'invoice' ? <IconFileInvoice size={24} /> : <IconFileDescription size={24} />}
          <Title order={3}>Create Xero {documentType === 'invoice' ? 'Invoice' : 'Quote'}</Title>
        </Group>
      }
      size="xl"
      styles={{
        body: { maxHeight: '80vh', overflowY: 'auto' },
      }}
    >
      <Stack gap="md">
        {/* Error Alert */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError(null)} withCloseButton>
            {error}
          </Alert>
        )}

        {/* Document Type Toggle */}
        <Paper p="md" withBorder>
          <Radio.Group
            value={documentType}
            onChange={(value: any) => setDocumentType(value)}
            label="Document Type"
            description="Choose whether to create an invoice or a quote"
          >
            <Group mt="xs">
              <Radio value="invoice" label="Invoice (charge now)" />
              <Radio value="quote" label="Quote (estimate only)" />
            </Group>
          </Radio.Group>
        </Paper>

        <Grid>
          {/* Left Column - Form */}
          <Grid.Col span={7}>
            <Stack gap="md">
              {/* Contact Type Selection */}
              <Paper p="md" withBorder>
                <Radio.Group
                  value={contactType}
                  onChange={(value: any) => setContactType(value)}
                  label="Primary Xero Contact"
                  description="Who should receive the invoice/quote in Xero?"
                >
                  <Group mt="xs">
                    <Radio
                      value="patient"
                      label="Patient"
                      icon={IconUsers}
                      description="Patient appears as 'TO:' in Xero"
                    />
                    <Radio
                      value="company"
                      label="Company"
                      icon={IconBuildingStore}
                      description="Company appears as 'TO:' in Xero"
                    />
                  </Group>
                </Radio.Group>
              </Paper>

              {/* Patient Selection */}
              <Paper p="md" withBorder>
                <Stack gap="xs">
                  <Text size="sm" fw={600}>
                    Patient <Text component="span" c="red">*</Text>
                  </Text>
                  {selectedPatient ? (
                    <Paper p="sm" withBorder bg="blue.0">
                      <Group justify="space-between">
                        <Stack gap={0}>
                          <Text fw={600}>{selectedPatient.full_name}</Text>
                          <Text size="sm" c="dimmed">MRN: {selectedPatient.mrn}</Text>
                        </Stack>
                        <Button size="xs" variant="subtle" onClick={() => setSelectedPatient(null)}>
                          Change
                        </Button>
                      </Group>
                    </Paper>
                  ) : (
                    <>
                      <TextInput
                        placeholder="Search patient by name or MRN..."
                        value={patientSearchQuery}
                        onChange={(e) => {
                          setPatientSearchQuery(e.currentTarget.value);
                          searchPatients(e.currentTarget.value);
                        }}
                      />
                      {patientSearchResults.length > 0 && (
                        <Paper p="xs" withBorder>
                          <Stack gap="xs">
                            {patientSearchResults.map((patient) => (
                              <Paper
                                key={patient.id}
                                p="xs"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setPatientSearchQuery('');
                                  setPatientSearchResults([]);
                                }}
                              >
                                <Text size="sm" fw={600}>{patient.full_name}</Text>
                                <Text size="xs" c="dimmed">MRN: {patient.mrn}</Text>
                              </Paper>
                            ))}
                          </Stack>
                        </Paper>
                      )}
                    </>
                  )}
                </Stack>
              </Paper>

              {/* Company Selection */}
              <Paper p="md" withBorder>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>
                      Company {contactType === 'company' && <Text component="span" c="red">*</Text>}
                    </Text>
                    <Text size="xs" c="dimmed">(Optional)</Text>
                  </Group>
                  {selectedCompany ? (
                    <Paper p="sm" withBorder bg="cyan.0">
                      <Group justify="space-between">
                        <Stack gap={0}>
                          <Text fw={600}>{selectedCompany.name}</Text>
                          {selectedCompany.abn && (
                            <Text size="sm" c="dimmed">ABN: {selectedCompany.abn}</Text>
                          )}
                        </Stack>
                        <Button size="xs" variant="subtle" onClick={() => setSelectedCompany(null)}>
                          Remove
                        </Button>
                      </Group>
                    </Paper>
                  ) : (
                    <>
                      <TextInput
                        placeholder="Search company by name..."
                        value={companySearchQuery}
                        onChange={(e) => {
                          setCompanySearchQuery(e.currentTarget.value);
                          searchCompanies(e.currentTarget.value);
                        }}
                      />
                      {companySearchResults.length > 0 && (
                        <Paper p="xs" withBorder>
                          <Stack gap="xs">
                            {companySearchResults.map((company) => (
                              <Paper
                                key={company.id}
                                p="xs"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  setSelectedCompany(company);
                                  setCompanySearchQuery('');
                                  setCompanySearchResults([]);
                                }}
                              >
                                <Text size="sm" fw={600}>{company.name}</Text>
                                {company.abn && (
                                  <Text size="xs" c="dimmed">ABN: {company.abn}</Text>
                                )}
                              </Paper>
                            ))}
                          </Stack>
                        </Paper>
                      )}
                    </>
                  )}
                </Stack>
              </Paper>

              {/* Dates */}
              <Paper p="md" withBorder>
                <Stack gap="xs">
                  <Text size="sm" fw={600}>Dates</Text>
                  <DateInput
                    label={documentType === 'invoice' ? 'Invoice Date' : 'Quote Date'}
                    value={invoiceDate}
                    onChange={(date) => date && setInvoiceDate(date)}
                  />
                  {documentType === 'invoice' ? (
                    <DateInput
                      label="Due Date"
                      value={dueDate}
                      onChange={(date) => date && setDueDate(date)}
                    />
                  ) : (
                    <DateInput
                      label="Expiry Date"
                      value={expiryDate}
                      onChange={(date) => date && setExpiryDate(date)}
                    />
                  )}
                </Stack>
              </Paper>

              {/* Line Items */}
              <Paper p="md" withBorder>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>Line Items <Text component="span" c="red">*</Text></Text>
                    <Button size="xs" leftSection={<IconPlus size={14} />} onClick={addLineItem}>
                      Add Item
                    </Button>
                  </Group>

                  {lineItems.map((item, index) => (
                    <Paper key={item.id} p="sm" withBorder>
                      <Stack gap="xs">
                        <Group align="flex-start">
                          <TextInput
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, 'description', e.currentTarget.value)}
                            style={{ flex: 1 }}
                          />
                          {lineItems.length > 1 && (
                            <ActionIcon color="red" variant="subtle" onClick={() => removeLineItem(item.id)}>
                              <IconTrash size={16} />
                            </ActionIcon>
                          )}
                        </Group>
                        <Group grow>
                          <NumberInput
                            label="Quantity"
                            value={item.quantity}
                            onChange={(value) => updateLineItem(item.id, 'quantity', value || 1)}
                            min={1}
                          />
                          <NumberInput
                            label="Unit Price ($)"
                            value={item.unit_amount}
                            onChange={(value) => updateLineItem(item.id, 'unit_amount', value || 0)}
                            min={0}
                            decimalScale={2}
                            fixedDecimalScale
                            prefix="$"
                          />
                        </Group>
                        <Group grow>
                          <TextInput
                            label="Account Code"
                            placeholder="200 (default)"
                            value={item.account_code}
                            onChange={(e) => updateLineItem(item.id, 'account_code', e.currentTarget.value)}
                          />
                          <Select
                            label="Tax"
                            value={item.tax_type}
                            onChange={(value) => updateLineItem(item.id, 'tax_type', value || 'OUTPUT')}
                            data={[
                              { value: 'OUTPUT', label: 'GST on Income (10%)' },
                              { value: 'NONE', label: 'No GST' },
                              { value: 'EXEMPTOUTPUT', label: 'GST Exempt' },
                            ]}
                          />
                        </Group>
                        <Text size="sm" c="dimmed" ta="right">
                          Subtotal: {formatCurrency(item.quantity * item.unit_amount)}
                        </Text>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Paper>

              {/* Billing Notes */}
              <Textarea
                label="Billing Notes"
                placeholder="PO number, special instructions, etc."
                value={billingNotes}
                onChange={(e) => setBillingNotes(e.currentTarget.value)}
                rows={3}
              />
            </Stack>
          </Grid.Col>

          {/* Right Column - Preview */}
          <Grid.Col span={5}>
            <Paper p="md" withBorder bg="gray.0" style={{ position: 'sticky', top: 20 }}>
              <Stack gap="md">
                <Title order={4}>Preview</Title>
                <Divider />

                {/* Primary Contact */}
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>To:</Text>
                  {primaryContact ? (
                    <Paper p="sm" mt="xs" withBorder bg="white">
                      <Text fw={600}>
                        {'full_name' in primaryContact ? primaryContact.full_name : primaryContact.name}
                      </Text>
                      <Badge color={contactType === 'patient' ? 'blue' : 'cyan'} size="sm" mt="xs">
                        Primary Contact
                      </Badge>
                    </Paper>
                  ) : (
                    <Text size="sm" c="dimmed" fs="italic">No contact selected</Text>
                  )}
                </Box>

                {/* Reference */}
                {secondaryContact && (
                  <Box>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Reference:</Text>
                    <Paper p="sm" mt="xs" withBorder bg="white">
                      <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                        {getReferenceText()}
                      </Text>
                    </Paper>
                  </Box>
                )}

                {/* Dates */}
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Dates:</Text>
                  <Paper p="sm" mt="xs" withBorder bg="white">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm">{documentType === 'invoice' ? 'Invoice Date:' : 'Quote Date:'}</Text>
                        <Text size="sm" fw={600}>{formatDateAU(invoiceDate)}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm">{documentType === 'invoice' ? 'Due Date:' : 'Expiry Date:'}</Text>
                        <Text size="sm" fw={600}>
                          {formatDateAU(documentType === 'invoice' ? dueDate : expiryDate)}
                        </Text>
                      </Group>
                    </Stack>
                  </Paper>
                </Box>

                {/* Line Items Summary */}
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Line Items:</Text>
                  <Paper p="sm" mt="xs" withBorder bg="white">
                    <Stack gap="xs">
                      {lineItems.filter(item => item.description).map((item, index) => (
                        <Group key={item.id} justify="space-between">
                          <Text size="sm">{item.quantity}x {item.description}</Text>
                          <Text size="sm">{formatCurrency(item.quantity * item.unit_amount)}</Text>
                        </Group>
                      ))}
                      {lineItems.filter(item => item.description).length === 0 && (
                        <Text size="sm" c="dimmed" fs="italic">No line items added</Text>
                      )}
                    </Stack>
                  </Paper>
                </Box>

                {/* Totals */}
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Financial Summary:</Text>
                  <Paper p="sm" mt="xs" withBorder bg="white">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm">Subtotal:</Text>
                        <Text size="sm">{formatCurrency(totals.subtotal)}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm">GST (10%):</Text>
                        <Text size="sm">{formatCurrency(totals.gst)}</Text>
                      </Group>
                      <Divider />
                      <Group justify="space-between">
                        <Text fw={700}>Total:</Text>
                        <Text fw={700} size="lg">{formatCurrency(totals.total)}</Text>
                      </Group>
                    </Stack>
                  </Paper>
                </Box>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Create {documentType === 'invoice' ? 'Invoice' : 'Quote'} in Xero
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

