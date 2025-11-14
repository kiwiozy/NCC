"""
Phase 5: Import Notes and SMS into Nexus

Imports patient notes and SMS messages from FileMaker export JSON into Nexus database.
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
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from utils import create_logger
from patients.models import Patient
from notes.models import Note
from sms_integration.models import SMSMessage
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


def import_notes_and_sms(notes_file: str = None, sms_file: str = None, dry_run: bool = False) -> bool:
    """
    Import notes and SMS from JSON files into Nexus.
    
    Args:
        notes_file: Path to notes JSON export file
        sms_file: Path to SMS JSON export file
        dry_run: If True, preview import without saving
    
    Returns:
        True if import successful, False otherwise
    """
    logger = create_logger("PHASE 5")
    logger.phase_start("Phase 5.2", "Import Notes and SMS into Nexus")
    
    if dry_run:
        logger.warning("🔍 DRY RUN MODE - No data will be saved")
    
    all_success = True
    
    try:
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
        if notes_file and Path(notes_file).exists():
            logger.info("")
            logger.info(f"Loading notes from: {notes_file}")
            
            with open(notes_file, 'r') as f:
                notes_export = json.load(f)
            
            notes_data = notes_export.get('notes', [])
            logger.success(f"✅ Loaded {len(notes_data)} notes from export")
            
            if notes_data:
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
                
                logger.info("")
                logger.info("Notes Import Summary:")
                logger.info(f"  Total: {len(notes_data)}")
                logger.info(f"  ✅ Imported: {imported_count}")
                logger.info(f"  ⏭️  Skipped: {skipped_count}")
                logger.info(f"  ❌ Errors: {error_count}")
                
                if error_count > 0:
                    all_success = False
        else:
            logger.info("No notes file provided or file not found - skipping notes import")
        
        # ========================================
        # Import SMS Messages
        # ========================================
        if sms_file and Path(sms_file).exists():
            logger.info("")
            logger.info(f"Loading SMS messages from: {sms_file}")
            
            with open(sms_file, 'r') as f:
                sms_export = json.load(f)
            
            sms_data = sms_export.get('sms_messages', [])
            logger.success(f"✅ Loaded {len(sms_data)} SMS messages from export")
            
            if sms_data:
                logger.info("Starting SMS import...")
                
                imported_count = 0
                skipped_count = 0
                error_count = 0
                
                for i, sms in enumerate(sms_data):
                    if (i + 1) % 100 == 0:
                        logger.progress(i + 1, len(sms_data), "Importing SMS")
                    
                    try:
                        # Get patient
                        patient_filemaker_id = sms.get('id_Contact') or sms.get('patient_id')
                        patient = patient_map.get(patient_filemaker_id)
                        
                        if not patient:
                            logger.debug(f"Skipping SMS {sms.get('id')} - patient not found")
                            skipped_count += 1
                            continue
                        
                        # Get phone number (try different field names)
                        phone_number = sms.get('phone') or sms.get('phone_number') or sms.get('Phone') or ''
                        
                        if not phone_number.strip():
                            logger.debug(f"Skipping SMS {sms.get('id')} - no phone number")
                            skipped_count += 1
                            continue
                        
                        # Get message content (try different field names)
                        message = sms.get('message') or sms.get('Message') or sms.get('text') or sms.get('Text') or ''
                        
                        if not message.strip():
                            logger.debug(f"Skipping SMS {sms.get('id')} - no message content")
                            skipped_count += 1
                            continue
                        
                        # Get status (try different field names)
                        status = sms.get('status') or sms.get('Status') or 'sent'
                        status = status.lower()
                        if status not in ['pending', 'sent', 'delivered', 'failed', 'cancelled']:
                            status = 'sent'  # Default to sent for historical messages
                        
                        # Get sent date (if available)
                        sent_at_str = sms.get('sent_at') or sms.get('SentDate')
                        sent_at = None
                        if sent_at_str:
                            try:
                                sent_at = datetime.fromisoformat(sent_at_str.replace('Z', '+00:00'))
                            except:
                                pass
                        
                        if not dry_run:
                            # Create SMS record
                            with transaction.atomic():
                                sms_message = SMSMessage.objects.create(
                                    patient=patient,
                                    phone_number=phone_number,
                                    message=message,
                                    status=status,
                                    sent_at=sent_at,
                                    external_message_id=sms.get('external_id', ''),
                                )
                        
                        imported_count += 1
                        logger.increment_success()
                        
                    except Exception as e:
                        error_count += 1
                        logger.error(f"Error importing SMS {sms.get('id')}: {str(e)}")
                        logger.increment_errors()
                
                logger.progress(len(sms_data), len(sms_data), "Importing SMS")
                
                logger.info("")
                logger.info("SMS Import Summary:")
                logger.info(f"  Total: {len(sms_data)}")
                logger.info(f"  ✅ Imported: {imported_count}")
                logger.info(f"  ⏭️  Skipped: {skipped_count}")
                logger.info(f"  ❌ Errors: {error_count}")
                
                if error_count > 0:
                    all_success = False
        else:
            logger.info("No SMS file provided or file not found - skipping SMS import")
        
        # ========================================
        # Summary
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Overall Import Summary")
        logger.info("=" * 70)
        
        if not dry_run:
            total_notes = Note.objects.count()
            total_sms = SMSMessage.objects.count()
            logger.info(f"Total Notes in Nexus: {total_notes}")
            logger.info(f"Total SMS in Nexus: {total_sms}")
        
        if all_success:
            logger.success("")
            logger.success("✅ Note and SMS import completed successfully!")
            if not dry_run:
                logger.success(f"Next: Run Phase 6 to re-link documents")
            logger.success("")
            logger.phase_end(success=True)
            return True
        else:
            logger.warning("")
            logger.warning("⚠️  Import completed with errors")
            logger.warning("Review logs and fix issues before proceeding")
            logger.warning("")
            logger.phase_end(success=False)
            return False
            
    except Exception as e:
        logger.error(f"Exception during import: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


def find_latest_exports() -> tuple:
    """Find the latest notes and SMS export files."""
    export_dir = Path("data/reimport")
    if not export_dir.exists():
        return (None, None)
    
    # Find notes files
    notes_files = list(export_dir.glob("notes_export_*.json"))
    latest_notes = str(sorted(notes_files)[-1]) if notes_files else None
    
    # Find SMS files
    sms_files = list(export_dir.glob("sms_export_*.json"))
    latest_sms = str(sorted(sms_files)[-1]) if sms_files else None
    
    return (latest_notes, latest_sms)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Import notes and SMS into Nexus')
    parser.add_argument('--notes-file', help='Path to notes export JSON file (auto-detects latest if not specified)')
    parser.add_argument('--sms-file', help='Path to SMS export JSON file (auto-detects latest if not specified)')
    parser.add_argument('--dry-run', action='store_true', help='Preview import without saving')
    args = parser.parse_args()
    
    # Find import files
    notes_file = args.notes_file
    sms_file = args.sms_file
    
    if not notes_file and not sms_file:
        # Auto-detect both
        notes_file, sms_file = find_latest_exports()
        if not notes_file and not sms_file:
            print("ERROR: No export files found. Run fetch_notes_from_filemaker.py first.")
            sys.exit(1)
        
        if notes_file:
            print(f"Using latest notes export: {notes_file}")
        if sms_file:
            print(f"Using latest SMS export: {sms_file}")
    
    success = import_notes_and_sms(notes_file=notes_file, sms_file=sms_file, dry_run=args.dry_run)
    sys.exit(0 if success else 1)

