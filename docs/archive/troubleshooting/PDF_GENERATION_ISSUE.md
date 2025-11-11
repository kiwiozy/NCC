# PDF Generation Issue - Text Appearing White/Invisible

## Problem Summary

We have a **TipTap WYSIWYG editor** in our React/Next.js frontend where users can style text (fonts, colors, bold, bullets, etc.). When we generate a PDF using **Python ReportLab** on the backend, all the text appears **white/invisible** in the PDF, even though it's there (you can see it when you highlight/select all).

## Current Setup

### Frontend (React/Next.js)
- **Editor**: TipTap with extensions (TextStyle, Color, FontFamily, FontSize, Bold, Italic, Underline, Lists, etc.)
- **HTML Output**: We get the HTML using `editor.getHTML()`
- **Example HTML from TipTap**:
```html
<p><span style="font-size: 18px;"><strong>Re: Yahia Othman</strong></span></p>
<p><span style="font-size: 18px;"><strong>Support Letter for Replacement Custom-Made Medical Grade Footwear</strong></span></p>
<p>Dear NDIS Planner/Support Coordinator,</p>
<p>Mr. Yahia Othman was previously supplied with <strong>custom-made medical grade footwear (MGF)</strong> to assist with his lower-limb alignment, balance, and mobility.</p>
<ul>
  <li><p>Improved balance and stability during walking and standing.</p></li>
  <li><p>Appropriate redistribution of pressure to prevent skin breakdown or ulceration.</p></li>
</ul>
```

**Note**: Some text is wrapped in `<span>` tags with inline styles, but some text (like "Dear NDIS Planner/Support Coordinator,") is plain text directly inside `<p>` tags with **no wrapping element and no color specified**.

### Backend (Python/Django)
- **Library**: ReportLab for PDF generation
- **Approach**: We parse the HTML using BeautifulSoup and convert it to ReportLab's `Paragraph` elements
- **Issue**: Text appears white/invisible in the generated PDF

## What We've Tried

1. ✅ Set `textColor=black` on all `ParagraphStyle` definitions
2. ✅ Wrapped all HTML content in `<div style="color: #000000;">`
3. ✅ Modified the HTML parser to wrap plain text nodes in `<font color="#000000">` tags
4. ✅ Wrapped the entire converted markup in `<font color="#000000">` tags before creating the Paragraph
5. ❌ Tried switching to WeasyPrint (failed due to missing system dependencies on macOS)
6. ❌ Tried switching to xhtml2pdf (failed due to missing Cairo dependencies)

## Current Code

### HTML to PDF Converter (Simplified)
```python
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.colors import black
from bs4 import BeautifulSoup

class HTML2ReportLabConverter:
    def html_to_pdf_elements(self, html_content):
        soup = BeautifulSoup(html_content, 'html.parser')
        elements = []
        
        for tag in soup.find_all(['p', 'h1', 'h2', 'h3', 'ul', 'ol']):
            # Create style with black text
            style = ParagraphStyle(
                'Custom',
                fontSize=11,
                textColor=black,  # Set default to black
            )
            
            # Convert HTML to ReportLab markup
            text = self._convert_element_to_markup(tag)
            
            # Wrap in black font tag
            text = f'<font color="#000000">{text}</font>'
            
            # Create paragraph
            p = Paragraph(text, style)
            elements.append(p)
        
        return elements
    
    def _convert_element_to_markup(self, element):
        # Recursively processes HTML elements
        # Extracts inline styles (font-family, font-size, color)
        # Converts to ReportLab markup like <font face="..." size="..." color="...">
        # Returns the markup string
        pass
```

## Questions

1. **Why would ReportLab's Paragraph render text as white even when we explicitly set `textColor=black` and wrap everything in `<font color="#000000">` tags?**

2. **Is there a known issue with ReportLab where the `textColor` or `<font color>` attribute doesn't work properly?**

3. **What is the correct way to ensure ALL text (including plain text nodes without styling) appears black in a ReportLab PDF?**

4. **Should we be using a different approach entirely for converting HTML+CSS from a WYSIWYG editor to PDF in Python?** (considering WeasyPrint and xhtml2pdf have dependency issues on macOS)

5. **Is there a ReportLab setting or initialization step we're missing that would set the default text color globally?**

## Expected Behavior

The PDF should show all text in black (or whatever color was specified in the editor), matching the WYSIWYG editor output exactly.

## Actual Behavior

All text appears white/invisible in the PDF. The text is there (can be selected/highlighted), but it's not visible.

## Environment

- **Python**: 3.9
- **ReportLab**: 4.0.7
- **BeautifulSoup4**: 4.12.2
- **OS**: macOS (ARM64)
- **Django**: 4.2.25

## Additional Context

We also need to add a letterhead background image to every page of the PDF, which we're doing with a custom `canvas.Canvas` subclass that draws the image in `showPage()`.

---

**Any help or insights would be greatly appreciated!** We've been stuck on this for hours and can't figure out why the text color isn't being applied.

