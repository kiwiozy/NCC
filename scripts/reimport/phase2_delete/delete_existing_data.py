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
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from utils import create_logger
from patients.models import Patient
from appointments.models import Appointment
from documents.models import Document
from images.models import Image, ImageBatch
from companies.models import Company
from referrers.models import Referrer, Specialty, PatientReferrer, ReferrerCompany


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
        company_count = Company.objects.count()
        referrer_count = Referrer.objects.count()
        specialty_count = Specialty.objects.count()
        patient_referrer_count = PatientReferrer.objects.count()
        referrer_company_count = ReferrerCompany.objects.count()
        
        logger.info(f"Current Patients: {patient_count}")
        logger.info(f"Current Appointments: {appointment_count}")
        logger.info(f"Current Documents: {document_count}")
        logger.info(f"Current Images: {image_count}")
        logger.info(f"Current Image Batches: {batch_count}")
        logger.info(f"Current Companies: {company_count}")
        logger.info(f"Current Referrers: {referrer_count}")
        logger.info(f"Current Specialties: {specialty_count}")
        logger.info(f"Current Patient-Referrer Links: {patient_referrer_count}")
        logger.info(f"Current Referrer-Company Links: {referrer_company_count}")
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
        logger.warning(f"❌ Will DELETE {company_count} companies")
        logger.warning(f"❌ Will DELETE {referrer_count} referrers")
        logger.warning(f"❌ Will DELETE {specialty_count} specialties")
        logger.warning(f"❌ Will CASCADE DELETE {patient_referrer_count} patient-referrer links")
        logger.warning(f"❌ Will CASCADE DELETE {referrer_company_count} referrer-company links")
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
            # Delete Appointments first (due to PROTECT on patient FK)
            # ========================================
            logger.warning("🗑️  Starting deletion...")
            logger.info("")
            
            # Step 1: Delete relationship tables first (they reference patients/referrers/companies)
            logger.info("Step 1: Deleting patient-referrer relationships...")
            patient_referrer_count_before = PatientReferrer.objects.count()
            PatientReferrer.objects.all().delete()
            logger.success(f"✅ Deleted {patient_referrer_count_before} patient-referrer links")
            
            logger.info("")
            logger.info("Step 2: Deleting referrer-company relationships...")
            referrer_company_count_before = ReferrerCompany.objects.count()
            ReferrerCompany.objects.all().delete()
            logger.success(f"✅ Deleted {referrer_company_count_before} referrer-company links")
            
            logger.info("")
            logger.info("Step 3: Deleting appointments...")
            appointment_count_before = Appointment.objects.count()
            Appointment.objects.all().delete()
            logger.success(f"✅ Deleted {appointment_count_before} appointments")
            
            logger.info("")
            logger.info("Step 4: Deleting patients (this will take 30-60 seconds)...")
            logger.info("")
            
            # DELETE using batch processing to avoid overwhelming output
            from django.db import transaction
            
            batch_size = 100
            total_deleted = 0
            patient_ids = list(Patient.objects.values_list('id', flat=True))
            total_patients = len(patient_ids)
            
            for i in range(0, len(patient_ids), batch_size):
                batch_ids = patient_ids[i:i + batch_size]
                with transaction.atomic():
                    Patient.objects.filter(id__in=batch_ids).delete()
                    total_deleted += len(batch_ids)
                
                # Progress update every 500 patients
                if total_deleted % 500 == 0 or total_deleted == total_patients:
                    logger.info(f"  Deleted {total_deleted}/{total_patients} patients...")
            
            logger.info("")
            logger.success(f"✅ Deleted {total_deleted} patients and all related records (CASCADE)")
            
            # Step 5: Delete referrers
            logger.info("")
            logger.info("Step 5: Deleting referrers...")
            referrer_count_before = Referrer.objects.count()
            Referrer.objects.all().delete()
            logger.success(f"✅ Deleted {referrer_count_before} referrers")
            
            # Step 6: Delete companies
            logger.info("")
            logger.info("Step 6: Deleting companies...")
            company_count_before = Company.objects.count()
            Company.objects.all().delete()
            logger.success(f"✅ Deleted {company_count_before} companies")
            
            # Step 7: Delete specialties
            logger.info("")
            logger.info("Step 7: Deleting specialties...")
            specialty_count_before = Specialty.objects.count()
            Specialty.objects.all().delete()
            logger.success(f"✅ Deleted {specialty_count_before} specialties")
            
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
            remaining_companies = Company.objects.count()
            remaining_referrers = Referrer.objects.count()
            remaining_specialties = Specialty.objects.count()
            remaining_patient_referrers = PatientReferrer.objects.count()
            remaining_referrer_companies = ReferrerCompany.objects.count()
            
            logger.info(f"Remaining Patients: {remaining_patients}")
            logger.info(f"Remaining Appointments: {remaining_appointments}")
            logger.info(f"Remaining Companies: {remaining_companies}")
            logger.info(f"Remaining Referrers: {remaining_referrers}")
            logger.info(f"Remaining Specialties: {remaining_specialties}")
            logger.info(f"Remaining Patient-Referrer Links: {remaining_patient_referrers}")
            logger.info(f"Remaining Referrer-Company Links: {remaining_referrer_companies}")
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
            logger.info(f"Patients deleted: {total_deleted}")
            logger.info(f"Appointments deleted: {appointment_count_before}")
            logger.info(f"Companies deleted: {company_count_before}")
            logger.info(f"Referrers deleted: {referrer_count_before}")
            logger.info(f"Specialties deleted: {specialty_count_before}")
            logger.info(f"Patient-Referrer links deleted: {patient_referrer_count_before}")
            logger.info(f"Referrer-Company links deleted: {referrer_company_count_before}")
            logger.info(f"Total records deleted: {total_deleted + appointment_count_before + company_count_before + referrer_count_before + specialty_count_before + patient_referrer_count_before + referrer_company_count_before}")
            logger.info("")
            logger.info(f"Documents preserved: {remaining_documents}")
            logger.info(f"Images preserved: {remaining_images}")
            logger.info(f"Image batches preserved: {remaining_batches}")
            
            if (remaining_patients == 0 and remaining_appointments == 0 and 
                remaining_companies == 0 and remaining_referrers == 0 and 
                remaining_specialties == 0 and remaining_patient_referrers == 0 and 
                remaining_referrer_companies == 0):
                logger.success("")
                logger.success("✅ Deletion completed successfully!")
                logger.success("Database is now ready for fresh import")
                logger.success("")
                logger.phase_end(success=True)
                return True
            else:
                logger.error("")
                logger.error("❌ Deletion incomplete!")
                logger.error(f"Still have: {remaining_patients} patients, {remaining_appointments} appointments")
                logger.error(f"            {remaining_companies} companies, {remaining_referrers} referrers")
                logger.error(f"            {remaining_specialties} specialties, {remaining_patient_referrers} patient-referrer links")
                logger.error(f"            {remaining_referrer_companies} referrer-company links")
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

