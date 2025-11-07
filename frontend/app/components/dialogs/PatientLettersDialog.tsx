'use client';

import { Modal, Box, Grid, Stack, Button, Text, Group, Badge, ScrollArea, ActionIcon, TextInput, Loader, Menu, rem } from '@mantine/core';
import { IconFileText, IconPlus, IconSearch, IconDots, IconCopy, IconTrash, IconFileTypePdf, IconMail, IconPrinter, IconDownload } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import dynamic from 'next/dynamic';
import { isSafari } from '../../utils/isSafari';

// Dynamically import LetterEditor to avoid SSR issues
const LetterEditor = dynamic(() => import('../../letters/LetterEditor'), { ssr: false });

// Helper to dispatch lettersUpdated event
const dispatchLettersUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('lettersUpdated'));
  }
};

// Helper to get CSRF token
const getCsrfToken = async (): Promise<string> => {
  // Try to get from cookie first
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  
  if (cookieValue) {
    return cookieValue;
  }
  
  // Fallback: fetch from backend
  try {
    const response = await fetch('https://localhost:8000/api/auth/csrf-token/', {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      return data.csrfToken || '';
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
  
  return '';
};

interface PatientLettersDialogProps {
  opened: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

interface PatientLetter {
  id: string;
  patient: string; // Patient UUID
  letter_type: string;
  recipient_name: string;
  subject: string;
  pages: string[];
  preview_text: string;
  created_at: string;
  updated_at: string;
}

export default function PatientLettersDialog({ opened, onClose, patientId, patientName }: PatientLettersDialogProps) {
  const [letters, setLetters] = useState<PatientLetter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<PatientLetter | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfMode, setPdfMode] = useState<'preview' | 'print'>('preview'); // Track if we're previewing or printing
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [originalMetadata, setOriginalMetadata] = useState<{letter_type: string, recipient_name: string, subject: string} | null>(null);
  
  // Store original metadata when a letter is selected
  useEffect(() => {
    if (selectedLetter) {
      setOriginalMetadata({
        letter_type: selectedLetter.letter_type,
        recipient_name: selectedLetter.recipient_name,
        subject: selectedLetter.subject,
      });
    } else {
      setOriginalMetadata(null);
    }
  }, [selectedLetter?.id]); // Only run when letter ID changes, not on every metadata edit
  
  // Check if metadata has changed
  useEffect(() => {
    if (!selectedLetter || !originalMetadata) return;
    
    const metadataChanged = 
      selectedLetter.letter_type !== originalMetadata.letter_type ||
      selectedLetter.recipient_name !== originalMetadata.recipient_name ||
      selectedLetter.subject !== originalMetadata.subject;
    
    if (metadataChanged) {
      console.log('📝 Metadata changed - setting unsaved flag');
      setHasUnsavedChanges(true);
    }
  }, [selectedLetter?.letter_type, selectedLetter?.recipient_name, selectedLetter?.subject, originalMetadata]);
  
  // Track content changes to detect unsaved changes
  useEffect(() => {
    if (!selectedLetter) {
      setHasUnsavedChanges(false);
      return;
    }

    console.log('🔍 Setting up change detection for letter:', selectedLetter.id);

    let currentObserver: MutationObserver | null = null;
    let retryTimer: NodeJS.Timeout | null = null;
    let recheckInterval: NodeJS.Timeout | null = null;
    let lastPageCount = 0;

    // Set up a MutationObserver to detect changes in ALL editor pages
    const setupObservers = () => {
      const editorElements = document.querySelectorAll('.we-page-content .ProseMirror');
      if (editorElements.length === 0) {
        console.warn('⚠️ Editor elements not found, retrying...');
        return false;
      }

      console.log('✅ Editor elements found:', editorElements.length, 'pages, setting up observers');
      lastPageCount = editorElements.length;

      // Flag to ignore initial mutations from setup/focus
      let isInitialSetup = true;
      setTimeout(() => {
        isInitialSetup = false;
        console.log('🎯 Observer now active, will detect real changes');
      }, 1000); // Wait 1 second after setup before tracking changes

      const observer = new MutationObserver((mutations) => {
        // Ignore mutations during initial setup
        if (isInitialSetup) {
          return;
        }
        
        // Filter out mutations that are just from cursor/selection changes
        const hasRealChanges = mutations.some(mutation => {
          // Ignore attribute changes (usually selection/cursor)
          if (mutation.type === 'attributes') {
            return false;
          }
          // Ignore changes to empty text nodes
          if (mutation.type === 'characterData' && (!mutation.target.textContent || mutation.target.textContent.trim() === '')) {
            return false;
          }
          return true;
        });
        
        if (hasRealChanges) {
          console.log('📝 Content changed - setting unsaved flag');
          setHasUnsavedChanges(true);
        }
      });

      // Observe ALL editor elements (all pages)
      editorElements.forEach((editorElement, index) => {
        console.log(`   📄 Observing page ${index + 1}`);
        observer.observe(editorElement, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
        });
      });

      currentObserver = observer;
      return observer;
    };

    // Try immediately
    setupObservers();
    
    // Retry if not found
    retryTimer = setTimeout(() => {
      setupObservers();
    }, 500);

    // Check every 2 seconds if new pages were added
    recheckInterval = setInterval(() => {
      const currentPageCount = document.querySelectorAll('.we-page-content .ProseMirror').length;
      if (currentPageCount !== lastPageCount) {
        console.log('📄 Page count changed:', lastPageCount, '→', currentPageCount, '- re-setting up observers');
        // Disconnect old observer
        if (currentObserver) {
          currentObserver.disconnect();
        }
        // Setup new observers for all pages
        setupObservers();
      }
    }, 2000);

    return () => {
      if (currentObserver) currentObserver.disconnect();
      if (retryTimer) clearTimeout(retryTimer);
      if (recheckInterval) clearInterval(recheckInterval);
    };
  }, [selectedLetter?.id]); // Only re-run when letter ID changes, not on metadata edits
  
  // Load letters when dialog opens
  useEffect(() => {
    if (opened && patientId) {
      loadLetters();
    } else if (!opened) {
      // Clear letters and selection when dialog closes to prevent stale data
      setLetters([]);
      setSelectedLetter(null);
    }
  }, [opened, patientId]);
  
  // Auto-focus editor when letter is selected
  useEffect(() => {
    if (!selectedLetter) return;
    
    // Small delay to ensure editor is mounted
    const timer = setTimeout(() => {
      const editorElement = document.querySelector('.we-page-content .ProseMirror') as HTMLElement;
      if (editorElement) {
        editorElement.focus();
        console.log('✅ Editor auto-focused');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [selectedLetter?.id]); // Only re-focus when letter ID changes, not on metadata edits
  
  const loadLetters = async () => {
    console.log('📂 Loading letters for patient:', patientId);
    setLoading(true);
    try {
      const response = await fetch(`https://localhost:8000/api/letters/?patient_id=${patientId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        const freshLetters = Array.isArray(data) ? data : (data.results || []);
        console.log('✅ Loaded letters:', freshLetters.length, freshLetters.map(l => l.id));
        setLetters(freshLetters);
        
        // If currently selected letter is not in the fresh list, clear selection
        if (selectedLetter) {
          const stillExists = freshLetters.some(l => l.id === selectedLetter.id);
          if (!stillExists) {
            console.warn('⚠️ Selected letter no longer exists, clearing selection');
            console.log('Selected letter ID:', selectedLetter.id);
            console.log('Fresh letters:', freshLetters.map(l => l.id));
            setSelectedLetter(null);
          }
        }
      } else {
        console.error('Failed to load letters:', response.status, response.statusText);
        notifications.show({
          title: 'Error',
          message: `Failed to load letters: ${response.status}`,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error loading letters:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load letters',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseDialog = () => {
    console.log('🚪 Closing dialog - unsaved changes:', hasUnsavedChanges);
    
    // Check for unsaved changes before closing
    if (hasUnsavedChanges && selectedLetter) {
      console.log('⚠️ Prompting to save unsaved changes');
      modals.openConfirmModal({
        title: 'Unsaved Changes',
        children: (
          <Text>
            You have unsaved changes. Do you want to save before closing?
          </Text>
        ),
        labels: { confirm: 'Save & Close', cancel: 'Discard Changes' },
        confirmProps: { color: 'blue' },
        cancelProps: { variant: 'subtle', color: 'red' },
        onConfirm: async () => {
          console.log('💾 Saving before close...');
          await handleSave();
          console.log('✅ Save complete, closing dialog');
          setHasUnsavedChanges(false);
          // Small delay to ensure save completes
          setTimeout(() => {
            onClose();
          }, 100);
        },
        onCancel: () => {
          console.log('🗑️ Discarding changes, closing dialog');
          setHasUnsavedChanges(false);
          onClose();
        },
      });
      return;
    }
    
    onClose();
  };
  
  const handleSelectLetter = (letter: PatientLetter) => {
    // Check for unsaved changes before switching letters
    if (hasUnsavedChanges && selectedLetter && selectedLetter.id !== letter.id) {
      modals.openConfirmModal({
        title: 'Unsaved Changes',
        children: (
          <Text>
            You have unsaved changes in the current letter. Do you want to save before switching?
          </Text>
        ),
        labels: { confirm: 'Save & Switch', cancel: 'Discard Changes' },
        confirmProps: { color: 'blue' },
        cancelProps: { variant: 'subtle' },
        onConfirm: async () => {
          await handleSave();
          setHasUnsavedChanges(false);
          setSelectedLetter(letter);
        },
        onCancel: () => {
          setHasUnsavedChanges(false);
          setSelectedLetter(letter);
        },
      });
      return;
    }
    
    setSelectedLetter(letter);
  };
  
  const handleCreateLetter = async () => {
    // Check for unsaved changes before creating new letter
    if (hasUnsavedChanges && selectedLetter) {
      modals.openConfirmModal({
        title: 'Unsaved Changes',
        children: (
          <Text>
            You have unsaved changes in the current letter. Do you want to save before creating a new letter?
          </Text>
        ),
        labels: { confirm: 'Save & Continue', cancel: 'Discard Changes' },
        confirmProps: { color: 'blue' },
        cancelProps: { variant: 'subtle' },
        onConfirm: async () => {
          await handleSave();
          createNewLetter();
        },
        onCancel: () => {
          setHasUnsavedChanges(false);
          createNewLetter();
        },
      });
      return;
    }
    
    createNewLetter();
  };
  
  const createNewLetter = async () => {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/letters/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          patient: patientId,
          letter_type: 'New Letter',
          recipient_name: '',
          subject: '',
          pages: ['<p>Dear [Name],</p><p></p><p>Write your letter here...</p><p></p><p>Sincerely,</p><p>Walk Easy Pedorthics</p>'],
        }),
      });
      
      if (response.ok) {
        const newLetter = await response.json();
        await loadLetters();
        setSelectedLetter(newLetter);
        dispatchLettersUpdated(); // Update badge count
        notifications.show({
          title: 'Success',
          message: 'New letter created',
          color: 'green',
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to create letter:', response.status, errorData);
        notifications.show({
          title: 'Error',
          message: `Failed to create letter: ${errorData.error || response.statusText}`,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error creating letter:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create letter',
        color: 'red',
      });
    }
  };
  
  const handleSave = async (silent = false) => {
    if (!selectedLetter) return;
    
    // Check if letter still exists in the current list (prevent saving deleted letters)
    const letterStillExists = letters.some(l => l.id === selectedLetter.id);
    if (!letterStillExists) {
      console.warn('⚠️ Cannot save: letter no longer in list, clearing selection');
      console.log('Selected letter ID:', selectedLetter.id);
      console.log('Current letters in list:', letters.map(l => l.id));
      setSelectedLetter(null);
      return;
    }
    
    console.log('💾 Saving letter:', selectedLetter.id, silent ? '(silent)' : '');
    setSaving(true);
    try {
      // Get current editor content from DOM (like your existing LetterEditor does)
      const editorElements = document.querySelectorAll('.we-page-content .ProseMirror');
      console.log('📝 Found', editorElements.length, 'editor elements');
      const pages = Array.from(editorElements).map((el, idx) => {
        const html = (el as HTMLElement).innerHTML || '';
        console.log(`📄 Page ${idx + 1} HTML (first 200 chars):`, html.substring(0, 200));
        return html;
      });
      
      const csrfToken = await getCsrfToken();
      const saveUrl = `https://localhost:8000/api/letters/${selectedLetter.id}/`;
      console.log('📡 PUT request to:', saveUrl);
      
      const payload = {
        patient: selectedLetter.patient,
        letter_type: selectedLetter.letter_type,
        recipient_name: selectedLetter.recipient_name,
        subject: selectedLetter.subject,
        pages,
      };
      console.log('📦 Payload:', payload);
      
      const response = await fetch(saveUrl, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const updated = await response.json();
        // Don't update selectedLetter - it causes infinite loop with useEffect
        // The editor already has the current content
        setLastSaved(new Date());
        setHasUnsavedChanges(false);  // Clear unsaved changes flag
        
        // Update original metadata to new saved values
        setOriginalMetadata({
          letter_type: updated.letter_type,
          recipient_name: updated.recipient_name,
          subject: updated.subject,
        });
        
        // Update the letter in the list without reloading everything
        setLetters(prev => prev.map(l => l.id === updated.id ? updated : l));
        
        if (!silent) {
          notifications.show({
            title: 'Success',
            message: 'Letter saved',
            color: 'green',
          });
        }
      } else if (response.status === 404) {
        // Letter was deleted or doesn't exist anymore
        console.warn('⚠️ Letter not found, clearing selection');
        setSelectedLetter(null);
        await loadLetters();
        if (!silent) {
          notifications.show({
            title: 'Error',
            message: 'Letter no longer exists. It may have been deleted.',
            color: 'orange',
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to save letter:', response.status, errorData);
        if (!silent) {
          notifications.show({
            title: 'Error',
            message: `Failed to save letter: ${errorData.error || response.statusText}`,
            color: 'red',
          });
        }
      }
    } catch (error) {
      console.error('Error saving letter:', error);
      if (!silent) {
        notifications.show({
          title: 'Error',
          message: 'Failed to save letter',
          color: 'red',
        });
      }
    } finally {
      setSaving(false);
    }
  };
  
  const handlePreviewPDF = async () => {
    if (!selectedLetter) {
      notifications.show({
        title: 'Error',
        message: 'No letter selected to preview',
        color: 'red',
      });
      return;
    }
    
    console.log('🔍 Preview PDF clicked for letter:', selectedLetter.id);
    setLoading(true);
    try {
      // Get current editor content from DOM (TipTap's ProseMirror structure)
      const editorElements = document.querySelectorAll('.we-page-content .ProseMirror');
      console.log('📄 Found editor elements:', editorElements.length);
      let combinedHTML: string;

      if (editorElements.length > 0) {
        const domContent = Array.from(editorElements).map(el => (el as HTMLElement).innerHTML || '');
        combinedHTML = domContent.join('<hr class="page-break">');
        console.log('✅ Using live editor content, pages:', domContent.length);
      } else {
        // Fallback to state if DOM query fails
        combinedHTML = selectedLetter.pages.join('<hr class="page-break">');
        console.log('⚠️ Using saved content, pages:', selectedLetter.pages.length);
        notifications.show({
          title: 'Warning',
          message: 'Could not get live editor content, using last saved version.',
          color: 'orange',
        });
      }

      console.log('🚀 Sending HTML to PDF API, length:', combinedHTML.length);
      const response = await fetch('https://localhost:3000/api/letters/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: combinedHTML }),
      });

      console.log('📡 API Response status:', response.status);
      if (response.ok) {
        const blob = await response.blob();
        console.log('✅ PDF blob received, size:', blob.size);
        const url = URL.createObjectURL(blob);
        console.log('🎉 Setting PDF URL for modal preview');
        setPdfMode('preview');
        setPdfUrl(url);
        setPdfPreviewOpen(true);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ PDF generation failed:', errorData);
        notifications.show({
          title: 'Error',
          message: `PDF generation failed: ${errorData.details || errorData.error}`,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      notifications.show({
        title: 'Error',
        message: 'Error generating PDF. Check console for details.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownloadPDF = async () => {
    if (!selectedLetter) {
      notifications.show({
        title: 'Error',
        message: 'No letter selected to download',
        color: 'red',
      });
      return;
    }
    
    console.log('💾 Download PDF clicked for letter:', selectedLetter.id);
    setLoading(true);
    try {
      // Get current editor content from DOM
      const editorElements = document.querySelectorAll('.we-page-content .ProseMirror');
      let combinedHTML: string;

      if (editorElements.length > 0) {
        const domContent = Array.from(editorElements).map(el => (el as HTMLElement).innerHTML || '');
        combinedHTML = domContent.join('<hr class="page-break">');
      } else {
        combinedHTML = selectedLetter.pages.join('<hr class="page-break">');
      }

      const response = await fetch('https://localhost:3000/api/letters/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: combinedHTML }),
      });

      if (response.ok) {
        const blob = await response.blob();
        
        // Generate filename: PatientName_LetterName.pdf
        const patientNameClean = patientName.replace(/[^a-z0-9]/gi, '_');
        const letterNameClean = (selectedLetter.subject || selectedLetter.letter_type || 'Letter').replace(/[^a-z0-9]/gi, '_');
        const filename = `${patientNameClean}_${letterNameClean}.pdf`;
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        notifications.show({
          title: 'Success',
          message: `PDF downloaded as ${filename}`,
          color: 'green',
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        notifications.show({
          title: 'Error',
          message: `PDF generation failed: ${errorData.details || errorData.error}`,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
      notifications.show({
        title: 'Error',
        message: 'Error downloading PDF',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrintPDF = async () => {
    if (!selectedLetter) {
      notifications.show({
        title: 'Error',
        message: 'No letter selected to print',
        color: 'red',
      });
      return;
    }
    
    console.log('🖨️ Print PDF clicked for letter:', selectedLetter.id);
    setLoading(true);
    
    try {
      // Get current editor content from DOM
      const editorElements = document.querySelectorAll('.we-page-content .ProseMirror');
      let combinedHTML: string;

      if (editorElements.length > 0) {
        const domContent = Array.from(editorElements).map(el => (el as HTMLElement).innerHTML || '');
        combinedHTML = domContent.join('<hr class="page-break">');
      } else {
        combinedHTML = selectedLetter.pages.join('<hr class="page-break">');
      }

      // Generate PDF
      const response = await fetch('https://localhost:3000/api/letters/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: combinedHTML }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Show preview in modal
      setPdfMode('print');
      setPdfUrl(url);
      setPdfPreviewOpen(true);

      // Safari: Open PDF in new tab for printing
      if (isSafari()) {
        console.log('🍎 Safari detected - opening PDF in new tab');
        const win = window.open(url, '_blank');
        
        if (!win) {
          console.warn('⚠️ Safari blocked window.open - user will print from modal');
          notifications.show({
            title: 'Print Instructions',
            message: 'Press ⌘+P (or Ctrl+P) to print the PDF from the preview.',
            color: 'blue',
          });
        }
        
        setLoading(false);
        return;
      }

      // Non-Safari: Hidden iframe printing
      console.log('🖨️ Non-Safari - using hidden iframe print method');
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;

      iframe.onload = () => {
        try {
          console.log('✅ PDF loaded in iframe, triggering print');
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error('❌ Error printing iframe:', err);
          notifications.show({
            title: 'Print Error',
            message: 'Could not trigger print. Please use the Print button in the preview.',
            color: 'orange',
          });
        } finally {
          // Clean up after print dialog closes
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            URL.revokeObjectURL(url);
          }, 1000);
        }
      };

      document.body.appendChild(iframe);
      setLoading(false);
      
    } catch (error) {
      console.error('❌ Error printing PDF:', error);
      notifications.show({
        title: 'Error',
        message: 'Error printing PDF',
        color: 'red',
      });
      setLoading(false);
    }
  };
  
  const handleDelete = async (letterId: string) => {
    modals.openConfirmModal({
      title: 'Delete Letter',
      children: <Text>Are you sure you want to delete this letter? This action cannot be undone.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        setLoading(true);
        try {
          const csrfToken = await getCsrfToken();
          const response = await fetch(`https://localhost:8000/api/letters/${letterId}/`, {
            method: 'DELETE',
            headers: {
              'X-CSRFToken': csrfToken,
            },
            credentials: 'include',
          });
          
          if (response.ok || response.status === 404) {
            // Clear selection FIRST to stop auto-save immediately
            if (selectedLetter?.id === letterId) {
              setSelectedLetter(null);
            }
            
            // Then remove from UI
            setLetters(prev => prev.filter(l => l.id !== letterId));
            
            // Then refresh list from server to ensure consistency
            await loadLetters();
            
            dispatchLettersUpdated(); // Update badge count
            
            if (response.ok) {
              notifications.show({
                title: 'Success',
                message: 'Letter deleted',
                color: 'green',
              });
            } else {
              // 404 - already deleted
              console.warn('⚠️ Letter already deleted, removed from UI');
              notifications.show({
                title: 'Info',
                message: 'Letter was already deleted',
                color: 'blue',
              });
            }
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Failed to delete letter:', response.status, errorData);
            notifications.show({
              title: 'Error',
              message: `Failed to delete letter: ${errorData.error || response.statusText}`,
              color: 'red',
            });
          }
        } catch (error) {
          console.error('Error deleting letter:', error);
          notifications.show({
            title: 'Error',
            message: 'Failed to delete letter',
            color: 'red',
          });
        } finally {
          setLoading(false);
        }
      },
    });
  };
  
  const handleDuplicate = async (letterId: string) => {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/letters/${letterId}/duplicate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        await loadLetters();
        notifications.show({
          title: 'Success',
          message: 'Letter duplicated',
          color: 'green',
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to duplicate letter:', response.status, errorData);
        notifications.show({
          title: 'Error',
          message: `Failed to duplicate letter: ${errorData.error || response.statusText}`,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error duplicating letter:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to duplicate letter',
        color: 'red',
      });
    }
  };
  
  const filteredLetters = letters.filter(letter =>
    letter.letter_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    letter.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    letter.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <>
    <Modal
      opened={opened}
      onClose={handleCloseDialog}
      title={
        <Group gap="xs">
          <IconFileText size={24} />
          <Text fw={600}>Letters - {patientName}</Text>
          <Badge color="blue">{letters.length} {letters.length === 1 ? 'letter' : 'letters'}</Badge>
        </Group>
      }
      size="95vw"
      styles={{
        body: { height: 'calc(90vh - 60px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
        content: { height: '90vh' },
      }}
    >
      {/* Main Container - Flex Row */}
      <Box style={{ 
        flex: 1, 
        minHeight: 0, 
        display: 'flex', 
        flexDirection: 'row',
        gap: '16px',
      }}>
        {/* Left Panel (20%): Letter List */}
        <Box style={{ 
          width: '20%', 
          minWidth: '250px',
          height: '100%',
          display: 'flex', 
          flexDirection: 'column',
        }}>
          <Stack gap="md" style={{ height: '100%' }}>
            {/* New Letter Button */}
            <Button
              fullWidth
              leftSection={<IconPlus size={18} />}
              onClick={handleCreateLetter}
              color="blue"
            >
              New Letter
            </Button>
            
            {/* Search */}
            <TextInput
              placeholder="Search letters..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
            />
            
            {/* Letter List */}
            <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto">
                {loading ? (
                  <Stack align="center" justify="center" style={{ height: 200 }}>
                    <Loader size="md" />
                    <Text c="dimmed" size="sm">Loading letters...</Text>
                  </Stack>
                ) : filteredLetters.length === 0 ? (
                  <Stack align="center" justify="center" style={{ height: 200 }}>
                    <IconFileText size={48} style={{ opacity: 0.2 }} />
                    <Text c="dimmed" size="sm">No letters yet</Text>
                    <Text c="dimmed" size="xs">Click "New Letter" to create one</Text>
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    {filteredLetters.map((letter) => (
                      <Box
                        key={letter.id}
                        p="sm"
                        style={{
                          border: `1px solid ${selectedLetter?.id === letter.id ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-default-border)'}`,
                          borderRadius: 'var(--mantine-radius-md)',
                          cursor: 'pointer',
                          backgroundColor: selectedLetter?.id === letter.id ? 'var(--mantine-color-blue-light)' : 'transparent',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => handleSelectLetter(letter)}
                      >
                        <Group justify="space-between" mb="xs">
                          <Text fw={600} size="sm" style={{ flex: 1 }} truncate>
                            {letter.letter_type}
                          </Text>
                          <Menu shadow="md" width={200}>
                            <Menu.Target>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicate(letter.id);
                                }}
                              >
                                Duplicate
                              </Menu.Item>
                              <Menu.Item
                                color="red"
                                leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(letter.id);
                                }}
                              >
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                        {letter.recipient_name && (
                          <Text size="xs" c="dimmed" mb={4}>
                            To: {letter.recipient_name}
                          </Text>
                        )}
                        <Text size="xs" c="dimmed" mb={4}>
                          {new Date(letter.updated_at).toLocaleDateString()} {new Date(letter.updated_at).toLocaleTimeString()}
                        </Text>
                        {letter.preview_text && (
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {letter.preview_text}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </ScrollArea>
            </Stack>
          </Box>
          
          {/* Right Panel (80%): Letter Editor */}
          <Box style={{ 
            flex: 1,
            height: '100%',
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {!selectedLetter ? (
              <Stack align="center" justify="center" style={{ height: '100%' }}>
                <IconFileText size={64} style={{ opacity: 0.2 }} />
                <Text c="dimmed" size="lg">Select a letter to view</Text>
                <Text c="dimmed" size="sm">Click any letter from the list on the left</Text>
              </Stack>
            ) : (
              <Box style={{ 
                height: '100%',
                overflow: 'auto',
                display: 'flex', 
                flexDirection: 'column',
              }}>
                {/* Metadata + Toolbar Section - Scrolls away together */}
                <Box p="md" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', flexShrink: 0 }}>
                  <Grid>
                    <Grid.Col span={6}>
                      <TextInput
                        label="Letter Type"
                        placeholder="e.g., Support Letter, Follow-up Letter"
                        value={selectedLetter.letter_type}
                        onChange={(e) => setSelectedLetter({ ...selectedLetter, letter_type: e.currentTarget.value })}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput
                        label="Recipient"
                        placeholder="e.g., Dr. John Smith"
                        value={selectedLetter.recipient_name}
                        onChange={(e) => setSelectedLetter({ ...selectedLetter, recipient_name: e.currentTarget.value })}
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <TextInput
                        label="Name"
                        placeholder="e.g., Support Letter for NDIS"
                        value={selectedLetter.subject}
                        onChange={(e) => setSelectedLetter({ ...selectedLetter, subject: e.currentTarget.value })}
                      />
                    </Grid.Col>
                  </Grid>
                  
                  {/* Action Buttons - Inside metadata box so they scroll away together */}
                  <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                    <Group gap="xs">
                      {saving && <Loader size="xs" />}
                      {lastSaved && !saving && (
                        <Text size="xs" c="dimmed">
                          Saved at {lastSaved.toLocaleTimeString()}
                        </Text>
                      )}
                    </Group>
                    <Group gap="xs">
                      <Button size="xs" variant="light" onClick={() => handleSave(false)} loading={saving}>
                        Save
                      </Button>
                      <Button size="xs" variant="light" leftSection={<IconFileTypePdf size={14} />} onClick={handlePreviewPDF} loading={loading}>
                        Preview PDF
                      </Button>
                      <Button size="xs" variant="light" leftSection={<IconDownload size={14} />} onClick={handleDownloadPDF} loading={loading}>
                        Download
                      </Button>
                      <Button size="xs" variant="light" leftSection={<IconMail size={14} />}>
                        Email
                      </Button>
                      <Button size="xs" variant="light" leftSection={<IconPrinter size={14} />} onClick={handlePrintPDF} loading={loading}>
                        Print
                      </Button>
                    </Group>
                  </Group>
                </Box>
                
                {/* Letter Editor - Scrolls normally */}
                <Box style={{ flex: 1, minHeight: 0 }}>
                  <div
                    style={{
                      colorScheme: 'light',
                      color: '#000000',
                      '--mantine-color-text': '#000000',
                    } as React.CSSProperties}
                    data-mantine-color-scheme="light"
                    data-force-light-mode="true"
                  >
                    <LetterEditor initialPages={selectedLetter.pages} isDialog={true} />
                  </div>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
    </Modal>
    
    {/* PDF Preview/Print Modal */}
    <Modal
      opened={pdfPreviewOpen}
      onClose={() => {
        setPdfPreviewOpen(false);
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
          setPdfUrl(null);
        }
        setPdfMode('preview'); // Reset to preview mode
      }}
      title={pdfMode === 'print' ? 'Print Letter' : 'PDF Preview'}
      size="90vw"
      styles={{
        body: { height: '85vh', overflow: 'hidden' },
        content: { height: '90vh' },
      }}
    >
      {pdfUrl && (
        <>
          {pdfMode === 'print' && (
            <Group justify="space-between" mb="md">
              {isSafari() ? (
                <Text size="sm" c="dimmed">
                  Press <strong>⌘+P</strong> (or <strong>Ctrl+P</strong>) to print the PDF, or use the button below.
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  The print dialog should open automatically. If it doesn't, click the Print button below.
                </Text>
              )}
              <Button 
                leftSection={<IconPrinter size={16} />}
                onClick={() => {
                  // For Safari, try to print the iframe
                  const iframe = document.querySelector('iframe[title="PDF Preview"]') as HTMLIFrameElement;
                  if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.print();
                  } else {
                    window.print();
                  }
                }}
              >
                Print
              </Button>
            </Group>
          )}
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: pdfMode === 'print' ? 'calc(100% - 60px)' : '100%',
              border: 'none',
            }}
            title="PDF Preview"
          />
        </>
      )}
    </Modal>
    </>
  );
}

