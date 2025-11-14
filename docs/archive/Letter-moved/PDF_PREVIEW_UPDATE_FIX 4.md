# PDF Preview Update Fix - DOM Query Solution

**Date:** 2025-11-03  
**Status:** ✅ Fixed and Working  
**Commit:** `44392a9`

---

## Problem

The PDF preview modal was not showing updated content when users edited text in the letter editor. Even though users would:
1. Type new text in the editor
2. Click "Preview PDF"
3. Make more changes
4. Click "Preview PDF" again

The preview would still show the **old content** from the first preview, not the latest changes.

---

## Root Cause

### React State Update Batching

React batches state updates for performance. When a user types in TipTap:
1. TipTap updates the DOM immediately (for visual feedback)
2. TipTap calls `onUpdate` handler
3. Handler calls `onContentChange(editor.getHTML())`
4. This updates React state via `setPages()`
5. **BUT** React batches this state update - it doesn't happen synchronously

When the user clicks "Preview PDF":
- We read from `pages` state: `pages.map(pageHTML => pageHTML)`
- **The state might not have updated yet** from the last keystroke
- We generate a PDF with stale content
- Even with cache-busting, the PDF is generated with old content

### Why Cache-Busting Didn't Help

We had cache-busting parameters (`?t=${timestamp}&r=${random}`), but they only prevent the **browser** from caching the PDF file. They don't help if we're generating the PDF with **old content** from stale React state.

---

## Solution: Query DOM Directly

Instead of relying on React state (which may be stale), we now query the **DOM directly** to get the latest content.

### Why DOM Works

1. **TipTap updates DOM immediately** - When users type, TipTap updates the DOM in real-time for instant visual feedback
2. **DOM is always up-to-date** - The DOM reflects what the user sees on screen
3. **No async batching** - DOM reads are synchronous and guaranteed to have latest content

### Implementation

```typescript
const handlePreviewPDF = async () => {
  setPdfLoading(true);
  
  // CRITICAL: Clear PDF URL and key FIRST to force unmount
  setPdfUrl(null);
  setPdfKey('');
  
  // CRITICAL: Get content directly from DOM (TipTap's ProseMirror structure)
  // This ensures we ALWAYS have the latest content, even if React state hasn't updated yet
  // The DOM is the source of truth, not React state
  const editorElements = document.querySelectorAll('.we-page-content .ProseMirror');
  let combinedHTML: string;
  
  if (editorElements.length > 0) {
    // Get HTML directly from DOM - this is the most reliable method
    const domContent = Array.from(editorElements).map(el => {
      const html = (el as HTMLElement).innerHTML || '';
      console.log('Got HTML from DOM:', html.substring(0, 50) + '...');
      return html;
    });
    combinedHTML = domContent.join('<hr class="page-break">');
    console.log('✅ Using DOM content directly, length:', combinedHTML.length);
  } else {
    // Fallback to state if DOM query fails
    await new Promise(resolve => setTimeout(resolve, 100));
    combinedHTML = pages.map(pageHTML => pageHTML).join('<hr class="page-break">');
    console.warn('⚠️ DOM query failed, using state (may be stale)');
  }
  
  // ... rest of PDF generation
};
```

---

## Technical Details

### DOM Selector

```css
.we-page-content .ProseMirror
```

- `.we-page-content` - Each letter page's content wrapper
- `.ProseMirror` - TipTap's editor root element (contains the actual content)

### Why This Selector Works

TipTap uses ProseMirror under the hood. The `.ProseMirror` class is automatically added to the editor's root element. Each page in our multi-page editor has its own `.ProseMirror` element inside a `.we-page-content` container.

### Content Extraction

```typescript
const domContent = Array.from(editorElements).map(el => {
  const html = (el as HTMLElement).innerHTML || '';
  return html;
});
```

We extract `innerHTML` directly from each DOM element. This gives us the raw HTML that TipTap is rendering, which is exactly what we need for PDF generation.

### Fallback Strategy

If the DOM query fails (shouldn't happen in normal operation), we fall back to reading from React state with a 100ms delay to give state updates time to complete. This provides a safety net.

---

## Why Previous Attempts Failed

### Attempt 1: Cache-Busting Only

```typescript
const cacheBustedUrl = `${pdfUrl}?t=${Date.now()}&r=${Math.random()}`;
```

**Why it failed:** This only prevents browser caching of the PDF file. If we're generating the PDF with stale content, cache-busting doesn't help.

### Attempt 2: Waiting for State Updates

```typescript
await new Promise(resolve => setTimeout(resolve, 100));
const combinedHTML = pages.map(pageHTML => pageHTML).join('<hr class="page-break">');
```

**Why it failed:** React state updates are batched and async. 100ms isn't guaranteed to be enough, and we're guessing at timing. There's no guarantee the state has updated.

### Attempt 3: Editor Refs

```typescript
const editorRefs = useRef<(Editor | null)[]>([]);
// Query editors via refs
const currentHTMLContent = validEditors.map(editor => editor.getHTML());
```

**Why it failed:** Refs might not be set up correctly, or there could be timing issues where refs aren't available when we need them. More complex than needed.

---

## Why DOM Query Works

1. **Synchronous** - DOM reads happen immediately, no waiting for async updates
2. **Always Current** - The DOM reflects exactly what the user sees
3. **Simple** - Direct query, no complex state management
4. **Reliable** - DOM is the source of truth for what's rendered

---

## Testing

### How to Verify the Fix Works

1. Open the letter editor
2. Type some text
3. Click "Preview PDF" - should show the text
4. Edit the text (add more, delete, change)
5. Click "Preview PDF" again - should show **updated** text with changes
6. Repeat - should always show latest changes

### Console Output

When working correctly, you should see:
```
✅ Using DOM content directly, length: 1234
Got HTML from DOM: <p>Your latest content...</p>
Generating PDF with final content: <p>Your latest content...
```

---

## Benefits of This Approach

1. **✅ Always Latest Content** - DOM query guarantees latest content
2. **✅ No State Dependency** - Doesn't rely on React state update timing
3. **✅ Simple & Reliable** - Straightforward DOM query
4. **✅ Fast** - Synchronous DOM read, no delays needed
5. **✅ Debuggable** - Easy to inspect DOM vs state if issues arise

---

## Potential Issues & Mitigations

### Issue: DOM Query Returns Empty

**Mitigation:** Fallback to state-based approach with delay

```typescript
if (editorElements.length > 0) {
  // Use DOM
} else {
  // Fallback to state
  await new Promise(resolve => setTimeout(resolve, 100));
  combinedHTML = pages.map(pageHTML => pageHTML).join('<hr class="page-break">');
}
```

### Issue: Multiple Pages

**Mitigation:** Query all `.we-page-content .ProseMirror` elements and combine them

```typescript
const domContent = Array.from(editorElements).map(el => {
  return (el as HTMLElement).innerHTML || '';
});
combinedHTML = domContent.join('<hr class="page-break">');
```

---

## Related Files

- `frontend/app/letters/LetterEditor.tsx` - Main editor component with DOM query logic
- `frontend/app/api/letters/pdf-preview/route.ts` - PDF generation API
- `frontend/app/styles/letterhead.css` - Letter editor styles

---

## Alternative Approaches Considered

### 1. Force State Update with `flushSync`

```typescript
import { flushSync } from 'react-dom';

flushSync(() => {
  // Force state update
});
const combinedHTML = pages.map(pageHTML => pageHTML).join('<hr class="page-break">');
```

**Rejected:** Still relies on state being correct, adds React complexity.

### 2. Content Hash Comparison

```typescript
const contentHash = editor.getHTML().substring(0, 100).replace(/\s/g, '').length;
// Compare hashes to detect changes
```

**Rejected:** Doesn't solve the root problem of getting latest content.

### 3. Editor Event Listeners

```typescript
editor.on('update', ({ editor }) => {
  // Update state immediately on every keystroke
});
```

**Rejected:** Still async, doesn't guarantee state is current when button is clicked.

---

## Conclusion

The DOM query approach is the most reliable solution because:
- The DOM is always up-to-date (TipTap updates it immediately)
- It's synchronous (no async timing issues)
- It's simple (direct query, no complex state management)
- It's guaranteed to work (DOM is the source of truth)

This fix ensures the PDF preview **always** shows the latest content, regardless of React state update timing.

---

## Commit Message Reference

```
✅ Fix PDF preview not updating with editor changes

PROBLEM:
- PDF preview was not showing updated content when user edited text
- React state updates were batched/async, causing stale content in preview

SOLUTION:
- Query DOM directly (TipTap's ProseMirror) instead of relying on React state
- DOM is always up-to-date when user types, guaranteed latest content
- Added fallback to state if DOM query fails

TECHNICAL DETAILS:
- Use document.querySelectorAll('.we-page-content .ProseMirror') to get all editors
- Extract innerHTML directly from DOM elements
- Combine pages with '<hr class="page-break">' separator
- Maintain unique key prop for iframe/object to force remount
- Cache-busting with timestamp + random parameters

RESULT:
✅ Preview now always shows latest editor content
✅ No more stale content in PDF preview
✅ Works reliably regardless of React state update timing
```

---

**Status:** ✅ Production Ready - This fix has been tested and confirmed working.

