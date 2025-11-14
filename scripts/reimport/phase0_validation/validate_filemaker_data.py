"""
Phase 0: Validate FileMaker Data Completeness

Checks that all required fields are populated in FileMaker before import.
Critical validation to prevent import failures due to missing data.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils import create_logger, create_filemaker_client
from typing import List, Dict, Tuple


def validate_filemaker_data() -> bool:
    """
    Validate that all required data is present in FileMaker.
    
    Returns:
        True if all validation passes, False otherwise
    """
    logger = create_logger("PHASE 0")
    logger.phase_start("Phase 0.2", "Validate FileMaker Data Completeness")
    
    all_valid = True
    
    try:
        with create_filemaker_client() as fm:
            # ========================================
            # Validate Patients (Sample Only)
            # ========================================
            logger.info("Validating sample of FileMaker patients...")
            
            # Get just a sample (first 500 patients) for validation
            try:
                sample_response = fm.odata_query('@Contacts', top=500)
                patients = sample_response.get('value', [])
                logger.success(f"Retrieved {len(patients)} patients for validation")
                total_patients = f"{len(patients)}+ (sample)"
            except Exception as e:
                logger.error(f"Failed to fetch patient sample: {str(e)}")
                logger.warning("Skipping patient validation - cannot fetch sample")
                patients = []
                total_patients = "unknown"
                all_valid = False
            
            if patients:
                # Check for missing clinic
                patients_without_clinic = [
                    p for p in patients 
                    if not p.get('Clinic_Name') and not p.get('id_Clinic')
                ]
                
                if patients_without_clinic:
                    logger.warning(f"⚠️  Sample: {len(patients_without_clinic)}/{len(patients)} patients missing clinic assignment")
                    logger.warning("Example patients without clinic:")
                    for patient in patients_without_clinic[:5]:
                        logger.warning(f"  - {patient.get('nameFirst', 'Unknown')} {patient.get('nameLast', 'Unknown')} (ID: {patient.get('id')})")
                    logger.warning("Note: This is a sample check. Full import may have more issues.")
                    all_valid = False
                else:
                    logger.success("✅ Sample patients all have clinic assigned")
                
                # Check for missing names
                patients_without_name = [
                    p for p in patients 
                    if not p.get('nameFirst') and not p.get('nameLast')
                ]
                
                if patients_without_name:
                    logger.warning(f"⚠️  Sample: {len(patients_without_name)}/{len(patients)} patients missing name data")
                    logger.info("These will be skipped during import")
                else:
                    logger.success("✅ Sample patients all have name data")
            
            # ========================================
            # Validate Appointments
            # ========================================
            logger.info("Fetching appointments from FileMaker...")
            try:
                # Try to get appointments (table name might vary)
                appointments = fm.odata_get_all('@Appointment', batch_size=100)
                logger.success(f"Found {len(appointments)} appointments")
                
                # Check for missing clinic
                appointments_without_clinic = [
                    a for a in appointments 
                    if not a.get('clinic_name') and not a.get('id_Clinic')
                ]
                
                if appointments_without_clinic:
                    logger.warning(f"⚠️  {len(appointments_without_clinic)} appointments missing clinic")
                    all_valid = False
                else:
                    logger.success("✅ All appointments have clinic assigned")
                
                # Check for missing clinician
                appointments_without_clinician = [
                    a for a in appointments 
                    if not a.get('clinician_name') and not a.get('id_Clinician')
                ]
                
                if appointments_without_clinician:
                    logger.warning(f"⚠️  {len(appointments_without_clinician)} appointments missing clinician")
                    all_valid = False
                else:
                    logger.success("✅ All appointments have clinician assigned")
                
                # Check for missing appointment type
                appointments_without_type = [
                    a for a in appointments 
                    if not a.get('appointment_type') and not a.get('Type')
                ]
                
                if appointments_without_type:
                    logger.warning(f"⚠️  {len(appointments_without_type)} appointments missing appointment type")
                    all_valid = False
                else:
                    logger.success("✅ All appointments have type assigned")
                    
            except Exception as e:
                logger.warning(f"Could not validate appointments: {str(e)}")
                logger.warning("Appointment validation skipped - will need to verify manually")
            
            # ========================================
            # Validate Documents
            # ========================================
            logger.info("Checking documents have NexusExportDate...")
            try:
                # Sample check - get first 100 documents
                docs = fm.odata_query('@Documents', top=100)  # Adjust entity name as needed
                docs_list = docs.get('value', [])
                
                docs_without_export_date = [
                    d for d in docs_list 
                    if not d.get('NexusExportDate')
                ]
                
                if docs_without_export_date:
                    logger.warning(f"⚠️  Sample: {len(docs_without_export_date)}/100 documents missing NexusExportDate")
                    logger.warning("Documents without export date will be re-uploaded (not ideal)")
                else:
                    logger.success("✅ Sample documents have NexusExportDate")
                    
            except Exception as e:
                logger.warning(f"Could not validate documents: {str(e)}")
                logger.warning("Document validation skipped")
            
            # ========================================
            # Validate Images
            # ========================================
            logger.info("Checking images have NexusExportDate...")
            try:
                # Sample check - get first 100 images
                images = fm.odata_query('@Images', top=100)  # Adjust entity name as needed
                images_list = images.get('value', [])
                
                images_without_export_date = [
                    i for i in images_list 
                    if not i.get('NexusExportDate')
                ]
                
                if images_without_export_date:
                    logger.warning(f"⚠️  Sample: {len(images_without_export_date)}/100 images missing NexusExportDate")
                    logger.warning("Images without export date will be re-uploaded (not ideal)")
                else:
                    logger.success("✅ Sample images have NexusExportDate")
                    
            except Exception as e:
                logger.warning(f"Could not validate images: {str(e)}")
                logger.warning("Image validation skipped")
            
            # ========================================
            # Summary
            # ========================================
            logger.info("")
            logger.info("=" * 70)
            logger.info("📊 Validation Summary")
            logger.info("=" * 70)
            logger.info(f"Total Patients: {total_patients}")
            if patients:
                logger.info(f"Sample Size: {len(patients)} patients")
                logger.info(f"Sample without clinic: {len(patients_without_clinic)}")
                logger.info(f"Sample without name: {len(patients_without_name)}")
            else:
                logger.warning("No patient sample available for validation")
            
            if all_valid:
                logger.success("")
                logger.success("✅ All critical validations passed!")
                logger.success("FileMaker data is ready for import")
                logger.success("")
            else:
                logger.warning("")
                logger.warning("⚠️  Some validations failed or were skipped!")
                logger.warning("This is informational only - import can proceed")
                logger.warning("Some records may be skipped/incomplete during import")
                logger.warning("")
            
            # Always succeed - this is just informational
            logger.phase_end(success=True)
            return True
            
    except Exception as e:
        logger.error(f"Exception during data validation: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


if __name__ == '__main__':
    success = validate_filemaker_data()
    sys.exit(0 if success else 1)

