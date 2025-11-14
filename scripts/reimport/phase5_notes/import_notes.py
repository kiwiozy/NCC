"""
Phase 5: Import Notes into Nexus

Imports patient notes from FileMaker export JSON into Nexus database.
Handles data transformation and patient lookup.
"""

import sys
import os
import json
import django
from datetime import datetime
from pathlib import Path

# Add Django project to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../backend')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from scripts.reimport.utils import create_logger
from patients.models import Patient
from notes.models import Note
from django.db import transaction


def determine_note_type(note_data: dict) -> str:
    """
    Determine the note type from FileMaker data.
    
    Args:
        note_data: Note data from FileMaker
    
    Returns:
        Note type string (one of NOTE_TYPE_CHOICES)
    """
    # Try to get note type from FileMaker fields
    note_type_fm = note_data.get('Type') or note_data.get('note_type') or note_data.get('Category')
    
    if note_type_fm:
        note_type_lower = note_type_fm.lower()
        
        # Map FileMaker types to Nexus types
        if 'clinical' in note_type_lower:
            return 'clinical_notes'
        elif 'clinic' in note_type_lower or 'date' in note_type_lower:
            return 'clinic_dates'
        elif 'order' in note_type_lower:
            return 'order_notes'
        elif 'admin' in note_type_lower:
            return 'admin_notes'
        elif 'referral' in note_type_lower:
            return 'referral'
        elif '3d' in note_type_lower or 'scan' in note_type_lower:
            return '3d_scan_data'
        elif 'workshop' in note_type_lower:
            return 'workshop_note'
    
    # Default to 'other' if can't determine
    return 'other'


def import_notes(import_file: str, dry_run: bool = False) -> bool:
    """
    Import notes from JSON file into Nexus.
    
    Args:
        import_file: Path to JSON export file
        dry_run: If True, preview import without saving
    
    Returns:
        True if import successful, False otherwise
    """
    logger = create_logger("PHASE 5")
    logger.phase_start("Phase 5.2", "Import Notes into Nexus")
    
    if dry_run:
        logger.warning("🔍 DRY RUN MODE - No data will be saved")
    
    try:
        # ========================================
        # Load Export File
        # ========================================
        logger.info(f"Loading export file: {import_file}")
        
        with open(import_file, 'r') as f:
            export_data = json.load(f)
        
        notes_data = export_data.get('notes', [])
        logger.success(f"✅ Loaded {len(notes_data)} notes from export")
        
        if len(notes_data) == 0:
            logger.info("No notes to import")
            logger.phase_end(success=True)
            return True
        
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
        
        logger.success(f"✅ Built patient lookup map with {len(patient_map)} patients")
        
        # ========================================
        # Import Notes
        # ========================================
        logger.info("Starting note import...")
        
        imported_count = 0
        skipped_count = 0
        error_count = 0
        
        for i, note_data in enumerate(notes_data):
            if (i + 1) % 100 == 0:
                logger.progress(i + 1, len(notes_data), "Importing notes")
            
            try:
                # Get patient
                patient_filemaker_id = note_data.get('id_Contact') or note_data.get('patient_id')
                patient = patient_map.get(patient_filemaker_id)
                
                if not patient:
                    logger.debug(f"Skipping note {note_data.get('id')} - patient not found")
                    skipped_count += 1
                    continue
                
                # Get note content (try different field names)
                content = note_data.get('Note') or note_data.get('content') or note_data.get('Text') or ''
                
                if not content.strip():
                    logger.debug(f"Skipping note {note_data.get('id')} - no content")
                    skipped_count += 1
                    continue
                
                # Determine note type
                note_type = determine_note_type(note_data)
                
                # Get created_by (if available)
                created_by = note_data.get('created_by') or note_data.get('CreatedBy') or 'FileMaker Import'
                
                if not dry_run:
                    # Create note record
                    with transaction.atomic():
                        note = Note.objects.create(
                            patient=patient,
                            note_type=note_type,
                            content=content,
                            created_by=created_by,
                        )
                
                imported_count += 1
                logger.increment_success()
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error importing note {note_data.get('id')}: {str(e)}")
                logger.increment_errors()
        
        logger.progress(len(notes_data), len(notes_data), "Importing notes")
        
        # ========================================
        # Summary
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Import Summary")
        logger.info("=" * 70)
        logger.info(f"Total Records: {len(notes_data)}")
        logger.info(f"✅ Imported: {imported_count}")
        logger.info(f"⏭️  Skipped: {skipped_count} (no patient or no content)")
        logger.info(f"❌ Errors: {error_count}")
        
        if not dry_run:
            # Verify import
            total_notes_now = Note.objects.count()
            logger.info(f"Total Notes in Nexus: {total_notes_now}")
        
        if error_count == 0:
            logger.success("")
            logger.success("✅ Note import completed successfully!")
            if not dry_run:
                logger.success(f"Next: Run Phase 6 to re-link documents")
            logger.success("")
            logger.phase_end(success=True)
            return True
        else:
            logger.warning("")
            logger.warning(f"⚠️  Import completed with {error_count} errors")
            logger.warning("Review logs and fix issues before proceeding")
            logger.warning("")
            logger.phase_end(success=False)
            return False
            
    except Exception as e:
        logger.error(f"Exception during note import: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


def find_latest_export() -> str:
    """Find the latest notes export file."""
    export_dir = Path("data/reimport")
    if not export_dir.exists():
        return None
    
    export_files = list(export_dir.glob("notes_export_*.json"))
    if not export_files:
        return None
    
    # Sort by filename (timestamp) and get latest
    latest = sorted(export_files)[-1]
    return str(latest)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Import notes into Nexus')
    parser.add_argument('--file', help='Path to export JSON file (auto-detects latest if not specified)')
    parser.add_argument('--dry-run', action='store_true', help='Preview import without saving')
    args = parser.parse_args()
    
    # Find import file
    import_file = args.file
    if not import_file:
        import_file = find_latest_export()
        if not import_file:
            print("ERROR: No export file found. Run fetch_notes_from_filemaker.py first.")
            sys.exit(1)
        print(f"Using latest export: {import_file}")
    
    success = import_notes(import_file=import_file, dry_run=args.dry_run)
    sys.exit(0 if success else 1)

