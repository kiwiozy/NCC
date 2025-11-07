'use client';

import { useState, useEffect } from 'react';
import { Group, TextInput, Title, ActionIcon, rem, useMantineColorScheme, Popover, Stack, Button, Select, Text, Box, Switch, Grid, Badge } from '@mantine/core';
import { IconSearch, IconPlus, IconArchive, IconFilter, IconMenu2, IconNote, IconFiles, IconPhoto, IconCalendar, IconReceipt, IconList, IconShoe, IconFileText, IconMessageCircle, IconFileTypePdf, IconBrandNuxt, IconTool, IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface ContactHeaderProps {
  title: string;
  onSearch?: (value: string) => void;
  onAddNew?: () => void;
  onArchive?: () => void;
  onNotesClick?: () => void;
  onDocumentsClick?: () => void;
  onImagesClick?: () => void;
  onLettersClick?: () => void;
  onSmsClick?: () => void;
  patientId?: string; // For getting note and document counts
  showFilters?: boolean;
  filterOptions?: {
    funding?: string[];
    clinic?: string[];
    status?: string[];
  };
  onFilterApply?: (filters: Record<string, string | boolean>) => void;
  contactCount?: number;
  filteredCount?: number;
  achievedCount?: number; // Number of archived/achieved records
  showArchived?: boolean; // Current archive filter state
  archiveEnabled?: boolean; // Whether archive button should be enabled
}

export default function ContactHeader({ 
  title, 
  onSearch, 
  onAddNew, 
  onArchive,
  onNotesClick,
  onDocumentsClick,
  onImagesClick,
  onLettersClick,
  onSmsClick,
  patientId,
  showFilters = true,
  filterOptions = {
    funding: ['NDIS', 'Private', 'DVA', 'Workers Comp', 'Medicare'],
    clinic: ['Newcastle', 'Tamworth', 'Port Macquarie', 'Armidale'],
    status: ['Active', 'Inactive', 'Archived'],
  },
  onFilterApply,
  contactCount = 0,
  filteredCount,
  achievedCount,
  showArchived = false,
  archiveEnabled = true,
}: ContactHeaderProps) {
  const router = useRouter();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [filterOpened, setFilterOpened] = useState(false);
  const [menuOpened, setMenuOpened] = useState(false);
  const [notesCount, setNotesCount] = useState<number>(0);
  const [documentsCount, setDocumentsCount] = useState<number>(0);
  const [imagesCount, setImagesCount] = useState<number>(0);
  const [batchesCount, setBatchesCount] = useState<number>(0);
  const [filters, setFilters] = useState({
    funding: '',
    clinic: '',
    status: '',
    archived: showArchived || false, // Include archived in filters
  });

  // Get images count for patient
  useEffect(() => {
    const getImagesCount = async () => {
      try {
        if (patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
          const response = await fetch(`https://localhost:8000/api/images/batches/?patient_id=${patientId}&t=${Date.now()}`);
          if (response.ok) {
            const data = await response.json();
            const batches = data.results || data;
            const batchesArray = Array.isArray(batches) ? batches : [];
            const totalImages = batchesArray.reduce((sum: number, batch: any) => sum + batch.image_count, 0);
            setImagesCount(totalImages);
            setBatchesCount(batchesArray.length);
          } else {
            setImagesCount(0);
            setBatchesCount(0);
          }
        }
      } catch (err) {
        console.error('Error loading images count:', err);
        setImagesCount(0);
        setBatchesCount(0);
      }
    };

    getImagesCount();
  }, [patientId]);

  // Get notes count for patient
  useEffect(() => {
    const getNotesCount = async () => {
      try {
        // Only make API call if patientId is a valid UUID format
        if (patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
          // Load from API for patient-specific notes
          const response = await fetch(`https://localhost:8000/api/notes/?patient_id=${patientId}&t=${Date.now()}`);
          if (response.ok) {
            const data = await response.json();
            const notesList = data.results || data;
            setNotesCount(Array.isArray(notesList) ? notesList.length : 0);
          } else {
            setNotesCount(0);
          }
        } else {
          // Fallback to localStorage for global notes
          const storageKey = 'walkeasy_nexus_notes';
          const savedNotes = localStorage.getItem(storageKey);
          if (savedNotes) {
            const parsedNotes = JSON.parse(savedNotes);
            setNotesCount(Array.isArray(parsedNotes) ? parsedNotes.length : 0);
          } else {
            setNotesCount(0);
          }
        }
      } catch (err) {
        console.error('Error loading notes count:', err);
        setNotesCount(0);
      }
    };

    getNotesCount();
    
    // Listen for storage changes (when notes are added/deleted in other tabs/components)
    const handleStorageChange = (e: StorageEvent) => {
      if (!patientId) {
        const storageKey = 'walkeasy_nexus_notes';
        if (e.key === storageKey) {
          getNotesCount();
        }
      }
    };
    
    // Listen for custom event when notes change in NotesDialog
    const handleNotesChange = () => {
      getNotesCount();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('notesUpdated', handleNotesChange);
    
    // Refresh count periodically
    const interval = setInterval(getNotesCount, 2000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('notesUpdated', handleNotesChange);
    };
  }, [patientId, menuOpened]);

  // Get documents count for patient
  useEffect(() => {
    const getDocumentsCount = async () => {
      try {
        // Only make API call if patientId is a valid UUID format
        if (patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
          // Load from API for patient-specific documents
          const response = await fetch(`https://localhost:8000/api/documents/?patient_id=${patientId}&t=${Date.now()}`);
          if (response.ok) {
            const data = await response.json();
            const docsList = data.results || data;
            setDocumentsCount(Array.isArray(docsList) ? docsList.length : 0);
          } else {
            setDocumentsCount(0);
          }
        } else {
          setDocumentsCount(0);
        }
      } catch (err) {
        console.error('Error loading documents count:', err);
        setDocumentsCount(0);
      }
    };

    getDocumentsCount();
    
    // Listen for custom event when documents change
    const handleDocumentsChange = () => {
      getDocumentsCount();
    };
    
    window.addEventListener('documentsUpdated', handleDocumentsChange);
    
    // Refresh count periodically
    const interval = setInterval(getDocumentsCount, 2000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('documentsUpdated', handleDocumentsChange);
    };
  }, [patientId, menuOpened]);

  // Update filters when showArchived prop changes (e.g., when filters are cleared)
  // Only sync when showArchived prop changes from parent, not when local filters change
  useEffect(() => {
    const propArchived = Boolean(showArchived);
    const currentArchived = Boolean(filters.archived);
    if (propArchived !== currentArchived) {
      setFilters(prev => ({ ...prev, archived: propArchived }));
    }
  }, [showArchived]); // Only depend on showArchived, not filters.archived

  // Reset filters to current active filters when popover opens
  useEffect(() => {
    if (filterOpened) {
      setFilters({
        funding: '',
        clinic: '',
        status: '',
        archived: Boolean(showArchived),
      });
    }
  }, [filterOpened, showArchived]);

  const handleFilterApply = () => {
    onFilterApply?.({ ...filters, archived: filters.archived });
    setFilterOpened(false);
  };

  const handleFilterClear = () => {
    const clearedFilters = { funding: '', clinic: '', status: '', archived: false };
    setFilters(clearedFilters);
    onFilterApply?.(clearedFilters);
  };

  const menuItems = [
    { icon: <IconNote size={20} />, label: 'Notes', onClick: () => { onNotesClick?.(); setMenuOpened(false); }, count: notesCount },
    { icon: <IconFiles size={20} />, label: 'Documents', onClick: () => { onDocumentsClick?.(); setMenuOpened(false); }, count: documentsCount },
    { icon: <IconPhoto size={20} />, label: 'Images', onClick: () => { onImagesClick?.(); setMenuOpened(false); }, count: imagesCount, batchesCount: batchesCount },
    { icon: <IconCalendar size={20} />, label: 'Appointments', onClick: () => console.log('Appointments') },
    { icon: <IconReceipt size={20} />, label: 'Accounts | Quotes', onClick: () => console.log('Accounts') },
    { icon: <IconList size={20} />, label: 'Orders', onClick: () => console.log('Orders') },
    { icon: <IconShoe size={20} />, label: 'Evaluation', onClick: () => console.log('Evaluation') },
    { icon: <IconFileText size={20} />, label: 'Letters', onClick: () => { onLettersClick?.(); setMenuOpened(false); } },
    { icon: <IconMessageCircle size={20} />, label: 'SMS', onClick: () => { onSmsClick?.(); setMenuOpened(false); } },
    { icon: <IconFileTypePdf size={20} />, label: "PDF's", onClick: () => console.log('PDFs') },
    { icon: <IconBrandNuxt size={20} />, label: 'NDIS', onClick: () => console.log('NDIS') },
    { icon: <IconTool size={20} />, label: 'Workshop Notes', onClick: () => console.log('Workshop') },
  ];

  const displayCount = filteredCount !== undefined ? filteredCount : contactCount;

  return (
    <Box>
      {/* First Row: Search/Filter, Title, Action Buttons */}
      <Group
        justify="space-between"
        wrap="nowrap"
        align="center"
        style={{
          backgroundColor: isDark ? '#25262b' : '#ffffff',
          padding: `${rem(16)} ${rem(24)}`,
          borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
          margin: 0,
        }}
      >
      {/* Left: Search Field with Filter Button */}
      <Group gap="md" wrap="nowrap" align="center">
        {showFilters && (
          <Popover
            opened={filterOpened}
            onChange={setFilterOpened}
            position="bottom-start"
            shadow="md"
            width={350}
            closeOnClickOutside={true}
            closeOnEscape={true}
          >
            <Popover.Target>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => setFilterOpened((o) => !o)}
                title="Filters"
                style={{ height: rem(36) }}
              >
                <IconFilter size={20} stroke={1.5} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="md">
                <Title order={4} style={{ marginBottom: rem(8) }}>Filters</Title>
                
                {filterOptions.funding && (
                  <Select
                    label="Funding"
                    placeholder="Select funding type"
                    data={filterOptions.funding}
                    value={filters.funding}
                    onChange={(value) => setFilters(prev => ({ ...prev, funding: value || '' }))}
                    clearable
                  />
                )}
                
                {filterOptions.clinic && (
                  <Select
                    label="Clinic"
                    placeholder="Select clinic"
                    data={filterOptions.clinic}
                    value={filters.clinic}
                    onChange={(value) => setFilters(prev => ({ ...prev, clinic: value || '' }))}
                    clearable
                  />
                )}
                
                {filterOptions.status && (
                  <Select
                    label="Status"
                    placeholder="Select status"
                    data={filterOptions.status}
                    value={filters.status}
                    onChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
                    clearable
                  />
                )}
                
                <Group justify="space-between" mt="md">
                  <Button variant="subtle" onClick={handleFilterClear}>
                    Clear
                  </Button>
                  <Button onClick={handleFilterApply}>
                    Apply Filters
                  </Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        )}
        
        <TextInput
          placeholder="Search..."
          leftSection={<IconSearch size={16} />}
          onChange={(event) => onSearch?.(event.currentTarget.value)}
          style={{ width: rem(300) }}
        />

        {/* Archive Toggle - Right of Search */}
        {archiveEnabled && (
          <Stack gap={4} align="center">
            <Switch
              checked={Boolean(filters.archived)}
              onChange={(event) => {
                const newArchived = event.currentTarget.checked;
                setFilters(prev => {
                  const updated = { ...prev, archived: newArchived };
                  // Apply archive filter immediately with updated state
                  onFilterApply?.(updated);
                  return updated;
                });
              }}
              size="md"
            />
            <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
              Archive
            </Text>
          </Stack>
        )}
      </Group>

      {/* Center: Title */}
      <Title 
        order={2} 
        style={{ 
          flex: 1, 
          textAlign: 'center',
          fontSize: rem(24),
          fontWeight: 500,
        }}
      >
        {title}
      </Title>

      {/* Right: Action Buttons */}
      <Group gap="xs" wrap="nowrap">
        {onAddNew && (
          <ActionIcon
            variant="filled"
            color="blue"
            size="lg"
            onClick={onAddNew}
            title="Add New"
          >
            <IconPlus size={20} stroke={1.5} />
          </ActionIcon>
        )}
        
        {onArchive && (
          <ActionIcon
            variant="default"
            size="lg"
            onClick={onArchive}
            title={archiveEnabled ? "Archive" : "Archive (not available for this contact type)"}
            disabled={!archiveEnabled}
            style={{ opacity: archiveEnabled ? 1 : 0.5 }}
          >
            <IconArchive size={20} stroke={1.5} />
          </ActionIcon>
        )}
      </Group>
    </Group>

      {/* Second Row: Count and Hamburger Menu */}
      <Group
        justify="space-between"
        wrap="nowrap"
        align="center"
        style={{
          backgroundColor: isDark ? '#1A1B1E' : '#f8f9fa',
          padding: `${rem(12)} ${rem(24)}`,
          borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
        }}
      >
        {/* Left: Count Display - Stacked and centered */}
        <Stack gap={4} align="center" style={{ flex: '0 0 auto' }}>
          <Text size="md" c="blue" fw={600} style={{ textAlign: 'center' }}>
            {displayCount} of {contactCount} found
          </Text>
          {achievedCount !== undefined && achievedCount > 0 && (
            <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
              {achievedCount} records achieved
            </Text>
          )}
        </Stack>

        {/* Right: Hamburger Menu */}
        <Popover
            opened={menuOpened}
            onChange={setMenuOpened}
            position="bottom-end"
            shadow="md"
            width={250}
          >
            <Popover.Target>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => setMenuOpened((o) => !o)}
                title="Menu"
              >
                <IconMenu2 size={20} stroke={1.5} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown p={0}>
              <Stack gap={0}>
                {menuItems.map((item, index) => (
                  <Box
                    key={index}
                    component="button"
                    onClick={() => {
                      item.onClick();
                      setMenuOpened(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      padding: `${rem(12)} ${rem(16)}`,
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: index < menuItems.length - 1 ? `1px solid ${isDark ? '#373A40' : '#dee2e6'}` : 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? '#25262b' : '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Grid style={{ width: '100%', margin: 0 }}>
                      <Grid.Col span={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box style={{ color: '#228BE6' }}>
                          {item.icon}
                        </Box>
                      </Grid.Col>
                      <Grid.Col span={10} style={{ display: 'flex', alignItems: 'center', paddingLeft: rem(12), position: 'relative' }}>
                        <Text size="sm" c={isDark ? '#C1C2C5' : '#495057'}>
                          {item.label}
                        </Text>
                        {/* Badges for Notes and Documents */}
                        {(item.label === 'Notes' && notesCount > 0) || (item.label === 'Documents' && documentsCount > 0) ? (
                          <Badge
                            size="xs"
                            color="red"
                            variant="filled"
                            style={{
                              position: 'absolute',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              right: 0,
                              minWidth: rem(18),
                              height: rem(18),
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: rem(10),
                              fontWeight: 700,
                            }}
                          >
                            {item.label === 'Notes' 
                              ? (notesCount > 99 ? '99+' : notesCount)
                              : (documentsCount > 99 ? '99+' : documentsCount)
                            }
                          </Badge>
                        ) : null}
                        {/* Badges for Images: Blue (batches) and Red (images) */}
                        {item.label === 'Images' && (imagesCount > 0 || batchesCount > 0) ? (
                          <Group gap={24} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: 0 }}>
                            {batchesCount > 0 && (
                              <Badge
                                size="xs"
                                color="blue"
                                variant="filled"
                                style={{
                                  minWidth: rem(18),
                                  height: rem(18),
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: rem(10),
                                  fontWeight: 700,
                                }}
                              >
                                {batchesCount > 99 ? '99+' : batchesCount}
                              </Badge>
                            )}
                            {imagesCount > 0 && (
                              <Badge
                                size="xs"
                                color="red"
                                variant="filled"
                                style={{
                                  minWidth: rem(18),
                                  height: rem(18),
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: rem(10),
                                  fontWeight: 700,
                                }}
                              >
                                {imagesCount > 99 ? '99+' : imagesCount}
                              </Badge>
                            )}
                          </Group>
                        ) : null}
                      </Grid.Col>
                    </Grid>
                  </Box>
                ))}
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Group>
    </Box>
  );
}

