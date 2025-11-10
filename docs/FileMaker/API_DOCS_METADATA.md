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

## ✅ Container Field: SUCCESS!

**🎉 BREAKTHROUGH:** The container field `Doc` is **fully accessible** via FileMaker Data API!

- **Field Name:** `Doc` (capital D, not lowercase)
- **Access Method:** FileMaker Data API (not OData)
- **Format:** Returns a streaming URL to the file
- **File Download:** Fully working with authentication token

### Test Results (Nov 9, 2025):
- ✅ Created `API_Docs` layout in FileMaker
- ✅ Accessed layout via Data API
- ✅ Retrieved container field as URL
- ✅ Downloaded actual PDF (263 KB test file)
- ✅ File integrity confirmed

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

## Import Strategy (UPDATED - Nov 9, 2025)

### ✅ Phase 1: Metadata Import (Via OData or Data API)

**Can import:**
- Document ID (as `filemaker_doc_id`)
- Patient link (`id_Contact`)
- Document type (`Type`)
- Document date (`Date`)
- Creation/modification timestamps
- Created by / modified by

### ✅ Phase 2: File Contents (Via Data API) - **WORKING!**

**Container field export method:**

1. **Authenticate** with FileMaker Data API (Base64 Basic Auth)
2. **Fetch records** from `API_Docs` layout
3. **Extract URL** from `Doc` field (returns streaming URL)
4. **Download file** using auth token
5. **Upload to S3** with organized folder structure
6. **Update database** with S3 key

**Example URL format:**
```
https://walkeasy.fmcloud.fm:443/Streaming_SSL/Additional_1/{hash}.pdf?RCType=EmbeddedRCFileProcessor
```

**Implementation:**
- Script: `scripts/filemaker/09_test_container_field_access.py` (proof of concept)
- Next: Build bulk export script for all 11,269 documents
- Target: Upload to S3 `filemaker-documents/` folder

## Next Steps

1. ✅ Metadata structure documented
2. ✅ Container field access confirmed working
3. ⏭️ Build bulk export script (all 11,269 docs)
4. ⏭️ Design S3 upload strategy
5. ⏭️ Create metadata import to Nexus `documents` table
6. ⏭️ Repeat process for `API_Images` (6,664 images)

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

