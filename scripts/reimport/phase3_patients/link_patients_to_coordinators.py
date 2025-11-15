#!/usr/bin/env python3
"""
Link Patients to Coordinators (Phase 3.5)

This script runs AFTER patient import and coordinator extraction to:
1. Read patient records with NDIS Coordinator Name
2. Find matching Referrer (coordinator) by name
3. Create PatientReferrer relationships
4. Set is_primary=True for current coordinator
5. Use NDIS Plan Start Date as referral_date

Usage:
    cd /Users/craig/Documents/nexus-core-clinic/scripts/reimport
    python3 phase3_patients/link_patients_to_coordinators.py --dry-run
    python3 phase3_patients/link_patients_to_coordinators.py
"""
import os
import sys
from pathlib import Path
from datetime import date

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
import django
django.setup()

from django.db import transaction
from patients.models import Patient
from referrers.models import Referrer, PatientReferrer, Specialty

# Add project root for utils
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))
from scripts.reimport.utils.logger import create_logger
from scripts.reimport.utils.progress_tracker import ProgressTracker


def split_name(full_name: str) -> tuple:
    """Split full name into first and last name"""
    if not full_name:
        return "", ""
    
    parts = full_name.strip().split()
    if len(parts) == 0:
        return "", ""
    elif len(parts) == 1:
        return parts[0], ""
    else:
        first_name = parts[0]
        last_name = " ".join(parts[1:])
        return first_name, last_name


def link_patients_to_coordinators(dry_run: bool = False) -> bool:
    """
    Link patients to their coordinators via PatientReferrer relationships.
    
    Args:
        dry_run: If True, only preview data without saving
    
    Returns:
        True if successful, False otherwise
    """
    logger = create_logger("PHASE 3.5")
    logger.phase_start("Phase 3.5", "Link Patients to Coordinators")

    if dry_run:
        logger.warning("🔍 DRY RUN MODE - No changes will be made")
        logger.info("")

    # ========================================
    # Step 1: Get Support Coordinator specialty
    # ========================================
    logger.info("Looking up 'Support Coordinator' specialty...")
    
    try:
        specialty = Specialty.objects.get(name="Support Coordinator")
        logger.success(f"✅ Found 'Support Coordinator' specialty")
    except Specialty.DoesNotExist:
        logger.error("❌ 'Support Coordinator' specialty not found!")
        logger.error("Please run Phase 2.5 (extract_coordinators_from_contacts.py) first")
        logger.phase_end(success=False)
        return False

    # ========================================
    # Step 2: Get all coordinators
    # ========================================
    logger.info("")
    logger.info("Loading coordinators...")

    coordinators = Referrer.objects.filter(specialty=specialty)
    logger.success(f"✅ Found {coordinators.count():,} coordinators")

    # Build coordinator lookup by name (case-insensitive)
    coordinator_lookup = {}
    for coordinator in coordinators:
        # Store by full name (lowercase for matching)
        full_name = coordinator.get_full_name().lower()
        coordinator_lookup[full_name] = coordinator
        
        # Also store by "First Last" format
        simple_name = f"{coordinator.first_name} {coordinator.last_name}".lower()
        if simple_name != full_name:
            coordinator_lookup[simple_name] = coordinator

    logger.info(f"   Built lookup with {len(coordinator_lookup)} name variations")

    # ========================================
    # Step 3: Get all patients with NDIS coordinator data
    # ========================================
    logger.info("")
    logger.info("Loading patients with NDIS coordinator data...")

    # Get patients where filemaker_metadata contains NDIS coordinator info
    patients_with_coordinators = Patient.objects.filter(
        filemaker_metadata__ndis__isnull=False
    ).exclude(
        filemaker_metadata__ndis__coordinator_name=''
    )

    logger.success(f"✅ Found {patients_with_coordinators.count():,} patients with coordinator data")

    # ========================================
    # Step 4: Create PatientReferrer links
    # ========================================
    logger.info("")
    logger.info("Creating patient-coordinator relationships...")

    stats = {
        'total': 0,
        'linked': 0,
        'coordinator_not_found': 0,
        'already_linked': 0,
        'errors': 0,
    }

    progress = ProgressTracker(patients_with_coordinators.count(), logger, "Linking patients to coordinators")

    for i, patient in enumerate(patients_with_coordinators, 1):
        stats['total'] += 1
        progress.update_progress(i)

        try:
            # Get coordinator name from metadata
            ndis_data = patient.filemaker_metadata.get('ndis', {})
            coordinator_name = ndis_data.get('coordinator_name', '').strip()

            if not coordinator_name:
                stats['coordinator_not_found'] += 1
                continue

            # Look up coordinator
            coordinator_name_lower = coordinator_name.lower()
            coordinator = coordinator_lookup.get(coordinator_name_lower)

            if not coordinator:
                # Try splitting name and looking up again
                first, last = split_name(coordinator_name)
                if first and last:
                    simple_lookup = f"{first} {last}".lower()
                    coordinator = coordinator_lookup.get(simple_lookup)

            if not coordinator:
                logger.warning(f"Coordinator not found: '{coordinator_name}' for patient {patient.get_full_name()}")
                stats['coordinator_not_found'] += 1
                continue

            # Get referral date (use NDIS plan start date if available, otherwise today)
            referral_date = patient.ndis_plan_start_date or date.today()

            if not dry_run:
                # Check if relationship already exists
                existing = PatientReferrer.objects.filter(
                    patient=patient,
                    referrer=coordinator
                ).first()

                if existing:
                    # Update existing relationship
                    existing.referral_date = referral_date
                    existing.status = 'ACTIVE'
                    existing.is_primary = True
                    existing.save()
                    stats['already_linked'] += 1
                else:
                    # Create new relationship
                    PatientReferrer.objects.create(
                        patient=patient,
                        referrer=coordinator,
                        referral_date=referral_date,
                        status='ACTIVE',
                        is_primary=True
                    )
                    stats['linked'] += 1
            else:
                # Dry run - just count as linked
                stats['linked'] += 1

        except Exception as e:
            logger.error(f"Error linking patient {patient.id} to coordinator: {e}")
            stats['errors'] += 1

    # ========================================
    # Summary
    # ========================================
    logger.info("")
    logger.info("=" * 70)
    logger.info("📊 Patient-Coordinator Linking Summary")
    logger.info("=" * 70)
    logger.info(f"Total patients processed: {stats['total']:,}")
    logger.success(f"✅ New links created: {stats['linked']:,}")
    logger.info(f"🔄 Already linked (updated): {stats['already_linked']:,}")
    logger.warning(f"⚠️  Coordinator not found: {stats['coordinator_not_found']:,}")
    logger.error(f"❌ Errors: {stats['errors']:,}")
    logger.info("")

    if not dry_run:
        # Show sample of linked patients
        logger.info("Sample of linked patients:")
        sample_links = PatientReferrer.objects.filter(
            referrer__specialty=specialty,
            status='ACTIVE'
        ).select_related('patient', 'referrer')[:5]

        for link in sample_links:
            logger.info(f"   {link.patient.get_full_name()} → {link.referrer.get_full_name()}")

        logger.info("")

    if dry_run or stats['errors'] == 0:
        logger.success("✅ ✅ ✅ Patient-coordinator linking completed successfully!")
        success = True
    else:
        logger.error("❌ Patient-coordinator linking completed with errors!")
        success = False

    logger.phase_end(success=success)
    return success


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Link patients to coordinators via PatientReferrer')
    parser.add_argument('--dry-run', action='store_true', help='Preview only, do not save')
    args = parser.parse_args()

    success = link_patients_to_coordinators(dry_run=args.dry_run)
    sys.exit(0 if success else 1)

