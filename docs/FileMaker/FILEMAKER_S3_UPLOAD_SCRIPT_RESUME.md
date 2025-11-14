# 📸 FileMaker Script: Upload Images to S3 (RESUME VERSION)

**Date:** November 13, 2025  
**Status:** ✅ UPDATED FOR RESUME CAPABILITY  
**Plugin:** Cloud Manipulator  
**Purpose:** Resume image export - skips already uploaded images

---

## 🔄 **What's New: Resume Capability**

This version **skips images that are already uploaded** by checking the `NexusExportDate` field:
- ✅ If `NexusExportDate` is NOT empty → Skip (already uploaded)
- ✅ If `NexusExportDate` is empty → Upload to S3
- ✅ Perfect for resuming after crashes or interruptions

---

## 📋 **FileMaker Script: "Bulk Upload Images to S3 (Resume)"**

### **✅ UPDATED VERSION - Skips Already Uploaded Images**

```filemaker
# ============================================================================
# SCRIPT: Bulk Upload Images to S3 (Resume)
# PURPOSE: Loop through images and upload only those NOT yet uploaded
# CHANGE: Uses NexusExportDate to skip already-uploaded images
# ============================================================================

Allow User Abort [ Off ]
Set Error Capture [ On ]

# AWS Credentials
Set Variable [ $gAPIKey ; Value: "YOUR_AWS_ACCESS_KEY_ID" ]
Set Variable [ $gAPISecret ; Value: "YOUR_AWS_SECRET_ACCESS_KEY" ]
Set Variable [ $gBucket ; Value: "walkeasy-nexus-documents" ]
Set Variable [ $gRegion ; Value: "ap-southeast-2" ]

# TEST MODE: Set to 0 for full run, or number for limit
Set Variable [ $testLimit ; Value: 0 ]

Set Variable [ $auth ; Value: PCCM_UseCredentials ( "S3" ; $gAPIKey; $gAPISecret ; "region=" & $gRegion ) ]

# Check if auth
If [ $auth ≠ 0 ]
    Show Custom Dialog [ "Auth Failed" ; "Could not connect\n" & $auth ]
    Exit Script [ Text Result: "" ]
End If

Set Variable [ $success ; Value: 0 ]
Set Variable [ $failed ; Value: 0 ]
Set Variable [ $skipped ; Value: 0 ]
Set Variable [ $alreadyUploaded ; Value: 0 ]
Set Variable [ $startTime ; Value: Get ( CurrentTimestamp ) ]

Go to Layout [ "API_Images" (@Images) ; Animation: None ]
Show All Records

Set Variable [ $totalRecords ; Value: Get ( FoundCount ) ]

# NEW: Count how many are already uploaded
Go to Record/Request/Page [ First ]
Loop [ Flush: Always ]
    Exit Loop If [ Get ( RecordNumber ) > Get ( FoundCount ) ]
    If [ not IsEmpty ( API_Images::NexusExportDate ) ]
        Set Variable [ $alreadyUploaded ; Value: $alreadyUploaded + 1 ]
    End If
    Go to Record/Request/Page [ Next ; Exit after last: On ]
End Loop

Set Variable [ $remaining ; Value: $totalRecords - $alreadyUploaded ]

Show Custom Dialog [ "Resume Upload" ; "Total records: " & $totalRecords & ¶ & "✅ Already uploaded: " & $alreadyUploaded & ¶ & "📤 Remaining to upload: " & $remaining & ¶ & ¶ & If ( $testLimit > 0 ; "🧪 TEST MODE: Will process " & $testLimit & " images." ; "Ready to upload " & $remaining & " images." ) ]

If [ Get ( LastMessageChoice ) = 2 ]
    Exit Script [ Text Result: "" ]
End If

Go to Record/Request/Page [ First ]

Loop [ Flush: Always ]
    Set Variable [ $recordID ; Value: Get ( RecordID ) ]
    Set Variable [ $currentRecord ; Value: Get ( RecordNumber ) ]
    Exit Loop If [ Get ( RecordNumber ) > $totalRecords or ( $testLimit > 0 and $success >= $testLimit ) ]
    
    # NEW: Skip if already uploaded
    If [ not IsEmpty ( API_Images::NexusExportDate ) ]
        Set Variable [ $skipped ; Value: $skipped + 1 ]
        Go to Record/Request/Page [ Next ; Exit after last: On ]
    Else
        # Waterfall container selection
        Set Variable [ $containerField ; Value: Case (
            not IsEmpty ( API_Images::image_Full ) ; "image_Full" ;
            not IsEmpty ( API_Images::image_Ex_large ) ; "image_Ex_large" ;
            not IsEmpty ( API_Images::image_large ) ; "image_large" ;
            not IsEmpty ( API_Images::image_medium ) ; "image_medium" ;
            not IsEmpty ( API_Images::image_small ) ; "image_small"
        )]
        
        If [ IsEmpty ( $containerField ) ]
            Set Variable [ $skipped ; Value: $skipped + 1 ]
            Go to Record/Request/Page [ Next ; Exit after last: On ]
        Else
            Set Variable [ $filename ; Value: Case (
                $containerField = "image_Full" ; GetContainerAttribute ( API_Images::image_Full ; "filename" ) ;
                $containerField = "image_Ex_large" ; GetContainerAttribute ( API_Images::image_Ex_large ; "filename" ) ;
                $containerField = "image_large" ; GetContainerAttribute ( API_Images::image_large ; "filename" ) ;
                $containerField = "image_medium" ; GetContainerAttribute ( API_Images::image_medium ; "filename" ) ;
                GetContainerAttribute ( API_Images::image_small ; "filename" )
            )]
            
            Set Variable [ $extension ; Value: Let ( [ dotPos = Position ( $filename ; "." ; Length ( $filename ) - 5 ; 1 ) ; ext = Right ( $filename ; Length ( $filename ) - dotPos ) ] ; "." & ext ) ]
            Set Variable [ $localPath ; Value: Get ( TemporaryPath ) & $recordID & $extension ]
            Set Variable [ $macPath ; Value: "filemac:" & $localPath ]
            
            If [ $containerField = "image_Full" ]
                Export Field Contents [ API_Images::image_Full ; "$macPath" ; Create folders: On ]
            Else If [ $containerField = "image_Ex_large" ]
                Export Field Contents [ API_Images::image_Ex_large ; "$macPath" ; Create folders: On ]
            Else If [ $containerField = "image_large" ]
                Export Field Contents [ API_Images::image_large ; "$macPath" ; Create folders: On ]
            Else If [ $containerField = "image_medium" ]
                Export Field Contents [ API_Images::image_medium ; "$macPath" ; Create folders: On ]
            Else If [ $containerField = "image_small" ]
                Export Field Contents [ API_Images::image_small ; "$macPath" ; Create folders: On ]
            End If
            
            Set Variable [ $s3Key ; Value: "filemaker-import/images-bulk-dump/" & $recordID & $extension ]
            Set Variable [ $cleanPath ; Value: $localPath ]
            Set Variable [ $uploadResult ; Value: PCCM_PostObject ( $gBucket ; $s3Key ; $cleanPath ; True ) ]
            
            If [ Left ( $uploadResult ; 8 ) = "!!ERROR!!" ]
                Set Variable [ $failed ; Value: $failed + 1 ]
            Else
                Set Variable [ $success ; Value: $success + 1 ]
                Set Field [ API_Images::NexusExportDate ; Get ( CurrentTimestamp ) ]
                Set Field [ API_Images::best_image_container ; $containerField ]
                Commit Records/Requests [ With dialog: Off ]
            End If
            
            # Show progress every 100 records (changed from 10 to reduce dialogs)
            If [ Mod ( $success ; 100 ) = 0 ]
                Show Custom Dialog [ "Progress" ; "Uploaded: " & $success & ¶ & "Failed: " & $failed & ¶ & "Skipped: " & $skipped & ¶ & "Remaining: ~" & ( $remaining - $success ) ]
            End If
            
            Go to Record/Request/Page [ Next ; Exit after last: On ]
        End If
    End If
End Loop

Set Variable [ $endTime ; Value: Get ( CurrentTimestamp ) ]
Set Variable [ $totalTime ; Value: $endTime - $startTime ]
Set Variable [ $minutes ; Value: Round ( $totalTime / 60 ; 0 ) ]
Show Custom Dialog [ "🎉 Complete!" ; "Total records: " & $totalRecords & ¶ & "✅ Newly uploaded: " & $success & ¶ & "❌ Failed: " & $failed & ¶ & "⏭️ Skipped (already done): " & $skipped & ¶ & "⏱️ Time: " & $minutes & " minutes" ]
```

---

## 🔑 **Key Changes from Original:**

### **1. ✅ Skip Already Uploaded Images**
```filemaker
# NEW: Skip if already uploaded
If [ not IsEmpty ( API_Images::NexusExportDate ) ]
    Set Variable [ $skipped ; Value: $skipped + 1 ]
    Go to Record/Request/Page [ Next ; Exit after last: On ]
Else
    # ... upload logic ...
End If
```

### **2. ✅ Pre-Count Already Uploaded**
Shows you how many images are left BEFORE starting:
```filemaker
# NEW: Count how many are already uploaded
Loop [ Flush: Always ]
    If [ not IsEmpty ( API_Images::NexusExportDate ) ]
        Set Variable [ $alreadyUploaded ; Value: $alreadyUploaded + 1 ]
    End If
End Loop
```

### **3. ✅ Less Frequent Progress Dialogs**
Changed from every 10 to every 100 records:
```filemaker
# Show progress every 100 records (was 10)
If [ Mod ( $success ; 100 ) = 0 ]
    Show Custom Dialog [ "Progress" ; ... ]
End If
```

### **4. ✅ Better Final Summary**
Shows newly uploaded vs. already uploaded:
```filemaker
Show Custom Dialog [ "🎉 Complete!" ; 
    "Total records: " & $totalRecords & ¶ & 
    "✅ Newly uploaded: " & $success & ¶ & 
    "❌ Failed: " & $failed & ¶ & 
    "⏭️ Skipped (already done): " & $skipped
]
```

---

## 🚀 **How to Use:**

1. **Open FileMaker** and go to Scripts
2. **Create new script** called "Bulk Upload Images to S3 (Resume)"
3. **Copy the script above** into FileMaker
4. **Run the script** - it will:
   - Count how many are already uploaded (1,000)
   - Show you how many remain (5,664)
   - Skip the first 1,000 automatically
   - Continue from where it left off

---

## 📊 **What You'll See:**

**Starting Dialog:**
```
Resume Upload
─────────────────────
Total records: 6,664
✅ Already uploaded: 1,000
📤 Remaining to upload: 5,664

Ready to upload 5,664 images.
```

**Progress Dialog (every 100 images):**
```
Progress
─────────────────────
Uploaded: 100
Failed: 0
Skipped: 1,000
Remaining: ~5,564
```

**Final Summary:**
```
🎉 Complete!
─────────────────────
Total records: 6,664
✅ Newly uploaded: 5,664
❌ Failed: 0
⏭️ Skipped (already done): 1,000
⏱️ Time: 943 minutes
```

---

## ✅ **Benefits:**

1. **Resume from Any Point** - Crashed at 1,000? Start again and it picks up automatically
2. **No Duplicates** - Won't re-upload images already in S3
3. **Safer** - Can stop and restart anytime
4. **Progress Visibility** - Shows exactly how many left
5. **Less Annoying** - Progress dialogs every 100 instead of every 10

---

## 🎯 **Next Steps:**

1. **Run this script** in FileMaker
2. It will automatically resume from image 1,001
3. Let it run overnight (keep computer awake!)
4. Check progress periodically with the Python monitor

**Estimated time for 5,664 remaining images:** ~15-16 hours at 6 images/minute

---

**Good luck! This should get you back on track! 🚀**

