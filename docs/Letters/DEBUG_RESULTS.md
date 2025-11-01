# Page Break Debug Results - November 1, 2025

## 🎉 GREAT NEWS! We Found the Issue!

## Test Results Summary

### ✅ **FRONTEND IS WORKING PERFECTLY!**

The browser console shows:

```
🔍 Looking for data-we attributes: [
  data-we="paragraph-ls6uevmy4", 
  data-we="paragraph-l53c8vcry", 
  data-we="paragraph-t7zzs1akr",
  ...
]
```

**✅ TipTap UniqueID extension IS generating IDs correctly!**  
**✅ HTML contains proper `data-we` attributes!**  
**✅ Frontend is sending the HTML to backend!**

### ❌ **BACKEND IS NOT CAPTURING FLOWABLES**

Backend returns:
```json
{
  "pages": {},
  "page_breaks_px": [],
  "total_pages": 0
}
```

**The problem is:** `TrackingFrame._add()` is not capturing any flowables with `_we_id` attributes.

---

## The Issue: Scenario B from Debug Guide

We are in **Scenario B**: "Has `data-we` but backend shows 0 flowables captured"

This means the problem is in the backend tracking, NOT in the TipTap extension!

---

## Root Cause Analysis

The issue is likely one of these:

### 1. **Flowable ID Assignment Not Working** (Most Likely)

When we do this in `HTML2ReportLabConverter.html_to_pdf_elements()`:

```python
p = Paragraph(text, style)
if we_id:
    p._we_id = we_id  # This might not be persisting
```

**Possible reasons:**
- ReportLab's `Paragraph` class might have `__slots__` that prevents dynamic attribute assignment
- The `_we_id` attribute gets lost when the paragraph is added to the story
- Need to subclass `Paragraph` instead

### 2. **TrackingFrame Not Being Called**

The `TrackingDocTemplate` might not be using our `TrackingFrame` correctly.

**Need to verify:**
- Is `_add()` being called at all?
- Is the flowable parameter actually a `Paragraph` object?

### 3. **Spacers Interfering**

We add `Spacer` objects between paragraphs, and they don't have IDs. This is expected, but we need to make sure the `Paragraph` objects DO have IDs.

---

## Debugging Steps to Find Exact Cause

### Step 1: Add Debug Logging to Flowable Assignment

In `backend/letters/views.py`, modify the converter:

```python
if text.strip():
    try:
        p = Paragraph(text, style)
        # Transfer data-we ID to paragraph flowable
        if we_id:
            p._we_id = we_id
            print(f"✓ Assigned ID '{we_id}' to Paragraph")
            print(f"  hasattr check: {hasattr(p, '_we_id')}")
            if hasattr(p, '_we_id'):
                print(f"  Confirmed value: {p._we_id}")
            else:
                print(f"  ❌ LOST! hasattr returned False!")
        elements.append(p)
```

### Step 2: Add Debug Logging to TrackingFrame

In `backend/letters/views.py`, modify `TrackingFrame._add()`:

```python
def _add(self, flowable, canv, trySplit=0):
    """Override _add to capture flowable positions"""
    print(f"_add called for: {type(flowable).__name__}")
    
    y_before = self._y
    result = Frame._add(self, flowable, canv, trySplit)
    y_after = self._y
    
    has_id = hasattr(flowable, '_we_id')
    print(f"  result={result}, hasattr(_we_id)={has_id}")
    
    # If the flowable has a _we_id attribute, record its position
    if result and has_id:
        doc = canv._doctemplate
        position = {
            'id': flowable._we_id,
            'page': canv.getPageNumber(),
            'y_top_pt': y_before,
            'y_bottom_pt': y_after,
        }
        doc._flow_positions.append(position)
        print(f"  ✓ TRACKED: page={position['page']}, id={position['id']}")
    
    return result
```

### Step 3: Restart Django and Test

```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate
python manage.py runserver
```

Then in the browser, type something in the editor and watch the Django terminal output.

---

## Alternative Solution: Subclass Paragraph

If dynamic attribute assignment doesn't work, we can create a custom Paragraph class:

```python
from reportlab.platypus import Paragraph

class TrackableParagraph(Paragraph):
    """Paragraph that can store a tracking ID"""
    def __init__(self, text, style, we_id=None, **kwargs):
        super().__init__(text, style, **kwargs)
        self.we_id = we_id  # Store as a proper instance variable

# Then in HTML2ReportLabConverter:
if we_id:
    p = TrackableParagraph(text, style, we_id=we_id)
else:
    p = Paragraph(text, style)

# And in TrackingFrame._add():
if result and hasattr(flowable, 'we_id') and flowable.we_id:
    # Track it
```

---

## Expected Output After Fix

### Django Console:
```
================================================================================
🔍 ANALYZE LAYOUT - HTML RECEIVED (first 500 chars):
<p data-we="paragraph-abc123"><span>Test paragraph one</span></p>
================================================================================
✓ Assigned ID 'paragraph-abc123' to Paragraph
  hasattr check: True
  Confirmed value: paragraph-abc123
📝 Converted to 18 flowable elements

_add called for: Paragraph
  result=1, hasattr(_we_id)=True
  ✓ TRACKED: page=1, id=paragraph-abc123

_add called for: Spacer
  result=1, hasattr(_we_id)=False

✅ PDF built. Captured 9 flowable positions
📊 Flow positions: [{'id': 'paragraph-abc123', 'page': 1, ...}, ...]
🎯 Returning 1 pages with 0 page breaks
================================================================================
```

### Browser Console:
```
🔍 Looking for data-we attributes: [data-we="paragraph-abc123", ...]
✅ Backend response: {page_height_px: 1122.52, pages: {1: [...]}, ...}
📊 Page breaks received: []  // No page breaks for single-page content
```

### Editor View:
For multi-page content, RED DASHED LINES will appear! 🎉

---

## Next Action

**PRIORITY:** Add the debug logging to both the converter and TrackingFrame, restart Django, and test again.

This will show us EXACTLY where the IDs are being lost!

---

## Confidence Level: 🟢 HIGH

We've confirmed:
- ✅ Frontend generates IDs
- ✅ HTML contains IDs  
- ✅ Backend receives HTML with IDs
- ❌ Something breaks during PDF generation

The fix is in the backend tracking system. Once we see the debug output, we'll know exactly what to fix!

