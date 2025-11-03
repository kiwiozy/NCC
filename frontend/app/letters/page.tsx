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
        <LetterEditor />
      </Container>
    </Navigation>
  );
}
