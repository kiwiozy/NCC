# 🔗 Link FileMaker Images to Patients

**Purpose:** Link exported FileMaker images to patient records in Nexus

---

## 📊 **Data Flow**

```
FileMaker API_Images
    ↓
    ├─ id (UUID) → S3 filename
    ├─ id_Contact (UUID) → Patient's FileMaker ID
    └─ Category, Date → Metadata

Python Script
    ↓
    1. Read S3 bucket (get all image UUIDs)
    2. Query FileMaker API_Images metadata
    3. Match id_Contact to Patient.notes.filemaker_id
    4. Create Document records in Nexus
    5. Link to Patient

Result: Images linked to patients in Nexus!
```

---

## 🔍 **Required Data Sources**

### **Option A: OData API (Recommended)**
```python
# Get image metadata from FileMaker OData
import requests

url = "https://walkeasy.fmcloud.fm/fmi/odata/v4/NCC/API_Images"
params = {
    "$select": "id,id_Contact,Category,Date_Created",
    "$filter": "NexusExportDate ne null"  # Only exported images
}
response = requests.get(url, auth=(username, password), params=params)
images = response.json()['value']
```

### **Option B: Export from FileMaker**
Export API_Images to CSV:
```csv
id,id_Contact,Category,Date_Created
671cf162-3973-4294-9e1f-1ed691d1c1eb,a1b2c3d4-...,Left Dorsal,2024-01-15
...
```

---

## 🐍 **Python Management Command**

**File:** `backend/documents/management/commands/link_filemaker_images.py`

```python
from django.core.management.base import BaseCommand
from django.contrib.contenttypes.models import ContentType
from patients.models import Patient
from documents.models import Document
from documents.services import S3Service
import requests
from datetime import datetime

class Command(BaseCommand):
    help = 'Link FileMaker exported images to patients in Nexus'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be linked without making changes'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        self.stdout.write("=" * 60)
        self.stdout.write("🔗 Linking FileMaker Images to Patients")
        self.stdout.write("=" * 60)
        
        # Step 1: Get all images from S3
        s3 = S3Service()
        response = s3.s3_client.list_objects_v2(
            Bucket='walkeasy-nexus-documents',
            Prefix='filemaker-import/images-bulk-dump/'
        )
        
        if 'Contents' not in response:
            self.stdout.write(self.style.ERROR("❌ No images found in S3"))
            return
        
        s3_images = response['Contents']
        self.stdout.write(f"📦 Found {len(s3_images)} images in S3")
        
        # Step 2: Get FileMaker metadata (OData)
        self.stdout.write("\n📡 Fetching FileMaker metadata...")
        
        filemaker_url = "https://walkeasy.fmcloud.fm/fmi/odata/v4/NCC/API_Images"
        filemaker_auth = ('craig', 'YOUR_PASSWORD')  # Update with credentials
        
        params = {
            "$select": "id,id_Contact,Category,Date_Created",
            "$filter": "NexusExportDate ne null"
        }
        
        try:
            fm_response = requests.get(
                filemaker_url,
                auth=filemaker_auth,
                params=params,
                timeout=30
            )
            fm_response.raise_for_status()
            filemaker_images = fm_response.json()['value']
            self.stdout.write(f"✅ Got metadata for {len(filemaker_images)} images")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Failed to fetch FileMaker data: {e}"))
            return
        
        # Step 3: Create lookup dictionary
        fm_lookup = {img['id']: img for img in filemaker_images}
        
        # Step 4: Get Patient ContentType
        patient_content_type = ContentType.objects.get_for_model(Patient)
        
        # Step 5: Process each S3 image
        linked_count = 0
        skipped_count = 0
        error_count = 0
        
        for s3_obj in s3_images:
            s3_key = s3_obj['Key']
            
            # Extract UUID from filename
            # filemaker-import/images-bulk-dump/671cf162-3973-4294-9e1f-1ed691d1c1eb.jpg
            filename = s3_key.split('/')[-1]
            image_uuid = filename.rsplit('.', 1)[0]  # Remove extension
            
            # Look up FileMaker metadata
            if image_uuid not in fm_lookup:
                self.stdout.write(f"⏭️  Skipped: {image_uuid} (no FileMaker metadata)")
                skipped_count += 1
                continue
            
            fm_image = fm_lookup[image_uuid]
            filemaker_patient_id = fm_image.get('id_Contact')
            
            if not filemaker_patient_id:
                self.stdout.write(f"⏭️  Skipped: {image_uuid} (no id_Contact)")
                skipped_count += 1
                continue
            
            # Find Nexus patient by FileMaker ID
            try:
                # Patients have filemaker_id in their notes JSON field
                patient = Patient.objects.get(
                    notes__filemaker_id=filemaker_patient_id
                )
            except Patient.DoesNotExist:
                self.stdout.write(
                    f"❌ No patient found for FileMaker ID: {filemaker_patient_id}"
                )
                error_count += 1
                continue
            except Patient.MultipleObjectsReturned:
                self.stdout.write(
                    f"❌ Multiple patients found for FileMaker ID: {filemaker_patient_id}"
                )
                error_count += 1
                continue
            
            # Check if Document already exists
            existing = Document.objects.filter(
                s3_key=s3_key
            ).exists()
            
            if existing:
                self.stdout.write(f"⏭️  Skipped: {image_uuid} (already linked)")
                skipped_count += 1
                continue
            
            # Create Document record
            if not dry_run:
                Document.objects.create(
                    content_type=patient_content_type,
                    object_id=patient.id,
                    s3_key=s3_key,
                    original_filename=filename,
                    file_type='image/jpeg',  # Assume JPEG for now
                    file_size=s3_obj['Size'],
                    metadata={
                        'filemaker_image_id': image_uuid,
                        'filemaker_patient_id': filemaker_patient_id,
                        'category': fm_image.get('Category'),
                        'date_created': fm_image.get('Date_Created'),
                        'source': 'filemaker_import'
                    }
                )
            
            self.stdout.write(
                f"✅ Linked: {image_uuid} → Patient {patient.id} "
                f"({patient.first_name} {patient.last_name})"
            )
            linked_count += 1
        
        # Step 6: Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("📊 Summary:")
        self.stdout.write(f"  ✅ Linked: {linked_count}")
        self.stdout.write(f"  ⏭️  Skipped: {skipped_count}")
        self.stdout.write(f"  ❌ Errors: {error_count}")
        
        if dry_run:
            self.stdout.write("\n🔍 DRY RUN - No changes made")
        
        self.stdout.write("=" * 60)
```

---

## 🚀 **How to Use**

### **1. Test with Dry Run:**
```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate

python manage.py link_filemaker_images --dry-run
```

### **2. Run for Real:**
```bash
python manage.py link_filemaker_images
```

---

## 📋 **What It Does**

1. ✅ Lists all images in `filemaker-import/images-bulk-dump/`
2. ✅ Fetches metadata from FileMaker OData API
3. ✅ Matches each image UUID to patient via `id_Contact`
4. ✅ Creates `Document` records linked to patients
5. ✅ Stores FileMaker metadata in Document.metadata JSON field

---

## 🎯 **Result**

After running, each image will have a Document record:

```python
Document.objects.filter(
    metadata__source='filemaker_import'
).count()
# Returns: 5 (or however many images were linked)

# Get all FileMaker images for a patient
patient = Patient.objects.get(id='...')
images = Document.objects.filter(
    content_type=patient_content_type,
    object_id=patient.id,
    metadata__source='filemaker_import'
)
```

---

## ⚠️ **Prerequisites**

1. ✅ All images exported to S3
2. ✅ FileMaker OData API accessible
3. ✅ Patients imported with `filemaker_id` in notes
4. ⏳ Create the management command file

---

**Ready to create the script?** Let me know and I'll add it to your codebase!


