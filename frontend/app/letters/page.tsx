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
      {/* Inner scroll container - THIS is where Safari expects the sticky elements */}
      <div
        style={{
          height: 'calc(100vh - 80px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Fixed Letters Title Section - Direct child of scroll container */}
        <Box
          style={{
            position: 'sticky',
            position: '-webkit-sticky', // Safari support
            top: 0,
            zIndex: 150,
            backgroundColor: isDark ? '#25262b' : '#ffffff',
            borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
            padding: `${rem(8)} 0`,
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
      </div>
    </Navigation>
  );
}
