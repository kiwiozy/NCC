#!/usr/bin/env python3
"""
Update image counts for all batches.

The image_count field caches the number of images in each batch.
This command recalculates and updates all counts.

Usage:
    python manage.py update_batch_counts
"""
from django.core.management.base import BaseCommand
from images.models import ImageBatch


class Command(BaseCommand):
    help = 'Update image counts for all batches'

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("🔢 Update Image Batch Counts")
        self.stdout.write("=" * 70)
        
        batches = ImageBatch.objects.all()
        total = batches.count()
        
        self.stdout.write(f"\n📊 Found {total} batches to update")
        
        updated = 0
        zero_count = 0
        
        for i, batch in enumerate(batches, 1):
            if i % 100 == 0:
                self.stdout.write(f"   Progress: {i}/{total}")
            
            old_count = batch.image_count
            batch.update_image_count()
            new_count = batch.image_count
            
            if new_count != old_count:
                updated += 1
            
            if new_count == 0:
                zero_count += 1
        
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write("📊 SUMMARY")
        self.stdout.write("=" * 70)
        self.stdout.write(f"Total batches:     {total}")
        self.stdout.write(f"✅ Updated:         {updated}")
        self.stdout.write(f"⚠️  Zero images:     {zero_count}")
        self.stdout.write("\n✅ Batch counts updated!")

