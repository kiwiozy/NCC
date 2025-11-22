'use client';

import { useState } from 'react';
import { Container, Tabs, Paper, rem } from '@mantine/core';
import { IconSend, IconMessages, IconHistory } from '@tabler/icons-react';
import Navigation from '../components/Navigation';
import SendSMSTab from '../components/sms/SendSMSTab';

export default function SMSCenterPage() {
  const iconStyle = { width: rem(16), height: rem(16) };

  return (
    <Navigation>
      <Container size="xl" py="xl" style={{ height: '100%' }}>
        <Paper shadow="sm" radius="md" p="xl" style={{ height: 'calc(100vh - 120px)' }}>
          <Tabs defaultValue="send" variant="outline">
            <Tabs.List>
              <Tabs.Tab value="send" leftSection={<IconSend style={iconStyle} />}>
                Send SMS
              </Tabs.Tab>
              <Tabs.Tab value="conversations" leftSection={<IconMessages style={iconStyle} />}>
                Conversations
              </Tabs.Tab>
              <Tabs.Tab value="history" leftSection={<IconHistory style={iconStyle} />}>
                History
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="send" pt="xl">
              <SendSMSTab />
            </Tabs.Panel>

            <Tabs.Panel value="conversations" pt="xl">
              {/* TODO: Embed existing 2-way SMS conversation list */}
              Coming soon: View all patient SMS conversations
            </Tabs.Panel>

            <Tabs.Panel value="history" pt="xl">
              {/* TODO: Build SMS history table */}
              Coming soon: All SMS history
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Container>
    </Navigation>
  );
}
