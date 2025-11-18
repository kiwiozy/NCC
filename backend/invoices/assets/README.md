# Invoice Assets

## Files in this directory:

### Paid.png ✅
**Status:** READY  
**Purpose:** Watermark stamp for receipt PDFs  
**Location:** `backend/invoices/assets/Paid.png`  
**Source:** Copied from `frontend/public/images/Paid.png`  
**Size:** 249KB

**Specs:**
- Blue stamp graphic with "THANK YOU" and "PAID" text
- Used at 13% opacity
- Centered on receipt documents
- Rendered size: ~8-10cm diameter

**Usage:**
```python
from reportlab.pdfgen import canvas

def add_paid_watermark(canvas_obj, doc):
    watermark_path = 'backend/invoices/assets/Paid.png'
    canvas_obj.setFillAlpha(0.13)  # 13% opacity
    canvas_obj.drawImage(watermark_path, x, y, ...)
```

---

## Other Image Assets

**Note:** These images are stored in `frontend/public/images/` and referenced by PDF generators:

### Logo_Nexus.png
**Location:** `frontend/public/images/Logo_Nexus.png`  
**Purpose:** Company logo in PDF header  
**Size in PDF:** 4cm × 4cm (proportional)  
**File size:** 133KB

### Address.png
**Location:** `frontend/public/images/Address.png`  
**Purpose:** Address graphic in PDF header (replaces text-based address)  
**Size in PDF:** 9.03cm × 4cm (matches logo height)  
**File size:** 105KB

### walkeasy-logo.png
**Location:** `frontend/public/images/walkeasy-logo.png`  
**Purpose:** Alternative logo (if needed)  
**File size:** 270KB

---

## Image Directory Structure

```
frontend/public/images/
├── Paid.png (249KB) ← Source for watermark
├── Logo_Nexus.png (133KB) ← Used in PDFs
├── Address.png (105KB) ← Used in PDFs
├── Address.svg (39KB) ← SVG version (not used)
└── walkeasy-logo.png (270KB) ← Alternative logo

backend/invoices/assets/
├── Paid.png (249KB) ← Copied for receipt watermark
└── README.md ← This file
```

---

## PDF Generator Image Paths

```python
# Current paths used in PDF generators:
logo_path = os.path.join(settings.BASE_DIR, '../frontend/public/images/Logo_Nexus.png')
address_graphic_path = os.path.join(settings.BASE_DIR, '../frontend/public/images/Address.png')
watermark_path = 'backend/invoices/assets/Paid.png'  # For receipts
```

