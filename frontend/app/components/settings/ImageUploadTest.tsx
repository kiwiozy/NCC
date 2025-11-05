'use client';

import { useState } from 'react';
import {
  Stack,
  Button,
  FileButton,
  Group,
  Text,
  Alert,
  Paper,
  Image as MantineImage,
  Modal,
  Box,
  rem,
  Badge,
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconUpload, IconAlertCircle, IconCheck, IconPhoto, IconX } from '@tabler/icons-react';

interface UploadedImage {
  id: string;
  original_name: string;
  s3_key: string;
  s3_thumbnail_key: string | null;
  download_url: string;
  thumbnail_url: string | null;
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
}

export default function ImageUploadTest() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError(null);
    const successfulUploads: UploadedImage[] = [];
    const failedUploads: string[] = [];

    try {
      // Step 1: Create a batch
      setUploadProgress('Creating batch...');
      const batchResponse = await fetch('https://localhost:8000/api/images/batches/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Test Upload ${new Date().toLocaleString()}`,
          description: 'Image upload test with thumbnail generation',
          content_type: 'patients.patient',
          object_id: '041912d8-f562-471e-890e-7c71d0a62c61', // Test patient ID
        }),
      });

      if (!batchResponse.ok) {
        const errorData = await batchResponse.json();
        console.error('Batch creation error:', errorData);
        setError(`Failed to create batch: ${JSON.stringify(errorData)}`);
        return;
      }

      const batch = await batchResponse.json();
      console.log('✅ Batch created:', batch.id);

      // Step 2: Upload images to the batch
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
        formData.append('categories', 'other');
        formData.append('captions', '');
      });

      setUploadProgress(`Uploading ${files.length} image(s) with thumbnail generation...`);

      const uploadResponse = await fetch(`https://localhost:8000/api/images/batches/${batch.id}/upload/`, {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      console.log('Upload result:', uploadResult);

      if (uploadResult.uploaded && uploadResult.uploaded.length > 0) {
        successfulUploads.push(...uploadResult.uploaded);
        console.log('✅ Uploaded:', uploadResult.uploaded.length, 'images');
      }

      if (uploadResult.errors && uploadResult.errors.length > 0) {
        failedUploads.push(...uploadResult.errors);
        console.error('❌ Errors:', uploadResult.errors);
      }

      // Update uploaded images
      setUploadedImages([...uploadedImages, ...successfulUploads]);
      setFiles([]);
      setUploadProgress('');

      if (failedUploads.length > 0) {
        setError(`${successfulUploads.length} uploaded, ${failedUploads.length} failed: ${failedUploads.join(', ')}`);
      }
    } catch (err) {
      console.error('Batch upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <Stack gap="lg">
      <Paper p="xl" withBorder>
        <Stack gap="md">
          <Text size="lg" fw={600}>Upload Test Image</Text>
          
          <Dropzone
            onDrop={(droppedFiles) => {
              const newFiles = [...files, ...droppedFiles].slice(0, 20);
              setFiles(newFiles);
              if (droppedFiles.length + files.length > 20) {
                setError(`Maximum 20 files allowed. Selected first 20 files.`);
              }
            }}
            onReject={(rejectedFiles) => {
              setError(`File rejected: ${rejectedFiles[0].errors[0].message}`);
            }}
            maxSize={10 * 1024 * 1024} // 10MB
            accept={IMAGE_MIME_TYPE}
            multiple
          >
            <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
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
                  Drag images here or click to select
                </Text>
                <Text size="sm" c="dimmed" inline mt={7}>
                  Upload up to 20 images (max 10MB each)
                </Text>
              </div>
            </Group>
          </Dropzone>
          
          {files.length > 0 && (
            <Alert icon={<IconCheck size={16} />} color="blue" title={`${files.length} File${files.length > 1 ? 's' : ''} Selected`}>
              <Stack gap="xs">
                {files.map((f, idx) => (
                  <Group key={idx} justify="space-between">
                    <Text size="sm">{f.name} ({(f.size / 1024).toFixed(1)} KB)</Text>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  </Group>
                ))}
              </Stack>
            </Alert>
          )}

          {uploadProgress && (
            <Alert color="blue" title="Uploading...">
              <Text size="sm">{uploadProgress}</Text>
            </Alert>
          )}

          {files.length > 0 && (
            <Button
              onClick={handleUpload}
              loading={uploading}
              variant="filled"
              size="lg"
              fullWidth
              leftSection={<IconUpload size={20} />}
            >
              Upload {files.length} Image{files.length > 1 ? 's' : ''} to S3
            </Button>
          )}

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
              {error}
            </Alert>
          )}

          {uploadedImages.length > 0 && (
            <Alert icon={<IconCheck size={16} />} color="green" title="Upload Successful">
              <Text size="sm">{uploadedImages.length} image(s) uploaded successfully</Text>
              <Text size="xs" c="dimmed" mt="xs">
                {uploadedImages.filter(img => img.s3_thumbnail_key).length} thumbnails generated ✅
              </Text>
            </Alert>
          )}
        </Stack>
      </Paper>

      {uploadedImages.length > 0 && (
        <Paper p="xl" withBorder>
          <Stack gap="md">
            <Text size="lg" fw={600}>Uploaded Images ({uploadedImages.length})</Text>
            
            <Group gap="md">
              {uploadedImages.map((img) => (
                <Box
                  key={img.id}
                  style={{
                    cursor: 'pointer',
                    border: '2px solid var(--mantine-color-gray-3)',
                    borderRadius: 'var(--mantine-radius-md)',
                    overflow: 'hidden',
                    width: '200px',
                  }}
                  onClick={() => {
                    setSelectedImage(img);
                    setViewerOpen(true);
                  }}
                >
                  {/* Use thumbnail if available, fallback to full image */}
                  <MantineImage
                    src={img.thumbnail_url || img.download_url}
                    alt={img.original_name}
                    fit="cover"
                    h={200}
                    fallbackSrc="https://placehold.co/200x200?text=Image"
                  />
                  <Box p="xs" style={{ backgroundColor: 'var(--mantine-color-dark-6)' }}>
                    <Text size="xs" truncate>{img.original_name}</Text>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">{(img.file_size / 1024).toFixed(1)} KB</Text>
                      {img.s3_thumbnail_key && (
                        <Badge size="xs" color="green" variant="dot">Thumbnail</Badge>
                      )}
                    </Group>
                    {img.width && img.height && (
                      <Text size="xs" c="dimmed">{img.width} × {img.height}</Text>
                    )}
                  </Box>
                </Box>
              ))}
            </Group>
            
            <Text size="sm" c="dimmed">
              Click any image to view full size • Green dot indicates thumbnail was generated
            </Text>
          </Stack>
        </Paper>
      )}

      {/* Full-size Image Viewer Modal */}
      <Modal
        opened={viewerOpen}
        onClose={() => setViewerOpen(false)}
        size="xl"
        title={selectedImage?.original_name}
        centered
      >
        {selectedImage && (
          <Box>
            <MantineImage
              src={selectedImage.download_url}
              alt={selectedImage.original_name}
              fit="contain"
              fallbackSrc="https://placehold.co/800x600?text=Image+Not+Found"
            />
            
            <Stack gap="xs" mt="md">
              <Text size="sm"><strong>Filename:</strong> {selectedImage.original_name}</Text>
              <Text size="sm"><strong>Size:</strong> {(selectedImage.file_size / 1024).toFixed(1)} KB</Text>
              <Text size="sm"><strong>Type:</strong> {selectedImage.mime_type}</Text>
              {selectedImage.width && selectedImage.height && (
                <Text size="sm"><strong>Dimensions:</strong> {selectedImage.width} × {selectedImage.height} px</Text>
              )}
              <Text size="sm"><strong>S3 Key:</strong> {selectedImage.s3_key}</Text>
              {selectedImage.s3_thumbnail_key && (
                <Text size="sm" c="green"><strong>✅ Thumbnail Key:</strong> {selectedImage.s3_thumbnail_key}</Text>
              )}
            </Stack>
          </Box>
        )}
      </Modal>
    </Stack>
  );
}

