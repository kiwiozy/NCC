'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Stack,
  Text,
  Button,
  Group,
  Textarea,
  Alert,
  ActionIcon,
  Box,
  Badge,
  Divider,
  Select,
  Modal,
  Loader,
  Code,
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
];

export default function NotesTest() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New note form state
  const [newTitle, setNewTitle] = useState<string>('clinical_notes');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // OpenAI Dialog state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [currentNoteForAI, setCurrentNoteForAI] = useState('');

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      // For now, load from localStorage
      const savedNotes = localStorage.getItem('nexus_notes');
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
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
      
      if (editingId) {
        // Update existing note
        const updatedNotes = notes.map((note) =>
          note.id === editingId
            ? { ...note, title: titleLabel, content: newContent, updated_at: now }
            : note
        );
        setNotes(updatedNotes);
        localStorage.setItem('nexus_notes', JSON.stringify(updatedNotes));
        setSuccess('Note updated successfully!');
        setEditingId(null);
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
        localStorage.setItem('nexus_notes', JSON.stringify(updatedNotes));
        setSuccess('Note created successfully!');
      }

      // Clear form
      setNewTitle('clinical_notes');
      setNewContent('');
    } catch (err: any) {
      setError(err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const editNote = (note: Note) => {
    // Find the value from the label
    const noteType = NOTE_TYPES.find(t => t.label === note.title);
    setNewTitle(noteType?.value || 'clinical_notes');
    setNewContent(note.content);
    setEditingId(note.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const updatedNotes = notes.filter((note) => note.id !== id);
      setNotes(updatedNotes);
      localStorage.setItem('nexus_notes', JSON.stringify(updatedNotes));
      setSuccess('Note deleted successfully');
      
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
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={2} mb="md">Notes & Text Editor</Title>
          <Text c="dimmed" size="sm">
            Create and manage text notes with AI-powered rewriting for clinical notes
          </Text>
        </Box>

        {/* Create/Edit Note Form */}
        <Paper p="xl" shadow="sm" radius="md">
          <Title order={3} mb="md">
            {editingId ? 'Edit Note' : 'Create New Note'}
          </Title>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert icon={<IconCheck size={16} />} color="green" mb="md" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <Stack gap="md">
            <Select
              label="Note Type"
              placeholder="Select note type"
              data={NOTE_TYPES}
              value={newTitle}
              onChange={(value) => setNewTitle(value || 'clinical_notes')}
              required
            />

            <Textarea
              label="Content"
              placeholder="Enter note content..."
              value={newContent}
              onChange={(e) => setNewContent(e.currentTarget.value)}
              required
              autosize
              minRows={5}
              maxRows={20}
            />

            <Group>
              <Button
                leftSection={editingId ? <IconEdit size={18} /> : <IconPlus size={18} />}
                onClick={saveNote}
                loading={saving}
              >
                {editingId ? 'Update Note' : 'Create Note'}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
              {newTitle === 'clinical_notes' && newContent.trim() && (
                <Button
                  leftSection={<IconSparkles size={18} />}
                  onClick={handleOpenAI}
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan' }}
                >
                  Rewrite with AI
                </Button>
              )}
            </Group>
          </Stack>
        </Paper>

        {/* Notes List */}
        <Paper p="xl" shadow="sm" radius="md">
          <Group justify="space-between" mb="md">
            <Title order={3}>Saved Notes</Title>
            <Badge variant="light" leftSection={<IconNote size={14} />}>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </Badge>
          </Group>

          {loading ? (
            <Text c="dimmed">Loading notes...</Text>
          ) : notes.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />} color="gray">
              No notes yet. Create your first note above!
            </Alert>
          ) : (
            <Stack gap="md">
              {notes.map((note) => (
                <Paper key={note.id} p="md" withBorder>
                  <Group justify="space-between" align="flex-start" mb="xs">
                    <Box style={{ flex: 1 }}>
                      <Group gap="xs" mb="xs">
                        <Badge variant="light">{note.title}</Badge>
                      </Group>
                      <Text size="xs" c="dimmed" mb="sm">
                        Created: {formatDateTimeAU(note.created_at)}
                        {note.updated_at !== note.created_at && (
                          <> • Updated: {formatDateTimeAU(note.updated_at)}</>
                        )}
                      </Text>
                    </Box>
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => editNote(note)}
                      >
                        <IconEdit size={18} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => deleteNote(note.id)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  </Group>
                  <Divider mb="sm" />
                  <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {note.content}
                  </Text>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Instructions */}
        <Paper p="md" withBorder>
          <Title order={4} size="h5" mb="sm">
            💡 How to Use
          </Title>
          <Stack gap="xs">
            <Text size="sm">• <strong>Create:</strong> Select note type, enter content, then click "Create Note"</Text>
            <Text size="sm">• <strong>AI Rewrite:</strong> For Clinical Notes, click "Rewrite with AI" to get professional formatting</Text>
            <Text size="sm">• <strong>Refine AI:</strong> In the AI dialog, add instructions like "make it more professional" and click "Refine"</Text>
            <Text size="sm">• <strong>Edit:</strong> Click the edit icon (✏️) on any note to modify it</Text>
            <Text size="sm">• <strong>Delete:</strong> Click the trash icon (🗑️) to remove a note</Text>
            <Text size="sm" c="dimmed" mt="xs">
              Note: Requires OpenAI API key configured in backend .env file (OPENAI_API_KEY)
            </Text>
          </Stack>
        </Paper>
      </Stack>

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
            <Code block>{currentNoteForAI}</Code>
          </Box>

          <Divider />

          {aiProcessing ? (
            <Box py="xl">
              <Group justify="center">
                <Loader size="md" />
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
    </Container>
  );
}

