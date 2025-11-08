'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  Textarea,
  ScrollArea,
  Box,
  Select,
  Badge,
  ActionIcon,
  Loader,
  Center,
  rem,
  FileButton,
  Image,
} from '@mantine/core';
import {
  IconSend,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconClock,
  IconRefresh,
  IconPhoto,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useMantineColorScheme } from '@mantine/core';

interface SMSMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  message: string;
  phone_number?: string;
  phone_number_label?: string | null;
  status?: 'pending' | 'sent' | 'delivered' | 'failed';
  timestamp: string;
  created_at?: string;
  sent_at?: string;
  received_at?: string;
  error_message?: string;
  is_processed?: boolean; // For inbound messages: false = unread, true = read
  // MMS support
  has_media?: boolean;
  media_url?: string;
  media_type?: string;
}

interface PhoneNumber {
  value: string;
  label: string;
  is_default: boolean;
  type: 'mobile' | 'phone' | 'emergency';
}

interface SMSTemplate {
  id: string;
  name: string;
  description: string;
  message_template: string;
  is_active: boolean;
}

interface SMSDialogProps {
  opened: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

// Calculate SMS segments (160 chars = 1 SMS, then 153 per segment)
function calculateSMSSegments(message: string): number {
  if (!message) return 0;
  if (message.length <= 160) return 1;
  return Math.ceil((message.length - 160) / 153) + 1;
}

// Format phone number for display
function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove + and spaces, then format
  const cleaned = phone.replace(/[+\s]/g, '');
  if (cleaned.startsWith('61') && cleaned.length === 11) {
    // Australian format: 61 4XX XXX XXX
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  return phone;
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

  // Format as date
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}


// Helper to get CSRF token from cookie
function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
}

export default function SMSDialog({ opened, onClose, patientId, patientName }: SMSDialogProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [availablePhones, setAvailablePhones] = useState<PhoneNumber[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<PhoneNumber | null>(null);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [defaultPhone, setDefaultPhone] = useState<PhoneNumber | null>(null);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<string | null>(null);
  const [checkingForNew, setCheckingForNew] = useState(false);
  const [markAsReadConfirmOpened, setMarkAsReadConfirmOpened] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  // MMS state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load conversation and phone numbers when dialog opens
  useEffect(() => {
    if (opened && patientId) {
      loadConversation();
      loadPhoneNumbers();
      loadTemplates();
      // DON'T automatically mark as read - wait for user to close dialog
    } else {
      // Reset when dialog closes
      setMessages([]);
      setMessageText('');
      setSelectedTemplate(null);
      setHasUnreadMessages(false);
    }
  }, [opened, patientId]);

  // Mark all unread SMS messages as read
  const markMessagesAsRead = async () => {
    try {
      // Get CSRF token
      const csrfToken = await getCsrfToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetch(
        `https://localhost:8000/api/sms/patient/${patientId}/mark-read/`,
        {
          method: 'POST',
          credentials: 'include',
          headers,
        }
      );
      
      if (response.ok) {
        // Dispatch event to update global unread count
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('smsMarkedRead')); // Changed from 'smsRead'
        }
        // Update local state
        setHasUnreadMessages(false);
      }
    } catch (error) {
      // Silently fail - don't interrupt user experience
      console.error('Error marking messages as read:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const checkForNewMessages = useCallback(async () => {
    if (!patientId) return;
    
    setCheckingForNew(true);
    try {
      const response = await fetch(
        `https://localhost:8000/api/sms/patient/${patientId}/conversation/?t=${Date.now()}`,
        {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const allMessages = data.messages || [];
        
        // If no messages exist yet, load all (fresh start)
        if (!lastMessageTimestamp) {
          if (allMessages.length > 0) {
            setMessages(allMessages);
            const latestMsg = allMessages[allMessages.length - 1];
            setLastMessageTimestamp(latestMsg.timestamp || latestMsg.received_at || latestMsg.sent_at || latestMsg.created_at || null);
            scrollToBottom();
          }
          return;
        }
        
        // Filter for messages newer than last known timestamp (incremental update)
        const newMessages = allMessages.filter((msg: SMSMessage) => {
          const msgTime = msg.timestamp || msg.received_at || msg.sent_at || msg.created_at;
          return msgTime && new Date(msgTime) > new Date(lastMessageTimestamp);
        });
        
        if (newMessages.length > 0) {
          // Append new messages to existing ones
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const uniqueNew = newMessages.filter((m: SMSMessage) => !existingIds.has(m.id));
            return [...prev, ...uniqueNew].sort((a, b) => {
              const timeA = a.timestamp || '';
              const timeB = b.timestamp || '';
              return timeA.localeCompare(timeB);
            });
          });
          
          // Update last message timestamp
          const latestMsg = newMessages[newMessages.length - 1];
          setLastMessageTimestamp(latestMsg.timestamp || latestMsg.received_at || latestMsg.sent_at || latestMsg.created_at || null);
          
          // Scroll to bottom to show new messages
          scrollToBottom();
        }
      }
    } catch (error) {
      // Silently fail - don't show error for background polling
      console.error('Error checking for new messages:', error);
    } finally {
      setCheckingForNew(false);
    }
  }, [patientId, lastMessageTimestamp]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Poll for new messages every 10 seconds when dialog is open
  useEffect(() => {
    if (!opened || !patientId || !lastMessageTimestamp) return;

    const interval = setInterval(() => {
      checkForNewMessages();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [opened, patientId, lastMessageTimestamp, checkForNewMessages]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://localhost:8000/api/sms/patient/${patientId}/conversation/?t=${Date.now()}`,
        {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const newMessages = data.messages || [];
        setMessages(newMessages);
        setDefaultPhone(data.default_phone || null);
        // Set selected phone to default if available
        if (data.default_phone && !selectedPhone) {
          setSelectedPhone(data.default_phone);
        }
        // Update last message timestamp for polling
        if (newMessages.length > 0) {
          const lastMsg = newMessages[newMessages.length - 1];
          setLastMessageTimestamp(lastMsg.timestamp || null);
        }
        
        // Check if there are any unread inbound messages
        const hasUnread = newMessages.some((msg: SMSMessage) => 
          msg.direction === 'inbound' && msg.is_processed === false
        );
        setHasUnreadMessages(hasUnread);
      } else {
        notifications.show({
          title: 'Error',
          message: 'Failed to load conversation',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load conversation',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPhoneNumbers = async () => {
    try {
      const response = await fetch(
        `https://localhost:8000/api/sms/patient/${patientId}/phones/?t=${Date.now()}`,
        {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setAvailablePhones(data.available_phones || []);
      }
    } catch (error) {
      console.error('Error loading phone numbers:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/sms/templates/?is_active=true');
      if (response.ok) {
        const data = await response.json();
        const templateList = Array.isArray(data) ? data : (data.results || []);
        setTemplates(templateList.filter((t: SMSTemplate) => t.is_active));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleTemplateChange = (templateId: string | null) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        // Replace template variables with patient name
        let message = template.message_template;
        message = message.replace(/{patient_name}/g, patientName);
        setMessageText(message);
      }
    }
  };

  // Get CSRF token from cookies or API
  const getCsrfToken = async (): Promise<string | null> => {
    // Try to get from cookies first
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        return value;
      }
    }
    
    // If not in cookies, fetch from API
    try {
      const response = await fetch('https://localhost:8000/api/auth/csrf-token/', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data.csrfToken || null;
      }
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
    }
    return null;
  };

  // MMS image handling
  const handleImageSelect = async (file: File | null) => {
    if (!file) return;
    
    setSelectedImage(file);
    
    // Check if HEIC and convert for preview
    const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' || 
                   file.name.toLowerCase().endsWith('.heic') || 
                   file.name.toLowerCase().endsWith('.heif');
    
    if (isHEIC) {
      try {
        // Dynamic import to avoid bundle bloat
        const heic2any = (await import('heic2any')).default;
        
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8,
        });
        
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result as string);
        reader.readAsDataURL(convertedBlob as Blob);
      } catch (error) {
        console.error('HEIC conversion failed:', error);
        // Show generic preview
        setImagePreview('/icons/image-placeholder.png');
      }
    } else {
      // Normal image preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      handleImageSelect(files[0]);
    }
  };
  
  const handleSendMMS = async () => {
    if (!selectedImage || !selectedPhone) return;
    
    setUploading(true);
    
    try {
      // 1. Upload image to get S3 URL
      const formData = new FormData();
      formData.append('file', selectedImage);
      
      // Get CSRF token
      const csrfToken = getCookie('csrftoken');
      
      const uploadResponse = await fetch('https://localhost:8000/api/sms/upload-media/', {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? {
          'X-CSRFToken': csrfToken,
        } : {},
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Image upload failed');
      }
      
      const uploadResult = await uploadResponse.json();
      
      // 2. Send MMS with media URL
      setSending(true);
      const response = await fetch(`https://localhost:8000/api/sms/patient/${patientId}/send/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        body: JSON.stringify({
          phone_number: selectedPhone.value,
          phone_label: selectedPhone.label,
          message: messageText.trim() || '',  // Allow empty message for MMS
          media_url: uploadResult.media_url,
        }),
      });
      
      if (!response.ok) {
        throw new Error('MMS send failed');
      }
      
      // Clear form
      setMessageText('');
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedTemplate(null);
      
      // Reload conversation
      await loadConversation();
      
      notifications.show({
        title: 'MMS Sent',
        message: 'Your image message was sent successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('MMS send error:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to send MMS',
        color: 'red',
      });
    } finally {
      setUploading(false);
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a message',
        color: 'red',
      });
      return;
    }

    if (!selectedPhone) {
      notifications.show({
        title: 'Error',
        message: 'Please select a phone number',
        color: 'red',
      });
      return;
    }

    setSending(true);
    try {
      // Get CSRF token
      const csrfToken = await getCsrfToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetch(
        `https://localhost:8000/api/sms/patient/${patientId}/send/`,
        {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({
            phone_number: selectedPhone.value,
            phone_label: selectedPhone.label,
            message: messageText.trim(),
            template_id: selectedTemplate || null,
          }),
        }
      );

      if (response.ok) {
        const sentMessage = await response.json();
        // Add to messages list optimistically
        const newMessage: SMSMessage = {
          id: sentMessage.id,
          direction: 'outbound',
          message: sentMessage.message,
          phone_number: sentMessage.phone_number,
          phone_number_label: sentMessage.phone_number_label,
          status: sentMessage.status || 'sent',
          timestamp: sentMessage.sent_at || sentMessage.created_at,
        };
        setMessages(prev => [...prev, newMessage]);
        setMessageText('');
        setSelectedTemplate(null);
        notifications.show({
          title: 'Success',
          message: 'SMS sent successfully',
          color: 'green',
        });
        // Reload conversation to get updated status
        setTimeout(() => loadConversation(), 1000);
      } else {
        const error = await response.json();
        notifications.show({
          title: 'Error',
          message: error.error || 'Failed to send SMS',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to send SMS',
        color: 'red',
      });
    } finally {
      setSending(false);
    }
  };

  const smsSegments = calculateSMSSegments(messageText);
  const charCount = messageText.length;

  // Handle dialog close - check for unread messages
  const handleClose = () => {
    if (hasUnreadMessages) {
      // Show confirmation dialog
      setMarkAsReadConfirmOpened(true);
    } else {
      // No unread messages, close directly
      onClose();
    }
  };

  // Handle mark as read confirmation
  const handleMarkAsReadYes = async () => {
    setMarkAsReadConfirmOpened(false);
    await markMessagesAsRead();
    onClose();
  };

  const handleMarkAsReadNo = () => {
    setMarkAsReadConfirmOpened(false);
    onClose();
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title={
        <Group gap="sm" justify="space-between" style={{ width: '100%' }}>
          <Group gap="sm">
            <Text fw={600}>SMS - {patientName}</Text>
            {selectedPhone && (
              <Badge size="sm" variant="light">
                {formatPhoneNumber(selectedPhone.value)}
              </Badge>
            )}
          </Group>
          <ActionIcon
            variant="subtle"
            onClick={() => {
              if (lastMessageTimestamp) {
                checkForNewMessages();
              } else {
                loadConversation();
              }
            }}
            loading={loading || checkingForNew}
            title="Refresh messages"
          >
            <IconRefresh size={18} />
          </ActionIcon>
        </Group>
      }
      size="lg"
      styles={{
        body: { height: 'calc(90vh - 60px)', display: 'flex', flexDirection: 'column', padding: 0 },
        content: { height: '90vh' },
      }}
    >
      <Stack gap={0} style={{ height: '100%' }}>
        {/* Phone Number Selector */}
        <Box p="md" style={{ borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}` }}>
          <Select
            label="Send to"
            placeholder="Select phone number"
            data={availablePhones.map(phone => ({
              value: phone.value,
              label: `${phone.label}${phone.is_default ? ' (Default)' : ''} - ${formatPhoneNumber(phone.value)}`,
            }))}
            value={selectedPhone?.value || null}
            onChange={(value) => {
              const phone = availablePhones.find(p => p.value === value);
              setSelectedPhone(phone || null);
            }}
            required
            disabled={availablePhones.length === 0}
          />
          {availablePhones.length === 0 && (
            <Text size="sm" c="red" mt="xs">
              No phone numbers available. Please add a phone number in patient communication details.
            </Text>
          )}
        </Box>

        {/* Message Thread */}
        <ScrollArea
          ref={scrollAreaRef}
          style={{ flex: 1, minHeight: 0 }}
          type="auto"
        >
          <Box p="md">
            {loading ? (
              <Center py="xl">
                <Loader size="sm" />
              </Center>
            ) : messages.length === 0 ? (
              <Center py="xl">
                <Stack align="center" gap="xs">
                  <Text c="dimmed" size="sm">No messages yet</Text>
                  <Text c="dimmed" size="xs">Start a conversation by sending a message</Text>
                </Stack>
              </Center>
            ) : (
              <Stack gap="xs">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isDark={isDark}
                    defaultPhoneLabel={defaultPhone?.label}
                  />
                ))}
                <div ref={messagesEndRef} />
              </Stack>
            )}
          </Box>
        </ScrollArea>

        {/* Send Form */}
        <Box
          p="md"
          style={{
            borderTop: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
            backgroundColor: isDark ? '#25262b' : '#f8f9fa',
          }}
        >
          <Stack gap="sm">
            {/* Template Selector */}
            {templates.length > 0 && (
              <Select
                placeholder="Choose a template (optional)"
                data={templates.map(t => ({ value: t.id, label: t.name }))}
                value={selectedTemplate}
                onChange={handleTemplateChange}
                clearable
              />
            )}

            {/* Message Input */}
            <Textarea
              placeholder="Your message here..."
              value={messageText}
              onChange={(e) => setMessageText(e.currentTarget.value)}
              minRows={3}
              maxRows={6}
              disabled={!selectedPhone || sending}
            />

            {/* Image Preview (MMS) */}
            {imagePreview && (
              <Box pos="relative" style={{ width: 'fit-content' }}>
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={150}
                  height={150}
                  fit="cover"
                  radius="md"
                />
                <ActionIcon
                  pos="absolute"
                  top={5}
                  right={5}
                  size="sm"
                  color="red"
                  variant="filled"
                  onClick={handleRemoveImage}
                  style={{ cursor: 'pointer' }}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Box>
            )}

            {/* Character Counter and Send Button */}
            <Group justify="space-between" align="center">
              <Group gap="xs">
                {!selectedImage && (
                  <Text size="xs" c="dimmed">
                    {charCount} characters ({smsSegments} {smsSegments === 1 ? 'SMS' : 'SMS'})
                  </Text>
                )}
                {selectedImage && (
                  <Text size="xs" c="dimmed">
                    Image attached
                  </Text>
                )}
              </Group>
              <Group gap="xs">
                {/* Image attach button */}
                <FileButton
                  accept="image/png,image/jpeg,image/gif,image/heic,image/heif"
                  onChange={handleImageSelect}
                  disabled={!selectedPhone || sending || uploading}
                >
                  {(props) => (
                    <ActionIcon {...props} size="lg" variant="light" color="grape">
                      <IconPhoto size={20} />
                    </ActionIcon>
                  )}
                </FileButton>
                
                {/* Send button */}
                <Button
                  leftSection={selectedImage ? <IconPhoto size={16} /> : <IconSend size={16} />}
                  onClick={selectedImage ? handleSendMMS : handleSend}
                  disabled={(!messageText.trim() && !selectedImage) || !selectedPhone || sending || uploading}
                  loading={sending || uploading}
                  color={selectedImage ? 'grape' : 'blue'}
                >
                  {selectedImage ? 'Send MMS' : 'Send SMS'}
                </Button>
              </Group>
            </Group>
          </Stack>
        </Box>
      </Stack>
      
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <Box
          pos="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(94, 53, 177, 0.1)"
          style={{
            border: '3px dashed var(--mantine-color-grape-5)',
            borderRadius: '8px',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <Center h="100%">
            <Stack align="center" gap="xs">
              <IconPhoto size={48} style={{ color: 'var(--mantine-color-grape-6)' }} />
              <Text size="lg" fw={500} c="grape">
                Drop image here
              </Text>
            </Stack>
          </Center>
        </Box>
      )}
    </Modal>
    
    {/* Mark as Read Confirmation Modal */}
    <Modal
      opened={markAsReadConfirmOpened}
      onClose={handleMarkAsReadNo}
      title="Mark messages as read?"
      size="sm"
      centered
    >
      <Stack gap="md">
        <Text size="sm">
          You have unread messages in this conversation. Would you like to mark them as read?
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={handleMarkAsReadNo}>
            No
          </Button>
          <Button color="blue" onClick={handleMarkAsReadYes}>
            Yes, Mark as Read
          </Button>
        </Group>
      </Stack>
    </Modal>
    </>
  );
}

// Message Bubble Component
function MessageBubble({
  message,
  isDark,
  defaultPhoneLabel,
}: {
  message: SMSMessage;
  isDark: boolean;
  defaultPhoneLabel?: string | null;
}) {
  const isOutbound = message.direction === 'outbound';
  const isUnread = !isOutbound && message.is_processed === false; // Unread inbound message
  
  const showPhoneLabel =
    isOutbound &&
    message.phone_number_label &&
    message.phone_number_label !== defaultPhoneLabel &&
    message.phone_number_label !== 'Default Mobile';

  // Status icon
  const getStatusIcon = () => {
    if (!isOutbound) return null;
    switch (message.status) {
      case 'delivered':
        return <IconCheck size={14} style={{ color: '#28a745' }} />;
      case 'failed':
        return <IconAlertCircle size={14} style={{ color: '#dc3545' }} />;
      case 'pending':
        return <IconClock size={14} style={{ color: '#ffc107' }} />;
      default:
        return null;
    }
  };

  return (
    <Box
      style={{
        display: 'flex',
        justifyContent: isOutbound ? 'flex-end' : 'flex-start',
        marginBottom: rem(8),
        alignItems: 'center',
        gap: rem(8),
      }}
    >
      {/* Unread indicator (blue dot) - only for inbound messages */}
      {isUnread && (
        <Box
          style={{
            width: rem(8),
            height: rem(8),
            borderRadius: '50%',
            backgroundColor: '#228BE6',
            flexShrink: 0,
          }}
        />
      )}
      
      <Box
        style={{
          maxWidth: '75%',
          padding: `${rem(10)} ${rem(14)}`,
          borderRadius: rem(18),
          backgroundColor: isOutbound
            ? isDark
              ? '#228BE6'
              : '#228BE6'
            : isDark
            ? '#373A40'
            : '#E9ECEF',
          color: isOutbound ? '#FFFFFF' : isDark ? '#C1C2C5' : '#495057',
          fontWeight: isUnread ? 600 : 400, // Bold text for unread messages
          boxShadow: isUnread ? `0 0 0 2px ${isDark ? '#228BE6' : '#228BE6'}` : 'none', // Subtle border for unread
        }}
      >
        {/* Phone Label (if different from default) */}
        {showPhoneLabel && (
          <Text size="xs" style={{ opacity: 0.8, marginBottom: rem(4) }}>
            Sent to: {message.phone_number_label}
          </Text>
        )}

        {/* Message Text */}
        {message.message && (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.message}
          </Text>
        )}

        {/* MMS Image Thumbnail */}
        {message.has_media && message.media_url && (
          <Box mt={message.message ? "xs" : 0}>
            <Image
              src={message.media_url}
              alt="MMS"
              width={100}
              height={100}
              fit="cover"
              radius="md"
              style={{ cursor: 'pointer' }}
            />
          </Box>
        )}

        {/* Timestamp and Status */}
        <Group gap={4} mt={4} style={{ justifyContent: isOutbound ? 'flex-end' : 'flex-start' }}>
          <Text size="xs" style={{ opacity: 0.7 }}>
            {formatMessageTime(message.timestamp)}
          </Text>
          {getStatusIcon()}
        </Group>

        {/* Error Message (if failed) */}
        {message.status === 'failed' && message.error_message && (
          <Text size="xs" style={{ color: '#dc3545', marginTop: rem(4) }}>
            {message.error_message}
          </Text>
        )}
      </Box>
    </Box>
  );
}

