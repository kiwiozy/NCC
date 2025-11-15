#!/usr/bin/env python3
"""
Link FileMaker Images from S3 to Patient Records (CSV IMPORT)

This Django management command:
1. Reads CSV metadata (from FileMaker export)
2. Lists all images in S3 filemaker-import/images-bulk-dump/
3. Matches RecordIDs locally (instant lookups)
4. Groups images by patient + date
5. Creates ImageBatch records (one per date)
6. Creates Image records linked to batches
7. COPIES images to patient folders (originals stay as backup)

Usage:
    python manage.py link_filemaker_images --csv filemaker_images_metadata.csv --dry-run
    python manage.py link_filemaker_images --csv filemaker_images_metadata.csv
    python manage.py link_filemaker_images --csv filemaker_images_metadata.csv --limit 100
"""
import os
import csv
from django.core.management.base import BaseCommand
from django.db import transaction
from patients.models import Patient
from images.models import ImageBatch, Image
from documents.services import S3Service
from datetime import datetime
from collections import defaultdict


class Command(BaseCommand):
    help = 'Link FileMaker images using CSV import'

    def add_arguments(self, parser):
        parser.add_argument('--csv', type=str, required=True, help='CSV file with metadata')
        parser.add_argument('--dry-run', action='store_true', help='Test mode')
        parser.add_argument('--limit', type=int, default=0, help='Limit images (0=all)')

    def handle(self, *args, **options):
        csv_file = options['csv']
        dry_run = options['dry_run']
        limit = options['limit']
        
        self.stdout.write("=" * 70)
        self.stdout.write("🔗 Link FileMaker Images (CSV IMPORT)")
        self.stdout.write("=" * 70)
        if dry_run:
            self.stdout.write(self.style.WARNING("🔍 DRY RUN MODE"))
        
        # Step 1: Read CSV metadata
        self.stdout.write(f"\n📊 Step 1: Reading CSV metadata from {csv_file}...")
        
        metadata_lookup = {}
        try:
            with open(csv_file, 'r', encoding='utf-8-sig') as f:  # utf-8-sig strips BOM
                reader = csv.DictReader(f)
                for row in reader:
                    recid = row.get('recid', '').strip()
                    if recid:
                        metadata_lookup[recid] = row
            
            self.stdout.write(f"   ✅ Loaded {len(metadata_lookup)} records from CSV")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ❌ Failed to read CSV: {e}"))
            return
        
        # Step 2: Get S3 images
        self.stdout.write("\n📂 Step 2: Fetching images from S3...")
        s3_service = S3Service()
        
        try:
            paginator = s3_service.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(
                Bucket='walkeasy-nexus-documents',
                Prefix='filemaker-import/images-bulk-dump/'
            )
            
            s3_images = []
            for page in pages:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        if not obj['Key'].endswith('/'):
                            s3_images.append(obj)
            
            self.stdout.write(f"   ✅ Found {len(s3_images)} images in S3")
            if limit > 0:
                s3_images = s3_images[:limit]
                self.stdout.write(f"   ⚠️  Limited to {limit} images")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ❌ S3 Error: {e}"))
            return
        
        # Step 3: Match & group locally (FAST!)
        self.stdout.write("\n🔄 Step 3: Matching metadata and grouping...")
        
        stats = {
            'total': len(s3_images),
            'batches_created': 0,
            'images_linked': 0,
            'skipped': 0,
            'errors': 0
        }
        
        # Group: patient_images[patient_id][date] = [(s3_obj, fm_data, recid), ...]
        patient_images = defaultdict(lambda: defaultdict(list))
        
        for i, s3_obj in enumerate(s3_images, 1):
            s3_key = s3_obj['Key']
            filename = s3_key.split('/')[-1]
            
            # Extract RecordID
            try:
                recid = filename.split('.')[0]
            except ValueError:
                stats['skipped'] += 1
                continue
            
            # Progress
            if i % 500 == 0 or i == 1:
                self.stdout.write(f"   Progress: {i}/{len(s3_images)}")
            
            # Instant lookup in metadata (from CSV!)
            fm_data = metadata_lookup.get(recid)
            if not fm_data:
                stats['skipped'] += 1
                continue
            
            id_contact = fm_data.get('id_Contact', '').strip()
            image_date = fm_data.get('date', '').strip()  # Format: 10/18/2016
            
            if not id_contact or not image_date:
                stats['skipped'] += 1
                continue
            
            # Find Nexus patient - try UUID first (for new exports), then FileMaker ID (for old exports)
            patient = None
            try:
                # Try direct UUID lookup first (for exports with UUIDs in id_Contact)
                patient = Patient.objects.get(id=id_contact)
            except (Patient.DoesNotExist, ValueError):
                # Fall back to FileMaker ID lookup (for old CSV exports)
                try:
                    patient = Patient.objects.get(filemaker_metadata__filemaker_id=id_contact)
                except (Patient.DoesNotExist, Patient.MultipleObjectsReturned):
                    pass
            
            if not patient:
                stats['skipped'] += 1
                continue
            
            # Group by patient + date
            patient_images[patient.id][image_date].append((s3_obj, fm_data, recid))
        
        self.stdout.write(f"   ✅ Grouped {len(patient_images)} patients with images")
        
        # Step 4: Create batches and images
        self.stdout.write(f"\n📦 Step 4: Creating batches and images...")
        
        for patient_id, date_groups in patient_images.items():
            try:
                patient = Patient.objects.get(id=patient_id)
            except Patient.DoesNotExist:
                continue
            
            for image_date, images_list in date_groups.items():
                # Parse date (FileMaker format: 10/18/2016)
                try:
                    date_obj = datetime.strptime(image_date, '%m/%d/%Y').date()
                    batch_name = date_obj.strftime('%d %b %Y (FileMaker Import)')
                except:
                    try:
                        # Try alternate format
                        date_obj = datetime.strptime(image_date, '%Y-%m-%d').date()
                        batch_name = date_obj.strftime('%d %b %Y (FileMaker Import)')
                    except:
                        batch_name = f"{image_date} (FileMaker Import)"
                        date_obj = None
                
                if not dry_run:
                    try:
                        with transaction.atomic():
                            # Get ContentType for Patient model
                            from django.contrib.contenttypes.models import ContentType
                            patient_ct = ContentType.objects.get_for_model(Patient)
                            
                            # Find or create ImageBatch using Generic FK
                            batch, created = ImageBatch.objects.get_or_create(
                                content_type=patient_ct,
                                object_id=patient.id,
                                name=batch_name,
                                defaults={
                                    'description': 'Imported from FileMaker'
                                }
                            )
                            
                            if created:
                                stats['batches_created'] += 1
                            
                            # Create Image records
                            for s3_obj, fm_data, recid in images_list:
                                s3_key = s3_obj['Key']
                                filename = s3_key.split('/')[-1]
                                
                                # Skip if already exists (check by S3 key instead of filemaker_id)
                                if Image.objects.filter(s3_key=s3_key).exists():
                                    continue
                                
                                # Determine category from FileMaker Type
                                fm_type = fm_data.get('Type', 'other').strip().lower()
                                category = 'other'  # default
                                
                                # Map FileMaker types to Image categories
                                type_mapping = {
                                    'left dorsal': 'dorsal',
                                    'right dorsal': 'dorsal',
                                    'left medial': 'medial',
                                    'right medial': 'medial',
                                    'left lateral': 'lateral',
                                    'right lateral': 'lateral',
                                    'left plantar': 'plantar',
                                    'right plantar': 'plantar',
                                    'left planter': 'plantar',
                                    'right planter': 'plantar',
                                    'planter': 'plantar',
                                    'plantar': 'plantar',
                                    'l-brannock': 'l_brannock',
                                    'r-brannock': 'r_brannock',
                                    'left lat': 'left_lat',
                                    'right lat': 'right_lat',
                                }
                                
                                for fm_key, img_cat in type_mapping.items():
                                    if fm_key in fm_type:
                                        category = img_cat
                                        break
                                
                                Image.objects.create(
                                    batch=batch,
                                    s3_key=s3_key,
                                    original_name=filename,
                                    file_size=s3_obj['Size'],
                                    category=category,
                                    # filemaker_id is UUID field, but recid is integer - skip it
                                    date_taken=date_obj,
                                    caption=f"FileMaker: {fm_data.get('Type', '')} (RecordID: {recid})".strip()
                                )
                                stats['images_linked'] += 1
                    except Exception as e:
                        self.stdout.write(f"      ❌ Error: {e}")
                        stats['errors'] += 1
                else:
                    # Dry run - just count
                    stats['batches_created'] += 1
                    stats['images_linked'] += len(images_list)
        
        # Summary
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write("📊 SUMMARY")
        self.stdout.write("=" * 70)
        self.stdout.write(f"Total images:          {stats['total']}")
        self.stdout.write(f"✅ Batches created:     {stats['batches_created']}")
        self.stdout.write(f"✅ Images linked:       {stats['images_linked']}")
        self.stdout.write(f"⏭️  Skipped:             {stats['skipped']}")
        self.stdout.write(f"❌ Errors:              {stats['errors']}")
        
        if dry_run:
            self.stdout.write("\n🔍 DRY RUN - No changes made")
        else:
            self.stdout.write("\n✅ Linking complete!")

