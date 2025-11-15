# Walk Easy Pedorthics — Letterhead (Updated Safe Zone)

**Generated:** 2025-11-02 06:49:33

This package was rebuilt to use the new Illustrator letterhead that defines a *white* text-safe area.
All documents, HTML/CSS templates, and reference assets should now keep content strictly inside that safe zone.

---

## What changed

1. **New master artwork**
   - `Resources/Letterhead-WhiteZone.ai` — this is the file you supplied.
   - Export this from Illustrator to PDF/PNG when you need to re-embed in web/PDF workflows.

2. **New CSS safe-zone rules**
   - `Resources/letterhead-safezone.css`
   - This defines the content frame using CSS variables:
     - Top: `--we-safezone-top: 60mm`
     - Right: `--we-safezone-right: 18mm`
     - Bottom: `--we-safezone-bottom: 45mm`
     - Left: `--we-safezone-left: 22mm`
   - If the Illustrator white box changes size/position, update those 4 variables only.

3. **Existing CSS files patched**
   - The following CSS files were tagged to point to the new rules:
     - - walk-easy-full-bundle/frontend/styles/letterhead.css

4. **Structure kept**
   - Your previous ZIP content was preserved, but now it includes the new Resources folder.

---

## How to use in Puppeteer

1. Make sure your HTML uses this structure:

```html
<link rel="stylesheet" href="Resources/letterhead-safezone.css" />

<div class="we-page">
  <!-- absolutely-positioned background placed here if needed -->
  <div class="we-page-content">
    <!-- your letter / report / template content -->
  </div>
</div>
```

2. In Puppeteer, set:
   - `format: "A4"`
   - `printBackground: true`
   - No extra margins (content margins are controlled by CSS)

---

## Notes

- If you want to **tighten** the white area (because the Illustrator file shows a slightly different shape), just edit `Resources/letterhead-safezone.css`.
- If your designers later move the white area in Illustrator, **don’t rebuild all templates** — just update the 4 CSS variables.



## Page-break indicators (added 2025-11-02 06:51)

- Screen-only dashed line at the bottom of each `.we-page`
- “Page Break” label for staff while typing
- Hidden automatically on print/PDF
- Manual element available: `<div class="page-break"></div>`
