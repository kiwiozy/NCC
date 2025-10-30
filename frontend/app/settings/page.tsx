'use client';

import { Container, Title, Tabs, rem } from '@mantine/core';
import { IconBrandXing, IconMessage, IconSettings as IconSettingsIcon, IconBell, IconCloud } from '@tabler/icons-react';
import Navigation from '../components/Navigation';

// We'll import these as separate components
import XeroIntegration from '../components/settings/XeroIntegration';
import SMSIntegration from '../components/settings/SMSIntegration';
import S3Integration from '../components/settings/S3Integration';

export default function SettingsPage() {
  const iconStyle = { width: rem(16), height: rem(16) };

  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Title order={1} mb="xl">Settings</Title>
        
        <Tabs defaultValue="general" variant="outline">
          <Tabs.List>
            <Tabs.Tab 
              value="general" 
              leftSection={<IconSettingsIcon style={iconStyle} />}
            >
              General
            </Tabs.Tab>
            <Tabs.Tab 
              value="xero" 
              leftSection={<IconBrandXing style={iconStyle} />}
            >
              Xero Integration
            </Tabs.Tab>
            <Tabs.Tab 
              value="sms" 
              leftSection={<IconMessage style={iconStyle} />}
            >
              SMS
            </Tabs.Tab>
            <Tabs.Tab 
              value="s3" 
              leftSection={<IconCloud style={iconStyle} />}
            >
              S3 Storage
            </Tabs.Tab>
            <Tabs.Tab 
              value="notifications" 
              leftSection={<IconBell style={iconStyle} />}
            >
              Notifications
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="general" pt="xl">
            <Title order={3} mb="md">General Settings</Title>
            <p>Coming soon...</p>
          </Tabs.Panel>

          <Tabs.Panel value="xero" pt="xl">
            <XeroIntegration />
          </Tabs.Panel>

          <Tabs.Panel value="sms" pt="xl">
            <SMSIntegration />
          </Tabs.Panel>

          <Tabs.Panel value="s3" pt="xl">
            <S3Integration />
          </Tabs.Panel>

          <Tabs.Panel value="notifications" pt="xl">
            <Title order={3} mb="md">Notification Settings</Title>
            <p>Coming soon...</p>
          </Tabs.Panel>
        </Tabs>
      </Container>
    </Navigation>
  );
}

