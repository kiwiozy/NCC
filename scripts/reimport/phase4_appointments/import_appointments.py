"""
Phase 4: Import Appointments into Nexus

Imports appointments from FileMaker export JSON into Nexus database.
Handles data transformation, patient/clinic/clinician/type lookup, and date conversion.

IMPORTANT: This also fixes appointments with NULL clinic by using the patient's clinic.
This addresses the issue where 1,496 appointments were imported without clinic/clinician/type.
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
from appointments.models import Appointment, AppointmentType
from clinicians.models import Clinic, Clinician
from django.db import transaction


def transform_datetime(datetime_str: str) -> datetime:
    """
    Transform FileMaker datetime to Python datetime.
    
    Args:
        datetime_str: DateTime string from FileMaker
    
    Returns:
        Python datetime object or None
    """
    if not datetime_str:
        return None
    
    try:
        # Try ISO format first
        return datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
    except:
        try:
            # Try MM/DD/YYYY HH:MM:SS format
            return datetime.strptime(datetime_str, '%m/%d/%Y %H:%M:%S')
        except:
            try:
                # Try YYYY-MM-DD HH:MM:SS format
                return datetime.strptime(datetime_str, '%Y-%m-%d %H:%M:%S')
            except:
                return None


def import_appointments(import_file: str, dry_run: bool = False, fix_missing_clinics: bool = True) -> bool:
    """
    Import appointments from JSON file into Nexus.
    
    Args:
        import_file: Path to JSON export file
        dry_run: If True, preview import without saving
        fix_missing_clinics: If True, automatically set clinic from patient for appointments with NULL clinic
    
    Returns:
        True if import successful, False otherwise
    """
    logger = create_logger("PHASE 4")
    logger.phase_start("Phase 4.2", "Import Appointments into Nexus")
    
    if dry_run:
        logger.warning("🔍 DRY RUN MODE - No data will be saved")
    
    try:
        # ========================================
        # Load Export File
        # ========================================
        logger.info(f"Loading export file: {import_file}")
        
        with open(import_file, 'r') as f:
            export_data = json.load(f)
        
        appointments_data = export_data.get('appointments', [])
        logger.success(f"✅ Loaded {len(appointments_data)} appointments from export")
        
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
        # Get Nexus Configuration (for FK lookup)
        # ========================================
        logger.info("Loading Nexus configuration...")
        
        clinics = {str(clinic.id): clinic for clinic in Clinic.objects.all()}
        clinics_by_name = {clinic.name: clinic for clinic in Clinic.objects.all()}
        clinicians = {str(clinician.id): clinician for clinician in Clinician.objects.all()}
        clinicians_by_name = {clinician.full_name: clinician for clinician in Clinician.objects.all()}
        appointment_types = {appt_type.name: appt_type for appt_type in AppointmentType.objects.all()}
        
        logger.success(f"✅ Loaded {len(clinics)} clinics")
        logger.success(f"✅ Loaded {len(clinicians)} clinicians")
        logger.success(f"✅ Loaded {len(appointment_types)} appointment types")
        
        # ========================================
        # Import Appointments
        # ========================================
        logger.info("Starting appointment import...")
        logger.info(f"Fix missing clinics: {'YES' if fix_missing_clinics else 'NO'}")
        
        imported_count = 0
        skipped_count = 0
        error_count = 0
        fixed_clinic_count = 0
        appointments_with_notes = 0
        
        for i, appointment_data in enumerate(appointments_data):
            # Show progress every 50 records (heartbeat)
            if (i + 1) % 50 == 0:
                logger.info(f"💓 Still working... {i + 1}/{len(appointments_data)} appointments processed")
            
            # Show detailed progress every 100 records
            if (i + 1) % 100 == 0:
                logger.progress(i + 1, len(appointments_data), "Importing appointments")
            
            try:
                # Extract appointment fields
                filemaker_id = appointment_data.get('id')
                
                # Get patient
                patient_filemaker_id = appointment_data.get('id_Contact') or appointment_data.get('patient_id')
                patient = patient_map.get(patient_filemaker_id)
                
                if not patient:
                    logger.debug(f"Skipping appointment {filemaker_id} - patient not found")
                    skipped_count += 1
                    continue
                
                # Get clinic
                clinic_id = appointment_data.get('id_Clinic')
                clinic_name = appointment_data.get('clinic_name')
                clinic = None
                
                if clinic_id:
                    clinic = clinics.get(str(clinic_id))
                if not clinic and clinic_name:
                    clinic = clinics_by_name.get(clinic_name)
                
                # FIX: If appointment has no clinic, use patient's clinic
                if not clinic and fix_missing_clinics and patient.clinic:
                    clinic = patient.clinic
                    fixed_clinic_count += 1
                    logger.debug(f"Fixed clinic for appointment {filemaker_id} using patient's clinic: {clinic.name}")
                
                if not clinic:
                    logger.warning(f"Appointment {filemaker_id} - no clinic found")
                
                # Get clinician
                clinician_id = appointment_data.get('id_Clinician')
                clinician_name = appointment_data.get('clinician_name')
                clinician = None
                
                if clinician_id:
                    clinician = clinicians.get(str(clinician_id))
                if not clinician and clinician_name:
                    clinician = clinicians_by_name.get(clinician_name)
                
                if not clinician:
                    logger.debug(f"Appointment {filemaker_id} - no clinician found")
                
                # Get appointment type
                type_name = appointment_data.get('Type') or appointment_data.get('appointment_type')
                appointment_type = appointment_types.get(type_name) if type_name else None
                
                if not appointment_type:
                    logger.debug(f"Appointment {filemaker_id} - no appointment type found")
                
                # Transform dates
                start_time = transform_datetime(appointment_data.get('Start'))
                end_time = transform_datetime(appointment_data.get('End'))
                
                if not start_time:
                    logger.warning(f"Appointment {filemaker_id} - no start time, skipping")
                    skipped_count += 1
                    continue
                
                # Get status
                status = appointment_data.get('Status', 'scheduled').lower()
                if status not in ['scheduled', 'completed', 'cancelled', 'no-show']:
                    status = 'scheduled'
                
                # Get notes (try multiple field names)
                notes = (
                    appointment_data.get('notes') or 
                    appointment_data.get('Notes') or
                    appointment_data.get('note') or
                    appointment_data.get('Note') or
                    appointment_data.get('Comment') or
                    appointment_data.get('comments') or
                    ''
                )
                
                if not dry_run:
                    # Create appointment record
                    with transaction.atomic():
                        appointment = Appointment.objects.create(
                            patient=patient,
                            clinic=clinic,
                            clinician=clinician,
                            appointment_type=appointment_type,
                            start_time=start_time,
                            end_time=end_time or start_time,  # Use start_time if end_time missing
                            status=status,
                            notes=notes,
                        )
                
                # Track statistics
                if notes and notes.strip():
                    appointments_with_notes += 1
                
                imported_count += 1
                logger.increment_success()
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error importing appointment {appointment_data.get('id')}: {str(e)}")
                logger.increment_errors()
        
        logger.progress(len(appointments_data), len(appointments_data), "Importing appointments")
        
        # ========================================
        # Summary
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Import Summary")
        logger.info("=" * 70)
        logger.info(f"Total Records: {len(appointments_data)}")
        logger.info(f"✅ Imported: {imported_count}")
        logger.info(f"⏭️  Skipped: {skipped_count} (no patient or start time)")
        logger.info(f"❌ Errors: {error_count}")
        logger.info("")
        logger.info(f"Appointments with notes: {appointments_with_notes}")
        
        if fix_missing_clinics:
            logger.info(f"🔧 Fixed Clinics: {fixed_clinic_count} (used patient's clinic)")
        
        if not dry_run:
            # Verify import
            total_appointments_now = Appointment.objects.count()
            appointments_without_clinic = Appointment.objects.filter(clinic__isnull=True).count()
            appointments_without_clinician = Appointment.objects.filter(clinician__isnull=True).count()
            appointments_without_type = Appointment.objects.filter(appointment_type__isnull=True).count()
            
            logger.info(f"Total Appointments in Nexus: {total_appointments_now}")
            logger.info(f"Appointments without clinic: {appointments_without_clinic}")
            logger.info(f"Appointments without clinician: {appointments_without_clinician}")
            logger.info(f"Appointments without type: {appointments_without_type}")
        
        if error_count == 0:
            logger.success("")
            logger.success("✅ Appointment import completed successfully!")
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
        logger.error(f"Exception during appointment import: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


def find_latest_export() -> str:
    """Find the latest appointment export file."""
    export_dir = Path("data/reimport")
    if not export_dir.exists():
        return None
    
    export_files = list(export_dir.glob("appointments_export_*.json"))
    if not export_files:
        return None
    
    # Sort by filename (timestamp) and get latest
    latest = sorted(export_files)[-1]
    return str(latest)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Import appointments into Nexus')
    parser.add_argument('--file', help='Path to export JSON file (auto-detects latest if not specified)')
    parser.add_argument('--dry-run', action='store_true', help='Preview import without saving')
    parser.add_argument('--no-fix-clinics', action='store_true', help='Do not automatically fix missing clinics from patient')
    args = parser.parse_args()
    
    # Find import file
    import_file = args.file
    if not import_file:
        import_file = find_latest_export()
        if not import_file:
            print("ERROR: No export file found. Run fetch_appointments_from_filemaker.py first.")
            sys.exit(1)
        print(f"Using latest export: {import_file}")
    
    success = import_appointments(
        import_file=import_file,
        dry_run=args.dry_run,
        fix_missing_clinics=not args.no_fix_clinics
    )
    sys.exit(0 if success else 1)

