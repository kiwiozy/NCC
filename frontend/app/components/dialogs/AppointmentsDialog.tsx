'use client';

import { useEffect, useState } from 'react';
import { Modal, Table, Text, Loader, Center, Stack, rem, Badge, ScrollArea } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

interface AppointmentsDialogProps {
  opened: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

interface Appointment {
  id: string;
  start_time: string;
  clinic: string;  // UUID
  clinic_name: string;  // Clinic name from serializer
  status: string;
}

export default function AppointmentsDialog({ 
  opened, 
  onClose, 
  patientId, 
  patientName 
}: AppointmentsDialogProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opened && patientId) {
      loadAppointments();
    }
  }, [opened, patientId]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://localhost:8000/api/appointments/?patient=${patientId}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        const appointmentsList = data.results || data;
        setAppointments(Array.isArray(appointmentsList) ? appointmentsList : []);
      } else {
        console.error('Failed to load appointments:', response.statusText);
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return dayjs(dateString).tz('Australia/Sydney').format('h:mm A');
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).tz('Australia/Sydney').format('D MMM YYYY');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return 'blue';
      case 'completed':
        return 'green';
      case 'cancelled':
        return 'red';
      case 'no-show':
        return 'orange';
      default:
        return 'gray';
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Stack gap={4}>
          <Text size="lg" fw={600}>
            Appointments
          </Text>
          <Text size="sm" c="dimmed">
            {patientName}
          </Text>
        </Stack>
      }
      size="lg"
      padding="md"
    >
      {loading ? (
        <Center py="xl">
          <Loader size="md" />
        </Center>
      ) : appointments.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <IconCalendar size={48} stroke={1.5} opacity={0.5} />
            <Text c="dimmed">No appointments found</Text>
          </Stack>
        </Center>
      ) : (
        <ScrollArea style={{ height: rem(500) }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Time</Table.Th>
                <Table.Th>Clinic</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {appointments.map((appointment) => (
                <Table.Tr key={appointment.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {formatTime(appointment.start_time)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{appointment.clinic_name || 'Unknown'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatDate(appointment.start_time)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge 
                      size="sm" 
                      color={getStatusColor(appointment.status)}
                      variant="light"
                    >
                      {appointment.status || 'Scheduled'}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
      
      {!loading && appointments.length > 0 && (
        <Text size="sm" c="dimmed" mt="md" ta="center">
          {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} found
        </Text>
      )}
    </Modal>
  );
}

