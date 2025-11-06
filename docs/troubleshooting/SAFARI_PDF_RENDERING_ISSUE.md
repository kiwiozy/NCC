# Safari PDF Rendering Issue - Technical Analysis

## Problem Statement

We're experiencing issues with inline PDF rendering in Safari for a Next.js application. PDFs are not displaying consistently in the document viewer dialog, even though they worked previously when there was only one document.

## Current Implementation

### Technology Stack
- **Frontend**: Next.js 15.5.6 with React
- **UI Framework**: Mantine UI v7
- **Browser**: Safari (macOS)
- **PDF Source**: S3 presigned URLs (cross-origin)
- **Backend**: Django REST Framework serving document download URLs

### Current Code Implementation

We're using an `<object>` tag for Safari PDF rendering:

```tsx
<object
  key={`safari-pdf-${selectedDocument.id}-${reloadKey}`}
  data={getDownloadUrlWithCacheBust(selectedDocument.download_url)}
  type="application/pdf"
  style={{
    width: '100%',
    height: '100%',
    minHeight: rem(400),
    display: 'block',
  }}
  onError={() => {
    console.error('PDF failed to load in object tag');
    setIsReloadingPDF(false);
  }}
>
  {/* Fallback content */}
</object>
```

### Cache-Busting Implementation

```typescript
const getDownloadUrlWithCacheBust = (url: string | undefined): string => {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}&reload=${reloadKey}`;
};
```

### Reload Mechanism

```typescript
const handleReloadPDF = async () => {
  setIsReloadingPDF(true);
  setReloadKey(0);  // Unmount
  await new Promise(resolve => setTimeout(resolve, 100));
  setReloadKey(prev => prev + 1);  // Remount
  setTimeout(() => {
    setIsReloadingPDF(false);
  }, 300);
};
```

## What Works

1. ✅ **PDFs display correctly** when there's only one document initially
2. ✅ **PDFs are scrollable** when they do display
3. ✅ **Other browsers (Chrome, Firefox)** work fine with iframe approach
4. ✅ **Download/open in new window** works as fallback
5. ✅ **Images** display correctly in the same viewer

## What Doesn't Work

1. ❌ **PDFs don't display** when switching between multiple documents
2. ❌ **Blank viewer area** appears after selecting different documents
3. ❌ **Reload button** doesn't consistently fix the issue
4. ❌ **Object tag** seems unreliable with S3 presigned URLs in Safari

## Technical Details

### PDF URL Format
- S3 presigned URLs with expiration
- Format: `https://[bucket].s3.amazonaws.com/[path]?[presigned-params]`
- Cross-origin requests
- HTTPS with proper CORS headers from backend

### Browser Detection
We're using browser detection to switch between Safari (object tag) and other browsers (iframe):

```typescript
const browser = useBrowserDetection();
if (browser.isSafari) {
  // Use <object> tag
} else {
  // Use <iframe>
}
```

### Component Structure
- Modal dialog with two-column layout
- Left: Document list (scrollable)
- Right: Document viewer with metadata
- Height: 600px (fixed)
- Document viewer area: `flex: 1` with `overflow: hidden`

## What We've Tried

1. ✅ **Object tag** - Works initially but fails when switching documents
2. ✅ **Iframe** - Doesn't work in Safari with cross-origin PDFs
3. ✅ **Cache-busting** - Adding timestamp and reload key to URL
4. ✅ **Unmount/remount cycle** - Clearing reload key, waiting, then incrementing
5. ✅ **Error handlers** - Added onError handlers
6. ✅ **Loading states** - Added loading spinner during reload
7. ❌ **Preview card approach** - User didn't like this (removed)

## Specific Questions for ChatGPT

1. **Why does Safari's `<object>` tag work for the first PDF but fail when switching to another document?**

2. **Are there known Safari limitations with `<object>` tags and cross-origin S3 presigned URLs?**

3. **What's the best approach for inline PDF rendering in Safari with cross-origin URLs?**

4. **Should we use `<embed>` instead of `<object>` for Safari?**

5. **Are there Safari-specific attributes or properties we should set on the `<object>` tag?**

6. **Would using a blob URL (fetch → createObjectURL) work better than direct S3 URL?**

7. **Are there Content-Security-Policy or CORS issues we should check?**

8. **Is there a way to force Safari to reload the PDF without unmounting/remounting the element?**

9. **Should we use a different approach entirely (e.g., PDF.js library)?**

10. **Are there Safari version-specific issues we should be aware of?**

## Additional Context

### User Feedback
- "When I only had one doc it showed the PDF really nicely I could scroll the whole doc"
- "Can you write a .md file so we can ask chatgpt to see if we can find a fix"
- User wants inline viewing, not a preview card with download buttons

### Environment
- macOS Safari (latest version)
- Local development environment
- HTTPS for local development
- S3 bucket with proper CORS configuration

### Error Messages
- No console errors when PDF fails to load
- `onError` handler fires inconsistently
- PDF sometimes appears blank without triggering error handlers

## Desired Outcome

We want Safari to:
1. Display PDFs inline in the viewer area
2. Allow scrolling through the entire document
3. Work consistently when switching between multiple documents
4. Maintain the same user experience as other browsers

## Code References

- **File**: `frontend/app/components/dialogs/DocumentsDialog.tsx`
- **Lines**: ~517-565 (Safari PDF rendering)
- **Component**: `DocumentsDialog` component
- **State**: `reloadKey`, `isReloadingPDF`, `selectedDocument`

---

## ✅ SOLUTION IMPLEMENTED

### Problem Solved

We implemented a **backend proxy + IndexedDB cache** solution that:
1. ✅ Bypasses CORS issues (Django proxy endpoint)
2. ✅ Works consistently in Safari (blob URL approach)
3. ✅ Provides instant loads for cached PDFs
4. ✅ Automatically cleans up old cache entries

### Implementation Details

**Backend Proxy**: `backend/documents/proxy_views.py`
- Endpoint: `/api/documents/{id}/proxy/`
- Fetches from S3 server-side (no CORS)
- Streams PDF through Django to frontend

**Frontend Cache**: `frontend/app/utils/pdfCache.ts`
- IndexedDB storage for PDF blobs
- Cache-first loading strategy
- Automatic cleanup (7 days, 100MB limit)

**Updated Dialog**: `frontend/app/components/dialogs/DocumentsDialog.tsx`
- Checks cache first
- Falls back to proxy if not cached
- Stores in cache after fetching

### Result

- ✅ PDFs load consistently in Safari
- ✅ No CORS errors
- ✅ Instant loads for cached PDFs
- ✅ Zero bandwidth for repeat views
- ✅ Automatic storage management

### Documentation

See `docs/troubleshooting/PDF_CACHING_SOLUTION.md` for complete details.

---

**Status**: ✅ RESOLVED  
**Date**: November 2025

