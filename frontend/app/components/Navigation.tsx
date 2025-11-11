'use client';

import { useState, useRef, useEffect } from 'react';
import { AppShell, Group, UnstyledButton, Text, rem, useMantineColorScheme, Paper, ActionIcon, Menu, Avatar, Badge } from '@mantine/core';
import ConsoleFilter from './ConsoleFilter';
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
  IconBuildingHospital,
  IconArrowLeft,
  IconMail,
  IconBrandXing,
  IconMessage,
  IconCloud,
  IconNote,
  IconBell,
  IconPencil,
  IconFlask,
  IconPhoto,
  IconLogout,
  IconSpeakerphone,
  IconChartBar,
  IconTemplate
} from '@tabler/icons-react';
import { useRouter, usePathname } from 'next/navigation';
import DarkModeToggle from './DarkModeToggle';
import { useBrowserDetection } from '../utils/browserDetection';
import { useAuth } from '../contexts/AuthContext';
import { useSMS } from '../contexts/SMSContext';
import { useSMSNotifications } from '../hooks/useSMSNotifications';

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
  unreadBadge?: number;
}

function NavButton({ icon, label, href, active, onClick, onMouseEnter, onMouseLeave, unreadBadge }: NavButtonProps) {
  const { colorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted && colorScheme === 'dark';
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const hoverColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)';
  const activeColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  
  // Attach DOM event listeners for hover effect
  useState(() => {
    const button = buttonRef.current;
    if (button && !active) {
      const handleMouseOver = () => {
        button.style.backgroundColor = hoverColor;
      };
      const handleMouseOut = () => {
        button.style.backgroundColor = 'transparent';
      };
      
      button.addEventListener('mouseover', handleMouseOver);
      button.addEventListener('mouseout', handleMouseOut);
      
      return () => {
        button.removeEventListener('mouseover', handleMouseOver);
        button.removeEventListener('mouseout', handleMouseOut);
      };
    }
  });
  
  return (
    <UnstyledButton
      ref={buttonRef}
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
        backgroundColor: active ? activeColor : 'transparent',
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
        position: 'relative',
      }}>
        {icon}
        {/* Unread badge */}
        {unreadBadge && unreadBadge > 0 && (
          <Badge
            size="sm"
            variant="filled"
            color="blue"
            circle
            style={{
              position: 'absolute',
              top: -4,
              right: rem(12),
              minWidth: rem(18),
              height: rem(18),
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unreadBadge > 99 ? '99+' : unreadBadge}
          </Badge>
        )}
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
  const { user, logout, isAuthenticated } = useAuth();
  const { unreadCount } = useSMS(); // Get unread SMS count
  useSMSNotifications(); // Enable global notifications
  const [mounted, setMounted] = useState(false);
  const browser = useBrowserDetection();
  const [showContactsMenu, setShowContactsMenu] = useState(false);
  const [showMarketingMenu, setShowMarketingMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showTestingMenu, setShowTestingMenu] = useState(false);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Prevent hydration mismatch by only using color scheme after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted && colorScheme === 'dark';
  
  const iconSize = 28;
  const subIconSize = 24;

  const navItems = [
    { icon: <IconLayoutDashboard size={iconSize} stroke={1.5} />, label: 'Dashboard', href: '/', unreadBadge: unreadCount > 0 ? unreadCount : undefined },
    { icon: <IconUsers size={iconSize} stroke={1.5} />, label: 'Contacts', href: '/patients', hasSubmenu: true, submenuType: 'contacts' },
    { icon: <IconCalendar size={iconSize} stroke={1.5} />, label: 'Calendar', href: '/calendar' },
    { icon: <IconSpeakerphone size={iconSize} stroke={1.5} />, label: 'Marketing', href: '/marketing', hasSubmenu: true, submenuType: 'marketing' },
    { icon: <IconReceipt2 size={iconSize} stroke={1.5} />, label: 'Accounts', href: '/accounts' },
    { icon: <IconCheckupList size={iconSize} stroke={1.5} />, label: 'Orders', href: '/orders' },
    { icon: <IconFileText size={iconSize} stroke={1.5} />, label: 'Inventory', href: '/inventory' },
    { icon: <IconFlask size={iconSize} stroke={1.5} />, label: 'Testing', href: '/testing', hasSubmenu: true, submenuType: 'testing' },
    { icon: <IconSettings size={iconSize} stroke={1.5} />, label: 'Settings', href: '/settings', hasSubmenu: true, submenuType: 'settings' },
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

  const marketingSubItems = [
    { icon: <IconLayoutDashboard size={subIconSize} stroke={1.5} />, label: 'Dashboard', href: '/marketing' },
    { icon: <IconMail size={subIconSize} stroke={1.5} />, label: 'Campaigns', href: '/marketing/campaigns' },
    { icon: <IconUsers size={subIconSize} stroke={1.5} />, label: 'Contacts', href: '/marketing/contacts' },
    { icon: <IconTemplate size={subIconSize} stroke={1.5} />, label: 'Templates', href: '/marketing/templates' },
    { icon: <IconChartBar size={subIconSize} stroke={1.5} />, label: 'Analytics', href: '/marketing/analytics' },
  ];

  const testingSubItems = [
    { icon: <IconMail size={subIconSize} stroke={1.5} />, label: 'Gmail', href: '/testing?tab=gmail' },
    { icon: <IconFileText size={subIconSize} stroke={1.5} />, label: 'Letters', href: '/testing?tab=letters' },
    { icon: <IconBrandXing size={subIconSize} stroke={1.5} />, label: 'Xero Integration', href: '/testing?tab=xero' },
    { icon: <IconMessage size={subIconSize} stroke={1.5} />, label: 'SMS', href: '/testing?tab=sms' },
    { icon: <IconCloud size={subIconSize} stroke={1.5} />, label: 'S3 Storage', href: '/testing?tab=s3' },
    { icon: <IconPhoto size={subIconSize} stroke={1.5} />, label: 'Images Test', href: '/testing?tab=images' },
    { icon: <IconNote size={subIconSize} stroke={1.5} />, label: 'Notes Test', href: '/testing?tab=notes' },
    { icon: <IconFileText size={subIconSize} stroke={1.5} />, label: 'AT Report', href: '/testing?tab=at-report' },
    { icon: <IconBell size={subIconSize} stroke={1.5} />, label: 'Notifications', href: '/testing?tab=notifications' },
  ];

  const settingsSubItems = [
    { icon: <IconSettings size={subIconSize} stroke={1.5} />, label: 'General', href: '/settings?tab=general' },
    { icon: <IconPencil size={subIconSize} stroke={1.5} />, label: 'Funding Sources', href: '/settings?tab=funding-sources' },
    { icon: <IconBuildingHospital size={subIconSize} stroke={1.5} />, label: 'Clinics', href: '/settings?tab=clinics' },
  ];

  const handleNavClick = (href: string, hasSubmenu?: boolean) => {
    if (!hasSubmenu) {
      setShowContactsMenu(false);
      setShowMarketingMenu(false);
      setShowSettingsMenu(false);
      setShowTestingMenu(false);
      router.push(href);
    }
  };

  const handleMenuEnter = (menuType: string) => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
    if (menuType === 'contacts') {
      setShowMarketingMenu(false);
      setShowSettingsMenu(false);
      setShowTestingMenu(false);
      setShowContactsMenu(true);
    } else if (menuType === 'marketing') {
      setShowContactsMenu(false);
      setShowSettingsMenu(false);
      setShowTestingMenu(false);
      setShowMarketingMenu(true);
    } else if (menuType === 'settings') {
      setShowContactsMenu(false);
      setShowMarketingMenu(false);
      setShowTestingMenu(false);
      setShowSettingsMenu(true);
    } else if (menuType === 'testing') {
      setShowContactsMenu(false);
      setShowMarketingMenu(false);
      setShowSettingsMenu(false);
      setShowTestingMenu(true);
    }
  };

  const handleMenuLeave = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    menuTimeoutRef.current = setTimeout(() => {
      setShowContactsMenu(false);
      setShowMarketingMenu(false);
      setShowSettingsMenu(false);
      setShowTestingMenu(false);
    }, 200);
  };

  const handleSubmenuEnter = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
  };

  const handleSubmenuLeave = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    menuTimeoutRef.current = setTimeout(() => {
      setShowContactsMenu(false);
      setShowMarketingMenu(false);
      setShowSettingsMenu(false);
      setShowTestingMenu(false);
    }, 200);
  };

  return (
    <>
      <ConsoleFilter />
      <AppShell
        header={{ height: 80 }}
        padding={0}
      >
      <AppShell.Header
        style={{
          backgroundColor: mounted ? (isDark ? '#25262b' : '#ffffff') : '#ffffff',
          borderBottom: mounted ? `1px solid ${isDark ? '#373A40' : '#dee2e6'}` : '1px solid #dee2e6',
          // Sticky positioning with Safari-specific fixes
          position: (browser.isSafari ? '-webkit-sticky' : 'sticky') as any,
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          overflow: 'visible',
          // Safari-specific: ensure header has proper stacking context
          ...(browser.isSafari && {
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
          }),
        }}
      >
        <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
          {/* Left: Back Button */}
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => router.back()}
            title="Back"
            style={{ minWidth: rem(36) }}
          >
            <IconArrowLeft size={20} stroke={1.5} />
          </ActionIcon>

          {/* Navigation Items - Centered */}
          <Group gap="xs" style={{ flex: 1, justifyContent: 'center' }}>
            {navItems.map((item) => (
              <NavButton
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
                active={(pathname.startsWith(item.href) && item.href !== '/') || (item.href === '/marketing' && pathname.startsWith('/marketing')) || (item.href === '/testing' && pathname.startsWith('/testing')) || (item.href === '/settings' && pathname.startsWith('/settings'))}
                onClick={() => handleNavClick(item.href, item.hasSubmenu)}
                onMouseEnter={item.hasSubmenu ? () => handleMenuEnter(item.submenuType!) : undefined}
                onMouseLeave={item.hasSubmenu ? handleMenuLeave : undefined}
                unreadBadge={item.unreadBadge}
              />
            ))}
          </Group>

          {/* Right Section: User Menu, Dark Mode Toggle and Close */}
          <Group gap="md" style={{ position: 'absolute', right: 'var(--mantine-spacing-lg)' }}>
            {/* User Menu */}
            {isAuthenticated && user && (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <UnstyledButton
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: rem(8),
                      padding: `${rem(8)} ${rem(12)}`,
                      borderRadius: rem(8),
                      transition: 'background-color 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = mounted && isDark 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(0, 0, 0, 0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Avatar size="sm" radius="xl" color="blue">
                      {user.email?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <Text size="sm" fw={500} style={{ maxWidth: rem(120), overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email || user.username}
                    </Text>
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Signed in as</Menu.Label>
                  <Menu.Item disabled>
                    <Text size="xs" c="dimmed">{user.email || user.username}</Text>
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconLogout size={16} />}
                    onClick={async () => {
                      await logout();
                    }}
                    color="red"
                  >
                    Sign out
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
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
                e.currentTarget.style.backgroundColor = mounted && isDark 
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
                backgroundColor: mounted ? (isDark ? '#25262b' : '#ffffff') : '#ffffff',
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
                    setShowMarketingMenu(false);
                    setShowSettingsMenu(false);
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
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = isDark 
                        ? 'rgba(25, 113, 194, 0.1)' 
                        : 'rgba(25, 113, 194, 0.1)';
                    }}
                    onMouseOut={(e) => {
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

        {/* Marketing Submenu with Buffer Zone */}
        {showMarketingMenu && (
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
                backgroundColor: mounted ? (isDark ? '#25262b' : '#ffffff') : '#ffffff',
                borderTop: `3px solid #1971c2`,
                minWidth: rem(700),
                paddingTop: rem(16),
              }}
            >
              <Group gap="xs" justify="center">
                {marketingSubItems.map((item) => (
                <UnstyledButton
                  key={item.href}
                  onClick={() => {
                    if (menuTimeoutRef.current) {
                      clearTimeout(menuTimeoutRef.current);
                    }
                    setShowContactsMenu(false);
                    setShowMarketingMenu(false);
                    setShowSettingsMenu(false);
                    setShowTestingMenu(false);
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
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = isDark 
                        ? 'rgba(25, 113, 194, 0.1)' 
                        : 'rgba(25, 113, 194, 0.1)';
                    }}
                    onMouseOut={(e) => {
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

        {/* Settings Submenu with Buffer Zone */}
        {showSettingsMenu && (
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
                backgroundColor: mounted ? (isDark ? '#25262b' : '#ffffff') : '#ffffff',
                borderTop: `3px solid #1971c2`,
                minWidth: rem(700),
                paddingTop: rem(16),
              }}
            >
              <Group gap="xs" justify="center">
                {settingsSubItems.map((item) => (
                <UnstyledButton
                  key={item.href}
                  onClick={() => {
                    if (menuTimeoutRef.current) {
                      clearTimeout(menuTimeoutRef.current);
                    }
                    setShowContactsMenu(false);
                    setShowSettingsMenu(false);
                    setShowTestingMenu(false);
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
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = isDark 
                        ? 'rgba(25, 113, 194, 0.1)' 
                        : 'rgba(25, 113, 194, 0.1)';
                    }}
                    onMouseOut={(e) => {
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

        {/* Testing Submenu with Buffer Zone */}
        {showTestingMenu && (
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
                backgroundColor: mounted ? (isDark ? '#25262b' : '#ffffff') : '#ffffff',
                borderTop: `3px solid #1971c2`,
                minWidth: rem(700),
                paddingTop: rem(16),
              }}
            >
              <Group gap="xs" justify="center">
                {testingSubItems.map((item) => (
                <UnstyledButton
                  key={item.href}
                  onClick={() => {
                    if (menuTimeoutRef.current) {
                      clearTimeout(menuTimeoutRef.current);
                    }
                    setShowContactsMenu(false);
                    setShowSettingsMenu(false);
                    setShowTestingMenu(false);
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
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = isDark 
                        ? 'rgba(25, 113, 194, 0.1)' 
                        : 'rgba(25, 113, 194, 0.1)';
                    }}
                    onMouseOut={(e) => {
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
          backgroundColor: mounted ? (isDark ? '#1A1B1E' : '#f5f5f5') : '#f5f5f5',
          padding: 0,
          // Ensure content is scrollable and doesn't conflict with sticky header
          minHeight: '100vh',
        }}
      >
        {children}
      </AppShell.Main>
    </AppShell>
    </>
  );
}
