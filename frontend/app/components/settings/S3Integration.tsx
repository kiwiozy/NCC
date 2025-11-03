'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Stack,
  Text,
  Button,
  Group,
  FileInput,
  Select,
  Textarea,
  Table,
  Badge,
  Alert,
  Loader,
  Center,
  ActionIcon,
  Tooltip,
  Box,
  Progress,
  Tabs,
} from '@mantine/core';
import {
  IconUpload,
  IconFile,
  IconDownload,
  IconTrash,
  IconCheck,
  IconAlertCircle,
  IconCloudUpload,
  IconDatabase,
  IconFiles,
} from '@tabler/icons-react';
import BatchUpload from './BatchUpload';
import { formatDateOnlyAU } from '@/app/utils/dateFormatting';

interface Document {
  id: string;
  original_name: string;
  file_size_display: string;
  mime_type: string;
  category: string;
  description: string;
  uploaded_by: string;
  uploaded_at: string;
  download_url: string;
}

interface BucketStatus {
  bucket_name: string;
  region: string;
  accessible: boolean;
  error?: string;
}

export default function S3Integration() {
  const [bucketStatus, setBucketStatus] = useState<BucketStatus | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('other');
  const [description, setDescription] = useState<string>('');

  const categories = [
    { value: 'medical', label: 'Medical Records' },
    { value: 'prescription', label: 'Prescription' },
    { value: 'referral', label: 'Referral Letter' },
    { value: 'xray', label: 'X-Ray / Imaging' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'quote', label: 'Quote' },
    { value: 'consent', label: 'Consent Form' },
    { value: 'insurance', label: 'Insurance Document' },
    { value: 'dorsal', label: 'Dorsal' },
    { value: 'plantar', label: 'Plantar' },
    { value: 'posterior', label: 'Posterior' },
    { value: 'anterior', label: 'Anterior' },
    { value: 'medial', label: 'Medial' },
    { value: 'lateral', label: 'Lateral' },
    { value: 'wound', label: 'Wound' },
    { value: 'right_leg', label: 'Right Leg' },
    { value: 'left_leg', label: 'Left Leg' },
    { value: 'l_brannock', label: 'L-Brannock' },
    { value: 'r_brannock', label: 'R-Brannock' },
    { value: 'r_mfoot_length', label: 'R-MFoot Length' },
    { value: 'r_mfoot_width', label: 'R-MFoot Width' },
    { value: 'l_mfoot_length', label: 'L-MFoot Length' },
    { value: 'l_mfoot_width', label: 'L-MFoot Width' },
    { value: 'casts', label: 'Casts' },
    { value: 'left_lat', label: 'Left Lat' },
    { value: 'right_lat', label: 'Right Lat' },
    { value: 'r_shoe', label: 'R-Shoe' },
    { value: 'l_shoe', label: 'L-Shoe' },
    { value: 'afo', label: 'AFO' },
    { value: 'x_ray', label: 'X-Ray' },
    { value: 'cmo', label: 'CMO' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    checkBucketStatus();
    fetchDocuments();
  }, []);

  const checkBucketStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/documents/bucket_status/');
      const data = await response.json();
      setBucketStatus(data);
    } catch (err) {
      console.error('Error checking bucket status:', err);
      setBucketStatus({
        bucket_name: 'Unknown',
        region: 'Unknown',
        accessible: false,
        error: 'Failed to connect',
      });
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/documents/');
      const data = await response.json();
      setDocuments(data.results || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('uploaded_by', 'test_user');

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('http://localhost:8000/api/documents/upload/', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setSuccess(`File uploaded successfully! File ID: ${data.id}`);
      
      // Reset form
      setFile(null);
      setCategory('other');
      setDescription('');
      setUploadProgress(0);
      
      // Refresh document list
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${doc.id}/download_url/`);
      const data = await response.json();
      
      // Use window.location.href for direct download (bypasses popup blocker)
      window.location.href = data.download_url;
    } catch (err) {
      console.error('Error getting download URL:', err);
      setError('Failed to get download link');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/documents/${docId}/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Document deleted successfully');
        fetchDocuments();
      } else {
        throw new Error('Delete failed');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document');
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={2} mb="md">S3 Document Storage</Title>
          <Text c="dimmed" size="sm">
            Test AWS S3 integration by uploading and managing documents
          </Text>
        </Box>

        {/* Bucket Status */}
        <Paper p="xl" shadow="sm" radius="md">
          <Group justify="space-between" mb="md">
            <Title order={3}>Connection Status</Title>
            <Button size="xs" variant="light" onClick={checkBucketStatus}>
              Refresh
            </Button>
          </Group>

          {bucketStatus ? (
            <Stack gap="md">
              <Alert
                icon={bucketStatus.accessible ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
                color={bucketStatus.accessible ? 'green' : 'red'}
                title={bucketStatus.accessible ? '✅ Connected to AWS S3' : '❌ Connection Failed'}
              >
                {bucketStatus.accessible ? (
                  <Stack gap={4}>
                    <Text size="sm">Bucket: <strong>{bucketStatus.bucket_name}</strong></Text>
                    <Text size="sm">Region: <strong>{bucketStatus.region}</strong></Text>
                  </Stack>
                ) : (
                  <Text size="sm">{bucketStatus.error}</Text>
                )}
              </Alert>
            </Stack>
          ) : (
            <Center p="xl">
              <Loader />
            </Center>
          )}
        </Paper>

        {/* Upload Form */}
        <Paper p="xl" shadow="sm" radius="md">
          <Title order={3} mb="md">Upload Documents</Title>
          
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert icon={<IconCheck size={16} />} color="green" mb="md" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <Tabs defaultValue="single">
            <Tabs.List>
              <Tabs.Tab value="single" leftSection={<IconFile size={16} />}>
                Single File
              </Tabs.Tab>
              <Tabs.Tab value="batch" leftSection={<IconFiles size={16} />}>
                Batch Upload (Up to 20 files)
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="single" pt="md">
              <Stack gap="md">
                <FileInput
                  label="Select File"
                  placeholder="Choose a file to upload"
                  value={file}
                  onChange={setFile}
                  leftSection={<IconFile size={16} />}
                  required
                />

                <Select
                  label="Category"
                  placeholder="Select document category"
                  data={categories}
                  value={category}
                  onChange={(value) => setCategory(value || 'other')}
                  required
                />

                <Textarea
                  label="Description"
                  placeholder="Enter a description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                  minRows={3}
                />

                {uploading && uploadProgress > 0 && (
                  <Box>
                    <Text size="sm" mb="xs">Uploading... {uploadProgress}%</Text>
                    <Progress value={uploadProgress} animated />
                  </Box>
                )}

                <Button
                  leftSection={<IconCloudUpload size={18} />}
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={!file || !bucketStatus?.accessible}
                >
                  Upload to S3
                </Button>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="batch" pt="md">
              <BatchUpload onUploadComplete={fetchDocuments} />
            </Tabs.Panel>
          </Tabs>
        </Paper>

        {/* Documents List */}
        <Paper p="xl" shadow="sm" radius="md">
          <Group justify="space-between" mb="md">
            <Title order={3}>Uploaded Documents</Title>
            <Group gap="xs">
              <Badge variant="light" leftSection={<IconDatabase size={14} />}>
                {documents.length} {documents.length === 1 ? 'document' : 'documents'}
              </Badge>
              <Button size="xs" variant="light" onClick={fetchDocuments}>
                Refresh
              </Button>
            </Group>
          </Group>

          {loading ? (
            <Center p="xl">
              <Loader />
            </Center>
          ) : documents.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />} color="gray">
              No documents uploaded yet. Upload your first document above!
            </Alert>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>File Name</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Size</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Uploaded By</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {documents.map((doc) => (
                  <Table.Tr key={doc.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{doc.original_name}</Text>
                      {doc.description && (
                        <Text size="xs" c="dimmed">{doc.description}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" size="sm">
                        {categories.find(c => c.value === doc.category)?.label || doc.category}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{doc.file_size_display}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">{doc.mime_type}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{doc.uploaded_by}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">
                        {formatDateOnlyAU(doc.uploaded_at)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Download">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => handleDownload(doc)}
                          >
                            <IconDownload size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}

