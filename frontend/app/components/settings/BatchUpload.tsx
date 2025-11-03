'use client';

import { useState, useCallback } from 'react';
import {
  Paper,
  Text,
  Stack,
  Group,
  Button,
  Select,
  Badge,
  Progress,
  Alert,
  ActionIcon,
  Textarea,
  Box,
  rem,
  Image,
} from '@mantine/core';
import {
  IconUpload,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconTrash,
  IconPhoto,
  IconFile,
} from '@tabler/icons-react';
import { Dropzone, IMAGE_MIME_TYPE, PDF_MIME_TYPE, MS_WORD_MIME_TYPE, MS_EXCEL_MIME_TYPE } from '@mantine/dropzone';

interface FileWithMetadata {
  file: File;
  id: string;
  preview?: string;
  category: string;
  description: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
  progress: number;
}

const CATEGORIES = [
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

const MAX_FILES = 20;

export default function BatchUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleDrop = useCallback((droppedFiles: File[]) => {
    // Limit to MAX_FILES total
    const remainingSlots = MAX_FILES - files.length;
    const filesToAdd = droppedFiles.slice(0, remainingSlots);

    const newFiles: FileWithMetadata[] = filesToAdd.map((file) => ({
      file,
      id: Math.random().toString(36).substring(7),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      category: 'other',
      description: '',
      uploading: false,
      uploaded: false,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, [files.length]);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const updateFile = (id: string, updates: Partial<FileWithMetadata>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const uploadSingleFile = async (fileData: FileWithMetadata) => {
    updateFile(fileData.id, { uploading: true, progress: 0, error: undefined });

    const formData = new FormData();
    formData.append('file', fileData.file);
    formData.append('category', fileData.category);
    formData.append('description', fileData.description);
    formData.append('uploaded_by', 'test_user');

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        updateFile(fileData.id, { 
          progress: (prev) => Math.min((prev || 0) + 10, 90) 
        });
      }, 200);

      const response = await fetch('https://localhost:8000/api/documents/upload/', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      updateFile(fileData.id, {
        uploading: false,
        uploaded: true,
        progress: 100,
      });

      return true;
    } catch (err: any) {
      updateFile(fileData.id, {
        uploading: false,
        uploaded: false,
        error: err.message || 'Upload failed',
        progress: 0,
      });
      return false;
    }
  };

  const handleUploadAll = async () => {
    setUploading(true);

    // Upload files sequentially
    for (const fileData of files) {
      if (!fileData.uploaded) {
        await uploadSingleFile(fileData);
      }
    }

    setUploading(false);

    // Check if all uploaded successfully
    const allUploaded = files.every((f) => f.uploaded);
    if (allUploaded && onUploadComplete) {
      onUploadComplete();
      // Clear files after successful upload
      setTimeout(() => {
        files.forEach((f) => {
          if (f.preview) URL.revokeObjectURL(f.preview);
        });
        setFiles([]);
      }, 2000);
    }
  };

  const canUpload = files.length > 0 && !uploading && files.some((f) => !f.uploaded);

  return (
    <Stack gap="md">
      {/* Dropzone */}
      <Dropzone
        onDrop={handleDrop}
        maxFiles={MAX_FILES - files.length}
        maxSize={100 * 1024 * 1024} // 100MB
        disabled={files.length >= MAX_FILES || uploading}
        accept={[...IMAGE_MIME_TYPE, ...PDF_MIME_TYPE, ...MS_WORD_MIME_TYPE, ...MS_EXCEL_MIME_TYPE]}
      >
        <Group justify="center" gap="xl" style={{ minHeight: rem(120), pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload
              style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }}
              stroke={1.5}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto
              style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }}
              stroke={1.5}
            />
          </Dropzone.Idle>

          <div>
            <Text size="xl" inline>
              Drag images here or click to select files
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Attach up to {MAX_FILES} files, each file should not exceed 100MB
            </Text>
            <Text size="sm" c="dimmed" mt={4}>
              {files.length > 0 && `${files.length} of ${MAX_FILES} files added`}
            </Text>
          </div>
        </Group>
      </Dropzone>

      {/* File List */}
      {files.length > 0 && (
        <Stack gap="sm">
          {files.map((fileData) => (
            <Paper key={fileData.id} p="md" withBorder>
              <Stack gap="md">
                {/* Preview or Icon */}
                <Box style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <Box style={{ width: 240, height: 240, flexShrink: 0 }}>
                    {fileData.preview ? (
                      <Image
                        src={fileData.preview}
                        alt={fileData.file.name}
                        height={240}
                        width={240}
                        fit="cover"
                        radius="sm"
                      />
                    ) : (
                      <Box
                        style={{
                          width: 240,
                          height: 240,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'var(--mantine-color-gray-1)',
                          borderRadius: 'var(--mantine-radius-sm)',
                        }}
                      >
                        <IconFile size={120} color="var(--mantine-color-gray-6)" />
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* File Details Below Image */}
                <Box>
                  <Group justify="space-between" align="flex-start" mb="xs">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} style={{ wordBreak: 'break-word' }}>
                        {fileData.file.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {(fileData.file.size / 1024).toFixed(2)} KB
                      </Text>
                    </Box>

                    {/* Status Badge */}
                    <Box style={{ flexShrink: 0 }}>
                      {fileData.uploaded && (
                        <Badge color="green" leftSection={<IconCheck size={14} />}>
                          Uploaded
                        </Badge>
                      )}
                      {fileData.error && (
                        <Badge color="red" leftSection={<IconAlertCircle size={14} />}>
                          Failed
                        </Badge>
                      )}
                      {!fileData.uploaded && !fileData.error && !fileData.uploading && (
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => removeFile(fileData.id)}
                          disabled={uploading}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      )}
                    </Box>
                  </Group>

                  {/* Category & Description */}
                  {!fileData.uploaded && (
                    <Stack gap="xs">
                      <Select
                        label="Category"
                        data={CATEGORIES}
                        value={fileData.category}
                        onChange={(value) =>
                          updateFile(fileData.id, { category: value || 'other' })
                        }
                        disabled={fileData.uploading}
                        size="xs"
                      />
                      <Textarea
                        label="Description (optional)"
                        placeholder="Add a description..."
                        value={fileData.description}
                        onChange={(e) =>
                          updateFile(fileData.id, { description: e.currentTarget.value })
                        }
                        disabled={fileData.uploading}
                        size="xs"
                        rows={2}
                      />
                    </Stack>
                  )}

                  {/* Progress Bar */}
                  {fileData.uploading && (
                    <Box mt="xs">
                      <Progress value={fileData.progress} animated />
                      <Text size="xs" c="dimmed" mt={4}>
                        Uploading... {fileData.progress}%
                      </Text>
                    </Box>
                  )}

                  {/* Error Message */}
                  {fileData.error && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red" mt="xs">
                      {fileData.error}
                    </Alert>
                  )}
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {files.filter((f) => f.uploaded).length} of {files.length} files uploaded
          </Text>
          <Group>
            <Button
              variant="outline"
              color="red"
              onClick={() => {
                files.forEach((f) => {
                  if (f.preview) URL.revokeObjectURL(f.preview);
                });
                setFiles([]);
              }}
              disabled={uploading}
            >
              Clear All
            </Button>
            <Button
              leftSection={<IconUpload size={18} />}
              onClick={handleUploadAll}
              loading={uploading}
              disabled={!canUpload}
            >
              Upload {files.filter((f) => !f.uploaded).length} File
              {files.filter((f) => !f.uploaded).length !== 1 ? 's' : ''}
            </Button>
          </Group>
        </Group>
      )}
    </Stack>
  );
}

