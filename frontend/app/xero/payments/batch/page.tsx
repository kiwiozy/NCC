'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Stack,
  Group,
  Text,
  Paper,
  Button,
  TextInput,
  Select,
  Table,
  Checkbox,
  NumberInput,
  Divider,
  Badge,
  Loader,
  Center,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconCurrencyDollar, IconReceipt, IconCheck } from '@tabler/icons-react';
import Navigation from '../../../components/Navigation';
import { formatDateOnlyAU } from '../../../utils/dateFormatting';

interface Invoice {
  id: string;
  xero_invoice_number: string;
  xero_invoice_id: string;
  status: string;
  total: string;
  amount_due: string;
  amount_paid: string;
  invoice_date: string;
  patient_name?: string;
  company_name?: string;
}

interface BankAccount {
  code: string;
  name: string;
}

export default function BatchPaymentPage() {
  // Batch details
  const [batchReference, setBatchReference] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  // Invoice data
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({});

  // Companies
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Bank accounts
  const [bankAccounts] = useState<BankAccount[]>([
    { code: '090', name: 'Business Bank Account' },
    { code: '091', name: 'Business Savings Account' },
    { code: '092', name: 'Credit Card' },
  ]);

  // Submission
  const [submitting, setSubmitting] = useState(false);

  // Initialize
  useEffect(() => {
    setSelectedAccount(bankAccounts[0].code);
    fetchCompanies();
  }, []);

  // Fetch companies
  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const response = await fetch('https://localhost:8000/api/companies/');
      if (!response.ok) throw new Error('Failed to fetch companies');
      const data = await response.json();
      setCompanies(data.results || data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load companies',
        color: 'red',
      });
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Fetch unpaid invoices for selected company
  const fetchInvoices = async (companyId: string) => {
    setLoadingInvoices(true);
    setInvoices([]);
    setSelectedInvoices(new Set());
    setPaymentAmounts({});
    
    try {
      // Fetch invoices for the company with status AUTHORISED or SUBMITTED
      const response = await fetch(`https://localhost:8000/api/xero-invoice-links/?company=${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      
      const data = await response.json();
      const allInvoices = data.results || data || [];
      
      // Filter to only show invoices with amount_due > 0 and status AUTHORISED or SUBMITTED
      const unpaidInvoices = allInvoices.filter((inv: Invoice) => 
        ['AUTHORISED', 'SUBMITTED'].includes(inv.status) && 
        parseFloat(inv.amount_due) > 0
      );
      
      setInvoices(unpaidInvoices);
      
      if (unpaidInvoices.length === 0) {
        notifications.show({
          title: 'No Unpaid Invoices',
          message: 'This company has no outstanding invoices',
          color: 'blue',
        });
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load invoices',
        color: 'red',
      });
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Handle company selection
  const handleCompanyChange = (value: string | null) => {
    setSelectedCompany(value || '');
    if (value) {
      fetchInvoices(value);
    } else {
      setInvoices([]);
      setSelectedInvoices(new Set());
      setPaymentAmounts({});
    }
  };

  // Toggle invoice selection
  const handleToggleInvoice = (invoiceId: string, amountDue: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
      const newAmounts = { ...paymentAmounts };
      delete newAmounts[invoiceId];
      setPaymentAmounts(newAmounts);
    } else {
      newSelected.add(invoiceId);
      // Pre-fill with amount due
      setPaymentAmounts({
        ...paymentAmounts,
        [invoiceId]: parseFloat(amountDue),
      });
    }
    setSelectedInvoices(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedInvoices.size === invoices.length) {
      // Deselect all
      setSelectedInvoices(new Set());
      setPaymentAmounts({});
    } else {
      // Select all
      const newSelected = new Set(invoices.map(inv => inv.id));
      const newAmounts: Record<string, number> = {};
      invoices.forEach(inv => {
        newAmounts[inv.id] = parseFloat(inv.amount_due);
      });
      setSelectedInvoices(newSelected);
      setPaymentAmounts(newAmounts);
    }
  };

  // Handle amount change
  const handleAmountChange = (invoiceId: string, value: number | string) => {
    setPaymentAmounts({
      ...paymentAmounts,
      [invoiceId]: typeof value === 'number' ? value : parseFloat(String(value)) || 0,
    });
  };

  // Calculate totals
  const selectedCount = selectedInvoices.size;
  const totalAmount = Array.from(selectedInvoices).reduce((sum, invoiceId) => {
    return sum + (paymentAmounts[invoiceId] || 0);
  }, 0);

  // Handle batch payment submission
  const handleSubmit = async () => {
    // Validation
    if (!batchReference.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Batch reference is required',
        color: 'red',
      });
      return;
    }

    if (selectedInvoices.size === 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select at least one invoice',
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

    // Validate all amounts
    for (const invoiceId of Array.from(selectedInvoices)) {
      const amount = paymentAmounts[invoiceId];
      const invoice = invoices.find(inv => inv.id === invoiceId);
      
      if (!amount || amount <= 0) {
        notifications.show({
          title: 'Validation Error',
          message: `Payment amount must be greater than 0 for invoice ${invoice?.xero_invoice_number}`,
          color: 'red',
        });
        return;
      }

      if (invoice && amount > parseFloat(invoice.amount_due)) {
        notifications.show({
          title: 'Validation Error',
          message: `Payment amount cannot exceed amount due for invoice ${invoice.xero_invoice_number}`,
          color: 'red',
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      // Format date as YYYY-MM-DD
      const formattedDate = paymentDate.toISOString().split('T')[0];

      // Prepare payments array
      const payments = Array.from(selectedInvoices).map(invoiceId => ({
        invoice_link_id: invoiceId,
        amount: paymentAmounts[invoiceId].toString(),
      }));

      const response = await fetch('https://localhost:8000/api/xero/payments/create_batch_payment/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batch_reference: batchReference,
          payment_date: formattedDate,
          account_code: selectedAccount,
          payments,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Failed to create batch payment');
      }

      const data = await response.json();
      console.log('Batch payment created:', data);

      notifications.show({
        title: 'Success',
        message: `Batch payment created: ${selectedCount} invoice(s) totaling $${totalAmount.toFixed(2)}`,
        color: 'green',
      });

      // Reset form
      setBatchReference('');
      setSelectedCompany('');
      setInvoices([]);
      setSelectedInvoices(new Set());
      setPaymentAmounts({});
    } catch (error: any) {
      console.error('Error creating batch payment:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create batch payment',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Group justify="space-between">
            <div>
              <Text size="xl" fw={700}>Batch Payment Processing</Text>
              <Text size="sm" c="dimmed">Process remittance advice and pay multiple invoices at once</Text>
            </div>
          </Group>

          {/* Step 1: Batch Details */}
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600} size="lg">Step 1: Batch Details</Text>
                <Badge size="lg" color="blue">Remittance Advice</Badge>
              </Group>
              
              <Divider />

              <Group grow>
                <TextInput
                  label="Remittance Reference"
                  placeholder="e.g., REM-2025-11-18"
                  value={batchReference}
                  onChange={(e) => setBatchReference(e.target.value)}
                  required
                  leftSection={<IconReceipt size={16} />}
                />

                <DateInput
                  label="Payment Date"
                  value={paymentDate}
                  onChange={(val) => setPaymentDate(val || new Date())}
                  required
                  maxDate={new Date()}
                />
              </Group>

              <Group grow>
                <Select
                  label="Bank Account"
                  value={selectedAccount}
                  onChange={(val) => setSelectedAccount(val || '')}
                  data={bankAccounts.map(acc => ({
                    value: acc.code,
                    label: `${acc.name} (${acc.code})`,
                  }))}
                  required
                />

                <Select
                  label="Company/Payer"
                  placeholder="Select company"
                  value={selectedCompany}
                  onChange={handleCompanyChange}
                  data={companies.map(company => ({
                    value: company.id,
                    label: company.name,
                  }))}
                  required
                  disabled={loadingCompanies}
                  searchable
                />
              </Group>
            </Stack>
          </Paper>

          {/* Step 2: Invoice Selection */}
          {selectedCompany && (
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={600} size="lg">Step 2: Select Invoices</Text>
                  {invoices.length > 0 && (
                    <Button
                      variant="light"
                      size="xs"
                      onClick={handleSelectAll}
                    >
                      {selectedInvoices.size === invoices.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </Group>

                <Divider />

                {loadingInvoices ? (
                  <Center p="xl">
                    <Loader />
                  </Center>
                ) : invoices.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    No unpaid invoices found for this company
                  </Text>
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>
                          <Checkbox
                            checked={selectedInvoices.size === invoices.length && invoices.length > 0}
                            onChange={handleSelectAll}
                          />
                        </Table.Th>
                        <Table.Th>Invoice Number</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Total</Table.Th>
                        <Table.Th>Amount Due</Table.Th>
                        <Table.Th>Payment Amount</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {invoices.map((invoice) => {
                        const isSelected = selectedInvoices.has(invoice.id);
                        const amountDue = parseFloat(invoice.amount_due);
                        
                        return (
                          <Table.Tr key={invoice.id} bg={isSelected ? 'blue.0' : undefined}>
                            <Table.Td>
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleToggleInvoice(invoice.id, invoice.amount_due)}
                              />
                            </Table.Td>
                            <Table.Td>
                              <Text fw={500}>{invoice.xero_invoice_number}</Text>
                            </Table.Td>
                            <Table.Td>
                              {invoice.invoice_date ? formatDateOnlyAU(invoice.invoice_date) : '—'}
                            </Table.Td>
                            <Table.Td>
                              <Badge color={invoice.status === 'AUTHORISED' ? 'cyan' : 'blue'}>
                                {invoice.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td>${parseFloat(invoice.total).toFixed(2)}</Table.Td>
                            <Table.Td>
                              <Text c="orange" fw={500}>${amountDue.toFixed(2)}</Text>
                            </Table.Td>
                            <Table.Td>
                              <NumberInput
                                value={paymentAmounts[invoice.id] || 0}
                                onChange={(val) => handleAmountChange(invoice.id, val)}
                                min={0}
                                max={amountDue}
                                decimalScale={2}
                                fixedDecimalScale
                                prefix="$"
                                disabled={!isSelected}
                                styles={{ input: { width: 120 } }}
                              />
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                )}
              </Stack>
            </Paper>
          )}

          {/* Step 3: Summary & Submit */}
          {selectedInvoices.size > 0 && (
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Text fw={600} size="lg">Step 3: Review & Submit</Text>
                
                <Divider />

                <Group justify="space-around">
                  <div>
                    <Text size="sm" c="dimmed">Selected Invoices</Text>
                    <Text size="xl" fw={700}>{selectedCount}</Text>
                  </div>
                  
                  <Divider orientation="vertical" />
                  
                  <div>
                    <Text size="sm" c="dimmed">Total Payment Amount</Text>
                    <Text size="xl" fw={700} c="green">
                      ${totalAmount.toFixed(2)}
                    </Text>
                  </div>
                  
                  <Divider orientation="vertical" />
                  
                  <div>
                    <Text size="sm" c="dimmed">Reference</Text>
                    <Text size="lg" fw={600}>{batchReference || '—'}</Text>
                  </div>
                </Group>

                <Divider />

                <Group justify="flex-end">
                  <Button
                    size="lg"
                    leftSection={<IconCheck size={20} />}
                    onClick={handleSubmit}
                    loading={submitting}
                    disabled={!batchReference.trim() || selectedInvoices.size === 0}
                  >
                    Process Batch Payment
                  </Button>
                </Group>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </Navigation>
  );
}

