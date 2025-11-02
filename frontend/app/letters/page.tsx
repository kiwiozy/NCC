'use client';

import { Container, Paper, Button, Group, ActionIcon, Title, Box, rem, useMantineColorScheme } from '@mantine/core';
import { 
  IconBold, 
  IconItalic, 
  IconUnderline,
  IconFileTypePdf
} from '@tabler/icons-react';
import Navigation from '../components/Navigation';
import dynamic from 'next/dynamic';
import '../styles/letterhead.css';

// Dynamically import the editor to avoid SSR issues
const LetterEditor = dynamic(() => import('./LetterEditor'), { ssr: false });

export default function LettersPage() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Navigation>
      {/* Fixed Letters Title Section - Outside Container */}
      <Box
        style={{
          position: 'sticky',
          top: 80, // Below the 80px navigation
          zIndex: 90,
          backgroundColor: isDark ? '#25262b' : '#ffffff',
          borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
          padding: `${rem(16)} 0`,
          margin: 0,
        }}
      >
        <Title 
          order={2} 
          style={{ 
            textAlign: 'center',
            fontSize: rem(24),
            fontWeight: 500,
            margin: 0,
          }}
        >
          Letters
        </Title>
      </Box>

      {/* Scrollable Content Area */}
      <Container size="xl" p={0}>
        <LetterEditor />
      </Container>
    </Navigation>
  );
}
