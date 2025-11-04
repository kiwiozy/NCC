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
  patientId?: string; // For getting note count
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
  const [filters, setFilters] = useState({
    funding: '',
    clinic: '',
    status: '',
    archived: showArchived || false, // Include archived in filters
  });

  // Get notes count for patient
  useEffect(() => {
    const getNotesCount = async () => {
      try {
        if (patientId) {
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
    { icon: <IconNote size={20} />, label: 'Notes', onClick: () => { onNotesClick?.(); setMenuOpened(false); } },
    { icon: <IconFiles size={20} />, label: 'Documents', onClick: () => console.log('Documents') },
    { icon: <IconPhoto size={20} />, label: 'Images', onClick: () => console.log('Images') },
    { icon: <IconCalendar size={20} />, label: 'Appointments', onClick: () => console.log('Appointments') },
    { icon: <IconReceipt size={20} />, label: 'Accounts | Quotes', onClick: () => console.log('Accounts') },
    { icon: <IconList size={20} />, label: 'Orders', onClick: () => console.log('Orders') },
    { icon: <IconShoe size={20} />, label: 'Evaluation', onClick: () => console.log('Evaluation') },
    { icon: <IconFileText size={20} />, label: 'Letters', onClick: () => console.log('Letters') },
    { icon: <IconMessageCircle size={20} />, label: 'SMS', onClick: () => console.log('SMS') },
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
                        {item.label === 'Notes' && notesCount > 0 && (
                          <Badge
                            size="xs"
                            color="red"
                            variant="filled"
                            style={{
                              position: 'absolute',
                              top: rem(-4),
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
                            {notesCount > 99 ? '99+' : notesCount}
                          </Badge>
                        )}
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

