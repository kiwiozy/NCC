'use client';

import { useState, useEffect } from 'react';
import { Paper, Title, Stack, Text, Group, Badge, ScrollArea, Box, rem, Loader, Center } from '@mantine/core';
import { IconMessageCircle, IconClock, IconUser } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import { useRouter } from 'next/navigation';

interface SMSInbound {
  id: string;
  from_number: string;
  message: string;
  received_at: string;
  is_processed: boolean;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

// Format phone number for display
function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[+\s]/g, '');
  if (cleaned.startsWith('61') && cleaned.length === 11) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  return phone;
}

// Format time ago
function formatTimeAgo(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleString('en-AU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SMSNotificationWidget() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [messages, setMessages] = useState<SMSInbound[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadRecentMessages = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/sms/inbound/?ordering=-received_at&page_size=10', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const messagesList = data.results || data;
        setMessages(Array.isArray(messagesList) ? messagesList : []);
        
        // Count unread messages
        const unread = messagesList.filter((msg: SMSInbound) => !msg.is_processed).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading SMS messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecentMessages();
    
    // Poll every 5 seconds for new messages
    const interval = setInterval(loadRecentMessages, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle message click - navigate to patient
  const handleMessageClick = (message: SMSInbound) => {
    if (message.patient) {
      router.push(`/patients?type=patients&patientId=${message.patient.id}&openSMS=true`);
    }
  };

  return (
    <Paper p="xl" shadow="sm" radius="md" style={{ height: 'calc(100vh - 400px)', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconMessageCircle size={24} color="#228BE6" />
          <Title order={3} size="h4">Recent SMS Messages</Title>
        </Group>
        {unreadCount > 0 && (
          <Badge size="lg" color="red" variant="filled" circle>
            {unreadCount}
          </Badge>
        )}
      </Group>

      {loading ? (
        <Center style={{ flex: 1 }}>
          <Loader size="sm" />
        </Center>
      ) : messages.length === 0 ? (
        <Center style={{ flex: 1 }}>
          <Stack align="center" gap="xs">
            <IconMessageCircle size={48} color={isDark ? '#373A40' : '#E9ECEF'} />
            <Text c="dimmed" size="sm">No messages yet</Text>
          </Stack>
        </Center>
      ) : (
        <ScrollArea style={{ flex: 1 }} type="auto">
          <Stack gap="sm">
            {messages.map((msg) => {
              const isUnread = !msg.is_processed;
              const patientName = msg.patient 
                ? `${msg.patient.first_name} ${msg.patient.last_name}`
                : 'Unknown';
              const hasPatient = !!msg.patient;
              
              return (
                <Box
                  key={msg.id}
                  p="md"
                  onClick={() => handleMessageClick(msg)}
                  sx={(theme) => ({
                    borderRadius: rem(8),
                    backgroundColor: isDark ? '#25262b' : '#f8f9fa',
                    border: isUnread ? `2px solid #228BE6` : 'none',
                    position: 'relative',
                    cursor: hasPatient ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    '&:hover': hasPatient ? {
                      backgroundColor: isDark ? '#2c2e33' : '#e9ecef',
                      transform: 'translateX(4px)',
                    } : {},
                  })}
                >
                  {/* Unread indicator */}
                  {isUnread && (
                    <Box
                      style={{
                        position: 'absolute',
                        top: rem(12),
                        right: rem(12),
                        width: rem(10),
                        height: rem(10),
                        borderRadius: '50%',
                        backgroundColor: '#228BE6',
                      }}
                    />
                  )}

                  {/* Sender info */}
                  <Group gap="xs" mb="xs">
                    <IconUser size={16} color={isDark ? '#909296' : '#868e96'} />
                    <Text size="sm" fw={isUnread ? 600 : 400}>
                      {patientName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatPhoneNumber(msg.from_number)}
                    </Text>
                  </Group>

                  {/* Message text */}
                  <Text 
                    size="sm" 
                    fw={isUnread ? 500 : 400}
                    style={{ 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      marginBottom: rem(8),
                    }}
                  >
                    {msg.message.length > 100 
                      ? `${msg.message.substring(0, 100)}...` 
                      : msg.message
                    }
                  </Text>

                  {/* Timestamp */}
                  <Group gap="xs">
                    <IconClock size={14} color={isDark ? '#909296' : '#868e96'} />
                    <Text size="xs" c="dimmed">
                      {formatTimeAgo(msg.received_at)}
                    </Text>
                  </Group>
                </Box>
              );
            })}
          </Stack>
        </ScrollArea>
      )}
    </Paper>
  );
}

