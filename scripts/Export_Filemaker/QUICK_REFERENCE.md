# 📤 QUICK EXPORT REFERENCE

## Required Files (5 Total)

| File | Records | Critical Fields | Layout |
|------|---------|----------------|--------|
| **Appointments.xlsx** | ~15,149 | `id`, `id_Contact`, `startDate`, `startTime` | `Appointment` |
| **Notes.xlsx** | ~11,408 | `id`, `id_Contact` or `id_Key`, `Note` | `API_Notes` |
| **Docs.xlsx** | ~11,274 | `id`, `id_Contact` (CRITICAL!) | `Documents` |
| **Coms.xlsx** | ~10,697 | `id`, `id.key` (CRITICAL!), `type` | `Communications` |
| **Image_dataV10.csv** | ~6,662 | `recid`, `id_Contact`, `date` | `Images` |

---

## Export Folder

```
/Users/craig/Documents/nexus-core-clinic/scripts/Export_Filemaker/
```

---

## Import Commands (After Export)

```bash
cd /Users/craig/Documents/nexus-core-clinic

# 1. Communications (MUST BE FIRST after patients!)
python scripts/reimport/phase4_communications/import_communications.py --dry-run
python scripts/reimport/phase4_communications/import_communications.py

# 2. Appointments
python scripts/reimport/phase4_appointments/fetch_appointments_from_excel.py
python scripts/reimport/phase4_appointments/import_appointments.py

# 3. Notes
python scripts/reimport/phase5_notes/fetch_notes_from_excel.py
python scripts/reimport/phase5_notes/import_notes.py

# 4. Documents
python scripts/reimport/phase6_documents/relink_documents_clean.py

# 5. Images
python scripts/reimport/phase7_images/link_filemaker_images_csv.py
```

---

## Checklist

Export:
- [ ] All 5 files created
- [ ] Files have data (not empty)
- [ ] Files in correct folder

Import:
- [ ] Run in order above
- [ ] Check logs for errors
- [ ] Verify counts match

---

## Expected Results

| Data Type | Count |
|-----------|-------|
| Appointments | 9,837 |
| Notes | 11,210 |
| Documents | 10,190 |
| Phones | 3,647 |
| Emails | 352 |
| Addresses | 2,584 |
| Images | 6,489 |

---

**See FILEMAKER_EXPORT_GUIDE.md for full details**

