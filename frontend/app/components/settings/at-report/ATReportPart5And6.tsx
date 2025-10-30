'use client';

import {
  Paper,
  Title,
  Stack,
  Textarea,
  Grid,
  TextInput,
  Radio,
  Group,
  Text,
  Checkbox,
  Divider,
  Alert,
} from '@mantine/core';
import { IconAlertCircle, IconSignature } from '@tabler/icons-react';
import { ATReportData } from './types';

interface ATReportPart5And6Props {
  formData: ATReportData;
  setFormData: (data: ATReportData) => void;
}

export default function ATReportPart5And6({ formData, setFormData }: ATReportPart5And6Props) {
  return (
    <Stack gap="md" mt="xl">
      <Title order={3}>Part 5 & 6 – Assessor Declaration and Consent</Title>
      
      {/* Part 5 - Details of AT Assessor */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Part 5 – Details of AT Assessor</Title>
        <Stack gap="md">
          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            Assessor's Declaration: Please review and confirm the following statements
          </Alert>

          <Checkbox
            label={
              <div>
                <Text size="sm" fw={500}>I certify that I meet the NDIA expectations of suitably qualified Allied Health Professional</Text>
                <Text size="xs" c="dimmed">
                  Including understanding of the current NDIS Act, Rules and Operational Guidelines to assess the type of AT 
                  and associated supports, at the level of complexity required by this participant.
                </Text>
              </div>
            }
            checked={formData.assessorDeclaration}
            onChange={(e) => setFormData({ ...formData, assessorDeclaration: e.target.checked })}
            required
          />

          <Text size="sm" c="dimmed">
            • I will provide appropriate evidence to the NDIA and NDIS Quality and Safeguards Commission if and as requested.
          </Text>

          <Text size="sm" c="dimmed">
            • I understand and acknowledge that the NDIA and participant will rely on my professional advice to select, 
            source and implement this AT.
          </Text>

          <Text size="sm" c="dimmed">
            • This AT has been assessed by the treating multi-disciplinary team and I have completed the AT assessment on behalf of that team.
          </Text>

          <Divider my="md" />

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Assessor Name"
                placeholder="Enter assessor name"
                value={formData.assessorName}
                onChange={(e) => setFormData({ ...formData, assessorName: e.target.value })}
                required
                leftSection={<IconSignature size={16} />}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Date of Declaration"
                type="date"
                value={formData.declarationDate}
                onChange={(e) => setFormData({ ...formData, declarationDate: e.target.value })}
                required
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Signature"
            description="In production, this would be a signature pad. For now, type your full name as electronic signature."
            placeholder="Type your full name as signature..."
            value={formData.assessorSignature}
            onChange={(e) => setFormData({ ...formData, assessorSignature: e.target.value })}
            required
          />
        </Stack>
      </Paper>

      {/* Part 6 - Consent to Collect and Share Information */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Part 6 – Consent to Collect and Share Your Information</Title>
        <Stack gap="md">
          <Alert icon={<IconAlertCircle size={16} />} title="Participant's Consent" color="blue">
            <Text size="sm">
              As a participant who requires AT supports, the National Disability Insurance Agency (NDIA) may need to 
              contact your AT assessor and/or AT supplier to discuss information within your AT assessment and quotation(s).
            </Text>
            <Text size="sm" mt="xs">
              This will assist the NDIA with determining whether your request for AT support(s) can be provided to you under the NDIS.
            </Text>
          </Alert>

          <Radio.Group
            label="Do you consent to the NDIA collecting and disclosing your information including from these third parties mentioned above, in relation to your AT assessment and quotation?"
            value={formData.consentGiven}
            onChange={(value) => setFormData({ ...formData, consentGiven: value as 'yes' | 'no' })}
            required
          >
            <Group mt="xs">
              <Radio value="yes" label="Yes, I do consent" />
              <Radio value="no" label="No, I do not consent" />
            </Group>
          </Radio.Group>

          <Divider label="Participant's Signature" labelPosition="center" my="md" />

          <Text size="sm" c="dimmed">
            I understand that I am giving consent to the NDIA to do the things with my information set out in this section. 
            I understand that I can withdraw my consent for the NDIS to do things with my information at any time by letting the NDIA know.
          </Text>

          <Text size="sm" c="dimmed">
            I understand that I can access the NDIA's Privacy Notice and Privacy Policy on the NDIA website or by contacting the NDIA.
          </Text>

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Full Name"
                placeholder="Participant's full name"
                value={formData.consentFullName}
                onChange={(e) => setFormData({ ...formData, consentFullName: e.target.value })}
                required
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Date"
                type="date"
                value={formData.consentDate}
                onChange={(e) => setFormData({ ...formData, consentDate: e.target.value })}
                required
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Signature"
            description="In production, this would be a signature pad. For now, type the participant's full name as electronic signature."
            placeholder="Type full name as signature..."
            value={formData.consentSignature}
            onChange={(e) => setFormData({ ...formData, consentSignature: e.target.value })}
            required
          />

          <Divider label="If signed by Representative" labelPosition="center" my="md" />

          <Text size="sm" c="dimmed">
            Please complete the details below if you have signed this form on behalf of the NDIS participant. 
            You need to be an authorised representative to act on the person's behalf for NDIS matters. 
            It is an offence to provide false or misleading information.
          </Text>

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Representative's Full Name"
                placeholder="Name of person completing this form"
                value={formData.representativeName}
                onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Relationship to Participant"
                placeholder="e.g., Parent, Guardian, Nominee"
                value={formData.representativeRelation}
                onChange={(e) => setFormData({ ...formData, representativeRelation: e.target.value })}
              />
            </Grid.Col>
          </Grid>

          <Divider my="md" />

          <Alert icon={<IconAlertCircle size={16} />} title="Privacy and Your Personal Information" color="gray">
            <Stack gap="xs">
              <Text size="sm" fw={500}>Collection of your personal information</Text>
              <Text size="xs">
                The National Disability Insurance Agency (NDIA) would like some personal information from you to simplify 
                your engagement with the NDIS. Any personal information you provide to the NDIA is safe under the National 
                Disability Insurance Scheme Act 2013 and the Privacy Act 1988.
              </Text>

              <Text size="sm" fw={500} mt="xs">Personal information use and disclosure</Text>
              <Text size="xs">
                The NDIA will use your information to support your involvement in the NDIS. The NDIA will NOT use any of 
                your personal information for any other purpose, or disclose your personal information to any other 
                organisations or individuals (including any overseas recipients), unless authorised by law or you provide 
                your consent for us to do so.
              </Text>

              <Text size="xs" mt="xs">
                You can read the full privacy policy at: https://www.ndis.gov.au/about-us/policies/privacy
              </Text>
            </Stack>
          </Alert>
        </Stack>
      </Paper>
    </Stack>
  );
}

