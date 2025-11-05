'use client';

import { useState, useEffect } from 'react';
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
  ScrollArea,
  Box,
  Image as MantineImage,
  Accordion,
  rem,
  Loader,
  Select,
} from '@mantine/core';
import {
  IconPlus,
  IconPhoto,
  IconTrash,
  IconUpload,
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from '@tabler/icons-react';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { DatePickerInput } from '@mantine/dates';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';

interface Image {
  id: string;
  original_name: string;
  file_size: number;
  thumbnail_size?: number;
  category: string;
  caption: string;
  date_taken: string | null;
  download_url: string;
  thumbnail_url: string | null;
  uploaded_at: string;
  order: number;
  width?: number;
  height?: number;
  s3_key: string;
  s3_thumbnail_key: string | null;
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

// Grouped image categories with sections
const IMAGE_CATEGORY_GROUPS = [
  {
    group: 'Anatomical Views',
    items: [
      { value: 'dorsal', label: 'Dorsal' },
      { value: 'plantar', label: 'Plantar' },
      { value: 'posterior', label: 'Posterior' },
      { value: 'anterior', label: 'Anterior' },
      { value: 'medial', label: 'Medial' },
      { value: 'lateral', label: 'Lateral' },
      { value: 'wound', label: 'Wound' },
    ],
  },
  {
    group: 'Leg Views',
    items: [
      { value: 'right_leg', label: 'Right Leg' },
      { value: 'left_leg', label: 'Left Leg' },
    ],
  },
  {
    group: 'Brannock Measurements',
    items: [
      { value: 'l_brannock', label: 'L-Brannock' },
      { value: 'r_brannock', label: 'R-Brannock' },
    ],
  },
  {
    group: 'Foot Measurements',
    items: [
      { value: 'r_mfoot_length', label: 'R-MFoot Length' },
      { value: 'r_mfoot_width', label: 'R-MFoot Width' },
      { value: 'l_mfoot_length', label: 'L-MFoot Length' },
      { value: 'l_mfoot_width', label: 'L-MFoot Width' },
    ],
  },
  {
    group: 'Casting',
    items: [{ value: 'casts', label: 'Casts' }],
  },
  {
    group: 'Lateral Views',
    items: [
      { value: 'left_lat', label: 'Left Lat' },
      { value: 'right_lat', label: 'Right Lat' },
    ],
  },
  {
    group: 'Footwear & Devices',
    items: [
      { value: 'r_shoe', label: 'R-Shoe' },
      { value: 'l_shoe', label: 'L-Shoe' },
      { value: 'afo', label: 'AFO' },
      { value: 'x_ray_doc', label: 'X-Ray' },
    ],
  },
  {
    group: 'Clinical',
    items: [{ value: 'cmo', label: 'CMO' }],
  },
  {
    group: 'Documentation',
    items: [
      { value: 'last_design', label: 'Last Design' },
      { value: 'shoe', label: 'Shoe' },
      { value: 'podbox', label: 'PodBox' },
      { value: 'pension_card', label: 'Pension Card' },
      { value: 'medicare_card', label: 'Medicare Card' },
    ],
  },
];

export default function ImagesDialog({ opened, onClose, patientId, patientName }: ImagesDialogProps) {
  const [batches, setBatches] = useState<ImageBatch[]>([]);
  const [openedBatchId, setOpenedBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [selectedBatchImages, setSelectedBatchImages] = useState<Image[]>([]);

  // Load batches when dialog opens
  useEffect(() => {
    if (opened && patientId) {
      loadBatches();
    }
  }, [opened, patientId]);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://localhost:8000/api/images/batches/?patient_id=${patientId}`);
      if (response.ok) {
        const data = await response.json();
        // API returns paginated results
        const batchList = Array.isArray(data) ? data : (data.results || []);
        setBatches(batchList);
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
      size: 'md',
      children: <CreateBatchForm patientId={patientId} onSuccess={(batchId) => {
        loadBatches();
        // Auto-open the newly created batch
        setTimeout(() => setOpenedBatchId(batchId), 500);
      }} />,
    });
  };

  const handleAccordionChange = async (value: string | null) => {
    setOpenedBatchId(value);
    
    // Load full batch details when opened
    if (value) {
      try {
        const response = await fetch(`https://localhost:8000/api/images/batches/${value}/`);
        if (response.ok) {
          const data = await response.json();
          // Update the batch in our list with full details
          setBatches(prev => prev.map(b => b.id === value ? data : b));
        }
      } catch (error) {
        console.error('Error loading batch details:', error);
      }
    }
  };

  const handleDeleteBatch = (batchId: string, batchName: string) => {
    modals.openConfirmModal({
      title: 'Delete Image Batch',
      children: (
        <Text>
          Are you sure you want to delete <strong>"{batchName}"</strong> and all its images? 
          This cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const response = await fetch(`https://localhost:8000/api/images/batches/${batchId}/`, {
            method: 'DELETE',
          });
          if (response.ok) {
            notifications.show({
              title: 'Success',
              message: 'Batch deleted successfully',
              color: 'green',
            });
            loadBatches();
            if (openedBatchId === batchId) {
              setOpenedBatchId(null);
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

  const handleImageClick = (image: Image, batchImages: Image[]) => {
    setSelectedImage(image);
    setSelectedBatchImages(batchImages);
  };

  const handleDeleteImage = (imageId: string, imageName: string) => {
    modals.openConfirmModal({
      title: 'Delete Image',
      children: (
        <Text>
          Are you sure you want to delete <strong>"{imageName}"</strong>? 
          This cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const response = await fetch(`https://localhost:8000/api/images/${imageId}/`, {
            method: 'DELETE',
          });
          if (response.ok) {
            notifications.show({
              title: 'Success',
              message: 'Image deleted successfully',
              color: 'green',
            });
            setSelectedImage(null);
            loadBatches();
          }
        } catch (error) {
          notifications.show({
            title: 'Error',
            message: 'Failed to delete image',
            color: 'red',
          });
        }
      },
    });
  };

  const handleNavigateImage = (direction: 'prev' | 'next') => {
    if (!selectedImage || selectedBatchImages.length === 0) return;
    
    const currentIndex = selectedBatchImages.findIndex(img => img.id === selectedImage.id);
    let newIndex: number;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : selectedBatchImages.length - 1;
    } else {
      newIndex = currentIndex < selectedBatchImages.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedImage(selectedBatchImages[newIndex]);
  };

  const handleCategoryChange = async (imageId: string, newCategory: string) => {
    try {
      const response = await fetch(`https://localhost:8000/api/images/${imageId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: newCategory }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: 'Category updated',
          color: 'green',
        });
        // Reload batches to reflect the change
        loadBatches();
        // Update selectedImage if it's the one being edited
        if (selectedImage && selectedImage.id === imageId) {
          setSelectedImage({ ...selectedImage, category: newCategory });
        }
      } else {
        throw new Error('Failed to update category');
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update category',
        color: 'red',
      });
    }
  };

  const totalImages = batches.reduce((sum, b) => sum + b.image_count, 0);

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Group gap="xs">
            <IconPhoto size={24} />
            <Text fw={600}>Images - {patientName}</Text>
            <Badge color="blue">{totalImages} {totalImages === 1 ? 'image' : 'images'}</Badge>
          </Group>
        }
        size="95vw"
        styles={{
          body: { height: 'calc(90vh - 60px)' },
          content: { height: '90vh' },
        }}
      >
        <Grid gutter="md" style={{ height: '100%' }}>
          {/* Left Panel (30%): Batch List with Accordions */}
          <Grid.Col span={{ base: 12, md: 3.6 }}>
            <Stack gap="md" style={{ height: '100%' }}>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={handleCreateBatch}
                fullWidth
              >
                New Batch
              </Button>

              <ScrollArea style={{ flex: 1 }} type="auto">
                {loading && batches.length === 0 ? (
                  <Stack align="center" py="xl">
                    <Loader size="sm" />
                    <Text size="sm" c="dimmed">Loading batches...</Text>
                  </Stack>
                ) : batches.length === 0 ? (
                  <Stack align="center" py="xl">
                    <IconPhoto size={48} style={{ opacity: 0.3 }} />
                    <Text c="dimmed" size="sm" ta="center">No image batches yet</Text>
                    <Text size="xs" c="dimmed" ta="center">Click "New Batch" to get started</Text>
                  </Stack>
                ) : (
                  <Accordion
                    value={openedBatchId}
                    onChange={handleAccordionChange}
                  >
                    {batches.map((batch) => (
                      <Accordion.Item key={batch.id} value={batch.id}>
                        <Accordion.Control>
                          <Group justify="space-between" wrap="nowrap">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Text fw={600} size="sm" truncate>{batch.name}</Text>
                              <Group gap="xs" mt={4}>
                                <Badge size="xs" variant="light">
                                  {batch.image_count} {batch.image_count === 1 ? 'image' : 'images'}
                                </Badge>
                                <Text size="xs" c="dimmed">
                                  {new Date(batch.uploaded_at).toLocaleDateString('en-AU', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </Text>
                              </Group>
                            </div>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBatch(batch.id, batch.name);
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <BatchContent
                            batch={batch}
                            onUploadSuccess={() => {
                              loadBatches();
                              handleAccordionChange(batch.id);
                            }}
                            onImageClick={(image) => handleImageClick(image, batch.images)}
                          />
                        </Accordion.Panel>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                )}
              </ScrollArea>
            </Stack>
          </Grid.Col>

          {/* Right Panel (70%): Image Viewer */}
          <Grid.Col span={{ base: 12, md: 8.4 }}>
            {!selectedImage ? (
              <Stack align="center" justify="center" style={{ height: '100%' }}>
                <IconPhoto size={64} style={{ opacity: 0.2 }} />
                <Text c="dimmed" size="lg">Select an image to view</Text>
                <Text c="dimmed" size="sm">Click any thumbnail from the batches on the left</Text>
              </Stack>
            ) : (
              <ImageViewer
                image={selectedImage}
                onClose={() => setSelectedImage(null)}
                onDelete={() => handleDeleteImage(selectedImage.id, selectedImage.original_name)}
                onPrev={() => handleNavigateImage('prev')}
                onNext={() => handleNavigateImage('next')}
                hasMultiple={selectedBatchImages.length > 1}
              />
            )}
          </Grid.Col>
        </Grid>
      </Modal>
    </>
  );
}

// Batch Content Component (Dropzone + Thumbnails)
function BatchContent({ 
  batch, 
  onUploadSuccess, 
  onImageClick 
}: { 
  batch: ImageBatch; 
  onUploadSuccess: () => void;
  onImageClick: (image: Image) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress('Uploading images...');

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
        formData.append('categories', 'other'); // Default category
        formData.append('captions', '');
      });

      const response = await fetch(`https://localhost:8000/api/images/batches/${batch.id}/upload/`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success > 0) {
        notifications.show({
          title: 'Success',
          message: `${result.success} image(s) uploaded successfully`,
          color: 'green',
        });
        setFiles([]);
        onUploadSuccess();
      }

      if (result.errors && result.errors.length > 0) {
        notifications.show({
          title: 'Some uploads failed',
          message: `${result.errors.length} image(s) failed to upload`,
          color: 'orange',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to upload images',
        color: 'red',
      });
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <Stack gap="md">
      {/* Dropzone */}
      <Dropzone
        onDrop={(droppedFiles) => setFiles([...files, ...droppedFiles])}
        onReject={(files) => {
          notifications.show({
            title: 'Invalid file',
            message: files[0]?.errors[0]?.message || 'File rejected',
            color: 'red',
          });
        }}
        maxSize={10 * 1024 * 1024} // 10MB
        accept={IMAGE_MIME_TYPE}
        multiple
        loading={uploading}
      >
        <Group justify="center" gap="xl" mih={100} style={{ pointerEvents: 'none' }}>
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
            <Text size="lg" inline>
              Drag images here or click to select
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Max 10MB per image
            </Text>
          </div>
        </Group>
      </Dropzone>

      {/* Selected Files */}
      {files.length > 0 && (
        <Box>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>{files.length} file(s) selected</Text>
            <Button size="xs" variant="subtle" onClick={() => setFiles([])}>
              Clear all
            </Button>
          </Group>
          <Stack gap={4}>
            {files.map((file, idx) => (
              <Group key={idx} gap="xs" justify="space-between">
                <Text size="xs" truncate style={{ flex: 1 }}>{file.name}</Text>
                <Text size="xs" c="dimmed">{(file.size / 1024).toFixed(1)} KB</Text>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                >
                  <IconX size={12} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
          <Button
            fullWidth
            mt="sm"
            onClick={handleUpload}
            loading={uploading}
            leftSection={<IconUpload size={16} />}
          >
            Upload {files.length} Image{files.length > 1 ? 's' : ''}
          </Button>
          {uploadProgress && (
            <Text size="xs" c="dimmed" ta="center" mt="xs">
              {uploadProgress}
            </Text>
          )}
        </Box>
      )}

      {/* Thumbnail Grid (Vertical Scroll) */}
      {batch.images && batch.images.length > 0 && (
        <Box>
          <Text size="sm" fw={500} mb="xs">
            {batch.images.length} image{batch.images.length > 1 ? 's' : ''} in batch
          </Text>
          <Stack gap="xs">
            {batch.images.map((image) => (
              <Box
                key={image.id}
                p="xs"
                style={{
                  border: '1px solid var(--mantine-color-dark-4)',
                  borderRadius: '8px',
                }}
              >
                <Group gap="xs" wrap="nowrap" align="flex-start">
                  {/* Smaller Thumbnail */}
                  <Box
                    onClick={() => onImageClick(image)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                    }}
                    sx={{
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 0 0 2px var(--mantine-color-blue-6)',
                      },
                    }}
                  >
                    <MantineImage
                      src={image.thumbnail_url || image.download_url}
                      alt={image.original_name}
                      width={60}
                      height={60}
                      fit="cover"
                      radius="sm"
                      fallbackSrc="https://placehold.co/60x60?text=Image"
                    />
                  </Box>

                  {/* Image Info + Category Dropdown */}
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" fw={500} truncate mb={4}>{image.original_name}</Text>
                    
                    {/* Category Dropdown */}
                    <Select
                      size="xs"
                      value={image.category}
                      onChange={(value) => handleCategoryChange(image.id, value || 'other')}
                      data={IMAGE_CATEGORY_GROUPS}
                      placeholder="Select category"
                      searchable
                      clearable={false}
                      styles={{
                        input: { fontSize: '11px', height: '28px', minHeight: '28px' },
                      }}
                    />

                    {/* Size Info */}
                    <Group gap={4} mt={4}>
                      {image.thumbnail_size ? (
                        <>
                          <Badge size="xs" color="green" variant="dot">Thumb</Badge>
                          <Text size="xs" c="dimmed">{(image.thumbnail_size / 1024).toFixed(1)} KB</Text>
                          <Text size="xs" c="green">({((1 - (image.thumbnail_size / image.file_size)) * 100).toFixed(0)}% smaller)</Text>
                        </>
                      ) : (
                        <>
                          <Badge size="xs" variant="light">Original</Badge>
                          <Text size="xs" c="dimmed">{(image.file_size / 1024).toFixed(1)} KB</Text>
                        </>
                      )}
                    </Group>
                  </Box>
                </Group>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

// Image Viewer Component
function ImageViewer({
  image,
  onClose,
  onDelete,
  onPrev,
  onNext,
  hasMultiple,
}: {
  image: Image;
  onClose: () => void;
  onDelete: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasMultiple: boolean;
}) {
  return (
    <Stack style={{ height: '100%' }}>
      {/* Header */}
      <Group justify="space-between">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="lg" truncate>{image.original_name}</Text>
          <Group gap="xs" mt={4}>
            <Badge>{image.category}</Badge>
            {image.thumbnail_size && (
              <Badge color="green" variant="dot">Thumbnail Generated</Badge>
            )}
          </Group>
        </div>
        <Group gap="xs">
          <ActionIcon variant="subtle" color="red" onClick={onDelete}>
            <IconTrash size={20} />
          </ActionIcon>
          <ActionIcon variant="subtle" onClick={onClose}>
            <IconX size={20} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Image Display */}
      <Box style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MantineImage
          src={image.download_url}
          alt={image.original_name}
          fit="contain"
          style={{ maxHeight: '100%', maxWidth: '100%' }}
          fallbackSrc="https://placehold.co/800x600?text=Image+Not+Found"
        />
        
        {/* Navigation Arrows */}
        {hasMultiple && (
          <>
            <ActionIcon
              size="xl"
              variant="filled"
              style={{
                position: 'absolute',
                left: 20,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
              onClick={onPrev}
            >
              <IconChevronLeft size={24} />
            </ActionIcon>
            <ActionIcon
              size="xl"
              variant="filled"
              style={{
                position: 'absolute',
                right: 20,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
              onClick={onNext}
            >
              <IconChevronRight size={24} />
            </ActionIcon>
          </>
        )}
      </Box>

      {/* Metadata */}
      <Box
        p="md"
        style={{
          borderTop: '1px solid var(--mantine-color-dark-4)',
          backgroundColor: 'var(--mantine-color-dark-6)',
        }}
      >
        <Grid gutter="xs">
          <Grid.Col span={6}>
            <Text size="xs" c="dimmed">Original Size</Text>
            <Text size="sm" fw={500}>{(image.file_size / 1024).toFixed(1)} KB</Text>
          </Grid.Col>
          {image.thumbnail_size && (
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">Thumbnail Size</Text>
              <Text size="sm" fw={500} c="green">
                {(image.thumbnail_size / 1024).toFixed(1)} KB 
                ({((1 - image.thumbnail_size / image.file_size) * 100).toFixed(0)}% reduction)
              </Text>
            </Grid.Col>
          )}
          {image.width && image.height && (
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">Dimensions</Text>
              <Text size="sm" fw={500}>{image.width} × {image.height} px</Text>
            </Grid.Col>
          )}
          <Grid.Col span={6}>
            <Text size="xs" c="dimmed">Uploaded</Text>
            <Text size="sm" fw={500}>
              {new Date(image.uploaded_at).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </Grid.Col>
          {image.caption && (
            <Grid.Col span={12}>
              <Text size="xs" c="dimmed">Caption</Text>
              <Text size="sm">{image.caption}</Text>
            </Grid.Col>
          )}
        </Grid>
      </Box>
    </Stack>
  );
}

// Create Batch Form Component
function CreateBatchForm({ 
  patientId, 
  onSuccess 
}: { 
  patientId: string; 
  onSuccess: (batchId: string) => void;
}) {
  const [date, setDate] = useState<Date | null>(new Date());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!date) {
      notifications.show({
        title: 'Error',
        message: 'Please select a date',
        color: 'red',
      });
      return;
    }

    const batchName = date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + (description.trim() ? ` - ${description.trim()}` : '');

    setLoading(true);
    try {
      const response = await fetch('https://localhost:8000/api/images/batches/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: batchName,
          description: description.trim(),
          content_type: 'patients.patient',
          object_id: patientId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        notifications.show({
          title: 'Success',
          message: 'Batch created successfully',
          color: 'green',
        });
        modals.closeAll();
        onSuccess(data.id);
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
      <DatePickerInput
        label="Date"
        placeholder="Select date"
        value={date}
        onChange={setDate}
        required
        clearable={false}
      />
      <TextInput
        label="Description (Optional)"
        placeholder="e.g., Post-surgery follow-up, Initial assessment"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={() => modals.closeAll()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={loading}>
          Create Batch
        </Button>
      </Group>
    </Stack>
  );
}
