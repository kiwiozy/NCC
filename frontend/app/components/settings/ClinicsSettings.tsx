'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Stack,
  Text,
  Button,
  Group,
  Table,
  ActionIcon,
  Badge,
  Modal,
  TextInput,
  Textarea,
  Alert,
  Loader,
  Box,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';

interface Clinic {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address_json: {
    street?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    country?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export default function ClinicsSettings() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  // Address fields
  const [formStreet, setFormStreet] = useState('');
  const [formSuburb, setFormSuburb] = useState('');
  const [formState, setFormState] = useState('');
  const [formPostcode, setFormPostcode] = useState('');

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://localhost:8000/api/clinics/');
      if (!response.ok) {
        throw new Error('Failed to load clinics');
      }
      const data = await response.json();
      // Handle paginated response
      const clinicsList = data.results || data;
      setClinics(clinicsList.sort((a: Clinic, b: Clinic) => a.name.localeCompare(b.name)));
    } catch (err: any) {
      console.error('Error loading clinics:', err);
      setError('Failed to load clinics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingClinic(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormStreet('');
    setFormSuburb('');
    setFormState('');
    setFormPostcode('');
    setModalOpen(true);
  };

  const handleEdit = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setFormName(clinic.name || '');
    setFormPhone(clinic.phone || '');
    setFormEmail(clinic.email || '');
    
    // Parse address_json if it exists
    if (clinic.address_json) {
      setFormStreet(clinic.address_json.street || '');
      setFormSuburb(clinic.address_json.suburb || '');
      setFormState(clinic.address_json.state || '');
      setFormPostcode(clinic.address_json.postcode || '');
    } else {
      setFormStreet('');
      setFormSuburb('');
      setFormState('');
      setFormPostcode('');
    }
    
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Name is required');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const url = editingClinic
        ? `https://localhost:8000/api/clinics/${editingClinic.id}/`
        : 'https://localhost:8000/api/clinics/';
      
      const method = editingClinic ? 'PUT' : 'POST';
      
      // Build address_json from individual fields
      const addressJson: any = {};
      if (formStreet.trim()) addressJson.street = formStreet.trim();
      if (formSuburb.trim()) addressJson.suburb = formSuburb.trim();
      if (formState.trim()) addressJson.state = formState.trim();
      if (formPostcode.trim()) addressJson.postcode = formPostcode.trim();
      
      const payload = {
        name: formName.trim(),
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        address_json: Object.keys(addressJson).length > 0 ? addressJson : null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Failed to save clinic');
      }

      setSuccess(editingClinic ? 'Clinic updated successfully' : 'Clinic created successfully');
      setModalOpen(false);
      fetchClinics();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving clinic:', err);
      setError('Failed to save clinic: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpened(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) {
      return;
    }

    setDeleteConfirmOpened(false);
    const id = itemToDelete;
    setItemToDelete(null);

    try {
      const response = await fetch(`https://localhost:8000/api/clinics/${id}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete clinic');
      }

      setSuccess('Clinic deleted successfully');
      fetchClinics();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting clinic:', err);
      setError('Failed to delete clinic: ' + err.message);
    }
  };

  const formatAddress = (addressJson: any): string => {
    if (!addressJson || typeof addressJson !== 'object') return '-';
    
    const parts = [];
    if (addressJson.street) parts.push(addressJson.street);
    if (addressJson.suburb) parts.push(addressJson.suburb);
    if (addressJson.state) parts.push(addressJson.state);
    if (addressJson.postcode) parts.push(addressJson.postcode);
    
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const rows = clinics.map((clinic) => (
    <Table.Tr key={clinic.id}>
      <Table.Td>
        <Text fw={500}>{clinic.name}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{clinic.phone || '-'}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{clinic.email || '-'}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {formatAddress(clinic.address_json)}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => handleEdit(clinic)}
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => handleDelete(clinic.id)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={2} mb="md">Clinics</Title>
          <Text c="dimmed" size="sm">
            Manage clinic locations used throughout the application. Clinics are linked to patients, appointments, and the calendar.
          </Text>
          <Text c="dimmed" size="xs" mt={4} fs="italic">
            Note: Active, Order, and Color fields coming soon - backend model will be updated.
          </Text>
        </Box>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert icon={<IconCheck size={16} />} color="green" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Paper p="xl" shadow="sm" radius="md">
          <Group justify="space-between" mb="md">
            <Title order={3}>Clinics List</Title>
            <Button leftSection={<IconPlus size={16} />} onClick={handleAdd}>
              Add Clinic
            </Button>
          </Group>

          {loading ? (
            <Loader />
          ) : clinics.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No clinics found. Click "Add Clinic" to create one.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Phone</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Address</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          )}
        </Paper>

        {/* Add/Edit Modal */}
        <Modal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingClinic ? 'Edit Clinic' : 'Add Clinic'}
          size="md"
        >
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="e.g., Walk Easy Newcastle"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            
            <TextInput
              label="Phone"
              placeholder="e.g., (02) 6762 4444"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
            
            <TextInput
              label="Email"
              placeholder="e.g., newcastle@walkeasy.com.au"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
            
            <Text size="sm" fw={500} mt="xs">Address</Text>
            
            <TextInput
              label="Street"
              placeholder="e.g., 123 Hunter Street"
              value={formStreet}
              onChange={(e) => setFormStreet(e.target.value)}
            />
            
            <Group grow>
              <TextInput
                label="Suburb"
                placeholder="e.g., Newcastle"
                value={formSuburb}
                onChange={(e) => setFormSuburb(e.target.value)}
              />
              <TextInput
                label="State"
                placeholder="e.g., NSW"
                value={formState}
                onChange={(e) => setFormState(e.target.value)}
              />
            </Group>
            
            <TextInput
              label="Postcode"
              placeholder="e.g., 2300"
              value={formPostcode}
              onChange={(e) => setFormPostcode(e.target.value)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingClinic ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteConfirmOpened}
          onClose={() => {
            setDeleteConfirmOpened(false);
            setItemToDelete(null);
          }}
          title="Delete Clinic"
          size="sm"
        >
          <Stack gap="md">
            <Text>
              Are you sure you want to delete this clinic? This action cannot be undone.
            </Text>
            <Alert icon={<IconAlertCircle size={16} />} color="yellow">
              Warning: Clinics with existing appointments or clinicians cannot be deleted.
            </Alert>
            <Group justify="flex-end" mt="md">
              <Button 
                variant="subtle" 
                onClick={() => {
                  setDeleteConfirmOpened(false);
                  setItemToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button color="red" onClick={confirmDelete}>
                Delete
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}

