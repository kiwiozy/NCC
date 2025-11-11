/**
 * Marketing Analytics - Campaign performance and metrics
 * URL: /marketing/analytics
 * 
 * Overall marketing performance dashboard
 */

'use client';

import { Container, Title, Text, Card } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import Navigation from '../../components/Navigation';

export default function MarketingAnalyticsPage() {
  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Title order={1} mb="md">Marketing Analytics</Title>
        <Text size="sm" c="dimmed" mb="xl">
          Campaign performance, trends, and insights
        </Text>

        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <IconChartBar size={64} stroke={1} color="gray" style={{ margin: '0 auto' }} />
            <Title order={3} c="dimmed" mt="md">Analytics Dashboard Coming Soon</Title>
            <Text size="sm" c="dimmed" mt="sm">
              View campaign performance, open rates, click-through rates, and more
            </Text>
          </div>
        </Card>
      </Container>
    </Navigation>
  );
}

