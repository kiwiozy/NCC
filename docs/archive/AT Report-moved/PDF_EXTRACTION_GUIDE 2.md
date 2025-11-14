# PDF Extraction and AI Mapping Guide

**Implementation Date:** October 31, 2025  
**Status:** ✅ Fully Implemented and Tested

---

## Overview

This guide documents the complete PDF extraction and AI-powered data mapping system for NDIS AT Reports. The system uses `pypdf` for text extraction and OpenAI's GPT-4o-mini for intelligent field mapping.

---

## Architecture

### Backend Components

1. **PDF Text Extraction** (`ai_services/services.py`)
   - Uses `pypdf` library (version 5.1.0)
   - Extracts text from all pages
   - Handles both file objects and bytes

2. **AI Data Extraction** (`ai_services/services.py`)
   - OpenAI GPT-4o-mini model
   - Structured JSON output
   - Two report types supported:
     - General AT Reports
     - Prosthetics & Orthotics (P&O) Reports

3. **API Endpoint** (`ai_services/views.py`)
   - `POST /api/ai/extract-at-report/`
   - Accepts PDF file upload
   - Returns structured JSON data

### Frontend Components

1. **PDF Upload Modal** (`ATReport.tsx`)
   - Drag & drop interface using `@mantine/dropzone`
   - Progress indicator
   - Preview of extracted data

2. **Data Mapping** (`ATReport.tsx`)
   - Comprehensive field mapping
   - Handles P&O-specific fields
   - Preserves existing form data

---

## Backend Implementation

### Dependencies

```txt
openai==2.6.1
pypdf==5.1.0
```

### Service Methods

#### `extract_text_from_pdf(pdf_file) -> str`

Extracts raw text from PDF file.

**Parameters:**
- `pdf_file`: File object or bytes

**Returns:**
- String containing all extracted text with page markers

**Example Output:**
```
--- Page 1 ---
PROSTHETICS AND ORTHOTICS AT ASSESSMENT TEMPLATE
...

--- Page 2 ---
...
```

#### `extract_at_report_data(pdf_text: str, report_type: str) -> dict`

Extracts structured data from PDF text using AI.

**Parameters:**
- `pdf_text`: Extracted text from PDF
- `report_type`: "general" or "prosthetics_orthotics"

**Returns:**
- Dictionary with extracted field values

**P&O Fields (50+ fields):**
```python
{
  # Part 1 - Details
  "participant_name": "Mr. Scott Laird",
  "ndis_number": "430372789",
  "date_of_birth": "1994-08-16",
  "address": "8 Sherborne Street, North Tamworth, NSW, 2340",
  "contact_telephone": "0431 478 238",
  "assessor_name": "Jonathan Madden",
  "assessor_qualifications": "B.Ped & B.Pod, C.Ped CM Au",
  "company_name": "Walk Easy Pedorthics",
  "assessment_date": "2018-07-02",
  "report_date": "2018-07-31",
  
  # Part 2 - Goals
  "background": "...",
  "participant_goals": "...",
  
  # Part 3 - Assessment
  "height": "128",
  "weight": "40",
  "physical_limitations": "...",
  "gait_assessment": "...",
  
  # Part 5 - Recommendation
  "provision_timeframe": "4 weeks",
  "review_frequency": "Every 3-4 months",
  "maintenance_info": "...",
  
  # Part 6 - P&O Specification
  "quote_total": "6045.00",
  "quote_provider": "Walk Easy Pedorthics",
  "ongoing_repairs_cost": "195.00",
  "ongoing_repairs_frequency": "Every 3-4 months"
}
```

### API Endpoint

#### `POST /api/ai/extract-at-report/`

**Request:**
```http
POST /api/ai/extract-at-report/
Content-Type: multipart/form-data

pdf_file: <file>
report_type: "prosthetics_orthotics"  (optional, default: "general")
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "participant_name": "Mr. Scott Laird",
    "ndis_number": "430372789",
    ...
  },
  "report_type": "prosthetics_orthotics",
  "model": "gpt-4o-mini",
  "pages_extracted": 8
}
```

**Response (Error):**
```json
{
  "error": "PDF file is required"
}
```

---

## Frontend Implementation

### PDF Upload Flow

1. **User clicks "Import from PDF"** button
2. **Modal opens** with dropzone
3. **User drags/drops PDF** file
4. **User clicks "Extract Data with AI"**
5. **Progress bar** shows extraction progress
6. **Preview modal** displays extracted data
7. **User reviews** and clicks "Apply to Form"
8. **Form fields** are populated

### Code Example

```typescript
const processPdfWithAI = async () => {
  if (!pdfFile) return;

  setPdfProcessing(true);
  setPdfProgress(0);

  try {
    // Upload PDF to backend
    const formDataUpload = new FormData();
    formDataUpload.append('pdf_file', pdfFile);
    formDataUpload.append('report_type', 'prosthetics_orthotics');

    const response = await fetch('https://localhost:8000/api/ai/extract-at-report/', {
      method: 'POST',
      body: formDataUpload,
    });

    const data = await response.json();
    
    if (data.success && data.data) {
      setExtractedData(data.data);
      setPdfProgress(100);
    }
  } catch (err) {
    setPdfError('Failed to process PDF: ' + err.message);
  } finally {
    setPdfProcessing(false);
  }
};
```

### Field Mapping

The `applyExtractedData()` function maps extracted fields to the form:

**Participant Details:**
- `participant_name` → `participant.name`
- `ndis_number` → `participant.ndisNumber`
- `date_of_birth` → `participant.dateOfBirth`
- `address` → `participant.address`
- `contact_telephone` → `participant.contactTelephone`

**Assessor Details:**
- `assessor_name` → `assessor.name`
- `assessor_qualifications` → `assessor.qualifications`
- `assessment_date` → `assessor.assessmentDate`

**Content Fields:**
- `background` → `background`
- `participant_goals` → `participantGoals`
- `physical_limitations` → `functionalLimitations.physical`

---

## Testing

### Test Script

A test script is included: `backend/test_pdf_simple.py`

**Run:**
```bash
cd backend
python3 test_pdf_simple.py
```

**Test Results with Scott.pdf:**
```
✅ Extracted text from 8 pages
   Total characters: 10,487

✅ Participant Name: Found
✅ NDIS Number: Found
✅ Assessor Name: Found
✅ Company Name: Found
✅ Device Type: Found
```

### Manual Testing

1. Navigate to Settings → AT Report
2. Click "Import from PDF"
3. Upload `docs/Scott.pdf`
4. Click "Extract Data with AI"
5. Wait for processing (20-30 seconds)
6. Review extracted data in modal
7. Click "Apply to Form"
8. Verify all fields populated correctly

---

## Field Mapping Reference

### Part 1 - Details

| PDF Field | Extracted Key | Form Field |
|-----------|---------------|------------|
| Participant Name | `participant_name` | `participant.name` |
| DOB | `date_of_birth` | `participant.dateOfBirth` |
| NDIS Number | `ndis_number` | `participant.ndisNumber` |
| Address | `address` | `participant.address` |
| Phone | `contact_telephone` | `participant.contactTelephone` |
| Email | `email` | `participant.email` |
| Guardian | `nominee_name` | `participant.nomineeName` |
| Guardian Phone | `nominee_phone` | `participant.nomineePhone` |
| Coordinator | `coordinator_name` | `participant.coordinatorName` |
| Coordinator Phone | `coordinator_phone` | `participant.coordinatorPhone` |
| Coordinator Email | `coordinator_email` | `participant.coordinatorEmail` |
| Assessor Name | `assessor_name` | `assessor.name` |
| Qualifications | `assessor_qualifications` | `assessor.qualifications` |
| Assessor Phone | `assessor_telephone` | `assessor.telephone` |
| Assessor Email | `assessor_email` | `assessor.email` |
| Registration # | `assessor_registration_number` | `assessor.registrationNumber` |
| Assessment Date | `assessment_date` | `assessor.assessmentDate` |
| Report Date | `report_date` | `assessor.reportDate` |
| Company Name | `company_name` | *(Future field)* |

### Part 2 - Goals

| PDF Section | Extracted Key | Form Field |
|-------------|---------------|------------|
| Background Information | `background` | `background` |
| Participant's Goals | `participant_goals` | `participantGoals` |

### Part 3 - Assessment

| PDF Field | Extracted Key | Form Field |
|-----------|---------------|------------|
| Height | `height` | `height` |
| Weight | `weight` | `weight` |
| Physical Limitations | `physical_limitations` | `functionalLimitations.physical` |
| Sensory Limitations | `sensory_limitations` | `functionalLimitations.sensory` |
| Communication | `communication_limitations` | `functionalLimitations.communication` |
| Cognitive | `cognitive_limitations` | `functionalLimitations.cognitive` |
| Behavioural | `behavioural_limitations` | `functionalLimitations.behavioural` |
| Other | `other_limitations` | `functionalLimitations.other` |
| Gait Assessment | `gait_assessment` | *(Future field)* |

### Part 5 - Recommendation

| PDF Field | Extracted Key | Form Field |
|-----------|---------------|------------|
| Provision Timeframe | `provision_timeframe` | `provisionTimeframe` |
| Review Frequency | `review_frequency` | `reviewFrequency` |
| Maintenance Info | `maintenance_info` | `maintenanceInfo` |

---

## AI Prompts

### System Prompt (P&O)

```
You are an expert at extracting structured data from NDIS Prosthetics & Orthotics (P&O) 
Assistive Technology assessment reports.

Your task is to carefully read the P&O AT report and extract the requested information 
into a JSON format.

Guidelines:
1. Extract information exactly as it appears in the document
2. For dates, convert to YYYY-MM-DD format (e.g., "2/7/2018" becomes "2018-07-02")
3. For currency amounts, extract only the number (e.g., "$5,850.00" becomes "5850.00")
4. For multi-line text fields, preserve the full text content
5. Use empty string "" for any fields not found in the document
6. For boolean fields (plan management), use true if the option is checked/indicated
7. Be thorough - look for information across all pages including quote attachments
8. Pay special attention to:
   - Clinical assessment details (gait, mobility, measurements)
   - Device specifications and features
   - Quote information and costs
   - Ongoing maintenance requirements
9. Do not invent or infer information that is not explicitly stated
```

---

## Error Handling

### Backend Errors

| Error | HTTP Status | Response |
|-------|-------------|----------|
| Missing PDF file | 400 | `{"error": "PDF file is required"}` |
| Invalid file type | 400 | `{"error": "File must be a PDF"}` |
| No text extracted | 400 | `{"error": "No text could be extracted from the PDF"}` |
| OpenAI API error | 500 | `{"error": "OpenAI extraction error: ..."}` |
| API key not configured | 503 | `{"error": "...", "message": "OpenAI API key not configured"}` |

### Frontend Error Display

Errors are displayed in the PDF modal using Mantine's Alert component:

```tsx
{pdfError && (
  <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
    {pdfError}
  </Alert>
)}
```

---

## Performance

### Typical Processing Times

- **PDF Text Extraction:** 1-2 seconds
- **AI Processing:** 15-25 seconds
- **Total Time:** 20-30 seconds

### Optimization Tips

1. **Lower temperature** (0.3) for more accurate extraction
2. **Structured JSON output** using `response_format`
3. **Efficient token usage** with focused prompts
4. **Page markers** for debugging

---

## Future Enhancements

### Planned Features

1. **Report Type Selector**
   - Let user choose "General" vs "P&O" before upload
   - Show appropriate fields based on selection

2. **Batch Processing**
   - Upload multiple PDFs at once
   - Process in background

3. **Confidence Scores**
   - AI provides confidence level for each extracted field
   - Highlight low-confidence fields for review

4. **Image Extraction**
   - Extract images from PDF (Part 6 - P&O images)
   - Store in S3
   - Display in form

5. **OCR Support**
   - Handle scanned PDFs without text layer
   - Use OCR + AI extraction

6. **Validation Rules**
   - Check NDIS number format
   - Validate dates
   - Check required fields

---

## Troubleshooting

### PDF extraction returns empty text

**Cause:** PDF might be scanned image without text layer

**Solution:** Use OCR preprocessing (future feature)

### AI extraction misses fields

**Cause:** Field names in PDF differ from expected format

**Solution:** Update extraction prompts with more examples

### Server error during processing

**Check:**
1. OpenAI API key is set in `.env`
2. `pypdf` is installed in virtual environment
3. Django server logs: `tail -f /tmp/django.log`

---

## Related Documents

- **PROSTHETICS_ORTHOTICS_MAPPING.md** - Detailed P&O field mapping guide
- **OPENAI_INTEGRATION.md** - General OpenAI setup and usage
- **SCRAPER_PATTERNS_GUIDE.md** - External API integration patterns

---

**Status:** ✅ Production Ready  
**Last Updated:** October 31, 2025  
**Author:** AI Assistant + Craig

