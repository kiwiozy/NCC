"""
Phase 6: Re-Link Documents to New Patients

After reimport, documents are orphaned (patient FK points to deleted patients).
This script re-links documents to newly imported patients using filemaker_id.
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
from documents.models import Document
from django.db import transaction


def relink_documents(dry_run: bool = False) -> bool:
    """
    Re-link documents to newly imported patients.
    
    Args:
        dry_run: If True, preview re-linking without saving
    
    Returns:
        True if re-linking successful, False otherwise
    """
    logger = create_logger("PHASE 6")
    logger.phase_start("Phase 6", "Re-Link Documents to New Patients")
    
    if dry_run:
        logger.warning("🔍 DRY RUN MODE - No data will be saved")
    
    try:
        # ========================================
        # Get All Documents with FileMaker IDs
        # ========================================
        logger.info("Finding documents with FileMaker IDs...")
        
        # Documents can have filemaker_id directly or in filemaker_metadata
        documents_with_fm_id = Document.objects.filter(filemaker_id__isnull=False)
        documents_with_metadata = Document.objects.filter(filemaker_metadata__isnull=False)
        
        total_documents = documents_with_fm_id.count() + documents_with_metadata.count()
        
        logger.info(f"Found {documents_with_fm_id.count()} documents with filemaker_id")
        logger.info(f"Found {documents_with_metadata.count()} documents with filemaker_metadata")
        logger.info(f"Total documents to process: {total_documents}")
        
        # ========================================
        # Build Patient Lookup Map
        # ========================================
        logger.info("Building patient lookup map...")
        
        # Map: filemaker_id → Patient object
        patient_map = {}
        
        for patient in Patient.objects.all():
            fm_metadata = patient.filemaker_metadata
            if fm_metadata and fm_metadata.get('filemaker_id'):
                filemaker_id = str(fm_metadata['filemaker_id']).upper()  # Convert to uppercase string
                patient_map[filemaker_id] = patient
        
        logger.success(f"✅ Built lookup map for {len(patient_map)} patients")
        
        # ========================================
        # Re-Link Documents
        # ========================================
        logger.info("Re-linking documents to patients...")
        
        linked_count = 0
        already_linked_count = 0
        no_patient_found_count = 0
        error_count = 0
        
        # Process documents with filemaker_id
        for i, doc in enumerate(documents_with_fm_id):
            if (i + 1) % 100 == 0:
                logger.progress(i + 1, total_documents, "Re-linking documents")
            
            try:
                # Get FileMaker patient ID from document (stored directly in filemaker_id field)
                fm_patient_id = str(doc.filemaker_id).upper() if doc.filemaker_id else None
                
                if not fm_patient_id:
                    logger.debug(f"Document {doc.id} - no filemaker_id")
                    no_patient_found_count += 1
                    continue
                
                # Find patient
                patient = patient_map.get(fm_patient_id)
                
                if not patient:
                    logger.debug(f"Document {doc.id} - patient with filemaker_id '{fm_patient_id}' not found")
                    no_patient_found_count += 1
                    continue
                
                # Check if already linked correctly (use Generic FK)
                from django.contrib.contenttypes.models import ContentType
                patient_ct = ContentType.objects.get_for_model(Patient)
                
                if doc.content_type == patient_ct and doc.object_id == str(patient.id):
                    already_linked_count += 1
                    continue
                
                # Re-link document using Generic FK
                if not dry_run:
                    with transaction.atomic():
                        doc.content_object = patient
                        doc.save()
                
                linked_count += 1
                logger.increment_success()
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error re-linking document {doc.id}: {str(e)}")
                logger.increment_errors()
        
        # Process documents with metadata
        for i, doc in enumerate(documents_with_metadata):
            idx = documents_with_fm_id.count() + i + 1
            if idx % 100 == 0:
                logger.progress(idx, total_documents, "Re-linking documents")
            
            try:
                # Get FileMaker patient ID from document metadata
                fm_patient_id = doc.filemaker_metadata.get('filemaker_patient_id')
                
                if not fm_patient_id:
                    no_patient_found_count += 1
                    continue
                
                # Find patient
                patient = patient_map.get(fm_patient_id)
                
                if not patient:
                    logger.warning(f"Document {doc.id} - patient with filemaker_id '{fm_patient_id}' not found")
                    no_patient_found_count += 1
                    continue
                
                # Check if already linked correctly
                if doc.patient == patient:
                    already_linked_count += 1
                    continue
                
                # Re-link document
                if not dry_run:
                    with transaction.atomic():
                        doc.patient = patient
                        doc.save(update_fields=['patient'])
                
                linked_count += 1
                logger.increment_success()
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error re-linking document {doc.id}: {str(e)}")
                logger.increment_errors()
        
        logger.progress(total_documents, total_documents, "Re-linking documents")
        
        # ========================================
        # Verification
        # ========================================
        if not dry_run:
            logger.info("")
            logger.info("Verifying re-linking...")
            
            orphaned_documents = Document.objects.filter(object_id__isnull=True).count()
            
            if orphaned_documents > 0:
                logger.warning(f"⚠️  {orphaned_documents} documents still orphaned (no patient)")
            else:
                logger.success("✅ All documents have patient assigned")
        
        # ========================================
        # Summary
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Re-Linking Summary")
        logger.info("=" * 70)
        logger.info(f"Total Documents: {total_documents}")
        logger.info(f"✅ Re-Linked: {linked_count}")
        logger.info(f"Already Linked: {already_linked_count}")
        logger.info(f"⚠️  No Patient Found: {no_patient_found_count}")
        logger.info(f"❌ Errors: {error_count}")
        
        if error_count == 0 and no_patient_found_count == 0:
            logger.success("")
            logger.success("✅ Document re-linking completed successfully!")
            if not dry_run:
                logger.success("Next: Run Phase 7 to re-link images")
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
        logger.error(f"Exception during document re-linking: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Re-link documents to new patients')
    parser.add_argument('--dry-run', action='store_true', help='Preview re-linking without saving')
    args = parser.parse_args()
    
    success = relink_documents(dry_run=args.dry_run)
    sys.exit(0 if success else 1)

