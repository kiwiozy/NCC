# 📝 Letter Composer

A professional letter writing and emailing tool with WYSIWYG editor, PDF generation, and Gmail integration.

---

## 📋 Overview

The Letter Composer allows you to:
- ✅ **Write professional letters** with rich text formatting
- ✅ **Download as PDF** for record-keeping
- ✅ **Email with PDF attachment** via Gmail integration
- ✅ **Full WYSIWYG editing** with intuitive toolbar
- ✅ **Professional letter template** pre-loaded

---

## 🎯 Key Features

### **WYSIWYG Editor**
- **Text Formatting:** Bold, Italic, Underline, Strikethrough
- **Headings:** H1, H2, H3
- **Text Alignment:** Left, Center, Right
- **Lists:** Bullet and Numbered lists
- **Text Color:** Custom color picker
- **Professional Layout:** Serif font with proper spacing

### **PDF Generation**
- Converts HTML letter to professional PDF
- **Walk Easy letterhead background** on every page
- Maintains formatting and styling
- Automatic filename from subject
- Backend processing with ReportLab
- Full-page letterhead with company branding

### **Email Integration**
- Sends via Gmail API (OAuth2)
- PDF automatically attached
- HTML signature appended
- Multi-account support (choose sending account)
- Professional email delivery

---

## 🚀 How to Use

### **1. Access Letter Composer**
Navigate to: **Settings → Letter Composer**
- Or directly: `http://localhost:3000/settings?tab=letters`

### **2. Write Your Letter**
1. **Enter Subject:** Provide a subject/title for the letter
2. **Use the Toolbar:** Format text with the visual editor
3. **Edit Content:** Replace template placeholders with actual content
4. **Preview:** The editor shows exactly how the letter will look

### **3. Download as PDF**
1. Click **"Download PDF"** button
2. PDF is generated on the backend
3. File automatically downloads with subject as filename
4. Perfect for record-keeping or manual email sending

### **4. Email Letter**
1. Click **"Email Letter"** button
2. Fill in:
   - **Recipient Name:** Full name of recipient
   - **Recipient Email:** Email address
   - **Subject:** Email subject (defaults to letter subject)
3. Click **"Send Email"**
4. Letter is converted to PDF and sent as attachment
5. HTML signature automatically appended

### **5. Clear Letter**
- Click **"Clear"** button to start fresh
- Confirmation dialog prevents accidental deletion

---

## 🛠️ Technical Implementation

### **Frontend**
- **Component:** `frontend/app/components/settings/LetterComposer.tsx`
- **Editor:** [TipTap](https://tiptap.dev/) - Modern WYSIWYG editor
- **UI Library:** Mantine UI
- **Extensions:**
  - `StarterKit` - Basic editing features
  - `Underline` - Underline text
  - `TextStyle` & `Color` - Text color picker
  - `TextAlign` - Text alignment

**SSR Configuration:**
```typescript
const editor = useEditor({
  immediatelyRender: false, // Fix for Next.js SSR
  extensions: [
    StarterKit,
    Underline,
    TextStyle,
    Color,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
  ],
  // ... other config
});
```

### **Backend**
- **Django App:** `backend/letters/`
- **Views:** `backend/letters/views.py`
  - `GenerateLetterPDFView` - Converts HTML to PDF
  - `EmailLetterView` - Sends email with PDF attachment
- **PDF Generation:** ReportLab (converts HTML to PDF)
- **Letterhead Integration:** Custom `LetterheadCanvas` class
  - Automatically adds letterhead background to every page
  - Uses `Walk-Easy_Letterhead-Pad-Final.png`
  - Full-page background with preserved aspect ratio
- **Email Service:** Reuses `send_at_report_email_via_gmail` from `ai_services`

**Custom Canvas for Letterhead:**
```python
class LetterheadCanvas(canvas.Canvas):
    """Custom canvas that draws letterhead background on each page"""
    
    def _draw_letterhead(self):
        """Draw the letterhead background image"""
        if os.path.exists(self.letterhead_path):
            page_width, page_height = letter
            self.drawImage(
                self.letterhead_path,
                0, 0,  # Bottom-left corner
                width=page_width,
                height=page_height,
                preserveAspectRatio=True,
                mask='auto'
            )
```

**API Endpoints:**
```
POST /api/letters/generate-pdf/
POST /api/letters/email/
```

**Request Body (Email):**
```json
{
  "html_content": "<p>Letter content...</p>",
  "recipient_email": "recipient@example.com",
  "recipient_name": "John Smith",
  "subject": "Letter Subject",
  "connection_email": "info@walkeasy.com.au" // Optional
}
```

---

## 🎨 Letter Template

### **Default Template Structure**
```
[Letterhead Background - Walk Easy Logo & Contact Info]

[Current Date]

Dear [Recipient],

Start writing your letter here...

Sincerely,

Walk Easy Pedorthics
```

- **Letterhead Background:** Full-page Walk Easy letterhead on every page
  - Company logo and branding
  - Address: 43 Harrison St, Cardiff, NSW 2285
  - Phone: 02 6766 3153
  - Email: info@walkeasy.com.au
- **Automatic Date:** Inserted in Australian format (e.g., "31 October 2025")
- **Professional Layout:** Serif font, proper spacing
- **Customizable:** Replace all placeholders with actual content
- **Multi-Page Support:** Letterhead appears on every page automatically

---

## 📧 Email Integration

### **Multi-Account Support**
If you have multiple Gmail accounts connected:
1. Choose which account to send from
2. Email appears in that account's Sent folder
3. HTML signature automatically appended

**See:** [Gmail Integration Complete](Email/GMAIL_INTEGRATION_COMPLETE.md) for Gmail setup.

### **Email Structure**
- **To:** Recipient email
- **From:** Selected Gmail account
- **Subject:** Letter subject
- **Body:** Professional introduction text
- **Attachment:** `Letter.pdf` (generated from editor content)
- **Signature:** HTML signature automatically appended

---

## 🔧 Troubleshooting

### **Issue: Editor not loading / Hydration error**
**Solution:** Ensure `immediatelyRender: false` is set in `useEditor` config.

### **Issue: PDF not generated**
**Check:**
- Django backend is running on port 8000
- Check backend logs: `/tmp/django_server.log`
- Verify ReportLab is installed: `pip list | grep reportlab`

### **Issue: Email not sending**
**Check:**
- Gmail connection is active (Settings → Gmail)
- Recipient email is valid
- Subject is provided
- Backend logs for specific error

### **Issue: PDF formatting issues**
**Note:** Current PDF generation uses basic ReportLab text rendering. For complex HTML, consider upgrading to WeasyPrint or xhtml2pdf.

---

## 📁 File Structure

```
frontend/app/components/settings/
  └── LetterComposer.tsx         # Main component

backend/letters/
  ├── __init__.py
  ├── views.py                   # API endpoints
  ├── urls.py                    # URL routing
  └── apps.py                    # App configuration

backend/ncc_api/
  ├── settings.py                # Added 'letters' to INSTALLED_APPS
  └── urls.py                    # Added '/api/letters/' route
```

---

## 🚦 Dependencies

### **Frontend**
```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-underline": "^2.x",
  "@tiptap/extension-text-align": "^2.x",
  "@tiptap/extension-text-style": "^2.x",
  "@tiptap/extension-color": "^2.x"
}
```

### **Backend**
```
reportlab>=4.2.5
Pillow>=11.0.0
```

---

## 🎯 Future Enhancements

- [ ] **Letter Templates:** Pre-defined templates for common letter types
- [ ] **Advanced HTML-to-PDF:** Integrate WeasyPrint for better formatting
- [ ] **Draft Saving:** Save letter drafts to localStorage
- [ ] **History:** View previously sent letters
- [ ] **Merge Fields:** Insert patient data from database
- [ ] **Letterhead:** Custom company letterhead with logo
- [ ] **Multiple Recipients:** Send to multiple addresses
- [ ] **Scheduled Sending:** Schedule letters for future delivery

---

## 📚 Related Documentation

- [Gmail Integration Complete](Email/GMAIL_INTEGRATION_COMPLETE.md)
- [Multi-Account Support](Email/MULTI_ACCOUNT_SUPPORT.md)
- [Email Signature](Email/EMAIL_SIGNATURE.md)
- [Tech Stack](../TECH_STACK.md)

---

## 🎉 Version History

### **v1.1.0** (October 31, 2025)
- ✅ **Added Walk Easy letterhead background** to all PDF pages
- ✅ Custom `LetterheadCanvas` for automatic letterhead rendering
- ✅ Updated template to work with letterhead
- ✅ Full-page professional branding on every page

### **v1.0.0** (October 31, 2025)
- ✅ Initial implementation
- ✅ WYSIWYG editor with TipTap
- ✅ PDF generation with ReportLab
- ✅ Email integration with Gmail API
- ✅ Multi-account support
- ✅ Professional letter template
- ✅ Fixed Next.js SSR hydration issues

---

**Letter Composer is ready to use!** 🎉

