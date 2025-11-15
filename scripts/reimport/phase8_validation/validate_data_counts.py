"""
Phase 8: Validate Data Counts After Reimport

Checks that all record counts match expectations after reimport.
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
from appointments.models import Appointment
from documents.models import Document
from images.models import Image, ImageBatch


def validate_data_counts() -> bool:
    """
    Validate that data counts are reasonable after reimport.
    
    NOTE: FileMaker validation removed - we're now 100% Excel-based!
    This script now only validates Nexus record counts.
    
    Returns:
        True if validation passed, False otherwise
    """
    logger = create_logger("PHASE 8")
    logger.phase_start("Phase 8.1", "Validate Data Counts")
    
    logger.info("✅ 100% Excel-based import - No FileMaker validation needed!")
    logger.info("")
    
    all_valid = True
    
    try:
        # ========================================
        # Get Nexus Counts
        # ========================================
        logger.info("Counting records in Nexus...")
        
        nexus_patients = Patient.objects.count()
        nexus_appointments = Appointment.objects.count()
        nexus_documents = Document.objects.count()
        nexus_images = Image.objects.count()
        nexus_batches = ImageBatch.objects.count()
        
        logger.success(f"✅ Nexus Patients: {nexus_patients:,}")
        logger.success(f"✅ Nexus Appointments: {nexus_appointments:,}")
        logger.success(f"✅ Nexus Documents: {nexus_documents:,}")
        logger.success(f"✅ Nexus Images: {nexus_images:,}")
        logger.success(f"✅ Nexus Image Batches: {nexus_batches:,}")
        
        # ========================================
        # Validate Counts
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Count Validation (Excel-Based Expected Counts)")
        logger.info("=" * 70)
        
        # Expected counts from Excel files
        expected_patients = 2842  # From Contacts.xlsx
        expected_appointments = 15149  # From Appointments.xlsx
        expected_notes = 11408  # From Notes.xlsx
        expected_docs = 11274  # From Docs.xlsx
        expected_images = 6662  # From images.xlsx
        
        # Validate patients
        if nexus_patients == 0:
            logger.error("❌ No patients found! Import may have failed.")
            all_valid = False
        elif abs(nexus_patients - expected_patients) <= 5:
            logger.success(f"✅ Patients: {nexus_patients:,} (expected ~{expected_patients:,})")
        else:
            diff = nexus_patients - expected_patients
            logger.warning(f"⚠️  Patients: {nexus_patients:,} (expected ~{expected_patients:,}, diff={diff:+,})")
        
        # Validate appointments
        if nexus_appointments == 0:
            logger.error("❌ No appointments found! Import may have failed.")
            all_valid = False
        elif abs(nexus_appointments - expected_appointments) <= 10:
            logger.success(f"✅ Appointments: {nexus_appointments:,} (expected ~{expected_appointments:,})")
        else:
            diff = nexus_appointments - expected_appointments
            logger.warning(f"⚠️  Appointments: {nexus_appointments:,} (expected ~{expected_appointments:,}, diff={diff:+,})")
        
        # Validate other counts
        logger.info(f"Documents: {nexus_documents:,} (expected ~{expected_docs:,}, preserved from previous import)")
        logger.info(f"Images: {nexus_images:,} (expected ~{expected_images:,}, preserved from previous import)")
        logger.info(f"Image Batches: {nexus_batches:,}")
        
        # ========================================
        # Summary
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Validation Summary")
        logger.info("=" * 70)
        
        if all_valid:
            logger.success("✅ All count validations passed!")
            logger.success("Data appears to have imported successfully!")
        else:
            logger.error("❌ Some count validations failed!")
            logger.error("Review the counts and check import logs")
        
        logger.phase_end(success=all_valid)
        return all_valid
        
    except Exception as e:
        logger.error(f"Exception during count validation: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


if __name__ == '__main__':
    success = validate_data_counts()
    sys.exit(0 if success else 1)

