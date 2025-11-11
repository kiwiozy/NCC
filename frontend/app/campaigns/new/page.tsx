/**
 * Email Campaign Builder - Create/Edit campaigns with drag-and-drop
 * URL: /campaigns/new or /campaigns/[id]/edit
 * 
 * Features:
 * - Drag & drop email components from palette
 * - Live preview
 * - Component customization
 * - Template selection
 * - Recipient selection
 * - Schedule or send immediately
 */

'use client';

import { useState } from 'react';
import {
  AppShell,
  Container,
  Title,
  Button,
  Group,
  Card,
  Text,
  TextInput,
  Select,
  Stack,
  Tabs,
  Paper,
  ActionIcon,
  ScrollArea,
  Divider,
  Badge,
  Box,
} from '@mantine/core';
import {
  IconDeviceFloppy,
  IconSend,
  IconEye,
  IconPlus,
  IconGripVertical,
  IconTrash,
  IconSettings,
  IconPhoto,
  IconLink,
  IconMail,
} from '@tabler/icons-react';

export default function CampaignBuilderPage() {
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [recipients, setRecipients] = useState<string | null>('all');
  const [activeTab, setActiveTab] = useState<string | null>('build');

  // Email components that can be dragged
  const componentPalette = [
    { id: 'header', label: 'Header', icon: IconMail, category: 'basic' },
    { id: 'text', label: 'Text Block', icon: IconMail, category: 'basic' },
    { id: 'image', label: 'Image', icon: IconPhoto, category: 'basic' },
    { id: 'button', label: 'Button', icon: IconLink, category: 'basic' },
    { id: 'divider', label: 'Divider', icon: IconMail, category: 'layout' },
    { id: '2-column', label: '2 Columns', icon: IconMail, category: 'layout' },
    { id: '3-column', label: '3 Columns', icon: IconMail, category: 'layout' },
    { id: 'social', label: 'Social Links', icon: IconLink, category: 'media' },
  ];

  // Mock email canvas (will be drag-drop later)
  const [emailComponents, setEmailComponents] = useState([
    { id: '1', type: 'header', content: 'Walk Easy Clinic' },
    { id: '2', type: 'text', content: 'Hi {{first_name}},' },
    { id: '3', type: 'text', content: 'Your monthly health update is here...' },
    { id: '4', type: 'button', content: 'Learn More', link: '#' },
  ]);

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ width: 280, breakpoint: 'sm' }}
      aside={{ width: 320, breakpoint: 'lg' }}
      padding="md"
    >
      {/* Header */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Title order={3}>Email Campaign Builder</Title>
            <Badge color="gray" variant="light">Draft</Badge>
          </Group>
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconEye size={16} />}
              onClick={() => alert('Preview email')}
            >
              Preview
            </Button>
            <Button
              variant="light"
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={() => alert('Save draft')}
            >
              Save Draft
            </Button>
            <Button
              leftSection={<IconSend size={16} />}
              onClick={() => alert('Send campaign')}
            >
              Send Campaign
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Left Sidebar - Component Palette */}
      <AppShell.Navbar p="md">
        <Stack gap="md">
          <div>
            <Text size="sm" fw={600} mb="xs">Campaign Details</Text>
            <TextInput
              label="Campaign Name"
              placeholder="Monthly Newsletter"
              value={campaignName}
              onChange={(e) => setCampaignName(e.currentTarget.value)}
              mb="sm"
            />
            <TextInput
              label="Subject Line"
              placeholder="Your health update for November"
              value={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
              mb="sm"
            />
            <Select
              label="Recipients"
              placeholder="Select recipient group"
              value={recipients}
              onChange={setRecipients}
              data={[
                { value: 'all', label: 'All active patients (245)' },
                { value: 'recent', label: 'Recent patients (120)' },
                { value: 'custom', label: 'Custom segment' },
              ]}
            />
          </div>

          <Divider />

          <div>
            <Text size="sm" fw={600} mb="xs">Email Components</Text>
            <Text size="xs" c="dimmed" mb="md">
              Drag components to the canvas
            </Text>
            
            <ScrollArea h={400}>
              <Stack gap="xs">
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" mt="md">Basic</Text>
                {componentPalette.filter(c => c.category === 'basic').map((component) => (
                  <Paper
                    key={component.id}
                    p="sm"
                    withBorder
                    style={{ cursor: 'grab' }}
                    onDragStart={() => alert(`Dragging ${component.label}`)}
                    draggable
                  >
                    <Group gap="xs">
                      <IconGripVertical size={16} color="gray" />
                      <component.icon size={16} />
                      <Text size="sm">{component.label}</Text>
                    </Group>
                  </Paper>
                ))}

                <Text size="xs" fw={600} c="dimmed" tt="uppercase" mt="md">Layout</Text>
                {componentPalette.filter(c => c.category === 'layout').map((component) => (
                  <Paper
                    key={component.id}
                    p="sm"
                    withBorder
                    style={{ cursor: 'grab' }}
                    onDragStart={() => alert(`Dragging ${component.label}`)}
                    draggable
                  >
                    <Group gap="xs">
                      <IconGripVertical size={16} color="gray" />
                      <component.icon size={16} />
                      <Text size="sm">{component.label}</Text>
                    </Group>
                  </Paper>
                ))}

                <Text size="xs" fw={600} c="dimmed" tt="uppercase" mt="md">Media</Text>
                {componentPalette.filter(c => c.category === 'media').map((component) => (
                  <Paper
                    key={component.id}
                    p="sm"
                    withBorder
                    style={{ cursor: 'grab' }}
                    onDragStart={() => alert(`Dragging ${component.label}`)}
                    draggable
                  >
                    <Group gap="xs">
                      <IconGripVertical size={16} color="gray" />
                      <component.icon size={16} />
                      <Text size="sm">{component.label}</Text>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>
          </div>

          <Divider />

          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={() => alert('Load template')}
          >
            Load Template
          </Button>
        </Stack>
      </AppShell.Navbar>

      {/* Main Content - Email Canvas */}
      <AppShell.Main>
        <Container size="md">
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="build">Build</Tabs.Tab>
              <Tabs.Tab value="preview">Preview</Tabs.Tab>
              <Tabs.Tab value="settings">Settings</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="build" pt="md">
              <Paper shadow="sm" p="md" withBorder style={{ minHeight: 600 }}>
                <Text size="xs" c="dimmed" mb="md">
                  Drop components here or click + to add
                </Text>

                <Stack gap="md">
                  {emailComponents.map((component, index) => (
                    <Card key={component.id} withBorder>
                      <Group justify="space-between">
                        <Group>
                          <ActionIcon variant="subtle" style={{ cursor: 'grab' }}>
                            <IconGripVertical size={16} />
                          </ActionIcon>
                          <div>
                            <Text size="xs" c="dimmed">{component.type}</Text>
                            <Text size="sm">{component.content}</Text>
                          </div>
                        </Group>
                        <Group gap="xs">
                          <ActionIcon
                            variant="subtle"
                            onClick={() => alert(`Edit component ${component.id}`)}
                          >
                            <IconSettings size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => alert(`Delete component ${component.id}`)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Card>
                  ))}

                  <Button
                    variant="light"
                    fullWidth
                    leftSection={<IconPlus size={16} />}
                    onClick={() => alert('Add component')}
                  >
                    Add Component
                  </Button>
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="preview" pt="md">
              <Paper shadow="sm" p="xl" withBorder style={{ minHeight: 600, backgroundColor: '#f5f5f5' }}>
                <Box bg="white" p="xl" style={{ maxWidth: 600, margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <Text size="xl" fw={700} mb="md">Walk Easy Clinic</Text>
                  <Text mb="md">Hi Craig,</Text>
                  <Text mb="md">Your monthly health update is here...</Text>
                  <Button fullWidth>Learn More</Button>
                  <Divider my="xl" />
                  <Text size="xs" c="dimmed" ta="center">
                    Walk Easy Clinic | Unsubscribe | View in browser
                  </Text>
                </Box>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="settings" pt="md">
              <Paper shadow="sm" p="md" withBorder>
                <Stack>
                  <TextInput
                    label="From Name"
                    placeholder="Walk Easy Clinic"
                    description="Name that appears in recipient's inbox"
                  />
                  <TextInput
                    label="From Email"
                    placeholder="info@walkeasy.com.au"
                    description="Reply-to email address"
                  />
                  <TextInput
                    label="Preview Text"
                    placeholder="Your monthly health update..."
                    description="Text shown in email preview"
                  />
                  <Select
                    label="Schedule"
                    placeholder="Send immediately"
                    data={[
                      { value: 'now', label: 'Send immediately' },
                      { value: 'schedule', label: 'Schedule for later' },
                    ]}
                  />
                </Stack>
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>

      {/* Right Sidebar - Component Properties */}
      <AppShell.Aside p="md">
        <Stack gap="md">
          <div>
            <Text size="sm" fw={600} mb="xs">Component Properties</Text>
            <Text size="xs" c="dimmed" mb="md">
              Select a component to edit its properties
            </Text>
            
            <Paper p="md" withBorder>
              <Text size="xs" c="dimmed" ta="center" py="xl">
                No component selected
              </Text>
            </Paper>
          </div>

          <Divider />

          <div>
            <Text size="sm" fw={600} mb="xs">Variables</Text>
            <Text size="xs" c="dimmed" mb="md">
              Use these in your email content
            </Text>
            
            <Stack gap="xs">
              <Paper p="xs" withBorder>
                <Text size="xs" ff="monospace">{'{{first_name}}'}</Text>
              </Paper>
              <Paper p="xs" withBorder>
                <Text size="xs" ff="monospace">{'{{last_name}}'}</Text>
              </Paper>
              <Paper p="xs" withBorder>
                <Text size="xs" ff="monospace">{'{{email}}'}</Text>
              </Paper>
            </Stack>
          </div>
        </Stack>
      </AppShell.Aside>
    </AppShell>
  );
}

