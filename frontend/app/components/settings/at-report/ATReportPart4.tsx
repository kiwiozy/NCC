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
} from '@mantine/core';
import { ATReportData } from './types';

interface ATReportPart4Props {
  formData: ATReportData;
  setFormData: (data: ATReportData) => void;
}

export default function ATReportPart4({ formData, setFormData }: ATReportPart4Props) {
  return (
    <Stack gap="md" mt="xl">
      <Title order={3}>Part 4 – AT Implementation and Monitoring</Title>
      
      {/* AT Implementation */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">AT Implementation</Title>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            List the support services required to implement the recommended AT solution. 
            (Quotations are required for funded support from assessors and/or suppliers)
          </Text>

          <Grid>
            <Grid.Col span={12}>
              <Textarea
                label="AT Set-up and Adjustment (Quantity/hrs)"
                placeholder="Describe set-up requirements and estimated hours..."
                value={formData.implementationSupport.setup}
                onChange={(e) => setFormData({
                  ...formData,
                  implementationSupport: { ...formData.implementationSupport, setup: e.target.value }
                })}
                minRows={3}
                autosize
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="Participant/Carer Training (Quantity/hrs)"
                placeholder="Describe training requirements and estimated hours..."
                value={formData.implementationSupport.training}
                onChange={(e) => setFormData({
                  ...formData,
                  implementationSupport: { ...formData.implementationSupport, training: e.target.value }
                })}
                minRows={3}
                autosize
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="Ongoing Re-assessment and Review (Quantity/hrs)"
                placeholder="Describe review requirements and estimated hours..."
                value={formData.implementationSupport.review}
                onChange={(e) => setFormData({
                  ...formData,
                  implementationSupport: { ...formData.implementationSupport, review: e.target.value }
                })}
                minRows={3}
                autosize
              />
            </Grid.Col>
          </Grid>
        </Stack>
      </Paper>

      {/* Ongoing Re-assessment and Review */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Ongoing Re-assessment and Review</Title>
        <Textarea
          label="Review Frequency and Outcomes Measurement"
          description="Provide information on: how you will measure the outcomes that have been achieved, when you will measure these outcomes, the frequency of reviews and who will undertake these."
          placeholder="Describe review plan and outcome measurements..."
          value={formData.reviewFrequency}
          onChange={(e) => setFormData({ ...formData, reviewFrequency: e.target.value })}
          minRows={5}
          autosize
          required
        />
      </Paper>

      {/* Repairs and Maintenance */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Repairs and Maintenance</Title>
        <Stack gap="md">
          <TextInput
            label="Repairs and Maintenance (Estimated Annual Cost)"
            placeholder="Enter estimated annual cost in dollars..."
            value={formData.repairsCost}
            onChange={(e) => setFormData({ ...formData, repairsCost: e.target.value })}
          />

          <Textarea
            label="Maintenance and Servicing Information"
            description="Provide details on: when maintenance will be done, the warranty period that applies to this AT."
            placeholder="Describe maintenance schedule and warranty..."
            value={formData.maintenanceInfo}
            onChange={(e) => setFormData({ ...formData, maintenanceInfo: e.target.value })}
            minRows={3}
            autosize
          />

          <Textarea
            label="Maintenance Coordination"
            description="Who will coordinate setting up maintenance/repair arrangements for the AT solution?"
            placeholder="Identify who will coordinate maintenance..."
            value={formData.maintenanceCoordinator}
            onChange={(e) => setFormData({ ...formData, maintenanceCoordinator: e.target.value })}
            minRows={2}
            autosize
          />
        </Stack>
      </Paper>

      {/* AT Provision */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">AT Provision</Title>
        <Stack gap="md">
          <Textarea
            label="Anticipated Timeframe"
            description="Anticipated time frame from approval of the support in plan funding approval to AT provision"
            placeholder="Describe anticipated timeframe..."
            value={formData.provisionTimeframe}
            onChange={(e) => setFormData({ ...formData, provisionTimeframe: e.target.value })}
            minRows={2}
            autosize
          />

          <Radio.Group
            label="Is the participant at risk while waiting for the AT?"
            value={formData.participantAtRisk}
            onChange={(value) => setFormData({ ...formData, participantAtRisk: value as 'yes' | 'no' })}
          >
            <Group mt="xs">
              <Radio value="yes" label="Yes" />
              <Radio value="no" label="No" />
            </Group>
          </Radio.Group>

          <Radio.Group
            label="Is a short term option necessary?"
            value={formData.shortTermOption}
            onChange={(value) => setFormData({ ...formData, shortTermOption: value as 'yes' | 'no' })}
          >
            <Group mt="xs">
              <Radio value="yes" label="Yes" />
              <Radio value="no" label="No" />
            </Group>
          </Radio.Group>
        </Stack>
      </Paper>

      {/* Participant Agreement */}
      <Paper p="md" withBorder>
        <Title order={4} size="h5" mb="md">Participant Agreement</Title>
        <Stack gap="md">
          <Radio.Group
            label="Is the Participant / Nominee in agreement with this AT request?"
            value={formData.participantAgreement}
            onChange={(value) => setFormData({ ...formData, participantAgreement: value as 'yes' | 'no' })}
            required
          >
            <Group mt="xs">
              <Radio value="yes" label="Yes" />
              <Radio value="no" label="No" />
            </Group>
          </Radio.Group>

          {formData.participantAgreement === 'no' && (
            <Textarea
              label="Please describe any issues"
              placeholder="Describe issues with participant agreement..."
              value={formData.agreementIssues}
              onChange={(e) => setFormData({ ...formData, agreementIssues: e.target.value })}
              minRows={3}
              autosize
            />
          )}

          <Radio.Group
            label="Has a copy of the assessment been given to the participant?"
            value={formData.assessmentGiven}
            onChange={(value) => setFormData({ ...formData, assessmentGiven: value as 'yes' | 'no' })}
            required
          >
            <Group mt="xs">
              <Radio value="yes" label="Yes" />
              <Radio value="no" label="No" />
            </Group>
          </Radio.Group>

          {formData.assessmentGiven === 'no' && (
            <Textarea
              label="If not, please explain"
              placeholder="Explain why assessment was not given..."
              value={formData.assessmentNotGivenReason}
              onChange={(e) => setFormData({ ...formData, assessmentNotGivenReason: e.target.value })}
              minRows={2}
              autosize
            />
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

