# Safari PDF Preview Issue

## Problem

We have a React/Next.js application with a letter composer that generates PDFs using Puppeteer on the backend. We're trying to show a PDF preview in a Mantine Modal dialog using an iframe, but **Safari is not rendering the PDF properly**.

### Visual Comparison:

**Chrome (Working) - Shows native PDF viewer:**
![Chrome PDF Preview](images/chrome-pdf-preview.png)
- ✅ Full PDF viewer UI
- ✅ Page navigation (1/2)
- ✅ Zoom controls
- ✅ Download button
- ✅ Print button
- ✅ Proper PDF rendering with letterhead

**Safari (Not Working) - Shows plain text or blank:**
![Safari PDF Preview](images/safari-pdf-preview.png)
- ❌ No PDF viewer UI
- ❌ Just plain text content (or blank white page)
- ❌ No controls
- ❌ No letterhead
- ❌ Looks like raw HTML, not a rendered PDF

**What we need:** Safari to display the **same native PDF viewer** that Chrome shows, with all the controls.

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

## What We've Tried Based on Your Previous Advice

We implemented your recommended solution:

1. ✅ **Backend serves real URL** - POST returns `{ pdfId, pdfUrl }`, GET `/api/letters/pdf-preview/[id]` serves the PDF
2. ✅ **Proper headers** - `Content-Type: application/pdf` and `Content-Disposition: inline`
3. ✅ **Open modal first** - Using `setModalOpen(true)` then `requestAnimationFrame(() => setPdfUrl(url))`
4. ✅ **Real HTTP URL** - No blob or data URLs
5. ✅ **Conditional rendering** - Show loading state until PDF URL is set

**Result:** Still shows plain text in Safari instead of native PDF viewer! 😞

The PDF file itself is valid (downloads work fine). Chrome displays it perfectly in the iframe. But Safari just renders it as plain text or shows nothing.

## Questions for ChatGPT

1. **Why is Safari showing plain text instead of the native PDF viewer?** The PDF is valid, headers are correct, URL is real - what's missing?

2. **Does Safari need something specific to trigger the native PDF viewer in iframes?** Is there a special header, attribute, or technique?

3. **Should we use `<embed>` or `<object>` instead of `<iframe>` for Safari?** Would that make a difference?

4. **Is there a Safari-specific CSS or attribute we need?** Something like `type="application/pdf"` on the iframe?

5. **Could this be a Mantine Modal issue?** Does the modal's DOM structure prevent Safari from loading the PDF viewer?

6. **Should we use PDF.js as a universal solution?** Would that give consistent rendering across browsers?

7. **Is there a way to force Safari to use its native PDF viewer?** Any Safari-specific tricks or workarounds?

## Ideal Solution

We want a **single implementation** that:
- Shows PDF in a modal dialog
- Works reliably in Safari, Chrome, and other browsers
- Shows native PDF viewer controls
- Has good UX (no popups, no new tabs)
- Is maintainable and future-proof

**What do you recommend?**

