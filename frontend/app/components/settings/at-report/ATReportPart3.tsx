'use client';

import { useState } from 'react';
import {
  Paper,
  Title,
  Stack,
  Textarea,
  Grid,
  ActionIcon,
  Button,
  Group,
  Table,
  TextInput,
  Radio,
  Text,
  Modal,
  Loader,
  Alert,
  Checkbox,
} from '@mantine/core';
import { IconPlus, IconTrash, IconSparkles, IconCheck, IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { ATReportData } from './types';

interface ATReportPart3Props {
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

export default function ATReportPart3({ formData, setFormData }: ATReportPart3Props) {
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
          case 'previousExperience':
            updatedData.previousExperience = enhanced;
            break;
          case 'evidence':
            updatedData.evidence = enhanced;
            break;
          case 'supportChanges':
            updatedData.supportChanges = enhanced;
            break;
          case 'implementationPlan':
            updatedData.implementationPlan = enhanced;
            break;
          case 'bestPracticeEvidence':
            updatedData.bestPracticeEvidence = enhanced;
            break;
          case 'longTermBenefit':
            updatedData.longTermBenefit = enhanced;
            break;
          case 'longTermImpact':
            updatedData.longTermImpact = enhanced;
            break;
          case 'lowerRiskOptions':
            updatedData.lowerRiskOptions = enhanced;
            break;
          case 'risksWithoutAT':
            updatedData.risksWithoutAT = enhanced;
            break;
          case 'complianceStandards':
            updatedData.complianceStandards = enhanced;
            break;
          case 'behavioursOfConcern':
            updatedData.behavioursOfConcern = enhanced;
            break;
          case 'restrictivePractice':
            updatedData.restrictivePractice = enhanced;
            break;
          case 'careExpectations':
            updatedData.careExpectations = enhanced;
            break;
          case 'otherFunding':
            updatedData.otherFunding = enhanced;
            break;
          case 'mainstreamEssential':
            updatedData.mainstreamEssential = enhanced;
            break;
          case 'mainstreamValueMoney':
            updatedData.mainstreamValueMoney = enhanced;
            break;
        }
      }
    });

    setFormData(updatedData);
    setAiModalOpen(false);
    setEnhancedFields([]);
  };
  // Helper functions for AT Items
  const addATItem = () => {
    setFormData({
      ...formData,
      atItems: [...formData.atItems, { id: Math.random().toString(), item: '', cost: '', replacing: '' }],
    });
  };

  const removeATItem = (id: string) => {
    setFormData({
      ...formData,
      atItems: formData.atItems.filter((item) => item.id !== id),
    });
  };

  const updateATItem = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      atItems: formData.atItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  // Helper functions for Trial Locations
  const addTrialLocation = () => {
    setFormData({
      ...formData,
      trialLocations: [...formData.trialLocations, { id: Math.random().toString(), location: '', duration: '', details: '' }],
    });
  };

  const removeTrialLocation = (id: string) => {
    setFormData({
      ...formData,
      trialLocations: formData.trialLocations.filter((item) => item.id !== id),
    });
  };

  const updateTrialLocation = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      trialLocations: formData.trialLocations.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  // Helper functions for AT Features
  const addATFeature = () => {
    setFormData({
      ...formData,
      atFeatures: [...formData.atFeatures, { id: Math.random().toString(), feature: '', outcomes: '' }],
    });
  };

  const removeATFeature = (id: string) => {
    setFormData({
      ...formData,
      atFeatures: formData.atFeatures.filter((item) => item.id !== id),
    });
  };

  const updateATFeature = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      atFeatures: formData.atFeatures.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  // Helper functions for Alternative Options
  const addAlternativeOption = () => {
    setFormData({
      ...formData,
      alternativeOptions: [
        ...formData.alternativeOptions,
        { id: Math.random().toString(), option: '', description: '', reasonsNotSuitable: '', estimatedCost: '' },
      ],
    });
  };

  const removeAlternativeOption = (id: string) => {
    setFormData({
      ...formData,
      alternativeOptions: formData.alternativeOptions.filter((item) => item.id !== id),
    });
  };

  const updateAlternativeOption = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      alternativeOptions: formData.alternativeOptions.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  // Helper functions for Risks
  const addRisk = () => {
    setFormData({
      ...formData,
      risks: [...formData.risks, { id: Math.random().toString(), risk: '', mitigation: '' }],
    });
  };

  const removeRisk = (id: string) => {
    setFormData({
      ...formData,
      risks: formData.risks.filter((item) => item.id !== id),
    });
  };

  const updateRisk = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      risks: formData.risks.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  return (
    <Stack gap="md" mt="xl">
      <Title order={3}>Part 3 – Recommendations and Evidence of Clinical/Practical Reasoning</Title>
      
      {/* Details of the Recommendation AT Solution */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Details of the Recommendation AT Solution</Title>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            List a summary of all AT items the participant needs. You need to attach a quotation that includes: 
            GST status, delivery costs, set up costs, model numbers, stock numbers.
          </Text>

          {formData.atItems.length > 0 && (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Item</Table.Th>
                  <Table.Th style={{ width: 150 }}>Cost ($)</Table.Th>
                  <Table.Th style={{ width: 150 }}>Replacing Existing?</Table.Th>
                  <Table.Th style={{ width: 60 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {formData.atItems.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Textarea
                        placeholder="Item description..."
                        value={item.item}
                        onChange={(e) => updateATItem(item.id, 'item', e.target.value)}
                        minRows={2}
                        autosize
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        placeholder="0.00"
                        value={item.cost}
                        onChange={(e) => updateATItem(item.id, 'cost', e.target.value)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Radio.Group
                        value={item.replacing}
                        onChange={(value) => updateATItem(item.id, 'replacing', value)}
                      >
                        <Stack gap="xs">
                          <Radio value="Yes" label="Yes" />
                          <Radio value="No" label="No" />
                        </Stack>
                      </Radio.Group>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => removeATItem(item.id)}
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
            onClick={addATItem}
          >
            Add AT Item
          </Button>
        </Stack>
      </Paper>

      {/* Included Mainstream Items */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Included Mainstream Items</Title>
        <Stack gap="md">
          <Radio.Group
            label="Does the recommended AT solution include products designed for the mainstream market (universal design), such as phones, tablets and computers?"
            value={formData.includesMainstream}
            onChange={(value) => setFormData({ ...formData, includesMainstream: value as 'yes' | 'no' })}
          >
            <Group mt="xs">
              <Radio value="yes" label="Yes" />
              <Radio value="no" label="No" />
            </Group>
          </Radio.Group>

          {formData.includesMainstream === 'yes' && (
            <>
              <Textarea
                label="Are the participant's mainstream market items essential parts of the proposed solution for pursuing the participant's goals?"
                placeholder="Explain why mainstream items are essential..."
                value={formData.mainstreamEssential}
                onChange={(e) => setFormData({ ...formData, mainstreamEssential: e.target.value })}
                minRows={3}
                autosize
              />

              <Textarea
                label="How are the mainstream market items best value for money in comparison to alternatives?"
                placeholder="Explain value for money..."
                value={formData.mainstreamValueMoney}
                onChange={(e) => setFormData({ ...formData, mainstreamValueMoney: e.target.value })}
                minRows={3}
                autosize
              />
            </>
          )}
        </Stack>
      </Paper>

      {/* AT Trial */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">AT Trial</Title>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            The NDIS expects valid and reliable outcome measures are used for AT trial. 
            Provide details of trial location, duration, outcomes, tolerance, functional outcomes, support required, and risks/barriers.
          </Text>

          {formData.trialLocations.length > 0 && (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Location</Table.Th>
                  <Table.Th style={{ width: 150 }}>Duration</Table.Th>
                  <Table.Th>Trial Details and Outcomes</Table.Th>
                  <Table.Th style={{ width: 60 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {formData.trialLocations.map((trial) => (
                  <Table.Tr key={trial.id}>
                    <Table.Td>
                      <TextInput
                        placeholder="Trial location..."
                        value={trial.location}
                        onChange={(e) => updateTrialLocation(trial.id, 'location', e.target.value)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        placeholder="e.g., 2 weeks"
                        value={trial.duration}
                        onChange={(e) => updateTrialLocation(trial.id, 'duration', e.target.value)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Textarea
                        placeholder="Trial outcomes and measurements..."
                        value={trial.details}
                        onChange={(e) => updateTrialLocation(trial.id, 'details', e.target.value)}
                        minRows={3}
                        autosize
                      />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => removeTrialLocation(trial.id)}
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
            onClick={addTrialLocation}
          >
            Add Trial Location
          </Button>
        </Stack>
      </Paper>

      {/* AT Features */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">AT Features</Title>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Provide evidence of functional outcomes which will be achieved through each recommended feature.
          </Text>

          {formData.atFeatures.length > 0 && (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>AT Feature</Table.Th>
                  <Table.Th>Functional Outcomes</Table.Th>
                  <Table.Th style={{ width: 60 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {formData.atFeatures.map((feature) => (
                  <Table.Tr key={feature.id}>
                    <Table.Td>
                      <Textarea
                        placeholder="Feature description..."
                        value={feature.feature}
                        onChange={(e) => updateATFeature(feature.id, 'feature', e.target.value)}
                        minRows={2}
                        autosize
                      />
                    </Table.Td>
                    <Table.Td>
                      <Textarea
                        placeholder="Functional outcomes achieved..."
                        value={feature.outcomes}
                        onChange={(e) => updateATFeature(feature.id, 'outcomes', e.target.value)}
                        minRows={2}
                        autosize
                      />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => removeATFeature(feature.id)}
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
            onClick={addATFeature}
          >
            Add AT Feature
          </Button>
        </Stack>
      </Paper>

      {/* AT Experience */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">AT Experience</Title>
        <Textarea
          label="Previous Experience with AT"
          description="Describe previous lived experience the participant has using this or similar AT. If replacement AT, provide details of existing AT (make/model, features, age, independence/outcome, support required, reason for replacement)."
          placeholder="Describe previous AT experience..."
          value={formData.previousExperience}
          onChange={(e) => setFormData({ ...formData, previousExperience: e.target.value })}
          minRows={5}
          autosize
        />
      </Paper>

      {/* Evaluation of Other Options */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Evaluation of Other Options</Title>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            List all alternative supports considered to meet the participant's disability support needs and why they are not suitable.
            Note: NDIA will generally fund the most cost-effective option.
          </Text>

          {formData.alternativeOptions.map((option, index) => (
            <Paper key={option.id} p="sm" withBorder>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={500}>Option {index + 1}</Text>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => removeAlternativeOption(option.id)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>

                <TextInput
                  label="Option Name (Considered/Trialled)"
                  placeholder="e.g., Manual wheelchair, Therapy program..."
                  value={option.option}
                  onChange={(e) => updateAlternativeOption(option.id, 'option', e.target.value)}
                />

                <Textarea
                  label="Description"
                  placeholder="Describe the alternative option..."
                  value={option.description}
                  onChange={(e) => updateAlternativeOption(option.id, 'description', e.target.value)}
                  minRows={2}
                  autosize
                />

                <Textarea
                  label="Reasons it is considered not suitable"
                  placeholder="Explain why this option is not suitable..."
                  value={option.reasonsNotSuitable}
                  onChange={(e) => updateAlternativeOption(option.id, 'reasonsNotSuitable', e.target.value)}
                  minRows={2}
                  autosize
                />

                <TextInput
                  label="Estimated Cost ($)"
                  placeholder="0.00"
                  value={option.estimatedCost}
                  onChange={(e) => updateAlternativeOption(option.id, 'estimatedCost', e.target.value)}
                />
              </Stack>
            </Paper>
          ))}

          <Button
            leftSection={<IconPlus size={18} />}
            variant="light"
            onClick={addAlternativeOption}
          >
            Add Alternative Option
          </Button>
        </Stack>
      </Paper>

      {/* Evidence */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Evidence</Title>
        <Stack gap="md">
          <Textarea
            label="Evidence for Recommendation"
            description="Explain the evidence for the recommended option as the most suitable and cost-effective support to help the participant pursue their goals, reduce functional limitation, facilitate participation, and improve life stage outcomes."
            placeholder="Provide evidence supporting this recommendation..."
            value={formData.evidence}
            onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
            minRows={5}
            autosize
            required
          />

          <Textarea
            label="Changes to Other Supports"
            description="List any changes to other supports that may be required (reduction or addition) for the recommended AT support."
            placeholder="Describe support changes..."
            value={formData.supportChanges}
            onChange={(e) => setFormData({ ...formData, supportChanges: e.target.value })}
            minRows={3}
            autosize
          />

          <Textarea
            label="Detailed Implementation Plan"
            description="Provide a detailed plan including: timeframe, changes to non-AT supports and environmental modifications, how the AT will change the participant's current NDIS funded and informal support needs."
            placeholder="Provide implementation plan..."
            value={formData.implementationPlan}
            onChange={(e) => setFormData({ ...formData, implementationPlan: e.target.value })}
            minRows={5}
            autosize
            required
          />

          <Textarea
            label="Best Practice Evidence"
            description="Describe, having regard to best practice, what evidence indicates the proposed AT will be, or is likely to be, effective and beneficial for the participant (e.g., published literature, past participant experience of AT)."
            placeholder="Provide best practice evidence..."
            value={formData.bestPracticeEvidence}
            onChange={(e) => setFormData({ ...formData, bestPracticeEvidence: e.target.value })}
            minRows={5}
            autosize
            required
          />
        </Stack>
      </Paper>

      {/* Long Term Benefit */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Long Term Benefit</Title>
        <Stack gap="md">
          <Textarea
            label="Long Term Benefits"
            description="Describe the long term benefits of the AT including: anticipated life span, how it allows for adaptation/accommodation of likely changes to the participant's circumstances, development or function."
            placeholder="Describe long term benefits..."
            value={formData.longTermBenefit}
            onChange={(e) => setFormData({ ...formData, longTermBenefit: e.target.value })}
            minRows={5}
            autosize
            required
          />

          <Textarea
            label="Long Term Impact"
            description="Describe how the AT will: impact the participant's functional status, independence and/or outcomes over the long term, potentially reduce the cost of funded supports for the participant in the long term."
            placeholder="Describe long term impact..."
            value={formData.longTermImpact}
            onChange={(e) => setFormData({ ...formData, longTermImpact: e.target.value })}
            minRows={5}
            autosize
            required
          />
        </Stack>
      </Paper>

      {/* Risk Assessment */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Risk Assessment</Title>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Describe potential risks to the participant/carer related to the use of this AT and risk mitigation strategies.
          </Text>

          {formData.risks.length > 0 && (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Risk</Table.Th>
                  <Table.Th>Risk Mitigation Strategies</Table.Th>
                  <Table.Th style={{ width: 60 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {formData.risks.map((risk) => (
                  <Table.Tr key={risk.id}>
                    <Table.Td>
                      <Textarea
                        placeholder="Describe risk..."
                        value={risk.risk}
                        onChange={(e) => updateRisk(risk.id, 'risk', e.target.value)}
                        minRows={2}
                        autosize
                      />
                    </Table.Td>
                    <Table.Td>
                      <Textarea
                        placeholder="Describe mitigation strategies..."
                        value={risk.mitigation}
                        onChange={(e) => updateRisk(risk.id, 'mitigation', e.target.value)}
                        minRows={2}
                        autosize
                      />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => removeRisk(risk.id)}
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
            onClick={addRisk}
          >
            Add Risk
          </Button>

          <Textarea
            label="Lower Risk Options Considered"
            description="Describe lower risk options that were considered and why these were deemed unsuitable."
            placeholder="Describe lower risk options..."
            value={formData.lowerRiskOptions}
            onChange={(e) => setFormData({ ...formData, lowerRiskOptions: e.target.value })}
            minRows={3}
            autosize
          />

          <Textarea
            label="Potential Risks Without AT"
            description="Describe any potential risks to the participant/carer if this AT is not provided."
            placeholder="Describe risks without AT..."
            value={formData.risksWithoutAT}
            onChange={(e) => setFormData({ ...formData, risksWithoutAT: e.target.value })}
            minRows={3}
            autosize
          />

          <Textarea
            label="Compliance with Australian Standards"
            description="Does this AT comply with relevant AT Australian Standards (or ISO AT standards)? If yes, note which standards. If no, note why the AT does not meet the standards and whether it increases risk for the participant."
            placeholder="Describe compliance with standards..."
            value={formData.complianceStandards}
            onChange={(e) => setFormData({ ...formData, complianceStandards: e.target.value })}
            minRows={3}
            autosize
          />
        </Stack>
      </Paper>

      {/* Behaviours of Concern */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Behaviours of Concern</Title>
        <Stack gap="md">
          <Textarea
            label="Behaviours of Concern"
            description="Describe any behaviours of concern that may impact the safety of the participant or others in relation to the use of this AT."
            placeholder="Describe behaviours of concern..."
            value={formData.behavioursOfConcern}
            onChange={(e) => setFormData({ ...formData, behavioursOfConcern: e.target.value })}
            minRows={3}
            autosize
          />

          <Textarea
            label="Restrictive Practice"
            description="Could the use of this AT constitute a restrictive practice? If so, is there an authorised Positive Behaviour Support Plan (PBSP) in place? Please describe all less restrictive options that were considered or trialled."
            placeholder="Describe restrictive practice considerations..."
            value={formData.restrictivePractice}
            onChange={(e) => setFormData({ ...formData, restrictivePractice: e.target.value })}
            minRows={3}
            autosize
          />
        </Stack>
      </Paper>

      {/* Reasonable Expectations of Care */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Reasonable Expectations of Care</Title>
        <Textarea
          label="Reasonable Expectations"
          description="Has this assessment considered what is reasonable to expect family, carers, informal networks and the community to provide?"
          placeholder="Describe reasonable expectations..."
          value={formData.careExpectations}
          onChange={(e) => setFormData({ ...formData, careExpectations: e.target.value })}
          minRows={3}
          autosize
        />
      </Paper>

      {/* Other Potential Funding Sources */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Other Potential Funding Sources</Title>
        <Textarea
          label="Other Funding Sources"
          description="Have other sources of funding been considered (e.g., health, education provider, Job-Access) that may be more appropriate to fund some or all of this support?"
          placeholder="Describe other funding sources considered..."
          value={formData.otherFunding}
          onChange={(e) => setFormData({ ...formData, otherFunding: e.target.value })}
          minRows={3}
          autosize
        />
      </Paper>

      {/* Master AI Enhancement Button - Bottom of Part 3 */}
      <Group justify="center" mt="xl">
        <Button
          leftSection={<IconSparkles size={18} />}
          onClick={() => handleEnhanceSection('Part 3 - Recommendations and Evidence', [
            // Mainstream Items
            { field: 'mainstreamEssential', label: 'Mainstream Items Essential', value: formData.mainstreamEssential },
            { field: 'mainstreamValueMoney', label: 'Mainstream Value for Money', value: formData.mainstreamValueMoney },
            // AT Experience
            { field: 'previousExperience', label: 'Previous Experience with AT', value: formData.previousExperience },
            // Evidence
            { field: 'evidence', label: 'Evidence for Recommendation', value: formData.evidence },
            { field: 'supportChanges', label: 'Changes to Other Supports', value: formData.supportChanges },
            { field: 'implementationPlan', label: 'Detailed Implementation Plan', value: formData.implementationPlan },
            { field: 'bestPracticeEvidence', label: 'Best Practice Evidence', value: formData.bestPracticeEvidence },
            // Long Term Benefit
            { field: 'longTermBenefit', label: 'Long Term Benefits', value: formData.longTermBenefit },
            { field: 'longTermImpact', label: 'Long Term Impact', value: formData.longTermImpact },
            // Risk Assessment
            { field: 'lowerRiskOptions', label: 'Lower Risk Options Considered', value: formData.lowerRiskOptions },
            { field: 'risksWithoutAT', label: 'Potential Risks Without AT', value: formData.risksWithoutAT },
            { field: 'complianceStandards', label: 'Compliance with Australian Standards', value: formData.complianceStandards },
            // Behaviours of Concern
            { field: 'behavioursOfConcern', label: 'Behaviours of Concern', value: formData.behavioursOfConcern },
            { field: 'restrictivePractice', label: 'Restrictive Practice', value: formData.restrictivePractice },
            // Reasonable Expectations
            { field: 'careExpectations', label: 'Reasonable Expectations of Care', value: formData.careExpectations },
            // Other Funding
            { field: 'otherFunding', label: 'Other Potential Funding Sources', value: formData.otherFunding },
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

