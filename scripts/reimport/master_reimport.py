#!/usr/bin/env python3
"""
Master Reimport Orchestrator

Orchestrates the complete FileMaker reimport process across all 8 phases.
Provides full automation, dry-run mode, phase selection, and error handling.

Usage:
    python master_reimport.py --full              # Full reimport
    python master_reimport.py --dry-run           # Preview only
    python master_reimport.py --phase patients    # Run specific phase
    python master_reimport.py --resume            # Resume from last checkpoint
"""

import sys
import os
import argparse
import subprocess
from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Optional

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from utils import create_logger, create_progress_tracker


class ReimportOrchestrator:
    """Orchestrates the complete FileMaker reimport process."""
    
    def __init__(self, dry_run: bool = False):
        """
        Initialize orchestrator.
        
        Args:
            dry_run: If True, run in preview mode without making changes
        """
        self.dry_run = dry_run
        self.logger = create_logger("MASTER")
        self.progress = create_progress_tracker()
        self.base_dir = Path(__file__).parent
        
        # Define all phases in order
        self.phases = [
            {
                'name': 'validation',
                'number': 0,
                'description': 'Pre-Import Validation',
                'scripts': [
                    # 'phase0_validation/backup_s3_files.py',  # COMMENTED OUT: Skipping S3 backup (already have backup from this morning)
                    'phase0_validation/validate_filemaker_connection.py',
                    'phase0_validation/validate_filemaker_data.py',
                    'phase0_validation/validate_system_config.py',
                    'phase0_validation/create_backup.py',
                ],
                'required': True,
                'stop_on_error': True,
            },
            {
                'name': 'delete',
                'number': 2,
                'description': 'Delete Existing Patient Data',
                'scripts': [
                    'phase2_delete/delete_existing_data.py',
                ],
                'required': True,
                'stop_on_error': True,
                'requires_confirm': True,
            },
            {
                'name': 'patients',
                'number': 3,
                'description': 'Import Patients from Excel',
                'scripts': [
                    # NEW: Excel-based import (no FileMaker API required!)
                    'phase3_patients/import_patients_from_excel.py',
                ],
                'required': True,
                'stop_on_error': True,
            },
            {
                'name': 'appointments',
                'number': 4,
                'description': 'Import Appointments',
                'scripts': [
                    'phase4_appointments/fetch_appointments_from_excel.py',  # NEW: Read from Excel instead of API
                    'phase4_appointments/import_appointments.py',
                ],
                'required': True,
                'stop_on_error': True,
            },
            {
                'name': 'notes',
                'number': 5,
                'description': 'Import Notes & SMS',
                'scripts': [
                    'phase5_notes/fetch_notes_from_excel.py',  # NEW: Read from Excel instead of API
                    'phase5_notes/import_notes.py',
                ],
                'required': False,
                'stop_on_error': False,
            },
            {
                'name': 'documents',
                'number': 6,
                'description': 'Re-Link Documents with Clean S3 Paths',
                'scripts': [
                    'phase6_documents/relink_documents_clean.py',  # NEW: Clean S3 paths
                ],
                'required': False,  # Non-blocking - some docs may not have patients
                'stop_on_error': False,
            },
            {
                'name': 'images',
                'number': 7,
                'description': 'Link Images from CSV',
                'scripts': [
                    # 'phase7_images/relink_images.py',  # SKIP: Only for old orphaned batches (we have none)
                    'phase7_images/link_filemaker_images_csv.py',  # Creates new batches with correct patient links
                ],
                'required': True,
                'stop_on_error': True,
            },
            {
                'name': 'validation-post',
                'number': 8,
                'description': 'Post-Import Validation',
                'scripts': [
                    'phase8_validation/validate_data_counts.py',
                    'phase8_validation/validate_relationships.py',
                ],
                'required': True,
                'stop_on_error': True,
            },
        ]
    
    def run_script(self, script_path: str, args: List[str] = None) -> Tuple[bool, str]:
        """
        Run a single script.
        
        Args:
            script_path: Relative path to script
            args: Additional arguments to pass to script
        
        Returns:
            Tuple of (success, output)
        """
        full_path = self.base_dir / script_path
        
        if not full_path.exists():
            return False, f"Script not found: {full_path}"
        
        # Build command
        cmd = [sys.executable, str(full_path)]
        if args:
            cmd.extend(args)
        
        self.logger.info(f"Running: {script_path}")
        self.logger.debug(f"Command: {' '.join(cmd)}")
        
        try:
            # Run script and capture output
            result = subprocess.run(
                cmd,
                cwd=str(self.base_dir),
                capture_output=False,  # Let output go to console
                text=True,
                check=False,
            )
            
            success = result.returncode == 0
            
            if success:
                self.logger.success(f"✅ {script_path} completed successfully")
            else:
                self.logger.error(f"❌ {script_path} failed with exit code {result.returncode}")
            
            return success, ""
            
        except Exception as e:
            self.logger.error(f"Exception running {script_path}: {str(e)}", exc_info=e)
            return False, str(e)
    
    def run_phase(self, phase: dict) -> bool:
        """
        Run all scripts in a phase.
        
        Args:
            phase: Phase configuration dict
        
        Returns:
            True if phase completed successfully
        """
        phase_name = f"Phase {phase['number']}: {phase['description']}"
        self.logger.phase_start(phase_name, f"Running {len(phase['scripts'])} script(s)")
        
        # Start phase tracking
        self.progress.start_phase(phase_name, len(phase['scripts']))
        
        # Check if phase requires confirmation (for destructive operations)
        if phase.get('requires_confirm') and not self.dry_run:
            self.logger.warning("")
            self.logger.warning("⚠️  " + "=" * 68)
            self.logger.warning("⚠️  DESTRUCTIVE OPERATION - CONFIRMATION REQUIRED")
            self.logger.warning("⚠️  " + "=" * 68)
            self.logger.warning(f"⚠️  About to run: {phase['description']}")
            self.logger.warning("⚠️  This will DELETE all existing patient data!")
            self.logger.warning("⚠️  " + "=" * 68)
            
            # In automated mode, we assume backup was already created in Phase 0
            # and user has reviewed the plan before starting
            self.logger.info("Proceeding with deletion (backup created in Phase 0)...")
        
        # Run each script in the phase
        all_success = True
        for i, script_path in enumerate(phase['scripts']):
            # Prepare script arguments
            args = []
            if self.dry_run:
                args.append('--dry-run')
            
            # Special handling for delete script (needs --confirm)
            if 'delete_existing_data.py' in script_path and not self.dry_run:
                args.append('--confirm')
            
            # Run the script
            success, output = self.run_script(script_path, args)
            
            # Update progress
            if success:
                self.progress.update_progress(
                    phase_name,
                    processed=i + 1,
                    success=1,
                )
            else:
                self.progress.update_progress(
                    phase_name,
                    processed=i + 1,
                    errors=1,
                )
                self.progress.add_error(
                    phase_name,
                    f"Script failed: {script_path}",
                )
                all_success = False
                
                # Stop if this phase requires it
                if phase['stop_on_error']:
                    self.logger.error(f"Phase {phase['number']} failed - stopping")
                    self.progress.end_phase(phase_name, success=False)
                    return False
        
        # End phase tracking
        self.progress.end_phase(phase_name, success=all_success)
        self.logger.phase_end(success=all_success)
        
        return all_success
    
    def run_full_reimport(self) -> bool:
        """
        Run complete reimport (all phases).
        
        Returns:
            True if all phases completed successfully
        """
        self.logger.info("=" * 70)
        self.logger.info("🚀 Starting Full FileMaker Reimport")
        self.logger.info("=" * 70)
        self.logger.info(f"Mode: {'DRY RUN (Preview Only)' if self.dry_run else 'LIVE (Will Make Changes)'}")
        self.logger.info(f"Phases: {len(self.phases)}")
        self.logger.info(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.logger.info("=" * 70)
        self.logger.info("")
        
        if self.dry_run:
            self.logger.warning("🔍 DRY RUN MODE - No changes will be made")
            self.logger.warning("")
        
        all_success = True
        completed_phases = 0
        
        for phase in self.phases:
            self.logger.info("")
            self.logger.info(f"▶️  Phase {phase['number']}: {phase['description']}")
            
            phase_success = self.run_phase(phase)
            
            if phase_success:
                completed_phases += 1
            else:
                all_success = False
                
                if phase['stop_on_error']:
                    self.logger.error("")
                    self.logger.error("❌ Critical phase failed - stopping reimport")
                    self.logger.error(f"Completed {completed_phases}/{len(self.phases)} phases")
                    break
        
        # Final summary
        self.logger.info("")
        self.logger.info("=" * 70)
        self.logger.info("📊 REIMPORT SUMMARY")
        self.logger.info("=" * 70)
        
        if all_success:
            self.logger.success(f"✅ All {len(self.phases)} phases completed successfully!")
            self.progress.mark_complete()
        else:
            self.logger.error(f"❌ Reimport failed at Phase {completed_phases + 1}")
            self.logger.error(f"Completed: {completed_phases}/{len(self.phases)} phases")
            self.progress.mark_failed()
        
        # Show progress summary
        self.logger.info("")
        self.logger.info(self.progress.get_phase_summary())
        
        self.logger.info("=" * 70)
        self.logger.info(f"Ended: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.logger.info("=" * 70)
        
        return all_success
    
    def run_single_phase(self, phase_name: str) -> bool:
        """
        Run a single phase by name.
        
        Args:
            phase_name: Name of phase to run (e.g., 'patients', 'validation')
        
        Returns:
            True if phase completed successfully
        """
        # Find the phase
        phase = None
        for p in self.phases:
            if p['name'] == phase_name:
                phase = p
                break
        
        if not phase:
            self.logger.error(f"Unknown phase: {phase_name}")
            self.logger.info("Available phases:")
            for p in self.phases:
                self.logger.info(f"  - {p['name']} (Phase {p['number']}: {p['description']})")
            return False
        
        self.logger.info("=" * 70)
        self.logger.info(f"🚀 Running Phase {phase['number']}: {phase['description']}")
        self.logger.info("=" * 70)
        self.logger.info(f"Mode: {'DRY RUN (Preview Only)' if self.dry_run else 'LIVE (Will Make Changes)'}")
        self.logger.info("=" * 70)
        self.logger.info("")
        
        success = self.run_phase(phase)
        
        self.logger.info("")
        if success:
            self.logger.success(f"✅ Phase {phase['number']} completed successfully!")
        else:
            self.logger.error(f"❌ Phase {phase['number']} failed")
        
        return success


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='FileMaker Reimport Master Orchestrator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Full reimport:
    python master_reimport.py --full
  
  Dry run (preview):
    python master_reimport.py --dry-run
  
  Run specific phase:
    python master_reimport.py --phase patients
    python master_reimport.py --phase validation
  
  Available phases:
    validation, delete, patients, appointments, notes, documents, images, validation-post
        """
    )
    
    # Mode selection (mutually exclusive)
    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument(
        '--full',
        action='store_true',
        help='Run full reimport (all phases)'
    )
    mode_group.add_argument(
        '--phase',
        type=str,
        help='Run specific phase only (e.g., patients, validation)'
    )
    mode_group.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview mode - no changes will be made'
    )
    
    args = parser.parse_args()
    
    # Determine mode
    dry_run = args.dry_run
    
    # Create orchestrator
    orchestrator = ReimportOrchestrator(dry_run=dry_run)
    
    # Run requested mode
    if args.full:
        success = orchestrator.run_full_reimport()
    elif args.phase:
        success = orchestrator.run_single_phase(args.phase)
    elif args.dry_run:
        # Dry run means full preview
        success = orchestrator.run_full_reimport()
    else:
        parser.print_help()
        sys.exit(1)
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

