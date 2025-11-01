# Debug Page Break Feature - Quick Test Guide

## What Should Happen

When working correctly, the Letter Composer will show **red dashed lines** with **"Page 2", "Page 3"** labels wherever pages will break in the PDF - just like we had before!

## Current Status: 🐛 Not Working Yet

The page break lines are **not appearing** because the tracking system isn't capturing data.

## How to Debug

### Step 1: Restart Servers

```bash
# Terminal 1 - Backend
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate
python manage.py runserver

# Terminal 2 - Frontend
cd /Users/craig/Documents/nexus-core-clinic/frontend
npm run dev
```

### Step 2: Open Browser with Console

1. Navigate to: `http://localhost:3000/settings?tab=letters`
2. **Open Developer Console** (Cmd+Option+I on Mac)
3. Go to the **Console** tab

### Step 3: Type in the Editor

1. Click in the letter editor
2. Type some content (or paste multi-paragraph text)
3. **Wait 1 second** for the debounce

### Step 4: Check Console Output

You should see debug messages like:

#### **Frontend Console (Browser):**
```
🔍 HTML being sent to backend (first 500 chars): <p><span style="font-family...">
🔍 Looking for data-we attributes: ['data-we="paragraph-abc123"', 'data-we="paragraph-def456"']
✅ Backend response: {page_height_px: 1122.52, pages: {...}, ...}
📊 Page breaks received: [872.0, 1555.0]
```

#### **Backend Console (Terminal):**
```
================================================================================
🔍 ANALYZE LAYOUT - HTML RECEIVED (first 500 chars):
<p data-we="paragraph-abc123"><span style="font-family...">
================================================================================
📝 Converted to 24 flowable elements
✅ PDF built. Captured 12 flowable positions
📊 Flow positions: [{'id': 'paragraph-abc123', 'page': 1, ...}, ...]
🎯 Returning 2 pages with 1 page breaks
================================================================================
```

## 🔍 Diagnosis Guide

### Scenario A: NO `data-we` attributes in frontend console

**Problem:** TipTap UniqueID extension isn't working

**What you'll see:**
```
🔍 Looking for data-we attributes: NONE FOUND
```

**Fix:** Need to debug the TipTap extension (see Question 1 in FINDINGS doc)

---

### Scenario B: Has `data-we` but backend shows 0 flowables captured

**Problem:** TrackingFrame isn't capturing flowables

**What you'll see (backend):**
```
✅ PDF built. Captured 0 flowable positions
📊 Flow positions: []...
```

**Fix:** Need to debug TrackingFrame._add() method (see Question 2 in FINDINGS doc)

---

### Scenario C: Backend returns data but no lines appear

**Problem:** Frontend rendering issue

**What you'll see (frontend):**
```
📊 Page breaks received: [872.0, 1555.0]
```

**But:** No red lines in the editor

**Fix:** Check if `pageBreaks` state is being set, inspect editor container positioning

---

## ✅ Success Criteria

When working correctly, you should see:

1. **In Browser Console:**
   - `data-we` attributes found in HTML
   - Backend returns page break positions
   - Array like `[872.0, 1555.0, 2238.0]`

2. **In Backend Terminal:**
   - Multiple flowables captured
   - Pages grouped by page number
   - Page breaks calculated

3. **In the Editor:**
   - Red dashed horizontal lines
   - "Page 2", "Page 3" labels on the right
   - Lines positioned where content will split in PDF

## 🎨 What It Should Look Like

```
┌─────────────────────────────────────────┐
│ Test Letter Content                     │
│                                          │
│ This is paragraph 1 with some text      │
│ that continues across multiple lines.   │
│                                          │
│ This is paragraph 2 with more content.  │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤ Page 2
│                                          │
│ This is paragraph 3 on page 2.          │
│                                          │
│ More content continues here...          │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤ Page 3
│                                          │
│ Final paragraphs on page 3...           │
└─────────────────────────────────────────┘
```

The red dashed lines (─ ─ ─) show exactly where ReportLab will break the page in the PDF!

## 📞 Next Steps

If debugging shows the issue, refer to:
- `PAGE_BREAK_IMPLEMENTATION_FINDINGS.md` - Detailed analysis
- `PAGE_BREAK_CHALLENGE.md` - Original problem statement

Post specific questions on Stack Overflow or TipTap Discord based on which scenario you encounter.

