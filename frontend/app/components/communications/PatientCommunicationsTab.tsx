/**
 * Patient Communications Tab - Shows all communication history
 * Integrated into existing Patient Detail page
 * 
 * Features:
 * - Timeline view of all communications (email, SMS, calls, visits)
 * - Quick action buttons (log call, send email, schedule follow-up)
 * - Follow-up tasks queue
 * - Filter by communication type
 */

'use client';

import { useState } from 'react';
import {
  Card,
  Text,
  Badge,
  Group,
  Stack,
  Button,
  ActionIcon,
  Timeline,
  Select,
  Paper,
  Divider,
  Modal,
  TextInput,
  Textarea,
  Radio,
  Title,
} from '@mantine/core';
import {
  IconPhone,
  IconMail,
  IconMessage,
  IconUser,
  IconCalendar,
  IconPlus,
  IconCheck,
  IconClock,
  IconAlertCircle,
} from '@tabler/icons-react';

export default function PatientCommunicationsTab({ patientId }: { patientId: string }) {
  const [typeFilter, setTypeFilter] = useState<string | null>('all');
  const [logCallModalOpen, setLogCallModalOpen] = useState(false);
  const [callOutcome, setCallOutcome] = useState('');

  // Mock communication data
  const communications = [
    {
      id: '1',
      type: 'email',
      direction: 'outbound',
      subject: 'Monthly Health Tips',
      content: 'Received "Monthly Health Tips" campaign',
      timestamp: '2025-11-10T14:30:00',
      opened: true,
      clicked: true,
      user: 'System',
    },
    {
      id: '2',
      type: 'call',
      direction: 'outbound',
      subject: 'Appointment reminder',
      content: 'Outbound call - Appointment reminder',
      outcome: 'Confirmed',
      timestamp: '2025-11-09T10:15:00',
      user: 'Jono',
      notes: 'Patient confirmed they will attend tomorrow at 2pm',
    },
    {
      id: '3',
      type: 'sms',
      direction: 'outbound',
      subject: null,
      content: 'SMS: "Appointment tomorrow at 2pm"',
      timestamp: '2025-11-08T15:45:00',
      delivered: true,
      user: 'System',
    },
    {
      id: '4',
      type: 'visit',
      direction: 'outbound',
      subject: 'Home visit',
      content: 'Delivered marketing materials',
      timestamp: '2025-11-05T11:00:00',
      user: 'Craig',
      notes: 'Dropped off new insoles brochure',
    },
    {
      id: '5',
      type: 'call',
      direction: 'inbound',
      subject: 'Enquiry about services',
      content: 'Patient called asking about pricing',
      outcome: 'Information provided',
      timestamp: '2025-11-01T09:30:00',
      user: 'Reception',
      notes: 'Provided pricing for initial consultation',
    },
  ];

  // Mock follow-up tasks
  const followUpTasks = [
    {
      id: '1',
      dueDate: '2025-11-15',
      priority: 'high',
      description: 'Follow-up on fitting results',
      status: 'pending',
    },
    {
      id: '2',
      dueDate: '2025-11-20',
      priority: 'medium',
      description: 'Check in after appointment',
      status: 'pending',
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return IconMail;
      case 'sms': return IconMessage;
      case 'call': return IconPhone;
      case 'visit': return IconUser;
      default: return IconMail;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'blue';
      case 'sms': return 'green';
      case 'call': return 'orange';
      case 'visit': return 'grape';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <Stack gap="md">
      {/* Quick Actions */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group>
          <Button
            leftSection={<IconPhone size={16} />}
            variant="light"
            onClick={() => setLogCallModalOpen(true)}
          >
            Log Call
          </Button>
          <Button
            leftSection={<IconMail size={16} />}
            variant="light"
            onClick={() => alert('Send email')}
          >
            Send Email
          </Button>
          <Button
            leftSection={<IconMessage size={16} />}
            variant="light"
            onClick={() => alert('Send SMS')}
          >
            Send SMS
          </Button>
          <Button
            leftSection={<IconCalendar size={16} />}
            variant="light"
            onClick={() => alert('Schedule follow-up')}
          >
            Schedule Follow-up
          </Button>
        </Group>
      </Card>

      {/* Follow-up Tasks */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <IconCalendar size={20} />
            <Text fw={600}>Follow-up Tasks</Text>
          </Group>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            variant="subtle"
            onClick={() => alert('Add task')}
          >
            Add Task
          </Button>
        </Group>

        {followUpTasks.length > 0 ? (
          <Stack gap="sm">
            {followUpTasks.map((task) => (
              <Paper key={task.id} p="sm" withBorder>
                <Group justify="space-between">
                  <Group>
                    <ActionIcon
                      variant="light"
                      color="green"
                      onClick={() => alert('Mark complete')}
                    >
                      <IconCheck size={16} />
                    </ActionIcon>
                    <div>
                      <Group gap="xs">
                        <Badge color={getPriorityColor(task.priority)} size="sm">
                          {task.priority.toUpperCase()}
                        </Badge>
                        <Text size="sm" fw={500}>{task.description}</Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </Text>
                    </div>
                  </Group>
                  {task.status === 'pending' && (
                    <Badge color="orange" variant="light" leftSection={<IconClock size={12} />}>
                      Pending
                    </Badge>
                  )}
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No pending follow-up tasks
          </Text>
        )}
      </Card>

      {/* Communication History */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <IconClock size={20} />
            <Text fw={600}>Communication History</Text>
          </Group>
          <Select
            placeholder="Filter by type"
            value={typeFilter}
            onChange={setTypeFilter}
            data={[
              { value: 'all', label: 'All Types' },
              { value: 'email', label: 'Email' },
              { value: 'sms', label: 'SMS' },
              { value: 'call', label: 'Phone Calls' },
              { value: 'visit', label: 'Visits' },
            ]}
            w={150}
            size="xs"
          />
        </Group>

        <Timeline active={-1} bulletSize={24} lineWidth={2}>
          {communications.map((comm) => {
            const TypeIcon = getTypeIcon(comm.type);
            return (
              <Timeline.Item
                key={comm.id}
                bullet={<TypeIcon size={14} />}
                title={
                  <Group gap="xs">
                    <Badge color={getTypeColor(comm.type)} size="sm">
                      {comm.type.toUpperCase()}
                    </Badge>
                    <Badge color={comm.direction === 'outbound' ? 'blue' : 'gray'} size="sm" variant="light">
                      {comm.direction}
                    </Badge>
                    <Text size="sm" fw={500}>
                      {comm.subject || comm.content}
                    </Text>
                  </Group>
                }
              >
                <Text size="xs" c="dimmed" mb="xs">
                  {new Date(comm.timestamp).toLocaleString()} • By {comm.user}
                </Text>
                
                <Text size="sm" mb="xs">
                  {comm.content}
                </Text>

                {comm.type === 'email' && (
                  <Group gap="xs">
                    {comm.opened && (
                      <Badge color="green" size="xs" variant="light" leftSection={<IconCheck size={10} />}>
                        Opened
                      </Badge>
                    )}
                    {comm.clicked && (
                      <Badge color="teal" size="xs" variant="light" leftSection={<IconCheck size={10} />}>
                        Clicked
                      </Badge>
                    )}
                  </Group>
                )}

                {comm.type === 'sms' && comm.delivered && (
                  <Badge color="green" size="xs" variant="light" leftSection={<IconCheck size={10} />}>
                    Delivered
                  </Badge>
                )}

                {comm.type === 'call' && comm.outcome && (
                  <Badge color="blue" size="xs" variant="light">
                    {comm.outcome}
                  </Badge>
                )}

                {comm.notes && (
                  <Paper p="xs" mt="xs" withBorder>
                    <Text size="xs" c="dimmed">
                      <strong>Notes:</strong> {comm.notes}
                    </Text>
                  </Paper>
                )}
              </Timeline.Item>
            );
          })}
        </Timeline>

        {communications.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            No communication history yet
          </Text>
        )}
      </Card>

      {/* Log Call Modal */}
      <Modal
        opened={logCallModalOpen}
        onClose={() => setLogCallModalOpen(false)}
        title={<Title order={3}>Log Phone Call</Title>}
        size="md"
      >
        <Stack>
          <Radio.Group
            label="Call Direction"
            value={callOutcome}
            onChange={setCallOutcome}
          >
            <Group mt="xs">
              <Radio value="outbound" label="Outbound (we called them)" />
              <Radio value="inbound" label="Inbound (they called us)" />
            </Group>
          </Radio.Group>

          <Select
            label="Outcome"
            placeholder="Select outcome"
            data={[
              { value: 'answered', label: 'Answered - Spoke with patient' },
              { value: 'voicemail', label: 'Voicemail left' },
              { value: 'no_answer', label: 'No answer' },
              { value: 'busy', label: 'Line busy' },
            ]}
          />

          <Textarea
            label="Notes"
            placeholder="What was discussed? Any follow-up needed?"
            minRows={4}
          />

          <Radio.Group
            label="Follow-up Required?"
          >
            <Group mt="xs">
              <Radio value="yes" label="Yes, schedule follow-up" />
              <Radio value="no" label="No follow-up needed" />
            </Group>
          </Radio.Group>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setLogCallModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              alert('Call logged successfully');
              setLogCallModalOpen(false);
            }}>
              Save Call Log
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

