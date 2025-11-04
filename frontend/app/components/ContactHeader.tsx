'use client';

import { useState, useEffect } from 'react';
import { Group, TextInput, Title, ActionIcon, rem, useMantineColorScheme, Popover, Stack, Button, Select, Text, Box, Switch } from '@mantine/core';
import { IconSearch, IconPlus, IconArchive, IconFilter, IconMenu2, IconNote, IconFiles, IconPhoto, IconCalendar, IconReceipt, IconList, IconShoe, IconFileText, IconMessageCircle, IconFileTypePdf, IconBrandNuxt, IconTool, IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface ContactHeaderProps {
  title: string;
  onSearch?: (value: string) => void;
  onAddNew?: () => void;
  onArchive?: () => void;
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
  const [filters, setFilters] = useState({
    funding: '',
    clinic: '',
    status: '',
    archived: showArchived || false, // Include archived in filters
  });

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
    { icon: <IconNote size={20} />, label: 'Notes', onClick: () => console.log('Notes') },
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
        style={{
          backgroundColor: isDark ? '#25262b' : '#ffffff',
          padding: `${rem(16)} ${rem(24)}`,
          borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
          margin: 0,
        }}
      >
      {/* Left: Search Field with Filter Button */}
      <Group gap="md" wrap="nowrap" align="flex-end">
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
        style={{
          backgroundColor: isDark ? '#1A1B1E' : '#f8f9fa',
          padding: `${rem(12)} ${rem(24)}`,
          borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
        }}
      >
        {/* Left: Count Display - Stacked and left-aligned */}
        <Stack gap={4} align="flex-start" style={{ flex: '0 0 auto' }}>
          <Text size="md" c="blue" fw={600} style={{ textAlign: 'left' }}>
            {displayCount} of {contactCount} found
          </Text>
          {achievedCount !== undefined && achievedCount > 0 && (
            <Text size="xs" c="dimmed" style={{ textAlign: 'left' }}>
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
                  <Button
                    key={index}
                    variant="subtle"
                    color="blue"
                    leftSection={item.icon}
                    onClick={() => {
                      item.onClick();
                      setMenuOpened(false);
                    }}
                    style={{
                      justifyContent: 'flex-start',
                      height: rem(42),
                      borderRadius: 0,
                      borderBottom: index < menuItems.length - 1 ? `1px solid ${isDark ? '#373A40' : '#dee2e6'}` : 'none',
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Group>
    </Box>
  );
}

