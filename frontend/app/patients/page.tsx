'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Paper, Text, Loader, Center, Grid, Stack, Box, ScrollArea, UnstyledButton, Badge, Group, TextInput, Select, Textarea, rem, ActionIcon, Modal, Button } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconPlus, IconCalendar, IconSearch, IconListCheck } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import Navigation from '../components/Navigation';
import ContactHeader from '../components/ContactHeader';
import { formatDateOnlyAU } from '../utils/dateFormatting';
import dayjs from 'dayjs';

type ContactType = 'patients' | 'referrers' | 'coordinator' | 'ndis-lac' | 'contacts' | 'companies' | 'clinics';

interface Contact {
  id: string;
  name: string;
  clinic: string;
  funding: string;
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dob: string;
  age: number;
  healthNumber: string;
  coordinators?: Array<{
    name: string;
    date: string;
  }>;
  // Legacy single coordinator support (for backwards compatibility)
  coordinator?: {
    name: string;
    date: string;
  };
  planDates?: string;
  communication?: {
    phone?: string;
    email?: string;
  };
  note?: string;
}

// Transform API patient data to Contact interface
const transformPatientToContact = (patient: any): Contact => {
  // Format date as DD/MMM/YYYY (using existing date utility)
  const formatDate = (dateStr: string | null | undefined, isRecursive: boolean = false): string => {
    if (!dateStr) return '';
    
    const trimmed = typeof dateStr === 'string' ? dateStr.trim() : '';
    
    // If already formatted in DD MMM YYYY format, return as-is
    if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    
    // If in old DD/MMM/YYYY format, convert to DD MMM YYYY
    if (/^\d{1,2}\/[A-Za-z]{3}\/\d{4}$/.test(trimmed)) {
      return trimmed.replace(/\//g, ' ');
    }
    
    // Check if it contains "/YYYY" at the end (malformed date from previous bug)
    // This must be checked BEFORE other formats to catch "11 Sep 1947/09/YYYY"
    if (trimmed.includes('/YYYY') || trimmed.match(/\/\d{1,2}\/YYYY$/)) {
      // Extract just the date part before "/YYYY" and any trailing numbers
      const cleanDate = trimmed.split('/YYYY')[0].trim();
      // Remove any trailing "/NN" pattern (like "/09")
      const cleaned = cleanDate.replace(/\/\d{1,2}$/, '').trim();
      // Recursively format the clean date (but only once to prevent infinite loop)
      if (!isRecursive && cleaned) {
        return formatDate(cleaned, true);
      }
      return cleaned; // Fallback if recursive didn't work
    }
    
    // Check if it's in old format with spaces (e.g., "11 Sep 1947") and convert
    // This pattern matches "11 Sep 1947" even if followed by "/09/YYYY"
      const oldFormatMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
      if (oldFormatMatch) {
        const [, day, month, year] = oldFormatMatch;
        // Already in correct format: "10 May 2000"
        return `${day} ${month} ${year}`;
      }
    
    // Check if it looks like a partially formatted date with month name and numbers
    // Pattern like "11 Sep 1947/09" - extract just the date part
    const partialFormatMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    if (partialFormatMatch) {
      const [, day, month, year] = partialFormatMatch;
      return `${day}/${month}/${year}`;
    }
    
    // CRITICAL CHECK: If date contains letters (month names), NEVER call formatDateOnlyAU
    // This must be checked BEFORE checking for ISO format
    if (/[A-Za-z]/.test(trimmed)) {
      // Already contains letters - must be formatted already
      // Extract and convert to DD/MMM/YYYY format
      const extractMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
      if (extractMatch) {
        const [, d, m, y] = extractMatch;
        return `${d} ${m} ${y}`;
      }
      // If already in DD MMM YYYY format, return as-is
      if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/.test(trimmed)) {
        return trimmed;
      }
      // If in DD/MMM/YYYY format, convert to DD MMM YYYY
      if (/^\d{1,2}\/[A-Za-z]{3}\/\d{4}/.test(trimmed)) {
        return trimmed.replace(/\//g, ' ');
      }
      console.warn('Date contains letters but format unclear:', trimmed);
      return trimmed;
    }
    
    // Only process if it looks like an ISO date string (YYYY-MM-DD) or similar
    // If it's already a formatted date string, don't try to format it again
    if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed) && !trimmed.includes('T')) {
      // Doesn't look like an ISO date - return as-is to avoid double formatting
      console.warn('Date string does not look like ISO format:', trimmed);
      return trimmed;
    }
    
    try {
      
      // First, get the formatted date in DD/MM/YYYY format
      const formatted = formatDateOnlyAU(dateStr); // Returns DD/MM/YYYY (e.g., "11/09/1947")
      
      // If formatDateOnlyAU returns empty or invalid, return empty
      if (!formatted || formatted.trim() === '' || formatted === 'Invalid DateTime') {
        console.warn('Invalid date from formatDateOnlyAU:', formatted, 'for input:', dateStr);
        return '';
      }
      
      // Check if formatDateOnlyAU returned something with letters (shouldn't happen for ISO dates)
      if (/[A-Za-z]/.test(formatted)) {
        console.error('formatDateOnlyAU returned formatted date with letters:', formatted, 'for ISO input:', dateStr);
        // This shouldn't happen - formatDateOnlyAU should only return DD/MM/YYYY
        // Return original ISO date to avoid corruption
        return dateStr;
      }
      
      // Split the formatted date (DD/MM/YYYY)
      const parts = formatted.split('/');
      if (parts.length !== 3) {
        console.warn('Unexpected date format from formatDateOnlyAU:', formatted, 'parts:', parts);
        return formatted; // Return as-is if format is unexpected
      }
      
      const [day, month, year] = parts.map(p => p.trim());
      
      // Validate parts are numbers
      if (!day || !month || !year || isNaN(parseInt(day)) || isNaN(parseInt(month)) || isNaN(parseInt(year))) {
        console.warn('Invalid date parts:', { day, month, year }, 'from formatted:', formatted, 'original input:', dateStr);
        return formatted;
      }
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(month, 10) - 1;
      
      if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        console.warn('Invalid month index:', monthIndex, 'from month:', month);
        return formatted; // Return as-is if invalid
      }
      
      // Return formatted as "DD MMM YYYY" (e.g., "10 May 2000")
      return `${day} ${months[monthIndex]} ${year}`;
    } catch (error) {
      console.error('Error formatting date:', error, 'for input:', dateStr);
      return '';
    }
  };

  // Format date as DD/MM/YYYY (using existing utility)
  const formatDateShort = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    return formatDateOnlyAU(dateStr);
  };

  // Format date range
  const formatDateRange = (start: string | null | undefined, end: string | null | undefined): string | undefined => {
    if (!start || !end) return undefined;
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  // Handle both full serializer and list serializer responses
  // List serializer returns: full_name, age, dob
  // Full serializer returns: first_name, last_name, middle_names, title, clinic, funding_type, etc.
  
  // Build name - handle both full_name (from list) and separate fields (from detail)
  let displayName = '';
  let firstName = '';
  let middleName = '';
  let lastName = '';
  let title = '';
  
  if (patient.full_name) {
    // Using list serializer - just use full_name
    displayName = patient.full_name;
    // Try to parse name parts if possible
    const nameParts = patient.full_name.split(' ');
    firstName = nameParts[0] || '';
    lastName = nameParts[nameParts.length - 1] || '';
  } else {
    // Using full serializer - build from parts
    const titleMap: Record<string, string> = {
      'Mr': 'Mr.',
      'Mrs': 'Mrs.',
      'Ms': 'Ms.',
      'Miss': 'Miss',
      'Dr': 'Dr.',
      'Prof': 'Prof.',
    };
    title = patient.title ? titleMap[patient.title] || patient.title : '';
    firstName = patient.first_name || '';
    middleName = patient.middle_names || '';
    lastName = patient.last_name || '';
    const nameParts = [firstName];
    if (middleName) nameParts.push(middleName);
    nameParts.push(lastName);
    const fullName = nameParts.join(' ');
    displayName = title ? `${title} ${fullName}` : fullName;
  }

  // Extract clinic and funding names (may not be in list serializer)
  const clinicName = patient.clinic?.name || '';
  const fundingName = patient.funding_type?.name || '';

  // Extract contact info (may not be in list serializer)
  const contactJson = patient.contact_json || {};
  const phone = contactJson.phone || contactJson.mobile || '';
  const email = contactJson.email || '';

  // Format DOB - ensure we only pass ISO dates to formatDate
  let formattedDob = '';
  if (patient.dob) {
    // CRITICAL: Only format if it's an ISO date (YYYY-MM-DD)
    const dobStr = String(patient.dob).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(dobStr) || dobStr.includes('T')) {
      // It's an ISO date - safe to format
      formattedDob = formatDate(patient.dob);
      // Debug: Log if formatting fails
      if (!formattedDob || formattedDob === dobStr) {
        console.warn('Date formatting may have failed:', { original: dobStr, formatted: formattedDob });
      }
    } else {
      // Not an ISO date - might be already formatted or corrupted
      console.error('CRITICAL: Patient DOB is not ISO format:', dobStr, 'for patient:', patient.id);
      // Try to extract and format if it's in old format
      const oldMatch = dobStr.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
      if (oldMatch) {
        const [, d, m, y] = oldMatch;
        formattedDob = `${d} ${m} ${y}`;
      } else {
        formattedDob = dobStr; // Return as-is to avoid further corruption
      }
    }
  }

  return {
    id: patient.id,
    name: displayName,
    clinic: clinicName,
    funding: fundingName,
    title: title || '',
    firstName: firstName,
    middleName: middleName || undefined,
    lastName: lastName,
    dob: formattedDob,
    age: patient.age || 0,
    healthNumber: patient.health_number || '',
    coordinator: patient.coordinator_name ? {
      name: patient.coordinator_name,
      date: formatDateShort(patient.coordinator_date),
    } : undefined,
    planDates: formatDateRange(patient.plan_start_date, patient.plan_end_date),
    communication: phone || email ? {
      phone: phone || undefined,
      email: email || undefined,
    } : undefined,
    note: patient.notes || '',
  };
};

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const [activeType, setActiveType] = useState<ContactType>('patients');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string | boolean>>({ archived: false });
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [archivedCount, setArchivedCount] = useState<number>(0);
  const [archiveConfirmOpened, setArchiveConfirmOpened] = useState(false);
  const [archiveErrorOpened, setArchiveErrorOpened] = useState(false);
  const [archiveErrorMessage, setArchiveErrorMessage] = useState('');
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Coordinator dialog state
  const [coordinatorDialogOpened, setCoordinatorDialogOpened] = useState(false);
  const [coordinatorSearchQuery, setCoordinatorSearchQuery] = useState('');
  const [coordinatorSearchResults, setCoordinatorSearchResults] = useState<any[]>([]);
  const [coordinatorLoading, setCoordinatorLoading] = useState(false);
  const [coordinatorDate, setCoordinatorDate] = useState<Date | null>(null);
  
  // Coordinator list dialog state
  const [coordinatorListDialogOpened, setCoordinatorListDialogOpened] = useState(false);
  
  // Helper to get coordinators array (handles both old single coordinator and new array)
  const getCoordinators = (contact: Contact | null): Array<{name: string; date: string}> => {
    if (!contact) return [];
    if (contact.coordinators && contact.coordinators.length > 0) {
      return contact.coordinators;
    }
    if (contact.coordinator) {
      return [contact.coordinator];
    }
    return [];
  };
  
  // Get current coordinator (most recent one)
  const getCurrentCoordinator = (contact: Contact | null) => {
    const coordinators = getCoordinators(contact);
    if (coordinators.length === 0) return null;
    // Sort by date descending and return most recent
    return coordinators.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    })[0];
  };
  
  // Load clinics and funding sources from API for filter dropdown
  const [clinics, setClinics] = useState<string[]>(['Newcastle', 'Tamworth', 'Port Macquarie', 'Armidale']);
  const [fundingSources, setFundingSources] = useState<string[]>(['NDIS', 'Private', 'DVA', 'Workers Comp', 'Medicare']);
  
  // Apply filters to contacts (archived filter is handled at API level, not here)
  const applyFilters = (contactList: Contact[], query: string, filters: Record<string, string | boolean>) => {
    let filtered = [...contactList];

    // Filter by search query
    if (query) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(query.toLowerCase()) ||
        contact.firstName.toLowerCase().includes(query.toLowerCase()) ||
        contact.lastName.toLowerCase().includes(query.toLowerCase()) ||
        contact.healthNumber.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Filter by clinic
    if (filters.clinic && typeof filters.clinic === 'string') {
      filtered = filtered.filter(contact => contact.clinic === filters.clinic);
    }

    // Filter by funding
    if (filters.funding && typeof filters.funding === 'string') {
      filtered = filtered.filter(contact => contact.funding === filters.funding);
    }

    // Note: archived filter is handled at API level, not in client-side filtering

    setContacts(filtered);
    
    // Update selected contact if current selection is not in filtered list
    if (selectedContact && !filtered.find(c => c.id === selectedContact?.id)) {
      setSelectedContact(filtered[0] || null);
    }
  };

  // Load archived count from API
  useEffect(() => {
    if (typeof window === 'undefined' || activeType !== 'patients') return;
    
    const loadArchivedCount = async () => {
      try {
        const response = await fetch('https://localhost:8000/api/patients/?archived=true');
        if (response.ok) {
          const data = await response.json();
          const archivedPatients = data.results || data;
          setArchivedCount(Array.isArray(archivedPatients) ? archivedPatients.length : 0);
        }
      } catch (error) {
        console.error('Failed to load archived count:', error);
        setArchivedCount(0);
      }
    };
    
    loadArchivedCount();
  }, [activeType]);

  // Load patients from API
  useEffect(() => {
    // Only load on client side to prevent hydration mismatch
    if (typeof window === 'undefined') return;
    
    const loadPatients = async () => {
      if (activeType !== 'patients') return; // Only load for patients type
      
      setLoading(true);
      // Clear ALL state first to prevent any stale data
      setAllContacts([]);
      setContacts([]);
      setSelectedContact(null);
      
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (searchQuery) {
          params.append('search', searchQuery);
        }
        // Add archived filter from activeFilters
        const archivedValue = activeFilters.archived === true || activeFilters.archived === 'true';
        params.append('archived', String(archivedValue));
        // Note: Clinic and funding filtering is done client-side for now
        // Can be enhanced to use API filtering later

        const response = await fetch(`https://localhost:8000/api/patients/?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          // Handle paginated response
          const patients = data.results || data;
          
          // Transform fresh from API - always use ISO dates from API
          const transformed = patients.map((patient: any) => {
            // Ensure we're working with fresh ISO date from API (not cached formatted date)
            // Force dob to be ISO format - if it's not, log and skip formatting
            const isoDob = patient.dob;
            if (!isoDob || (!/^\d{4}-\d{2}-\d{2}/.test(isoDob) && !isoDob.includes('T'))) {
              console.warn('Unexpected DOB format from API:', isoDob, 'for patient:', patient.id);
              // If not ISO, return patient with dob as-is but log warning
            }
            // Create fresh patient object with ISO dob
            const freshPatient = { ...patient, dob: isoDob };
            return transformPatientToContact(freshPatient);
          });
          setAllContacts(transformed);
          
          // Apply client-side filtering
          applyFilters(transformed, searchQuery, activeFilters);
          
          // Select first contact
          if (transformed.length > 0) {
            setSelectedContact(transformed[0]);
          }
        } else {
          console.error('Failed to load patients:', response.statusText);
          setAllContacts([]);
        }
      } catch (error) {
        console.error('Error loading patients:', error);
        setAllContacts([]);
      } finally {
        setLoading(false);
      }
    };

    // Only load if we're on the client side
    if (typeof window !== 'undefined') {
      loadPatients();
    }
  }, [activeType, activeFilters.archived, searchQuery]); // Reload when type, archive filter, or search changes

  useEffect(() => {
    // Only load on client side
    if (typeof window === 'undefined') return;

    // Load clinics from API
    const loadClinics = async () => {
      try {
        const response = await fetch('https://localhost:8000/api/clinics/');
        if (response.ok) {
          const data = await response.json();
          // Handle paginated response or direct array
          const clinicsList = Array.isArray(data) ? data : (data.results || []);
          // Extract clinic names from API response
          const clinicNames = clinicsList.map((clinic: any) => clinic.name);
          if (clinicNames.length > 0) {
            setClinics(clinicNames);
          }
          // Keep hardcoded defaults if API returns empty or error
        }
      } catch (error) {
        console.error('Failed to load clinics:', error);
        // Keep hardcoded defaults on error
      }
    };
    
    // Load funding sources from API
    const loadFundingSources = async () => {
      try {
        const response = await fetch('https://localhost:8000/api/settings/funding-sources/?active=true');
        if (response.ok) {
          const data = await response.json();
          // Extract funding source names from API response (handles paginated response)
          const sources = data.results || data;
          const sourceNames = sources.map((source: any) => source.name);
          setFundingSources(sourceNames);
        }
      } catch (error) {
        console.error('Failed to load funding sources:', error);
        // Keep hardcoded defaults on error
      }
    };
    
    loadClinics();
    loadFundingSources();
  }, []);

  // Search coordinators
  const searchCoordinators = async (query: string) => {
    if (typeof window === 'undefined') return;
    
    setCoordinatorLoading(true);
    try {
      // TODO: Replace with actual coordinator API endpoint when available
      // For now, using mock data or searching contacts with type=coordinator
      // When coordinator API exists: GET /api/coordinators/?search={query}
      
      // Mock coordinator data for now
      const mockCoordinators = [
        { id: '1', name: 'Warda - Ability Connect', organization: 'Ability Connect' },
        { id: '2', name: 'Sarah Johnson - NDIS Support', organization: 'NDIS Support Services' },
        { id: '3', name: 'Michael Chen - Support Coordination', organization: 'Support Coordination Plus' },
      ];
      
      // Filter by search query
      const filtered = query 
        ? mockCoordinators.filter(c => 
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.organization.toLowerCase().includes(query.toLowerCase())
          )
        : mockCoordinators;
      
      setCoordinatorSearchResults(filtered);
    } catch (error) {
      console.error('Error searching coordinators:', error);
      setCoordinatorSearchResults([]);
    } finally {
      setCoordinatorLoading(false);
    }
  };

  // Handle coordinator search input change and load on dialog open
  useEffect(() => {
    if (coordinatorDialogOpened) {
      // Load coordinators when dialog opens
      if (!coordinatorSearchQuery) {
        searchCoordinators('');
      } else {
        // Debounce search
        const timer = setTimeout(() => {
          searchCoordinators(coordinatorSearchQuery);
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [coordinatorSearchQuery, coordinatorDialogOpened]);

  useEffect(() => {
    const type = searchParams.get('type') as ContactType;
    if (type) {
      setActiveType(type);
    }
  }, [searchParams]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    // Apply filters immediately to existing data
    if (allContacts.length > 0) {
      applyFilters(allContacts, value, activeFilters);
    }
  };

  const handleFilterApply = (filters: Record<string, string | boolean>) => {
    setActiveFilters(filters);
    // When archive filter changes, we need to reload from API
    // Other filters can be applied client-side to existing data
    const archivedChanged = activeFilters.archived !== filters.archived;
    if (archivedChanged) {
      // Archive filter changed - will trigger useEffect to reload from API
      return;
    }
    // Apply filters immediately to existing data (only for non-archive filters)
    if (allContacts.length > 0) {
      applyFilters(allContacts, searchQuery, filters);
    }
  };

  // Re-apply filters when allContacts changes
  useEffect(() => {
    if (allContacts.length > 0) {
      applyFilters(allContacts, searchQuery, activeFilters);
    }
  }, [allContacts]);

  const handleAddNew = () => {
    console.log('Add new', activeType);
    // TODO: Implement add new functionality
    // This should open a type-specific create dialog based on activeType
    // For now, we'll just log the type
    switch (activeType) {
      case 'patients':
        // Open CreatePatientDialog
        console.log('Opening create patient dialog');
        break;
      case 'referrers':
        // Open CreateReferrerDialog
        console.log('Opening create referrer dialog');
        break;
      case 'coordinator':
        // Open CreateCoordinatorDialog
        console.log('Opening create coordinator dialog');
        break;
      case 'ndis-lac':
        // Open CreateNDISLACDialog
        console.log('Opening create NDIS LAC dialog');
        break;
      case 'contacts':
        // Open CreateContactDialog
        console.log('Opening create contact dialog');
        break;
      case 'companies':
        // Open CreateCompanyDialog
        console.log('Opening create company dialog');
        break;
      case 'clinics':
        // Open CreateClinicDialog
        console.log('Opening create clinic dialog');
        break;
      default:
        console.warn('Unknown contact type:', activeType);
    }
  };

  const handleArchive = () => {
    if (!selectedContact) {
      console.warn('No contact selected for archiving');
      return;
    }
    
    // Only patients can be archived for now (other types don't have backend endpoints)
    if (activeType !== 'patients') {
      setArchiveErrorMessage(`Archive functionality is not yet available for ${activeType}. Only patients can be archived at this time.`);
      setArchiveErrorOpened(true);
      return;
    }
    
    // Open confirmation modal
    setArchiveConfirmOpened(true);
  };

  const confirmArchive = async () => {
    if (!selectedContact) {
      console.error('No contact selected for archiving');
      return;
    }
    
    setArchiveConfirmOpened(false);
    
    try {
      // Only patients can be archived (backend endpoint exists)
      if (activeType !== 'patients') {
        setArchiveErrorMessage(`Archive functionality is not yet available for ${activeType}. Only patients can be archived at this time.`);
        setArchiveErrorOpened(true);
        return;
      }
      
      const endpoint = `/api/patients/${selectedContact.id}/archive/`;
      
      // Validate contact ID
      if (!selectedContact.id || typeof selectedContact.id !== 'string') {
        console.error('Invalid contact ID:', selectedContact.id);
        setArchiveErrorMessage('Invalid contact ID. Please select a contact and try again.');
        setArchiveErrorOpened(true);
        return;
      }
      
      const fullUrl = `https://localhost:8000${endpoint}`;
      console.log('Archive request:', {
        url: fullUrl,
        method: 'PATCH',
        contactId: selectedContact.id,
        contactName: selectedContact.name
      });
      
      const response = await fetch(fullUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Archive response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (response.ok) {
        // Reload contacts to refresh the list
        if (activeType === 'patients') {
          // Reload patients - keep current view (archived or active)
          const loadPatients = async () => {
            setLoading(true);
            setAllContacts([]);
            setContacts([]);
            setSelectedContact(null);
            
            try {
              const params = new URLSearchParams();
              if (searchQuery) {
                params.append('search', searchQuery);
              }
              // Keep current archived view state
              const archivedValue = activeFilters.archived === true || activeFilters.archived === 'true';
              if (archivedValue) {
                params.append('archived', 'true');
              } else {
                params.append('archived', 'false');
              }
              
              const response = await fetch(`https://localhost:8000/api/patients/?${params.toString()}`);
              if (response.ok) {
                const data = await response.json();
                const patients = data.results || data;
                const transformed = patients.map((patient: any) => transformPatientToContact(patient));
                setAllContacts(transformed);
                applyFilters(transformed, searchQuery, activeFilters);
              }
            } catch (error) {
              console.error('Failed to reload patients:', error);
            } finally {
              setLoading(false);
            }
          };
          loadPatients();
          
          // Reload archived count after archiving
          const loadArchivedCount = async () => {
            try {
              const response = await fetch('https://localhost:8000/api/patients/?archived=true');
              if (response.ok) {
                const data = await response.json();
                const archivedPatients = data.results || data;
                setArchivedCount(Array.isArray(archivedPatients) ? archivedPatients.length : 0);
              }
            } catch (error) {
              console.error('Failed to reload archived count:', error);
            }
          };
          loadArchivedCount();
        }
        console.log('Patient archived successfully');
      } else {
        // Handle error response - try to parse JSON, but handle non-JSON responses
        let errorMessage = 'Failed to archive contact. Please try again.';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.detail || error.message || errorMessage;
          } else {
            const text = await response.text();
            errorMessage = text || errorMessage;
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        console.error('Failed to archive contact:', errorMessage);
        setArchiveErrorMessage(errorMessage);
        setArchiveErrorOpened(true);
      }
    } catch (error: any) {
      console.error('Error archiving contact:', error);
      const errorMessage = error.message || 'Error archiving contact. Please try again.';
      setArchiveErrorMessage(errorMessage);
      setArchiveErrorOpened(true);
    }
  };

  const getPageTitle = () => {
    const titles: Record<ContactType, string> = {
      'patients': 'Patients',
      'referrers': 'Referrers',
      'coordinator': 'Coordinators',
      'ndis-lac': 'NDIS Local Area Coordinators',
      'contacts': 'General Contacts',
      'companies': 'Companies',
      'clinics': 'Clinics',
    };
    return titles[activeType] || 'Contacts';
  };

  return (
    <Navigation>
      <ContactHeader
        title={getPageTitle()}
        onSearch={handleSearch}
        onAddNew={handleAddNew}
        onArchive={handleArchive}
        onFilterApply={handleFilterApply}
        showFilters={true}
        filterOptions={{
          funding: fundingSources,
          clinic: clinics,
          status: ['Active', 'Inactive', 'Archived'],
        }}
        showArchived={activeFilters.archived === true || activeFilters.archived === 'true'}
        contactCount={allContacts.length}
        filteredCount={contacts.length !== allContacts.length ? contacts.length : undefined}
        achievedCount={archivedCount}
      />
      
      <Grid gutter={0} style={{ height: 'calc(100vh - 240px)', display: 'flex' }}>
        {/* Left Panel - Contact List */}
        <Grid.Col span={3} style={{ 
          borderRight: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        }}>
          <ScrollArea 
            style={{ 
              flex: 1,
              height: '100%',
            }}
            type="scroll"
          >
            {loading ? (
              <Center h="100%">
                <Loader />
              </Center>
            ) : contacts.length === 0 ? (
              <Center h="100%">
                <Text c="dimmed">No patients found</Text>
              </Center>
            ) : (
              <Stack gap={0}>
                {contacts.map((contact) => (
                <UnstyledButton
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  style={{
                    padding: rem(16),
                    backgroundColor: selectedContact?.id === contact.id 
                      ? (isDark ? '#25262b' : '#f8f9fa')
                      : 'transparent',
                    borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedContact?.id !== contact.id) {
                      e.currentTarget.style.backgroundColor = isDark ? '#1A1B1E' : '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedContact?.id !== contact.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Stack gap={4}>
                    <Text size="sm" fw={600}>
                      {contact.name}
                    </Text>
                    <Group gap="xs">
                      <Text size="xs" c="blue">
                        {contact.clinic}
                      </Text>
                      <Badge size="xs" variant="light">
                        {contact.funding}
                      </Badge>
                    </Group>
                  </Stack>
                </UnstyledButton>
              ))}
              </Stack>
            )}
          </ScrollArea>
        </Grid.Col>

        {/* Right Panel - Contact Details */}
        <Grid.Col span={9} style={{ 
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <ScrollArea 
            style={{ 
              flex: 1,
              height: '100%',
            }}
            type="scroll"
          >
            <Container size="xl" py="xl">
              {selectedContact ? (
                <Stack gap="lg">
                  <Grid gutter="lg">
                    {/* Left Column */}
                    <Grid.Col span={4}>
                      <Stack gap="md" align="flex-start">
                        <Box style={{ width: '100%' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Name</Text>
                          <Select
                            label=""
                            value={selectedContact.title}
                            data={['Mr.', 'Mrs.', 'Ms.', 'Dr.']}
                            onChange={(value) => {
                              if (selectedContact) {
                                setSelectedContact({ ...selectedContact, title: value || '' });
                              }
                            }}
                            styles={{ input: { fontWeight: 700, fontSize: rem(18), height: 'auto', minHeight: rem(36) } }}
                          />
                        </Box>
                        
                        <Box style={{ width: '100%' }}>
                          <TextInput
                            label=""
                            value={selectedContact.firstName}
                            styles={{ input: { fontWeight: 700, fontSize: rem(18), height: 'auto', minHeight: rem(36) } }}
                          />
                        </Box>
                        
                        <Box style={{ width: '100%' }}>
                          <TextInput
                            label=""
                            placeholder="Middle Name"
                            value={selectedContact.middleName}
                            styles={{ input: { fontWeight: 400, fontSize: rem(18), height: 'auto', minHeight: rem(36) } }}
                          />
                        </Box>
                        
                        <Box style={{ width: '100%' }}>
                          <TextInput
                            label=""
                            value={selectedContact.lastName}
                            styles={{ input: { fontWeight: 700, fontSize: rem(18), height: 'auto', minHeight: rem(36) } }}
                          />
                        </Box>
                        
                        <Box style={{ width: '100%' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Date of Birth</Text>
                          <DatePickerInput
                            placeholder="Select date of birth"
                            value={selectedContact.dob ? dayjs(selectedContact.dob).toDate() : null}
                            onChange={(date) => {
                              if (selectedContact) {
                                const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : '';
                                // Calculate age from DOB
                                const calculatedAge = date ? dayjs().diff(dayjs(date), 'year') : 0;
                                setSelectedContact({ ...selectedContact, dob: dateStr, age: calculatedAge });
                              }
                            }}
                            maxDate={new Date()}
                            styles={{ 
                              input: { 
                                fontWeight: 700, 
                                fontSize: rem(18), 
                                height: 'auto', 
                                minHeight: rem(36) 
                              } 
                            }}
                          />
                          <Text size="lg" fw={700} mt="md">
                            Age: {selectedContact.dob 
                              ? dayjs().diff(dayjs(selectedContact.dob), 'year') 
                              : (selectedContact.age || 0)}
                          </Text>
                        </Box>
                      </Stack>
                    </Grid.Col>

                    {/* Middle Column */}
                    <Grid.Col span={4}>
                      <Stack gap="md" align="flex-start">
                        <Box style={{ width: '100%' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Health Number</Text>
                          <TextInput
                            placeholder="Health Number"
                            value={selectedContact.healthNumber}
                            styles={{ input: { fontWeight: 700, fontSize: rem(18), height: 'auto', minHeight: rem(36) } }}
                          />
                        </Box>

                        <Box style={{ width: '100%' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Clinic</Text>
                          <Select
                            value={selectedContact.clinic}
                            data={clinics}
                            onChange={(value) => {
                              if (selectedContact) {
                                setSelectedContact({ ...selectedContact, clinic: value || '' });
                              }
                            }}
                            styles={{ input: { fontWeight: 700, fontSize: rem(18), height: 'auto', minHeight: rem(36) } }}
                          />
                        </Box>

                        <Box style={{ width: '100%' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Funding</Text>
                          <Select
                            value={selectedContact.funding}
                            data={fundingSources}
                            onChange={(value) => {
                              if (selectedContact) {
                                setSelectedContact({ ...selectedContact, funding: value || '' });
                              }
                            }}
                            styles={{ input: { fontWeight: 700, fontSize: rem(18), height: 'auto', minHeight: rem(36) } }}
                          />
                        </Box>

                      </Stack>
                    </Grid.Col>

                    {/* Right Column */}
                    <Grid.Col span={4}>
                      <Stack gap="md" align="flex-start">
                        <Box style={{ width: '100%' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Coordinator</Text>
                          {selectedContact.coordinator ? (
                            <Group gap="xs" align="flex-start">
                              <Box style={{ flex: 1 }}>
                                <Text size="md" fw={700}>{selectedContact.coordinator.name}</Text>
                                <Text size="xs" c="blue">{selectedContact.coordinator.date}</Text>
                              </Box>
                              <ActionIcon 
                                variant="subtle" 
                                color="blue"
                                onClick={() => setCoordinatorDialogOpened(true)}
                              >
                                <IconPlus size={20} />
                              </ActionIcon>
                            </Group>
                          ) : (
                            <Group gap="xs" align="flex-start">
                              <TextInput
                                placeholder="Select coordinator"
                                style={{ flex: 1 }}
                                readOnly
                                styles={{ input: { height: 'auto', minHeight: rem(36) } }}
                                value=""
                              />
                              <ActionIcon 
                                variant="subtle" 
                                color="blue"
                                onClick={() => setCoordinatorDialogOpened(true)}
                              >
                                <IconPlus size={20} />
                              </ActionIcon>
                            </Group>
                          )}
                        </Box>

                        <Box style={{ width: '100%' }}>
                          <Group gap="xs" mb="xs" align="flex-start">
                            <Text size="md" c="blue" fw={500}>Reminder</Text>
                            <ActionIcon variant="subtle" color="blue" size="sm">
                              <IconPlus size={16} />
                            </ActionIcon>
                          </Group>
                        </Box>

                        <Box style={{ width: '100%' }}>
                          <Group justify="space-between" mb="xs" align="flex-start">
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Current Plan Dates</Text>
                            <Group gap="xs">
                              <ActionIcon variant="subtle" color="blue" size="sm">
                                <IconPlus size={16} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="blue" size="sm">
                                <IconPlus size={16} />
                              </ActionIcon>
                            </Group>
                          </Group>
                          {selectedContact.planDates ? (
                            <Text size="md" fw={700}>{selectedContact.planDates}</Text>
                          ) : (
                            <Text size="sm" c="dimmed" fs="italic">No plan dates set</Text>
                          )}
                        </Box>
                      </Stack>
                    </Grid.Col>
                  </Grid>

                  {/* Full Width Sections */}
                  <Box>
                    <Group justify="space-between" mb="md">
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Communication</Text>
                      <ActionIcon variant="subtle" color="blue">
                        <IconPlus size={20} />
                      </ActionIcon>
                    </Group>
                    {selectedContact.communication && (
                      <Paper p="lg" withBorder>
                        <Stack gap="md">
                          {selectedContact.communication.phone && (
                            <Group>
                              <Box style={{ minWidth: rem(100) }}>
                                <Text size="sm" c="dimmed">Phone</Text>
                                <Text size="xs" c="dimmed">Home</Text>
                              </Box>
                              <Text size="md" fw={600}>{selectedContact.communication.phone}</Text>
                            </Group>
                          )}
                          {selectedContact.communication.email && (
                            <Group>
                              <Box style={{ minWidth: rem(100) }}>
                                <Text size="sm" c="dimmed">Email</Text>
                                <Text size="xs" c="dimmed">Home</Text>
                              </Box>
                              <Text size="md" fw={600}>{selectedContact.communication.email}</Text>
                            </Group>
                          )}
                        </Stack>
                      </Paper>
                    )}
                  </Box>

                  <Box>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="md">Note</Text>
                    <Textarea
                      placeholder="Additional notes..."
                      value={selectedContact.note}
                      minRows={4}
                    />
                  </Box>
                </Stack>
              ) : (
                <Center h={400}>
                  <Text c="dimmed">Select a contact to view details</Text>
                </Center>
              )}
            </Container>
          </ScrollArea>
        </Grid.Col>
      </Grid>

      {/* Archive Confirmation Modal */}
      <Modal
        opened={archiveConfirmOpened}
        onClose={() => setArchiveConfirmOpened(false)}
        title="Archive Contact"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to archive <strong>{selectedContact?.name}</strong>?
          </Text>
          <Text size="sm" c="dimmed">
            This will hide them from active lists but keep the record. You can restore them later from the archived view.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setArchiveConfirmOpened(false)}>
              Cancel
            </Button>
            <Button color="orange" onClick={confirmArchive}>
              Archive
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Archive Error Modal */}
      <Modal
        opened={archiveErrorOpened}
        onClose={() => setArchiveErrorOpened(false)}
        title="Archive Error"
        centered
      >
        <Stack gap="md">
          <Text c="red">{archiveErrorMessage}</Text>
          <Group justify="flex-end" mt="md">
            <Button onClick={() => setArchiveErrorOpened(false)}>Close</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Coordinator Selection Dialog */}
      <Modal
        opened={coordinatorDialogOpened}
        onClose={() => {
          setCoordinatorDialogOpened(false);
          setCoordinatorSearchQuery('');
          setCoordinatorSearchResults([]);
          setCoordinatorDate(null);
        }}
        title="Add Coordinator"
        size="md"
      >
        <Stack gap="md">
          <DatePickerInput
            label="Assignment Date"
            placeholder="Select assignment date"
            value={coordinatorDate}
            onChange={setCoordinatorDate}
            maxDate={new Date()}
            required
          />
          
          <TextInput
            placeholder="Search coordinators..."
            leftSection={<IconSearch size={16} />}
            value={coordinatorSearchQuery}
            onChange={(e) => setCoordinatorSearchQuery(e.currentTarget.value)}
          />
          
          {coordinatorLoading ? (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          ) : coordinatorSearchResults.length > 0 ? (
            <ScrollArea h={300}>
              <Stack gap="xs">
                {coordinatorSearchResults.map((coordinator) => (
                  <UnstyledButton
                    key={coordinator.id}
                    onClick={() => {
                      if (selectedContact && coordinatorDate) {
                        const dateStr = dayjs(coordinatorDate).format('YYYY-MM-DD');
                        const coordinators = getCoordinators(selectedContact);
                        const newCoordinator = {
                          name: coordinator.name,
                          date: dateStr,
                        };
                        // Add to coordinators array (avoid duplicates)
                        const updatedCoordinators = [...coordinators, newCoordinator];
                        setSelectedContact({
                          ...selectedContact,
                          coordinators: updatedCoordinators,
                          // Keep legacy coordinator for backwards compatibility (most recent)
                          coordinator: newCoordinator,
                        });
                        setCoordinatorDialogOpened(false);
                        setCoordinatorSearchQuery('');
                        setCoordinatorSearchResults([]);
                        setCoordinatorDate(null);
                      }
                    }}
                    disabled={!coordinatorDate}
                    style={{
                      padding: rem(12),
                      borderRadius: rem(4),
                      backgroundColor: isDark ? '#25262b' : '#f8f9fa',
                      border: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
                      transition: 'background-color 0.2s ease',
                      opacity: coordinatorDate ? 1 : 0.5,
                    }}
                    onMouseEnter={(e) => {
                      if (coordinatorDate) {
                        e.currentTarget.style.backgroundColor = isDark ? '#2C2E33' : '#e9ecef';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (coordinatorDate) {
                        e.currentTarget.style.backgroundColor = isDark ? '#25262b' : '#f8f9fa';
                      }
                    }}
                  >
                    <Stack gap={4}>
                      <Text size="sm" fw={600}>{coordinator.name}</Text>
                      {coordinator.organization && (
                        <Text size="xs" c="dimmed">{coordinator.organization}</Text>
                      )}
                    </Stack>
                  </UnstyledButton>
                ))}
              </Stack>
            </ScrollArea>
          ) : coordinatorSearchQuery ? (
            <Center py="xl">
              <Text c="dimmed" size="sm">No coordinators found</Text>
            </Center>
          ) : (
            <Center py="xl">
              <Text c="dimmed" size="sm">Start typing to search coordinators</Text>
            </Center>
          )}
        </Stack>
      </Modal>

      {/* Coordinator List Dialog */}
      <Modal
        opened={coordinatorListDialogOpened}
        onClose={() => setCoordinatorListDialogOpened(false)}
        title="Coordinators"
        size="md"
      >
        <Stack gap="md">
          {(() => {
            const coordinators = getCoordinators(selectedContact);
            if (coordinators.length === 0) {
              return (
                <Center py="xl">
                  <Text c="dimmed" size="sm">No coordinators assigned</Text>
                </Center>
              );
            }
            
            // Sort by date descending (most recent first)
            const sortedCoordinators = [...coordinators].sort((a, b) => {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              return dateB.getTime() - dateA.getTime();
            });
            
            return (
              <ScrollArea h={400}>
                <Stack gap="xs">
                  {sortedCoordinators.map((coordinator, index) => (
                    <Box
                      key={index}
                      style={{
                        padding: rem(12),
                        borderRadius: rem(4),
                        backgroundColor: isDark ? '#25262b' : '#f8f9fa',
                        border: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
                      }}
                    >
                      <Stack gap={4}>
                        <Text size="sm" fw={600}>{coordinator.name}</Text>
                        <Text size="xs" c="blue">{coordinator.date}</Text>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </ScrollArea>
            );
          })()}
        </Stack>
      </Modal>
    </Navigation>
  );
}

