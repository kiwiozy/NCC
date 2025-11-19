'use client';

import { Modal, Stack, Title, Text, Button, Group, Card, Alert, Divider } from '@mantine/core';
import { IconCheck, IconMail } from '@tabler/icons-react';

interface WelcomeModalProps {
  opened: boolean;
  onClose: () => void;
  userEmail: string;
}

export default function WelcomeModal({ opened, onClose, userEmail }: WelcomeModalProps) {
  const handleAddGmailAccount = () => {
    // Mark that user has started the welcome flow (so modal doesn't reappear)
    localStorage.setItem('has_completed_welcome', 'true');
    
    // Store a flag so we know they're adding a Gmail account
    localStorage.setItem('adding_gmail_from_welcome', 'true');
    
    // Do a full-page redirect to Gmail OAuth (no popup!)
    window.location.href = 'https://localhost:8000/gmail/oauth/connect/';
  };

  const handleSkip = () => {
    // Mark setup as completed
    localStorage.setItem('has_completed_welcome', 'true');
    onClose();
  };

  const handleContinue = () => {
    // Mark setup as completed
    localStorage.setItem('has_completed_welcome', 'true');
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleSkip}
      title={<Title order={2}>Welcome to WalkEasy Nexus! 🎉</Title>}
      size="lg"
      centered
      closeOnClickOutside={false}
    >
      <Stack gap="lg">
        {/* Success Alert */}
        <Alert icon={<IconCheck size={20} />} color="green" variant="light">
          <Text fw={500}>Your Gmail account is connected</Text>
          <Text size="sm" c="dimmed" mt={4}>
            {userEmail}
          </Text>
        </Alert>

        <Divider label="Optional Setup" labelPosition="center" />

        {/* Additional Gmail Accounts Card */}
        <Card withBorder padding="lg">
          <Group align="flex-start" gap="md">
            <IconMail size={32} color="var(--mantine-color-blue-6)" />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text fw={600} size="md">Additional Gmail Accounts</Text>
              <Text size="sm" c="dimmed">
                Do you have other Gmail accounts you'd like to use for sending emails?
                (e.g., shared clinic inbox, personal email)
              </Text>
            </Stack>
            <Button
              variant="light"
              onClick={handleAddGmailAccount}
            >
              Add Now
            </Button>
          </Group>
        </Card>

        {/* Info Text */}
        <Text size="sm" c="dimmed" ta="center">
          You can always add more accounts later in Settings → Testing → Gmail
        </Text>

        {/* Action Buttons */}
        <Group justify="space-between" mt="md">
          <Button variant="subtle" onClick={handleSkip}>
            Skip Setup
          </Button>
          <Button onClick={handleContinue}>
            Continue to Dashboard
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

