'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Paper, Text, Loader, Center, Grid, Stack, Box, ScrollArea, UnstyledButton, Badge, Group, TextInput, Select, Textarea, rem, ActionIcon } from '@mantine/core';
import { IconPlus, IconCalendar } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import Navigation from '../components/Navigation';
import ContactHeader from '../components/ContactHeader';

type ContactType = 'patients' | 'referrers' | 'coordinator' | 'ndis-lac' | 'contacts' | 'companies' | 'clinics';

interface Contact {
  id: string;
  name: string;
  clinic: string;
  funding: string;
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dob: string;
  age: number;
  healthNumber: string;
  coordinator?: {
    name: string;
    date: string;
  };
  planDates?: string;
  communication?: {
    phone?: string;
    email?: string;
  };
  note?: string;
}

// Mock data - replace with API call
const mockContacts: Contact[] = [
  { 
    id: '1', 
    name: 'Mrs. Jacqueline Laird', 
    clinic: 'Tamworth', 
    funding: 'NDIS',
    title: 'Mrs.',
    firstName: 'Jacqueline',
    middleName: '',
    lastName: 'Laird',
    dob: '27 Jun 1968',
    age: 57,
    healthNumber: '3459585',
    coordinator: {
      name: 'Warda - Ability Connect',
      date: '30/10/2025'
    },
    planDates: '17 Jul 2024 - 27 Jul 2024',
    communication: {
      phone: '393730',
      email: 'me@me.com'
    },
    note: ''
  },
  { 
    id: '2', 
    name: 'Mr. Craig Laird', 
    clinic: 'Newcastle', 
    funding: 'NDIS',
    title: 'Mr.',
    firstName: 'Craig',
    middleName: '',
    lastName: 'Laird',
    dob: '21 Jan 1968',
    age: 57,
    healthNumber: '3333222',
    coordinator: undefined,
    planDates: undefined,
    communication: {
      phone: '0412345678',
      email: 'craig@example.com'
    },
    note: ''
  },
  { 
    id: '3', 
    name: 'Mr. Scott Laird', 
    clinic: 'Tamworth', 
    funding: 'NDIS',
    title: 'Mr.',
    firstName: 'Scott',
    middleName: '',
    lastName: 'Laird',
    dob: '16 Aug 1994',
    age: 31,
    healthNumber: '430372789',
    coordinator: undefined,
    planDates: undefined,
    communication: {
      phone: '0487654321',
      email: 'scott.laird@example.com'
    },
    note: ''
  },
];

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const [activeType, setActiveType] = useState<ContactType>('patients');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(mockContacts[0]);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const type = searchParams.get('type') as ContactType;
    if (type) {
      setActiveType(type);
    }
  }, [searchParams]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    // Filter contacts based on search
    const filtered = mockContacts.filter(contact =>
      contact.name.toLowerCase().includes(value.toLowerCase())
    );
    setContacts(filtered);
  };

  const handleFilterApply = (filters: Record<string, string>) => {
    setActiveFilters(filters);
    console.log('Applying filters:', filters);
    // TODO: Implement filter functionality
  };

  const handleAddNew = () => {
    console.log('Add new', activeType);
    // TODO: Implement add new functionality
  };

  const handleArchive = () => {
    console.log('Open archive for', activeType);
    // TODO: Implement archive functionality
  };

  const getPageTitle = () => {
    const titles: Record<ContactType, string> = {
      'patients': 'Patients',
      'referrers': 'Referrers',
      'coordinator': 'Coordinators',
      'ndis-lac': 'NDIS Local Area Coordinators',
      'contacts': 'General Contacts',
      'companies': 'Companies',
      'clinics': 'Clinics',
    };
    return titles[activeType] || 'Contacts';
  };

  return (
    <Navigation>
      <ContactHeader
        title={getPageTitle()}
        onSearch={handleSearch}
        onAddNew={handleAddNew}
        onArchive={handleArchive}
        onFilterApply={handleFilterApply}
        showFilters={true}
        contactCount={mockContacts.length}
        filteredCount={contacts.length !== mockContacts.length ? contacts.length : undefined}
      />
      
      <Grid gutter={0} style={{ height: 'calc(100vh - 240px)' }}>
        {/* Left Panel - Contact List */}
        <Grid.Col span={3} style={{ 
          borderRight: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
          height: '100%',
        }}>
          <ScrollArea h="100%">
            <Stack gap={0}>
              {contacts.map((contact) => (
                <UnstyledButton
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  style={{
                    padding: rem(16),
                    backgroundColor: selectedContact?.id === contact.id 
                      ? (isDark ? '#25262b' : '#f8f9fa')
                      : 'transparent',
                    borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedContact?.id !== contact.id) {
                      e.currentTarget.style.backgroundColor = isDark ? '#1A1B1E' : '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedContact?.id !== contact.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Stack gap={4}>
                    <Text size="sm" fw={600}>
                      {contact.name}
                    </Text>
                    <Group gap="xs">
                      <Text size="xs" c="blue">
                        {contact.clinic}
                      </Text>
                      <Badge size="xs" variant="light">
                        {contact.funding}
                      </Badge>
                    </Group>
                  </Stack>
                </UnstyledButton>
              ))}
            </Stack>
          </ScrollArea>
        </Grid.Col>

        {/* Right Panel - Contact Details */}
        <Grid.Col span={9}>
          <ScrollArea h="100%">
            <Container size="xl" py="xl">
              {selectedContact ? (
                <Stack gap="lg">
                  <Grid gutter="lg">
                    {/* Left Column */}
                    <Grid.Col span={4}>
                      <Stack gap="md">
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Name</Text>
                        
                        <Select
                          label=""
                          value={selectedContact.title}
                          data={['Mr.', 'Mrs.', 'Ms.', 'Dr.']}
                          styles={{ input: { fontWeight: 700, fontSize: rem(18) } }}
                        />
                        
                        <TextInput
                          label=""
                          value={selectedContact.firstName}
                          styles={{ input: { fontWeight: 700, fontSize: rem(18) } }}
                        />
                        
                        <TextInput
                          label=""
                          placeholder="Middle Name"
                          value={selectedContact.middleName}
                          styles={{ input: { fontWeight: 400, fontSize: rem(18) } }}
                        />
                        
                        <TextInput
                          label=""
                          value={selectedContact.lastName}
                          styles={{ input: { fontWeight: 700, fontSize: rem(18) } }}
                        />
                        
                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Date of Birth</Text>
                          <Group gap="xs">
                            <TextInput
                              value={selectedContact.dob}
                              rightSection={<IconCalendar size={16} />}
                              styles={{ 
                                root: { flex: 1 },
                                input: { fontWeight: 700, fontSize: rem(18) } 
                              }}
                            />
                          </Group>
                          <Text size="lg" fw={700} mt="md">Age: {selectedContact.age}</Text>
                        </Box>
                      </Stack>
                    </Grid.Col>

                    {/* Middle Column */}
                    <Grid.Col span={4}>
                      <Stack gap="md">
                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Health Number</Text>
                          <TextInput
                            placeholder="Health Number"
                            value={selectedContact.healthNumber}
                            styles={{ input: { fontWeight: 700, fontSize: rem(18) } }}
                          />
                        </Box>

                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Clinic</Text>
                          <Select
                            value={selectedContact.clinic}
                            data={['Newcastle', 'Tamworth', 'Port Macquarie', 'Armidale']}
                            styles={{ input: { fontWeight: 700, fontSize: rem(18) } }}
                          />
                        </Box>

                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Funding</Text>
                          <Select
                            value={selectedContact.funding}
                            data={['NDIS', 'Private', 'DVA', 'Workers Comp', 'Medicare']}
                            styles={{ input: { fontWeight: 700, fontSize: rem(18) } }}
                          />
                        </Box>

                        <Box>
                          <TextInput
                            label="id_ndis_date"
                            styles={{ 
                              label: { fontSize: rem(14), color: 'var(--mantine-color-dimmed)' },
                              input: { fontWeight: 400 } 
                            }}
                          />
                        </Box>
                      </Stack>
                    </Grid.Col>

                    {/* Right Column */}
                    <Grid.Col span={4}>
                      <Stack gap="md">
                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Coordinator</Text>
                          {selectedContact.coordinator ? (
                            <Group gap="xs" align="flex-start">
                              <Box style={{ flex: 1 }}>
                                <Text size="md" fw={700}>{selectedContact.coordinator.name}</Text>
                                <Text size="xs" c="blue">{selectedContact.coordinator.date}</Text>
                              </Box>
                              <ActionIcon variant="subtle" color="blue">
                                <IconPlus size={20} />
                              </ActionIcon>
                            </Group>
                          ) : (
                            <Group gap="xs">
                              <TextInput
                                placeholder="Select coordinator"
                                style={{ flex: 1 }}
                              />
                              <ActionIcon variant="subtle" color="blue">
                                <IconPlus size={20} />
                              </ActionIcon>
                            </Group>
                          )}
                        </Box>

                        <Box>
                          <Group gap="xs" mb="xs">
                            <Text size="md" c="blue" fw={500}>Reminder</Text>
                            <ActionIcon variant="subtle" color="blue" size="sm">
                              <IconPlus size={16} />
                            </ActionIcon>
                          </Group>
                        </Box>

                        <Box>
                          <Group justify="space-between" mb="xs">
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Current Plan Dates</Text>
                            <Group gap="xs">
                              <ActionIcon variant="subtle" color="blue" size="sm">
                                <IconPlus size={16} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="blue" size="sm">
                                <IconPlus size={16} />
                              </ActionIcon>
                            </Group>
                          </Group>
                          {selectedContact.planDates ? (
                            <Text size="md" fw={700}>{selectedContact.planDates}</Text>
                          ) : (
                            <Text size="sm" c="dimmed" fs="italic">No plan dates set</Text>
                          )}
                          <TextInput
                            label="id_ndis_date"
                            mt="md"
                            styles={{ 
                              label: { fontSize: rem(14), color: 'var(--mantine-color-dimmed)' }
                            }}
                          />
                        </Box>
                      </Stack>
                    </Grid.Col>
                  </Grid>

                  {/* Full Width Sections */}
                  <Box>
                    <Group justify="space-between" mb="md">
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Communication</Text>
                      <ActionIcon variant="subtle" color="blue">
                        <IconPlus size={20} />
                      </ActionIcon>
                    </Group>
                    {selectedContact.communication && (
                      <Paper p="lg" withBorder>
                        <Stack gap="md">
                          {selectedContact.communication.phone && (
                            <Group>
                              <Box style={{ minWidth: rem(100) }}>
                                <Text size="sm" c="dimmed">Phone</Text>
                                <Text size="xs" c="dimmed">Home</Text>
                              </Box>
                              <Text size="md" fw={600}>{selectedContact.communication.phone}</Text>
                            </Group>
                          )}
                          {selectedContact.communication.email && (
                            <Group>
                              <Box style={{ minWidth: rem(100) }}>
                                <Text size="sm" c="dimmed">Email</Text>
                                <Text size="xs" c="dimmed">Home</Text>
                              </Box>
                              <Text size="md" fw={600}>{selectedContact.communication.email}</Text>
                            </Group>
                          )}
                        </Stack>
                      </Paper>
                    )}
                  </Box>

                  <Box>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="md">Note</Text>
                    <Textarea
                      placeholder="Additional notes..."
                      value={selectedContact.note}
                      minRows={4}
                    />
                  </Box>
                </Stack>
              ) : (
                <Center h={400}>
                  <Text c="dimmed">Select a contact to view details</Text>
                </Center>
              )}
            </Container>
          </ScrollArea>
        </Grid.Col>
      </Grid>
    </Navigation>
  );
}

