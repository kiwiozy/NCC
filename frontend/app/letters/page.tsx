'use client';

import { Container, Title } from '@mantine/core';
import Navigation from '../components/Navigation';
import dynamic from 'next/dynamic';
import '../styles/letterhead.css';

// Dynamically import the editor to avoid SSR issues
const LetterEditor = dynamic(() => import('./LetterEditor'), { ssr: false });

export default function LettersPage() {
  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Title order={2} mb="xl">Letters</Title>
        {/* Force light mode for letter canvas - not affected by app theme */}
        <div 
          style={{ 
            colorScheme: 'light',
            color: '#000000',
            '--mantine-color-text': '#000000',
          } as React.CSSProperties} 
          data-mantine-color-scheme="light"
          data-force-light-mode="true"
        >
          <LetterEditor />
        </div>
      </Container>
    </Navigation>
  );
}
