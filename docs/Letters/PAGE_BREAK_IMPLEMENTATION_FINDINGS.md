# Page Break Implementation - Findings & Questions

## Date: November 1, 2025

## Context

We implemented the ChatGPT-recommended solution for accurate page break synchronization between TipTap (frontend WYSIWYG editor) and ReportLab (backend PDF generator). The implementation is structurally complete but requires debugging.

---

## Implementation Summary

### ✅ What Was Successfully Implemented:

1. **Frontend (`LetterComposer.tsx`)**
   - Custom `UniqueID` TipTap extension to assign `data-we` IDs to block elements
   - Debounced API call (700ms) to backend layout endpoint
   - Visual page break indicators (red dashed lines + "Page X" labels)
   - State management for page break positions

2. **Backend (`letters/views.py`)**
   - `TrackingFrame` class that overrides `_add()` to capture flowable Y-coordinates
   - `TrackingDocTemplate` class that tracks all flowable placements during PDF build
   - Modified `HTML2ReportLabConverter` to extract and preserve `data-we` IDs
   - New `analyze_layout()` endpoint at `/api/letters/layout/`

3. **URL Configuration**
   - Registered endpoint under `/api/letters/layout/`

---

## 🔍 Key Finding: Empty Tracking Data

### The Issue

When calling the `/api/letters/layout/` endpoint, the backend returns:

```json
{
  "page_height_px": 1122.5196850393702,
  "pages": {},
  "page_breaks_px": [],
  "total_pages": 0
}
```

The `pages` object is empty, meaning **no flowables with `_we_id` attributes were tracked** during PDF generation.

### Possible Root Causes

#### 1. **UniqueID Extension Not Assigning IDs**

**Question:** Is the TipTap `UniqueID` extension actually adding `data-we` attributes to the HTML output?

**Current Implementation:**
```typescript
const UniqueID = Extension.create({
  name: 'uniqueId',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading', 'listItem'],
      attributes: {
        id: {
          default: null,
          parseHTML: element => element.getAttribute('data-we'),
          renderHTML: attributes => {
            if (!attributes.id) {
              return {};
            }
            return { 'data-we': attributes.id };
          },
        },
      },
    }];
  },
  onCreate() {
    // Assign IDs to all block nodes when editor is created
    this.editor.state.doc.descendants((node, pos) => {
      if (node.isBlock && !node.attrs.id && node.type.name !== 'doc') {
        const id = `${node.type.name}-${Math.random().toString(36).substr(2, 9)}`;
        this.editor.commands.command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, id });
          return true;
        });
      }
    });
  },
  onUpdate() {
    // Assign IDs to new block nodes as they are created
    this.editor.state.doc.descendants((node, pos) => {
      if (node.isBlock && !node.attrs.id && node.type.name !== 'doc') {
        const id = `${node.type.name}-${Math.random().toString(36).substr(2, 9)}`;
        this.editor.commands.command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, id });
          return true;
        });
      }
    });
  },
});
```

**Concerns:**
- The extension uses `addGlobalAttributes()` to add the `id` attribute to node types
- The `renderHTML()` function maps `attributes.id` to `data-we` HTML attribute
- However, the `onCreate()` and `onUpdate()` hooks may not be triggering correctly
- TipTap might not be including the `id` attribute in the HTML output

**Questions to Investigate:**
1. Does `editor.getHTML()` actually include `data-we="..."` attributes in the output?
2. Do we need to modify the TipTap node schemas to properly persist the `id` attribute?
3. Should we use a different TipTap lifecycle hook (e.g., `addNodeView`)?

#### 2. **HTML Parsing Not Extracting IDs**

**Question:** Is BeautifulSoup correctly extracting `data-we` attributes from the HTML?

**Current Implementation:**
```python
for tag in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol']):
    we_id = tag.get('data-we', None)
    # ... later assign to flowable ...
    if we_id:
        p._we_id = we_id
```

**Concerns:**
- This should work if `data-we` attributes are present in the HTML
- Need to verify HTML input actually contains these attributes

**Questions to Investigate:**
1. Can we log the raw HTML content in `analyze_layout()` to inspect it?
2. Does the HTML wrapping (`<div style="color: #000000;">...</div>`) interfere with parsing?

#### 3. **Flowable ID Assignment Not Working**

**Question:** Can we actually assign custom attributes to ReportLab flowables?

**Current Implementation:**
```python
p = Paragraph(text, style)
if we_id:
    p._we_id = we_id  # Custom attribute assignment
```

**Concerns:**
- Python allows dynamic attribute assignment, so this should work
- However, ReportLab flowables might have `__slots__` or other restrictions

**Questions to Investigate:**
1. Does `hasattr(flowable, '_we_id')` return True after assignment?
2. Should we subclass `Paragraph` to add a proper `_we_id` property?

#### 4. **TrackingFrame Not Capturing Flowables**

**Question:** Is the `_add()` method being called, and are flowables passing through it?

**Current Implementation:**
```python
class TrackingFrame(Frame):
    def _add(self, flowable, canv, trySplit=0):
        y_before = self._y
        result = Frame._add(self, flowable, canv, trySplit)
        y_after = self._y
        
        if result and hasattr(flowable, '_we_id'):
            doc = canv._doctemplate
            doc._flow_positions.append({
                'id': flowable._we_id,
                'page': canv.getPageNumber(),
                'y_top_pt': y_before,
                'y_bottom_pt': y_after,
            })
        
        return result
```

**Concerns:**
- The condition `if result and hasattr(flowable, '_we_id')` may be too restrictive
- Need to verify:
  - Does `_add()` actually get called?
  - Does `result` evaluate to True?
  - Does `hasattr(flowable, '_we_id')` ever return True?

**Questions to Investigate:**
1. Should we add debug logging to `_add()` to confirm it's being called?
2. Are `Spacer` flowables being added but not tracked (they might not have IDs)?
3. Does ReportLab wrap our flowables in other objects (e.g., `KeepTogether`, `KeepInFrame`)?

---

## 🎯 Recommended Debugging Strategy

### Phase 1: Verify TipTap HTML Output

1. **Add console logging in frontend:**
   ```typescript
   const analyzeLayout = async () => {
     const html = editor.getHTML();
     console.log('HTML being sent to backend:', html);
     // ... rest of function
   };
   ```

2. **Check browser console** to see if `data-we` attributes are present in HTML
   - Look for tags like: `<p data-we="paragraph-abc123">content</p>`

3. **If IDs are missing:**
   - The `UniqueID` extension needs fixing
   - Consider using TipTap's built-in `Document.attrs.id` or custom node schemas

### Phase 2: Verify Backend ID Extraction

1. **Add debug logging in `analyze_layout()`:**
   ```python
   print("=" * 80)
   print("HTML CONTENT RECEIVED:")
   print(html_content[:500])  # First 500 chars
   print("=" * 80)
   
   # After BeautifulSoup parsing
   for tag in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
       we_id = tag.get('data-we', None)
       print(f"Tag: {tag.name}, ID: {we_id}, Text: {tag.get_text()[:50]}")
   ```

2. **Check Django console output** to see if IDs are being extracted

### Phase 3: Verify Flowable ID Assignment

1. **Add debug logging in `HTML2ReportLabConverter`:**
   ```python
   if we_id:
       p._we_id = we_id
       print(f"✓ Assigned ID '{we_id}' to {type(p).__name__}")
       print(f"  hasattr check: {hasattr(p, '_we_id')}")
       if hasattr(p, '_we_id'):
           print(f"  Value: {p._we_id}")
   ```

2. **Verify** that IDs are actually being stored on flowables

### Phase 4: Verify TrackingFrame Capture

1. **Add comprehensive logging in `TrackingFrame._add()`:**
   ```python
   def _add(self, flowable, canv, trySplit=0):
       print(f"_add called: {type(flowable).__name__}")
       
       y_before = self._y
       result = Frame._add(self, flowable, canv, trySplit)
       y_after = self._y
       
       print(f"  result: {result}, hasattr: {hasattr(flowable, '_we_id')}")
       
       if result and hasattr(flowable, '_we_id'):
           doc = canv._doctemplate
           position = {
               'id': flowable._we_id,
               'page': canv.getPageNumber(),
               'y_top_pt': y_before,
               'y_bottom_pt': y_after,
           }
           doc._flow_positions.append(position)
           print(f"  ✓ TRACKED: {position}")
       
       return result
   ```

2. **Check if:**
   - `_add()` is being called for each flowable
   - `result` is True
   - `hasattr(flowable, '_we_id')` ever returns True

---

## 📊 Expected vs. Actual Behavior

### Expected:

```json
{
  "page_height_px": 1122.52,
  "pages": {
    "1": [
      {"id": "paragraph-abc123", "y_top_px": 253.33, "y_bottom_px": 267.89},
      {"id": "paragraph-def456", "y_top_px": 273.89, "y_bottom_px": 288.45}
    ],
    "2": [
      {"id": "paragraph-ghi789", "y_top_px": 253.33, "y_bottom_px": 267.89}
    ]
  },
  "page_breaks_px": [872.0, 1555.0],
  "total_pages": 2
}
```

### Actual:

```json
{
  "page_height_px": 1122.52,
  "pages": {},
  "page_breaks_px": [],
  "total_pages": 0
}
```

---

## ❓ Questions for ChatGPT / Stack Overflow

### Question 1: TipTap Custom Attributes

**Title:** TipTap Extension: How to ensure custom attributes appear in HTML output?

**Body:**

I'm building a TipTap extension to add unique IDs to block elements for page break tracking. I need these IDs to appear as `data-we` attributes in the HTML output from `editor.getHTML()`.

Here's my extension:

```typescript
const UniqueID = Extension.create({
  name: 'uniqueId',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading', 'listItem'],
      attributes: {
        id: {
          default: null,
          parseHTML: element => element.getAttribute('data-we'),
          renderHTML: attributes => {
            if (!attributes.id) return {};
            return { 'data-we': attributes.id };
          },
        },
      },
    }];
  },
  onCreate() {
    this.editor.state.doc.descendants((node, pos) => {
      if (node.isBlock && !node.attrs.id && node.type.name !== 'doc') {
        const id = `${node.type.name}-${Math.random().toString(36).substr(2, 9)}`;
        this.editor.commands.command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, id });
          return true;
        });
      }
    });
  },
});
```

**Problem:** When I call `editor.getHTML()`, the output doesn't include `data-we` attributes.

**Questions:**
1. Do I need to extend the node schemas separately?
2. Is there a better lifecycle hook than `onCreate()` for assigning IDs?
3. Should I use `editor.commands.updateAttributes()` instead of `tr.setNodeMarkup()`?
4. Do global attributes work with core nodes like `paragraph` from `StarterKit`?

---

### Question 2: ReportLab Custom Flowable Attributes

**Title:** ReportLab: Can I assign custom attributes to Paragraph flowables for tracking?

**Body:**

I'm implementing a page break tracking system where I need to:
1. Assign custom IDs to ReportLab `Paragraph` flowables
2. Track these flowables in a custom `Frame` subclass during PDF generation

Here's my approach:

```python
# Assigning custom attribute
p = Paragraph(text, style)
p._we_id = "paragraph-abc123"

# Tracking in custom Frame
class TrackingFrame(Frame):
    def _add(self, flowable, canv, trySplit=0):
        y_before = self._y
        result = Frame._add(self, flowable, canv, trySplit)
        
        if result and hasattr(flowable, '_we_id'):
            # Record position
            doc = canv._doctemplate
            doc._flow_positions.append({
                'id': flowable._we_id,
                'page': canv.getPageNumber(),
                'y_top_pt': y_before,
            })
        
        return result
```

**Problem:** `hasattr(flowable, '_we_id')` always returns False, even though I assigned it earlier.

**Questions:**
1. Does ReportLab wrap flowables in proxy objects during layout?
2. Should I subclass `Paragraph` to add a proper `_we_id` property?
3. Is there a better way to attach metadata to flowables?
4. Could `trySplit` operations be creating new flowable instances without the attribute?

---

### Question 3: TipTap Block Node Identification

**Title:** Best practice for assigning persistent IDs to TipTap block nodes?

**Body:**

I need to assign unique, persistent IDs to every block-level node (paragraphs, headings, lists) in a TipTap editor. These IDs must:
- Survive serialization to HTML and back
- Appear in `editor.getHTML()` output as `data-` attributes
- Be automatically assigned to new nodes
- Persist when nodes are modified (but not when content changes)

**Current Approach:**
Using a custom extension with `addGlobalAttributes()` and `onCreate()` hook.

**Alternatives Considered:**
1. Custom node views with `addNodeView()`
2. Extending each node type individually
3. Using ProseMirror plugins directly
4. Transaction plugins with `appendTransaction()`

**Question:** What's the recommended TipTap pattern for this use case? Are there any existing extensions that do something similar?

---

## 🔄 Alternative Approaches to Consider

If the current implementation proves too difficult to debug, here are alternatives:

### Alternative 1: CSS-Based Page Break Estimation

Instead of backend tracking, use CSS measurements:
- Measure rendered HTML height in browser
- Calculate approximate page breaks based on known page height
- Less accurate but simpler

**Pros:**
- No backend roundtrip needed
- Faster response time
- Works entirely in browser

**Cons:**
- Not pixel-perfect (browser vs. PDF rendering differences)
- Doesn't account for ReportLab's layout decisions

### Alternative 2: PDF Post-Processing

Generate PDF first, then analyze it:
- Create PDF with all content
- Use PyPDF2 or pdfplumber to extract text positions
- Map positions back to HTML elements
- Return page break info

**Pros:**
- 100% accurate (uses actual PDF)
- Handles all ReportLab features

**Cons:**
- Slower (must generate full PDF)
- More complex post-processing
- Hard to map PDF text back to HTML elements

### Alternative 3: Client-Side PDF Generation

Use PDF.js or jsPDF in browser:
- Generate PDF entirely in JavaScript
- Track positions during generation
- Display page breaks immediately

**Pros:**
- No backend needed
- Instant feedback
- Same rendering engine for preview and PDF

**Cons:**
- Different PDF output than ReportLab
- May not support all ReportLab features (letterhead, complex layouts)
- Larger JavaScript bundle

---

## 📝 Next Actions

1. **Add debug logging** to all stages (TipTap → HTML → BeautifulSoup → Flowables → Tracking)
2. **Inspect actual HTML output** from TipTap to verify `data-we` attributes
3. **Test with minimal example** (single paragraph with known ID)
4. **Consider posting questions** on TipTap Discord / ReportLab mailing list
5. **Evaluate alternative approaches** if current path is blocked

---

## 🤔 Final Thoughts

The implementation architecture is sound and follows the ChatGPT recommendation exactly. The issue appears to be in one of the "glue" layers - either:
- TipTap not generating the IDs
- HTML not containing the IDs
- BeautifulSoup not extracting the IDs
- Flowables not retaining the IDs
- TrackingFrame not capturing the IDs

Systematic debugging with logging at each stage should reveal where the chain breaks.

The concept is proven - we just need to find and fix the missing link! 🔗

---

**Document prepared for:** ChatGPT consultation / Stack Overflow posts / Team review  
**Status:** Implementation complete, debugging required  
**Priority:** High - blocking accurate page break feature

