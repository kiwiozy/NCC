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

                    {/* Communication */}
                    {(selectedReferrer.contact_json || selectedReferrer.address_json) && (
                      <Box>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Communication</Text>
                        <Divider mb="md" />
                        <Paper p="lg" withBorder>
                          <Stack gap="md">
                            {(() => {
                              const contactJson = selectedReferrer.contact_json || {};
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
                              if (selectedReferrer.address_json) {
                                const addr = selectedReferrer.address_json;
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
                    <Box>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Companies & Practices</Text>
                      <Divider mb="md" />
                      {loadingRelations ? (
                        <Center p="xl">
                          <Loader size="sm" />
                        </Center>
                      ) : referrerCompanies.length > 0 ? (
                        <Paper p="lg" withBorder>
                          <Stack gap="md">
                            {(() => {
                              const MAX_VISIBLE = 3;
                              const hasMore = referrerCompanies.length > MAX_VISIBLE;
                              const remainingCount = referrerCompanies.length - MAX_VISIBLE;

                              return hasMore ? (
                                <>
                                  <Stack gap="md">
                                    {referrerCompanies.slice(0, MAX_VISIBLE).map((rc) => (
                                      <Group key={rc.id} justify="space-between" align="center">
                                        <Group gap="sm" style={{ flex: 1 }}>
                                          <Box style={{ minWidth: rem(100) }}>
                                            <Text size="sm" c="dimmed">Company</Text>
                                            <Text size="xs" c="dimmed">{formatCompanyType(rc.company_type)}</Text>
                                          </Box>
                                          <Stack gap={4}>
                                            <Text size="md" fw={600}>
                                              {rc.company_name}
                                            </Text>
                                            {rc.position && (
                                              <Text size="sm" c="dimmed">
                                                {rc.position}
                                              </Text>
                                            )}
                                          </Stack>
                                        </Group>
                                        {rc.is_primary && (
                                          <Badge size="sm" color="blue" style={{ marginLeft: rem(40) }}>
                                            Primary
                                          </Badge>
                                        )}
                                      </Group>
                                    ))}
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
                                        {referrerCompanies.slice(MAX_VISIBLE).map((rc) => (
                                          <Group key={rc.id} justify="space-between" align="center">
                                            <Group gap="sm" style={{ flex: 1 }}>
                                              <Box style={{ minWidth: rem(100) }}>
                                                <Text size="sm" c="dimmed">Company</Text>
                                                <Text size="xs" c="dimmed">{formatCompanyType(rc.company_type)}</Text>
                                              </Box>
                                              <Stack gap={4}>
                                                <Text size="md" fw={600}>
                                                  {rc.company_name}
                                                </Text>
                                                {rc.position && (
                                                  <Text size="sm" c="dimmed">
                                                    {rc.position}
                                                  </Text>
                                                )}
                                              </Stack>
                                            </Group>
                                            {rc.is_primary && (
                                              <Badge size="sm" color="blue" style={{ marginLeft: rem(40) }}>
                                                Primary
                                              </Badge>
                                            )}
                                          </Group>
                                        ))}
                                      </Stack>
                                    </ScrollArea>
                                  </div>
                                </>
                              ) : (
                                <Stack gap="md">
                                  {referrerCompanies.map((rc) => (
                                    <Group key={rc.id} justify="space-between" align="center">
                                      <Group gap="sm" style={{ flex: 1 }}>
                                        <Box style={{ minWidth: rem(100) }}>
                                          <Text size="sm" c="dimmed">Company</Text>
                                          <Text size="xs" c="dimmed">{formatCompanyType(rc.company_type)}</Text>
                                        </Box>
                                        <Stack gap={4}>
                                          <Text size="md" fw={600}>
                                            {rc.company_name}
                                          </Text>
                                          {rc.position && (
                                            <Text size="sm" c="dimmed">
                                              {rc.position}
                                            </Text>
                                          )}
                                        </Stack>
                                      </Group>
                                      {rc.is_primary && (
                                        <Badge size="sm" color="blue" style={{ marginLeft: rem(40) }}>
                                          Primary
                                        </Badge>
                                      )}
                                    </Group>
                                  ))}
                                </Stack>
                              );
                            })()}
                          </Stack>
                        </Paper>
                      ) : (
                        <Paper p="lg" withBorder>
                          <Text size="sm" c="dimmed" ta="center" py="xl">
                            No companies associated with this referrer
                          </Text>
                        </Paper>
                      )}
                    </Box>

                    {/* Referred Patients */}
                    <Box>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Referred Patients</Text>
                      <Divider mb="md" />
                      {loadingRelations ? (
                        <Center p="xl">
                          <Loader size="sm" />
                        </Center>
                      ) : referrerPatients.length > 0 ? (
                        <Paper p="lg" withBorder>
                          <Stack gap="md">
                            {(() => {
                              const MAX_VISIBLE = 3;
                              const hasMore = referrerPatients.length > MAX_VISIBLE;
                              const remainingCount = referrerPatients.length - MAX_VISIBLE;

                              return hasMore ? (
                                <>
                                  <Stack gap="md">
                                    {referrerPatients.slice(0, MAX_VISIBLE).map((pr) => (
                                      <Group key={pr.id} justify="space-between" align="center">
                                        <Group gap="md" style={{ flex: 1 }} align="center">
                                          <Text size="md" fw={600}>
                                            {pr.patient_name}
                                          </Text>
                                          <Text size="sm" c="dimmed">
                                            {pr.referral_date ? formatDate(pr.referral_date) : 'No date'}
                                          </Text>
                                        </Group>
                                        {pr.is_primary && (
                                          <Badge size="sm" color="blue" style={{ marginLeft: rem(40) }}>
                                            Primary
                                          </Badge>
                                        )}
                                      </Group>
                                    ))}
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
                                        {referrerPatients.slice(MAX_VISIBLE).map((pr) => (
                                          <Group key={pr.id} justify="space-between" align="center">
                                            <Group gap="md" style={{ flex: 1 }} align="center">
                                              <Text size="md" fw={600}>
                                                {pr.patient_name}
                                              </Text>
                                              <Text size="sm" c="dimmed">
                                                {pr.referral_date ? formatDate(pr.referral_date) : 'No date'}
                                              </Text>
                                            </Group>
                                            {pr.is_primary && (
                                              <Badge size="sm" color="blue" style={{ marginLeft: rem(40) }}>
                                                Primary
                                              </Badge>
                                            )}
                                          </Group>
                                        ))}
                                      </Stack>
                                    </ScrollArea>
                                  </div>
                                </>
                              ) : (
                                <Stack gap="md">
                                  {referrerPatients.map((pr) => (
                                    <Group key={pr.id} justify="space-between" align="center">
                                      <Group gap="md" style={{ flex: 1 }} align="center">
                                        <Text size="md" fw={600}>
                                          {pr.patient_name}
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                          {pr.referral_date ? formatDate(pr.referral_date) : 'No date'}
                                        </Text>
                                      </Group>
                                      {pr.is_primary && (
                                        <Badge size="sm" color="blue" style={{ marginLeft: rem(40) }}>
                                          Primary
                                        </Badge>
                                      )}
                                    </Group>
                                  ))}
                                </Stack>
                              );
                            })()}
                          </Stack>
                        </Paper>
                      ) : (
                        <Paper p="lg" withBorder>
                          <Text size="sm" c="dimmed" ta="center" py="xl">
                            No active referrals from this referrer
                          </Text>
                        </Paper>
                      )}
                    </Box>
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

