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
  patient?: string;
  patient_name?: string;
  note_type: string;
  note_type_label?: string;
  content: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
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
    setError(null);
    try {
      if (patientId) {
        // Load from API for patient-specific notes
        const response = await fetch(`https://localhost:8000/api/notes/?patient_id=${patientId}&t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          const notesList = data.results || data;
          setNotes(notesList);
          // Auto-select first note if available
          if (notesList.length > 0 && !selectedNote) {
            setSelectedNote(notesList[0]);
          } else if (notesList.length === 0) {
            setSelectedNote(null);
          }
        } else {
          throw new Error('Failed to load notes from server');
        }
      } else {
        // Fallback to localStorage for global notes (non-patient specific)
        const storageKey = getStorageKey();
        const savedNotes = localStorage.getItem(storageKey);
        if (savedNotes) {
          const parsedNotes = JSON.parse(savedNotes);
          // Map localStorage format to API format
          const mappedNotes = parsedNotes.map((note: any) => ({
            id: note.id,
            note_type: note.title || 'clinical_notes',
            content: note.content,
            created_at: note.created_at,
            updated_at: note.updated_at || note.created_at,
          }));
          setNotes(mappedNotes);
          if (mappedNotes.length > 0 && !selectedNote) {
            setSelectedNote(mappedNotes[0]);
          } else {
            setSelectedNote(null);
          }
        } else {
          setNotes([]);
          setSelectedNote(null);
        }
      }
    } catch (err: any) {
      console.error('Error loading notes:', err);
      setError('Failed to load notes: ' + (err.message || 'Unknown error'));
      // Fallback to localStorage if API fails
      if (patientId) {
        try {
          const storageKey = getStorageKey();
          const savedNotes = localStorage.getItem(storageKey);
          if (savedNotes) {
            const parsedNotes = JSON.parse(savedNotes);
            setNotes(parsedNotes);
          }
        } catch (fallbackErr) {
          console.error('Fallback also failed:', fallbackErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!newTitle || !newContent.trim()) {
      setError('Note type and content are required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (patientId) {
        // Use API for patient-specific notes
        if (editingId) {
          // Update existing note via API
          const response = await fetch(`https://localhost:8000/api/notes/${editingId}/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              note_type: newTitle,
              content: newContent,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || errorData.message || 'Failed to update note');
          }

          const updatedNote = await response.json();
          const updatedNotes = notes.map((note) =>
            note.id === editingId ? updatedNote : note
          );
          setNotes(updatedNotes);
          window.dispatchEvent(new Event('notesUpdated'));
          setSuccess('Note updated successfully!');
          setEditingId(null);
          if (selectedNote?.id === editingId) {
            setSelectedNote(updatedNote);
          }
        } else {
          // Create new note via API
          const response = await fetch('https://localhost:8000/api/notes/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              patient: patientId,
              note_type: newTitle,
              content: newContent,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || errorData.message || 'Failed to create note');
          }

          const newNote = await response.json();
          const updatedNotes = [newNote, ...notes];
          setNotes(updatedNotes);
          window.dispatchEvent(new Event('notesUpdated'));
          setSuccess('Note created successfully!');
          setSelectedNote(newNote);
        }
      } else {
        // Fallback to localStorage for non-patient notes
        const now = new Date().toISOString();
        const storageKey = getStorageKey();
        const titleLabel = NOTE_TYPES.find(t => t.value === newTitle)?.label || newTitle;
        
        if (editingId) {
          const updatedNotes = notes.map((note: any) =>
            note.id === editingId
              ? { ...note, note_type: newTitle, title: titleLabel, content: newContent, updated_at: now }
              : note
          );
          setNotes(updatedNotes);
          localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
          window.dispatchEvent(new Event('notesUpdated'));
          setSuccess('Note updated successfully (saved locally)!');
          setEditingId(null);
          if (selectedNote?.id === editingId) {
            const updatedNote = updatedNotes.find((n: Note) => n.id === editingId);
            if (updatedNote) setSelectedNote(updatedNote);
          }
        } else {
          const newNote: Note = {
            id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            note_type: newTitle,
            title: titleLabel,
            content: newContent,
            created_at: now,
            updated_at: now,
          };
          const updatedNotes = [newNote, ...notes];
          setNotes(updatedNotes);
          localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
          window.dispatchEvent(new Event('notesUpdated'));
          setSuccess('Note created successfully (saved locally)!');
          setSelectedNote(newNote);
        }
      }

      // Clear form
      setNewTitle('clinical_notes');
      setNewContent('');
      setEditingId(null);
    } catch (err: any) {
      console.error('Error saving note:', err);
      setError(err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const editNote = (note: Note) => {
    // Handle both old format (title) and new format (note_type)
    const noteTypeValue = note.note_type || note.title || 'clinical_notes';
    const noteType = NOTE_TYPES.find(t => t.value === noteTypeValue || t.label === noteTypeValue || t.label === note.title);
    setNewTitle(noteType?.value || noteTypeValue);
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
      if (patientId) {
        // Delete via API
        const response = await fetch(`https://localhost:8000/api/notes/${id}/`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete note from server');
        }

        const updatedNotes = notes.filter((note) => note.id !== id);
        setNotes(updatedNotes);
        window.dispatchEvent(new Event('notesUpdated'));
        setSuccess('Note deleted successfully');
      } else {
        // Fallback to localStorage
        const storageKey = getStorageKey();
        const updatedNotes = notes.filter((note) => note.id !== id);
        setNotes(updatedNotes);
        localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
        window.dispatchEvent(new Event('notesUpdated'));
        setSuccess('Note deleted successfully');
      }
      
      // Clear selection if deleted note was selected
      if (selectedNote?.id === id) {
        const updatedNotes = notes.filter((note) => note.id !== id);
        setSelectedNote(updatedNotes.length > 0 ? updatedNotes[0] : null);
      }
      
      // If we were editing this note, clear the form
      if (editingId === id) {
        setNewTitle('clinical_notes');
        setNewContent('');
        setEditingId(null);
      }
    } catch (err: any) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note: ' + (err.message || 'Unknown error'));
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
                            {note.note_type_label || NOTE_TYPES.find(t => t.value === note.note_type)?.label || note.title || 'Clinical Notes'}
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
                    minRows={18}
                    maxRows={30}
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
                        <Button
                          leftSection={<IconSparkles size={18} />}
                          onClick={handleOpenAI}
                          variant="gradient"
                          gradient={{ from: 'blue', to: 'cyan' }}
                          size="sm"
                        >
                          Rewrite with AI
                        </Button>
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
                        <Text size="sm" c="dimmed" mb={4}>NOTE TYPE</Text>
                        <Badge variant="light" size="lg" mb="sm">
                          {selectedNote.note_type_label || NOTE_TYPES.find(t => t.value === selectedNote.note_type)?.label || selectedNote.title || 'Clinical Notes'}
                        </Badge>
                        <Text size="xs" c="dimmed" mt="xs">
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
                    <Box>
                      <Text size="sm" c="dimmed" mb={4}>CONTENT</Text>
                      <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {selectedNote.content}
                      </Text>
                    </Box>
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

