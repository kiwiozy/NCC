#!/usr/bin/env python3
"""
Generate thumbnails for existing images that don't have them.

This management command:
1. Finds all Image records without thumbnails
2. Downloads image from S3
3. Generates thumbnail (300x300 max)
4. Uploads thumbnail to S3
5. Updates Image record with thumbnail info

Usage:
    python manage.py generate_thumbnails --dry-run  # Preview
    python manage.py generate_thumbnails             # Generate all
    python manage.py generate_thumbnails --limit 100 # Generate for first 100
"""
import os
import io
from django.core.management.base import BaseCommand
from django.core.files.uploadedfile import InMemoryUploadedFile
from images.models import Image
from documents.services import S3Service
from PIL import Image as PILImage
import requests


class Command(BaseCommand):
    help = 'Generate thumbnails for images without thumbnails'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Preview only')
        parser.add_argument('--limit', type=int, default=0, help='Limit images (0=all)')
        parser.add_argument('--force', action='store_true', help='Regenerate all thumbnails (even existing)')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']
        force = options['force']
        
        self.stdout.write("=" * 70)
        self.stdout.write("🖼️  Generate Image Thumbnails")
        self.stdout.write("=" * 70)
        
        if dry_run:
            self.stdout.write(self.style.WARNING("🔍 DRY RUN MODE"))
        
        # Find images without thumbnails
        if force:
            images = Image.objects.all()
            self.stdout.write(f"\n🔄 Regenerating ALL thumbnails (force mode)")
        else:
            images = Image.objects.filter(s3_thumbnail_key__isnull=True) | Image.objects.filter(s3_thumbnail_key='')
            self.stdout.write(f"\n🔍 Finding images without thumbnails...")
        
        total = images.count()
        
        if limit > 0:
            images = images[:limit]
            self.stdout.write(f"   ⚠️  Limited to {limit} images")
        
        self.stdout.write(f"   ✅ Found {total} images to process")
        
        if total == 0:
            self.stdout.write(self.style.SUCCESS("\n✅ All images already have thumbnails!"))
            return
        
        # Initialize S3
        s3_service = S3Service()
        
        # Stats
        stats = {
            'success': 0,
            'skipped': 0,
            'errors': 0
        }
        
        # Process each image
        for i, image in enumerate(images, 1):
            # Progress every 50 images
            if i % 50 == 0:
                self.stdout.write(f"   Progress: {i}/{total}")
            
            try:
                # Generate presigned URL
                presigned_url = s3_service.generate_presigned_url(
                    image.s3_key,
                    expiration=3600,
                    filename=image.original_name
                )
                
                if not presigned_url:
                    self.stdout.write(f"   ⚠️  {i}/{total}: No presigned URL for {image.original_name}")
                    stats['skipped'] += 1
                    continue
                
                # Download image
                self.stdout.write(f"   📥 {i}/{total}: Downloading {image.original_name}...")
                response = requests.get(presigned_url, stream=True, timeout=30)
                response.raise_for_status()
                
                image_data = response.content
                
                if not image_data:
                    self.stdout.write(f"   ⚠️  Empty image data")
                    stats['skipped'] += 1
                    continue
                
                # Open with Pillow
                img = PILImage.open(io.BytesIO(image_data))
                
                # Generate thumbnail
                self.stdout.write(f"      🔨 Generating thumbnail (current size: {img.size[0]}x{img.size[1]})...")
                thumb_img = img.copy()
                thumb_img.thumbnail((300, 300), PILImage.Resampling.LANCZOS)
                
                # Save thumbnail to BytesIO
                thumb_buffer = io.BytesIO()
                thumb_img.save(thumb_buffer, format=img.format or 'JPEG', quality=85)
                thumb_buffer.seek(0)
                
                thumbnail_size = thumb_buffer.getbuffer().nbytes
                
                # Generate S3 key for thumbnail
                # If s3_key is filemaker-import/images-bulk-dump/995.jpg
                # Then thumbnail should be filemaker-import/images-bulk-dump/995_thumb.jpg
                base_key = os.path.splitext(image.s3_key)[0]
                ext = os.path.splitext(image.s3_key)[1]
                s3_thumbnail_key = f"{base_key}_thumb{ext}"
                
                self.stdout.write(f"      📤 Uploading thumbnail ({thumb_img.size[0]}x{thumb_img.size[1]}, {round(thumbnail_size/1024, 1)} KB)...")
                
                if not dry_run:
                    # Upload thumbnail to S3
                    s3_service.s3_client.put_object(
                        Bucket=s3_service.bucket_name,
                        Key=s3_thumbnail_key,
                        Body=thumb_buffer.read(),
                        ContentType=image.mime_type or 'image/jpeg'
                    )
                    
                    # Update Image record
                    image.s3_thumbnail_key = s3_thumbnail_key
                    image.thumbnail_size = thumbnail_size
                    image.save(update_fields=['s3_thumbnail_key', 'thumbnail_size'])
                    
                    self.stdout.write(f"      ✅ Thumbnail created: {s3_thumbnail_key}")
                else:
                    self.stdout.write(f"      🔍 Would create: {s3_thumbnail_key}")
                
                stats['success'] += 1
                
            except requests.RequestException as e:
                self.stdout.write(f"      ❌ Download error: {str(e)}")
                stats['errors'] += 1
            except Exception as e:
                self.stdout.write(f"      ❌ Error: {str(e)}")
                stats['errors'] += 1
                import traceback
                traceback.print_exc()
        
        # Summary
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write("📊 SUMMARY")
        self.stdout.write("=" * 70)
        self.stdout.write(f"Total images processed: {total if limit == 0 else limit}")
        self.stdout.write(f"✅ Thumbnails created:   {stats['success']}")
        self.stdout.write(f"⏭️  Skipped:              {stats['skipped']}")
        self.stdout.write(f"❌ Errors:               {stats['errors']}")
        
        if dry_run:
            self.stdout.write("\n🔍 DRY RUN - No changes made")
        else:
            self.stdout.write("\n✅ Thumbnail generation complete!")

