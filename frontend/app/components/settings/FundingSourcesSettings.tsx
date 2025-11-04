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
  Switch,
  NumberInput,
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
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react';

interface FundingSource {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export default function FundingSourcesSettings() {
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<FundingSource | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formOrder, setFormOrder] = useState(0);

  useEffect(() => {
    fetchFundingSources();
  }, []);

  const fetchFundingSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://localhost:8000/api/settings/funding-sources/');
      if (!response.ok) {
        throw new Error('Failed to load funding sources');
      }
      const data = await response.json();
      // Handle paginated response
      const sources = data.results || data;
      setFundingSources(sources.sort((a: FundingSource, b: FundingSource) => a.order - b.order));
    } catch (err: any) {
      console.error('Error loading funding sources:', err);
      setError('Failed to load funding sources: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSource(null);
    setFormName('');
    setFormCode('');
    setFormActive(true);
    setFormOrder(fundingSources.length > 0 ? Math.max(...fundingSources.map(fs => fs.order)) + 1 : 0);
    setModalOpen(true);
  };

  const handleEdit = (source: FundingSource) => {
    setEditingSource(source);
    setFormName(source.name);
    setFormCode(source.code || '');
    setFormActive(source.active);
    setFormOrder(source.order);
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
      const url = editingSource
        ? `https://localhost:8000/api/settings/funding-sources/${editingSource.id}/`
        : 'https://localhost:8000/api/settings/funding-sources/';
      
      const method = editingSource ? 'PUT' : 'POST';
      
      const payload = {
        name: formName.trim(),
        code: formCode.trim() || null,
        active: formActive,
        order: formOrder,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Failed to save funding source');
      }

      setSuccess(editingSource ? 'Funding source updated successfully' : 'Funding source created successfully');
      setModalOpen(false);
      fetchFundingSources();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving funding source:', err);
      setError('Failed to save funding source: ' + err.message);
    }
  };

  const handleDelete = (id: string) => {
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
      const response = await fetch(`https://localhost:8000/api/settings/funding-sources/${id}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete funding source');
      }

      setSuccess('Funding source deleted successfully');
      fetchFundingSources();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting funding source:', err);
      setError('Failed to delete funding source: ' + err.message);
    }
  };

  const handleMoveOrder = async (source: FundingSource, direction: 'up' | 'down') => {
    const currentIndex = fundingSources.findIndex(fs => fs.id === source.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= fundingSources.length) return;

    const targetSource = fundingSources[newIndex];
    const newOrder = targetSource.order;

    try {
      // Swap orders
      const response1 = await fetch(`https://localhost:8000/api/settings/funding-sources/${source.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      });

      const response2 = await fetch(`https://localhost:8000/api/settings/funding-sources/${targetSource.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: source.order }),
      });

      if (response1.ok && response2.ok) {
        fetchFundingSources();
      } else {
        throw new Error('Failed to update order');
      }
    } catch (err: any) {
      console.error('Error updating order:', err);
      setError('Failed to update order: ' + err.message);
    }
  };

  const rows = fundingSources.map((source) => (
    <Table.Tr key={source.id}>
      <Table.Td>{source.order}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Text fw={500}>{source.name}</Text>
          {source.code && (
            <Badge size="sm" variant="light" color="gray">
              {source.code}
            </Badge>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge color={source.active ? 'green' : 'gray'} variant="light">
          {source.active ? 'Active' : 'Inactive'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => handleMoveOrder(source, 'up')}
            disabled={fundingSources.indexOf(source) === 0}
          >
            <IconArrowUp size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => handleMoveOrder(source, 'down')}
            disabled={fundingSources.indexOf(source) === fundingSources.length - 1}
          >
            <IconArrowDown size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => handleEdit(source)}
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => handleDelete(source.id)}
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
          <Title order={2} mb="md">Funding Sources</Title>
          <Text c="dimmed" size="sm">
            Manage funding source types used throughout the application (NDIS, Private, DVA, etc.)
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
            <Title order={3}>Funding Sources List</Title>
            <Button leftSection={<IconPlus size={16} />} onClick={handleAdd}>
              Add Funding Source
            </Button>
          </Group>

          {loading ? (
            <Loader />
          ) : fundingSources.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No funding sources found. Click "Add Funding Source" to create one.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Order</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Status</Table.Th>
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
          title={editingSource ? 'Edit Funding Source' : 'Add Funding Source'}
          size="md"
        >
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="e.g., NDIS, Private, DVA"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            
            <TextInput
              label="Code"
              placeholder="Optional short code (e.g., NDIS, PRV, DVA)"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              description="Optional short code for reference"
            />
            
            <NumberInput
              label="Order"
              description="Order for sorting in dropdowns"
              value={formOrder}
              onChange={(value) => setFormOrder(typeof value === 'number' ? value : 0)}
              min={0}
            />
            
            <Switch
              label="Active"
              description="Whether this funding source is active and available for selection"
              checked={formActive}
              onChange={(e) => setFormActive(e.currentTarget.checked)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingSource ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}

