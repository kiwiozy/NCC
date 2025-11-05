# PDF Caching Solution - CORS Workaround

## Problem

PDFs from S3 were failing to load in Safari (and other browsers) due to CORS restrictions. Direct S3 presigned URLs were blocked by the browser's same-origin policy.

## Solution

We implemented a **two-part solution**:

1. **Backend Proxy Endpoint** - Bypasses CORS by serving PDFs through Django
2. **IndexedDB Cache** - Stores PDFs locally for instant subsequent loads

---

## Architecture

### Flow Diagram

```
First View:
Browser → Django Proxy → S3 → Django → Browser → IndexedDB Cache
  ↓
PDF displayed from blob URL

Subsequent Views:
Browser → IndexedDB Cache → Blob URL
  ↓
PDF displayed instantly (zero bandwidth)
```

---

## Backend Implementation

### Proxy Endpoint

**File**: `backend/documents/proxy_views.py`

**Endpoint**: `GET /api/documents/{id}/proxy/`

**How it works**:
1. Receives document ID from frontend
2. Generates S3 presigned URL
3. Fetches PDF from S3 (server-side, no CORS)
4. Streams PDF through Django to frontend
5. Sets proper headers for inline viewing

**Benefits**:
- ✅ Bypasses CORS (server-to-server)
- ✅ Works with any browser
- ✅ No client-side CORS configuration needed

---

## Frontend Implementation

### PDF Cache Utility

**File**: `frontend/app/utils/pdfCache.ts`

**Features**:
- IndexedDB storage for PDF blobs
- Automatic cleanup (age + size limits)
- Cache-first loading strategy

### Cache Configuration

```typescript
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_STORAGE_MB = 100; // 100MB max cache
const CLEANUP_THRESHOLD_MB = 80; // Cleanup at 80MB
```

### Usage in DocumentsDialog

**File**: `frontend/app/components/dialogs/DocumentsDialog.tsx`

**Loading Flow**:
1. Check cache first (`pdfCache.get(documentId)`)
2. If cached → use blob URL (instant)
3. If not cached → fetch from proxy endpoint
4. Store in cache for future use
5. Create blob URL and display

---

## Bandwidth Impact

### First Load (Uncached)
- **S3 → Django**: PDF size (one-time)
- **Django → Browser**: PDF size (one-time)
- **Total**: ~2x PDF size
- **Result**: PDF stored in cache

### Subsequent Loads (Cached)
- **Network**: 0 bytes
- **Source**: Local IndexedDB
- **Result**: Instant load, zero bandwidth

### Net Effect
- **Frequent documents**: Significant bandwidth savings
- **One-time documents**: Minimal overhead (one proxy hop)
- **Overall**: Positive impact for active users

---

## Automatic Cleanup

### Cleanup Triggers

1. **On Page Load** - Background cleanup runs automatically
2. **Before Adding** - Checks if cache needs cleanup
3. **On Cache Check** - Removes expired entries

### Cleanup Strategy

1. **Age-Based**: Remove entries older than 7 days
2. **Size-Based**: If still over 100MB, remove oldest entries
3. **Priority**: Expired first, then oldest valid entries

### Storage Limits

- **Maximum Age**: 7 days per document
- **Maximum Size**: 100MB total cache
- **Cleanup Threshold**: 80MB (proactive cleanup)
- **User Action**: None required (fully automatic)

---

## Benefits

### Performance
- ✅ **Instant loads** for cached PDFs
- ✅ **Zero bandwidth** for repeat views
- ✅ **Faster UX** - no network wait time

### Reliability
- ✅ **No CORS issues** - proxy bypasses browser restrictions
- ✅ **Works across browsers** - Safari, Chrome, Firefox
- ✅ **Automatic cleanup** - no storage bloat

### User Experience
- ✅ **Seamless** - no manual cache management
- ✅ **Transparent** - works automatically
- ✅ **Consistent** - same experience as direct S3

---

## Technical Details

### IndexedDB Structure

```typescript
interface CachedPDF {
  documentId: string;    // Unique document ID
  blob: Blob;           // PDF binary data
  mimeType: string;     // MIME type (application/pdf)
  fileName: string;     // Original filename
  cachedAt: number;     // Timestamp (ms)
  size: number;         // File size in bytes
}
```

### Blob URL Management

- Blob URLs created from cached blobs
- URLs revoked when component unmounts
- Prevents memory leaks

### Error Handling

- Cache failures don't block PDF loading
- Falls back to proxy if cache fails
- Graceful degradation

---

## Future Improvements

### Potential Enhancements
1. **Background Prefetching** - Cache PDFs before user views
2. **Compression** - Reduce cache size (if needed)
3. **Cache Stats** - Show cache usage to users
4. **Manual Clear** - Option to clear cache manually
5. **Configurable Limits** - User-adjustable cache size/age

### When S3 CORS is Fixed
- Can optionally use direct S3 URLs
- Cache still provides performance benefits
- Proxy can be kept as fallback

---

## Files Modified

### Backend
- `backend/documents/proxy_views.py` - New proxy endpoint
- `backend/documents/urls.py` - Added proxy route

### Frontend
- `frontend/app/utils/pdfCache.ts` - New cache utility
- `frontend/app/components/dialogs/DocumentsDialog.tsx` - Updated to use cache

### Documentation
- `docs/troubleshooting/PDF_CACHING_SOLUTION.md` - This file
- `docs/troubleshooting/SAFARI_PDF_RENDERING_ISSUE.md` - Updated with solution

---

## Testing

### Test Cache Behavior

1. **First Load**:
   - Open document → Should fetch from proxy
   - Check console: "Fetching PDF from proxy endpoint"
   - Check console: "PDF cached successfully"

2. **Cached Load**:
   - Close and reopen same document
   - Check console: "PDF loaded from cache"
   - Should load instantly

3. **Cleanup**:
   - Wait 7+ days or fill cache to 100MB
   - Check that old entries are removed automatically

### Test Proxy Endpoint

```bash
# Test proxy endpoint directly
curl http://localhost:8000/api/documents/{document-id}/proxy/ \
  --output test.pdf

# Should download PDF successfully
```

---

## Troubleshooting

### PDF Not Loading
1. Check Django server is running
2. Verify proxy endpoint is accessible
3. Check browser console for errors
4. Try clearing cache and reloading

### Cache Not Working
1. Check IndexedDB is enabled in browser
2. Verify cache utility is imported correctly
3. Check console for cache errors
4. Try manual cache clear: `pdfCache.clear()`

### Storage Issues
1. Cache automatically cleans up at 80MB
2. Old entries (>7 days) are removed automatically
3. If issues persist, manually clear cache

---

**Last Updated**: November 2025  
**Status**: ✅ Production Ready

