'use client';

import { useState } from 'react';
import { Container, Tabs, Paper, rem, ScrollArea } from '@mantine/core';
import { IconSend, IconMessages, IconHistory } from '@tabler/icons-react';
import Navigation from '../components/Navigation';
import SendSMSTab from '../components/sms/SendSMSTab';
import ConversationsTab from '../components/sms/ConversationsTab';
import HistoryTab from '../components/sms/HistoryTab';

export default function SMSCenterPage() {
  const iconStyle = { width: rem(16), height: rem(16) };

  return (
    <Navigation>
      <Container size="xl" py="xl" style={{ height: '100%' }}>
        <Paper shadow="sm" radius="md" p="xl" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
          <Tabs defaultValue="send" variant="outline" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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

            <ScrollArea style={{ flex: 1 }} offsetScrollbars>
              <Tabs.Panel value="send" pt="xl">
                <SendSMSTab />
              </Tabs.Panel>

              <Tabs.Panel value="conversations" pt="xl">
                <ConversationsTab />
              </Tabs.Panel>

              <Tabs.Panel value="history" pt="xl">
                <HistoryTab />
              </Tabs.Panel>
            </ScrollArea>
          </Tabs>
        </Paper>
      </Container>
    </Navigation>
  );
}
