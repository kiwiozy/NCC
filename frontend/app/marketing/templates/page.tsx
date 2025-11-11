/**
 * Marketing Templates - Email template library
 * URL: /marketing/templates
 * 
 * Reusable email templates for campaigns
 */

'use client';

import { Container, Title, Text, Card } from '@mantine/core';
import { IconTemplate } from '@tabler/icons-react';
import MarketingNav from '../../components/MarketingNav';

export default function MarketingTemplatesPage() {
  return (
    <Container size="xl" py="xl">
      {/* Marketing Navigation Tabs */}
      <MarketingNav />

      <Title order={1} mb="md">Email Templates</Title>
      <Text size="sm" c="dimmed" mb="xl">
        Reusable email templates for your campaigns
      </Text>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <IconTemplate size={64} stroke={1} color="gray" style={{ margin: '0 auto' }} />
          <Title order={3} c="dimmed" mt="md">Template Library Coming Soon</Title>
          <Text size="sm" c="dimmed" mt="sm">
            Create and manage reusable email templates
          </Text>
        </div>
      </Card>
    </Container>
  );
}

