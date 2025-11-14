"""
Phase 3: Import Patients into Nexus

Imports patients from FileMaker export JSON into Nexus database.
Handles data transformation, clinic/funding lookup, and contact details.
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
from patients.models import Patient, FundingType
from clinicians.models import Clinic
from django.db import transaction


def transform_date(date_str: str) -> str:
    """
    Transform FileMaker date to ISO format.
    
    Args:
        date_str: Date in MM/DD/YYYY or other format
    
    Returns:
        ISO format date string (YYYY-MM-DD) or None
    """
    if not date_str:
        return None
    
    try:
        # Try MM/DD/YYYY format (FileMaker default)
        dt = datetime.strptime(date_str, '%m/%d/%Y')
        return dt.strftime('%Y-%m-%d')
    except:
        try:
            # Try YYYY-MM-DD format (already correct)
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            return date_str
        except:
            return None


def transform_contact_details(contact_details: list) -> tuple:
    """
    Transform FileMaker contact details into Nexus format.
    
    Args:
        contact_details: List of contact detail records from FileMaker
    
    Returns:
        Tuple of (contact_json, address_json)
    """
    contact_json = {
        'phone': {},
        'mobile': {},
        'email': {}
    }
    address_json = None
    
    for detail in contact_details:
        contact_type = detail.get('type', '').lower()
        name = detail.get('Name', 'default').lower()
        
        if contact_type == 'phone':
            phone = detail.get('ph')
            if phone:
                contact_json['phone'][name] = {
                    'value': phone,
                    'default': False
                }
        
        elif contact_type == 'mobile':
            mobile = detail.get('ph')
            if mobile:
                contact_json['mobile'][name] = {
                    'value': mobile,
                    'default': False
                }
        
        elif contact_type == 'email':
            email = detail.get('Email_default')
            if email:
                contact_json['email'][name] = {
                    'value': email,
                    'default': False
                }
        
        elif contact_type == 'address':
            # Take the first address as default
            if not address_json:
                address_json = {
                    'street': detail.get('address_1', ''),
                    'street2': detail.get('address_2', ''),
                    'suburb': detail.get('suburb', ''),
                    'state': detail.get('state', ''),
                    'postcode': detail.get('post_code', ''),
                    'type': name,
                    'default': True
                }
    
    return contact_json, address_json


def import_patients(import_file: str, dry_run: bool = False) -> bool:
    """
    Import patients from JSON file into Nexus.
    
    Args:
        import_file: Path to JSON export file
        dry_run: If True, preview import without saving
    
    Returns:
        True if import successful, False otherwise
    """
    logger = create_logger("PHASE 3")
    logger.phase_start("Phase 3.2", "Import Patients into Nexus")
    
    if dry_run:
        logger.warning("🔍 DRY RUN MODE - No data will be saved")
    
    try:
        # ========================================
        # Load Export File
        # ========================================
        logger.info(f"Loading export file: {import_file}")
        
        with open(import_file, 'r') as f:
            export_data = json.load(f)
        
        patients_data = export_data.get('patients', [])
        logger.success(f"✅ Loaded {len(patients_data)} patients from export")
        
        # ========================================
        # Get Nexus Configuration (for FK lookup)
        # ========================================
        logger.info("Loading Nexus configuration...")
        
        clinics = {clinic.name: clinic for clinic in Clinic.objects.all()}
        funding_types = {ft.name: ft for ft in FundingType.objects.all()}
        
        logger.success(f"✅ Loaded {len(clinics)} clinics")
        logger.success(f"✅ Loaded {len(funding_types)} funding types")
        
        # ========================================
        # Import Patients
        # ========================================
        logger.info("Starting patient import...")
        
        imported_count = 0
        skipped_count = 0
        error_count = 0
        patients_with_funding = 0
        patients_without_funding = 0
        
        for i, patient_record in enumerate(patients_data):
            if (i + 1) % 100 == 0:
                logger.progress(i + 1, len(patients_data), "Importing patients")
            
            try:
                patient_data = patient_record.get('patient', {})
                contact_details = patient_record.get('contact_details', [])
                
                # Extract patient fields
                filemaker_id = patient_data.get('id')
                first_name = patient_data.get('nameFirst', '').strip()
                last_name = patient_data.get('nameLast', '').strip()
                
                # Skip if no name
                if not first_name and not last_name:
                    logger.debug(f"Skipping patient {filemaker_id} - no name")
                    skipped_count += 1
                    continue
                
                # Get clinic
                clinic_name = patient_data.get('Clinic_Name')
                clinic = clinics.get(clinic_name) if clinic_name else None
                
                if not clinic:
                    logger.warning(f"Patient {first_name} {last_name} - clinic '{clinic_name}' not found")
                
                # Get funding type (if available - try multiple field names)
                funding_type_name = (
                    patient_data.get('funding_type') or 
                    patient_data.get('Funding_Type') or
                    patient_data.get('FundingType') or
                    patient_data.get('Funding') or
                    patient_data.get('NDIS_Type') or
                    patient_data.get('ndis_type')
                )
                funding_type = funding_types.get(funding_type_name) if funding_type_name else None
                
                if not funding_type and funding_type_name:
                    logger.debug(f"Patient {first_name} {last_name} - funding type '{funding_type_name}' not found in Nexus")
                
                # Transform contact details
                contact_json, address_json = transform_contact_details(contact_details)
                
                # Transform DOB
                dob_str = patient_data.get('DOB')
                dob = transform_date(dob_str) if dob_str else None
                
                # Build filemaker_metadata
                filemaker_metadata = {
                    'filemaker_id': filemaker_id,
                    'filemaker_clinic': clinic_name,
                    'xero_contact_id': patient_data.get('_kf_XeroContactID', ''),
                    'imported_at': datetime.now().isoformat(),
                    'import_source': 'reimport_phase3'
                }
                
                if not dry_run:
                    # Create patient record
                    with transaction.atomic():
                        patient = Patient.objects.create(
                            title=patient_data.get('title', ''),
                            first_name=first_name,
                            last_name=last_name,
                            middle_names=patient_data.get('nameMiddle', ''),
                            dob=dob,
                            sex=patient_data.get('gender', ''),
                            health_number=patient_data.get('Health_Number', ''),
                            clinic=clinic,
                            funding_type=funding_type,
                            contact_json=contact_json if contact_json else None,
                            address_json=address_json if address_json else None,
                            filemaker_metadata=filemaker_metadata,
                        )
                
                # Track funding statistics
                if funding_type:
                    patients_with_funding += 1
                else:
                    patients_without_funding += 1
                
                imported_count += 1
                logger.increment_success()
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error importing patient {patient_data.get('id')}: {str(e)}")
                logger.increment_errors()
        
        logger.progress(len(patients_data), len(patients_data), "Importing patients")
        
        # ========================================
        # Summary
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Import Summary")
        logger.info("=" * 70)
        logger.info(f"Total Records: {len(patients_data)}")
        logger.info(f"✅ Imported: {imported_count}")
        logger.info(f"⏭️  Skipped: {skipped_count} (no name)")
        logger.info(f"❌ Errors: {error_count}")
        logger.info("")
        logger.info(f"Patients with funding type: {patients_with_funding}")
        logger.info(f"Patients without funding type: {patients_without_funding}")
        
        if patients_without_funding > 0:
            logger.warning(f"⚠️  {patients_without_funding} patients have no funding type")
            logger.warning("This may be normal if FileMaker doesn't have funding type field")
            logger.warning("Or funding type names don't match Nexus funding types")
        
        if not dry_run:
            # Verify import
            total_patients_now = Patient.objects.count()
            logger.info(f"Total Patients in Nexus: {total_patients_now}")
        
        if error_count == 0:
            logger.success("")
            logger.success("✅ Patient import completed successfully!")
            if not dry_run:
                logger.success(f"Next: Run Phase 4 to import appointments")
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
        logger.error(f"Exception during patient import: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


def find_latest_export() -> str:
    """Find the latest patient export file."""
    export_dir = Path("data/reimport")
    if not export_dir.exists():
        return None
    
    export_files = list(export_dir.glob("patients_export_*.json"))
    if not export_files:
        return None
    
    # Sort by filename (timestamp) and get latest
    latest = sorted(export_files)[-1]
    return str(latest)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Import patients into Nexus')
    parser.add_argument('--file', help='Path to export JSON file (auto-detects latest if not specified)')
    parser.add_argument('--dry-run', action='store_true', help='Preview import without saving')
    args = parser.parse_args()
    
    # Find import file
    import_file = args.file
    if not import_file:
        import_file = find_latest_export()
        if not import_file:
            print("ERROR: No export file found. Run fetch_patients_from_filemaker.py first.")
            sys.exit(1)
        print(f"Using latest export: {import_file}")
    
    success = import_patients(import_file=import_file, dry_run=args.dry_run)
    sys.exit(0 if success else 1)

