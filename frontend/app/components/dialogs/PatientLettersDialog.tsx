'use client';

import { Modal, Box, Grid, Stack, Button, Text, Group, Badge, ScrollArea, ActionIcon, TextInput, Loader, Menu, rem } from '@mantine/core';
import { IconFileText, IconPlus, IconSearch, IconDots, IconCopy, IconTrash, IconFileTypePdf, IconMail, IconPrinter, IconDownload } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import dynamic from 'next/dynamic';

// Dynamically import LetterEditor to avoid SSR issues
const LetterEditor = dynamic(() => import('../../letters/LetterEditor'), { ssr: false });

// Helper to get CSRF token
const getCsrfToken = async (): Promise<string> => {
  // Try to get from cookie first
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  
  if (cookieValue) {
    return cookieValue;
  }
  
  // Fallback: fetch from backend
  try {
    const response = await fetch('https://localhost:8000/api/auth/csrf-token/', {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      return data.csrfToken || '';
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
  
  return '';
};

interface PatientLettersDialogProps {
  opened: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

interface PatientLetter {
  id: string;
  letter_type: string;
  recipient_name: string;
  subject: string;
  pages: string[];
  preview_text: string;
  created_at: string;
  updated_at: string;
}

export default function PatientLettersDialog({ opened, onClose, patientId, patientName }: PatientLettersDialogProps) {
  const [letters, setLetters] = useState<PatientLetter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<PatientLetter | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // Load letters when dialog opens
  useEffect(() => {
    if (opened && patientId) {
      loadLetters();
    }
  }, [opened, patientId]);
  
  // Auto-save every 10 seconds
  useEffect(() => {
    if (!selectedLetter || !opened) return;
    
    const autoSaveInterval = setInterval(() => {
      handleSave(true); // true = silent save
    }, 10000); // 10 seconds
    
    return () => clearInterval(autoSaveInterval);
  }, [selectedLetter, opened]);
  
  // Auto-focus editor when letter is selected
  useEffect(() => {
    if (!selectedLetter) return;
    
    // Small delay to ensure editor is mounted
    const timer = setTimeout(() => {
      const editorElement = document.querySelector('.we-page-content .ProseMirror') as HTMLElement;
      if (editorElement) {
        editorElement.focus();
        console.log('✅ Editor auto-focused');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [selectedLetter]);
  
  const loadLetters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://localhost:8000/api/letters/?patient_id=${patientId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLetters(Array.isArray(data) ? data : (data.results || []));
      } else {
        console.error('Failed to load letters:', response.status, response.statusText);
        notifications.show({
          title: 'Error',
          message: `Failed to load letters: ${response.status}`,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error loading letters:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load letters',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateLetter = async () => {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/letters/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          patient: patientId,
          letter_type: 'New Letter',
          recipient_name: '',
          subject: '',
          pages: ['<p>Dear [Name],</p><p></p><p>Write your letter here...</p><p></p><p>Sincerely,</p><p>Walk Easy Pedorthics</p>'],
        }),
      });
      
      if (response.ok) {
        const newLetter = await response.json();
        await loadLetters();
        setSelectedLetter(newLetter);
        notifications.show({
          title: 'Success',
          message: 'New letter created',
          color: 'green',
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to create letter:', response.status, errorData);
        notifications.show({
          title: 'Error',
          message: `Failed to create letter: ${errorData.error || response.statusText}`,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error creating letter:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create letter',
        color: 'red',
      });
    }
  };
  
  const handleSave = async (silent = false) => {
    if (!selectedLetter) return;
    
    setSaving(true);
    try {
      // Get current editor content from DOM (like your existing LetterEditor does)
      const editorElements = document.querySelectorAll('.we-page-content .ProseMirror');
      const pages = Array.from(editorElements).map(el => (el as HTMLElement).innerHTML || '');
      
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/letters/${selectedLetter.id}/`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          ...selectedLetter,
          pages,
        }),
      });
      
      if (response.ok) {
        const updated = await response.json();
        setSelectedLetter(updated);
        setLastSaved(new Date());
        await loadLetters();
        
        if (!silent) {
          notifications.show({
            title: 'Success',
            message: 'Letter saved',
            color: 'green',
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to save letter:', response.status, errorData);
        if (!silent) {
          notifications.show({
            title: 'Error',
            message: `Failed to save letter: ${errorData.error || response.statusText}`,
            color: 'red',
          });
        }
      }
    } catch (error) {
      console.error('Error saving letter:', error);
      if (!silent) {
        notifications.show({
          title: 'Error',
          message: 'Failed to save letter',
          color: 'red',
        });
      }
    } finally {
      setSaving(false);
    }
  };
  
  const handlePreviewPDF = async () => {
    if (!selectedLetter) {
      notifications.show({
        title: 'Error',
        message: 'No letter selected to preview',
        color: 'red',
      });
      return;
    }
    
    console.log('🔍 Preview PDF clicked for letter:', selectedLetter.id);
    setLoading(true);
    try {
      // Get current editor content from DOM (TipTap's ProseMirror structure)
      const editorElements = document.querySelectorAll('.we-page-content .ProseMirror');
      console.log('📄 Found editor elements:', editorElements.length);
      let combinedHTML: string;

      if (editorElements.length > 0) {
        const domContent = Array.from(editorElements).map(el => (el as HTMLElement).innerHTML || '');
        combinedHTML = domContent.join('<hr class="page-break">');
        console.log('✅ Using live editor content, pages:', domContent.length);
      } else {
        // Fallback to state if DOM query fails
        combinedHTML = selectedLetter.pages.join('<hr class="page-break">');
        console.log('⚠️ Using saved content, pages:', selectedLetter.pages.length);
        notifications.show({
          title: 'Warning',
          message: 'Could not get live editor content, using last saved version.',
          color: 'orange',
        });
      }

      console.log('🚀 Sending HTML to PDF API, length:', combinedHTML.length);
      const response = await fetch('https://localhost:3000/api/letters/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: combinedHTML }),
      });

      console.log('📡 API Response status:', response.status);
      if (response.ok) {
        const blob = await response.blob();
        console.log('✅ PDF blob received, size:', blob.size);
        const url = URL.createObjectURL(blob);
        console.log('🎉 Setting PDF URL for modal preview');
        setPdfUrl(url);
        setPdfPreviewOpen(true);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ PDF generation failed:', errorData);
        notifications.show({
          title: 'Error',
          message: `PDF generation failed: ${errorData.details || errorData.error}`,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      notifications.show({
        title: 'Error',
        message: 'Error generating PDF. Check console for details.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (letterId: string) => {
    modals.openConfirmModal({
      title: 'Delete Letter',
      children: <Text>Are you sure you want to delete this letter? This action cannot be undone.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const csrfToken = await getCsrfToken();
          const response = await fetch(`https://localhost:8000/api/letters/${letterId}/`, {
            method: 'DELETE',
            headers: {
              'X-CSRFToken': csrfToken,
            },
            credentials: 'include',
          });
          
          if (response.ok) {
            await loadLetters();
            if (selectedLetter?.id === letterId) {
              setSelectedLetter(null);
            }
            notifications.show({
              title: 'Success',
              message: 'Letter deleted',
              color: 'green',
            });
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Failed to delete letter:', response.status, errorData);
            notifications.show({
              title: 'Error',
              message: `Failed to delete letter: ${errorData.error || response.statusText}`,
              color: 'red',
            });
          }
        } catch (error) {
          console.error('Error deleting letter:', error);
          notifications.show({
            title: 'Error',
            message: 'Failed to delete letter',
            color: 'red',
          });
        }
      },
    });
  };
  
  const handleDuplicate = async (letterId: string) => {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/letters/${letterId}/duplicate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        await loadLetters();
        notifications.show({
          title: 'Success',
          message: 'Letter duplicated',
          color: 'green',
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to duplicate letter:', response.status, errorData);
        notifications.show({
          title: 'Error',
          message: `Failed to duplicate letter: ${errorData.error || response.statusText}`,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error duplicating letter:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to duplicate letter',
        color: 'red',
      });
    }
  };
  
  const filteredLetters = letters.filter(letter =>
    letter.letter_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    letter.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    letter.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <>
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconFileText size={24} />
          <Text fw={600}>Letters - {patientName}</Text>
          <Badge color="blue">{letters.length} {letters.length === 1 ? 'letter' : 'letters'}</Badge>
        </Group>
      }
      size="95vw"
      styles={{
        body: { height: 'calc(90vh - 60px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
        content: { height: '90vh' },
      }}
    >
      {/* Main Container - Flex Row */}
      <Box style={{ 
        flex: 1, 
        minHeight: 0, 
        display: 'flex', 
        flexDirection: 'row',
        gap: '16px',
      }}>
        {/* Left Panel (20%): Letter List */}
        <Box style={{ 
          width: '20%', 
          minWidth: '250px',
          height: '100%',
          display: 'flex', 
          flexDirection: 'column',
        }}>
          <Stack gap="md" style={{ height: '100%' }}>
            {/* New Letter Button */}
            <Button
              fullWidth
              leftSection={<IconPlus size={18} />}
              onClick={handleCreateLetter}
              color="blue"
            >
              New Letter
            </Button>
            
            {/* Search */}
            <TextInput
              placeholder="Search letters..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
            />
            
            {/* Letter List */}
            <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto">
                {loading ? (
                  <Stack align="center" justify="center" style={{ height: 200 }}>
                    <Loader size="md" />
                    <Text c="dimmed" size="sm">Loading letters...</Text>
                  </Stack>
                ) : filteredLetters.length === 0 ? (
                  <Stack align="center" justify="center" style={{ height: 200 }}>
                    <IconFileText size={48} style={{ opacity: 0.2 }} />
                    <Text c="dimmed" size="sm">No letters yet</Text>
                    <Text c="dimmed" size="xs">Click "New Letter" to create one</Text>
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    {filteredLetters.map((letter) => (
                      <Box
                        key={letter.id}
                        p="sm"
                        style={{
                          border: `1px solid ${selectedLetter?.id === letter.id ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-default-border)'}`,
                          borderRadius: 'var(--mantine-radius-md)',
                          cursor: 'pointer',
                          backgroundColor: selectedLetter?.id === letter.id ? 'var(--mantine-color-blue-light)' : 'transparent',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => setSelectedLetter(letter)}
                      >
                        <Group justify="space-between" mb="xs">
                          <Text fw={600} size="sm" style={{ flex: 1 }} truncate>
                            {letter.letter_type}
                          </Text>
                          <Menu shadow="md" width={200}>
                            <Menu.Target>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicate(letter.id);
                                }}
                              >
                                Duplicate
                              </Menu.Item>
                              <Menu.Item
                                color="red"
                                leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(letter.id);
                                }}
                              >
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                        {letter.recipient_name && (
                          <Text size="xs" c="dimmed" mb={4}>
                            To: {letter.recipient_name}
                          </Text>
                        )}
                        <Text size="xs" c="dimmed" mb={4}>
                          {new Date(letter.updated_at).toLocaleDateString()} {new Date(letter.updated_at).toLocaleTimeString()}
                        </Text>
                        {letter.preview_text && (
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {letter.preview_text}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </ScrollArea>
            </Stack>
          </Box>
          
          {/* Right Panel (80%): Letter Editor */}
          <Box style={{ 
            flex: 1,
            height: '100%',
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {!selectedLetter ? (
              <Stack align="center" justify="center" style={{ height: '100%' }}>
                <IconFileText size={64} style={{ opacity: 0.2 }} />
                <Text c="dimmed" size="lg">Select a letter to view</Text>
                <Text c="dimmed" size="sm">Click any letter from the list on the left</Text>
              </Stack>
            ) : (
              <Box style={{ 
                height: '100%',
                overflow: 'auto',
                display: 'flex', 
                flexDirection: 'column',
              }}>
                {/* Metadata + Toolbar Section - Scrolls away together */}
                <Box p="md" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', flexShrink: 0 }}>
                  <Grid>
                    <Grid.Col span={6}>
                      <TextInput
                        label="Letter Type"
                        placeholder="e.g., Support Letter, Follow-up Letter"
                        value={selectedLetter.letter_type}
                        onChange={(e) => setSelectedLetter({ ...selectedLetter, letter_type: e.currentTarget.value })}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput
                        label="Recipient"
                        placeholder="e.g., Dr. John Smith"
                        value={selectedLetter.recipient_name}
                        onChange={(e) => setSelectedLetter({ ...selectedLetter, recipient_name: e.currentTarget.value })}
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <TextInput
                        label="Subject"
                        placeholder="Letter subject (optional)"
                        value={selectedLetter.subject}
                        onChange={(e) => setSelectedLetter({ ...selectedLetter, subject: e.currentTarget.value })}
                      />
                    </Grid.Col>
                  </Grid>
                  
                  {/* Action Buttons - Inside metadata box so they scroll away together */}
                  <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                    <Group gap="xs">
                      {saving && <Loader size="xs" />}
                      {lastSaved && !saving && (
                        <Text size="xs" c="dimmed">
                          Saved at {lastSaved.toLocaleTimeString()}
                        </Text>
                      )}
                    </Group>
                    <Group gap="xs">
                      <Button size="xs" variant="light" onClick={() => handleSave(false)} loading={saving}>
                        Save
                      </Button>
                      <Button size="xs" variant="light" leftSection={<IconFileTypePdf size={14} />} onClick={handlePreviewPDF} loading={loading}>
                        Preview PDF
                      </Button>
                      <Button size="xs" variant="light" leftSection={<IconDownload size={14} />}>
                        Download
                      </Button>
                      <Button size="xs" variant="light" leftSection={<IconMail size={14} />}>
                        Email
                      </Button>
                      <Button size="xs" variant="light" leftSection={<IconPrinter size={14} />}>
                        Print
                      </Button>
                    </Group>
                  </Group>
                </Box>
                
                {/* Letter Editor - Scrolls normally */}
                <Box style={{ flex: 1, minHeight: 0 }}>
                  <div
                    style={{
                      colorScheme: 'light',
                      color: '#000000',
                      '--mantine-color-text': '#000000',
                    } as React.CSSProperties}
                    data-mantine-color-scheme="light"
                    data-force-light-mode="true"
                  >
                    <LetterEditor initialPages={selectedLetter.pages} isDialog={true} />
                  </div>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
    </Modal>
    
    {/* PDF Preview Modal */}
    <Modal
      opened={pdfPreviewOpen}
      onClose={() => {
        setPdfPreviewOpen(false);
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
          setPdfUrl(null);
        }
      }}
      title="PDF Preview"
      size="90vw"
      styles={{
        body: { height: '85vh', overflow: 'hidden' },
        content: { height: '90vh' },
      }}
    >
      {pdfUrl && (
        <iframe
          src={pdfUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title="PDF Preview"
        />
      )}
    </Modal>
    </>
  );
}

