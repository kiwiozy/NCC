'use client';

import { Group, UnstyledButton, rem, useMantineColorScheme, Stack, Text } from '@mantine/core';
import { IconSettings as IconSettingsIcon, IconCurrencyDollar, IconBuildingHospital, IconDatabase, IconMail, IconClock } from '@tabler/icons-react';
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

  const activeTab = searchParams.get('tab') || 'general';

  const menuItems = [
    { icon: <IconSettingsIcon size={24} />, label: 'General', value: 'general' },
    { icon: <IconCurrencyDollar size={24} />, label: 'Funding Sources', value: 'funding-sources' },
    { icon: <IconBuildingHospital size={24} />, label: 'Clinics', value: 'clinics' },
    { icon: <IconClock size={24} />, label: 'Appointment Types', value: 'appointment-types' },
    { icon: <IconMail size={24} />, label: 'Email Templates', value: 'email-templates' },
    { icon: <IconDatabase size={24} />, label: 'Data Management', value: 'data-management' },
  ];

  const handleTabChange = (value: string) => {
    router.push(`/settings?tab=${value}`);
  };

  return (
    <Group
      justify="center"
      gap="xl"
      wrap="nowrap"
      style={{
        backgroundColor: isDark ? '#25262b' : '#ffffff',
        padding: `${rem(24)} ${rem(24)}`,
        borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
        margin: 0,
      }}
    >
      {menuItems.map((item) => (
        <UnstyledButton
          key={item.value}
          onClick={() => handleTabChange(item.value)}
          style={{
            padding: `${rem(8)} ${rem(16)}`,
            borderRadius: rem(8),
            transition: 'background-color 0.2s',
            opacity: activeTab === item.value ? 1 : 0.6,
          }}
        >
          <Stack gap={4} align="center">
            <div style={{ color: '#228be6' }}>
              {item.icon}
            </div>
            <Text 
              size="sm" 
              fw={activeTab === item.value ? 600 : 400}
              c={isDark ? '#c1c2c5' : '#495057'}
            >
              {item.label}
            </Text>
          </Stack>
        </UnstyledButton>
      ))}
    </Group>
  );
}

