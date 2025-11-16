'use client';

import { Container, Title, Text, Stack, Paper, Button, Group } from '@mantine/core';
import { IconUsers, IconBuildingStore } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';

export default function XeroContactsPage() {
  const router = useRouter();

  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Title order={2} mb="xl">Xero Contacts</Title>

        <Stack gap="md">
          <Paper p="xl" withBorder>
            <Group>
              <IconUsers size={48} opacity={0.5} />
              <Stack gap="xs" style={{ flex: 1 }}>
                <Title order={3}>Patient Contacts</Title>
                <Text c="dimmed">
                  Patients are automatically synced to Xero when creating invoices or quotes.
                  Patient contacts are managed through the Patients page.
                </Text>
              </Stack>
              <Button onClick={() => router.push('/patients')}>
                View Patients
              </Button>
            </Group>
          </Paper>

          <Paper p="xl" withBorder>
            <Group>
              <IconBuildingStore size={48} opacity={0.5} />
              <Stack gap="xs" style={{ flex: 1 }}>
                <Title order={3}>Company Contacts</Title>
                <Text c="dimmed">
                  Companies are automatically synced to Xero when creating invoices or quotes with company billing.
                  Company contacts are managed through the Companies page.
                </Text>
              </Stack>
              <Button onClick={() => router.push('/companies')}>
                View Companies
              </Button>
            </Group>
          </Paper>

          <Paper p="md" withBorder bg="blue.0">
            <Text size="sm" fw={600} mb="xs">💡 How Xero Contact Sync Works</Text>
            <Stack gap="xs">
              <Text size="sm">
                • Contacts are synced automatically when creating invoices or quotes
              </Text>
              <Text size="sm">
                • You can choose patient OR company as the primary Xero contact per invoice
              </Text>
              <Text size="sm">
                • The secondary entity (patient/company) appears in the invoice reference field
              </Text>
              <Text size="sm">
                • Updates to patient/company details will sync to Xero on next invoice creation
              </Text>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Navigation>
  );
}

