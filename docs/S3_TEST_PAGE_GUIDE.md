# 🧪 S3 Test Page - Quick Guide

## 📍 **Access the S3 Test Page**

1. Open your browser and navigate to:
   ```
   https://localhost:3000/settings
   ```

2. Click on the **"S3 Storage"** tab

---

## ✨ **Features**

### 1. Connection Status
- Shows if S3 bucket is accessible
- Displays bucket name and region
- Real-time status check

### 2. Upload Documents
- **Select File:** Click "Choose a file to upload" to select any file
- **Category:** Choose from 9 document categories:
  - Medical Records
  - Prescription
  - Referral Letter
  - X-Ray / Imaging
  - Invoice
  - Quote
  - Consent Form
  - Insurance Document
  - Other
- **Description:** Add optional notes about the document
- **Upload:** Click "Upload to S3" button
- **Progress Bar:** Shows upload progress in real-time

### 3. View Uploaded Documents
- **Table View:** See all uploaded documents
- **Details:** File name, category, size, type, uploader, date
- **Document Count:** Badge showing total documents
- **Refresh:** Update the list of documents

### 4. Document Actions
- **Download:** Click download icon to get a secure download link (valid for 1 hour)
- **Delete:** Click trash icon to remove document from both database and S3

---

## 🧪 **Quick Test Workflow**

### Test 1: Upload a Text File
```bash
# Create a test file
echo "This is a test document for S3!" > test-file.txt
```

1. Go to https://localhost:3000/settings → S3 Storage
2. Click "Choose a file" and select `test-file.txt`
3. Select category: "Other"
4. Add description: "Test upload"
5. Click "Upload to S3"
6. ✅ Should see success message with file ID

### Test 2: Upload a PDF
1. Select any PDF file from your computer
2. Choose category: "Medical Records"
3. Add description: "Sample medical record"
4. Click "Upload to S3"
5. ✅ Should appear in documents table

### Test 3: Download a Document
1. Find your uploaded document in the table
2. Click the download icon (↓)
3. ✅ File should download to your browser

### Test 4: Delete a Document
1. Find your uploaded document in the table
2. Click the trash icon (🗑️)
3. Confirm deletion
4. ✅ Document should disappear from table

---

## 📊 **What You're Testing**

### Backend Components:
- ✅ S3Service (boto3 integration)
- ✅ Document model (database storage)
- ✅ REST API endpoints
- ✅ File upload handling
- ✅ Pre-signed URL generation
- ✅ File deletion

### Frontend Components:
- ✅ File input handling
- ✅ Form submission
- ✅ Progress tracking
- ✅ Document listing
- ✅ Download/delete actions
- ✅ Error handling
- ✅ Success notifications

### AWS S3:
- ✅ Bucket connectivity
- ✅ File upload to S3
- ✅ File download from S3
- ✅ File deletion from S3
- ✅ Pre-signed URLs
- ✅ Region-specific endpoints

---

## 🎯 **Expected Results**

### Connection Status Section:
```
✅ Connected to AWS S3
Bucket: nexus-core-clinic-documents
Region: ap-southeast-2
```

### After Upload:
```
✅ File uploaded successfully! File ID: 9074961a-709f-4e84-9b00-c639b7048c51
```

### Documents Table:
| File Name | Category | Size | Type | Uploaded By | Date | Actions |
|-----------|----------|------|------|-------------|------|---------|
| test-file.txt | Other | 34 bytes | text/plain | test_user | Oct 30 | ↓ 🗑️ |

---

## 🐛 **Troubleshooting**

### "Connection Failed" Error
- Check if backend is running: `https://localhost:8000`
- Verify `.env` file has AWS credentials
- Check S3 bucket exists

### Upload Fails
- Check file size (default max: 100MB)
- Verify S3 bucket permissions
- Check browser console for errors

### Download Returns 403
- Pre-signed URL may have expired (1 hour limit)
- Refresh the document list and try again

### Delete Doesn't Work
- Check backend console for errors
- Verify document ID is correct
- Ensure S3 delete permissions are set

---

## 💡 **Tips**

1. **Test Different File Types:**
   - Text files (.txt)
   - PDFs (.pdf)
   - Images (.jpg, .png)
   - Documents (.docx, .xlsx)

2. **Test File Sizes:**
   - Small files (< 1MB)
   - Medium files (1-10MB)
   - Large files (> 10MB)

3. **Test Categories:**
   - Try all 9 document categories
   - Verify they display correctly in the table

4. **Test Error Handling:**
   - Try uploading without selecting a file
   - Try uploading when backend is down
   - Try downloading a deleted file

---

## 🎊 **Success Indicators**

You'll know S3 integration is working perfectly when:

- ✅ Green "Connected to AWS S3" status appears
- ✅ Files upload without errors
- ✅ Progress bar reaches 100%
- ✅ Documents appear in the table immediately
- ✅ Download icon opens pre-signed URL
- ✅ Downloaded files match uploaded files
- ✅ Deleted documents disappear from table
- ✅ No console errors

---

## 📈 **Next Steps**

After testing, you can:

1. **Integrate with Contacts:**
   - Link documents to patients
   - Add document upload to contact pages
   - Show patient documents in detail view

2. **Add More Features:**
   - Document preview (thumbnails)
   - Batch upload (multiple files)
   - Document search
   - Document sharing

3. **Production Deployment:**
   - Set up production S3 bucket
   - Configure CloudFront CDN
   - Enable S3 versioning
   - Set up lifecycle policies

---

**Last Updated:** October 30, 2025  
**Status:** ✅ Ready for Testing

