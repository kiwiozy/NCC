/**
 * Email Campaigns Dashboard - Main listing page
 * URL: /campaigns
 * 
 * Features:
 * - List all email campaigns (draft, scheduled, sent)
 * - Quick stats (active campaigns, open rate, etc.)
 * - Filter and search
 * - Create new campaign button
 */

'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Button,
  Group,
  Card,
  Text,
  Badge,
  Grid,
  TextInput,
  Select,
  Stack,
  ActionIcon,
  Menu,
  Progress,
} from '@mantine/core';
import { IconPlus, IconSearch, IconDots, IconMail, IconChartBar, IconUsers, IconSend } from '@tabler/icons-react';

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('all');

  // Mock data - will come from API later
  const stats = [
    { label: 'Active Campaigns', value: '12', icon: IconMail, color: 'blue' },
    { label: 'Total Sent', value: '1,234', icon: IconSend, color: 'green' },
    { label: 'Avg Open Rate', value: '85%', icon: IconChartBar, color: 'teal' },
    { label: 'Total Subscribers', value: '245', icon: IconUsers, color: 'grape' },
  ];

  const campaigns = [
    {
      id: '1',
      name: 'Monthly Health Tips',
      subject: 'Your November Health Update',
      status: 'sent',
      sentDate: '2025-11-01',
      recipients: 245,
      openRate: 85,
      clickRate: 23,
    },
    {
      id: '2',
      name: 'Appointment Reminders',
      subject: 'Your upcoming appointment at Walk Easy',
      status: 'active',
      sentDate: null,
      recipients: 412,
      openRate: 92,
      clickRate: 15,
    },
    {
      id: '3',
      name: 'Welcome Series',
      subject: 'Welcome to Walk Easy Clinic',
      status: 'draft',
      sentDate: null,
      recipients: 0,
      openRate: 0,
      clickRate: 0,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'green';
      case 'active': return 'blue';
      case 'scheduled': return 'orange';
      case 'draft': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <Title order={1}>Email Campaigns</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          size="md"
          onClick={() => {
            // TODO: Navigate to /campaigns/new
            alert('Navigate to campaign builder');
          }}
        >
          New Campaign
        </Button>
      </Group>

      {/* Stats Grid */}
      <Grid mb="xl">
        {stats.map((stat) => (
          <Grid.Col key={stat.label} span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {stat.label}
                  </Text>
                  <Text size="xl" fw={700} mt="xs">
                    {stat.value}
                  </Text>
                </div>
                <stat.icon size={36} stroke={1.5} color={`var(--mantine-color-${stat.color}-6)`} />
              </Group>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {/* Filters */}
      <Card shadow="sm" padding="md" radius="md" withBorder mb="md">
        <Group>
          <TextInput
            placeholder="Search campaigns..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: 'all', label: 'All Campaigns' },
              { value: 'draft', label: 'Drafts' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'active', label: 'Active' },
              { value: 'sent', label: 'Sent' },
            ]}
            w={200}
          />
        </Group>
      </Card>

      {/* Campaigns List */}
      <Stack gap="md">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" align="flex-start">
              <div style={{ flex: 1 }}>
                <Group mb="xs">
                  <IconMail size={20} />
                  <Text fw={600} size="lg">
                    {campaign.name}
                  </Text>
                  <Badge color={getStatusColor(campaign.status)} variant="light">
                    {campaign.status.toUpperCase()}
                  </Badge>
                </Group>
                
                <Text size="sm" c="dimmed" mb="md">
                  {campaign.subject}
                </Text>

                {campaign.status === 'sent' && (
                  <Group gap="xl">
                    <div>
                      <Text size="xs" c="dimmed">Sent to</Text>
                      <Text size="sm" fw={600}>{campaign.recipients} patients</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Open Rate</Text>
                      <Group gap="xs">
                        <Progress value={campaign.openRate} size="sm" w={60} color="teal" />
                        <Text size="sm" fw={600}>{campaign.openRate}%</Text>
                      </Group>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Click Rate</Text>
                      <Group gap="xs">
                        <Progress value={campaign.clickRate} size="sm" w={60} color="blue" />
                        <Text size="sm" fw={600}>{campaign.clickRate}%</Text>
                      </Group>
                    </div>
                    {campaign.sentDate && (
                      <div>
                        <Text size="xs" c="dimmed">Sent on</Text>
                        <Text size="sm" fw={600}>{new Date(campaign.sentDate).toLocaleDateString()}</Text>
                      </div>
                    )}
                  </Group>
                )}

                {campaign.status === 'active' && (
                  <Group gap="xl">
                    <div>
                      <Text size="xs" c="dimmed">Total Sent</Text>
                      <Text size="sm" fw={600}>{campaign.recipients} emails</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Performance</Text>
                      <Text size="sm" fw={600}>{campaign.openRate}% open rate</Text>
                    </div>
                    <Badge color="green" variant="dot">Automated</Badge>
                  </Group>
                )}

                {campaign.status === 'draft' && (
                  <Text size="sm" c="dimmed">
                    Not scheduled yet
                  </Text>
                )}
              </div>

              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray">
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item onClick={() => alert('View analytics')}>
                    View Analytics
                  </Menu.Item>
                  <Menu.Item onClick={() => alert('Edit campaign')}>
                    Edit Campaign
                  </Menu.Item>
                  <Menu.Item onClick={() => alert('Duplicate')}>
                    Duplicate
                  </Menu.Item>
                  {campaign.status === 'draft' && (
                    <Menu.Item onClick={() => alert('Send test')}>
                      Send Test Email
                    </Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Item color="red" onClick={() => alert('Delete')}>
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Card>
        ))}
      </Stack>

      {/* Empty State (when no campaigns) */}
      {campaigns.length === 0 && (
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Stack align="center" gap="md" py="xl">
            <IconMail size={64} stroke={1} color="gray" />
            <Title order={3} c="dimmed">No campaigns yet</Title>
            <Text size="sm" c="dimmed" ta="center">
              Create your first email campaign to start engaging with your patients
            </Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => alert('Navigate to campaign builder')}
            >
              Create Campaign
            </Button>
          </Stack>
        </Card>
      )}
    </Container>
  );
}

