'use client';

import { useState } from 'react';
import { Group, Title, ActionIcon, rem, useMantineColorScheme, Popover, Stack, Button, Text, Box } from '@mantine/core';
import { IconMenu2, IconMail, IconBrandXing, IconMessage, IconCloud, IconNote, IconFileText, IconBell, IconSettings as IconSettingsIcon } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SettingsHeaderProps {
  title?: string;
}

export default function SettingsHeader({ 
  title = 'Settings',
}: SettingsHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [menuOpened, setMenuOpened] = useState(false);

  const activeTab = searchParams.get('tab') || 'general';

  const menuItems = [
    { icon: <IconSettingsIcon size={20} />, label: 'General', value: 'general' },
    { icon: <IconMail size={20} />, label: 'Gmail', value: 'gmail' },
    { icon: <IconBrandXing size={20} />, label: 'Xero Integration', value: 'xero' },
    { icon: <IconMessage size={20} />, label: 'SMS', value: 'sms' },
    { icon: <IconCloud size={20} />, label: 'S3 Storage', value: 's3' },
    { icon: <IconNote size={20} />, label: 'Notes Test', value: 'notes' },
    { icon: <IconFileText size={20} />, label: 'AT Report', value: 'at-report' },
    { icon: <IconBell size={20} />, label: 'Notifications', value: 'notifications' },
  ];

  const activeMenuItem = menuItems.find(item => item.value === activeTab);

  return (
    <Box>
      {/* First Row: Title */}
      <Group
        justify="center"
        wrap="nowrap"
        style={{
          backgroundColor: isDark ? '#25262b' : '#ffffff',
          padding: `${rem(16)} ${rem(24)}`,
          borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
          margin: 0,
        }}
      >
        {/* Center: Title */}
        <Title 
          order={2} 
          style={{ 
            textAlign: 'center',
            fontSize: rem(24),
            fontWeight: 500,
          }}
        >
          {title}
        </Title>
      </Group>

      {/* Second Row: Active Tab and Hamburger Menu */}
      <Group
        justify="space-between"
        wrap="nowrap"
        style={{
          backgroundColor: isDark ? '#1A1B1E' : '#f8f9fa',
          padding: `${rem(12)} ${rem(24)}`,
          borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
        }}
      >
        {/* Left: Active Tab Display */}
        <Group gap="xs">
          {activeMenuItem?.icon}
          <Text size="sm" fw={500}>
            {activeMenuItem?.label || 'General'}
          </Text>
        </Group>

        {/* Right: Hamburger Menu */}
        <Popover
          opened={menuOpened}
          onChange={setMenuOpened}
          position="bottom-end"
          shadow="md"
          width={250}
        >
          <Popover.Target>
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => setMenuOpened((o) => !o)}
              title="Settings Menu"
            >
              <IconMenu2 size={20} stroke={1.5} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown p={0}>
            <Stack gap={0}>
              {menuItems.map((item, index) => (
                <Button
                  key={index}
                  variant={activeTab === item.value ? 'light' : 'subtle'}
                  color="blue"
                  leftSection={item.icon}
                  onClick={() => {
                    router.push(`/settings?tab=${item.value}`);
                    setMenuOpened(false);
                  }}
                  style={{
                    justifyContent: 'flex-start',
                    height: rem(42),
                    borderRadius: 0,
                    borderBottom: index < menuItems.length - 1 ? `1px solid ${isDark ? '#373A40' : '#dee2e6'}` : 'none',
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Group>
    </Box>
  );
}

