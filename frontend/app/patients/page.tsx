'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Paper, Text, Loader, Center, Grid, Stack, Box, ScrollArea, UnstyledButton, Badge, Group, TextInput, Select, Textarea, rem, ActionIcon } from '@mantine/core';
import { IconPlus, IconCalendar } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import Navigation from '../components/Navigation';
import ContactHeader from '../components/ContactHeader';
import { formatDateOnlyAU } from '../utils/dateFormatting';

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

// Transform API patient data to Contact interface
const transformPatientToContact = (patient: any): Contact => {
  // Format date as DD/MMM/YYYY (using existing date utility)
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    
    const trimmed = typeof dateStr === 'string' ? dateStr.trim() : '';
    
    // If already formatted in DD/MMM/YYYY format, return as-is
    if (/^\d{1,2}\/[A-Za-z]{3}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    
    // Check if it's in old format with spaces (e.g., "25 Jun 1949") and convert
    const oldFormatMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (oldFormatMatch) {
      const [, day, month, year] = oldFormatMatch;
      return `${day}/${month}/${year}`;
    }
    
    // Only process if it looks like an ISO date string (YYYY-MM-DD) or similar
    // If it's already a formatted date string, don't try to format it again
    if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed) && !trimmed.includes('T')) {
      // Doesn't look like an ISO date - might be already formatted or invalid
      console.warn('Date string does not look like ISO format:', trimmed);
      return trimmed; // Return as-is to avoid double formatting
    }
    
    try {
      // First, get the formatted date in DD/MM/YYYY format
      const formatted = formatDateOnlyAU(dateStr); // Returns DD/MM/YYYY (e.g., "25/06/1949")
      
      // If formatDateOnlyAU returns empty or invalid, return empty
      if (!formatted || formatted.trim() === '' || formatted === 'Invalid DateTime') {
        console.warn('Invalid date from formatDateOnlyAU:', formatted, 'for input:', dateStr);
        return '';
      }
      
      // Split the formatted date (DD/MM/YYYY)
      const parts = formatted.split('/');
      if (parts.length !== 3) {
        console.warn('Unexpected date format from formatDateOnlyAU:', formatted, 'parts:', parts);
        return formatted; // Return as-is if format is unexpected
      }
      
      const [day, month, year] = parts.map(p => p.trim());
      
      // Validate parts are numbers
      if (!day || !month || !year || isNaN(parseInt(day)) || isNaN(parseInt(month)) || isNaN(parseInt(year))) {
        console.warn('Invalid date parts:', { day, month, year }, 'from formatted:', formatted);
        return formatted;
      }
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(month, 10) - 1;
      
      if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        console.warn('Invalid month index:', monthIndex, 'from month:', month);
        return formatted; // Return as-is if invalid
      }
      
      // Return formatted as "DD/MMM/YYYY" (e.g., "25/Jun/1949")
      return `${day}/${months[monthIndex]}/${year}`;
    } catch (error) {
      console.error('Error formatting date:', error, 'for input:', dateStr);
      return '';
    }
  };

  // Format date as DD/MM/YYYY (using existing utility)
  const formatDateShort = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    return formatDateOnlyAU(dateStr);
  };

  // Format date range
  const formatDateRange = (start: string | null | undefined, end: string | null | undefined): string | undefined => {
    if (!start || !end) return undefined;
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  // Handle both full serializer and list serializer responses
  // List serializer returns: full_name, age, dob
  // Full serializer returns: first_name, last_name, middle_names, title, clinic, funding_type, etc.
  
  // Build name - handle both full_name (from list) and separate fields (from detail)
  let displayName = '';
  let firstName = '';
  let middleName = '';
  let lastName = '';
  let title = '';
  
  if (patient.full_name) {
    // Using list serializer - just use full_name
    displayName = patient.full_name;
    // Try to parse name parts if possible
    const nameParts = patient.full_name.split(' ');
    firstName = nameParts[0] || '';
    lastName = nameParts[nameParts.length - 1] || '';
  } else {
    // Using full serializer - build from parts
    const titleMap: Record<string, string> = {
      'Mr': 'Mr.',
      'Mrs': 'Mrs.',
      'Ms': 'Ms.',
      'Miss': 'Miss',
      'Dr': 'Dr.',
      'Prof': 'Prof.',
    };
    title = patient.title ? titleMap[patient.title] || patient.title : '';
    firstName = patient.first_name || '';
    middleName = patient.middle_names || '';
    lastName = patient.last_name || '';
    const nameParts = [firstName];
    if (middleName) nameParts.push(middleName);
    nameParts.push(lastName);
    const fullName = nameParts.join(' ');
    displayName = title ? `${title} ${fullName}` : fullName;
  }

  // Extract clinic and funding names (may not be in list serializer)
  const clinicName = patient.clinic?.name || '';
  const fundingName = patient.funding_type?.name || '';

  // Extract contact info (may not be in list serializer)
  const contactJson = patient.contact_json || {};
  const phone = contactJson.phone || contactJson.mobile || '';
  const email = contactJson.email || '';

  return {
    id: patient.id,
    name: displayName,
    clinic: clinicName,
    funding: fundingName,
    title: title || '',
    firstName: firstName,
    middleName: middleName || undefined,
    lastName: lastName,
    dob: formatDate(patient.dob),
    age: patient.age || 0,
    healthNumber: patient.health_number || '',
    coordinator: patient.coordinator_name ? {
      name: patient.coordinator_name,
      date: formatDateShort(patient.coordinator_date),
    } : undefined,
    planDates: formatDateRange(patient.plan_start_date, patient.plan_end_date),
    communication: phone || email ? {
      phone: phone || undefined,
      email: email || undefined,
    } : undefined,
    note: patient.notes || '',
  };
};

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const [activeType, setActiveType] = useState<ContactType>('patients');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Load clinics and funding sources from API for filter dropdown
  const [clinics, setClinics] = useState<string[]>(['Newcastle', 'Tamworth', 'Port Macquarie', 'Armidale']);
  const [fundingSources, setFundingSources] = useState<string[]>(['NDIS', 'Private', 'DVA', 'Workers Comp', 'Medicare']);
  
  // Apply filters to contacts
  const applyFilters = (contactList: Contact[], query: string, filters: Record<string, string>) => {
    let filtered = [...contactList];

    // Filter by search query
    if (query) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(query.toLowerCase()) ||
        contact.firstName.toLowerCase().includes(query.toLowerCase()) ||
        contact.lastName.toLowerCase().includes(query.toLowerCase()) ||
        contact.healthNumber.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Filter by clinic
    if (filters.clinic) {
      filtered = filtered.filter(contact => contact.clinic === filters.clinic);
    }

    // Filter by funding
    if (filters.funding) {
      filtered = filtered.filter(contact => contact.funding === filters.funding);
    }

    setContacts(filtered);
    
    // Update selected contact if current selection is not in filtered list
    if (selectedContact && !filtered.find(c => c.id === selectedContact?.id)) {
      setSelectedContact(filtered[0] || null);
    }
  };

  // Load patients from API
  useEffect(() => {
    const loadPatients = async () => {
      if (activeType !== 'patients') return; // Only load for patients type
      
      setLoading(true);
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (searchQuery) {
          params.append('search', searchQuery);
        }
        // Note: Clinic and funding filtering is done client-side for now
        // Can be enhanced to use API filtering later

        const response = await fetch(`https://localhost:8000/api/patients/?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          // Handle paginated response
          const patients = data.results || data;
          const transformed = patients.map(transformPatientToContact);
          setAllContacts(transformed);
          
          // Apply client-side filtering
          applyFilters(transformed, searchQuery, activeFilters);
          
          // Select first contact if none selected
          if (transformed.length > 0 && !selectedContact) {
            setSelectedContact(transformed[0]);
          }
        } else {
          console.error('Failed to load patients:', response.statusText);
        }
      } catch (error) {
        console.error('Error loading patients:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only load if we're on the client side
    if (typeof window !== 'undefined') {
      loadPatients();
    }
  }, [activeType]); // Only reload when type changes, not on every search/filter change

  useEffect(() => {
    // Only load on client side
    if (typeof window === 'undefined') return;

    // Load clinics from API
    const loadClinics = async () => {
      try {
        const response = await fetch('https://localhost:8000/api/clinics/');
        if (response.ok) {
          const data = await response.json();
          // Extract clinic names from API response
          const clinicNames = data.map((clinic: any) => clinic.name);
          setClinics(clinicNames);
        }
      } catch (error) {
        console.error('Failed to load clinics:', error);
        // Keep hardcoded defaults on error
      }
    };
    
    // Load funding sources from API
    const loadFundingSources = async () => {
      try {
        const response = await fetch('https://localhost:8000/api/settings/funding-sources/?active=true');
        if (response.ok) {
          const data = await response.json();
          // Extract funding source names from API response (handles paginated response)
          const sources = data.results || data;
          const sourceNames = sources.map((source: any) => source.name);
          setFundingSources(sourceNames);
        }
      } catch (error) {
        console.error('Failed to load funding sources:', error);
        // Keep hardcoded defaults on error
      }
    };
    
    loadClinics();
    loadFundingSources();
  }, []);

  useEffect(() => {
    const type = searchParams.get('type') as ContactType;
    if (type) {
      setActiveType(type);
    }
  }, [searchParams]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    // Apply filters immediately to existing data
    if (allContacts.length > 0) {
      applyFilters(allContacts, value, activeFilters);
    }
  };

  const handleFilterApply = (filters: Record<string, string>) => {
    setActiveFilters(filters);
    // Apply filters immediately to existing data
    if (allContacts.length > 0) {
      applyFilters(allContacts, searchQuery, filters);
    }
  };

  // Re-apply filters when allContacts changes
  useEffect(() => {
    if (allContacts.length > 0) {
      applyFilters(allContacts, searchQuery, activeFilters);
    }
  }, [allContacts]);

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
        filterOptions={{
          funding: fundingSources,
          clinic: clinics,
          status: ['Active', 'Inactive', 'Archived'],
        }}
        contactCount={allContacts.length}
        filteredCount={contacts.length !== allContacts.length ? contacts.length : undefined}
      />
      
      <Grid gutter={0} style={{ height: 'calc(100vh - 240px)' }}>
        {/* Left Panel - Contact List */}
        <Grid.Col span={3} style={{ 
          borderRight: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
          height: '100%',
        }}>
          <ScrollArea h="100%">
            {loading ? (
              <Center h="100%">
                <Loader />
              </Center>
            ) : contacts.length === 0 ? (
              <Center h="100%">
                <Text c="dimmed">No patients found</Text>
              </Center>
            ) : (
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
            )}
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
                              value={selectedContact.dob || ''}
                              placeholder="Date of Birth"
                              readOnly
                              rightSection={<IconCalendar size={16} />}
                              styles={{ 
                                root: { flex: 1 },
                                input: { fontWeight: 700, fontSize: rem(18) } 
                              }}
                            />
                          </Group>
                          <Text size="lg" fw={700} mt="md">Age: {selectedContact.age || 0}</Text>
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
                            data={clinics}
                            styles={{ input: { fontWeight: 700, fontSize: rem(18) } }}
                          />
                        </Box>

                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Funding</Text>
                          <Select
                            value={selectedContact.funding}
                            data={fundingSources}
                            styles={{ input: { fontWeight: 700, fontSize: rem(18) } }}
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

