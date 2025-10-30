'use client';

import {
  Paper,
  Title,
  Stack,
  TextInput,
  Textarea,
  Select,
  Checkbox,
  Grid,
  Text,
  Divider,
} from '@mantine/core';
import { ATReportData } from './types';

interface ATReportPart1Props {
  formData: ATReportData;
  setFormData: (data: ATReportData) => void;
}

export default function ATReportPart1({ formData, setFormData }: ATReportPart1Props) {
  return (
    <Stack gap="md" mt="xl">
      <Title order={3}>Part 1 – Participant and Plan Management Details</Title>
      
      {/* NDIS Participant Details */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">NDIS Participant Details</Title>
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="Participant's full name"
            value={formData.participant.name}
            onChange={(e) => setFormData({
              ...formData,
              participant: { ...formData.participant, name: e.target.value }
            })}
            required
          />
          
          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Date of Birth"
                type="date"
                value={formData.participant.dateOfBirth}
                onChange={(e) => setFormData({
                  ...formData,
                  participant: { ...formData.participant, dateOfBirth: e.target.value }
                })}
                required
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="NDIS Number"
                placeholder="NDIS number"
                value={formData.participant.ndisNumber}
                onChange={(e) => setFormData({
                  ...formData,
                  participant: { ...formData.participant, ndisNumber: e.target.value }
                })}
                required
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Address"
            placeholder="Full address"
            value={formData.participant.address}
            onChange={(e) => setFormData({
              ...formData,
              participant: { ...formData.participant, address: e.target.value }
            })}
            minRows={2}
            required
          />

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Contact Telephone Number"
                placeholder="Phone number"
                value={formData.participant.contactTelephone}
                onChange={(e) => setFormData({
                  ...formData,
                  participant: { ...formData.participant, contactTelephone: e.target.value }
                })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Email Address"
                type="email"
                placeholder="email@example.com"
                value={formData.participant.email}
                onChange={(e) => setFormData({
                  ...formData,
                  participant: { ...formData.participant, email: e.target.value }
                })}
              />
            </Grid.Col>
          </Grid>

          <Select
            label="Preferred Contact Method"
            placeholder="Select method"
            data={['Phone', 'Email', 'SMS', 'Mail']}
            value={formData.participant.preferredContact}
            onChange={(value) => setFormData({
              ...formData,
              participant: { ...formData.participant, preferredContact: value || '' }
            })}
          />

          <Divider label="Nominee or Guardian" labelPosition="center" />

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Nominee or Guardian Name"
                placeholder="Name"
                value={formData.participant.nomineeName}
                onChange={(e) => setFormData({
                  ...formData,
                  participant: { ...formData.participant, nomineeName: e.target.value }
                })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Nominee or Guardian Telephone"
                placeholder="Phone number"
                value={formData.participant.nomineePhone}
                onChange={(e) => setFormData({
                  ...formData,
                  participant: { ...formData.participant, nomineePhone: e.target.value }
                })}
              />
            </Grid.Col>
          </Grid>

          <Divider label="NDIS Support Coordinator" labelPosition="center" />

          <Grid>
            <Grid.Col span={4}>
              <TextInput
                label="Support Coordinator Name"
                placeholder="Name"
                value={formData.participant.coordinatorName}
                onChange={(e) => setFormData({
                  ...formData,
                  participant: { ...formData.participant, coordinatorName: e.target.value }
                })}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput
                label="Support Coordinator Telephone"
                placeholder="Phone number"
                value={formData.participant.coordinatorPhone}
                onChange={(e) => setFormData({
                  ...formData,
                  participant: { ...formData.participant, coordinatorPhone: e.target.value }
                })}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput
                label="Support Coordinator Email"
                type="email"
                placeholder="email@example.com"
                value={formData.participant.coordinatorEmail}
                onChange={(e) => setFormData({
                  ...formData,
                  participant: { ...formData.participant, coordinatorEmail: e.target.value }
                })}
              />
            </Grid.Col>
          </Grid>
        </Stack>
      </Paper>

      {/* Assessor's Details */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Assessor's Details</Title>
        <Stack gap="md">
          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Name"
                placeholder="Assessor's name"
                value={formData.assessor.name}
                onChange={(e) => setFormData({
                  ...formData,
                  assessor: { ...formData.assessor, name: e.target.value }
                })}
                required
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="NDIS Provider Registration Number (if applicable)"
                placeholder="Registration number"
                value={formData.assessor.registrationNumber}
                onChange={(e) => setFormData({
                  ...formData,
                  assessor: { ...formData.assessor, registrationNumber: e.target.value }
                })}
              />
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Telephone Number"
                placeholder="Phone number"
                value={formData.assessor.telephone}
                onChange={(e) => setFormData({
                  ...formData,
                  assessor: { ...formData.assessor, telephone: e.target.value }
                })}
                required
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Email Address"
                type="email"
                placeholder="email@example.com"
                value={formData.assessor.email}
                onChange={(e) => setFormData({
                  ...formData,
                  assessor: { ...formData.assessor, email: e.target.value }
                })}
                required
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Qualifications"
            placeholder="Professional qualifications and certifications"
            value={formData.assessor.qualifications}
            onChange={(e) => setFormData({
              ...formData,
              assessor: { ...formData.assessor, qualifications: e.target.value }
            })}
            minRows={2}
            required
          />

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Date of Assessment"
                type="date"
                value={formData.assessor.assessmentDate}
                onChange={(e) => setFormData({
                  ...formData,
                  assessor: { ...formData.assessor, assessmentDate: e.target.value }
                })}
                required
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Date of Report"
                type="date"
                value={formData.assessor.reportDate}
                onChange={(e) => setFormData({
                  ...formData,
                  assessor: { ...formData.assessor, reportDate: e.target.value }
                })}
                required
              />
            </Grid.Col>
          </Grid>
        </Stack>
      </Paper>

      {/* Plan Management Details */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Plan Management Details</Title>
        <Stack gap="md">
          <Text size="sm" c="dimmed">Select option(s) by checking the box</Text>
          
          <Checkbox
            label="Agency managed"
            checked={formData.planManagement.agencyManaged}
            onChange={(e) => setFormData({
              ...formData,
              planManagement: { ...formData.planManagement, agencyManaged: e.target.checked }
            })}
          />

          <Checkbox
            label="Self-managed"
            checked={formData.planManagement.selfManaged}
            onChange={(e) => setFormData({
              ...formData,
              planManagement: { ...formData.planManagement, selfManaged: e.target.checked }
            })}
          />

          <Checkbox
            label="Registered plan management provider"
            checked={formData.planManagement.planManager}
            onChange={(e) => setFormData({
              ...formData,
              planManagement: { ...formData.planManagement, planManager: e.target.checked }
            })}
          />

          {formData.planManagement.planManager && (
            <Textarea
              label="Plan Manager Contact Details"
              placeholder="Include name, phone, and email"
              value={formData.planManagement.planManagerContact}
              onChange={(e) => setFormData({
                ...formData,
                planManagement: { ...formData.planManagement, planManagerContact: e.target.value }
              })}
              minRows={2}
            />
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

