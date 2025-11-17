'use client';

import { useState, useEffect, useRef } from 'react';
import { Group, TextInput, Title, ActionIcon, rem, useMantineColorScheme, Popover, Stack, Button, Select, Text, Box, Switch, Grid, Badge } from '@mantine/core';
import { IconSearch, IconPlus, IconArchive, IconFilter, IconMenu2, IconNote, IconFiles, IconPhoto, IconCalendar, IconReceipt, IconList, IconShoe, IconFileText, IconMessageCircle, IconFileTypePdf, IconBrandNuxt, IconTool, IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import AccountsQuotesDialog from './dialogs/AccountsQuotesDialog';

interface ContactHeaderProps {
  title: string;
  onSearch?: (value: string) => void;
  onAddNew?: () => void;
  onArchive?: () => void;
  onNotesClick?: () => void;
  onDocumentsClick?: () => void;
  onImagesClick?: () => void;
  onAppointmentsClick?: () => void;
  onLettersClick?: () => void;
  onSmsClick?: () => void;
  patientId?: string; // For getting note and document counts
  selectedPatientName?: string; // Name of selected patient to display
  selectedPatientAddress?: {
    street?: string;
    street2?: string;
    suburb?: string;
    postcode?: string;
    state?: string;
  };
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
  onAppointmentsClick,
  onLettersClick,
  onSmsClick,
  patientId,
  selectedPatientName,
  selectedPatientAddress,
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
  const [accountsQuotesOpened, setAccountsQuotesOpened] = useState(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [notesCount, setNotesCount] = useState<number>(0);
  const [documentsCount, setDocumentsCount] = useState<number>(0);
  const [imagesCount, setImagesCount] = useState<number>(0);
  const [batchesCount, setBatchesCount] = useState<number>(0);
  const [appointmentsCount, setAppointmentsCount] = useState<number>(0);
  const [lettersCount, setLettersCount] = useState<number>(0);
  const [smsUnreadCount, setSmsUnreadCount] = useState<number>(0);
  const [filters, setFilters] = useState({
    funding: '',
    clinic: '',
    status: '',
    archived: showArchived || false, // Include archived in filters
  });

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handleNameClick = (e: React.MouseEvent<HTMLHeadingElement>) => {
    // Clear any existing timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    // Wait to see if it's a double click
    clickTimerRef.current = setTimeout(() => {
      // Single click - copy just the name
      navigator.clipboard.writeText(selectedPatientName || '');
      // Visual feedback
      const element = e.currentTarget;
      const originalColor = element.style.color;
      element.style.color = '#228BE6'; // Blue color
      setTimeout(() => {
        element.style.color = originalColor;
      }, 200);
      clickTimerRef.current = null;
    }, 250); // Wait 250ms to detect double click
  };
  
  const handleNameDoubleClick = (e: React.MouseEvent<HTMLHeadingElement>) => {
    // Clear the single click timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    // Double click - copy name + address
    if (selectedPatientAddress && selectedPatientName) {
      const addressLines = [];
      addressLines.push(selectedPatientName);
      
      if (selectedPatientAddress.street) {
        addressLines.push(selectedPatientAddress.street);
      }
      if (selectedPatientAddress.street2) {
        addressLines.push(selectedPatientAddress.street2);
      }
      if (selectedPatientAddress.suburb) {
        addressLines.push(selectedPatientAddress.suburb);
      }
      
      // Last line: postcode, state
      const lastLineParts = [];
      if (selectedPatientAddress.postcode) {
        lastLineParts.push(selectedPatientAddress.postcode);
      }
      if (selectedPatientAddress.state) {
        lastLineParts.push(selectedPatientAddress.state);
      }
      if (lastLineParts.length > 0) {
        addressLines.push(lastLineParts.join(', '));
      }
      
      const fullAddress = addressLines.join('\n');
      navigator.clipboard.writeText(fullAddress);
      
      // Visual feedback
      const element = e.currentTarget;
      const originalColor = element.style.color;
      element.style.color = '#228BE6'; // Blue color
      setTimeout(() => {
        element.style.color = originalColor;
      }, 200);
    } else if (selectedPatientName) {
      // No address, just copy name
      navigator.clipboard.writeText(selectedPatientName);
    }
  };

  // Get images count for patient
  useEffect(() => {
    const getImagesCount = async () => {
      try {
        if (patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
          const response = await fetch(`https://localhost:8000/api/images/batches/?patient_id=${patientId}&t=${Date.now()}`, {
            credentials: 'include',
          });
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
          const response = await fetch(`https://localhost:8000/api/notes/?patient_id=${patientId}&t=${Date.now()}`, {
            credentials: 'include',
          });
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

    // Only fetch when menu is opened
    if (menuOpened) {
      getNotesCount();
    }
    
    // Listen for storage changes (when notes are added/deleted in other tabs/components)
    const handleStorageChange = (e: StorageEvent) => {
      if (!patientId && menuOpened) {
        const storageKey = 'walkeasy_nexus_notes';
        if (e.key === storageKey) {
          getNotesCount();
        }
      }
    };
    
    // Listen for custom event when notes change in NotesDialog
    const handleNotesChange = () => {
      if (menuOpened) {
        getNotesCount();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('notesUpdated', handleNotesChange);
    
    // Refresh count periodically ONLY when menu is open
    let interval: NodeJS.Timeout | undefined;
    if (menuOpened) {
      interval = setInterval(getNotesCount, 5000); // Reduced from 2s to 5s
    }
    
    return () => {
      if (interval) clearInterval(interval);
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
          const response = await fetch(`https://localhost:8000/api/documents/?patient_id=${patientId}&t=${Date.now()}`, {
            credentials: 'include',
          });
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

    // Only fetch when menu is opened
    if (menuOpened) {
      getDocumentsCount();
    }
    
    // Listen for custom event when documents change
    const handleDocumentsChange = () => {
      if (menuOpened) {
        getDocumentsCount();
      }
    };
    
    window.addEventListener('documentsUpdated', handleDocumentsChange);
    
    // Refresh count periodically ONLY when menu is open
    let interval: NodeJS.Timeout | undefined;
    if (menuOpened) {
      interval = setInterval(getDocumentsCount, 5000); // Reduced from 2s to 5s
    }
    
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('documentsUpdated', handleDocumentsChange);
    };
  }, [patientId, menuOpened]);

  // Get appointments count for patient
  useEffect(() => {
    const getAppointmentsCount = async () => {
      try {
        // Only make API call if patientId is a valid UUID format
        if (patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
          // Load from API for patient-specific appointments
          const response = await fetch(`https://localhost:8000/api/appointments/?patient=${patientId}&t=${Date.now()}`, {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            console.log('Appointments API response:', data); // DEBUG
            console.log('data.count:', data.count); // DEBUG
            console.log('data.results length:', data.results?.length); // DEBUG
            
            // Check if API returns a 'count' field (Django REST pagination)
            if (data.count !== undefined) {
              setAppointmentsCount(data.count);
            } else {
              // Fallback to array length
              const appointmentsList = data.results || data;
              setAppointmentsCount(Array.isArray(appointmentsList) ? appointmentsList.length : 0);
            }
          } else {
            setAppointmentsCount(0);
          }
        } else {
          setAppointmentsCount(0);
        }
      } catch (err) {
        console.error('Error loading appointments count:', err);
        setAppointmentsCount(0);
      }
    };

    // Only fetch when menu is opened
    if (menuOpened) {
      getAppointmentsCount();
    }
    
    // Listen for custom event when appointments change
    const handleAppointmentsChange = () => {
      if (menuOpened) {
        getAppointmentsCount();
      }
    };
    
    window.addEventListener('appointmentsUpdated', handleAppointmentsChange);
    
    // Refresh count periodically ONLY when menu is open
    let interval: NodeJS.Timeout | undefined;
    if (menuOpened) {
      interval = setInterval(getAppointmentsCount, 5000); // Every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('appointmentsUpdated', handleAppointmentsChange);
    };
  }, [patientId, menuOpened]);

  // Get letters count for patient
  useEffect(() => {
    const getLettersCount = async () => {
      try {
        // Only make API call if patientId is a valid UUID format
        if (patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
          // Load from API for patient-specific letters
          const response = await fetch(`https://localhost:8000/api/letters/?patient_id=${patientId}&t=${Date.now()}`, {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            const lettersList = data.results || data;
            setLettersCount(Array.isArray(lettersList) ? lettersList.length : 0);
          } else {
            setLettersCount(0);
          }
        } else {
          setLettersCount(0);
        }
      } catch (err) {
        console.error('Error loading letters count:', err);
        setLettersCount(0);
      }
    };

    // Only fetch when menu is opened
    if (menuOpened) {
      getLettersCount();
    }
    
    // Listen for custom event when letters change
    const handleLettersChange = () => {
      if (menuOpened) {
        getLettersCount();
      }
    };
    
    window.addEventListener('lettersUpdated', handleLettersChange);
    
    // Refresh count periodically ONLY when menu is open
    let interval: NodeJS.Timeout | undefined;
    if (menuOpened) {
      interval = setInterval(getLettersCount, 5000); // Reduced from 2s to 5s
    }
    
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('lettersUpdated', handleLettersChange);
    };
  }, [patientId, menuOpened]);

  // Get unread SMS count for patient
  useEffect(() => {
    const getSmsUnreadCount = async () => {
      try {
        // Only make API call if patientId is a valid UUID format
        if (patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
          // Load from API for patient-specific unread SMS
          const response = await fetch(`https://localhost:8000/api/sms/patient/${patientId}/unread-count/?t=${Date.now()}`, {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            setSmsUnreadCount(data.unread_count || 0);
          } else {
            setSmsUnreadCount(0);
          }
        } else {
          setSmsUnreadCount(0);
        }
      } catch (err) {
        console.error('Error loading SMS unread count:', err);
        setSmsUnreadCount(0);
      }
    };

    // Only fetch when menu is opened
    if (menuOpened) {
      getSmsUnreadCount();
    }
    
    // Listen for custom event when SMS messages are read
    const handleSmsRead = () => {
      if (menuOpened) {
        getSmsUnreadCount();
      }
    };
    
    window.addEventListener('smsRead', handleSmsRead);
    
    // Refresh count periodically ONLY when menu is open
    let interval: NodeJS.Timeout | undefined;
    if (menuOpened) {
      interval = setInterval(getSmsUnreadCount, 10000); // Every 10 seconds (reduced from 5s)
    }
    
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('smsRead', handleSmsRead);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]); // Only depend on showArchived, not filters.archived (intentional)

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
    { icon: <IconCalendar size={20} />, label: 'Appointments', onClick: () => { onAppointmentsClick?.(); setMenuOpened(false); }, count: appointmentsCount },
    { icon: <IconReceipt size={20} />, label: 'Accounts | Quotes', onClick: () => { setAccountsQuotesOpened(true); setMenuOpened(false); } },
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
                const updatedFilters = { ...filters, archived: newArchived };
                setFilters(updatedFilters);
                // Call onFilterApply after state update completes (next tick)
                setTimeout(() => {
                  onFilterApply?.(updatedFilters);
                }, 0);
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

        {/* Center: Selected Patient Name */}
        {selectedPatientName && (
          <Title 
            order={3} 
            style={{ 
              flex: 1, 
              textAlign: 'center', 
              fontSize: rem(20), 
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
            onClick={handleNameClick}
            onDoubleClick={handleNameDoubleClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#228BE6'; // Blue on hover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = ''; // Reset to default
            }}
            title={selectedPatientAddress ? "Click to copy name | Double-click to copy name + address" : "Click to copy name"}
          >
            {selectedPatientName}
          </Title>
        )}

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
                        {/* Badges for Notes, Documents, Appointments, Letters, and SMS */}
                        {((item.label === 'Notes' && notesCount > 0) || 
                          (item.label === 'Documents' && documentsCount > 0) || 
                          (item.label === 'Appointments' && appointmentsCount > 0) ||
                          (item.label === 'Letters' && lettersCount > 0) ||
                          (item.label === 'SMS' && smsUnreadCount > 0)) ? (
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
                              : item.label === 'Documents'
                              ? (documentsCount > 99 ? '99+' : documentsCount)
                              : item.label === 'Appointments'
                              ? (appointmentsCount > 99 ? '99+' : appointmentsCount)
                              : item.label === 'Letters'
                              ? (lettersCount > 99 ? '99+' : lettersCount)
                              : (smsUnreadCount > 99 ? '99+' : smsUnreadCount)
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

      {/* Accounts | Quotes Dialog */}
      <AccountsQuotesDialog
        opened={accountsQuotesOpened}
        onClose={() => setAccountsQuotesOpened(false)}
        patientId={patientId}
        patientName={selectedPatientName}
      />
    </Box>
  );
}

