# Walk Easy Letterhead - Implementation Task List

**Branch:** LetterV2  
**Started:** 2025-11-02  
**Status:** 🚧 In Progress

**Architecture Decision:** Manual `.we-page` containers (ChatGPT Pattern A)

---

## ✅ Phase 0: Preparation & Setup

- [ ] Install Puppeteer (`npm install puppeteer`)
- [ ] Install TipTap core and extensions
- [ ] Convert `letterhead.png` to base64 for embedding
- [ ] Copy letterhead image to `frontend/public/letterhead.png`

---

## 📐 Phase 1: CSS Foundation (Absolute Positioning Safe Zones)

- [ ] Create `frontend/app/styles/letterhead.css` with:
  - CSS variables for safe zones (60mm, 22mm, 18mm, 45mm)
  - `.we-page` container (210mm × 297mm)
  - `.we-page-content` with absolute positioning
  - `.letterhead-bg` with `position: fixed` and `z-index: 0`
  - Page break indicator styles
- [ ] Add `@media screen` vs `@media print` rules for overflow

**Key CSS Pattern:**
```css
.we-page-content {
  position: absolute;
  top: 60mm;
  left: 22mm;
  right: 18mm;
  bottom: 45mm;
}
```

---

## ✏️ Phase 2: TipTap Editor Component

- [ ] Create `frontend/app/components/settings/LetterComposer.tsx`
- [ ] Initialize TipTap with StarterKit
- [ ] Add letterhead overlay (25% opacity for visibility)
- [ ] Show dashed line at 192mm (page break indicator)
- [ ] Add toolbar: Bold, Italic, Underline, Lists
- [ ] Style editor to look like A4 paper on gray background

**Editor Structure:**
```jsx
<div className="letter-editor-shell">
  <div className="we-page">
    <div className="letterhead-overlay" />
    <div className="we-page-content">
      <EditorContent editor={editor} />
    </div>
  </div>
</div>
```

---

## 🔧 Phase 3: Puppeteer PDF API Route

- [ ] Create `frontend/app/api/letters/pdf/route.ts`
- [ ] Embed base64 letterhead in CSS
- [ ] Implement single-page PDF generation first
- [ ] Use recommended Puppeteer config:
  ```javascript
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--font-render-hinting=medium',
    '--disable-dev-shm-usage',
  ]
  ```
- [ ] Set `waitUntil: 'networkidle0'` and `waitForTimeout(300)`

**HTML Structure for PDF:**
```html
<body>
  <div class="letterhead-bg"></div>
  <div class="we-page">
    <div class="we-page-content">
      {html from editor}
    </div>
  </div>
</body>
```

---

## 🧪 Phase 4: Single-Page Testing

- [ ] Test PDF generation with short letter (< 192mm)
- [ ] Verify letterhead appears correctly
- [ ] Verify text starts at 60mm from top
- [ ] Verify left/right margins (22mm / 18mm)
- [ ] Verify bottom safe zone (45mm)
- [ ] Test in Safari PDF viewer
- [ ] Test in Chrome PDF viewer
- [ ] Download and check in Adobe Acrobat

**Test Content:**
- Short letter (~10 lines)
- Letter with formatting (bold, italic, lists)
- Letter with multiple paragraphs

---

## 📄 Phase 5: Multi-Page Detection & Splitting

- [ ] Create function to estimate content height
- [ ] Detect when content exceeds 192mm
- [ ] Implement `splitIntoPages(html)` function
- [ ] Split content into multiple `.we-page` containers
- [ ] Test with long letter (2-3 pages)

**Algorithm:**
```javascript
function splitIntoPages(html) {
  // Parse HTML
  // Estimate height of each paragraph
  // When cumulative height > 192mm, create new page
  // Return array of page HTML chunks
}
```

---

## 🎯 Phase 6: Multi-Page PDF Generation

- [ ] Update PDF route to generate multiple `.we-page` divs
- [ ] Test 2-page PDF
- [ ] Verify letterhead on page 2 (critical test!)
- [ ] Verify page 2 text starts at 60mm (not 0mm!)
- [ ] Test 3-page PDF
- [ ] Test 4-page PDF

**Expected Result:**
- ✅ Letterhead on every page
- ✅ 60mm top safe zone on every page
- ✅ Consistent left/right/bottom margins

---

## 🖼️ Phase 7: PDF Preview Modal

- [ ] Create PDF preview component (similar to old one)
- [ ] Show PDF in modal with page thumbnails
- [ ] Add "Download PDF" button
- [ ] Add "Close" button
- [ ] Test preview in Safari

---

## 🎨 Phase 8: Editor UX Enhancements

- [ ] Add "Preview PDF" button to editor
- [ ] Show character/word count
- [ ] Add visual warning when approaching 192mm
- [ ] Consider: Manual page break button (for user control)
- [ ] Add auto-save functionality (optional)

---

## 📊 Phase 9: Integration with Existing System

- [ ] Add Letter Composer back to Settings navigation
- [ ] Update SettingsHeader to include Letters tab
- [ ] Consider: Storage backend (Django or file-based?)
- [ ] Consider: Link letters to patients/contacts?

---

## 🧹 Phase 10: Polish & Documentation

- [ ] Clean up console logs
- [ ] Add error handling to PDF route
- [ ] Add loading states
- [ ] Document deployment requirements (Chromium in Docker)
- [ ] Update user guide
- [ ] Test in production-like environment

---

## 🚨 Critical Success Criteria

Must pass ALL of these before considering complete:

1. ✅ **Letterhead appears on ALL pages** (1, 2, 3, etc.)
2. ✅ **Text starts at 60mm on ALL pages** (not 0mm on page 2+)
3. ✅ **Safe zones respected on ALL pages** (22mm left, 18mm right, 45mm bottom)
4. ✅ **PDF viewable in Safari** (macOS/iOS)
5. ✅ **No text overlapping header graphics**
6. ✅ **No text overlapping footer graphics**
7. ✅ **Consistent across Chrome, Safari, Adobe Acrobat**

---

## 📝 Design Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Manual `.we-page` containers | ChatGPT recommended - only reliable way to ensure page 2+ safe zones | 2025-11-02 |
| Absolute positioning for safe zones | More reliable than padding (doesn't collapse) | 2025-11-02 |
| Base64 letterhead in PDF | Self-contained, no network delays | 2025-11-02 |
| `z-index: 0` (not `-1`) | Better PDF viewer compatibility | 2025-11-02 |
| Single scrolling editor → split on export | Better UX than multiple page containers in editor | 2025-11-02 |

---

## 🐛 Known Issues / Watch Items

- [ ] Content height estimation accuracy (may need adjustment)
- [ ] Font loading in Puppeteer (add timeout buffer)
- [ ] Large images causing layout shifts
- [ ] Memory usage with many concurrent PDF generations

---

## 🎓 Lessons Learned from Previous Attempts

1. ❌ **Automatic page breaks with padding don't work** - Page 2+ loses top spacing
2. ❌ **`padding-top` collapses after `break-before: page`** - Chromium limitation
3. ❌ **`::before` pseudo-elements ignored after page breaks** - Chromium limitation
4. ✅ **Manual `.we-page` containers solve all issues** - Let us control pagination
5. ✅ **Absolute positioning is rock-solid** - Never collapses

---

## 🔗 Reference Documents

- `Walk-Easy-Letterhead-Implementation.md` - ChatGPT's technical answers
- `QUESTIONS_FOR_CHATGPT.md` - Original questions we asked
- `Puppeteer-Multi-Page-PDF-Problem.md` - Previous analysis
- `walk-easy-full-bundle/` - Reference implementation

---

**Next Action:** Install Puppeteer and begin Phase 1 (CSS Foundation)

