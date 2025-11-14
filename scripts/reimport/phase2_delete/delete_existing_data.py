"""
Phase 2: Delete Existing Patient Data

⚠️  DESTRUCTIVE OPERATION ⚠️

Deletes all existing patient records from Nexus.
This will CASCADE delete appointments, notes, letters, etc.
Documents and images are preserved (orphaned) for re-linking.
"""

import sys
import os
import django

# Add Django project to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../backend')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from scripts.reimport.utils import create_logger
from patients.models import Patient
from appointments.models import Appointment
from documents.models import Document
from images.models import Image, ImageBatch


def delete_existing_data(dry_run: bool = False) -> bool:
    """
    Delete all existing patient data.
    
    Args:
        dry_run: If True, only show what would be deleted without actually deleting
    
    Returns:
        True if deletion successful, False otherwise
    """
    logger = create_logger("PHASE 2")
    logger.phase_start("Phase 2", "Delete Existing Patient Data")
    
    if dry_run:
        logger.warning("🔍 DRY RUN MODE - No data will be deleted")
    else:
        logger.warning("⚠️  DESTRUCTIVE MODE - Data will be permanently deleted!")
    
    logger.warning("")
    
    try:
        # ========================================
        # Count Current Data
        # ========================================
        logger.info("Counting current data...")
        
        patient_count = Patient.objects.count()
        appointment_count = Appointment.objects.count()
        document_count = Document.objects.count()
        image_count = Image.objects.count()
        batch_count = ImageBatch.objects.count()
        
        logger.info(f"Current Patients: {patient_count}")
        logger.info(f"Current Appointments: {appointment_count}")
        logger.info(f"Current Documents: {document_count}")
        logger.info(f"Current Images: {image_count}")
        logger.info(f"Current Image Batches: {batch_count}")
        logger.info("")
        
        # ========================================
        # Explain What Will Happen
        # ========================================
        logger.warning("=" * 70)
        logger.warning("DELETION PLAN:")
        logger.warning("=" * 70)
        logger.warning(f"❌ Will DELETE {patient_count} patients")
        logger.warning(f"❌ Will CASCADE DELETE {appointment_count} appointments")
        logger.warning(f"❌ Will CASCADE DELETE all notes, letters, reminders, SMS")
        logger.warning("")
        logger.warning(f"✅ Will PRESERVE {document_count} document records (orphaned)")
        logger.warning(f"✅ Will PRESERVE {image_count} image records (orphaned)")
        logger.warning(f"✅ Will PRESERVE {batch_count} image batch records (orphaned)")
        logger.warning(f"✅ Will PRESERVE all S3 files")
        logger.warning(f"✅ Will PRESERVE all system config (Clinics, Clinicians, Types)")
        logger.warning("=" * 70)
        logger.warning("")
        
        if dry_run:
            logger.info("Dry run complete - no data was deleted")
            logger.phase_end(success=True)
            return True
        
        # ========================================
        # Confirm Before Deletion
        # ========================================
        if not dry_run:
            logger.warning("⚠️  FINAL WARNING: This will permanently delete all patient data!")
            logger.warning("Make sure you have a backup before proceeding!")
            logger.warning("")
            
            # In non-interactive mode, we assume backup was created in Phase 0
            # and user has reviewed the deletion plan
            
            # ========================================
            # Delete Patients (CASCADE deletes appointments, notes, etc.)
            # ========================================
            logger.warning("🗑️  Starting deletion...")
            logger.info("")
            
            logger.info("Deleting patients...")
            deleted_count, deleted_details = Patient.objects.all().delete()
            
            logger.success(f"✅ Deleted {deleted_count} total records:")
            for model, count in deleted_details.items():
                logger.info(f"  - {model}: {count}")
            
            # ========================================
            # Verify Deletion
            # ========================================
            logger.info("")
            logger.info("Verifying deletion...")
            
            remaining_patients = Patient.objects.count()
            remaining_appointments = Appointment.objects.count()
            remaining_documents = Document.objects.count()
            remaining_images = Image.objects.count()
            remaining_batches = ImageBatch.objects.count()
            
            logger.info(f"Remaining Patients: {remaining_patients}")
            logger.info(f"Remaining Appointments: {remaining_appointments}")
            logger.info(f"Remaining Documents: {remaining_documents} (should match original)")
            logger.info(f"Remaining Images: {remaining_images} (should match original)")
            logger.info(f"Remaining Image Batches: {remaining_batches} (should match original)")
            
            # ========================================
            # Summary
            # ========================================
            logger.info("")
            logger.info("=" * 70)
            logger.info("📊 Deletion Summary")
            logger.info("=" * 70)
            logger.info(f"Total records deleted: {deleted_count}")
            logger.info(f"Patients deleted: {patient_count}")
            logger.info(f"Appointments deleted: {appointment_count}")
            logger.info("")
            logger.info(f"Documents preserved: {remaining_documents}")
            logger.info(f"Images preserved: {remaining_images}")
            logger.info(f"Image batches preserved: {remaining_batches}")
            
            if remaining_patients == 0 and remaining_appointments == 0:
                logger.success("")
                logger.success("✅ Deletion completed successfully!")
                logger.success("Database is now ready for fresh import")
                logger.success("")
                logger.phase_end(success=True)
                return True
            else:
                logger.error("")
                logger.error("❌ Deletion incomplete!")
                logger.error(f"Still have {remaining_patients} patients and {remaining_appointments} appointments")
                logger.error("")
                logger.phase_end(success=False)
                return False
        
    except Exception as e:
        logger.error(f"Exception during deletion: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Delete existing patient data')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be deleted without actually deleting')
    parser.add_argument('--confirm', action='store_true', help='Confirm deletion (required for actual deletion)')
    args = parser.parse_args()
    
    if not args.dry_run and not args.confirm:
        print("ERROR: Must specify either --dry-run or --confirm")
        print("  --dry-run: Preview what would be deleted")
        print("  --confirm: Actually delete data (requires backup)")
        sys.exit(1)
    
    success = delete_existing_data(dry_run=args.dry_run)
    sys.exit(0 if success else 1)

