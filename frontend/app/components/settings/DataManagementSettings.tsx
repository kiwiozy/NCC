'use client';

import { useState, useEffect } from 'react';
import { 
  Stack, 
  Card, 
  Text, 
  Group, 
  Badge, 
  Button, 
  Alert, 
  Loader, 
  rem, 
  Modal, 
  Code, 
  ScrollArea 
} from '@mantine/core';
import { 
  IconAlertTriangle, 
  IconDatabase, 
  IconRefresh, 
  IconTrash, 
  IconCheck, 
  IconX 
} from '@tabler/icons-react';

interface DataStatus {
  patients: number;
  appointments: number;
  documents: number;
  images: number;
  appointments_without_clinic: number;
  appointments_without_clinician: number;
  appointments_without_type: number;
}

interface FileMakerStatus {
  connected: boolean;
  lastSync: string | null;
  error?: string;
}

export default function DataManagementSettings() {
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [filemakerStatus, setFilemakerStatus] = useState<FileMakerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [reimportLoading, setReimportLoading] = useState(false);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [reimportProgress, setReimportProgress] = useState<string[]>([]);

  useEffect(() => {
    fetchDataStatus();
    fetchFileMakerStatus();
  }, []);

  const fetchDataStatus = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/data-management/status/', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setDataStatus(data);
      }
    } catch (error) {
      console.error('Error fetching data status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileMakerStatus = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/data-management/filemaker-status/', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setFilemakerStatus(data);
      }
    } catch (error) {
      console.error('Error fetching FileMaker status:', error);
    }
  };

  const handleDryRun = async () => {
    setDryRunLoading(true);
    setDryRunResult(null);
    try {
      const response = await fetch('https://localhost:8000/api/data-management/dry-run/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setDryRunResult(data);
      }
    } catch (error) {
      console.error('Error running dry-run:', error);
    } finally {
      setDryRunLoading(false);
    }
  };

  const handleReimport = async () => {
    setReimportLoading(true);
    setReimportProgress(['Starting reimport...']);
    setConfirmModalOpened(false);

    try {
      const response = await fetch('https://localhost:8000/api/data-management/reimport/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setReimportProgress(prev => [...prev, ...data.logs]);
        await fetchDataStatus();
        await fetchFileMakerStatus();
      } else {
        const error = await response.json();
        setReimportProgress(prev => [...prev, `Error: ${error.error || 'Unknown error'}`]);
      }
    } catch (error: any) {
      setReimportProgress(prev => [...prev, `Error: ${error.message}`]);
    } finally {
      setReimportLoading(false);
    }
  };

  if (loading) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: rem(400) }}>
        <Loader size="lg" />
        <Text c="dimmed">Loading data management...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Alert 
        icon={<IconAlertTriangle size={20} />} 
        title="Warning: Destructive Operation" 
        color="red"
        variant="light"
      >
        The reimport function will <strong>DELETE ALL</strong> patient and appointment data, then reimport from FileMaker.
        Documents and images will be preserved and re-linked. Always run a dry-run preview first!
      </Alert>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="lg" fw={600}>Current Data Status</Text>
            <Button 
              leftSection={<IconRefresh size={16} />}
              variant="light" 
              size="xs"
              onClick={() => {
                fetchDataStatus();
                fetchFileMakerStatus();
              }}
            >
              Refresh
            </Button>
          </Group>

          {dataStatus && (
            <Stack gap="sm">
              <Group justify="space-between">
                <Text>Patients:</Text>
                <Badge size="lg" variant="light">{dataStatus.patients.toLocaleString()}</Badge>
              </Group>
              <Group justify="space-between">
                <Text>Appointments:</Text>
                <Badge size="lg" variant="light">{dataStatus.appointments.toLocaleString()}</Badge>
              </Group>
              <Group justify="space-between">
                <Text>Documents (linked):</Text>
                <Badge size="lg" variant="light" color="green">{dataStatus.documents.toLocaleString()}</Badge>
              </Group>
              <Group justify="space-between">
                <Text>Images (linked):</Text>
                <Badge size="lg" variant="light" color="green">{dataStatus.images.toLocaleString()}</Badge>
              </Group>

              {dataStatus.appointments_without_clinic > 0 && (
                <Group justify="space-between">
                  <Text c="orange">Appointments without clinic:</Text>
                  <Badge size="lg" color="orange">{dataStatus.appointments_without_clinic}</Badge>
                </Group>
              )}
              {dataStatus.appointments_without_clinician > 0 && (
                <Group justify="space-between">
                  <Text c="orange">Appointments without clinician:</Text>
                  <Badge size="lg" color="orange">{dataStatus.appointments_without_clinician}</Badge>
                </Group>
              )}
              {dataStatus.appointments_without_type > 0 && (
                <Group justify="space-between">
                  <Text c="orange">Appointments without type:</Text>
                  <Badge size="lg" color="orange">{dataStatus.appointments_without_type}</Badge>
                </Group>
              )}
            </Stack>
          )}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Text size="lg" fw={600}>FileMaker Connection</Text>
          
          {filemakerStatus && (
            <Stack gap="sm">
              <Group justify="space-between">
                <Text>Status:</Text>
                <Badge 
                  size="lg" 
                  color={filemakerStatus.connected ? 'green' : 'red'}
                  leftSection={filemakerStatus.connected ? <IconCheck size={14} /> : <IconX size={14} />}
                >
                  {filemakerStatus.connected ? 'Connected' : 'Not Connected'}
                </Badge>
              </Group>
              {filemakerStatus.lastSync && (
                <Group justify="space-between">
                  <Text>Last Sync:</Text>
                  <Text size="sm" c="dimmed">{new Date(filemakerStatus.lastSync).toLocaleString()}</Text>
                </Group>
              )}
              {filemakerStatus.error && (
                <Alert color="red" variant="light">
                  {filemakerStatus.error}
                </Alert>
              )}
            </Stack>
          )}
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Text size="lg" fw={600}>Reimport Actions</Text>

          <Stack gap="sm">
            <Button
              leftSection={<IconDatabase size={16} />}
              variant="light"
              fullWidth
              onClick={handleDryRun}
              loading={dryRunLoading}
              disabled={!filemakerStatus?.connected}
            >
              Dry Run Preview
            </Button>

            <Button
              leftSection={<IconTrash size={16} />}
              color="red"
              fullWidth
              onClick={() => setConfirmModalOpened(true)}
              loading={reimportLoading}
              disabled={!filemakerStatus?.connected || reimportLoading}
            >
              Full Reimport (Delete & Reimport All Data)
            </Button>

            {!filemakerStatus?.connected && (
              <Alert color="yellow" variant="light">
                FileMaker connection required to run reimport
              </Alert>
            )}
          </Stack>
        </Stack>
      </Card>

      {dryRunResult && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text size="lg" fw={600}>Dry Run Preview</Text>
            
            <Stack gap="sm">
              <Text fw={600} c="red">Will Delete:</Text>
              <Code block>
                {JSON.stringify(dryRunResult.will_delete, null, 2)}
              </Code>

              <Text fw={600} c="green">Will Import:</Text>
              <Code block>
                {JSON.stringify(dryRunResult.will_import, null, 2)}
              </Code>

              <Text fw={600} c="blue">Will Preserve:</Text>
              <Code block>
                {JSON.stringify(dryRunResult.will_preserve, null, 2)}
              </Code>
            </Stack>
          </Stack>
        </Card>
      )}

      {reimportProgress.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text size="lg" fw={600}>Reimport Progress</Text>
            <ScrollArea h={300}>
              <Code block>
                {reimportProgress.join('\n')}
              </Code>
            </ScrollArea>
          </Stack>
        </Card>
      )}

      <Modal
        opened={confirmModalOpened}
        onClose={() => setConfirmModalOpened(false)}
        title="Confirm Full Reimport"
        size="lg"
      >
        <Stack gap="md">
          <Alert icon={<IconAlertTriangle size={20} />} color="red">
            <Text fw={600}>This action cannot be undone!</Text>
          </Alert>

          <Text>
            This will permanently delete:
          </Text>
          <ul>
            <li><strong>{dataStatus?.patients.toLocaleString()}</strong> patients</li>
            <li><strong>{dataStatus?.appointments.toLocaleString()}</strong> appointments</li>
            <li>All notes, letters, reminders, and SMS messages</li>
          </ul>

          <Text>
            The following will be preserved:
          </Text>
          <ul>
            <li><strong>{dataStatus?.documents.toLocaleString()}</strong> document records (will be re-linked)</li>
            <li><strong>{dataStatus?.images.toLocaleString()}</strong> image records (will be re-linked)</li>
            <li>All clinic, clinician, and integration settings</li>
          </ul>

          <Text fw={600} c="red">
            Are you absolutely sure you want to proceed?
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button 
              variant="default" 
              onClick={() => setConfirmModalOpened(false)}
            >
              Cancel
            </Button>
            <Button 
              color="red" 
              onClick={handleReimport}
              leftSection={<IconTrash size={16} />}
            >
              Yes, Delete and Reimport Everything
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

