'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Paper, Text, Loader, Center, Grid, Stack, ScrollArea, UnstyledButton, Badge, Group, rem } from '@mantine/core';
import { IconBuilding, IconPhone, IconMail, IconMapPin } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import Navigation from '../components/Navigation';
import ContactHeader from '../components/ContactHeader';

interface Company {
  id: string;
  name: string;
  abn: string;
  company_type: string;
  contact_json?: {
    phone?: string;
    email?: string;
    fax?: string;
  };
  address_json?: {
    street?: string;
    street2?: string;
    suburb?: string;
    postcode?: string;
    state?: string;
  };
  created_at: string;
  updated_at: string;
}

export default function CompaniesPage() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Load companies
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://localhost:8000/api/companies/', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const companiesList = data.results || data;
          setCompanies(companiesList);

          // Auto-select from URL or first company
          if (selectedId) {
            const company = companiesList.find((c: Company) => c.id === selectedId);
            if (company) {
              setSelectedCompany(company);
            }
          } else if (companiesList.length > 0) {
            setSelectedCompany(companiesList[0]);
          }
        }
      } catch (err) {
        console.error('Error loading companies:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, [selectedId]);

  // Filter companies
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (company.abn && company.abn.includes(searchTerm));
    const matchesType = filterType === 'all' || company.company_type === filterType;
    return matchesSearch && matchesType;
  });

  // Format company type for display
  const formatCompanyType = (type: string) => {
    const typeMap: Record<string, string> = {
      'MEDICAL_PRACTICE': 'Medical Practice',
      'NDIS_PROVIDER': 'NDIS Provider',
      'OTHER': 'Other',
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <Navigation>
        <Center style={{ height: '100vh' }}>
          <Loader size="xl" />
        </Center>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header with Search, Filter, Archive, Add, Delete */}
        <ContactHeader
          title="Companies"
          onSearch={(term) => setSearchTerm(term)}
          onAddNew={() => console.log('Add new company')}
          onArchive={() => setShowArchived(!showArchived)}
          showArchived={showArchived}
          contactCount={companies.length}
          filteredCount={filteredCompanies.length}
          showFilters={false}
        />

        {/* Main content */}
        <Grid gutter={0} style={{ height: 'calc(100vh - 240px)', display: 'flex', overflow: 'hidden' }}>
          {/* Left Panel - Company List */}
          <Grid.Col span={3} style={{
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderRight: `1px solid ${isDark ? '#373A40' : '#e9ecef'}`,
            backgroundColor: isDark ? '#1A1B1E' : '#f8f9fa',
          }}>
            {/* Company List */}
            <ScrollArea
              style={{ flex: 1 }}
              type="scroll"
            >
              <Stack gap={0}>
                {filteredCompanies.map((company) => (
                  <UnstyledButton
                    key={company.id}
                    onClick={() => setSelectedCompany(company)}
                    style={{
                      padding: rem(12),
                      borderBottom: `1px solid ${isDark ? '#373A40' : '#e9ecef'}`,
                      backgroundColor: selectedCompany?.id === company.id
                        ? (isDark ? '#25262b' : '#e7f5ff')
                        : 'transparent',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <Stack gap={4}>
                      <Group justify="space-between">
                        <Text 
                          size="sm" 
                          fw={500}
                          style={{
                            color: selectedCompany?.id === company.id
                              ? (isDark ? '#fff' : '#228be6')
                              : (isDark ? '#C1C2C5' : '#000'),
                          }}
                        >
                          {company.name}
                        </Text>
                      </Group>
                      <Group gap="xs">
                        <Badge size="xs" variant="light">
                          {formatCompanyType(company.company_type)}
                        </Badge>
                        {company.abn && (
                          <Text size="xs" c="dimmed">
                            ABN: {company.abn}
                          </Text>
                        )}
                      </Group>
                    </Stack>
                  </UnstyledButton>
                ))}
                {filteredCompanies.length === 0 && (
                  <Center p="xl">
                    <Text c="dimmed" size="sm">No companies found</Text>
                  </Center>
                )}
              </Stack>
            </ScrollArea>
          </Grid.Col>

          {/* Right Panel - Company Details */}
          <Grid.Col span={9} style={{
            height: '100%',
            maxHeight: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <ScrollArea
              h="100%"
              type="scroll"
            >
              <Container size="xl" py="xl">
                {selectedCompany ? (
                  <Stack gap="lg">
                    {/* Company Header */}
                    <Paper p="xl" shadow="xs">
                      <Stack gap="md">
                        <Group justify="space-between" align="flex-start">
                          <div>
                            <Text size="xl" fw={700}>
                              {selectedCompany.name}
                            </Text>
                            <Group gap="xs" mt="xs">
                              <Badge variant="light" size="lg">
                                {formatCompanyType(selectedCompany.company_type)}
                              </Badge>
                            </Group>
                          </div>
                        </Group>

                        {selectedCompany.abn && (
                          <div>
                            <Text size="sm" c="dimmed" mb={4}>ABN</Text>
                            <Text size="md">{selectedCompany.abn}</Text>
                          </div>
                        )}
                      </Stack>
                    </Paper>

                    {/* Contact Information */}
                    {selectedCompany.contact_json && (
                      <Paper p="xl" shadow="xs">
                        <Text size="lg" fw={600} mb="md">Contact Information</Text>
                        <Stack gap="md">
                          {selectedCompany.contact_json.phone && (
                            <Group gap="sm">
                              <IconPhone size={20} color={isDark ? '#909296' : '#495057'} />
                              <div>
                                <Text size="sm" c="dimmed">Phone</Text>
                                <Text size="md">{selectedCompany.contact_json.phone}</Text>
                              </div>
                            </Group>
                          )}
                          {selectedCompany.contact_json.email && (
                            <Group gap="sm">
                              <IconMail size={20} color={isDark ? '#909296' : '#495057'} />
                              <div>
                                <Text size="sm" c="dimmed">Email</Text>
                                <Text size="md">{selectedCompany.contact_json.email}</Text>
                              </div>
                            </Group>
                          )}
                          {selectedCompany.contact_json.fax && (
                            <Group gap="sm">
                              <IconPhone size={20} color={isDark ? '#909296' : '#495057'} />
                              <div>
                                <Text size="sm" c="dimmed">Fax</Text>
                                <Text size="md">{selectedCompany.contact_json.fax}</Text>
                              </div>
                            </Group>
                          )}
                        </Stack>
                      </Paper>
                    )}

                    {/* Address */}
                    {selectedCompany.address_json && (
                      <Paper p="xl" shadow="xs">
                        <Text size="lg" fw={600} mb="md">Address</Text>
                        <Group gap="sm" align="flex-start">
                          <IconMapPin size={20} color={isDark ? '#909296' : '#495057'} />
                          <Stack gap={2}>
                            {selectedCompany.address_json.street && (
                              <Text size="md">{selectedCompany.address_json.street}</Text>
                            )}
                            {selectedCompany.address_json.street2 && (
                              <Text size="md">{selectedCompany.address_json.street2}</Text>
                            )}
                            {(selectedCompany.address_json.suburb || selectedCompany.address_json.state || selectedCompany.address_json.postcode) && (
                              <Text size="md">
                                {[
                                  selectedCompany.address_json.suburb,
                                  selectedCompany.address_json.state,
                                  selectedCompany.address_json.postcode
                                ].filter(Boolean).join(' ')}
                              </Text>
                            )}
                          </Stack>
                        </Group>
                      </Paper>
                    )}
                  </Stack>
                ) : (
                  <Center style={{ height: '50vh' }}>
                    <Text c="dimmed">Select a company to view details</Text>
                  </Center>
                )}
              </Container>
            </ScrollArea>
          </Grid.Col>
        </Grid>
      </div>
    </Navigation>
  );
}

