# Invoice & Quote Print Viewer - Implementation Plan

## Overview
Add print dialog and PDF viewer for invoices and quotes, similar to the Letters feature.

## Requirements
1. **Print Button** on Patient Accounts page (invoices/quotes table)
2. **Print Button** on Accounts | Quotes page (main invoice listing)
3. **PDF Viewer Modal** with iframe preview
4. **Safari-compatible** print dialog
5. **Auto-trigger print** on Chrome/Firefox/Edge

## Technical Approach (Based on Letters Implementation)

### 1. Browser Detection
- Use existing `frontend/app/utils/isSafari.ts`
- Detect Safari vs Chromium-based browsers

### 2. Print Strategies

#### Safari (macOS/iOS):
1. Generate/fetch PDF
2. Create blob URL
3. Show preview in modal
4. Open PDF in new tab (`window.open(url, '_blank')`)
5. User prints from new tab using ⌘+P or browser menu

#### Chrome/Firefox/Edge:
1. Generate/fetch PDF
2. Create blob URL
3. Show preview in modal
4. Create hidden iframe with PDF
5. When iframe loads, call `iframe.contentWindow.print()`
6. Auto-trigger print dialog
7. Cleanup after 1 second

### 3. Components to Update

#### A. `frontend/app/components/xero/PatientInvoicesQuotes.tsx`
**Changes:**
- Add `IconPrinter` import
- Add print button to action group (next to Email, Download, View)
- Add state: `printModalOpened`, `printPdfUrl`, `printItemType`
- Add handler: `handlePrintClick(item, type: 'invoice' | 'quote')`
- Add `PrintInvoiceModal` component

#### B. `frontend/app/patients/[id]/accounts-quotes/page.tsx`
**Changes:**
- Same as above (if different from PatientInvoicesQuotes)
- Add print button to the page component

#### C. Create New Component: `frontend/app/components/xero/PrintInvoiceModal.tsx`
**Features:**
- Modal with iframe PDF viewer
- Print button
- Safari vs Chrome detection
- Auto-trigger print on non-Safari
- Instructions for Safari users

### 4. API Endpoints (Already Exist)
- GET `/api/xero-invoice-links/{id}/pdf/` - Generate invoice PDF
- GET `/api/xero-quote-links/{id}/pdf/` - Generate quote PDF

### 5. Implementation Steps

**Step 1: Create PrintInvoiceModal Component**
```typescript
interface PrintInvoiceModalProps {
  opened: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  title: string; // "Invoice #123" or "Quote #456"
  type: 'invoice' | 'quote';
}
```

Features:
- iframe with PDF preview
- Print button (visible in Safari, optional in Chrome)
- Auto-trigger print in Chrome/Firefox/Edge
- Instructions for Safari users
- Loading state while PDF generates

**Step 2: Add Print Button to PatientInvoicesQuotes**
- Add print icon to action group
- Fetch PDF when print clicked
- Open print modal
- Handle Safari vs Chrome differently

**Step 3: Add Print Button to Accounts | Quotes Page**
- Same as above

**Step 4: Testing**
- Test on Safari (macOS)
- Test on Chrome
- Test on Firefox
- Test on Edge
- Test pop-up blocker scenarios

## User Flow

### Chrome/Firefox/Edge:
1. User clicks "Print" icon next to invoice/quote
2. Modal opens with PDF preview
3. Print dialog auto-appears
4. User selects printer and prints
5. Done! ✅

### Safari:
1. User clicks "Print" icon next to invoice/quote
2. Modal opens with PDF preview
3. New tab opens with PDF
4. User presses ⌘+P or uses browser menu
5. Prints from native Safari PDF viewer
6. Done! ✅

## Code Structure

### PrintInvoiceModal.tsx (New File)
```typescript
'use client';

import { Modal, Button, Group, Text } from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';
import { isSafari } from '../../utils/isSafari';
import { useEffect } from 'react';

interface PrintInvoiceModalProps {
  opened: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  title: string;
  type: 'invoice' | 'quote';
}

export default function PrintInvoiceModal({ opened, onClose, pdfUrl, title, type }: PrintInvoiceModalProps) {
  
  // Auto-trigger print on non-Safari
  useEffect(() => {
    if (opened && pdfUrl && !isSafari()) {
      // Wait for iframe to load
      setTimeout(() => {
        const iframe = document.querySelector('iframe[title="PDF Print Preview"]') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.print();
        }
      }, 500);
    }
  }, [opened, pdfUrl]);
  
  const handlePrint = () => {
    if (isSafari()) {
      // Safari: Open in new tab
      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
      }
    } else {
      // Chrome/Firefox/Edge: Print from iframe
      const iframe = document.querySelector('iframe[title="PDF Print Preview"]') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.print();
      } else {
        window.print();
      }
    }
  };
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Print ${title}`}
      size="xl"
      styles={{
        content: { height: '90vh' },
      }}
    >
      {pdfUrl && (
        <>
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
              onClick={handlePrint}
            >
              Print
            </Button>
          </Group>
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: 'calc(100% - 60px)',
              border: 'none',
            }}
            title="PDF Print Preview"
          />
        </>
      )}
    </Modal>
  );
}
```

### Update PatientInvoicesQuotes.tsx
```typescript
// Add imports
import { IconPrinter } from '@tabler/icons-react';
import PrintInvoiceModal from './PrintInvoiceModal';

// Add state
const [printModalOpened, setPrintModalOpened] = useState(false);
const [printPdfUrl, setPrintPdfUrl] = useState<string | null>(null);
const [printTitle, setPrintTitle] = useState('');
const [printType, setPrintType] = useState<'invoice' | 'quote'>('invoice');

// Add handler
const handlePrintClick = async (item: CombinedItem) => {
  try {
    const isInvoice = item.type === 'invoice';
    const endpoint = isInvoice 
      ? `https://localhost:8000/api/xero-invoice-links/${item.id}/pdf/`
      : `https://localhost:8000/api/xero-quote-links/${item.id}/pdf/`;
    
    const response = await fetch(endpoint, {
      credentials: 'include',
    });
    
    if (!response.ok) throw new Error('Failed to generate PDF');
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    setPrintPdfUrl(url);
    setPrintTitle(`${isInvoice ? 'Invoice' : 'Quote'} #${item.number}`);
    setPrintType(isInvoice ? 'invoice' : 'quote');
    setPrintModalOpened(true);
  } catch (error) {
    console.error('Error generating PDF for print:', error);
    notifications.show({
      title: 'Error',
      message: 'Failed to generate PDF for printing',
      color: 'red',
    });
  }
};

// Add print button to action group
<Tooltip label={`Print ${item.type === 'invoice' ? 'Invoice' : 'Quote'}`}>
  <ActionIcon
    variant="subtle"
    color="gray"
    onClick={() => handlePrintClick(item)}
  >
    <IconPrinter size={16} />
  </ActionIcon>
</Tooltip>

// Add modal at bottom
<PrintInvoiceModal
  opened={printModalOpened}
  onClose={() => {
    setPrintModalOpened(false);
    if (printPdfUrl) {
      URL.revokeObjectURL(printPdfUrl);
      setPrintPdfUrl(null);
    }
  }}
  pdfUrl={printPdfUrl}
  title={printTitle}
  type={printType}
/>
```

## Benefits
- ✅ Same UX as Letters (consistent)
- ✅ Safari-compatible
- ✅ Auto-trigger print on Chrome/Firefox/Edge
- ✅ Preview before printing
- ✅ No pop-up blockers (all in click handler)
- ✅ Clean, reusable component

## Testing Checklist
- [ ] Print invoice on Safari
- [ ] Print quote on Safari
- [ ] Print invoice on Chrome
- [ ] Print quote on Chrome
- [ ] Print invoice on Firefox
- [ ] Print quote on Firefox
- [ ] Test pop-up blocker on Safari
- [ ] Test with different invoice statuses
- [ ] Test with different quote statuses
- [ ] Test cleanup (blob URLs revoked)

## Next Steps
1. Create `PrintInvoiceModal.tsx`
2. Update `PatientInvoicesQuotes.tsx`
3. Update `frontend/app/patients/[id]/accounts-quotes/page.tsx` (if needed)
4. Test on all browsers
5. Commit and push to git

