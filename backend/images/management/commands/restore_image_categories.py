#!/usr/bin/env python3
"""
Restore Image Categories - Revert to Mapped Categories

This script reverts the categories back to the mapped standard categories
(dorsal, plantar, medial, etc.) based on the FileMaker Type.

Usage:
    python manage.py restore_image_categories --dry-run  # Test mode
    python manage.py restore_image_categories             # Restore all images
"""
import csv
from django.core.management.base import BaseCommand
from django.db import transaction
from images.models import Image


class Command(BaseCommand):
    help = 'Restore image categories to mapped standard categories'

    def add_arguments(self, parser):
        parser.add_argument('--csv', type=str, default='filemaker_images_metadata.csv', help='CSV file with metadata')
        parser.add_argument('--dry-run', action='store_true', help='Test mode')

    def handle(self, *args, **options):
        csv_file = options['csv']
        dry_run = options['dry_run']
        
        self.stdout.write("=" * 70)
        self.stdout.write("🔄 Restore Image Categories (Standard Mapping)")
        self.stdout.write("=" * 70)
        if dry_run:
            self.stdout.write(self.style.WARNING("🔍 DRY RUN MODE"))
        
        # Step 1: Read CSV metadata
        self.stdout.write(f"\n📊 Step 1: Reading CSV metadata from {csv_file}...")
        
        metadata_lookup = {}
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    recid = row.get('recid', '').strip()
                    if recid:
                        metadata_lookup[recid] = row
            
            self.stdout.write(f"   ✅ Loaded {len(metadata_lookup)} records from CSV")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ❌ Failed to read CSV: {e}"))
            return
        
        # Step 2: Get all images from FileMaker import
        self.stdout.write("\n🖼️  Step 2: Finding images from FileMaker import...")
        
        images = Image.objects.filter(s3_key__startswith='filemaker-import/images-bulk-dump/')
        self.stdout.write(f"   ✅ Found {images.count()} images")
        
        # Step 3: Restore mapped categories
        self.stdout.write("\n🔄 Step 3: Restoring mapped categories...")
        
        # FileMaker Type → Standard Category mapping
        type_mapping = {
            'left dorsal': 'dorsal',
            'right dorsal': 'dorsal',
            'left medial': 'medial',
            'right medial': 'medial',
            'left lateral': 'lateral',
            'right lateral': 'lateral',
            'left plantar': 'plantar',
            'right plantar': 'plantar',
            'left planter': 'plantar',  # Common misspelling
            'right planter': 'plantar',
            'planter': 'plantar',
            'plantar': 'plantar',
            'l-brannock': 'l_brannock',
            'r-brannock': 'r_brannock',
            'left lat': 'left_lat',
            'right lat': 'right_lat',
            'dorsal': 'dorsal',
            'medial': 'medial',
            'lateral': 'lateral',
            'posterior': 'posterior',
            'anterior': 'anterior',
            'wound': 'wound',
            'right leg': 'right_leg',
            'left leg': 'left_leg',
            'casts': 'casts',
            'r shoe': 'r_shoe',
            'l shoe': 'l_shoe',
            'afo': 'afo',
        }
        
        stats = {
            'total': images.count(),
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }
        
        for i, image in enumerate(images, 1):
            if i % 500 == 0 or i == 1:
                self.stdout.write(f"   Progress: {i}/{stats['total']}")
            
            # Extract RecordID from S3 key
            try:
                filename = image.s3_key.split('/')[-1]
                recid = filename.split('.')[0]
            except:
                stats['skipped'] += 1
                continue
            
            # Get FileMaker metadata
            fm_data = metadata_lookup.get(recid)
            if not fm_data:
                stats['skipped'] += 1
                continue
            
            # Get FileMaker Type
            fm_type = fm_data.get('Type', '').strip().lower()
            if not fm_type:
                stats['skipped'] += 1
                continue
            
            # Map to standard category
            category = 'other'  # default
            for fm_key, std_cat in type_mapping.items():
                if fm_key in fm_type:
                    category = std_cat
                    break
            
            # Update category
            if not dry_run:
                try:
                    image.category = category
                    image.save(update_fields=['category'])
                    stats['updated'] += 1
                except Exception as e:
                    self.stdout.write(f"      ❌ Error updating image {image.id}: {e}")
                    stats['errors'] += 1
            else:
                # Dry run - just count
                stats['updated'] += 1
        
        # Summary
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write("📊 SUMMARY")
        self.stdout.write("=" * 70)
        self.stdout.write(f"Total images:          {stats['total']}")
        self.stdout.write(f"✅ Restored:            {stats['updated']}")
        self.stdout.write(f"⏭️  Skipped:             {stats['skipped']}")
        self.stdout.write(f"❌ Errors:              {stats['errors']}")
        
        if dry_run:
            self.stdout.write("\n🔍 DRY RUN - No changes made")
        else:
            self.stdout.write("\n✅ Categories restored!")
            self.stdout.write("\nℹ️  Note: Original FileMaker types are preserved in the caption field")

