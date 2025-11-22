'use client';

import { useState, useEffect } from 'react';
import {
  Stack,
  TextInput,
  ScrollArea,
  Text,
  Group,
  Badge,
  Paper,
  Box,
  Loader,
  Center,
} from '@mantine/core';
import { IconSearch, IconMessage } from '@tabler/icons-react';
import { useSMS } from '../../contexts/SMSContext';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

interface ConversationItem {
  patient_id: string;
  patient_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  phone_number: string;
}

// Format timestamp for display
function formatMessageTime(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Format as date for older messages
  return date.toLocaleDateString();
}

export default function ConversationsTab() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  const { openSMSDialog } = useSMS();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://localhost:8000/api/sms/conversations/', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.patient_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Stack gap="md" h="100%">
      {/* Search */}
      <TextInput
        placeholder="Search conversations..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Conversation List */}
      <ScrollArea style={{ flex: 1 }}>
        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : conversations.length === 0 ? (
          <Center h={200}>
            <Stack align="center" gap="sm">
              <IconMessage size={48} opacity={0.3} />
              <Text c="dimmed" size="sm">
                No SMS conversations yet
              </Text>
              <Text c="dimmed" size="xs">
                Send an SMS from the "Send SMS" tab to start a conversation
              </Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {filteredConversations.map((conv) => (
              <Paper
                key={conv.patient_id}
                p="md"
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  openSMSDialog(conv.patient_id, conv.patient_name);
                }}
              >
                <Group justify="space-between">
                  <Box style={{ flex: 1 }}>
                    <Group justify="space-between" mb="xs">
                      <Text fw={600}>{conv.patient_name}</Text>
                      <Text size="xs" c="dimmed">{formatMessageTime(conv.last_message_time)}</Text>
                    </Group>
                    <Text size="sm" c="dimmed" lineClamp={1}>
                      {conv.last_message}
                    </Text>
                  </Box>
                  {conv.unread_count > 0 && (
                    <Badge color="blue" size="sm" circle>
                      {conv.unread_count}
                    </Badge>
                  )}
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  );
}

