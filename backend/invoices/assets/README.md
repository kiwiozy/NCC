# Invoice Assets

## Files in this directory:

### Paid.png
**Purpose:** Watermark stamp for receipt PDFs  
**Specs:**
- Blue stamp graphic with "THANK YOU" and "PAID" text
- Used at 13% opacity
- Centered on receipt documents
- Size: ~8-10cm diameter when rendered

**Usage:**
```python
from reportlab.pdfgen import canvas

def add_paid_watermark(canvas_obj, doc):
    watermark_path = 'backend/invoices/assets/Paid.png'
    canvas_obj.setFillAlpha(0.13)  # 13% opacity
    canvas_obj.drawImage(watermark_path, x, y, ...)
```

**TODO:** Save the Paid.png image file to this directory.

---

## Other Assets

### Logo.png
**Purpose:** Company logo in PDF header (if needed)

### Address.png
**Purpose:** Address graphic in PDF header (currently used)

