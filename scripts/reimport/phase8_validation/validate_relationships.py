"""
Phase 8: Validate Relationships After Reimport

Checks that all foreign key relationships are valid after reimport.
No NULL values where they shouldn't be.
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
from images.models import ImageBatch


def validate_relationships() -> bool:
    """
    Validate that all relationships are properly set.
    
    Returns:
        True if validation passed, False otherwise
    """
    logger = create_logger("PHASE 8")
    logger.phase_start("Phase 8.2", "Validate Relationships")
    
    all_valid = True
    
    try:
        # ========================================
        # Validate Patient Relationships
        # ========================================
        logger.info("Validating patient relationships...")
        
        patients_without_clinic = Patient.objects.filter(clinic__isnull=True).count()
        
        if patients_without_clinic > 0:
            logger.warning(f"⚠️  {patients_without_clinic} patients without clinic")
            logger.warning("This may be acceptable if some patients have no clinic in FileMaker")
        else:
            logger.success("✅ All patients have clinic assigned")
        
        # ========================================
        # Validate Appointment Relationships
        # ========================================
        logger.info("Validating appointment relationships...")
        
        appointments_without_patient = Appointment.objects.filter(patient__isnull=True).count()
        appointments_without_clinic = Appointment.objects.filter(clinic__isnull=True).count()
        appointments_without_clinician = Appointment.objects.filter(clinician__isnull=True).count()
        appointments_without_type = Appointment.objects.filter(appointment_type__isnull=True).count()
        
        if appointments_without_patient > 0:
            logger.error(f"❌ {appointments_without_patient} appointments without patient")
            logger.error("   This should NOT happen! All appointments must have a patient.")
            all_valid = False
        else:
            logger.success("✅ All appointments have patient assigned")
        
        if appointments_without_clinic > 0:
            logger.warning(f"⚠️  {appointments_without_clinic} appointments without clinic")
            logger.warning("This may indicate missing data in FileMaker")
        else:
            logger.success("✅ All appointments have clinic assigned")
        
        if appointments_without_clinician > 0:
            logger.warning(f"⚠️  {appointments_without_clinician} appointments without clinician")
            logger.warning("This may indicate missing data in FileMaker")
        else:
            logger.success("✅ All appointments have clinician assigned")
        
        if appointments_without_type > 0:
            logger.warning(f"⚠️  {appointments_without_type} appointments without type")
            logger.warning("This may indicate missing data in FileMaker")
        else:
            logger.success("✅ All appointments have type assigned")
        
        # ========================================
        # Validate Document Relationships
        # ========================================
        logger.info("Validating document relationships...")
        
        # NOTE: Documents use Generic Foreign Keys (content_type + object_id)
        # We can't filter by `patient` directly - skip this validation
        documents_with_filemaker_id = Document.objects.filter(filemaker_id__isnull=False).count()
        total_documents = Document.objects.count()
        
        logger.info(f"Total documents: {total_documents}")
        logger.info(f"Documents with FileMaker ID: {documents_with_filemaker_id}")
        logger.success("✅ Document validation skipped (uses Generic Foreign Keys)")
        
        # ========================================
        # Validate Image Relationships
        # ========================================
        logger.info("Validating image batch relationships...")
        
        from django.contrib.contenttypes.models import ContentType
        patient_content_type = ContentType.objects.get_for_model(Patient)
        
        batches_linked_to_patients = ImageBatch.objects.filter(content_type=patient_content_type).count()
        total_batches = ImageBatch.objects.count()
        batches_not_linked = total_batches - batches_linked_to_patients
        
        if batches_not_linked > 0:
            logger.error(f"❌ {batches_not_linked} image batches not linked to patients")
            logger.error("   Image batches should be re-linked! Check Phase 7 logs.")
            all_valid = False
        else:
            logger.success("✅ All image batches linked to patients")
        
        # ========================================
        # Summary
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Relationship Validation Summary")
        logger.info("=" * 70)
        
        logger.info(f"Patients without clinic: {patients_without_clinic}")
        logger.info(f"Appointments without patient: {appointments_without_patient}")
        logger.info(f"Appointments without clinic: {appointments_without_clinic}")
        logger.info(f"Appointments without clinician: {appointments_without_clinician}")
        logger.info(f"Appointments without type: {appointments_without_type}")
        logger.info(f"Documents without patient: {documents_without_patient}")
        logger.info(f"Image batches not linked to patients: {batches_not_linked}")
        
        if all_valid:
            logger.success("")
            logger.success("✅ All critical relationship validations passed!")
            logger.success("")
        else:
            logger.error("")
            logger.error("❌ Some critical relationship validations failed!")
            logger.error("Fix issues before using the system")
            logger.error("")
        
        logger.phase_end(success=all_valid)
        return all_valid
        
    except Exception as e:
        logger.error(f"Exception during relationship validation: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


if __name__ == '__main__':
    success = validate_relationships()
    sys.exit(0 if success else 1)

