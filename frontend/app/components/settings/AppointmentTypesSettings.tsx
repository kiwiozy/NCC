'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  TextInput,
  NumberInput,
  Switch,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Text,
  Paper,
  Title,
  LoadingOverlay,
  rem,
} from '@mantine/core';
import { IconEdit, IconTrash, IconPlus, IconClock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface AppointmentType {
  id: string;
  name: string;
  default_duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AppointmentTypesSettings() {
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<AppointmentType | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<AppointmentType | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDuration, setFormDuration] = useState(30);
  const [formActive, setFormActive] = useState(true);
  const [formErrors, setFormErrors] = useState<{ name?: string; duration?: string }>({});

  useEffect(() => {
    loadAppointmentTypes();
  }, []);

  const loadAppointmentTypes = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      console.log('Loading appointment types...');
      const response = await fetch('https://localhost:8000/api/appointment-types/?include_inactive=true', {
        credentials: 'include',
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('Received data:', data);
        // Handle both paginated and non-paginated responses
        let types: AppointmentType[] = [];
        if (Array.isArray(data)) {
          types = data;
        } else if (data && Array.isArray(data.results)) {
          // Django REST Framework paginated response
          types = data.results;
        } else if (data && typeof data === 'object') {
          console.warn('Unexpected data format:', data);
          types = [];
        }
        console.log('Setting appointment types:', types);
        setAppointmentTypes(types);
      } else {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        throw new Error(`Failed to load appointment types: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading appointment types:', error);
      // Set empty array on error
      setAppointmentTypes([]);
      notifications.show({
        title: 'Error',
        message: 'Failed to load appointment types',
        color: 'red',
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const openAddModal = () => {
    setEditingType(null);
    setFormName('');
    setFormDuration(30);
    setFormActive(true);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (type: AppointmentType) => {
    setEditingType(type);
    setFormName(type.name);
    setFormDuration(type.default_duration_minutes);
    setFormActive(type.is_active);
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: { name?: string; duration?: string } = {};

    if (!formName.trim()) {
      errors.name = 'Name is required';
    }

    if (formDuration < 5) {
      errors.duration = 'Duration must be at least 5 minutes';
    }

    if (formDuration > 240) {
      errors.duration = 'Duration cannot exceed 240 minutes (4 hours)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Get CSRF token
      const csrfResponse = await fetch('https://localhost:8000/api/auth/csrf-token/', {
        credentials: 'include',
      });
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      const url = editingType
        ? `https://localhost:8000/api/appointment-types/${editingType.id}/`
        : 'https://localhost:8000/api/appointment-types/';

      const method = editingType ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formName.trim(),
          default_duration_minutes: formDuration,
          is_active: formActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.name?.[0] || 'Failed to save appointment type');
      }

      notifications.show({
        title: 'Success',
        message: `Appointment type ${editingType ? 'updated' : 'created'} successfully`,
        color: 'green',
      });

      setModalOpen(false);
      setEditingType(null);
      setFormName('');
      setFormDuration(30);
      setFormActive(true);
      setFormErrors({});
      await loadAppointmentTypes(false);
    } catch (error: any) {
      console.error('Error saving appointment type:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save appointment type',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (type: AppointmentType) => {
    setTypeToDelete(type);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;

    setLoading(true);

    try {
      // Get CSRF token
      const csrfResponse = await fetch('https://localhost:8000/api/auth/csrf-token/', {
        credentials: 'include',
      });
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      const response = await fetch(
        `https://localhost:8000/api/appointment-types/${typeToDelete.id}/`,
        {
          method: 'DELETE',
          headers: {
            'X-CSRFToken': csrfToken,
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete appointment type');
      }

      notifications.show({
        title: 'Success',
        message: 'Appointment type deleted successfully',
        color: 'green',
      });

      setDeleteConfirmOpen(false);
      setTypeToDelete(null);
      await loadAppointmentTypes(false);
    } catch (error) {
      console.error('Error deleting appointment type:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete appointment type',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hr`;
    }
    return `${hours} hr ${mins} min`;
  };

  return (
    <Paper p="xl" shadow="xs">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Appointment Types</Title>
            <Text size="sm" c="dimmed" mt="xs">
              Define appointment types with standard durations. These will be available when creating appointments.
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
            Add Type
          </Button>
        </Group>

        <div style={{ position: 'relative' }}>
          <LoadingOverlay visible={loading} />

          {!Array.isArray(appointmentTypes) || appointmentTypes.length === 0 ? (
            <Paper p="xl" withBorder>
              <Stack align="center" gap="sm">
                <IconClock size={48} stroke={1.5} opacity={0.5} />
                <Text c="dimmed">No appointment types found</Text>
                <Button size="sm" onClick={openAddModal}>
                  Add Your First Type
                </Button>
              </Stack>
            </Paper>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Duration</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {Array.isArray(appointmentTypes) && appointmentTypes.map((type) => (
                  <Table.Tr key={type.id}>
                    <Table.Td>
                      <Text fw={500}>{type.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <IconClock size={16} opacity={0.6} />
                        <Text size="sm">{formatDuration(type.default_duration_minutes)}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={type.is_active ? 'green' : 'gray'} variant="light">
                        {type.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => openEditModal(type)}
                          title="Edit"
                        >
                          <IconEdit size={18} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => confirmDelete(type)}
                          title="Delete"
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </div>
      </Stack>

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingType ? 'Edit Appointment Type' : 'Add Appointment Type'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="e.g., Assessment, Fitting, Follow-up"
            value={formName}
            onChange={(e) => setFormName(e.currentTarget.value)}
            error={formErrors.name}
            required
          />

          <NumberInput
            label="Default Duration"
            description="Duration in minutes (5-240)"
            placeholder="30"
            value={formDuration}
            onChange={(value) => setFormDuration(Number(value) || 30)}
            min={5}
            max={240}
            step={5}
            error={formErrors.duration}
            required
          />

          <Switch
            label="Active"
            description="Only active types will be available when creating appointments"
            checked={formActive}
            onChange={(e) => setFormActive(e.currentTarget.checked)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingType ? 'Save Changes' : 'Add Type'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Appointment Type"
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete <strong>{typeToDelete?.name}</strong>?
          </Text>
          <Text size="sm" c="dimmed">
            Existing appointments using this type will not be affected, but it will no longer be
            available for new appointments.
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}

