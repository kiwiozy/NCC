'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Grid,
  Stack,
  Text,
  Button,
  ActionIcon,
  Badge,
  Group,
  TextInput,
  Textarea,
  ScrollArea,
  Box,
  Image as MantineImage,
  Accordion,
  rem,
  Loader,
  FileButton,
} from '@mantine/core';
import {
  IconPlus,
  IconPhoto,
  IconEdit,
  IconTrash,
  IconX,
  IconUpload,
  IconChevronDown,
} from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { DatePickerInput } from '@mantine/dates';

interface Image {
  id: string;
  original_name: string;
  file_size: number;
  category: string;
  caption: string;
  date_taken: string | null;
  download_url: string;
  thumbnail_url: string | null;
  uploaded_at: string;
  order: number;
}

interface ImageBatch {
  id: string;
  name: string;
  description: string;
  image_count: number;
  uploaded_at: string;
  uploaded_by_name: string | null;
  first_image_url: string | null;
  images: Image[];
}

interface ImagesDialogProps {
  opened: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

// Image categories from BatchUpload
const IMAGE_CATEGORIES = [
  { value: 'medical', label: 'Medical Records' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'referral', label: 'Referral Letter' },
  { value: 'xray', label: 'X-Ray / Imaging' },
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
  { value: 'casts', label: 'Casts' },
  { value: 'left_lat', label: 'Left Lat' },
  { value: 'right_lat', label: 'Right Lat' },
  { value: 'r_shoe', label: 'R-Shoe' },
  { value: 'l_shoe', label: 'L-Shoe' },
  { value: 'afo', label: 'AFO' },
  { value: 'other', label: 'Other' },
];

export default function ImagesDialog({ opened, onClose, patientId, patientName }: ImagesDialogProps) {
  const [batches, setBatches] = useState<ImageBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ImageBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  // Load batches when dialog opens
  useEffect(() => {
    if (opened && patientId) {
      loadBatches();
    }
  }, [opened, patientId]);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/images/batches/?patient_id=${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setBatches(data);
      }
    } catch (error) {
      console.error('Error loading image batches:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load image batches',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = () => {
    modals.open({
      title: 'Create New Image Batch',
      children: <CreateBatchForm patientId={patientId} onSuccess={loadBatches} />,
    });
  };

  const handleBatchClick = async (batch: ImageBatch) => {
    // Load full batch with images
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/images/batches/${batch.id}/`);
      if (response.ok) {
        const data = await response.json();
        setSelectedBatch(data);
      }
    } catch (error) {
      console.error('Error loading batch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (image: Image) => {
    setSelectedImage(image);
  };

  const handleDeleteBatch = (batchId: string) => {
    modals.openConfirmModal({
      title: 'Delete Image Batch',
      children: <Text>Are you sure you want to delete this batch and all its images? This cannot be undone.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const response = await fetch(`http://localhost:8000/api/images/batches/${batchId}/`, {
            method: 'DELETE',
          });
          if (response.ok) {
            notifications.show({
              title: 'Success',
              message: 'Batch deleted successfully',
              color: 'green',
            });
            loadBatches();
            if (selectedBatch?.id === batchId) {
              setSelectedBatch(null);
            }
          }
        } catch (error) {
          notifications.show({
            title: 'Error',
            message: 'Failed to delete batch',
            color: 'red',
          });
        }
      },
    });
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Group gap="xs">
            <IconPhoto size={24} />
            <Text fw={600}>Images - {patientName}</Text>
            <Badge color="blue">{batches.reduce((sum, b) => sum + b.image_count, 0)} images</Badge>
          </Group>
        }
        size="95vw"
        styles={{
          body: { height: 'calc(90vh - 60px)' },
          content: { height: '90vh' },
        }}
      >
        <Grid gutter="md" style={{ height: '100%' }}>
          {/* Left: Batch List */}
          <Grid.Col span={4}>
            <Stack gap="md" style={{ height: '100%' }}>
              <Group justify="space-between">
                <Text fw={600} size="sm">Image Batches</Text>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={16} />}
                  onClick={handleCreateBatch}
                >
                  New Batch
                </Button>
              </Group>

              <ScrollArea style={{ flex: 1 }}>
                {loading && !batches.length ? (
                  <Stack align="center" py="xl">
                    <Loader size="sm" />
                  </Stack>
                ) : batches.length === 0 ? (
                  <Stack align="center" py="xl">
                    <IconPhoto size={48} color="gray" />
                    <Text c="dimmed" size="sm">No image batches yet</Text>
                    <Button size="xs" onClick={handleCreateBatch}>Create First Batch</Button>
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    {batches.map((batch) => (
                      <Box
                        key={batch.id}
                        p="md"
                        style={{
                          border: `2px solid ${selectedBatch?.id === batch.id ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-dark-4)'}`,
                          borderRadius: '8px',
                          backgroundColor: selectedBatch?.id === batch.id ? 'var(--mantine-color-dark-6)' : 'transparent',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleBatchClick(batch)}
                      >
                        <Group justify="space-between" mb="xs">
                          <Text fw={600} size="sm">{batch.name}</Text>
                          <Group gap={4}>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBatch(batch.id);
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Group>
                        <Group gap="xs">
                          <Badge size="sm" variant="light">{batch.image_count} images</Badge>
                          <Text size="xs" c="dimmed">
                            {new Date(batch.uploaded_at).toLocaleDateString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </Group>
                        {batch.description && (
                          <Text size="xs" c="dimmed" mt="xs" lineClamp={2}>{batch.description}</Text>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </ScrollArea>
            </Stack>
          </Grid.Col>

          {/* Right: Images Accordion */}
          <Grid.Col span={8}>
            {!selectedBatch ? (
              <Stack align="center" justify="center" style={{ height: '100%' }}>
                <IconPhoto size={64} color="gray" />
                <Text c="dimmed">Select a batch to view images</Text>
              </Stack>
            ) : (
              <Stack gap="md" style={{ height: '100%' }}>
                <Group justify="space-between">
                  <div>
                    <Text fw={600}>{selectedBatch.name}</Text>
                    <Text size="sm" c="dimmed">{selectedBatch.image_count} images</Text>
                  </div>
                  <Button
                    size="sm"
                    leftSection={<IconUpload size={16} />}
                    onClick={() => {
                      modals.open({
                        title: `Upload Images to "${selectedBatch.name}"`,
                        size: 'lg',
                        children: <UploadImagesForm batchId={selectedBatch.id} onSuccess={() => {
                          loadBatches();
                          handleBatchClick(selectedBatch);
                        }} />,
                      });
                    }}
                  >
                    Upload Images
                  </Button>
                </Group>

                <ScrollArea style={{ flex: 1 }}>
                  {selectedBatch.images.length === 0 ? (
                    <Stack align="center" py="xl">
                      <Text c="dimmed">No images in this batch yet</Text>
                    </Stack>
                  ) : (
                    <Accordion chevron={<IconChevronDown size={16} />}>
                      <Accordion.Item value="images">
                        <Accordion.Control>
                          <Group gap="xs">
                            <Text fw={500}>Images</Text>
                            <Badge size="sm">{selectedBatch.images.length}</Badge>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="xs">
                            {selectedBatch.images.map((image) => (
                              <Group
                                key={image.id}
                                p="xs"
                                style={{
                                  border: '1px solid var(--mantine-color-dark-4)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => handleImageClick(image)}
                              >
                                {image.thumbnail_url && (
                                  <MantineImage
                                    src={image.thumbnail_url}
                                    alt={image.original_name}
                                    width={60}
                                    height={60}
                                    fit="cover"
                                    radius="sm"
                                  />
                                )}
                                <div style={{ flex: 1 }}>
                                  <Text size="sm" fw={500}>{image.original_name}</Text>
                                  <Group gap="xs">
                                    <Badge size="xs">{image.category}</Badge>
                                    <Text size="xs" c="dimmed">
                                      {(image.file_size / 1024 / 1024).toFixed(2)} MB
                                    </Text>
                                  </Group>
                                  {image.caption && (
                                    <Text size="xs" c="dimmed" lineClamp={1}>{image.caption}</Text>
                                  )}
                                </div>
                              </Group>
                            ))}
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                    </Accordion>
                  )}
                </ScrollArea>
              </Stack>
            )}
          </Grid.Col>
        </Grid>
      </Modal>

      {/* Full-size Image Viewer */}
      {selectedImage && (
        <Modal
          opened={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          title={selectedImage.original_name}
          size="xl"
        >
          <Stack>
            <MantineImage
              src={selectedImage.download_url}
              alt={selectedImage.original_name}
              fit="contain"
              style={{ maxHeight: '70vh' }}
            />
            <Group gap="xs">
              <Badge>{selectedImage.category}</Badge>
              <Text size="sm" c="dimmed">
                {new Date(selectedImage.uploaded_at).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Group>
            {selectedImage.caption && (
              <Text size="sm">{selectedImage.caption}</Text>
            )}
          </Stack>
        </Modal>
      )}
    </>
  );
}

// Create Batch Form Component
function CreateBatchForm({ patientId, onSuccess }: { patientId: string; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Batch name is required',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/images/batches/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          content_type: 'patients.patient',
          object_id: patientId,
        }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: 'Batch created successfully',
          color: 'green',
        });
        modals.closeAll();
        onSuccess();
      } else {
        throw new Error('Failed to create batch');
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create batch',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <TextInput
        label="Batch Name"
        placeholder="e.g., Pre-Surgery Photos, 6 Month Follow-up"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Textarea
        label="Description (Optional)"
        placeholder="Add notes about this batch..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />
      <Group justify="flex-end">
        <Button variant="subtle" onClick={() => modals.closeAll()}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading}>Create Batch</Button>
      </Group>
    </Stack>
  );
}

// Upload Images Form Component
function UploadImagesForm({ batchId, onSuccess }: { batchId: string; onSuccess: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (files.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'Please select at least one image',
        color: 'red',
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
        formData.append('categories', 'other'); // Default category
        formData.append('captions', '');
      });

      const response = await fetch(`http://localhost:8000/api/images/batches/${batchId}/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: `${files.length} images uploaded successfully`,
          color: 'green',
        });
        modals.closeAll();
        onSuccess();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to upload images',
        color: 'red',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Stack>
      <FileButton onChange={setFiles} accept="image/*" multiple>
        {(props) => (
          <Button {...props} leftSection={<IconUpload size={16} />}>
            Select Images
          </Button>
        )}
      </FileButton>

      {files.length > 0 && (
        <Stack gap="xs">
          <Text size="sm" fw={500}>Selected: {files.length} images</Text>
          {files.map((file, idx) => (
            <Group key={idx} gap="xs">
              <Text size="sm">{file.name}</Text>
              <Text size="xs" c="dimmed">({(file.size / 1024 / 1024).toFixed(2)} MB)</Text>
            </Group>
          ))}
        </Stack>
      )}

      <Group justify="flex-end">
        <Button variant="subtle" onClick={() => modals.closeAll()}>Cancel</Button>
        <Button onClick={handleUpload} loading={uploading} disabled={files.length === 0}>
          Upload {files.length > 0 && `(${files.length})`}
        </Button>
      </Group>
    </Stack>
  );
}

