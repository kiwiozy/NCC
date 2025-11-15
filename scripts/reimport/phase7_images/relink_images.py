"""
Phase 7: Re-Link Images to New Patients

After reimport, ImageBatches are orphaned (patient FK points to deleted patients).
This script re-links ImageBatches (and their associated Images) to newly imported patients using filemaker_id.
"""

import sys
import os
import django

# Add Django project to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../backend')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from utils import create_logger
from patients.models import Patient
from images.models import Image, ImageBatch
from django.db import transaction


def relink_images(dry_run: bool = False) -> bool:
    """
    Re-link image batches (and images) to newly imported patients.
    
    Args:
        dry_run: If True, preview re-linking without saving
    
    Returns:
        True if re-linking successful, False otherwise
    """
    logger = create_logger("PHASE 7")
    logger.phase_start("Phase 7", "Re-Link Images to New Patients")
    
    if dry_run:
        logger.warning("🔍 DRY RUN MODE - No data will be saved")
    
    try:
        # ========================================
        # Get All ImageBatches
        # ========================================
        logger.info("Finding image batches...")
        
        image_batches = ImageBatch.objects.all()
        total_batches = image_batches.count()
        
        logger.info(f"Found {total_batches} image batches to process")
        
        # Count images
        total_images = Image.objects.count()
        logger.info(f"Total images: {total_images}")
        
        # ========================================
        # Build Patient Lookup Map
        # ========================================
        logger.info("Building patient lookup map...")
        
        # Map: filemaker_id → Patient object
        patient_map = {}
        
        for patient in Patient.objects.all():
            fm_metadata = patient.filemaker_metadata
            if fm_metadata and fm_metadata.get('filemaker_id'):
                filemaker_id = fm_metadata['filemaker_id']
                patient_map[filemaker_id] = patient
        
        logger.success(f"✅ Built lookup map for {len(patient_map)} patients")
        
        # ========================================
        # Re-Link ImageBatches
        # ========================================
        logger.info("Re-linking image batches to patients...")
        
        linked_count = 0
        already_linked_count = 0
        no_patient_found_count = 0
        error_count = 0
        
        for i, batch in enumerate(image_batches):
            # Show progress every 25 records (heartbeat) - batches are fewer
            if (i + 1) % 25 == 0:
                logger.info(f"💓 Still working... {i + 1}/{total_batches} image batches processed")
            
            # Show detailed progress every 50 records
            if (i + 1) % 50 == 0:
                logger.progress(i + 1, total_batches, "Re-linking image batches")
            
            try:
                # Get FileMaker patient ID from batch metadata
                fm_patient_id = batch.metadata.get('filemaker_patient_id') if batch.metadata else None
                
                if not fm_patient_id:
                    logger.debug(f"ImageBatch {batch.id} - no filemaker_patient_id in metadata")
                    no_patient_found_count += 1
                    continue
                
                # Find patient
                patient = patient_map.get(fm_patient_id)
                
                if not patient:
                    logger.warning(f"ImageBatch {batch.id} - patient with filemaker_id '{fm_patient_id}' not found")
                    no_patient_found_count += 1
                    continue
                
                # Check if already linked correctly
                if batch.content_object == patient:
                    already_linked_count += 1
                    continue
                
                # Re-link image batch
                if not dry_run:
                    with transaction.atomic():
                        # ImageBatch uses generic FK
                        # content_type should be for Patient model
                        # object_id should be patient's UUID
                        from django.contrib.contenttypes.models import ContentType
                        patient_content_type = ContentType.objects.get_for_model(Patient)
                        
                        batch.content_type = patient_content_type
                        batch.object_id = patient.id
                        batch.save(update_fields=['content_type', 'object_id'])
                
                linked_count += 1
                logger.increment_success()
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error re-linking image batch {batch.id}: {str(e)}")
                logger.increment_errors()
        
        logger.progress(total_batches, total_batches, "Re-linking image batches")
        
        # ========================================
        # Verification
        # ========================================
        if not dry_run:
            logger.info("")
            logger.info("Verifying re-linking...")
            
            # Count batches linked to patients
            from django.contrib.contenttypes.models import ContentType
            patient_content_type = ContentType.objects.get_for_model(Patient)
            
            batches_linked_to_patients = ImageBatch.objects.filter(
                content_type=patient_content_type
            ).count()
            
            logger.info(f"ImageBatches linked to patients: {batches_linked_to_patients}/{total_batches}")
            
            orphaned_batches = total_batches - batches_linked_to_patients
            
            if orphaned_batches > 0:
                logger.warning(f"⚠️  {orphaned_batches} image batches not linked to patients")
            else:
                logger.success("✅ All image batches linked to patients")
        
        # ========================================
        # Summary
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Re-Linking Summary")
        logger.info("=" * 70)
        logger.info(f"Total ImageBatches: {total_batches}")
        logger.info(f"Total Images: {total_images}")
        logger.info(f"✅ Re-Linked: {linked_count}")
        logger.info(f"Already Linked: {already_linked_count}")
        logger.info(f"⚠️  No Patient Found: {no_patient_found_count}")
        logger.info(f"❌ Errors: {error_count}")
        
        if error_count == 0 and no_patient_found_count == 0:
            logger.success("")
            logger.success("✅ Image re-linking completed successfully!")
            if not dry_run:
                logger.success("Next: Run Phase 8 for post-import validation")
            logger.success("")
            logger.phase_end(success=True)
            return True
        else:
            logger.warning("")
            logger.warning(f"⚠️  Re-linking completed with issues")
            logger.warning("Review logs before proceeding")
            logger.warning("")
            logger.phase_end(success=False)
            return False
            
    except Exception as e:
        logger.error(f"Exception during image re-linking: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Re-link images to new patients')
    parser.add_argument('--dry-run', action='store_true', help='Preview re-linking without saving')
    args = parser.parse_args()
    
    success = relink_images(dry_run=args.dry_run)
    sys.exit(0 if success else 1)

