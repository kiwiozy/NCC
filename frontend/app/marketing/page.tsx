/**
 * Marketing Dashboard - Main Landing Page
 * URL: /marketing
 * 
 * Overview of all marketing activities:
 * - Recent campaign performance
 * - Quick stats
 * - Quick actions
 * - Recent activity timeline
 * 
 * Phase 1: Referrers only
 * Phase 2: Add patient marketing later
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
  Stack,
  Timeline,
  Progress,
  SimpleGrid,
} from '@mantine/core';
import {
  IconPlus,
  IconMail,
  IconChartBar,
  IconUsers,
  IconSend,
  IconArrowUpRight,
  IconTemplate,
  IconListDetails,
} from '@tabler/icons-react';
import Link from 'next/link';
import MarketingNav from '../components/MarketingNav';

export default function MarketingDashboardPage() {
  // Mock data - will come from API later
  const stats = [
    {
      label: 'Active Campaigns',
      value: '12',
      change: '+3 this month',
      icon: IconMail,
      color: 'blue',
      href: '/marketing/campaigns',
    },
    {
      label: 'Referrer Contacts',
      value: '245',
      change: '+18 this month',
      icon: IconUsers,
      color: 'grape',
      href: '/marketing/contacts',
    },
    {
      label: 'Emails Sent (30d)',
      value: '1,234',
      change: '+15% vs last month',
      icon: IconSend,
      color: 'green',
      href: '/marketing/analytics',
    },
    {
      label: 'Avg Open Rate',
      value: '85%',
      change: '+5% vs last month',
      icon: IconChartBar,
      color: 'teal',
      href: '/marketing/analytics',
    },
  ];

  const recentActivity = [
    {
      type: 'sent',
      title: 'Campaign sent: "New Insoles Product Launch"',
      description: '245 referrers • 85% opened',
      time: '2 hours ago',
      color: 'green',
    },
    {
      type: 'opened',
      title: 'High engagement on "Quarterly Newsletter"',
      description: '412 emails sent • 92% open rate',
      time: '5 hours ago',
      color: 'blue',
    },
    {
      type: 'draft',
      title: 'Draft created: "Clinic Visit Follow-ups"',
      description: '23 recipients selected',
      time: '1 day ago',
      color: 'gray',
    },
    {
      type: 'contact',
      title: '18 new referrer contacts added',
      description: 'Imported from recent clinic visits',
      time: '2 days ago',
      color: 'grape',
    },
  ];

  const topPerformingCampaigns = [
    { name: 'Quarterly Newsletter', openRate: 92, clickRate: 15, recipients: 412 },
    { name: 'New Insoles Launch', openRate: 85, clickRate: 23, recipients: 245 },
    { name: 'Monthly Health Tips', openRate: 78, clickRate: 12, recipients: 380 },
  ];

  return (
    <Container size="xl" py="xl">
      {/* Marketing Navigation Tabs */}
      <MarketingNav />

      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Marketing Dashboard</Title>
          <Text size="sm" c="dimmed">
            Manage email campaigns and referrer communications
          </Text>
        </div>
        <Button
          component={Link}
          href="/marketing/campaigns/new"
          leftSection={<IconPlus size={16} />}
          size="md"
        >
          New Campaign
        </Button>
      </Group>

      {/* Quick Actions */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="xl">
        <Card
          component={Link}
          href="/marketing/campaigns"
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          style={{ cursor: 'pointer', textDecoration: 'none' }}
        >
          <Group>
            <IconMail size={24} />
            <div>
              <Text size="sm" c="dimmed">View All</Text>
              <Text fw={600}>Campaigns</Text>
            </div>
          </Group>
        </Card>
        <Card
          component={Link}
          href="/marketing/contacts"
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          style={{ cursor: 'pointer', textDecoration: 'none' }}
        >
          <Group>
            <IconUsers size={24} />
            <div>
              <Text size="sm" c="dimmed">Manage</Text>
              <Text fw={600}>Contacts</Text>
            </div>
          </Group>
        </Card>
        <Card
          component={Link}
          href="/marketing/templates"
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          style={{ cursor: 'pointer', textDecoration: 'none' }}
        >
          <Group>
            <IconTemplate size={24} />
            <div>
              <Text size="sm" c="dimmed">Email</Text>
              <Text fw={600}>Templates</Text>
            </div>
          </Group>
        </Card>
        <Card
          component={Link}
          href="/marketing/analytics"
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          style={{ cursor: 'pointer', textDecoration: 'none' }}
        >
          <Group>
            <IconChartBar size={24} />
            <div>
              <Text size="sm" c="dimmed">View</Text>
              <Text fw={600}>Analytics</Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Stats Grid */}
      <Grid mb="xl">
        {stats.map((stat) => (
          <Grid.Col key={stat.label} span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <stat.icon size={24} stroke={1.5} color={`var(--mantine-color-${stat.color}-6)`} />
                <Button
                  component={Link}
                  href={stat.href}
                  variant="subtle"
                  size="xs"
                  rightSection={<IconArrowUpRight size={14} />}
                  p={0}
                >
                  View
                </Button>
              </Group>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>
                {stat.label}
              </Text>
              <Text size="xl" fw={700}>
                {stat.value}
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                {stat.change}
              </Text>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      <Grid>
        {/* Top Performing Campaigns */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={700} size="lg">Top Performing Campaigns</Text>
              <Button
                component={Link}
                href="/marketing/analytics"
                variant="subtle"
                size="xs"
                rightSection={<IconArrowUpRight size={14} />}
              >
                View All
              </Button>
            </Group>
            <Stack gap="md">
              {topPerformingCampaigns.map((campaign, index) => (
                <div key={index}>
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>{campaign.name}</Text>
                    <Badge color="teal" variant="light">
                      {campaign.openRate}% open rate
                    </Badge>
                  </Group>
                  <Group gap="xl" mb="xs">
                    <div style={{ flex: 1 }}>
                      <Text size="xs" c="dimmed" mb={4}>Open Rate</Text>
                      <Progress value={campaign.openRate} size="sm" color="teal" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text size="xs" c="dimmed" mb={4}>Click Rate</Text>
                      <Progress value={campaign.clickRate} size="sm" color="blue" />
                    </div>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Sent to {campaign.recipients} referrers • {campaign.clickRate}% clicked
                  </Text>
                  {index < topPerformingCampaigns.length - 1 && (
                    <div style={{ borderBottom: '1px solid var(--mantine-color-gray-3)', marginTop: 12 }} />
                  )}
                </div>
              ))}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Recent Activity */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text fw={700} size="lg" mb="md">Recent Activity</Text>
            <Timeline active={recentActivity.length} bulletSize={20} lineWidth={2}>
              {recentActivity.map((activity, index) => (
                <Timeline.Item
                  key={index}
                  bullet={<div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: `var(--mantine-color-${activity.color}-6)` }} />}
                  title={<Text size="sm" fw={600}>{activity.title}</Text>}
                  lineVariant={index === recentActivity.length - 1 ? 'dashed' : 'solid'}
                >
                  <Text size="xs" c="dimmed" mb={4}>{activity.description}</Text>
                  <Text size="xs" c="dimmed">{activity.time}</Text>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Phase 1 Info Banner */}
      <Card shadow="sm" padding="md" radius="md" withBorder mt="xl" bg="blue.0">
        <Group>
          <IconUsers size={20} />
          <div>
            <Text size="sm" fw={600}>📋 Phase 1: Referrer Marketing</Text>
            <Text size="xs" c="dimmed">
              Currently focused on healthcare provider campaigns. Patient campaigns coming in Phase 2.
            </Text>
          </div>
        </Group>
      </Card>
    </Container>
  );
}

