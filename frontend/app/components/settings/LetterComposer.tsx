'use client';

import { Container, Title, Text, Paper, rem } from '@mantine/core';

export default function LetterComposer() {
  return (
    <Container size="xl" py="xl">
      <Paper shadow="sm" p="xl" withBorder>
        <Title order={2} mb="md">Letter Composer</Title>
        <Text c="dimmed">
          Coming soon...
        </Text>
      </Paper>
    </Container>
  );
}

