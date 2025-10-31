# 📝 Letter Composer Documentation

Complete documentation for the Letter Composer feature - professional letter writing, PDF generation, and email integration.

---

## 📚 Documentation Index

### **Main Documentation**
- **[Letter Composer Guide](LETTER_COMPOSER.md)** - Complete feature overview, usage instructions, and technical details

---

## 🎯 Quick Links

### **Feature Overview**
The Letter Composer provides:
- ✅ WYSIWYG editor with rich text formatting
- ✅ PDF generation from HTML content
- ✅ Email integration with Gmail API
- ✅ Professional letter templates
- ✅ Multi-account Gmail support

### **Access**
- **URL:** `http://localhost:3000/settings?tab=letters`
- **Navigation:** Settings → Letter Composer

### **API Endpoints**
- `POST /api/letters/generate-pdf/` - Generate PDF from HTML
- `POST /api/letters/email/` - Email letter with PDF attachment

---

## 🚀 Quick Start

1. **Navigate to Letter Composer:**
   - Go to Settings → Letter Composer
   - Or visit: `http://localhost:3000/settings?tab=letters`

2. **Write Your Letter:**
   - Use the WYSIWYG toolbar to format text
   - Replace template placeholders with content
   - Add subject/title

3. **Download or Email:**
   - **Download PDF:** Click "Download PDF" button
   - **Email Letter:** Click "Email Letter", fill in recipient details

---

## 📖 Documentation Files

| File | Description |
|------|-------------|
| `LETTER_COMPOSER.md` | Complete guide with features, usage, and troubleshooting |

---

## 🔗 Related Documentation

- **[Gmail Integration](../Email/GMAIL_INTEGRATION_COMPLETE.md)** - Email setup and configuration
- **[Multi-Account Support](../Email/MULTI_ACCOUNT_SUPPORT.md)** - Sending from multiple Gmail accounts
- **[Email Signature](../Email/EMAIL_SIGNATURE.md)** - Automatic signature appending
- **[Tech Stack](../../TECH_STACK.md)** - Overall application technology

---

## 🛠️ Technical Stack

### **Frontend**
- **Editor:** TipTap (WYSIWYG)
- **Component:** `frontend/app/components/settings/LetterComposer.tsx`
- **UI Library:** Mantine UI

### **Backend**
- **Django App:** `backend/letters/`
- **PDF Generation:** ReportLab
- **Email Service:** Gmail API (OAuth2)

---

## 📝 Common Tasks

### **Generate PDF**
```bash
curl -X POST http://localhost:8000/api/letters/generate-pdf/ \
  -H "Content-Type: application/json" \
  -d '{
    "html_content": "<p>Letter content</p>",
    "subject": "My Letter"
  }' \
  --output letter.pdf
```

### **Send Email**
```bash
curl -X POST http://localhost:8000/api/letters/email/ \
  -H "Content-Type: application/json" \
  -d '{
    "html_content": "<p>Letter content</p>",
    "recipient_email": "recipient@example.com",
    "recipient_name": "John Smith",
    "subject": "Letter from Walk Easy",
    "connection_email": "info@walkeasy.com.au"
  }'
```

---

## 🎉 Version

**Current Version:** 1.0.0 (October 31, 2025)

---

**For detailed information, see [Letter Composer Guide](LETTER_COMPOSER.md)** 📝

