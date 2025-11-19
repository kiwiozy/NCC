'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Title,
  Paper,
  Stack,
  Text,
  Button,
  Group,
  Table,
  ActionIcon,
  Badge,
  Modal,
  TextInput,
  Textarea,
  Alert,
  Loader,
  Box,
  Select,
  FileButton,
  Image,
  rem,
  Tabs,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconAlertCircle,
  IconUpload,
  IconX,
  IconUser,
  IconSignature,
  IconMail,
} from '@tabler/icons-react';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import SubScript from '@tiptap/extension-subscript';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';

interface User {
  id: number;
  username: string;
  email: string;
}

interface Clinician {
  id: string;
  full_name: string;
  credential: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  active: boolean;
  user: number | null;
  username: string | null;
  user_email: string | null;
  registration_number: string | null;
  professional_body_url: string | null;
  signature_image: string | null;
  signature_html: string | null;
  signature_url: string | null;
  display_name: string;
  full_credentials_display: string;
}

// Helper to get CSRF token
const getCsrfToken = async (): Promise<string> => {
  // Try to get from cookie first
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  
  if (cookieValue) {
    return cookieValue;
  }
  
  // Fallback: fetch from backend
  try {
    const response = await fetch('https://localhost:8000/api/auth/csrf-token/', {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      return data.csrfToken || '';
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
  
  return '';
};

export default function UserProfiles() {
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingClinician, setEditingClinician] = useState<Clinician | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('details');
  
  // Form state
  const [formFullName, setFormFullName] = useState('');
  const [formCredential, setFormCredential] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<string | null>(null);
  const [formActive, setFormActive] = useState(true);
  const [formUser, setFormUser] = useState<string | null>(null);
  const [formRegistrationNumber, setFormRegistrationNumber] = useState('');
  const [formProfessionalBodyUrl, setFormProfessionalBodyUrl] = useState('');
  const [formSignatureImage, setFormSignatureImage] = useState<File | null>(null);
  const [formSignatureHtml, setFormSignatureHtml] = useState('');
  const [signatureImagePreview, setSignatureImagePreview] = useState<string | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const resetButtonRef = useRef<() => void>(null);

  // HTML signature editor
  const htmlSignatureEditor = useEditor({
    extensions: [
      StarterKit, // Already includes Link, Bold, Italic, Strike, Code, etc.
      Link, // From @mantine/tiptap
      Superscript,
      SubScript,
      Highlight,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: formSignatureHtml,
    immediatelyRender: false, // Fix SSR/hydration issues with Next.js
    onUpdate: ({ editor }) => {
      setFormSignatureHtml(editor.getHTML());
    },
  });

  useEffect(() => {
    fetchClinicians();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (htmlSignatureEditor && formSignatureHtml !== htmlSignatureEditor.getHTML()) {
      htmlSignatureEditor.commands.setContent(formSignatureHtml);
    }
  }, [formSignatureHtml, htmlSignatureEditor]);

  const fetchClinicians = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://localhost:8000/api/clinicians/', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load user profiles');
      }
      const data = await response.json();
      const cliniciansList = data.results || data;
      setClinicians(cliniciansList.sort((a: Clinician, b: Clinician) => 
        a.full_name.localeCompare(b.full_name)
      ));
    } catch (err: any) {
      console.error('Error loading user profiles:', err);
      setError('Failed to load user profiles: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/auth/users/', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      // Non-critical error, don't show to user
    }
  };

  const handleAdd = () => {
    setEditingClinician(null);
    resetForm();
    setModalOpen(true);
    setActiveTab('details');
  };

  const handleEdit = (clinician: Clinician) => {
    setEditingClinician(clinician);
    setFormFullName(clinician.full_name);
    setFormCredential(clinician.credential || '');
    setFormEmail(clinician.email || '');
    setFormPhone(clinician.phone || '');
    setFormRole(clinician.role);
    setFormActive(clinician.active);
    setFormUser(clinician.user ? String(clinician.user) : null);
    setFormRegistrationNumber(clinician.registration_number || '');
    setFormProfessionalBodyUrl(clinician.professional_body_url || '');
    setFormSignatureHtml(clinician.signature_html || '');
    setSignatureImagePreview(clinician.signature_url || null);
    setFormSignatureImage(null);
    setModalOpen(true);
    setActiveTab('details');
  };

  const resetForm = () => {
    setFormFullName('');
    setFormCredential('');
    setFormEmail('');
    setFormPhone('');
    setFormRole(null);
    setFormActive(true);
    setFormUser(null);
    setFormRegistrationNumber('');
    setFormProfessionalBodyUrl('');
    setFormSignatureHtml('');
    setSignatureImagePreview(null);
    setFormSignatureImage(null);
    if (htmlSignatureEditor) {
      htmlSignatureEditor.commands.setContent('');
    }
  };

  const handleSignatureImageSelect = (file: File | null) => {
    if (file) {
      setFormSignatureImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatureImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadSignatureToS3 = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', 'signature');

    const csrfToken = await getCsrfToken();

    const response = await fetch('https://localhost:8000/api/documents/upload/', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.detail || errorData.error || 'Failed to upload signature image');
    }

    const data = await response.json();
    return data.s3_key; // Return the S3 key
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Validation
    if (!formFullName.trim()) {
      setError('Full name is required');
      return;
    }

    try {
      setLoading(true);

      // Upload signature image if a new one was selected
      let signatureS3Key = editingClinician?.signature_image || null;
      if (formSignatureImage) {
        setUploadingSignature(true);
        signatureS3Key = await uploadSignatureToS3(formSignatureImage);
        setUploadingSignature(false);
      }

      const payload = {
        full_name: formFullName,
        credential: formCredential || null,
        email: formEmail || null,
        phone: formPhone || null,
        role: formRole || null,
        active: formActive,
        user: formUser ? parseInt(formUser) : null,
        registration_number: formRegistrationNumber || null,
        professional_body_url: formProfessionalBodyUrl || null,
        signature_image: signatureS3Key,
        signature_html: formSignatureHtml || null,
      };

      const url = editingClinician
        ? `https://localhost:8000/api/clinicians/${editingClinician.id}/`
        : 'https://localhost:8000/api/clinicians/';
      
      const method = editingClinician ? 'PUT' : 'POST';

      // Get CSRF token for POST/PUT requests
      const csrfToken = await getCsrfToken();

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save user profile';
        try {
          const errorData = await response.json();
          
          // Handle specific HTTP status codes
          if (response.status === 403) {
            errorMessage = errorData.detail || 'Permission denied. You may not have permission to perform this action.';
          } else if (response.status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          } else {
            // Show detailed validation errors if available
            errorMessage = errorData.detail 
              || (errorData.non_field_errors && errorData.non_field_errors.join(', '))
              || JSON.stringify(errorData);
          }
        } catch {
          // JSON parsing failed, use generic message
          if (response.status === 403) {
            errorMessage = 'Permission denied. Only administrators can create or modify user profiles.';
          } else if (response.status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          }
        }
        throw new Error(errorMessage);
      }

      setSuccess(editingClinician ? 'User profile updated successfully' : 'User profile created successfully');
      setModalOpen(false);
      await fetchClinicians();
      resetForm();
    } catch (err: any) {
      console.error('Error saving user profile:', err);
      setError(err.message || 'Failed to save user profile');
    } finally {
      setLoading(false);
      setUploadingSignature(false);
    }
  };

  const handleDeleteConfirm = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpened(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setError(null);
    setSuccess(null);

    try {
      setLoading(true);
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/clinicians/${itemToDelete}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        // Try to get detailed error message from backend
        let errorMessage = 'Failed to delete user profile';
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // If JSON parsing fails, use status text
          if (response.status === 403) {
            errorMessage = 'Permission denied. Only administrators can delete user profiles.';
          } else if (response.status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          }
        }
        throw new Error(errorMessage);
      }

      setSuccess('User profile deleted successfully');
      setDeleteConfirmOpened(false);
      setItemToDelete(null);
      await fetchClinicians();
    } catch (err: any) {
      console.error('Error deleting user profile:', err);
      setError(err.message || 'Failed to delete user profile');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'PEDORTHIST', label: 'Pedorthist' },
    { value: 'ADMIN', label: 'Administrator' },
    { value: 'RECEPTION', label: 'Reception' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'OTHER', label: 'Other' },
  ];

  const userOptions = users.map((user) => ({
    value: String(user.id),
    label: `${user.username} (${user.email})`,
  }));

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>User Profiles</Title>
            <Text c="dimmed" size="sm">
              Manage user profiles with professional credentials and signatures
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={handleAdd}>
            Add User
          </Button>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert icon={<IconCheck size={16} />} title="Success" color="green" withCloseButton onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {loading && !modalOpen ? (
          <Box style={{ textAlign: 'center', padding: rem(40) }}>
            <Loader size="lg" />
          </Box>
        ) : (
          <Paper withBorder p="md">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Registration</Table.Th>
                  <Table.Th>Login Account</Table.Th>
                  <Table.Th>Signature</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {clinicians.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7} style={{ textAlign: 'center', padding: rem(20) }}>
                      <Text c="dimmed">No user profiles yet. Click "Add User" to create one.</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  clinicians.map((clinician) => (
                    <Table.Tr key={clinician.id}>
                      <Table.Td>
                        <Stack gap={4}>
                          <Text fw={500}>{clinician.display_name}</Text>
                          {clinician.email && (
                            <Text size="xs" c="dimmed">
                              {clinician.email}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        {clinician.role ? (
                          <Badge size="sm" variant="light">
                            {roleOptions.find((r) => r.value === clinician.role)?.label || clinician.role}
                          </Badge>
                        ) : (
                          <Text c="dimmed" size="sm">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {clinician.registration_number ? (
                          <Stack gap={2}>
                            <Text size="sm">{clinician.registration_number}</Text>
                            {clinician.professional_body_url && (
                              <Text size="xs" c="dimmed">
                                {clinician.professional_body_url}
                              </Text>
                            )}
                          </Stack>
                        ) : (
                          <Text c="dimmed" size="sm">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {clinician.username ? (
                          <Stack gap={2}>
                            <Text size="sm">{clinician.username}</Text>
                            {clinician.user_email && (
                              <Text size="xs" c="dimmed">
                                {clinician.user_email}
                              </Text>
                            )}
                          </Stack>
                        ) : (
                          <Badge size="sm" color="gray" variant="light">
                            No login
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {clinician.signature_image && (
                            <Badge size="sm" color="blue" variant="light" leftSection={<IconSignature size={12} />}>
                              Image
                            </Badge>
                          )}
                          {clinician.signature_html && (
                            <Badge size="sm" color="green" variant="light" leftSection={<IconMail size={12} />}>
                              HTML
                            </Badge>
                          )}
                          {!clinician.signature_image && !clinician.signature_html && (
                            <Text c="dimmed" size="sm">
                              —
                            </Text>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={clinician.active ? 'green' : 'gray'} size="sm">
                          {clinician.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(clinician)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => handleDeleteConfirm(clinician.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          <Group gap="xs">
            <IconUser size={22} />
            <Text fw={600} size="lg">
              {editingClinician ? 'Edit User Profile' : 'Add User Profile'}
            </Text>
          </Group>
        }
        size="xl"
        padding="xl"
        styles={{
          title: { fontWeight: 600, fontSize: 18 },
          body: { paddingTop: 20 }
        }}
      >
        <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
          <Tabs.List mb="xl">
            <Tabs.Tab value="details" leftSection={<IconUser size={16} />}>
              Details
            </Tabs.Tab>
            <Tabs.Tab value="signature-image" leftSection={<IconSignature size={16} />}>
              Image Signature
            </Tabs.Tab>
            <Tabs.Tab value="signature-html" leftSection={<IconMail size={16} />}>
              Email Signature
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="details" pt="xl">
            <Stack gap="xl">
              {/* Personal Information Section */}
              <Box>
                <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                  Personal Information
                </Text>
                <Stack gap="lg">
                  <TextInput
                    label="Full Name"
                    placeholder="Dr. Jane Smith"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.currentTarget.value)}
                    required
                    size="md"
                    styles={{
                      label: { fontWeight: 500, marginBottom: 8 },
                      input: { fontSize: 15 }
                    }}
                  />

                  <TextInput
                    label="Professional Credentials"
                    placeholder="C.Ped CM Au"
                    description="Displayed after your name (e.g., CPed CM au)"
                    value={formCredential}
                    onChange={(e) => setFormCredential(e.currentTarget.value)}
                    size="md"
                    styles={{
                      label: { fontWeight: 500, marginBottom: 8 },
                      input: { fontSize: 15 },
                      description: { fontSize: 13, marginTop: 6 }
                    }}
                  />
                </Stack>
              </Box>

              {/* Professional Details Section */}
              <Box>
                <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                  Professional Details
                </Text>
                <Stack gap="lg">
                  <TextInput
                    label="Registration Number"
                    placeholder="Pedorthic Registration # 3454"
                    description="Your professional registration or license number"
                    value={formRegistrationNumber}
                    onChange={(e) => setFormRegistrationNumber(e.currentTarget.value)}
                    size="md"
                    styles={{
                      label: { fontWeight: 500, marginBottom: 8 },
                      input: { fontSize: 15 },
                      description: { fontSize: 13, marginTop: 6 }
                    }}
                  />

                  <TextInput
                    label="Professional Body URL"
                    placeholder="www.pedorthics.org.au"
                    description="Website of your professional association"
                    value={formProfessionalBodyUrl}
                    onChange={(e) => setFormProfessionalBodyUrl(e.currentTarget.value)}
                    size="md"
                    styles={{
                      label: { fontWeight: 500, marginBottom: 8 },
                      input: { fontSize: 15 },
                      description: { fontSize: 13, marginTop: 6 }
                    }}
                  />

                  <Select
                    label="Role"
                    placeholder="Select role"
                    description="Your role in the organization"
                    data={roleOptions}
                    value={formRole}
                    onChange={setFormRole}
                    clearable
                    size="md"
                    styles={{
                      label: { fontWeight: 500, marginBottom: 8 },
                      input: { fontSize: 15 },
                      description: { fontSize: 13, marginTop: 6 }
                    }}
                  />
                </Stack>
              </Box>

              {/* Contact Information Section */}
              <Box>
                <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                  Contact Information
                </Text>
                <Stack gap="lg">
                  <TextInput
                    label="Email"
                    placeholder="jane@walkeasy.com.au"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.currentTarget.value)}
                    size="md"
                    styles={{
                      label: { fontWeight: 500, marginBottom: 8 },
                      input: { fontSize: 15 }
                    }}
                  />

                  <TextInput
                    label="Phone"
                    placeholder="+61 412 345 678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.currentTarget.value)}
                    size="md"
                    styles={{
                      label: { fontWeight: 500, marginBottom: 8 },
                      input: { fontSize: 15 }
                    }}
                  />
                </Stack>
              </Box>

              {/* System Access Section */}
              <Box>
                <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                  System Access
                </Text>
                <Select
                  label="Link to User Account"
                  placeholder="Select user account (optional)"
                  description="Link this profile to a login account for system access"
                  data={userOptions}
                  value={formUser}
                  onChange={setFormUser}
                  searchable
                  clearable
                  size="md"
                  styles={{
                    label: { fontWeight: 500, marginBottom: 8 },
                    input: { fontSize: 15 },
                    description: { fontSize: 13, marginTop: 6 }
                  }}
                />
              </Box>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="signature-image" pt="xl">
            <Stack gap="xl">
              <Box>
                <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                  Upload a professional signature image to be included in patient letters and PDF documents. 
                  For best results, use a PNG file with a transparent background.
                </Text>
              </Box>

              {signatureImagePreview && (
                <Box>
                  <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                    Preview
                  </Text>
                  <Paper withBorder p="xl" style={{ display: 'inline-block', backgroundColor: 'var(--mantine-color-gray-0)' }}>
                    <Image
                      src={signatureImagePreview}
                      alt="Signature preview"
                      style={{ maxWidth: '400px', maxHeight: '150px' }}
                      fit="contain"
                    />
                  </Paper>
                  <Group mt="md">
                    <Button
                      variant="subtle"
                      color="red"
                      size="sm"
                      leftSection={<IconX size={16} />}
                      onClick={() => {
                        setSignatureImagePreview(null);
                        setFormSignatureImage(null);
                        if (resetButtonRef.current) {
                          resetButtonRef.current();
                        }
                      }}
                    >
                      Remove Image
                    </Button>
                  </Group>
                </Box>
              )}

              <Box>
                <FileButton
                  onChange={handleSignatureImageSelect}
                  accept="image/png,image/jpeg,image/jpg"
                  resetRef={resetButtonRef}
                >
                  {(props) => (
                    <Button
                      {...props}
                      leftSection={<IconUpload size={18} />}
                      variant={signatureImagePreview ? "light" : "filled"}
                      size="md"
                      loading={uploadingSignature}
                    >
                      {signatureImagePreview ? 'Change Signature Image' : 'Upload Signature Image'}
                    </Button>
                  )}
                </FileButton>
              </Box>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="signature-html" pt="xl">
            <Stack gap="xl">
              <Box>
                <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                  Create a rich text email signature that will be automatically included in emails sent from the system. 
                  You can format text, add links, and include contact information.
                </Text>
              </Box>

              {htmlSignatureEditor ? (
                <Box>
                  <RichTextEditor editor={htmlSignatureEditor}>
                    <RichTextEditor.Toolbar sticky stickyOffset={60}>
                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Bold />
                        <RichTextEditor.Italic />
                        <RichTextEditor.Underline />
                        <RichTextEditor.Strikethrough />
                        <RichTextEditor.ClearFormatting />
                        <RichTextEditor.Highlight />
                        <RichTextEditor.Code />
                      </RichTextEditor.ControlsGroup>

                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.H1 />
                        <RichTextEditor.H2 />
                        <RichTextEditor.H3 />
                        <RichTextEditor.H4 />
                      </RichTextEditor.ControlsGroup>

                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Blockquote />
                        <RichTextEditor.Hr />
                        <RichTextEditor.BulletList />
                        <RichTextEditor.OrderedList />
                        <RichTextEditor.Subscript />
                        <RichTextEditor.Superscript />
                      </RichTextEditor.ControlsGroup>

                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Link />
                        <RichTextEditor.Unlink />
                      </RichTextEditor.ControlsGroup>

                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.AlignLeft />
                        <RichTextEditor.AlignCenter />
                        <RichTextEditor.AlignJustify />
                        <RichTextEditor.AlignRight />
                      </RichTextEditor.ControlsGroup>
                    </RichTextEditor.Toolbar>

                    <RichTextEditor.Content style={{ minHeight: rem(250), fontSize: 14 }} />
                  </RichTextEditor>
                </Box>
              ) : (
                <Box style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader size="md" />
                  <Text size="sm" c="dimmed" mt="md">Loading editor...</Text>
                </Box>
              )}

              {formSignatureHtml && (
                <Box>
                  <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                    Preview
                  </Text>
                  <Paper withBorder p="xl" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                    <div dangerouslySetInnerHTML={{ __html: formSignatureHtml }} />
                  </Paper>
                </Box>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Group justify="space-between" mt="xl" pt="xl" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
          <Button 
            variant="subtle" 
            onClick={() => setModalOpen(false)}
            size="md"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            loading={loading}
            size="md"
            leftSection={<IconCheck size={18} />}
          >
            {editingClinician ? 'Update Profile' : 'Create Profile'}
          </Button>
        </Group>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteConfirmOpened}
        onClose={() => setDeleteConfirmOpened(false)}
        title="Confirm Delete"
        size="sm"
      >
        <Stack gap="md">
          <Text>Are you sure you want to delete this user profile? This action cannot be undone.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteConfirmOpened(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={loading}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

