# 📋 NDIS AT Report Documentation

Complete documentation for the NDIS Assistive Technology Assessment Report system.

---

## 📚 Documentation Files

### 🎯 **Primary Guides**

1. **[AT_REPORT_COMPLETE.md](./AT_REPORT_COMPLETE.md)** ⭐ **START HERE**
   - Complete implementation guide (373 lines)
   - File structure and architecture
   - All 6 parts with field breakdowns
   - Features: AI enhancement, PDF import, dynamic lists
   - Statistics: 2,400 lines of code, 70+ fields
   - Data structures and examples
   - Backend integration roadmap
   - Testing checklist

2. **[PDF_EXTRACTION_GUIDE.md](./PDF_EXTRACTION_GUIDE.md)** 🤖 **PDF IMPORT**
   - PDF extraction and AI mapping system (469 lines)
   - Backend: `pypdf` + OpenAI GPT-4o-mini
   - API endpoint: `POST /api/ai/extract-at-report/`
   - Frontend: Drag & drop interface
   - Two report types: General AT & P&O
   - Data mapping strategies
   - Complete testing examples

3. **[PROSTHETICS_ORTHOTICS_MAPPING.md](./PROSTHETICS_ORTHOTICS_MAPPING.md)** 🦿 **P&O SPEC**
   - Maps P&O template to general AT structure (612 lines)
   - Based on real example: Scott Laird assessment
   - Part-by-part field mapping
   - Identifies gaps between P&O and general templates
   - P&O-specific fields (device specs, fabrication)
   - 6-part P&O vs 5-part General comparison

---

## 📂 Reference Materials

### **Source Templates**

4. **[Scott.pdf](./Scott.pdf)** 📄
   - Real NDIS P&O AT Assessment example
   - Participant: Scott Laird (Cockayne Syndrome)
   - Prosthetics & Orthotics specialization
   - Custom orthotic footwear assessment
   - Used as reference for P&O mapping

5. **[PB AT general template DOCX-2.docx](./PB%20AT%20general%20template%20DOCX-2.docx)** 📝
   - Official NDIS general AT template (Word)
   - Base template for form structure
   - Reference for field requirements

---

## 🎯 Quick Reference by Topic

| Topic | File | What You'll Find |
|-------|------|------------------|
| **Getting Started** | `AT_REPORT_COMPLETE.md` | Overview, architecture, all parts |
| **Form Fields** | `AT_REPORT_COMPLETE.md` | Complete field list by part |
| **AI Features** | `AT_REPORT_COMPLETE.md` (Parts 2 & 3) | How AI enhancement works |
| **PDF Import** | `PDF_EXTRACTION_GUIDE.md` | How to extract data from PDFs |
| **P&O Reports** | `PROSTHETICS_ORTHOTICS_MAPPING.md` | P&O-specific fields and mapping |
| **Backend API** | `PDF_EXTRACTION_GUIDE.md` | API endpoints and integration |
| **Testing** | `AT_REPORT_COMPLETE.md` & `PDF_EXTRACTION_GUIDE.md` | Test cases and examples |

---

## 🚀 System Overview

### **Frontend Components** (Next.js + TypeScript + Mantine UI)

```
frontend/app/components/settings/
├── ATReport.tsx                     # Main coordinator (549 lines)
└── at-report/
    ├── types.ts                     # TypeScript definitions (246 lines)
    ├── ATReportPart1.tsx           # Participant Details (335 lines)
    ├── ATReportPart2.tsx           # Assessment of Needs (571 lines) ⭐ AI
    ├── ATReportPart3.tsx           # Recommendations (1,051 lines) ⭐ AI
    ├── ATReportPart4.tsx           # Implementation (221 lines)
    └── ATReportPart5And6.tsx       # Declaration & Consent (224 lines)
```

### **Backend API** (Django REST Framework)

```python
# AI Services
POST /api/ai/rewrite-clinical-notes/     # Enhance text with AI
POST /api/ai/extract-at-report/          # Extract data from PDF

# AT Reports (TODO: Backend integration)
POST /api/at-reports/draft/              # Save draft
GET  /api/at-reports/{id}/               # Get report
POST /api/at-reports/submit/             # Submit report
POST /api/at-reports/{id}/generate-pdf/  # Generate PDF
```

---

## 📊 Key Statistics

| Metric | Value |
|--------|-------|
| **Total Code** | ~2,400 lines |
| **Form Fields** | 70+ fields |
| **Components** | 7 TypeScript files |
| **Form Parts** | 6 parts (5 steps) |
| **Dynamic Lists** | 6 types |
| **AI Features** | Parts 2 & 3 |
| **Documentation** | 1,800+ lines |

---

## 🎨 Key Features

### ✅ **Implemented**

- ✅ **6-Part NDIS AT Assessment Form** - All parts fully functional
- ✅ **70+ Form Fields** - Complete NDIS template coverage
- ✅ **AI Enhancement** - GPT-4o-mini powered text rewriting (Parts 2 & 3)
- ✅ **PDF Import** - Extract data from existing reports with AI
- ✅ **Dynamic Lists** - 6 types (AT items, risks, alternatives, etc.)
- ✅ **Save/Load Drafts** - localStorage persistence
- ✅ **Stepper Navigation** - Visual progress through 5 steps
- ✅ **Conditional Fields** - Smart form logic
- ✅ **TypeScript** - Full type safety
- ✅ **Responsive Design** - Works on all screen sizes

### ⏳ **Todo: Backend Integration**

- ⏳ Django models for AT Reports
- ⏳ Database persistence (PostgreSQL)
- ⏳ API endpoints for CRUD operations
- ⏳ PDF generation from completed reports
- ⏳ File uploads (quotations, supporting docs)
- ⏳ User authentication integration
- ⏳ Approval workflow
- ⏳ Admin review interface

---

## 🔧 How to Use

### **Access the Form**

1. Start the development servers:
   ```bash
   # Backend (Django)
   cd backend
   source venv/bin/activate
   python manage.py runserver 8000

   # Frontend (Next.js)
   cd frontend
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/settings`

3. Click the **"AT Report"** tab

### **Complete an Assessment**

1. **Part 1:** Enter participant and assessor details
2. **Part 2:** Complete assessment of needs → Click "Enhance with AI"
3. **Part 3:** Add recommendations and evidence → Click "Enhance with AI"
4. **Part 4:** Implementation and monitoring details
5. **Part 5 & 6:** Declarations and consent
6. **Submit:** Review and submit the assessment

### **Import from PDF**

1. Click **"Import from PDF"** button
2. Drag & drop or select a PDF file
3. Click **"Extract Data with AI"**
4. Review extracted data
5. Click **"Apply to Form"**

---

## 🤖 AI Features

### **Text Enhancement** (Parts 2 & 3)

Click **"Enhance All Fields with AI"** to:
- Process all non-empty fields in parallel
- Convert rough notes to professional NDIS documentation
- See before/after comparison for each field
- Selectively apply enhancements
- Add refinement prompts to regenerate specific fields

### **PDF Import** (All Parts)

Click **"Import from PDF"** to:
- Extract text from existing AT reports
- Use AI to map fields intelligently
- Populate form with extracted data
- Support both General AT and P&O reports

---

## 📝 Data Structure

The form data is stored as a single JSON object:

```typescript
interface ATReportData {
  // Part 1
  participant: ParticipantDetails;
  assessor: AssessorDetails;
  planManagement: PlanManagement;
  
  // Part 2
  background: string;
  participantGoals: string;
  functionalLimitations: FunctionalLimitation;
  height: string;
  weight: string;
  currentATList: CurrentAT[];
  
  // Part 3
  atItems: ATItem[];
  trialLocations: TrialLocation[];
  atFeatures: ATFeature[];
  alternativeOptions: AlternativeOption[];
  risks: Risk[];
  evidence: string;
  // ... 15+ more fields
  
  // Part 4
  implementationSupport: ImplementationSupport;
  // ... 9+ more fields
  
  // Part 5 & 6
  assessorDeclaration: boolean;
  consentGiven: 'yes' | 'no' | '';
  // ... 8+ more fields
}
```

---

## 🎯 For Developers

### **Adding New Fields**

1. Update `types.ts` interface
2. Add field to relevant Part component
3. Update `createEmptyATReportData()` function
4. Test AI extraction if applicable

### **Adding Dynamic Lists**

See examples in Part 2 (currentATList) and Part 3 (atItems, risks, etc.)

### **Adding AI Enhancement**

See implementation in `ATReportPart2.tsx` and `ATReportPart3.tsx`

---

## 📞 Support

For questions or issues with the AT Report system:
1. Check the documentation in this folder
2. Review the code in `frontend/app/components/settings/at-report/`
3. Check the backend API in `backend/ai_services/`

---

**Last Updated:** November 1, 2025  
**Version:** 1.0  
**Status:** ✅ Frontend Complete | ⏳ Backend Integration Pending

