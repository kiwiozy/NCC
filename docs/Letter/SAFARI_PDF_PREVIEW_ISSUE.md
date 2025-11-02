# Safari PDF Preview Issue

## Problem

We have a React/Next.js application with a letter composer that generates PDFs using Puppeteer on the backend. We're trying to show a PDF preview in a Mantine Modal dialog using an iframe, but **Safari is not rendering the PDF properly** - it just shows a blank white page.

Chrome works perfectly and shows the full PDF with native controls (page navigation, zoom, etc.), but Safari does not.

## Current Implementation

### Frontend Code (LetterEditor.tsx)

```typescript
const handlePreviewPDF = async () => {
  setPdfLoading(true);
  
  const combinedHTML = pages.map(pageHTML => pageHTML).join('<hr class="page-break">');
  
  try {
    const response = await fetch('/api/letters/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: combinedHTML }),
    });

    if (response.ok) {
      const blob = await response.blob();
      
      // Convert blob to base64 data URL for better Safari compatibility
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setPdfUrl(base64data);
        setModalOpen(true);
      };
      reader.readAsDataURL(blob);
    } else {
      const errorData = await response.json();
      console.error('PDF generation failed:', errorData);
      alert(`PDF generation failed: ${errorData.details || errorData.error}`);
    }
  } catch (error) {
    console.error('Error calling PDF API:', error);
    alert('Error generating PDF. Check console for details.');
  } finally {
    setPdfLoading(false);
  }
};

const handleCloseModal = () => {
  setModalOpen(false);
  setPdfUrl(null);
};
```

### Modal JSX

```tsx
<Modal
  opened={modalOpen}
  onClose={handleCloseModal}
  title="Letter Preview"
  size="xl"
  padding="md"
>
  {pdfUrl && (
    <iframe
      src={pdfUrl}
      style={{
        width: '100%',
        height: '80vh',
        border: 'none',
      }}
      title="PDF Preview"
    />
  )}
</Modal>
```

## What We've Tried

1. **Blob URLs (`blob:...`)** - Worked in Chrome but not Safari
2. **Base64 Data URLs (`data:application/pdf;base64,...`)** - Still not working in Safari
3. **Opening in new tab with `window.open()`** - Works but bad UX (user doesn't want new tabs)

## Requirements

- ✅ Must work in **both Safari and Chrome**
- ✅ Must be a **modal/dialog** (no new tabs/windows)
- ✅ Must show **native PDF controls** (page navigation, zoom, download, etc.)
- ✅ Must be **clean UX** (no disruptive popups)

## Previous Working Implementation

The user mentioned this was working in old code. Here's what we found from git history (commit 648c807):

```typescript
// This was the "good" implementation that worked before
const handlePreviewPDF = async () => {
  if (!editor) return;
  
  setPdfLoading(true);
  const html = editor.getHTML();
  
  try {
    const response = await fetch('/api/letters/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setModalOpen(true);
    }
  } catch (error) {
    console.error('Error calling PDF API:', error);
    alert('Error generating PDF. Check console for details.');
  } finally {
    setPdfLoading(false);
  }
};

// Same modal structure with iframe
<Modal opened={modalOpen} onClose={handleCloseModal} title="Letter Preview" size="xl" padding="md">
  {pdfUrl && (
    <iframe
      src={pdfUrl}
      style={{ width: '100%', height: '80vh', border: 'none' }}
      title="PDF Preview"
    />
  )}
</Modal>
```

**Note:** The user says this worked before, but we're experiencing the same Safari blank page issue now.

## Backend Details

- Using **Puppeteer** to generate PDFs
- API returns PDF as binary blob with `Content-Type: application/pdf`
- PDF generation works correctly (downloads work fine in Safari)

## Questions for ChatGPT

1. **Why does Safari show a blank page when displaying PDFs in iframes?** Is this a known Safari limitation?

2. **What's the most reliable way to display a PDF preview in a modal dialog that works in both Safari and Chrome?** We need native PDF controls (page navigation, zoom, etc.).

3. **If Safari has fundamental limitations with PDF iframes, what are the alternative approaches?** Should we:
   - Use a PDF.js viewer library?
   - Use an `<object>` or `<embed>` tag instead of `<iframe>`?
   - Try a different modal/overlay approach?
   - Something else?

4. **The user says this exact approach worked in "old code" - what could have changed?** Could this be:
   - Safari version updates?
   - Browser security policy changes?
   - Mantine Modal changes?
   - Something in our implementation?

5. **Is there a way to detect if the iframe loaded successfully** so we can fall back to a download or new tab if needed?

## Ideal Solution

We want a **single implementation** that:
- Shows PDF in a modal dialog
- Works reliably in Safari, Chrome, and other browsers
- Shows native PDF viewer controls
- Has good UX (no popups, no new tabs)
- Is maintainable and future-proof

**What do you recommend?**

