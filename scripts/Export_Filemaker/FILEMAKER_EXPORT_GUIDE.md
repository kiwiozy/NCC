# FileMaker Export Script - Complete Data Export Guide

**Purpose:** Export all required data from FileMaker to Excel files for Nexus import

**Target Folder:** `/Users/craig/Documents/nexus-core-clinic/scripts/Export_Filemaker/`

---

## 📋 Required Exports

### ✅ Currently Implemented (Working)

1. **Appointments.xlsx**
   - **FileMaker Layout:** `Appointment` or `@Appointment`
   - **Fields Required:**
     - `id` - Appointment FileMaker ID
     - `id_Contact` - Patient FileMaker ID
     - `id_Clinic` - Clinic FileMaker ID
     - `id_Clinician` - Clinician FileMaker ID
     - `startDate` - Appointment start date
     - `startTime` - Appointment start time
     - `endDate` - Appointment end date
     - `endTime` - Appointment end time
     - `Type` - Appointment type
     - `Consult Notes` or `note` - Notes about appointment
   - **Records:** ~15,149
   - **Import Script:** `phase4_appointments/fetch_appointments_from_excel.py`

2. **Notes.xlsx**
   - **FileMaker Layout:** `API_Notes`
   - **Fields Required:**
     - `id` - Note FileMaker ID
     - `id_Contact` or `id_Key` - Patient FileMaker ID
     - `Date` - Note date
     - `Note` - Note content
     - `Note Type` - Type of note
   - **Records:** ~11,408
   - **Import Script:** `phase5_notes/fetch_notes_from_excel.py`

3. **Docs.xlsx**
   - **FileMaker Layout:** `Documents` or `@Documents`
   - **Fields Required:**
     - `id` - Document FileMaker ID
     - `id_Contact` - Patient FileMaker ID (CRITICAL for linking!)
     - `Document Type` - Category of document
     - `Description` - Document description
     - `Date` - Document date
   - **Records:** ~11,274
   - **Import Script:** `phase6_documents/relink_documents_clean.py`

4. **Coms.xlsx**
   - **FileMaker Layout:** `Communications` or `@Contacts to Communications`
   - **Fields Required:**
     - `id` - Communication record ID
     - `id.key` - Patient FileMaker ID (CRITICAL!)
     - `type` - Type: Address/Mobile/Phone/Email
     - `Name` - Label (Home, Work, Mobile, etc.)
     - `address 1` - Street address line 1
     - `address 2` - Street address line 2
     - `suburb` - Suburb/City
     - `state` - State/Province
     - `post code` - Postal code
     - `country` - Country
     - `ph` - Phone number
     - `PhoneMobileIntFormat` - International mobile format
     - `SMS Phone` - SMS-capable phone
     - `Email default` - Email address
     - `Full Address one line` - Full formatted address
   - **Records:** ~10,697 (7,147 unique comms)
   - **Import Script:** `phase4_communications/import_communications.py` ⭐ NEW

5. **Image_dataV9.csv**
   - **FileMaker Layout:** `Images` or `@Images`
   - **Fields Required:**
     - `recid` - Image filename (e.g., "5053")
     - `id_Contact` - Patient FileMaker ID
     - `date` - Image date
     - `Type` - Image type/category
   - **Records:** ~6,662
   - **Format:** CSV (not XLSX)
   - **Import Script:** `phase7_images/link_filemaker_images_csv.py`

---

## 🚀 Recommended FileMaker Script Structure

### Script: "Export All Data for Nexus"

```filemaker
# ============================================================================
# SCRIPT: Export All Data for Nexus
# PURPOSE: Export all required data to Excel/CSV files for Nexus import
# TARGET: /Users/craig/Documents/nexus-core-clinic/scripts/Export_Filemaker/
# ============================================================================

Allow User Abort [ Off ]
Set Error Capture [ On ]

# Set export folder path
Set Variable [ $exportPath ; Value: "/Users/craig/Documents/nexus-core-clinic/scripts/Export_Filemaker/" ]

# Show progress dialog
Show Custom Dialog [ "Export Data for Nexus" ; "This will export all data to Excel files.

Files will be saved to:
" & $exportPath & "

Continue?" ]

If [ Get ( LastMessageChoice ) = 2 ]
    Exit Script [ Text Result: "Cancelled by user" ]
End If

# ============================================================================
# EXPORT 1: Appointments
# ============================================================================
Set Variable [ $currentExport ; Value: "Appointments" ]
Show Custom Dialog [ "Exporting..." ; "Exporting " & $currentExport & "..." ]

Go to Layout [ "Appointment" (Appointment) ]
Show All Records
Sort Records [ Restore ; No dialog ]

Set Variable [ $fileName ; Value: $exportPath & "Appointments.xlsx" ]
Export Records [ No dialog ; "$fileName" ; Unicode (UTF-8) ]
    # Fields to export:
    # - id
    # - id_Contact
    # - id_Clinic
    # - id_Clinician
    # - startDate
    # - startTime
    # - endDate
    # - endTime
    # - Type
    # - Consult Notes

# ============================================================================
# EXPORT 2: Notes
# ============================================================================
Set Variable [ $currentExport ; Value: "Notes" ]
Show Custom Dialog [ "Exporting..." ; "Exporting " & $currentExport & "..." ]

Go to Layout [ "API_Notes" (Notes) ]
Show All Records
Sort Records [ Restore ; No dialog ]

Set Variable [ $fileName ; Value: $exportPath & "Notes.xlsx" ]
Export Records [ No dialog ; "$fileName" ; Unicode (UTF-8) ]
    # Fields to export:
    # - id
    # - id_Contact (or id_Key)
    # - Date
    # - Note
    # - Note Type

# ============================================================================
# EXPORT 3: Documents
# ============================================================================
Set Variable [ $currentExport ; Value: "Documents" ]
Show Custom Dialog [ "Exporting..." ; "Exporting " & $currentExport & "..." ]

Go to Layout [ "Documents" (Documents) ]
Show All Records
Sort Records [ Restore ; No dialog ]

Set Variable [ $fileName ; Value: $exportPath & "Docs.xlsx" ]
Export Records [ No dialog ; "$fileName" ; Unicode (UTF-8) ]
    # Fields to export:
    # - id
    # - id_Contact (CRITICAL!)
    # - Document Type
    # - Description
    # - Date

# ============================================================================
# EXPORT 4: Communications (Phones, Emails, Addresses)
# ============================================================================
Set Variable [ $currentExport ; Value: "Communications" ]
Show Custom Dialog [ "Exporting..." ; "Exporting " & $currentExport & "..." ]

Go to Layout [ "Communications" (Communications) ]
Show All Records
Sort Records [ Restore ; No dialog ]

Set Variable [ $fileName ; Value: $exportPath & "Coms.xlsx" ]
Export Records [ No dialog ; "$fileName" ; Unicode (UTF-8) ]
    # Fields to export:
    # - id
    # - id.key (Patient FileMaker ID - CRITICAL!)
    # - type
    # - Name
    # - address 1
    # - address 2
    # - suburb
    # - state
    # - post code
    # - country
    # - ph
    # - PhoneMobileIntFormat
    # - SMS Phone
    # - Email default
    # - Full Address one line

# ============================================================================
# EXPORT 5: Images Metadata
# ============================================================================
Set Variable [ $currentExport ; Value: "Images" ]
Show Custom Dialog [ "Exporting..." ; "Exporting " & $currentExport & "..." ]

Go to Layout [ "Images" (Images) ]
Show All Records
Sort Records [ Restore ; No dialog ]

Set Variable [ $fileName ; Value: $exportPath & "Image_dataV10.csv" ]
Export Records [ No dialog ; "$fileName" ; Unicode (UTF-8) ; CSV format ]
    # Fields to export:
    # - recid (filename/ID)
    # - id_Contact (Patient FileMaker ID)
    # - date
    # - Type

# ============================================================================
# COMPLETE
# ============================================================================
Show Custom Dialog [ "Export Complete!" ; 
    "All data has been exported to:
" & $exportPath & "

Files created:
✅ Appointments.xlsx (appointments)
✅ Notes.xlsx (clinical notes)
✅ Docs.xlsx (document metadata)
✅ Coms.xlsx (phones, emails, addresses)
✅ Image_dataV10.csv (image metadata)

Next steps:
1. Run the Nexus import scripts
2. Verify data in Nexus
3. Test patient records" ]
```

---

## 📊 Export Checklist

Use this checklist when running exports:

### Before Export:
- [ ] FileMaker database is open
- [ ] Target folder exists: `/Users/craig/Documents/nexus-core-clinic/scripts/Export_Filemaker/`
- [ ] You have write permissions to the folder
- [ ] No import scripts are currently running

### During Export:
- [ ] **Appointments.xlsx** - Check file size (~2 MB)
- [ ] **Notes.xlsx** - Check file size (~1-2 MB)
- [ ] **Docs.xlsx** - Check file size (~500 KB)
- [ ] **Coms.xlsx** - Check file size (~1 MB)
- [ ] **Image_dataV10.csv** - Check file size (~800 KB)

### After Export:
- [ ] All 5 files exist
- [ ] Files have data (not empty)
- [ ] Files open correctly in Excel/Numbers
- [ ] Ready to run Nexus import

---

## 🔄 Import Order

After exporting, run imports in this order:

1. **Patients** (from FileMaker API - Phase 3)
2. **Communications** ⭐ NEW - Phase 4.5
   ```bash
   python scripts/reimport/phase4_communications/import_communications.py
   ```
3. **Appointments** - Phase 4
   ```bash
   python scripts/reimport/phase4_appointments/fetch_appointments_from_excel.py
   python scripts/reimport/phase4_appointments/import_appointments.py
   ```
4. **Notes** - Phase 5
   ```bash
   python scripts/reimport/phase5_notes/fetch_notes_from_excel.py
   python scripts/reimport/phase5_notes/import_notes.py
   ```
5. **Documents** - Phase 6
   ```bash
   python scripts/reimport/phase6_documents/relink_documents_clean.py
   ```
6. **Images** - Phase 7
   ```bash
   python scripts/reimport/phase7_images/link_filemaker_images_csv.py
   ```

---

## 💡 Tips

### File Naming:
- Use version numbers for images CSV: `Image_dataV10.csv`, `Image_dataV11.csv`, etc.
- Keep previous versions as backup
- Excel files can use same names (they get timestamped on import)

### Field Mapping:
- Always include FileMaker IDs (`id`, `id_Contact`, `id_Key`)
- Include creation/modification dates if available
- Export more fields than you need (better safe than sorry)

### Troubleshooting:
- **Empty files:** Check FileMaker layout has records
- **Missing data:** Verify all fields exist in layout
- **Unicode issues:** Always export as UTF-8
- **Large files:** Exports may take 1-2 minutes

---

## 🎯 Benefits of This Approach

1. **Consistency:** Same export process every time
2. **Speed:** Much faster than API queries (10,000 record limit)
3. **Complete:** Gets ALL data, not limited by API
4. **Reliable:** No timeout issues
5. **Versioned:** Easy to keep previous exports as backup
6. **Automated:** One-click export from FileMaker

---

## 📝 Next Steps

1. **Create the FileMaker script** using the template above
2. **Test the export** - verify all 5 files are created
3. **Run a test import** to Nexus (dry-run first)
4. **Document any issues** for future reference
5. **Schedule regular exports** (weekly/monthly)

---

**This will make your data migration process SO much easier!** 🚀

