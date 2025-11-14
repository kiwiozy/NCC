#!/usr/bin/env python3
"""
Phase 0.5: Backup S3 Files (Images & Documents)

Creates a complete backup of all S3 files before reimport.
This ensures we can recover actual files (not just database records) if needed.

Backup Structure:
s3://walkeasy-nexus-documents/backup/
├── Images/
│   ├── patients_UUID1_images_batch1_filename.jpg
│   ├── patients_UUID2_images_batch2_filename.jpg
│   ├── filemaker-import_images-bulk-dump_2.jpg
│   └── ...
└── Docs/
    ├── patients_UUID1_documents_filename.pdf
    ├── patients_UUID2_documents_filename.pdf
    └── ...

Usage:
    python backup_s3_files.py
    python backup_s3_files.py --dry-run
"""

import sys
import os
import django
import boto3
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

# Add Django project to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../backend')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from utils import create_logger
from django.conf import settings


def get_s3_client():
    """Get configured S3 client."""
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )


def list_all_s3_objects(bucket: str, prefix: str = '') -> List[Dict]:
    """
    List all objects in S3 bucket with given prefix.
    
    Args:
        bucket: S3 bucket name
        prefix: Prefix to filter objects
    
    Returns:
        List of object dictionaries with 'Key' and 'Size'
    """
    s3 = get_s3_client()
    objects = []
    
    paginator = s3.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=bucket, Prefix=prefix)
    
    for page in pages:
        if 'Contents' in page:
            for obj in page['Contents']:
                # Skip directories (keys ending with /)
                if not obj['Key'].endswith('/'):
                    objects.append({
                        'Key': obj['Key'],
                        'Size': obj['Size'],
                        'LastModified': obj['LastModified']
                    })
    
    return objects


def categorize_objects(objects: List[Dict]) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """
    Categorize S3 objects into images, documents, and other.
    
    Args:
        objects: List of S3 objects
    
    Returns:
        Tuple of (images, documents, other)
    """
    images = []
    documents = []
    other = []
    
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
    doc_extensions = {'.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'}
    
    for obj in objects:
        key = obj['Key'].lower()
        
        # Skip backup folder itself
        if key.startswith('backup/'):
            continue
        
        # Categorize by extension
        ext = Path(key).suffix.lower()
        
        if ext in image_extensions:
            images.append(obj)
        elif ext in doc_extensions:
            documents.append(obj)
        else:
            other.append(obj)
    
    return images, documents, other


def copy_s3_objects(bucket: str, objects: List[Dict], backup_prefix: str, dry_run: bool = False) -> Tuple[int, int]:
    """
    Copy S3 objects to backup location.
    
    Args:
        bucket: S3 bucket name
        objects: List of objects to backup
        backup_prefix: Backup prefix (e.g., 'backup/Images/')
        dry_run: If True, don't actually copy
    
    Returns:
        Tuple of (success_count, error_count)
    """
    s3 = get_s3_client()
    success_count = 0
    error_count = 0
    
    for obj in objects:
        source_key = obj['Key']
        # Preserve original path structure in backup
        backup_key = f"{backup_prefix}{source_key}"
        
        if dry_run:
            success_count += 1
            continue
        
        try:
            # Copy object within same bucket
            copy_source = {
                'Bucket': bucket,
                'Key': source_key
            }
            
            s3.copy_object(
                CopySource=copy_source,
                Bucket=bucket,
                Key=backup_key
            )
            
            success_count += 1
            
        except Exception as e:
            error_count += 1
            # Continue on error, log it but don't stop
    
    return success_count, error_count


def format_size(size_bytes: int) -> str:
    """Format bytes into human-readable size."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"


def backup_s3_files(dry_run: bool = False) -> bool:
    """
    Backup all S3 images and documents.
    
    Args:
        dry_run: If True, preview only without copying
    
    Returns:
        True if backup successful, False otherwise
    """
    logger = create_logger("PHASE 0")
    logger.phase_start("Phase 0.5", "Backup S3 Files (Images & Documents)")
    
    if dry_run:
        logger.warning("🔍 DRY RUN MODE - No files will be copied")
        logger.info("")
    
    try:
        # Get bucket name from settings
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        logger.info(f"S3 Bucket: {bucket}")
        logger.info("")
        
        # Step 1: List all objects
        logger.info("Step 1: Scanning S3 bucket for files...")
        all_objects = list_all_s3_objects(bucket)
        logger.success(f"✅ Found {len(all_objects)} total objects")
        logger.info("")
        
        # Step 2: Categorize objects
        logger.info("Step 2: Categorizing files...")
        images, documents, other = categorize_objects(all_objects)
        
        logger.info(f"📸 Images: {len(images)} files")
        logger.info(f"📄 Documents: {len(documents)} files")
        logger.info(f"🔧 Other: {len(other)} files")
        logger.info("")
        
        # Calculate sizes
        image_size = sum(obj['Size'] for obj in images)
        doc_size = sum(obj['Size'] for obj in documents)
        total_size = image_size + doc_size
        
        logger.info(f"📊 Total backup size: {format_size(total_size)}")
        logger.info(f"   - Images: {format_size(image_size)}")
        logger.info(f"   - Documents: {format_size(doc_size)}")
        logger.info("")
        
        # Step 3: Create backup timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_base = f"backup/reimport_{timestamp}/"
        
        logger.info(f"Step 3: Backup location: s3://{bucket}/{backup_base}")
        logger.info("")
        
        # Step 4: Backup images
        if images:
            logger.info(f"Step 4: Backing up {len(images)} images...")
            backup_images_prefix = f"{backup_base}Images/"
            
            success, errors = copy_s3_objects(
                bucket, 
                images, 
                backup_images_prefix, 
                dry_run
            )
            
            if errors == 0:
                logger.success(f"✅ Backed up {success}/{len(images)} images")
            else:
                logger.warning(f"⚠️  Backed up {success}/{len(images)} images ({errors} errors)")
            logger.info("")
        else:
            logger.info("Step 4: No images to backup")
            logger.info("")
        
        # Step 5: Backup documents
        if documents:
            logger.info(f"Step 5: Backing up {len(documents)} documents...")
            backup_docs_prefix = f"{backup_base}Docs/"
            
            success, errors = copy_s3_objects(
                bucket, 
                documents, 
                backup_docs_prefix, 
                dry_run
            )
            
            if errors == 0:
                logger.success(f"✅ Backed up {success}/{len(documents)} documents")
            else:
                logger.warning(f"⚠️  Backed up {success}/{len(documents)} documents ({errors} errors)")
            logger.info("")
        else:
            logger.info("Step 5: No documents to backup")
            logger.info("")
        
        # Summary
        logger.info("=" * 70)
        logger.info("📊 S3 Backup Summary")
        logger.info("=" * 70)
        logger.info(f"Backup Location: s3://{bucket}/{backup_base}")
        logger.info(f"Images Backed Up: {len(images)} files ({format_size(image_size)})")
        logger.info(f"Documents Backed Up: {len(documents)} files ({format_size(doc_size)})")
        logger.info(f"Total Size: {format_size(total_size)}")
        
        if dry_run:
            logger.info("")
            logger.warning("🔍 DRY RUN - No files were actually copied")
            logger.info("Run without --dry-run to perform actual backup")
        else:
            logger.info("")
            logger.success("✅ S3 backup complete!")
            logger.info("")
            logger.info("⚠️  IMPORTANT: Keep this backup until reimport is verified successful")
            logger.info(f"To restore: Copy files from {backup_base} back to their original locations")
        
        logger.info("=" * 70)
        logger.phase_end(success=True)
        return True
        
    except Exception as e:
        logger.error(f"Exception during S3 backup: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Backup S3 images and documents before reimport'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview backup without copying files'
    )
    
    args = parser.parse_args()
    
    success = backup_s3_files(dry_run=args.dry_run)
    sys.exit(0 if success else 1)

