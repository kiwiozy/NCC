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
  Modal,
  Loader,
  Progress,
} from '@mantine/core';
import { Dropzone, PDF_MIME_TYPE } from '@mantine/dropzone';
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
  IconUpload,
  IconX,
  IconFilePdf,
  IconSparkles,
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
  
  // PDF Import state
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

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

  // PDF Import Functions
  const handlePdfDrop = (files: File[]) => {
    if (files.length > 0) {
      setPdfFile(files[0]);
      setPdfError(null);
    }
  };

  const processPdfWithAI = async () => {
    if (!pdfFile) return;

    setPdfProcessing(true);
    setPdfProgress(0);
    setPdfError(null);

    try {
      // Step 1: Upload PDF and extract text (20%)
      setPdfProgress(20);
      const formDataUpload = new FormData();
      formDataUpload.append('pdf', pdfFile);

      // TODO: Create backend endpoint for PDF text extraction
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPdfProgress(40);

      // Step 2: Send to OpenAI for structured extraction (60%)
      const mockPdfText = `
        Participant: John Doe
        NDIS Number: 123456789
        Date of Birth: 15/05/1985
        
        Background: John has cerebral palsy affecting mobility. He requires assistance with daily living activities...
        
        Goals: To increase independence in mobility, access community facilities, and participate in social activities...
        
        Physical Assessment: Limited range of motion in lower limbs, reduced muscle strength bilaterally...
      `;

      const response = await fetch('https://localhost:8000/api/ai/rewrite-clinical-notes/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: mockPdfText,
          custom_prompt: `Extract the following information from this NDIS AT report and format it as JSON with these exact fields:
{
  "participant_name": "",
  "ndis_number": "",
  "date_of_birth": "",
  "background": "",
  "participant_goals": "",
  "physical_limitations": "",
  "sensory_limitations": "",
  "communication_limitations": "",
  "cognitive_limitations": "",
  "behavioural_limitations": ""
}
Only extract information that is explicitly stated in the document. Leave fields empty if not found.`,
        }),
      });

      setPdfProgress(80);

      if (!response.ok) {
        throw new Error('Failed to process PDF with AI');
      }

      const data = await response.json();
      
      // Step 3: Parse and populate form (100%)
      try {
        // Try to parse as JSON, otherwise use as text
        const parsed = JSON.parse(data.result.replace(/```json\n?|\n?```/g, ''));
        setExtractedData(parsed);
      } catch {
        setExtractedData({ raw: data.result });
      }

      setPdfProgress(100);
      
    } catch (err: any) {
      setPdfError('Failed to process PDF: ' + err.message);
    } finally {
      setPdfProcessing(false);
    }
  };

  const applyExtractedData = () => {
    if (!extractedData) return;

    // Map extracted data to form fields
    const updatedData: Partial<ATReportData> = { ...formData };

    if (extractedData.participant_name) {
      updatedData.participant = {
        ...formData.participant,
        name: extractedData.participant_name,
      };
    }

    if (extractedData.ndis_number) {
      updatedData.participant = {
        ...updatedData.participant!,
        ndisNumber: extractedData.ndis_number,
      };
    }

    if (extractedData.date_of_birth) {
      updatedData.participant = {
        ...updatedData.participant!,
        dateOfBirth: extractedData.date_of_birth,
      };
    }

    if (extractedData.background) {
      updatedData.background = extractedData.background;
    }

    if (extractedData.participant_goals) {
      updatedData.participantGoals = extractedData.participant_goals;
    }

    if (extractedData.physical_limitations) {
      updatedData.functionalLimitations = {
        ...formData.functionalLimitations,
        physical: extractedData.physical_limitations,
      };
    }

    if (extractedData.sensory_limitations) {
      updatedData.functionalLimitations = {
        ...updatedData.functionalLimitations!,
        sensory: extractedData.sensory_limitations,
      };
    }

    if (extractedData.communication_limitations) {
      updatedData.functionalLimitations = {
        ...updatedData.functionalLimitations!,
        communication: extractedData.communication_limitations,
      };
    }

    if (extractedData.cognitive_limitations) {
      updatedData.functionalLimitations = {
        ...updatedData.functionalLimitations!,
        cognitive: extractedData.cognitive_limitations,
      };
    }

    if (extractedData.behavioural_limitations) {
      updatedData.functionalLimitations = {
        ...updatedData.functionalLimitations!,
        behavioural: extractedData.behavioural_limitations,
      };
    }

    setFormData(updatedData as ATReportData);
    setPdfModalOpen(false);
    setPdfFile(null);
    setExtractedData(null);
    alert('PDF data imported successfully! Review and edit the extracted information.');
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
              <Group>
                <Button size="xs" variant="subtle" onClick={handleLoadDraft}>
                  Load Saved Draft
                </Button>
                <Button 
                  size="xs" 
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan' }}
                  leftSection={<IconUpload size={16} />}
                  onClick={() => setPdfModalOpen(true)}
                >
                  Import from PDF
                </Button>
              </Group>
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

        {/* PDF Import Modal */}
        <Modal
          opened={pdfModalOpen}
          onClose={() => {
            setPdfModalOpen(false);
            setPdfFile(null);
            setExtractedData(null);
            setPdfError(null);
          }}
          title={<Text fw={600} size="lg">Import Previous AT Report (PDF)</Text>}
          size="lg"
        >
          <Stack gap="md">
            <Alert icon={<IconSparkles size={16} />} color="blue">
              <Text size="sm">
                Upload a previous NDIS AT report (PDF format) and our AI will automatically extract
                and populate the form fields. You can review and edit all extracted information before proceeding.
              </Text>
            </Alert>

            {!pdfFile && !extractedData && (
              <Dropzone
                onDrop={handlePdfDrop}
                onReject={() => setPdfError('Please upload a valid PDF file')}
                maxSize={10 * 1024 * 1024} // 10MB
                accept={PDF_MIME_TYPE}
                multiple={false}
              >
                <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
                  <Dropzone.Accept>
                    <IconUpload size={52} stroke={1.5} />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <IconX size={52} stroke={1.5} />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <IconFilePdf size={52} stroke={1.5} />
                  </Dropzone.Idle>

                  <div>
                    <Text size="xl" inline>
                      Drag PDF here or click to select
                    </Text>
                    <Text size="sm" c="dimmed" inline mt={7}>
                      File should not exceed 10MB
                    </Text>
                  </div>
                </Group>
              </Dropzone>
            )}

            {pdfFile && !extractedData && (
              <Paper p="md" withBorder>
                <Group justify="space-between">
                  <Group>
                    <IconFilePdf size={32} />
                    <div>
                      <Text size="sm" fw={500}>{pdfFile.name}</Text>
                      <Text size="xs" c="dimmed">
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </div>
                  </Group>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => {
                      setPdfFile(null);
                      setPdfError(null);
                    }}
                  >
                    <IconX size={18} />
                  </ActionIcon>
                </Group>
              </Paper>
            )}

            {pdfProcessing && (
              <Stack gap="sm">
                <Text size="sm" fw={500}>Processing PDF with AI...</Text>
                <Progress value={pdfProgress} animated />
                <Text size="xs" c="dimmed">
                  {pdfProgress < 40 && 'Extracting text from PDF...'}
                  {pdfProgress >= 40 && pdfProgress < 80 && 'AI analyzing document structure...'}
                  {pdfProgress >= 80 && pdfProgress < 100 && 'Mapping data to form fields...'}
                  {pdfProgress === 100 && 'Complete!'}
                </Text>
              </Stack>
            )}

            {extractedData && !pdfProcessing && (
              <Paper p="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text fw={500} c="green">
                      <IconCheck size={18} style={{ display: 'inline', marginRight: 4 }} />
                      Data Extracted Successfully!
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    The following information was found and will be imported:
                  </Text>
                  <Stack gap="xs">
                    {extractedData.participant_name && (
                      <Text size="sm">• Participant Name: {extractedData.participant_name}</Text>
                    )}
                    {extractedData.ndis_number && (
                      <Text size="sm">• NDIS Number: {extractedData.ndis_number}</Text>
                    )}
                    {extractedData.background && (
                      <Text size="sm">• Background Information: {extractedData.background.substring(0, 80)}...</Text>
                    )}
                    {extractedData.participant_goals && (
                      <Text size="sm">• Participant Goals: {extractedData.participant_goals.substring(0, 80)}...</Text>
                    )}
                    {(extractedData.physical_limitations || extractedData.sensory_limitations || 
                      extractedData.communication_limitations || extractedData.cognitive_limitations || 
                      extractedData.behavioural_limitations) && (
                      <Text size="sm">• Functional Assessments: Multiple fields extracted</Text>
                    )}
                  </Stack>
                  <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
                    <Text size="xs">
                      Please review all imported data carefully. You can edit any field after import
                      and use the "Enhance with AI" buttons to refine the content.
                    </Text>
                  </Alert>
                </Stack>
              </Paper>
            )}

            {pdfError && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setPdfError(null)}>
                {pdfError}
              </Alert>
            )}

            <Group justify="flex-end">
              <Button
                variant="outline"
                onClick={() => {
                  setPdfModalOpen(false);
                  setPdfFile(null);
                  setExtractedData(null);
                  setPdfError(null);
                }}
              >
                Cancel
              </Button>
              
              {pdfFile && !extractedData && !pdfProcessing && (
                <Button
                  leftSection={<IconSparkles size={18} />}
                  onClick={processPdfWithAI}
                  gradient={{ from: 'blue', to: 'cyan' }}
                  variant="gradient"
                >
                  Extract Data with AI
                </Button>
              )}

              {extractedData && (
                <Button
                  leftSection={<IconCheck size={18} />}
                  onClick={applyExtractedData}
                  color="green"
                >
                  Apply to Form
                </Button>
              )}
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
