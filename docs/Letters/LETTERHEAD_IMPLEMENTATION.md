# Letterhead Implementation in pdfmake

## Overview

The Walk Easy Pedorthics letterhead has been successfully integrated into the `pdfmake` PDF generation system.

## Implementation Date

November 1, 2025

---

## What Was Done

### 1. Image Asset Setup

- **Source:** `docs/Letters/Walk-Easy_Letterhead-Pad-Final.png`
- **Destination:** `frontend/public/images/Walk-Easy_Letterhead-Pad-Final.png`
- The letterhead image is now accessible via `/images/Walk-Easy_Letterhead-Pad-Final.png`

### 2. PDF Utility Updates (`frontend/app/utils/pdfmaker.ts`)

#### Added Helper Functions

```typescript
/**
 * Convert an image URL to base64 data URL
 */
async function imageToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Create background definition for letterhead
 */
function createLetterheadBackground(letterheadDataUrl: string) {
  return function(currentPage: number, pageSize: any) {
    return {
      image: letterheadDataUrl,
      width: pageSize.width,
      height: pageSize.height,
      absolutePosition: { x: 0, y: 0 },
    };
  };
}
```

#### Updated All PDF Generation Functions

All three functions now:
1. Load the letterhead image from `/images/Walk-Easy_Letterhead-Pad-Final.png`
2. Convert it to base64
3. Apply it as a background to all pages

**Functions updated:**
- `generateLetterPDF()` - Download PDF
- `openLetterPDF()` - Open in new tab
- `printLetterPDF()` - Print directly

All functions are now **async** and return `Promise<void>`.

### 3. Letter Composer Updates

Updated `handleGeneratePDF` in `LetterComposer.tsx` to handle async PDF generation:

```typescript
const handleGeneratePDF = async () => {
  if (!editor) return;
  
  const html = editor.getHTML();
  const filename = `${subject || 'letter'}.pdf`;
  
  try {
    await generateLetterPDF(html, filename); // Now async
    notifications.show({
      title: 'Success',
      message: 'PDF downloaded successfully',
      color: 'green',
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    notifications.show({
      title: 'Error',
      message: 'Failed to generate PDF',
      color: 'red',
    });
  }
};
```

---

## How It Works

### Background Application

The letterhead is applied using pdfmake's `background` property:

```typescript
const docDefinition = {
  content: [...], // Letter content
  background: createLetterheadBackground(letterheadDataUrl),
  pageMargins: [105, 190, 105, 140], // Respects letterhead zones
};
```

### Coordinate System

- **Full page dimensions:** 595 x 842 points (A4)
- **Top margin:** 190pt (letterhead header area)
- **Bottom margin:** 140pt (letterhead footer area)
- **Left/Right margins:** 105pt each

The background image is positioned at `(0, 0)` and scaled to fill the entire page, ensuring the letterhead appears on every page of multi-page letters.

---

## Expected Result

When a user generates a PDF, they will now see:

✅ **Page 1 (First Page):**
- Walk Easy Pedorthics logo (top-left)
- Contact information (top-right):
  - Address: 43 Harrison St, Cardiff, NSW 2285
  - Phone: 02 6766 3153
  - Email: info@walkeasy.com.au
- Decorative border elements (left and right sides)
- QR code and website in footer

✅ **Page 2+ (Subsequent Pages):**
- Same letterhead on all pages
- Content flows naturally around the header/footer zones
- Margins prevent text from overlapping letterhead elements

---

## Technical Details

### Why Base64 Conversion?

pdfmake requires images to be provided as:
1. Data URLs (base64-encoded)
2. Remote URLs with CORS enabled
3. Pre-loaded in the virtual file system

We chose **base64 data URLs** because:
- ✅ Works offline
- ✅ No CORS issues
- ✅ Self-contained PDFs
- ✅ Consistent rendering

### Performance Considerations

- The letterhead image is loaded **once per PDF generation**
- Base64 conversion happens client-side
- The image is embedded in the PDF, not referenced externally
- File size impact: ~215KB per PDF (letterhead image size)

### Font Compatibility Fix

pdfmake only supports specific fonts (Roboto, Times, Courier, Helvetica). The editor uses system fonts like `-apple-system` and `SF Pro` which are not supported by pdfmake. 

**Solution:** We clean the HTML before conversion by replacing unsupported fonts:

```typescript
const cleanedHtml = html
  .replace(/font-family:\s*-apple-system[^;"]*/gi, 'font-family: Roboto')
  .replace(/font-family:\s*BlinkMacSystemFont[^;"]*/gi, 'font-family: Roboto')
  .replace(/font-family:\s*"SF Pro[^"]*"/gi, 'font-family: Roboto')
  .replace(/font-family:\s*system-ui[^;"]*/gi, 'font-family: Roboto');
```

This ensures all text renders correctly in the PDF without font errors.

---

## Testing

To test the letterhead implementation:

1. Navigate to: `http://localhost:3000/settings?tab=letters`
2. Type some content in the Letter Composer
3. Click **"Download PDF"**
4. Open the downloaded PDF

**Expected:**
- The letterhead should appear on all pages
- Content should not overlap the header/footer areas
- The layout should match the editor's visual appearance

---

## Future Enhancements

### Potential improvements (not yet implemented):

1. **First-page vs. subsequent-page letterheads**
   - Different header for page 1 vs. pages 2+
   - Requires conditional background function

2. **Letterhead templates**
   - Allow users to select different letterhead designs
   - Store in database/file system

3. **Dynamic letterhead elements**
   - Populate fields (address, phone) from user settings
   - Render letterhead from SVG for better quality

4. **Letterhead preview**
   - Show letterhead in the TipTap editor background
   - Match PDF appearance exactly

---

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/app/utils/pdfmaker.ts` | Modified | Added letterhead support |
| `frontend/app/components/settings/LetterComposer.tsx` | Modified | Made PDF generation async |
| `frontend/public/images/Walk-Easy_Letterhead-Pad-Final.png` | Added | Letterhead asset |

---

## Summary

✅ Letterhead integration complete  
✅ Applied to all PDF generation methods  
✅ Works on all pages (multi-page support)  
✅ Respects content margins  
✅ No linting errors  
✅ Ready for testing

