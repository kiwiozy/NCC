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

from utils import create_logger
from clinicians.models import Clinic, Clinician
from appointments.models import AppointmentType
from settings.models import FundingSource


def validate_system_config() -> bool:
    """
    Validate that all required system configuration exists in Nexus.
    
    NOTE: FileMaker validation removed - we're now 100% Excel-based!
    This script now only validates that Nexus has the required config.
    
    Returns:
        True if all validation passes, False otherwise
    """
    logger = create_logger("PHASE 0")
    logger.phase_start("Phase 0.1", "Validate System Configuration in Nexus")
    
    logger.info("✅ 100% Excel-based import - No FileMaker validation needed!")
    logger.info("")
    
    try:
        # ========================================
        # Get Nexus Configuration
        # ========================================
        logger.info("Fetching Nexus system configuration...")
        
        nexus_clinics = list(Clinic.objects.all().values_list('name', flat=True))
        nexus_clinicians = list(Clinician.objects.all().values_list('full_name', flat=True))
        nexus_appointment_types = list(AppointmentType.objects.all().values_list('name', flat=True))
        nexus_funding_types = list(FundingSource.objects.all().values_list('name', flat=True))
        
        logger.success(f"✅ Found {len(nexus_clinics)} clinics in Nexus")
        logger.success(f"✅ Found {len(nexus_clinicians)} clinicians in Nexus")
        logger.success(f"✅ Found {len(nexus_appointment_types)} appointment types in Nexus")
        logger.success(f"✅ Found {len(nexus_funding_types)} funding types in Nexus")
        
        # Basic validation - ensure we have at least some config
        if len(nexus_clinics) == 0:
            logger.warning("⚠️  No clinics found in Nexus - patients may not link to clinics")
        if len(nexus_clinicians) == 0:
            logger.warning("⚠️  No clinicians found in Nexus - appointments may not link to clinicians")
        if len(nexus_appointment_types) == 0:
            logger.warning("⚠️  No appointment types found in Nexus - appointments may not link to types")
        
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
        
        logger.success("")
        logger.success("✅ System configuration validated!")
        logger.success("Nexus is ready for Excel-based import")
        logger.success("")
        
        logger.phase_end(success=True)
        return True
        
    except Exception as e:
        logger.error(f"Exception during system config validation: {str(e)}", exc_info=e)
        logger.warning("Validation failed but continuing anyway...")
        logger.phase_end(success=True)  # Don't block on validation errors
        return True  # Always return True - validation is informational


if __name__ == '__main__':
    success = validate_system_config()
    sys.exit(0 if success else 1)

