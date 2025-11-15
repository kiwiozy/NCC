# 📤 FileMaker Export Folder

**Purpose:** Central location for all FileMaker data exports

**Path:** `/Users/craig/Documents/nexus-core-clinic/scripts/Export_Filemaker/`

---

## 📁 What Goes Here

### Data Files (Exported from FileMaker):
- `Appointments.xlsx` - All appointment records
- `Notes.xlsx` - All clinical notes
- `Docs.xlsx` - Document metadata (links to S3)
- `Coms.xlsx` - Phone numbers, emails, addresses
- `Image_dataV10.csv` - Image metadata (links to S3)

### Documentation:
- `FILEMAKER_EXPORT_GUIDE.md` - Complete export instructions
- `QUICK_REFERENCE.md` - Quick commands & checklist
- `README.md` - This file

---

## 🚀 Quick Start

### 1. Export from FileMaker

Run the FileMaker script: **"Export All Data for Nexus"**

This will create all 5 required files in this folder.

### 2. Import to Nexus

```bash
cd /Users/craig/Documents/nexus-core-clinic

# Communications (phones, emails, addresses)
python scripts/reimport/phase4_communications/import_communications.py

# Appointments
python scripts/reimport/phase4_appointments/fetch_appointments_from_excel.py
python scripts/reimport/phase4_appointments/import_appointments.py

# Notes
python scripts/reimport/phase5_notes/fetch_notes_from_excel.py
python scripts/reimport/phase5_notes/import_notes.py

# Documents (relink S3 paths)
python scripts/reimport/phase6_documents/relink_documents_clean.py

# Images (link to patients)
python scripts/reimport/phase7_images/link_filemaker_images_csv.py
```

---

## 📚 Documentation

- **[FILEMAKER_EXPORT_GUIDE.md](./FILEMAKER_EXPORT_GUIDE.md)** - Detailed instructions for creating FileMaker export script
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick commands and checklist

---

## ✅ Why This Approach?

### Before (FileMaker API):
- ❌ Slow (network requests for every record)
- ❌ Timeout issues (FileMaker OData 10k limit)
- ❌ Unreliable (pagination broken)
- ❌ Incomplete (missing data due to limits)

### After (Excel Export):
- ✅ Fast (local file read)
- ✅ Complete (all records, no limits)
- ✅ Reliable (no network issues)
- ✅ Versioned (keep previous exports)
- ✅ Simple (one-click FileMaker script)

---

## 🎯 Current Status

✅ **All import scripts ready:**
- Phase 4.5: Communications (phones, emails, addresses) - `import_communications.py`
- Phase 4: Appointments - `fetch_appointments_from_excel.py` + `import_appointments.py`
- Phase 5: Notes - `fetch_notes_from_excel.py` + `import_notes.py`
- Phase 6: Documents - `relink_documents_clean.py` (uses Docs.xlsx)
- Phase 7: Images - `link_filemaker_images_csv.py` (uses Image_dataV10.csv)

✅ **Last successful import:**
- Date: November 15, 2025
- Patients: 2,842 (with full contact info)
- Appointments: 9,837
- Notes: 11,210
- Documents: 10,190
- Images: 6,489
- Communications: 6,583 (phones + emails + addresses)

---

## 📝 Next Steps

1. **Create FileMaker export script** (see FILEMAKER_EXPORT_GUIDE.md)
2. **Test export** - verify all 5 files are created
3. **Test import** - run with --dry-run first
4. **Verify data** - check counts and sample records
5. **Schedule exports** - weekly/monthly as needed

---

**Need help?** See the guides or ask! 🚀

