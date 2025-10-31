# 🚀 Nexus Core Clinic - Tech Stack

**Modern full-stack patient management system for Walk Easy Pedorthics**

---

## 🎨 **Frontend**

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Mantine UI v7** - Component library
- **React 18** - UI library
- **Port:** `3000`

---

## 💾 **Backend**

- **Django 4.2** - Python web framework
- **Django REST Framework** - RESTful API
- **SQLite** - Database (development)
- **Python 3.9+** - Programming language
- **Port:** `8000`

---

## 🔌 **Integrations**

### **Email**
- **Gmail API** - OAuth2 email sending
- **Google Cloud Platform** - OAuth2 credentials
- **SMTP** - Fallback email delivery

### **AI Services**
- **OpenAI GPT-4o-mini** - Clinical note enhancement, PDF extraction
- **ReportLab** - PDF generation for AT Reports

### **Accounting**
- **Xero API** - OAuth2 invoicing & contact sync

### **Messaging**
- **Twilio** - SMS messaging

### **Storage**
- **AWS S3** - Secure document storage

### **Database**
- **FileMaker Pro** - Legacy database integration (via Data API)

---

## 📦 **Key Libraries**

### **Frontend**
- `@mantine/core`, `@mantine/hooks` - UI components
- `@tabler/icons-react` - Icon library
- `next` - Framework
- `react`, `react-dom` - Core React

### **Backend**
- `django`, `djangorestframework` - API framework
- `requests` - HTTP client
- `Pillow` - Image processing
- `reportlab` - PDF generation
- `google-auth`, `google-api-python-client` - Gmail integration
- `boto3` - AWS S3 integration
- `openai` - AI services

---

## 🛠️ **Development Tools**

- **Git** - Version control
- **GitHub** - Repository hosting
- **npm** - Frontend package manager
- **pip** - Python package manager
- **venv** - Python virtual environment

---

## 🌐 **Architecture**

```
┌─────────────────────────────────────────┐
│         Frontend (Next.js)              │
│           Port: 3000                    │
│  ┌─────────────────────────────────┐   │
│  │  Components                     │   │
│  │  - Navigation with submenus     │   │
│  │  - Settings pages (8 tabs)      │   │
│  │  - AT Report form (5 steps)     │   │
│  │  - Gmail integration UI          │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │ HTTP/REST API
               ▼
┌─────────────────────────────────────────┐
│         Backend (Django)                │
│           Port: 8000                    │
│  ┌─────────────────────────────────┐   │
│  │  API Endpoints                  │   │
│  │  - /api/ai/*                    │   │
│  │  - /gmail/*                     │   │
│  │  - /xero/*                      │   │
│  │  - /sms/*                       │   │
│  │  - /s3/*                        │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌──────────┐    ┌──────────────┐
│ SQLite   │    │ Integrations │
│ Database │    │ - Gmail API  │
└──────────┘    │ - OpenAI API │
                │ - Xero API   │
                │ - Twilio API │
                │ - AWS S3     │
                │ - FileMaker  │
                └──────────────┘
```

---

## 📊 **Local URLs**

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Django Admin:** http://localhost:8000/admin
- **API Docs:** http://localhost:8000/api/

---

## 🎯 **Core Features**

✅ Multi-step AT Report form with PDF generation  
✅ Gmail OAuth2 with multi-account support  
✅ Professional email signatures  
✅ Letter Composer with WYSIWYG editor  
✅ AI-powered clinical note enhancement  
✅ NDIS-branded PDF reports  
✅ Xero invoicing automation  
✅ SMS patient notifications  
✅ S3 document storage  
✅ Navigation with hover submenus  

---

**Built for Walk Easy Pedorthics** 🦶

