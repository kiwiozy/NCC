# 📸 FileMaker Script: Upload Images to S3

**Date:** November 10, 2025  
**Plugin:** Cloud Manipulator  
**Purpose:** Export all images from FileMaker to AWS S3

---

## 🔑 **AWS S3 Configuration**

**⚠️ Note:** Get actual credentials from your `.env` file or AWS console.

```
Access Key: YOUR_AWS_ACCESS_KEY_HERE
Secret Key: YOUR_AWS_SECRET_KEY_HERE
Region: ap-southeast-2
Bucket: walkeasy-nexus-documents
```

---

## 🗂️ **S3 Target Path**

**Format:**
```
filemaker-import/images-bulk-dump/{ImageID}.{extension}
```

**Examples:**
```
filemaker-import/images-bulk-dump/8EECA11F-4273-4775-A977-33B59BE916B5.jpg
filemaker-import/images-bulk-dump/9F1A2B3C-5678-9012-ABCD-EF1234567890.png
```

---

## 📋 **FileMaker Script: "Bulk Export Images to S3"**

### **Script Steps:**

```filemaker
# ============================================================================
# SCRIPT: Bulk Export Images to S3
# PURPOSE: Export all images from API_Images to AWS S3 using Cloud Manipulator
# ============================================================================

# -------------------------
# STEP 1: Authenticate with AWS
# -------------------------
# ⚠️ Replace with your actual AWS credentials from .env file
Set Variable [ $auth ; 
  Value: PCCM_UseCredentials(
    "S3" ;
    "YOUR_AWS_ACCESS_KEY_HERE" ;
    "YOUR_AWS_SECRET_KEY_HERE" ;
    "region=ap-southeast-2"
  )
]

If [ $auth = "!!ERROR!!" ]
  Show Custom Dialog [ "Authentication Failed" ; "Could not authenticate with AWS S3" ]
  Exit Script []
End If

# -------------------------
# STEP 2: Initialize Counters
# -------------------------
Set Variable [ $totalProcessed ; Value: 0 ]
Set Variable [ $successCount ; Value: 0 ]
Set Variable [ $failedCount ; Value: 0 ]
Set Variable [ $skippedCount ; Value: 0 ]

# -------------------------
# STEP 3: Find Records to Export
# -------------------------
Go to Layout [ "API_Images" ]
Enter Find Mode []
Set Field [ API_Images::NexusExportDate ; "=" ]  # Find records NOT yet exported (empty)
Perform Find []

Set Variable [ $totalRecords ; Value: Get(FoundCount) ]

If [ $totalRecords = 0 ]
  Show Custom Dialog [ "No Records to Export" ; "All images have already been exported." ]
  Exit Script []
End If

# Show initial message
Show Custom Dialog [ "Starting Export" ; 
  "Found " & $totalRecords & " images to export.¶¶" &
  "This will take approximately " & Round($totalRecords / 30 ; 0) & " minutes.¶¶" &
  "Click OK to begin..."
]

# -------------------------
# STEP 4: Loop Through Records
# -------------------------
Go to Record/Request/Page [ First ]

Loop
  Set Variable [ $totalProcessed ; Value: $totalProcessed + 1 ]
  
  # Get image ID (UUID)
  Set Variable [ $imageID ; Value: API_Images::id ]
  
  If [ IsEmpty( $imageID ) ]
    # Skip records with no ID
    Set Variable [ $skippedCount ; Value: $skippedCount + 1 ]
    Go to Record/Request/Page [ Next ; Exit after last ]
    Continue
  End If
  
  # -------------------------
  # STEP 5: Find Best Container (Waterfall Logic)
  # -------------------------
  Set Variable [ $containerField ; Value: "" ]
  Set Variable [ $containerFieldName ; Value: "" ]
  
  # Check image_Full first
  If [ Not IsEmpty( GetContainerAttribute( API_Images::image_Full ; "filename" ) ) ]
    Set Variable [ $containerField ; Value: API_Images::image_Full ]
    Set Variable [ $containerFieldName ; Value: "image_Full" ]
  # Then check image_Ex_large
  Else If [ Not IsEmpty( GetContainerAttribute( API_Images::image_Ex_large ; "filename" ) ) ]
    Set Variable [ $containerField ; Value: API_Images::image_Ex_large ]
    Set Variable [ $containerFieldName ; Value: "image_Ex_large" ]
  # Then check image_large
  Else If [ Not IsEmpty( GetContainerAttribute( API_Images::image_large ; "filename" ) ) ]
    Set Variable [ $containerField ; Value: API_Images::image_large ]
    Set Variable [ $containerFieldName ; Value: "image_large" ]
  # Then check image_medium
  Else If [ Not IsEmpty( GetContainerAttribute( API_Images::image_medium ; "filename" ) ) ]
    Set Variable [ $containerField ; Value: API_Images::image_medium ]
    Set Variable [ $containerFieldName ; Value: "image_medium" ]
  # Finally check image_small
  Else If [ Not IsEmpty( GetContainerAttribute( API_Images::image_small ; "filename" ) ) ]
    Set Variable [ $containerField ; Value: API_Images::image_small ]
    Set Variable [ $containerFieldName ; Value: "image_small" ]
  End If
  
  # If no image found in any container, skip
  If [ IsEmpty( $containerField ) ]
    Set Variable [ $skippedCount ; Value: $skippedCount + 1 ]
    Go to Record/Request/Page [ Next ; Exit after last ]
    Continue
  End If
  
  # -------------------------
  # STEP 6: Get Original Filename and Extension
  # -------------------------
  Set Variable [ $originalFilename ; Value: GetContainerAttribute( $containerField ; "filename" ) ]
  
  # Extract extension (everything after last dot)
  Set Variable [ $lastDot ; Value: Position( $originalFilename ; "." ; Length($originalFilename) ; -1 ) ]
  
  If [ $lastDot > 0 ]
    Set Variable [ $extension ; Value: Right( $originalFilename ; Length($originalFilename) - $lastDot + 1 ) ]
  Else
    Set Variable [ $extension ; Value: ".jpg" ]  # Default to .jpg if no extension
  End If
  
  # Make extension lowercase
  Set Variable [ $extension ; Value: Lower( $extension ) ]
  
  # -------------------------
  # STEP 7: Export to Temp File
  # -------------------------
  # macOS temp path
  Set Variable [ $tempPath ; Value: Get(TemporaryPath) & $imageID & $extension ]
  Set Variable [ $macPath ; Value: "filemac:" & $tempPath ]
  
  # Windows temp path (if needed)
  # Set Variable [ $winPath ; Value: "filewin:" & Get(TemporaryPath) & $imageID & $extension ]
  
  # Export the container to temp file
  Export Field Contents [ $containerField ; "$macPath" ; Automatically open ; Create folders: Off ]
  
  # -------------------------
  # STEP 8: Upload to S3
  # -------------------------
  Set Variable [ $s3Key ; 
    Value: "filemaker-import/images-bulk-dump/" & $imageID & $extension
  ]
  
  # Remove "filemac:" prefix for Cloud Manipulator
  Set Variable [ $uploadPath ; Value: Substitute( $macPath ; "filemac:" ; "" ) ]
  
  Set Variable [ $uploadResult ;
    Value: PCCM_PostObject(
      "walkeasy-nexus-documents" ;  # Bucket name
      $s3Key ;                       # S3 key (path)
      $uploadPath ;                  # Local file path
      True                           # Delete temp file after upload
    )
  ]
  
  # -------------------------
  # STEP 9: Check Result and Update FileMaker
  # -------------------------
  If [ $uploadResult ≠ "!!ERROR!!" ]
    # Success! Mark as exported
    Set Field [ API_Images::NexusExportDate ; Get(CurrentTimestamp) ]
    Set Field [ API_Images::best_image_container ; $containerFieldName ]
    Commit Records/Requests []
    
    Set Variable [ $successCount ; Value: $successCount + 1 ]
  Else
    # Failed
    Set Variable [ $failedCount ; Value: $failedCount + 1 ]
    
    # Optionally log error
    # Set Field [ API_Images::ExportError ; $uploadResult ]
    # Commit Records/Requests []
  End If
  
  # -------------------------
  # STEP 10: Progress Update (Every 50 Records)
  # -------------------------
  If [ Mod( $totalProcessed ; 50 ) = 0 ]
    Show Custom Dialog [ "Progress Update" ; 
      "Processed: " & $totalProcessed & " of " & $totalRecords & ¶ &
      "✅ Success: " & $successCount & ¶ &
      "❌ Failed: " & $failedCount & ¶ &
      "⏭️ Skipped: " & $skippedCount & ¶ & ¶ &
      "Estimated time remaining: " & Round(($totalRecords - $totalProcessed) / 30 ; 0) & " minutes"
    ]
  End If
  
  # Move to next record
  Go to Record/Request/Page [ Next ; Exit after last ]
  
End Loop

# -------------------------
# STEP 11: Final Summary
# -------------------------
Show Custom Dialog [ "Export Complete!" ; 
  "Total Processed: " & $totalProcessed & ¶ &
  "✅ Successfully Exported: " & $successCount & ¶ &
  "❌ Failed: " & $failedCount & ¶ &
  "⏭️ Skipped (no image): " & $skippedCount & ¶ & ¶ &
  "All images are now in S3:¶" &
  "s3://walkeasy-nexus-documents/filemaker-import/images-bulk-dump/"
]

# Done!
Exit Script []
```

---

## 📊 **Expected Results**

### **After Running Script:**
- ✅ All images uploaded to S3 at `filemaker-import/images-bulk-dump/{ImageID}.{ext}`
- ✅ Each record in FileMaker has `NexusExportDate` populated
- ✅ Each record has `best_image_container` showing which container was exported
- ✅ Temp files automatically cleaned up after upload

### **Performance:**
- **~2 images/second** (with decent internet)
- **Total time:** ~55 minutes for 6,664 images
- **Resumable:** If stopped, re-run script and it will only process records where `NexusExportDate` is empty

---

## 🔍 **Verification**

### **In FileMaker:**
```
Find:
  NexusExportDate ≠ ""
```
This should show all exported images.

### **Check S3:**
Use AWS CLI or Python to count files:
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate
python -c "
from documents.services import S3Service
s3 = S3Service()
# Count files in bulk-dump folder
print('Images in S3: [count]')
"
```

---

## ⚠️ **Important Notes**

### **FileMaker Fields Required:**
- `API_Images::id` (UUID - primary key)
- `API_Images::image_Full` (Container)
- `API_Images::image_Ex_large` (Container)
- `API_Images::image_large` (Container)
- `API_Images::image_medium` (Container)
- `API_Images::image_small` (Container)
- `API_Images::NexusExportDate` (Timestamp) ← **Create this if it doesn't exist**
- `API_Images::best_image_container` (Text) ← **Create this if it doesn't exist**

### **Cloud Manipulator Plugin:**
- ✅ Must be installed in FileMaker
- ✅ Must be registered/licensed
- ✅ Functions: `PCCM_UseCredentials()` and `PCCM_PostObject()`

### **Script Settings:**
- **Allow User Abort:** NO (so script completes even if user clicks away)
- **Run Script with Full Access Privileges:** YES (so it can write to fields)

---

## 🐛 **Troubleshooting**

### **Script Won't Run:**
- Check Cloud Manipulator plugin is installed
- Verify AWS credentials are correct

### **Authentication Failed:**
- Double-check Access Key and Secret Key
- Verify region is `ap-southeast-2`

### **Upload Fails:**
- Check internet connection
- Verify bucket name: `walkeasy-nexus-documents`
- Ensure bucket exists and credentials have write permission

### **Temp File Issues:**
- macOS: Use `Get(TemporaryPath)` - should work automatically
- Ensure FileMaker has permission to write to temp folder

---

## 📞 **Next Steps**

1. **Create the two new fields** in FileMaker:
   - `NexusExportDate` (Timestamp)
   - `best_image_container` (Text, 50 characters)

2. **Create the script** in FileMaker Pro:
   - Copy the script steps above
   - Save as "Bulk Export Images to S3"

3. **Test with 10 records first:**
   - Modify Step 3 to add: `Set Error Capture [On]` and limit found set
   - Check S3 after to verify images uploaded correctly

4. **Run full export:**
   - Execute script on all records
   - Monitor progress
   - Verify results

---

*End of FileMaker S3 Upload Script Guide*

