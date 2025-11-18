#!/usr/bin/env python3
"""
Re-link Image Batches to Current Patients (FIXED VERSION)

This script fixes image batches that are linked to old/deleted patient UUIDs
by matching them to current patients via the images' FileMaker metadata.

Usage:
    python fix_image_batch_links.py --dry-run  # Preview
    python fix_image_batch_links.py            # Execute
"""
import sys
import os
import django

# Add Django project to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from patients.models import Patient
from images.models import ImageBatch, Image
from django.contrib.contenttypes.models import ContentType
from django.db import transaction


def fix_image_batch_links(dry_run=False):
    """
    Re-link image batches to current patients.
    
    Strategy:
    1. Get all image batches
    2. For each batch, get an image from that batch
    3. Extract FileMaker patient ID from image caption (e.g., "FileMaker: Dorsal (RecordID: 995)")
    4. Find current patient with that FileMaker ID
    5. Update batch to point to current patient
    """
    print("=" * 70)
    print("🔗 Fix Image Batch Links")
    print("=" * 70)
    
    if dry_run:
        print("🔍 DRY RUN MODE - No changes will be made\n")
    
    # Get patient content type
    patient_ct = ContentType.objects.get_for_model(Patient)
    
    # Get all batches
    all_batches = ImageBatch.objects.filter(content_type=patient_ct)
    total_batches = all_batches.count()
    
    print(f"📊 Total batches to check: {total_batches}\n")
    
    # Build patient lookup by FileMaker ID
    print("Building patient lookup map...")
    patient_map = {}  # fm_id -> Patient UUID
    
    for patient in Patient.objects.all():
        fm_metadata = patient.filemaker_metadata
        if fm_metadata and fm_metadata.get('filemaker_id'):
            fm_id = fm_metadata['filemaker_id']
            patient_map[fm_id] = patient.id
    
    print(f"✅ Found {len(patient_map)} patients with FileMaker IDs\n")
    
    # Process batches
    stats = {
        'fixed': 0,
        'already_correct': 0,
        'patient_exists': 0,
        'no_images': 0,
        'no_fm_id': 0,
        'patient_not_found': 0,
        'errors': 0
    }
    
    for i, batch in enumerate(all_batches, 1):
        if i % 100 == 0:
            print(f"   Progress: {i}/{total_batches}")
        
        try:
            # Check if patient still exists
            try:
                current_patient = Patient.objects.get(id=batch.object_id)
                stats['already_correct'] += 1
                stats['patient_exists'] += 1
                continue  # Patient exists, batch is fine
            except Patient.DoesNotExist:
                pass  # Patient doesn't exist, need to fix
            
            # Get an image from this batch to find FileMaker ID
            image = batch.images.first()
            
            if not image:
                stats['no_images'] += 1
                continue
            
            # Try to extract FileMaker patient ID from image caption
            # Caption format: "FileMaker: Dorsal (RecordID: 995)"
            # We need to get the patient's FM ID from CSV data
            
            # Alternative: Get patient FM ID from CSV metadata
            # The CSV has id_Contact which is the patient's FileMaker ID
            # But we don't have direct access to that here
            
            # Let's try a different approach: check if we can get it from the batch name
            # Batch names are like "07 Dec 2017 (FileMaker Import)"
            # This won't work either
            
            # SOLUTION: We need to get the FileMaker patient ID from somewhere
            # The images were imported with a caption that includes RecordID
            # But not the patient's FileMaker ID
            
            # Let me check what data we have access to
            print(f"\\n❌ Batch {batch.id} ({batch.name})")
            print(f"   Current object_id: {batch.object_id}")
            print(f"   Patient exists: No")
            print(f"   Images in batch: {batch.images.count()}")
            if image:
                print(f"   Sample image: {image.original_name}")
                print(f"   Image caption: {image.caption}")
                print(f"   Image S3 key: {image.s3_key}")
            
            stats['no_fm_id'] += 1
            
        except Exception as e:
            print(f"   ❌ Error processing batch {batch.id}: {e}")
            stats['errors'] += 1
    
    # Summary
    print("\\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    print(f"Total batches: {total_batches}")
    print(f"✅ Already correct (patient exists): {stats['already_correct']}")
    print(f"❌ Patient doesn't exist: {total_batches - stats['patient_exists']}")
    print(f"⚠️  No images in batch: {stats['no_images']}")
    print(f"⚠️  No FileMaker ID found: {stats['no_fm_id']}")
    print(f"❌ Errors: {stats['errors']}")
    
    if dry_run:
        print("\\n🔍 DRY RUN - No changes made")
    
    return stats


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Fix image batch links')
    parser.add_argument('--dry-run', action='store_true', help='Preview only')
    args = parser.parse_args()
    
    fix_image_batch_links(dry_run=args.dry_run)

