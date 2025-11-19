'use client';

import { Container, Title, Text, Paper, SimpleGrid, Group, ThemeIcon, Grid } from '@mantine/core';
import { IconCalendar, IconUsers, IconCheckupList, IconClock, IconCheck, IconX } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import Navigation from './components/Navigation';
import SMSNotificationWidget from './components/SMSNotificationWidget';
import WelcomeModal from './components/WelcomeModal';
import { useAuth } from './contexts/AuthContext';

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
  const { isFirstLogin, setIsFirstLogin, user } = useAuth();
  const searchParams = useSearchParams();
  
  // Check for Gmail callback success/error
  useEffect(() => {
    const gmailAdded = searchParams.get('gmail_added');
    const gmailError = searchParams.get('gmail_error');
    
    if (gmailAdded) {
      notifications.show({
        title: 'Gmail Account Connected!',
        message: `${gmailAdded} has been successfully connected. You can now send emails from this account.`,
        color: 'green',
        icon: <IconCheck />,
        autoClose: 6000,
      });
      
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
    
    if (gmailError) {
      notifications.show({
        title: 'Gmail Connection Failed',
        message: gmailError.replace(/\+/g, ' '),
        color: 'red',
        icon: <IconX />,
        autoClose: 8000,
      });
      
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);
  
  return (
    <Navigation>
      {/* Welcome Modal - Only shows once for new users */}
      <WelcomeModal
        opened={isFirstLogin}
        onClose={() => setIsFirstLogin(false)}
        userEmail={user?.email || ''}
      />
      
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

        <Grid gutter="lg" mb="xl">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="xl" shadow="sm" radius="md" style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}>
              <Title order={2} size="h3" mb="md">Welcome to WalkEasy Nexus</Title>
              <Text c="dimmed">
                Your patient management dashboard. Use the navigation above to access different sections of the application.
              </Text>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <SMSNotificationWidget />
          </Grid.Col>
        </Grid>
      </Container>
    </Navigation>
  );
}

