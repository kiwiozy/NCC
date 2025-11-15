# Letterhead Integration – Quick Summary (Walk Easy Pedorthics)

This is the short “how to” for your team.

---

## 1. What this does
- Lets a clinician type a letter in the browser **on top of the real Walk Easy letterhead**
- Shows a **dashed line** where **page 1 ends** (so they don’t type into the footer)
- Sends the HTML to an API that uses **Puppeteer** to make a proper **A4 PDF**
- Stores the letter HTML in **Django / DRF**
- Works in **Safari** because Safari only *views* the final PDF

---

## 2. Files in this bundle
- `frontend/styles/letterhead.css` → A4 + margins + page-break line
- `frontend/app/letters/[id]/page.tsx` → the actual editor page (React + TipTap)
- `frontend/app/components/tiptap/PageBreak.ts` → lets user insert manual page breaks
- `frontend/app/api/letters/[id]/pdf/route.ts` → Next.js API that runs Puppeteer
- `frontend/public/letterhead.png` → **placeholder** letterhead (replace with your export)
- `backend/letters/models.py` → Django model to store letters
- `backend/letters/serializers.py` → DRF serializer
- `backend/letters/views.py` → DRF viewset (CRUD)
- `backend/letters/pdf_views.py` → Django endpoint that calls the Next.js PDF route
- `design/Letterhead_Export_Guide.md` → how to export from Illustrator

---

## 3. Where to put things

**Frontend (Next.js project):**
- copy `frontend/styles/letterhead.css` → your Next.js `styles/`
- copy `frontend/app/letters/[id]/page.tsx` → your app routes
- copy `frontend/app/api/letters/[id]/pdf/route.ts` → your API routes
- copy `frontend/public/letterhead.png` → your public folder

**Backend (Django project):**
- copy the 4 files from `backend/letters/` into your Django app called `letters`
- add the router lines from `backend/urls_example.md` to your `urls.py`
- run migrations so the `Letter` model is created

---

## 4. Running it locally

1. **Start Django** on `http://localhost:8000`
2. **Start Next.js** on `http://localhost:3000`
3. Create a letter in Django admin (or POST one) so you have id=1
4. Open **Safari** and go to:  
   `http://localhost:3000/letters/1`
5. You should see:
   - a white A4 page
   - your (placeholder) Walk Easy letterhead
   - a dashed line near the bottom = page break
6. Click **Generate PDF** → opens the Puppeteer PDF in a new tab

---

## 5. Replacing the letterhead with the real .ai artwork

1. Open Illustrator file: `Walk Easy_Letterhead.ai`
2. Export → PNG → A4 / 300dpi → name it `letterhead.png`
3. Put it in: `frontend/public/letterhead.png`
4. Refresh the editor page → you will see the real letterhead

---

## 6. Notes for Safari

- Safari is only **viewing** the PDF, not creating it → safe
- All layout is done by **Chromium (Puppeteer)** on the server → consistent
- If Safari doesn’t auto-download, right-click → “Download linked file”

---

## 7. Production tips

- Host `letterhead.png` on S3 or Cloud Storage and change the URL in the PDF route
- Lock the CSS vars (margins) so staff can’t break the layout
- Add role-based access in Django if clinicians should only see “their” letters

---

That’s it. This is the “how to use it” version.
