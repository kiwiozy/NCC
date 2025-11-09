# API_Docs Metadata Discovery

**Date:** November 9, 2025  
**Table:** `API_Docs`  
**Total Records:** 11,269

## Overview

`API_Docs` is the FileMaker table containing all documents (PDFs, scanned images, forms) associated with patients.

## Key Fields

Based on OData analysis and sample records, `API_Docs` contains:

| Field Name | Type | Description | Sample Value |
|------------|------|-------------|--------------|
| `id` | UUID | Primary key (document ID) | `1A127CC7-2A4E-4473-A07F-3D124EE15BB9` |
| `id_Contact` | UUID | Foreign key to patient (link to `API_Contacts.id`) | `D890A6DB-D87B-4A50-A0D0-45792AC1BF8D` |
| `Type` | String | Document type/category | `Referral`, `ERF`, `File Notes`, `Purchase order`, `Quote` |
| `Date` | Date | Document date | `2016-11-01` |
| `id_Order` | UUID | Optional link to order | `BDF3499D-6CAD-40CD-80A3-5FB8FC359F09` |
| `imported` | Integer | Import flag (always 1) | `1` |
| `num` | Integer | Sequence/number (always null in samples) | `null` |
| `creationAccountName` | String | Who created the record | `Admin`, `Craig` |
| `creationTimestamp` | DateTime | When created | `2016-10-14T10:02:28+10:00` |
| `modificationAccountName` | String | Who last modified | `Craig` |
| `modificationTimestamp` | DateTime | When last modified | `2019-07-02T20:46:32+10:00` |

## Document Types

From sample of 50 records, we found **5 document types**:

1. **ERF** - Equipment Request Form
2. **File Notes** - General notes/documents
3. **Purchase order** - Orders for equipment
4. **Quote** - Price quotes
5. **Referral** - Referral documents

## Missing: Container Field

**⚠️ CRITICAL:** The `API_Docs` table does NOT expose the actual **container field** (PDF/file) via OData.

- OData only provides **metadata** (id, type, date, etc.)
- OData **CANNOT** access container field contents
- The actual PDF/document files are **NOT** accessible via OData API

## Relationships

```
API_Contacts (Patient)
    └── id_Contact → API_Docs.id_Contact (Many docs per patient)
    
API_Docs
    └── id_Order → Orders table (Optional, for purchase orders)
```

## Sample Record

```json
{
  "id": "1A127CC7-2A4E-4473-A07F-3D124EE15BB9",
  "id_Contact": "D890A6DB-D87B-4A50-A0D0-45792AC1BF8D",
  "Type": "Referral",
  "Date": "2016-11-01",
  "id_Order": "BDF3499D-6CAD-40CD-80A3-5FB8FC359F09",
  "imported": 1,
  "num": null,
  "creationAccountName": "Admin",
  "creationTimestamp": "2016-10-14T10:02:28+10:00",
  "modificationAccountName": "Craig",
  "modificationTimestamp": "2019-07-02T20:46:32+10:00"
}
```

## Data Quality Notes

- All sampled records have `imported = 1`
- All sampled records have `num = null`
- Dates range from 2016 onwards
- Some records have null `Date` field (especially ERF types)
- Most records have `id_Order = null` (only `Referral` type has order links)

## Import Strategy (For Documentation)

### Phase 1: Metadata Only (Feasible via OData)

✅ **Can import:**
- Document ID (as `filemaker_doc_id`)
- Patient link (`id_Contact`)
- Document type (`Type`)
- Document date (`Date`)
- Creation/modification timestamps
- Created by / modified by

### Phase 2: File Contents (Requires Alternative Method)

❌ **Cannot import via OData:**
- Actual PDF/file contents (container field not exposed)

**Alternatives for file import:**
1. **FileMaker Data API** - `getRecordById` with container field name (if we can determine it)
2. **FileMaker Script** - Export container fields to folder, then upload to S3
3. **Manual Export** - Export from FileMaker UI, then bulk upload

## Next Steps

1. ✅ Metadata structure documented
2. ⏸️ Determine container field name (not visible in OData)
3. ⏸️ Test FileMaker Data API for container field access
4. ⏸️ Design S3 folder structure for imported docs
5. ⏸️ Create import strategy for metadata → Nexus `documents` table
6. ⏸️ Determine best approach for file contents migration

## Related Documentation

- **[DOCS_IMAGES_S3_MIGRATION_PLAN.md](./DOCS_IMAGES_S3_MIGRATION_PLAN.md)** - Overall migration plan
- **[S3_FOLDER_STRUCTURE.md](../architecture/S3_FOLDER_STRUCTURE.md)** - S3 structure design
- **[API_TABLES_COMPLETE_OVERVIEW.md](./API_TABLES_COMPLETE_OVERVIEW.md)** - All API tables

## Files Generated

- `scripts/filemaker/data/discovery/api_docs_metadata_20251109_131705.xml` - Full XML metadata
- `scripts/filemaker/data/discovery/api_docs_samples_20251109_131706.json` - Sample records (5)
- `scripts/filemaker/08_discover_api_docs_metadata.py` - Discovery script

---

**Status:** ✅ Metadata discovery complete  
**Container Field:** ❌ Not accessible via OData  
**Next:** Determine container field name and test Data API access

