'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Paper,
  Stepper,
  Button,
  Group,
  Stack,
  Text,
  Alert,
  ActionIcon,
} from '@mantine/core';
import {
  IconCheck,
  IconAlertCircle,
  IconFileText,
  IconUser,
  IconClipboard,
  IconFileCheck,
  IconSettings,
  IconSignature,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { ATReportData, createEmptyATReportData } from './at-report/types';
import ATReportPart1 from './at-report/ATReportPart1';
import ATReportPart2 from './at-report/ATReportPart2';
import ATReportPart3 from './at-report/ATReportPart3';
import ATReportPart4 from './at-report/ATReportPart4';
import ATReportPart5And6 from './at-report/ATReportPart5And6';

export default function ATReport() {
  const [active, setActive] = useState(0);
  const [formData, setFormData] = useState<ATReportData>(createEmptyATReportData());

  const nextStep = () => setActive((current) => (current < 5 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const handleSaveDraft = () => {
    // Save to localStorage for now
    localStorage.setItem('at_report_draft', JSON.stringify(formData));
    alert('Draft saved successfully!');
  };

  const handleLoadDraft = () => {
    const saved = localStorage.getItem('at_report_draft');
    if (saved) {
      setFormData(JSON.parse(saved));
      alert('Draft loaded successfully!');
    } else {
      alert('No saved draft found.');
    }
  };

  const handleSubmit = () => {
    // TODO: Submit to backend API
    console.log('Submitting AT Report:', formData);
    alert('AT Report submitted! (Backend integration coming soon)');
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Paper p="xl" shadow="sm" radius="md">
          <Group justify="space-between" mb="xl">
            <div>
              <Title order={2}>NDIS Assistive Technology Assessment</Title>
              <Text c="dimmed" size="sm">General AT Assessment Template</Text>
            </div>
            <Group>
              <ActionIcon 
                variant="light" 
                size="lg" 
                radius="md"
                onClick={handleSaveDraft}
                title="Save Draft"
              >
                <IconDeviceFloppy size={20} />
              </ActionIcon>
              <ActionIcon variant="light" size="xl" radius="md">
                <IconFileText size={24} />
              </ActionIcon>
            </Group>
          </Group>

          <Alert icon={<IconAlertCircle size={16} />} title="Important Information" color="blue" mb="xl">
            <Stack gap="xs">
              <Text size="sm">
                This assessment template is for NDIS Assistive Technology assessors. Complete all relevant sections
                to help determine if the AT request is reasonable and necessary under the NDIS Act.
              </Text>
              <Button size="xs" variant="subtle" onClick={handleLoadDraft}>
                Load Saved Draft
              </Button>
            </Stack>
          </Alert>

          <Stepper active={active} onStepClick={setActive} breakpoint="sm">
            <Stepper.Step 
              label="Part 1" 
              description="Participant Details" 
              icon={<IconUser size={18} />}
            >
              <ATReportPart1 formData={formData} setFormData={setFormData} />
            </Stepper.Step>

            <Stepper.Step 
              label="Part 2" 
              description="Assessment of Needs" 
              icon={<IconClipboard size={18} />}
            >
              <ATReportPart2 formData={formData} setFormData={setFormData} />
            </Stepper.Step>

            <Stepper.Step 
              label="Part 3" 
              description="Recommendations" 
              icon={<IconFileCheck size={18} />}
            >
              <ATReportPart3 formData={formData} setFormData={setFormData} />
            </Stepper.Step>

            <Stepper.Step 
              label="Part 4" 
              description="Implementation" 
              icon={<IconSettings size={18} />}
            >
              <ATReportPart4 formData={formData} setFormData={setFormData} />
            </Stepper.Step>

            <Stepper.Step 
              label="Part 5 & 6" 
              description="Declaration & Consent" 
              icon={<IconSignature size={18} />}
            >
              <ATReportPart5And6 formData={formData} setFormData={setFormData} />
            </Stepper.Step>

            <Stepper.Completed>
              <Paper p="xl" withBorder mt="xl">
                <Stack align="center" gap="md">
                  <IconCheck size={48} color="green" />
                  <Title order={3}>Assessment Complete!</Title>
                  <Text c="dimmed" ta="center">
                    Review and submit your AT assessment. You can save a draft or submit to the NDIS.
                  </Text>
                  <Group>
                    <Button variant="outline" onClick={handleSaveDraft}>
                      Save Draft
                    </Button>
                    <Button onClick={handleSubmit} size="lg">
                      Submit Assessment
                    </Button>
                  </Group>
                  <Text size="xs" c="dimmed" ta="center" mt="xs">
                    Note: Backend API integration for submission is coming soon.
                    Currently saves to localStorage only.
                  </Text>
                </Stack>
              </Paper>
            </Stepper.Completed>
          </Stepper>

          <Group justify="space-between" mt="xl">
            <Button variant="default" onClick={prevStep} disabled={active === 0}>
              Previous
            </Button>
            <Group>
              <Button variant="subtle" onClick={handleSaveDraft}>
                Save Draft
              </Button>
              {active < 5 ? (
                <Button onClick={nextStep}>
                  Next Step
                </Button>
              ) : (
                <Button onClick={() => setActive(5)}>
                  Review & Submit
                </Button>
              )}
            </Group>
          </Group>
        </Paper>
      </Stack>
    </Container>
  );
}
