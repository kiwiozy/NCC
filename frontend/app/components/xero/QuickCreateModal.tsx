'use client';

import { Modal, Stack, Group, Text, Button, Radio, TextInput, Paper, Stepper } from '@mantine/core';
import { IconFileInvoice, IconFileText, IconUser, IconBuilding, IconCheck } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';

interface QuickCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onCreateInvoice: (patientId?: string, companyId?: string) => void;
  onCreateQuote: (patientId?: string, companyId?: string) => void;
}

interface Patient {
  id: string;
  full_name: string;
  mrn?: string;
}

interface Company {
  id: string;
  name: string;
}

export function QuickCreateModal({ opened, onClose, onCreateInvoice, onCreateQuote }: QuickCreateModalProps) {
  const [active, setActive] = useState(0);
  
  // Step 1: Invoice or Quote
  const [documentType, setDocumentType] = useState<'invoice' | 'quote'>('invoice');
  
  // Step 2: Contact Type
  const [contactType, setContactType] = useState<'patient' | 'company'>('patient');
  
  // Step 3: Search
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (active === 2 && searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchContacts();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, active, contactType]);

  const searchContacts = async () => {
    if (searchQuery.length < 2) return;
    
    setSearching(true);
    try {
      if (contactType === 'patient') {
        const response = await fetch(`https://localhost:8000/api/patients/?search=${searchQuery}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          setPatients(data.results || data);
        }
      } else {
        const response = await fetch(`https://localhost:8000/api/companies/?search=${searchQuery}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          setCompanies(data.results || data);
        }
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleNext = () => {
    if (active === 2) {
      // Validate selection
      if (contactType === 'patient' && !selectedPatientId) {
        notifications.show({
          title: 'Selection Required',
          message: 'Please select a patient',
          color: 'red',
        });
        return;
      }
      if (contactType === 'company' && !selectedCompanyId) {
        notifications.show({
          title: 'Selection Required',
          message: 'Please select a company',
          color: 'red',
        });
        return;
      }
      
      // Open appropriate modal
      if (documentType === 'invoice') {
        onCreateInvoice(
          contactType === 'patient' ? selectedPatientId : undefined,
          contactType === 'company' ? selectedCompanyId : undefined
        );
      } else {
        onCreateQuote(
          contactType === 'patient' ? selectedPatientId : undefined,
          contactType === 'company' ? selectedCompanyId : undefined
        );
      }
      handleClose();
    } else {
      setActive((current) => current + 1);
    }
  };

  const handleClose = () => {
    setActive(0);
    setDocumentType('invoice');
    setContactType('patient');
    setSearchQuery('');
    setSelectedPatientId('');
    setSelectedCompanyId('');
    setPatients([]);
    setCompanies([]);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Text fw={600}>Quick Create</Text>}
      size="lg"
    >
      <Stack gap="lg">
        <Stepper active={active} onStepClick={setActive}>
          <Stepper.Step label="Type" description="Invoice or Quote">
            <Stack gap="md" mt="md">
              <Text size="sm" c="dimmed">What would you like to create?</Text>
              <Radio.Group value={documentType} onChange={(val) => setDocumentType(val as 'invoice' | 'quote')}>
                <Stack gap="sm">
                  <Paper p="md" withBorder style={{ cursor: 'pointer' }} onClick={() => setDocumentType('invoice')}>
                    <Radio
                      value="invoice"
                      label={
                        <Group gap="sm">
                          <IconFileInvoice size={20} />
                          <div>
                            <Text fw={500}>Invoice</Text>
                            <Text size="xs" c="dimmed">Create an invoice for services provided</Text>
                          </div>
                        </Group>
                      }
                    />
                  </Paper>
                  
                  <Paper p="md" withBorder style={{ cursor: 'pointer' }} onClick={() => setDocumentType('quote')}>
                    <Radio
                      value="quote"
                      label={
                        <Group gap="sm">
                          <IconFileText size={20} />
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
          </Stepper.Step>

          <Stepper.Step label="Contact" description="Patient or Company">
            <Stack gap="md" mt="md">
              <Text size="sm" c="dimmed">Who is this for?</Text>
              <Radio.Group value={contactType} onChange={(val) => setContactType(val as 'patient' | 'company')}>
                <Stack gap="sm">
                  <Paper p="md" withBorder style={{ cursor: 'pointer' }} onClick={() => setContactType('patient')}>
                    <Radio
                      value="patient"
                      label={
                        <Group gap="sm">
                          <IconUser size={20} />
                          <div>
                            <Text fw={500}>Patient</Text>
                            <Text size="xs" c="dimmed">Individual patient</Text>
                          </div>
                        </Group>
                      }
                    />
                  </Paper>
                  
                  <Paper p="md" withBorder style={{ cursor: 'pointer' }} onClick={() => setContactType('company')}>
                    <Radio
                      value="company"
                      label={
                        <Group gap="sm">
                          <IconBuilding size={20} />
                          <div>
                            <Text fw={500}>Company</Text>
                            <Text size="xs" c="dimmed">Organization or business</Text>
                          </div>
                        </Group>
                      }
                    />
                  </Paper>
                </Stack>
              </Radio.Group>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Search" description={`Find ${contactType}`}>
            <Stack gap="md" mt="md">
              <TextInput
                label={`Search for ${contactType === 'patient' ? 'Patient' : 'Company'}`}
                placeholder={`Type to search...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              
              {searchQuery.length >= 2 && (
                <Paper p="md" withBorder style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {searching ? (
                    <Text size="sm" c="dimmed">Searching...</Text>
                  ) : (
                    <Stack gap="xs">
                      {contactType === 'patient' ? (
                        patients.length > 0 ? (
                          patients.map((patient) => (
                            <Paper
                              key={patient.id}
                              p="sm"
                              withBorder
                              style={{
                                cursor: 'pointer',
                                backgroundColor: selectedPatientId === patient.id ? '#e7f5ff' : undefined
                              }}
                              onClick={() => setSelectedPatientId(patient.id)}
                            >
                              <Group justify="space-between">
                                <div>
                                  <Text fw={500}>{patient.full_name}</Text>
                                  {patient.mrn && <Text size="xs" c="dimmed">MRN: {patient.mrn}</Text>}
                                </div>
                                {selectedPatientId === patient.id && <IconCheck size={16} color="blue" />}
                              </Group>
                            </Paper>
                          ))
                        ) : (
                          <Text size="sm" c="dimmed">No patients found</Text>
                        )
                      ) : (
                        companies.length > 0 ? (
                          companies.map((company) => (
                            <Paper
                              key={company.id}
                              p="sm"
                              withBorder
                              style={{
                                cursor: 'pointer',
                                backgroundColor: selectedCompanyId === company.id ? '#e7f5ff' : undefined
                              }}
                              onClick={() => setSelectedCompanyId(company.id)}
                            >
                              <Group justify="space-between">
                                <Text fw={500}>{company.name}</Text>
                                {selectedCompanyId === company.id && <IconCheck size={16} color="blue" />}
                              </Group>
                            </Paper>
                          ))
                        ) : (
                          <Text size="sm" c="dimmed">No companies found</Text>
                        )
                      )}
                    </Stack>
                  )}
                </Paper>
              )}
              
              {searchQuery.length < 2 && (
                <Text size="sm" c="dimmed">Type at least 2 characters to search</Text>
              )}
            </Stack>
          </Stepper.Step>
        </Stepper>

        <Group justify="space-between" mt="xl">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Group>
            {active > 0 && (
              <Button variant="light" onClick={() => setActive((current) => current - 1)}>
                Back
              </Button>
            )}
            <Button onClick={handleNext}>
              {active === 2 ? 'Create' : 'Next'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

