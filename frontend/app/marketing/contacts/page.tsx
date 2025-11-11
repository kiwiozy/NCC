/**
 * Marketing Contacts - Manage referrer contacts for campaigns
 * URL: /marketing/contacts
 * 
 * Phase 1: Referrer contacts only
 * Phase 2: Add patient contacts
 */

'use client';

import { Container, Title, Text, Card } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';

export default function MarketingContactsPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="md">Marketing Contacts</Title>
      <Text size="sm" c="dimmed" mb="xl">
        Manage referrer contacts for email campaigns (Phase 1)
      </Text>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <IconUsers size={64} stroke={1} color="gray" style={{ margin: '0 auto' }} />
          <Title order={3} c="dimmed" mt="md">Marketing Contacts Coming Soon</Title>
          <Text size="sm" c="dimmed" mt="sm">
            Manage referrer contacts, segments, and email lists
          </Text>
        </div>
      </Card>
    </Container>
  );
}

