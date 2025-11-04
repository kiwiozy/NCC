'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Group,
  Text,
  Button,
  Stack,
  Textarea,
  Alert,
  ActionIcon,
  Box,
  Badge,
  Divider,
  Select,
  ScrollArea,
  Grid,
  Paper,
  Center,
  rem,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconCheck,
  IconAlertCircle,
  IconNote,
  IconEdit,
  IconSparkles,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import { formatDateTimeAU } from '../../utils/dateFormatting';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const NOTE_TYPES = [
  { value: 'clinical_notes', label: 'Clinical Notes' },
  { value: 'clinic_dates', label: 'Clinic Dates' },
  { value: 'order_notes', label: 'Order Notes' },
  { value: 'admin_notes', label: 'Admin Notes' },
  { value: 'referral', label: 'Referral' },
  { value: '3d_scan_data', label: '3D Scan Data' },
  { value: 'workshop_note', label: 'Workshop Note' },
  { value: 'other', label: 'Other...' },
];

interface NotesDialogProps {
  opened: boolean;
  onClose: () => void;
  patientId?: string; // Optional: for future patient-specific notes
}

export default function NotesDialog({ opened, onClose, patientId }: NotesDialogProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // New note form state
  const [newTitle, setNewTitle] = useState<string>('clinical_notes');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // OpenAI Dialog state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [currentNoteForAI, setCurrentNoteForAI] = useState('');

  useEffect(() => {
    if (opened) {
      fetchNotes();
      // Reset form and selection when dialog opens
      setSelectedNote(null);
      setNewTitle('clinical_notes');
      setNewContent('');
      setEditingId(null);
    } else {
      // Reset when dialog closes
      setSelectedNote(null);
      setNewTitle('clinical_notes');
      setNewContent('');
      setEditingId(null);
      setError(null);
      setSuccess(null);
    }
  }, [opened, patientId]);

  const getStorageKey = () => {
    // Use patient-specific key if patientId is provided
    if (patientId) {
      return `patient_notes_${patientId}`;
    }
    // Fallback to global notes key
    return 'walkeasy_nexus_notes';
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const storageKey = getStorageKey();
      
      // Migrate from old localStorage key if it exists (only for global notes)
      if (!patientId) {
        const oldNotes = localStorage.getItem('nexus_notes');
        if (oldNotes) {
          localStorage.setItem('walkeasy_nexus_notes', oldNotes);
          localStorage.removeItem('nexus_notes');
        }
      }
      
      // Load from localStorage
      // TODO: In future, load from API using patientId
      const savedNotes = localStorage.getItem(storageKey);
      if (savedNotes) {
        const parsedNotes = JSON.parse(savedNotes);
        setNotes(parsedNotes);
        // Auto-select first note if available
        if (parsedNotes.length > 0 && !selectedNote) {
          setSelectedNote(parsedNotes[0]);
        }
      } else {
        // No notes found, clear state
        setNotes([]);
        setSelectedNote(null);
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!newTitle || !newContent.trim()) {
      setError('Title and content are required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date().toISOString();
      const titleLabel = NOTE_TYPES.find(t => t.value === newTitle)?.label || newTitle;
      
      const storageKey = getStorageKey();
      
      if (editingId) {
        // Update existing note
        const updatedNotes = notes.map((note) =>
          note.id === editingId
            ? { ...note, title: titleLabel, content: newContent, updated_at: now }
            : note
        );
        setNotes(updatedNotes);
        localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
        setSuccess('Note updated successfully!');
        setEditingId(null);
        // Update selected note if it's the one being edited
        if (selectedNote?.id === editingId) {
          const updatedNote = updatedNotes.find(n => n.id === editingId);
          if (updatedNote) setSelectedNote(updatedNote);
        }
      } else {
        // Create new note
        const newNote: Note = {
          id: Math.random().toString(36).substring(7),
          title: titleLabel,
          content: newContent,
          created_at: now,
          updated_at: now,
        };
        const updatedNotes = [newNote, ...notes];
        setNotes(updatedNotes);
        localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
        setSuccess('Note created successfully!');
        // Select the new note
        setSelectedNote(newNote);
      }

      // Clear form
      setNewTitle('clinical_notes');
      setNewContent('');
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const editNote = (note: Note) => {
    const noteType = NOTE_TYPES.find(t => t.label === note.title);
    setNewTitle(noteType?.value || 'clinical_notes');
    setNewContent(note.content);
    setEditingId(note.id);
    setSelectedNote(note);
  };

  const deleteNote = (id: string) => {
    setNoteToDelete(id);
    setDeleteConfirmOpened(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) {
      return;
    }

    setDeleteConfirmOpened(false);
    const id = noteToDelete;
    setNoteToDelete(null);

    try {
      const storageKey = getStorageKey();
      const updatedNotes = notes.filter((note) => note.id !== id);
      setNotes(updatedNotes);
      localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
      setSuccess('Note deleted successfully');
      
      // Clear selection if deleted note was selected
      if (selectedNote?.id === id) {
        setSelectedNote(updatedNotes.length > 0 ? updatedNotes[0] : null);
      }
      
      // If we were editing this note, clear the form
      if (editingId === id) {
        setNewTitle('clinical_notes');
        setNewContent('');
        setEditingId(null);
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note');
    }
  };

  const cancelEdit = () => {
    setNewTitle('clinical_notes');
    setNewContent('');
    setEditingId(null);
  };

  const handleOpenAI = () => {
    if (!newContent.trim()) {
      setError('Please enter note content first');
      return;
    }

    if (newTitle !== 'clinical_notes') {
      setError('OpenAI rewrite is only available for Clinical Notes');
      return;
    }

    setCurrentNoteForAI(newContent);
    setAiResult('');
    setAiPrompt('');
    setAiModalOpen(true);
  };

  const callOpenAI = async (customPrompt?: string) => {
    setAiProcessing(true);
    setError(null);

    try {
      const response = await fetch('https://localhost:8000/api/ai/rewrite-clinical-notes/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: currentNoteForAI,
          custom_prompt: customPrompt || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to process with OpenAI');
      }

      const data = await response.json();
      setAiResult(data.result);
      
    } catch (err: any) {
      setError('Failed to process with OpenAI: ' + err.message);
    } finally {
      setAiProcessing(false);
    }
  };

  const acceptAIResult = () => {
    setNewContent(aiResult);
    setAiModalOpen(false);
    setSuccess('AI-generated content applied to note');
  };

  const requestAIRefinement = () => {
    if (!aiPrompt.trim()) {
      setError('Please enter refinement instructions');
      return;
    }
    callOpenAI(aiPrompt);
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title="Notes"
        size="xl"
      >
        <Grid gutter={0} style={{ height: rem(600) }}>
          {/* Left Column: Notes List */}
          <Grid.Col span={4} style={{ borderRight: `1px solid ${isDark ? '#373A40' : '#dee2e6'}` }}>
            <ScrollArea style={{ height: '100%' }}>
              <Stack gap={0}>
                {loading ? (
                  <Box p="md">
                    <Text c="dimmed" size="sm">Loading notes...</Text>
                  </Box>
                ) : notes.length === 0 ? (
                  <Box p="md">
                    <Text c="dimmed" size="sm">No notes yet. Create your first note!</Text>
                  </Box>
                ) : (
                  notes.map((note) => (
                    <Box
                      key={note.id}
                      p="md"
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedNote?.id === note.id
                          ? (isDark ? '#25262b' : '#f8f9fa')
                          : 'transparent',
                        borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
                      }}
                      onClick={() => {
                        setSelectedNote(note);
                        setEditingId(null);
                        setNewTitle('clinical_notes');
                        setNewContent('');
                      }}
                      onMouseEnter={(e) => {
                        if (selectedNote?.id !== note.id) {
                          e.currentTarget.style.backgroundColor = isDark ? '#1A1B1E' : '#f0f0f0';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedNote?.id !== note.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <Group justify="space-between" align="flex-start" mb="xs">
                        <Box style={{ flex: 1 }}>
                          <Badge variant="light" size="sm" mb="xs">
                            {note.title}
                          </Badge>
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {note.content}
                          </Text>
                          <Text size="xs" c="dimmed" mt="xs">
                            {formatDateTimeAU(note.created_at)}
                          </Text>
                        </Box>
                        <Group gap="xs">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              editNote(note);
                            }}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNote(note.id);
                            }}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Box>
                  ))
                )}
              </Stack>
            </ScrollArea>
          </Grid.Col>

          {/* Right Column: Create/Edit Form and Note View */}
          <Grid.Col span={8}>
            <Stack gap={0} style={{ height: '100%' }}>
              {editingId || !selectedNote ? (
                /* Create/Edit Form */
                <Box p="md" style={{ height: '100%', overflow: 'auto' }}>
                  <Stack gap="md">
                    {error && (
                      <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError(null)}>
                        {error}
                      </Alert>
                    )}

                    {success && (
                      <Alert icon={<IconCheck size={16} />} color="green" onClose={() => setSuccess(null)}>
                        {success}
                      </Alert>
                    )}

                  <Select
                    label="NOTE TYPE"
                    placeholder="Select note type"
                    data={NOTE_TYPES}
                    value={newTitle}
                    onChange={(value) => setNewTitle(value || 'clinical_notes')}
                    size="sm"
                    required
                    searchable
                  />

                  <Textarea
                    label="CONTENT"
                    placeholder="Enter note content..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.currentTarget.value)}
                    autosize
                    minRows={10}
                    maxRows={20}
                    size="sm"
                  />

                    <Group gap="xs">
                      <Button
                        leftSection={editingId ? <IconEdit size={16} /> : <IconPlus size={16} />}
                        onClick={saveNote}
                        loading={saving}
                        size="sm"
                      >
                        {editingId ? 'Update' : 'Create'}
                      </Button>
                      {editingId && (
                        <Button variant="outline" onClick={cancelEdit} size="sm">
                          Cancel
                        </Button>
                      )}
                      {newTitle === 'clinical_notes' && newContent.trim() && (
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={handleOpenAI}
                          title="Rewrite with AI"
                        >
                          <IconSparkles size={18} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Stack>
                </Box>
              ) : (
                /* Selected Note View */
                <Box p="md" style={{ height: '100%', overflow: 'auto' }}>
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                      <Box style={{ flex: 1 }}>
                        <Badge variant="light" size="lg" mb="sm">
                          {selectedNote.title}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          Created: {formatDateTimeAU(selectedNote.created_at)}
                          {selectedNote.updated_at !== selectedNote.created_at && (
                            <> • Updated: {formatDateTimeAU(selectedNote.updated_at)}</>
                          )}
                        </Text>
                      </Box>
                      <Group gap="xs">
                        <Button
                          leftSection={<IconPlus size={16} />}
                          variant="subtle"
                          size="sm"
                          onClick={() => {
                            setSelectedNote(null);
                            setEditingId(null);
                            setNewTitle('clinical_notes');
                            setNewContent('');
                          }}
                        >
                          New Note
                        </Button>
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => editNote(selectedNote)}
                        >
                          <IconEdit size={18} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => deleteNote(selectedNote.id)}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    <Divider />
                    <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {selectedNote.content}
                    </Text>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Modal>

      {/* OpenAI Dialog */}
      <Modal
        opened={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title={<Text fw={600} size="lg">AI Rewrite - Clinical Notes</Text>}
        size="xl"
      >
        <Stack gap="md">
          <Box>
            <Text size="sm" fw={500} mb="xs">Original Note:</Text>
            <Paper p="md" withBorder>
              <Text style={{ whiteSpace: 'pre-wrap', fontSize: rem(12) }}>{currentNoteForAI}</Text>
            </Paper>
          </Box>

          <Divider />

          {aiProcessing ? (
            <Box py="xl">
              <Group justify="center">
                <Text>Processing with OpenAI...</Text>
              </Group>
            </Box>
          ) : aiResult ? (
            <>
              <Box>
                <Text size="sm" fw={500} mb="xs">AI-Generated Result:</Text>
                <Paper p="md" withBorder>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{aiResult}</Text>
                </Paper>
              </Box>

              <Divider label="Request Refinement" labelPosition="center" />

              <Textarea
                label="Refinement Instructions"
                placeholder='e.g., "make it more professional", "add more detail", "make it shorter"'
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={2}
              />

              <Group justify="space-between">
                <Group>
                  <Button
                    leftSection={<IconRefresh size={18} />}
                    onClick={requestAIRefinement}
                    variant="outline"
                    disabled={!aiPrompt.trim()}
                  >
                    Refine with AI
                  </Button>
                </Group>
                <Group>
                  <Button variant="outline" onClick={() => setAiModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    leftSection={<IconCheck size={18} />}
                    onClick={acceptAIResult}
                    color="green"
                  >
                    Accept & Use This
                  </Button>
                </Group>
              </Group>
            </>
          ) : (
            <>
              <Alert icon={<IconSparkles size={16} />} color="blue">
                Click "Generate" to rewrite this note as professional clinical notes using AI.
              </Alert>
              <Group justify="flex-end">
                <Button variant="outline" onClick={() => setAiModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  leftSection={<IconSparkles size={18} />}
                  onClick={() => callOpenAI()}
                  gradient={{ from: 'blue', to: 'cyan' }}
                  variant="gradient"
                >
                  Generate Clinical Notes
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteConfirmOpened}
        onClose={() => {
          setDeleteConfirmOpened(false);
          setNoteToDelete(null);
        }}
        title="Delete Note"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete this note?
          </Text>
          <Text size="sm" c="dimmed">
            This action cannot be undone.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => {
              setDeleteConfirmOpened(false);
              setNoteToDelete(null);
            }}>
              Cancel
            </Button>
            <Button color="red" onClick={confirmDeleteNote}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

