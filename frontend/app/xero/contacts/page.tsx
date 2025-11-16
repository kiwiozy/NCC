'use client';

import { useState, useEffect } from 'react';
import { Container, Title, Text, Paper, Table, Badge, Button, Group, Stack, TextInput, Select, Loader, Center, ActionIcon, Tooltip, rem } from '@mantine/core';
import { IconSearch, IconRefresh, IconCheck, IconX, IconExternalLink, IconUsers, IconBuilding } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Navigation from '../../components/Navigation';
import { formatDateTimeAU } from '../../utils/dateFormatting';

interface XeroContactLink {
  id: string;
  patient: string | null;
  company: string | null;
  patient_name: string | null;
  company_name: string | null;
  entity_type: 'Patient' | 'Company' | 'Unknown';
  entity_name: string;
  xero_contact_id: string;
  xero_contact_number: string;
  xero_contact_name: string;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function XeroContactsPage() {
  const [contacts, setContacts] = useState<XeroContactLink[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<XeroContactLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>('all');

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://localhost:8000/api/xero-contact-links/');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      
      const data = await response.json();
      const contactsList = data.results || data;
      setContacts(contactsList);
      setFilteredContacts(contactsList);
    } catch (error) {
      console.error('Error fetching Xero contacts:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load Xero contacts',
        color: 'red',
        icon: <IconX />,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Filter contacts based on search and type
  useEffect(() => {
    let filtered = contacts;

    // Filter by type
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(c => c.entity_type === typeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.entity_name.toLowerCase().includes(query) ||
        c.xero_contact_name.toLowerCase().includes(query) ||
        c.xero_contact_number.toLowerCase().includes(query)
      );
    }

    setFilteredContacts(filtered);
  }, [contacts, searchQuery, typeFilter]);

  const getXeroContactUrl = (contactId: string) => {
    // Note: This URL may need to be updated based on the actual Xero tenant
    return `https://go.xero.com/Contacts/View/${contactId}`;
  };

  if (loading) {
    return (
      <Navigation>
        <Container size="xl" py="xl">
          <Center h={400}>
            <Loader size="lg" />
          </Center>
        </Container>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2}>Xero Contacts</Title>
              <Text c="dimmed" size="sm" mt="xs">
                Manage patient and company contacts synced to Xero
              </Text>
            </div>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={fetchContacts}
              variant="light"
            >
              Refresh
            </Button>
          </Group>

          {/* Stats */}
          <Group gap="md">
            <Paper p="md" withBorder style={{ flex: 1 }}>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Contacts</Text>
                  <Text size="xl" fw={700}>{contacts.length}</Text>
                </div>
                <IconUsers size={32} style={{ opacity: 0.3 }} />
              </Group>
            </Paper>
            <Paper p="md" withBorder style={{ flex: 1 }}>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Patients</Text>
                  <Text size="xl" fw={700}>{contacts.filter(c => c.entity_type === 'Patient').length}</Text>
                </div>
                <IconUsers size={32} style={{ opacity: 0.3 }} />
              </Group>
            </Paper>
            <Paper p="md" withBorder style={{ flex: 1 }}>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Companies</Text>
                  <Text size="xl" fw={700}>{contacts.filter(c => c.entity_type === 'Company').length}</Text>
                </div>
                <IconBuilding size={32} style={{ opacity: 0.3 }} />
              </Group>
            </Paper>
          </Group>

          {/* Filters */}
          <Paper p="md" withBorder>
            <Group>
              <TextInput
                placeholder="Search contacts..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <Select
                placeholder="Filter by type"
                data={[
                  { value: 'all', label: 'All Types' },
                  { value: 'Patient', label: 'Patients' },
                  { value: 'Company', label: 'Companies' },
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: 200 }}
              />
            </Group>
          </Paper>

          {/* Contacts Table */}
          <Paper shadow="sm" p="0" withBorder>
            {filteredContacts.length === 0 ? (
              <Center p="xl">
                <Stack align="center" gap="xs">
                  <IconUsers size={48} style={{ opacity: 0.3 }} />
                  <Text c="dimmed">
                    {searchQuery || typeFilter !== 'all' ? 'No contacts match your filters' : 'No contacts synced yet'}
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Table.ScrollContainer minWidth={800}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Nexus Name</Table.Th>
                      <Table.Th>Xero Contact Name</Table.Th>
                      <Table.Th>Contact Number</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Last Synced</Table.Th>
                      <Table.Th style={{ width: '80px' }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredContacts.map((contact) => (
                      <Table.Tr key={contact.id}>
                        <Table.Td>
                          <Badge
                            color={contact.entity_type === 'Patient' ? 'blue' : 'violet'}
                            variant="light"
                            leftSection={
                              contact.entity_type === 'Patient' ? (
                                <IconUsers size={12} />
                              ) : (
                                <IconBuilding size={12} />
                              )
                            }
                          >
                            {contact.entity_type}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>{contact.entity_name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{contact.xero_contact_name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{contact.xero_contact_number || '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          {contact.is_active ? (
                            <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
                              Active
                            </Badge>
                          ) : (
                            <Badge color="gray" variant="light" leftSection={<IconX size={12} />}>
                              Inactive
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {contact.last_synced_at ? formatDateTimeAU(contact.last_synced_at) : 'Never'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label="View in Xero">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              component="a"
                              href={getXeroContactUrl(contact.xero_contact_id)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <IconExternalLink size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Paper>
        </Stack>
      </Container>
    </Navigation>
  );
}
