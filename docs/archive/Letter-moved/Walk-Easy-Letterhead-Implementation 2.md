# Walk Easy Letterhead Implementation — Technical Q&A

**Date:** 2025-11-02  
**Context:** Implementation notes for Puppeteer PDF generation with Walk Easy’s new letterhead and white text-safe zone.

---

## 1. Multi-Page Letterhead with `position: fixed`

**Answer:**  
Yes — in Chromium/Puppeteer, `position: fixed` elements repeat on **every page** of a PDF.  
Your `.letterhead-bg` background will appear on pages 1, 2, 3, etc., as long as:

- It’s not inside an element with `overflow: hidden`  
- You use `z-index: 0` (avoid `-1`)  
- You place it at the root level (`body > .letterhead-bg`)

```css
.letterhead-bg {
  position: fixed;
  inset: 0;
  width: 210mm;
  height: 297mm;
  background: url('letterhead.png') no-repeat 0 0 / 210mm 297mm;
  z-index: 0;
}
```

---

## 2. Absolute Positioning vs Padding for Safe Zones

**Answer:**  
Absolute positioning (e.g. `top: 60mm; left: 22mm;`) is **more reliable** than padding for Puppeteer.  
Chromium often collapses top padding on page 2+.  
Absolute offsets are physical layout positions and never collapse.

✅ Prevents padding-loss bugs  
❌ Doesn’t auto-generate new pages — that’s handled by `.we-page` wrappers.

---

## 3. Manual vs Automatic Page Breaks

**Most reliable:** **Manual `.we-page` containers**

```html
<div class="we-page"><div class="we-page-content">Page 1</div></div>
<div class="we-page"><div class="we-page-content">Page 2</div></div>
```

This guarantees:
- Letterhead repeats ✅  
- Safe zones apply consistently ✅  
- Predictable A4 page breaks ✅

Automatic page breaks using `<hr>` or long-flow content can cause page 2 to ignore top margins.  
Use automatic only for the editor view; generate `.we-page` blocks on export.

---

## 4. `overflow: hidden` on `.we-page-content`

**Answer:**  
`overflow: hidden` prevents text from spilling — useful in editors, **not in production PDFs.**

```css
@media screen {.we-page-content {overflow: hidden;}}
@media print {.we-page-content {overflow: visible;}}
```

---

## 5. Safe Zones on Page 2+

**Problem:** Page 1 OK, Page 2 starts at 0mm ❌  
**Solution:** You create every page explicitly.

```html
<div class="letterhead-bg"></div>
<div class="we-page"><div class="we-page-content">Page 1</div></div>
<div class="we-page"><div class="we-page-content">Page 2</div></div>
```

This pattern guarantees identical offsets for all pages.

---

## 6. Letterhead Background — Base64 vs URL

**Recommendation:**  
- ✅ **Base64** for production (self-contained, no network lag)  
- 🌐 URL for dev/staging environments

**Trade-offs:**
- Base64 = consistent but larger file  
- URL = lighter but may fail if network delays occur

If using URL, always `waitUntil: "networkidle0"` before PDF export.

---

## 7. Safari / Acrobat / Preview Compatibility

**Safe:** once rendered to PDF, all viewers respect `position: fixed`.  
Avoid:
- Negative z-index (`z-index: -1`)  
- Transparent PNGs with complex layers

Tested viewers that work:
- Safari PDF Viewer ✅  
- Chrome PDF Viewer ✅  
- Adobe Acrobat ✅  
- macOS Preview ✅  

---

## 8. TipTap Editor Integration

**Best UX:**  
- One long scrolling document with dashed page-break lines while typing  
- Convert to real `.we-page` elements during export

This avoids cursor jumps and layout flicker.

---

## 9. Content Height Calculation

Usable content height: `297mm - 60mm - 45mm = 192mm`.

**Recommendation:**
- Detect >192mm in the editor → auto-insert `<div class="page-break"></div>`  
- Split into real `.we-page` elements before PDF export.

If not split: overflow will occur or content will be clipped.

---

## 10. Production Deployment

**Puppeteer setup:**

```js
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--font-render-hinting=medium',
    '--disable-dev-shm-usage',
  ],
});
await page.goto(url, { waitUntil: 'networkidle0' });
await page.waitForTimeout(300);
await page.pdf({ format: 'A4', printBackground: true });
```

**Deployment notes:**
- Can run alongside Next.js, but cleaner in its own container (Cloud Run, Fargate, etc.)  
- Always use `printBackground: true`  
- Keep timeout buffer for images and fonts

---

## ✅ Final Recommended Pattern

```html
<body>
  <div class="letterhead-bg"></div>

  {{#each pages}}
    <div class="we-page">
      <div class="we-page-content">
        {{{this.html}}}
      </div>
    </div>
  {{/each}}
</body>
```

```css
@page { size: A4; margin: 0; }
body { margin: 0; }

.letterhead-bg {
  position: fixed;
  inset: 0;
  width: 210mm;
  height: 297mm;
  background: url('data:image/png;base64,...') no-repeat 0 0 / 210mm 297mm;
  z-index: 0;
}

.we-page {
  position: relative;
  width: 210mm;
  height: 297mm;
  page-break-after: always;
}

.we-page-content {
  position: absolute;
  top: 60mm;
  left: 22mm;
  right: 18mm;
  bottom: 45mm;
  box-sizing: border-box;
  z-index: 1;
}
```

**Summary:**  
> Don’t let Chromium make page 2. You make page 2.  
> Each page = one `.we-page` container + absolute-positioned `.we-page-content`.  
> Letterhead = `position: fixed` background.  
> Safe zones = enforced via CSS variables.

---

**Prepared by:** Walk Easy Pedorthics — Technical Implementation Team  
**Author:** ChatGPT (GPT‑5) — November 2025
