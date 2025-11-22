'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TextInput,
  Select,
  Badge,
  Group,
  Stack,
  Text,
  ActionIcon,
  Tooltip,
  Paper,
  ScrollArea,
  Loader,
  Center,
  Box,
} from '@mantine/core';
import { IconSearch, IconRefresh, IconEye, IconTrash } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import SMSDialog from '../dialogs/SMSDialog';

interface SMSHistoryRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  phone_number: string;
  message: string;
  direction: 'outbound' | 'inbound';
  status: 'sent' | 'delivered' | 'failed' | 'received';
  sent_at: string;
  delivery_status?: string;
  clinic_name?: string;
  clinician_name?: string;
  appointment_id?: string;
  template_name?: string;
  character_count: number;
  segment_count: number;
}

export default function HistoryTab() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const [history, setHistory] = useState<SMSHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clinicFilter, setClinicFilter] = useState<string>('all');
  const [clinics, setClinics] = useState<string[]>([]);

  // SMS Dialog state
  const [smsDialogOpened, setSmsDialogOpened] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://localhost:8000/api/sms/history/', {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch SMS history');

      const data = await response.json();
      setHistory(data);

      // Extract unique clinics for filter
      const uniqueClinics = [...new Set(data.map((item: SMSHistoryRecord) => item.clinic_name).filter(Boolean))];
      setClinics(uniqueClinics as string[]);
    } catch (error) {
      console.error('Error fetching SMS history:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load SMS history',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewConversation = (patientId: string, patientName: string) => {
    setSelectedPatientId(patientId);
    setSelectedPatientName(patientName);
    setSmsDialogOpened(true);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch(`https://localhost:8000/api/sms/history/${messageId}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken || '',
        },
      });

      if (!response.ok) throw new Error('Failed to delete message');

      notifications.show({
        title: 'Success',
        message: 'Message deleted',
        color: 'green',
      });

      fetchHistory();
    } catch (error) {
      console.error('Error deleting message:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete message',
        color: 'red',
      });
    }
  };

  // Filter history
  const filteredHistory = history.filter((record) => {
    const matchesSearch =
      searchQuery === '' ||
      record.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.phone_number.includes(searchQuery) ||
      record.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDirection = directionFilter === 'all' || record.direction === directionFilter;
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesClinic = clinicFilter === 'all' || record.clinic_name === clinicFilter;

    return matchesSearch && matchesDirection && matchesStatus && matchesClinic;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'green';
      case 'sent':
        return 'blue';
      case 'failed':
        return 'red';
      case 'received':
        return 'cyan';
      default:
        return 'gray';
    }
  };

  const getDirectionBadge = (direction: string) => {
    return direction === 'outbound' ? (
      <Badge color="blue" size="sm">
        Sent
      </Badge>
    ) : (
      <Badge color="cyan" size="sm">
        Received
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Loading SMS history...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <>
      <Stack gap="md">
        {/* Filters */}
        <Paper p="md" withBorder bg={isDark ? 'dark.6' : 'gray.0'}>
          <Group gap="md">
            <TextInput
              placeholder="Search patient, phone, or message..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Direction"
              data={[
                { value: 'all', label: 'All Messages' },
                { value: 'outbound', label: 'Sent' },
                { value: 'inbound', label: 'Received' },
              ]}
              value={directionFilter}
              onChange={(value) => setDirectionFilter(value || 'all')}
              style={{ width: 150 }}
            />
            <Select
              placeholder="Status"
              data={[
                { value: 'all', label: 'All Status' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'sent', label: 'Sent' },
                { value: 'failed', label: 'Failed' },
                { value: 'received', label: 'Received' },
              ]}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || 'all')}
              style={{ width: 150 }}
            />
            <Select
              placeholder="Clinic"
              data={[
                { value: 'all', label: 'All Clinics' },
                ...clinics.map((clinic) => ({ value: clinic, label: clinic })),
              ]}
              value={clinicFilter}
              onChange={(value) => setClinicFilter(value || 'all')}
              style={{ width: 150 }}
            />
            <Tooltip label="Refresh">
              <ActionIcon variant="light" onClick={fetchHistory}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Paper>

        {/* Results Count */}
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {filteredHistory.length} {filteredHistory.length === 1 ? 'message' : 'messages'} found
          </Text>
        </Group>

        {/* History Table */}
        <ScrollArea style={{ height: 'calc(100vh - 350px)' }}>
          <Table highlightOnHover striped withTableBorder style={{ tableLayout: 'fixed', width: '100%' }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: '10%' }}>Time</Table.Th>
                <Table.Th style={{ width: '15%' }}>Patient</Table.Th>
                <Table.Th style={{ width: '10%' }}>Phone</Table.Th>
                <Table.Th style={{ width: '35%' }}>Message</Table.Th>
                <Table.Th style={{ width: '8%' }}>Direction</Table.Th>
                <Table.Th style={{ width: '8%' }}>Status</Table.Th>
                <Table.Th style={{ width: '10%' }}>Clinic</Table.Th>
                <Table.Th style={{ width: '4%' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredHistory.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Center h={200}>
                      <Text c="dimmed">No SMS messages found</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredHistory.map((record) => (
                  <Table.Tr key={record.id}>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {formatDateTime(record.sent_at)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={1}>
                        {record.patient_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {record.phone_number}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={2} c="dimmed">
                        {record.message}
                      </Text>
                    </Table.Td>
                    <Table.Td>{getDirectionBadge(record.direction)}</Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(record.status)} size="sm">
                        {record.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {record.clinic_name || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <Tooltip label="View conversation">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            onClick={() => handleViewConversation(record.patient_id, record.patient_name)}
                          >
                            <IconEye size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={() => handleDeleteMessage(record.id)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>

      {/* SMS Dialog */}
      <SMSDialog
        opened={smsDialogOpened}
        onClose={() => {
          setSmsDialogOpened(false);
          fetchHistory(); // Refresh after closing dialog
        }}
        patientId={selectedPatientId}
        patientName={selectedPatientName}
      />
    </>
  );
}

