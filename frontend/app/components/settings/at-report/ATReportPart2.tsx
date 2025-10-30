'use client';

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
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { ATReportData, CurrentAT } from './types';

interface ATReportPart2Props {
  formData: ATReportData;
  setFormData: (data: ATReportData) => void;
}

export default function ATReportPart2({ formData, setFormData }: ATReportPart2Props) {
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
    </Stack>
  );
}

