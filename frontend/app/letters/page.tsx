'use client';

import { Container, Paper, Button, Group, ActionIcon } from '@mantine/core';
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
  return (
    <Navigation>
      <Container size="xl" pt={0} pb="xl">
        <LetterEditor />
      </Container>
    </Navigation>
  );
}
