'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Paper, Text, Loader, Center, Grid, Stack, ScrollArea, UnstyledButton, Badge, Group, rem, Divider, Box } from '@mantine/core';
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

interface Coordinator {
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

export default function CoordinatorsPage() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState<Coordinator | null>(null);
  const [coordinatorCompanies, setCoordinatorCompanies] = useState<ReferrerCompany[]>([]);
  const [coordinatorPatients, setCoordinatorPatients] = useState<PatientReferral[]>([]);
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

  // Load coordinators (filter referrers by specialty containing "Support Coordinator" or "NDIS")
  useEffect(() => {
    const loadCoordinators = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://localhost:8000/api/referrers/', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const allReferrers = data.results || data;
          
          // Filter to only show Support Coordinators / NDIS Coordinators
          const coordinatorsList = allReferrers.filter((referrer: Coordinator) => {
            const specialty = referrer.specialty_name?.toLowerCase() || '';
            return specialty.includes('support coordinator') || 
                   specialty.includes('ndis coordinator') ||
                   specialty.includes('plan manager');
          });
          
          setCoordinators(coordinatorsList);

          // Auto-select from URL or first coordinator
          if (selectedId) {
            const coordinator = coordinatorsList.find((c: Coordinator) => c.id === selectedId);
            if (coordinator) {
              setSelectedCoordinator(coordinator);
            }
          } else if (coordinatorsList.length > 0) {
            setSelectedCoordinator(coordinatorsList[0]);
          }
        }
      } catch (err) {
        console.error('Error loading coordinators:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCoordinators();
  }, [selectedId]);

  // Load companies and patients for selected coordinator
  useEffect(() => {
    const loadCoordinatorRelations = async () => {
      if (!selectedCoordinator) {
        setCoordinatorCompanies([]);
        setCoordinatorPatients([]);
        return;
      }

      try {
        setLoadingRelations(true);
        
        // Load companies
        const companiesResponse = await fetch(`https://localhost:8000/api/referrer-companies/?referrer=${selectedCoordinator.id}`, {
          credentials: 'include',
        });
        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json();
          const companiesList = companiesData.results || companiesData;
          setCoordinatorCompanies(companiesList);
        }

        // Load patients
        const patientsResponse = await fetch(`https://localhost:8000/api/patient-referrers/?referrer=${selectedCoordinator.id}&status=ACTIVE`, {
          credentials: 'include',
        });
        if (patientsResponse.ok) {
          const patientsData = await patientsResponse.json();
          const patientsList = patientsData.results || patientsData;
          setCoordinatorPatients(patientsList);
        }
      } catch (err) {
        console.error('Error loading coordinator relations:', err);
      } finally {
        setLoadingRelations(false);
      }
    };

    loadCoordinatorRelations();
  }, [selectedCoordinator]);

  // Filter coordinators
  const filteredCoordinators = coordinators.filter((coordinator) => {
    const matchesSearch = coordinator.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (coordinator.practice_name && coordinator.practice_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (coordinator.specialty_name && coordinator.specialty_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSpecialty = filterSpecialty === 'all' || coordinator.specialty === filterSpecialty;
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
          title="Coordinators"
          onSearch={(term) => setSearchTerm(term)}
          onAddNew={() => console.log('Add new coordinator')}
          onArchive={() => setShowArchived(!showArchived)}
          showArchived={showArchived}
          selectedPatientName={selectedCoordinator?.full_name}
          selectedPatientAddress={selectedCoordinator?.address_json}
          contactCount={coordinators.length}
          filteredCount={filteredCoordinators.length}
          showFilters={false}
        />

        {/* Main content */}
        <Grid gutter={0} style={{ height: 'calc(100vh - 240px)', display: 'flex', overflow: 'hidden' }}>
          {/* Left Panel - Coordinator List */}
          <Grid.Col span={3} style={{
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderRight: `1px solid ${isDark ? '#373A40' : '#e9ecef'}`,
            backgroundColor: isDark ? '#1A1B1E' : '#f8f9fa',
          }}>
            {/* Coordinator List */}
            <ScrollArea
              style={{ flex: 1 }}
              type="scroll"
            >
              <Stack gap={0}>
                {filteredCoordinators.map((coordinator) => (
                  <UnstyledButton
                    key={coordinator.id}
                    onClick={() => setSelectedCoordinator(coordinator)}
                    style={{
                      padding: rem(12),
                      borderBottom: `1px solid ${isDark ? '#373A40' : '#e9ecef'}`,
                      backgroundColor: selectedCoordinator?.id === coordinator.id
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
                          color: selectedCoordinator?.id === coordinator.id
                            ? (isDark ? '#fff' : '#228be6')
                            : (isDark ? '#C1C2C5' : '#000'),
                        }}
                      >
                        {coordinator.full_name}
                      </Text>
                      <Group gap="xs">
                        {coordinator.specialty_name && (
                          <Badge size="xs" variant="light">
                            {coordinator.specialty_name}
                          </Badge>
                        )}
                      </Group>
                      {coordinator.practice_name && (
                        <Text size="xs" c="dimmed">
                          {coordinator.practice_name}
                        </Text>
                      )}
                    </Stack>
                  </UnstyledButton>
                ))}
                {filteredCoordinators.length === 0 && (
                  <Center p="xl">
                    <Text c="dimmed" size="sm">No coordinators found</Text>
                  </Center>
                )}
              </Stack>
            </ScrollArea>
          </Grid.Col>

          {/* Right Panel - Coordinator Details */}
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
                {selectedCoordinator ? (
                  <Stack gap="lg">
                    {/* Coordinator Header */}
                    <Paper p="xl" shadow="xs">
                      <Stack gap="md">
                        <Group justify="space-between" align="flex-start">
                          <div>
                            <Text size="xl" fw={700}>
                              {selectedCoordinator.full_name}
                            </Text>
                            <Group gap="xs" mt="xs">
                              {selectedCoordinator.specialty_name && (
                                <Badge variant="light" size="lg">
                                  {selectedCoordinator.specialty_name}
                                </Badge>
                              )}
                            </Group>
                          </div>
                        </Group>

                        {selectedCoordinator.practice_name && (
                          <Group gap="sm">
                            <IconBuilding size={20} color={isDark ? '#909296' : '#495057'} />
                            <div>
                              <Text size="sm" c="dimmed">Practice</Text>
                              <Text size="md">{selectedCoordinator.practice_name}</Text>
                            </div>
                          </Group>
                        )}

                        {selectedCoordinator.company_name && (
                          <Group gap="sm">
                            <IconBuilding size={20} color={isDark ? '#909296' : '#495057'} />
                            <div>
                              <Text size="sm" c="dimmed">Company</Text>
                              <Text size="md">{selectedCoordinator.company_name}</Text>
                            </div>
                          </Group>
                        )}
                      </Stack>
                    </Paper>

                    {/* Communication */}
                    {(selectedCoordinator.contact_json || selectedCoordinator.address_json) && (
                      <Box>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Communication</Text>
                        <Divider mb="md" />
                        <Paper p="lg" withBorder>
                          <Stack gap="md">
                            {(() => {
                              const contactJson = selectedCoordinator.contact_json || {};
                              const items: JSX.Element[] = [];
                              const MAX_VISIBLE = 3;

                              // Handle phones array
                              if (contactJson.phones && Array.isArray(contactJson.phones)) {
                                contactJson.phones.forEach((phone: any, index: number) => {
                                  items.push(
                                    <Group key={`phone-${index}`}>
                                      <Box style={{ minWidth: rem(100) }}>
                                        <Text size="sm" c="dimmed">Phone</Text>
                                        <Text size="xs" c="dimmed">{phone.label || phone.type || 'Phone'}</Text>
                                      </Box>
                                      <Text size="md" fw={600}>{phone.number || phone.value || phone}</Text>
                                    </Group>
                                  );
                                });
                              }
                              // Fallback for old format
                              else if (contactJson.phone) {
                                items.push(
                                  <Group key="phone">
                                    <Box style={{ minWidth: rem(100) }}>
                                      <Text size="sm" c="dimmed">Phone</Text>
                                      <Text size="xs" c="dimmed">Phone</Text>
                                    </Box>
                                    <Text size="md" fw={600}>{contactJson.phone}</Text>
                                  </Group>
                                );
                              }
                              if (contactJson.mobile) {
                                items.push(
                                  <Group key="mobile">
                                    <Box style={{ minWidth: rem(100) }}>
                                      <Text size="sm" c="dimmed">Mobile</Text>
                                      <Text size="xs" c="dimmed">Mobile</Text>
                                    </Box>
                                    <Text size="md" fw={600}>{contactJson.mobile}</Text>
                                  </Group>
                                );
                              }

                              // Handle emails array
                              if (contactJson.emails && Array.isArray(contactJson.emails)) {
                                contactJson.emails.forEach((email: any, index: number) => {
                                  items.push(
                                    <Group key={`email-${index}`}>
                                      <Box style={{ minWidth: rem(100) }}>
                                        <Text size="sm" c="dimmed">Email</Text>
                                        <Text size="xs" c="dimmed">{email.label || 'Email'}</Text>
                                      </Box>
                                      <Text size="md" fw={600}>{email.address || email.value || email}</Text>
                                    </Group>
                                  );
                                });
                              }
                              // Fallback for old format
                              else if (contactJson.email) {
                                items.push(
                                  <Group key="email">
                                    <Box style={{ minWidth: rem(100) }}>
                                      <Text size="sm" c="dimmed">Email</Text>
                                      <Text size="xs" c="dimmed">Email</Text>
                                    </Box>
                                    <Text size="md" fw={600}>{contactJson.email}</Text>
                                  </Group>
                                );
                              }

                              // Handle address
                              if (selectedCoordinator.address_json) {
                                const addr = selectedCoordinator.address_json;
                                const addressStr = [
                                  addr.street,
                                  addr.street2,
                                  addr.suburb,
                                  addr.postcode,
                                  addr.state,
                                ].filter(Boolean).join(', ');
                                
                                items.push(
                                  <Group key="address">
                                    <Box style={{ minWidth: rem(100) }}>
                                      <Text size="sm" c="dimmed">Address</Text>
                                      <Text size="xs" c="dimmed">{addr.type ? addr.type.charAt(0).toUpperCase() + addr.type.slice(1) : 'Home'}</Text>
                                    </Box>
                                    <Text size="md" fw={600}>{addressStr}</Text>
                                  </Group>
                                );
                              }

                              const hasMore = items.length > MAX_VISIBLE;
                              const remainingCount = items.length - MAX_VISIBLE;

                              if (items.length === 0) {
                                return <Text size="sm" c="dimmed" fs="italic">No contact information</Text>;
                              }

                              return hasMore ? (
                                <>
                                  <Stack gap="md">
                                    {items.slice(0, MAX_VISIBLE)}
                                  </Stack>
                                  <div
                                    style={{ 
                                      position: 'relative',
                                      pointerEvents: 'none'
                                    }}
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                  >
                                    <ScrollArea
                                      h={152}
                                      offsetScrollbars
                                      style={{ pointerEvents: 'auto' }}
                                    >
                                      <Stack gap="md">
                                        {items.slice(MAX_VISIBLE)}
                                      </Stack>
                                    </ScrollArea>
                                  </div>
                                  <Text size="xs" c="dimmed" fs="italic" mt={4} ta="center">
                                    Scroll for {remainingCount} more...
                                  </Text>
                                </>
                              ) : (
                                <Stack gap="md">
                                  {items}
                                </Stack>
                              );
                            })()}
                          </Stack>
                        </Paper>
                      </Box>
                    )}

                    {/* Companies/Practices */}
                    <Paper p="xl" shadow="xs">
                      <Group justify="space-between" align="center" mb="md">
                        <Text size="lg" fw={600}>Companies & Practices</Text>
                        <Badge size="lg" variant="light">
                          {coordinatorCompanies.length}
                        </Badge>
                      </Group>
                      {loadingRelations ? (
                        <Center p="xl">
                          <Loader size="sm" />
                        </Center>
                      ) : coordinatorCompanies.length > 0 ? (
                        <Stack gap="md">
                          {coordinatorCompanies.map((rc) => (
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
                          No companies associated with this coordinator
                        </Text>
                      )}
                    </Paper>

                    {/* Coordinated Patients */}
                    <Paper p="xl" shadow="xs">
                      <Group justify="space-between" align="center" mb="md">
                        <Text size="lg" fw={600}>Coordinated Patients</Text>
                        <Badge size="lg" variant="light">
                          {coordinatorPatients.length}
                        </Badge>
                      </Group>
                      {loadingRelations ? (
                        <Center p="xl">
                          <Loader size="sm" />
                        </Center>
                      ) : coordinatorPatients.length > 0 ? (
                        <Stack gap="md">
                          {coordinatorPatients.slice(0, 10).map((pr) => (
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
                          {coordinatorPatients.length > 10 && (
                            <Text size="sm" c="dimmed" ta="center" mt="xs">
                              Showing 10 of {coordinatorPatients.length} patients
                            </Text>
                          )}
                        </Stack>
                      ) : (
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                          No active patients with this coordinator
                        </Text>
                      )}
                    </Paper>
                  </Stack>
                ) : (
                  <Center style={{ height: '50vh' }}>
                    <Text c="dimmed">Select a coordinator to view details</Text>
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

