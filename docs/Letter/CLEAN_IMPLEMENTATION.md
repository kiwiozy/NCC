# Letter System - Clean Implementation Plan

**Based on:** ChatGPT's Walk-Easy-Letterhead-Implementation.md  
**Date:** 2025-11-02  
**Status:** 🚀 Starting Fresh

---

## Implementation Steps

### ✅ Step 1: Copy letterhead image
- Copy `letterhead.png` to `frontend/public/`

### Step 2: Create CSS with safe zones
- Create `frontend/app/styles/letterhead.css`
- Use ChatGPT's recommended CSS variables
- Safe zones: 60mm top, 22mm left, 18mm right, 45mm bottom

### Step 3: Create simple letters page
- Path: `frontend/app/letters/page.tsx`
- Basic TipTap editor with minimal toolbar
- Show letterhead overlay at 25% opacity
- Add dashed line at 192mm (page break indicator)

### Step 4: Create PDF API route
- Path: `frontend/app/api/letters/pdf/route.ts`
- Start with SINGLE PAGE only
- Use `position: fixed` letterhead with base64
- Use padding for content safe zones

### Step 5: Test single-page PDF
- Generate PDF with short letter
- Verify letterhead appears
- Verify safe zones are correct
- Open in Safari to test

### Step 6: Add multi-page support (later)
- Manual `.we-page` containers
- Content height estimation
- Multiple pages in PDF

---

## Key Decisions from ChatGPT

1. **Use `position: fixed` for letterhead** with `z-index: 0`
2. **Use padding for content** (60mm, 22mm, 18mm, 45mm)
3. **Base64 encode letterhead** for self-contained PDF
4. **Manual pagination** for multi-page (not automatic)
5. **Single scrolling editor** → split on export

---

**Next:** Start with Step 1

