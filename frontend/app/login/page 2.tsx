'use client';

import { useEffect } from 'react';
import { Container, Paper, Title, Text, Button, Stack, Center, Box } from '@mantine/core';
import { IconBrandGoogle } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // If already authenticated, redirect to home
    // But add a small delay to prevent immediate redirect after logout
    if (!isLoading && isAuthenticated) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 100);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isAuthenticated, isLoading, router]);

  const handleGoogleLogin = () => {
    // Redirect directly to Google OAuth (skips intermediate "Sign In Via Google" page)
    window.location.href = 'https://localhost:8000/api/auth/google/login/';
  };

  if (isLoading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Text>Loading...</Text>
      </Center>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <Container size="xs" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper shadow="md" p="xl" radius="md" withBorder style={{ width: '100%' }}>
        <Stack gap="lg" align="center">
          <Box>
            <Title order={2} ta="center" mb="xs">
              WalkEasy Nexus
            </Title>
            <Text c="dimmed" ta="center" size="sm">
              Sign in to access the clinic management system
            </Text>
          </Box>

          <Button
            leftSection={<IconBrandGoogle size={20} />}
            size="lg"
            fullWidth
            onClick={handleGoogleLogin}
            variant="light"
            style={{
              backgroundColor: '#4285F4',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#357AE8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4285F4';
            }}
          >
            Sign in with Google
          </Button>

          <Text c="dimmed" size="xs" ta="center">
            By signing in, you agree to use your Google account for authentication
            and Gmail access for email functionality.
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
}

