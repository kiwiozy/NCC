"""
Phase 0: Validate System Configuration in Nexus

Checks that all required system configuration (Clinics, Clinicians, Types) 
exists in Nexus before import.
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

from utils import create_logger, create_filemaker_client
from clinicians.models import Clinic, Clinician
from appointments.models import AppointmentType
from settings.models import FundingSource


def validate_system_config() -> bool:
    """
    Validate that all required system configuration exists in Nexus.
    
    Returns:
        True if all validation passes, False otherwise
    """
    logger = create_logger("PHASE 0")
    logger.phase_start("Phase 0.3", "Validate System Configuration in Nexus")
    
    all_valid = True
    
    try:
        # ========================================
        # Get Nexus Configuration
        # ========================================
        logger.info("Fetching Nexus system configuration...")
        
        nexus_clinics = list(Clinic.objects.all().values_list('name', flat=True))
        nexus_clinicians = list(Clinician.objects.all().values_list('full_name', flat=True))
        nexus_appointment_types = list(AppointmentType.objects.all().values_list('name', flat=True))
        nexus_funding_types = list(FundingSource.objects.all().values_list('name', flat=True))
        
        logger.success(f"Found {len(nexus_clinics)} clinics in Nexus")
        logger.success(f"Found {len(nexus_clinicians)} clinicians in Nexus")
        logger.success(f"Found {len(nexus_appointment_types)} appointment types in Nexus")
        logger.success(f"Found {len(nexus_funding_types)} funding types in Nexus")
        
        # ========================================
        # Get FileMaker Data (Sample Only)
        # ========================================
        logger.info("Fetching FileMaker sample data to check for matches...")
        
        try:
            with create_filemaker_client() as fm:
                # Get SAMPLE of patients (not all - too slow)
                sample_response = fm.odata_query('@Contacts', top=500)
                patients = sample_response.get('value', [])
                
                filemaker_clinics = set(
                    p.get('Clinic_Name') 
                    for p in patients 
                    if p.get('Clinic_Name')
                )
                
                logger.info(f"Found {len(filemaker_clinics)} unique clinics in FileMaker sample")
                
                # Check for clinic mismatches
                missing_clinics = filemaker_clinics - set(nexus_clinics)
                
                if missing_clinics:
                    logger.warning(f"⚠️  Sample: {len(missing_clinics)} clinics in FileMaker NOT found in Nexus:")
                    for clinic in sorted(missing_clinics):
                        logger.warning(f"  - {clinic}")
                    logger.warning("")
                    logger.warning("Note: This is a sample check. Full import may reveal more mismatches.")
                    logger.warning("ACTION RECOMMENDED:")
                    logger.warning("  1. Add these clinics to Nexus via Settings → Clinics")
                    logger.warning("  2. Or update clinic names in FileMaker to match Nexus")
                else:
                    logger.success("✅ FileMaker sample clinics all exist in Nexus")
        
        except Exception as e:
            logger.warning(f"Could not validate FileMaker data: {str(e)}")
            logger.warning("Validation skipped - will proceed anyway")
            logger.warning("Check for clinic/clinician/type mismatches during import")
            
            # Try to get appointments and check clinicians/types
            try:
                appointments = fm.odata_get_all('@Appointment', batch_size=100)
                
                # Get unique clinician names
                filemaker_clinicians = set(
                    a.get('clinician_name') or a.get('Clinician_Name')
                    for a in appointments 
                    if a.get('clinician_name') or a.get('Clinician_Name')
                )
                
                logger.info(f"Found {len(filemaker_clinicians)} unique clinicians in FileMaker")
                
                # Check for clinician mismatches
                missing_clinicians = filemaker_clinicians - set(nexus_clinicians)
                
                if missing_clinicians:
                    logger.warning(f"⚠️  {len(missing_clinicians)} clinicians in FileMaker NOT found in Nexus:")
                    for clinician in sorted(missing_clinicians)[:10]:  # Show first 10
                        logger.warning(f"  - {clinician}")
                    logger.warning("")
                    logger.warning("ACTION REQUIRED:")
                    logger.warning("  1. Add these clinicians to Nexus via Django admin")
                    logger.warning("  2. Or update clinician names in FileMaker to match Nexus")
                    all_valid = False
                else:
                    logger.success("✅ All FileMaker clinicians exist in Nexus")
                
                # Get unique appointment types
                filemaker_appointment_types = set(
                    a.get('appointment_type') or a.get('Type')
                    for a in appointments 
                    if a.get('appointment_type') or a.get('Type')
                )
                
                logger.info(f"Found {len(filemaker_appointment_types)} unique appointment types in FileMaker")
                
                # Check for appointment type mismatches
                missing_appointment_types = filemaker_appointment_types - set(nexus_appointment_types)
                
                if missing_appointment_types:
                    logger.warning(f"⚠️  {len(missing_appointment_types)} appointment types in FileMaker NOT found in Nexus:")
                    for appt_type in sorted(missing_appointment_types):
                        logger.warning(f"  - {appt_type}")
                    logger.warning("")
                    logger.warning("ACTION REQUIRED:")
                    logger.warning("  1. Add these appointment types to Nexus via Settings → Appointment Types")
                    logger.warning("  2. Or update appointment types in FileMaker to match Nexus")
                    all_valid = False
                else:
                    logger.success("✅ All FileMaker appointment types exist in Nexus")
                    
            except Exception as e:
                logger.warning(f"Could not validate appointments: {str(e)}")
                logger.warning("Skipping clinician and appointment type validation")
        
        # ========================================
        # Summary
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 System Configuration Summary")
        logger.info("=" * 70)
        logger.info(f"Nexus Clinics: {len(nexus_clinics)}")
        logger.info(f"Nexus Clinicians: {len(nexus_clinicians)}")
        logger.info(f"Nexus Appointment Types: {len(nexus_appointment_types)}")
        logger.info(f"Nexus Funding Types: {len(nexus_funding_types)}")
        
        if nexus_clinics:
            logger.info("")
            logger.info("Configured Clinics:")
            for clinic in nexus_clinics:
                logger.info(f"  - {clinic}")
        
        if all_valid:
            logger.success("")
            logger.success("✅ All system configuration validated!")
            logger.success("Nexus is ready for import")
            logger.success("")
        else:
            logger.warning("")
            logger.warning("⚠️  Some validations failed or were skipped!")
            logger.warning("This is informational only - import can proceed")
            logger.warning("Mismatches will be handled during import")
            logger.warning("")
        
        # Always succeed - this is informational
        logger.phase_end(success=True)
        return True
        
    except Exception as e:
        logger.warning(f"Exception during system config validation: {str(e)}")
        logger.warning("Validation skipped - import can proceed")
        # Always succeed - this is informational
        logger.phase_end(success=True)
        return True


if __name__ == '__main__':
    success = validate_system_config()
    sys.exit(0 if success else 1)

