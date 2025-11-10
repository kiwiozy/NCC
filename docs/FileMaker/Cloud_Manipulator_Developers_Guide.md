# Cloud Manipulator Plug-in for FileMaker  
**Developer’s Guide (condensed)**  
*Revised: November 18 2020*  
Source: Productive Computing Inc. — [www.productivecomputing.com/aws-filemaker-plugin](http://www.productivecomputing.com/aws-filemaker-plugin)

---

## 📘 Introduction
The **Cloud Manipulator** plug-in connects your FileMaker solution with **Amazon Web Services S3** storage.  
It allows FileMaker users to:
- Upload/download files to/from S3  
- Manage buckets and objects  
- Execute AWS operations directly from FileMaker scripts via plug-in functions.

**Audience:**  
FileMaker developers familiar with scripting, calculations, and relationships.

**Key practice:**  
Use plug-in functions in FileMaker `Set Field` or `If` script steps.

---

## ⚙️ Integration Steps

### 1️⃣ Installing with the Installer
#### Windows
1. Run `setup.exe` from the downloaded bundle.  
2. Install **Visual C++ 2013 Runtime Libraries** if prompted.  
3. Close FileMaker before installing.  
4. Accept the license → choose install location → confirm.  
5. Allow Windows Security prompts.  

> 💡 Don’t change the default Extensions folder path unless necessary.

#### macOS
1. Open `Install Cloud Manipulator.dmg`.  
2. Run the `Install Cloud Manipulator` app.  
3. Close FileMaker before installation.  
4. Proceed through License → Destination → Install.  
5. Approve with macOS credentials if prompted.

Both versions include an **Extras** folder containing:
- Demo file  
- Plug-in files (`.fmx`, `.fmx64`, `.fmplugin`)  
- License info, README, and other resources.

---

### 2️⃣ Installing via Demo File
1. Open the **FileMaker Demo** file in the Extras folder.  
2. Click **Install** inside the demo.  
3. On Windows, ensure **Visual C++ 2013 Redistributable** is installed.

---

### 3️⃣ Manual Installation
1. Close FileMaker.  
2. Copy the plug-in file to the FileMaker **Extensions** folder:  

   **Windows:**  
   - 32-bit → `C:\Program Files (x86)\FileMaker\FileMaker #\Extensions`  
   - 64-bit → `C:\Program Files\FileMaker\FileMaker #\Extensions`  

   **macOS:**  
   - `/Applications/FileMaker #/Extensions`  

3. Restart FileMaker → `Preferences > Plug-ins` tab → verify checkbox.

---

### 4️⃣ Troubleshooting Installation
Common issues:
- **Bitness mismatch:** FileMaker 32 bit vs plug-in 32 bit (extensions `.fmx` vs `.fmx64`).  
- **Missing dependencies:** install Visual C++ 2013 Redistributable and .NET 3.5.  
- **Duplicate plug-ins:** remove extra copies in other Extensions folders.

---

### 5️⃣ Uninstalling the Plug-in
#### Windows
1. Close FileMaker.  
2. Control Panel → Programs & Features → Uninstall the plug-in (publisher = Productive Computing Inc.).

#### macOS
1. Close FileMaker.  
2. Reopen the original `.dmg` → Extras → run `uninstall.tool` in Terminal.  

Manual removal: delete plug-in files from  
`~/Library/Application Support/FileMaker/Extensions`.

---

### 6️⃣ Registering the Plug-in
1. Ensure internet access.  
2. Open the demo file from the download package.  
3. **Demo mode:** click *Register*.  
4. **Licensed mode:** enter your License ID → click *Register*.  

Registration installs a local certificate file (`.pci` on Windows, `.plist` on macOS).  

**Hard-coding example (Plug-in Checker Script):**
```filemaker
If [ PCCM_Version("short") = "" or PCCM_Version("short") = "?" ]
   Show Custom Dialog [ "Plug-in not installed" ]
   Exit Script []
End If
If [ PCCM_GetOperatingMode <> "LIVE" ]
   Set Field [ gRegResult ; PCCM_Register(
     "licensing.productivecomputing.com"; "80";
     "/PCIReg/pcireg.php"; "Your License ID"
   ) ]
End If
```

---

## ☁️ Working with Amazon S3

### Key Terms
| Plug-in Term | AWS S3 Equivalent |
|---------------|------------------|
| Folder | Bucket |
| File | Object |
| ID | Key |

---

### 🔐 Authentication
Use **PCCM_UseCredentials** once per FileMaker session:
```filemaker
Set Variable [ $result ; Value:
  PCCM_UseCredentials(
     "S3" ;
     Credentials::gAPIKey ;
     Credentials::gAPISecret ;
     "region=" & Credentials::gRegion
  )
]
```
The session persists until FileMaker closes.

---

### 🪣 Buckets (Folders)
Functions:
- `PCCM_ListAllFolders`
- `PCCM_FetchFolderContents( FolderID ; Prefix ; Delimiter ; MaxKeys )`
- `PCCM_GetPropertyForFolder( PropertyName ; ContentIndex )`
- `PCCM_CreateFolder( FolderID )`
- `PCCM_DeleteFolder( FolderID )`

Supports pagination using:
- `IsTruncated`
- `ContinuationToken`

---

### 📦 Objects (Files)
Functions:
- `PCCM_GetPropertyForFolder( PropertyName ; ContentIndex )`
- `PCCM_GetObject( FolderID ; ObjectID ; FilePath )`
- `PCCM_PostObject( FolderID ; ObjectID ; FilePath ; optDeleteAfterPost )`
- `PCCM_CopyObject( SrcFolderID ; SrcObjectID ; DestFolderID ; DestObjectID )`
- `PCCM_DeleteObject( FolderID ; ObjectID )`
- `PCCM_GetPresignedURL( FolderID ; ObjectID ; optExpireMinutes )`

Upload (Post) example:
```filemaker
Set Variable [ $result ;
  Value: PCCM_PostObject( Bucket::ID ; Object::Key ; $filePath ; True )
]
```

---

## 🧩 Sample Scripts

### 1️⃣ List all Buckets
```filemaker
Set Variable [ $result ;
  Value: PCCM_UseCredentials( "S3" ; gAPIKey ; gAPISecret ; gRegion )
]
Set Variable [ $folders ; Value: PCCM_ListAllFolders ]
Loop
   Set Variable [ $folderID ; Value: GetValue( $folders ; $i ) ]
   Set Variable [ $r ; Value: PCCM_FetchFolderContents( $folderID ) ]
   Set Field [ Buckets::Name ; $folderID ]
   Set Field [ Buckets::Count ; PCCM_GetPropertyForFolder( "Count" ; 0 ) ]
   Set Variable [ $i ; Value: $i + 1 ]
Exit Loop If [ $i > ValueCount( $folders ) ]
End Loop
```

---

### 2️⃣ Upload a File to S3 (in a subfolder)
#### Windows
```filemaker
Set Variable [ $filePath ;
  Value: "filewin:" & Get(TemporaryPath) & GetContainerAttribute( Objects::File ; "filename" )
]
Set Variable [ $winPath ;
  Value: Substitute( $filePath ; [ "filewin:/" ; "" ] ; [ "/" ; "\" ] )
]
Export Field Contents [ Objects::File ; "$filePath" ]
Set Variable [ $r ;
  Value: PCCM_PostObject( Objects::BucketID ; "Archive/" & Objects::Key ; $winPath ; True )
]
```

#### macOS
```filemaker
Set Variable [ $filePath ;
  Value: "filemac:" & Get(TemporaryPath) & GetContainerAttribute( Objects::File ; "filename" )
]
Set Variable [ $macPath ;
  Value: Substitute( $filePath ; "filemac:/" ; "" )
]
Export Field Contents [ Objects::File ; "$filePath" ]
Set Variable [ $r ;
  Value: PCCM_PostObject( Objects::BucketID ; Objects::Key ; $macPath ; True )
]
```

---

### 3️⃣ Archive a Copy and Clear
```filemaker
Set Variable [ $newKey ; "Archive/" & Objects::Key ]
Set Variable [ $copy ; Value:
  PCCM_CopyObject( Objects::BucketID ; Objects::Key ; Objects::BucketID ; $newKey )
]
If [ $copy ≠ "!!ERROR!!" ]
   Set Variable [ $del ;
     Value: PCCM_DeleteObject( Objects::BucketID ; Objects::Key )
   ]
End If
```

---

### 4️⃣ List All Objects in a Subfolder (with Pagination)
```filemaker
Set Variable [ $prefix ; "2025" ]
Set Variable [ $r ;
  Value: PCCM_FetchFolderContents( Bucket::ID ; $prefix )
]
Loop While [ PCCM_GetPropertyForFolder( "IsTruncated" ; 0 ) = "true" ]
   Set Variable [ $token ;
     Value: PCCM_GetPropertyForFolder( "ContinuationToken" ; 0 )
   ]
   Set Variable [ $r ;
     Value: PCCM_FetchFolderContents( Bucket::ID ; $prefix ; "" ; "" ; $token )
   ]
Exit Loop If [ IsEmpty( $token ) ]
End Loop
```

---

## 📞 Support & Contact

**Productive Computing Inc.**  
📍 San Marcos, CA 92069  
📞 (760) 510-1200  
📧 [support@productivecomputing.com](mailto:support@productivecomputing.com)  
🔗 [Help Center](http://help.productivecomputing.com/help_center)  
💬 [Community Forum](https://fmforums.com/forum/297-filemaker-utility-plug-ins/)  
📄 [Request a Quote](http://www.productivecomputing.com/rfq)

---

*End of Developer’s Guide (S3 Integration Summary)*  
