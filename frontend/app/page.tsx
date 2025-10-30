'use client';

import { Container, Title, Text, Paper, SimpleGrid, Group, ThemeIcon } from '@mantine/core';
import { IconCalendar, IconUsers, IconCheckupList, IconClock } from '@tabler/icons-react';
import Navigation from './components/Navigation';

function StatCard({ title, value, icon, color }: any) {
  return (
    <Paper p="xl" shadow="sm" radius="md">
      <Group justify="apart">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text size="xl" fw={700} mt="md">
            {value}
          </Text>
        </div>
        <ThemeIcon size="xl" radius="md" variant="light" color={color}>
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

export default function Home() {
  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Title order={1} mb="xl">Dashboard</Title>
        
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
          <StatCard
            title="Today's Appointments"
            value="12"
            icon={<IconCalendar size={24} />}
            color="blue"
          />
          <StatCard
            title="Total Patients"
            value="2,727"
            icon={<IconUsers size={24} />}
            color="teal"
          />
          <StatCard
            title="Pending Orders"
            value="8"
            icon={<IconCheckupList size={24} />}
            color="orange"
          />
          <StatCard
            title="Upcoming (7 days)"
            value="45"
            icon={<IconClock size={24} />}
            color="grape"
          />
        </SimpleGrid>

        <Paper p="xl" shadow="sm" radius="md">
          <Title order={2} size="h3" mb="md">Welcome to Nexus Core Clinic</Title>
          <Text c="dimmed">
            Your patient management dashboard. Use the navigation above to access different sections of the application.
          </Text>
        </Paper>
      </Container>
    </Navigation>
  );
}

