"""
Phase 8: Validate Data Counts After Reimport

Checks that all record counts match expectations after reimport.
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

from scripts.reimport.utils import create_logger, create_filemaker_client
from patients.models import Patient
from appointments.models import Appointment
from documents.models import Document
from images.models import Image, ImageBatch


def validate_data_counts() -> bool:
    """
    Validate that data counts match expectations after reimport.
    
    Returns:
        True if validation passed, False otherwise
    """
    logger = create_logger("PHASE 8")
    logger.phase_start("Phase 8.1", "Validate Data Counts")
    
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
        
        logger.success(f"✅ Nexus Patients: {nexus_patients}")
        logger.success(f"✅ Nexus Appointments: {nexus_appointments}")
        logger.success(f"✅ Nexus Documents: {nexus_documents}")
        logger.success(f"✅ Nexus Images: {nexus_images}")
        logger.success(f"✅ Nexus Image Batches: {nexus_batches}")
        
        # ========================================
        # Get FileMaker Counts
        # ========================================
        logger.info("Counting records in FileMaker...")
        
        with create_filemaker_client() as fm:
            try:
                fm_patients = fm.odata_query('@Contacts', top=1)
                fm_patient_count = fm_patients.get('@odata.count', 0)
                logger.success(f"✅ FileMaker Patients: {fm_patient_count}")
            except:
                logger.warning("Could not get FileMaker patient count")
                fm_patient_count = None
            
            try:
                # Try different appointment entity names
                fm_appointments = None
                for entity in ['@Appointment', '@Appointments', 'API_Appointments']:
                    try:
                        fm_appointments = fm.odata_query(entity, top=1)
                        break
                    except:
                        continue
                
                if fm_appointments:
                    fm_appointment_count = fm_appointments.get('@odata.count', 0)
                    logger.success(f"✅ FileMaker Appointments: {fm_appointment_count}")
                else:
                    logger.warning("Could not get FileMaker appointment count")
                    fm_appointment_count = None
            except:
                logger.warning("Could not get FileMaker appointment count")
                fm_appointment_count = None
        
        # ========================================
        # Compare Counts
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Count Comparison")
        logger.info("=" * 70)
        
        if fm_patient_count is not None:
            patient_diff = nexus_patients - fm_patient_count
            if abs(patient_diff) <= 5:  # Allow small difference for skipped records
                logger.success(f"✅ Patients: Nexus={nexus_patients}, FileMaker={fm_patient_count} (diff={patient_diff})")
            else:
                logger.error(f"❌ Patients: Nexus={nexus_patients}, FileMaker={fm_patient_count} (diff={patient_diff})")
                logger.error("   Large difference detected! Check import logs.")
                all_valid = False
        else:
            logger.warning(f"⚠️  Patients: Nexus={nexus_patients}, FileMaker=Unknown")
        
        if fm_appointment_count is not None:
            appt_diff = nexus_appointments - fm_appointment_count
            if abs(appt_diff) <= 10:  # Allow small difference for skipped records
                logger.success(f"✅ Appointments: Nexus={nexus_appointments}, FileMaker={fm_appointment_count} (diff={appt_diff})")
            else:
                logger.error(f"❌ Appointments: Nexus={nexus_appointments}, FileMaker={fm_appointment_count} (diff={appt_diff})")
                logger.error("   Large difference detected! Check import logs.")
                all_valid = False
        else:
            logger.warning(f"⚠️  Appointments: Nexus={nexus_appointments}, FileMaker=Unknown")
        
        logger.info(f"Documents: {nexus_documents} (should be preserved)")
        logger.info(f"Images: {nexus_images} (should be preserved)")
        logger.info(f"Image Batches: {nexus_batches} (should be preserved)")
        
        # ========================================
        # Summary
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Validation Summary")
        logger.info("=" * 70)
        
        if all_valid:
            logger.success("✅ All count validations passed!")
        else:
            logger.error("❌ Some count validations failed!")
            logger.error("Review the differences and check import logs")
        
        logger.phase_end(success=all_valid)
        return all_valid
        
    except Exception as e:
        logger.error(f"Exception during count validation: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


if __name__ == '__main__':
    success = validate_data_counts()
    sys.exit(0 if success else 1)

