'use client';

import { useState } from 'react';
import {
  Paper,
  Title,
  Stack,
  Textarea,
  Grid,
  NumberInput,
  ActionIcon,
  Button,
  Group,
  Table,
  Modal,
  Text,
  Loader,
  Alert,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash, IconSparkles, IconRefresh, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { ATReportData, CurrentAT } from './types';

interface ATReportPart2Props {
  formData: ATReportData;
  setFormData: (data: ATReportData) => void;
}

export default function ATReportPart2({ formData, setFormData }: ATReportPart2Props) {
  // AI Enhancement state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [currentField, setCurrentField] = useState<{
    field: string;
    value: string;
    label: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Helper functions for dynamic Current AT list
  const addCurrentAT = () => {
    setFormData({
      ...formData,
      currentATList: [...formData.currentATList, { id: Math.random().toString(), description: '' }],
    });
  };

  const removeCurrentAT = (id: string) => {
    setFormData({
      ...formData,
      currentATList: formData.currentATList.filter((item) => item.id !== id),
    });
  };

  const updateCurrentAT = (id: string, description: string) => {
    setFormData({
      ...formData,
      currentATList: formData.currentATList.map((item) =>
        item.id === id ? { ...item, description } : item
      ),
    });
  };

  // AI Enhancement functions
  const handleOpenAI = (field: string, value: string, label: string) => {
    if (!value.trim()) {
      setError('Please enter some content first');
      return;
    }

    setCurrentField({ field, value, label });
    setAiResult('');
    setAiPrompt('');
    setError(null);
    setAiModalOpen(true);
  };

  const callOpenAI = async (customPrompt?: string) => {
    if (!currentField) return;

    setAiProcessing(true);
    setError(null);

    try {
      const systemPrompt = customPrompt || `Rewrite this as a professional NDIS assessment for: ${currentField.label}`;
      
      const response = await fetch('https://localhost:8000/api/ai/rewrite-clinical-notes/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: currentField.value,
          custom_prompt: systemPrompt,
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
    if (!currentField) return;

    // Update the appropriate field based on currentField.field
    if (currentField.field === 'background') {
      setFormData({ ...formData, background: aiResult });
    } else if (currentField.field === 'participantGoals') {
      setFormData({ ...formData, participantGoals: aiResult });
    } else if (currentField.field.startsWith('functionalLimitations.')) {
      const limitationType = currentField.field.split('.')[1] as keyof typeof formData.functionalLimitations;
      setFormData({
        ...formData,
        functionalLimitations: {
          ...formData.functionalLimitations,
          [limitationType]: aiResult,
        },
      });
    }

    setAiModalOpen(false);
    setCurrentField(null);
  };

  const requestAIRefinement = () => {
    if (!aiPrompt.trim()) {
      setError('Please enter refinement instructions');
      return;
    }
    callOpenAI(aiPrompt);
  };

  return (
    <Stack gap="md" mt="xl">
      <Title order={3}>Part 2 – Assessment of Participant Needs</Title>
      
      {/* Background - General */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Background – General</Title>
        <Stack gap="sm">
          <Textarea
            label="Background Information"
            description="Provide information about the participant that relates to the AT being assessed (diagnosis, prognosis, co-existing conditions, disability, personal and instrumental activities of daily living, living arrangements, life transitions)"
            placeholder="Enter background information..."
            value={formData.background}
            onChange={(e) => setFormData({ ...formData, background: e.target.value })}
            minRows={6}
            autosize
            required
          />
          {formData.background.trim() && (
            <Button
              leftSection={<IconSparkles size={18} />}
              onClick={() => handleOpenAI('background', formData.background, 'Background Information')}
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
              size="sm"
            >
              Enhance with AI
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Participant Goals */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Participant Goals</Title>
        <Stack gap="sm">
          <Textarea
            label="Participant's Goals"
            description="List the participant's goals that relate to the AT being assessed"
            placeholder="Enter participant goals..."
            value={formData.participantGoals}
            onChange={(e) => setFormData({ ...formData, participantGoals: e.target.value })}
            minRows={4}
            autosize
            required
          />
          {formData.participantGoals.trim() && (
            <Button
              leftSection={<IconSparkles size={18} />}
              onClick={() => handleOpenAI('participantGoals', formData.participantGoals, 'Participant Goals')}
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
              size="sm"
            >
              Enhance with AI
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Functional Assessment */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Functional Assessment</Title>
        <Stack gap="md">
          <Stack gap="sm">
            <Textarea
              label="Physical"
              description="Functional limitations related to physical abilities"
              placeholder="Describe physical functional limitations..."
              value={formData.functionalLimitations.physical}
              onChange={(e) => setFormData({
                ...formData,
                functionalLimitations: { ...formData.functionalLimitations, physical: e.target.value }
              })}
              minRows={3}
              autosize
            />
            {formData.functionalLimitations.physical.trim() && (
              <Button
                leftSection={<IconSparkles size={18} />}
                onClick={() => handleOpenAI('functionalLimitations.physical', formData.functionalLimitations.physical, 'Physical Functional Limitations')}
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                size="sm"
              >
                Enhance with AI
              </Button>
            )}
          </Stack>

          <Stack gap="sm">
            <Textarea
              label="Sensory"
              description="Functional limitations related to sensory abilities"
              placeholder="Describe sensory functional limitations..."
              value={formData.functionalLimitations.sensory}
              onChange={(e) => setFormData({
                ...formData,
                functionalLimitations: { ...formData.functionalLimitations, sensory: e.target.value }
              })}
              minRows={3}
              autosize
            />
            {formData.functionalLimitations.sensory.trim() && (
              <Button
                leftSection={<IconSparkles size={18} />}
                onClick={() => handleOpenAI('functionalLimitations.sensory', formData.functionalLimitations.sensory, 'Sensory Functional Limitations')}
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                size="sm"
              >
                Enhance with AI
              </Button>
            )}
          </Stack>

          <Stack gap="sm">
            <Textarea
              label="Communication"
              description="Functional limitations related to communication"
              placeholder="Describe communication functional limitations..."
              value={formData.functionalLimitations.communication}
              onChange={(e) => setFormData({
                ...formData,
                functionalLimitations: { ...formData.functionalLimitations, communication: e.target.value }
              })}
              minRows={3}
              autosize
            />
            {formData.functionalLimitations.communication.trim() && (
              <Button
                leftSection={<IconSparkles size={18} />}
                onClick={() => handleOpenAI('functionalLimitations.communication', formData.functionalLimitations.communication, 'Communication Functional Limitations')}
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                size="sm"
              >
                Enhance with AI
              </Button>
            )}
          </Stack>

          <Stack gap="sm">
            <Textarea
              label="Cognitive"
              description="Functional limitations related to cognitive abilities"
              placeholder="Describe cognitive functional limitations..."
              value={formData.functionalLimitations.cognitive}
              onChange={(e) => setFormData({
                ...formData,
                functionalLimitations: { ...formData.functionalLimitations, cognitive: e.target.value }
              })}
              minRows={3}
              autosize
            />
            {formData.functionalLimitations.cognitive.trim() && (
              <Button
                leftSection={<IconSparkles size={18} />}
                onClick={() => handleOpenAI('functionalLimitations.cognitive', formData.functionalLimitations.cognitive, 'Cognitive Functional Limitations')}
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                size="sm"
              >
                Enhance with AI
              </Button>
            )}
          </Stack>

          <Stack gap="sm">
            <Textarea
              label="Behavioural"
              description="Functional limitations related to behaviour"
              placeholder="Describe behavioural functional limitations..."
              value={formData.functionalLimitations.behavioural}
              onChange={(e) => setFormData({
                ...formData,
                functionalLimitations: { ...formData.functionalLimitations, behavioural: e.target.value }
              })}
              minRows={3}
              autosize
            />
            {formData.functionalLimitations.behavioural.trim() && (
              <Button
                leftSection={<IconSparkles size={18} />}
                onClick={() => handleOpenAI('functionalLimitations.behavioural', formData.functionalLimitations.behavioural, 'Behavioural Functional Limitations')}
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                size="sm"
              >
                Enhance with AI
              </Button>
            )}
          </Stack>

          <Stack gap="sm">
            <Textarea
              label="Other"
              description="Other objective assessments"
              placeholder="Describe other assessments..."
              value={formData.functionalLimitations.other}
              onChange={(e) => setFormData({
                ...formData,
                functionalLimitations: { ...formData.functionalLimitations, other: e.target.value }
              })}
              minRows={3}
              autosize
            />
            {formData.functionalLimitations.other.trim() && (
              <Button
                leftSection={<IconSparkles size={18} />}
                onClick={() => handleOpenAI('functionalLimitations.other', formData.functionalLimitations.other, 'Other Functional Assessments')}
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                size="sm"
              >
                Enhance with AI
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Participant's Weight and Height */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Participant's Weight and Height</Title>
        <Grid>
          <Grid.Col span={6}>
            <NumberInput
              label="Height (cm)"
              placeholder="Enter height in centimeters"
              value={formData.height ? parseFloat(formData.height) : ''}
              onChange={(value) => setFormData({ ...formData, height: value?.toString() || '' })}
              min={0}
              max={300}
              decimalScale={1}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="Weight (kg)"
              placeholder="Enter weight in kilograms"
              value={formData.weight ? parseFloat(formData.weight) : ''}
              onChange={(value) => setFormData({ ...formData, weight: value?.toString() || '' })}
              min={0}
              max={500}
              decimalScale={1}
            />
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Current AT Use */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Current AT Use</Title>
        <Stack gap="md">
          <Textarea
            description="List AT the participant currently uses related to the activity/task this AT request addresses. Include: type of AT, model, age, history of repair, ongoing suitability, level of independence/support needed, how current AT will work with new AT, any environmental changes needed."
            label="Current Assistive Technology"
            placeholder="Describe current AT..."
            minRows={4}
          />

          {formData.currentATList.length > 0 && (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Description</Table.Th>
                  <Table.Th style={{ width: 60 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {formData.currentATList.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Textarea
                        placeholder="Describe current AT item..."
                        value={item.description}
                        onChange={(e) => updateCurrentAT(item.id, e.target.value)}
                        minRows={2}
                        autosize
                      />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => removeCurrentAT(item.id)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          <Button
            leftSection={<IconPlus size={18} />}
            variant="light"
            onClick={addCurrentAT}
          >
            Add Current AT Item
          </Button>
        </Stack>
      </Paper>

      {/* AI Enhancement Modal */}
      <Modal
        opened={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title={<Text fw={600} size="lg">AI Enhancement - {currentField?.label}</Text>}
        size="xl"
      >
        <Stack gap="md">
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Paper p="sm" withBorder>
            <Text size="sm" fw={500} mb="xs">Original Content:</Text>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{currentField?.value}</Text>
          </Paper>

          {aiProcessing ? (
            <Paper p="xl" withBorder>
              <Group justify="center">
                <Loader size="md" />
                <Text>Processing with AI...</Text>
              </Group>
            </Paper>
          ) : aiResult ? (
            <>
              <Paper p="md" withBorder>
                <Text size="sm" fw={500} mb="xs">AI-Enhanced Result:</Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{aiResult}</Text>
              </Paper>

              <Text size="sm" fw={500}>Request Refinement (Optional)</Text>
              <TextInput
                placeholder='e.g., "make it more detailed", "add more clinical terminology"'
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />

              <Group justify="space-between">
                <Button
                  leftSection={<IconRefresh size={18} />}
                  onClick={requestAIRefinement}
                  variant="outline"
                  disabled={!aiPrompt.trim()}
                >
                  Refine with AI
                </Button>
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
                Click "Enhance" to rewrite this content as a professional NDIS assessment using AI.
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
                  Enhance with AI
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}

