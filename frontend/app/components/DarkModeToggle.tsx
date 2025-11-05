'use client';

import { useState, useEffect } from 'react';
import { ActionIcon, useMantineColorScheme, useComputedColorScheme, Tooltip } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';

export default function DarkModeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
  };

  // Render a placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Toggle color scheme"
        style={{ visibility: 'hidden' }}
      >
        <IconMoon size={20} />
      </ActionIcon>
    );
  }

  return (
    <Tooltip label={computedColorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
      <ActionIcon
        onClick={toggleColorScheme}
        variant="default"
        size="lg"
        aria-label="Toggle color scheme"
      >
        {computedColorScheme === 'dark' ? (
          <IconSun size={20} />
        ) : (
          <IconMoon size={20} />
        )}
      </ActionIcon>
    </Tooltip>
  );
}

