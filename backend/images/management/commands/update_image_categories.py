#!/usr/bin/env python3
"""
Update Image Categories from FileMaker Type

This script updates existing Image records to use the FileMaker Type field
as the category name instead of the mapped category codes.

Usage:
    python manage.py update_image_categories --dry-run  # Test mode
    python manage.py update_image_categories             # Update all images
"""
import csv
from django.core.management.base import BaseCommand
from django.db import transaction
from images.models import Image


class Command(BaseCommand):
    help = 'Update image categories to use FileMaker Type names'

    def add_arguments(self, parser):
        parser.add_argument('--csv', type=str, default='filemaker_images_metadata.csv', help='CSV file with metadata')
        parser.add_argument('--dry-run', action='store_true', help='Test mode')

    def handle(self, *args, **options):
        csv_file = options['csv']
        dry_run = options['dry_run']
        
        self.stdout.write("=" * 70)
        self.stdout.write("🔄 Update Image Categories from FileMaker Type")
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
        
        # Images from FileMaker have s3_key starting with 'filemaker-import/images-bulk-dump/'
        images = Image.objects.filter(s3_key__startswith='filemaker-import/images-bulk-dump/')
        self.stdout.write(f"   ✅ Found {images.count()} images")
        
        # Step 3: Update categories
        self.stdout.write("\n🔄 Step 3: Updating categories...")
        
        stats = {
            'total': images.count(),
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }
        
        for i, image in enumerate(images, 1):
            if i % 500 == 0 or i == 1:
                self.stdout.write(f"   Progress: {i}/{stats['total']}")
            
            # Extract RecordID from S3 key (e.g., "filemaker-import/images-bulk-dump/2.jpg" -> "2")
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
            fm_type = fm_data.get('Type', '').strip()
            if not fm_type:
                stats['skipped'] += 1
                continue
            
            # Update category to FileMaker Type
            if not dry_run:
                try:
                    image.category = fm_type
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
        self.stdout.write(f"✅ Updated:             {stats['updated']}")
        self.stdout.write(f"⏭️  Skipped:             {stats['skipped']}")
        self.stdout.write(f"❌ Errors:              {stats['errors']}")
        
        if dry_run:
            self.stdout.write("\n🔍 DRY RUN - No changes made")
        else:
            self.stdout.write("\n✅ Update complete!")

