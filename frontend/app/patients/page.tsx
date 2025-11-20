'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Paper, Text, Loader, Center, Grid, Stack, Box, ScrollArea, UnstyledButton, Badge, Group, TextInput, Select, Textarea, rem, ActionIcon, Modal, Button, Divider, Switch } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconPlus, IconCalendar, IconSearch, IconListCheck, IconEdit, IconTrash, IconX } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import Navigation from '../components/Navigation';
import ContactHeader from '../components/ContactHeader';
import NotesDialog from '../components/dialogs/NotesDialog';
import DocumentsDialog from '../components/dialogs/DocumentsDialog';
import ImagesDialog from '../components/dialogs/ImagesDialog';
import AppointmentsDialog from '../components/dialogs/AppointmentsDialog';
import PatientLettersDialog from '../components/dialogs/PatientLettersDialog';
import SMSDialog from '../components/dialogs/SMSDialog';
import { formatDateOnlyAU } from '../utils/dateFormatting';
import { PatientCacheIDB as PatientCache } from '../utils/patientCacheIDB';
import dayjs from 'dayjs';

type ContactType = 'patients' | 'referrers' | 'coordinator' | 'ndis-lac' | 'contacts' | 'companies' | 'clinics';

interface Contact {
  id: string;
  name: string;
  clinic: string;
  clinicColor?: string; // Add clinic color
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
  planDates?: string; // Legacy single plan date (for backwards compatibility)
  planDatesArray?: Array<{
    start_date: string;
    end_date: string;
    type: string;
  }>;
  // NDIS-specific plan dates (imported from FileMaker)
  ndis_plan_start_date?: string;
  ndis_plan_end_date?: string;
  communication?: {
    phone?: string | { [key: string]: string | { value: string; default?: boolean } };
    mobile?: string | { [key: string]: string | { value: string; default?: boolean } };
    email?: string | { [key: string]: string | { value: string; default?: boolean } };
  };
  address_json?: {
    street?: string;
    street2?: string;
    suburb?: string;
    postcode?: string;
    state?: string;
    type?: string;
    default?: boolean;
  };
  note?: string;
  filemaker_metadata?: {
    filemaker_id?: string;
    filemaker_clinic?: string;
    xero_contact_id?: string;
    imported_at?: string;
  };
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
  
  // ALWAYS use title if available (even when full_name is present)
  const titleMap: Record<string, string> = {
    'Mr': 'Mr.',
    'Mrs': 'Mrs.',
    'Ms': 'Ms.',
    'Miss': 'Miss',
    'Dr': 'Dr.',
    'Prof': 'Prof.',
    'Sr': 'Sr.',
    'Jr': 'Jr.',
    'Master': 'Master',
    'Brother': 'Brother',
    'Sister': 'Sister',
  };
  title = patient.title ? (titleMap[patient.title] || patient.title) : '';
  
  if (patient.full_name) {
    // Using list serializer - use full_name but ADD title if available
    const nameParts = patient.full_name.split(' ');
    firstName = patient.first_name || nameParts[0] || '';
    lastName = patient.last_name || nameParts[nameParts.length - 1] || '';
    displayName = title ? `${title} ${patient.full_name}` : patient.full_name;
  } else {
    // Using full serializer - build from parts
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
  const clinicColor = patient.clinic?.color || undefined;
  const fundingName = patient.funding_type?.name || '';

  // Extract contact info - handle both old string format and new array format
  const contactJson = patient.contact_json || {};
  
  // Build communication object - preserve the structure from backend
  let communication: any = undefined;
  
  // Check if we have the new array format (phones, emails) or old format (phone, mobile, email)
  const hasNewFormat = contactJson.phones || contactJson.emails;
  const hasOldFormat = contactJson.phone || contactJson.mobile || contactJson.email;
  
  if (hasNewFormat) {
    // NEW FORMAT: phones and emails are arrays
    communication = {};
    
    // Convert phones array to the format the UI expects
    if (contactJson.phones && Array.isArray(contactJson.phones)) {
      const phonesByType: any = {};
      
      contactJson.phones.forEach((phoneEntry: any, index: number) => {
        const label = phoneEntry.label || `Phone ${index + 1}`;
        const number = phoneEntry.number || '';
        const type = phoneEntry.type || 'phone'; // 'mobile' or 'phone'
        
        // Group by type (mobile vs phone)
        if (type === 'mobile') {
          if (!communication.mobile) communication.mobile = {};
          communication.mobile[label] = {
            value: number,
            default: index === 0 // First one is default
          };
        } else {
          if (!communication.phone) communication.phone = {};
          communication.phone[label] = {
            value: number,
            default: index === 0 // First one is default
          };
        }
      });
    }
    
    // Convert emails array to the format the UI expects
    if (contactJson.emails && Array.isArray(contactJson.emails)) {
      communication.email = {};
      contactJson.emails.forEach((emailEntry: any, index: number) => {
        const label = emailEntry.label || `Email ${index + 1}`;
        const address = emailEntry.address || '';
        communication.email[label] = {
          value: address,
          default: index === 0 // First one is default
        };
      });
    }
    
    // Also check for primary email (backwards compatibility)
    if (contactJson.email && typeof contactJson.email === 'string') {
      if (!communication.email) communication.email = {};
      communication.email['Primary'] = {
        value: contactJson.email,
        default: true
      };
    }
  } else if (hasOldFormat) {
    // OLD FORMAT: phone, mobile, email as strings or objects
    communication = {};
    
    // Handle phone - can be string or object
    if (contactJson.phone) {
      communication.phone = contactJson.phone;
    }
    
    // Handle mobile - can be string or object
    if (contactJson.mobile) {
      communication.mobile = contactJson.mobile;
    }
    
    // Handle email - can be string or object
    if (contactJson.email) {
      communication.email = contactJson.email;
    }
  }

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
    clinicColor: clinicColor,
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
    // Load referrers from the API if available
    coordinators: patient.referrers && Array.isArray(patient.referrers) && patient.referrers.length > 0
      ? patient.referrers.map((ref: any) => ({
          name: ref.name,
          date: formatDateShort(ref.referral_date),
          is_primary: ref.is_primary || false,
        }))
      : (patient.coordinator_name ? [{
          name: patient.coordinator_name,
          date: formatDateShort(patient.coordinator_date),
          is_primary: false,
        }] : undefined),
    planDates: formatDateRange(patient.plan_start_date, patient.plan_end_date), // Legacy
    planDatesArray: patient.plan_dates_json ? (Array.isArray(patient.plan_dates_json) ? patient.plan_dates_json : []) : undefined,
    // NDIS plan dates from FileMaker import
    ndis_plan_start_date: patient.ndis_plan_start_date || undefined,
    ndis_plan_end_date: patient.ndis_plan_end_date || undefined,
    communication: communication,
    address_json: patient.address_json ? {
      street: patient.address_json.street,
      street2: patient.address_json.street2,
      suburb: patient.address_json.suburb,
      postcode: patient.address_json.postcode,
      state: patient.address_json.state,
      type: patient.address_json.type,
      default: patient.address_json.default || false,
    } : undefined,
    note: patient.notes || '',
    filemaker_metadata: patient.filemaker_metadata || undefined,
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
  
  // Ref to track if we're currently loading to prevent duplicate loads
  const isLoadingRef = useRef(false);
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
  
  // Delete coordinator confirmation dialog
  const [deleteCoordinatorOpened, setDeleteCoordinatorOpened] = useState(false);
  const [coordinatorToDelete, setCoordinatorToDelete] = useState<{name: string, date: string} | null>(null);
  
  // Communication dialog state
  const [communicationDialogOpened, setCommunicationDialogOpened] = useState(false);
  const [communicationType, setCommunicationType] = useState<string>('');
  const [communicationName, setCommunicationName] = useState<string>('');
  const [communicationValue, setCommunicationValue] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [editingCommunication, setEditingCommunication] = useState<{type: string; name: string} | null>(null);
  const [addressFields, setAddressFields] = useState({
    address1: '',
    address2: '',
    suburb: '',
    postcode: '',
    state: '',
  });
  
  // Reminder dialog state
  const [reminderDialogOpened, setReminderDialogOpened] = useState(false);
  const [reminderClinic, setReminderClinic] = useState<string>('');
  const [reminderNote, setReminderNote] = useState<string>('');
  const [reminderNoteTemplate, setReminderNoteTemplate] = useState<string>('');
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [reminderClinics, setReminderClinics] = useState<Array<{value: string; label: string}>>([]);
  
  // Plan dates dialog state
  const [planDatesDialogOpened, setPlanDatesDialogOpened] = useState(false);
  const [planDatesListDialogOpened, setPlanDatesListDialogOpened] = useState(false);
  const [planStartDate, setPlanStartDate] = useState<Date | null>(null);
  const [planEndDate, setPlanEndDate] = useState<Date | null>(null);
  const [planType, setPlanType] = useState<string>('');
  const [editingPlanDate, setEditingPlanDate] = useState<number | null>(null); // Index of plan date being edited
  
  // Notes dialog state
  const [notesDialogOpened, setNotesDialogOpened] = useState(false);
  const [documentsDialogOpened, setDocumentsDialogOpened] = useState(false);
  const [imagesDialogOpened, setImagesDialogOpened] = useState(false);
  const [appointmentsDialogOpened, setAppointmentsDialogOpened] = useState(false);
  const [lettersDialogOpened, setLettersDialogOpened] = useState(false);
  const [smsDialogOpened, setSmsDialogOpened] = useState(false);
  
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
  
  // Helper to get plan dates array (handles both old single plan date and new array)
  const getPlanDates = (contact: Contact | null): Array<{start_date: string; end_date: string; type: string}> => {
    if (!contact) return [];
    // New format: array of plan dates
    if (contact.planDatesArray && contact.planDatesArray.length > 0) {
      return contact.planDatesArray;
    }
    // Legacy format: single plan date string (parse if needed)
    if (contact.planDates) {
      // Try to parse "DD MMM YYYY - DD MMM YYYY" format
      const parts = contact.planDates.split(' - ');
      if (parts.length === 2) {
        // For now, just return empty array - we'll need to parse dates properly
        // Or better: migrate legacy data to array format
        return [];
      }
    }
    return [];
  };
  
  // Get current plan date (most recent one)
  const getCurrentPlanDate = (contact: Contact | null) => {
    const planDates = getPlanDates(contact);
    if (planDates.length === 0) return null;
    // Sort by start_date descending and return most recent
    return planDates.sort((a, b) => {
      const dateA = new Date(a.start_date);
      const dateB = new Date(b.start_date);
      return dateB.getTime() - dateA.getTime();
    })[0];
  };
  
  // Check if funding is NDIS
  const isNDISFunding = (contact: Contact | null): boolean => {
    if (!contact) return false;
    return contact.funding?.toLowerCase() === 'ndis';
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
        const response = await fetch('https://localhost:8000/api/patients/?archived=true', {
          credentials: 'include',
        });
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
      
      // Prevent duplicate concurrent loads
      if (isLoadingRef.current) {
        console.log('⚠️ Load already in progress, skipping...');
        return;
      }
      
      isLoadingRef.current = true;
      setLoading(true);
      
      try {
        // Build filter object for cache
        const archivedValue = activeFilters.archived === true || activeFilters.archived === 'true';
        const cacheFilters = {
          archived: archivedValue,
          search: searchQuery || undefined,
        };
        
        console.log('🔍 Loading patients with filters:', cacheFilters);
        
        // Check if we're navigating to a specific patient (e.g., from referrer page)
        const patientId = searchParams?.get('id');
        
        // Try to load from cache first
        const cachedData = await PatientCache.get(cacheFilters);
        
        if (cachedData && patientId) {
          // We have cache AND a specific patient ID - use cache, skip API call entirely!
          console.log(`⚡ Using cached data to select patient ${patientId}`);
          const transformed = cachedData.map((patient: any) => transformPatientToContact(patient));
          setAllContacts(transformed);
          applyFilters(transformed, searchQuery, activeFilters);
          
          // Find and select the specific patient
          const targetPatient = transformed.find((p: Contact) => p.id === patientId);
          if (targetPatient) {
            setSelectedContact(targetPatient);
            console.log(`✅ Selected patient: ${targetPatient.name}`);
          } else {
            // Patient not in cache (maybe archived?) - fetch just that one patient
            console.log(`⚠️ Patient ${patientId} not in cache, fetching individually...`);
            const response = await fetch(`https://localhost:8000/api/patients/${patientId}/`, {
              credentials: 'include',
            });
            if (response.ok) {
              const patient = await response.json();
              const transformedPatient = transformPatientToContact(patient);
              setSelectedContact(transformedPatient);
              console.log(`✅ Fetched and selected patient: ${transformedPatient.name}`);
            }
          }
          
          setLoading(false);
          isLoadingRef.current = false;
          return; // Early return - no need to load all patients
        }
        
        // Try to load from cache first (no specific patient ID)
        const cachedDataGeneral = await PatientCache.get(cacheFilters);
        
        if (cachedDataGeneral) {
          // Cache hit! Use cached data immediately
          const transformed = cachedDataGeneral.map((patient: any) => transformPatientToContact(patient));
          setAllContacts(transformed);
          applyFilters(transformed, searchQuery, activeFilters);
          
          if (transformed.length > 0) {
            setSelectedContact(transformed[0]);
          }
          
          setLoading(false);
          isLoadingRef.current = false;
          
          // Trigger background refresh to update cache
          PatientCache.backgroundRefresh(cacheFilters, (freshData) => {
            console.log('🔄 Background refresh completed, updating UI...');
            const freshTransformed = freshData.map((patient: any) => transformPatientToContact(patient));
            setAllContacts(freshTransformed);
            applyFilters(freshTransformed, searchQuery, activeFilters);
          });
          
          return; // Early return - using cache
        }
        
        // Cache miss - load from API
        console.log('💾 Cache miss - loading from API...');
        
        // Clear ALL state first to prevent any stale data
        setAllContacts([]);
        setContacts([]);
        setSelectedContact(null);
        
        // Build query parameters
        const params = new URLSearchParams();
        if (searchQuery) {
          params.append('search', searchQuery);
        }
        params.append('archived', String(archivedValue));

        // Fetch ALL patients by paginating through all pages
        let allPatients: any[] = [];
        let nextUrl: string | null = `https://localhost:8000/api/patients/?${params.toString()}`;
        
        console.log('📥 Loading all patients (paginated)... This may take 10-15 seconds...');
        
        let pageCount = 0;
        while (nextUrl) {
          pageCount++;
          const response = await fetch(nextUrl);
          if (response.ok) {
            const data = await response.json();
            const patients = data.results || data;
            allPatients = allPatients.concat(patients);
            nextUrl = data.next; // Next page URL or null if last page
            
            // Log progress every 5 pages to avoid console spam
            if (pageCount % 5 === 0) {
              console.log(`   Loaded ${allPatients.length} patients (page ${pageCount})...`);
            }
          } else {
            console.error('Failed to load patients:', response.statusText);
            break;
          }
        }
        
        console.log(`✅ Loaded ${allPatients.length} total patients in ${pageCount} pages`);
        
        // Cache the raw API data before transformation
        await PatientCache.set(allPatients, cacheFilters);
        
        // Transform fresh from API - always use ISO dates from API
        const transformed = allPatients.map((patient: any) => {
          // Ensure we're working with fresh ISO date from API (not cached formatted date)
          // Force dob to be ISO format - if it's not, skip formatting silently (DOBs are null from OData import)
          const isoDob = patient.dob;
          // Silently skip DOB validation - we know they're null from OData import
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
      } catch (error) {
        console.error('Error loading patients:', error);
        setAllContacts([]);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };

    // Only load if we're on the client side
    if (typeof window !== 'undefined') {
      loadPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, activeFilters.archived, searchQuery]); // Reload when type, archive filter, or search changes (loadPatients is stable)

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
          // Extract clinic names from API response for filter
          const clinicNames = clinicsList.map((clinic: any) => clinic.name);
          if (clinicNames.length > 0) {
            setClinics(clinicNames);
          }
          // Transform for reminder dialog (needs ID and name)
          const reminderClinicsList = clinicsList.map((clinic: any) => ({
            value: clinic.id || clinic.name, // Use ID if available, fallback to name
            label: clinic.name,
          }));
          if (reminderClinicsList.length > 0) {
            setReminderClinics(reminderClinicsList);
          } else {
            // Fallback to hardcoded defaults if API returns empty
            setReminderClinics([
              { value: 'Newcastle', label: 'Newcastle' },
              { value: 'Tamworth', label: 'Tamworth' },
              { value: 'Port Macquarie', label: 'Port Macquarie' },
              { value: 'Armidale', label: 'Armidale' },
            ]);
          }
          // Keep hardcoded defaults if API returns empty or error
        } else {
          // Fallback on API error
          setReminderClinics([
            { value: 'Newcastle', label: 'Newcastle' },
            { value: 'Tamworth', label: 'Tamworth' },
            { value: 'Port Macquarie', label: 'Port Macquarie' },
            { value: 'Armidale', label: 'Armidale' },
          ]);
        }
      } catch (error) {
        console.error('Failed to load clinics:', error);
        // Keep hardcoded defaults on error
        setReminderClinics([
          { value: 'Newcastle', label: 'Newcastle' },
          { value: 'Tamworth', label: 'Tamworth' },
          { value: 'Port Macquarie', label: 'Port Macquarie' },
          { value: 'Armidale', label: 'Armidale' },
        ]);
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

  // Search coordinators/referrers
  const searchCoordinators = async (query: string) => {
    if (typeof window === 'undefined') return;
    
    setCoordinatorLoading(true);
    try {
      // Use Referrers API endpoint
      const searchParam = query ? `search=${encodeURIComponent(query)}&` : '';
      const response = await fetch(
        `https://localhost:8000/api/referrers/?${searchParam}ordering=last_name,first_name&t=${Date.now()}`,
        {
          credentials: 'include',
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const referrers = data.results || data;
        
        // Determine if we should show coordinators or referrers based on patient's funding
        const isNDIS = selectedContact ? isNDISFunding(selectedContact) : false;
        
        // Filter based on funding type
        const filtered = referrers.filter((ref: any) => {
          const specialty = ref.specialty_name?.toLowerCase() || '';
          const isCoordinator = specialty.includes('support coordinator') || 
                               specialty.includes('ndis coordinator') ||
                               specialty.includes('plan manager');
          
          // If NDIS funding: ONLY show coordinators
          // If other funding: EXCLUDE coordinators (show only referrers)
          return isNDIS ? isCoordinator : !isCoordinator;
        });
        
        // Transform to match expected format
        const transformed = filtered.map((ref: any) => ({
          id: ref.id,
          name: ref.full_name,
          specialty: ref.specialty_name || '',
          practice: ref.practice_name || '',
        }));
        
        setCoordinatorSearchResults(transformed);
      } else {
        console.error('Failed to fetch referrers:', response.status);
        setCoordinatorSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching coordinators/referrers:', error);
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
    
    // Handle patientId and openSMS parameters
    const patientId = searchParams.get('patientId');
    const openSMS = searchParams.get('openSMS');
    
    if (patientId && allContacts.length > 0) {
      // Find and select the patient
      const patient = allContacts.find(c => c.id === patientId);
      if (patient) {
        setSelectedContact(patient);
        
        // Open SMS dialog if requested
        if (openSMS === 'true') {
          setSmsDialogOpened(true);
        }
      }
    }
  }, [searchParams, allContacts]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allContacts]); // Only re-filter when contacts change (applyFilters, searchQuery, activeFilters are stable)

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
              
              const response = await fetch(`https://localhost:8000/api/patients/?${params.toString()}`, {
                credentials: 'include',
              });
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
              const response = await fetch('https://localhost:8000/api/patients/?archived=true', {
                credentials: 'include',
              });
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
      <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <ContactHeader
        title={getPageTitle()}
        onSearch={handleSearch}
        onAddNew={handleAddNew}
        onArchive={handleArchive}
        onNotesClick={() => setNotesDialogOpened(true)}
        onDocumentsClick={() => setDocumentsDialogOpened(true)}
        onImagesClick={() => setImagesDialogOpened(true)}
        onAppointmentsClick={() => setAppointmentsDialogOpened(true)}
        onLettersClick={() => setLettersDialogOpened(true)}
        onSmsClick={() => setSmsDialogOpened(true)}
        patientId={selectedContact?.id}
        selectedPatientName={selectedContact?.name}
        selectedPatientAddress={selectedContact?.address_json}
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
      
      <Grid gutter={0} style={{ height: 'calc(100vh - 240px)', display: 'flex', overflow: 'hidden' }}>
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
                      <Text size="xs" c={contact.clinicColor || 'blue'} fw={600}>
                        {contact.clinic}
                      </Text>
                      {contact.funding && (
                        <Badge size="xs" variant="light">
                          {contact.funding}
                        </Badge>
                      )}
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
          maxHeight: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <ScrollArea 
            h="100%"
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
                          data={[
                            'Mr.',
                            'Mrs.',
                            'Ms.',
                            { value: 'separator1', label: '─────────', disabled: true },
                            'Sr.',
                            'Jr.',
                            'Master',
                            { value: 'separator2', label: '─────────', disabled: true },
                            'Prof.',
                            'Dr.',
                            { value: 'separator3', label: '─────────', disabled: true },
                            'Brother',
                            'Sister',
                          ]}
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
                          readOnly
                            styles={{ input: { fontWeight: 700, fontSize: rem(18), height: 'auto', minHeight: rem(36) } }}
                        />
                        </Box>
                        
                        <Box style={{ width: '100%' }}>
                        <TextInput
                          label=""
                          placeholder="Middle Name"
                          value={selectedContact.middleName}
                          readOnly
                            styles={{ input: { fontWeight: 400, fontSize: rem(18), height: 'auto', minHeight: rem(36) } }}
                        />
                        </Box>
                        
                        <Box style={{ width: '100%' }}>
                        <TextInput
                          label=""
                          value={selectedContact.lastName}
                          readOnly
                            styles={{ input: { fontWeight: 700, fontSize: rem(18), height: 'auto', minHeight: rem(36) } }}
                        />
                        </Box>
                        
                        <Box style={{ width: '100%' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Date of Birth</Text>
                          <DatePickerInput
                            placeholder="Select date of birth"
                            value={selectedContact.dob ? dayjs(selectedContact.dob).toDate() : null}
                            valueFormat="DD MMM YYYY"
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
                            onChange={(e) => {
                              if (selectedContact) {
                                setSelectedContact({ ...selectedContact, healthNumber: e.currentTarget.value });
                              }
                            }}
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

                        {/* Current Plan Dates - Show NDIS plan dates if available, otherwise show editable plan dates */}
                        {isNDISFunding(selectedContact) && (selectedContact.ndis_plan_start_date || selectedContact.ndis_plan_end_date) ? (
                          <Box style={{ width: '100%' }}>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">
                              Current Plan Dates
                            </Text>
                            <Group gap="xs" align="flex-start">
                              <Text size="md" fw={700}>
                                {selectedContact.ndis_plan_start_date && formatDateOnlyAU(selectedContact.ndis_plan_start_date)}
                                {selectedContact.ndis_plan_start_date && selectedContact.ndis_plan_end_date && ' → '}
                                {selectedContact.ndis_plan_end_date && formatDateOnlyAU(selectedContact.ndis_plan_end_date)}
                              </Text>
                            </Group>
                          </Box>
                        ) : isNDISFunding(selectedContact) && (
                          <Box style={{ width: '100%' }}>
                            <Group justify="space-between" mb="xs" align="flex-start">
                              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Current Plan Dates</Text>
                              <Group gap="xs">
                                {(() => {
                                  const planDates = getPlanDates(selectedContact);
                                  const hasMultipleDates = planDates.length >= 2;
                                  
                                  if (hasMultipleDates) {
                                    return (
                                      <>
                                        <ActionIcon 
                                          variant="subtle" 
                                          color="blue"
                                          onClick={() => setPlanDatesListDialogOpened(true)}
                                          title="View all plan dates"
                                        >
                                          <IconListCheck size={20} />
                                        </ActionIcon>
                                        <ActionIcon 
                                          variant="subtle" 
                                          color="blue"
                                          onClick={() => {
                                            setEditingPlanDate(null);
                                            setPlanStartDate(null);
                                            setPlanEndDate(null);
                                            setPlanType('');
                                            setPlanDatesDialogOpened(true);
                                          }}
                                          title="Add new plan dates"
                                        >
                                          <IconPlus size={20} />
                                        </ActionIcon>
                                      </>
                                    );
                                  } else {
                                    return (
                                      <ActionIcon 
                                        variant="subtle" 
                                        color="blue"
                                        onClick={() => {
                                          setEditingPlanDate(null);
                                          setPlanStartDate(null);
                                          setPlanEndDate(null);
                                          setPlanType('');
                                          setPlanDatesDialogOpened(true);
                                        }}
                                        title="Add new plan dates"
                                      >
                                        <IconPlus size={20} />
                                      </ActionIcon>
                                    );
                                  }
                                })()}
                              </Group>
                            </Group>
                            {(() => {
                              const currentPlanDate = getCurrentPlanDate(selectedContact);
                              if (currentPlanDate) {
                                const startDate = formatDateOnlyAU(currentPlanDate.start_date);
                                const endDate = formatDateOnlyAU(currentPlanDate.end_date);
                                const planDates = getPlanDates(selectedContact);
                                const currentIndex = planDates.findIndex(pd => 
                                  pd.start_date === currentPlanDate.start_date && 
                                  pd.end_date === currentPlanDate.end_date
                                );
                                
                                return (
                                  <Group 
                                    justify="space-between"
                                    style={{ position: 'relative' }}
                                    onMouseEnter={(e) => {
                                      const buttons = e.currentTarget.querySelector('.plan-date-actions') as HTMLElement;
                                      if (buttons) buttons.style.display = 'flex';
                                    }}
                                    onMouseLeave={(e) => {
                                      const buttons = e.currentTarget.querySelector('.plan-date-actions') as HTMLElement;
                                      if (buttons) buttons.style.display = 'none';
                                    }}
                                  >
                                    <Stack gap={4} style={{ flex: 1 }}>
                                      <Text size="md" fw={700}>
                                        {startDate} - {endDate}
                                      </Text>
                                      {currentPlanDate.type && (
                                        <Text size="xs" c="blue">
                                          {currentPlanDate.type}
                                        </Text>
                                      )}
                                    </Stack>
                                    <Group gap="xs" className="plan-date-actions" style={{ display: 'none' }}>
                                      <ActionIcon
                                        variant="subtle"
                                        color="blue"
                                        onClick={() => {
                                          setEditingPlanDate(currentIndex);
                                          setPlanStartDate(currentPlanDate.start_date ? new Date(currentPlanDate.start_date) : null);
                                          setPlanEndDate(currentPlanDate.end_date ? new Date(currentPlanDate.end_date) : null);
                                          setPlanType(currentPlanDate.type || '');
                                          setPlanDatesDialogOpened(true);
                                        }}
                                        title="Edit"
                                      >
                                        <IconEdit size={16} />
                                      </ActionIcon>
                                      <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        onClick={async () => {
                                          if (selectedContact && currentIndex >= 0) {
                                            try {
                                              const planDates = getPlanDates(selectedContact);
                                              const updatedPlanDates = planDates.filter((_, index) => index !== currentIndex);
                                              
                                              const response = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  plan_dates_json: updatedPlanDates,
                                                }),
                                              });
                                              
                                              if (!response.ok) {
                                                const errorData = await response.json().catch(() => ({ detail: 'Failed to delete plan date' }));
                                                throw new Error(errorData.detail || `HTTP ${response.status}`);
                                              }
                                              
                                              // Reload patient data
                                              const reloadResponse = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/?t=${Date.now()}`);
                                              if (reloadResponse.ok) {
                                                const updatedPatient = await reloadResponse.json();
                                                const transformed = transformPatientToContact(updatedPatient);
                                                setSelectedContact(transformed);
                                                setAllContacts(prev => prev.map(c => c.id === transformed.id ? transformed : c));
                                              }
                                            } catch (error) {
                                              console.error('Error deleting plan date:', error);
                                              alert(`Failed to delete plan date: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                            }
                                          }
                                        }}
                                        title="Delete"
                                      >
                                        <IconTrash size={16} />
                                      </ActionIcon>
                                    </Group>
                                  </Group>
                                );
                              } else if (selectedContact.planDates) {
                                // Legacy: show old format
                                return <Text size="md" fw={700}>{selectedContact.planDates}</Text>;
                              } else {
                                return <Text size="sm" c="dimmed" fs="italic">No plan dates set</Text>;
                              }
                            })()}
                          </Box>
                        )}

                      </Stack>
                    </Grid.Col>

                    {/* Right Column */}
                    <Grid.Col span={4}>
                      <Stack gap="md" align="flex-start">
                        <Box style={{ width: '100%' }}>
                          <Group gap="xs" align="flex-end" mb="xs">
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700} style={{ flex: 1 }}>
                              {isNDISFunding(selectedContact) ? 'Coordinator' : 'Referrer'}
                            </Text>
                            {(() => {
                              const currentCoordinator = getCurrentCoordinator(selectedContact);
                              const coordinators = getCoordinators(selectedContact);
                              const hasMultipleCoordinators = coordinators.length >= 2;
                              
                              if (currentCoordinator) {
                                return (
                                  <>
                                    {hasMultipleCoordinators && (
                                      <ActionIcon 
                                        variant="subtle" 
                                        color="blue"
                                        onClick={() => setCoordinatorListDialogOpened(true)}
                                        title={`View all ${isNDISFunding(selectedContact) ? 'coordinators' : 'referrers'}`}
                                      >
                                        <IconListCheck size={20} />
                                      </ActionIcon>
                                    )}
                                    <ActionIcon 
                                      variant="subtle" 
                                      color="blue"
                                      onClick={() => {
                                        setCoordinatorDate(new Date());
                                        setCoordinatorDialogOpened(true);
                                      }}
                                      title={`Add ${isNDISFunding(selectedContact) ? 'coordinator' : 'referrer'}`}
                                    >
                                <IconPlus size={20} />
                              </ActionIcon>
                                  </>
                                );
                              } else {
                                return (
                                  <ActionIcon 
                                    variant="subtle" 
                                    color="blue"
                                    onClick={() => {
                                      setCoordinatorDate(new Date());
                                      setCoordinatorDialogOpened(true);
                                    }}
                                    title={`Add ${isNDISFunding(selectedContact) ? 'coordinator' : 'referrer'}`}
                                  >
                                    <IconPlus size={20} />
                                  </ActionIcon>
                                );
                              }
                            })()}
                            </Group>
                          {(() => {
                            const currentCoordinator = getCurrentCoordinator(selectedContact);
                            if (currentCoordinator) {
                              return (
                                <Box>
                                  <Text size="md" fw={700}>{currentCoordinator.name}</Text>
                                  <Text size="xs" c="blue">{currentCoordinator.date}</Text>
                                </Box>
                              );
                            } else {
                              return (
                              <TextInput
                                placeholder={`Select ${isNDISFunding(selectedContact) ? 'coordinator' : 'referrer'}`}
                                  readOnly
                                  styles={{ input: { height: 'auto', minHeight: rem(36) } }}
                                  value=""
                                />
                              );
                            }
                          })()}
                        </Box>

                        <Box style={{ width: '100%' }}>
                          <Group gap="xs" align="flex-end" mb="xs">
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700} style={{ flex: 1 }}>Reminder</Text>
                            <ActionIcon 
                              variant="subtle" 
                              color="blue"
                              onClick={() => {
                                setReminderDialogOpened(true);
                                setReminderClinic('');
                                setReminderNote('');
                                setReminderNoteTemplate('');
                                setReminderDate(null);
                              }}
                              title="Add reminder"
                            >
                              <IconPlus size={20} />
                            </ActionIcon>
                          </Group>
                        </Box>
                      </Stack>
                    </Grid.Col>
                  </Grid>

                  {/* Full Width Sections */}
                  <Box>
                    <Group justify="space-between" mb="xs" align="flex-end">
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Communication</Text>
                      <ActionIcon 
                        variant="subtle" 
                        color="blue"
                        onClick={() => {
                          setCommunicationDialogOpened(true);
                          setCommunicationType('');
                          setCommunicationName('');
                          setCommunicationValue('');
                          setAddressFields({
                            address1: '',
                            address2: '',
                            suburb: '',
                            postcode: '',
                            state: '',
                          });
                        }}
                        title="Add communication"
                      >
                        <IconPlus size={20} />
                      </ActionIcon>
                    </Group>
                    <Divider mb="md" />
                    {(selectedContact.communication || selectedContact.address_json) && (
                      <Paper p="lg" withBorder>
                        <Stack gap="md">
                          {(() => {
                            const comms = selectedContact.communication || {};
                            const items: Array<{ element: JSX.Element; isDefault: boolean }> = [];
                            const MAX_VISIBLE = 3;
                            
                            // Helper function to create item entry
                            const createItem = (element: JSX.Element, isDefault: boolean = false) => {
                              items.push({ element, isDefault });
                            };
                            
                            // Handle phone
                            if (comms && comms.phone) {
                              if (typeof comms.phone === 'string') {
                                createItem(
                                  <Group key="phone-home">
                              <Box style={{ minWidth: rem(100) }}>
                                <Text size="sm" c="dimmed">Phone</Text>
                                <Text size="xs" c="dimmed">Home</Text>
                              </Box>
                                    <Text size="md" fw={600}>{comms.phone}</Text>
                                  </Group>,
                                  false
                                );
                              } else {
                                Object.entries(comms.phone).forEach(([name, entry]) => {
                                  const value = typeof entry === 'string' ? entry : (entry?.value || '');
                                  const isDefault = typeof entry === 'object' && entry !== null && entry.default;
                                  createItem(
                                    <Group 
                                      key={`phone-${name}`}
                                      justify="space-between"
                                      style={{ position: 'relative' }}
                                      onMouseEnter={(e) => {
                                        const buttons = e.currentTarget.querySelector('.comm-actions') as HTMLElement;
                                        if (buttons) buttons.style.display = 'flex';
                                      }}
                                      onMouseLeave={(e) => {
                                        const buttons = e.currentTarget.querySelector('.comm-actions') as HTMLElement;
                                        if (buttons) buttons.style.display = 'none';
                                      }}
                                    >
                                      <Group style={{ flex: 1 }}>
                                        <Box style={{ minWidth: rem(100) }}>
                                          <Text size="sm" c={isDefault ? "blue" : "dimmed"}>Phone</Text>
                                          <Text size="xs" c={isDefault ? "blue" : "dimmed"}>{name.charAt(0).toUpperCase() + name.slice(1)}</Text>
                                        </Box>
                                        <Text size="md" fw={600}>{value}</Text>
                            </Group>
                                      <Group gap="xs" className="comm-actions" style={{ display: 'none' }}>
                                        <ActionIcon
                                          variant="subtle"
                                          color="blue"
                                          onClick={() => {
                                            setEditingCommunication({ type: 'phone', name });
                                            setCommunicationType('phone');
                                            setCommunicationName(name);
                                            setCommunicationValue(value);
                                            setIsDefault(isDefault || false);
                                            setCommunicationDialogOpened(true);
                                          }}
                                          title="Edit"
                                        >
                                          <IconEdit size={16} />
                                        </ActionIcon>
                                        <ActionIcon
                                          variant="subtle"
                                          color="red"
                                          onClick={() => {
                                            if (selectedContact) {
                                              const currentComms = selectedContact.communication || {};
                                              const phoneEntries = currentComms.phone && typeof currentComms.phone === 'object' ? { ...currentComms.phone } : {};
                                              delete phoneEntries[name];
                                              
                                              setSelectedContact({
                                                ...selectedContact,
                                                communication: {
                                                  ...currentComms,
                                                  phone: Object.keys(phoneEntries).length > 0 ? phoneEntries : undefined,
                                                },
                                              });
                                            }
                                          }}
                                          title="Delete"
                                        >
                                          <IconTrash size={16} />
                                        </ActionIcon>
                                      </Group>
                                    </Group>,
                                    isDefault || false
                                  );
                                });
                              }
                            }
                            
                            // Handle mobile
                            if (comms && comms.mobile) {
                              if (typeof comms.mobile === 'string') {
                                createItem(
                                  <Group 
                                    key="mobile-home"
                                    justify="space-between"
                                    style={{ position: 'relative' }}
                                    onMouseEnter={(e) => {
                                      const buttons = e.currentTarget.querySelector('.comm-actions') as HTMLElement;
                                      if (buttons) buttons.style.display = 'flex';
                                    }}
                                    onMouseLeave={(e) => {
                                      const buttons = e.currentTarget.querySelector('.comm-actions') as HTMLElement;
                                      if (buttons) buttons.style.display = 'none';
                                    }}
                                  >
                                    <Group style={{ flex: 1 }}>
                                      <Box style={{ minWidth: rem(100) }}>
                                        <Text size="sm" c="dimmed">Mobile</Text>
                                        <Text size="xs" c="dimmed">Home</Text>
                                      </Box>
                                      <Text size="md" fw={600}>{comms.mobile}</Text>
                                    </Group>
                                    <Group gap="xs" className="comm-actions" style={{ display: 'none' }}>
                                      <ActionIcon
                                        variant="subtle"
                                        color="blue"
                                        onClick={() => {
                                          setEditingCommunication({ type: 'mobile', name: 'home' });
                                          setCommunicationType('mobile');
                                          setCommunicationName('home');
                                          setCommunicationValue(typeof comms.mobile === 'string' ? comms.mobile : '');
                                          setIsDefault(false);
                                          setCommunicationDialogOpened(true);
                                        }}
                                        title="Edit"
                                      >
                                        <IconEdit size={16} />
                                      </ActionIcon>
                                      <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        onClick={() => {
                                          if (selectedContact) {
                                            const currentComms = selectedContact.communication || {};
                                            setSelectedContact({
                                              ...selectedContact,
                                              communication: {
                                                ...currentComms,
                                                mobile: undefined,
                                              },
                                            });
                                          }
                                        }}
                                        title="Delete"
                                      >
                                        <IconTrash size={16} />
                                      </ActionIcon>
                                    </Group>
                                  </Group>,
                                  false
                                );
                              } else {
                                Object.entries(comms.mobile).forEach(([name, entry]) => {
                                  const value = typeof entry === 'string' ? entry : entry.value;
                                  const isDefault = typeof entry === 'object' && entry.default;
                                  createItem(
                                    <Group 
                                      key={`mobile-${name}`}
                                      justify="space-between"
                                      style={{ position: 'relative' }}
                                      onMouseEnter={(e) => {
                                        const buttons = e.currentTarget.querySelector('.comm-actions') as HTMLElement;
                                        if (buttons) buttons.style.display = 'flex';
                                      }}
                                      onMouseLeave={(e) => {
                                        const buttons = e.currentTarget.querySelector('.comm-actions') as HTMLElement;
                                        if (buttons) buttons.style.display = 'none';
                                      }}
                                    >
                                      <Group style={{ flex: 1 }}>
                                        <Box style={{ minWidth: rem(100) }}>
                                          <Text size="sm" c={isDefault ? "blue" : "dimmed"}>Mobile</Text>
                                          <Text size="xs" c={isDefault ? "blue" : "dimmed"}>{name.charAt(0).toUpperCase() + name.slice(1)}</Text>
                                        </Box>
                                        <Text size="md" fw={600}>{value}</Text>
                                      </Group>
                                      <Group gap="xs" className="comm-actions" style={{ display: 'none' }}>
                                        <ActionIcon
                                          variant="subtle"
                                          color="blue"
                                          onClick={() => {
                                            setEditingCommunication({ type: 'mobile', name });
                                            setCommunicationType('mobile');
                                            setCommunicationName(name);
                                            setCommunicationValue(value);
                                            setIsDefault(isDefault || false);
                                            setCommunicationDialogOpened(true);
                                          }}
                                          title="Edit"
                                        >
                                          <IconEdit size={16} />
                                        </ActionIcon>
                                        <ActionIcon
                                          variant="subtle"
                                          color="red"
                                          onClick={() => {
                                            if (selectedContact) {
                                              const currentComms = selectedContact.communication || {};
                                              const mobileEntries = currentComms.mobile && typeof currentComms.mobile === 'object' ? { ...currentComms.mobile } : {};
                                              delete mobileEntries[name];
                                              
                                              setSelectedContact({
                                                ...selectedContact,
                                                communication: {
                                                  ...currentComms,
                                                  mobile: Object.keys(mobileEntries).length > 0 ? mobileEntries : undefined,
                                                },
                                              });
                                            }
                                          }}
                                          title="Delete"
                                        >
                                          <IconTrash size={16} />
                                        </ActionIcon>
                                      </Group>
                                    </Group>
                                  );
                                });
                              }
                            }
                            
                            // Handle email
                            if (comms && comms.email) {
                              if (typeof comms.email === 'string') {
                                createItem(
                                  <Group 
                                    key="email-home"
                                    justify="space-between"
                                    style={{ position: 'relative' }}
                                    onMouseEnter={(e) => {
                                      const buttons = e.currentTarget.querySelector('.comm-actions') as HTMLElement;
                                      if (buttons) buttons.style.display = 'flex';
                                    }}
                                    onMouseLeave={(e) => {
                                      const buttons = e.currentTarget.querySelector('.comm-actions') as HTMLElement;
                                      if (buttons) buttons.style.display = 'none';
                                    }}
                                  >
                                    <Group style={{ flex: 1 }}>
                              <Box style={{ minWidth: rem(100) }}>
                                <Text size="sm" c="dimmed">Email</Text>
                                <Text size="xs" c="dimmed">Home</Text>
                              </Box>
                                      <Text size="md" fw={600}>{comms.email}</Text>
                            </Group>
                                    <Group gap="xs" className="comm-actions" style={{ display: 'none' }}>
                                      <ActionIcon
                                        variant="subtle"
                                        color="blue"
                                        onClick={() => {
                                          setEditingCommunication({ type: 'email', name: 'home' });
                                          setCommunicationType('email');
                                          setCommunicationName('home');
                                          setCommunicationValue(typeof comms.email === 'string' ? comms.email : '');
                                          setIsDefault(false);
                                          setCommunicationDialogOpened(true);
                                        }}
                                        title="Edit"
                                      >
                                        <IconEdit size={16} />
                                      </ActionIcon>
                                      <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        onClick={() => {
                                          if (selectedContact) {
                                            const currentComms = selectedContact.communication || {};
                                            setSelectedContact({
                                              ...selectedContact,
                                              communication: {
                                                ...currentComms,
                                                email: undefined,
                                              },
                                            });
                                          }
                                        }}
                                        title="Delete"
                                      >
                                        <IconTrash size={16} />
                                      </ActionIcon>
                                    </Group>
                                  </Group>,
                                  false
                                );
                              } else {
                                Object.entries(comms.email).forEach(([name, entry]) => {
                                  const value = typeof entry === 'string' ? entry : (entry && typeof entry === 'object' && 'value' in entry ? entry.value : '');
                                  const isDefault = entry && typeof entry === 'object' && 'default' in entry ? entry.default : false;
                                  createItem(
                                    <Group 
                                      key={`email-${name}`}
                                      justify="space-between"
                                      style={{ position: 'relative' }}
                                      onMouseEnter={(e) => {
                                        const buttons = e.currentTarget.querySelector('.comm-actions') as HTMLElement;
                                        if (buttons) buttons.style.display = 'flex';
                                      }}
                                      onMouseLeave={(e) => {
                                        const buttons = e.currentTarget.querySelector('.comm-actions') as HTMLElement;
                                        if (buttons) buttons.style.display = 'none';
                                      }}
                                    >
                                      <Group style={{ flex: 1 }}>
                                        <Box style={{ minWidth: rem(100) }}>
                                          <Text size="sm" c={isDefault ? "blue" : "dimmed"}>Email</Text>
                                          <Text size="xs" c={isDefault ? "blue" : "dimmed"}>{name.charAt(0).toUpperCase() + name.slice(1)}</Text>
                                        </Box>
                                        <Text size="md" fw={600}>{value}</Text>
                                      </Group>
                                      <Group gap="xs" className="comm-actions" style={{ display: 'none' }}>
                                        <ActionIcon
                                          variant="subtle"
                                          color="blue"
                                          onClick={() => {
                                            setEditingCommunication({ type: 'email', name });
                                            setCommunicationType('email');
                                            setCommunicationName(name);
                                            setCommunicationValue(value);
                                            setIsDefault(isDefault || false);
                                            setCommunicationDialogOpened(true);
                                          }}
                                          title="Edit"
                                        >
                                          <IconEdit size={16} />
                                        </ActionIcon>
                                        <ActionIcon
                                          variant="subtle"
                                          color="red"
                                          onClick={() => {
                                            if (selectedContact) {
                                              const currentComms = selectedContact.communication || {};
                                              const emailEntries = currentComms.email && typeof currentComms.email === 'object' ? { ...currentComms.email } : {};
                                              delete emailEntries[name];
                                              
                                              setSelectedContact({
                                                ...selectedContact,
                                                communication: {
                                                  ...currentComms,
                                                  email: Object.keys(emailEntries).length > 0 ? emailEntries : undefined,
                                                },
                                              });
                                            }
                                          }}
                                          title="Delete"
                                        >
                                          <IconTrash size={16} />
                                        </ActionIcon>
                                      </Group>
                                    </Group>
                                  );
                                });
                              }
                            }
                            
                            // Handle address
                            if (selectedContact.address_json) {
                              const addr = selectedContact.address_json;
                              const addressStr = [
                                addr.street,
                                addr.street2,
                                addr.suburb,
                                addr.postcode,
                                addr.state,
                              ].filter(Boolean).join(', ');
                              
                              createItem(
                                <Group 
                                  key="address"
                                  justify="space-between"
                                  style={{ position: 'relative' }}
                                  onMouseEnter={(e) => {
                                    const buttons = e.currentTarget.querySelector('.comm-actions') as HTMLElement;
                                    if (buttons) buttons.style.display = 'flex';
                                  }}
                                  onMouseLeave={(e) => {
                                    const buttons = e.currentTarget.querySelector('.comm-actions') as HTMLElement;
                                    if (buttons) buttons.style.display = 'none';
                                  }}
                                >
                                  <Group style={{ flex: 1 }}>
                                    <Box style={{ minWidth: rem(100) }}>
                                      <Text size="sm" c={addr.default ? "blue" : "dimmed"}>Address</Text>
                                      <Text size="xs" c={addr.default ? "blue" : "dimmed"}>{addr.type ? addr.type.charAt(0).toUpperCase() + addr.type.slice(1) : 'Home'}</Text>
                                    </Box>
                                    <Text size="md" fw={600}>{addressStr}</Text>
                                  </Group>
                                  <Group gap="xs" className="comm-actions" style={{ display: 'none' }}>
                                    <ActionIcon
                                      variant="subtle"
                                      color="blue"
                                      onClick={() => {
                                        setEditingCommunication({ type: 'address', name: addr.type || 'home' });
                                        setCommunicationType('address');
                                        setCommunicationName(addr.type || 'home');
                                        setIsDefault(addr.default || false);
                                        setAddressFields({
                                          address1: addr.street || '',
                                          address2: addr.street2 || '',
                                          suburb: addr.suburb || '',
                                          postcode: addr.postcode || '',
                                          state: addr.state || '',
                                        });
                                        setCommunicationDialogOpened(true);
                                      }}
                                      title="Edit"
                                    >
                                      <IconEdit size={16} />
                                    </ActionIcon>
                                    <ActionIcon
                                      variant="subtle"
                                      color="red"
                                      onClick={() => {
                                        if (selectedContact) {
                                          setSelectedContact({
                                            ...selectedContact,
                                            address_json: undefined,
                                          });
                                        }
                                      }}
                                      title="Delete"
                                    >
                                      <IconTrash size={16} />
                                    </ActionIcon>
                                  </Group>
                                </Group>,
                                addr.default || false
                              );
                            }
                            
                            // Sort items: defaults first
                            items.sort((a, b) => {
                              if (a.isDefault && !b.isDefault) return -1;
                              if (!a.isDefault && b.isDefault) return 1;
                              return 0;
                            });
                            
                            const sortedElements = items.map(item => item.element);
                            const hasMore = sortedElements.length > MAX_VISIBLE;
                            const remainingCount = sortedElements.length - MAX_VISIBLE;
                            
                            if (sortedElements.length === 0) {
                              return null;
                            }
                            
                            // Calculate height for exactly MAX_VISIBLE items
                            // Each item: ~40px (text + padding), gap: 16px (md)
                            // Height = (items × 40px) + ((items - 1) × 16px)
                            const itemHeight = 40;
                            const gapSize = 16;
                            const containerHeight = (MAX_VISIBLE * itemHeight) + ((MAX_VISIBLE - 1) * gapSize);
                            
                            return (
                              <>
                                {hasMore ? (
                                  <>
                                    <div
                                      onWheel={(e) => {
                                        // Stop wheel events from propagating to parent
                                        e.stopPropagation();
                                      }}
                                      onTouchMove={(e) => {
                                        // Stop touch events from propagating (for trackpad)
                                        e.stopPropagation();
                                      }}
                                      style={{ width: '100%' }}
                                    >
                                      <ScrollArea 
                                        h={containerHeight} 
                                        offsetScrollbars
                                      >
                                        <Stack gap="md">
                                          {sortedElements}
                                        </Stack>
                                      </ScrollArea>
                                    </div>
                                    <Text size="xs" c="dimmed" ta="center" mt={4}>
                                      Scroll for {remainingCount} more...
                                    </Text>
                                  </>
                                ) : (
                                  <Stack gap="md">
                                    {sortedElements}
                                  </Stack>
                                )}
                              </>
                            );
                          })()}
                        </Stack>
                      </Paper>
                    )}
                  </Box>

                  <Box>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="md">Note</Text>
                    <Textarea
                      placeholder="Additional notes..."
                      value={selectedContact.note || ''}
                      onChange={(e) => {
                        if (selectedContact) {
                          setSelectedContact({ ...selectedContact, note: e.currentTarget.value });
                        }
                      }}
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
        title={selectedContact && isNDISFunding(selectedContact) ? 'Add Coordinator' : 'Add Referrer'}
        size="md"
        styles={{
          header: {
            backgroundColor: '#228BE6',
            color: 'white',
            padding: `${rem(16)} ${rem(24)}`,
          },
          title: {
            color: 'white',
            fontSize: rem(18),
            fontWeight: 600,
          },
        }}
      >
        <Stack gap="md">
          {/* Patient Information (Read-only) */}
          {selectedContact && (
            <>
              <Box>
                <Text size="sm" c="dimmed" mb={4}>NAME</Text>
                <Text size="md" fw={600}>{selectedContact.name || 'No patient selected'}</Text>
                {selectedContact.healthNumber && (
                  <>
                    <Text size="sm" c="dimmed" mt="xs" mb={4}>HEALTH NUMBER</Text>
                    <Text size="md">{selectedContact.healthNumber}</Text>
                  </>
                )}
              </Box>
              <Divider />
            </>
          )}

          <DatePickerInput
            label="ASSIGNMENT DATE"
            placeholder="Select assignment date"
            value={coordinatorDate}
            onChange={setCoordinatorDate}
            maxDate={new Date()}
            required
          />
          
          <TextInput
            label={selectedContact && isNDISFunding(selectedContact) ? 'SEARCH COORDINATORS' : 'SEARCH REFERRERS'}
            placeholder={selectedContact && isNDISFunding(selectedContact) ? 'Search coordinators...' : 'Search referrers...'}
            leftSection={<IconSearch size={16} />}
            value={coordinatorSearchQuery}
            onChange={(e) => setCoordinatorSearchQuery(e.currentTarget.value)}
          />
          
          {coordinatorSearchQuery.trim() && (
            coordinatorLoading ? (
              <Center py="xl">
                <Loader size="sm" />
              </Center>
            ) : coordinatorSearchResults.length > 0 ? (
              <ScrollArea h={300}>
                <Stack gap="xs">
                  {coordinatorSearchResults.map((coordinator) => (
                  <UnstyledButton
                    key={coordinator.id}
                    onClick={async () => {
                      if (selectedContact && coordinatorDate) {
                        try {
                          const dateStr = dayjs(coordinatorDate).format('YYYY-MM-DD');
                          
                          // Create patient-referrer relationship in the database
                          const response = await fetch('https://localhost:8000/api/patient-referrers/', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                              patient: selectedContact.id,
                              referrer: coordinator.id,
                              referral_date: dateStr,
                              status: 'ACTIVE',
                            }),
                          });
                          
                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ detail: 'Failed to create relationship' }));
                            throw new Error(errorData.detail || `HTTP ${response.status}`);
                          }
                          
                          // Update local state for display
                          const coordinators = getCoordinators(selectedContact);
                          const newCoordinator = {
                            name: coordinator.name,
                            date: dateStr,
                          };
                          const updatedCoordinators = [...coordinators, newCoordinator];
                          setSelectedContact({
                            ...selectedContact,
                            coordinators: updatedCoordinators,
                            coordinator: newCoordinator,
                          });
                          
                          // Refresh the patient data from backend to get updated referrer count
                          try {
                            const patientResponse = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/?t=${Date.now()}`, {
                              credentials: 'include',
                            });
                            if (patientResponse.ok) {
                              const updatedPatient = await patientResponse.json();
                              const transformedPatient = transformPatientToContact(updatedPatient);
                              
                              // Update selected contact
                              setSelectedContact(transformedPatient);
                              
                              // Update all contacts
                              setAllContacts(prev => prev.map(c => 
                                c.id === transformedPatient.id ? transformedPatient : c
                              ));
                              
                              // Update filtered contacts list
                              setContacts(prev => prev.map(c => 
                                c.id === transformedPatient.id ? transformedPatient : c
                              ));
                            }
                          } catch (refreshError) {
                            console.error('Error refreshing patient data:', refreshError);
                            // Don't show error to user, the coordinator was added successfully
                          }
                          
                          // Close dialog and reset
                          setCoordinatorDialogOpened(false);
                          setCoordinatorSearchQuery('');
                          setCoordinatorSearchResults([]);
                          setCoordinatorDate(null);
                        } catch (error) {
                          console.error('Error creating patient-referrer relationship:', error);
                          alert(`Failed to add ${isNDISFunding(selectedContact) ? 'coordinator' : 'referrer'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
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
                      cursor: coordinatorDate ? 'pointer' : 'not-allowed',
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
                      {coordinator.specialty && (
                        <Text size="xs" c="blue">{coordinator.specialty}</Text>
                      )}
                      {coordinator.practice && (
                        <Text size="xs" c="dimmed">{coordinator.practice}</Text>
                      )}
                    </Stack>
                  </UnstyledButton>
                ))}
              </Stack>
            </ScrollArea>
          ) : (
            <Center py="xl">
              <Text c="dimmed" size="sm">
                {selectedContact && isNDISFunding(selectedContact) ? 'No coordinators found' : 'No referrers found'}
              </Text>
            </Center>
          )
          )}
        </Stack>
      </Modal>

      {/* Coordinator List Dialog */}
      <Modal
        opened={coordinatorListDialogOpened}
        onClose={() => setCoordinatorListDialogOpened(false)}
        title={selectedContact && isNDISFunding(selectedContact) ? 'Coordinators' : 'Referrers'}
        size="md"
        styles={{
          header: {
            backgroundColor: '#228BE6',
            color: 'white',
            padding: `${rem(16)} ${rem(24)}`,
          },
          title: {
            color: 'white',
            fontSize: rem(18),
            fontWeight: 600,
          },
        }}
      >
        <Stack gap="md">
          {(() => {
            const coordinators = getCoordinators(selectedContact);
            
            if (coordinators.length === 0) {
              return (
                <Center py="xl">
                  <Text c="dimmed" size="sm">
                    {selectedContact && isNDISFunding(selectedContact) ? 'No coordinators assigned' : 'No referrers assigned'}
                  </Text>
                </Center>
              );
            }
            
            // Sort by date descending (most recent first)
            const sortedCoordinators = [...coordinators].sort((a, b) => {
              // Parse dates in DD/MM/YYYY format
              const parseDate = (dateStr: string) => {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                  // Convert DD/MM/YYYY to YYYY-MM-DD for parsing
                  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
                return new Date(dateStr);
              };
              
              const dateA = parseDate(a.date);
              const dateB = parseDate(b.date);
              return dateB.getTime() - dateA.getTime();
            });
            
            return (
              <ScrollArea h={400}>
                <Stack gap="xs">
                  {sortedCoordinators.map((coordinator, index) => (
                    <Box
                      key={index}
                      style={{
                        position: 'relative',
                      }}
                    >
                      <UnstyledButton
                        style={{
                          width: '100%',
                          padding: rem(12),
                          borderRadius: rem(4),
                          backgroundColor: isDark ? '#25262b' : '#f8f9fa',
                          border: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => {
                          const deleteBtn = e.currentTarget.parentElement?.querySelector('.delete-coordinator-btn') as HTMLElement;
                          if (deleteBtn) deleteBtn.style.display = 'flex';
                          e.currentTarget.style.backgroundColor = isDark ? '#2C2E33' : '#e9ecef';
                        }}
                        onMouseLeave={(e) => {
                          const deleteBtn = e.currentTarget.parentElement?.querySelector('.delete-coordinator-btn') as HTMLElement;
                          if (deleteBtn) deleteBtn.style.display = 'none';
                          e.currentTarget.style.backgroundColor = isDark ? '#25262b' : '#f8f9fa';
                        }}
                        onClick={async (e) => {
                          if (!selectedContact) return;
                          
                          try {
                            // Step 1: Set all referrers for this patient to is_primary=False
                            const allResponse = await fetch(`https://localhost:8000/api/patient-referrers/?patient=${selectedContact.id}`, {
                              credentials: 'include',
                            });
                            
                            if (!allResponse.ok) throw new Error('Failed to fetch patient-referrer relationships');
                            
                            const allData = await allResponse.json();
                            const allRelationships = allData.results || allData;
                            
                            // Find the clicked referrer's relationship
                            const toUpdate = allRelationships.find((pr: any) => 
                              pr.referrer_name === coordinator.name
                            );
                            
                            if (!toUpdate) {
                              throw new Error('Relationship not found');
                            }
                            
                            // Step 2: Update all OTHER referrers to is_primary=False
                            const updatePromises = allRelationships
                              .filter((pr: any) => pr.id !== toUpdate.id)
                              .map((pr: any) => 
                                fetch(`https://localhost:8000/api/patient-referrers/${pr.id}/`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ is_primary: false }),
                                })
                              );
                            
                            await Promise.all(updatePromises);
                            
                            // Step 3: Set the clicked referrer to is_primary=True and update date
                            const today = dayjs().format('YYYY-MM-DD');
                            const updateResponse = await fetch(`https://localhost:8000/api/patient-referrers/${toUpdate.id}/`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              credentials: 'include',
                              body: JSON.stringify({
                                is_primary: true,
                                referral_date: today,
                                status: 'ACTIVE',
                              }),
                            });
                            
                            if (!updateResponse.ok) throw new Error('Failed to update relationship');
                            
                            // Refresh the patient data from backend
                            const patientResponse = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/?t=${Date.now()}`, {
                              credentials: 'include',
                            });
                            
                            if (patientResponse.ok) {
                              const updatedPatient = await patientResponse.json();
                              const transformedPatient = transformPatientToContact(updatedPatient);
                              
                              // Update all state
                              setSelectedContact(transformedPatient);
                              setAllContacts(prev => prev.map(c => 
                                c.id === transformedPatient.id ? transformedPatient : c
                              ));
                              setContacts(prev => prev.map(c => 
                                c.id === transformedPatient.id ? transformedPatient : c
                              ));
                            }
                            
                            // Close dialog immediately
                            setCoordinatorListDialogOpened(false);
                            
                          } catch (error) {
                            console.error('Error updating coordinator/referrer:', error);
                            alert(`Failed to update ${isNDISFunding(selectedContact) ? 'coordinator' : 'referrer'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          }
                        }}
                      >
                        <Group justify="space-between" align="flex-start">
                          <Stack gap={4} style={{ flex: 1 }}>
                            <Group gap="xs">
                              <Text size="sm" fw={600}>{coordinator.name}</Text>
                              {coordinator.is_primary && (
                                <Badge size="xs" color="green" variant="filled">
                                  Primary
                                </Badge>
                              )}
                            </Group>
                            <Text size="xs" c="blue">{coordinator.date}</Text>
                          </Stack>
                        </Group>
                      </UnstyledButton>
                      <ActionIcon
                        className="delete-coordinator-btn"
                        variant="subtle"
                        color="red"
                        size="sm"
                        style={{ 
                          display: 'none',
                          position: 'absolute',
                          top: rem(8),
                          right: rem(8),
                        }}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent box click
                          setCoordinatorToDelete(coordinator);
                          setDeleteCoordinatorOpened(true);
                        }}
                        title={`Remove ${isNDISFunding(selectedContact) ? 'coordinator' : 'referrer'}`}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Box>
                  ))}
                </Stack>
              </ScrollArea>
            );
          })()}
        </Stack>
      </Modal>

      {/* Delete Coordinator/Referrer Confirmation Dialog */}
      <Modal
        opened={deleteCoordinatorOpened}
        onClose={() => {
          setDeleteCoordinatorOpened(false);
          setCoordinatorToDelete(null);
        }}
        title="Confirm Removal"
        size="sm"
        centered
      >
        <Stack gap="lg">
          <Text>
            Remove <strong>{coordinatorToDelete?.name}</strong> as {isNDISFunding(selectedContact) ? 'coordinator' : 'referrer'}?
          </Text>
          
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => {
                setDeleteCoordinatorOpened(false);
                setCoordinatorToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={async () => {
                if (!selectedContact || !coordinatorToDelete) return;
                
                try {
                  // Find the PatientReferrer ID from the API
                  const response = await fetch(`https://localhost:8000/api/patient-referrers/?patient=${selectedContact.id}`, {
                    credentials: 'include',
                  });
                  
                  if (!response.ok) throw new Error('Failed to fetch patient-referrer relationships');
                  
                  const data = await response.json();
                  const relationships = data.results || data;
                  
                  // Find the relationship to delete by matching name and date
                  const toDelete = relationships.find((pr: any) => 
                    pr.referrer_name === coordinatorToDelete.name && 
                    pr.referral_date === coordinatorToDelete.date.split('/').reverse().join('-')
                  );
                  
                  if (!toDelete) {
                    throw new Error('Relationship not found');
                  }
                  
                  // Delete the relationship
                  const deleteResponse = await fetch(`https://localhost:8000/api/patient-referrers/${toDelete.id}/`, {
                    method: 'DELETE',
                    credentials: 'include',
                  });
                  
                  if (!deleteResponse.ok) throw new Error('Failed to delete relationship');
                  
                  // Update local state - remove from coordinators array
                  const updatedCoordinators = getCoordinators(selectedContact).filter(
                    c => !(c.name === coordinatorToDelete.name && c.date === coordinatorToDelete.date)
                  );
                  
                  setSelectedContact({
                    ...selectedContact,
                    coordinators: updatedCoordinators.length > 0 ? updatedCoordinators : undefined,
                    coordinator: updatedCoordinators.length > 0 ? updatedCoordinators[0] : undefined,
                  });
                  
                  // Update in allContacts too
                  setAllContacts(prev => prev.map(c => 
                    c.id === selectedContact.id 
                      ? {
                          ...c,
                          coordinators: updatedCoordinators.length > 0 ? updatedCoordinators : undefined,
                          coordinator: updatedCoordinators.length > 0 ? updatedCoordinators[0] : undefined,
                        }
                      : c
                  ));
                  
                  // Refresh the patient data from backend to get updated referrer count
                  try {
                    const patientResponse = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/?t=${Date.now()}`, {
                      credentials: 'include',
                    });
                    if (patientResponse.ok) {
                      const updatedPatient = await patientResponse.json();
                      const transformedPatient = transformPatientToContact(updatedPatient);
                      
                      // Update selected contact
                      setSelectedContact(transformedPatient);
                      
                      // Update all contacts
                      setAllContacts(prev => prev.map(c => 
                        c.id === transformedPatient.id ? transformedPatient : c
                      ));
                      
                      // Update filtered contacts list
                      setContacts(prev => prev.map(c => 
                        c.id === transformedPatient.id ? transformedPatient : c
                      ));
                    }
                  } catch (refreshError) {
                    console.error('Error refreshing patient data:', refreshError);
                    // Don't show error to user, the coordinator was deleted successfully
                  }
                  
                  // Close dialog
                  setDeleteCoordinatorOpened(false);
                  setCoordinatorToDelete(null);
                  
                } catch (error) {
                  console.error('Error deleting coordinator/referrer:', error);
                  alert(`Failed to delete ${isNDISFunding(selectedContact) ? 'coordinator' : 'referrer'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
            >
              Remove
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Reminder Dialog */}
      <Modal
        opened={reminderDialogOpened}
        onClose={() => {
          setReminderDialogOpened(false);
          setReminderClinic('');
          setReminderNote('');
          setReminderNoteTemplate('');
          setReminderDate(null);
        }}
        title={
          <Group justify="space-between" style={{ width: '100%' }}>
            <Text fw={600} size="lg">{selectedContact ? `Add Reminder for ${selectedContact.name}` : 'Add Reminder'}</Text>
            <ActionIcon
              variant="subtle"
              onClick={() => {
                setReminderDialogOpened(false);
                setReminderClinic('');
                setReminderNote('');
                setReminderNoteTemplate('');
                setReminderDate(null);
              }}
              size="lg"
            >
              <IconX size={20} />
            </ActionIcon>
          </Group>
        }
        size="md"
        styles={{
          header: {
            backgroundColor: '#228BE6',
            color: 'white',
            padding: `${rem(16)} ${rem(24)}`,
          },
          title: {
            color: 'white',
          },
        }}
      >
        <Stack gap="md">
          {/* Patient Information (Read-only) */}
          <Box>
            <Text size="sm" c="dimmed" mb={4}>NAME</Text>
            <Text size="md" fw={600}>{selectedContact?.name || 'No patient selected'}</Text>
            {selectedContact?.healthNumber && (
              <>
                <Text size="sm" c="dimmed" mt="xs" mb={4}>HEALTH NUMBER</Text>
                <Text size="md">{selectedContact.healthNumber}</Text>
              </>
            )}
          </Box>

          <Divider />

          {/* Clinic Selection */}
          <Select
            label="CLINIC"
            placeholder="Select clinic"
            data={reminderClinics}
            value={reminderClinic}
            onChange={(value) => setReminderClinic(value || '')}
            required
            searchable
          />

          {/* Note Template Selection (Optional) */}
          <Select
            label="SELECT NOTE"
            placeholder="Select Note"
            data={[
              { value: 'follow-up', label: 'Follow-up needed' },
              { value: 'review', label: 'Review required' },
              { value: 'appointment', label: 'Appointment pending' },
              { value: 'assessment', label: 'Assessment due' },
              { value: 'other', label: 'Other' },
            ]}
            value={reminderNoteTemplate}
            onChange={(value) => {
              setReminderNoteTemplate(value || '');
              // Auto-fill note if template selected
              if (value === 'follow-up') {
                setReminderNote('Follow-up needed');
              } else if (value === 'review') {
                setReminderNote('Review required');
              } else if (value === 'appointment') {
                setReminderNote('Appointment pending');
              } else if (value === 'assessment') {
                setReminderNote('Assessment due');
              }
            }}
            clearable
          />

          {/* Free-form Note */}
          <Textarea
            label="NOTE"
            placeholder="Enter Note"
            value={reminderNote}
            onChange={(e) => setReminderNote(e.currentTarget.value)}
            minRows={4}
          />

          {/* Optional Reminder Date */}
          <DatePickerInput
            label="REMINDER DATE (Optional)"
            placeholder="Select date"
            value={reminderDate}
            onChange={setReminderDate}
            clearable
          />

          <Group justify="space-between" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setReminderDialogOpened(false);
                setReminderClinic('');
                setReminderNote('');
                setReminderNoteTemplate('');
                setReminderDate(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (selectedContact && reminderClinic) {
                  try {
                    const reminderData = {
                      patient: selectedContact.id,
                      clinic: reminderClinic || null,
                      note: reminderNote || reminderNoteTemplate || 'Reminder',
                      reminder_date: reminderDate ? reminderDate.toISOString().split('T')[0] : null,
                    };
                    
                    console.log('Creating reminder:', reminderData);
                    
                    const response = await fetch('https://localhost:8000/api/reminders/', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(reminderData),
                    });
                    
                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({ detail: 'Failed to create reminder' }));
                      throw new Error(errorData.detail || `HTTP ${response.status}`);
                    }
                    
                    const createdReminder = await response.json();
                    console.log('Reminder created:', createdReminder);
                    
                    // Close dialog and reset state
                    setReminderDialogOpened(false);
                    setReminderClinic('');
                    setReminderNote('');
                    setReminderNoteTemplate('');
                    setReminderDate(null);
                  } catch (error) {
                    console.error('Error creating reminder:', error);
                    alert(`Failed to create reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                } else {
                  alert('Please select a clinic');
                }
              }}
              disabled={!reminderClinic}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Plan Dates Dialog */}
      <Modal
        opened={planDatesDialogOpened}
        onClose={() => {
          setPlanDatesDialogOpened(false);
          setPlanStartDate(null);
          setPlanEndDate(null);
          setPlanType('');
          setEditingPlanDate(null);
        }}
        title={
          <Group justify="space-between" style={{ width: '100%' }}>
            <Text fw={600} size="lg">{editingPlanDate !== null ? "Edit Plan Dates" : "Add New Plan Dates"}</Text>
            <ActionIcon
              variant="subtle"
              onClick={() => {
                setPlanDatesDialogOpened(false);
                setPlanStartDate(null);
                setPlanEndDate(null);
                setPlanType('');
                setEditingPlanDate(null);
              }}
              size="lg"
            >
              <IconX size={20} />
            </ActionIcon>
          </Group>
        }
        size="md"
        styles={{
          header: {
            backgroundColor: '#228BE6',
            color: 'white',
            padding: `${rem(16)} ${rem(24)}`,
          },
          title: {
            color: 'white',
          },
        }}
      >
        <Stack gap="md">
          {/* Patient Information (Read-only) */}
          {selectedContact && (
            <>
              <Box>
                <Text size="sm" c="dimmed" mb={4}>NAME</Text>
                <Text size="md" fw={600}>{selectedContact.name || 'No patient selected'}</Text>
                {selectedContact.healthNumber && (
                  <>
                    <Text size="sm" c="dimmed" mt="xs" mb={4}>HEALTH NUMBER</Text>
                    <Text size="md">{selectedContact.healthNumber}</Text>
                  </>
                )}
              </Box>
              <Divider />
            </>
          )}

          <DatePickerInput
            label="START DATE"
            placeholder="Select start date"
            value={planStartDate}
            onChange={setPlanStartDate}
            required
          />
          
          <DatePickerInput
            label="END DATE"
            placeholder="Select end date"
            value={planEndDate}
            onChange={setPlanEndDate}
            required
          />
          
          <Select
            label="TYPE"
            placeholder="Select plan type"
            data={[
              { value: '1 Year Plan', label: '1 Year Plan' },
              { value: '2 Year Plan', label: '2 Year Plan' },
              { value: 'Under Review', label: 'Under Review' },
              { value: 'Short Plan', label: 'Short Plan' },
            ]}
            value={planType}
            onChange={(value) => setPlanType(value || '')}
            clearable
          />
          
          <Group justify="space-between" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setPlanDatesDialogOpened(false);
                setPlanStartDate(null);
                setPlanEndDate(null);
                setPlanType('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (selectedContact && planStartDate && planEndDate) {
                  try {
                    // Get current plan dates array
                    const currentPlanDates = getPlanDates(selectedContact);
                    
                    const planDateData = {
                      start_date: planStartDate.toISOString().split('T')[0],
                      end_date: planEndDate.toISOString().split('T')[0],
                      type: planType || '',
                    };
                    
                    let updatedPlanDates;
                    if (editingPlanDate !== null && editingPlanDate >= 0) {
                      // Editing existing plan date
                      updatedPlanDates = [...currentPlanDates];
                      updatedPlanDates[editingPlanDate] = planDateData;
                    } else {
                      // Adding new plan date
                      updatedPlanDates = [...currentPlanDates, planDateData];
                    }
                    
                    // Update patient with new plan_dates_json
                    const response = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        plan_dates_json: updatedPlanDates,
                      }),
                    });
                    
                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({ detail: 'Failed to save plan dates' }));
                      throw new Error(errorData.detail || `HTTP ${response.status}`);
                    }
                    
                    // Reload patient data
                    const reloadResponse = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/?t=${Date.now()}`);
                    if (reloadResponse.ok) {
                      const updatedPatient = await reloadResponse.json();
                      const transformed = transformPatientToContact(updatedPatient);
                      setSelectedContact(transformed);
                      // Update in allContacts list
                      setAllContacts(prev => prev.map(c => c.id === transformed.id ? transformed : c));
                    }
                    
                    setPlanDatesDialogOpened(false);
                    setPlanStartDate(null);
                    setPlanEndDate(null);
                    setPlanType('');
                    setEditingPlanDate(null);
                  } catch (error) {
                    console.error('Error saving plan dates:', error);
                    alert(`Failed to save plan dates: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                } else {
                  alert('Please fill in start date and end date');
                }
              }}
              disabled={!planStartDate || !planEndDate}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Plan Dates List Dialog */}
      <Modal
        opened={planDatesListDialogOpened}
        onClose={() => setPlanDatesListDialogOpened(false)}
        title={
          <Group justify="space-between" style={{ width: '100%' }}>
            <Text fw={600} size="lg">Plan Dates</Text>
            <ActionIcon
              variant="subtle"
              onClick={() => setPlanDatesListDialogOpened(false)}
              size="lg"
            >
              <IconX size={20} />
            </ActionIcon>
          </Group>
        }
        size="md"
        styles={{
          header: {
            backgroundColor: '#228BE6',
            color: 'white',
            padding: `${rem(16)} ${rem(24)}`,
          },
          title: {
            color: 'white',
          },
        }}
      >
        <Stack gap="md">
          {(() => {
            const planDates = getPlanDates(selectedContact);
            if (planDates.length === 0) {
              return (
                <Center py="xl">
                  <Text c="dimmed">No plan dates found</Text>
                </Center>
              );
            }
            
            // Sort by start_date descending (most recent first)
            const sortedPlanDates = [...planDates].sort((a, b) => {
              const dateA = new Date(a.start_date);
              const dateB = new Date(b.start_date);
              return dateB.getTime() - dateA.getTime();
            });
            
            return (
              <ScrollArea h={400}>
                <Stack gap="xs">
                  {sortedPlanDates.map((planDate, index) => (
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
                        <Text size="sm" fw={600}>
                          {formatDateOnlyAU(planDate.start_date)} - {formatDateOnlyAU(planDate.end_date)}
                        </Text>
                        {planDate.type && (
                          <Text size="xs" c="blue">{planDate.type}</Text>
                        )}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </ScrollArea>
            );
          })()}
        </Stack>
      </Modal>

      {/* Communication Dialog */}
      <Modal
        opened={communicationDialogOpened}
        onClose={() => {
          setCommunicationDialogOpened(false);
          setCommunicationType('');
          setCommunicationName('');
          setCommunicationValue('');
          setIsDefault(false);
          setAddressFields({
            address1: '',
            address2: '',
            suburb: '',
            postcode: '',
            state: '',
          });
        }}
        title={
          <Group justify="space-between" style={{ width: '100%' }}>
            <Text fw={600} size="lg">{selectedContact ? `New Coms for ${selectedContact.name}` : 'New Communication'}</Text>
            <ActionIcon
              variant="subtle"
              onClick={() => {
                setCommunicationDialogOpened(false);
                setCommunicationType('');
                setCommunicationName('');
                setCommunicationValue('');
                setIsDefault(false);
                setAddressFields({
                  address1: '',
                  address2: '',
                  suburb: '',
                  postcode: '',
                  state: '',
                });
              }}
              size="lg"
            >
              <IconX size={20} />
            </ActionIcon>
          </Group>
        }
        size="lg"
        styles={{
          header: {
            backgroundColor: '#228BE6',
            color: 'white',
            padding: `${rem(16)} ${rem(24)}`,
          },
          title: {
            color: 'white',
          },
        }}
      >
        <Stack gap="md">
          {/* Patient Information (Read-only) */}
          {selectedContact && (
            <>
              <Box>
                <Text size="sm" c="dimmed" mb={4}>NAME</Text>
                <Text size="md" fw={600}>{selectedContact.name || 'No patient selected'}</Text>
                {selectedContact.healthNumber && (
                  <>
                    <Text size="sm" c="dimmed" mt="xs" mb={4}>HEALTH NUMBER</Text>
                    <Text size="md">{selectedContact.healthNumber}</Text>
                  </>
                )}
              </Box>
              <Divider />
            </>
          )}

          <Select
            label="TYPE"
            placeholder="Select type"
            data={[
              { value: 'phone', label: 'Phone' },
              { value: 'mobile', label: 'Mobile' },
              { value: 'email', label: 'Email' },
              { value: 'address', label: 'Address' },
            ]}
            value={communicationType}
            onChange={(value) => {
              setCommunicationType(value || '');
              setCommunicationValue('');
              setAddressFields({
                address1: '',
                address2: '',
                suburb: '',
                postcode: '',
                state: '',
              });
            }}
            required
          />

          <Select
            label="NAME"
            placeholder="Select name"
            data={[
              { value: 'home', label: 'Home' },
              { value: 'work', label: 'Work' },
              { value: 'mobile', label: 'Mobile' },
              { value: 'other', label: 'Other' },
            ]}
            value={communicationName}
            onChange={(value) => setCommunicationName(value || '')}
            required
          />

          {communicationType === 'phone' && (
            <TextInput
              label="PHONE"
              placeholder="Phone"
              value={communicationValue}
              onChange={(e) => setCommunicationValue(e.currentTarget.value)}
              required
            />
          )}

          {communicationType === 'mobile' && (
            <TextInput
              label="MOBILE"
              placeholder="Mobile"
              value={communicationValue}
              onChange={(e) => setCommunicationValue(e.currentTarget.value)}
              required
            />
          )}

          {communicationType === 'email' && (
            <TextInput
              label="EMAIL"
              placeholder="Email"
              type="email"
              value={communicationValue}
              onChange={(e) => setCommunicationValue(e.currentTarget.value)}
              required
            />
          )}

          {communicationType === 'address' && (
            <Stack gap="md">
              <TextInput
                label="ADDRESS"
                placeholder="Address 1"
                value={addressFields.address1}
                onChange={(e) => setAddressFields({ ...addressFields, address1: e.currentTarget.value })}
                required
              />
              <TextInput
                placeholder="Address 2"
                value={addressFields.address2}
                onChange={(e) => setAddressFields({ ...addressFields, address2: e.currentTarget.value })}
              />
              <TextInput
                placeholder="Suburb"
                value={addressFields.suburb}
                onChange={(e) => setAddressFields({ ...addressFields, suburb: e.currentTarget.value })}
              />
              <Group grow>
                <TextInput
                  placeholder="Post Code"
                  value={addressFields.postcode}
                  onChange={(e) => setAddressFields({ ...addressFields, postcode: e.currentTarget.value })}
                />
                <Select
                  placeholder="State"
                  data={[
                    { value: 'NSW', label: 'NSW' },
                    { value: 'VIC', label: 'VIC' },
                    { value: 'QLD', label: 'QLD' },
                    { value: 'SA', label: 'SA' },
                    { value: 'WA', label: 'WA' },
                    { value: 'TAS', label: 'TAS' },
                    { value: 'NT', label: 'NT' },
                    { value: 'ACT', label: 'ACT' },
                  ]}
                  value={addressFields.state}
                  onChange={(value) => setAddressFields({ ...addressFields, state: value || '' })}
                />
              </Group>
            </Stack>
          )}

          <Group justify="space-between" mt="md">
            {communicationType && (
              <Switch
                label="Default"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.currentTarget.checked)}
                description="Set as the default for this communication type"
                style={{ flex: 1 }}
              />
            )}
            <Group gap="xs" ml="auto">
              <Button
                variant="subtle"
              onClick={() => {
                setCommunicationDialogOpened(false);
                setEditingCommunication(null);
                setCommunicationType('');
                setCommunicationName('');
                setCommunicationValue('');
                setIsDefault(false);
                setAddressFields({
                  address1: '',
                  address2: '',
                  suburb: '',
                  postcode: '',
                  state: '',
                });
              }}
              >
                Cancel
              </Button>
              <Button
              onClick={async () => {
                if (selectedContact && communicationType && communicationName) {
                  try {
                    // Handle saving communication
                    if (communicationType === 'address') {
                      // Handle address - save to address_json
                      const addressData = {
                        street: addressFields.address1,
                        street2: addressFields.address2 || '',
                        suburb: addressFields.suburb || '',
                        postcode: addressFields.postcode || '',
                        state: addressFields.state || '',
                        type: communicationName, // Home, Work, etc.
                        default: isDefault,
                      };
                      
                      // Update contact with address
                      setSelectedContact({
                        ...selectedContact,
                        address_json: addressData,
                      });
                      
                      // Save to backend API
                      try {
                        const response = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/`, {
                          method: 'PATCH',
                          headers: { 
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ address_json: addressData }),
                        });
                        if (!response.ok) {
                          const errorText = await response.text();
                          throw new Error(`Failed to save address: ${response.status} ${errorText}`);
                        }
                        
                        // Force reload patient from backend to get updated data
                        try {
                          const patientResponse = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/?t=${Date.now()}`, {
                            cache: 'no-cache',
                          });
                          if (patientResponse.ok) {
                            const updatedPatient = await patientResponse.json();
                            const updatedContact = transformPatientToContact(updatedPatient);
                            setSelectedContact(updatedContact);
                            
                            // Also update in allContacts list
                            setAllContacts((prevContacts) => 
                              prevContacts.map((c) => c.id === updatedContact.id ? updatedContact : c)
                            );
                          } else {
                            console.error('Failed to reload patient:', patientResponse.status);
                            // Fallback: update state directly if reload fails
                            setSelectedContact({
                              ...selectedContact,
                              address_json: addressData,
                            });
                          }
                        } catch (reloadError) {
                          console.error('Error reloading patient:', reloadError);
                          // Fallback: update state directly if reload fails
                          setSelectedContact({
                            ...selectedContact,
                            address_json: addressData,
                          });
                        }
                      } catch (error) {
                        console.error('Error saving address:', error);
                        alert(`Failed to save address: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        return; // Don't close dialog on error
                      }
                      // Address save successful - will close dialog below
                    } else {
                        // Handle phone, mobile, email
                        if (communicationValue) {
                          const currentComms = selectedContact.communication || {};
                          const currentType = currentComms[communicationType as keyof typeof currentComms];
                          
                          // If setting as default, remove default flag from all other entries of this type
                          let updatedTypeEntries: any = {};
                          if (currentType && typeof currentType === 'object' && !Array.isArray(currentType)) {
                            // Handle object format (new structure)
                            updatedTypeEntries = { ...currentType };
                            
                            // If editing, remove the old entry first
                            if (editingCommunication && editingCommunication.type === communicationType) {
                              delete updatedTypeEntries[editingCommunication.name];
                            }
                            
                            if (isDefault) {
                              // Remove default flag from all other entries
                              Object.keys(updatedTypeEntries).forEach((key) => {
                                if (updatedTypeEntries[key] && typeof updatedTypeEntries[key] === 'object') {
                                  updatedTypeEntries[key] = {
                                    ...updatedTypeEntries[key],
                                    default: false,
                                  };
                                }
                              });
                            }
                          } else if (currentType && typeof currentType === 'string') {
                            // Handle legacy string format - convert to object format
                            updatedTypeEntries = {
                              home: { value: currentType, default: false },
                            };
                            // If editing and it was the legacy entry, remove it
                            if (editingCommunication && editingCommunication.type === communicationType && editingCommunication.name === 'home') {
                              delete updatedTypeEntries.home;
                            }
                          }
                          
                          // Add/update the new entry
                          updatedTypeEntries[communicationName] = {
                            value: communicationValue,
                            default: isDefault,
                          };
                        
                        const updatedCommunication = {
                          ...currentComms,
                          [communicationType]: updatedTypeEntries,
                        };
                        
                        // Save to backend API first
                        try {
                          const response = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/`, {
                            method: 'PATCH',
                            headers: { 
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ contact_json: updatedCommunication }),
                          });
                          if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Failed to save communication: ${response.status} ${errorText}`);
                          }
                          
                          // Force reload patient from backend to get updated data
                          try {
                            const patientResponse = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/`, {
                              cache: 'no-cache',
                              headers: {
                                'Cache-Control': 'no-cache',
                              },
                            });
                            if (patientResponse.ok) {
                              const updatedPatient = await patientResponse.json();
                              const updatedContact = transformPatientToContact(updatedPatient);
                              setSelectedContact(updatedContact);
                              
                              // Also update in allContacts list
                              setAllContacts((prevContacts) => 
                                prevContacts.map((c) => c.id === updatedContact.id ? updatedContact : c)
                              );
                            } else {
                              console.error('Failed to reload patient:', patientResponse.status);
                              // Fallback: update state directly if reload fails
                              setSelectedContact({
                                ...selectedContact,
                                communication: updatedCommunication,
                              });
                            }
                          } catch (reloadError) {
                            console.error('Error reloading patient:', reloadError);
                            // Fallback: update state directly if reload fails
                            setSelectedContact({
                              ...selectedContact,
                              communication: updatedCommunication,
                            });
                          }
                        } catch (error) {
                          console.error('Error saving communication:', error);
                          alert(`Failed to save communication: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          return; // Don't close dialog on error
                        }
                      } else {
                        // No communication value - this shouldn't happen due to validation, but handle gracefully
                        console.warn('No communication value provided');
                        alert('Please enter a communication value');
                        return; // Don't close dialog
                      }
                    }
                    
                    // Close dialog only on successful save
                    setCommunicationDialogOpened(false);
                    setEditingCommunication(null);
                    setCommunicationType('');
                    setCommunicationName('');
                    setCommunicationValue('');
                    setIsDefault(false);
                    setAddressFields({
                      address1: '',
                      address2: '',
                      suburb: '',
                      postcode: '',
                      state: '',
                    });
                  } catch (error) {
                    console.error('Error saving communication:', error);
                    alert(`Error saving communication: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                } else {
                  console.warn('Missing required fields for communication save:', { 
                    selectedContact: !!selectedContact, 
                    communicationType, 
                    communicationName 
                  });
                  alert('Please fill in all required fields');
                }
              }}
                disabled={!communicationType || !communicationName || (communicationType !== 'address' && !communicationValue) || (communicationType === 'address' && !addressFields.address1)}
              >
                Save
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      {/* Notes Dialog */}
      <NotesDialog
        opened={notesDialogOpened}
        onClose={() => setNotesDialogOpened(false)}
        patientId={selectedContact?.id}
      />

      {/* Documents Dialog */}
      <DocumentsDialog
        opened={documentsDialogOpened}
        onClose={() => setDocumentsDialogOpened(false)}
        patientId={selectedContact?.id || ''}
        patientName={selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : ''}
      />

      {/* Images Dialog */}
      <ImagesDialog
        opened={imagesDialogOpened}
        onClose={() => setImagesDialogOpened(false)}
        patientId={selectedContact?.id || ''}
        patientName={selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : ''}
      />

      {/* Appointments Dialog */}
      <AppointmentsDialog
        opened={appointmentsDialogOpened}
        onClose={() => setAppointmentsDialogOpened(false)}
        patientId={selectedContact?.id || ''}
        patientName={selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : ''}
      />

      {/* Letters Dialog */}
      <PatientLettersDialog
        opened={lettersDialogOpened}
        onClose={() => setLettersDialogOpened(false)}
        patientId={selectedContact?.id || ''}
        patientName={selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : ''}
      />

      {/* SMS Dialog */}
      <SMSDialog
        opened={smsDialogOpened}
        onClose={() => setSmsDialogOpened(false)}
        patientId={selectedContact?.id || ''}
        patientName={selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : ''}
      />
      </div>
    </Navigation>
  );
}

