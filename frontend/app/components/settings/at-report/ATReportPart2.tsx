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
  Checkbox,
} from '@mantine/core';
import { IconPlus, IconTrash, IconSparkles, IconCheck, IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { ATReportData, CurrentAT } from './types';

interface ATReportPart2Props {
  formData: ATReportData;
  setFormData: (data: ATReportData) => void;
}

interface EnhancedField {
  field: string;
  label: string;
  original: string;
  enhanced: string;
  selected: boolean;
  refinementPrompt?: string;
}

export default function ATReportPart2({ formData, setFormData }: ATReportPart2Props) {
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [enhancedFields, setEnhancedFields] = useState<EnhancedField[]>([]);
  const [currentSection, setCurrentSection] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleEnhanceSection = async (sectionName: string, fields: Array<{ field: string; label: string; value: string }>) => {
    // Filter out empty fields
    const nonEmptyFields = fields.filter(f => f.value.trim());
    
    if (nonEmptyFields.length === 0) {
      setError('Please fill in at least one field before enhancing this section.');
      setAiModalOpen(true);
      return;
    }

    setCurrentSection(sectionName);
    setAiModalOpen(true);
    setError(null);
    setAiProcessing(true);

    try {
      // Process each field with AI
      const enhancementPromises = nonEmptyFields.map(async ({ field, label, value }) => {
        const response = await fetch('http://localhost:8000/api/ai/rewrite-clinical-notes/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: value,
            custom_prompt: `Rewrite this for an NDIS AT Assessment report section: "${label}". Make it professional, detailed, and suitable for NDIS submission.`,
          }),
        });

        if (!response.ok) throw new Error(`Failed to process ${label}`);

        const data = await response.json();
        return {
          field,
          label,
          original: value,
          enhanced: data.result,
          selected: true, // Default to checked
        };
      });

      const results = await Promise.all(enhancementPromises);
      setEnhancedFields(results);
    } catch (err: any) {
      setError(err.message || 'Failed to process with AI');
      setEnhancedFields([]);
    } finally {
      setAiProcessing(false);
    }
  };

  const toggleFieldSelection = (index: number) => {
    setEnhancedFields(prev =>
      prev.map((field, i) =>
        i === index ? { ...field, selected: !field.selected } : field
      )
    );
  };

  const updateRefinementPrompt = (index: number, prompt: string) => {
    setEnhancedFields(prev =>
      prev.map((field, i) =>
        i === index ? { ...field, refinementPrompt: prompt } : field
      )
    );
  };

  const rerunSingleField = async (index: number) => {
    const field = enhancedFields[index];
    if (!field) return;

    // Update the field to show processing state
    setEnhancedFields(prev =>
      prev.map((f, i) =>
        i === index ? { ...f, enhanced: 'Processing...' } : f
      )
    );

    try {
      const response = await fetch('http://localhost:8000/api/ai/rewrite-clinical-notes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: field.original,
          custom_prompt: field.refinementPrompt
            ? `${field.refinementPrompt}\n\nRewrite this for an NDIS AT Assessment report section: "${field.label}". Make it professional, detailed, and suitable for NDIS submission.`
            : `Rewrite this for an NDIS AT Assessment report section: "${field.label}". Make it professional, detailed, and suitable for NDIS submission.`,
        }),
      });

      if (!response.ok) throw new Error(`Failed to process ${field.label}`);
      const data = await response.json();

      // Update with new result
      setEnhancedFields(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, enhanced: data.result, refinementPrompt: '' } : f
        )
      );
    } catch (err: any) {
      setError(err.message || `Failed to reprocess ${field.label}`);
      // Restore original enhanced text on error
      setEnhancedFields(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, enhanced: field.enhanced } : f
        )
      );
    }
  };

  const applySelectedEnhancements = () => {
    const updatedData = { ...formData };

    enhancedFields.forEach(({ field, enhanced, selected }) => {
      if (selected) {
        // Apply the enhancement based on field name
        switch (field) {
          case 'background':
            updatedData.background = enhanced;
            break;
          case 'participantGoals':
            updatedData.participantGoals = enhanced;
            break;
          case 'functionalLimitations.physical':
            updatedData.functionalLimitations = {
              ...updatedData.functionalLimitations,
              physical: enhanced,
            };
            break;
          case 'functionalLimitations.sensory':
            updatedData.functionalLimitations = {
              ...updatedData.functionalLimitations,
              sensory: enhanced,
            };
            break;
          case 'functionalLimitations.communication':
            updatedData.functionalLimitations = {
              ...updatedData.functionalLimitations,
              communication: enhanced,
            };
            break;
          case 'functionalLimitations.cognitive':
            updatedData.functionalLimitations = {
              ...updatedData.functionalLimitations,
              cognitive: enhanced,
            };
            break;
          case 'functionalLimitations.behavioural':
            updatedData.functionalLimitations = {
              ...updatedData.functionalLimitations,
              behavioural: enhanced,
            };
            break;
          case 'functionalLimitations.other':
            updatedData.functionalLimitations = {
              ...updatedData.functionalLimitations,
              other: enhanced,
            };
            break;
        }
      }
    });

    setFormData(updatedData);
    setAiModalOpen(false);
    setEnhancedFields([]);
  };

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

  return (
    <Stack gap="md" mt="xl">
      <Title order={3}>Part 2 – Assessment of Participant Needs</Title>
      
      {/* Background - General */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Background – General</Title>
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
      </Paper>

      {/* Participant Goals */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Participant Goals</Title>
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
      </Paper>

      {/* Functional Assessment */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Functional Assessment</Title>
        <Stack gap="md">
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
        </Stack>
      </Paper>

      {/* Anthropometric Measurements */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Anthropometric Measurements</Title>
        <Grid>
          <Grid.Col span={6}>
            <NumberInput
              label="Height (cm)"
              placeholder="Enter height"
              value={formData.height || ''}
              onChange={(val) => setFormData({ ...formData, height: val as number })}
              min={0}
              max={300}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="Weight (kg)"
              placeholder="Enter weight"
              value={formData.weight || ''}
              onChange={(val) => setFormData({ ...formData, weight: val as number })}
              min={0}
              max={500}
            />
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Current AT Use */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Current AT Use</Title>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            List all current AT the participant uses (including non-NDIS funded AT).
          </Text>

          {formData.currentATList.length > 0 && (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>AT Description</Table.Th>
                  <Table.Th style={{ width: 60 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {formData.currentATList.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Textarea
                        placeholder="e.g., Manual wheelchair (Brand X, Model Y), purchased 2020..."
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

      {/* AI Enhancement Button - Bottom of Part 2 */}
      <Group justify="center" mt="lg">
        <Button
          leftSection={<IconSparkles size={18} />}
          onClick={() => handleEnhanceSection('Part 2 - Assessment of Participant Needs', [
            { field: 'background', label: 'Background Information', value: formData.background },
            { field: 'participantGoals', label: "Participant's Goals", value: formData.participantGoals },
            { field: 'functionalLimitations.physical', label: 'Physical Functional Limitations', value: formData.functionalLimitations.physical },
            { field: 'functionalLimitations.sensory', label: 'Sensory Functional Limitations', value: formData.functionalLimitations.sensory },
            { field: 'functionalLimitations.communication', label: 'Communication Functional Limitations', value: formData.functionalLimitations.communication },
            { field: 'functionalLimitations.cognitive', label: 'Cognitive Functional Limitations', value: formData.functionalLimitations.cognitive },
            { field: 'functionalLimitations.behavioural', label: 'Behavioural Functional Limitations', value: formData.functionalLimitations.behavioural },
            { field: 'functionalLimitations.other', label: 'Other Functional Assessments', value: formData.functionalLimitations.other },
          ])}
          variant="gradient"
          gradient={{ from: 'blue', to: 'cyan' }}
          size="lg"
        >
          Enhance All Fields with AI
        </Button>
      </Group>

      {/* AI Enhancement Modal */}
      <Modal
        opened={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title={<Text fw={600} size="lg">AI Enhancement - {currentSection}</Text>}
        size="xl"
      >
        <Stack gap="md">
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              {error}
            </Alert>
          )}

          {aiProcessing && (
            <Stack gap="sm" align="center" py="xl">
              <Loader size="lg" />
              <Text size="sm" c="dimmed">
                AI is enhancing {enhancedFields.length > 0 ? enhancedFields.length : 'your'} field(s)...
              </Text>
            </Stack>
          )}

          {!aiProcessing && enhancedFields.length > 0 && (
            <>
              <Alert icon={<IconSparkles size={16} />} color="blue">
                <Text size="sm">
                  Review the AI-enhanced content below. Uncheck any fields you don't want to apply.
                </Text>
              </Alert>

              <Stack gap="lg">
                {enhancedFields.map((field, index) => (
                  <Paper key={field.field} p="md" withBorder>
                    <Stack gap="md">
                      <Checkbox
                        checked={field.selected}
                        onChange={() => toggleFieldSelection(index)}
                        label={<Text fw={600} size="lg">{field.label}</Text>}
                        size="md"
                      />

                      <Stack gap="sm">
                        <div>
                          <Text size="sm" fw={600} mb={4}>Original:</Text>
                          <Paper p="md" withBorder style={{ whiteSpace: 'pre-wrap', backgroundColor: 'var(--mantine-color-dark-6)' }}>
                            <Text size="sm" c="white">{field.original}</Text>
                          </Paper>
                        </div>

                        <div>
                          <Text size="sm" fw={600} c="blue" mb={4}>AI Enhanced:</Text>
                          <Paper p="md" withBorder style={{ whiteSpace: 'pre-wrap', backgroundColor: 'var(--mantine-color-blue-9)' }}>
                            <Text size="sm" c="white">{field.enhanced}</Text>
                          </Paper>
                        </div>

                        {/* Refinement Input */}
                        <div>
                          <Textarea
                            placeholder="Optional: Add refinement instructions (e.g., 'Make it more concise', 'Add more detail about mobility')"
                            value={field.refinementPrompt || ''}
                            onChange={(e) => updateRefinementPrompt(index, e.target.value)}
                            minRows={2}
                            size="sm"
                          />
                          <Group justify="flex-end" mt="xs">
                            <Button
                              size="xs"
                              variant="light"
                              color="blue"
                              leftSection={<IconRefresh size={14} />}
                              onClick={() => rerunSingleField(index)}
                              disabled={field.enhanced === 'Processing...'}
                            >
                              {field.enhanced === 'Processing...' ? 'Processing...' : 'Rerun with Instructions'}
                            </Button>
                          </Group>
                        </div>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>

              <Group justify="space-between" mt="md">
                <Button
                  variant="subtle"
                  onClick={() => {
                    const allSelected = enhancedFields.every(f => f.selected);
                    setEnhancedFields(prev => prev.map(f => ({ ...f, selected: !allSelected })));
                  }}
                >
                  {enhancedFields.every(f => f.selected) ? 'Deselect All' : 'Select All'}
                </Button>
                <Group>
                  <Button variant="default" onClick={() => setAiModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    leftSection={<IconCheck size={16} />}
                    onClick={applySelectedEnhancements}
                    color="green"
                    disabled={!enhancedFields.some(f => f.selected)}
                  >
                    Apply Selected ({enhancedFields.filter(f => f.selected).length})
                  </Button>
                </Group>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
