'use client';

import { useState } from 'react';
import { Group, Title, ActionIcon, rem, useMantineColorScheme, Popover, Stack, Button, Box } from '@mantine/core';
import { IconMenu2, IconMail, IconBrandXing, IconMessage, IconCloud, IconNote, IconFileText, IconBell, IconPhoto } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface TestingHeaderProps {
  title?: string;
}

export default function TestingHeader({ 
  title = 'Testing',
}: TestingHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [menuOpened, setMenuOpened] = useState(false);

  const activeTab = searchParams.get('tab') || 'gmail';

  const menuItems = [
    { icon: <IconMail size={20} />, label: 'Gmail', value: 'gmail' },
    { icon: <IconFileText size={20} />, label: 'Letters', value: 'letters' },
    { icon: <IconBrandXing size={20} />, label: 'Xero Integration', value: 'xero' },
    { icon: <IconMessage size={20} />, label: 'SMS', value: 'sms' },
    { icon: <IconCloud size={20} />, label: 'S3 Storage', value: 's3' },
    { icon: <IconPhoto size={20} />, label: 'Images Test', value: 'images' },
    { icon: <IconNote size={20} />, label: 'Notes Test', value: 'notes' },
    { icon: <IconFileText size={20} />, label: 'AT Report', value: 'at-report' },
    { icon: <IconBell size={20} />, label: 'Notifications', value: 'notifications' },
  ];

  const activeMenuItem = menuItems.find(item => item.value === activeTab);

  const handleTabChange = (value: string) => {
    router.push(`/testing?tab=${value}`);
    setMenuOpened(false);
  };

  return (
    <Box>
      {/* Header: Active Tab Title with Menu */}
      <Group
        justify="space-between"
        wrap="nowrap"
        style={{
          backgroundColor: isDark ? '#25262b' : '#ffffff',
          padding: `${rem(16)} ${rem(24)}`,
          borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
          margin: 0,
        }}
      >
        {/* Center: Active Tab Title */}
        <Title 
          order={2} 
          style={{ 
            flex: 1,
            textAlign: 'center',
            fontSize: rem(24),
            fontWeight: 500,
          }}
        >
          {activeMenuItem?.label || 'Testing'}
        </Title>

        {/* Right: Testing Menu */}
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
              title="Testing Menu"
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
                  onClick={() => handleTabChange(item.value)}
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

