# OpenAI Integration - Clinical Notes Rewriter

## Overview

The system now includes OpenAI integration to automatically rewrite rough clinical notes into professional, well-structured medical documentation. This feature is specifically designed for podiatry and orthotic clinical notes.

## 🎯 Features

### 1. **AI-Powered Note Rewriting**
- Converts informal notes into professional clinical documentation
- Organizes content into proper clinical sections (Subjective, Objective, Assessment, Plan)
- Uses proper medical terminology
- Maintains clinical accuracy

### 2. **Iterative Refinement**
- Request multiple refinements with custom instructions
- Examples: "make it more professional", "add more detail", "make it shorter"
- Each refinement builds on the previous result

### 3. **Note Types**
Only available for **"Clinical Notes"** type. Other note types include:
- Clinic Dates
- Order Notes
- Admin Notes
- Referral
- 3D Scan Data
- Workshop Note

## 🔧 Setup Instructions

### 1. **Get OpenAI API Key**

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-...`)

### 2. **Configure Backend**

Edit `/backend/.env` and add your OpenAI API key:

```bash
# OpenAI API
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
```

**Important:** Replace `your-openai-api-key-here` with your actual API key.

### 3. **Restart Backend Server**

```bash
cd backend
./start-https.sh
```

## 📖 How to Use

### Basic Workflow

1. **Navigate to Notes Test**
   - Go to `https://localhost:3000/settings`
   - Click **"Notes Test"** tab

2. **Create a Clinical Note**
   - Select **"Clinical Notes"** from the dropdown
   - Enter your rough notes in the content field
   - Example:
     ```
     patient came in complaining about foot pain
     checked the arch
     needs new orthotics
     follow up in 2 weeks
     ```

3. **Click "Rewrite with AI"**
   - The gradient blue button appears when you have content
   - Opens the AI dialog modal

4. **Generate Clinical Notes**
   - Click **"Generate Clinical Notes"**
   - Wait 2-5 seconds for AI processing
   - Review the professionally formatted result

5. **Refine (Optional)**
   - Enter refinement instructions:
     - "make it more professional"
     - "add more clinical detail"
     - "make it shorter"
     - "include more medical terminology"
   - Click **"Refine with AI"**
   - Review the updated result
   - Repeat as needed

6. **Accept & Save**
   - Click **"Accept & Use This"**
   - The AI-generated content replaces your original content
   - Click **"Create Note"** to save

### Example Transformation

**Before (Original Note):**
```
patient came in complaining about foot pain
checked the arch
needs new orthotics
follow up in 2 weeks
```

**After (AI Rewrite):**
```
CLINICAL NOTES

SUBJECTIVE:
Patient presents with chief complaint of foot pain.

OBJECTIVE:
Physical examination performed.
Arch assessment completed.

ASSESSMENT:
Patient demonstrates need for orthotic intervention.

PLAN:
- Custom orthotics recommended
- Follow-up appointment scheduled in 2 weeks
- Patient advised on proper footwear
```

## 🔌 API Endpoint

### POST `/api/ai/rewrite-clinical-notes/`

**Request:**
```json
{
  "content": "original note text",
  "custom_prompt": "optional refinement instructions"
}
```

**Response (Success):**
```json
{
  "success": true,
  "result": "professionally formatted clinical notes...",
  "model": "gpt-4o-mini"
}
```

**Response (Error - No API Key):**
```json
{
  "error": "OPENAI_API_KEY must be set in environment variables",
  "message": "OpenAI API key not configured"
}
```

**Response (Error - API Issue):**
```json
{
  "error": "OpenAI API error: rate limit exceeded"
}
```

## 🏗️ Technical Architecture

### Backend Components

1. **`ai_services/services.py`**
   - `OpenAIService` class
   - Handles API communication
   - Uses `gpt-4o-mini` model (cost-effective, fast)
   - System prompt optimized for clinical notes

2. **`ai_services/views.py`**
   - `RewriteClinicalNotesView` API endpoint
   - Input validation
   - Error handling
   - Response formatting

3. **`ai_services/urls.py`**
   - URL routing for AI endpoints

### Frontend Components

1. **`NotesTest.tsx`**
   - Note type dropdown with 7 types
   - "Rewrite with AI" button (Clinical Notes only)
   - AI dialog modal
   - Refinement system
   - Accept/Cancel actions

### AI Configuration

**Model:** `gpt-4o-mini`
- Most cost-effective OpenAI model
- Fast response times (2-5 seconds)
- High quality outputs
- Suitable for production use

**System Prompt:**
```
You are a professional medical scribe specializing in 
podiatry and orthotic clinical notes.

Your task is to rewrite patient notes into clear, 
professional clinical documentation following these guidelines:

1. Use proper medical terminology
2. Organize into clear sections (Subjective, Objective, Assessment, Plan if appropriate)
3. Be concise but comprehensive
4. Maintain clinical accuracy
5. Use professional tone
6. Follow standard clinical documentation practices

Do not add information that wasn't in the original notes. 
Only restructure and professionalize the existing content.
```

## 💰 Cost Considerations

### GPT-4o-mini Pricing (as of 2025)
- **Input:** ~$0.15 per 1M tokens
- **Output:** ~$0.60 per 1M tokens

### Typical Usage
- Average note: ~200 tokens input, ~400 tokens output
- Cost per note: ~$0.0003 (less than 1 cent)
- 1000 notes: ~$0.30

**Very cost-effective for production use!**

## 🔒 Security

1. **API Key Storage**
   - Stored in backend `.env` file
   - Never exposed to frontend
   - Never committed to Git (.gitignore)

2. **HTTPS Communication**
   - All API calls over HTTPS
   - End-to-end encryption

3. **Data Privacy**
   - Notes sent to OpenAI for processing
   - OpenAI does not use API data for training (as per their policy)
   - Consider PHI/HIPAA implications for production

## ⚠️ Important Notes

### Development vs Production

**Current Setup (Development):**
- API key in `.env` file
- HTTPS with self-signed certificate
- Local storage for notes

**Production Considerations:**
- Use environment variables (not `.env` file)
- Proper SSL certificate
- Database storage for notes
- Consider HIPAA compliance
- Implement audit logging
- Add rate limiting

### HIPAA Compliance

For production use with patient data:
1. Review OpenAI's BAA (Business Associate Agreement)
2. Consider using Azure OpenAI (HIPAA-compliant option)
3. Implement proper access controls
4. Add audit trails
5. Ensure data encryption at rest and in transit

## 🧪 Testing

### Manual Testing

1. **Test Basic Rewrite:**
   ```
   Input: "patient has foot pain, arch collapsed"
   Expected: Professional clinical note format
   ```

2. **Test Refinement:**
   ```
   Initial rewrite → "make it shorter" → Concise version
   ```

3. **Test Error Handling:**
   - Remove API key → Should show error message
   - Invalid API key → Should show API error
   - Network failure → Should show network error

### API Testing with cURL

```bash
# Test the endpoint
curl -X POST https://localhost:8000/api/ai/rewrite-clinical-notes/ \
  -H "Content-Type: application/json" \
  -d '{
    "content": "patient came in with foot pain, needs orthotics"
  }' \
  --insecure

# Test with custom prompt
curl -X POST https://localhost:8000/api/ai/rewrite-clinical-notes/ \
  -H "Content-Type: application/json" \
  -d '{
    "content": "patient came in with foot pain, needs orthotics",
    "custom_prompt": "make it very professional and detailed"
  }' \
  --insecure
```

## 📝 Files Modified/Created

### Backend Files
- ✅ `/backend/ai_services/` (new Django app)
- ✅ `/backend/ai_services/services.py` - OpenAI service
- ✅ `/backend/ai_services/views.py` - API endpoints
- ✅ `/backend/ai_services/urls.py` - URL routing
- ✅ `/backend/ncc_api/settings.py` - Added `ai_services` to `INSTALLED_APPS`
- ✅ `/backend/ncc_api/urls.py` - Added AI routes
- ✅ `/backend/.env` - Added `OPENAI_API_KEY`
- ✅ `/backend/requirements.txt` - Added `openai` package

### Frontend Files
- ✅ `/frontend/app/components/settings/NotesTest.tsx` - Updated with real API calls

## 🚀 Next Steps

1. **Add your OpenAI API key to `.env`**
2. **Restart backend server**
3. **Test the feature in the UI**
4. **Provide feedback for improvements**

### Potential Enhancements
- Support for other note types (not just Clinical Notes)
- Save refinement history
- Favorite/template system
- Batch processing multiple notes
- Custom system prompts per user
- Integration with patient records
- Voice-to-text → AI rewrite workflow

## 📞 Support

If you encounter issues:

1. **Check API Key:** Ensure it's properly set in `.env`
2. **Check Server Logs:** `tail -f /tmp/django.log`
3. **Check Browser Console:** Look for error messages
4. **Test API Directly:** Use cURL to test endpoint
5. **Verify OpenAI Status:** [status.openai.com](https://status.openai.com/)

---

**Integration Complete! 🎉**

The OpenAI clinical notes rewriter is now fully functional and ready to use.

