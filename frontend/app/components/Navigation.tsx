'use client';

import { useState, useRef } from 'react';
import { AppShell, Group, UnstyledButton, Text, rem, useMantineColorScheme, Paper } from '@mantine/core';
import { 
  IconLayoutDashboard, 
  IconUsers, 
  IconCalendar, 
  IconReceipt2,
  IconCheckupList,
  IconFileText,
  IconSettings,
  IconPower,
  IconStethoscope,
  IconUserCircle,
  IconDisabled,
  IconHandStop,
  IconBuilding,
  IconBuildingHospital
} from '@tabler/icons-react';
import { useRouter, usePathname } from 'next/navigation';
import DarkModeToggle from './DarkModeToggle';

interface NavigationProps {
  children: React.ReactNode;
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function NavButton({ icon, label, href, active, onClick, onMouseEnter, onMouseLeave }: NavButtonProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <UnstyledButton
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: rem(6),
        padding: `${rem(10)} ${rem(16)}`,
        backgroundColor: active 
          ? (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)')
          : 'transparent',
        borderRadius: rem(8),
        transition: 'background-color 0.2s ease',
        cursor: 'pointer',
        minWidth: rem(85),
        width: rem(85),
      }}
    >
      <div style={{ 
        color: active ? 'var(--mantine-color-blue-6)' : 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: rem(28),
        width: '100%',
      }}>
        {icon}
      </div>
      <Text 
        size="xs" 
        fw={active ? 600 : 400}
        c={active ? 'blue.6' : 'dimmed'}
        ta="center"
        style={{ width: '100%' }}
      >
        {label}
      </Text>
    </UnstyledButton>
  );
}

export default function Navigation({ children }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [showContactsMenu, setShowContactsMenu] = useState(false);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const iconSize = rem(28);
  const subIconSize = rem(24);

  const navItems = [
    { icon: <IconLayoutDashboard size={iconSize} stroke={1.5} />, label: 'Dashboard', href: '/' },
    { icon: <IconUsers size={iconSize} stroke={1.5} />, label: 'Contacts', href: '/patients', hasSubmenu: true },
    { icon: <IconCalendar size={iconSize} stroke={1.5} />, label: 'Calendar', href: '/calendar' },
    { icon: <IconReceipt2 size={iconSize} stroke={1.5} />, label: 'Accounts', href: '/accounts' },
    { icon: <IconCheckupList size={iconSize} stroke={1.5} />, label: 'Orders', href: '/orders' },
    { icon: <IconFileText size={iconSize} stroke={1.5} />, label: 'Inventory', href: '/inventory' },
    { icon: <IconSettings size={iconSize} stroke={1.5} />, label: 'Settings', href: '/settings' },
  ];

  const contactSubItems = [
    { icon: <IconUsers size={subIconSize} stroke={1.5} />, label: 'Patients', href: '/patients?type=patients' },
    { icon: <IconStethoscope size={subIconSize} stroke={1.5} />, label: 'Referrers', href: '/patients?type=referrers' },
    { icon: <IconUserCircle size={subIconSize} stroke={1.5} />, label: 'Coordinator', href: '/patients?type=coordinator' },
    { icon: <IconDisabled size={subIconSize} stroke={1.5} />, label: 'NDIS LAC', href: '/patients?type=ndis-lac' },
    { icon: <IconHandStop size={subIconSize} stroke={1.5} />, label: 'Contacts', href: '/patients?type=contacts' },
    { icon: <IconBuilding size={subIconSize} stroke={1.5} />, label: 'Companies', href: '/patients?type=companies' },
    { icon: <IconBuildingHospital size={subIconSize} stroke={1.5} />, label: 'Clinics', href: '/patients?type=clinics' },
  ];

  const handleNavClick = (href: string, hasSubmenu?: boolean) => {
    if (!hasSubmenu) {
      setShowContactsMenu(false);
      router.push(href);
    }
  };

  const handleContactsEnter = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
    setShowContactsMenu(true);
  };

  const handleContactsLeave = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    menuTimeoutRef.current = setTimeout(() => {
      setShowContactsMenu(false);
    }, 200);
  };

  const handleSubmenuEnter = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
    setShowContactsMenu(true);
  };

  const handleSubmenuLeave = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    menuTimeoutRef.current = setTimeout(() => {
      setShowContactsMenu(false);
    }, 200);
  };

  return (
    <AppShell
      header={{ height: 80 }}
      padding={0}
    >
      <AppShell.Header
        style={{
          backgroundColor: isDark ? '#25262b' : '#ffffff',
          borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
          {/* Navigation Items - Centered */}
          <Group gap="xs" style={{ flex: 1, justifyContent: 'center' }}>
            {navItems.map((item) => (
              <NavButton
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
                active={pathname.startsWith(item.href) && item.href !== '/'}
                onClick={() => handleNavClick(item.href, item.hasSubmenu)}
                onMouseEnter={item.hasSubmenu ? handleContactsEnter : undefined}
                onMouseLeave={item.hasSubmenu ? handleContactsLeave : undefined}
              />
            ))}
          </Group>

          {/* Right Section: Dark Mode Toggle and Close */}
          <Group gap="md" style={{ position: 'absolute', right: 'var(--mantine-spacing-lg)' }}>
            <DarkModeToggle />
            <UnstyledButton
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: rem(4),
                padding: `${rem(12)} ${rem(20)}`,
                borderRadius: rem(8),
                transition: 'background-color 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <IconPower size={iconSize} stroke={1.5} />
              <Text size="xs" fw={400}>Close</Text>
            </UnstyledButton>
          </Group>
        </Group>

        {/* Contacts Submenu with Buffer Zone */}
        {showContactsMenu && (
          <div
            onMouseEnter={handleSubmenuEnter}
            onMouseLeave={handleSubmenuLeave}
            style={{
              position: 'absolute',
              top: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              padding: rem(30), // 30px buffer zone on all sides
              marginTop: '0px',
            }}
          >
            <Paper
              shadow="lg"
              p="md"
              style={{
                backgroundColor: isDark ? '#25262b' : '#ffffff',
                borderTop: `3px solid #1971c2`,
                minWidth: rem(700),
                paddingTop: rem(16),
              }}
            >
              <Group gap="xs" justify="center">
                {contactSubItems.map((item) => (
                <UnstyledButton
                  key={item.href}
                  onClick={() => {
                    if (menuTimeoutRef.current) {
                      clearTimeout(menuTimeoutRef.current);
                    }
                    setShowContactsMenu(false);
                    router.push(item.href);
                  }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: rem(6),
                      padding: `${rem(12)} ${rem(16)}`,
                      borderRadius: rem(8),
                      transition: 'background-color 0.2s ease',
                      cursor: 'pointer',
                      minWidth: rem(90),
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark 
                        ? 'rgba(25, 113, 194, 0.1)' 
                        : 'rgba(25, 113, 194, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ color: '#1971c2' }}>
                      {item.icon}
                    </div>
                    <Text size="xs" ta="center" c="dimmed">
                      {item.label}
                    </Text>
                  </UnstyledButton>
                ))}
              </Group>
            </Paper>
          </div>
        )}
      </AppShell.Header>

      <AppShell.Main
        style={{
          backgroundColor: isDark ? '#1A1B1E' : '#f5f5f5',
        }}
      >
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
