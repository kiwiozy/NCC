'use client';

import { useState } from 'react';
import { AppShell, Group, Title, Tabs, rem } from '@mantine/core';
import { IconCalendar, IconBrandXing, IconMessage } from '@tabler/icons-react';
import DarkModeToggle from './DarkModeToggle';

interface NavigationProps {
  children: React.ReactNode;
  activeTab: string;
}

export default function Navigation({ children, activeTab }: NavigationProps) {
  const iconStyle = { width: rem(20), height: rem(20) };

  return (
    <AppShell
      header={{ height: 140 }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="xl" justify="space-between" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <div style={{ flex: 1 }}>
            <Title order={2} mt="md">Nexus Core Clinic</Title>
            <Tabs value={activeTab} mt="md">
              <Tabs.List>
                <Tabs.Tab 
                  value="calendar" 
                  leftSection={<IconCalendar style={iconStyle} />}
                  component="a"
                  href="/"
                >
                  Calendar
                </Tabs.Tab>
                <Tabs.Tab 
                  value="xero" 
                  leftSection={<IconBrandXing style={iconStyle} />}
                  component="a"
                  href="/xero"
                >
                  Xero Integration
                </Tabs.Tab>
                <Tabs.Tab 
                  value="sms" 
                  leftSection={<IconMessage style={iconStyle} />}
                  component="a"
                  href="/sms"
                >
                  SMS
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </div>
          <DarkModeToggle />
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

