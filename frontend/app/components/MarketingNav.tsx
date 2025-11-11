/**
 * MarketingNav - Horizontal tab navigation for Marketing section
 * Used across all Marketing pages
 */

'use client';

import { Group, UnstyledButton, Text, rem } from '@mantine/core';
import { usePathname, useRouter } from 'next/navigation';
import {
  IconLayoutDashboard,
  IconMail,
  IconUsers,
  IconTemplate,
  IconChartBar,
} from '@tabler/icons-react';

export default function MarketingNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { label: 'Dashboard', href: '/marketing', icon: IconLayoutDashboard },
    { label: 'Campaigns', href: '/marketing/campaigns', icon: IconMail },
    { label: 'Contacts', href: '/marketing/contacts', icon: IconUsers },
    { label: 'Templates', href: '/marketing/templates', icon: IconTemplate },
    { label: 'Analytics', href: '/marketing/analytics', icon: IconChartBar },
  ];

  const isActive = (href: string) => {
    if (href === '/marketing') {
      return pathname === '/marketing';
    }
    return pathname.startsWith(href);
  };

  return (
    <Group gap="xs" mb="xl" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)', paddingBottom: rem(8) }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href);
        
        return (
          <UnstyledButton
            key={tab.href}
            onClick={() => router.push(tab.href)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: rem(8),
              padding: `${rem(8)} ${rem(16)}`,
              borderRadius: rem(8),
              backgroundColor: active ? 'var(--mantine-color-blue-0)' : 'transparent',
              transition: 'background-color 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Icon
              size={20}
              stroke={1.5}
              color={active ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)'}
            />
            <Text
              size="sm"
              fw={active ? 600 : 400}
              c={active ? 'blue.6' : 'dimmed'}
            >
              {tab.label}
            </Text>
          </UnstyledButton>
        );
      })}
    </Group>
  );
}

