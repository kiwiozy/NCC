'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Paper, Text, Loader, Center, Grid, Stack, ScrollArea, UnstyledButton, Badge, Group, rem, Divider } from '@mantine/core';
import { IconStethoscope, IconPhone, IconMail, IconMapPin, IconBuilding, IconUsers } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import Navigation from '../components/Navigation';
import ContactHeader from '../components/ContactHeader';

interface ReferrerCompany {
  id: string;
  company_id: string;
  company_name: string;
  company_type: string;
  position: string;
  is_primary: boolean;
}

interface PatientReferral {
  id: string;
  patient_id: string;
  patient_name: string;
  referral_date: string;
  referral_reason: string;
  status: string;
}

interface Referrer {
  id: string;
  title: string;
  first_name: string;
  last_name: string;
  full_name: string;
  specialty: string;
  specialty_name: string;
  practice_name: string;
  company: string;
  company_name: string;
  contact_json?: {
    phone?: string;
    mobile?: string;
    email?: string;
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

interface Specialty {
  id: string;
  name: string;
}

export default function ReferrersPage() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<Referrer | null>(null);
  const [referrerCompanies, setReferrerCompanies] = useState<ReferrerCompany[]>([]);
  const [referrerPatients, setReferrerPatients] = useState<PatientReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Load specialties
  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const response = await fetch('https://localhost:8000/api/specialties/', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const specialtiesList = data.results || data;
          setSpecialties(specialtiesList);
        }
      } catch (err) {
        console.error('Error loading specialties:', err);
      }
    };

    loadSpecialties();
  }, []);

  // Load referrers (exclude coordinators)
  useEffect(() => {
    const loadReferrers = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://localhost:8000/api/referrers/', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const allReferrers = data.results || data;
          
          // EXCLUDE Support Coordinators / NDIS Coordinators (they belong on /coordinators page)
          const referrersList = allReferrers.filter((referrer: Referrer) => {
            const specialty = referrer.specialty_name?.toLowerCase() || '';
            return !specialty.includes('support coordinator') && 
                   !specialty.includes('ndis coordinator') &&
                   !specialty.includes('plan manager');
          });
          
          setReferrers(referrersList);

          // Auto-select from URL or first referrer
          if (selectedId) {
            const referrer = referrersList.find((r: Referrer) => r.id === selectedId);
            if (referrer) {
              setSelectedReferrer(referrer);
            }
          } else if (referrersList.length > 0) {
            setSelectedReferrer(referrersList[0]);
          }
        }
      } catch (err) {
        console.error('Error loading referrers:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReferrers();
  }, [selectedId]);

  // Load companies and patients for selected referrer
  useEffect(() => {
    const loadReferrerRelations = async () => {
      if (!selectedReferrer) {
        setReferrerCompanies([]);
        setReferrerPatients([]);
        return;
      }

      try {
        setLoadingRelations(true);
        
        // Load companies
        const companiesResponse = await fetch(`https://localhost:8000/api/referrer-companies/?referrer=${selectedReferrer.id}`, {
          credentials: 'include',
        });
        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json();
          const companiesList = companiesData.results || companiesData;
          setReferrerCompanies(companiesList);
        }

        // Load patients
        const patientsResponse = await fetch(`https://localhost:8000/api/patient-referrers/?referrer=${selectedReferrer.id}&status=ACTIVE`, {
          credentials: 'include',
        });
        if (patientsResponse.ok) {
          const patientsData = await patientsResponse.json();
          const patientsList = patientsData.results || patientsData;
          setReferrerPatients(patientsList);
        }
      } catch (err) {
        console.error('Error loading referrer relations:', err);
      } finally {
        setLoadingRelations(false);
      }
    };

    loadReferrerRelations();
  }, [selectedReferrer]);

  // Filter referrers
  const filteredReferrers = referrers.filter((referrer) => {
    const matchesSearch = referrer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (referrer.practice_name && referrer.practice_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (referrer.specialty_name && referrer.specialty_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSpecialty = filterSpecialty === 'all' || referrer.specialty === filterSpecialty;
    return matchesSearch && matchesSpecialty;
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

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
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
          title="Referrers"
          onSearch={(term) => setSearchTerm(term)}
          onAddNew={() => console.log('Add new referrer')}
          onArchive={() => setShowArchived(!showArchived)}
          showArchived={showArchived}
          selectedPatientName={selectedReferrer?.full_name}
          selectedPatientAddress={selectedReferrer?.address_json}
          contactCount={referrers.length}
          filteredCount={filteredReferrers.length}
          showFilters={false}
        />

        {/* Main content */}
        <Grid gutter={0} style={{ height: 'calc(100vh - 240px)', display: 'flex', overflow: 'hidden' }}>
          {/* Left Panel - Referrer List */}
          <Grid.Col span={3} style={{
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderRight: `1px solid ${isDark ? '#373A40' : '#e9ecef'}`,
            backgroundColor: isDark ? '#1A1B1E' : '#f8f9fa',
          }}>
            {/* Referrer List */}
            <ScrollArea
              style={{ flex: 1 }}
              type="scroll"
            >
              <Stack gap={0}>
                {filteredReferrers.map((referrer) => (
                  <UnstyledButton
                    key={referrer.id}
                    onClick={() => setSelectedReferrer(referrer)}
                    style={{
                      padding: rem(12),
                      borderBottom: `1px solid ${isDark ? '#373A40' : '#e9ecef'}`,
                      backgroundColor: selectedReferrer?.id === referrer.id
                        ? (isDark ? '#25262b' : '#e7f5ff')
                        : 'transparent',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <Stack gap={4}>
                      <Text 
                        size="sm" 
                        fw={500}
                        style={{
                          color: selectedReferrer?.id === referrer.id
                            ? (isDark ? '#fff' : '#228be6')
                            : (isDark ? '#C1C2C5' : '#000'),
                        }}
                      >
                        {referrer.full_name}
                      </Text>
                      <Group gap="xs">
                        {referrer.specialty_name && (
                          <Badge size="xs" variant="light">
                            {referrer.specialty_name}
                          </Badge>
                        )}
                      </Group>
                      {referrer.practice_name && (
                        <Text size="xs" c="dimmed">
                          {referrer.practice_name}
                        </Text>
                      )}
                    </Stack>
                  </UnstyledButton>
                ))}
                {filteredReferrers.length === 0 && (
                  <Center p="xl">
                    <Text c="dimmed" size="sm">No referrers found</Text>
                  </Center>
                )}
              </Stack>
            </ScrollArea>
          </Grid.Col>

          {/* Right Panel - Referrer Details */}
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
                {selectedReferrer ? (
                  <Stack gap="lg">
                    {/* Referrer Header */}
                    <Paper p="xl" shadow="xs">
                      <Stack gap="md">
                        <Group justify="space-between" align="flex-start">
                          <div>
                            <Text size="xl" fw={700}>
                              {selectedReferrer.full_name}
                            </Text>
                            <Group gap="xs" mt="xs">
                              {selectedReferrer.specialty_name && (
                                <Badge variant="light" size="lg">
                                  {selectedReferrer.specialty_name}
                                </Badge>
                              )}
                            </Group>
                          </div>
                        </Group>

                        {selectedReferrer.practice_name && (
                          <Group gap="sm">
                            <IconBuilding size={20} color={isDark ? '#909296' : '#495057'} />
                            <div>
                              <Text size="sm" c="dimmed">Practice</Text>
                              <Text size="md">{selectedReferrer.practice_name}</Text>
                            </div>
                          </Group>
                        )}

                        {selectedReferrer.company_name && (
                          <Group gap="sm">
                            <IconBuilding size={20} color={isDark ? '#909296' : '#495057'} />
                            <div>
                              <Text size="sm" c="dimmed">Company</Text>
                              <Text size="md">{selectedReferrer.company_name}</Text>
                            </div>
                          </Group>
                        )}
                      </Stack>
                    </Paper>

                    {/* Contact Information */}
                    {selectedReferrer.contact_json && (
                      <Paper p="xl" shadow="xs">
                        <Text size="lg" fw={600} mb="md">Contact Information</Text>
                        <Stack gap="md">
                          {selectedReferrer.contact_json.phone && (
                            <Group gap="sm">
                              <IconPhone size={20} color={isDark ? '#909296' : '#495057'} />
                              <div>
                                <Text size="sm" c="dimmed">Phone</Text>
                                <Text size="md">{selectedReferrer.contact_json.phone}</Text>
                              </div>
                            </Group>
                          )}
                          {selectedReferrer.contact_json.mobile && (
                            <Group gap="sm">
                              <IconPhone size={20} color={isDark ? '#909296' : '#495057'} />
                              <div>
                                <Text size="sm" c="dimmed">Mobile</Text>
                                <Text size="md">{selectedReferrer.contact_json.mobile}</Text>
                              </div>
                            </Group>
                          )}
                          {selectedReferrer.contact_json.email && (
                            <Group gap="sm">
                              <IconMail size={20} color={isDark ? '#909296' : '#495057'} />
                              <div>
                                <Text size="sm" c="dimmed">Email</Text>
                                <Text size="md">{selectedReferrer.contact_json.email}</Text>
                              </div>
                            </Group>
                          )}
                        </Stack>
                      </Paper>
                    )}

                    {/* Address */}
                    {selectedReferrer.address_json && (
                      <Paper p="xl" shadow="xs">
                        <Text size="lg" fw={600} mb="md">Address</Text>
                        <Group gap="sm" align="flex-start">
                          <IconMapPin size={20} color={isDark ? '#909296' : '#495057'} />
                          <Stack gap={2}>
                            {selectedReferrer.address_json.street && (
                              <Text size="md">{selectedReferrer.address_json.street}</Text>
                            )}
                            {selectedReferrer.address_json.street2 && (
                              <Text size="md">{selectedReferrer.address_json.street2}</Text>
                            )}
                            {(selectedReferrer.address_json.suburb || selectedReferrer.address_json.state || selectedReferrer.address_json.postcode) && (
                              <Text size="md">
                                {[
                                  selectedReferrer.address_json.suburb,
                                  selectedReferrer.address_json.state,
                                  selectedReferrer.address_json.postcode
                                ].filter(Boolean).join(' ')}
                              </Text>
                            )}
                          </Stack>
                        </Group>
                      </Paper>
                    )}

                    {/* Companies/Practices */}
                    <Paper p="xl" shadow="xs">
                      <Group justify="space-between" align="center" mb="md">
                        <Text size="lg" fw={600}>Companies & Practices</Text>
                        <Badge size="lg" variant="light">
                          {referrerCompanies.length}
                        </Badge>
                      </Group>
                      {loadingRelations ? (
                        <Center p="xl">
                          <Loader size="sm" />
                        </Center>
                      ) : referrerCompanies.length > 0 ? (
                        <Stack gap="md">
                          {referrerCompanies.map((rc) => (
                            <Paper key={rc.id} p="md" withBorder>
                              <Group justify="space-between" align="flex-start">
                                <Stack gap={4}>
                                  <Group gap="sm">
                                    <IconBuilding size={20} color={isDark ? '#909296' : '#495057'} />
                                    <Text size="md" fw={500}>
                                      {rc.company_name}
                                    </Text>
                                  </Group>
                                  <Badge size="sm" variant="light" ml={28}>
                                    {formatCompanyType(rc.company_type)}
                                  </Badge>
                                  {rc.position && (
                                    <Text size="sm" c="dimmed" ml={28}>
                                      {rc.position}
                                    </Text>
                                  )}
                                </Stack>
                                {rc.is_primary && (
                                  <Badge size="sm" color="blue">
                                    Primary
                                  </Badge>
                                )}
                              </Group>
                            </Paper>
                          ))}
                        </Stack>
                      ) : (
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                          No companies associated with this referrer
                        </Text>
                      )}
                    </Paper>

                    {/* Referred Patients */}
                    <Paper p="xl" shadow="xs">
                      <Group justify="space-between" align="center" mb="md">
                        <Text size="lg" fw={600}>Referred Patients</Text>
                        <Badge size="lg" variant="light">
                          {referrerPatients.length}
                        </Badge>
                      </Group>
                      {loadingRelations ? (
                        <Center p="xl">
                          <Loader size="sm" />
                        </Center>
                      ) : referrerPatients.length > 0 ? (
                        <Stack gap="md">
                          {referrerPatients.slice(0, 10).map((pr) => (
                            <Paper key={pr.id} p="md" withBorder>
                              <Stack gap={4}>
                                <Group gap="sm">
                                  <IconUsers size={20} color={isDark ? '#909296' : '#495057'} />
                                  <Text size="md" fw={500}>
                                    {pr.patient_name}
                                  </Text>
                                </Group>
                                {pr.referral_date && (
                                  <Text size="sm" c="dimmed" ml={28}>
                                    Referred: {formatDate(pr.referral_date)}
                                  </Text>
                                )}
                                {pr.referral_reason && (
                                  <Text size="sm" c="dimmed" ml={28} lineClamp={2}>
                                    {pr.referral_reason}
                                  </Text>
                                )}
                                <Badge size="sm" variant="light" ml={28}>
                                  {pr.status}
                                </Badge>
                              </Stack>
                            </Paper>
                          ))}
                          {referrerPatients.length > 10 && (
                            <Text size="sm" c="dimmed" ta="center" mt="xs">
                              Showing 10 of {referrerPatients.length} patients
                            </Text>
                          )}
                        </Stack>
                      ) : (
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                          No active referrals from this referrer
                        </Text>
                      )}
                    </Paper>
                  </Stack>
                ) : (
                  <Center style={{ height: '50vh' }}>
                    <Text c="dimmed">Select a referrer to view details</Text>
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

