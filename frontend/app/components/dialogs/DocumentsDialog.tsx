'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Group,
  Text,
  Button,
  Stack,
  Alert,
  ActionIcon,
  Box,
  Badge,
  Select,
  ScrollArea,
  Grid,
  rem,
  useMantineColorScheme,
  Paper,
  Progress,
  FileButton,
  Textarea,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconPlus,
  IconTrash,
  IconCheck,
  IconAlertCircle,
  IconFile,
  IconEdit,
  IconX,
  IconDownload,
  IconUpload,
} from '@tabler/icons-react';
import { formatDateTimeAU, formatDateOnlyAU } from '../../utils/dateFormatting';
import { DateValue } from '@mantine/dates';
import dayjs from 'dayjs';
import { useBrowserDetection } from '../../utils/browserDetection';

interface Document {
  id: string;
  original_name: string;
  file_size: number;
  file_size_display?: string;
  category: string;
  category_label?: string;
  description?: string;
  document_date?: string;
  uploaded_at: string;
  updated_at: string;
  download_url?: string;
  mime_type?: string;
}

const DOCUMENT_TYPES = [
  { value: 'erf', label: 'ERF' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'referral', label: 'Referral' },
  { value: 'enablensw_application', label: 'EnableNSW Application' },
  { value: 'remittance_advice', label: 'Remittance Advice' },
  { value: 'quote', label: 'Quote' },
  { value: 'medical', label: 'Medical Records' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'xray', label: 'X-Ray / Imaging' },
  { value: 'consent', label: 'Consent Form' },
  { value: 'insurance', label: 'Insurance Document' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'other', label: 'Other' },
];

interface DocumentsDialogProps {
  opened: boolean;
  onClose: () => void;
  patientId?: string;
}

export default function DocumentsDialog({ opened, onClose, patientId }: DocumentsDialogProps) {
  const { colorScheme } = useMantineColorScheme();
  const browser = useBrowserDetection();
  const isDark = colorScheme === 'dark';
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('other');
  const [documentDate, setDocumentDate] = useState<DateValue | null>(null);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (opened && patientId) {
      fetchDocuments();
      resetForm();
    } else {
      setDocuments([]);
      setSelectedDocument(null);
      resetForm();
    }
  }, [opened, patientId]);

  const resetForm = () => {
    setSelectedFile(null);
    setDocumentType('other');
    setDocumentDate(null);
    setDescription('');
    setError(null);
    setSuccess(null);
    setUploadProgress(0);
  };

  const fetchDocuments = async () => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    try {
      // Fetch documents for patient
      // Backend will filter by content_type__model=patient and object_id=patientId
      const response = await fetch(`http://localhost:8000/api/documents/?patient_id=${patientId}&t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        const docsList = data.results || data;
        setDocuments(docsList);
        if (docsList.length > 0 && !selectedDocument) {
          setSelectedDocument(docsList[0]);
        } else if (docsList.length === 0) {
          setSelectedDocument(null);
        }
      } else {
        throw new Error('Failed to load documents');
      }
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };

  const uploadDocument = async () => {
    if (!selectedFile || !patientId) {
      setError('Please select a file and ensure patient is selected');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      // Get ContentType ID for Patient model using Django ContentType
      // We'll use the patient model's content type from Django's contenttypes framework
      // For now, we'll pass the model name and let the backend resolve it

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', documentType);
      formData.append('description', description);
      formData.append('uploaded_by', 'user'); // TODO: Get from auth
      // Pass patient_id and let backend resolve ContentType
      formData.append('patient_id', patientId);
      if (documentDate) {
        formData.append('document_date', dayjs(documentDate).format('YYYY-MM-DD'));
      }

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201 || xhr.status === 200) {
          const newDoc = JSON.parse(xhr.responseText);
          setDocuments([newDoc, ...documents]);
          setSelectedDocument(newDoc);
          window.dispatchEvent(new Event('documentsUpdated'));
          setSuccess('Document uploaded successfully!');
          resetForm();
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            const errorMsg = errorData.error || errorData.message || errorData.detail || 'Upload failed';
            console.error('Upload error response:', errorData);
            setError(`Upload failed: ${errorMsg}`);
          } catch (e) {
            console.error('Upload error (non-JSON):', xhr.responseText);
            setError(`Upload failed: ${xhr.status} ${xhr.statusText}`);
          }
        }
        setUploading(false);
      });

      xhr.addEventListener('error', () => {
        console.error('XHR error event');
        setError('Upload failed. Please check your connection and try again.');
        setUploading(false);
      });

      xhr.open('POST', 'http://localhost:8000/api/documents/upload/');
      xhr.send(formData);

    } catch (err: any) {
      console.error('Error uploading document:', err);
      setError(err.message || 'Failed to upload document');
      setUploading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${id}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      const updatedDocs = documents.filter((doc) => doc.id !== id);
      setDocuments(updatedDocs);
      window.dispatchEvent(new Event('documentsUpdated'));
      setSuccess('Document deleted successfully');
      
      if (selectedDocument?.id === id) {
        setSelectedDocument(updatedDocs.length > 0 ? updatedDocs[0] : null);
      }
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document: ' + (err.message || 'Unknown error'));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Documents"
      size="xl"
    >
      <Grid gutter={0} style={{ height: rem(600) }}>
        {/* Left Column: Documents List */}
        <Grid.Col span={4} style={{ borderRight: `1px solid ${isDark ? '#373A40' : '#dee2e6'}` }}>
          <Stack gap={0} style={{ height: '100%' }}>
            {/* Header with Add Button */}
            <Box p="md" style={{ borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}` }}>
              <Group justify="space-between" align="center">
                <Text size="sm" fw={700} c="dimmed" tt="uppercase">Documents</Text>
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="lg"
                  onClick={() => {
                    setSelectedDocument(null);
                    resetForm();
                  }}
                  title="Add New Document"
                >
                  <IconPlus size={20} />
                </ActionIcon>
              </Group>
            </Box>
            
            <ScrollArea style={{ flex: 1 }}>
              <Stack gap={0}>
                {loading ? (
                  <Box p="md">
                    <Text c="dimmed" size="sm">Loading documents...</Text>
                  </Box>
                ) : documents.length === 0 ? (
                  <Box p="md" style={{ textAlign: 'center' }}>
                    <Text c="dimmed" size="sm" mb="md">No documents yet</Text>
                    <Button
                      variant="light"
                      leftSection={<IconPlus size={16} />}
                      onClick={() => {
                        setSelectedDocument(null);
                        resetForm();
                      }}
                      fullWidth
                    >
                      Add First Document
                    </Button>
                  </Box>
                ) : (
                  documents.map((doc) => (
                  <Box
                    key={doc.id}
                    p="md"
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedDocument?.id === doc.id
                        ? (isDark ? '#25262b' : '#f8f9fa')
                        : 'transparent',
                      borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
                    }}
                    onClick={() => setSelectedDocument(doc)}
                    onMouseEnter={(e) => {
                      if (selectedDocument?.id !== doc.id) {
                        e.currentTarget.style.backgroundColor = isDark ? '#1A1B1E' : '#f0f0f0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedDocument?.id !== doc.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Group justify="space-between" align="flex-start" mb="xs">
                      <Box style={{ flex: 1 }}>
                        <Badge variant="light" size="sm" mb="xs">
                          {DOCUMENT_TYPES.find(t => t.value === doc.category)?.label || doc.category}
                        </Badge>
                        <Text size="xs" c={isDark ? '#C1C2C5' : '#495057'} fw={500} lineClamp={1}>
                          {doc.original_name}
                        </Text>
                        <Text size="xs" c="dimmed" mt="xs">
                          {doc.file_size_display || formatFileSize(doc.file_size || 0)}
                        </Text>
                        {doc.document_date && (
                          <Text size="xs" c="dimmed">
                            {formatDateOnlyAU(doc.document_date)}
                          </Text>
                        )}
                      </Box>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this document?')) {
                              deleteDocument(doc.id);
                            }
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Box>
                ))
              )}
            </Stack>
          </ScrollArea>
          </Stack>
        </Grid.Col>

        {/* Right Column: Upload/View */}
        <Grid.Col span={8}>
          <Stack gap={0} style={{ height: '100%' }}>
            {selectedDocument ? (
              /* Selected Document View */
              <Box p="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack gap="md" style={{ flex: 1, overflow: 'hidden' }}>
                  {/* Top Row: Document Type and Document Date */}
                  <Group justify="space-between" align="flex-start">
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" c="dimmed" mb={4}>DOCUMENT TYPE</Text>
                      <Badge variant="light" size="lg">
                        {DOCUMENT_TYPES.find(t => t.value === selectedDocument.category)?.label || selectedDocument.category}
                      </Badge>
                    </Box>
                    {selectedDocument.document_date && (
                      <Box style={{ flex: 1, textAlign: 'right' }}>
                        <Text size="sm" c="dimmed" mb={4}>DOCUMENT DATE</Text>
                        <Text size="sm" fw={500}>
                          {formatDateOnlyAU(selectedDocument.document_date)}
                        </Text>
                      </Box>
                    )}
                  </Group>
                  
                  {/* Document Viewer */}
                  {selectedDocument.download_url && (
                    <Box 
                      style={{ 
                        flex: 1, 
                        minHeight: 0,
                        border: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
                        borderRadius: rem(8),
                        overflow: 'hidden',
                        backgroundColor: isDark ? '#1A1B1E' : '#ffffff',
                      }}
                    >
                      {(() => {
                        const mimeType = selectedDocument.mime_type || '';
                        const isPDF = mimeType === 'application/pdf' || selectedDocument.original_name.toLowerCase().endsWith('.pdf');
                        const isImage = mimeType.startsWith('image/') || 
                          /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(selectedDocument.original_name);
                        
                        if (isPDF) {
                          // Safari has issues with iframes for cross-origin PDFs
                          // Use object/embed as fallback, or open in new window
                          if (browser.isSafari) {
                            return (
                              <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: rem(16), padding: rem(16) }}>
                                <Box style={{ flex: 1, border: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`, borderRadius: rem(4) }}>
                                  <object
                                    data={selectedDocument.download_url}
                                    type="application/pdf"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      minHeight: rem(400),
                                    }}
                                  >
                                    <Box p="md" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: rem(16) }}>
                                      <IconFile size={48} style={{ opacity: 0.5 }} />
                                      <Text c="dimmed" size="sm" ta="center">
                                        PDF viewer not available
                                      </Text>
                                      <Button
                                        leftSection={<IconDownload size={16} />}
                                        onClick={() => {
                                          window.open(selectedDocument.download_url, '_blank');
                                        }}
                                      >
                                        Open PDF in New Window
                                      </Button>
                                    </Box>
                                  </object>
                                </Box>
                                <Button
                                  variant="light"
                                  fullWidth
                                  leftSection={<IconDownload size={16} />}
                                  onClick={() => {
                                    window.open(selectedDocument.download_url, '_blank');
                                  }}
                                >
                                  Open PDF in Safari
                                </Button>
                              </Box>
                            );
                          } else {
                            // For other browsers, use iframe
                            return (
                              <iframe
                                src={selectedDocument.download_url}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                  minHeight: rem(400),
                                }}
                                title={selectedDocument.original_name}
                              />
                            );
                          }
                        } else if (isImage) {
                          return (
                            <Box style={{ padding: rem(16), height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img
                                src={selectedDocument.download_url}
                                alt={selectedDocument.original_name}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain',
                                }}
                              />
                            </Box>
                          );
                        } else {
                          return (
                            <Box p="md" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: rem(16) }}>
                              <IconFile size={48} style={{ opacity: 0.5 }} />
                              <Text c="dimmed" size="sm">
                                Preview not available for this file type
                              </Text>
                              <Button
                                leftSection={<IconDownload size={16} />}
                                onClick={() => {
                                  window.open(selectedDocument.download_url, '_blank');
                                }}
                              >
                                Download to View
                              </Button>
                            </Box>
                          );
                        }
                      })()}
                    </Box>
                  )}
                  
                  {/* Bottom: File Name and File Size */}
                  <Box style={{ marginTop: 'auto', paddingTop: rem(16), borderTop: `1px solid ${isDark ? '#373A40' : '#dee2e6'}` }}>
                    <Stack gap="xs">
                      <Box>
                        <Text size="sm" c="dimmed" mb={4}>FILE NAME</Text>
                        <Text size="md" fw={500}>
                          {selectedDocument.original_name}
                        </Text>
                      </Box>
                      <Box>
                        <Text size="sm" c="dimmed" mb={4}>FILE SIZE</Text>
                        <Text size="sm">
                          {selectedDocument.file_size_display || formatFileSize(selectedDocument.file_size || 0)}
                        </Text>
                      </Box>
                      {selectedDocument.description && (
                        <Box>
                          <Text size="sm" c="dimmed" mb={4} mt="md">DESCRIPTION</Text>
                          <Text size="sm">
                            {selectedDocument.description}
                          </Text>
                        </Box>
                      )}
                      <Text size="xs" c="dimmed" mt="xs">
                        Uploaded: {formatDateTimeAU(selectedDocument.uploaded_at)}
                      </Text>
                    </Stack>
                  </Box>
                  
                  <Group gap="xs">
                    {selectedDocument.download_url && (
                      <Button
                        variant="outline"
                        leftSection={<IconDownload size={16} />}
                        onClick={() => {
                          window.open(selectedDocument.download_url, '_blank');
                        }}
                      >
                        Download
                      </Button>
                    )}
                    <Button
                      variant="filled"
                      leftSection={<IconPlus size={16} />}
                      onClick={() => {
                        setSelectedDocument(null);
                        resetForm();
                      }}
                    >
                      Add Another Document
                    </Button>
                  </Group>
                </Stack>
              </Box>
            ) : (
              /* Upload Form */
              <Box p="md" style={{ height: '100%', overflow: 'auto' }}>
                <Stack gap="md">
                  {error && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError(null)}>
                      {error}
                    </Alert>
                  )}

                  {success && (
                    <Alert icon={<IconCheck size={16} />} color="green" onClose={() => setSuccess(null)}>
                      {success}
                    </Alert>
                  )}

                  <Box
                    ref={dropZoneRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${isDragging ? '#228BE6' : (isDark ? '#373A40' : '#dee2e6')}`,
                      borderRadius: rem(8),
                      padding: rem(40),
                      textAlign: 'center',
                      backgroundColor: isDragging ? (isDark ? '#1A1B1E' : '#f8f9fa') : 'transparent',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IconUpload size={48} style={{ margin: '0 auto', marginBottom: rem(16), opacity: 0.6 }} />
                    <Text size="lg" fw={500} mb="xs">
                      {selectedFile ? selectedFile.name : 'Drag & drop a file here'}
                    </Text>
                    <Text size="sm" c="dimmed" mb="md">
                      or click to browse
                    </Text>
                    <FileButton
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="*/*"
                    >
                      {(props) => <input {...props} style={{ display: 'none' }} />}
                    </FileButton>
                    {selectedFile && (
                      <Badge variant="light" size="lg">
                        {formatFileSize(selectedFile.size)}
                      </Badge>
                    )}
                  </Box>

                  {uploadProgress > 0 && uploading && (
                    <Progress value={uploadProgress} animated />
                  )}

                  <Select
                    label="DOCUMENT TYPE"
                    placeholder="Select document type"
                    data={DOCUMENT_TYPES}
                    value={documentType}
                    onChange={(value) => setDocumentType(value || 'other')}
                    size="sm"
                    required
                    searchable
                  />

                  <DatePickerInput
                    label="DOCUMENT DATE"
                    placeholder="Select date"
                    value={documentDate}
                    onChange={setDocumentDate}
                    size="sm"
                  />

                  <Textarea
                    label="DESCRIPTION"
                    placeholder="Enter document description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.currentTarget.value)}
                    size="sm"
                    minRows={3}
                  />

                  <Group gap="xs" justify="flex-end">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                    <Button
                      leftSection={<IconUpload size={16} />}
                      onClick={uploadDocument}
                      loading={uploading}
                      disabled={!selectedFile || uploading}
                    >
                      Upload
                    </Button>
                  </Group>
                </Stack>
              </Box>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}

