'use client';

import dynamic from 'next/dynamic';
import { Container } from '@mantine/core';

// Dynamically import LetterEditor to prevent SSR issues with TipTap
const LetterEditor = dynamic(() => import('../../letters/LetterEditor'), { ssr: false });

export default function LetterComposer() {
  return (
    <Container size="xl" py="xl">
      <LetterEditor />
    </Container>
  );
}

