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
  IconFileTypePdf,
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
      // Step 1: Upload PDF to backend for extraction and AI processing
      setPdfProgress(20);
      const formDataUpload = new FormData();
      formDataUpload.append('pdf_file', pdfFile);
      formDataUpload.append('report_type', 'prosthetics_orthotics'); // Can make this selectable later

      setPdfProgress(40);

      // Call the new backend API endpoint
      const response = await fetch('https://localhost:8000/api/ai/extract-at-report/', {
        method: 'POST',
        body: formDataUpload,
      });

      setPdfProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process PDF with AI');
      }

      const data = await response.json();
      
      // Step 2: Store the extracted data
      if (data.success && data.data) {
        setExtractedData(data.data);
      } else {
        throw new Error('Invalid response from server');
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

    // Map extracted data to form fields (comprehensive P&O mapping)
    const updatedData: Partial<ATReportData> = { ...formData };

    // Part 1 - Participant Details
    if (extractedData.participant_name || extractedData.address || extractedData.contact_telephone || 
        extractedData.email || extractedData.ndis_number || extractedData.date_of_birth ||
        extractedData.preferred_contact || extractedData.nominee_name || extractedData.nominee_phone ||
        extractedData.coordinator_name || extractedData.coordinator_phone || extractedData.coordinator_email) {
      updatedData.participant = {
        ...formData.participant,
        name: extractedData.participant_name || formData.participant.name,
        address: extractedData.address || formData.participant.address,
        contactTelephone: extractedData.contact_telephone || formData.participant.contactTelephone,
        email: extractedData.email || formData.participant.email,
        ndisNumber: extractedData.ndis_number || formData.participant.ndisNumber,
        dateOfBirth: extractedData.date_of_birth || formData.participant.dateOfBirth,
        preferredContact: extractedData.preferred_contact || formData.participant.preferredContact,
        nomineeName: extractedData.nominee_name || formData.participant.nomineeName,
        nomineePhone: extractedData.nominee_phone || formData.participant.nomineePhone,
        coordinatorName: extractedData.coordinator_name || formData.participant.coordinatorName,
        coordinatorPhone: extractedData.coordinator_phone || formData.participant.coordinatorPhone,
        coordinatorEmail: extractedData.coordinator_email || formData.participant.coordinatorEmail,
      };
    }

    // Part 1 - Assessor Details
    if (extractedData.assessor_name || extractedData.assessor_qualifications || extractedData.assessor_telephone ||
        extractedData.assessor_email || extractedData.assessor_registration_number || 
        extractedData.assessment_date || extractedData.report_date) {
      updatedData.assessor = {
        ...formData.assessor,
        name: extractedData.assessor_name || formData.assessor.name,
        qualifications: extractedData.assessor_qualifications || formData.assessor.qualifications,
        telephone: extractedData.assessor_telephone || formData.assessor.telephone,
        email: extractedData.assessor_email || formData.assessor.email,
        registrationNumber: extractedData.assessor_registration_number || formData.assessor.registrationNumber,
        assessmentDate: extractedData.assessment_date || formData.assessor.assessmentDate,
        reportDate: extractedData.report_date || formData.assessor.reportDate,
      };
    }

    // Part 1 - Plan Management
    if (extractedData.plan_managed_agency !== undefined || extractedData.plan_managed_self !== undefined || 
        extractedData.plan_managed_plan_manager !== undefined) {
      updatedData.planManagement = {
        agencyManaged: extractedData.plan_managed_agency || formData.planManagement.agencyManaged,
        selfManaged: extractedData.plan_managed_self || formData.planManagement.selfManaged,
        planManager: extractedData.plan_managed_plan_manager || formData.planManagement.planManager,
        planManagerContact: formData.planManagement.planManagerContact,
      };
    }

    // Part 2 - Background and Goals
    if (extractedData.background) {
      updatedData.background = extractedData.background;
    }
    if (extractedData.participant_goals) {
      updatedData.participantGoals = extractedData.participant_goals;
    }

    // Part 3 - Assessment
    if (extractedData.height) {
      updatedData.height = extractedData.height;
    }
    if (extractedData.weight) {
      updatedData.weight = extractedData.weight;
    }

    // Part 3 - Functional Limitations
    if (extractedData.physical_limitations || extractedData.sensory_limitations || 
        extractedData.communication_limitations || extractedData.cognitive_limitations || 
        extractedData.behavioural_limitations || extractedData.other_limitations) {
      updatedData.functionalLimitations = {
        ...formData.functionalLimitations,
        physical: extractedData.physical_limitations || formData.functionalLimitations.physical,
        sensory: extractedData.sensory_limitations || formData.functionalLimitations.sensory,
        communication: extractedData.communication_limitations || formData.functionalLimitations.communication,
        cognitive: extractedData.cognitive_limitations || formData.functionalLimitations.cognitive,
        behavioural: extractedData.behavioural_limitations || formData.functionalLimitations.behavioural,
        other: extractedData.other_limitations || formData.functionalLimitations.other,
      };
    }

    // Part 5 - Additional P&O Fields
    if (extractedData.provision_timeframe) {
      updatedData.provisionTimeframe = extractedData.provision_timeframe;
    }
    if (extractedData.review_frequency) {
      updatedData.reviewFrequency = extractedData.review_frequency;
    }
    if (extractedData.maintenance_info) {
      updatedData.maintenanceInfo = extractedData.maintenance_info;
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
                    <IconFileTypePdf size={52} stroke={1.5} />
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
                    <IconFileTypePdf size={32} />
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
